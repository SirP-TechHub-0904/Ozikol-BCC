using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Application.Services.Sections
{
    /// <summary>
    /// Resilient AI service that extracts author custom CSS, isolates custom JS, replaces hardcoded content
    /// with canonical Ozikol domain tokens, and extracts exact real data into mock JSON.
    /// Operates with Gemini 2.5 Flash as primary and seamlessly fails over to DeepSeek upon rate limits or errors.
    /// </summary>
    public class SectionCustomCodeExtractorService : ISectionCustomCodeExtractorService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SectionCustomCodeExtractorService> _logger;

        public SectionCustomCodeExtractorService(
            IHttpClientFactory httpClientFactory,
            ISectionLibraryResolverService libraryResolver,
            IConfiguration configuration,
            ILogger<SectionCustomCodeExtractorService> logger)
        {
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<SectionCustomCodeExtractionResponseDto> ExtractAndIsolateAsync(
            SectionCustomCodeExtractionRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            // 1. Auto-detect external library dependencies from markup
            var detectedLibs = _libraryResolver.DetectLibraries(request.HtmlMarkup, request.RawCustomJs);

            var systemPrompt = BuildSystemPrompt(request.ContainerClass);
            var userPrompt = BuildUserPrompt(request, detectedLibs);

            // -------------------------------------------------------------
            // STEP 1: Attempt Primary Provider (Gemini 2.5 Flash)
            // -------------------------------------------------------------
            var geminiApiKey = ResolveApiKey("GEMINI_API_KEY", "GeminiApiKey", "AiSettings:GeminiApiKey");
            if (!string.IsNullOrWhiteSpace(geminiApiKey))
            {
                try
                {
                    _logger.LogInformation("Attempting Section Extraction with Primary AI (Gemini 2.5 Flash) for section {Key}...", request.SectionKey);
                    var geminiResult = await ExecuteGeminiAsync(geminiApiKey, systemPrompt, userPrompt, cancellationToken);
                    if (geminiResult != null && geminiResult.Success)
                    {
                        geminiResult.ProviderUsed = "Gemini 2.5 Flash";
                        geminiResult.DetectedLibraries = detectedLibs;
                        return geminiResult;
                    }
                }
                catch (Exception geminiEx)
                {
                    _logger.LogWarning(geminiEx, "Primary AI Provider (Gemini) failed. Initiating automatic failover to DeepSeek for {Key}...", request.SectionKey);
                }
            }
            else
            {
                _logger.LogInformation("No Gemini API key resolved. Directly falling over to DeepSeek...");
            }

            // -------------------------------------------------------------
            // STEP 2: Automatic FAILOVER to Secondary Provider (DeepSeek)
            // -------------------------------------------------------------
            var deepSeekApiKey = ResolveApiKey("DEEPSEEK_API_KEY", "DeepSeekApiKey", "AiSettings:DeepSeekApiKey");
            if (!string.IsNullOrWhiteSpace(deepSeekApiKey))
            {
                try
                {
                    _logger.LogInformation("Attempting Section Extraction with Failover AI (DeepSeek) for section {Key}...", request.SectionKey);
                    var deepSeekResult = await ExecuteDeepSeekAsync(deepSeekApiKey, systemPrompt, userPrompt, cancellationToken);
                    if (deepSeekResult != null && deepSeekResult.Success)
                    {
                        deepSeekResult.ProviderUsed = "DeepSeek";
                        deepSeekResult.DetectedLibraries = detectedLibs;
                        return deepSeekResult;
                    }
                }
                catch (Exception deepSeekEx)
                {
                    _logger.LogError(deepSeekEx, "DeepSeek failover provider also failed for {Key}.", request.SectionKey);
                }
            }

            // -------------------------------------------------------------
            // STEP 3: Deterministic AST & Regex Fallback (Guaranteed Resilience)
            // -------------------------------------------------------------
            _logger.LogWarning("All external AI providers offline. Executing deterministic local fallback parser for {Key}...", request.SectionKey);
            return ExecuteDeterministicFallback(request, detectedLibs);
        }

        #region Provider Executions

        private async Task<SectionCustomCodeExtractionResponseDto> ExecuteGeminiAsync(
            string apiKey, 
            string systemPrompt, 
            string userPrompt, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            var payload = new
            {
                system_instruction = new { parts = new[] { new { text = systemPrompt } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { temperature = 0.1, responseMimeType = "application/json" }
            };

            var response = await client.PostAsJsonAsync(url, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"Gemini API error ({(int)response.StatusCode}): {err}");
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
            var text = doc?.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            return ParseAiJsonResponse(text);
        }

        private async Task<SectionCustomCodeExtractionResponseDto> ExecuteDeepSeekAsync(
            string apiKey, 
            string systemPrompt, 
            string userPrompt, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            var url = "https://api.deepseek.com/chat/completions";

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                model = "deepseek-chat",
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                response_format = new { type = "json_object" },
                temperature = 0.1
            };

            var response = await client.PostAsJsonAsync(url, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"DeepSeek API error ({(int)response.StatusCode}): {err}");
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
            var content = doc?.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            return ParseAiJsonResponse(content);
        }

        #endregion

        #region Prompt Construction & Parsing

        private static string BuildSystemPrompt(string containerClass) =>
$@"You are an Expert CMS Section Extraction Engine.
Your task is to analyze a sliced section's HTML markup and author stylesheets to produce a 100% authentic, 1-to-1 modular section.

STRICT MANDATES:
1. NO ARTIFICIAL CLASSES OR WRAPPERS:
   - Do NOT add, invent, or wrap the HTML in any artificial container class (e.g. do NOT invent '.sec-variant-...').
   - Keep the original root HTML tag and all existing class attributes EXACTLY as provided in the original markup.

2. PURE 1-TO-1 TOKEN REPLACEMENT:
   Preserve the exact HTML tag hierarchy. ONLY replace the actual text, image sources, destination URLs, and icon classes with these canonical Ozikol tokens:
   - Headings & Titles: {{{{ Title }}}}
   - Badges, Kickers, Sub-headings: {{{{ MiniTitle }}}}
   - Highlight Quotes: {{{{ Qoute }}}}
   - Descriptions & Body Paragraphs: {{{{ Description }}}}
   - Extended Rich Text: {{{{ FullDescription }}}}
   - Images & Thumbnails: src=""{{{{ ImageUrl }}}}""
   - Primary CTA Button: {{{{ ButtonText }}}} and href=""{{{{ ButtonLink }}}}""
   - Secondary CTA Button (if dual buttons present): {{{{ SecondButtonText }}}} and href=""{{{{ SecondButtonLink }}}}""
   - Anchors & Direct Routing: href=""{{{{ DirectUrl }}}}""
   - Root & Item Icon Classes: <i class=""{{{{ IconText }}}}""></i> (Replace icon classes like 'tji-phone', 'fa-solid fa-rocket', 'bi bi-check' with {{{{ IconText }}}})
   - Phone Numbers: {{{{ Organization.Phone }}}}

3. REPEATING LIST ITEMS:
   For repeating cards/slides/nav-items, wrap ONE repeating instance inside {{{{#SectionLists}}}} ... {{{{/SectionLists}}}}.
   Inside the loop use: {{{{ Title }}}}, {{{{ MiniTitle }}}}, {{{{ Description }}}}, {{{{ ButtonText }}}}, {{{{ ButtonLink }}}}, {{{{ ImageUrl }}}}, {{{{ IconText }}}}, {{{{ CustomClass }}}}.

4. REAL CONTENT EXTRACTION (NO INVENTED / HALLUCINATED TEXT):
   Extract the EXACT real values from the original HTML into sample_content_json (exact text, real URLs, real image paths, and real icon class strings like 'tji-arrow-right-long').

5. CLEAN AUTHOR CSS EXTRACTION:
   Extract only the author's custom CSS rules matching classes present in this section. Do not alter or wrap selectors with artificial class names.

OUTPUT SCHEMA: Return ONLY a raw JSON object matching:
{{
  ""html_template"": ""<header class='...'>...</header>"",
  ""scoped_css"": "".header-area {{ ... }} .mainmenu {{ ... }}"",
  ""js_script"": ""/* isolated interactive scripts */"",
  ""sample_content_json"": ""{{\""Title\"": \""Real Title\"", \""ButtonText\"": \""Let’s Talk\"", \""IconText\"": \""tji-phone\""}}"",
  ""placeholders"": [""Title"", ""ButtonText"", ""ButtonLink"", ""IconText"", ""ImageUrl"", ""SectionLists""]
}}";

        private static string BuildUserPrompt(SectionCustomCodeExtractionRequestDto req, List<string> detectedLibs)
        {
            var filteredCss = FilterCandidateCssForHtml(req.RawCustomCss ?? string.Empty, req.HtmlMarkup);
            var filteredJs = FilterCandidateJsForHtml(req.RawCustomJs ?? string.Empty, req.HtmlMarkup);

            return $@"SECTION INPUTS:
- Section Key: {req.SectionKey}
- Scoping Class: .{req.ContainerClass}
- Category: {req.CategoryKey}
- Detected Vendor Libraries: {string.Join(", ", detectedLibs)}

ORIGINAL SLICED HTML:
{req.HtmlMarkup}

RELEVANT AUTHOR CUSTOM CSS CANDIDATES:
{filteredCss}

RELEVANT AUTHOR CUSTOM JS:
{filteredJs}

Perform complete tokenization, content extraction, and CSS/JS isolation.";
        }

        private static string FilterCandidateCssForHtml(string rawCss, string htmlMarkup)
        {
            if (string.IsNullOrWhiteSpace(rawCss) || rawCss.Length < 30000) return rawCss;

            var classMatches = Regex.Matches(htmlMarkup, @"class=[""']([^""']+)[""']");
            var classNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match m in classMatches)
            {
                var tokens = m.Groups[1].Value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var t in tokens) classNames.Add(t);
            }

            var sb = new StringBuilder();
            var rootMatch = Regex.Match(rawCss, @":root\s*\{[^}]+\}");
            if (rootMatch.Success) sb.AppendLine(rootMatch.Value);

            var ruleRegex = new Regex(@"([^{]+)\{([^}]+)\}", RegexOptions.Compiled);
            var matches = ruleRegex.Matches(rawCss);

            int matchedCount = 0;
            foreach (Match rm in matches)
            {
                var selector = rm.Groups[1].Value;
                bool matched = false;
                foreach (var cls in classNames)
                {
                    if (selector.Contains("." + cls, StringComparison.OrdinalIgnoreCase))
                    {
                        matched = true;
                        break;
                    }
                }

                if (matched)
                {
                    sb.AppendLine(rm.Value);
                    matchedCount++;
                    if (matchedCount >= 300) break;
                }
            }

            return sb.Length > 0 ? sb.ToString() : rawCss.Substring(0, Math.Min(rawCss.Length, 30000));
        }

        private static string FilterCandidateJsForHtml(string rawJs, string htmlMarkup)
        {
            if (string.IsNullOrWhiteSpace(rawJs) || rawJs.Length < 10000) return rawJs;

            var classMatches = Regex.Matches(htmlMarkup, @"class=[""']([^""']+)[""']");
            var classNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match m in classMatches)
            {
                var tokens = m.Groups[1].Value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var t in tokens) classNames.Add(t);
            }

            var lines = rawJs.Split('\n');
            var relevantLines = new List<string>();
            foreach (var line in lines)
            {
                if (classNames.Any(c => line.Contains(c, StringComparison.OrdinalIgnoreCase)) ||
                    line.Contains("header", StringComparison.OrdinalIgnoreCase) ||
                    line.Contains("menu", StringComparison.OrdinalIgnoreCase) ||
                    line.Contains("mobile", StringComparison.OrdinalIgnoreCase) ||
                    line.Contains("search", StringComparison.OrdinalIgnoreCase) ||
                    line.Contains("sticky", StringComparison.OrdinalIgnoreCase))
                {
                    relevantLines.Add(line);
                }
            }

            return relevantLines.Any() ? string.Join("\n", relevantLines.Take(200)) : rawJs.Substring(0, Math.Min(rawJs.Length, 10000));
        }

        private static SectionCustomCodeExtractionResponseDto ParseAiJsonResponse(string rawJson)
        {
            var cleaned = Regex.Replace(rawJson.Trim(), @"^```json\s*", string.Empty, RegexOptions.Multiline);
            cleaned = Regex.Replace(cleaned, @"^```\s*$", string.Empty, RegexOptions.Multiline).Trim();

            var result = JsonSerializer.Deserialize<SectionCustomCodeExtractionResponseDto>(cleaned, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new SectionCustomCodeExtractionResponseDto();

            result.Success = true;
            return result;
        }

        private static SectionCustomCodeExtractionResponseDto ExecuteDeterministicFallback(
            SectionCustomCodeExtractionRequestDto req, 
            List<string> detectedLibs)
        {
            var tokenizedHtml = req.HtmlMarkup;
            var placeholders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var mockData = new Dictionary<string, object>();

            // 1. Extract Logo Anchor & Main Image
            var logoAnchorMatch = Regex.Match(tokenizedHtml, @"<a\s+[^>]*class=[""'][^""']*logo[^""']*[""'][^>]*href=[""']([^""']+)[""'][^>]*>", RegexOptions.IgnoreCase);
            if (logoAnchorMatch.Success)
            {
                var realLogoHref = logoAnchorMatch.Groups[1].Value;
                mockData["DirectUrl"] = realLogoHref;
                placeholders.Add("DirectUrl");
                tokenizedHtml = tokenizedHtml.Replace(logoAnchorMatch.Value, logoAnchorMatch.Value.Replace($"href=\"{realLogoHref}\"", "href=\"{{DirectUrl}}\""));
            }

            var imgMatch = Regex.Match(tokenizedHtml, @"<img\s+[^>]*src=[""']([^""']+)[""'][^>]*alt=[""']?([^""'>]*)[""']?[^>]*>", RegexOptions.IgnoreCase);
            if (imgMatch.Success)
            {
                var realSrc = imgMatch.Groups[1].Value;
                var realAlt = imgMatch.Groups[2].Value;
                mockData["ImageUrl"] = realSrc;
                placeholders.Add("ImageUrl");

                if (!string.IsNullOrWhiteSpace(realAlt))
                {
                    mockData["Title"] = realAlt;
                    placeholders.Add("Title");
                }

                tokenizedHtml = tokenizedHtml.Replace(imgMatch.Value, imgMatch.Value.Replace(realSrc, "{{ImageUrl}}"));
            }

            // 2. Extract CTA Button
            var btnMatch = Regex.Match(tokenizedHtml, @"<a\s+[^>]*class=[""'][^""']*(?:btn|button)[^""']*[""'][^>]*href=[""']([^""']+)[""'][^>]*>(.*?)</a>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            if (btnMatch.Success)
            {
                var realHref = btnMatch.Groups[1].Value;
                var innerBtn = btnMatch.Groups[2].Value;

                // Extract text inside button
                var textOnlyMatch = Regex.Match(innerBtn, @"<span>([^<]+)</span>", RegexOptions.IgnoreCase);
                var realBtnText = textOnlyMatch.Success ? textOnlyMatch.Groups[1].Value.Trim() : Regex.Replace(innerBtn, @"<[^>]+>", string.Empty).Trim();

                if (!string.IsNullOrWhiteSpace(realBtnText))
                {
                    mockData["ButtonText"] = realBtnText;
                    placeholders.Add("ButtonText");
                    tokenizedHtml = tokenizedHtml.Replace(realBtnText, "{{ButtonText}}");
                }

                mockData["ButtonLink"] = realHref;
                placeholders.Add("ButtonLink");
                tokenizedHtml = tokenizedHtml.Replace($"href=\"{realHref}\"", "href=\"{{ButtonLink}}\"");
            }

            // 3. Extract Icons
            var iconMatches = Regex.Matches(tokenizedHtml, @"<i\s+class=[""']([^""']+)[""']\s*>", RegexOptions.IgnoreCase);
            if (iconMatches.Count > 0)
            {
                var firstIconClass = iconMatches[0].Groups[1].Value;
                mockData["IconText"] = firstIconClass;
                placeholders.Add("IconText");

                foreach (Match im in iconMatches)
                {
                    var cls = im.Groups[1].Value;
                    tokenizedHtml = tokenizedHtml.Replace($"class=\"{cls}\"", "class=\"{{IconText}}\"");
                }
            }

            // 4. Extract Navigation / List items
            var navMatches = Regex.Matches(tokenizedHtml, @"<li[^>]*>\s*<a\s+href=[""']([^""']+)[""'][^>]*>([^<]+)</a>\s*</li>", RegexOptions.IgnoreCase);
            if (navMatches.Count > 1)
            {
                var sectionLists = new List<Dictionary<string, string>>();
                foreach (Match nm in navMatches)
                {
                    var href = nm.Groups[1].Value;
                    var title = nm.Groups[2].Value.Trim();
                    sectionLists.Add(new Dictionary<string, string>
                    {
                        ["Title"] = title,
                        ["ButtonLink"] = href
                    });
                }

                mockData["SectionLists"] = sectionLists;
                placeholders.Add("SectionLists");

                // Replace the list with a single looped item
                var firstLi = navMatches[0].Value;
                var tokenizedLi = firstLi
                    .Replace(navMatches[0].Groups[1].Value, "{{ButtonLink}}")
                    .Replace(navMatches[0].Groups[2].Value, "{{Title}}");

                var allLisBlock = string.Join(string.Empty, navMatches.Select(m => m.Value));
                if (tokenizedHtml.Contains(allLisBlock))
                {
                    tokenizedHtml = tokenizedHtml.Replace(allLisBlock, $"\n                {{{{#SectionLists}}}}\n                {tokenizedLi}\n                {{{{/SectionLists}}}}\n              ");
                }
            }

            // 5. Extract Phone / Contact
            var phoneMatch = Regex.Match(tokenizedHtml, @"tel:([0-9\+\-\(\)\s]+)", RegexOptions.IgnoreCase);
            if (phoneMatch.Success)
            {
                var realPhone = phoneMatch.Groups[1].Value.Trim();
                mockData["Organization"] = new Dictionary<string, string> { ["Phone"] = realPhone };
                placeholders.Add("Organization.Phone");
                tokenizedHtml = tokenizedHtml.Replace($"tel:{realPhone}", "tel:{{Organization.Phone}}").Replace(realPhone, "{{Organization.Phone}}");
            }

            // Scoped CSS
            var scopedCss = FilterCandidateCssForHtml(req.RawCustomCss ?? string.Empty, req.HtmlMarkup);

            var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
            var extractedJson = JsonSerializer.Serialize(mockData, jsonOptions);

            return new SectionCustomCodeExtractionResponseDto
            {
                Success = true,
                ProviderUsed = "Deterministic AST (Exact 1-to-1 Match)",
                HtmlTemplate = tokenizedHtml,
                ScopedCss = scopedCss,
                JsScript = req.RawCustomJs ?? string.Empty,
                ExtractedContentJson = extractedJson,
                Placeholders = placeholders.ToList(),
                DetectedLibraries = detectedLibs,
                Message = "1-to-1 HTML tokenization and exact content extraction completed."
            };
        }

        private string? ResolveApiKey(params string[] configKeys)
        {
            foreach (var key in configKeys)
            {
                var val = _configuration[key] ?? Environment.GetEnvironmentVariable(key);
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
            return null;
        }

        #endregion
    }
}
