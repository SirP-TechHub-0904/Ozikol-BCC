using System;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Pages.Features;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model handling the Developer MIS API and Webhooks documentation overview.
/// Explains external data access for census demographics, ticketing, and revenue without granting portal logins.
/// </summary>
public class DeveloperApiModel : FeatureDetailPageModel
{
    /// <summary>
    /// Handles GET requests to render the Developer MIS API overview.
    /// </summary>
    public override void OnGet()
    {
        base.OnGet();
    }
}
