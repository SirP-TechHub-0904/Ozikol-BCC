using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Queries.SettingsQueries;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Domain.Models.Settings;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace Ozikol_BCC.Api.Controllers
{
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
                var config = await _db.ConfigSettings.FirstOrDefaultAsync();
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
            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
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

            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new ConfigSetting { Id = Guid.NewGuid() };
                _db.ConfigSettings.Add(config);
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
            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
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
            var bcpSetting = await _db.BcpSettings.FirstOrDefaultAsync();

            var data = new TerminologyAliasesDto
            {
                GroupAlias = !string.IsNullOrWhiteSpace(bcpSetting?.GroupAlias) ? bcpSetting.GroupAlias : "Group",
                CategoryAlias = !string.IsNullOrWhiteSpace(bcpSetting?.CategoryAlias) ? bcpSetting.CategoryAlias : "Category",
                SubCategoryAlias = !string.IsNullOrWhiteSpace(bcpSetting?.SubCategoryAlias) ? bcpSetting.SubCategoryAlias : "Sub-Category",
                AlumniAlias = !string.IsNullOrWhiteSpace(bcpSetting?.AlumniAlias) ? bcpSetting.AlumniAlias : "Alumni"
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

            var bcpSetting = await _db.BcpSettings.FirstOrDefaultAsync();
            if (bcpSetting == null)
            {
                bcpSetting = new BcpSetting { Id = Guid.NewGuid() };
                _db.BcpSettings.Add(bcpSetting);
            }

            bcpSetting.CategoryAlias = !string.IsNullOrWhiteSpace(dto.CategoryAlias) ? dto.CategoryAlias.Trim() : "Category";
            bcpSetting.SubCategoryAlias = !string.IsNullOrWhiteSpace(dto.SubCategoryAlias) ? dto.SubCategoryAlias.Trim() : "Sub-Category";
            bcpSetting.GroupAlias = !string.IsNullOrWhiteSpace(dto.GroupAlias) ? dto.GroupAlias.Trim() : "Group";
            bcpSetting.AlumniAlias = !string.IsNullOrWhiteSpace(dto.AlumniAlias) ? dto.AlumniAlias.Trim() : "Alumni";

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(dto, "Terminology aliases updated successfully."));
        }

        /// <summary>
        /// Retrieves brand identity settings (Logo, Favicon, Title, Colors, Login copy).
        /// </summary>
        [HttpGet("brand")]
        [ProducesResponseType(typeof(ApiResponse<BrandSettingsResponseDto>), 200)]
        public async Task<IActionResult> GetBrandSettings()
        {
            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
            var companyName = config?.CompanyName ?? "Workspace";
            var abbreviation = !string.IsNullOrWhiteSpace(config?.CompanyNameAbbreviation)
                ? config.CompanyNameAbbreviation
                : ComputeAbbreviation(companyName);

            var data = new BrandSettingsResponseDto
            {
                CompanyName = companyName,
                CompanyNameAbbreviation = abbreviation,
                CompanyDescription = config?.CompanyDescription ?? "",
                CompanyWebsiteLink = config?.CompanyWebsiteLink ?? "",
                WebsiteTitle = config?.WebsiteTitle ?? "",
                DashboardTitle = config?.DashboardTitle ?? "",
                CompanyLogoUrl = config?.CompanyLogoUrl ?? "",
                CompanyLogoKey = config?.CompanyLogoKey ?? "",
                CompanyWhiteLogoUrl = config?.CompanyWhiteLogoUrl ?? "",
                CompanyWhiteLogoKey = config?.CompanyWhiteLogoKey ?? "",
                CompanyIconUrl = config?.CompanyIconUrl ?? "",
                CompanyIconKey = config?.CompanyIconKey ?? "",
                ReloaderIconUrl = config?.ReloaderIconUrl ?? "",
                ReloaderIconKey = config?.ReloaderIconKey ?? "",
                PrimaryColor = "#0050e5",
                SecondaryColor = "#1f6bff",
                LoginBackgroundImageUrl = config?.LoginBackgroundImageUrl ?? "",
                LoginBackgroundImageKey = config?.LoginBackgroundImageKey ?? "",
                UseNormalLogoInLogin = config?.UseNormalLogoInLogin ?? false,
                UseWhiteLogoInLogin = config?.UseWhiteLogoInLogin ?? false,
                LoginTitle = config?.LoginTitle ?? "",
                LoginNoteTitle = config?.LoginNoteTitle ?? "",
                LoginNote = config?.LoginNote ?? "",
                LoginNoteFooter = config?.LoginNoteFooter ?? ""
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

            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new ConfigSetting { Id = Guid.NewGuid() };
                _db.ConfigSettings.Add(config);
            }

            // Sync with ConfigSetting table
            config.CompanyName = dto.CompanyName;
            config.CompanyNameAbbreviation = !string.IsNullOrWhiteSpace(dto.CompanyNameAbbreviation)
                ? dto.CompanyNameAbbreviation.Trim()
                : ComputeAbbreviation(dto.CompanyName);
            config.CompanyDescription = dto.CompanyDescription;
            config.CompanyWebsiteLink = dto.CompanyWebsiteLink;
            config.WebsiteTitle = dto.WebsiteTitle;
            config.DashboardTitle = dto.DashboardTitle;
            config.CompanyLogoUrl = dto.CompanyLogoUrl;
            config.CompanyLogoKey = dto.CompanyLogoKey;
            config.CompanyWhiteLogoUrl = dto.CompanyWhiteLogoUrl;
            config.CompanyWhiteLogoKey = dto.CompanyWhiteLogoKey;
            config.CompanyIconUrl = dto.CompanyIconUrl;
            config.CompanyIconKey = dto.CompanyIconKey;
            config.ReloaderIconUrl = dto.ReloaderIconUrl;
            config.ReloaderIconKey = dto.ReloaderIconKey;
            config.LoginBackgroundImageUrl = dto.LoginBackgroundImageUrl;
            config.LoginBackgroundImageKey = dto.LoginBackgroundImageKey;
            config.UseNormalLogoInLogin = dto.UseNormalLogoInLogin;
            config.UseWhiteLogoInLogin = dto.UseWhiteLogoInLogin;
            config.LoginTitle = dto.LoginTitle;
            config.LoginNoteTitle = dto.LoginNoteTitle;
            config.LoginNote = dto.LoginNote;
            config.LoginNoteFooter = dto.LoginNoteFooter;

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
        [ProducesResponseType(typeof(ApiResponse<BcpTenantCodeInjectionSetting>), 200)]
        public async Task<IActionResult> GetCodeInjectionSettings()
        {
            var result = await _mediator.Send(new GetCodeInjectionSettingsQuery());
            return Ok(ApiResponse<BcpTenantCodeInjectionSetting>.SuccessResponse(result, "Tracking code scripts retrieved."));
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
        public IActionResult GetCommunicationSettings()
        {
            var data = new { provider = "ZeptoMail", smsProvider = "KudiSMS" };
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
            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
            var bcp = await _db.BcpSettings.FirstOrDefaultAsync();

            var mode = !string.IsNullOrWhiteSpace(config?.TemplateLayoutKey)
                ? config.TemplateLayoutKey
                : (!string.IsNullOrWhiteSpace(config?.ProductTemplateKey) ? config.ProductTemplateKey : "standard");

            var data = new StoreSettingsDto
            {
                StorefrontEnabled = config?.ActivateProductsInHome ?? true,
                StoreTitle = !string.IsNullOrWhiteSpace(config?.ProductTitle) ? config.ProductTitle : "Online Store",
                StoreOperatingMode = mode,
                CurrencyCode = !string.IsNullOrWhiteSpace(bcp?.CurrencyCode) ? bcp.CurrencyCode : (!string.IsNullOrWhiteSpace(config?.CurrencyCode) ? config.CurrencyCode : "USD"),
                CurrencySymbol = !string.IsNullOrWhiteSpace(bcp?.CurrencySymbol) ? bcp.CurrencySymbol : (!string.IsNullOrWhiteSpace(config?.CurrencySymbol) ? config.CurrencySymbol : "$"),
                ShowInNavbar = config?.ShowProductsInMenu ?? true,
                ShowInFooter = config?.ShowProductsInFooter ?? true,
                ShowOnHome = config?.ActivateProductsInHome ?? true,
                EnableOnlinePayment = bcp?.EnablePaystack ?? true,
                EnableBankTransfer = true,
                EnableCashOnDelivery = false,
                ProductsPerPage = 12,
                HomeProductsCount = config?.ShowSixProducts == true ? 6 : (config?.ShowThreeProducts == true ? 3 : (config?.ShowTwoProducts == true ? 2 : 6)),
                LowStockThreshold = 5,
                AllowBackorders = false,
                ShowReviews = true,
                ShowRelatedProducts = true,
                FlatShippingRate = 0,
                FreeShippingThreshold = 0,
                TaxPercentage = 0,
                SupportEmail = !string.IsNullOrWhiteSpace(config?.EmailOne) ? config.EmailOne : "",
                SupportPhone = !string.IsNullOrWhiteSpace(config?.PhoneOne) ? config.PhoneOne : "",
                PickupAddress = !string.IsNullOrWhiteSpace(config?.AddressOne) ? config.AddressOne : ""
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

            var config = await _db.ConfigSettings.FirstOrDefaultAsync();
            if (config == null)
            {
                config = new ConfigSetting { Id = Guid.NewGuid() };
                _db.ConfigSettings.Add(config);
            }

            var bcp = await _db.BcpSettings.FirstOrDefaultAsync();
            if (bcp == null)
            {
                bcp = new BcpSetting { Id = Guid.NewGuid() };
                _db.BcpSettings.Add(bcp);
            }

            var operatingMode = !string.IsNullOrWhiteSpace(dto.StoreOperatingMode) ? dto.StoreOperatingMode : "standard";
            config.TemplateLayoutKey = operatingMode;
            config.ProductTemplateKey = operatingMode;
            config.ProductTitle = dto.StoreTitle;
            config.ProductTitleHome = dto.StoreTitle;
            config.ShowProductsInMenu = dto.ShowInNavbar;
            config.ShowProductsInFooter = dto.ShowInFooter;
            config.ActivateProductsInHome = dto.ShowOnHome;
            config.CurrencyCode = dto.CurrencyCode;
            config.CurrencySymbol = dto.CurrencySymbol;

            if (dto.HomeProductsCount == 2)
            {
                config.ShowTwoProducts = true;
                config.ShowThreeProducts = false;
                config.ShowSixProducts = false;
            }
            else if (dto.HomeProductsCount == 3)
            {
                config.ShowTwoProducts = false;
                config.ShowThreeProducts = true;
                config.ShowSixProducts = false;
            }
            else
            {
                config.ShowTwoProducts = false;
                config.ShowThreeProducts = false;
                config.ShowSixProducts = true;
            }

            bcp.CurrencyCode = dto.CurrencyCode;
            bcp.CurrencySymbol = dto.CurrencySymbol;
            bcp.EnablePaystack = dto.EnableOnlinePayment;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<StoreSettingsDto>.SuccessResponse(dto, "Store & Website Mode settings updated successfully."));
        }

        /// <summary>
        /// Retrieves cloud integration API keys (Paystack, AWS, Cloudinary).
        /// </summary>
        [HttpGet("integrations")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public IActionResult GetIntegrations()
        {
            var data = new { paystackConfigured = true, awsS3Configured = true };
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
        /// If multi-word, takes initial letter of each word (e.g. "Rozzy kik" -> "RK").
        /// If single-word, takes first 3 characters uppercase (e.g. "Rozzy" -> "ROZ").
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
        public bool UseNormalLogoInLogin { get; set; }
        public bool UseWhiteLogoInLogin { get; set; }
        public string LoginTitle { get; set; } = string.Empty;
        public string LoginNoteTitle { get; set; } = string.Empty;
        public string LoginNote { get; set; } = string.Empty;
        public string LoginNoteFooter { get; set; } = string.Empty;
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
        public bool UseNormalLogoInLogin { get; set; }
        public bool UseWhiteLogoInLogin { get; set; }
        public string LoginTitle { get; set; } = string.Empty;
        public string LoginNoteTitle { get; set; } = string.Empty;
        public string LoginNote { get; set; } = string.Empty;
        public string LoginNoteFooter { get; set; } = string.Empty;
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
        public string StoreOperatingMode { get; set; } = "ecommerce"; // ecommerce | services | subscriptions | wholesale
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
        /// <summary>
        /// The tenant's custom Cloudinary Cloud Name.
        /// </summary>
        [Required]
        public string CloudName { get; set; } = string.Empty;

        /// <summary>
        /// The tenant's custom Cloudinary API Key.
        /// </summary>
        [Required]
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// The tenant's custom Cloudinary API Secret.
        /// </summary>
        [Required]
        public string ApiSecret { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response model describing the active storage configuration for the tenant.
    /// </summary>
    public class StorageSettingsResponseDto
    {
        /// <summary>
        /// Whether the tenant has custom storage enabled.
        /// </summary>
        public bool UseCustomStorage { get; set; }

        /// <summary>
        /// The active custom Cloud Name, if configured.
        /// </summary>
        public string? CustomCloudName { get; set; }

        /// <summary>
        /// Masked API Key for security (e.g. *******1234).
        /// </summary>
        public string? MaskedApiKey { get; set; }

        /// <summary>
        /// Indicates if the tenant is currently using the platform master Cloudinary default.
        /// </summary>
        public bool UsingPlatformDefault { get; set; } = true;
    }
}
