using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Implements automated DNS verification, Nginx reverse proxy configuration generation,
/// and automated Let's Encrypt SSL provisioning for tenant custom domains.
/// Prevents unmapped custom domains from falling back to the Mailcow default server block.
/// </summary>
public sealed class CustomDomainProvisioningService : ICustomDomainProvisioningService
{
    private const string DefaultPlatformIp = "2.24.162.42";
    private const string DefaultAdminEmail = "admin@ozikol.cloud";
    private const string DefaultWebClientPort = "4200";
    private const string DefaultApiPort = "5000";

    private static readonly Regex DomainRegex = new(
        @"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly HashSet<string> ReservedDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "ozikol.cloud",
        "mail.ozikol.cloud",
        "api.ozikol.cloud",
        "central.ozikol.cloud",
        "localhost",
        "127.0.0.1",
        "0.0.0.0"
    };

    private readonly IConfiguration _configuration;
    private readonly ILogger<CustomDomainProvisioningService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CustomDomainProvisioningService"/> class.
    /// </summary>
    /// <param name="configuration">Application configuration provider.</param>
    /// <param name="logger">Structured logger instance.</param>
    public CustomDomainProvisioningService(
        IConfiguration configuration,
        ILogger<CustomDomainProvisioningService> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public DomainValidationResult ValidateDomain(string? domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            return DomainValidationResult.Failure("Custom domain cannot be empty.");
        }

        // Sanitize protocol, trailing slashes, and whitespace
        var clean = domain.Trim().ToLowerInvariant()
            .Replace("https://", string.Empty)
            .Replace("http://", string.Empty)
            .TrimEnd('/');

        // Strip port numbers if present (e.g. domain.com:443)
        var colonIdx = clean.IndexOf(':');
        if (colonIdx > 0)
        {
            clean = clean.Substring(0, colonIdx);
        }

        if (string.IsNullOrWhiteSpace(clean))
        {
            return DomainValidationResult.Failure("Domain name is empty after removing protocol prefix.");
        }

        if (ReservedDomains.Contains(clean))
        {
            return DomainValidationResult.Failure($"'{clean}' is a reserved platform domain and cannot be bound as a tenant custom domain.");
        }

        if (clean.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase) || clean == "localhost")
        {
            return DomainValidationResult.Failure("Localhost addresses cannot be bound as public custom domains.");
        }

        // Check if input is a raw IPv4/IPv6 address instead of a domain name
        if (IPAddress.TryParse(clean, out _))
        {
            return DomainValidationResult.Failure("Raw IP addresses cannot be bound as custom domains. Enter a valid domain name (e.g. www.company.org).");
        }

        if (!DomainRegex.IsMatch(clean))
        {
            return DomainValidationResult.Failure("Invalid domain name format. Must contain valid alphanumeric characters, dots, and hyphens without special characters.");
        }

