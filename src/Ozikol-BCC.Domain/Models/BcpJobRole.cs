using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an operational workforce job role or specialization within a tenant workspace (e.g., "SIA Door Supervisor", "CCTV Controller", "Mobile Patrol Officer").
    /// Defines default base wage pay rates, client billing charge rates, mandatory license sector criteria, and visual calendar badge colors.
    /// Table: [dbo].[BcpJobRoles]
    /// </summary>
    public class BcpJobRole : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the operational job role.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this role to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Display title of the job role (e.g., "SIA Door Supervisor", "Static Security Guard").
        /// </summary>
        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Short machine code or abbreviation for reporting and rota badges (e.g., "DS", "SG", "CCTV", "CP").
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Operational description of duties, post responsibilities, and assignment requirements.
        /// </summary>
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Default base hourly wage pay rate paid to the staff member under this role.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? DefaultHourlyRate { get; set; }

        /// <summary>
        /// Default hourly billing rate invoiced to the client organization for this deployment role.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? BillingChargeRate { get; set; }

        /// <summary>
        /// Mandatory regulatory license sector required for this role (e.g., "Door Supervision", "Security Guarding", "CCTV", "Close Protection", "None").
        /// </summary>
        [StringLength(100)]
        public string MandatorySiaSector { get; set; } = "None";

        /// <summary>
        /// Hexadecimal color identifier used for shifts and guard badges on the Rota Calendar (e.g., "#0050E5").
        /// </summary>
        [StringLength(20)]
        public string BadgeColor { get; set; } = "#0050E5";

        /// <summary>
        /// Remuneration model for this role: "Hourly" (wage calculated per scheduled hour) or "Monthly" (fixed monthly salary).
        /// </summary>
        [Required]
        [StringLength(50)]
        public string CompensationBasis { get; set; } = "Hourly";

        /// <summary>
        /// Monthly base salary amount for salaried roles (when CompensationBasis is "Monthly").
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlySalary { get; set; }

        /// <summary>
        /// Standard weekly contracted hours expected for this role (e.g., 40.0, 37.5).
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal? ContractedWeeklyHours { get; set; }

        /// <summary>
        /// Indicates whether this job role is actively available for shift scheduling and staff enrollment.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Display sequence order in dropdown selectors and operational tables.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Timestamp when the job role was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the job role was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

