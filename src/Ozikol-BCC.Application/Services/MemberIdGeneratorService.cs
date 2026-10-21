using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Service responsible for generating unique, formatted member and staff identification codes
    /// according to tenant-configured patterns, delimiters, sequence numbers, and prefixes.
    /// Includes sanitization routines to prevent duplicate consecutive delimiters (e.g. double hyphens).
    /// </summary>
    public class MemberIdGeneratorService : IMemberIdGeneratorService
    {
        private readonly DashboardDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="MemberIdGeneratorService"/> class.
        /// </summary>
        /// <param name="dbContext">Tenant database context for reading configuration and verifying uniqueness.</param>
        public MemberIdGeneratorService(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Generates a unique member identification code according to active tenant rules.
        /// </summary>
        /// <param name="firstName">Optional member first name for initials-based formats.</param>
        /// <param name="lastName">Optional member last name for initials-based formats.</param>
        /// <param name="categoryName">Optional organizational category name for category-code formats.</param>
        /// <returns>A unique, sanitized member ID string.</returns>
        public async Task<string> GenerateMemberIdAsync(string? firstName = null, string? lastName = null, string? categoryName = null)
        {
            var setting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new MisConfigurationSetting
                {
                    Id = Guid.NewGuid(),
                    MemberIdFormat = "PrefixYearMonthRandom",
                    MemberIdPrefix = "CC",
                    MemberIdNextNumber = 1,
                    MemberIdPadding = 4,
                    MemberIdDelimiter = "-"
                };
                _dbContext.MisConfigurationSettings.Add(setting);
                await _dbContext.SaveChangesAsync();
            }

            var format = !string.IsNullOrWhiteSpace(setting.MemberIdFormat) ? setting.MemberIdFormat.Trim() : "PrefixYearMonthRandom";
            var rawPrefix = !string.IsNullOrWhiteSpace(setting.MemberIdPrefix) ? setting.MemberIdPrefix.Trim().ToUpperInvariant() : "CC";
            var delimiter = !string.IsNullOrWhiteSpace(setting.MemberIdDelimiter) ? setting.MemberIdDelimiter : "-";
            var padding = setting.MemberIdPadding > 0 ? setting.MemberIdPadding : 4;

            // Trim any trailing delimiter characters from prefix to prevent double delimiters (e.g. "ID-" + "-" => "ID--")
            var prefix = rawPrefix.TrimEnd('-', '/', '_', ':', '.', ' ');
            if (string.IsNullOrEmpty(prefix)) prefix = "CC";

            string candidate = string.Empty;
            bool isUnique = false;
            int attempts = 0;

            while (!isUnique && attempts < 50)
            {
                attempts++;
                int seq = setting.MemberIdNextNumber;
                var now = DateTime.UtcNow;

                switch (format)
                {
                    // 1. Prefix-YearMonth-Random: CC-2608-232
                    case "PrefixYearMonthRandom":
                        var rand3 = RandomNumberGenerator.GetInt32(100, 999);
                        candidate = $"{prefix}{delimiter}{now:yyMM}{delimiter}{rand3}";
                        break;

                    // 2. Prefix-Sequential: CC-000042
                    case "PrefixSequential":
                        var seqPadding = padding < 6 ? 6 : padding;
                        candidate = $"{prefix}{delimiter}{seq.ToString($"D{seqPadding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 3. Prefix-FullYear-Seq: CC-2026-0042
                    case "PrefixFullYearSeq":
                        candidate = $"{prefix}{delimiter}{now:yyyy}{delimiter}{seq.ToString($"D{padding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 4. Prefix-ShortYear-Seq: CC-26-0042
                    case "PrefixShortYearSeq":
                        candidate = $"{prefix}{delimiter}{now:yy}{delimiter}{seq.ToString($"D{padding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 5. Pure Numeric Sequential: 100042
                    case "NumericSequential":
                        var numBase = seq < 100001 ? (100000 + seq) : seq;
                        candidate = $"{numBase}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 6. Prefix-Initials-Seq: CC-FL-0042
                    case "PrefixInitialsSeq":
                        var init1 = !string.IsNullOrWhiteSpace(firstName) ? firstName.Trim()[0].ToString().ToUpperInvariant() : "M";
                        var init2 = !string.IsNullOrWhiteSpace(lastName) ? lastName.Trim()[0].ToString().ToUpperInvariant() : "B";
                        var initials = $"{init1}{init2}";
                        candidate = $"{prefix}{delimiter}{initials}{delimiter}{seq.ToString($"D{padding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 7. Prefix-FullYearMonth-Seq: CC-202608-0042
                    case "PrefixFullYearMonthSeq":
                        candidate = $"{prefix}{delimiter}{now:yyyyMM}{delimiter}{seq.ToString($"D{padding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 8. CategoryCode-Year-Seq: SW-26-0042
                    case "CategoryCodeYearSeq":
                        var catCode = GetCategoryCode(categoryName);
                        candidate = $"{catCode}{delimiter}{now:yy}{delimiter}{seq.ToString($"D{padding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    // 9. Prefix-Alphanumeric Token: CC-8F4K29
                    case "PrefixAlphanumericToken":
                        var token = GenerateAlphanumericToken(6);
                        candidate = $"{prefix}{delimiter}{token}";
                        break;

                    // 10. Institutional Slash Hierarchy: CC/2026/0042
                    case "InstitutionalSlash":
                        candidate = $"{prefix}/{now:yyyy}/{seq.ToString($"D{padding}")}";
                        setting.MemberIdNextNumber++;
                        break;

                    default:
                        candidate = $"{prefix}{delimiter}{now:yyMM}{delimiter}{RandomNumberGenerator.GetInt32(100, 999)}";
                        break;
                }

                // Sanitize candidate to strip duplicate delimiters and leading/trailing dashes
                candidate = SanitizeMemberId(candidate, delimiter);

                // Check collision in Users table
                var exists = await _dbContext.Users.AnyAsync(u => u.MemberId == candidate);
                if (!exists)
                {
                    isUnique = true;
                }
            }

            await _dbContext.SaveChangesAsync();
            return candidate;
        }

        /// <summary>
        /// Generates real-time format previews for all supported member ID formats using current or prospective settings.
        /// </summary>
        /// <param name="customPrefix">Optional transient prefix string.</param>
        /// <param name="customStartNumber">Optional transient starting sequence counter.</param>
        /// <param name="customPadding">Optional transient digit zero-padding width.</param>
        /// <param name="customDelimiter">Optional transient delimiter separator.</param>
        /// <returns>A list of format previews with description and rendered sample example.</returns>
        public async Task<List<MemberIdFormatPreview>> GetFormatPreviewsAsync(string? customPrefix = null, int? customStartNumber = null, int? customPadding = null, string? customDelimiter = null)
        {
            var setting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();

            var rawPrefix = !string.IsNullOrWhiteSpace(customPrefix) 
                ? customPrefix.Trim().ToUpperInvariant() 
                : (!string.IsNullOrWhiteSpace(setting?.MemberIdPrefix) ? setting.MemberIdPrefix.ToUpperInvariant() : "CC");

            var prefix = rawPrefix.TrimEnd('-', '/', '_', ':', '.', ' ');
            if (string.IsNullOrEmpty(prefix)) prefix = "CC";

            var seq = customStartNumber.HasValue && customStartNumber.Value > 0 
                ? customStartNumber.Value 
                : (setting != null && setting.MemberIdNextNumber > 0 ? setting.MemberIdNextNumber : 1);

            var padding = customPadding.HasValue && customPadding.Value > 0 
                ? customPadding.Value 
                : (setting != null && setting.MemberIdPadding > 0 ? setting.MemberIdPadding : 4);

            var delimiter = !string.IsNullOrWhiteSpace(customDelimiter) 
                ? customDelimiter 
                : (!string.IsNullOrWhiteSpace(setting?.MemberIdDelimiter) ? setting.MemberIdDelimiter : "-");

            var now = DateTime.UtcNow;

            return new List<MemberIdFormatPreview>
            {
                new MemberIdFormatPreview
                {
                    Key = "PrefixYearMonthRandom",
                    Name = "Prefix-YearMonth-Random",
                    Pattern = $"[PREFIX]{delimiter}yyMM{delimiter}###",
                    Description = "Standard pattern with 2-digit year, 2-digit month, and 3-digit random integer (e.g. non-sequential).",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}{now:yyMM}{delimiter}232", delimiter),
                    IsSequential = false
                },
                new MemberIdFormatPreview
                {
                    Key = "PrefixSequential",
                    Name = "Prefix-Serial (Zero Padded)",
                    Pattern = $"[PREFIX]{delimiter}######",
                    Description = "Clean, sequential membership number padded with leading zeros (e.g. 000001, 000002...).",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}{seq.ToString($"D{(padding < 6 ? 6 : padding)}")}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "PrefixFullYearSeq",
                    Name = "Prefix-FullYear-Serial",
                    Pattern = $"[PREFIX]{delimiter}yyyy{delimiter}####",
                    Description = "4-digit calendar year followed by a zero-padded sequential number.",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}{now:yyyy}{delimiter}{seq.ToString($"D{padding}")}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "PrefixShortYearSeq",
                    Name = "Prefix-ShortYear-Serial",
                    Pattern = $"[PREFIX]{delimiter}yy{delimiter}####",
                    Description = "Compact 2-digit year with zero-padded sequential number.",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}{now:yy}{delimiter}{seq.ToString($"D{padding}")}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "NumericSequential",
                    Name = "Pure Numeric Serial",
                    Pattern = "######",
                    Description = "Classic numeric integer ID starting from 100001 with zero letters or symbols.",
                    PreviewExample = SanitizeMemberId($"{(seq < 100001 ? 100000 + seq : seq)}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "PrefixInitialsSeq",
                    Name = "Prefix-Initials-Serial",
                    Pattern = $"[PREFIX]{delimiter}[INITIALS]{delimiter}####",
                    Description = "Includes member's initials (e.g. First Last => FL) alongside sequential serial.",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}FL{delimiter}{seq.ToString($"D{padding}")}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "PrefixFullYearMonthSeq",
                    Name = "Prefix-FullYearMonth-Serial",
                    Pattern = $"[PREFIX]{delimiter}yyyyMM{delimiter}####",
                    Description = "Comprehensive date stamp (Year + Month) with sequential counter.",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}{now:yyyyMM}{delimiter}{seq.ToString($"D{padding}")}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "CategoryCodeYearSeq",
                    Name = "CategoryCode-Year-Serial",
                    Pattern = $"[CAT]{delimiter}yy{delimiter}####",
                    Description = "Dynamic 2-letter department/category code (e.g. SW for Software) with short year and serial.",
                    PreviewExample = SanitizeMemberId($"SW{delimiter}{now:yy}{delimiter}{seq.ToString($"D{padding}")}", delimiter),
                    IsSequential = true
                },
                new MemberIdFormatPreview
                {
                    Key = "PrefixAlphanumericToken",
                    Name = "Prefix-Alphanumeric Token",
                    Pattern = $"[PREFIX]{delimiter}XXXXXX",
                    Description = "High-entropy 6-character cryptographic uppercase code (e.g. tamper-proof cards).",
                    PreviewExample = SanitizeMemberId($"{prefix}{delimiter}8F4K29", delimiter),
                    IsSequential = false
                },
                new MemberIdFormatPreview
                {
                    Key = "InstitutionalSlash",
                    Name = "Institutional Slash Hierarchy",
                    Pattern = "[PREFIX]/yyyy/####",
                    Description = "Academic / Association institutional format using slash hierarchy separators.",
                    PreviewExample = SanitizeMemberId($"{prefix}/{now:yyyy}/{seq.ToString($"D{padding}")}", "/"),
                    IsSequential = true
                }
            };
        }

        /// <summary>
        /// Sanitizes a generated member ID string by eliminating consecutive duplicate delimiters,
        /// trimming extraneous delimiters from both ends, and preserving valid formatting.
        /// </summary>
        /// <param name="candidate">The raw candidate member ID string.</param>
        /// <param name="delimiter">The configured delimiter character/string.</param>
        /// <returns>A sanitized member ID string without duplicate separators.</returns>
        private static string SanitizeMemberId(string candidate, string delimiter)
        {
            if (string.IsNullOrWhiteSpace(candidate)) return candidate;

            var sanitized = candidate.Trim();

            // Collapse multiple consecutive instances of the active delimiter
            if (!string.IsNullOrEmpty(delimiter))
            {
                var doubleDelim = delimiter + delimiter;
                while (sanitized.Contains(doubleDelim))
                {
                    sanitized = sanitized.Replace(doubleDelim, delimiter);
                }
            }

            // Collapse common duplicate delimiters that might occur from prefix combinations
            while (sanitized.Contains("--")) sanitized = sanitized.Replace("--", "-");
            while (sanitized.Contains("//")) sanitized = sanitized.Replace("//", "/");
            while (sanitized.Contains("__")) sanitized = sanitized.Replace("__", "_");
            while (sanitized.Contains("::")) sanitized = sanitized.Replace("::", ":");

            return sanitized.Trim('-', '/', '_', ':', '.', ' ');
        }

        /// <summary>
        /// Derives a clean two-letter uppercase code from an organizational category name.
        /// </summary>
        private static string GetCategoryCode(string? categoryName)
        {
            if (string.IsNullOrWhiteSpace(categoryName)) return "GN";
            var parts = categoryName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
            {
                return (parts[0][0].ToString() + parts[1][0].ToString()).ToUpperInvariant();
            }
            var clean = new string(categoryName.Where(char.IsLetterOrDigit).ToArray());
            return clean.Length >= 2 ? clean.Substring(0, 2).ToUpperInvariant() : "GN";
        }

        /// <summary>
        /// Generates a cryptographic uppercase alphanumeric token of the specified length.
        /// </summary>
        private static string GenerateAlphanumericToken(int length)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars 0/O, 1/I
            var result = new StringBuilder(length);
            for (int i = 0; i < length; i++)
            {
                result.Append(chars[RandomNumberGenerator.GetInt32(chars.Length)]);
            }
            return result.ToString();
        }
    }
}
