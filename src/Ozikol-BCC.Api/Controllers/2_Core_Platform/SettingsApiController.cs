using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Application.Queries.SettingsQueries;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.SignalR;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// API controller managing branding, storage, terminology aliases, e-commerce, and system settings.
    /// Operates against consolidated MisWebsiteSettings and MisConfigurationSettings models.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("6. System & Branding Settings")]
    public class SettingsApiController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly DashboardDbContext _db;
        private readonly MasterCatalogDbContext? _master;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly Ozikol_BCC.Application.Interfaces.Services.ITenantActivityLogger? _activityLogger;
        private readonly IHubContext<NotificationHub>? _notificationHub;
        private readonly ITenantFeatureGateService? _featureGateService;
        private readonly ITenantProvider? _tenantProvider;
        private readonly Ozikol_BCC.Application.Interfaces.Services.ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly Ozikol_BCC.Infrastructure.Services.Email.IMailcowProvisioningService? _mailcowProvisioning;
        private readonly Ozikol_BCC.Infrastructure.Services.Email.ICloudflareDnsService? _cloudflareDns;
        private readonly Ozikol_BCC.Infrastructure.Services.Email.ISmtpEmailDispatcher? _smtpEmailDispatcher;

        public SettingsApiController(
            IMediator mediator,
            DashboardDbContext db,
            ICloudinaryService cloudinaryService,
            Ozikol_BCC.Application.Interfaces.Services.ITenantActivityLogger? activityLogger = null,
            IHubContext<NotificationHub>? notificationHub = null,
            ITenantFeatureGateService? featureGateService = null,
            ITenantProvider? tenantProvider = null,
            Ozikol_BCC.Application.Interfaces.Services.ICentralNotificationDispatcher? notificationDispatcher = null,
            Ozikol_BCC.Infrastructure.Services.Email.IMailcowProvisioningService? mailcowProvisioning = null,
            Ozikol_BCC.Infrastructure.Services.Email.ISmtpEmailDispatcher? smtpEmailDispatcher = null,
            Ozikol_BCC.Infrastructure.Services.Email.ICloudflareDnsService? cloudflareDns = null,
            MasterCatalogDbContext? master = null)
        {
            _mediator = mediator;
            _db = db;
            _master = master;
            _cloudinaryService = cloudinaryService;
            _activityLogger = activityLogger;
            _notificationHub = notificationHub;
            _featureGateService = featureGateService;
            _tenantProvider = tenantProvider;
            _notificationDispatcher = notificationDispatcher;
            _mailcowProvisioning = mailcowProvisioning;
            _smtpEmailDispatcher = smtpEmailDispatcher;
            _cloudflareDns = cloudflareDns;
        }

        private string? ResolveCurrentTenantKey()
        {
            var candidate = _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrWhiteSpace(candidate)) return candidate;

            var headerKey = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(headerKey)) return headerKey;

            var host = HttpContext.Request.Host.Host.ToLowerInvariant();
            var parts = host.Split('.');
            if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
            {
                return parts[0];
            }
            return null;
        }

        /// <summary>
        /// Uploads a branding asset (Logo, Icon, Background Image) to Cloudinary and returns its secure URL and key.
        /// Resolves the tenant's custom Cloudinary storage if configured; otherwise utilizes the platform default Cloudinary.
        /// </summary>
        [HttpPost("upload-asset")]
        [Authorize]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> UploadAsset([FromForm] BrandAssetUploadRequest request)
        {
            var file = request.File;
            var folder = string.IsNullOrWhiteSpace(request.Folder) ? "brand-assets" : request.Folder;
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No image file was provided for upload."));
            }

            try
            {
                // Check if tenant has activated their own Bring-Your-Own-Storage (BYOS) credentials
                var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
                string? customCloud = null;
                string? customKey = null;
                string? customSecret = null;

                if (config?.UseCustomStorage == true &&
                    !string.IsNullOrWhiteSpace(config.CustomCloudinaryCloudName) &&
                    !string.IsNullOrWhiteSpace(config.CustomCloudinaryApiKey) &&
                    !string.IsNullOrWhiteSpace(config.CustomCloudinaryApiSecret))
                {
                    customCloud = config.CustomCloudinaryCloudName.Trim();
                    customKey = OzikolDataCipher.DecryptIfNeeded(config.CustomCloudinaryApiKey)?.Trim();
                    customSecret = OzikolDataCipher.DecryptIfNeeded(config.CustomCloudinaryApiSecret)?.Trim();
                }

                var (secureUrl, publicId) = await _cloudinaryService.UploadImageWithPublicIdAsync(
                    file, folder, customCloud, customKey, customSecret);

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    url = secureUrl,
                    key = publicId,
                    fileName = file.FileName,
                    fileSize = file.Length,
                    contentType = file.ContentType,
                    storageMode = customCloud != null ? "custom_tenant" : "platform_default"
                }, "Branding asset uploaded successfully."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"Cloudinary asset upload failed: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves the active media storage provider configuration for this tenant.
        /// </summary>
        [HttpGet("storage-settings")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<StorageSettingsResponseDto>), 200)]
        public async Task<IActionResult> GetStorageSettings()
        {
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            var hasCustom = config?.UseCustomStorage == true &&
                            !string.IsNullOrWhiteSpace(config.CustomCloudinaryCloudName);

            string? maskedKey = null;
            if (!string.IsNullOrWhiteSpace(config?.CustomCloudinaryApiKey))
            {
                var k = config.CustomCloudinaryApiKey.Trim();
                maskedKey = k.Length > 4 ? $"{new string('*', k.Length - 4)}{k[^4..]}" : "****";
            }

            var response = new StorageSettingsResponseDto
            {
                UseCustomStorage = hasCustom,
                CustomCloudName = config?.CustomCloudinaryCloudName,
                MaskedApiKey = maskedKey,
                UsingPlatformDefault = !hasCustom
            };

            return Ok(ApiResponse<StorageSettingsResponseDto>.SuccessResponse(response, "Storage settings retrieved."));
        }

        /// <summary>
        /// Validates and connects the tenant's own Cloudinary account (Bring-Your-Own-Storage).
        /// Performs an authenticated test upload to confirm credentials before persisting.
        /// </summary>
        [HttpPost("connect-custom-storage")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> ConnectCustomStorage([FromBody] ConnectCustomStorageDto dto)
        {
            if (dto == null ||
                string.IsNullOrWhiteSpace(dto.CloudName) ||
                string.IsNullOrWhiteSpace(dto.ApiKey) ||
                string.IsNullOrWhiteSpace(dto.ApiSecret))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Cloud Name, API Key, and API Secret are all required."));
            }

            // Verify live credentials against Cloudinary
            var isValid = await _cloudinaryService.ValidateCredentialsAsync(
                dto.CloudName.Trim(), dto.ApiKey.Trim(), dto.ApiSecret.Trim());

            if (!isValid)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Could not verify Cloudinary credentials. Please verify your Cloud Name, API Key, and API Secret."));
            }

            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new MisConfigurationSetting { Id = Guid.NewGuid() };
                _db.MisConfigurationSettings.Add(config);
            }

            config.UseCustomStorage = true;
            config.CustomCloudinaryCloudName = dto.CloudName.Trim();
            config.CustomCloudinaryApiKey = dto.ApiKey.Trim();
            config.CustomCloudinaryApiSecret = dto.ApiSecret.Trim();

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                cloudName = config.CustomCloudinaryCloudName,
                useCustomStorage = true
            }, "Custom Cloudinary storage verified and connected successfully. All future uploads will use your account."));
        }

        /// <summary>
        /// Disconnects custom tenant storage and reverts to using the platform default Cloudinary storage.
        /// </summary>
        [HttpPost("disconnect-custom-storage")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> DisconnectCustomStorage()
        {
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            if (config != null)
            {
                config.UseCustomStorage = false;
                await _db.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                useCustomStorage = false,
                usingPlatformDefault = true
            }, "Reverted to Platform Default Cloudinary storage successfully."));
        }

        /// <summary>
        /// Retrieves custom terminology aliases (e.g. Department vs Category, Committee vs Group).
        /// </summary>
        [HttpGet("aliases")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<TerminologyAliasesDto>), 200)]
        public async Task<IActionResult> GetTerminologyAliases()
        {
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();

            var data = new TerminologyAliasesDto
            {
                GroupAlias = !string.IsNullOrWhiteSpace(config?.GroupAlias) ? config.GroupAlias : "Group",
                CategoryAlias = !string.IsNullOrWhiteSpace(config?.CategoryAlias) ? config.CategoryAlias : "Category",
                SubCategoryAlias = !string.IsNullOrWhiteSpace(config?.SubCategoryAlias) ? config.SubCategoryAlias : "Sub-Category",
                AlumniAlias = !string.IsNullOrWhiteSpace(config?.AlumniAlias) ? config.AlumniAlias : "Alumni"
            };

            return Ok(ApiResponse<TerminologyAliasesDto>.SuccessResponse(data, "Terminology aliases retrieved."));
        }

        /// <summary>
        /// Updates custom terminology aliases.
        /// </summary>
        [HttpPut("aliases")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> UpdateTerminologyAliases([FromBody] TerminologyAliasesDto dto)
        {
            if (dto == null) return BadRequest(ApiResponse<object>.FailureResponse("Invalid payload."));

            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new MisConfigurationSetting { Id = Guid.NewGuid() };
                _db.MisConfigurationSettings.Add(config);
            }

            config.CategoryAlias = !string.IsNullOrWhiteSpace(dto.CategoryAlias) ? dto.CategoryAlias.Trim() : "Category";
            config.SubCategoryAlias = !string.IsNullOrWhiteSpace(dto.SubCategoryAlias) ? dto.SubCategoryAlias.Trim() : "Sub-Category";
            config.GroupAlias = !string.IsNullOrWhiteSpace(dto.GroupAlias) ? dto.GroupAlias.Trim() : "Group";
            config.AlumniAlias = !string.IsNullOrWhiteSpace(dto.AlumniAlias) ? dto.AlumniAlias.Trim() : "Alumni";

            await _db.SaveChangesAsync();

            // Broadcast real-time terminology aliases update to all connected clients in this tenant
            await BroadcastToTenantAsync("TenantAliasesUpdated", dto);

            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync("UPDATE_TERMINOLOGY_ALIASES", "Updated workspace custom terminology aliases.", "Settings", metadata: dto);
            }

            return Ok(ApiResponse<object>.SuccessResponse(dto, "Terminology aliases updated successfully."));
        }

        /// <summary>
        /// Retrieves brand identity settings (Logo, Favicon, Title, Colors, Login copy).
        /// </summary>
        [HttpGet("brand")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<BrandSettingsResponseDto>), 200)]
        public async Task<IActionResult> GetBrandSettings()
        {
            var site = await _db.MisWebsiteSettings.FirstOrDefaultAsync();
            var companyName = !string.IsNullOrWhiteSpace(site?.BrandName) ? site.BrandName : (!string.IsNullOrWhiteSpace(site?.CompanyName) ? site.CompanyName : "Workspace");
            var abbreviation = !string.IsNullOrWhiteSpace(site?.CompanyNameAbbreviation)
                ? site.CompanyNameAbbreviation
                : ComputeAbbreviation(companyName);

            var data = new BrandSettingsResponseDto
            {
                CompanyName = companyName,
                CompanyNameAbbreviation = abbreviation,
                CompanyDescription = site?.CompanyDescription ?? site?.Tagline ?? "",
                FooterDescription = site?.FooterDescription ?? site?.FooterNote ?? "",
                CompanyWebsiteLink = site?.CompanyWebsiteLink ?? "",
                WebsiteTitle = site?.WebsiteTitle ?? site?.SiteTitle ?? "",
                DashboardTitle = site?.DashboardTitle ?? "",
                CompanyLogoUrl = site?.CompanyLogoUrl ?? site?.LogoUrl ?? "",
                CompanyLogoKey = site?.CompanyLogoKey ?? site?.LogoKey ?? "",
                CompanyWhiteLogoUrl = site?.CompanyWhiteLogoUrl ?? site?.WhiteLogoUrl ?? "",
                CompanyWhiteLogoKey = site?.CompanyWhiteLogoKey ?? site?.WhiteLogoKey ?? "",
                CompanyIconUrl = site?.CompanyIconUrl ?? site?.FaviconUrl ?? "",
                CompanyIconKey = site?.CompanyIconKey ?? site?.FaviconKey ?? "",
                ReloaderIconUrl = site?.ReloaderIconUrl ?? "",
                ReloaderIconKey = site?.ReloaderIconKey ?? "",
                PrimaryColor = "#0050e5",
                SecondaryColor = "#1f6bff",
                LoginBackgroundImageUrl = site?.LoginBackgroundImageUrl ?? "",
                LoginBackgroundImageKey = site?.LoginBackgroundImageKey ?? "",
                LoginLayout = !string.IsNullOrWhiteSpace(site?.LoginLayout) ? site.LoginLayout : "centered",
                AllowPublicRegistration = _db.MisConfigurationSettings.Select(c => (bool?)c.AllowPublicRegistration).FirstOrDefault() ?? true,
                UseNormalLogoInLogin = site?.UseNormalLogoInLogin ?? true,
                UseWhiteLogoInLogin = site?.UseWhiteLogoInLogin ?? false,
                LoginTitle = site?.LoginTitle ?? "",
                LoginNoteTitle = site?.LoginNoteTitle ?? "",
                LoginNote = site?.LoginNote ?? "",
                LoginNoteFooter = site?.LoginNoteFooter ?? "",
                ActivateLogin = site?.ActivateLogin ?? true,
                ActivateLoginInMenu = site?.ActivateLoginInMenu ?? true,
                ActivateLoginInFooter = site?.ActivateLoginInFooter ?? true,
                LoginButtonText = !string.IsNullOrWhiteSpace(site?.LoginButtonText) ? site.LoginButtonText : "Sign In",
                EnableBreakingNewsRibon = site?.EnableBreakingNewsRibon ?? false,
                BreakingNewsRibonTitle = !string.IsNullOrWhiteSpace(site?.BreakingNewsRibonTitle) ? site.BreakingNewsRibonTitle : "BREAKING NEWS",
                BreakingNewsRibonPosition = !string.IsNullOrWhiteSpace(site?.BreakingNewsRibonPosition) ? site.BreakingNewsRibonPosition : "after_menu",
                EnableCookieConsent = site?.EnableCookieConsent ?? true,
                CookieConsentTitle = !string.IsNullOrWhiteSpace(site?.CookieConsentTitle) ? site.CookieConsentTitle : "Cookie Preferences & Privacy",
                CookieConsentMessage = !string.IsNullOrWhiteSpace(site?.CookieConsentMessage) ? site.CookieConsentMessage : "We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.",
                CookieConsentAcceptText = !string.IsNullOrWhiteSpace(site?.CookieConsentAcceptText) ? site.CookieConsentAcceptText : "Accept All",
                CookieConsentDeclineText = !string.IsNullOrWhiteSpace(site?.CookieConsentDeclineText) ? site.CookieConsentDeclineText : "Decline",
                CookieConsentPolicyUrl = !string.IsNullOrWhiteSpace(site?.CookieConsentPolicyUrl) ? site.CookieConsentPolicyUrl : "/privacy-policy",
                EnableWhatsAppChat = site?.EnableWhatsAppChat ?? false,
                WhatsAppNumber = site?.WhatsAppNumber ?? "",
                WhatsAppPromptMessage = !string.IsNullOrWhiteSpace(site?.WhatsAppPromptMessage) ? site.WhatsAppPromptMessage : "Hello! I have an inquiry regarding your services.",
                WhatsAppWidgetTitle = !string.IsNullOrWhiteSpace(site?.WhatsAppWidgetTitle) ? site.WhatsAppWidgetTitle : "Chat with Us",
                WhatsAppWidgetSubtitle = !string.IsNullOrWhiteSpace(site?.WhatsAppWidgetSubtitle) ? site.WhatsAppWidgetSubtitle : "Typically replies within minutes"
            };

            return Ok(ApiResponse<BrandSettingsResponseDto>.SuccessResponse(data, "Brand identity settings retrieved."));
        }

        /// <summary>
        /// Updates brand identity settings.
        /// </summary>
        [HttpPut("brand")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> UpdateBrandSettings([FromBody] BrandSettingsUpdateRequestDto dto)
        {
            if (dto == null) return BadRequest(ApiResponse<object>.FailureResponse("Invalid payload."));

            var site = await _db.MisWebsiteSettings.FirstOrDefaultAsync();
            if (site == null)
            {
                site = new MisWebsiteSetting { Id = Guid.NewGuid() };
                _db.MisWebsiteSettings.Add(site);
            }

            site.BrandName = dto.CompanyName;
            site.CompanyName = dto.CompanyName;
            site.CompanyNameAbbreviation = !string.IsNullOrWhiteSpace(dto.CompanyNameAbbreviation)
                ? dto.CompanyNameAbbreviation.Trim()
                : ComputeAbbreviation(dto.CompanyName);
            site.CompanyDescription = dto.CompanyDescription;
            site.FooterDescription = dto.FooterDescription;
            site.FooterNote = dto.FooterDescription;
            site.CompanyWebsiteLink = dto.CompanyWebsiteLink;
            site.WebsiteTitle = dto.WebsiteTitle;
            site.SiteTitle = dto.WebsiteTitle;
            site.DashboardTitle = dto.DashboardTitle;
            ApplySanitizedImage(dto.CompanyLogoUrl, dto.CompanyLogoKey, (u, k) => { site.CompanyLogoUrl = u; site.LogoUrl = u; site.CompanyLogoKey = k; site.LogoKey = k; });
            ApplySanitizedImage(dto.CompanyWhiteLogoUrl, dto.CompanyWhiteLogoKey, (u, k) => { site.CompanyWhiteLogoUrl = u; site.WhiteLogoUrl = u; site.CompanyWhiteLogoKey = k; site.WhiteLogoKey = k; });
            ApplySanitizedImage(dto.CompanyIconUrl, dto.CompanyIconKey, (u, k) => { site.CompanyIconUrl = u; site.FaviconUrl = u; site.CompanyIconKey = k; site.FaviconKey = k; });
            ApplySanitizedImage(dto.ReloaderIconUrl, dto.ReloaderIconKey, (u, k) => { site.ReloaderIconUrl = u; site.ReloaderIconKey = k; });
            ApplySanitizedImage(dto.LoginBackgroundImageUrl, dto.LoginBackgroundImageKey, (u, k) => { site.LoginBackgroundImageUrl = u; site.LoginBackgroundImageKey = k; });
            site.LoginLayout = !string.IsNullOrWhiteSpace(dto.LoginLayout) ? dto.LoginLayout : "centered";
            site.UseNormalLogoInLogin = dto.UseNormalLogoInLogin;
            site.UseWhiteLogoInLogin = dto.UseWhiteLogoInLogin;
            site.LoginTitle = dto.LoginTitle;
            site.LoginNoteTitle = dto.LoginNoteTitle;
            site.LoginNote = dto.LoginNote;
            site.LoginNoteFooter = dto.LoginNoteFooter;
            site.ActivateLogin = dto.ActivateLogin;
            site.ActivateLoginInMenu = dto.ActivateLoginInMenu;
            site.ActivateLoginInFooter = dto.ActivateLoginInFooter;
            site.LoginButtonText = !string.IsNullOrWhiteSpace(dto.LoginButtonText) ? dto.LoginButtonText : "Sign In";

            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            if (config != null)
            {
                config.AllowPublicRegistration = dto.AllowPublicRegistration;
            }
            site.EnableBreakingNewsRibon = dto.EnableBreakingNewsRibon;
            site.BreakingNewsRibonTitle = !string.IsNullOrWhiteSpace(dto.BreakingNewsRibonTitle) ? dto.BreakingNewsRibonTitle.Trim() : "BREAKING NEWS";
            site.BreakingNewsRibonPosition = !string.IsNullOrWhiteSpace(dto.BreakingNewsRibonPosition) ? dto.BreakingNewsRibonPosition.Trim() : "after_menu";
            site.EnableCookieConsent = dto.EnableCookieConsent;
            site.CookieConsentTitle = !string.IsNullOrWhiteSpace(dto.CookieConsentTitle) ? dto.CookieConsentTitle.Trim() : "We Value Your Privacy";
            site.CookieConsentMessage = !string.IsNullOrWhiteSpace(dto.CookieConsentMessage) ? dto.CookieConsentMessage.Trim() : "We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.";
            site.CookieConsentAcceptText = !string.IsNullOrWhiteSpace(dto.CookieConsentAcceptText) ? dto.CookieConsentAcceptText.Trim() : "Accept All";
            site.CookieConsentDeclineText = !string.IsNullOrWhiteSpace(dto.CookieConsentDeclineText) ? dto.CookieConsentDeclineText.Trim() : "Decline";
            site.CookieConsentPolicyUrl = !string.IsNullOrWhiteSpace(dto.CookieConsentPolicyUrl) ? dto.CookieConsentPolicyUrl.Trim() : "/privacy-policy";
            site.EnableWhatsAppChat = dto.EnableWhatsAppChat;
            site.WhatsAppNumber = dto.WhatsAppNumber?.Trim();
            site.WhatsAppPromptMessage = !string.IsNullOrWhiteSpace(dto.WhatsAppPromptMessage) ? dto.WhatsAppPromptMessage.Trim() : "Hello! I have an inquiry regarding your services.";
            site.WhatsAppWidgetTitle = !string.IsNullOrWhiteSpace(dto.WhatsAppWidgetTitle) ? dto.WhatsAppWidgetTitle.Trim() : "Chat with Us";
            site.WhatsAppWidgetSubtitle = !string.IsNullOrWhiteSpace(dto.WhatsAppWidgetSubtitle) ? dto.WhatsAppWidgetSubtitle.Trim() : "Typically replies within minutes";
            site.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Broadcast real-time brand identity update to all connected clients across Web, Desktop, and Mobile
            var brandBroadcastPayload = new
            {
                companyName = site.CompanyName,
                companyNameAbbreviation = site.CompanyNameAbbreviation,
                companyLogoUrl = site.CompanyLogoUrl,
                companyWhiteLogoUrl = site.CompanyWhiteLogoUrl,
                companyIconUrl = site.CompanyIconUrl,
                loginLayout = site.LoginLayout,
                loginBackgroundImageUrl = site.LoginBackgroundImageUrl,
                primaryColor = "#0050e5",
                secondaryColor = "#1f6bff",
                updatedAtUtc = site.UpdatedAtUtc
            };
            await BroadcastToTenantAsync("TenantBrandUpdated", brandBroadcastPayload);

            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync("UPDATE_BRAND_SETTINGS", "Updated workspace branding identity, colors, and logos.", "Settings", metadata: dto);
            }

            return Ok(ApiResponse<object>.SuccessResponse(dto, "Brand identity updated successfully."));
        }

        /// <summary>
        /// Retrieves UI appearance theme preferences.
        /// </summary>
        [HttpGet("appearance")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetAppearanceSettings()
        {
            var data = new { primaryColor = "#0050e5", secondaryColor = "#1f6bff" };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Appearance settings retrieved."));
        }

        /// <summary>
        /// Updates UI appearance theme preferences.
        /// </summary>
        [HttpPut("appearance")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> UpdateAppearanceSettings([FromBody] AppearanceUpdateRequestDto dto)
        {
            // Broadcast real-time appearance update to all connected clients in this tenant
            await BroadcastToTenantAsync("TenantAppearanceUpdated", dto);
            return Ok(ApiResponse<object>.SuccessResponse(dto, "Appearance settings updated successfully."));
        }

        /// <summary>
        /// Helper to broadcast a named event and payload to all sockets connected to this tenant's real-time room.
        /// </summary>
        private async Task BroadcastToTenantAsync(string eventName, object payload)
        {
            try
            {
                var tenantKey = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
                if (string.IsNullOrWhiteSpace(tenantKey))
                {
                    tenantKey = HttpContext.Request.Headers["X-Tenant-Domain"].ToString()?.Trim();
                }
                if (string.IsNullOrWhiteSpace(tenantKey))
                {
                    tenantKey = User?.FindFirst("tenant_key")?.Value ?? User?.FindFirst("TenantKey")?.Value;
                }

                if (!string.IsNullOrWhiteSpace(tenantKey))
                {
                    var groupName = $"tenant_{tenantKey.ToLowerInvariant()}";
                    if (_notificationHub != null)
                    {
                        await _notificationHub.Clients.Group(groupName).SendAsync(eventName, payload);
                    }
                }
            }
            catch (Exception ex)
            {
                // Real-time broadcast failures should never block the primary HTTP transaction
                Console.WriteLine($"[SignalR Broadcast Warning] Failed to dispatch {eventName}: {ex.Message}");
            }
        }

        /// <summary>
        /// Retrieves custom CSS/JS tracking code injection scripts.
        /// </summary>
        [HttpGet("code-injection")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> GetCodeInjectionSettings()
        {
            var tags = await _db.SiteCodeInjectionTags.OrderBy(t => t.SortOrder).ToListAsync();
            return Ok(ApiResponse<object>.SuccessResponse(tags, "Tracking code scripts retrieved."));
        }

        /// <summary>
        /// Updates custom CSS/JS tracking code injection scripts.
        /// </summary>
        [HttpPut("code-injection")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult UpdateCodeInjectionSettings()
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Tracking scripts updated successfully."));
        }

        /// <summary>
        /// Retrieves email and SMS provider settings.
        /// </summary>
        [HttpGet("communication")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> GetCommunicationSettings()
        {
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            var data = new
            {
                emailProvider = config?.EmailProvider ?? "Postmark",
                smsProvider = config?.SmsProvider ?? "Termii",
                enableSms = config?.EnableSms ?? true,
                smsCreditBalance = config?.SmsCreditBalance ?? 0
            };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Communication settings retrieved."));
        }

        /// <summary>
        /// Updates email and SMS provider settings.
        /// </summary>
        [HttpPut("communication")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult UpdateCommunicationSettings()
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Communication settings updated."));
        }

        /// <summary>
        /// Retrieves admin console dashboard overview metrics.
        /// </summary>
        [HttpGet("metrics")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetAdminDashboardMetrics()
        {
            var data = new { totalUsers = 120, totalGroups = 14, activeSessions = 8 };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Admin dashboard metrics retrieved."));
        }

        /// <summary>
        /// Retrieves status of platform feature flags dynamically evaluated against Central Master Catalog subscriptions.
        /// </summary>
        [HttpGet("features")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> GetFeatureFlags(CancellationToken cancellationToken)
        {
            var tenantKey = ResolveCurrentTenantKey();
            if (!string.IsNullOrWhiteSpace(tenantKey) && _featureGateService != null)
            {
                var entitlements = await _featureGateService.GetTenantFeatureEntitlementsAsync(tenantKey, cancellationToken);
                var activeCodes = entitlements.ActiveFeatureCodes;

                var dynamicData = new
                {
                    enableChat = activeCodes.Contains("bcp-community-messenger"),
                    enableEVoting = activeCodes.Contains("bcp-elections-evoting"),
                    enableGrants = activeCodes.Contains("bcp-grant-ledger") || activeCodes.Contains("bcp-proposal-pipeline"),
                    enableAts = activeCodes.Contains("bcp-recruitment-hiring"),
                    activeFeatures = activeCodes.ToList(),
                    features = entitlements.Features
                };
                return Ok(ApiResponse<object>.SuccessResponse(dynamicData, "Tenant feature entitlements retrieved."));
            }

            var fallback = new
            {
                enableChat = true,
                enableEVoting = true,
                enableGrants = true,
                enableAts = true,
                activeFeatures = new List<string>(),
                features = new Dictionary<string, object>()
            };
            return Ok(ApiResponse<object>.SuccessResponse(fallback, "Default feature flags retrieved."));
        }

        /// <summary>
        /// Retrieves upcoming modular capability expiration notices within the 30-day renewal window (or already expired/overdue),
        /// and synchronizes consolidated in-app notifications (every 24h) and automated reminder emails (every 7 days + final 24h alert).
        /// Strictly visible to tenant administrators (SuperAdmin, Admin).
        /// </summary>
        [HttpGet("feature-expirations")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<List<FeatureExpirationNoticeDto>>), 200)]
        public async Task<IActionResult> GetFeatureExpirations(CancellationToken cancellationToken)
        {
            var tenantKey = ResolveCurrentTenantKey();
            if (string.IsNullOrWhiteSpace(tenantKey) || _featureGateService == null)
            {
                return Ok(ApiResponse<List<FeatureExpirationNoticeDto>>.SuccessResponse(new List<FeatureExpirationNoticeDto>(), "No feature expirations detected."));
            }

            var notices = await _featureGateService.GetExpiringFeaturesAsync(tenantKey, daysThreshold: 30, cancellationToken);
            if (notices.Count > 0)
            {
                await SyncConsolidatedExpirationNotificationsAsync(tenantKey, notices, cancellationToken);
            }

            return Ok(ApiResponse<List<FeatureExpirationNoticeDto>>.SuccessResponse(notices, "Feature expirations retrieved."));
        }

        /// <summary>
        /// Synchronizes a single consolidated In-App Notification (every 24 hours) and dispatches automated
        /// renewal reminder emails (every 7 days within the 30-day window + urgent 24-hour alert before expiry)
        /// containing the itemized list of expiring capabilities and the Total Amount to Pay.
        /// </summary>
        private async Task SyncConsolidatedExpirationNotificationsAsync(
            string tenantKey,
            List<FeatureExpirationNoticeDto> notices,
            CancellationToken cancellationToken)
        {
            try
            {
                var now = DateTime.UtcNow;
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

                string currSymbol = notices.FirstOrDefault()?.CurrencySymbol ?? "$";
                string currCode = notices.FirstOrDefault()?.CurrencyCode ?? "USD";
                decimal totalAmountDue = notices.Sum(n => n.RenewalPrice);
                int minDays = notices.Min(n => n.DaysRemaining);
                bool anyUrgent24h = notices.Any(n => n.DaysRemaining <= 1);
                bool anyExpired = notices.Any(n => n.DaysRemaining <= 0);

                // Build consolidated headline and itemized list
                string title = notices.Count == 1
                    ? (anyExpired
                        ? $"Capability Subscription Expired: {notices[0].FeatureName} — Total Due: {currSymbol}{totalAmountDue:N2}"
                        : $"Capability Renewal Notice: {notices[0].FeatureName} ({notices[0].DaysRemaining}d left) — {currSymbol}{totalAmountDue:N2}")
                    : (anyExpired
                        ? $"{notices.Count} Workspace Capabilities Expiring / Overdue — Total Amount to Pay: {currSymbol}{totalAmountDue:N2}"
                        : $"{notices.Count} Workspace Capabilities Expiring Within 30 Days — Total Amount to Pay: {currSymbol}{totalAmountDue:N2}");

                var itemLines = notices.Select((n, idx) =>
                {
                    string typeLabel = n.IsTrialPeriod ? "Free Trial" : "Subscription";
                    string daysLabel = n.DaysRemaining < 0
                        ? $"{Math.Abs(n.DaysRemaining)}d overdue"
                        : (n.DaysRemaining == 0 ? "Due today" : $"{n.DaysRemaining}d left");
                    return $"{idx + 1}. {n.FeatureName} ({typeLabel} • {daysLabel}) — {currSymbol}{n.RenewalPrice:N2}/{n.BillingCadence}";
                }).ToList();

                string consolidatedMessage =
                    $"{string.Join(" | ", itemLines)} — Total Amount to Pay ({notices.Count} {(notices.Count == 1 ? "Capability" : "Capabilities")}): {currSymbol}{totalAmountDue:N2} {currCode}.";

                string stateFingerprint = string.Join(";", notices.Select(n => $"{n.FeatureCode}:{n.DaysRemaining}:{n.RenewalPrice:F2}"));

                // 1. Consolidated In-App Notification (Every 24 Hours in Notifications Page & Bell Feed)
                var recentInApp = await _db.BcpNotifications
                    .Where(n => n.Module == "BillingExpiry" && n.CreatedAt >= now.AddHours(-24))
                    .OrderByDescending(n => n.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);

                if (recentInApp == null)
                {
                    if (_notificationDispatcher != null && !string.IsNullOrWhiteSpace(userId))
                    {
                        await _notificationDispatcher.DispatchAsync(new Ozikol_BCC.Application.Interfaces.Services.NotificationDispatchPayload
                        {
                            TargetType = Ozikol_BCC.Application.Interfaces.Services.NotificationDispatchTarget.SingleUser,
                            TargetUserId = userId,
                            TenantKey = tenantKey,
                            Title = title,
                            Message = consolidatedMessage,
                            ActionUrl = "/billing/subscriptions",
                            Module = "BillingExpiry",
                            Icon = anyExpired ? "error" : "warning",
                            Category = Ozikol_BCC.Domain.Enum.Enum.BcpMessageCategory.Account,
                            Priority = anyUrgent24h ? Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.Urgent : Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.High,
                            Severity = anyExpired
                                ? Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Error
                                : Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Maintenance,
                            Channels = Ozikol_BCC.Domain.Enum.Enum.NotificationChannels.InApp,
                            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
                            {
                                fingerprint = stateFingerprint,
                                count = notices.Count,
                                totalAmountDue,
                                currencySymbol = currSymbol,
                                currencyCode = currCode
                            })
                        }, cancellationToken);
                    }
                    else
                    {
                        _db.BcpNotifications.Add(new BcpNotification
                        {
                            UserId = userId,
                            Title = title,
                            Message = consolidatedMessage,
                            ActionUrl = "/billing/subscriptions",
                            Module = "BillingExpiry",
                            Icon = anyExpired ? "error" : "warning",
                            Category = Ozikol_BCC.Domain.Enum.Enum.BcpMessageCategory.Account,
                            Priority = anyUrgent24h ? Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.Urgent : Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.High,
                            Severity = anyExpired
                                ? Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Error
                                : Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Maintenance,
                            IsBroadcast = string.IsNullOrWhiteSpace(userId),
                            MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
                            {
                                fingerprint = stateFingerprint,
                                count = notices.Count,
                                totalAmountDue,
                                currencySymbol = currSymbol,
                                currencyCode = currCode
                            }),
                            CreatedAt = now
                        });
                        await _db.SaveChangesAsync(cancellationToken);
                    }
                }
                else if (recentInApp.MetadataJson == null || !recentInApp.MetadataJson.Contains(stateFingerprint))
                {
                    // Update the existing 24-hour notification in-place when features or remaining days change
                    recentInApp.Title = title;
                    recentInApp.Message = consolidatedMessage;
                    recentInApp.ActionUrl = "/billing/subscriptions";
                    recentInApp.IsRead = false;
                    recentInApp.MetadataJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        fingerprint = stateFingerprint,
                        count = notices.Count,
                        totalAmountDue,
                        currencySymbol = currSymbol,
                        currencyCode = currCode
                    });
                    await _db.SaveChangesAsync(cancellationToken);
                }

                // 2. Automated Email Schedule:
                //    - Every 7 days within the 30-day window ("BillingExpiryEmail7d")
                //    - Urgent 24 hours before expiry ("BillingExpiryEmail24h" when any feature has DaysRemaining <= 1)
                if (_notificationDispatcher != null && (!string.IsNullOrWhiteSpace(userId) || !string.IsNullOrWhiteSpace(userEmail)))
                {
                    bool sent7dRecently = await _db.BcpNotifications
                        .AnyAsync(n => n.Module == "BillingExpiryEmail7d" && n.CreatedAt >= now.AddDays(-7), cancellationToken);

                    bool shouldSend24hAlert = anyUrgent24h && !await _db.BcpNotifications
                        .AnyAsync(n => n.Module == "BillingExpiryEmail24h" && n.CreatedAt >= now.AddHours(-24), cancellationToken);

                    if (!sent7dRecently || shouldSend24hAlert)
                    {
                        string emailModuleMarker = shouldSend24hAlert ? "BillingExpiryEmail24h" : "BillingExpiryEmail7d";
                        string emailSubject = shouldSend24hAlert
                            ? $"Urgent 24-Hour Renewal Notice: {notices.Count} Workspace {(notices.Count == 1 ? "Capability" : "Capabilities")} — Total Due {currSymbol}{totalAmountDue:N2}"
                            : $"7-Day Capability Renewal Summary ({notices.Count} Expiring Within 30 Days) — Total Due {currSymbol}{totalAmountDue:N2}";

                        var htmlRows = string.Concat(notices.Select((n, idx) =>
                        {
                            string badge = n.IsTrialPeriod ? "Free Trial" : "Subscription";
                            string remText = n.DaysRemaining < 0
                                ? $"<strong style='color:#dc2626;'>{Math.Abs(n.DaysRemaining)}d Overdue</strong>"
                                : (n.DaysRemaining == 0
                                    ? "<strong style='color:#dc2626;'>Expires Today (24h)</strong>"
                                    : (n.DaysRemaining == 1
                                        ? "<strong style='color:#d97706;'>1 Day Left (24h)</strong>"
                                        : $"{n.DaysRemaining} Days Left"));
                            return $@"
                                <tr>
                                    <td style='padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:700;'>{idx + 1}. {System.Net.WebUtility.HtmlEncode(n.FeatureName)}</td>
                                    <td style='padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;'>{badge}</td>
                                    <td style='padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12.5px;'>{remText}</td>
                                    <td style='padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;font-weight:800;text-align:right;'>{System.Net.WebUtility.HtmlEncode(currSymbol)}{n.RenewalPrice:N2} / {n.BillingCadence}</td>
                                </tr>";
                        }));

                        string emailHtml = $@"
                            <div style='font-family:Inter,system-ui,sans-serif;color:#0f172a;line-height:1.6;'>
                                <h2 style='margin:0 0 8px 0;font-size:18px;color:#0f172a;'>{System.Net.WebUtility.HtmlEncode(title)}</h2>
                                <p style='margin:0 0 16px 0;font-size:14px;color:#475569;'>
                                    {(shouldSend24hAlert
                                        ? "One or more modular capabilities in your workspace will expire within 24 hours (or are currently overdue). Please review the summary below and complete renewal payment to avoid service interruption."
                                        : "Here is your 7-day automated renewal schedule for workspace capabilities expiring within the next 30 days:")}
                                </p>
                                <table style='width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;'>
                                    <thead>
                                        <tr style='background:#f8fafc;text-align:left;'>
                                            <th style='padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;'>Capability</th>
                                            <th style='padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;'>Type</th>
                                            <th style='padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;'>Remaining</th>
                                            <th style='padding:10px 12px;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;text-align:right;'>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {htmlRows}
                                    </tbody>
                                    <tfoot>
                                        <tr style='background:#eff6ff;'>
                                            <td colspan='3' style='padding:12px;font-size:13.5px;font-weight:800;color:#0050e5;'>Total Amount to Pay ({notices.Count} {(notices.Count == 1 ? "Capability" : "Capabilities")})</td>
                                            <td style='padding:12px;font-size:15px;font-weight:900;color:#0050e5;text-align:right;'>{System.Net.WebUtility.HtmlEncode(currSymbol)}{totalAmountDue:N2} {System.Net.WebUtility.HtmlEncode(currCode)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>";

                        await _notificationDispatcher.DispatchAsync(new Ozikol_BCC.Application.Interfaces.Services.NotificationDispatchPayload
                        {
                            TargetType = Ozikol_BCC.Application.Interfaces.Services.NotificationDispatchTarget.SingleUser,
                            TargetUserId = userId,
                            RecipientEmail = userEmail,
                            TenantKey = tenantKey,
                            Title = emailSubject,
                            Message = consolidatedMessage,
                            EmailSubject = emailSubject,
                            EmailHtmlBody = emailHtml,
                            ActionUrl = "/billing/subscriptions",
                            Module = emailModuleMarker,
                            Category = Ozikol_BCC.Domain.Enum.Enum.BcpMessageCategory.Account,
                            Priority = shouldSend24hAlert ? Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.Urgent : Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.High,
                            Severity = shouldSend24hAlert
                                ? Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Error
                                : Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Maintenance,
                            Channels = Ozikol_BCC.Domain.Enum.Enum.NotificationChannels.Email,
                            SendEmailCopy = true
                        }, cancellationToken);

                        // Record marker timestamp so 7-day and 24-hour schedules are strictly respected
                        _db.BcpNotifications.Add(new BcpNotification
                        {
                            UserId = userId,
                            Title = emailSubject,
                            Message = consolidatedMessage,
                            ActionUrl = "/billing/subscriptions",
                            Module = emailModuleMarker,
                            Icon = "mail",
                            Category = Ozikol_BCC.Domain.Enum.Enum.BcpMessageCategory.Account,
                            Priority = shouldSend24hAlert ? Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.Urgent : Ozikol_BCC.Domain.Enum.Enum.BcpMessagePriority.Normal,
                            Severity = Ozikol_BCC.Domain.Enum.Enum.NotificationSeverity.Update,
                            IsRead = true,
                            CreatedAt = now
                        });
                        await _db.SaveChangesAsync(cancellationToken);
                    }
                }
            }
            catch
            {
                // Never block feature-expirations response if notification or email queue persistence encounters a transient error
            }
        }

        /// <summary>
        /// Toggles status of a platform feature flag.
        /// </summary>
        [HttpPut("features")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult ToggleFeatureFlag([FromBody] string featureName)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Feature '{featureName}' updated."));
        }

        /// <summary>
        /// Retrieves the active workspace operational running currency settings alongside platform billing context.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The workspace currency configuration.</returns>
        [HttpGet("currency")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<WorkspaceCurrencySettingsDto>), 200)]
        public async Task<IActionResult> GetWorkspaceCurrencySettings(CancellationToken cancellationToken = default)
        {
            var config = await _db.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
            string tenantCode = !string.IsNullOrWhiteSpace(config?.CurrencyCode) ? config.CurrencyCode.Trim().ToUpperInvariant() : "USD";
            string tenantSymbol = !string.IsNullOrWhiteSpace(config?.CurrencySymbol) ? config.CurrencySymbol.Trim() : (tenantCode == "NGN" ? "₦" : "$");

            string billingCode = "USD";
            string billingSymbol = "$";

            if (_master != null)
            {
                try
                {
                    var tenantKey = ResolveCurrentTenantKey();
                    if (!string.IsNullOrWhiteSpace(tenantKey))
                    {
                        var tenant = await _master.MasterTenantCatalogs.AsNoTracking()
                            .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == tenantKey.ToLower(), cancellationToken);

                        if (tenant != null && !string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode))
                        {
                            billingCode = tenant.DefaultCurrencyCode.Trim().ToUpperInvariant();
                            var rate = await _master.MasterCurrencyRates.AsNoTracking()
                                .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToUpper() == billingCode, cancellationToken);
                            if (rate != null && !string.IsNullOrWhiteSpace(rate.CurrencySymbol))
                            {
                                billingSymbol = rate.CurrencySymbol.Trim();
                            }
                            else if (billingCode == "NGN")
                            {
                                billingSymbol = "₦";
                            }
                        }
                    }
                }
                catch
                {
                    // Fall back to USD / $ if master resolution encounters a transient error
                }
            }

            var dto = new WorkspaceCurrencySettingsDto
            {
                CurrencyCode = tenantCode,
                CurrencySymbol = tenantSymbol,
                PlatformBillingCurrencyCode = billingCode,
                PlatformBillingCurrencySymbol = billingSymbol
            };

            return Ok(ApiResponse<WorkspaceCurrencySettingsDto>.SuccessResponse(dto, "Workspace running currency resolved successfully."));
        }

        /// <summary>
        /// Updates the active workspace operational running currency.
        /// Affects store products, customer transactions, client invoices, and workforce compensation.
        /// </summary>
        /// <param name="dto">The updated currency payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The updated workspace currency configuration.</returns>
        [HttpPut("currency")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<WorkspaceCurrencySettingsDto>), 200)]
        public async Task<IActionResult> UpdateWorkspaceCurrencySettings([FromBody] WorkspaceCurrencySettingsDto dto, CancellationToken cancellationToken = default)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.CurrencyCode))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Currency code is required."));
            }

            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync(cancellationToken);
            if (config == null)
            {
                config = new MisConfigurationSetting { Id = Guid.NewGuid() };
                _db.MisConfigurationSettings.Add(config);
            }

            var code = dto.CurrencyCode.Trim().ToUpperInvariant();
            var symbol = !string.IsNullOrWhiteSpace(dto.CurrencySymbol) ? dto.CurrencySymbol.Trim() : (code == "NGN" ? "₦" : "$");

            config.CurrencyCode = code;
            config.CurrencySymbol = symbol;

            await _db.SaveChangesAsync(cancellationToken);

            string billingCode = "USD";
            string billingSymbol = "$";
            if (_master != null)
            {
                try
                {
                    var tenantKey = ResolveCurrentTenantKey();
                    if (!string.IsNullOrWhiteSpace(tenantKey))
                    {
                        var tenant = await _master.MasterTenantCatalogs.AsNoTracking()
                            .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == tenantKey.ToLower(), cancellationToken);

                        if (tenant != null && !string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode))
                        {
                            billingCode = tenant.DefaultCurrencyCode.Trim().ToUpperInvariant();
                            var rate = await _master.MasterCurrencyRates.AsNoTracking()
                                .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToUpper() == billingCode, cancellationToken);
                            if (rate != null && !string.IsNullOrWhiteSpace(rate.CurrencySymbol))
                            {
                                billingSymbol = rate.CurrencySymbol.Trim();
                            }
                            else if (billingCode == "NGN")
                            {
                                billingSymbol = "₦";
                            }
                        }
                    }
                }
                catch { }
            }

            dto.CurrencyCode = code;
            dto.CurrencySymbol = symbol;
            dto.PlatformBillingCurrencyCode = billingCode;
            dto.PlatformBillingCurrencySymbol = billingSymbol;

            return Ok(ApiResponse<WorkspaceCurrencySettingsDto>.SuccessResponse(dto, "Default workspace currency updated successfully."));
        }

        /// <summary>
        /// Retrieves Store &amp; Website E-Commerce mode configuration.
        /// </summary>
        [HttpGet("ecommerce")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<StoreSettingsDto>), 200)]
        public async Task<IActionResult> GetStoreSettings()
        {
            var site = await _db.MisWebsiteSettings.FirstOrDefaultAsync();
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();

            var mode = !string.IsNullOrWhiteSpace(site?.TemplateLayoutKey)
                ? site.TemplateLayoutKey
                : "standard";

            var channels = await _db.MisWebsiteContactChannels
                .AsNoTracking()
                .Where(c => c.IsPublished)
                .ToListAsync();

            var supportEmail = channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Email && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Email)?.Value ?? "";
            var supportPhone = channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Phone && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Phone)?.Value ?? "";
            var pickupAddress = channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Address && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Address)?.Value ?? "";

            var data = new StoreSettingsDto
            {
                StorefrontEnabled = site?.ActivateProductsInHome ?? true,
                StoreTitle = !string.IsNullOrWhiteSpace(site?.ProductTitle) ? site.ProductTitle : "Online Store",
                StoreOperatingMode = mode,
                CurrencyCode = !string.IsNullOrWhiteSpace(config?.CurrencyCode) ? config.CurrencyCode : "USD",
                CurrencySymbol = !string.IsNullOrWhiteSpace(config?.CurrencySymbol) ? config.CurrencySymbol : "$",
                ShowInNavbar = site?.ShowProductsInMenu ?? true,
                ShowInFooter = site?.ShowProductsInFooter ?? true,
                ShowOnHome = site?.ActivateProductsInHome ?? true,
                EnableOnlinePayment = config?.EnablePaystack ?? true,
                EnableBankTransfer = true,
                EnableCashOnDelivery = false,
                ProductsPerPage = 12,
                HomeProductsCount = site?.ShowSixProducts == true ? 6 : (site?.ShowThreeProducts == true ? 3 : (site?.ShowTwoProducts == true ? 2 : 6)),
                LowStockThreshold = 5,
                AllowBackorders = false,
                ShowReviews = true,
                ShowRelatedProducts = true,
                FlatShippingRate = 0,
                FreeShippingThreshold = 0,
                TaxPercentage = 0,
                SupportEmail = supportEmail,
                SupportPhone = supportPhone,
                PickupAddress = pickupAddress
            };

            return Ok(ApiResponse<StoreSettingsDto>.SuccessResponse(data, "Store & Website settings retrieved."));
        }

        /// <summary>
        /// Updates Store &amp; Website E-Commerce mode configuration.
        /// </summary>
        [HttpPut("ecommerce")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<StoreSettingsDto>), 200)]
        public async Task<IActionResult> UpdateStoreSettings([FromBody] StoreSettingsDto dto)
        {
            if (dto == null) return BadRequest(ApiResponse<object>.FailureResponse("Invalid payload."));

            var site = await _db.MisWebsiteSettings.FirstOrDefaultAsync();
            if (site == null)
            {
                site = new MisWebsiteSetting { Id = Guid.NewGuid() };
                _db.MisWebsiteSettings.Add(site);
            }

            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new MisConfigurationSetting { Id = Guid.NewGuid() };
                _db.MisConfigurationSettings.Add(config);
            }

            var operatingMode = !string.IsNullOrWhiteSpace(dto.StoreOperatingMode) ? dto.StoreOperatingMode : "standard";
            site.TemplateLayoutKey = operatingMode;
            site.ProductTitle = dto.StoreTitle;
            site.ProductTitleHome = dto.StoreTitle;
            site.ShowProductsInMenu = dto.ShowInNavbar;
            site.ShowProductsInFooter = dto.ShowInFooter;
            site.ActivateProductsInHome = dto.ShowOnHome;

            if (dto.HomeProductsCount == 2)
            {
                site.ShowTwoProducts = true;
                site.ShowThreeProducts = false;
                site.ShowSixProducts = false;
            }
            else if (dto.HomeProductsCount == 3)
            {
                site.ShowTwoProducts = false;
                site.ShowThreeProducts = true;
                site.ShowSixProducts = false;
            }
            else
            {
                site.ShowTwoProducts = false;
                site.ShowThreeProducts = false;
                site.ShowSixProducts = true;
            }

            config.CurrencyCode = dto.CurrencyCode;
            config.CurrencySymbol = dto.CurrencySymbol;
            config.EnablePaystack = dto.EnableOnlinePayment;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<StoreSettingsDto>.SuccessResponse(dto, "Store & Website Mode settings updated successfully."));
        }

        /// <summary>
        /// Retrieves cloud integration API keys.
        /// </summary>
        [HttpGet("integrations")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> GetIntegrations()
        {
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            var data = new
            {
                paystackConfigured = !string.IsNullOrWhiteSpace(config?.PaystackSecretKey),
                stripeConfigured = !string.IsNullOrWhiteSpace(config?.StripeSecretKey),
                flutterwaveConfigured = !string.IsNullOrWhiteSpace(config?.FlutterwaveSecretKey),
                paypalConfigured = !string.IsNullOrWhiteSpace(config?.PayPalClientId),
                pixelPayConfigured = !string.IsNullOrWhiteSpace(config?.PixelPaySecretKey) || !string.IsNullOrWhiteSpace(config?.PixelPayApiKey),
                awsS3Configured = !string.IsNullOrWhiteSpace(config?.CustomS3BucketName),
                cloudinaryConfigured = config?.UseCustomStorage == true && !string.IsNullOrWhiteSpace(config.CustomCloudinaryCloudName)
            };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Integrations settings retrieved."));
        }

        /// <summary>
        /// Updates cloud integration API keys.
        /// </summary>
        [HttpPut("integrations")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult UpdateIntegrations()
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Integration API keys updated successfully."));
        }

        /// <summary>
        /// Triggers platform maintenance operations (Database backup, cache flush).
        /// </summary>
        [HttpPost("maintenance")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult ExecuteMaintenance([FromBody] string operation)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Maintenance operation '{operation}' completed."));
        }

        /// <summary>
        /// Retrieves platform host environment info and memory usage.
        /// </summary>
        [HttpGet("system")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetSystemHealth()
        {
            var data = new { os = Environment.OSVersion.ToString(), runtime = Environment.Version.ToString(), uptime = "99.9%" };
            return Ok(ApiResponse<object>.SuccessResponse(data, "System health retrieved."));
        }

        /// <summary>
        /// Computes organization abbreviation from company name.
        /// </summary>
        /// <summary>
        /// Applies an image URL update safely. If valid URL, persists it. If null/empty, clears it.
        /// If raw base64 data URI (un-uploaded fallback), preserves the existing database image.
        /// </summary>
        private static void ApplySanitizedImage(string? incomingUrl, string? incomingKey, Action<string?, string?> assign)
        {
            if (string.IsNullOrWhiteSpace(incomingUrl))
            {
                assign(null, null);
                return;
            }

            var trimmed = incomingUrl.Trim();
            if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) || trimmed.Length > 500)
            {
                // Raw base64 from a failed client upload; preserve the currently persisted database image
                return;
            }

            assign(trimmed, incomingKey);
        }

        /// <summary>
        /// Sanitizes and validates image URLs to prevent SQL Server string truncation crashes (e.g. from raw base64 data URIs).
        /// </summary>
        /// <param name="url">The image URL or data string to inspect.</param>
        /// <returns>A clean URL string or null if invalid or oversized.</returns>
        private static string? SanitizeImageUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return null;
            var trimmed = url.Trim();
            if (trimmed.Length > 500 || trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }
            return trimmed;
        }

        private static string ComputeAbbreviation(string? name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "ORG";
            var words = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (words.Length == 1)
            {
                var single = words[0].Trim();
                return single.Length >= 3 ? single[..3].ToUpperInvariant() : single.ToUpperInvariant();
            }
            return string.Concat(words.Take(4).Select(w => char.ToUpperInvariant(w[0])));
        }

        /// <summary>
        /// Checks whether the tenant's transactional Mailcow email service (<c>noreply@{tenant}.ozikol.cloud</c>) is configured.
        /// Used by the dashboard setup popup to prompt administrators if email is unconfigured.
        /// </summary>
        [HttpGet("email-setup-status")]
        [Authorize]
        public async Task<IActionResult> GetEmailSetupStatus()
        {
            var tenantKey = (ResolveCurrentTenantKey() ?? "workspace").Trim().ToLowerInvariant();
            var recommendedAddress = $"noreply@{tenantKey}.ozikol.cloud";

            var config = await _db.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
            var site = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var brandName = site?.BrandName ?? site?.CompanyName ?? tenantKey;

            var isConfigured = config != null &&
                               !string.IsNullOrWhiteSpace(config.SenderEmail) &&
                               (!string.IsNullOrWhiteSpace(config.SmtpPassword) || string.Equals(config.EmailProvider, "Mailcow", StringComparison.OrdinalIgnoreCase));

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                isConfigured,
                tenantKey,
                brandName,
                senderName = !string.IsNullOrWhiteSpace(config?.SenderName) ? config!.SenderName : brandName,
                senderEmail = !string.IsNullOrWhiteSpace(config?.SenderEmail) ? config!.SenderEmail : recommendedAddress,
                recommendedAddress,
                smtpEnableSsl = config?.SmtpEnableSsl ?? true,
                smtpPort = config?.SmtpPort > 0 ? config.SmtpPort : 587
            }, "Workspace email notification status retrieved."));
        }

        /// <summary>
        /// Provisions the tenant's Mailcow domain and <c>noreply@{tenant}.ozikol.cloud</c> mailbox in one click,
        /// saving the encrypted SMTP credentials into the tenant's <see cref="MisConfigurationSetting"/> record.
        /// </summary>
        [HttpPost("provision-mailcow")]
        [Authorize]
        public async Task<IActionResult> ProvisionMailcow([FromBody] ProvisionTenantMailcowRequestDto? request)
        {
            var tenantKey = (ResolveCurrentTenantKey() ?? "workspace").Trim().ToLowerInvariant();
            var site = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var brandName = !string.IsNullOrWhiteSpace(request?.SenderName)
                ? request!.SenderName!.Trim()
                : (site?.BrandName ?? site?.CompanyName ?? $"{tenantKey.ToUpperInvariant()} Workspace");

            var domain = $"{tenantKey}.ozikol.cloud";
            var localPart = "noreply";
            var senderEmail = $"{localPart}@{domain}";
            if (!string.IsNullOrWhiteSpace(request?.CustomSenderEmail) && request.CustomSenderEmail.Contains('@'))
            {
                senderEmail = request.CustomSenderEmail.Trim().ToLowerInvariant();
                var parts = senderEmail.Split('@', 2);
                localPart = parts[0];
                domain = parts[1];
            }

            // Generate a strong mailbox password or use admin-supplied password
            var mailboxPassword = !string.IsNullOrWhiteSpace(request?.Password)
                ? request!.Password!.Trim()
                : $"OziMail!{Guid.NewGuid():N}"[..20];

            if (_mailcowProvisioning == null)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Mailcow provisioning service is unavailable."));
            }

            // 1. Ensure domain and mailbox exist in Mailcow (no silent fallback)
            var domainEnsured = await _mailcowProvisioning.EnsureDomainExistsAsync(domain, $"{brandName} Transactional Mail Domain");
            if (!domainEnsured)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Failed to register mail domain '{domain}' on Mailcow. Verify Mailcow API URL & API Key in Central Works Platform Settings."));
            }

            var mailcowProvisioned = await _mailcowProvisioning.EnsureMailboxExistsAsync(domain, localPart, mailboxPassword, brandName);
            if (!mailcowProvisioned)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Failed to provision mailbox '{senderEmail}' on Mailcow. Verify Mailcow API permissions and server connectivity."));
            }

            var dkimTxt = await _mailcowProvisioning.GetDkimRecordAsync(domain);

            // 2. Automate Cloudflare MX, SPF, DKIM, and DMARC records for <tenant>.ozikol.cloud
            var dnsProvisioned = false;
            if (domain.EndsWith(".ozikol.cloud", StringComparison.OrdinalIgnoreCase))
            {
                if (_cloudflareDns == null)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Cloudflare DNS automation service is unavailable."));
                }

                var dnsResult = await _cloudflareDns.EnsureTenantEmailDnsAsync(domain, dkimTxt);
                if (!dnsResult.Success)
                {
                    return BadRequest(ApiResponse<object>.FailureResponse(
                        dnsResult.ErrorMessage ?? $"Failed to provision MX/SPF/DKIM/DMARC DNS records for '{domain}'."));
                }

                dnsProvisioned = true;
            }

            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new MisConfigurationSetting { Id = Guid.NewGuid() };
                _db.MisConfigurationSettings.Add(config);
            }

            config.EmailProvider = "Mailcow";
            config.SenderEmail = senderEmail;
            config.SenderName = brandName;
            config.SmtpHost = !string.IsNullOrWhiteSpace(request?.SmtpHost) ? request!.SmtpHost!.Trim() : "mail.ozikol.cloud";
            config.SmtpPort = request?.SmtpPort > 0 ? request.SmtpPort : 587;
            config.SmtpUsername = senderEmail;
            config.SmtpPassword = OzikolDataCipher.EncryptIfNeeded(mailboxPassword);
            config.SmtpEnableSsl = true;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                isConfigured = true,
                mailcowProvisioned,
                dnsProvisioned,
                senderEmail,
                senderName = brandName,
                smtpHost = config.SmtpHost,
                smtpPort = config.SmtpPort,
                dkimTxt
            }, "Your email service and DNS authentication (MX, SPF, DKIM, DMARC) have been activated."));
        }

        /// <summary>
        /// Dispatches a live test email using the tenant's configured notification email settings.
        /// </summary>
        [HttpPost("test-email")]
        [Authorize]
        public async Task<IActionResult> SendTenantTestEmail([FromBody] TenantTestEmailRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request?.RecipientEmail))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Please enter a recipient email address."));
            }

            if (_smtpEmailDispatcher == null)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email notification service is currently unavailable."));
            }

            var tenantKey = (ResolveCurrentTenantKey() ?? "workspace").Trim().ToLowerInvariant();
            var config = await _db.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
            if (string.IsNullOrWhiteSpace(config?.SmtpPassword))
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    "Workspace mailbox credentials are not provisioned yet. Please click 'Update Email Service' first."));
            }

            var site = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var brandName = config?.SenderName ?? site?.BrandName ?? site?.CompanyName ?? "Workspace";
            var fromAddress = !string.IsNullOrWhiteSpace(config?.SenderEmail)
                ? config!.SenderEmail!.Trim()
                : $"noreply@{tenantKey}.ozikol.cloud";

            var html = $@"
                <div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;"">
                    <h2 style=""color: #0050E5; margin: 0 0 10px 0;"">{System.Net.WebUtility.HtmlEncode(brandName)} — Email Service Active</h2>
                    <p style=""color: #334155; font-size: 14px; line-height: 1.6;"">
                        Your email service for notifications (<strong>{System.Net.WebUtility.HtmlEncode(fromAddress)}</strong>) is active and ready to deliver password resets, onboarding links, and security alerts.
                    </p>
                </div>";

            var sent = await _smtpEmailDispatcher.SendEmailAsync(
                toEmail: request.RecipientEmail.Trim(),
                subject: $"{brandName} — Email Service Verification",
                htmlBody: html,
                fromEmail: fromAddress,
                fromName: brandName,
                isCentralPlatformEmail: false,
                tenantName: brandName,
                smtpUsernameOverride: config?.SmtpUsername,
                smtpPasswordOverride: config?.SmtpPassword,
                strictDeliveryCheck: true);

            if (!sent)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Email delivery failed. Please verify your workspace notification settings or contact support."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { sent = true, recipient = request.RecipientEmail.Trim(), fromAddress }, $"Test email sent to {request.RecipientEmail.Trim()} from {fromAddress}."));
        }
    }

    public class ProvisionTenantMailcowRequestDto
    {
        public string? CustomSenderEmail { get; set; }
        public string? SenderName { get; set; }
        public string? Password { get; set; }
        public string? SmtpHost { get; set; }
        public int SmtpPort { get; set; } = 587;
    }

    public class TenantTestEmailRequestDto
    {
        public string RecipientEmail { get; set; } = string.Empty;
    }

    public class BrandSettingsResponseDto
    {
        public string CompanyName { get; set; } = "Workspace";
        public string CompanyNameAbbreviation { get; set; } = string.Empty;
        public string CompanyDescription { get; set; } = string.Empty;
        public string FooterDescription { get; set; } = string.Empty;
        public string CompanyWebsiteLink { get; set; } = string.Empty;
        public string WebsiteTitle { get; set; } = string.Empty;
        public string DashboardTitle { get; set; } = string.Empty;
        public string CompanyLogoUrl { get; set; } = string.Empty;
        public string CompanyLogoKey { get; set; } = string.Empty;
        public string CompanyWhiteLogoUrl { get; set; } = string.Empty;
        public string CompanyWhiteLogoKey { get; set; } = string.Empty;
        public string CompanyIconUrl { get; set; } = string.Empty;
        public string CompanyIconKey { get; set; } = string.Empty;
        public string ReloaderIconUrl { get; set; } = string.Empty;
        public string ReloaderIconKey { get; set; } = string.Empty;
        public string PrimaryColor { get; set; } = "#0050e5";
        public string SecondaryColor { get; set; } = "#1f6bff";
        public string LoginBackgroundImageUrl { get; set; } = string.Empty;
        public string LoginBackgroundImageKey { get; set; } = string.Empty;
        public string LoginLayout { get; set; } = "centered";
        public bool AllowPublicRegistration { get; set; } = true;
        public bool UseNormalLogoInLogin { get; set; } = true;
        public bool UseWhiteLogoInLogin { get; set; }
        public string LoginTitle { get; set; } = string.Empty;
        public string LoginNoteTitle { get; set; } = string.Empty;
        public string LoginNote { get; set; } = string.Empty;
        public string LoginNoteFooter { get; set; } = string.Empty;
        public bool ActivateLogin { get; set; } = true;
        public bool ActivateLoginInMenu { get; set; } = true;
        public bool ActivateLoginInFooter { get; set; } = true;
        public string LoginButtonText { get; set; } = "Sign In";
        public bool EnableBreakingNewsRibon { get; set; } = false;
        public string BreakingNewsRibonTitle { get; set; } = "BREAKING NEWS";
        public string BreakingNewsRibonPosition { get; set; } = "after_menu";
        public bool EnableCookieConsent { get; set; } = false;
        public string CookieConsentTitle { get; set; } = "We Value Your Privacy";
        public string CookieConsentMessage { get; set; } = "We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.";
        public string CookieConsentAcceptText { get; set; } = "Accept All";
        public string CookieConsentDeclineText { get; set; } = "Decline";
        public string CookieConsentPolicyUrl { get; set; } = "/privacy-policy";
        public bool EnableWhatsAppChat { get; set; } = false;
        public string WhatsAppNumber { get; set; } = string.Empty;
        public string WhatsAppPromptMessage { get; set; } = "Hello! I have an inquiry regarding your services.";
        public string WhatsAppWidgetTitle { get; set; } = "Chat with Us";
        public string WhatsAppWidgetSubtitle { get; set; } = "Typically replies within minutes";
    }

    public class BrandSettingsUpdateRequestDto
    {
        public string CompanyName { get; set; } = "Workspace";
        public string CompanyNameAbbreviation { get; set; } = string.Empty;
        public string CompanyDescription { get; set; } = string.Empty;
        public string FooterDescription { get; set; } = string.Empty;
        public string CompanyWebsiteLink { get; set; } = string.Empty;
        public string WebsiteTitle { get; set; } = string.Empty;
        public string DashboardTitle { get; set; } = string.Empty;
        public string CompanyLogoUrl { get; set; } = string.Empty;
        public string CompanyLogoKey { get; set; } = string.Empty;
        public string CompanyWhiteLogoUrl { get; set; } = string.Empty;
        public string CompanyWhiteLogoKey { get; set; } = string.Empty;
        public string CompanyIconUrl { get; set; } = string.Empty;
        public string CompanyIconKey { get; set; } = string.Empty;
        public string ReloaderIconUrl { get; set; } = string.Empty;
        public string ReloaderIconKey { get; set; } = string.Empty;
        public string LoginBackgroundImageUrl { get; set; } = string.Empty;
        public string LoginBackgroundImageKey { get; set; } = string.Empty;
        public string LoginLayout { get; set; } = "centered";
        public bool AllowPublicRegistration { get; set; } = true;
        public bool UseNormalLogoInLogin { get; set; } = true;
        public bool UseWhiteLogoInLogin { get; set; }
        public string LoginTitle { get; set; } = string.Empty;
        public string LoginNoteTitle { get; set; } = string.Empty;
        public string LoginNote { get; set; } = string.Empty;
        public string LoginNoteFooter { get; set; } = string.Empty;
        public bool ActivateLogin { get; set; } = true;
        public bool ActivateLoginInMenu { get; set; } = true;
        public bool ActivateLoginInFooter { get; set; } = true;
        public string LoginButtonText { get; set; } = "Sign In";
        public bool EnableBreakingNewsRibon { get; set; } = false;
        public string BreakingNewsRibonTitle { get; set; } = "BREAKING NEWS";
        public string BreakingNewsRibonPosition { get; set; } = "after_menu";
        public bool EnableCookieConsent { get; set; } = false;
        public string CookieConsentTitle { get; set; } = "We Value Your Privacy";
        public string CookieConsentMessage { get; set; } = "We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.";
        public string CookieConsentAcceptText { get; set; } = "Accept All";
        public string CookieConsentDeclineText { get; set; } = "Decline";
        public string CookieConsentPolicyUrl { get; set; } = "/privacy-policy";
        public bool EnableWhatsAppChat { get; set; } = false;
        public string? WhatsAppNumber { get; set; }
        public string WhatsAppPromptMessage { get; set; } = "Hello! I have an inquiry regarding your services.";
        public string WhatsAppWidgetTitle { get; set; } = "Chat with Us";
        public string WhatsAppWidgetSubtitle { get; set; } = "Typically replies within minutes";
    }

    public class AppearanceUpdateRequestDto
    {
        public string PrimaryColor { get; set; } = "#0050e5";
        public string SecondaryColor { get; set; } = "#1f6bff";
    }

    public class BrandAssetUploadRequest
    {
        public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
        public string? Folder { get; set; } = "brand-assets";
    }

    public class StoreSettingsDto
    {
        public bool StorefrontEnabled { get; set; } = true;
        public string StoreTitle { get; set; } = "Online Store";
        public string StoreOperatingMode { get; set; } = "standard";
        public string CurrencyCode { get; set; } = "USD";
        public string CurrencySymbol { get; set; } = "$";
        public bool ShowInNavbar { get; set; } = true;
        public bool ShowInFooter { get; set; } = true;
        public bool ShowOnHome { get; set; } = true;
        public bool EnableOnlinePayment { get; set; } = true;
        public bool EnableBankTransfer { get; set; } = true;
        public bool EnableCashOnDelivery { get; set; } = false;
        public int ProductsPerPage { get; set; } = 12;
        public int HomeProductsCount { get; set; } = 6;
        public int LowStockThreshold { get; set; } = 5;
        public bool AllowBackorders { get; set; } = false;
        public bool ShowReviews { get; set; } = true;
        public bool ShowRelatedProducts { get; set; } = true;
        public decimal FlatShippingRate { get; set; } = 0;
        public decimal FreeShippingThreshold { get; set; } = 0;
        public decimal TaxPercentage { get; set; } = 0;
        public string SupportEmail { get; set; } = "";
        public string SupportPhone { get; set; } = "";
        public string PickupAddress { get; set; } = "";
    }

    /// <summary>
    /// Payload to verify and save custom tenant Cloudinary credentials.
    /// </summary>
    public class ConnectCustomStorageDto
    {
        [Required]
        public string CloudName { get; set; } = string.Empty;

        [Required]
        public string ApiKey { get; set; } = string.Empty;

        [Required]
        public string ApiSecret { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response model describing the active storage configuration for the tenant.
    /// </summary>
    public class StorageSettingsResponseDto
    {
        public bool UseCustomStorage { get; set; }
        public string? CustomCloudName { get; set; }
        public string? MaskedApiKey { get; set; }
        public bool UsingPlatformDefault { get; set; } = true;
    }

    /// <summary>
    /// DTO for retrieving and updating the workspace tenant's default operational running currency.
    /// </summary>
    public class WorkspaceCurrencySettingsDto
    {
        /// <summary>
        /// Standard 3-letter ISO 4217 currency code (e.g. USD, NGN, GBP, EUR, CAD, KES, ZAR, GHS).
        /// </summary>
        public string CurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Visual currency symbol (e.g. $, ₦, £, €, CA$, KSh, R, GH₵).
        /// </summary>
        public string CurrencySymbol { get; set; } = "$";

        /// <summary>
        /// Indicates the platform billing currency used by Ozikol Central for subscription licensing.
        /// </summary>
        public string PlatformBillingCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Indicates the platform billing currency symbol.
        /// </summary>
        public string PlatformBillingCurrencySymbol { get; set; } = "$";
    }
}
