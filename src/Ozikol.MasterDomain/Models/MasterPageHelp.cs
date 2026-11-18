using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents page-based contextual guide and interactive documentation linked to a specific route URL.
    /// Centrally managed in the Master Catalog to serve documentation and workflow assistance across all tenants.
    /// </summary>
    [Table("MasterPageHelps")]
    public class MasterPageHelp
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the exact route URL pattern (e.g., "/workforce/console/analytics", "/workforce/workspace/my-shifts").
        /// Acts as the unique identifier for resolving help instructions on a page.
        /// </summary>
        [Required]
        [MaxLength(250)]
        public string RouteKey { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the parent enterprise feature suite (e.g. "Workforce & Shifts", "Committees & Groups", "Identity & RBAC").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string FeatureSuite { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the human-readable canonical page title.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string PageTitle { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a concise 1-2 sentence summary of what this page accomplishes.
        /// </summary>
        [MaxLength(500)]
        public string? ShortSummary { get; set; }

        /// <summary>
        /// Gets or sets the full rich-text / markdown documentation explaining the page workflow, business impact, and lifecycle.
        /// </summary>
        [Required]
        public string OverviewMarkdown { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the JSON-serialized array of action buttons, controls, and KPI card descriptions on this page.
        /// Format: [{"trigger": "Refresh", "icon": "refresh", "description": "...", "route": "..."}]
        /// </summary>
        public string? ActionsJson { get; set; }

        /// <summary>
        /// Gets or sets the JSON-serialized array of related sibling navigation routes within the same feature suite.
        /// Format: [{"title": "Live Radar", "route": "/workforce/console/live", "icon": "radar"}]
        /// </summary>
        public string? RelatedRoutesJson { get; set; }

        /// <summary>
        /// Gets or sets the JSON-serialized array of interactive tour walkthrough steps.
        /// Format: [{"targetSelector": ".btn-enroll", "title": "Enroll Member", "content": "..."}]
        /// </summary>
        public string? TourStepsJson { get; set; }

        /// <summary>
        /// Gets or sets the page context category (e.g., "Console", "Workspace", "Settings", "Public").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string Category { get; set; } = "Console";

        /// <summary>
        /// Gets or sets whether this guide is published and visible to end users.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Gets or sets the developer or administrator email who last authored or modified this guide.
        /// </summary>
        [MaxLength(150)]
        public string? LastUpdatedBy { get; set; }

        /// <summary>
        /// Gets or sets the UTC timestamp when the guide was authored.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the UTC timestamp when the guide was last updated.
        /// </summary>
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
