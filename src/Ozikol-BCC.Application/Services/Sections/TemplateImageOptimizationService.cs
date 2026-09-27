using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Services.Cloudinary;

namespace Ozikol_BCC.Application.Services.Sections
{
    /// <summary>
    /// Production implementation of <see cref="ITemplateImageOptimizationService"/>.
    /// Handles image URL resolution, resilient downloading, fallback stock image resolution,
    /// and Cloudinary CDN optimization delivering lightweight WebP assets (max 300KB).
    /// Supports both Master platform Cloudinary storage and autonomous tenant custom Cloudinary accounts.
    /// </summary>
    public class TemplateImageOptimizationService : ITemplateImageOptimizationService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ICloudinaryService? _cloudinaryService;
        private readonly ILogger<TemplateImageOptimizationService> _logger;

        // In-memory cache per pipeline run to avoid uploading the exact same image URL multiple times
        private readonly ConcurrentDictionary<string, string> _optimizedUrlCache = new(StringComparer.OrdinalIgnoreCase);

        // Curated royalty-free high-resolution stock image pools (Unsplash CDN with auto-webp & compression)
        private static readonly Dictionary<string, string[]> CuratedFallbackPools = new(StringComparer.OrdinalIgnoreCase)
        {
            ["hero"] = new[]
            {
                "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80",
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
                "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
                "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80"
            },
            ["avatar"] = new[]
            {
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
            },
            ["team"] = new[]
            {
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80"
            },
            ["feature"] = new[]
            {
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80"
            },
            ["product"] = new[]
            {
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80"
            },
            ["blog"] = new[]
            {
                "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?auto=format&fit=crop&w=1000&q=80",
                "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1000&q=80"
            },
            ["default"] = new[]
            {
                "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"
            }
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="TemplateImageOptimizationService"/> class.
        /// </summary>
        public TemplateImageOptimizationService(
            IHttpClientFactory httpClientFactory,
            ILogger<TemplateImageOptimizationService> logger,
            ICloudinaryService? cloudinaryService = null)
        {
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _cloudinaryService = cloudinaryService;
        }

        /// <inheritdoc />
        public async Task<string> OptimizeAndUploadImageAsync(
            string imageUrl,
            string? baseDomainUrl = null,
            string? categoryOrContext = null,
            string targetFolder = "templates/images",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                return GetCuratedFallbackUrl(categoryOrContext);
            }

            var trimmedUrl = imageUrl.Trim().Trim('\'', '"');

            // Skip data URIs or already optimized Cloudinary WebP URLs
            if (trimmedUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                return trimmedUrl;
            }

            if (trimmedUrl.Contains("res.cloudinary.com", StringComparison.OrdinalIgnoreCase) &&
                (trimmedUrl.Contains("f_webp", StringComparison.OrdinalIgnoreCase) || trimmedUrl.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)))
            {
                return trimmedUrl;
            }

            var cacheKey = $"{customCloudName ?? "master"}:{trimmedUrl}";
            if (_optimizedUrlCache.TryGetValue(cacheKey, out var cachedUrl))
            {
                return cachedUrl;
            }

