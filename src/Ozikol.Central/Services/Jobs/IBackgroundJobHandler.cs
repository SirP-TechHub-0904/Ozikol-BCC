using System.Threading;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.Jobs
{
    /// <summary>
    /// Contract implemented by all background job runners in Central and Tenant scopes.
    /// </summary>
    public interface IBackgroundJobHandler
    {
        /// <summary>
        /// Unique machine-readable identifier for this handler (e.g. "central.subscription-expiration").
        /// </summary>
        string JobKey { get; }

        /// <summary>
        /// User-friendly display name for this handler.
        /// </summary>
        string DisplayName { get; }

        /// <summary>
        /// Functional category for UI grouping.
        /// </summary>
        string Category { get; }

        /// <summary>
        /// Operational scope of this job handler.
        /// </summary>
        BackgroundJobScope Scope { get; }

        /// <summary>
        /// Detailed description of what this background handler executes.
        /// </summary>
        string Description { get; }

        /// <summary>
        /// Default recommended interval in seconds.
        /// </summary>
        int DefaultIntervalSeconds { get; }

        /// <summary>
        /// Executes the background job logic within the provided context.
        /// </summary>
        /// <param name="context">Execution context and parameters.</param>
        /// <param name="cancellationToken">Cancellation token for graceful shutdown.</param>
        /// <returns>Execution result summarizing counts, duration, logs, and errors.</returns>
        Task<JobExecutionResult> ExecuteAsync(JobExecutionContext context, CancellationToken cancellationToken = default);
    }
}