        return DomainValidationResult.Success(clean);
    }

    /// <inheritdoc />
    public async Task<DomainDnsProbeResult> ProbeDnsAsync(string domain, CancellationToken cancellationToken = default)
    {
        var validation = ValidateDomain(domain);
        if (!validation.IsValid)
        {
            return new DomainDnsProbeResult
            {
                Domain = domain ?? string.Empty,
                IsDnsPointed = false,
                GuidanceMessage = validation.ErrorMessage ?? "Invalid domain format."
            };
        }

        var cleanDomain = validation.SanitizedDomain;
        var platformIp = GetPlatformIp();

        var result = new DomainDnsProbeResult
        {
            Domain = cleanDomain,
            ExpectedTarget = platformIp,
            DetectedIps = new List<string>()
        };

        try
        {
            _logger.LogInformation("Probing public DNS records for custom domain: {Domain}", cleanDomain);

            var hostEntry = await Dns.GetHostEntryAsync(cleanDomain, cancellationToken);
            if (hostEntry?.AddressList != null && hostEntry.AddressList.Length > 0)
            {
                foreach (var ip in hostEntry.AddressList)
                {
                    var ipStr = ip.ToString();
                    result.DetectedIps.Add(ipStr);

                    if (ipStr.Equals(platformIp, StringComparison.OrdinalIgnoreCase))
                    {
                        result.IsIpMatch = true;
                    }

                    if (IsCloudflareIp(ip))
                    {
                        result.IsCloudflareEdgeMatch = true;
                    }
                }

                result.DetectedTarget = string.Join(", ", result.DetectedIps);
            }
            else
            {
                result.DetectedTarget = "(No DNS A/AAAA records returned)";
                result.IsNxDomain = true;
            }
        }
        catch (SocketException ex) when (ex.SocketErrorCode == SocketError.HostNotFound)
        {
            result.IsNxDomain = true;
            result.DetectedTarget = "NXDOMAIN (Host not found)";
            _logger.LogWarning("DNS lookup returned NXDOMAIN for {Domain}", cleanDomain);
        }
        catch (Exception ex)
        {
            result.DetectedTarget = $"DNS lookup failed: {ex.Message}";
            _logger.LogWarning(ex, "DNS query exception for custom domain: {Domain}", cleanDomain);
        }

        // Domain is considered pointed if it matches either the direct platform IP or Cloudflare Edge IP proxying
        result.IsDnsPointed = result.IsIpMatch || result.IsCloudflareEdgeMatch;

        if (result.IsIpMatch)
        {
            result.GuidanceMessage = $"Domain successfully resolves directly to platform server IP ({platformIp}). Automated routing and SSL are ready to activate.";
        }
        else if (result.IsCloudflareEdgeMatch)
        {
            result.GuidanceMessage = "Domain resolves via Cloudflare Edge CDN. Automated HTTPS is active and proxying to platform.";
        }
        else if (result.IsNxDomain)
        {
            result.GuidanceMessage = $"No DNS records exist yet for '{cleanDomain}'. Please add an A record pointing to {platformIp} or a CNAME pointing to your workspace host.";
        }
        else
        {
            result.GuidanceMessage = $"Domain points to [{result.DetectedTarget}], not to platform IP ({platformIp}). Please update your DNS A record at your registrar.";
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<DomainProvisioningResult> ProvisionDomainAsync(
        string tenantKey,
        string domain,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateDomain(domain);
        if (!validation.IsValid)
        {
            return new DomainProvisioningResult
            {
                Succeeded = false,
                Domain = domain ?? string.Empty,
                TenantKey = tenantKey,
                Message = validation.ErrorMessage ?? "Invalid domain format."
            };
        }

        var cleanDomain = validation.SanitizedDomain;
        var result = new DomainProvisioningResult
        {
            Domain = cleanDomain,
            TenantKey = tenantKey,
            ExecutionLogs = new List<string>()
        };

        result.ExecutionLogs.Add($"[{DateTime.UtcNow:O}] Starting automated provisioning for {cleanDomain} (Tenant: {tenantKey}).");

        // 1. Verify DNS Propagation
        var probe = await ProbeDnsAsync(cleanDomain, cancellationToken);
        result.DnsProbe = probe;
        result.DnsVerified = probe.IsDnsPointed;

        if (!probe.IsDnsPointed)
        {
            result.ExecutionLogs.Add($"[{DateTime.UtcNow:O}] DNS probe reported domain is not yet pointing to {probe.ExpectedTarget}. Detected: {probe.DetectedTarget}.");
            result.Message = $"DNS records for '{cleanDomain}' do not yet point to platform IP {probe.ExpectedTarget}. Please update your DNS records.";
            result.Succeeded = false;
            return result;
        }

        result.ExecutionLogs.Add($"[{DateTime.UtcNow:O}] DNS verified successfully ({probe.DetectedTarget}).");

        // 2. Generate and apply Nginx reverse proxy configuration
        try
        {
            var configPath = GenerateNginxConfiguration(cleanDomain, tenantKey, result.ExecutionLogs);
            result.ConfigFilePath = configPath;
            result.NginxConfigured = !string.IsNullOrWhiteSpace(configPath);

            // 3. Automated SSL Certificate Issuance (Let's Encrypt / Certbot)
            var sslIssued = await IssueSslCertificateAsync(cleanDomain, result.ExecutionLogs, cancellationToken);
            result.SslActive = sslIssued;

            // 4. Reload Nginx to activate routing and isolate domain from Mailcow
            var reloaded = ReloadNginx(result.ExecutionLogs);
            result.NginxReloaded = reloaded;

            result.Succeeded = result.NginxConfigured;
            result.Message = sslIssued
                ? $"Automated routing and SSL certificate provisioned successfully for '{cleanDomain}'. Traffic is routed directly to your workspace."
                : $"Web routing configured for '{cleanDomain}'. Initializing SSL certificate via background ACME challenge.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Automated custom domain provisioning encountered an error for {Domain}", cleanDomain);
            result.ExecutionLogs.Add($"[{DateTime.UtcNow:O}] Exception: {ex.Message}");
            result.Message = $"Routing configuration generated, but automated reload encountered an issue: {ex.Message}";
            result.Succeeded = false;
        }

        return result;
    }

    /// <inheritdoc />
    public Task<DomainDeprovisionResult> DeprovisionDomainAsync(
        string tenantKey,
        string domain,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateDomain(domain);
        var cleanDomain = validation.IsValid ? validation.SanitizedDomain : (domain ?? string.Empty).Trim();

        _logger.LogInformation("Deprovisioning custom domain: {Domain} for tenant {TenantKey}", cleanDomain, tenantKey);

        try
        {
            var vhostDir = ResolveVHostDirectory();
            var fileName = $"ozikol-tenant-{cleanDomain}.conf";
            var sitesAvailableFile = Path.Combine(vhostDir, fileName);
            var sitesEnabledFile = Path.Combine("/etc/nginx/sites-enabled", fileName);

            if (File.Exists(sitesEnabledFile))
            {
                File.Delete(sitesEnabledFile);
            }

            if (File.Exists(sitesAvailableFile))
            {
                File.Delete(sitesAvailableFile);
            }

            // Reload Nginx after deletion
            var dummyLogs = new List<string>();
            ReloadNginx(dummyLogs);

            return Task.FromResult(new DomainDeprovisionResult
            {
                Succeeded = true,
                Domain = cleanDomain,
                TenantKey = tenantKey,
                Message = $"Routing configuration for '{cleanDomain}' has been removed successfully."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deprovision custom domain {Domain}", cleanDomain);
            return Task.FromResult(new DomainDeprovisionResult
            {
                Succeeded = false,
                Domain = cleanDomain,
                TenantKey = tenantKey,
                Message = $"Failed to remove routing configuration: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Generates production-grade Nginx reverse proxy configuration for the tenant custom domain.
    /// Handles HTTP validation and full HTTPS proxying with real client IP preservation.
    /// </summary>
    private string GenerateNginxConfiguration(string domain, string tenantKey, List<string> logs)
    {
        var targetDir = ResolveVHostDirectory();
        Directory.CreateDirectory(targetDir);

        var fileName = $"ozikol-tenant-{domain}.conf";
        var fullPath = Path.Combine(targetDir, fileName);

        var webPort = _configuration["CustomDomain:ClientProxyPort"] ?? DefaultWebClientPort;
        var apiPort = _configuration["CustomDomain:ApiProxyPort"] ?? DefaultApiPort;

        // Check if SSL certificate already exists on the server
        var certPath = $"/etc/letsencrypt/live/{domain}/fullchain.pem";
        var keyPath = $"/etc/letsencrypt/live/{domain}/privkey.pem";
        var hasSslCert = File.Exists(certPath) && File.Exists(keyPath);

        var sb = new StringBuilder();
        sb.AppendLine("# ==============================================================================");
        sb.AppendLine($"# Ozikol BCC Custom Domain Routing Configuration: {domain}");
        sb.AppendLine($"# Tenant Workspace: {tenantKey}");
        sb.AppendLine($"# Generated: {DateTime.UtcNow:O}");
        sb.AppendLine("# Prevents Mailcow fallback by routing dedicated tenant traffic to Ozikol services");
        sb.AppendLine("# ==============================================================================");
        sb.AppendLine();

        // 1. HTTP Server Block (ACME Challenge + Upgrade to HTTPS)
        sb.AppendLine("server {");
        sb.AppendLine("    listen 80;");
        sb.AppendLine("    listen [::]:80;");
        sb.AppendLine($"    server_name {domain} www.{domain};");
        sb.AppendLine();
        sb.AppendLine("    # Let's Encrypt automated challenge validation directory");
        sb.AppendLine("    location /.well-known/acme-challenge/ {");
        sb.AppendLine("        root /var/www/certbot;");
        sb.AppendLine("        allow all;");
        sb.AppendLine("    }");
        sb.AppendLine();

        if (hasSslCert)
        {
            sb.AppendLine("    # Redirect all HTTP traffic to HTTPS");
            sb.AppendLine("    location / {");
            sb.AppendLine("        return 301 https://$host$request_uri;");
            sb.AppendLine("    }");
        }
        else
        {
            // Initial boot mode before SSL certificate is issued: proxy directly over HTTP
            sb.AppendLine("    # Initial HTTP proxy before Let's Encrypt certificate issuance completes");
            AppendProxyLocations(sb, domain, tenantKey, webPort, apiPort);
        }

        sb.AppendLine("}");
        sb.AppendLine();

        // 2. HTTPS Server Block (Active when certificates are on disk)
        if (hasSslCert)
        {
            sb.AppendLine("server {");
            sb.AppendLine("    listen 443 ssl http2;");
            sb.AppendLine("    listen [::]:443 ssl http2;");
            sb.AppendLine($"    server_name {domain} www.{domain};");
            sb.AppendLine();
            sb.AppendLine($"    ssl_certificate {certPath};");
            sb.AppendLine($"    ssl_certificate_key {keyPath};");
            sb.AppendLine("    ssl_session_timeout 1d;");
            sb.AppendLine("    ssl_session_cache shared:SSL:50m;");
            sb.AppendLine("    ssl_session_tickets off;");
            sb.AppendLine("    ssl_protocols TLSv1.2 TLSv1.3;");
            sb.AppendLine("    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;");
            sb.AppendLine("    ssl_prefer_server_ciphers off;");
            sb.AppendLine();
            sb.AppendLine("    # Security Hardening Headers");
            sb.AppendLine("    add_header X-Frame-Options \"SAMEORIGIN\" always;");
            sb.AppendLine("    add_header X-XSS-Protection \"1; mode=block\" always;");
            sb.AppendLine("    add_header X-Content-Type-Options \"nosniff\" always;");
            sb.AppendLine("    add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;");
            sb.AppendLine();
            AppendProxyLocations(sb, domain, tenantKey, webPort, apiPort);
            sb.AppendLine("}");
        }

        File.WriteAllText(fullPath, sb.ToString(), Encoding.UTF8);
        logs.Add($"[{DateTime.UtcNow:O}] Wrote Nginx virtual host configuration: {fullPath} (SSL Active: {hasSslCert}).");

        // On Linux systems, enable the site by symlinking into /etc/nginx/sites-enabled
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && Directory.Exists("/etc/nginx/sites-enabled"))
        {
            var enabledPath = Path.Combine("/etc/nginx/sites-enabled", fileName);
            if (!File.Exists(enabledPath))
            {
                try
                {
                    File.CreateSymbolicLink(enabledPath, fullPath);
                    logs.Add($"[{DateTime.UtcNow:O}] Created symlink: {enabledPath} -> {fullPath}");
                }
                catch (Exception symEx)
                {
                    logs.Add($"[{DateTime.UtcNow:O}] Symlink creation warning: {symEx.Message}");
                }
            }
        }

        return fullPath;
    }

    /// <summary>
    /// Appends reverse proxy location directives for API, SignalR, social media crawlers, and Angular web client.
    /// </summary>
    private static void AppendProxyLocations(StringBuilder sb, string domain, string tenantKey, string webPort, string apiPort)
    {
        sb.AppendLine("    # Social Media Crawler Detection (WhatsApp, Facebook, Twitter/X, Telegram, LinkedIn, Discord, Slack)");
        sb.AppendLine("    set $social_crawler 0;");
        sb.AppendLine("    if ($http_user_agent ~* \"WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview\") {");
        sb.AppendLine("        set $social_crawler 1;");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    # Internal Dynamic Social Preview Proxy for Crawlers");
        sb.AppendLine("    location = /_social_preview_internal {");
        sb.AppendLine("        internal;");
        sb.AppendLine($"        proxy_pass http://127.0.0.1:{apiPort}/api/WebsiteContentApi/social-preview;");
        sb.AppendLine("        proxy_set_header Host $host;");
        sb.AppendLine($"        proxy_set_header X-Tenant-Key \"{tenantKey}\";");
        sb.AppendLine($"        proxy_set_header X-Tenant-Slug \"{tenantKey}\";");
        sb.AppendLine($"        proxy_set_header X-Tenant-Custom-Domain \"{domain}\";");
        sb.AppendLine("        proxy_set_header X-Forwarded-Proto $scheme;");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    # Dedicated Ozikol Tenant API Proxy");
        sb.AppendLine("    location /api/ {");
        sb.AppendLine($"        proxy_pass http://127.0.0.1:{apiPort}/api/;");
        sb.AppendLine("        proxy_http_version 1.1;");
        sb.AppendLine("        proxy_set_header Upgrade $http_upgrade;");
        sb.AppendLine("        proxy_set_header Connection \"upgrade\";");
        sb.AppendLine("        proxy_set_header Host $host;");
        sb.AppendLine($"        proxy_set_header X-Tenant-Key \"{tenantKey}\";");
        sb.AppendLine($"        proxy_set_header X-Tenant-Slug \"{tenantKey}\";");
        sb.AppendLine($"        proxy_set_header X-Tenant-Custom-Domain \"{domain}\";");
        sb.AppendLine("        proxy_set_header X-Real-IP $remote_addr;");
        sb.AppendLine("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
        sb.AppendLine("        proxy_set_header X-Forwarded-Proto $scheme;");
        sb.AppendLine("        proxy_connect_timeout 60s;");
        sb.AppendLine("        proxy_send_timeout 60s;");
        sb.AppendLine("        proxy_read_timeout 60s;");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    # Dedicated Ozikol Workspace Web App Proxy");
        sb.AppendLine("    location / {");
        sb.AppendLine("        if ($social_crawler = 1) {");
        sb.AppendLine("            rewrite ^ /_social_preview_internal last;");
        sb.AppendLine("        }");
        sb.AppendLine($"        proxy_pass http://127.0.0.1:{webPort}/;");
        sb.AppendLine("        proxy_http_version 1.1;");
        sb.AppendLine("        proxy_set_header Upgrade $http_upgrade;");
        sb.AppendLine("        proxy_set_header Connection \"upgrade\";");
        sb.AppendLine("        proxy_set_header Host $host;");
        sb.AppendLine($"        proxy_set_header X-Tenant-Key \"{tenantKey}\";");
        sb.AppendLine($"        proxy_set_header X-Tenant-Slug \"{tenantKey}\";");
        sb.AppendLine($"        proxy_set_header X-Tenant-Custom-Domain \"{domain}\";");
        sb.AppendLine("        proxy_set_header X-Real-IP $remote_addr;");
        sb.AppendLine("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
        sb.AppendLine("        proxy_set_header X-Forwarded-Proto $scheme;");
        sb.AppendLine("    }");
    }

    /// <summary>
    /// Invokes Let's Encrypt Certbot non-interactively via the ACME webroot challenge.
    /// </summary>
    private async Task<bool> IssueSslCertificateAsync(string domain, List<string> logs, CancellationToken cancellationToken)
    {
        var certPath = $"/etc/letsencrypt/live/{domain}/fullchain.pem";
        if (File.Exists(certPath))
        {
            logs.Add($"[{DateTime.UtcNow:O}] Certificate already exists on disk at {certPath}.");
            return true;
        }

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            logs.Add($"[{DateTime.UtcNow:O}] Non-Linux host detected ({RuntimeInformation.OSDescription}). Staging Nginx configuration without direct Certbot execution.");
            return false;
        }

        try
        {
            var adminEmail = _configuration["CustomDomain:SslAdminEmail"] ?? DefaultAdminEmail;
            var certbotArgs = $"certonly --webroot -w /var/www/certbot -d {domain} -d www.{domain} --non-interactive --agree-tos -m {adminEmail} --keep-until-expiring";

            logs.Add($"[{DateTime.UtcNow:O}] Invoking Certbot: certbot {certbotArgs}");

            var psi = new ProcessStartInfo
            {
                FileName = "certbot",
                Arguments = certbotArgs,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process != null)
            {
                var stdout = await process.StandardOutput.ReadToEndAsync(cancellationToken);
                var stderr = await process.StandardError.ReadToEndAsync(cancellationToken);
                await process.WaitForExitAsync(cancellationToken);

                logs.Add($"[{DateTime.UtcNow:O}] Certbot exit code: {process.ExitCode}");
                if (process.ExitCode == 0)
                {
                    logs.Add($"[{DateTime.UtcNow:O}] SSL certificate successfully issued for {domain}.");
                    return true;
                }

                logs.Add($"[{DateTime.UtcNow:O}] Certbot output: {stdout}");
                if (!string.IsNullOrWhiteSpace(stderr))
                {
                    logs.Add($"[{DateTime.UtcNow:O}] Certbot error: {stderr}");
                }
            }
        }
        catch (Exception ex)
        {
            logs.Add($"[{DateTime.UtcNow:O}] Certbot execution error: {ex.Message}");
            _logger.LogWarning(ex, "Certbot execution failed for {Domain}", domain);
        }

        return File.Exists(certPath);
    }

    /// <summary>
    /// Executes nginx reload command to apply updated virtual host configurations without downtime.
    /// </summary>
    private bool ReloadNginx(List<string> logs)
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            logs.Add($"[{DateTime.UtcNow:O}] Non-Linux environment: Nginx reload skipped (simulated).");
            return true;
        }

        try
        {
            // Test configuration syntax first: nginx -t
            var testPsi = new ProcessStartInfo
            {
                FileName = "nginx",
                Arguments = "-t",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var testProc = Process.Start(testPsi);
            if (testProc != null)
            {
                testProc.WaitForExit(5000);
                if (testProc.ExitCode != 0)
                {
                    var testErr = testProc.StandardError.ReadToEnd();
                    logs.Add($"[{DateTime.UtcNow:O}] 'nginx -t' failed: {testErr}. Aborting reload to protect active services.");
                    return false;
                }
            }

            // Reload nginx: systemctl reload nginx or nginx -s reload
            var reloadPsi = new ProcessStartInfo
            {
                FileName = "nginx",
                Arguments = "-s reload",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var reloadProc = Process.Start(reloadPsi);
            if (reloadProc != null)
            {
                reloadProc.WaitForExit(5000);
                logs.Add($"[{DateTime.UtcNow:O}] Nginx reloaded successfully (Exit Code: {reloadProc.ExitCode}).");
                return reloadProc.ExitCode == 0;
            }
        }
        catch (Exception ex)
        {
            logs.Add($"[{DateTime.UtcNow:O}] Nginx reload failed: {ex.Message}");
            _logger.LogWarning(ex, "Failed to reload Nginx configuration");
        }

        return false;
    }

    /// <summary>
    /// Resolves target directory for Nginx virtual host configurations based on environment.
    /// </summary>
    private string ResolveVHostDirectory()
    {
        var configured = _configuration["CustomDomain:NginxVHostPath"]
            ?? Environment.GetEnvironmentVariable("NGINX_VHOST_PATH");

        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.Trim();
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            if (Directory.Exists("/etc/nginx/sites-available"))
            {
                return "/etc/nginx/sites-available";
            }
            if (Directory.Exists("/etc/nginx/conf.d"))
            {
                return "/etc/nginx/conf.d";
            }
        }

        // Safe fallback for Windows / local dev testing
        return Path.Combine(AppContext.BaseDirectory, "staged_vhosts");
    }

    /// <summary>
    /// Gets the platform server IPv4 address from configuration or defaults to canonical platform IP.
    /// </summary>
    private string GetPlatformIp()
    {
        return _configuration["CustomDomain:PlatformIp"]
            ?? _configuration["PLATFORM_SERVER_IP"]
            ?? Environment.GetEnvironmentVariable("PLATFORM_SERVER_IP")
            ?? DefaultPlatformIp;
    }

    /// <summary>
    /// Identifies whether an IP address belongs to Cloudflare CDN edge proxy CIDR blocks.
    /// </summary>
    private static bool IsCloudflareIp(IPAddress ip)
    {
        var ipBytes = ip.GetAddressBytes();
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            // Cloudflare IPv4 ranges include 104.16.0.0/13, 104.24.0.0/14, 172.64.0.0/13, 162.158.0.0/15
            if (ipBytes[0] == 104 && (ipBytes[1] >= 16 && ipBytes[1] <= 31)) return true;
            if (ipBytes[0] == 172 && (ipBytes[1] >= 64 && ipBytes[1] <= 71)) return true;
            if (ipBytes[0] == 162 && (ipBytes[1] == 158 || ipBytes[1] == 159)) return true;
            if (ipBytes[0] == 108 && ipBytes[1] == 162) return true;
            if (ipBytes[0] == 190 && ipBytes[1] == 93) return true;
            if (ipBytes[0] == 188 && ipBytes[1] == 114) return true;
            if (ipBytes[0] == 197 && ipBytes[1] == 234) return true;
            if (ipBytes[0] == 198 && ipBytes[1] == 41) return true;
        }
        return false;
    }
}

