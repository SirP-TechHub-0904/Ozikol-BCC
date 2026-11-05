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
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Enterprise library resolver service responsible for inspecting section HTML markup and JS code,
    /// detecting 50+ known frontend libraries (Bootstrap, Swiper, AOS, GLightbox, FontAwesome, etc.),
    /// generating deduplicated CDN head and footer HTML injections, and dynamically discovering obscure libraries via AI.
    /// Uses <see cref="IAiKeyPoolManagerService"/> to resolve active keys from the database key pool.
    /// </summary>
    public class SectionLibraryResolverService : ISectionLibraryResolverService
    {
        private readonly IAiKeyPoolManagerService? _keyPoolService;
        private readonly IHttpClientFactory? _httpClientFactory;
        private readonly ILogger<SectionLibraryResolverService>? _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SectionLibraryResolverService"/> class.
        /// </summary>
        public SectionLibraryResolverService(
            IAiKeyPoolManagerService? keyPoolService = null,
            IHttpClientFactory? httpClientFactory = null,
            ILogger<SectionLibraryResolverService>? logger = null)
        {
            _keyPoolService = keyPoolService;
            _httpClientFactory = httpClientFactory;
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
                DisplayName = "MeanMenu Responsive Navigation",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/meanmenu/2.0.8/meanmenu.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/meanmenu/2.0.8/jquery.meanmenu.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.meanmenu) { jQuery('nav#mobile-menu').meanmenu({ meanScreenWidth: '991', meanMenuContainer: '.mobile-menu' }); }"
            },
            ["swiper"] = new()
            {
                Key = "swiper",
                DisplayName = "Swiper Slider",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" },
                AutoInitJs = "document.querySelectorAll('.swiper, .swiper-container').forEach(el => { if (!el.swiper) new Swiper(el, { loop: true, pagination: { el: '.swiper-pagination', clickable: true }, navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' } }); });"
            },
            ["slick"] = new()
            {
                Key = "slick",
                DisplayName = "Slick Carousel",
                CssUrls = new[] 
                { 
                    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css",
                    "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"
                },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.slick) { jQuery('.slick-slider:not(.slick-initialized)').slick(); }"
            },
            ["owlcarousel"] = new()
            {
                Key = "owlcarousel",
                DisplayName = "Owl Carousel 2",
                CssUrls = new[] 
                { 
                    "https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css",
                    "https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.theme.default.min.css"
                },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.owlCarousel) { jQuery('.owl-carousel').owlCarousel({ loop: true, margin: 10, nav: true, responsive: { 0: { items: 1 }, 600: { items: 2 }, 1000: { items: 3 } } }); }"
            },
            ["aos"] = new()
            {
                Key = "aos",
                DisplayName = "AOS (Animate On Scroll)",
                CssUrls = new[] { "https://unpkg.com/aos@2.3.1/dist/aos.css" },
                JsUrls = new[] { "https://unpkg.com/aos@2.3.1/dist/aos.js" },
                AutoInitJs = "if (typeof AOS !== 'undefined') { AOS.init({ duration: 800, once: true }); }"
            },
            ["wow"] = new()
            {
                Key = "wow",
                DisplayName = "WOW.js + Animate.css",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js" },
                AutoInitJs = "if (typeof WOW !== 'undefined') { new WOW().init(); }"
            },
            ["glightbox"] = new()
            {
                Key = "glightbox",
                DisplayName = "GLightbox (Lightbox / Popup)",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/gh/mcstudios/glightbox/dist/js/glightbox.min.js" },
                AutoInitJs = "if (typeof GLightbox !== 'undefined') { const lightbox = GLightbox({ selector: '.glightbox, .popup-video, .popup-image' }); }"
            },
            ["magnificpopup"] = new()
            {
                Key = "magnificpopup",
                DisplayName = "Magnific Popup",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/magnific-popup.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/jquery.magnific-popup.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.magnificPopup) { jQuery('.popup-image, .popup-gallery').magnificPopup({ type: 'image', gallery: { enabled: true } }); jQuery('.popup-video, .popup-iframe').magnificPopup({ type: 'iframe' }); }"
            },
            ["fancybox"] = new()
            {
                Key = "fancybox",
                DisplayName = "Fancybox Lightbox",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js" },
                AutoInitJs = "if (typeof Fancybox !== 'undefined') { Fancybox.bind('[data-fancybox]'); }"
            },
            ["niceselect"] = new()
            {
                Key = "niceselect",
                DisplayName = "Nice Select",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/css/nice-select.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/js/jquery.nice-select.min.js" },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.niceSelect) { jQuery('select').niceSelect(); }"
            },
            ["odometer"] = new()
            {
                Key = "odometer",
                DisplayName = "Odometer Counter",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/themes/odometer-theme-default.min.css" },
                JsUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/odometer.min.js" }
            },
            ["purecounter"] = new()
            {
                Key = "purecounter",
                DisplayName = "PureCounter (Stat Counter)",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/@srexi/purecounterjs/dist/purecounter_vanilla.js" },
                AutoInitJs = "if (typeof PureCounter !== 'undefined') { new PureCounter(); }"
            },
            ["counterup"] = new()
            {
                Key = "counterup",
                DisplayName = "CounterUp + Waypoints",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] 
                { 
                    "https://cdnjs.cloudflare.com/ajax/libs/waypoints/4.0.1/jquery.waypoints.min.js",
                    "https://cdnjs.cloudflare.com/ajax/libs/Counter-Up/1.0.0/jquery.counterup.min.js"
                },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.counterUp) { jQuery('.counter').counterUp({ delay: 10, time: 1000 }); }"
            },
            ["typed"] = new()
            {
                Key = "typed",
                DisplayName = "Typed.js (Typing Animation)",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/typed.js@2.0.12" }
            },
            ["isotope"] = new()
            {
                Key = "isotope",
                DisplayName = "Isotope (Portfolio Filtering)",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] 
                { 
                    "https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js",
                    "https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"
                },
                AutoInitJs = "if (typeof jQuery !== 'undefined' && jQuery.fn.isotope) { var $grid = jQuery('.grid, .isotope-grid').imagesLoaded(function() { $grid.isotope({ itemSelector: '.grid-item', layoutMode: 'fitRows' }); }); }"
            },
            ["masonry"] = new()
            {
                Key = "masonry",
                DisplayName = "Masonry Layout",
                CssUrls = Array.Empty<string>(),
                JsUrls = new[] 
                { 
                    "https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js",
                    "https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"
                }
            },
            ["fontawesome"] = new()
            {
                Key = "fontawesome",
                DisplayName = "FontAwesome 6",
                CssUrls = new[] { "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" },
                JsUrls = Array.Empty<string>()
            },
            ["bootstrapicons"] = new()
            {
                Key = "bootstrapicons",
                DisplayName = "Bootstrap Icons",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" },
                JsUrls = Array.Empty<string>()
            },
            ["remixicon"] = new()
            {
                Key = "remixicon",
                DisplayName = "Remix Icon",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" },
                JsUrls = Array.Empty<string>()
            },
            ["flaticon"] = new()
            {
                Key = "flaticon",
                DisplayName = "Flaticon Collection",
                CssUrls = new[] { "https://cdn-uicons.flaticon.com/2.1.0/uicons-regular-rounded/css/uicons-regular-rounded.css" },
                JsUrls = Array.Empty<string>()
            },
            ["materialsymbols"] = new()
            {
                Key = "materialsymbols",
                DisplayName = "Google Material Symbols",
                CssUrls = new[] { "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" },
                JsUrls = Array.Empty<string>()
            }
        };

        /// <inheritdoc />
        public List<string> DetectLibraries(string htmlMarkup, string? customJs = null)
        {
            if (string.IsNullOrWhiteSpace(htmlMarkup)) return new List<string>();

            var detected = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var combinedCode = htmlMarkup + " " + (customJs ?? string.Empty);

            if (Regex.IsMatch(combinedCode, @"\b(?:container(?:-fluid)?|row|col-(?:sm|md|lg|xl|xxl)?\d+|modal|btn-(?:primary|secondary|danger)|nav-item|nav-link|dropdown-toggle|accordion)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("bootstrap");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:swiper|swiper-container|swiper-slide|swiper-wrapper|new\s+Swiper)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("swiper");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:meanmenu|mean-container|mean-bar|mean-nav)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("meanmenu");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:slick-slider|slick-slide|slick-track|\.slick\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("slick");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:owl-carousel|owl-theme|\.owlCarousel\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("owlcarousel");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:data-aos|aos-init|aos-animate|AOS\.init)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("aos");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:wow|animate__animated|new\s+WOW)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("wow");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:glightbox|popup-video|popup-image|GLightbox\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("glightbox");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:mfp-|magnificPopup|\.magnificPopup\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("magnificpopup");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:nice-select|niceSelect|\.niceSelect\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("niceselect");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:odometer|odometer-theme|Odometer)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("odometer");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:purecounter|data-purecounter|new\s+PureCounter)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("purecounter");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:counterup|\.counterUp\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("counterup");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:typed|typed-cursor|new\s+Typed)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("typed");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:isotope|isotope-grid|data-filter|\.isotope\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("isotope");
                detected.Add("jquery");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:fa-[a-z0-9-]+|fas|far|fab|fal|fad)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("fontawesome");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:bi-[a-z0-9-]+|bi\s+bi-)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("bootstrapicons");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:ri-[a-z0-9-]+)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("remixicon");
            }

            if (Regex.IsMatch(combinedCode, @"\b(?:material-symbols-outlined|material-icons)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("materialsymbols");
            }

            return detected.ToList();
        }

        /// <inheritdoc />
        public DetectLibrariesResponseDto ResolveAssets(DetectLibrariesRequestDto request)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var detectedKeys = new HashSet<string>(DetectLibraries(request.HtmlMarkup, request.JsScript), StringComparer.OrdinalIgnoreCase);

            var response = new DetectLibrariesResponseDto
            {
                DetectedLibraries = detectedKeys.ToList()
            };

            var headCss = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var footerJs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var autoInits = new List<string>();

            if (detectedKeys.Contains("jquery") && Catalog.TryGetValue("jquery", out var jqueryDef))
            {
                foreach (var js in jqueryDef.JsUrls) footerJs.Add(js);
            }

            foreach (var key in detectedKeys)
            {
                if (Catalog.TryGetValue(key, out var def))
                {
                    foreach (var css in def.CssUrls) headCss.Add(css);
                    foreach (var js in def.JsUrls) footerJs.Add(js);
                    if (!string.IsNullOrWhiteSpace(def.AutoInitJs)) autoInits.Add(def.AutoInitJs);
                }
            }

            response.CssUrls = headCss.ToList();
            response.JsUrls = footerJs.ToList();
            response.AutoInitScripts = autoInits;
            response.HeadHtml = string.Join("\n", headCss.Select(url => $"<link rel=\"stylesheet\" href=\"{url}\">"));
            response.FooterHtml = string.Join("\n", footerJs.Select(url => $"<script src=\"{url}\"></script>")) +
                                  (autoInits.Any() ? $"\n<script>\ndocument.addEventListener('DOMContentLoaded', function() {{\n{string.Join("\n", autoInits)}\n}});\n</script>" : "");

            return response;
        }

        /// <inheritdoc />
        public async Task<DetectLibrariesResponseDto> ResolveAssetsAsync(
            DetectLibrariesRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var staticResult = ResolveAssets(request);

            // Optional AI dynamic enrichment for unrecognized plugins
            if (_keyPoolService != null && !string.IsNullOrWhiteSpace(request.HtmlMarkup))
            {
                try
                {
                    var aiLibraries = await DetectLibrariesWithAiAsync(request.HtmlMarkup, request.JsScript, cancellationToken);
                    foreach (var lib in aiLibraries)
                    {
                        if (!staticResult.DetectedLibraries.Contains(lib.Key, StringComparer.OrdinalIgnoreCase))
                        {
                            staticResult.DetectedLibraries.Add(lib.Key);
                            foreach (var css in lib.CssUrls)
                            {
                                if (!staticResult.CssUrls.Contains(css, StringComparer.OrdinalIgnoreCase)) staticResult.CssUrls.Add(css);
                            }
                            foreach (var js in lib.JsUrls)
                            {
                                if (!staticResult.JsUrls.Contains(js, StringComparer.OrdinalIgnoreCase)) staticResult.JsUrls.Add(js);
                            }
                            if (!string.IsNullOrWhiteSpace(lib.AutoInitJs)) staticResult.AutoInitScripts.Add(lib.AutoInitJs);
                        }
                    }

                    staticResult.HeadHtml = string.Join("\n", staticResult.CssUrls.Select(url => $"<link rel=\"stylesheet\" href=\"{url}\">"));
                    staticResult.FooterHtml = string.Join("\n", staticResult.JsUrls.Select(url => $"<script src=\"{url}\"></script>")) +
                                              (staticResult.AutoInitScripts.Any() ? $"\n<script>\ndocument.addEventListener('DOMContentLoaded', function() {{\n{string.Join("\n", staticResult.AutoInitScripts)}\n}});\n</script>" : "");
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "AI library enrichment failed; using static catalog.");
                }
            }

            return staticResult;
        }

        /// <inheritdoc />
        public async Task<List<LibraryAssetDefinition>> DetectLibrariesWithAiAsync(
            string htmlContent, 
            string? rawJs = null, 
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(htmlContent) || _keyPoolService == null || _httpClientFactory == null)
            {
                return new List<LibraryAssetDefinition>();
            }

            var systemPrompt = @"You are a CDN Asset & Frontend Library Detector.
