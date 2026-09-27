using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.Application.Dtos.Sections;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Pipeline service responsible for ingesting live remote template demo pages (or raw HTML markup),
    /// discovering and separating third-party vendor CDNs from author custom assets,
    /// merging all custom stylesheets and scripts into single unified bundles with CSS url() paths resolved,
    /// uploading the compiled asset bundles to Cloudinary, and automatically slicing the page into modular sections.
    /// </summary>
    public interface ITemplateAssetBundlePipelineService
    {
        /// <summary>
        /// Ingests a remote demo URL or pre-fetched HTML, categorizes and resolves all external asset dependencies,
        /// downloads and bundles author custom CSS and JS, uploads them to Cloudinary CDN, and slices modular sections.
        /// </summary>
        /// <param name="request">The pipeline execution request specifying the demo URL, folder, and processing options.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>
        /// A <see cref="TemplateRemoteAssetPipelineResponseDto"/> containing detected CDN titles, Cloudinary bundle URLs,
        /// pre-rendered Head/Footer HTML blocks, and structured modular sliced sections.
        /// </returns>
        Task<TemplateRemoteAssetPipelineResponseDto> ProcessRemoteTemplateAsync(
            TemplateRemoteAssetPipelineRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
