using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    /// <summary>
    /// Tenant operational preferences, terminology aliases, attendance schedules, contact form toggles, and email configurations.
    /// Authority: Tenant Admin / Tenant SuperAdmin.
    /// </summary>
    public class BcpTenantOperationsSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        // ── Terminology Aliases ──
        /// <summary>
        /// Renames 'Group' -> 'Committee', 'Department', 'Squad', etc.
        /// </summary>
        [StringLength(100)]
        public string? GroupAlias { get; set; } = "Group";

        /// <summary>
        /// Renames 'Category' -> 'Department', 'Faculty', 'Division', etc.
        /// </summary>
        [StringLength(100)]
        public string? CategoryAlias { get; set; } = "Category";

        /// <summary>
        /// Renames 'Sub-Category' -> 'Branch', etc.
        /// </summary>
        [StringLength(100)]
        public string? SubCategoryAlias { get; set; } = "Sub-Category";

        /// <summary>
        /// Renames 'Alumni' -> 'Past Member', 'Fellow', etc.
        /// </summary>
        [StringLength(100)]
        public string? AlumniAlias { get; set; } = "Alumni";

        // ── Web Contact Form Controls ──
        public bool WebContactEnablePhone { get; set; } = true;
        public bool WebContactEnableCategory { get; set; } = true;
        public bool WebContactEnableFile { get; set; } = true;
        public bool EnableListDownload { get; set; } = true;

        // ── Email Integration (ZeptoMail) ──
        public bool EnableZeptoMail { get; set; }
        [StringLength(255)]
        public string? ZeptoMailApiKey { get; set; }
        [StringLength(255)]
        public string? ZeptoMailSenderEmail { get; set; }
        [StringLength(255)]
        public string? ZeptoMailSenderName { get; set; }
        public int EmailMaxRetries { get; set; } = 3;
        public string? EmailTemplate { get; set; }
        public string? SmsTemplatePrefix { get; set; }
        public string? SmsTemplateSuffix { get; set; }

        // ── Attendance Schedules & Work Hours ──
        public DateTime? DefaultAttendanceStartTime { get; set; }
        public DateTime? DefaultAttendanceCloseTime { get; set; }
        public int EarlyMinute { get; set; } = 15;
        public int OntimeMinute { get; set; } = 0;
        public int LateMinute { get; set; } = 15;
        public int VeryLateMinute { get; set; } = 60;
        public DateTime? DefaultAttendanceStartTimeSaturday { get; set; }
        public DateTime? ReportCloseTime { get; set; }

        // ── Auto-Signature Details for Generated Documents ──
        [StringLength(255)]
        public string? SignatureName { get; set; }
        [StringLength(255)]
        public string? SignatureTitle { get; set; }
        public string? SignatureUrl { get; set; }
        public string? SignatureKey { get; set; }
    }
}
