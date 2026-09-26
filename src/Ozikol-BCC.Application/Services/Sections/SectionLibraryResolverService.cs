using System;
using System.Collections.Generic;
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
    /// Service responsible for analyzing section and page markup, detecting third-party vendor library signatures
    /// (Bootstrap 5, Swiper, AOS, GLightbox, FontAwesome, Bootstrap Icons, Material Symbols, PureCounter, Typed.js, Isotope),
    /// and generating deduplicated CDN head and footer HTML injections for previews and live tenant websites.
    /// </summary>
    public class SectionLibraryResolverService : ISectionLibraryResolverService
    {
        private readonly IHttpClientFactory? _httpClientFactory;
        private readonly IConfiguration? _configuration;
        private readonly ILogger<SectionLibraryResolverService>? _logger;

        public SectionLibraryResolverService(
            IHttpClientFactory? httpClientFactory = null,
            IConfiguration? configuration = null,
            ILogger<SectionLibraryResolverService>? logger = null)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Central catalog of supported third-party frontend libraries with their verified CDN assets and auto-initializers.
        /// </summary>
        public static readonly Dictionary<string, LibraryAssetDefinition> Catalog = new(StringComparer.OrdinalIgnoreCase)
        {
            ["jquery"] = new()
            {
                Key = "jquery",
                DisplayName = "jQuery 3.7",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://code.jquery.com/jquery-3.7.1.min.js" }
            },
            ["bootstrap"] = new()
            {
                Key = "bootstrap",
                DisplayName = "Bootstrap 5.3",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" },
                AutoInitJs = "document.querySelectorAll('[data-bs-toggle=\"tooltip\"]').forEach(el => new bootstrap.Tooltip(el)); document.querySelectorAll('[data-bs-toggle=\"popover\"]').forEach(el => new bootstrap.Popover(el));"
            },
            ["meanmenu"] = new()
            {
                Key = "meanmenu",
                DisplayName = "MeanMenu Mobile Navigation",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/meanmenu/2.0.8/meanmenu.min.css" },
                JsUrls = new[] { "https://code.jquery.com/jquery-3.7.1.min.js", "https://cdnjs.cloudflare.com/ajax/libs/meanmenu/2.0.8/jquery.meanmenu.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.meanmenu) { jQuery('#mobile-menu, .mainmenu nav, nav#mobile-menu').meanmenu({ meanMenuContainer: '.mobile_menu_bar, .mobile-menu-container', meanScreenWidth: '991' }); }"
            },
            ["nice-select"] = new()
            {
                Key = "nice-select",
                DisplayName = "jQuery Nice Select",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/css/nice-select.min.css" },
                JsUrls = new[] { "https://code.jquery.com/jquery-3.7.1.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/js/jquery.nice-select.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.niceSelect) { jQuery('select').niceSelect(); }"
            },
            ["animate"] = new()
            {
                Key = "animate",
                DisplayName = "Animate.css",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" },
                JsUrls = Array.Empty<string>()
            },
            ["magnific-popup"] = new()
            {
                Key = "magnific-popup",
                DisplayName = "Magnific Popup Lightbox",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/magnific-popup.min.css" },
                JsUrls = new[] { "https://code.jquery.com/jquery-3.7.1.min.js", "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/jquery.magnific-popup.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.magnificPopup) { jQuery('.popup-image, .popup-video').magnificPopup({ type: 'image', gallery: { enabled: true } }); }"
            },
            ["slick"] = new()
            {
                Key = "slick",
                DisplayName = "Slick Carousel",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick.min.css", "https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick-theme.min.css" },
                JsUrls = new[] { "https://code.jquery.com/jquery-3.7.1.min.js", "https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick.min.js" }
            },
            ["wow"] = new()
            {
                Key = "wow",
                DisplayName = "WOW.js Scroll Animations",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js" },
                AutoInitJs = "if (typeof WOW !== 'undefined') { new WOW().init(); }"
            },
            ["gsap"] = new()
            {
                Key = "gsap",
                DisplayName = "GSAP Animation Suite",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js", "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" }
            },
            ["swiper"] = new()
            {
                Key = "swiper",
                DisplayName = "Swiper.js v11",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" }
            },
            ["aos"] = new()
            {
                Key = "aos",
                DisplayName = "AOS Animation on Scroll",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js" },
                AutoInitJs = "if (typeof AOS !== 'undefined') { AOS.init({ duration: 800, once: true }); }"
            },
            ["glightbox"] = new()
            {
                Key = "glightbox",
                DisplayName = "GLightbox Responsive Media",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js" },
                AutoInitJs = "if (typeof GLightbox !== 'undefined') { window._gLightboxes = window._gLightboxes || []; window._gLightboxes.push(GLightbox({ selector: '.glightbox' })); }"
            },
            ["fontawesome"] = new()
            {
                Key = "fontawesome",
                DisplayName = "Font Awesome Icons 6.5",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" },
                JsUrls = Array.Empty<string>()
            },
            ["bootstrap-icons"] = new()
            {
                Key = "bootstrap-icons",
                DisplayName = "Bootstrap Icons",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" },
                JsUrls = Array.Empty<string>()
            },
            ["material-symbols"] = new()
            {
                Key = "material-symbols",
                DisplayName = "Google Material Symbols",
                CssUrls = new[] { "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" },
                JsUrls = Array.Empty<string>()
            },
            ["purecounter"] = new()
            {
                Key = "purecounter",
                DisplayName = "PureCounter.js Vanilla Counters",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/@srexi/purecounterjs/dist/purecounter_vanilla.js" },
                AutoInitJs = "if (typeof PureCounter !== 'undefined') { new PureCounter(); }"
            },
            ["typed"] = new()
            {
                Key = "typed",
                DisplayName = "Typed.js Animated Text",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/typed.js@2.0.12" }
            },
            ["isotope"] = new()
            {
                Key = "isotope",
                DisplayName = "Isotope Grid Filtering",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js" }
            },
            ["odometer"] = new()
            {
                Key = "odometer",
                DisplayName = "Odometer Counter Engine",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/themes/odometer-theme-default.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/odometer.min.js" },
                AutoInitJs = "document.querySelectorAll('.odometer[data-count]').forEach(el => { const val = el.getAttribute('data-count'); if (val) setTimeout(() => { el.innerHTML = val; }, 300); });"
            }
        };

        /// <inheritdoc />
        public List<string> DetectLibraries(string htmlContent, string? rawJs = null)
        {
            var detected = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(htmlContent) && string.IsNullOrWhiteSpace(rawJs))
            {
                return detected.ToList();
            }

            var combinedText = (htmlContent ?? string.Empty) + " " + (rawJs ?? string.Empty);

            // 1. Bootstrap Grid & Components
            if (Regex.IsMatch(combinedText, @"\b(container|container-fluid|row|col|col-\w+|d-flex|modal|dropdown|accordion|navbar|btn-primary|data-bs-|bootstrap\.)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("bootstrap");
            }

            // 2. MeanMenu Mobile Navigation
            if (Regex.IsMatch(combinedText, @"\b(meanmenu|mean-container|mean-bar|meanmenu-reveal|\.meanmenu\(|meanMenuContainer)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("meanmenu");
            }

            // 3. NiceSelect Dropdowns
            if (Regex.IsMatch(combinedText, @"\b(nice-select|\.niceSelect\(|nice_select)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("nice-select");
            }

            // 4. Animate.css / WOW.js
            if (Regex.IsMatch(combinedText, @"\b(animate__animated|animate__fadeIn|wow\s+fadeIn|new\s+WOW)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("animate");
                if (combinedText.Contains("wow", StringComparison.OrdinalIgnoreCase)) detected.Add("wow");
            }

            // 5. Magnific Popup
            if (Regex.IsMatch(combinedText, @"\b(magnificPopup|mfp-|popup-image|popup-video|\.magnificPopup\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("magnific-popup");
            }

            // 6. Slick Slider
            if (Regex.IsMatch(combinedText, @"\b(slick-slider|slick-slide|slick-track|\.slick\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("slick");
            }

            // 7. GSAP / ScrollTrigger
            if (Regex.IsMatch(combinedText, @"\b(gsap\.|ScrollTrigger|TweenMax|TweenLite)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("gsap");
            }

            // 8. Swiper Carousel
            if (Regex.IsMatch(combinedText, @"\b(swiper|swiper-slide|swiper-wrapper|swiper-pagination|swiper-button-|new\s+Swiper)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("swiper");
            }

            // 9. AOS (Animate On Scroll)
            if (combinedText.Contains("data-aos", StringComparison.OrdinalIgnoreCase) || 
                combinedText.Contains("aos-animate", StringComparison.OrdinalIgnoreCase) ||
                combinedText.Contains("AOS.init", StringComparison.OrdinalIgnoreCase))
            {
                detected.Add("aos");
            }

            // 10. GLightbox / Lightbox Popups
            if (Regex.IsMatch(combinedText, @"\b(glightbox|fancybox|data-gallery|data-glightbox|GLightbox\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("glightbox");
            }

            // 11. Icons
            if (Regex.IsMatch(combinedText, @"\b(fa|fas|far|fab|fa-solid|fa-brands|fa-regular|fa-\w+)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("fontawesome");
            }
            if (Regex.IsMatch(combinedText, @"\b(bi|bi-\w+)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("bootstrap-icons");
            }
            if (combinedText.Contains("material-symbols-outlined", StringComparison.OrdinalIgnoreCase) || 
                combinedText.Contains("material-icons", StringComparison.OrdinalIgnoreCase))
            {
                detected.Add("material-symbols");
            }

            // 12. Number Counters (PureCounter & Odometer)
            if (Regex.IsMatch(combinedText, @"\b(purecounter|counter-up|data-purecounter-|new\s+PureCounter)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("purecounter");
            }
            if (Regex.IsMatch(combinedText, @"\b(odometer|odometer-auto-theme|data-count|new\s+Odometer)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("odometer");
            }

            // 13. Typed.js
            if (combinedText.Contains("typed", StringComparison.OrdinalIgnoreCase) || 
                combinedText.Contains("data-typed-items", StringComparison.OrdinalIgnoreCase) ||
                combinedText.Contains("new Typed", StringComparison.OrdinalIgnoreCase))
            {
                detected.Add("typed");
            }

            // 14. Isotope / Grid Filtering
            if (Regex.IsMatch(combinedText, @"\b(isotope-container|isotope-item|portfolio-container|portfolio-filters|new\s+Isotope)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("isotope");
            }

            return detected.ToList();
        }

        /// <inheritdoc />
        public DetectLibrariesResponseDto ResolveAssets(DetectLibrariesRequestDto request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var detected = DetectLibraries(request.HtmlMarkup, request.JsScript);
            var cssUrls = new List<string>();
            var jsUrls = new List<string>();
            var autoInits = new List<string>();

            foreach (var libKey in detected)
            {
                if (Catalog.TryGetValue(libKey, out var def))
                {
                    if (def.CssUrls != null) cssUrls.AddRange(def.CssUrls);
                    if (def.JsUrls != null) jsUrls.AddRange(def.JsUrls);
                    if (!string.IsNullOrWhiteSpace(def.AutoInitJs)) autoInits.Add(def.AutoInitJs);
                }
            }

            var headSb = new StringBuilder();
            foreach (var css in cssUrls.Distinct())
            {
                headSb.AppendLine($"<link rel=\"stylesheet\" href=\"{css}\">");
            }

            var footSb = new StringBuilder();
            foreach (var js in jsUrls.Distinct())
            {
                footSb.AppendLine($"<script src=\"{js}\"></script>");
            }
            if (autoInits.Any())
            {
                footSb.AppendLine("<script>");
                footSb.AppendLine("document.addEventListener('DOMContentLoaded', function() {");
                foreach (var init in autoInits)
                {
                    footSb.AppendLine($"    try {{ {init} }} catch (e) {{ console.warn('Auto-init warning:', e); }}");
                }
                footSb.AppendLine("});");
                footSb.AppendLine("</script>");
            }

            return new DetectLibrariesResponseDto
            {
                DetectedLibraries = detected,
                CssUrls = cssUrls.Distinct().ToList(),
                JsUrls = jsUrls.Distinct().ToList(),
                AutoInitScripts = autoInits,
                HeadHtml = headSb.ToString(),
                FooterHtml = footSb.ToString()
            };
        }

        /// <inheritdoc />
        public async Task<DetectLibrariesResponseDto> ResolveAssetsAsync(
            DetectLibrariesRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            // 1. Instant local catalog detection
            var detected = DetectLibraries(request.HtmlMarkup, request.JsScript);
            var cssUrls = new List<string>();
            var jsUrls = new List<string>();
            var autoInits = new List<string>();

            // 2. Discover any additional unknown libraries via AI (Gemini primary -> DeepSeek failover)
            var aiDiscovered = await DetectLibrariesWithAiAsync(request.HtmlMarkup, request.JsScript, cancellationToken);
            foreach (var aiLib in aiDiscovered)
            {
                if (!detected.Contains(aiLib.Key))
                {
                    detected.Add(aiLib.Key);
                }

                if (aiLib.CssUrls != null) cssUrls.AddRange(aiLib.CssUrls);
                if (aiLib.JsUrls != null) jsUrls.AddRange(aiLib.JsUrls);
                if (!string.IsNullOrWhiteSpace(aiLib.AutoInitJs)) autoInits.Add(aiLib.AutoInitJs);
            }

            // 3. Resolve static catalog assets
            bool hasJqueryDependent = false;
            foreach (var libKey in detected)
            {
                if (Catalog.TryGetValue(libKey, out var def))
                {
                    if (def.CssUrls != null) cssUrls.AddRange(def.CssUrls);
                    if (def.JsUrls != null) jsUrls.AddRange(def.JsUrls);
                    if (!string.IsNullOrWhiteSpace(def.AutoInitJs)) autoInits.Add(def.AutoInitJs);

                    if (libKey.Equals("meanmenu", StringComparison.OrdinalIgnoreCase) ||
                        libKey.Equals("nice-select", StringComparison.OrdinalIgnoreCase) ||
                        libKey.Equals("magnific-popup", StringComparison.OrdinalIgnoreCase) ||
                        libKey.Equals("slick", StringComparison.OrdinalIgnoreCase))
                    {
                        hasJqueryDependent = true;
                    }
                }
            }

            // Ensure jQuery is loaded first if any jQuery plugin is present
            if (hasJqueryDependent && !jsUrls.Any(u => u.Contains("jquery", StringComparison.OrdinalIgnoreCase)))
            {
                if (Catalog.TryGetValue("jquery", out var jqueryDef) && jqueryDef.JsUrls != null)
                {
                    jsUrls.InsertRange(0, jqueryDef.JsUrls);
                }
            }

            var headSb = new StringBuilder();
            foreach (var css in cssUrls.Distinct())
            {
                headSb.AppendLine($"<link rel=\"stylesheet\" href=\"{css}\">");
            }

            var footSb = new StringBuilder();
            foreach (var js in jsUrls.Distinct())
            {
                footSb.AppendLine($"<script src=\"{js}\"></script>");
            }
            if (autoInits.Any())
            {
                footSb.AppendLine("<script>");
                footSb.AppendLine("document.addEventListener('DOMContentLoaded', function() {");
                foreach (var init in autoInits.Distinct())
                {
                    footSb.AppendLine($"    try {{ {init} }} catch (e) {{ console.warn('Auto-init warning:', e); }}");
                }
                footSb.AppendLine("});");
                footSb.AppendLine("</script>");
            }

            return new DetectLibrariesResponseDto
            {
                DetectedLibraries = detected,
                CssUrls = cssUrls.Distinct().ToList(),
                JsUrls = jsUrls.Distinct().ToList(),
                AutoInitScripts = autoInits.Distinct().ToList(),
                HeadHtml = headSb.ToString(),
                FooterHtml = footSb.ToString()
            };
        }

        /// <inheritdoc />
        public async Task<List<LibraryAssetDefinition>> DetectLibrariesWithAiAsync(
            string htmlContent, 
            string? rawJs = null, 
            CancellationToken cancellationToken = default)
        {
            var results = new List<LibraryAssetDefinition>();
            if (string.IsNullOrWhiteSpace(htmlContent) && string.IsNullOrWhiteSpace(rawJs))
            {
                return results;
            }

            var systemPrompt = @"You are an Expert Web Frontend Library & CDN Dependency Resolver.
Analyze the provided HTML markup and JavaScript code.
Identify ANY third-party JavaScript plugins, CSS animation suites, or UI components used (e.g. meanmenu, nice-select, animate.css, slick, isotope, magnific-popup, gsap, odometer, purecounter, etc.).
For each detected library, provide its verified public CDN links (cdnjs or jsdelivr).

Return ONLY a JSON array matching this exact schema:
[
  {
    ""key"": ""meanmenu"",
    ""displayName"": ""MeanMenu Mobile Navigation"",
    ""cssUrls"": [""https://cdnjs.cloudflare.com/ajax/libs/meanmenu/2.0.8/meanmenu.min.css""],
    ""jsUrls"": [""https://cdnjs.cloudflare.com/ajax/libs/meanmenu/2.0.8/jquery.meanmenu.min.js""],
    ""autoInitJs"": ""if (typeof jQuery !== 'undefined' && jQuery.fn.meanmenu) { jQuery('nav#mobile-menu').meanmenu(); }""
  }
]";

            var userPrompt = $@"HTML CODE:
{htmlContent}

CUSTOM JS CODE:
{rawJs ?? string.Empty}

Identify all required external libraries and their CDN links.";

            // 1. Attempt Primary AI: Gemini 2.5 Flash
            var geminiKey = ResolveApiKey("GEMINI_API_KEY", "GeminiApiKey", "AiSettings:GeminiApiKey");
            if (!string.IsNullOrWhiteSpace(geminiKey) && _httpClientFactory != null)
            {
                try
                {
                    _logger?.LogInformation("Detecting libraries with Primary AI (Gemini 2.5 Flash)...");
                    var geminiResult = await CallGeminiForLibrariesAsync(geminiKey, systemPrompt, userPrompt, cancellationToken);
                    if (geminiResult != null && geminiResult.Count > 0)
                    {
                        return geminiResult;
                    }
                }
                catch (Exception gemEx)
                {
                    _logger?.LogWarning(gemEx, "Primary AI library detection (Gemini) failed. Failing over to DeepSeek...");
                }
            }

            // 2. Failover AI: DeepSeek
            var deepSeekKey = ResolveApiKey("DEEPSEEK_API_KEY", "DeepSeekApiKey", "AiSettings:DeepSeekApiKey");
            if (!string.IsNullOrWhiteSpace(deepSeekKey) && _httpClientFactory != null)
            {
                try
                {
                    _logger?.LogInformation("Detecting libraries with Failover AI (DeepSeek)...");
                    var deepSeekResult = await CallDeepSeekForLibrariesAsync(deepSeekKey, systemPrompt, userPrompt, cancellationToken);
                    if (deepSeekResult != null && deepSeekResult.Count > 0)
                    {
                        return deepSeekResult;
                    }
                }
                catch (Exception dsEx)
                {
                    _logger?.LogError(dsEx, "DeepSeek library detection failover also failed.");
                }
            }

            return results;
        }

        private async Task<List<LibraryAssetDefinition>> CallGeminiForLibrariesAsync(
            string apiKey, 
            string systemPrompt, 
            string userPrompt, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory!.CreateClient();
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
                .GetString() ?? "[]";

            return ParseAiLibrariesResponse(text);
        }

        private async Task<List<LibraryAssetDefinition>> CallDeepSeekForLibrariesAsync(
            string apiKey, 
            string systemPrompt, 
            string userPrompt, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory!.CreateClient();
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
            var text = doc?.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "[]";

            return ParseAiLibrariesResponse(text);
        }

        private static List<LibraryAssetDefinition> ParseAiLibrariesResponse(string rawJson)
        {
            var cleaned = Regex.Replace(rawJson.Trim(), @"^```json\s*", string.Empty, RegexOptions.Multiline);
            cleaned = Regex.Replace(cleaned, @"^```\s*$", string.Empty, RegexOptions.Multiline).Trim();

            try
            {
                // If wrapped in an object like { "libraries": [...] }
                if (cleaned.StartsWith("{"))
                {
                    using var doc = JsonDocument.Parse(cleaned);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        if (prop.Value.ValueKind == JsonValueKind.Array)
                        {
                            var list = JsonSerializer.Deserialize<List<LibraryAssetDefinition>>(prop.Value.GetRawText(), new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            });
                            if (list != null) return list;
                        }
                    }
                }

                return JsonSerializer.Deserialize<List<LibraryAssetDefinition>>(cleaned, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new List<LibraryAssetDefinition>();
            }
            catch
            {
                return new List<LibraryAssetDefinition>();
            }
        }

        private string? ResolveApiKey(params string[] configKeys)
        {
            if (_configuration == null) return null;
            foreach (var key in configKeys)
            {
                var val = _configuration[key] ?? Environment.GetEnvironmentVariable(key);
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
            return null;
        }

        /// <inheritdoc />
        public string GenerateHeadHtml(IEnumerable<SectionAssetPayloadDto> sections)
        {
            if (sections == null) return string.Empty;

            var sb = new StringBuilder();
            var neededLibraries = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var sectionList = sections.ToList();
            foreach (var sec in sectionList)
            {
                if (sec.RequiredLibraries != null)
                {
                    foreach (var lib in sec.RequiredLibraries) neededLibraries.Add(lib);
                }
            }

            // 1. Deduplicated CDN Stylesheets
            var emittedCss = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var libKey in neededLibraries)
            {
                if (Catalog.TryGetValue(libKey, out var def) && def.CssUrls != null)
                {
                    foreach (var css in def.CssUrls)
                    {
                        if (emittedCss.Add(css))
                        {
                            sb.AppendLine($"<link rel=\"stylesheet\" href=\"{css}\">");
                        }
                    }
                }
            }

            // 2. Scoped Custom Styles for each section
            foreach (var sec in sectionList.Where(s => !string.IsNullOrWhiteSpace(s.ScopedCss)))
            {
                sb.AppendLine($"<style data-section=\"{sec.VariantCode}\">");
                sb.AppendLine(sec.ScopedCss);
                sb.AppendLine("</style>");
            }

            return sb.ToString();
        }

        /// <inheritdoc />
        public string GenerateFooterHtml(IEnumerable<SectionAssetPayloadDto> sections)
        {
            if (sections == null) return string.Empty;

            var sb = new StringBuilder();
            var neededLibraries = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var autoInits = new List<string>();

            var sectionList = sections.ToList();
            foreach (var sec in sectionList)
            {
                if (sec.RequiredLibraries != null)
                {
                    foreach (var lib in sec.RequiredLibraries) neededLibraries.Add(lib);
                }
            }

            // 1. Deduplicated Vendor CDN Scripts
            var emittedJs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var libKey in neededLibraries)
            {
                if (Catalog.TryGetValue(libKey, out var def))
                {
                    if (def.JsUrls != null)
                    {
                        foreach (var js in def.JsUrls)
                        {
                            if (emittedJs.Add(js))
                            {
                                sb.AppendLine($"<script src=\"{js}\"></script>");
                            }
                        }
                    }
                    if (!string.IsNullOrWhiteSpace(def.AutoInitJs))
                    {
                        autoInits.Add(def.AutoInitJs);
                    }
                }
            }

            // 2. Global Auto-Initializers (run once when DOM is ready)
            if (autoInits.Any())
            {
                sb.AppendLine("<script>");
                sb.AppendLine("document.addEventListener('DOMContentLoaded', function() {");
                foreach (var init in autoInits.Distinct())
                {
                    sb.AppendLine($"    try {{ {init} }} catch (e) {{ console.warn('Auto-init warning:', e); }}");
                }
                sb.AppendLine("});");
                sb.AppendLine("</script>");
            }

            // 3. Isolated Section JavaScript IIFEs
            foreach (var sec in sectionList.Where(s => !string.IsNullOrWhiteSpace(s.JsScript)))
            {
                sb.AppendLine($"<script data-section=\"{sec.VariantCode}\">");
                sb.AppendLine("(function() {");
                sb.AppendLine($"    // Isolated script for section: {sec.VariantCode}");
                sb.AppendLine(sec.JsScript);
                sb.AppendLine("})();");
                sb.AppendLine("</script>");
            }

            return sb.ToString();
        }
    }
}
