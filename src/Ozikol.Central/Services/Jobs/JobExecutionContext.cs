using System;
using System.Collections.Generic;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.Jobs
{
    /// <summary>
    /// Encapsulates execution context and runtime parameters passed into a background job handler.
    /// </summary>
    public class JobExecutionContext
    {
        /// <summary>
        /// The database ID of the registered background job.
        /// </summary>
        public Guid JobId { get; set; }

        /// <summary>
        /// Unique job handler identifier key.
        /// </summary>
        public string JobKey { get; set; } = string.Empty;

        /// <summary>
        /// Scope of execution (Central system-level or Tenant-scoped).
        /// </summary>
        public BackgroundJobScope Scope { get; set; } = BackgroundJobScope.Central;

        /// <summary>
        /// Optional specific target tenant catalog ID if this run targets a single tenant organization.
        /// </summary>
        public Guid? TargetTenantCatalogId { get; set; }

        /// <summary>
        /// Optional target tenant key.
        /// </summary>
        public string? TargetTenantKey { get; set; }

        /// <summary>
        /// Optional target tenant name.
        /// </summary>
        public string? TargetOrganizationName { get; set; }

        /// <summary>
        /// Optional raw JSON parameter payload configured for this job.
        /// </summary>
        public string? ParametersJson { get; set; }

        /// <summary>
        /// Timestamp in UTC when execution started.
        /// </summary>
        public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Indicates whether this run was triggered manually by an operator from the Central console.
        /// </summary>
        public bool IsManualTrigger { get; set; }
    }

    /// <summary>
    /// Encapsulates the execution outcome, processed item count, and diagnostic output from a background job.
    /// </summary>
    public class JobExecutionResult
    {
        /// <summary>
        /// Whether the execution finished successfully without unhandled errors.
        /// </summary>
        public bool Success { get; set; } = true;

        /// <summary>
        /// Count of items processed during this execution.
        /// </summary>
        public int ItemsProcessedCount { get; set; }

        /// <summary>
        /// Concise human-readable outcome summary.
        /// </summary>
        public string SummaryMessage { get; set; } = string.Empty;

        /// <summary>
        /// Multi-line execution log lines captured during processing.
        /// </summary>
        public List<string> LogLines { get; set; } = new List<string>();

        /// <summary>
        /// Error message or exception details if the job failed.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Convenience factory method to construct a successful execution result.
        /// </summary>
        /// <param name="itemsCount">Number of items processed.</param>
        /// <param name="summary">Concise summary message.</param>
        /// <param name="logs">Optional log lines list.</param>
        /// <returns>A populated JobExecutionResult representing success.</returns>
        public static JobExecutionResult Succeeded(int itemsCount, string summary, List<string>? logs = null)
        {
            return new JobExecutionResult
            {
                Success = true,
                ItemsProcessedCount = itemsCount,
                SummaryMessage = summary,
                LogLines = logs ?? new List<string>()
            };
        }

        /// <summary>
        /// Convenience factory method to construct a failed execution result.
        /// </summary>
        /// <param name="errorMessage">Error description or exception message.</param>
        /// <param name="summary">Concise failure summary.</param>
        /// <param name="logs">Optional log lines list.</param>
        /// <returns>A populated JobExecutionResult representing failure.</returns>
        public static JobExecutionResult Failed(string errorMessage, string summary = "Execution failed", List<string>? logs = null)
        {
            return new JobExecutionResult
            {
                Success = false,
                ErrorMessage = errorMessage,
                SummaryMessage = summary,
                LogLines = logs ?? new List<string>()
            };
        }
    }
}
