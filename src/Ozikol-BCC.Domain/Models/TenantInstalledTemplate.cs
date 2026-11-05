using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an installed UI section template in an individual tenant's database (DashboardDbContext).
    /// Allows multiple PageSections across multiple WebPages to reference the same TemplateKey.
    /// Retains a link to MasterTemplateId for non-breaking update notifications.
    /// </summary>
    [Table("TenantInstalledTemplates")]
    public class TenantInstalledTemplate
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Reference to original MasterMarketplaceTemplate.Id in MasterCatalogDbContext.
        /// </summary>
        public Guid? MasterTemplateId { get; set; }

        /// <summary>
        /// Key matching PageSection.TemplateKey (e.g., "Body_FeatureGrid3", "Hero_SplitProduct", "Contact_SimpleForm").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string TemplateKey { get; set; } = null!;

        /// <summary>
        /// Category key (e.g., "menu", "hero", "body", "footer", "contact", "blog", "ecommerce", "newsletter", "breadcrumb").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = null!;

        /// <summary>
        /// Human-readable template name.
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = null!;

        [MaxLength(100)]
        public string VariantCode { get; set; } = null!;

        /// <summary>
        /// Local editable copy of the HTML template with {{ Placeholders }} and {{#each PageSectionLists}}.
        /// </summary>
        public string HtmlTemplate { get; set; } = null!;

        /// <summary>
        /// Local editable copy of the scoped CSS properties.
        /// </summary>
        public string CssStyles { get; set; } = null!;

        /// <summary>
        /// Optional sandboxed JavaScript.
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// Dedicated JSON payload housing this template's unique showcase/demo content:
        /// Title, MiniTitle, Description, ImageUrl, ButtonText, ButtonLink, and repeated card items.
        /// Used for template previews, simulated full-site demos, and initial CMS section population.
        /// </summary>
        public string? DefaultContentJson { get; set; }

        /// <summary>
        /// Installed version string (e.g., "1.0.0").
        /// </summary>
        [MaxLength(20)]
        public string InstalledVersion { get; set; } = "1.0.0";

        /// <summary>
        /// Flag set to true if the tenant customizes the local HTML or CSS.
        /// </summary>
        public bool IsCustomized { get; set; } = false;

        /// <summary>
        /// Indicates whether this record is an out-of-the-box factory default asset (e.g. Corporate Suite).
        /// Used to selectively refresh or purge factory blueprints without touching user-created or imported items.
        /// </summary>
        public bool IsDefault { get; set; } = false;

        public bool IsActive { get; set; } = true;
        public DateTime InstalledUtc { get; set; } = DateTime.UtcNow;
        public DateTime? LastUpdatedUtc { get; set; }
    }
}
