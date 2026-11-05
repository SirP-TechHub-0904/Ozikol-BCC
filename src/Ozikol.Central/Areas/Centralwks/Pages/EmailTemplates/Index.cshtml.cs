using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Enums;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.EmailTemplates;

/// <summary>
/// PageModel for managing central transactional email templates in Central Works Admin.
/// </summary>
[Authorize(Roles = "SuperAdmin,Admin")]
public class IndexModel : PageModel
{
    private readonly MasterCatalogDbContext _dbContext;
    private readonly ILogger<IndexModel> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="IndexModel"/> class.
    /// </summary>
    /// <param name="dbContext">The master catalog database context.</param>
    /// <param name="logger">The application logger.</param>
    public IndexModel(MasterCatalogDbContext dbContext, ILogger<IndexModel> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// All configured email templates stored in the master database.
    /// </summary>
    public List<MasterEmailTemplate> Templates { get; set; } = new();

    /// <summary>
    /// Currently selected email template type.
    /// </summary>
    public MasterEmailTemplateType SelectedType { get; set; } = MasterEmailTemplateType.WelcomeEmailTemplate;

    /// <summary>
    /// The active template being viewed and edited.
    /// </summary>
    public MasterEmailTemplate? ActiveTemplate { get; set; }

    /// <summary>
    /// Form input data for editing the selected template.
    /// </summary>
    [BindProperty]
    public TemplateInputModel Input { get; set; } = new();

    /// <summary>
    /// Flash status message displayed to the administrator upon successful update.
    /// </summary>
    [TempData]
    public string? StatusMessage { get; set; }

    /// <summary>
    /// Flash error message displayed when validation or persistence fails.
    /// </summary>
    [TempData]
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Input model for email template modifications.
    /// </summary>
    public class TemplateInputModel
    {
        /// <summary>
        /// Template unique identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Categorical template type enum.
        /// </summary>
        [Required]
        public MasterEmailTemplateType TemplateType { get; set; }

        /// <summary>
        /// Descriptive display name of the template.
        /// </summary>
        [Required(ErrorMessage = "Template name is required.")]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Email subject line supporting {{businessname}} placeholder.
        /// </summary>
        [Required(ErrorMessage = "Subject line is required.")]
        [StringLength(250)]
        public string Subject { get; set; } = string.Empty;

        /// <summary>
        /// Rich HTML email body supporting {{businessname}} placeholder.
        /// </summary>
        [Required(ErrorMessage = "Email body is required.")]
        public string BodyHtml { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether this template is active for automated dispatches.
        /// </summary>
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Handles GET requests to display the template list and edit form for the selected template.
    /// </summary>
    /// <param name="type">Optional template type to select.</param>
    public async Task<IActionResult> OnGetAsync(MasterEmailTemplateType? type = null)
    {
        SelectedType = type ?? MasterEmailTemplateType.WelcomeEmailTemplate;
        await LoadTemplatesAsync();

        ActiveTemplate = Templates.FirstOrDefault(t => t.TemplateType == SelectedType);

        // Safe Fallback: If template does not exist in DB yet, synthesize default so admin can customize immediately
        if (ActiveTemplate == null)
        {
            ActiveTemplate = CreateDefaultTemplate(SelectedType);
            _dbContext.MasterEmailTemplates.Add(ActiveTemplate);
            await _dbContext.SaveChangesAsync();
            Templates.Add(ActiveTemplate);
        }

        Input = new TemplateInputModel
        {
            Id = ActiveTemplate.Id,
            TemplateType = ActiveTemplate.TemplateType,
            Name = ActiveTemplate.Name,
            Subject = ActiveTemplate.Subject,
            BodyHtml = ActiveTemplate.BodyHtml,
            IsActive = ActiveTemplate.IsActive
        };

        return Page();
    }

    /// <summary>
    /// Handles POST submissions to save changes to the template.
    /// </summary>
    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            ErrorMessage = "Please correct the errors in the form before saving.";
            await LoadTemplatesAsync();
            ActiveTemplate = Templates.FirstOrDefault(t => t.TemplateType == Input.TemplateType);
            return Page();
        }

        try
        {
            var template = await _dbContext.MasterEmailTemplates
                .FirstOrDefaultAsync(t => t.Id == Input.Id || t.TemplateType == Input.TemplateType);

            if (template == null)
            {
                template = new MasterEmailTemplate
                {
                    Id = Guid.NewGuid(),
                    TemplateType = Input.TemplateType,
                    CreatedUtc = DateTime.UtcNow
                };
                _dbContext.MasterEmailTemplates.Add(template);
            }

            template.Name = Input.Name.Trim();
            template.Subject = Input.Subject.Trim();
            template.BodyHtml = Input.BodyHtml;
            template.IsActive = Input.IsActive;
            template.UpdatedUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Template '{template.Name}' saved successfully.";
            return RedirectToPage(new { type = template.TemplateType });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update email template {TemplateType}", Input.TemplateType);
            ErrorMessage = "An unexpected error occurred while saving the template. Please try again.";
            await LoadTemplatesAsync();
            ActiveTemplate = Templates.FirstOrDefault(t => t.TemplateType == Input.TemplateType);
            return Page();
        }
    }

    private async Task LoadTemplatesAsync()
    {
        Templates = await _dbContext.MasterEmailTemplates
            .AsNoTracking()
            .OrderBy(t => t.TemplateType)
            .ToListAsync();
    }

    private static MasterEmailTemplate CreateDefaultTemplate(MasterEmailTemplateType type)
    {
        return new MasterEmailTemplate
        {
            Id = Guid.NewGuid(),
            TemplateType = type,
            Name = "Welcome Email",
            Subject = "Welcome to Ozikol Business Command Center — {{businessname}}",
            BodyHtml = @"<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 36px; border: 1px solid #e2e8f0; border-radius: 12px;"">
    <div style=""text-align: center; margin-bottom: 28px;"">
        <img src=""https://ozikol.cloud/assets/images/ozikol.png"" alt=""Ozikol Business Command Center"" style=""height: 40px; margin-bottom: 16px;"" />
        <h1 style=""color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 8px;"">Welcome to Ozikol, {{businessname}}!</h1>
        <p style=""color: #64748b; font-size: 14.5px; margin: 0;"">We are thrilled to welcome you to the Ozikol Business Command Center.</p>
    </div>
    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 24px; line-height: 1.6; font-size: 14.5px; color: #334155;"">
        <p style=""margin-top: 0;"">Dear <strong>{{businessname}}</strong>,</p>
        <p>Thank you for choosing <strong>Ozikol Business Command Center</strong> to power your enterprise operations. Your workspace is configured to help your organization manage operations, team collaboration, finances, and multi-channel customer communications from one unified center.</p>
        <p>You will shortly receive your workspace setup details with direct credentials and dedicated portal links to access your workspace anytime.</p>
        <p style=""margin-bottom: 0;"">If you ever need guidance or have questions, our specialist support engineering team is always here to assist you.</p>
    </div>
    <div style=""text-align: center; margin-bottom: 28px;"">
        <a href=""https://ozikol.cloud"" style=""display: inline-block; background: #0050e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; text-decoration: none;"">Explore Ozikol &rarr;</a>
    </div>
    <hr style=""border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 20px;"" />
    <p style=""color: #94a3b8; font-size: 12px; text-align: center; margin: 0;"">
        Ozikol Business Command Center &bull; Enterprise Operations Suite
    </p>
</div>",
            IsActive = true,
            CreatedUtc = DateTime.UtcNow
        };
    }
}

