using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services.Legal;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// Page model for corporate governance policies and compliance reports.
    /// Retrieves governance overview and active policies dynamically from the master database.
    /// </summary>
    public class PoliciesAndReportsModel : PageModel
    {
        private readonly ILegalService _legalService;

        /// <summary>
        /// Gets or sets the primary governance charter document.
        /// </summary>
        public MasterLegalDocument? Document { get; set; }

        /// <summary>
        /// Gets or sets the list of all published legal policies and compliance reports.
        /// </summary>
        public IReadOnlyList<MasterLegalDocument> AllDocuments { get; set; } = new List<MasterLegalDocument>();

        /// <summary>
        /// Gets or sets the current ISO 2-letter culture code.
        /// </summary>
        public string CurrentCulture { get; set; } = "en";

        /// <summary>
        /// Initializes a new instance of the <see cref="PoliciesAndReportsModel"/> class.
        /// </summary>
        /// <param name="legalService">The legal service instance.</param>
        public PoliciesAndReportsModel(ILegalService legalService)
        {
            _legalService = legalService;
        }

        /// <summary>
        /// Handles HTTP GET requests to retrieve governance policies and reports from the database.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        public async Task OnGetAsync(CancellationToken cancellationToken = default)
        {
            CurrentCulture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            Document = await _legalService.GetDocumentBySlugAsync("policies-and-reports", CurrentCulture, cancellationToken);
            AllDocuments = await _legalService.GetPublishedDocumentsAsync(culture: CurrentCulture, cancellationToken: cancellationToken);
        }
    }
}
