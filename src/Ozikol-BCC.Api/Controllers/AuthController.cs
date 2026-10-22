using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Ozikol_BCC.Api.Models;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Services.Recaptcha;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Tags("2. Authentication & Authorization")]
    [EnableRateLimiting("auth-limit")]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly UserManager<Profile> _userManager;
        private readonly SignInManager<Profile> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly ITenantProvider? _tenantProvider;
        private readonly MasterCatalogDbContext? _masterCatalogDbContext;
        private readonly DashboardDbContext? _dbContext;
        private readonly Ozikol_BCC.Application.Services.IMemberIdGeneratorService? _memberIdGenerator;
        private readonly Ozikol_BCC.Application.Services.IOtpVerificationService? _otpService;
        private readonly IServiceScopeFactory? _serviceScopeFactory;
        private readonly IRecaptchaService? _recaptchaService;
        private readonly ITenantFeatureGateService? _featureGateService;

        public AuthController(
            IMediator mediator,
            UserManager<Profile> userManager,
            SignInManager<Profile> signInManager,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            ITenantProvider? tenantProvider = null,
            MasterCatalogDbContext? masterCatalogDbContext = null,
            DashboardDbContext? dbContext = null,
            Ozikol_BCC.Application.Services.IMemberIdGeneratorService? memberIdGenerator = null,
            Ozikol_BCC.Application.Services.IOtpVerificationService? otpService = null,
            IServiceScopeFactory? serviceScopeFactory = null,
            IRecaptchaService? recaptchaService = null,
            ITenantFeatureGateService? featureGateService = null)
        {
            _mediator = mediator;
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _logger = logger;
            _tenantProvider = tenantProvider;
            _masterCatalogDbContext = masterCatalogDbContext;
            _dbContext = dbContext;
            _memberIdGenerator = memberIdGenerator;
            _otpService = otpService;
            _serviceScopeFactory = serviceScopeFactory;
            _recaptchaService = recaptchaService;
            _featureGateService = featureGateService;
        }

        private static EffectiveUserPermissionsDto ComputeEffectivePermissions(List<string> roles)
        {
            var isSuperAdmin = roles.Any(r => string.Equals(r, "SuperAdmin", StringComparison.OrdinalIgnoreCase));
            var isAdmin = isSuperAdmin || roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase));
            var hasGlobalEdit = isSuperAdmin || isAdmin || roles.Any(r => string.Equals(r, "GlobalEdit", StringComparison.OrdinalIgnoreCase) || string.Equals(r, "Global Edit", StringComparison.OrdinalIgnoreCase));

            var features = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var role in roles)
            {
                if (role.StartsWith("FeatureEdit:", StringComparison.OrdinalIgnoreCase))
                {
                    var code = role["FeatureEdit:".Length..].Trim();
                    features[code] = "FeatureEdit";
                }
                else if (role.StartsWith("ReadOnly:", StringComparison.OrdinalIgnoreCase))
                {
                    var code = role["ReadOnly:".Length..].Trim();
                    if (!features.ContainsKey(code) || features[code] != "FeatureEdit")
                    {
                        features[code] = "ReadOnly";
                    }
                }
                else if (role.StartsWith("Feature:", StringComparison.OrdinalIgnoreCase))
                {
                    var rest = role["Feature:".Length..].Trim();
                    if (rest.EndsWith(":ReadOnly", StringComparison.OrdinalIgnoreCase))
                    {
                        var code = rest[..^":ReadOnly".Length].Trim();
                        if (!features.ContainsKey(code) || features[code] != "FeatureEdit")
                        {
                            features[code] = "ReadOnly";
                        }
                    }
                    else if (rest.EndsWith(":Edit", StringComparison.OrdinalIgnoreCase))
                    {
                        var code = rest[..^":Edit".Length].Trim();
                        features[code] = "FeatureEdit";
                    }
                    else
                    {
                        features[rest] = "FeatureEdit";
                    }
                }
            }

            var canAccessAdminConsole = isSuperAdmin || isAdmin || hasGlobalEdit || features.Count > 0 || roles.Any(r => new[] { "IdentityManager", "CmsManager", "Editor" }.Contains(r, StringComparer.OrdinalIgnoreCase));

            return new EffectiveUserPermissionsDto
            {
                IsSuperAdmin = isSuperAdmin,
                IsAdmin = isAdmin,
                HasGlobalEdit = hasGlobalEdit,
                CanAccessAdminConsole = canAccessAdminConsole,
                Features = features
            };
        }

        [HttpGet("me")]
        [Authorize]
        [DisableRateLimiting]
        public async Task<IActionResult> GetCurrentUserSession()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("Session invalid or user claim missing."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.UserStatus == UserStatus.Suspended || user.UserStatus == UserStatus.Deleted)
                return Unauthorized(ApiResponse<object>.FailureResponse("User account is inactive or not found."));

            var currentRoles = (await _userManager.GetRolesAsync(user))?.ToList() ?? new List<string>();
            var resolvedTenantKey = _tenantProvider?.CurrentTenant;
            var freshToken = await GenerateJwtTokenAsync(user, resolvedTenantKey, currentRoles);

            var effectivePerms = ComputeEffectivePermissions(currentRoles);
            var licensedFeatures = new List<string>();
            if (!string.IsNullOrEmpty(resolvedTenantKey) && _featureGateService != null)
            {
                try
                {
                    var ent = await _featureGateService.GetTenantFeatureEntitlementsAsync(resolvedTenantKey);
                    licensedFeatures = ent.ActiveFeatureCodes.ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not resolve dynamic tenant features for {TenantKey}", resolvedTenantKey);
                }
            }

            var data = new
            {
                UserId = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = $"{user.FirstName} {user.LastName}".Trim(),
                AvatarUrl = user.AvatarUrl,
                MemberId = user.MemberId,
                Designation = user.Designation,
                Roles = currentRoles,
                IsAdmin = effectivePerms.IsAdmin,
                EffectivePermissions = effectivePerms,
                LicensedTenantFeatures = licensedFeatures,
                Token = freshToken
            };

            return Ok(ApiResponse<object>.SuccessResponse(data, "Live user session verified and refreshed."));
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequestModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email and Password are required."));
            }

            _logger.LogInformation("🔑 [AuthController.Login] Attempting login for [{Email}].", model.Email);

            string? resolvedTenantKey = _tenantProvider?.CurrentTenant;
            string? resolvedOrgName = null;

            // If no specific tenant domain was resolved, auto-route across Master Catalog and Tenant DBs
            if (string.IsNullOrEmpty(resolvedTenantKey) && _masterCatalogDbContext != null)
            {
                var cleanEmail = model.Email.Trim().ToLowerInvariant();
                var matchedTenant = await _masterCatalogDbContext.MasterTenantCatalogs
                    .FirstOrDefaultAsync(t => t.IsActive && t.AdminEmail != null && t.AdminEmail.ToLower() == cleanEmail);

                if (matchedTenant != null)
                {
                    resolvedTenantKey = matchedTenant.TenantKey;
                    resolvedOrgName = matchedTenant.OrganizationName;
                }
                else if (_serviceScopeFactory != null)
                {
                    var activeTenants = await _masterCatalogDbContext.MasterTenantCatalogs.Where(t => t.IsActive).ToListAsync();
                    foreach (var t in activeTenants)
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var scopedTenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
                        using var tScope = scopedTenantProvider.BeginScope(t.TenantKey);
                        var scopedUserManager = scope.ServiceProvider.GetRequiredService<UserManager<Profile>>();
                        var foundUser = await scopedUserManager.FindByEmailAsync(model.Email);
                        if (foundUser != null)
                        {
                            resolvedTenantKey = t.TenantKey;
                            resolvedOrgName = t.OrganizationName;
                            break;
                        }
                    }
                }
            }

            using var execScope = (!string.IsNullOrEmpty(resolvedTenantKey) && _serviceScopeFactory != null)
                ? _serviceScopeFactory.CreateScope()
                : null;

            var activeTenantProvider = execScope?.ServiceProvider.GetService<ITenantProvider>() ?? _tenantProvider;
            using var activeTenantScope = (!string.IsNullOrEmpty(resolvedTenantKey) && activeTenantProvider != null)
                ? activeTenantProvider.BeginScope(resolvedTenantKey)
                : null;

            var activeUserManager = execScope?.ServiceProvider.GetService<UserManager<Profile>>() ?? _userManager;
            var activeSignInManager = execScope?.ServiceProvider.GetService<SignInManager<Profile>>() ?? _signInManager;
            var activeDbContext = execScope?.ServiceProvider.GetService<DashboardDbContext>() ?? _dbContext;

            var user = await activeUserManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                _logger.LogWarning("❌ [Login] User not found for email: {Email}", model.Email);
                return Unauthorized(ApiResponse<object>.FailureResponse("Invalid email or password credentials."));
            }

            var passwordValid = await activeUserManager.CheckPasswordAsync(user, model.Password);
            _logger.LogInformation("🔑 [Login] CheckPasswordAsync for {Email}: Valid={Valid}, LockoutEnd={LockoutEnd}, AccessFailedCount={FailedCount}, UserStatus={Status}", 
                user.Email, passwordValid, user.LockoutEnd, user.AccessFailedCount, user.UserStatus);

            if (passwordValid && user.UserStatus != UserStatus.Suspended)
            {
                // Auto-clear temporary lockout when genuine password is provided
                if (user.LockoutEnd != null || user.AccessFailedCount > 0)
                {
                    await activeUserManager.SetLockoutEndDateAsync(user, null);
                    await activeUserManager.ResetAccessFailedCountAsync(user);
                }
            }

            var clientContext = Ozikol_BCC.Application.Common.ClientContextHelper.Resolve(HttpContext);
            var ipAddress = clientContext.IpAddress;
            var systemId = clientContext.SystemId;
            var userAgent = clientContext.UserAgent ?? Request.Headers.UserAgent.ToString();

            var result = await activeSignInManager.CheckPasswordSignInAsync(user, model.Password, lockoutOnFailure: !passwordValid);
            _logger.LogInformation("🔑 [Login] CheckPasswordSignInAsync result: Succeeded={Succeeded}, IsLockedOut={IsLockedOut}, IsNotAllowed={IsNotAllowed}, RequiresTwoFactor={RequiresTwoFactor}",
                result.Succeeded, result.IsLockedOut, result.IsNotAllowed, result.RequiresTwoFactor);
            if (result.IsLockedOut)
            {
                // Audit Lockout
                if (activeDbContext != null)
                {
                    activeDbContext.BcpLoginAuditLogs.Add(new BcpLoginAuditLog
                    {
                        Id = Guid.CreateVersion7(),
                        UserId = user.Id,
                        Email = user.Email!,
                        IpAddress = ipAddress,
                        SystemId = systemId,
                        Status = "Locked Out",
                        UserAgent = userAgent,
                        Timestamp = DateTime.UtcNow
                    });
                    await activeDbContext.SaveChangesAsync();
                }
                return StatusCode(423, ApiResponse<object>.FailureResponse("Account is temporarily locked out due to multiple failed login attempts. Please try again later."));
            }

            if (!result.Succeeded)
            {
                // Audit Failure
                if (activeDbContext != null)
                {
                    activeDbContext.BcpLoginAuditLogs.Add(new BcpLoginAuditLog
                    {
                        Id = Guid.CreateVersion7(),
                        UserId = user.Id,
                        Email = user.Email!,
                        IpAddress = ipAddress,
                        SystemId = systemId,
                        Status = "Failed (Invalid Credentials)",
                        UserAgent = userAgent,
                        Timestamp = DateTime.UtcNow
                    });
                    await activeDbContext.SaveChangesAsync();
                }
                return Unauthorized(ApiResponse<object>.FailureResponse("Invalid email or password credentials."));
            }

            // Check tenant policy: Enforce Email Confirmation before login with schema resilience
            MisConfigurationSetting? tenantSetting = null;
            try
            {
                tenantSetting = activeDbContext != null ? await activeDbContext.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync() : null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load MisConfigurationSettings for email confirmation check; continuing with standard policy.");
            }

            if (tenantSetting != null && tenantSetting.RequireConfirmedEmailToLogin && !user.EmailConfirmed)
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Email confirmation is required by workspace policy before you can sign in."));
            }

            // --- 2FA / MFA Trust Device Check ---
            bool skipMfa = false;
            var trustToken = Request.Headers["X-Device-Trust-Token"].ToString();
            if (!string.IsNullOrEmpty(trustToken) && activeDbContext != null)
            {
                var trustedDevice = await activeDbContext.BcpUserDevices
                    .FirstOrDefaultAsync(d => d.UserId == user.Id && d.TrustToken == trustToken && d.IsTrusted && d.IsActiveSession);
                if (trustedDevice != null)
                {
                    skipMfa = true;
                    trustedDevice.LastUsedAt = DateTime.UtcNow;
                    await activeDbContext.SaveChangesAsync();
                }
            }

            // Enforce MFA if required
            bool mfaEnforced = user.TwoFactorEnabled || 
                              (tenantSetting != null && tenantSetting.MfaRequiredGlobally) ||
                              (tenantSetting != null && tenantSetting.MfaRequiredForAdmins && 
                               (await activeUserManager.IsInRoleAsync(user, "Admin") || await activeUserManager.IsInRoleAsync(user, "SuperAdmin")));

            if (mfaEnforced && !skipMfa && activeDbContext != null)
            {
                var provider = user.PreferredTwoFactorProvider;
                if (provider == BcpTwoFactorProvider.None)
                {
                    provider = BcpTwoFactorProvider.Email; // fallback
                }

                // Generate login MFA code
                var mfaOtp = Random.Shared.Next(100000, 999999).ToString();
                var expiryTicks = DateTime.UtcNow.AddMinutes(5).Ticks;
                await activeUserManager.SetAuthenticationTokenAsync(user, "OzikolMfa", "LoginMfaCode", $"{mfaOtp}:{expiryTicks}");

                // Dispatch code based on provider
                if (provider == BcpTwoFactorProvider.Email)
                {
                    activeDbContext.BcpEmailQueue.Add(new BcpEmailQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientEmail = user.Email!,
                        RecipientName = user.FullName,
                        Subject = "Your Login Verification Code",
                        HtmlBody = $"<div style='font-family:sans-serif; padding:24px; border:1px solid #e2e8f0; border-radius:12px;'><h3>Login Verification Code</h3><p>Enter the following code to complete your login:</p><div style='font-size:32px; font-weight:800; color:#0050e5; padding:16px 0; letter-spacing:4px;'>{mfaOtp}</div><p>This code is valid for 5 minutes.</p></div>",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else if (provider == BcpTwoFactorProvider.SMS && !string.IsNullOrEmpty(user.PhoneNumber))
                {
                    activeDbContext.BcpSmsQueue.Add(new BcpSmsQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientPhone = user.PhoneNumber,
                        Message = $"Your Ozikol verification code is {mfaOtp}. Valid for 5 minutes.",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                activeDbContext.BcpLoginAuditLogs.Add(new BcpLoginAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    UserId = user.Id,
                    Email = user.Email!,
                    IpAddress = ipAddress,
                    SystemId = systemId,
                    Status = $"MFA Challenge Pending ({provider})",
                    UserAgent = userAgent,
                    Timestamp = DateTime.UtcNow
                });

                await activeDbContext.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    RequiresMfa = true,
                    UserId = user.Id,
                    MfaProvider = provider.ToString(),
                    MfaToken = user.Id // token used to track target user
                }, "Two-factor verification challenge enqueued."));
            }

            // Reset failed login counters
            if (user.AccessFailedCount > 0 || user.LockoutEnd != null)
            {
                user.AccessFailedCount = 0;
                user.LockoutEnd = null;
                await activeUserManager.UpdateAsync(user);
            }

            // Register/Audit Successful Session
            var jwtId = Guid.NewGuid().ToString();
            if (activeDbContext != null)
            {
                // Track active sessions limit (up to 3)
                var activeSessions = await activeDbContext.BcpUserDevices
                    .Where(d => d.UserId == user.Id && d.IsActiveSession)
                    .OrderBy(d => d.LastUsedAt)
                    .ToListAsync();

                if (activeSessions.Count >= 3)
                {
                    // terminate oldest
                    activeSessions[0].IsActiveSession = false;
                }

                // Add current session
                activeDbContext.BcpUserDevices.Add(new BcpUserDevice
                {
                    Id = Guid.CreateVersion7(),
                    UserId = user.Id,
                    DeviceName = userAgent,
                    IpAddress = ipAddress ?? "127.0.0.1",
                    TrustToken = Guid.NewGuid().ToString("N"),
                    JwtId = jwtId,
                    IsTrusted = skipMfa, // trusted if bypassed
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow,
                    IsActiveSession = true
                });

                activeDbContext.BcpLoginAuditLogs.Add(new BcpLoginAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    UserId = user.Id,
                    Email = user.Email!,
                    IpAddress = ipAddress,
                    SystemId = systemId,
                    Status = "Success",
                    UserAgent = userAgent,
                    Timestamp = DateTime.UtcNow
                });

                // Also record high-level workspace activity log with complete identity & client context
                activeDbContext.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.CreateVersion7(),
                    ActionType = "LOGIN_SUCCESS",
                    Description = $"User '{user.Email}' signed in successfully.",
                    Module = "Authentication",
                    PerformedByProfileId = user.Id,
                    PerformedByFullName = $"{user.FirstName} {user.LastName}".Trim(),
                    PerformedByUserEmail = user.Email,
                    Date = DateTime.UtcNow,
                    IpAddress = ipAddress,
                    SystemId = systemId,
                    UserAgent = userAgent
                });

                // In-App Notification about new device sign in
                if (!skipMfa)
                {
                    activeDbContext.BcpNotifications.Add(new BcpNotification
                    {
                        Id = Guid.CreateVersion7(),
                        UserId = user.Id,
                        Title = "New Login Detected",
                        Message = $"A new sign-in was recorded from '{userAgent}' (IP: {ipAddress}) on {DateTime.UtcNow:MMM dd, yyyy HH:mm} UTC.",
                        ActionUrl = "/users/workspace/security",
                        Module = "Security",
                        Icon = "phonelink_lock",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.High,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await activeDbContext.SaveChangesAsync();
            }

            // Update LastLogin
            user.LastLogin = DateTime.UtcNow;
            await activeUserManager.UpdateAsync(user);

            var userRoles = (await activeUserManager.GetRolesAsync(user))?.ToList() ?? new List<string>();
            var token = await GenerateJwtTokenAsync(user, resolvedTenantKey, userRoles, jwtId);

            // Check if user account has pending/incomplete onboarding steps
            bool requiresOnboarding = false;
            int onboardingStep = 1;
            if (!string.IsNullOrEmpty(user.CustomAttributesJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(user.CustomAttributesJson);
                    if (doc.RootElement.TryGetProperty("onboarding_completed", out var comp) && comp.ValueKind == JsonValueKind.False)
                    {
                        requiresOnboarding = true;
                        if (doc.RootElement.TryGetProperty("onboarding_step", out var stepProp) && stepProp.TryGetInt32(out var s))
                        {
                            onboardingStep = s;
                        }
                    }
                }
                catch
                {
                    // Fail-safe: malformed JSON ignored
                }
            }

            // Resolve uploaded tenant brand logo if configured in tenant settings
            string? logoUrl = null;
            if (activeDbContext != null)
            {
                try
                {
                    var siteSetting = await activeDbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
                    logoUrl = siteSetting?.CompanyLogoUrl ?? siteSetting?.LogoUrl;
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Could not query tenant MisWebsiteSettings for logo URL.");
                }
            }

            var effectivePermsOnLogin = ComputeEffectivePermissions(userRoles);
            var licensedFeaturesOnLogin = new List<string>();
            if (!string.IsNullOrEmpty(resolvedTenantKey) && _featureGateService != null)
            {
                try
                {
                    var ent = await _featureGateService.GetTenantFeatureEntitlementsAsync(resolvedTenantKey);
                    licensedFeaturesOnLogin = ent.ActiveFeatureCodes.ToList();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not resolve dynamic tenant features on login for {TenantKey}", resolvedTenantKey);
                }
            }

            var responseData = new LoginResponseModel
            {
                Token = token,
                UserId = user.Id,
                FullName = $"{user.FirstName} {user.LastName}".Trim(),
                Email = user.Email ?? string.Empty,
                AvatarUrl = user.AvatarUrl,
                TenantKey = resolvedTenantKey,
                OrganizationName = resolvedOrgName,
                LogoUrl = logoUrl,
                MustChangePassword = user.MustChangePassword,
                RequiresOnboarding = requiresOnboarding,
                OnboardingStep = onboardingStep,
                Roles = userRoles,
                EffectivePermissions = effectivePermsOnLogin,
                LicensedTenantFeatures = licensedFeaturesOnLogin
            };

            return Ok(ApiResponse<LoginResponseModel>.SuccessResponse(responseData, "Authentication successful."));
        }

        [HttpPost("login/verify-mfa")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyLoginMfa([FromBody] VerifyLoginMfaRequest request)
        {
            if (string.IsNullOrEmpty(request.UserId) || string.IsNullOrEmpty(request.Code))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("User Identifier and Verification Code are required."));
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var provider = user.PreferredTwoFactorProvider;
            if (provider == BcpTwoFactorProvider.None) provider = BcpTwoFactorProvider.Email;

            bool isValid = false;

            // 1. Check if backup codes matches
            if (!string.IsNullOrWhiteSpace(request.Code) && _dbContext != null)
            {
                var hashedInput = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(request.Code.Trim())));
                var backupCode = await _dbContext.BcpUserMfaBackupCodes
                    .FirstOrDefaultAsync(c => c.UserId == user.Id && c.HashedCode == hashedInput && !c.IsUsed);

                if (backupCode != null)
                {
                    isValid = true;
                    backupCode.IsUsed = true;
                    backupCode.UsedAtUtc = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync();
                    _logger.LogInformation("🔑 [MFA] User [{Email}] used a single-use backup recovery code.", user.Email);
                }
            }

            // 2. Validate App TOTP or OTP
            if (!isValid)
            {
                if (provider == BcpTwoFactorProvider.GoogleAuthenticator || provider == BcpTwoFactorProvider.MicrosoftAuthenticator)
                {
                    isValid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, request.Code);
                }
                else
                {
                    var tokenVal = await _userManager.GetAuthenticationTokenAsync(user, "OzikolMfa", "LoginMfaCode");
                    if (!string.IsNullOrEmpty(tokenVal))
                    {
                        var parts = tokenVal.Split(':');
                        if (parts.Length == 2 && parts[0] == request.Code.Trim())
                        {
                            if (long.TryParse(parts[1], out var expiryTicks))
                            {
                                if (DateTime.UtcNow.Ticks <= expiryTicks)
                                {
                                    isValid = true;
                                    await _userManager.RemoveAuthenticationTokenAsync(user, "OzikolMfa", "LoginMfaCode");
                                }
                            }
                        }
                    }
                }
            }

            var ipAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            if (!isValid)
            {
                if (_dbContext != null)
                {
                    _dbContext.BcpLoginAuditLogs.Add(new BcpLoginAuditLog
                    {
                        Id = Guid.CreateVersion7(),
                        Email = user.Email!,
                        IpAddress = ipAddress,
                        Status = $"Failed MFA Code ({provider})",
                        UserAgent = userAgent,
                        Timestamp = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
                return BadRequest(ApiResponse<object>.FailureResponse("Incorrect or expired two-factor verification code."));
            }

            // Complete Login Successful Session
            var jwtId = Guid.NewGuid().ToString();
            string newDeviceTrustToken = string.Empty;

            if (_dbContext != null)
            {
                // Track active sessions limit (up to 3)
                var activeSessions = await _dbContext.BcpUserDevices
                    .Where(d => d.UserId == user.Id && d.IsActiveSession)
                    .OrderBy(d => d.LastUsedAt)
                    .ToListAsync();

                if (activeSessions.Count >= 3)
                {
                    activeSessions[0].IsActiveSession = false;
                }

                newDeviceTrustToken = Guid.NewGuid().ToString("N");

                _dbContext.BcpUserDevices.Add(new BcpUserDevice
                {
                    Id = Guid.CreateVersion7(),
                    UserId = user.Id,
                    DeviceName = userAgent,
                    IpAddress = ipAddress ?? "127.0.0.1",
                    TrustToken = newDeviceTrustToken,
                    JwtId = jwtId,
                    IsTrusted = request.TrustDevice, // save trust choice
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow,
                    IsActiveSession = true
                });

                _dbContext.BcpLoginAuditLogs.Add(new BcpLoginAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    Email = user.Email!,
                    IpAddress = ipAddress,
                    Status = "Success",
                    UserAgent = userAgent,
                    Timestamp = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
            }

            user.LastLogin = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            var resolvedTenantKey = _tenantProvider?.CurrentTenant;
            var userRoles = (await _userManager.GetRolesAsync(user))?.ToList() ?? new List<string>();
            var token = await GenerateJwtTokenAsync(user, resolvedTenantKey, userRoles, jwtId);

            var responseData = new LoginResponseModel
            {
                Token = token,
                UserId = user.Id,
                FullName = $"{user.FirstName} {user.LastName}".Trim(),
                Email = user.Email ?? string.Empty,
                AvatarUrl = user.AvatarUrl,
                TenantKey = resolvedTenantKey,
                MustChangePassword = user.MustChangePassword,
                Roles = userRoles
            };

            // Set secure custom response header for trust token if selected
            if (request.TrustDevice && !string.IsNullOrEmpty(newDeviceTrustToken))
            {
                Response.Headers.Add("X-Device-Trust-Token", newDeviceTrustToken);
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Auth = responseData,
                TrustToken = request.TrustDevice ? newDeviceTrustToken : null
            }, "MFA verified. Session authorized."));
        }

        [HttpPost("login/resend-mfa")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendLoginMfa([FromBody] ResendLoginMfaRequest request)
        {
            if (string.IsNullOrEmpty(request.UserId))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("User Identifier is required."));
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var provider = user.PreferredTwoFactorProvider;
            if (provider == BcpTwoFactorProvider.None) provider = BcpTwoFactorProvider.Email;

            // Generate fresh 6-digit MFA OTP
            var mfaOtp = Random.Shared.Next(100000, 999999).ToString();
            var expiryTicks = DateTime.UtcNow.AddMinutes(5).Ticks;
            await _userManager.SetAuthenticationTokenAsync(user, "OzikolMfa", "LoginMfaCode", $"{mfaOtp}:{expiryTicks}");

            if (_dbContext != null)
            {
                if (provider == BcpTwoFactorProvider.Email)
                {
                    _dbContext.BcpEmailQueue.Add(new BcpEmailQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientEmail = user.Email!,
                        RecipientName = user.FullName,
                        Subject = "Your New Login Verification Code",
                        HtmlBody = $"<div style='font-family:sans-serif; padding:24px; border:1px solid #e2e8f0; border-radius:12px;'><h3>Login Verification Code</h3><p>Enter the following code to complete your login:</p><div style='font-size:32px; font-weight:800; color:#0050e5; padding:16px 0; letter-spacing:4px;'>{mfaOtp}</div><p>This code is valid for 5 minutes.</p></div>",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else if (provider == BcpTwoFactorProvider.SMS && !string.IsNullOrEmpty(user.PhoneNumber))
                {
                    _dbContext.BcpSmsQueue.Add(new BcpSmsQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientPhone = user.PhoneNumber,
                        Message = $"Your Ozikol verification code is {mfaOtp}. Valid for 5 minutes.",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _dbContext.SaveChangesAsync();
            }

            var friendlyProvider = provider == BcpTwoFactorProvider.SMS ? "SMS" : "Email";
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                retryAfterSeconds = 60,
                provider = friendlyProvider
            }, $"A new verification code has been dispatched to your {friendlyProvider}."));
        }

        [HttpPost("password/request-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestPasswordOtp([FromBody] RequestOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email address is required."));
            }

            var cleanEmail = request.Email.Trim();
            string? resolvedTenantKey = _tenantProvider?.CurrentTenant;

            if (string.IsNullOrEmpty(resolvedTenantKey) && _masterCatalogDbContext != null)
            {
                var activeTenants = await _masterCatalogDbContext.MasterTenantCatalogs.Where(t => t.IsActive).ToListAsync();
                if (_serviceScopeFactory != null)
                {
                    foreach (var t in activeTenants)
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var scopedTenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
                        using var tScope = scopedTenantProvider.BeginScope(t.TenantKey);
                        var scopedUserManager = scope.ServiceProvider.GetRequiredService<UserManager<Profile>>();
                        var foundUser = await scopedUserManager.FindByEmailAsync(cleanEmail);
                        if (foundUser != null)
                        {
                            resolvedTenantKey = t.TenantKey;
                            break;
                        }
                    }
                }
            }

            using var execScope = (!string.IsNullOrEmpty(resolvedTenantKey) && _serviceScopeFactory != null)
                ? _serviceScopeFactory.CreateScope()
                : null;

            var activeTenantProvider = execScope?.ServiceProvider.GetService<ITenantProvider>() ?? _tenantProvider;
            using var activeTenantScope = (!string.IsNullOrEmpty(resolvedTenantKey) && activeTenantProvider != null)
                ? activeTenantProvider.BeginScope(resolvedTenantKey)
                : null;

            var activeUserManager = execScope?.ServiceProvider.GetService<UserManager<Profile>>() ?? _userManager;
            var activeDbContext = execScope?.ServiceProvider.GetService<DashboardDbContext>() ?? _dbContext;

            var user = await activeUserManager.FindByEmailAsync(cleanEmail);
            if (user == null)
            {
                return Ok(ApiResponse<object>.SuccessResponse(null, "If an account exists with this email, a 6-digit verification code has been dispatched."));
            }

            var otpCode = Random.Shared.Next(100000, 999999).ToString();
            var expiryTicks = DateTime.UtcNow.AddMinutes(15).Ticks;
            await activeUserManager.SetAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp", $"{otpCode}:{expiryTicks}");

            if (activeDbContext != null)
            {
                activeDbContext.BcpEmailQueue.Add(new BcpEmailQueue
                {
                    Id = Guid.CreateVersion7(),
                    RelatedUserId = user.Id,
                    RecipientEmail = user.Email!,
                    RecipientName = user.FullName,
                    Subject = "Your 6-Digit Password Reset Code",
                    HtmlBody = $@"
                        <div style='font-family:sans-serif; max-width:520px; margin:0 auto; padding:28px; border:1px solid #e2e8f0; border-radius:12px; background:#fff;'>
                            <h2 style='color:#0f172a; margin:0 0 8px;'>Password Reset Request</h2>
                            <p style='color:#475569; font-size:14px; line-height:1.5;'>You requested a security code to reset your account password. Enter this code on the verification screen:</p>
                            <div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:18px; margin:20px 0; text-align:center;'>
                                <span style='font-size:32px; font-weight:800; color:#0050e5; letter-spacing:6px; font-family:monospace;'>{otpCode}</span>
                            </div>
                            <p style='color:#64748b; font-size:12.5px;'>This code is valid for 15 minutes. If you did not request this, you can safely ignore this email.</p>
                        </div>",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.Urgent,
                    EventType = BcpEventType.PasswordReset,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                });

                if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
                {
                    activeDbContext.BcpSmsQueue.Add(new BcpSmsQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientPhone = user.PhoneNumber,
                        Message = $"Your Ozikol password reset code is {otpCode}. Valid for 15 minutes.",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await activeDbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "A 6-digit verification code has been dispatched to your email & SMS."));
        }

        [HttpPost("password/reset-with-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPasswordWithOtp([FromBody] ResetPasswordWithOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email, 6-digit OTP code, and new password are required."));
            }

            var cleanEmail = request.Email.Trim();
            string? resolvedTenantKey = _tenantProvider?.CurrentTenant;

            if (string.IsNullOrEmpty(resolvedTenantKey) && _masterCatalogDbContext != null)
            {
                var activeTenants = await _masterCatalogDbContext.MasterTenantCatalogs.Where(t => t.IsActive).ToListAsync();
                if (_serviceScopeFactory != null)
                {
                    foreach (var t in activeTenants)
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var scopedTenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
                        using var tScope = scopedTenantProvider.BeginScope(t.TenantKey);
                        var scopedUserManager = scope.ServiceProvider.GetRequiredService<UserManager<Profile>>();
                        var foundUser = await scopedUserManager.FindByEmailAsync(cleanEmail);
                        if (foundUser != null)
                        {
                            resolvedTenantKey = t.TenantKey;
                            break;
                        }
                    }
                }
            }

            using var execScope = (!string.IsNullOrEmpty(resolvedTenantKey) && _serviceScopeFactory != null)
                ? _serviceScopeFactory.CreateScope()
                : null;

            var activeTenantProvider = execScope?.ServiceProvider.GetService<ITenantProvider>() ?? _tenantProvider;
            using var activeTenantScope = (!string.IsNullOrEmpty(resolvedTenantKey) && activeTenantProvider != null)
                ? activeTenantProvider.BeginScope(resolvedTenantKey)
                : null;

            var activeUserManager = execScope?.ServiceProvider.GetService<UserManager<Profile>>() ?? _userManager;
            var activeDbContext = execScope?.ServiceProvider.GetService<DashboardDbContext>() ?? _dbContext;

            var user = await activeUserManager.FindByEmailAsync(cleanEmail);
            if (user == null)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid or expired verification code."));
            }

            var tokenData = await activeUserManager.GetAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp");
            if (string.IsNullOrEmpty(tokenData))
            {
                tokenData = await activeUserManager.GetAuthenticationTokenAsync(user, "OzikolResetOtp", "ResetOtp");
            }

            if (string.IsNullOrEmpty(tokenData))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No pending OTP request found. Please request a new code."));
            }

            var parts = tokenData.Split(':');
            if (parts.Length != 2 || parts[0] != request.Otp.Trim())
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Incorrect 6-digit verification code."));
            }

            if (long.TryParse(parts[1], out var expiryTicks))
            {
                if (DateTime.UtcNow.Ticks > expiryTicks)
                {
                    await activeUserManager.RemoveAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp");
                    await activeUserManager.RemoveAuthenticationTokenAsync(user, "OzikolResetOtp", "ResetOtp");
                    return BadRequest(ApiResponse<object>.FailureResponse("Verification code has expired. Please request a new one."));
                }
            }

            await activeUserManager.RemoveAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp");
            await activeUserManager.RemoveAuthenticationTokenAsync(user, "OzikolResetOtp", "ResetOtp");

            var resetToken = await activeUserManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await activeUserManager.ResetPasswordAsync(user, resetToken, request.NewPassword);

            if (!resetResult.Succeeded)
            {
                await activeUserManager.RemovePasswordAsync(user);
                var addResult = await activeUserManager.AddPasswordAsync(user, request.NewPassword);
                if (!addResult.Succeeded)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", addResult.Errors.Select(e => e.Description))));
                }
            }

            user.EmailConfirmed = true;
            user.MustChangePassword = false;
            user.LockoutEnd = null;
            user.AccessFailedCount = 0;
            if (user.UserStatus == UserStatus.Pending) user.UserStatus = UserStatus.Active;

            await activeUserManager.UpdateAsync(user);
            if (activeDbContext != null) await activeDbContext.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, "Password reset successfully. Your account is now active."));
        }

        [HttpPost("otp/request")]
        [AllowAnonymous]
        public async Task<IActionResult> RequestGeneralOtp([FromBody] RequestOtpRequest request)
        {
            return await RequestPasswordOtp(request);
        }

        [HttpPost("otp/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyGeneralOtp([FromBody] ResetPasswordWithOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email and OTP code are required."));
            }

            var user = await _userManager.FindByEmailAsync(request.Email.Trim());
            if (user == null) return BadRequest(ApiResponse<object>.FailureResponse("Invalid code."));

            var tokenData = await _userManager.GetAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp");
            if (string.IsNullOrEmpty(tokenData)) return BadRequest(ApiResponse<object>.FailureResponse("No pending OTP found."));

            var parts = tokenData.Split(':');
            if (parts.Length != 2 || parts[0] != request.Otp.Trim())
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Incorrect 6-digit verification code."));
            }

            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
            await _userManager.RemoveAuthenticationTokenAsync(user, "OzikolReset", "PasswordResetOtp");

            return Ok(ApiResponse<object>.SuccessResponse(null, "Email verified successfully."));
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequestModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
                return BadRequest(ApiResponse<object>.FailureResponse("Email and Password are required."));

            if (!string.IsNullOrWhiteSpace(model.ConfirmPassword) && model.Password != model.ConfirmPassword)
                return BadRequest(ApiResponse<object>.FailureResponse("Passwords do not match."));

            // Validate Google reCAPTCHA challenge token if provided
            if (_recaptchaService != null && !string.IsNullOrWhiteSpace(model.RecaptchaToken))
            {
                var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(model.RecaptchaToken, clientIp);
                if (!isCaptchaValid)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Security verification failed. Please complete the reCAPTCHA challenge and try again."));
                }
            }

            // Dynamic Password policy screening and tenant registration policies with resilience against unapplied database schema migrations
            MisConfigurationSetting? settings = null;
            try
            {
                if (_dbContext != null)
                {
                    settings = await _dbContext.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load MisConfigurationSettings for registration policies (possible database schema drift). Falling back to safe defaults and durable layout configuration.");
            }

            // Durable layout & onboarding policy fallbacks (matches RegistrationFormApiController)
            bool allowPublicRegistration = settings?.AllowPublicRegistration ?? true;
            bool requireApprovalBeforeLogin = settings?.RequireApprovalBeforeLogin ?? false;
            string registrationSuccessMessage = !string.IsNullOrWhiteSpace(settings?.RegistrationSuccessMessage)
                ? settings.RegistrationSuccessMessage
                : "Registration successful! Welcome to the workspace.";

            if (_dbContext != null)
            {
                try
                {
                    var policyConfigField = await _dbContext.BcpRegistrationFormFields
                        .AsNoTracking()
                        .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");
                    if (policyConfigField != null && !string.IsNullOrWhiteSpace(policyConfigField.OptionsJson))
                    {
                        using var doc = JsonDocument.Parse(policyConfigField.OptionsJson);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("allowPublicRegistration", out var aprProp) && aprProp.ValueKind == JsonValueKind.False)
                            allowPublicRegistration = false;
                        if (root.TryGetProperty("requireApprovalBeforeLogin", out var rablProp) && rablProp.ValueKind == JsonValueKind.True)
                            requireApprovalBeforeLogin = true;
                        if (root.TryGetProperty("registrationSuccessMessage", out var rsmProp) && !string.IsNullOrWhiteSpace(rsmProp.GetString()))
                            registrationSuccessMessage = rsmProp.GetString()!;
                    }
                }
                catch
                {
                    // Fall back cleanly to defaults if layout policy cannot be parsed
                }
            }

            if (settings != null)
            {
                var password = model.Password;
                if (password.Length < settings.PasswordMinLength)
                    return BadRequest(ApiResponse<object>.FailureResponse($"Password must be at least {settings.PasswordMinLength} characters long."));
                if (settings.PasswordRequireDigit && !password.Any(char.IsDigit))
                    return BadRequest(ApiResponse<object>.FailureResponse("Password must contain at least one numeric digit (0-9)."));
                if (settings.PasswordRequireUppercase && !password.Any(char.IsUpper))
                    return BadRequest(ApiResponse<object>.FailureResponse("Password must contain at least one uppercase letter (A-Z)."));
                if (settings.PasswordRequireLowercase && !password.Any(char.IsLower))
                    return BadRequest(ApiResponse<object>.FailureResponse("Password must contain at least one lowercase letter (a-z)."));
                if (settings.PasswordRequireNonAlphanumeric && !password.Any(c => !char.IsLetterOrDigit(c)))
                    return BadRequest(ApiResponse<object>.FailureResponse("Password must contain at least one special symbol character."));

                // screening blacklist
                var compromised = new[] { "123456", "password", "password123", "qwerty", "admin123" };
                if (compromised.Contains(password.ToLowerInvariant()))
                    return BadRequest(ApiResponse<object>.FailureResponse("This password is on the security blacklist due to high risk. Choose a more secure password."));
            }
            else
            {
                // Fallback blacklist screening when settings table cannot be fully queried
                var compromised = new[] { "123456", "password", "password123", "qwerty", "admin123" };
                if (compromised.Contains(model.Password.ToLowerInvariant()))
                    return BadRequest(ApiResponse<object>.FailureResponse("This password is on the security blacklist due to high risk. Choose a more secure password."));
            }

            var existing = await _userManager.FindByEmailAsync(model.Email);
            if (existing != null)
                return BadRequest(ApiResponse<object>.FailureResponse("An account with this email address already exists."));

            if (!string.IsNullOrWhiteSpace(model.PhoneNumber) && _dbContext != null)
            {
                var trimmedPhone = model.PhoneNumber.Trim();
                var phoneExists = await _dbContext.Users.AnyAsync(u => u.PhoneNumber == trimmedPhone);
                if (phoneExists)
                    return BadRequest(ApiResponse<object>.FailureResponse($"An account with phone number '{trimmedPhone}' is already registered."));
            }

            string? catName = null;
            if (model.BcpUserCategoryId.HasValue && _dbContext != null)
            {
                var cat = await _dbContext.BcpUserCategories.FirstOrDefaultAsync(c => c.Id == model.BcpUserCategoryId.Value);
                catName = cat?.Name;
            }

            var memberId = _memberIdGenerator != null 
                ? await _memberIdGenerator.GenerateMemberIdAsync(model.FirstName, model.LastName, catName)
                : "CC-" + DateTime.UtcNow.ToString("yyMM") + "-" + RandomNumberGenerator.GetInt32(100, 999);

            // Check invitation token
            BcpUserInvitation? invitation = null;
            if (!string.IsNullOrEmpty(model.InvitationToken) && _dbContext != null)
            {
                invitation = await _dbContext.BcpUserInvitations
                    .FirstOrDefaultAsync(i => i.Token == model.InvitationToken && i.Email == model.Email.Trim().ToLowerInvariant() && !i.IsAccepted);
                if (invitation == null || invitation.ExpiresAt < DateTime.UtcNow)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("The invitation token link is invalid or has expired. Please request a new invitation."));
                }
            }

            // Check public self-registration policy
            if (invitation == null && !allowPublicRegistration)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Public registration is currently disabled for this organization. Please request an invitation link from an administrator."));
            }

            // Validate dynamic onboarding fields
            if (_dbContext != null)
            {
                var activeFields = await _dbContext.BcpRegistrationFormFields
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .ToListAsync();

                var missingRequired = new List<string>();
                foreach (var f in activeFields)
                {
                    // Check if field is scoped to a specific category
                    if (f.BcpUserCategoryId.HasValue && f.BcpUserCategoryId.Value != model.BcpUserCategoryId)
                    {
                        continue;
                    }

                    if (f.IsRequired)
                    {
                        if (model.CustomAttributes == null ||
                            !model.CustomAttributes.TryGetValue(f.FieldKey, out var val) ||
                            val == null ||
                            string.IsNullOrWhiteSpace(val.ToString()))
                        {
                            missingRequired.Add(f.Label);
                        }
                    }
                }

                if (missingRequired.Count > 0)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse($"Please complete the required fields: {string.Join(", ", missingRequired)}"));
                }
            }

            var requireApproval = requireApprovalBeforeLogin && invitation == null;
            var initialStatus = requireApproval ? UserStatus.Pending : UserStatus.Active;

            var customAttrs = model.CustomAttributes != null
                ? new Dictionary<string, object>(model.CustomAttributes)
                : new Dictionary<string, object>();

            if (!string.IsNullOrWhiteSpace(model.ReferralCode))
            {
                customAttrs["referral_code"] = model.ReferralCode.Trim().ToUpperInvariant();
            }

            if (!string.IsNullOrWhiteSpace(model.OrganizationType))
            {
                customAttrs["organization_type"] = model.OrganizationType.Trim();
            }

            var newUser = new Profile
            {
                Id = Guid.NewGuid().ToString(),
                UserName = model.Email.Trim(),
                Email = model.Email.Trim(),
                FirstName = model.FirstName?.Trim(),
                LastName = model.LastName?.Trim(),
                Title = model.Title?.Trim(),
                PhoneNumber = model.PhoneNumber?.Trim(),
                Designation = model.Designation?.Trim() ?? "Member",
                BcpUserCategoryId = model.BcpUserCategoryId,
                UserStatus = initialStatus,
                JoinDate = DateTime.UtcNow,
                EmailConfirmed = invitation != null, // trust email if came from invitation
                PhoneNumberConfirmed = false,
                MustChangePassword = false,
                RegistrationSource = invitation != null ? "Invited" : (!string.IsNullOrWhiteSpace(model.ReferralCode) ? $"Referred:{model.ReferralCode.Trim().ToUpperInvariant()}" : "SelfRegistered"),
                MemberId = memberId,
                CustomAttributesJson = customAttrs.Count > 0
                    ? JsonSerializer.Serialize(customAttrs)
                    : null
            };

            var createResult = await _userManager.CreateAsync(newUser, model.Password);
            if (!createResult.Succeeded)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", createResult.Errors.Select(e => e.Description))));
            }

            // Role assignment
            var assignedRole = invitation?.RoleName ?? "Member";
            string? featureScope = null;
            string? actionRoleStr = null;
            if (assignedRole.Contains(':'))
            {
                var roleParts = assignedRole.Split(':');
                assignedRole = roleParts[0];
                if (roleParts.Length > 1 && !string.IsNullOrWhiteSpace(roleParts[1]))
                    featureScope = roleParts[1];
                if (roleParts.Length > 2 && !string.IsNullOrWhiteSpace(roleParts[2]))
                    actionRoleStr = roleParts[2];
            }

            try
            {
                var roleExists = _dbContext != null && await _dbContext.Roles.AnyAsync(r => r.Name == assignedRole);
                if (roleExists)
                {
                    await _userManager.AddToRoleAsync(newUser, assignedRole);
                }
                else
                {
                    await _userManager.AddToRoleAsync(newUser, "Member");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to assign role '{Role}' to new user '{Email}'. Falling back to Member.", assignedRole, newUser.Email);
                try { await _userManager.AddToRoleAsync(newUser, "Member"); } catch { }
            }

            // Provision modular capability scope if assigned via invitation
            if (!string.IsNullOrEmpty(featureScope) && _dbContext != null)
            {
                var actionRoleEnum = BcpActionRole.FeatureEditor;
                if (!string.IsNullOrEmpty(actionRoleStr) && System.Enum.TryParse<BcpActionRole>(actionRoleStr, true, out var parsedActionRole))
                {
                    actionRoleEnum = parsedActionRole;
                }
                else if (string.Equals(assignedRole, "Admin", StringComparison.OrdinalIgnoreCase))
                {
                    actionRoleEnum = BcpActionRole.GlobalEditor;
                }
                else if (string.Equals(assignedRole, "Member", StringComparison.OrdinalIgnoreCase))
                {
                    actionRoleEnum = BcpActionRole.Readonly;
                }

                var existingFeatureRole = await _dbContext.BcpUserFeatureRoles
                    .FirstOrDefaultAsync(f => f.ProfileId == newUser.Id && f.FeatureAreaKey == featureScope);

                if (existingFeatureRole == null)
                {
                    _dbContext.BcpUserFeatureRoles.Add(new BcpUserFeatureRole
                    {
                        Id = Guid.CreateVersion7(),
                        ProfileId = newUser.Id,
                        FeatureAreaKey = featureScope,
                        ActionRole = actionRoleEnum,
                        IsActive = true,
                        AssignedBy = invitation?.InvitedByProfileId,
                        Date = DateTime.UtcNow
                    });
                }
                else
                {
                    existingFeatureRole.ActionRole = actionRoleEnum;
                }
            }

            // Complete invitation
            if (invitation != null && _dbContext != null)
            {
                invitation.IsAccepted = true;
                invitation.AcceptedAt = DateTime.UtcNow;
            }

            // Log activity
            if (_dbContext != null)
            {
                _dbContext.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.NewGuid(),
                    Date = DateTime.UtcNow,
                    Module = "User Management",
                    ActionType = invitation != null ? "Invited Registration" : "Public Registration",
                    PerformedByProfileId = newUser.Id,
                    PerformedByFullName = newUser.FullName,
                    TargetProfileId = newUser.Id,
                    TargetFullName = newUser.FullName,
                    Description = $"New member registered: '{newUser.FullName}' ({newUser.Email}) - Status: {initialStatus}",
                    IpAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? Request.HttpContext.Connection.RemoteIpAddress?.ToString()
                });
                await _dbContext.SaveChangesAsync();
            }

            // If approval is required by the tenant's onboarding policy, do not issue an immediate JWT token
            if (requireApproval)
            {
                var pendingResponse = new
                {
                    userId = newUser.Id,
                    email = newUser.Email,
                    fullName = newUser.FullName,
                    memberId = newUser.MemberId,
                    status = "PendingApproval",
                    requiresApproval = true,
                    message = "Your registration has been submitted and is currently pending administrator verification. You will be notified once your account is active."
                };
                return Ok(ApiResponse<object>.SuccessResponse(pendingResponse, "Registration submitted successfully! Your account is pending administrator review."));
            }

            var token = await GenerateJwtTokenAsync(newUser);
            var responseData = new LoginResponseModel
            {
                Token = token,
                UserId = newUser.Id,
                FullName = $"{newUser.FirstName} {newUser.LastName}".Trim(),
                Email = newUser.Email ?? string.Empty,
                AvatarUrl = newUser.AvatarUrl,
                MustChangePassword = false,
                Roles = new List<string> { assignedRole }
            };

            var successMsg = !string.IsNullOrWhiteSpace(registrationSuccessMessage)
                ? registrationSuccessMessage
                : "Registration successful! Welcome to the workspace.";

            return Ok(ApiResponse<LoginResponseModel>.SuccessResponse(responseData, successMsg));
        }

        [HttpPost("password/force-change")]
        [Authorize]
        public async Task<IActionResult> ForceChangePassword([FromBody] ForceChangePasswordRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.NewPassword))
                return BadRequest(ApiResponse<object>.FailureResponse("New password is required."));

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("User identity not resolved."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            IdentityResult changeResult;
            if (!string.IsNullOrWhiteSpace(model.OldPassword))
            {
                changeResult = await _userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
            }
            else
            {
                await _userManager.RemovePasswordAsync(user);
                changeResult = await _userManager.AddPasswordAsync(user, model.NewPassword);
            }

            if (!changeResult.Succeeded)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", changeResult.Errors.Select(e => e.Description))));
            }

            user.MustChangePassword = false;
            await _userManager.UpdateAsync(user);

            if (_dbContext != null)
            {
                _dbContext.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.NewGuid(),
                    Date = DateTime.UtcNow,
                    Module = "Security",
                    ActionType = "Password Change",
                    PerformedByProfileId = user.Id,
                    PerformedByFullName = user.FullName,
                    TargetProfileId = user.Id,
                    TargetFullName = user.FullName,
                    Description = $"User '{user.FullName}' successfully changed password.",
                    IpAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? Request.HttpContext.Connection.RemoteIpAddress?.ToString()
                });

                _dbContext.BcpNotifications.Add(new BcpNotification
                {
                    UserId = user.Id,
                    Title = "Account Password Updated",
                    Message = "Your account password was successfully updated.",
                    ActionUrl = "/users/workspace/security",
                    Module = "Security",
                    Icon = "lock_reset",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.High,
                    CreatedAt = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Password updated successfully!"));
        }

        [HttpPost("password/reset")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPasswordWithToken([FromBody] ResetPasswordWithTokenRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Token) || string.IsNullOrWhiteSpace(model.NewPassword))
                return BadRequest(ApiResponse<object>.FailureResponse("Email, Reset Token, and New Password are required."));

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid password reset request."));

            var resetResult = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (!resetResult.Succeeded)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", resetResult.Errors.Select(e => e.Description))));
            }

            user.MustChangePassword = false;
            await _userManager.UpdateAsync(user);

            if (_dbContext != null)
            {
                _dbContext.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.NewGuid(),
                    Date = DateTime.UtcNow,
                    Module = "Security",
                    ActionType = "Password Reset Token",
                    PerformedByProfileId = user.Id,
                    PerformedByFullName = user.FullName,
                    TargetProfileId = user.Id,
                    TargetFullName = user.FullName,
                    Description = $"User '{user.FullName}' reset their password.",
                    IpAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? Request.HttpContext.Connection.RemoteIpAddress?.ToString()
                });
                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Password reset successfully!"));
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            // Terminate current device session in DB
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            if (!string.IsNullOrEmpty(currentUserId) && !string.IsNullOrEmpty(jti) && _dbContext != null)
            {
                var session = await _dbContext.BcpUserDevices.FirstOrDefaultAsync(d => d.UserId == currentUserId && d.JwtId == jti);
                if (session != null)
                {
                    session.IsActiveSession = false;
                    await _dbContext.SaveChangesAsync();
                }
            }

            await _signInManager.SignOutAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Logged out successfully."));
        }

        [HttpPost("password/change")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest model)
        {
            if (string.IsNullOrWhiteSpace(model.OldPassword) || string.IsNullOrWhiteSpace(model.NewPassword))
                return BadRequest(ApiResponse<object>.FailureResponse("Old Password and New Password are required."));

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var changeResult = await _userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
            if (!changeResult.Succeeded)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", changeResult.Errors.Select(e => e.Description))));
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Password changed successfully."));
        }

        [HttpGet("mfa")]
        [Authorize]
        public async Task<IActionResult> GetMfaStatus()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                mfaEnabled = user.TwoFactorEnabled,
                provider = user.PreferredTwoFactorProvider.ToString()
            }, "MFA status retrieved."));
        }

        [HttpPost("mfa/configure")]
        [Authorize]
        public async Task<IActionResult> ConfigureMfa([FromBody] ConfigureMfaRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            if (request.Provider == "None")
            {
                user.TwoFactorEnabled = false;
                user.PreferredTwoFactorProvider = BcpTwoFactorProvider.None;
                await _userManager.UpdateAsync(user);
                return Ok(ApiResponse<object>.SuccessResponse(null, "Two-Factor authentication disabled successfully."));
            }

            if (!System.Enum.TryParse<BcpTwoFactorProvider>(request.Provider, out var provider))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid Two-Factor Authentication provider."));
            }

            if (provider == BcpTwoFactorProvider.GoogleAuthenticator || provider == BcpTwoFactorProvider.MicrosoftAuthenticator)
            {
                var key = await _userManager.GetAuthenticatorKeyAsync(user);
                if (string.IsNullOrEmpty(key))
                {
                    await _userManager.ResetAuthenticatorKeyAsync(user);
                    key = await _userManager.GetAuthenticatorKeyAsync(user);
                }

                // Resolve dynamic tenant brand name to identify this workspace in authenticator apps
                string brandName = "Ozikol-BCC";
                if (_dbContext != null)
                {
                    try
                    {
                        var siteSetting = await _dbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
                        if (!string.IsNullOrWhiteSpace(siteSetting?.BrandName))
                        {
                            brandName = siteSetting.BrandName.Trim();
                        }
                        else if (!string.IsNullOrWhiteSpace(siteSetting?.CompanyName))
                        {
                            brandName = siteSetting.CompanyName.Trim();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Could not resolve tenant brand name for MFA QR code, fallback to default.");
                    }
                }

                var appName = provider == BcpTwoFactorProvider.GoogleAuthenticator ? "GoogleAuthenticator" : "MicrosoftAuthenticator";
                var safeBrand = Uri.EscapeDataString(brandName);
                var safeEmail = Uri.EscapeDataString(user.Email ?? "user");
                var qrCodeUrl = $"otpauth://totp/{safeBrand}:{safeEmail}?secret={key}&issuer={safeBrand}&label={safeBrand}";

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    SecretKey = key,
                    QrCodeUrl = qrCodeUrl,
                    Provider = appName,
                    BrandName = brandName
                }, "Authenticator setup initiated. Enter the code to verify."));
            }
            else if (provider == BcpTwoFactorProvider.Email || provider == BcpTwoFactorProvider.SMS)
            {
                if (provider == BcpTwoFactorProvider.SMS && string.IsNullOrEmpty(user.PhoneNumber))
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Please configure and verify a phone number on your profile first."));
                }

                // Send test OTP
                var mfaOtp = Random.Shared.Next(100000, 999999).ToString();
                var expiryTicks = DateTime.UtcNow.AddMinutes(5).Ticks;
                await _userManager.SetAuthenticationTokenAsync(user, "OzikolMfa", "SetupMfaCode", $"{mfaOtp}:{expiryTicks}");

                if (provider == BcpTwoFactorProvider.Email && _dbContext != null)
                {
                    _dbContext.BcpEmailQueue.Add(new BcpEmailQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientEmail = user.Email!,
                        RecipientName = user.FullName,
                        Subject = "MFA Configuration Verification Code",
                        HtmlBody = $"<div style='font-family:sans-serif; padding:20px;'><h3>MFA Verification Code</h3><p>Use code: <strong>{mfaOtp}</strong>. Valid for 5 minutes.</p></div>",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
                else if (provider == BcpTwoFactorProvider.SMS && _dbContext != null)
                {
                    _dbContext.BcpSmsQueue.Add(new BcpSmsQueue
                    {
                        Id = Guid.CreateVersion7(),
                        RelatedUserId = user.Id,
                        RecipientPhone = user.PhoneNumber!,
                        Message = $"Your Ozikol MFA verification code is {mfaOtp}.",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        Status = BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }

                return Ok(ApiResponse<object>.SuccessResponse(new { Provider = provider.ToString() }, "Verification OTP sent."));
            }

            return BadRequest(ApiResponse<object>.FailureResponse("MFA Provider not supported."));
        }

        [HttpPost("mfa/verify")]
        [Authorize]
        public async Task<IActionResult> VerifyMfa([FromBody] VerifyMfaRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            if (!System.Enum.TryParse<BcpTwoFactorProvider>(request.Provider, out var provider))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid provider."));
            }

            bool isValid = false;

            if (provider == BcpTwoFactorProvider.GoogleAuthenticator || provider == BcpTwoFactorProvider.MicrosoftAuthenticator)
            {
                isValid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, request.Code);
            }
            else
            {
                var tokenVal = await _userManager.GetAuthenticationTokenAsync(user, "OzikolMfa", "SetupMfaCode");
                if (!string.IsNullOrEmpty(tokenVal))
                {
                    var parts = tokenVal.Split(':');
                    if (parts.Length == 2 && parts[0] == request.Code.Trim())
                    {
                        if (long.TryParse(parts[1], out var expiryTicks))
                        {
                            if (DateTime.UtcNow.Ticks <= expiryTicks)
                            {
                                isValid = true;
                                await _userManager.RemoveAuthenticationTokenAsync(user, "OzikolMfa", "SetupMfaCode");
                            }
                        }
                    }
                }
            }

            if (!isValid)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Incorrect or expired verification code."));
            }

            // Save MFA State
            user.TwoFactorEnabled = true;
            user.PreferredTwoFactorProvider = provider;
            await _userManager.UpdateAsync(user);

            // Generate 8 Single-use recovery backup codes
            var codes = new List<string>();
            if (_dbContext != null)
            {
                // clear old backup codes
                var oldCodes = await _dbContext.BcpUserMfaBackupCodes.Where(c => c.UserId == user.Id).ToListAsync();
                _dbContext.BcpUserMfaBackupCodes.RemoveRange(oldCodes);

                for (int i = 0; i < 8; i++)
                {
                    var rawCode = Random.Shared.Next(100000, 999999).ToString();
                    codes.Add(rawCode);

                    var hashed = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawCode)));
                    _dbContext.BcpUserMfaBackupCodes.Add(new BcpUserMfaBackupCode
                    {
                        Id = Guid.CreateVersion7(),
                        UserId = user.Id,
                        HashedCode = hashed,
                        IsUsed = false
                    });
                }
                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { backupCodes = codes }, "Two-factor authentication successfully configured and verified."));
        }

        private async Task<string> GenerateJwtTokenAsync(Profile user, string? tenantKey = null, IEnumerable<string>? rolesList = null, string? jwtId = null)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "OzikolBCC_SuperSecretJwtEncryptionKey_2026_MustBe32BytesOrMore!";
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "Ozikol-BCC.Api";
            var jwtAudience = _configuration["Jwt:Audience"] ?? "Ozikol-BCC.Client";

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, jwtId ?? Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}".Trim()),
            };

            var activeTenant = tenantKey ?? _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrEmpty(activeTenant))
            {
                claims.Add(new Claim("tenant_key", activeTenant));
            }

            try
            {
                var roles = rolesList?.ToList() ?? (await _userManager.GetRolesAsync(user))?.ToList() ?? new List<string>();
                if (roles.Count == 0)
                {
                    roles.Add("Member");
                }

                foreach (var role in roles)
                {
                    claims.Add(new Claim(ClaimTypes.Role, role));
                    claims.Add(new Claim("role", role));
                }
            }
            catch
            {
                claims.Add(new Claim(ClaimTypes.Role, "Member"));
                claims.Add(new Claim("role", "Member"));
            }

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public class LoginRequestModel : Controllers.LoginRequestModel { }
        public class LoginResponseModel : Controllers.LoginResponseModel { }
    }

    public class LoginRequestModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginResponseModel
    {
        public string Token { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string? TenantKey { get; set; }
        public string? OrganizationName { get; set; }

        /// <summary>
        /// Dedicated company logo URL uploaded in BCC Admin settings, or null if using monogram initials.
        /// </summary>
        public string? LogoUrl { get; set; }

        public bool MustChangePassword { get; set; }

        /// <summary>
        /// Indicates if the user account requires completing multi-stage registration onboarding.
        /// </summary>
        public bool RequiresOnboarding { get; set; }

        /// <summary>
        /// The specific onboarding step the applicant should resume at if incomplete.
        /// </summary>
        public int OnboardingStep { get; set; } = 1;

        public List<string> Roles { get; set; } = new List<string>();

        /// <summary>
        /// Granular effective permissions (isSuperAdmin, isAdmin, hasGlobalEdit, features dictionary).
        /// </summary>
        public EffectiveUserPermissionsDto EffectivePermissions { get; set; } = new();

        /// <summary>
        /// List of active licensed modular feature codes for the user's organization.
        /// </summary>
        public List<string> LicensedTenantFeatures { get; set; } = new();
    }

    /// <summary>
    /// Effective granular permissions mapped from roles, capability modifiers, and feature tags.
    /// </summary>
    public class EffectiveUserPermissionsDto
    {
        public bool IsSuperAdmin { get; set; }
        public bool IsAdmin { get; set; }
        public bool HasGlobalEdit { get; set; }
        public bool CanAccessAdminConsole { get; set; }
        public Dictionary<string, string> Features { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    public class VerifyLoginMfaRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public bool TrustDevice { get; set; } = false;
    }

    public class ResendLoginMfaRequest
    {
        public string UserId { get; set; } = string.Empty;
    }

    public class ConfigureMfaRequest
    {
        public string Provider { get; set; } = "None"; // None, GoogleAuthenticator, MicrosoftAuthenticator, Email, SMS
    }

    public class VerifyMfaRequest
    {
        public string Provider { get; set; } = "None";
        public string Code { get; set; } = string.Empty;
    }

    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class RegisterRequestModel
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? ConfirmPassword { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Title { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Designation { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
        public string? InvitationToken { get; set; }

        /// <summary>
        /// Dynamic business-specific onboarding attribute key-value pairs submitted by the user.
        /// Corresponds to fields configured in BcpRegistrationFormFields.
        /// </summary>
        public Dictionary<string, object>? CustomAttributes { get; set; }

        /// <summary>
        /// Optional affiliate or partner referral code entered by the registrant.
        /// </summary>
        public string? ReferralCode { get; set; }

        /// <summary>
        /// Optional Google reCAPTCHA response token from client challenge widget.
        /// </summary>
        public string? RecaptchaToken { get; set; }

        /// <summary>
        /// Selected industry or organization sector during registration.
        /// </summary>
        public string? OrganizationType { get; set; }
    }

    public class ForceChangePasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
        public string? OldPassword { get; set; }
    }

    public class ResetPasswordWithTokenRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class RequestOtpRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordWithOtpRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
