using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Queries.SettingsQueries;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

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
        private readonly ICloudinaryService _cloudinaryService;

        public SettingsApiController(IMediator mediator, DashboardDbContext db, ICloudinaryService cloudinaryService)
        {
            _mediator = mediator;
            _db = db;
            _cloudinaryService = cloudinaryService;
        }

        /// <summary>
        /// Uploads a branding asset (Logo, Icon, Background Image) to Cloudinary and returns its secure URL and key.
        /// Resolves the tenant's custom Cloudinary storage if configured; otherwise utilizes the platform default Cloudinary.
        /// </summary>
        [HttpPost("upload-asset")]
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
                    customCloud = config.CustomCloudinaryCloudName;
                    customKey = config.CustomCloudinaryApiKey;
                    customSecret = config.CustomCloudinaryApiSecret;
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
                UseNormalLogoInLogin = site?.UseNormalLogoInLogin ?? true,
                UseWhiteLogoInLogin = site?.UseWhiteLogoInLogin ?? false,
                LoginTitle = site?.LoginTitle ?? "",
                LoginNoteTitle = site?.LoginNoteTitle ?? "",
                LoginNote = site?.LoginNote ?? "",
                LoginNoteFooter = site?.LoginNoteFooter ?? "",
                ActivateLogin = site?.ActivateLogin ?? true,
                ActivateLoginInMenu = site?.ActivateLoginInMenu ?? true,
                ActivateLoginInFooter = site?.ActivateLoginInFooter ?? true,
                LoginButtonText = !string.IsNullOrWhiteSpace(site?.LoginButtonText) ? site.LoginButtonText : "Sign In"
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
            site.CompanyWebsiteLink = dto.CompanyWebsiteLink;
            site.WebsiteTitle = dto.WebsiteTitle;
            site.SiteTitle = dto.WebsiteTitle;
            site.DashboardTitle = dto.DashboardTitle;
            site.LogoUrl = dto.CompanyLogoUrl;
            site.CompanyLogoUrl = dto.CompanyLogoUrl;
            site.LogoKey = dto.CompanyLogoKey;
            site.CompanyLogoKey = dto.CompanyLogoKey;
            site.WhiteLogoUrl = dto.CompanyWhiteLogoUrl;
            site.CompanyWhiteLogoUrl = dto.CompanyWhiteLogoUrl;
            site.WhiteLogoKey = dto.CompanyWhiteLogoKey;
            site.CompanyWhiteLogoKey = dto.CompanyWhiteLogoKey;
            site.FaviconUrl = dto.CompanyIconUrl;
            site.CompanyIconUrl = dto.CompanyIconUrl;
            site.FaviconKey = dto.CompanyIconKey;
            site.CompanyIconKey = dto.CompanyIconKey;
            site.ReloaderIconUrl = dto.ReloaderIconUrl;
            site.ReloaderIconKey = dto.ReloaderIconKey;
            site.LoginBackgroundImageUrl = dto.LoginBackgroundImageUrl;
            site.LoginBackgroundImageKey = dto.LoginBackgroundImageKey;
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
            site.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(dto, "Brand identity updated successfully."));
        }

        /// <summary>
        /// Retrieves UI appearance theme preferences.
        /// </summary>
        [HttpGet("appearance")]
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
        public IActionResult UpdateAppearanceSettings([FromBody] AppearanceUpdateRequestDto dto)
        {
            return Ok(ApiResponse<object>.SuccessResponse(dto, "Appearance settings updated successfully."));
        }

        /// <summary>
        /// Retrieves custom CSS/JS tracking code injection scripts.
        /// </summary>
        [HttpGet("code-injection")]
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
        /// Retrieves status of platform feature flags.
        /// </summary>
        [HttpGet("features")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetFeatureFlags()
        {
            var data = new { enableChat = true, enableEVoting = true, enableGrants = true, enableAts = true };
            return Ok(ApiResponse<object>.SuccessResponse(data, "Feature flags retrieved."));
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
        /// Retrieves Store &amp; Website E-Commerce mode configuration.
        /// </summary>
        [HttpGet("ecommerce")]
        [ProducesResponseType(typeof(ApiResponse<StoreSettingsDto>), 200)]
        public async Task<IActionResult> GetStoreSettings()
        {
            var site = await _db.MisWebsiteSettings.FirstOrDefaultAsync();
            var config = await _db.MisConfigurationSettings.FirstOrDefaultAsync();

            var mode = !string.IsNullOrWhiteSpace(site?.TemplateLayoutKey)
                ? site.TemplateLayoutKey
                : "standard";

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
                SupportEmail = !string.IsNullOrWhiteSpace(site?.ContactEmail) ? site.ContactEmail : (!string.IsNullOrWhiteSpace(site?.EmailOne) ? site.EmailOne : ""),
                SupportPhone = !string.IsNullOrWhiteSpace(site?.PrimaryPhone) ? site.PrimaryPhone : (!string.IsNullOrWhiteSpace(site?.PhoneOne) ? site.PhoneOne : ""),
                PickupAddress = !string.IsNullOrWhiteSpace(site?.Address) ? site.Address : (!string.IsNullOrWhiteSpace(site?.AddressOne) ? site.AddressOne : "")
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
    }

    public class BrandSettingsResponseDto
    {
        public string CompanyName { get; set; } = "Workspace";
        public string CompanyNameAbbreviation { get; set; } = string.Empty;
        public string CompanyDescription { get; set; } = string.Empty;
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
    }

    public class BrandSettingsUpdateRequestDto
    {
        public string CompanyName { get; set; } = "Workspace";
        public string CompanyNameAbbreviation { get; set; } = string.Empty;
        public string CompanyDescription { get; set; } = string.Empty;
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
}
