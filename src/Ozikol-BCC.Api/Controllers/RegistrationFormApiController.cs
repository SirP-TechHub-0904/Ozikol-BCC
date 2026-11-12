using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Services.Recaptcha;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Administrative and public API controller governing the dynamic user registration ("Get Started")
    /// and onboarding form system. Unlike CMS website inquiry forms, fields managed here define permanent
    /// attributes attached to authenticated member profiles (Profile.CustomAttributesJson).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Tags("2. User Management - Registration Form Builder")]
    public class RegistrationFormApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly ILogger<RegistrationFormApiController> _logger;
        private readonly IRecaptchaService? _recaptchaService;

        /// <summary>
        /// Initializes a new instance of the RegistrationFormApiController.
        /// </summary>
        /// <param name="context">Tenant database context.</param>
        /// <param name="logger">Telemetry logger.</param>
        /// <param name="recaptchaService">Optional Google reCAPTCHA verification service.</param>
        public RegistrationFormApiController(
            DashboardDbContext context,
            ILogger<RegistrationFormApiController> logger,
            IRecaptchaService? recaptchaService = null)
        {
            _context = context;
            _logger = logger;
            _recaptchaService = recaptchaService;
        }

        // =====================================================================
        // ADMIN MANAGEMENT ENDPOINTS (Authorized)
        // =====================================================================

        /// <summary>
        /// Retrieves all configured registration and onboarding form fields (active and inactive) ordered by SortOrder.
        /// </summary>
        /// <returns>Collection of custom registration form fields.</returns>
        [HttpGet("fields")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> GetAllFields()
        {
            var fields = await _context.BcpRegistrationFormFields
                .AsNoTracking()
                .Where(f => f.FieldKey != "__form_layout_policy__")
                .Include(f => f.BcpUserCategory)
                .OrderBy(f => f.SortOrder)
                .ThenBy(f => f.CreatedAtUtc)
                .Select(f => new RegistrationFormFieldDto
                {
                    Id = f.Id,
                    FieldKey = f.FieldKey,
                    Label = f.Label,
                    Placeholder = f.Placeholder,
                    FieldType = f.FieldType,
                    Options = !string.IsNullOrWhiteSpace(f.OptionsJson)
                        ? JsonSerializer.Deserialize<List<string>>(f.OptionsJson, (JsonSerializerOptions?)null) ?? new List<string>()
                        : new List<string>(),
                    IsRequired = f.IsRequired,
                    SortOrder = f.SortOrder,
                    IsActive = f.IsActive,
                    BcpUserCategoryId = f.BcpUserCategoryId,
                    CategoryName = f.BcpUserCategory != null ? f.BcpUserCategory.Name : null,
                    HelpText = f.HelpText,
                    ShowInWorkspaceProfile = f.ShowInWorkspaceProfile,
                    CreatedAtUtc = f.CreatedAtUtc,
                    UpdatedAtUtc = f.UpdatedAtUtc
                })
                .ToListAsync();

            var fieldSections = await LoadFieldSectionsAsync();
            foreach (var f in fields)
            {
                if (fieldSections.TryGetValue(f.Id.ToString(), out var secName))
                {
                    f.SectionName = secName;
                }
            }

            return Ok(ApiResponse<List<RegistrationFormFieldDto>>.SuccessResponse(fields, "Registration form fields retrieved successfully."));
        }

        /// <summary>
        /// Creates a new dynamic onboarding form field for the tenant's registration flow.
        /// </summary>
        /// <param name="dto">Field definition payload.</param>
        /// <returns>Created registration form field.</returns>
        [HttpPost("fields")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> CreateField([FromBody] CreateRegistrationFormFieldDto dto)
        {
            if (dto == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Field payload is required."));

            if (string.IsNullOrWhiteSpace(dto.Label))
                return BadRequest(ApiResponse<object>.FailureResponse("Field Label is required."));

            // Generate or sanitize alphanumeric FieldKey
            var rawKey = !string.IsNullOrWhiteSpace(dto.FieldKey) ? dto.FieldKey.Trim() : dto.Label.Trim();
            var sanitizedKey = new string(rawKey
                .ToLowerInvariant()
                .Replace(" ", "_")
                .Replace("-", "_")
                .Where(c => char.IsLetterOrDigit(c) || c == '_')
                .ToArray());

            if (string.IsNullOrWhiteSpace(sanitizedKey))
                sanitizedKey = "field_" + Guid.NewGuid().ToString("N")[..6];

            // Ensure field key uniqueness within tenant
            var keyExists = await _context.BcpRegistrationFormFields
                .AnyAsync(f => f.FieldKey.ToLower() == sanitizedKey.ToLower());

            if (keyExists)
            {
                sanitizedKey += "_" + Guid.NewGuid().ToString("N")[..4];
            }

            var maxSortOrder = await _context.BcpRegistrationFormFields
                .Select(f => (int?)f.SortOrder)
                .MaxAsync() ?? 0;

            var entity = new BcpRegistrationFormField
            {
                Id = Guid.NewGuid(),
                FieldKey = sanitizedKey,
                Label = dto.Label.Trim(),
                Placeholder = dto.Placeholder?.Trim(),
                FieldType = !string.IsNullOrWhiteSpace(dto.FieldType) ? dto.FieldType.Trim().ToLowerInvariant() : "text",
                OptionsJson = dto.Options != null && dto.Options.Count > 0
                    ? JsonSerializer.Serialize(dto.Options.Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim()))
                    : null,
                IsRequired = dto.IsRequired,
                SortOrder = dto.SortOrder > 0 ? dto.SortOrder : maxSortOrder + 1,
                IsActive = dto.IsActive,
                BcpUserCategoryId = dto.BcpUserCategoryId,
                HelpText = dto.HelpText?.Trim(),
                ShowInWorkspaceProfile = dto.ShowInWorkspaceProfile,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.BcpRegistrationFormFields.Add(entity);
            await _context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(dto.SectionName))
            {
                await SaveFieldSectionAsync(entity.Id, dto.SectionName);
            }

            _logger.LogInformation("Created dynamic registration form field '{FieldKey}' ({Label})", entity.FieldKey, entity.Label);

            return Ok(ApiResponse<object>.SuccessResponse(new { id = entity.Id, fieldKey = entity.FieldKey }, "Field created successfully."));
        }

        /// <summary>
        /// Updates an existing dynamic registration form field definition.
        /// </summary>
        /// <param name="id">Field identifier.</param>
        /// <param name="dto">Updated field payload.</param>
        /// <returns>Updated field outcome.</returns>
        [HttpPut("fields/{id}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> UpdateField([FromRoute] Guid id, [FromBody] UpdateRegistrationFormFieldDto dto)
        {
            if (dto == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Update payload is required."));

            var entity = await _context.BcpRegistrationFormFields.FindAsync(id);
            if (entity == null)
                return NotFound(ApiResponse<object>.FailureResponse("Registration form field not found."));

            if (string.IsNullOrWhiteSpace(dto.Label))
                return BadRequest(ApiResponse<object>.FailureResponse("Field Label is required."));

            entity.Label = dto.Label.Trim();
            entity.Placeholder = dto.Placeholder?.Trim();
            entity.FieldType = !string.IsNullOrWhiteSpace(dto.FieldType) ? dto.FieldType.Trim().ToLowerInvariant() : entity.FieldType;
            entity.OptionsJson = dto.Options != null && dto.Options.Count > 0
                ? JsonSerializer.Serialize(dto.Options.Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim()))
                : null;
            entity.IsRequired = dto.IsRequired;
            entity.SortOrder = dto.SortOrder;
            entity.IsActive = dto.IsActive;
            entity.BcpUserCategoryId = dto.BcpUserCategoryId;
            entity.HelpText = dto.HelpText?.Trim();
            entity.ShowInWorkspaceProfile = dto.ShowInWorkspaceProfile;
            entity.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await SaveFieldSectionAsync(entity.Id, dto.SectionName);

            return Ok(ApiResponse<object>.SuccessResponse(null, "Registration field updated successfully."));
        }

        /// <summary>
        /// Deletes a custom registration form field.
        /// </summary>
        /// <param name="id">Field identifier.</param>
        /// <returns>Success response.</returns>
        [HttpDelete("fields/{id}")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> DeleteField([FromRoute] Guid id)
        {
            var entity = await _context.BcpRegistrationFormFields.FindAsync(id);
            if (entity == null)
                return NotFound(ApiResponse<object>.FailureResponse("Registration form field not found."));

            _context.BcpRegistrationFormFields.Remove(entity);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, "Registration field deleted successfully."));
        }

        /// <summary>
        /// Updates the sequential display sort order for multiple registration fields in a single transaction.
        /// </summary>
        /// <param name="orders">List of field IDs and their new integer sort index.</param>
        /// <returns>Success response.</returns>
        [HttpPut("fields/reorder")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> ReorderFields([FromBody] List<FieldSortOrderDto> orders)
        {
            if (orders == null || orders.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("No reorder entries provided."));

            var ids = orders.Select(o => o.FieldId).ToList();
            var fields = await _context.BcpRegistrationFormFields
                .Where(f => ids.Contains(f.Id))
                .ToListAsync();

            foreach (var f in fields)
            {
                var match = orders.FirstOrDefault(o => o.FieldId == f.Id);
                if (match != null)
                {
                    f.SortOrder = match.SortOrder;
                    f.UpdatedAtUtc = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Field ordering saved successfully."));
        }

        /// <summary>
        /// Retrieves the tenant's current user onboarding and registration policy configuration.
        /// </summary>
        /// <returns>Registration policy DTO.</returns>
        [HttpGet("policy")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> GetRegistrationPolicy()
        {
            var policy = new RegistrationPolicyDto();

            try
            {
                var config = await _context.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
                if (config != null)
                {
                    policy.AllowPublicRegistration = config.AllowPublicRegistration;
                    policy.RequireApprovalBeforeLogin = config.RequireApprovalBeforeLogin;
                    policy.RequireEmailVerification = config.RequireConfirmedEmailToLogin;
                    if (!string.IsNullOrWhiteSpace(config.RegistrationWelcomeMessage))
                        policy.RegistrationWelcomeMessage = config.RegistrationWelcomeMessage;
                    if (!string.IsNullOrWhiteSpace(config.RegistrationSuccessMessage))
                        policy.RegistrationSuccessMessage = config.RegistrationSuccessMessage;
                    if (!string.IsNullOrWhiteSpace(config.RegistrationUrlSlug))
                        policy.RegistrationUrlSlug = config.RegistrationUrlSlug;
                    policy.EnableAffiliateReferralCode = config.EnableAffiliateReferralCode;
                    if (!string.IsNullOrWhiteSpace(config.DefaultIndustrySector))
                        policy.DefaultIndustrySector = config.DefaultIndustrySector;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load full MisConfigurationSettings for registration policy; reading from durable layout record.");
            }

            // Read layout architecture & flow policy from system record if stored
            try
            {
                var policyConfigField = await _context.BcpRegistrationFormFields
                    .AsNoTracking()
                    .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");

                if (policyConfigField != null && !string.IsNullOrWhiteSpace(policyConfigField.OptionsJson))
                {
                    var extra = JsonSerializer.Deserialize<RegistrationLayoutConfigExtra>(policyConfigField.OptionsJson);
                    if (extra != null)
                    {
                        policy.PageShellLayout = !string.IsNullOrWhiteSpace(extra.PageShellLayout) ? extra.PageShellLayout : policy.PageShellLayout;
                        policy.FormLayoutMode = !string.IsNullOrWhiteSpace(extra.FormLayoutMode) ? extra.FormLayoutMode : policy.FormLayoutMode;
                        policy.RequirePassword = extra.RequirePassword;
                        policy.CollectInfoOnly = extra.CollectInfoOnly;
                        policy.AllowSaveAndContinue = extra.AllowSaveAndContinue;
                        policy.UnpublishedCoreFields = extra.UnpublishedCoreFields ?? new();
                        policy.DeletedCoreFields = extra.DeletedCoreFields ?? new();
                        policy.CoreFieldOrder = extra.CoreFieldOrder ?? new();
                        policy.CustomSections = extra.CustomSections ?? new();
                        if (!string.IsNullOrWhiteSpace(extra.CoreCategoryTitle))
                            policy.CoreCategoryTitle = extra.CoreCategoryTitle;
                        if (!string.IsNullOrWhiteSpace(extra.CoreCategorySubtitle))
                            policy.CoreCategorySubtitle = extra.CoreCategorySubtitle;
                        if (extra.CoreFieldLabels != null && extra.CoreFieldLabels.Count > 0)
                            policy.CoreFieldLabels = extra.CoreFieldLabels;
                        if (extra.CoreFieldHints != null && extra.CoreFieldHints.Count > 0)
                            policy.CoreFieldHints = extra.CoreFieldHints;

                        if (extra.AllowPublicRegistration.HasValue)
                            policy.AllowPublicRegistration = extra.AllowPublicRegistration.Value;
                        if (extra.RequireApprovalBeforeLogin.HasValue)
                            policy.RequireApprovalBeforeLogin = extra.RequireApprovalBeforeLogin.Value;
                        if (extra.RequireEmailVerification.HasValue)
                            policy.RequireEmailVerification = extra.RequireEmailVerification.Value;
                        if (extra.IsFormDisabled.HasValue)
                            policy.IsFormDisabled = extra.IsFormDisabled.Value;
                        if (extra.IsFormPublished.HasValue)
                            policy.IsFormPublished = extra.IsFormPublished.Value;
                        if (!string.IsNullOrWhiteSpace(extra.RegistrationWelcomeMessage))
                            policy.RegistrationWelcomeMessage = extra.RegistrationWelcomeMessage;
                        if (!string.IsNullOrWhiteSpace(extra.RegistrationFormTitle))
                            policy.RegistrationFormTitle = extra.RegistrationFormTitle;
                        if (!string.IsNullOrWhiteSpace(extra.RegistrationSuccessMessage))
                            policy.RegistrationSuccessMessage = extra.RegistrationSuccessMessage;
                        if (!string.IsNullOrWhiteSpace(extra.RegistrationUrlSlug))
                            policy.RegistrationUrlSlug = extra.RegistrationUrlSlug;
                        if (extra.EnableAffiliateReferralCode.HasValue)
                            policy.EnableAffiliateReferralCode = extra.EnableAffiliateReferralCode.Value;
                        if (!string.IsNullOrWhiteSpace(extra.DefaultIndustrySector))
                            policy.DefaultIndustrySector = extra.DefaultIndustrySector;
                        if (!string.IsNullOrWhiteSpace(extra.CustomCss))
                            policy.CustomCss = extra.CustomCss;
                        policy.LegalConsents = extra.LegalConsents ?? new();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not read extra layout policy config from BcpRegistrationFormFields.");
            }

            return Ok(ApiResponse<RegistrationPolicyDto>.SuccessResponse(policy, "Registration policy retrieved."));
        }

        /// <summary>
        /// Updates the tenant's user onboarding policy settings.
        /// </summary>
        /// <param name="dto">Updated policy payload.</param>
        /// <returns>Success response.</returns>
        [HttpPut("policy")]
        [HttpPost("policy")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> UpdateRegistrationPolicy([FromBody] RegistrationPolicyDto dto)
        {
            if (dto == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Policy payload is required."));

            try
            {
                // Sanitize registration URL slug (e.g. " apply " -> "apply", remove slashes, lowercase)
                string cleanSlug = "register";
                if (!string.IsNullOrWhiteSpace(dto.RegistrationUrlSlug))
                {
                    cleanSlug = dto.RegistrationUrlSlug.Trim().ToLowerInvariant()
                        .Replace("/", "")
                        .Replace("\\", "")
                        .Replace(" ", "-");
                }

                // 1. Prepare extra payload containing all settings as durable JSON
                var extra = new RegistrationLayoutConfigExtra
                {
                    PageShellLayout = !string.IsNullOrWhiteSpace(dto.PageShellLayout) ? dto.PageShellLayout.Trim().ToLowerInvariant() : "website",
                    FormLayoutMode = !string.IsNullOrWhiteSpace(dto.FormLayoutMode) ? dto.FormLayoutMode : "single",
                    RequirePassword = dto.CollectInfoOnly ? false : dto.RequirePassword,
                    CollectInfoOnly = dto.CollectInfoOnly,
                    AllowSaveAndContinue = dto.AllowSaveAndContinue,
                    UnpublishedCoreFields = dto.UnpublishedCoreFields ?? new(),
                    DeletedCoreFields = dto.DeletedCoreFields ?? new(),
                    CoreFieldOrder = dto.CoreFieldOrder ?? new(),
                    CustomSections = dto.CustomSections ?? new(),
                    CoreCategoryTitle = !string.IsNullOrWhiteSpace(dto.CoreCategoryTitle) ? dto.CoreCategoryTitle.Trim() : "Default Category 1: Personal & Account Credentials",
                    CoreCategorySubtitle = !string.IsNullOrWhiteSpace(dto.CoreCategorySubtitle) ? dto.CoreCategorySubtitle.Trim() : "Built-in identity fields required for member profiles. Customize labels or toggle optional fields.",
                    CoreFieldLabels = dto.CoreFieldLabels ?? new(),
                    CoreFieldHints = dto.CoreFieldHints ?? new(),
                    FieldSections = await LoadFieldSectionsAsync(),
                    LegalConsents = dto.LegalConsents ?? new(),
                    AllowPublicRegistration = dto.AllowPublicRegistration,
                    RequireApprovalBeforeLogin = dto.CollectInfoOnly ? true : dto.RequireApprovalBeforeLogin,
                    RequireEmailVerification = dto.CollectInfoOnly ? false : dto.RequireEmailVerification,
                    IsFormDisabled = dto.IsFormDisabled,
                    IsFormPublished = dto.IsFormDisabled ? false : dto.IsFormPublished,
                    RegistrationWelcomeMessage = !string.IsNullOrWhiteSpace(dto.RegistrationWelcomeMessage) ? dto.RegistrationWelcomeMessage.Trim() : "Join our member directory and workspace portal.",
                    RegistrationFormTitle = !string.IsNullOrWhiteSpace(dto.RegistrationFormTitle) ? dto.RegistrationFormTitle.Trim() : "Create Your Account",
                    RegistrationSuccessMessage = !string.IsNullOrWhiteSpace(dto.RegistrationSuccessMessage) ? dto.RegistrationSuccessMessage.Trim() : "Registration successful! Welcome to the portal.",
                    RegistrationUrlSlug = cleanSlug,
                    EnableAffiliateReferralCode = dto.EnableAffiliateReferralCode,
                    DefaultIndustrySector = !string.IsNullOrWhiteSpace(dto.DefaultIndustrySector) ? dto.DefaultIndustrySector.Trim() : "Business & Enterprise",
                    CustomCss = dto.CustomCss
                };

                var extraJson = JsonSerializer.Serialize(extra);

                // 2. Persist layout architecture & flow policy to system record
                var policyConfigField = await _context.BcpRegistrationFormFields
                    .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");

                if (policyConfigField == null)
                {
                    policyConfigField = new BcpRegistrationFormField
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "__form_layout_policy__",
                        Label = "Form Layout Policy Configuration",
                        FieldType = "system_config",
                        IsActive = false,
                        SortOrder = -999,
                        OptionsJson = extraJson,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    _context.BcpRegistrationFormFields.Add(policyConfigField);
                }
                else
                {
                    policyConfigField.OptionsJson = extraJson;
                    policyConfigField.UpdatedAtUtc = DateTime.UtcNow;
                }

                // Save the durable policy configuration record first
                await _context.SaveChangesAsync();

                // 3. Attempt to synchronize dedicated MisConfigurationSettings columns if schema supports them
                try
                {
                    var config = await _context.MisConfigurationSettings.FirstOrDefaultAsync();
                    if (config == null)
                    {
                        config = new MisConfigurationSetting { Id = Guid.NewGuid() };
                        _context.MisConfigurationSettings.Add(config);
                    }

                    config.AllowPublicRegistration = dto.AllowPublicRegistration;
                    config.RequireApprovalBeforeLogin = dto.RequireApprovalBeforeLogin;
                    config.RequireConfirmedEmailToLogin = dto.CollectInfoOnly ? false : dto.RequireEmailVerification;
                    config.RegistrationWelcomeMessage = extra.RegistrationWelcomeMessage;
                    config.RegistrationSuccessMessage = extra.RegistrationSuccessMessage;
                    config.RegistrationUrlSlug = cleanSlug;
                    config.EnableAffiliateReferralCode = dto.EnableAffiliateReferralCode;
                    config.DefaultIndustrySector = extra.DefaultIndustrySector;
                    config.UpdatedAtUtc = DateTime.UtcNow;

                    await _context.SaveChangesAsync();
                }
                catch (Exception dbEx)
                {
                    _logger.LogWarning(dbEx, "MisConfigurationSettings column sync skipped due to schema discrepancy; policy safely stored in system record.");
                    // Detach config entity if attached so it doesn't leave tracked errors
                    var entry = _context.ChangeTracker.Entries<MisConfigurationSetting>().FirstOrDefault();
                    if (entry != null)
                    {
                        entry.State = EntityState.Detached;
                    }
                }

                return Ok(ApiResponse<object>.SuccessResponse(dto, "Registration policy updated successfully."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update registration policy");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to save policy: {ex.Message}"));
            }
        }

        /// <summary>
        /// Applies an industry-specific onboarding form template with 1 click.
        /// Pre-populates common, professional questions for the chosen sector.
        /// </summary>
        /// <param name="dto">Template choice and application mode.</param>
        /// <returns>Resulting fields count.</returns>
        [HttpPost("apply-template")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
        public async Task<IActionResult> ApplyIndustryTemplate([FromBody] ApplyIndustryTemplateDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.TemplateKey))
                return BadRequest(ApiResponse<object>.FailureResponse("Template key is required."));

            var templateKey = dto.TemplateKey.Trim().ToLowerInvariant();
            var templateFields = GetIndustryTemplateFields(templateKey);
            if (templateFields.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse($"Unknown industry template key '{dto.TemplateKey}'."));

            // If mode is "replace", remove existing fields (preserving system policy configuration)
            if (string.Equals(dto.Mode, "replace", StringComparison.OrdinalIgnoreCase))
            {
                var existing = await _context.BcpRegistrationFormFields
                    .Where(f => f.FieldKey != "__form_layout_policy__")
                    .ToListAsync();
                _context.BcpRegistrationFormFields.RemoveRange(existing);
                await _context.SaveChangesAsync();
            }

            int currentMaxSort = 0;
            if (string.Equals(dto.Mode, "append", StringComparison.OrdinalIgnoreCase))
            {
                currentMaxSort = await _context.BcpRegistrationFormFields
                    .Where(f => f.FieldKey != "__form_layout_policy__")
                    .Select(f => (int?)f.SortOrder)
                    .MaxAsync() ?? 0;
            }

            for (int i = 0; i < templateFields.Count; i++)
            {
                var tf = templateFields[i];
                var fieldEntity = new BcpRegistrationFormField
                {
                    Id = Guid.NewGuid(),
                    FieldKey = tf.FieldKey ?? $"field_{Guid.NewGuid():N}"[..12],
                    Label = tf.Label,
                    Placeholder = tf.Placeholder,
                    FieldType = tf.FieldType,
                    OptionsJson = tf.Options != null && tf.Options.Count > 0 ? JsonSerializer.Serialize(tf.Options) : null,
                    IsRequired = tf.IsRequired,
                    SortOrder = currentMaxSort + i + 1,
                    IsActive = true,
                    HelpText = tf.HelpText,
                    ShowInWorkspaceProfile = true,
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.BcpRegistrationFormFields.Add(fieldEntity);
            }

            // Optionally synchronize recommended presentation layout mode and default industry sector
            if ((dto.ApplyLayoutMode && !string.IsNullOrWhiteSpace(dto.LayoutMode)) || !string.IsNullOrWhiteSpace(dto.DefaultIndustrySector))
            {
                var policyConfigField = await _context.BcpRegistrationFormFields
                    .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");

                RegistrationLayoutConfigExtra extra = new();
                if (policyConfigField != null && !string.IsNullOrWhiteSpace(policyConfigField.OptionsJson))
                {
                    try
                    {
                        extra = JsonSerializer.Deserialize<RegistrationLayoutConfigExtra>(policyConfigField.OptionsJson) ?? new();
                    }
                    catch { }
                }

                if (dto.ApplyLayoutMode && !string.IsNullOrWhiteSpace(dto.LayoutMode))
                {
                    extra.FormLayoutMode = dto.LayoutMode;
                }

                if (!string.IsNullOrWhiteSpace(dto.DefaultIndustrySector))
                {
                    extra.DefaultIndustrySector = dto.DefaultIndustrySector.Trim();
                }

                var extraJson = JsonSerializer.Serialize(extra);

                if (policyConfigField == null)
                {
                    policyConfigField = new BcpRegistrationFormField
                    {
                        Id = Guid.NewGuid(),
                        FieldKey = "__form_layout_policy__",
                        Label = "Form Layout Policy Configuration",
                        FieldType = "system_config",
                        IsActive = false,
                        SortOrder = -999,
                        OptionsJson = extraJson,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    _context.BcpRegistrationFormFields.Add(policyConfigField);
                }
                else
                {
                    policyConfigField.OptionsJson = extraJson;
                    policyConfigField.UpdatedAtUtc = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new { template = templateKey, count = templateFields.Count, layoutMode = dto.LayoutMode }, $"Applied '{templateKey}' industry template successfully."));
        }

        private static List<CreateRegistrationFormFieldDto> GetIndustryTemplateFields(string key)
        {
            return key switch
            {
                "corporate" or "business" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "company_name", Label = "Company / Organization Name", Placeholder = "e.g. Your Organization Name", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "job_title", Label = "Job Title / Role", Placeholder = "e.g. Managing Director", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "org_size", Label = "Organization Size", Placeholder = "Select Company Size", FieldType = "select", Options = new List<string> { "1-10 employees", "11-50 employees", "51-200 employees", "201-1000 employees", "1000+ employees" }, IsRequired = true },
                    new() { FieldKey = "business_sector", Label = "Industry Sector", Placeholder = "Select Industry Sector", FieldType = "select", Options = new List<string> { "Technology & Software", "Financial Services", "Manufacturing & Supply Chain", "Professional Consulting", "Healthcare & Life Sciences", "Retail & E-Commerce", "Other" }, IsRequired = true },
                    new() { FieldKey = "tax_reg_no", Label = "Company Registration / Tax ID", Placeholder = "e.g. RC-1234567", FieldType = "text", IsRequired = false }
                },
                "education" or "school" or "academy" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "student_id", Label = "Student / Matriculation ID", Placeholder = "e.g. STU-2026-0042", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "study_level", Label = "Level of Study", Placeholder = "Select Academic Level", FieldType = "select", Options = new List<string> { "Undergraduate", "Postgraduate (Master's)", "Doctorate (Ph.D.)", "Professional Diploma", "Certificate Program" }, IsRequired = true },
                    new() { FieldKey = "department", Label = "Faculty / Major Department", Placeholder = "e.g. Faculty of Engineering & Applied Sciences", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "enrollment_year", Label = "Enrollment Academic Year", Placeholder = "e.g. 2026", FieldType = "number", IsRequired = true },
                    new() { FieldKey = "guardian_phone", Label = "Parent / Guardian Contact Phone", Placeholder = "e.g. +0 (000) 000-0000", FieldType = "text", IsRequired = false }
                },
                "healthcare" or "fitness" or "medical" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "emergency_contact_name", Label = "Emergency Contact Full Name", Placeholder = "e.g. First Last", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "emergency_contact_phone", Label = "Emergency Contact Phone", Placeholder = "e.g. +0 (000) 000-0000", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "date_of_birth", Label = "Date of Birth", Placeholder = "Select birth date", FieldType = "date", IsRequired = true },
                    new() { FieldKey = "blood_group", Label = "Blood Group", Placeholder = "Select Blood Group", FieldType = "select", Options = new List<string> { "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown" }, IsRequired = false },
                    new() { FieldKey = "medical_notes", Label = "Medical Conditions / Allergies / Disclosures", Placeholder = "List any known health conditions or dietary allergies...", FieldType = "textarea", IsRequired = false },
                    new() { FieldKey = "liability_waiver", Label = "I agree to the Health & Safety Liability Waiver and consent to emergency medical treatment", FieldType = "checkbox", IsRequired = true }
                },
                "alumni" or "community" or "association" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "graduation_year", Label = "Graduation Class Year", Placeholder = "e.g. 2022", FieldType = "number", IsRequired = true },
                    new() { FieldKey = "degree_earned", Label = "Degree / Qualification Earned", Placeholder = "e.g. B.Sc. Mechanical Engineering", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "chapter_city", Label = "Current Chapter / City of Residence", Placeholder = "e.g. London / United Kingdom", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "linkedin_profile", Label = "LinkedIn Profile URL", Placeholder = "e.g. https://linkedin.com/in/username", FieldType = "text", IsRequired = false },
                    new() { FieldKey = "mentorship_mode", Label = "Alumni Mentorship Participation", Placeholder = "Select Preference", FieldType = "select", Options = new List<string> { "Open to Mentoring Students", "Seeking an Industry Mentor", "Networking & Collaboration", "Not at this time" }, IsRequired = true }
                },
                "events" or "conference" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "affiliation", Label = "Organization / Institution Affiliation", Placeholder = "e.g. Your Organization Name", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "attendance_mode", Label = "Attendance Mode", Placeholder = "Select Attendance Format", FieldType = "select", Options = new List<string> { "In-Person Delegate", "Virtual Attendee", "Speaker / Panelist", "Exhibitor / Sponsor" }, IsRequired = true },
                    new() { FieldKey = "dietary_needs", Label = "Dietary Preferences", Placeholder = "Select Dietary Preference", FieldType = "select", Options = new List<string> { "No Restrictions (Standard)", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free" }, IsRequired = true },
                    new() { FieldKey = "tshirt_size", Label = "Conference T-Shirt / Swag Size", Placeholder = "Select Size", FieldType = "select", Options = new List<string> { "S", "M", "L", "XL", "2XL", "3XL" }, IsRequired = false }
                },
                "nonprofit" or "volunteer" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "volunteer_area", Label = "Preferred Volunteer Program Area", Placeholder = "Select Program", FieldType = "select", Options = new List<string> { "Community Outreach", "Youth Education & Tutoring", "Fundraising & Events", "Media & Communications", "Food Bank & Relief Logistics" }, IsRequired = true },
                    new() { FieldKey = "weekly_availability", Label = "Weekly Availability", Placeholder = "Select Hours", FieldType = "select", Options = new List<string> { "1-3 hours/week", "4-8 hours/week", "Weekends only", "Flexible / On-Call" }, IsRequired = true },
                    new() { FieldKey = "skills_certifications", Label = "Special Skills, Languages & Certifications", Placeholder = "e.g. First Aid / CPR, Fluent French, Graphic Design...", FieldType = "textarea", IsRequired = false }
                },
                "saas" or "tech" or "software" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "developer_role", Label = "Developer / Engineering Role", Placeholder = "Select Primary Role", FieldType = "select", Options = new List<string> { "Frontend Engineer", "Backend / Cloud Engineer", "Full-Stack Developer", "DevOps / SRE", "Engineering Manager / CTO", "Product Designer / UI/UX", "Data / AI Engineer" }, IsRequired = true },
                    new() { FieldKey = "tech_stack", Label = "Primary Programming Stack", Placeholder = "e.g. C# / .NET 9, Angular, Python, React", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "cloud_provider", Label = "Cloud Infrastructure Provider", Placeholder = "Select Cloud Host", FieldType = "select", Options = new List<string> { "Amazon Web Services (AWS)", "Microsoft Azure", "Google Cloud Platform (GCP)", "DigitalOcean / Linode", "Self-Hosted / On-Premise" }, IsRequired = true },
                    new() { FieldKey = "team_size", Label = "Engineering Team Size", Placeholder = "Select Team Scale", FieldType = "select", Options = new List<string> { "Solo Developer", "2-5 Engineers", "6-20 Engineers", "20+ Engineers" }, IsRequired = false }
                },
                "realestate" or "property" or "realtor" => new List<CreateRegistrationFormFieldDto>
                {
                    new() { FieldKey = "broker_license_no", Label = "Realtor / Broker License Number", Placeholder = "e.g. RE-LIC-984210", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "brokerage_firm", Label = "Agency / Brokerage Firm", Placeholder = "e.g. Your Organization Name", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "primary_territory", Label = "Primary Geographic Territory", Placeholder = "e.g. Greater Metropolitan Area", FieldType = "text", IsRequired = true },
                    new() { FieldKey = "property_specialty", Label = "Real Estate Specialty", Placeholder = "Select Specialty", FieldType = "select", Options = new List<string> { "Residential Sales", "Commercial & Industrial", "Property Management & Leasing", "Luxury Real Estate", "Land & Development" }, IsRequired = false }
                },
                _ => new List<CreateRegistrationFormFieldDto>()
            };
        }

        // =====================================================================
        // PUBLIC REGISTRATION SCHEMA (Anonymous)
        // =====================================================================

        /// <summary>
        /// Public endpoint consumed by the "Get Started" / Register flow (/auth/register).
        /// Returns the tenant's active dynamic field definitions, available user categories,
        /// branding context, and onboarding policies.
        /// </summary>
        /// <returns>Complete public registration schema.</returns>
        [HttpGet("public-schema")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicRegistrationSchema()
        {
            // 1. Fetch active onboarding questions into memory first
            var rawFields = await _context.BcpRegistrationFormFields
                .AsNoTracking()
                .Where(f => f.IsActive && f.FieldKey != "__form_layout_policy__")
                .OrderBy(f => f.SortOrder)
                .ThenBy(f => f.CreatedAtUtc)
                .ToListAsync();

            var fields = rawFields.Select(f => new PublicRegistrationFieldDto
            {
                Id = f.Id,
                FieldKey = f.FieldKey,
                Label = f.Label,
                Placeholder = f.Placeholder,
                FieldType = f.FieldType,
                Options = !string.IsNullOrWhiteSpace(f.OptionsJson)
                    ? JsonSerializer.Deserialize<List<string>>(f.OptionsJson, (JsonSerializerOptions?)null) ?? new List<string>()
                    : new List<string>(),
                IsRequired = f.IsRequired,
                SortOrder = f.SortOrder,
                BcpUserCategoryId = f.BcpUserCategoryId,
                HelpText = f.HelpText
            }).ToList();

            // 2. Fetch available active user categories
            var categories = await _context.BcpUserCategories
                .AsNoTracking()
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .Select(c => new
                {
                    id = c.Id,
                    name = c.Name,
                    description = c.Description
                })
                .ToListAsync();

            // 3. Fetch branding info & onboarding policies with try/catch resilience against schema drift
            MisWebsiteSetting? site = null;
            try
            {
                site = await _context.MisWebsiteSettings.FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load MisWebsiteSettings for public registration schema.");
            }

            MisConfigurationSetting? config = null;
            try
            {
                config = await _context.MisConfigurationSettings.FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load MisConfigurationSettings for public registration schema; falling back to durable policy config.");
            }

            // Read layout architecture extra
            var policyConfigField = await _context.BcpRegistrationFormFields
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");

            string pageShellLayout = "website";
            string formLayoutMode = "single";
            bool requirePassword = true;
            bool collectInfoOnly = false;
            bool allowSaveAndContinue = false;
            List<string> unpublishedCoreFields = new();
            List<string> deletedCoreFields = new();
            List<string> coreFieldOrder = new();
            List<string> customSections = new();
            string coreCategoryTitle = "Default Category 1: Personal & Account Credentials";
            string coreCategorySubtitle = "Built-in identity fields required for member profiles.";
            Dictionary<string, string> coreFieldLabels = new();
            Dictionary<string, string> coreFieldHints = new();

            RegistrationLayoutConfigExtra? extra = null;
            if (policyConfigField != null && !string.IsNullOrWhiteSpace(policyConfigField.OptionsJson))
            {
                try
                {
                    extra = JsonSerializer.Deserialize<RegistrationLayoutConfigExtra>(policyConfigField.OptionsJson);
                    if (extra != null)
                    {
                        pageShellLayout = !string.IsNullOrWhiteSpace(extra.PageShellLayout) ? extra.PageShellLayout : "website";
                        formLayoutMode = !string.IsNullOrWhiteSpace(extra.FormLayoutMode) ? extra.FormLayoutMode : "single";
                        collectInfoOnly = extra.CollectInfoOnly;
                        requirePassword = collectInfoOnly ? false : extra.RequirePassword;
                        allowSaveAndContinue = extra.AllowSaveAndContinue;
                        unpublishedCoreFields = extra.UnpublishedCoreFields ?? new();
                        deletedCoreFields = extra.DeletedCoreFields ?? new();
                        coreFieldOrder = extra.CoreFieldOrder ?? new();
                        customSections = extra.CustomSections ?? new();
                        if (!string.IsNullOrWhiteSpace(extra.CoreCategoryTitle))
                            coreCategoryTitle = extra.CoreCategoryTitle;
                        if (!string.IsNullOrWhiteSpace(extra.CoreCategorySubtitle))
                            coreCategorySubtitle = extra.CoreCategorySubtitle;
                        coreFieldLabels = extra.CoreFieldLabels ?? new();
                        coreFieldHints = extra.CoreFieldHints ?? new();
                        if (extra.FieldSections != null && extra.FieldSections.Count > 0)
                        {
                            foreach (var f in fields)
                            {
                                if (extra.FieldSections.TryGetValue(f.Id.ToString(), out var secName))
                                {
                                    f.SectionName = secName;
                                }
                            }
                        }
                    }
                }
                catch { }
            }

            var schema = new
            {
                allowPublicRegistration = (extra != null && extra.AllowPublicRegistration.HasValue) ? extra.AllowPublicRegistration.Value : (config?.AllowPublicRegistration ?? true),
                requireApprovalBeforeLogin = (extra != null && extra.RequireApprovalBeforeLogin.HasValue) ? extra.RequireApprovalBeforeLogin.Value : (config?.RequireApprovalBeforeLogin ?? false),
                requireEmailVerification = (extra != null && extra.RequireEmailVerification.HasValue) ? extra.RequireEmailVerification.Value : (config?.RequireConfirmedEmailToLogin ?? false),
                isFormDisabled = (extra != null && extra.IsFormDisabled.HasValue) ? extra.IsFormDisabled.Value : false,
                isFormPublished = (extra != null && extra.IsFormDisabled == true) ? false : ((extra != null && extra.IsFormPublished.HasValue) ? extra.IsFormPublished.Value : true),
                formTitle = (extra != null && !string.IsNullOrWhiteSpace(extra.RegistrationFormTitle)) ? extra.RegistrationFormTitle : "Create Your Account",
                welcomeMessage = (extra != null && !string.IsNullOrWhiteSpace(extra.RegistrationWelcomeMessage)) ? extra.RegistrationWelcomeMessage : (!string.IsNullOrWhiteSpace(config?.RegistrationWelcomeMessage) ? config.RegistrationWelcomeMessage : "Join our member directory and workspace portal."),
                successMessage = (extra != null && !string.IsNullOrWhiteSpace(extra.RegistrationSuccessMessage)) ? extra.RegistrationSuccessMessage : (!string.IsNullOrWhiteSpace(config?.RegistrationSuccessMessage) ? config.RegistrationSuccessMessage : "Registration successful! Welcome to the portal."),
                registrationUrlSlug = (extra != null && !string.IsNullOrWhiteSpace(extra.RegistrationUrlSlug)) ? extra.RegistrationUrlSlug : (!string.IsNullOrWhiteSpace(config?.RegistrationUrlSlug) ? config.RegistrationUrlSlug : "register"),
                enableAffiliateReferralCode = (extra != null && extra.EnableAffiliateReferralCode.HasValue) ? extra.EnableAffiliateReferralCode.Value : (config?.EnableAffiliateReferralCode ?? true),
                defaultIndustrySector = (extra != null && !string.IsNullOrWhiteSpace(extra.DefaultIndustrySector)) ? extra.DefaultIndustrySector : (!string.IsNullOrWhiteSpace(config?.DefaultIndustrySector) ? config.DefaultIndustrySector : "Business & Enterprise"),
                pageShellLayout,
                formLayoutMode,
                requirePassword,
                collectInfoOnly,
                allowSaveAndContinue,
                unpublishedCoreFields,
                deletedCoreFields,
                coreFieldOrder,
                customSections,
                coreCategoryTitle,
                coreCategorySubtitle,
                coreFieldLabels,
                coreFieldHints,
                customCss = extra?.CustomCss ?? string.Empty,
                legalConsents = extra?.LegalConsents ?? new List<RegistrationLegalConsentItemDto>(),
                recaptchaSiteKey = _recaptchaService?.SiteKey,
                brandName = !string.IsNullOrWhiteSpace(site?.BrandName) ? site.BrandName : (!string.IsNullOrWhiteSpace(site?.CompanyName) ? site.CompanyName : "Workspace"),
                logoUrl = site?.CompanyLogoUrl ?? site?.LogoUrl,
                faviconUrl = site?.FaviconUrl ?? site?.CompanyIconUrl ?? site?.CompanyLogoUrl ?? site?.LogoUrl,
                siteTitle = site?.SiteTitle ?? site?.WebsiteTitle,
                tagline = site?.Tagline,
                companyDescription = site?.CompanyDescription,
                categories,
                fields
            };

            return Ok(ApiResponse<object>.SuccessResponse(schema, "Public registration schema retrieved successfully."));
        }

        /// <summary>
        /// Loads the persisted field-to-section mapping from the layout policy metadata row.
        /// </summary>
        private async Task<Dictionary<string, string>> LoadFieldSectionsAsync()
        {
            var policyRow = await _context.BcpRegistrationFormFields
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");
            if (policyRow == null || string.IsNullOrWhiteSpace(policyRow.OptionsJson))
                return new Dictionary<string, string>();
            try
            {
                var extra = JsonSerializer.Deserialize<RegistrationLayoutConfigExtra>(policyRow.OptionsJson);
                return extra?.FieldSections ?? new Dictionary<string, string>();
            }
            catch
            {
                return new Dictionary<string, string>();
            }
        }

        /// <summary>
        /// Persists a single field's assigned category/section name in the layout policy metadata row.
        /// </summary>
        private async Task SaveFieldSectionAsync(Guid fieldId, string? sectionName)
        {
            var policyRow = await _context.BcpRegistrationFormFields
                .FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");

            RegistrationLayoutConfigExtra extra;
            if (policyRow != null && !string.IsNullOrWhiteSpace(policyRow.OptionsJson))
            {
                try
                {
                    extra = JsonSerializer.Deserialize<RegistrationLayoutConfigExtra>(policyRow.OptionsJson)
                        ?? new RegistrationLayoutConfigExtra();
                }
                catch
                {
                    extra = new RegistrationLayoutConfigExtra();
                }
            }
            else
            {
                extra = new RegistrationLayoutConfigExtra();
            }

            extra.FieldSections ??= new Dictionary<string, string>();
            var key = fieldId.ToString();
            if (string.IsNullOrWhiteSpace(sectionName))
                extra.FieldSections.Remove(key);
            else
                extra.FieldSections[key] = sectionName.Trim();

            var serialized = JsonSerializer.Serialize(extra);
            if (policyRow == null)
            {
                policyRow = new BcpRegistrationFormField
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "__form_layout_policy__",
                    Label = "System Registration Policy Config",
                    FieldType = "system",
                    IsActive = false,
                    IsRequired = false,
                    SortOrder = -100,
                    OptionsJson = serialized,
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.BcpRegistrationFormFields.Add(policyRow);
            }
            else
            {
                policyRow.OptionsJson = serialized;
                policyRow.UpdatedAtUtc = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }
    }

    // =========================================================================
    // DATA TRANSFER OBJECTS (DTOs)
    // =========================================================================

    /// <summary>
    /// Request DTO for applying a pre-configured industry template.
    /// </summary>
    public class ApplyIndustryTemplateDto
    {
        public string TemplateKey { get; set; } = string.Empty;
        public string Mode { get; set; } = "replace"; // "replace" | "append"
        public string? LayoutMode { get; set; } // "single" | "sections" | "stepper" | "pages"
        public bool ApplyLayoutMode { get; set; } = true;
        public string? DefaultIndustrySector { get; set; }
    }

    /// <summary>
    /// Detailed DTO for administrative registration form field representation.
    /// </summary>
    public class RegistrationFormFieldDto
    {
        public Guid Id { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public string FieldType { get; set; } = "text";
        public List<string> Options { get; set; } = new();
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? HelpText { get; set; }
        public bool ShowInWorkspaceProfile { get; set; }
        public string? SectionName { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    /// <summary>
    /// Payload DTO for creating a new custom registration field.
    /// </summary>
    public class CreateRegistrationFormFieldDto
    {
        public string? FieldKey { get; set; }
        public string Label { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public string FieldType { get; set; } = "text";
        public List<string>? Options { get; set; }
        public bool IsRequired { get; set; } = false;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        public Guid? BcpUserCategoryId { get; set; }
        public string? HelpText { get; set; }
        public bool ShowInWorkspaceProfile { get; set; } = true;
        public string? SectionName { get; set; }
    }

    /// <summary>
    /// Payload DTO for updating an existing registration field.
    /// </summary>
    public class UpdateRegistrationFormFieldDto
    {
        public string Label { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public string FieldType { get; set; } = "text";
        public List<string>? Options { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
        public string? HelpText { get; set; }
        public bool ShowInWorkspaceProfile { get; set; }
        public string? SectionName { get; set; }
    }

    /// <summary>
    /// Payload DTO for updating field sort orders.
    /// </summary>
    public class FieldSortOrderDto
    {
        public Guid FieldId { get; set; }
        public int SortOrder { get; set; }
    }

    /// <summary>
    /// Supplementary JSON-serialized layout and presentation configuration for member registration.
    /// Safely persisted without requiring immediate breaking database schema modifications.
    /// </summary>
    public class RegistrationLayoutConfigExtra
    {
        public string PageShellLayout { get; set; } = "website";
        public string FormLayoutMode { get; set; } = "single";
        public bool RequirePassword { get; set; } = true;
        public bool CollectInfoOnly { get; set; } = false;
        public bool AllowSaveAndContinue { get; set; } = false;
        public List<string> UnpublishedCoreFields { get; set; } = new();
        public List<string> DeletedCoreFields { get; set; } = new();
        public List<string> CoreFieldOrder { get; set; } = new();
        public List<string> CustomSections { get; set; } = new();
        public string? CoreCategoryTitle { get; set; }
        public string? CoreCategorySubtitle { get; set; }
        public Dictionary<string, string>? CoreFieldLabels { get; set; }
        public Dictionary<string, string>? CoreFieldHints { get; set; }
        public Dictionary<string, string>? FieldSections { get; set; }
        public bool? AllowPublicRegistration { get; set; }
        public bool? RequireApprovalBeforeLogin { get; set; }
        /// <summary>When true, new registrants must verify their email via 6-digit OTP before their account becomes active.</summary>
        public bool? RequireEmailVerification { get; set; }
        /// <summary>When true, the registration form is disabled and blurred on the public page so no one can register.</summary>
        public bool? IsFormDisabled { get; set; }
        /// <summary>When false, the registration form is unpublished and not accessible by the public.</summary>
        public bool? IsFormPublished { get; set; }
        public string? RegistrationWelcomeMessage { get; set; }
        public string? RegistrationFormTitle { get; set; }
        public string? RegistrationSuccessMessage { get; set; }
        public string? RegistrationUrlSlug { get; set; }
        public bool? EnableAffiliateReferralCode { get; set; }
        public string? DefaultIndustrySector { get; set; }
        public string? CustomCss { get; set; }
        public List<RegistrationLegalConsentItemDto> LegalConsents { get; set; } = new();
    }

    /// <summary>
    /// Represents a configurable legal/terms consent checkbox displayed on the public registration form.
    /// </summary>
    public class RegistrationLegalConsentItemDto
    {
        /// <summary>Unique identifier for the consent rule.</summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>Prefix text shown next to the checkbox (e.g. "I agree to the").</summary>
        public string Label { get; set; } = "I agree to the";

        /// <summary>Clickable link label (e.g. "Terms &amp; Conditions").</summary>
        public string LinkText { get; set; } = "Terms & Conditions";

        /// <summary>Optional linked CMS WebPage ID.</summary>
        public Guid? PageId { get; set; }

        /// <summary>Linked CMS WebPage slug (DirectUrl) used to open the legal page.</summary>
        public string? PageSlug { get; set; }

        /// <summary>Optional custom URL if linking outside CMS pages.</summary>
        public string? CustomUrl { get; set; }

        /// <summary>When true, applicant must check this box before submitting registration.</summary>
        public bool IsRequired { get; set; } = true;

        /// <summary>When true, this consent checkbox is shown on the public registration form.</summary>
        public bool IsActive { get; set; } = true;

        /// <summary>Optional list of multiple legal page links displayed within this single consent checkbox.</summary>
        public List<RegistrationLegalConsentLinkDto> Links { get; set; } = new();
    }

    /// <summary>
    /// Represents an individual clickable legal page link inside a registration consent checkbox.
    /// </summary>
    public class RegistrationLegalConsentLinkDto
    {
        /// <summary>Clickable link label (e.g. "Terms &amp; Conditions" or "Privacy Policy").</summary>
        public string LinkText { get; set; } = string.Empty;

        /// <summary>Optional linked CMS WebPage ID.</summary>
        public Guid? PageId { get; set; }

        /// <summary>Linked CMS WebPage slug (DirectUrl) used to open the legal page.</summary>
        public string? PageSlug { get; set; }

        /// <summary>Optional custom URL if linking outside CMS pages.</summary>
        public string? CustomUrl { get; set; }
    }

    /// <summary>
    /// DTO for tenant user registration policies.
    /// </summary>
    public class RegistrationPolicyDto
    {
        public bool AllowPublicRegistration { get; set; } = true;
        public bool RequireApprovalBeforeLogin { get; set; } = false;
        /// <summary>When true, new public registrants must verify their email address via 6-digit OTP before signing in.</summary>
        public bool RequireEmailVerification { get; set; } = false;
        /// <summary>When true, the registration form is disabled and blurred so no one can register.</summary>
        public bool IsFormDisabled { get; set; } = false;
        /// <summary>When false, the registration form is unpublished and inaccessible to the public.</summary>
        public bool IsFormPublished { get; set; } = true;
        public string RegistrationWelcomeMessage { get; set; } = "Join our member directory and workspace portal.";
        public string RegistrationFormTitle { get; set; } = "Create Your Account";
        public string RegistrationSuccessMessage { get; set; } = "Registration successful! Welcome to the portal.";
        public string RegistrationUrlSlug { get; set; } = "register";
        public bool EnableAffiliateReferralCode { get; set; } = true;
        public string DefaultIndustrySector { get; set; } = "Business & Enterprise";

        /// <summary>
        /// Custom CSS rules injected specifically on the public member registration page.
        /// </summary>
        public string? CustomCss { get; set; }

        /// <summary>
        /// Outer container shell used to render the registration form: "website" (Website Layout) or "auth" (Auth Layout).
        /// </summary>
        public string PageShellLayout { get; set; } = "website";

        /// <summary>
        /// Presentation layout experience: "single" (Single Page), "sections" (Single Page + Sections), "stepper" (Wizard Stepper), "pages" (Multi-Page).
        /// </summary>
        public string FormLayoutMode { get; set; } = "single";

        /// <summary>
        /// When true, applicants must set an account password during registration.
        /// When false, passwordless registration is activated.
        /// </summary>
        public bool RequirePassword { get; set; } = true;

        /// <summary>
        /// When true, registration operates in info-only intake mode without requiring a login password
        /// or granting immediate login access.
        /// </summary>
        public bool CollectInfoOnly { get; set; } = false;

        /// <summary>
        /// Editable display title for Default Category 1 (Personal &amp; Account Credentials).
        /// </summary>
        public string CoreCategoryTitle { get; set; } = "Default Category 1: Personal & Account Credentials";

        /// <summary>
        /// Editable subtitle description for Default Category 1.
        /// </summary>
        public string CoreCategorySubtitle { get; set; } = "Built-in identity fields required for member profiles. Customize labels or toggle optional fields.";

        /// <summary>
        /// Custom display labels keyed by core field key (fullName, email, password, phone, category, industry).
        /// </summary>
        public Dictionary<string, string> CoreFieldLabels { get; set; } = new();

        /// <summary>
        /// Custom helper descriptions keyed by core field key.
        /// </summary>
        public Dictionary<string, string> CoreFieldHints { get; set; } = new();

        /// <summary>
        /// When true, applicants can save partial registration drafts and continue later.
        /// </summary>
        public bool AllowSaveAndContinue { get; set; } = false;

        /// <summary>
        /// List of unpublished (hidden) core identity fields (e.g. ["phone", "category"]).
        /// </summary>
        public List<string> UnpublishedCoreFields { get; set; } = new();

        /// <summary>
        /// List of deleted core fields removed from the registration form (all core fields except email and phone when login is required).
        /// </summary>
        public List<string> DeletedCoreFields { get; set; } = new();

        /// <summary>
        /// Ordered list of core field keys for Personal Information layout ordering.
        /// </summary>
        public List<string> CoreFieldOrder { get; set; } = new();

        /// <summary>
        /// Custom section/step category names created by administrator.
        /// </summary>
        public List<string> CustomSections { get; set; } = new();

        /// <summary>
        /// Configurable legal/terms consent checkboxes (compulsory or optional) linked to CMS legal pages.
        /// </summary>
        public List<RegistrationLegalConsentItemDto> LegalConsents { get; set; } = new();
    }

    /// <summary>
    /// Public DTO returned to visitors on the "Get Started" page.
    /// </summary>
    public class PublicRegistrationFieldDto
    {
        public Guid Id { get; set; }
        public string FieldKey { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public string FieldType { get; set; } = "text";
        public List<string> Options { get; set; } = new();
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
        public string? HelpText { get; set; }
        public string? SectionName { get; set; }
    }
}