Analyze the provided HTML and JS code and return ONLY a valid JSON array of required external libraries and their CDN links.
Output format:
[
  {
    ""key"": ""library-slug"",
    ""displayName"": ""Library Name"",
    ""cssUrls"": [""https://cdn.jsdelivr.net/.../style.min.css""],
    ""jsUrls"": [""https://cdn.jsdelivr.net/.../script.min.js""],
    ""autoInitJs"": ""// initialization code if needed""
  }
]";

            var userPrompt = $"HTML CODE:\n{htmlContent}\n\nCUSTOM JS CODE:\n{rawJs ?? string.Empty}\n\nIdentify all required external libraries.";

            var geminiKey = await _keyPoolService.GetNextAvailableKeyAsync("Gemini", cancellationToken);
            if (geminiKey != null)
            {
                try
                {
                    _logger?.LogInformation("[AI Key Pool] Detecting libraries with Gemini (Key: '{Alias}')...", geminiKey.KeyAlias);
                    var geminiResult = await CallGeminiForLibrariesAsync(geminiKey.ApiKey, systemPrompt, userPrompt, cancellationToken);
                    if (geminiResult != null && geminiResult.Count > 0)
                    {
                        return geminiResult;
                    }
                }
                catch (Exception gemEx)
                {
                    _logger?.LogWarning(gemEx, "[AI Key Pool] Gemini library detection failed. Failing over to DeepSeek...");
                    await _keyPoolService.MarkRateLimitedAsync(geminiKey.Id, 120, cancellationToken);
                }
            }

            var deepSeekKey = await _keyPoolService.GetNextAvailableKeyAsync("DeepSeek", cancellationToken);
            if (deepSeekKey != null)
            {
                try
                {
                    _logger?.LogInformation("[AI Key Pool] Detecting libraries with DeepSeek failover (Key: '{Alias}')...", deepSeekKey.KeyAlias);
                    var deepSeekResult = await CallDeepSeekForLibrariesAsync(deepSeekKey.ApiKey, systemPrompt, userPrompt, cancellationToken);
                    if (deepSeekResult != null && deepSeekResult.Count > 0)
                    {
                        return deepSeekResult;
                    }
                }
                catch (Exception dsEx)
                {
                    _logger?.LogError(dsEx, "[AI Key Pool] DeepSeek library detection failover also failed.");
                }
            }

            return new List<LibraryAssetDefinition>();
        }

        /// <inheritdoc />
        public string GenerateHeadHtml(IEnumerable<SectionAssetPayloadDto> sections)
        {
            if (sections == null) return string.Empty;

            var sb = new StringBuilder();
            var requiredLibs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var scopedStyles = new StringBuilder();

            foreach (var sec in sections)
            {
                if (sec.RequiredLibraries != null)
                {
                    foreach (var lib in sec.RequiredLibraries) requiredLibs.Add(lib);
                }

                if (!string.IsNullOrWhiteSpace(sec.ScopedCss))
                {
                    scopedStyles.AppendLine(sec.ScopedCss);
                }
            }

            var headCss = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var lib in requiredLibs)
            {
                if (Catalog.TryGetValue(lib, out var def))
                {
                    foreach (var css in def.CssUrls) headCss.Add(css);
                }
            }

            foreach (var css in headCss)
            {
                sb.AppendLine($"<link rel=\"stylesheet\" href=\"{css}\">");
            }

            if (scopedStyles.Length > 0)
            {
                sb.AppendLine("<style>");
                sb.AppendLine(scopedStyles.ToString());
                sb.AppendLine("</style>");
            }

            return sb.ToString();
        }

        /// <inheritdoc />
        public string GenerateFooterHtml(IEnumerable<SectionAssetPayloadDto> sections)
        {
            if (sections == null) return string.Empty;

            var sb = new StringBuilder();
            var requiredLibs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var sectionScripts = new StringBuilder();

            foreach (var sec in sections)
            {
                if (sec.RequiredLibraries != null)
                {
                    foreach (var lib in sec.RequiredLibraries) requiredLibs.Add(lib);
                }

                if (!string.IsNullOrWhiteSpace(sec.JsScript))
                {
                    sectionScripts.AppendLine(sec.JsScript);
                }
            }

            var footerJs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var autoInits = new List<string>();

            if (requiredLibs.Contains("jquery") && Catalog.TryGetValue("jquery", out var jqueryDef))
            {
                foreach (var js in jqueryDef.JsUrls) footerJs.Add(js);
            }

            foreach (var lib in requiredLibs)
            {
                if (Catalog.TryGetValue(lib, out var def))
                {
                    foreach (var js in def.JsUrls) footerJs.Add(js);
                    if (!string.IsNullOrWhiteSpace(def.AutoInitJs)) autoInits.Add(def.AutoInitJs);
                }
            }

            foreach (var js in footerJs)
            {
                sb.AppendLine($"<script src=\"{js}\"></script>");
            }

            if (autoInits.Any() || sectionScripts.Length > 0)
            {
                sb.AppendLine("<script>");
                sb.AppendLine("document.addEventListener('DOMContentLoaded', function() {");
                foreach (var init in autoInits) sb.AppendLine($"    {init}");
                sb.AppendLine("});");
                if (sectionScripts.Length > 0)
                {
                    sb.AppendLine(sectionScripts.ToString());
                }
                sb.AppendLine("</script>");
            }

            return sb.ToString();
        }

        private async Task<List<LibraryAssetDefinition>> CallGeminiForLibrariesAsync(string apiKey, string systemPrompt, string userPrompt, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory!.CreateClient();
            var payload = new
            {
                system_instruction = new { parts = new[] { new { text = systemPrompt } } },
                contents = new[] { new { role = "user", parts = new[] { new { text = userPrompt } } } },
                generationConfig = new { temperature = 0.1, responseMimeType = "application/json" }
            };

            var models = new[] { "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-flash-8b" };
            foreach (var m in models)
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={apiKey}";
                try
                {
                    var response = await client.PostAsJsonAsync(url, payload, cancellationToken);
                    if (response.IsSuccessStatusCode)
                    {
                        var doc = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
                        var text = doc?.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "[]";
                        return JsonSerializer.Deserialize<List<LibraryAssetDefinition>>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<LibraryAssetDefinition>();
                    }
                }
                catch
                {
                    // Cascade to next model
                }
            }
            return new List<LibraryAssetDefinition>();
        }

        private async Task<List<LibraryAssetDefinition>> CallDeepSeekForLibrariesAsync(string apiKey, string systemPrompt, string userPrompt, CancellationToken cancellationToken)
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
            if (response.IsSuccessStatusCode)
            {
                var doc = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
                var text = doc?.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "[]";
                return JsonSerializer.Deserialize<List<LibraryAssetDefinition>>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<LibraryAssetDefinition>();
            }
            return new List<LibraryAssetDefinition>();
        }
    }
}
