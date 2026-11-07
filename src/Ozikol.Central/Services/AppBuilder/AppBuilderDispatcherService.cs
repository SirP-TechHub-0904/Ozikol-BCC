using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.AppBuilder
{
    /// <summary>
    /// Service implementation for dispatching automated application compilation jobs to GitHub Actions cloud runners.
    /// Safely resolves GitHub credentials from MasterPlatformSettings or environment variables without hardcoded secrets.
    /// </summary>
    public class AppBuilderDispatcherService : IAppBuilderDispatcherService
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AppBuilderDispatcherService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppBuilderDispatcherService"/> class.
        /// </summary>
        public AppBuilderDispatcherService(
            MasterCatalogDbContext dbContext,
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<AppBuilderDispatcherService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<bool> IsConfiguredAsync()
        {
            var (token, owner, repo, _) = await ResolveCredentialsAsync();
            return !string.IsNullOrWhiteSpace(token) && !string.IsNullOrWhiteSpace(owner) && !string.IsNullOrWhiteSpace(repo);
        }

        /// <inheritdoc />
        public async Task<AppBuilderDispatchResult> DispatchBuildAsync(MasterTenantAppBuild build, string? callbackBaseUrl = null)
        {
            if (build == null) throw new ArgumentNullException(nameof(build));

            var (token, owner, repo, workflow) = await ResolveCredentialsAsync();

            if (string.IsNullOrWhiteSpace(token))
            {
                return new AppBuilderDispatchResult
                {
                    Success = false,
                    ErrorMessage = "GitHub Personal Access Token (PAT) is not configured. Please configure it in Central Works > App Builder Settings or via the GITHUB_APPBUILDER_TOKEN environment variable."
                };
            }

            var requestUrl = $"https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches";
            var workflowWebUrl = $"https://github.com/{owner}/{repo}/actions/workflows/{workflow}";

            // Determine platform booleans
            var buildWindows = build.Platform == "WindowsExe" || build.Platform == "All";
            var buildAndroid = build.Platform == "AndroidApk" || build.Platform == "AndroidAab" || build.Platform == "All";

            // Format callback endpoint if host provided
            var callbackUrl = "";
            var callbackSecret = "";
            if (!string.IsNullOrWhiteSpace(callbackBaseUrl))
            {
                callbackUrl = $"{callbackBaseUrl.TrimEnd('/')}/api/CentralAppBuilder/callback";
                callbackSecret = _configuration["AppBuilder:CallbackSecret"] ?? "OziBcc_AppBuilder_Secret_2026";
            }

            var payload = new
            {
                @ref = "master",
                inputs = new
                {
                    build_id = build.Id.ToString(),
                    app_mode = build.AppMode.ToLowerInvariant() == "whitelabel" ? "whitelabel" : "general",
                    tenant_key = string.IsNullOrWhiteSpace(build.TenantKey) ? "global" : build.TenantKey.Trim().ToLowerInvariant(),
                    brand_name = string.IsNullOrWhiteSpace(build.BrandName) ? "Workspace Command Center" : build.BrandName.Trim(),
                    api_base_url = string.IsNullOrWhiteSpace(build.ApiBaseUrl) ? "https://api.ozikol.cloud" : build.ApiBaseUrl.Trim(),
                    primary_domain = build.PrimaryDomain ?? "",
                    version = string.IsNullOrWhiteSpace(build.Version) ? "1.0.0" : build.Version.Trim(),
                    build_number = build.BuildNumber.ToString(),
                    build_windows = buildWindows.ToString().ToLowerInvariant(),
                    build_android = buildAndroid.ToString().ToLowerInvariant(),
                    callback_url = callbackUrl,
                    callback_secret = callbackSecret
                }
            };

            var jsonContent = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = jsonContent
            };

            request.Headers.UserAgent.Add(new ProductInfoHeaderValue("OzikolCentralAppBuilder", "1.0"));
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.v3+json"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            try
            {
                _logger.LogInformation("Dispatching GitHub Actions App Build for {TenantKey} ({Platform}) to {RequestUrl}",
                    build.TenantKey, build.Platform, requestUrl);

                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully dispatched GitHub Actions build job {BuildId}", build.Id);
                    return new AppBuilderDispatchResult
                    {
                        Success = true,
                        WorkflowUrl = workflowWebUrl
                    };
                }

                var responseBody = await response.Content.ReadAsStringAsync();
                var errorMsg = $"GitHub API responded with {(int)response.StatusCode} {response.ReasonPhrase}: {responseBody}";
                _logger.LogWarning("GitHub Actions dispatch failed: {ErrorMsg}", errorMsg);

                return new AppBuilderDispatchResult
                {
                    Success = false,
                    ErrorMessage = errorMsg,
                    WorkflowUrl = workflowWebUrl
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while dispatching GitHub Actions App Build for {TenantKey}", build.TenantKey);
                return new AppBuilderDispatchResult
                {
                    Success = false,
                    ErrorMessage = $"Network or dispatch failure: {ex.Message}",
                    WorkflowUrl = workflowWebUrl
                };
            }
        }

        private async Task<(string Token, string Owner, string Repo, string Workflow)> ResolveCredentialsAsync()
        {
            var settings = await _dbContext.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);

            var token = settings?.GitHubAppBuilderToken
                        ?? Environment.GetEnvironmentVariable("GITHUB_APPBUILDER_TOKEN")
                        ?? _configuration["GitHub:AppBuilderToken"]
                        ?? string.Empty;

            var owner = settings?.GitHubAppBuilderOwner
                        ?? Environment.GetEnvironmentVariable("GITHUB_REPO_OWNER")
                        ?? _configuration["GitHub:RepoOwner"]
                        ?? "SirP-TechHub-0904";

            var repo = settings?.GitHubAppBuilderRepo
                       ?? Environment.GetEnvironmentVariable("GITHUB_REPO_NAME")
                       ?? _configuration["GitHub:RepoName"]
                       ?? "Ozikol-BCC";

            var workflow = settings?.GitHubAppBuilderWorkflow
                           ?? Environment.GetEnvironmentVariable("GITHUB_WORKFLOW_FILE")
                           ?? _configuration["GitHub:WorkflowFile"]
                           ?? "build-tenant-apps.yml";

            return (token.Trim(), owner.Trim(), repo.Trim(), workflow.Trim());
        }
    }
}
