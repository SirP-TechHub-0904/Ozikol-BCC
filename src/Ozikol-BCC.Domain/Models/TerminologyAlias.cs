using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a custom terminology alias for a tenant. Allows mapping a generic term
    /// (e.g., "Shift") to a tenant‑specific term (e.g., "Roster").
    /// </summary>
    public class TerminologyAlias
    {
        /// <summary>
        /// Primary key.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The generic term used by the platform (e.g., "Shift").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string GenericTerm { get; set; } = string.Empty;

        /// <summary>
        /// The tenant‑specific term that will be displayed in the UI.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string TenantTerm { get; set; } = string.Empty;

        /// <summary>
        /// Foreign key to the tenant (tenant isolation). Optional – null when the alias
        /// applies globally across all tenants.
        /// </summary>
        public Guid? TenantId { get; set; }
    }
}

