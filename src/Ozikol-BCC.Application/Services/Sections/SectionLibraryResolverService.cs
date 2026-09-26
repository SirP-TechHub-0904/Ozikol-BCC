using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
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
        /// <summary>
        /// Central catalog of supported third-party frontend libraries with their verified CDN assets and auto-initializers.
        /// </summary>
        public static readonly Dictionary<string, LibraryAssetDefinition> Catalog = new(StringComparer.OrdinalIgnoreCase)
        {
            ["bootstrap"] = new()
            {
                Key = "bootstrap",
                DisplayName = "Bootstrap 5.3",
                CssUrls = new[] { "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
                JsUrls = new[] { "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" },
                AutoInitJs = "document.querySelectorAll('[data-bs-toggle=\"tooltip\"]').forEach(el => new bootstrap.Tooltip(el)); document.querySelectorAll('[data-bs-toggle=\"popover\"]').forEach(el => new bootstrap.Popover(el));"
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

            // 2. Swiper Carousel
            if (Regex.IsMatch(combinedText, @"\b(swiper|swiper-slide|swiper-wrapper|swiper-pagination|swiper-button-|new\s+Swiper)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("swiper");
            }

            // 3. AOS (Animate On Scroll)
            if (combinedText.Contains("data-aos", StringComparison.OrdinalIgnoreCase) || 
                combinedText.Contains("aos-animate", StringComparison.OrdinalIgnoreCase) ||
                combinedText.Contains("AOS.init", StringComparison.OrdinalIgnoreCase))
            {
                detected.Add("aos");
            }

            // 4. GLightbox / Lightbox Popups
            if (Regex.IsMatch(combinedText, @"\b(glightbox|fancybox|data-gallery|data-glightbox|GLightbox\()\b", RegexOptions.IgnoreCase))
            {
                detected.Add("glightbox");
            }

            // 5. Icons
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

            // 6. Number Counters (PureCounter & Odometer)
            if (Regex.IsMatch(combinedText, @"\b(purecounter|counter-up|data-purecounter-|new\s+PureCounter)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("purecounter");
            }
            if (Regex.IsMatch(combinedText, @"\b(odometer|odometer-auto-theme|data-count|new\s+Odometer)\b", RegexOptions.IgnoreCase))
            {
                detected.Add("odometer");
            }

            // 7. Typed.js
            if (combinedText.Contains("typed", StringComparison.OrdinalIgnoreCase) || 
                combinedText.Contains("data-typed-items", StringComparison.OrdinalIgnoreCase) ||
                combinedText.Contains("new Typed", StringComparison.OrdinalIgnoreCase))
            {
                detected.Add("typed");
            }

            // 8. Isotope / Grid Filtering
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