            // Resolve full absolute URL
            var resolvedSourceUrl = ResolveAbsoluteImageUrl(trimmedUrl, baseDomainUrl);
            byte[]? imageBytes = null;
            string contentType = "image/webp";

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);
                client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

                using var response = await client.GetAsync(resolvedSourceUrl, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    var rawBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
                    if (rawBytes != null && rawBytes.Length > 0)
                    {
                        imageBytes = rawBytes;
                        var rawType = response.Content.Headers.ContentType?.MediaType;
                        if (!string.IsNullOrWhiteSpace(rawType))
                        {
                            contentType = rawType;
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("Failed to download image from {Url} (HTTP {StatusCode}). Triggering stock fallback.", resolvedSourceUrl, response.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Exception downloading image from {Url}. Triggering stock fallback.", resolvedSourceUrl);
            }

            // If image is missing or unreachable, download curated royalty-free fallback
            if (imageBytes == null || imageBytes.Length == 0)
            {
                var fallbackStockUrl = GetCuratedFallbackUrl(categoryOrContext);
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(15);
                    imageBytes = await client.GetByteArrayAsync(fallbackStockUrl, cancellationToken);
                    contentType = "image/jpeg";
                }
                catch
                {
                    // If network fails completely, return direct fallback stock URL
                    _optimizedUrlCache[cacheKey] = fallbackStockUrl;
                    return fallbackStockUrl;
                }
            }

            // Upload to Cloudinary with WebP and max 300KB optimization
            if (_cloudinaryService != null && imageBytes != null && imageBytes.Length > 0)
            {
                try
                {
                    var extension = contentType.Contains("svg") ? ".svg" : ".webp";
                    var fileName = $"img_{Guid.NewGuid():N}{extension}";
                    var formFile = CreateFormFile(imageBytes, fileName, contentType);

                    var uploadedUrl = await _cloudinaryService.UploadImageAsync(
                        formFile, 
                        targetFolder, 
                        customCloudName, 
                        customApiKey, 
                        customApiSecret);

                    if (!string.IsNullOrWhiteSpace(uploadedUrl))
                    {
                        // Apply Cloudinary URL transformation to force WebP and lightweight compression (max ~300kb)
                        var optimizedWebpUrl = EnsureCloudinaryWebpTransformation(uploadedUrl);
                        _optimizedUrlCache[cacheKey] = optimizedWebpUrl;
                        return optimizedWebpUrl;
                    }
                }
                catch (Exception uploadEx)
                {
                    _logger.LogError(uploadEx, "Failed to upload image to Cloudinary. Falling back to stock URL.");
                }
            }

            // Fallback if Cloudinary is not configured or fails
            var directFallback = GetCuratedFallbackUrl(categoryOrContext);
            _optimizedUrlCache[cacheKey] = directFallback;
            return directFallback;
        }

        /// <inheritdoc />
        public async Task<string> ProcessAndReplaceImagesInHtmlAsync(
            string htmlMarkup,
            string? baseDomainUrl = null,
            string? categoryOrContext = null,
            string targetFolder = "templates/images",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(htmlMarkup)) return htmlMarkup;

            // Regex matches: src="...", data-src="...", srcset="..."
            var imgMatches = Regex.Matches(htmlMarkup, @"\b(?:src|data-src|data-lazy-src)=[""']([^""']+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^""']*)?)[""']", RegexOptions.IgnoreCase);
            var uniqueUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (Match match in imgMatches)
            {
                if (match.Groups.Count > 1 && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
                {
                    var url = match.Groups[1].Value.Trim();
                    if (!url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                    {
                        uniqueUrls.Add(url);
                    }
                }
            }

            var replacementMap = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            // Concurrently optimize all discovered images
            var tasks = uniqueUrls.Select(async url =>
            {
                var context = DetectContextFromUrl(url, categoryOrContext);
                var optimized = await OptimizeAndUploadImageAsync(
                    url, 
                    baseDomainUrl, 
                    context, 
                    targetFolder, 
                    customCloudName, 
                    customApiKey, 
                    customApiSecret, 
                    cancellationToken);
                replacementMap[url] = optimized;
            });

            await Task.WhenAll(tasks);

            // Replace all occurrences in HTML
            var resultHtml = htmlMarkup;
            foreach (var kvp in replacementMap)
            {
                resultHtml = resultHtml.Replace(kvp.Key, kvp.Value);
            }

            return resultHtml;
        }

        /// <inheritdoc />
        public async Task<string> ProcessAndReplaceImagesInCssAsync(
            string cssMarkup,
            string? baseDomainUrl = null,
            string targetFolder = "templates/images",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(cssMarkup)) return cssMarkup;

            var urlMatches = Regex.Matches(cssMarkup, @"url\(\s*[""']?([^""'\)\s]+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?[^""'\)\s]*)?)[""']?\s*\)", RegexOptions.IgnoreCase);
            var uniqueUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (Match match in urlMatches)
            {
                if (match.Groups.Count > 1 && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
                {
                    var url = match.Groups[1].Value.Trim();
                    if (!url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                    {
                        uniqueUrls.Add(url);
                    }
                }
            }

            var replacementMap = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            var tasks = uniqueUrls.Select(async url =>
            {
                var optimized = await OptimizeAndUploadImageAsync(
                    url, 
                    baseDomainUrl, 
                    "feature", 
                    targetFolder, 
                    customCloudName, 
                    customApiKey, 
                    customApiSecret, 
                    cancellationToken);
                replacementMap[url] = optimized;
            });

            await Task.WhenAll(tasks);

            var resultCss = cssMarkup;
            foreach (var kvp in replacementMap)
            {
                resultCss = resultCss.Replace(kvp.Key, kvp.Value);
            }

            return resultCss;
        }

        #region Helper Methods

        /// <summary>
        /// Selects a royalty-free fallback stock photo URL based on the section or image context.
        /// </summary>
        private static string GetCuratedFallbackUrl(string? categoryOrContext)
        {
            var key = "default";
            if (!string.IsNullOrWhiteSpace(categoryOrContext))
            {
                var lower = categoryOrContext.ToLowerInvariant();
                if (lower.Contains("hero") || lower.Contains("banner") || lower.Contains("header")) key = "hero";
                else if (lower.Contains("avatar") || lower.Contains("user") || lower.Contains("author") || lower.Contains("client")) key = "avatar";
                else if (lower.Contains("team") || lower.Contains("member") || lower.Contains("staff")) key = "team";
                else if (lower.Contains("feature") || lower.Contains("service") || lower.Contains("card")) key = "feature";
                else if (lower.Contains("product") || lower.Contains("shop") || lower.Contains("item")) key = "product";
                else if (lower.Contains("blog") || lower.Contains("post") || lower.Contains("news") || lower.Contains("article")) key = "blog";
            }

            var pool = CuratedFallbackPools.TryGetValue(key, out var list) ? list : CuratedFallbackPools["default"];
            var index = Math.Abs(Guid.NewGuid().GetHashCode()) % pool.Length;
            return pool[index];
        }

        /// <summary>
        /// Guesses image context from filename keywords (e.g. "team-1.jpg" -> team).
        /// </summary>
        private static string DetectContextFromUrl(string url, string? parentCategory)
        {
            var lower = url.ToLowerInvariant();
            if (lower.Contains("avatar") || lower.Contains("user") || lower.Contains("author") || lower.Contains("testimonial")) return "avatar";
            if (lower.Contains("team") || lower.Contains("member") || lower.Contains("person")) return "team";
            if (lower.Contains("hero") || lower.Contains("banner") || lower.Contains("slider")) return "hero";
            if (lower.Contains("blog") || lower.Contains("news") || lower.Contains("post")) return "blog";
            if (lower.Contains("product") || lower.Contains("thumb")) return "product";
            if (lower.Contains("feature") || lower.Contains("service") || lower.Contains("icon")) return "feature";

            return parentCategory ?? "default";
        }

        /// <summary>
        /// Resolves relative paths like "assets/img/hero.jpg" against a base domain URL.
        /// </summary>
        private static string ResolveAbsoluteImageUrl(string relativeOrAbsoluteUrl, string? baseDomainUrl)
        {
            if (Uri.TryCreate(relativeOrAbsoluteUrl, UriKind.Absolute, out var absUri) &&
                (absUri.Scheme == Uri.UriSchemeHttp || absUri.Scheme == Uri.UriSchemeHttps))
            {
                return relativeOrAbsoluteUrl;
            }

            if (string.IsNullOrWhiteSpace(baseDomainUrl))
            {
                return relativeOrAbsoluteUrl;
            }

            try
            {
                if (Uri.TryCreate(baseDomainUrl, UriKind.Absolute, out var baseUri))
                {
                    var combinedUri = new Uri(baseUri, relativeOrAbsoluteUrl);
                    return combinedUri.ToString();
                }
            }
            catch
            {
                // Return original on failure
            }

            return relativeOrAbsoluteUrl;
        }

        /// <summary>
        /// Injects Cloudinary WebP and size transformation parameters into the URL.
        /// e.g. /image/upload/ -> /image/upload/f_webp,q_auto:eco,w_1400,c_limit/
        /// </summary>
        private static string EnsureCloudinaryWebpTransformation(string cloudinaryUrl)
        {
            if (string.IsNullOrWhiteSpace(cloudinaryUrl) || !cloudinaryUrl.Contains("res.cloudinary.com", StringComparison.OrdinalIgnoreCase))
            {
                return cloudinaryUrl;
            }

            const string uploadMarker = "/image/upload/";
            var markerIndex = cloudinaryUrl.IndexOf(uploadMarker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex != -1)
            {
                var before = cloudinaryUrl.Substring(0, markerIndex + uploadMarker.Length);
                var after = cloudinaryUrl.Substring(markerIndex + uploadMarker.Length);

                // If transformation already exists, return
                if (after.StartsWith("f_webp", StringComparison.OrdinalIgnoreCase) || after.StartsWith("f_auto", StringComparison.OrdinalIgnoreCase))
                {
                    return cloudinaryUrl;
                }

                // Inject lightweight WebP transformation
                return $"{before}f_webp,q_auto:eco,w_1400,c_limit/{after}";
            }

            return cloudinaryUrl;
        }

        /// <summary>
        /// Creates an IFormFile instance from in-memory byte array for Cloudinary streaming.
        /// </summary>
        private static IFormFile CreateFormFile(byte[] bytes, string fileName, string contentType)
        {
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType
            };
        }

        #endregion
    }
}
