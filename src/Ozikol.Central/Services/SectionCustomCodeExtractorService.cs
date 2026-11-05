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
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Enterprise AI section extraction service that decomposes sliced HTML markup, extracts author custom CSS,
    /// isolates interactive JavaScript, replaces hardcoded values with canonical Ozikol domain tokens,
    /// and extracts exact sample data into mock JSON.
    /// Operates against the central <see cref="IAiKeyPoolManagerService"/> with primary Gemini 2.5 Flash execution
    /// and automatic failover to DeepSeek.
    /// </summary>
    public class SectionCustomCodeExtractorService : ISectionCustomCodeExtractorService
    {
        private readonly IAiKeyPoolManagerService _keyPoolService;
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<SectionCustomCodeExtractorService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SectionCustomCodeExtractorService"/> class.
        /// </summary>
        /// <param name="keyPoolService">Central AI key pool manager for resolving active keys from database.</param>
        /// <param name="libraryResolver">Third-party library detector and CDN resolver.</param>
        /// <param name="httpClientFactory">Factory for creating configured HTTP clients.</param>
        /// <param name="logger">Structured logger instance.</param>
        public SectionCustomCodeExtractorService(
            IAiKeyPoolManagerService keyPoolService,
            ISectionLibraryResolverService libraryResolver,
            IHttpClientFactory httpClientFactory,
            ILogger<SectionCustomCodeExtractorService> logger)
        {
            _keyPoolService = keyPoolService ?? throw new ArgumentNullException(nameof(keyPoolService));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<SectionCustomCodeExtractionResponseDto> ExtractAndIsolateAsync(
            SectionCustomCodeExtractionRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            // 1. Resolve remote CSS content if URL is provided and raw string is empty
            if (string.IsNullOrWhiteSpace(request.RawCustomCss) && !string.IsNullOrWhiteSpace(request.CustomCssUrl))
            {
                try
                {
                    _logger.LogInformation("Fetching custom CSS from remote URL for section {Key}: {Url}", request.SectionKey, request.CustomCssUrl);
                    request.RawCustomCss = await DownloadRemoteAssetAsync(request.CustomCssUrl, cancellationToken);
                }
                catch (Exception cssEx)
                {
                    _logger.LogWarning(cssEx, "Failed to download custom CSS from {Url} for section {Key}", request.CustomCssUrl, request.SectionKey);
                }
            }

            // 2. Resolve remote JS content if URL is provided and raw string is empty
            if (string.IsNullOrWhiteSpace(request.RawCustomJs) && !string.IsNullOrWhiteSpace(request.CustomJsUrl))
            {
                try
                {
                    _logger.LogInformation("Fetching custom JS from remote URL for section {Key}: {Url}", request.SectionKey, request.CustomJsUrl);
                    request.RawCustomJs = await DownloadRemoteAssetAsync(request.CustomJsUrl, cancellationToken);
                }
                catch (Exception jsEx)
                {
                    _logger.LogWarning(jsEx, "Failed to download custom JS from {Url} for section {Key}", request.CustomJsUrl, request.SectionKey);
                }
            }

            // 3. Auto-detect external library dependencies from markup
            var detectedLibs = _libraryResolver.DetectLibraries(request.HtmlMarkup, request.RawCustomJs);

            var isMenu = string.Equals(request.CategoryKey, "menu", StringComparison.OrdinalIgnoreCase)
                || (request.HtmlMarkup?.IndexOf("<nav", StringComparison.OrdinalIgnoreCase) >= 0 && request.HtmlMarkup?.IndexOf("<header", StringComparison.OrdinalIgnoreCase) >= 0);

            var systemPrompt = BuildSystemPrompt(request.ContainerClass, request.CategoryKey, isMenu);
            var userPrompt = BuildUserPrompt(request, detectedLibs);

            // -------------------------------------------------------------
            // STEP 1: Attempt Primary Provider (Gemini from DB Pool with key rotation)
            // -------------------------------------------------------------
            const int maxGeminiAttempts = 3;
            for (int attempt = 1; attempt <= maxGeminiAttempts; attempt++)
            {
                var geminiKey = await _keyPoolService.GetNextAvailableKeyAsync("Gemini", cancellationToken);
                if (geminiKey == null)
                {
                    _logger.LogInformation("[AI Key Pool] No active Gemini keys available in pool (or all cooling down). Falling over to DeepSeek...");
                    break;
                }

                var nowStr = DateTime.Now.ToString("HH:mm:ss.fff");
                _logger.LogInformation("[{Time}] 🚀 [AI Key Pool] Calling Gemini (Key Alias: '{Alias}', Attempt {Attempt}/{Max}) for Section '{Key}'...", 
                    nowStr, geminiKey.KeyAlias, attempt, maxGeminiAttempts, request.SectionKey);
                Console.WriteLine($"\n[{nowStr}] [AI ENGINE] 🚀 Executing Gemini Key: '{geminiKey.KeyAlias}' (Attempt {attempt}/{maxGeminiAttempts}) for Section: '{request.SectionKey}'");

                var sw = Stopwatch.StartNew();
                try
                {
                    var geminiResult = await ExecuteGeminiAsync(geminiKey.ApiKey, systemPrompt, userPrompt, cancellationToken);
                    sw.Stop();

                    if (geminiResult != null && geminiResult.Success)
                    {
                        var doneStr = DateTime.Now.ToString("HH:mm:ss.fff");
                        geminiResult.ProviderUsed = $"Gemini 2.5 Flash ({geminiKey.KeyAlias})";
                        geminiResult.DetectedLibraries = detectedLibs;
                        EnsurePopulatedSampleContentJson(geminiResult, request.CategoryKey, request.HtmlMarkup);

                        _logger.LogInformation("[{Time}] ✔ [AI Key Pool] Gemini Key '{Alias}' succeeded in {Elapsed}ms for Section '{Key}' ({PlaceholdersCount} tokens mapped).",
                            doneStr, geminiKey.KeyAlias, sw.ElapsedMilliseconds, request.SectionKey, geminiResult.Placeholders.Count);
                        Console.WriteLine($"[{doneStr}] [AI ENGINE] ✔ Gemini Key '{geminiKey.KeyAlias}' completed in {sw.ElapsedMilliseconds}ms for Section: '{request.SectionKey}' ({geminiResult.Placeholders.Count} tokens)\n");

                        await _keyPoolService.LogUsageAsync(
                            geminiKey.Id,
                            "SectionCustomCodeExtraction",
                            (int)sw.ElapsedMilliseconds,
                            200,
                            cancellationToken: cancellationToken);

                        return geminiResult;
                    }
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests || (int?)httpEx.StatusCode == 402 || (int?)httpEx.StatusCode == 401 || (int?)httpEx.StatusCode == 403 || (int?)httpEx.StatusCode == 404 || (int?)httpEx.StatusCode == 503)
                {
                    sw.Stop();
                    var errStr = DateTime.Now.ToString("HH:mm:ss.fff");
                    _logger.LogWarning("[{Time}] ⚠️ [AI Key Pool] Gemini Key '{Alias}' hit error ({Status}) in {Elapsed}ms. Cooling down 300s -> Rotating to next Gemini key...", 
                        errStr, geminiKey.KeyAlias, httpEx.StatusCode, sw.ElapsedMilliseconds);
                    Console.WriteLine($"[{errStr}] [AI ENGINE] ⚠️ Gemini Key '{geminiKey.KeyAlias}' hit {httpEx.StatusCode} ({sw.ElapsedMilliseconds}ms) -> Cooling down 300s -> Switching to next Gemini key...");

                    await _keyPoolService.MarkRateLimitedAsync(geminiKey.Id, 300, cancellationToken);
                    await _keyPoolService.LogUsageAsync(
                        geminiKey.Id,
                        "SectionCustomCodeExtraction",
                        (int)sw.ElapsedMilliseconds,
                        (int)(httpEx.StatusCode ?? System.Net.HttpStatusCode.TooManyRequests),
                        errorMessage: httpEx.Message,
                        cancellationToken: cancellationToken);
                }
                catch (Exception geminiEx)
                {
                    sw.Stop();
                    var errStr = DateTime.Now.ToString("HH:mm:ss.fff");
                    _logger.LogWarning(geminiEx, "[{Time}] ⚠️ [AI Key Pool] Gemini Key '{Alias}' failed ({Error}) in {Elapsed}ms for {Key}. Rotating to next Gemini key...", 
                        errStr, geminiKey.KeyAlias, geminiEx.Message, sw.ElapsedMilliseconds, request.SectionKey);
                    Console.WriteLine($"[{errStr}] [AI ENGINE] ⚠️ Gemini Key '{geminiKey.KeyAlias}' failed ({geminiEx.Message}) in {sw.ElapsedMilliseconds}ms -> Switching to next Gemini key...");

                    // If request timed out, mark key with brief cooldown to avoid hanging subsequent sections
                    if (geminiEx is TimeoutException || geminiEx is TaskCanceledException)
                    {
                        await _keyPoolService.MarkRateLimitedAsync(geminiKey.Id, 180, cancellationToken);
                    }

                    await _keyPoolService.LogUsageAsync(
                        geminiKey.Id,
                        "SectionCustomCodeExtraction",
                        (int)sw.ElapsedMilliseconds,
                        504,
                        errorMessage: geminiEx.Message,
                        cancellationToken: cancellationToken);
                }
            }

            // -------------------------------------------------------------
            // STEP 2: Automatic FAILOVER to Secondary Provider (DeepSeek from DB Pool)
            // -------------------------------------------------------------
            var failoverTime = DateTime.Now.ToString("HH:mm:ss.fff");
            _logger.LogWarning("[{Time}] ⚡ [AI Key Pool] All Gemini keys exhausted or cooling down. Failing over to DeepSeek Pool...", failoverTime);
            Console.WriteLine($"\n[{failoverTime}] [AI ENGINE] ⚡ All Gemini keys exhausted or cooling down. Failing over to DeepSeek Pool...");

            const int maxDeepSeekAttempts = 2;
            for (int attempt = 1; attempt <= maxDeepSeekAttempts; attempt++)
            {
                var deepSeekKey = await _keyPoolService.GetNextAvailableKeyAsync("DeepSeek", cancellationToken);
                if (deepSeekKey == null)
                {
                    var noKeyTime = DateTime.Now.ToString("HH:mm:ss.fff");
                    _logger.LogWarning("[{Time}] ✖ [AI Key Pool] No active DeepSeek keys available in pool for failover.", noKeyTime);
                    Console.WriteLine($"[{noKeyTime}] [AI ENGINE] ✖ No active DeepSeek keys available in pool.");
                    break;
                }

                var dsStart = DateTime.Now.ToString("HH:mm:ss.fff");
                _logger.LogInformation("[{Time}] 🚀 [AI Key Pool] Calling DeepSeek (Key Alias: '{Alias}', Attempt {Attempt}/{Max}) for Section '{Key}'...", 
                    dsStart, deepSeekKey.KeyAlias, attempt, maxDeepSeekAttempts, request.SectionKey);
                Console.WriteLine($"[{dsStart}] [AI ENGINE] 🚀 Executing DeepSeek Key: '{deepSeekKey.KeyAlias}' (Attempt {attempt}/{maxDeepSeekAttempts}) for Section: '{request.SectionKey}'");

                var sw = Stopwatch.StartNew();
                try
                {
                    var deepSeekResult = await ExecuteDeepSeekAsync(deepSeekKey.ApiKey, systemPrompt, userPrompt, cancellationToken);
                    sw.Stop();

                    if (deepSeekResult != null && deepSeekResult.Success)
                    {
                        var dsDone = DateTime.Now.ToString("HH:mm:ss.fff");
                        deepSeekResult.ProviderUsed = $"DeepSeek ({deepSeekKey.KeyAlias})";
                        deepSeekResult.DetectedLibraries = detectedLibs;
                        EnsurePopulatedSampleContentJson(deepSeekResult, request.CategoryKey, request.HtmlMarkup);

                        _logger.LogInformation("[{Time}] ✔ [AI Key Pool] DeepSeek Key '{Alias}' succeeded in {Elapsed}ms for Section '{Key}' ({PlaceholdersCount} tokens mapped).",
                            dsDone, deepSeekKey.KeyAlias, sw.ElapsedMilliseconds, request.SectionKey, deepSeekResult.Placeholders.Count);
                        Console.WriteLine($"[{dsDone}] [AI ENGINE] ✔ DeepSeek Key '{deepSeekKey.KeyAlias}' completed in {sw.ElapsedMilliseconds}ms for Section: '{request.SectionKey}' ({deepSeekResult.Placeholders.Count} tokens)\n");

                        await _keyPoolService.LogUsageAsync(
                            deepSeekKey.Id,
                            "SectionCustomCodeExtraction",
                            (int)sw.ElapsedMilliseconds,
                            200,
                            cancellationToken: cancellationToken);

                        return deepSeekResult;
                    }
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests || (int?)httpEx.StatusCode == 402 || (int?)httpEx.StatusCode == 401 || (int?)httpEx.StatusCode == 403)
                {
                    sw.Stop();
                    var dsErr = DateTime.Now.ToString("HH:mm:ss.fff");
                    _logger.LogWarning("[{Time}] ⚠️ [AI Key Pool] DeepSeek Key '{Alias}' hit error ({Status}) in {Elapsed}ms. Cooling down...", dsErr, deepSeekKey.KeyAlias, httpEx.StatusCode, sw.ElapsedMilliseconds);
                    Console.WriteLine($"[{dsErr}] [AI ENGINE] ⚠️ DeepSeek Key '{deepSeekKey.KeyAlias}' hit {httpEx.StatusCode} in {sw.ElapsedMilliseconds}ms -> Cooling down 120s...");

                    await _keyPoolService.MarkRateLimitedAsync(deepSeekKey.Id, 120, cancellationToken);
                    await _keyPoolService.LogUsageAsync(
                        deepSeekKey.Id,
                        "SectionCustomCodeExtraction",
                        (int)sw.ElapsedMilliseconds,
                        (int)(httpEx.StatusCode ?? System.Net.HttpStatusCode.TooManyRequests),
                        errorMessage: httpEx.Message,
                        cancellationToken: cancellationToken);
                }
                catch (Exception deepSeekEx)
                {
                    sw.Stop();
                    var dsFail = DateTime.Now.ToString("HH:mm:ss.fff");
                    _logger.LogError(deepSeekEx, "[{Time}] ✖ [AI Key Pool] DeepSeek Key '{Alias}' failed ({Error}) in {Elapsed}ms for {Key}.", 
                        dsFail, deepSeekKey.KeyAlias, deepSeekEx.Message, sw.ElapsedMilliseconds, request.SectionKey);
                    Console.WriteLine($"[{dsFail}] [AI ENGINE] ✖ DeepSeek Key '{deepSeekKey.KeyAlias}' failed ({deepSeekEx.Message}) in {sw.ElapsedMilliseconds}ms");

                    await _keyPoolService.LogUsageAsync(
                        deepSeekKey.Id,
                        "SectionCustomCodeExtraction",
                        (int)sw.ElapsedMilliseconds,
                        500,
                        errorMessage: deepSeekEx.Message,
                        cancellationToken: cancellationToken);
                }
            }

            // -------------------------------------------------------------
            // No local fallback parser: strictly return clean failure if no AI provider succeeds
            // -------------------------------------------------------------
            _logger.LogError("All external AI providers offline or no active keys found in MasterAiApiKeys pool for {Key}.", request.SectionKey);
            return new SectionCustomCodeExtractionResponseDto
            {
                Success = false,
                Message = "No active AI API keys configured or available in Central Works Key Pool. Please add or activate a Gemini or DeepSeek API key in Central Works > AI Keys (/centralwks/aikeys)."
            };
        }

        #region Provider Executions

        private async Task<SectionCustomCodeExtractionResponseDto> ExecuteGeminiAsync(
            string apiKey, 
            string systemPrompt, 
            string userPrompt, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(12);

            var payload = new
            {
                system_instruction = new { parts = new[] { new { text = systemPrompt } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { temperature = 0.1, responseMimeType = "application/json", maxOutputTokens = 8192 }
            };

            // Production active Gemini models (arranged by low congestion and speed)
            var models = new[] { "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-flash-8b" };
            HttpResponseMessage? response = null;
            string lastErr = string.Empty;

            foreach (var model in models)
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                
                using var modelCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                modelCts.CancelAfter(TimeSpan.FromSeconds(12));

                try
                {
                    response = await client.PostAsJsonAsync(url, payload, modelCts.Token);
                    if (response.IsSuccessStatusCode)
                    {
                        break;
                    }

                    lastErr = await response.Content.ReadAsStringAsync(cancellationToken);

                    // If model is busy (503) or not found (404), continue loop to next lightweight model
                    if ((int)response.StatusCode == 503 || (int)response.StatusCode == 404)
                    {
                        continue;
                    }

                    // If hard rate limit (429) or auth error (401/403/402), fail key to rotate to next key in pool
                    if ((int)response.StatusCode == 429 || (int)response.StatusCode == 402 || (int)response.StatusCode == 401 || (int)response.StatusCode == 403)
                    {
                        throw new HttpRequestException($"Gemini API error ({(int)response.StatusCode}): {lastErr}", null, response.StatusCode);
                    }
                }
                catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                {
                    // If timeout on current model, cascade to next lightweight model
                    continue;
                }
            }

            if (response == null || !response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Gemini API error across all models: {lastErr}", null, response?.StatusCode ?? System.Net.HttpStatusCode.InternalServerError);
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
            client.Timeout = TimeSpan.FromSeconds(60);
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
                max_tokens = 8192,
                temperature = 0.1
            };

            var response = await client.PostAsJsonAsync(url, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"DeepSeek API error ({(int)response.StatusCode}): {err}", null, response.StatusCode);
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

        private static string BuildSystemPrompt(string containerClass, string categoryKey, bool isMenu)
        {
            if (isMenu)
            {
                return $@"You are an Expert CMS Menu & Navigation Extraction Engine for Ozikol.
Your task is to analyze a sliced header/menu section's HTML markup and author stylesheets to produce a 100% authentic, 1-to-1 modular navigation bar.

STRICT MANDATES:
1. NO ARTIFICIAL CLASSES OR WRAPPERS:
   - NEVER create, invent, or inject artificial wrapper classes.
   - Keep the original root HTML tag (<header>, <nav>, or <div>) and all existing class attributes EXACTLY as provided in the original markup.

2. NAVIGATION TOKENS SCHEMA (MANDATORY: NEVER USE '{{#SectionLists}}' IN A MENU):
   In Ozikol, website menus are dynamic and driven by CMS PageCategories and WebPages.

   === 1. TOP-LEVEL NAVIGATION MENU LOOP ===
   Wrap top-level menu <li> items in:
   {{{{#each PageCategories}}}}
     <li class=""{{{{#if HasChildren}}}}has-dropdown{{{{/if}}}}"">
       <a href=""{{{{ DirectUrl }}}}"">{{{{ Title }}}}</a>
       ...
     </li>
   {{{{/each}}}}
   (or {{{{#each NavigationMenu}}}} ... {{{{#/each}}}})

   === 2. NESTED DROPDOWN PAGES LOOP (1st-Level Dropdown) ===
   Inside a dropdown container or mega-menu column, wrap child page links in:
   {{{{#each Pages}}}}
     <li>
       <a href=""{{{{ PageUrl }}}}"">{{{{ PageTitle }}}}</a>
     </li>
   {{{{/each}}}}
   Inside {{{{#each Pages}}}}, available tokens:
   - Page Link Title: {{{{ PageTitle }}}} (or {{{{ Title }}}})
   - Page Destination URL: href=""{{{{ PageUrl }}}}"" (or href=""{{{{ DirectUrl }}}}"")
   - Page Short Description: {{{{ PageDescription }}}}
   - Page Thumbnail / Icon: src=""{{{{ PageImage }}}}""

   === 3. CASCADING MEGA-MENU SUB-CATEGORIES LOOP (Multi-Level Dropdowns) ===
   If the menu has multi-level or mega-menu columns with category headings:
   {{{{#each Children}}}}
     <div class=""sub-category-col"">
       <h6>{{{{ Title }}}}</h6>
       <ul>
         {{{{#each Pages}}}}
           <li><a href=""{{{{ PageUrl }}}}"">{{{{ PageTitle }}}}</a></li>
         {{{{/each}}}}
       </ul>
     </div>
   {{{{/each}}}}

   === 4. HEADER BRAND IDENTITY & SIGN-IN BUTTON ===
   - Company / Brand Name: {{{{ CompanyName }}}} or {{{{ Brand.Name }}}}
   - Standard Brand Logo: src=""{{{{ Brand.LogoUrl }}}}""
   - White / Dark Mode Logo: src=""{{{{ Brand.WhiteLogoUrl }}}}""
   - Favicon: href=""{{{{ Brand.FaviconUrl }}}}""
   - Home Link: href=""{{{{ Brand.WebsiteUrl }}}}""
   - Portal Sign-In / Login Button Text: {{{{ Brand.LoginButtonText }}}} (default: 'Sign In')

   === 5. HEADER CALL-TO-ACTION (CTA) BUTTONS ===
   - Primary Header Button: {{{{ ButtonText }}}} with href=""{{{{ ButtonLink }}}}""
   - Secondary Header Button: {{{{ SecondButtonText }}}} with href=""{{{{ SecondButtonLink }}}}""
   - Optional Multi-CTA loop: {{{{#each MenuCtaButtons}}}} ... {{{{#/each}}}} with {{{{ Title }}}} and href=""{{{{ DirectUrl }}}}""

   === 6. CONTACT INSERTS ===
   - Phone: replace raw phone with: {{{{ Phone }}}} (and href=""tel:{{{{ Phone }}}}"")
   - Email: replace raw email with: {{{{ Email }}}} (and href=""mailto:{{{{ Email }}}}"")
   - Address / Location: replace raw location with: {{{{ Address }}}}

3. CLEAN AUTHOR CSS EXTRACTION:
   Extract only the author's custom CSS rules matching classes present in this header/menu. Do not alter or wrap selectors with artificial class names.

4. REAL COMPONENT JAVASCRIPT:
   Extract only interactive mobile hamburger toggles, sticky header on-scroll listeners, or dropdown behavior targeting this menu.

OUTPUT SCHEMA: Return ONLY a raw JSON object matching:
{{
  ""html_template"": ""<header class='...'>...</header>"",
  ""scoped_css"": "".header-area {{ ... }} .main-menu {{ ... }}"",
  ""js_script"": ""/* mobile menu toggle / sticky header logic */"",
  ""sample_content_json"": ""{{\""CompanyName\"": \""Enterprise Workspace\"", \""Brand\"": {{\""Name\"": \""Enterprise Workspace\"", \""LogoUrl\"": \""https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300\"", \""WhiteLogoUrl\"": \""https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300\"", \""WebsiteUrl\"": \""/\"", \""LoginButtonText\"": \""Sign In\""}}, \""ButtonText\"": \""Let’s Talk\"", \""ButtonLink\"": \""/contact\"", \""PageCategories\"": [{{\""Title\"": \""Home\"", \""DirectUrl\"": \""/\"", \""HasChildren\"": false, \""Pages\"": []}}, {{\""Title\"": \""Services\"", \""DirectUrl\"": \""/services\"", \""HasChildren\"": true, \""Pages\"": [{{\""PageTitle\"": \""Web Development\"", \""PageUrl\"": \""/services/web\""}}, {{\""PageTitle\"": \""Cloud Solutions\"", \""PageUrl\"": \""/services/cloud\""}}], \""Children\"": [{{\""Title\"": \""Solutions\"", \""DirectUrl\"": \""/solutions\"", \""Pages\"": [{{\""PageTitle\"": \""Enterprise AI\"", \""PageUrl\"": \""/solutions/ai\""}}]}}]}}, {{\""Title\"": \""Company\"", \""DirectUrl\"": \""/about\"", \""HasChildren\"": true, \""Pages\"": [{{\""PageTitle\"": \""About Us\"", \""PageUrl\"": \""/about\""}}, {{\""PageTitle\"": \""Contact\"", \""PageUrl\"": \""/contact\""}}]}}]}}"",
  ""placeholders"": [""CompanyName"", ""Brand.LogoUrl"", ""Brand.LoginButtonText"", ""ButtonText"", ""ButtonLink"", ""PageCategories""]
}}";
            }

            return $@"You are an Expert CMS Section Extraction Engine.
Your task is to analyze a sliced section's HTML markup and author stylesheets to produce a 100% authentic, 1-to-1 modular section.

STRICT MANDATES:
1. NO ARTIFICIAL CLASSES OR WRAPPERS:
   - NEVER create, invent, or inject artificial wrapper classes.
   - Keep the original root HTML tag and all existing class attributes EXACTLY as provided in the original markup.

2. PURE 1-TO-1 CANONICAL TOKEN REPLACEMENT (NEVER INVENT TOKENS):
   You must strictly use ONLY the exact canonical Ozikol tokens from the 4 groups below. NEVER invent custom names (e.g. do NOT create '{{{{#HomeDemos}}}}', '{{{{#MainPagesList}}}}', '{{{{#ServicesList}}}}', or '{{{{PromoTitle}}}}').

   === GROUP 1: ROOT SECTION TOKENS (PageSection) ===
   - Main Section Headline: {{{{ Title }}}}
   - Sub-heading / Kicker / Eyebrow Badge: {{{{ MiniTitle }}}}
   - Short Summary / Subtitle Paragraph: {{{{ Description }}}}
   - Extended Rich Text / HTML Body: {{{{ FullDescription }}}}
   - Blockquote / Highlight Callout: {{{{ Qoute }}}}
   - Primary Image / Banner / Hero Graphic: src=""{{{{ ImageUrl }}}}""
   - Secondary Image / Collage Graphic: src=""{{{{ SecondImageUrl }}}}""
   - Direct Video URL: src=""{{{{ VideoUrl }}}}""
   - YouTube / Vimeo Embed URL: src=""{{{{ YoutubeUrlLink }}}}""
   - Root Section Icon Class: <i class=""{{{{ IconText }}}}""></i> (e.g. 'tji-phone', 'fa-solid fa-rocket', 'bi bi-shield-check')
   - Primary CTA Button Label: {{{{ ButtonText }}}}
   - Primary CTA Button Destination URL: href=""{{{{ ButtonLink }}}}""
   - Secondary CTA Button Label (Dual CTA): {{{{ SecondButtonText }}}}
   - Secondary CTA Button Destination URL: href=""{{{{ SecondButtonLink }}}}""
   - Direct Routing / Anchor Link: href=""{{{{ DirectUrl }}}}""
   - Custom Container Class: {{{{ CustomClass }}}}
   - Background Color Override: {{{{ BackgroundColor }}}}

   === GROUP 2: REPEATABLE CHILD ITEMS (PageSectionList) ===
   All repeating cards, slides, pricing tiers, team members, or FAQs MUST be wrapped inside:
   {{{{#SectionLists}}}} ... {{{{/SectionLists}}}} (or {{{{#PageSectionLists}}}} ... {{{{/PageSectionLists}}}})
   Inside the loop, use ONLY these canonical child tokens:
   - Item Title / Card Heading / Link Label: {{{{ Title }}}}
   - Item Subtitle / Badge (e.g. 'HOT', 'NEW') / Price / Role: {{{{ MiniTitle }}}}
   - Item Description / Card Excerpt: {{{{ Description }}}}
   - Extended Note / Bullet Text: {{{{ MoreDescription }}}}
   - Item Thumbnail / Avatar / Screenshot: src=""{{{{ ImageUrl }}}}""
   - Item Video URL: src=""{{{{ VideoUrl }}}}""
   - Item Icon Class: <i class=""{{{{ IconText }}}}""></i> (e.g. 'tji-service-1', 'bi bi-star')
   - Item Button Label: {{{{ ButtonText }}}} (e.g. 'View Demo', 'Select Plan')
   - Item Button Link: href=""{{{{ ButtonLink }}}}""
   - Item Custom Class: {{{{ CustomClass }}}}

   === GROUP 3: CMS SETTINGS & BRAND IDENTITY (ConfigSetting) ===
   For site logos, brand name, and portal sign-in:
   - Company / Brand Name: {{{{ CompanyName }}}} or {{{{ Brand.Name }}}}
   - Company Abbreviation: {{{{ Brand.Abbreviation }}}}
   - Standard Brand Logo: src=""{{{{ Brand.LogoUrl }}}}""
   - White / Dark Mode Logo: src=""{{{{ Brand.WhiteLogoUrl }}}}""
   - Favicon: href=""{{{{ Brand.FaviconUrl }}}}""
   - Website Home Link: href=""{{{{ Brand.WebsiteUrl }}}}""
   - Login CTA Text: {{{{ Brand.LoginButtonText }}}} (default: 'Sign In')

   === GROUP 4: THE 3 CONTACT INSERTS (Dynamic Site-Wide Replacement) ===
   When a raw phone, email, or physical address appears in header, footer, or contact blocks:
   - Phone Insert: In markup, replace phone number with: 0000000000 (and href=""tel:0000000000"")
   - Email Insert: In markup, replace email with: abc@domain.com (and href=""mailto:abc@domain.com"")
   - Address Insert: In markup, replace address with: No 1 ABC Street, World

3. REAL CONTENT EXTRACTION (NO INVENTED / HALLUCINATED TEXT):
   Extract the EXACT real values from the original HTML into sample_content_json (exact text, real URLs, real image paths, and real icon class strings like 'tji-arrow-right-long').
   Every single placeholder present in html_template MUST exist in sample_content_json.

4. CLEAN AUTHOR CSS EXTRACTION:
   Extract only the author's custom CSS rules matching classes present in this section. Do not alter or wrap selectors with artificial class names.

OUTPUT SCHEMA: Return ONLY a raw JSON object matching:
{{
  ""html_template"": ""<section class='...'>...</section>"",
  ""scoped_css"": "".section-area {{ ... }} .service-card {{ ... }}"",
  ""js_script"": ""/* isolated interactive scripts */"",
  ""sample_content_json"": ""{{\""Title\"": \""Real Title\"", \""ButtonText\"": \""Let’s Talk\"", \""IconText\"": \""tji-phone\"", \""SectionLists\"": [{{\""Title\"": \""Item 1\""}}]}}"",
  ""placeholders"": [""Title"", ""ButtonText"", ""ButtonLink"", ""IconText"", ""ImageUrl"", ""SectionLists""]
}}";
        }

        private static string BuildUserPrompt(SectionCustomCodeExtractionRequestDto req, List<string> detectedLibs)
        {
            var filteredCss = FilterCandidateCssForHtml(req.RawCustomCss ?? string.Empty, req.HtmlMarkup);
            var filteredJs = FilterCandidateJsForHtml(req.RawCustomJs ?? string.Empty, req.HtmlMarkup);

            var rootClassInfo = !string.IsNullOrWhiteSpace(req.ContainerClass)
                ? $"- Author Root Class: .{req.ContainerClass.TrimStart('.')}"
                : string.Empty;

            return $@"SECTION INPUTS:
- Section Key: {req.SectionKey}
{rootClassInfo}
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

        private static readonly Regex VendorClassRegex = new(
            @"^(?:container(?:-(?:fluid|sm|md|lg|xl|xxl))?|row|row-cols(?:-\w+)?|col(?:-\w+)?|order(?:-\w+)?|offset(?:-\w+)?|g(?:[xy])?-\w+|d-(?:none|block|flex|inline\w*|grid)|flex-\w+|justify-content-\w+|align-items-\w+|align-self-\w+|align-content-\w+|m[trblsexy]?-\w+|p[trblsexy]?-\w+|text-(?:center|start|end|left|right|justify|nowrap|break|lowercase|uppercase|capitalize|muted|white|primary|secondary|success|danger|warning|info|light|dark|body|black)|bg-(?:primary|secondary|success|danger|warning|info|light|dark|white|transparent|body)|border(?:-\w+)?|rounded(?:-\w+)?|shadow(?:-\w+)?|w-\w+|h-\w+|opacity-\w+|overflow-\w+|position-\w+|top-\w+|bottom-\w+|start-\w+|end-\w+|z-\w+|fs-\w+|fw-\w+|lh-\w+|visually-hidden\w*|btn|btn-\w+|btn-group\w*|btn-toolbar|badge|badge-\w+|card|card-\w+|dropdown|dropdown-\w+|modal|modal-\w+|nav|navbar|navbar-\w+|nav-item|nav-link|accordion|accordion-\w+|alert|alert-\w+|table|table-\w+|form-\w+|input-group|input-group-\w+|form-control|form-select|form-check\w*|collapse|collapsing|fade|show|active|disabled|fa|fas|far|fab|fad|fal|fat|fa-\w+|bi|bi-\w+|material-symbols-\w+|material-icons\w*|swiper|swiper-\w+|aos-\w+|glightbox|gslide\w*|gdesc\w*|animate__\w+|animated|mfp-\w+)$",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static string FilterCandidateCssForHtml(string rawCss, string htmlMarkup)
        {
            if (string.IsNullOrWhiteSpace(rawCss)) return string.Empty;

            var classMatches = Regex.Matches(htmlMarkup, @"class=[""']([^""']+)[""']");
            var classNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match m in classMatches)
            {
                var tokens = m.Groups[1].Value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var t in tokens)
                {
                    var trimmed = t.Trim();
                    if (!VendorClassRegex.IsMatch(trimmed))
                    {
                        classNames.Add(trimmed);
                    }
                }
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
                    if (matchedCount >= 400) break;
                }
            }

            return sb.ToString();
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
            var cleaned = Regex.Replace(rawJson.Trim(), @"^```(?:json)?\s*", string.Empty, RegexOptions.Multiline);
            cleaned = Regex.Replace(cleaned, @"^```\s*$", string.Empty, RegexOptions.Multiline).Trim();

            // Extract outermost JSON object if response contains preamble or postamble
            var firstBrace = cleaned.IndexOf('{');
            var lastBrace = cleaned.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                cleaned = cleaned.Substring(firstBrace, lastBrace - firstBrace + 1);
            }

            JsonDocument? doc = null;
            var jsonOptions = new JsonDocumentOptions
            {
                AllowTrailingCommas = true,
                CommentHandling = JsonCommentHandling.Skip
            };

            try
            {
                doc = JsonDocument.Parse(cleaned, jsonOptions);
            }
            catch
            {
                // If unescaped newlines/control characters inside string values caused the error, sanitize them
                try
                {
                    var sanitized = Regex.Replace(cleaned, @"(?<!\\)\r?\n", "\\n");
                    doc = JsonDocument.Parse(sanitized, jsonOptions);
                }
                catch
                {
                    // Fallback to regex extraction of individual properties
                    return ExtractViaRegex(cleaned);
                }
            }

            using (doc)
            {
                var root = doc.RootElement;
                var result = new SectionCustomCodeExtractionResponseDto
                {
                    Success = true,
                    HtmlTemplate = root.TryGetProperty("html_template", out var h) ? h.GetString() ?? string.Empty : string.Empty,
                    ScopedCss = root.TryGetProperty("scoped_css", out var sc) ? sc.GetString() ?? string.Empty : string.Empty,
                    JsScript = root.TryGetProperty("js_script", out var js) ? js.GetString() ?? string.Empty : string.Empty
                };

                if (root.TryGetProperty("sample_content_json", out var sampleProp))
                {
                    if (sampleProp.ValueKind == JsonValueKind.String)
                    {
                        result.ExtractedContentJson = sampleProp.GetString() ?? "{}";
                    }
                    else if (sampleProp.ValueKind == JsonValueKind.Object || sampleProp.ValueKind == JsonValueKind.Array)
                    {
                        result.ExtractedContentJson = sampleProp.GetRawText();
                    }
                    else
                    {
                        result.ExtractedContentJson = "{}";
                    }
                }

                if (root.TryGetProperty("placeholders", out var pArray) && pArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var p in pArray.EnumerateArray())
                    {
                        var pStr = p.GetString();
                        if (!string.IsNullOrWhiteSpace(pStr))
                        {
                            result.Placeholders.Add(pStr);
                        }
                    }
                }

                return result;
            }
        }

        private static SectionCustomCodeExtractionResponseDto ExtractViaRegex(string raw)
        {
            var result = new SectionCustomCodeExtractionResponseDto { Success = true };

            var htmlMatch = Regex.Match(raw, @"""html_template""\s*:\s*""((?:[^""\\]|\\.)*)""", RegexOptions.Singleline);
            if (htmlMatch.Success) result.HtmlTemplate = Regex.Unescape(htmlMatch.Groups[1].Value);

            var cssMatch = Regex.Match(raw, @"""scoped_css""\s*:\s*""((?:[^""\\]|\\.)*)""", RegexOptions.Singleline);
            if (cssMatch.Success) result.ScopedCss = Regex.Unescape(cssMatch.Groups[1].Value);

            var jsMatch = Regex.Match(raw, @"""js_script""\s*:\s*""((?:[^""\\]|\\.)*)""", RegexOptions.Singleline);
            if (jsMatch.Success) result.JsScript = Regex.Unescape(jsMatch.Groups[1].Value);

            var sampleStringMatch = Regex.Match(raw, @"""sample_content_json""\s*:\s*""((?:[^""\\]|\\.)*)""", RegexOptions.Singleline);
            if (sampleStringMatch.Success)
            {
                result.ExtractedContentJson = Regex.Unescape(sampleStringMatch.Groups[1].Value);
            }
            else
            {
                var sampleObjMatch = Regex.Match(raw, @"""sample_content_json""\s*:\s*(\{[\s\S]*?\})(?=\s*,\s*""|\s*\})", RegexOptions.Singleline);
                if (sampleObjMatch.Success)
                {
                    result.ExtractedContentJson = sampleObjMatch.Groups[1].Value;
                }
            }

            var placeholdersMatch = Regex.Match(raw, @"""placeholders""\s*:\s*\[([^\]]*)\]", RegexOptions.Singleline);
            if (placeholdersMatch.Success)
            {
                var itemMatches = Regex.Matches(placeholdersMatch.Groups[1].Value, @"""([^""\\]*(?:\\.[^""\\]*)*)""");
                foreach (Match im in itemMatches)
                {
                    var val = Regex.Unescape(im.Groups[1].Value).Trim();
                    if (!string.IsNullOrWhiteSpace(val))
                    {
                        result.Placeholders.Add(val);
                    }
                }
            }

            // If placeholders array was empty or omitted, extract canonical Mustache tokens from HtmlTemplate
            if (result.Placeholders.Count == 0 && !string.IsNullOrWhiteSpace(result.HtmlTemplate))
            {
                var tokenMatches = Regex.Matches(result.HtmlTemplate, @"\{\{\s*#?/?([a-zA-Z0-9_\.]+)\s*\}\}");
                foreach (Match tm in tokenMatches)
                {
                    var tName = tm.Groups[1].Value;
                    if (!result.Placeholders.Contains(tName))
                    {
                        result.Placeholders.Add(tName);
                    }
                }
            }

            return result;
        }

        /// <summary>
        /// Ensures that the extracted sample content JSON is always fully populated with valid, rich mock schema data.
        /// Prevents empty '{}' strings in database staging table and Workbench live preview.
        /// </summary>
        private static void EnsurePopulatedSampleContentJson(SectionCustomCodeExtractionResponseDto result, string categoryKey, string htmlMarkup)
        {
            if (result == null) return;

            var isMenu = categoryKey.Equals("menu", StringComparison.OrdinalIgnoreCase)
                         || (!string.IsNullOrWhiteSpace(result.HtmlTemplate) && (result.HtmlTemplate.Contains("<header", StringComparison.OrdinalIgnoreCase) || result.HtmlTemplate.Contains("<nav", StringComparison.OrdinalIgnoreCase)));

            if (string.IsNullOrWhiteSpace(result.ExtractedContentJson) || result.ExtractedContentJson.Trim() == "{}" || result.ExtractedContentJson.Trim() == "null" || result.ExtractedContentJson.Trim() == "[]")
            {
                if (isMenu)
                {
                    var menuMock = new
                    {
                        CompanyName = "Enterprise Workspace",
                        Brand = new
                        {
                            Name = "Enterprise Workspace",
                            LogoUrl = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300",
                            WhiteLogoUrl = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300",
                            FaviconUrl = "/favicon.ico",
                            WebsiteUrl = "/",
                            LoginButtonText = "Sign In"
                        },
                        ButtonText = "Let’s Talk",
                        ButtonLink = "/contact",
                        PageCategories = new object[]
                        {
                            new { Title = "Home", DirectUrl = "/", HasChildren = false, Pages = Array.Empty<object>() },
                            new { 
                                Title = "Services", 
                                DirectUrl = "/services", 
                                HasChildren = true, 
                                Pages = new object[]
                                {
                                    new { PageTitle = "Web Solutions", PageUrl = "/services/web", PageDescription = "Custom high-performance web development." },
                                    new { PageTitle = "Cloud Infrastructure", PageUrl = "/services/cloud", PageDescription = "Scalable enterprise cloud architecture." }
                                },
                                Children = new object[]
                                {
                                    new { 
                                        Title = "Digital Capabilities", 
                                        DirectUrl = "/services", 
                                        Pages = new object[]
                                        {
                                            new { PageTitle = "AI Automation", PageUrl = "/services/ai" },
                                            new { PageTitle = "Cyber Security", PageUrl = "/services/security" }
                                        } 
                                    }
                                }
                            },
                            new { Title = "About Us", DirectUrl = "/about", HasChildren = false, Pages = Array.Empty<object>() },
                            new { Title = "Contact", DirectUrl = "/contact", HasChildren = false, Pages = Array.Empty<object>() }
                        }
                    };
                    result.ExtractedContentJson = JsonSerializer.Serialize(menuMock, new JsonSerializerOptions { WriteIndented = true });
                }
                else
                {
                    var genericMock = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["Title"] = "Dynamic Section Heading",
                        ["MiniTitle"] = "Featured Capability",
                        ["Description"] = "Empowering modern organizations with scalable digital solutions and seamless user experience.",
                        ["FullDescription"] = "<p>Empowering modern organizations with scalable digital solutions and seamless user experience.</p>",
                        ["ButtonText"] = "Get Started",
                        ["ButtonLink"] = "#",
                        ["SecondButtonText"] = "View Demo",
                        ["SecondButtonLink"] = "#",
                        ["ImageUrl"] = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600",
                        ["IconText"] = "fa-solid fa-arrow-right",
                        ["SectionLists"] = new object[]
                        {
                            new { Title = "Innovative Strategy", MiniTitle = "01", Description = "End-to-end digital transformation.", ButtonText = "Learn More", ButtonLink = "#", ImageUrl = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600", IconText = "fa-solid fa-star" },
                            new { Title = "Cloud Architecture", MiniTitle = "02", Description = "Scalable infrastructure and security.", ButtonText = "Learn More", ButtonLink = "#", ImageUrl = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600", IconText = "fa-solid fa-cloud" },
                            new { Title = "AI Intelligence", MiniTitle = "03", Description = "Automated workflows and analytics.", ButtonText = "Learn More", ButtonLink = "#", ImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600", IconText = "fa-solid fa-brain" }
                        }
                    };
                    result.ExtractedContentJson = JsonSerializer.Serialize(genericMock, new JsonSerializerOptions { WriteIndented = true });
                }
            }
        }

        /// <summary>
        /// Downloads remote CSS or JS content from a public or Cloudinary CDN URL.
        /// </summary>
        private async Task<string> DownloadRemoteAssetAsync(string url, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

            using var response = await client.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }

        #endregion
    }
}
