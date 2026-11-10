using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents comprehensive operational workforce policy rules for a tenant workspace.
    /// Governs working time limits, Day/Night shift windows, night differentials, meal break deduction matrices, and custom onboarding questionnaires.
    /// Table: [dbo].[BcpWorkforcePolicySettings]
    /// </summary>
    public class BcpWorkforcePolicySetting : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the workforce policy configuration record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this policy setting to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        // =========================================================================
        // 1. WORKING HOURS & STATUTORY TIME LIMITS
        // =========================================================================

        /// <summary>
        /// Baseline standard full-time contracted working week (e.g. 40.0 or 37.5 hrs/week).
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal StandardWeeklyHours { get; set; } = 40.0m;

        /// <summary>
        /// Maximum permissible weekly hours (statutory 48.0h under UK Working Time Regulations 1998) unless worker signs opt-out agreement.
        /// </summary>
        [Column(TypeName = "decimal(5,2)")]
        public decimal MaxPermissibleWeeklyHours { get; set; } = 48.0m;

        /// <summary>
        /// Maximum consecutive working days permitted before burnout fatigue warning is raised (defaults to 6 days).
        /// </summary>
        public int MaxConsecutiveWorkingDays { get; set; } = 6;

        /// <summary>
        /// Whether the rota scheduler hard-blocks or issues warnings for shifts exceeding the statutory 48-hour limit.
        /// </summary>
        public bool Enforce48HourWeeklyCap { get; set; } = true;

        // =========================================================================
        // 2. DAY SHIFT VS. NIGHT SHIFT WINDOWS & DIFFERENTIAL
        // =========================================================================

        /// <summary>
        /// Start of the standard day shift window in 24-hour time format ("07:00").
        /// </summary>
        [StringLength(10)]
        public string DayShiftStart { get; set; } = "07:00";

        /// <summary>
        /// End of the standard day shift window in 24-hour time format ("19:00").
        /// </summary>
        [StringLength(10)]
        public string DayShiftEnd { get; set; } = "19:00";

        /// <summary>
        /// Start of the overnight shift window in 24-hour time format ("19:00").
        /// </summary>
        [StringLength(10)]
        public string NightShiftStart { get; set; } = "19:00";

        /// <summary>
        /// End of the overnight shift window in 24-hour time format ("07:00").
        /// </summary>
        [StringLength(10)]
        public string NightShiftEnd { get; set; } = "07:00";

        /// <summary>
        /// Optional extra hourly pay premium differential applied to hours worked inside the night shift window (in tenant currency).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal NightPremiumHourlyAllowance { get; set; } = 1.50m;

        /// <summary>
        /// Whether night premium pay calculations are actively applied to timesheets.
        /// </summary>
        public bool EnableNightPremium { get; set; } = false;

        // =========================================================================
        // 3. MEAL & REST BREAK RULES
        // =========================================================================

        /// <summary>
        /// Mandatory break minutes for shifts of 6 or more planned hours (defaults to 30 minutes).
        /// </summary>
        public int BreakMinutesFor6Hours { get; set; } = 30;

        /// <summary>
        /// Mandatory break minutes for shifts of 8 or more planned hours (defaults to 45 minutes).
        /// </summary>
        public int BreakMinutesFor8Hours { get; set; } = 45;

        /// <summary>
        /// Mandatory break minutes for shifts of 12 or more planned hours (defaults to 60 minutes).
        /// </summary>
        public int BreakMinutesFor12Hours { get; set; } = 60;

        /// <summary>
        /// Indicates whether breaks are paid (true) or deducted from gross wage calculations (false).
        /// </summary>
        public bool IsBreakPaid { get; set; } = false;

        /// <summary>
        /// Policy for logging breaks: "AutomaticDeduction" (auto deducted from shift length) or "GuardClocking" (guard clocks break start/end).
        /// </summary>
        [StringLength(50)]
        public string BreakLoggingMode { get; set; } = "AutomaticDeduction";

        // =========================================================================
        // 4. CUSTOM ONBOARDING FORM QUESTIONNAIRE REQUIREMENTS
        // =========================================================================

        /// <summary>
        /// Whether staff members must declare uniform apparel sizes (jacket, trousers, boots) during self-onboarding.
        /// </summary>
        public bool RequireUniformSizes { get; set; } = true;

        /// <summary>
        /// Whether staff members must declare driving license status and vehicle access.
        /// </summary>
        public bool RequireDrivingLicense { get; set; } = true;

        /// <summary>
        /// Whether staff members must disclose emergency medical conditions, severe allergies, or health impairments.
        /// </summary>
        public bool RequireMedicalAllergies { get; set; } = true;

        /// <summary>
        /// Whether staff members must complete criminal history or DBS disclosure declarations.
        /// </summary>
        public bool RequireDbsCriminalDisclosure { get; set; } = true;

        /// <summary>
        /// Optional JSON-serialized array of custom tenant onboarding questions and form fields.
        /// </summary>
        public string? CustomQuestionsJson { get; set; }

        /// <summary>
        /// Timestamp when the policy record was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the policy record was last updated in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

