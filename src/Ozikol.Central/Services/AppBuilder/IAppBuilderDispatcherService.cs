using System;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.AppBuilder
{
    /// <summary>
    /// Service contract for dispatching automated application compilation jobs to GitHub Actions cloud runners.
    /// Powers building Windows Workstations (.exe) and Android Mobile (.apk, .aab) for General and Tenant White-Label releases.
    /// </summary>
    public interface IAppBuilderDispatcherService
    {
        /// <summary>
        /// Dispatches a cloud build workflow execution for the specified build job.
        /// </summary>
        /// <param name="build">The MasterTenantAppBuild job record.</param>
        /// <param name="callbackBaseUrl">Optional base URL of the Central API for webhook callbacks.</param>
        /// <returns>A dispatch result containing success status and optional error message.</returns>
        Task<AppBuilderDispatchResult> DispatchBuildAsync(MasterTenantAppBuild build, string? callbackBaseUrl = null);

        /// <summary>
        /// Verifies whether GitHub App Builder credentials are configured in MasterPlatformSettings or environment variables.
        /// </summary>
        /// <returns>True if credentials are valid; otherwise false.</returns>
        Task<bool> IsConfiguredAsync();
    }

    /// <summary>
    /// Result payload from a workflow dispatch invocation.
    /// </summary>
    public class AppBuilderDispatchResult
    {
        /// <summary>
        /// Gets or sets a value indicating whether the workflow dispatch was accepted by GitHub Actions.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Gets or sets an error message if the dispatch failed.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Gets or sets the target repository workflow web URL.
        /// </summary>
        public string? WorkflowUrl { get; set; }
    }
}

