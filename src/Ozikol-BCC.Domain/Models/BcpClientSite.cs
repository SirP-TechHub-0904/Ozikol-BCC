using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a customer or client operating site (e.g., commercial tower, campus, hospital, retail branch)
    /// where security posts, staff shifts, and geofenced attendance boundaries are managed.
    /// Table: [dbo].[BcpClientSites]
    /// </summary>
    public class BcpClientSite : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the client site.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this client site to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Optional foreign key identifier referencing the master client organization (<see cref="BcpClientOrganization"/>).
        /// </summary>
        public Guid? ClientOrganizationId { get; set; }

        /// <summary>
        /// Cached display name of the parent client enterprise organization.
        /// </summary>
        [StringLength(200)]
        public string? ClientOrganizationName { get; set; }

        /// <summary>
        /// Navigation property referencing the parent client enterprise organization.
        /// </summary>
        [ForeignKey(nameof(ClientOrganizationId))]
        public virtual BcpClientOrganization? ClientOrganization { get; set; }

        /// <summary>
        /// Unique short code identifier for the site (e.g., "SITE-101", "LDN-HQ").
        /// </summary>
        [Required]
        [StringLength(50)]
        public string SiteCode { get; set; } = string.Empty;

        /// <summary>
        /// Official business or building name of the client site (e.g., "Canary Wharf Security Post").
        /// </summary>
        [Required]
        [StringLength(200)]
        public string SiteName { get; set; } = string.Empty;

        /// <summary>
        /// Physical street address of the site.
        /// </summary>
        [StringLength(300)]
        public string Address { get; set; } = string.Empty;

        /// <summary>
        /// City or municipal territory.
        /// </summary>
        [StringLength(100)]
        public string City { get; set; } = string.Empty;

        /// <summary>
        /// Postal code or ZIP code.
        /// </summary>
        [StringLength(30)]
        public string PostalCode { get; set; } = string.Empty;

        /// <summary>
        /// Geographic latitude coordinate for GPS geofencing and mobile check-in verification.
        /// </summary>
        public double? Latitude { get; set; }

        /// <summary>
        /// Geographic longitude coordinate for GPS geofencing and mobile check-in verification.
        /// </summary>
        public double? Longitude { get; set; }

        /// <summary>
        /// Maximum allowed geofence radius in meters around the coordinates for valid clock-ins (defaults to 150m).
        /// </summary>
        public int GeofenceRadiusMeters { get; set; } = 150;

        /// <summary>
        /// Primary client contact person on site (duty manager or facility manager).
        /// </summary>
        [StringLength(150)]
        public string? EmergencyContactName { get; set; }

        /// <summary>
        /// Direct telephone or 24/7 hotline for emergency dispatch and incident escalation.
        /// </summary>
        [StringLength(50)]
        public string? EmergencyContactPhone { get; set; }

        /// <summary>
        /// Site Assignment Instructions (SIs), post orders, and mandatory operational guidelines displayed to guards.
        /// </summary>
        public string? SiteAssignmentInstructions { get; set; }

        /// <summary>
        /// Required SIA license category per post (e.g., "Door Supervision", "Security Guarding", "CCTV").
        /// </summary>
        [StringLength(100)]
        public string? RequiredSiaLicenceType { get; set; }

        /// <summary>
        /// Indicates whether this client site is actively operational and accepting shifts.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Timestamp when the site record was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the site record was last updated in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }

        /// <summary>
        /// Navigation collection of all shifts scheduled at this client site.
        /// </summary>
        public ICollection<BcpShift> Shifts { get; set; } = new List<BcpShift>();
    }
}

