using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents the execution outcome of a background job run.
    /// </summary>
    public enum JobExecutionStatus
    {
        /// <summary>
        /// The job is currently in progress.
        /// </summary>
        Running = 1,

        /// <summary>
        /// The job completed successfully without errors.
        /// </summary>
        Success = 2,

        /// <summary>
        /// The job failed due to an unhandled exception.
        /// </summary>
        Failed = 3,

        /// <summary>
        /// The job execution was cancelled.
        /// </summary>
        Cancelled = 4
    }

    /// <summary>
    /// Immutable audit log entry tracking individual background job execution runs and diagnostic output.
    /// </summary>
    [Table("MasterBackgroundJobLogs")]
    public class MasterBackgroundJobLog
    {
        /// <summary>
        /// Unique identifier for this execution log entry.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key referencing the parent background job.
        /// </summary>
        [ForeignKey("Job")]
        public Guid JobId { get; set; }

        /// <summary>
        /// Navigation property to the parent background job.
        /// </summary>
        public MasterBackgroundJob Job { get; set; } = null!;

        /// <summary>
        /// Optional target tenant catalog ID if this execution targeted a specific tenant.
        /// </summary>
        [ForeignKey("TargetTenantCatalog")]
        public Guid? TargetTenantCatalogId { get; set; }

        /// <summary>
        /// Navigation property to the target tenant organization.
        /// </summary>
        public MasterTenantCatalog? TargetTenantCatalog { get; set; }

        /// <summary>
        /// Tenant key / identifier for fast search filtering in logs.
        /// </summary>
        [MaxLength(100)]
        public string? TenantKey { get; set; }

        /// <summary>
        /// Timestamp in UTC when this execution started.
        /// </summary>
        public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when this execution completed.
        /// </summary>
        public DateTime? CompletedAtUtc { get; set; }

        /// <summary>
        /// Total duration of the execution in milliseconds.
        /// </summary>
        public long DurationMs { get; set; }

        /// <summary>
        /// Outcome status of the run.
        /// </summary>
        public JobExecutionStatus Status { get; set; } = JobExecutionStatus.Running;

        /// <summary>
        /// Count of items processed during this execution (e.g., number of tenants, subscriptions, emails).
        /// </summary>
        public int ItemsProcessedCount { get; set; }

        /// <summary>
        /// Concise human-readable summary of the execution outcome.
        /// </summary>
        [MaxLength(500)]
        public string? SummaryMessage { get; set; }

        /// <summary>
        /// Detailed stdout / debug log text captured during execution.
        /// </summary>
        public string? LogOutput { get; set; }

        /// <summary>
        /// Detailed exception stack trace or error message if the execution failed.
        /// </summary>
        public string? ErrorDetails { get; set; }
    }
}
