using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    /// <summary>
    /// Tenant visual identity, logos, browser titles, theme templates, and login page copy.
    /// Authority: Tenant Admin / Tenant SuperAdmin.
    /// </summary>
    public class BcpTenantBrandSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [StringLength(255)]
        public string? CompanyName { get; set; }

        [StringLength(50)]
        public string? CompanyNameAbbreviation { get; set; }

        public string? CompanyDescription { get; set; }

        [StringLength(255)]
        public string? CompanyWebsiteLink { get; set; }

        [StringLength(255)]
        public string? WebsiteTitle { get; set; }

        [StringLength(255)]
        public string? DashboardTitle { get; set; }

        // ── Logo & Favicon Assets ──
        public string? CompanyLogoUrl { get; set; }
        public string? CompanyLogoKey { get; set; }
        public string? CompanyWhiteLogoUrl { get; set; }
        public string? CompanyWhiteLogoKey { get; set; }
        public string? CompanyIconUrl { get; set; }
        public string? CompanyIconKey { get; set; }
        public string? ReloaderIconUrl { get; set; }
        public string? ReloaderIconKey { get; set; }

        // ── Layout & Theme Keys ──
        [StringLength(100)]
        public string? TemplateLayoutKey { get; set; }

        [StringLength(100)]
        public string? LoginTemplateKey { get; set; }

        [StringLength(100)]
        public string? ColorTemplateKey { get; set; }

        [StringLength(100)]
        public string? SliderTemplateKey { get; set; }

        [StringLength(100)]
        public string? PageHeaderTemplateKey { get; set; }

        [StringLength(100)]
        public string? FooterTemplateKey { get; set; }

        // ── Login Page Copy & Assets ──
        public string? LoginBackgroundImageUrl { get; set; }
        public string? LoginBackgroundImageKey { get; set; }
        public bool UseNormalLogoInLogin { get; set; }
        public bool UseWhiteLogoInLogin { get; set; }
        [StringLength(255)]
        public string? LoginTitle { get; set; }
        [StringLength(255)]
        public string? LoginNoteTitle { get; set; }
        public string? LoginNote { get; set; }
        public string? LoginNoteFooter { get; set; }

        // ── Switches ──
        public bool ActivateLogin { get; set; } = true;
        public bool ActivateLoginInMenu { get; set; } = true;
        public bool ActivateComingSoon { get; set; }
    }
}
