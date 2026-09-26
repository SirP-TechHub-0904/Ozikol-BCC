using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol_BCC.Application.Services.Cloudinary;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Production implementation of <see cref="ISectionAiStudioService"/>.
    /// Orchestrates multimodal vision AI for UI image-to-section decomposition,
    /// in-preview AI section refinement, and automated API key failover.
    /// </summary>
    public class SectionAiStudioService : ISectionAiStudioService
    {
        private readonly IAiKeyPoolManagerService _keyPoolService;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<SectionAiStudioService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SectionAiStudioService"/> class.
        /// </summary>
        public SectionAiStudioService(
            IAiKeyPoolManagerService keyPoolService,
            ICloudinaryService cloudinaryService,
            IHttpClientFactory httpClientFactory,
            ILogger<SectionAiStudioService> logger)
        {
            _keyPoolService = keyPoolService ?? throw new ArgumentNullException(nameof(keyPoolService));
            _cloudinaryService = cloudinaryService ?? throw new ArgumentNullException(nameof(cloudinaryService));
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<SectionAiTweakResponseDto> TweakSectionAsync(
            SectionAiTweakRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var provider = string.IsNullOrWhiteSpace(request.Provider) ? "Gemini" : request.Provider.Trim();
            const int maxRetries = 3;

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var apiKeyObj = await _keyPoolService.GetNextAvailableKeyAsync(provider, cancellationToken);
                if (apiKeyObj == null)
                {
                    _logger.LogWarning("No active AI key available for provider {Provider} on attempt {Attempt}", provider, attempt);
                    return new SectionAiTweakResponseDto
                    {
                        Success = false,
                        ErrorMessage = $"All {provider} API keys are currently cooling down or have exhausted their daily quota. Please add keys in AI Key Hub."
                    };
                }

                var sw = Stopwatch.StartNew();
                try
                {
                    var result = await ExecuteTweakWithKeyAsync(apiKeyObj, request, cancellationToken);
                    sw.Stop();

                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiTweak",
                        (int)sw.ElapsedMilliseconds,
                        200,
                        cancellationToken: cancellationToken);

                    return result;
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    sw.Stop();
                    _logger.LogWarning("AI Key {Alias} hit HTTP 429 Rate Limit. Setting cooldown and failing over...", apiKeyObj.KeyAlias);
                    await _keyPoolService.MarkRateLimitedAsync(apiKeyObj.Id, 60, cancellationToken);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiTweak",
                        (int)sw.ElapsedMilliseconds,
                        429,
                        errorMessage: "HTTP 429 Too Many Requests",
                        cancellationToken: cancellationToken);
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    _logger.LogError(ex, "AI section tweak failed for Key {Alias}", apiKeyObj.KeyAlias);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiTweak",
                        (int)sw.ElapsedMilliseconds,
                        500,
                        errorMessage: ex.Message,
                        cancellationToken: cancellationToken);

                    if (attempt == maxRetries)
                    {
                        return new SectionAiTweakResponseDto
                        {
                            Success = false,
                            ErrorMessage = $"AI Tweak execution failed: {ex.Message}"
                        };
                    }
                }
            }

            return new SectionAiTweakResponseDto
            {
                Success = false,
                ErrorMessage = "Failed to tweak section after multiple key failovers."
            };
        }

        /// <inheritdoc />
        public async Task<SectionAiPrecisionFilterResponseDto> FilterAndIsolateSectionWithAiAsync(
            SectionAiPrecisionFilterRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var provider = string.IsNullOrWhiteSpace(request.Provider) ? "Gemini" : request.Provider.Trim();
            const int maxRetries = 3;

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var apiKeyObj = await _keyPoolService.GetNextAvailableKeyAsync(provider, cancellationToken);
                if (apiKeyObj == null)
                {
                    _logger.LogWarning("No active AI key available for provider {Provider} on attempt {Attempt}", provider, attempt);
                    return new SectionAiPrecisionFilterResponseDto
                    {
                        Success = false,
                        ErrorMessage = $"All {provider} API keys are currently cooling down or have exhausted their daily quota. Please add keys in AI Key Hub."
                    };
                }

                var sw = Stopwatch.StartNew();
                try
                {
                    var result = await ExecuteFilterWithKeyAsync(apiKeyObj, request, cancellationToken);
                    sw.Stop();

                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiPrecisionFilter",
                        (int)sw.ElapsedMilliseconds,
                        200,
                        cancellationToken: cancellationToken);

                    return result;
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    sw.Stop();
                    _logger.LogWarning("AI Key {Alias} hit HTTP 429 Rate Limit during precision filter. Failing over...", apiKeyObj.KeyAlias);
                    await _keyPoolService.MarkRateLimitedAsync(apiKeyObj.Id, 60, cancellationToken);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiPrecisionFilter",
                        (int)sw.ElapsedMilliseconds,
                        429,
                        errorMessage: "HTTP 429 Too Many Requests",
                        cancellationToken: cancellationToken);
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    _logger.LogError(ex, "AI section precision filter failed for Key {Alias}", apiKeyObj.KeyAlias);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiPrecisionFilter",
                        (int)sw.ElapsedMilliseconds,
                        500,
                        errorMessage: ex.Message,
                        cancellationToken: cancellationToken);

                    if (attempt == maxRetries)
                    {
                        return new SectionAiPrecisionFilterResponseDto
                        {
                            Success = false,
                            ErrorMessage = $"AI Precision Filter execution failed: {ex.Message}"
                        };
                    }
                }
            }

            return new SectionAiPrecisionFilterResponseDto
            {
                Success = false,
                ErrorMessage = "Failed to precision filter section after multiple key failovers."
            };
        }

        private async Task<SectionAiPrecisionFilterResponseDto> ExecuteFilterWithKeyAsync(
            MasterAiApiKey key, 
            SectionAiPrecisionFilterRequestDto request, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            var containerClass = string.IsNullOrWhiteSpace(request.ContainerClass) ? "sec-extracted" : request.ContainerClass.TrimStart('.');
            var origLines = string.IsNullOrWhiteSpace(request.RawCss) ? 0 : request.RawCss.Split('\n').Length;

            var systemPrompt = $@"You are a Precision CSS & JavaScript Tree-Shaking, Scoping, and Isolation Compiler for the Ozikol Modular Website Marketplace.
Your sole job is to filter the provided RAW CSS and RAW JAVASCRIPT to retain ONLY the rules and scripts that directly apply to the elements and classes in the provided HTML TEMPLATE.

CRITICAL NON-NEGOTIABLE COMPLIANCE RULES:
1. DO NOT INVENT ANY CODE: Do not write new CSS classes, do not change hex colors, do not add synthetic styling properties, and do not invent new javascript functions. You are strictly a tree-shaking filter and scoper.
2. STRICT TREE-SHAKING: Discard 100% of the CSS rules that belong to unrelated components (e.g., hero sliders, blog cards, pricing tables, testimonials, footers, charts) that are NOT present in this HTML markup.
3. STRICT CSS SCOPING: Every preserved CSS rule MUST be prefixed with the container selector `.{containerClass}` (e.g. `.{containerClass} .nav-link` or `.{containerClass}.at-header-area`). Never output unscoped global rules.
4. JAVASCRIPT EXTRACTION: Extract only the exact event listeners or initialization logic from the provided Raw JS that targets selectors found in this section (e.g., mobile hamburger toggle, dropdown toggle, search bar). If no JS is needed, return empty string for js_script.
5. PRESERVE ORIGINAL VALUES: Keep the exact original transitions, hover states, z-indexes, breakpoints, and colors from the source stylesheet.
6. OUTPUT FORMAT: Return ONLY a valid, raw JSON object (without markdown code fences or backticks) matching this exact JSON schema:
{{
  ""scoped_css"": "".{containerClass} ... {{ ... }}"",
  ""js_script"": ""/* filtered interactive script */"",
  ""explanation"": ""Filtered from {origLines} lines down to exact matching rules, discarding unrelated component styles.""
}}";

            var userContent = $@"SECTION TO FILTER:
- Title: {request.Title}
- Category: {request.CategoryKey}
- Container Scoping Class: .{containerClass}

HTML TEMPLATE:
{request.HtmlTemplate}

RAW CSS TO FILTER & TREE-SHAKE:
{request.RawCss}

RAW JAVASCRIPT CANDIDATES:
{request.RawJs ?? "// No external scripts provided"}

Return the filtered JSON object.";

            var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key.ApiKey}";
            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userContent } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    responseMimeType = "application/json"
                }
            };

            var response = await client.PostAsJsonAsync(geminiUrl, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"Gemini API error ({response.StatusCode}): {err}", null, response.StatusCode);
            }

            var jsonText = await response.Content.ReadAsStringAsync(cancellationToken);
            var parsedGemini = JsonDocument.Parse(jsonText);
            var candidates = parsedGemini.RootElement.GetProperty("candidates");
            if (candidates.GetArrayLength() == 0)
            {
                throw new InvalidOperationException("Gemini returned no candidates.");
            }

            var textContent = candidates[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            var cleanJson = CleanJsonFences(textContent);
            var filterResult = JsonSerializer.Deserialize<SectionAiPrecisionFilterResponseDto>(cleanJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (filterResult != null)
            {
                filterResult.Success = true;
                filterResult.OriginalLinesCss = origLines;
                var filteredLines = string.IsNullOrWhiteSpace(filterResult.ScopedCss) ? 0 : filterResult.ScopedCss.Split('\n').Length;
                filterResult.FilteredLinesCss = filteredLines;
                var reduction = origLines > 0 ? (100 - (filteredLines * 100 / origLines)) : 0;
                filterResult.ReductionPercentage = $"{Math.Max(0, reduction)}%";
                return filterResult;
            }

            throw new InvalidOperationException("Failed to parse AI precision filter JSON response.");
        }

        /// <inheritdoc />
        public async Task<SectionAiFullCleanResponseDto> CleanAndIsolateFullSectionWithAiAsync(
            SectionAiFullCleanRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var provider = string.IsNullOrWhiteSpace(request.Provider) ? "Gemini" : request.Provider.Trim();
            const int maxRetries = 3;

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var apiKeyObj = await _keyPoolService.GetNextAvailableKeyAsync(provider, cancellationToken);
                if (apiKeyObj == null)
                {
                    _logger.LogWarning("No active AI key available for provider {Provider} on attempt {Attempt}", provider, attempt);
                    return new SectionAiFullCleanResponseDto
                    {
                        Success = false,
                        ErrorMessage = $"All {provider} API keys are currently cooling down or have exhausted their daily quota. Please add keys in AI Key Hub."
                    };
                }

                var sw = Stopwatch.StartNew();
                try
                {
                    var result = await ExecuteFullCleanWithKeyAsync(apiKeyObj, request, cancellationToken);
                    sw.Stop();

                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiFullClean",
                        (int)sw.ElapsedMilliseconds,
                        200,
                        cancellationToken: cancellationToken);

                    return result;
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests || (int?)httpEx.StatusCode == 402)
                {
                    sw.Stop();
                    _logger.LogWarning("AI Key {Alias} hit quota/rate limit ({Status}). Setting cooldown and failing over...", apiKeyObj.KeyAlias, httpEx.StatusCode);
                    await _keyPoolService.MarkRateLimitedAsync(apiKeyObj.Id, 120, cancellationToken);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiFullClean",
                        (int)sw.ElapsedMilliseconds,
                        (int)(httpEx.StatusCode ?? System.Net.HttpStatusCode.TooManyRequests),
                        errorMessage: $"API Quota/Rate Limit: {httpEx.Message}",
                        cancellationToken: cancellationToken);
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    _logger.LogError(ex, "AI section full clean failed for Key {Alias}", apiKeyObj.KeyAlias);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "SectionAiFullClean",
                        (int)sw.ElapsedMilliseconds,
                        500,
                        errorMessage: ex.Message,
                        cancellationToken: cancellationToken);

                    if (attempt == maxRetries)
                    {
                        return new SectionAiFullCleanResponseDto
                        {
                            Success = false,
                            ErrorMessage = $"AI Full Clean execution failed: {ex.Message}"
                        };
                    }
                }
            }

            return new SectionAiFullCleanResponseDto
            {
                Success = false,
                ErrorMessage = "Failed to full clean section after multiple key failovers."
            };
        }

        private static string PreFilterCandidateCss(string rawCss, HashSet<string> classesInHtml)
        {
            if (string.IsNullOrWhiteSpace(rawCss) || rawCss.Length < 6000)
            {
                return rawCss;
            }

            var blocks = Regex.Matches(rawCss, @"([^{}]+)\{([^{}]+)\}", RegexOptions.Singleline);
            var preserved = new List<string>();

            foreach (Match b in blocks)
            {
                var selector = b.Groups[1].Value.Trim();
                var body = b.Groups[2].Value.Trim();

                if (selector.StartsWith(":root", StringComparison.OrdinalIgnoreCase) ||
                    selector.StartsWith("@font-face", StringComparison.OrdinalIgnoreCase) ||
                    selector.StartsWith("@keyframes", StringComparison.OrdinalIgnoreCase))
                {
                    preserved.Add($"{selector} {{ {body} }}");
                    continue;
                }

                bool matches = false;
                foreach (var cls in classesInHtml)
                {
                    if (selector.IndexOf(cls, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        matches = true;
                        break;
                    }
                }

                if (matches)
                {
                    preserved.Add($"{selector} {{ {body} }}");
                }
            }

            return preserved.Any() ? string.Join("\n", preserved) : rawCss;
        }

        private async Task<SectionAiFullCleanResponseDto> ExecuteFullCleanWithKeyAsync(
            MasterAiApiKey key, 
            SectionAiFullCleanRequestDto request, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(120);

            var containerClass = string.IsNullOrWhiteSpace(request.ContainerClass) ? "sec-extracted" : request.ContainerClass.TrimStart('.');
            var origLines = string.IsNullOrWhiteSpace(request.RawCss) ? 0 : request.RawCss.Split('\n').Length;

            // Extract all exact class names present in this section's HTML DOM
            var classMatches = Regex.Matches(request.HtmlTemplate, @"class=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
            var classesInHtml = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match m in classMatches)
            {
                var classAttr = m.Groups[1].Value;
                foreach (var c in classAttr.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                {
                    classesInHtml.Add(c.Trim());
                }
            }
            var classListString = string.Join(", ", classesInHtml.OrderBy(x => x).Select(c => $".{c}"));
            var candidateCss = PreFilterCandidateCss(request.RawCss, classesInHtml);

            var systemPrompt = $@"You are the Master Section Compiler & Tree-Shaking Engine for the Ozikol Modular Website Marketplace.
Your job is to perform a strict 4-pillar cleanup for this section without inventing any new code:

PILLAR 1: HTML CLEANUP & MUSTACHE TOKENS
- Clean and normalize the HTML markup. Keep all original class names, IDs, SVGs, and DOM structure intact.
- Parameterize all hardcoded titles, headings, descriptions, buttons, and image URLs with standard Mustache tokens:
  Single values: {{{{Title}}}}, {{{{MiniTitle}}}}, {{{{Description}}}}, {{{{ActionText}}}}, {{{{ActionUrl}}}}, {{{{ImageUrl}}}}, {{{{ImageAlt}}}}
  Repeater lists: {{{{#each SectionLists}}}}...{{{{/each}}}} with {{{{Title}}}}, {{{{Description}}}}, {{{{IconText}}}}, {{{{ActionUrl}}}}, {{{{ImageUrl}}}}
  Organization info: {{{{Organization.Name}}}}, {{{{Organization.Phone}}}}, {{{{Organization.Email}}}}

PILLAR 2: CSS PRECISION TREE-SHAKING & SCOPING (STRICT: ZERO INVENTED CODE)
- The section's HTML contains ONLY these exact CSS classes:
  [{classListString}]
- Scan the RAW CSS stylesheet. Retain ONLY rules whose selectors match one or more of the above classes or standard container tags.
- Discard 100% of unrelated CSS rules (blog cards, pricing grids, testimonials, footers, charts).
- Prefix every retained CSS rule with `.{containerClass}` (e.g. `.{containerClass} .nav-link` or `.{containerClass}.at-header-area`).
- DO NOT INVENT new CSS classes, do NOT change hex colors, and do NOT alter property values.

PILLAR 3: JAVASCRIPT EXTRACTION (EXACT COMPONENT LOGIC)
- Extract only the exact interactive event listeners, mobile hamburger toggles, dropdown open/close logic, or slider init functions from the provided Raw JS that target selectors in this section.
- If no JavaScript is needed for this section, return empty string for js_script.

PILLAR 4: MOCK CONTENT JSON SYNTHESIS
- Synthesize a realistic demo JSON object matching every single token in your HTML template (including Title, Description, SectionLists array, and Organization object).

OUTPUT FORMAT: Return ONLY a valid, raw JSON object (without markdown code fences or backticks) matching this schema:
{{
  ""html_template"": ""<section class='...'>...</section>"",
  ""scoped_css"": "".{containerClass} ... {{ ... }}"",
  ""js_script"": ""/* filtered interactive script */"",
  ""sample_content_json"": ""{{\""Title\"": \""Demo Title\"", ...}}"",
  ""placeholders"": [""Title"", ""Description"", ""ActionUrl"", ""SectionLists""],
  ""explanation"": ""Tree-shook {origLines} CSS lines to exact matching rules, parameterized template tokens, and extracted component JS.""
}}";

            var userContent = $@"SECTION TO PROCESS:
- Title: {request.Title}
- Category: {request.CategoryKey}
- Container Scoping Class: .{containerClass}
- Classes Present in HTML: {classListString}

HTML MARKUP:
{request.HtmlTemplate}

RAW CSS CANDIDATE RULES TO FILTER:
{candidateCss}

RAW JAVASCRIPT CANDIDATES:
{request.RawJs ?? "// No external scripts provided"}

Return the complete cleaned JSON object.";

            string jsonText = string.Empty;

            // Check if Qwen local endpoint is requested
            if (string.Equals(key.Provider, "Qwen", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var qwenUrl = (!string.IsNullOrWhiteSpace(key.ApiKey) && key.ApiKey.StartsWith("http", StringComparison.OrdinalIgnoreCase)) 
                        ? key.ApiKey 
                        : "http://localhost:11434/api/generate";
                    var qwenPayload = new
                    {
                        model = "qwen2.5-coder:latest",
                        system = systemPrompt,
                        prompt = userContent,
                        stream = false,
                        format = "json",
                        options = new { temperature = 0.1 }
                    };

                    var qwenResp = await client.PostAsJsonAsync(qwenUrl, qwenPayload, cancellationToken);
                    if (qwenResp.IsSuccessStatusCode)
                    {
                        var qwenDoc = await qwenResp.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
                        if (qwenDoc != null && qwenDoc.RootElement.TryGetProperty("response", out var respProp))
                        {
                            jsonText = respProp.GetString() ?? "{}";
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Local Qwen endpoint unavailable, falling over to Gemini Flash...");
                }
            }

            // If Qwen was not used or failed, call Gemini
            if (string.IsNullOrWhiteSpace(jsonText))
            {
                try
                {
                    var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key.ApiKey}";
                    var payload = new
                    {
                        system_instruction = new
                        {
                            parts = new[] { new { text = systemPrompt } }
                        },
                        contents = new[]
                        {
                            new
                            {
                                role = "user",
                                parts = new[] { new { text = userContent } }
                            }
                        },
                        generationConfig = new
                        {
                            temperature = 0.1,
                            responseMimeType = "application/json"
                        }
                    };

                    var response = await client.PostAsJsonAsync(geminiUrl, payload, cancellationToken);
                    if (response.IsSuccessStatusCode)
                    {
                        var geminiResponseText = await response.Content.ReadAsStringAsync(cancellationToken);
                        var parsedGemini = JsonDocument.Parse(geminiResponseText);
                        var candidates = parsedGemini.RootElement.GetProperty("candidates");
                        if (candidates.GetArrayLength() > 0)
                        {
                            jsonText = candidates[0]
                                .GetProperty("content")
                                .GetProperty("parts")[0]
                                .GetProperty("text")
                                .GetString() ?? "{}";
                        }
                    }
                    else
                    {
                        var err = await response.Content.ReadAsStringAsync(cancellationToken);
                        _logger.LogWarning("Gemini API error ({StatusCode}): {Err}", response.StatusCode, err);
                    }
                }
                catch (Exception netEx)
                {
                    _logger.LogWarning(netEx, "Gemini online endpoint unreachable. Trying local Ollama fallback...");
                }

                // If Gemini failed due to DNS/network or rate limit, attempt local Ollama fallback
                if (string.IsNullOrWhiteSpace(jsonText))
                {
                    try
                    {
                        var ollamaUrl = "http://localhost:11434/api/generate";
                        var ollamaPayload = new
                        {
                            model = "phi3:latest",
                            system = systemPrompt,
                            prompt = userContent,
                            stream = false,
                            format = "json",
                            options = new { temperature = 0.1 }
                        };

                        var ollamaResp = await client.PostAsJsonAsync(ollamaUrl, ollamaPayload, cancellationToken);
                        if (ollamaResp.IsSuccessStatusCode)
                        {
                            var oDoc = await ollamaResp.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
                            if (oDoc != null && oDoc.RootElement.TryGetProperty("response", out var oProp))
                            {
                                jsonText = oProp.GetString() ?? "{}";
                            }
                        }
                    }
                    catch (Exception oEx)
                    {
                        _logger.LogWarning(oEx, "Local Ollama fallback also unavailable.");
                    }
                }
            }

            var cleanJson = CleanJsonFences(jsonText);
            var cleanResult = JsonSerializer.Deserialize<SectionAiFullCleanResponseDto>(cleanJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (cleanResult != null)
            {
                cleanResult.Success = true;
                cleanResult.OriginalLinesCss = origLines;
                var filteredLines = string.IsNullOrWhiteSpace(cleanResult.ScopedCss) ? 0 : cleanResult.ScopedCss.Split('\n').Length;
                cleanResult.FilteredLinesCss = filteredLines;
                var reduction = origLines > 0 ? (100 - (filteredLines * 100 / origLines)) : 0;
                cleanResult.ReductionPercentage = $"{Math.Max(0, reduction)}%";
                return cleanResult;
            }

            throw new InvalidOperationException("Failed to parse AI full clean JSON response.");
        }

        private async Task<SectionAiTweakResponseDto> ExecuteTweakWithKeyAsync(
            MasterAiApiKey key, 
            SectionAiTweakRequestDto request, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(45);

            var systemPrompt = @"You are an expert senior UI/UX frontend engineer for the Ozikol Modular Website Marketplace.
Your task is to modify the provided section's HTML Template and Scoped CSS according to the user's specific prompt.

CORE ARCHITECTURAL RULES:
1. Strict Section Independence: All CSS selectors MUST be scoped under the section container id (e.g. #sec_... or #s_...). NEVER output global element rules without container prefix.
2. Dynamic Content Placeholders: Maintain and introduce clean placeholders like {{Hero_Title}}, {{Hero_Subtitle}}, {{Company_Name}}, {{Logo_Url}}, {{Button_Text}}, {{Button_Url}}, {{Image_Url}}, {{#each Features}}...{{/each}}.
3. Modern Premium Aesthetics: Ensure responsive mobile/tablet styling, clean flexbox/grid layout, smooth transitions, and high contrast.
4. Output Format: Return ONLY a valid, raw JSON object (without markdown code fences or backticks) matching this exact JSON schema:
{
  ""html_template"": ""<section id='...' class='...'>...</section>"",
  ""scoped_css"": ""#sec_... { ... }"",
  ""placeholders"": [""Hero_Title"", ""Button_Text""],
  ""explanation"": ""Brief explanation of what was changed.""
}";

            var userContent = $@"SECTION TO MODIFY:
- Title: {request.Title}
- Category: {request.CategoryKey}
- Section Key: {request.SectionKey}

CURRENT HTML TEMPLATE:
{request.HtmlTemplate}

CURRENT SCOPED CSS:
{request.ScopedCss}

USER INSTRUCTION:
{request.UserPrompt}

Return the updated JSON object.";

            var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key.ApiKey}";
            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userContent } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.2,
                    responseMimeType = "application/json"
                }
            };

            var response = await client.PostAsJsonAsync(geminiUrl, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"Gemini API error ({response.StatusCode}): {err}", null, response.StatusCode);
            }

            var jsonText = await response.Content.ReadAsStringAsync(cancellationToken);
            var parsedGemini = JsonDocument.Parse(jsonText);
            var candidates = parsedGemini.RootElement.GetProperty("candidates");
            if (candidates.GetArrayLength() == 0)
            {
                throw new InvalidOperationException("Gemini returned no candidates.");
            }

            var textContent = candidates[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            var cleanJson = CleanJsonFences(textContent);
            var tweakResult = JsonSerializer.Deserialize<SectionAiTweakResponseDto>(cleanJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (tweakResult != null)
            {
                tweakResult.Success = true;
                return tweakResult;
            }

            throw new InvalidOperationException("Failed to parse AI tweak JSON response.");
        }

        /// <inheritdoc />
        public async Task<SectionsBuilderResponseDto> DecomposeImageToSectionsAsync(
            IFormFile imageFile, 
            string? suiteName, 
            string? brandName, 
            string provider = "Gemini", 
            CancellationToken cancellationToken = default)
        {
            if (imageFile == null || imageFile.Length == 0)
            {
                throw new ArgumentException("Please upload a valid image file.", nameof(imageFile));
            }

            var finalSuiteName = string.IsNullOrWhiteSpace(suiteName) ? "Visual Mockup Suite" : suiteName.Trim();
            var finalBrandName = string.IsNullOrWhiteSpace(brandName) ? "Enterprise Workspace" : brandName.Trim();

            // 1. Upload to Cloudinary for durable media hosting and preview thumbnails
            string cloudinaryUrl = string.Empty;
            try
            {
                cloudinaryUrl = await _cloudinaryService.UploadImageAsync(imageFile, folderName: "section_mockups");
                _logger.LogInformation("Successfully uploaded section mockup image to Cloudinary: {Url}", cloudinaryUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cloudinary upload for section mockup failed. Continuing with local data stream.");
            }

            // 2. Read base64 bytes for Gemini Multimodal Vision analysis
            byte[] imageBytes;
            using (var ms = new MemoryStream())
            {
                await imageFile.CopyToAsync(ms, cancellationToken);
                imageBytes = ms.ToArray();
            }

            var base64Data = Convert.ToBase64String(imageBytes);
            var mimeType = string.IsNullOrWhiteSpace(imageFile.ContentType) ? "image/png" : imageFile.ContentType;

            // 3. Obtain AI API Key with failover
            const int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var apiKeyObj = await _keyPoolService.GetNextAvailableKeyAsync("Gemini", cancellationToken);
                if (apiKeyObj == null)
                {
                    throw new InvalidOperationException("All Gemini API keys are currently cooling down or quota exhausted. Please add keys in AI Key Hub.");
                }

                var sw = Stopwatch.StartNew();
                try
                {
                    var result = await ExecuteImageVisionDecompositionAsync(
                        apiKeyObj, 
                        base64Data, 
                        mimeType, 
                        finalSuiteName, 
                        finalBrandName, 
                        cloudinaryUrl, 
                        cancellationToken);

                    sw.Stop();
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "ImageToSectionVision",
                        (int)sw.ElapsedMilliseconds,
                        200,
                        cancellationToken: cancellationToken);

                    return result;
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    sw.Stop();
                    _logger.LogWarning("AI Key {Alias} hit HTTP 429 during Vision decomposition. Failing over...", apiKeyObj.KeyAlias);
                    await _keyPoolService.MarkRateLimitedAsync(apiKeyObj.Id, 60, cancellationToken);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "ImageToSectionVision",
                        (int)sw.ElapsedMilliseconds,
                        429,
                        errorMessage: "HTTP 429 Rate Limit",
                        cancellationToken: cancellationToken);
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    _logger.LogError(ex, "Vision decomposition failed on attempt {Attempt}", attempt);
                    await _keyPoolService.LogUsageAsync(
                        apiKeyObj.Id,
                        "ImageToSectionVision",
                        (int)sw.ElapsedMilliseconds,
                        500,
                        errorMessage: ex.Message,
                        cancellationToken: cancellationToken);

                    if (attempt == maxRetries) throw;
                }
            }

            throw new InvalidOperationException("Failed to decompose UI image after multiple AI key attempts.");
        }

        private async Task<SectionsBuilderResponseDto> ExecuteImageVisionDecompositionAsync(
            MasterAiApiKey key,
            string base64Image,
            string mimeType,
            string suiteName,
            string brandName,
            string? hostedImageUrl,
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            var systemPrompt = @"You are an elite UI/UX frontend engineer and modular section designer for Ozikol Modular Marketplace.
Analyze the provided UI screenshot, web design mockup, or Figma visual and decompose it into independent, modular web sections.

RULES FOR MODULAR DECOMPOSITION:
1. Multi-Section vs Single Section: If the image shows a full webpage with multiple stacked sections (e.g. Header Menu, Hero Banner, Features 3-Col, Testimonials, Pricing, Footer), decompose EACH part into its own distinct section. If it is a single isolated component, output 1 section.
2. Section Independence & Scoped CSS: For each section, assign a unique id (e.g. sec_hero_vis1, sec_body_vis1). ALL CSS rules for that section MUST be strictly scoped under `#sec_...` (e.g. `#sec_hero_vis1 .hero-title { ... }`). Recreate the visual typography, colors, padding, gradients, shadows, and borders from the image.
3. Placeholders: Use standardized tokens: `{{Hero_Title}}`, `{{Hero_Subtitle}}`, `{{Button_Text}}`, `{{Button_Url}}`, `{{Company_Name}}`, `{{Logo_Url}}`, `{{Image_Url}}`, `{{#each Items}}...{{/each}}`.
4. Output JSON Schema: Return ONLY a raw valid JSON object (without markdown fences):
{
  ""job_id"": ""job_vis_..."",
  ""status"": ""complete"",
  ""group_code"": ""suite_vis_..."",
  ""suite_name"": ""..."",
  ""source_url"": ""..."",
  ""total_sections"": 2,
  ""total_pages"": 1,
  ""pages"": [
    {
      ""title"": ""Home"",
      ""slug"": ""home"",
      ""url"": ""#"",
      ""is_home"": true,
      ""menu_sort_order"": 1,
      ""section_ids"": [""sec_hero_vis1"", ""sec_body_vis1""]
    }
  ],
  ""sections"": [
    {
      ""id"": ""sec_hero_vis1"",
      ""category_key"": ""hero"",
      ""variant_code"": ""Sec_VisHero1"",
      ""name"": ""Visual Hero Banner"",
      ""label"": ""Hero Banner"",
      ""description"": ""Modern hero section with bold headline and CTA button."",
      ""dom_tag"": ""section"",
      ""html_template"": ""<section id='sec_hero_vis1' class='hero-box'>...</section>"",
      ""scoped_css"": ""#sec_hero_vis1 { ... }"",
      ""js_script"": null,
      ""sample_content_json"": ""{\""Hero_Title\"": \""Welcome to Future\""}"",
      ""preview_icon"": ""view_carousel"",
      ""thumbnail_gradient"": ""linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)"",
      ""parent_page_slugs"": [""home""],
      ""sort_order"": 10
    }
  ],
  ""category_breakdown"": {
    ""hero"": 1,
    ""body"": 1
  },
  ""message"": ""Successfully decomposed mockup into X modular sections.""
}";

            var userPrompt = $@"Decompose this UI screenshot into modular marketplace sections.
- Suite Name: {suiteName}
- Brand Name: {brandName}
- Hosted Source Image URL: {hostedImageUrl ?? "uploaded_screenshot.png"}";

            var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key.ApiKey}";
            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new object[]
                        {
                            new { text = userPrompt },
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = mimeType,
                                    data = base64Image
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.2,
                    responseMimeType = "application/json"
                }
            };

            var response = await client.PostAsJsonAsync(geminiUrl, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"Gemini Vision API error ({response.StatusCode}): {err}", null, response.StatusCode);
            }

            var jsonText = await response.Content.ReadAsStringAsync(cancellationToken);
            var parsedGemini = JsonDocument.Parse(jsonText);
            var candidates = parsedGemini.RootElement.GetProperty("candidates");
            if (candidates.GetArrayLength() == 0)
            {
                throw new InvalidOperationException("Gemini Vision returned no candidates.");
            }

            var textContent = candidates[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "{}";

            var cleanJson = CleanJsonFences(textContent);
            var result = JsonSerializer.Deserialize<SectionsBuilderResponseDto>(cleanJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null || result.Sections == null || !result.Sections.Any())
            {
                throw new InvalidOperationException("Vision AI did not generate any modular sections from this image.");
            }

            if (string.IsNullOrWhiteSpace(result.SourceUrl) && !string.IsNullOrWhiteSpace(hostedImageUrl))
            {
                result.SourceUrl = hostedImageUrl;
            }

            if (string.IsNullOrWhiteSpace(result.JobId))
            {
                result.JobId = $"job_vis_{Guid.NewGuid():N}";
            }

            return result;
        }

        private static string CleanJsonFences(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return "{}";
            var trimmed = input.Trim();
            if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed.Substring(7);
            }
            else if (trimmed.StartsWith("```"))
            {
                trimmed = trimmed.Substring(3);
            }

            if (trimmed.EndsWith("```"))
            {
                trimmed = trimmed.Substring(0, trimmed.Length - 3);
            }

            return trimmed.Trim();
        }
    }
}
