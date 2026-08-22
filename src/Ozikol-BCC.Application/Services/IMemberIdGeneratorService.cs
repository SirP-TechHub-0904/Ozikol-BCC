using System.Collections.Generic;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services
{
    public class MemberIdFormatPreview
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Pattern { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PreviewExample { get; set; } = string.Empty;
        public bool IsSequential { get; set; }
    }

    public interface IMemberIdGeneratorService
    {
        /// <summary>
        /// Generates a unique, concurrency-safe Member ID according to the active tenant format.
        /// </summary>
        Task<string> GenerateMemberIdAsync(string? firstName = null, string? lastName = null, string? categoryName = null);

        /// <summary>
        /// Generates live preview representations of all 10 formats for admin settings.
        /// </summary>
        Task<List<MemberIdFormatPreview>> GetFormatPreviewsAsync(string? customPrefix = null, int? customStartNumber = null, int? customPadding = null, string? customDelimiter = null);
    }
}
