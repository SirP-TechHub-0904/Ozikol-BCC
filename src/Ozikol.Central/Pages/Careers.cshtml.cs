using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Models.Careers;
using Ozikol.Central.Services.Careers;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model handling the Ozikol global Careers portal, department &amp; language filtering,
/// keyword search, and dynamic job role listings.
/// </summary>
public class CareersModel : PageModel
{
    private readonly ICareersService _careersService;

    /// <summary>
    /// Initializes a new instance of the <see cref="CareersModel"/> class.
    /// </summary>
    /// <param name="careersService">Careers content and application provider.</param>
    public CareersModel(ICareersService careersService)
    {
        _careersService = careersService ?? throw new ArgumentNullException(nameof(careersService));
    }

    /// <summary>
    /// Gets the active 2-letter ISO language code for localized URL routing.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// Gets or sets the active department filter string.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? Department { get; set; }

    /// <summary>
    /// Gets or sets the active language requirement filter string (e.g. English, French, Italian).
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? Language { get; set; }

    /// <summary>
    /// Gets or sets the keyword search string.
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? Query { get; set; }

    /// <summary>
    /// Gets the collection of active job openings loaded from the Master Catalog database.
    /// </summary>
    public IReadOnlyList<JobOpeningModel> Openings { get; private set; } = Array.Empty<JobOpeningModel>();

    /// <summary>
    /// Gets the collection of active department names.
    /// </summary>
    public IReadOnlyList<string> Departments { get; private set; } = Array.Empty<string>();

    /// <summary>
    /// Handles GET requests to query and render career openings and company culture.
    /// </summary>
    public async Task OnGetAsync()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";

        Departments = await _careersService.GetDepartmentsAsync();
        Openings = await _careersService.GetOpeningsAsync(Department, Language, Query);
    }
}
