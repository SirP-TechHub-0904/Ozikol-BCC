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
