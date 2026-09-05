using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services.Legal;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages.Legal
{
    /// <summary>
    /// Page model for managing privacy consent choices, telemetry settings, and Data Subject Access Rights (DSAR).
    /// </summary>
    public class PrivacyChoicesModel : PageModel
    {
        private readonly ILegalService _legalService;

        /// <summary>
        /// Gets or sets the loaded legal document instance.
        /// </summary>
        public MasterLegalDocument? Document { get; set; }

        /// <summary>
        /// Gets or sets the list of all published legal policies for sidebar navigation.
        /// </summary>
        public IReadOnlyList<MasterLegalDocument> AllDocuments { get; set; } = new List<MasterLegalDocument>();

        /// <summary>
        /// Gets or sets the current ISO 2-letter culture code.
        /// </summary>
        public string CurrentCulture { get; set; } = "en";

        /// <summary>
        /// Initializes a new instance of the <see cref="PrivacyChoicesModel"/> class.
        /// </summary>
        /// <param name="legalService">The legal service instance.</param>
        public PrivacyChoicesModel(ILegalService legalService)
        {
            _legalService = legalService;
        }

        /// <summary>
        /// Handles HTTP GET requests to retrieve privacy choices information from the database.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        public async Task OnGetAsync(CancellationToken cancellationToken = default)
        {
            CurrentCulture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            Document = await _legalService.GetDocumentBySlugAsync("privacy-choices", CurrentCulture, cancellationToken);
            AllDocuments = await _legalService.GetPublishedDocumentsAsync(culture: CurrentCulture, cancellationToken: cancellationToken);
        }
    }
}
