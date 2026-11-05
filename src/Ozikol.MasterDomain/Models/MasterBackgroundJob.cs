using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Defines the operational scope of a background job.
    /// </summary>
    public enum BackgroundJobScope
    {
        /// <summary>
        /// Central platform system-level job running across all tenants or global platform infrastructure.
        /// </summary>
        Central = 1,

        /// <summary>
        /// Tenant-specific job running on individual or all tenant databases/contexts.
        /// </summary>
        Tenant = 2
    }

    /// <summary>
    /// Represents the current runtime status of a background job.
    /// </summary>
    public enum BackgroundJobStatus
    {
        /// <summary>
        /// The job is registered, active, and waiting for its next scheduled run.
        /// </summary>
        Idle = 1,

        /// <summary>
        /// The job is actively executing right now.
        /// </summary>
        Running = 2,

        /// <summary>
        /// The job has been paused by an administrator.
        /// </summary>
        Paused = 3,

        /// <summary>
        /// The last run encountered an unhandled exception or error.
        /// </summary>
        Failed = 4,

        /// <summary>
        /// The job is permanently disabled.
        /// </summary>
        Disabled = 5
    }

    /// <summary>
    /// Represents a registered background job managed in the Master Database for Central or Tenant operations.
    /// </summary>
    [Table("MasterBackgroundJobs")]
    public class MasterBackgroundJob
    {
        /// <summary>
        /// Unique identifier for the background job record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Unique machine-readable key for the job handler (e.g., "central.subscription-expiration", "tenant.daily-digest").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string JobKey { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable display name for the job.
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Detailed description of what this background job accomplishes.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Functional category grouping (e.g., "Billing & Subscriptions", "Email & Deliverability", "Tenant Operations", "System Maintenance").
        /// </summary>
        [MaxLength(100)]
        public string Category { get; set; } = "General";

        /// <summary>
        /// Operational scope: Central system job or Tenant project job.
        /// </summary>
        public BackgroundJobScope Scope { get; set; } = BackgroundJobScope.Central;

        /// <summary>
        /// Optional specific tenant catalog ID. If null, the job targets all active tenants (or Central platform).
        /// </summary>
        [ForeignKey("TargetTenantCatalog")]
        public Guid? TargetTenantCatalogId { get; set; }

        /// <summary>
        /// Navigation property to the target tenant organization if scoped to a specific tenant.
        /// </summary>
        public MasterTenantCatalog? TargetTenantCatalog { get; set; }

        /// <summary>
        /// Optional standard 5-part cron expression (e.g. "0 * * * *" for hourly).
        /// </summary>
        [MaxLength(50)]
        public string? ScheduleCron { get; set; }

        /// <summary>
        /// Polling / recurrence interval in seconds (default 3600 = 1 hour).
        /// </summary>
        public int IntervalSeconds { get; set; } = 3600;

        /// <summary>
        /// Optional JSON-serialized parameters dictionary passed into the job handler at runtime.
        /// </summary>
        public string? JobParametersJson { get; set; }

        /// <summary>
        /// Indicates whether the job is enabled for automated recurring execution.
        /// </summary>
        public bool IsEnabled { get; set; } = true;

        /// <summary>
        /// Current execution status of the job.
        /// </summary>
        public BackgroundJobStatus Status { get; set; } = BackgroundJobStatus.Idle;

        /// <summary>
        /// Timestamp in UTC when the job was last executed.
        /// </summary>
        public DateTime? LastRunUtc { get; set; }

        /// <summary>
        /// Timestamp in UTC when the job is next scheduled to execute.
        /// </summary>
        public DateTime? NextRunUtc { get; set; }

        /// <summary>
        /// Execution duration of the last run in milliseconds.
        /// </summary>
        public long LastDurationMs { get; set; }

        /// <summary>
        /// Human-readable summary outcome of the last execution.
        /// </summary>
        [MaxLength(500)]
        public string? LastResultSummary { get; set; }

        /// <summary>
        /// Date and time in UTC when the job record was registered.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Date and time in UTC when the job record was last modified.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }

        /// <summary>
        /// Collection of historical execution logs for this job.
        /// </summary>
        public ICollection<MasterBackgroundJobLog> ExecutionLogs { get; set; } = new List<MasterBackgroundJobLog>();
    }
}
