using System.Collections.Generic;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models.Careers;

namespace Ozikol.Central.Services.Careers;

/// <summary>
/// Provides access to career job openings, department filtering, and candidate application submissions.
/// </summary>
public interface ICareersService
{
    /// <summary>
    /// Retrieves active job openings matching the optional department, language, and search query filters.
    /// </summary>
    /// <param name="department">Optional department name filter.</param>
    /// <param name="language">Optional language requirement filter.</param>
    /// <param name="search">Optional keyword search string.</param>
    /// <returns>Read-only collection of matching job opening models.</returns>
    Task<IReadOnlyList<JobOpeningModel>> GetOpeningsAsync(string? department = null, string? language = null, string? search = null);

    /// <summary>
    /// Retrieves a single job opening by its unique URL slug.
    /// </summary>
    /// <param name="slug">The unique job permalink slug.</param>
    /// <returns>The matching job opening model or null if not found.</returns>
    Task<JobOpeningModel?> GetOpeningBySlugAsync(string slug);

    /// <summary>
    /// Submits a candidate job application, uploading CV and passport documents via file storage
    /// and persisting the application record in the Master Catalog database.
    /// </summary>
    /// <param name="input">The application form payload with file attachments.</param>
    /// <param name="clientIp">Client IP address for telemetry and audit.</param>
    /// <returns>The assigned unique application reference tracking code (e.g. APP-8F3A29).</returns>
    Task<string> SubmitApplicationAsync(JobApplicationInput input, string? clientIp);

    /// <summary>
    /// Retrieves distinct active department names for filtering.
    /// </summary>
    /// <returns>Collection of active department names.</returns>
    Task<IReadOnlyList<string>> GetDepartmentsAsync();
}
