using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a master client or customer enterprise organization (e.g. "Commercial Property Group", "Metropolitan Health Authority").
    /// Acts as the parent operational entity governing one or more physical client operating sites and security posts.
    /// Table: [dbo].[BcpClientOrganizations]
    /// </summary>
    public class BcpClientOrganization : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the client organization.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this client organization to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Legal or commercial enterprise company name (e.g., "Commercial Property Group").
        /// </summary>
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Short unique account or corporate code (e.g., "CPG-CORP").
        /// </summary>
        [Required]
        [StringLength(50)]
        public string OrganizationCode { get; set; } = string.Empty;

        /// <summary>
        /// Primary corporate billing or finance email for invoice dispatch.
        /// </summary>
        [Required]
        [StringLength(200)]
        public string BillingEmail { get; set; } = string.Empty;

        /// <summary>
        /// Direct billing hotline or corporate contact telephone number.
        /// </summary>
        [StringLength(50)]
        public string? BillingPhone { get; set; }

        /// <summary>
        /// Corporate headquarters street address.
        /// </summary>
        [StringLength(300)]
        public string? Address { get; set; }

        /// <summary>
        /// City or municipal territory of corporate headquarters.
        /// </summary>
        [StringLength(100)]
        public string? City { get; set; }

        /// <summary>
        /// Headquarters postal code.
        /// </summary>
        [StringLength(30)]
        public string? PostalCode { get; set; }

        /// <summary>
        /// Standard invoice settlement terms in days (e.g., 30 days).
        /// </summary>
        public int PaymentTermsDays { get; set; } = 30;

        /// <summary>
        /// Internal company manager assigned to manage this customer account.
        /// </summary>
        [StringLength(150)]
        public string? AccountManagerName { get; set; }

        /// <summary>
        /// Indicates whether this client organization is actively serviced.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Timestamp when the client organization was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the client organization was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }

        /// <summary>
        /// Physical operating sites, venues, and security posts owned or managed by this client organization.
        /// </summary>
        public virtual ICollection<BcpClientSite> Sites { get; set; } = new List<BcpClientSite>();
    }
}

