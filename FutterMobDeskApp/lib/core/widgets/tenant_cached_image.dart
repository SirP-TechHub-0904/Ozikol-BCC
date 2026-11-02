import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../constants/api_constants.dart';
import '../theme/app_colors.dart';

/// <summary>
/// Multi-tenant partitioned cached network image widget.
/// Enforces tenant-isolated image cache keys so workspace logos, member avatars,
/// and document attachments are cached reliably to disk and accessible offline.
/// Automatically normalizes relative upload paths and remaps localhost loopbacks
/// to host machine endpoints on Android emulators and devices.
/// </summary>
class TenantCachedImage extends StatelessWidget {
  /// The raw or normalized image URL to load.
  final String? imageUrl;

  /// The tenant key namespace used for partitioned cache keys.
  final String? tenantKey;

  /// Optional display width.
  final double? width;

  /// Optional display height.
  final double? height;

  /// Box fitting strategy for the image. Defaults to [BoxFit.contain].
  final BoxFit fit;

  /// Outer border radius for clipping the image.
  final double borderRadius;

  /// Optional custom widget rendered when the image URL is empty or fails to load.
  final Widget? fallbackWidget;

  /// Optional custom builder for decorating or framing the successfully loaded image.
  final Widget Function(BuildContext, ImageProvider)? imageBuilder;

  /// Optional placeholder builder shown while the image is loading.
  final Widget Function(BuildContext, String)? placeholderBuilder;

  /// Optional error widget builder invoked upon network or decode failure.
  final Widget Function(BuildContext, String, dynamic)? errorBuilder;

  const TenantCachedImage({
    super.key,
    required this.imageUrl,
    this.tenantKey,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.borderRadius = 0.0,
    this.fallbackWidget,
    this.imageBuilder,
    this.placeholderBuilder,
    this.errorBuilder,
  });

  /// <summary>
  /// Normalizes an image URL for the current runtime platform:
  /// 1. Prepends the effective API base URL if the path is relative (e.g. `/uploads/...`).
  /// 2. Remaps `localhost` / `127.0.0.1` to `10.0.2.2` when executing inside Android emulators.
  /// </summary>
  /// <param name="url">The raw image URL or relative path.</param>
  /// <returns>The normalized, platform-routable image URL.</returns>
  static String normalizeImageUrl(String url) {
    var clean = url.trim();
    if (clean.isEmpty) return clean;

    // Handle relative paths (e.g. /uploads/tenants/... or uploads/tenants/...)
    if (clean.startsWith('/')) {
      clean = '${ApiConstants.defaultBaseUrl}$clean';
    } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = '${ApiConstants.defaultBaseUrl}/$clean';
    }

    // Translate localhost / 127.0.0.1 loopback to 10.0.2.2 on Android emulators
    if (!kIsWeb && Platform.isAndroid) {
      clean = clean.replaceFirst('://localhost:', '://10.0.2.2:');
      clean = clean.replaceFirst('://127.0.0.1:', '://10.0.2.2:');
    }

    return clean;
  }

  /// Constructs a partitioned cache key for disk storage based on tenant namespace and normalized URL.
  String _partitionedCacheKey(String effectiveUrl) {
    final effectiveTenant = (tenantKey ?? 'global').toLowerCase().trim();
    return 'tenant_${effectiveTenant}_$effectiveUrl';
  }

  /// <summary>
  /// Evicts an image URL from both CachedNetworkImage disk cache and Flutter's in-memory decoded image cache.
  /// Evicts both the normalized and raw URLs to guarantee full cache invalidation.
  /// </summary>
  /// <param name="imageUrl">The raw or normalized image URL to evict.</param>
  /// <param name="tenantKey">The optional tenant key namespace for disk cache partitioning.</param>
  /// <returns>A future that completes when cache eviction operations finish.</returns>
  static Future<void> evictImage(String? imageUrl, {String? tenantKey}) async {
    if (imageUrl == null || imageUrl.trim().isEmpty) return;
    try {
      final normalizedUrl = normalizeImageUrl(imageUrl);
      final effectiveTenant = (tenantKey ?? 'global').toLowerCase().trim();
      final partitionedKey = 'tenant_${effectiveTenant}_$normalizedUrl';

      await CachedNetworkImage.evictFromCache(normalizedUrl, cacheKey: partitionedKey).catchError((_) => false);
      await CachedNetworkImage.evictFromCache(normalizedUrl).catchError((_) => false);
      PaintingBinding.instance.imageCache.evict(NetworkImage(normalizedUrl));

      if (normalizedUrl != imageUrl) {
        final rawKey = 'tenant_${effectiveTenant}_$imageUrl';
        await CachedNetworkImage.evictFromCache(imageUrl, cacheKey: rawKey).catchError((_) => false);
        await CachedNetworkImage.evictFromCache(imageUrl).catchError((_) => false);
        PaintingBinding.instance.imageCache.evict(NetworkImage(imageUrl));
      }
    } catch (_) {
      // Gracefully ignore eviction errors
    }
  }

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.trim().isEmpty) {
      return fallbackWidget ?? _buildDefaultFallback(context);
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveUrl = normalizeImageUrl(imageUrl!);

    Widget imageWidget = CachedNetworkImage(
      imageUrl: effectiveUrl,
      cacheKey: _partitionedCacheKey(effectiveUrl),
      width: width,
      height: height,
      fit: fit,
      imageBuilder: imageBuilder,
      placeholder: placeholderBuilder ??
          (context, url) => Container(
                width: width,
                height: height,
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                child: const Center(
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  ),
                ),
              ),
      errorWidget: errorBuilder ??
          (context, url, error) => fallbackWidget ?? _buildDefaultFallback(context),
    );

    if (borderRadius > 0 && imageBuilder == null) {
      imageWidget = ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: imageWidget,
      );
    }

    return imageWidget;
  }

  Widget _buildDefaultFallback(BuildContext context) {
    return Container(
      width: width,
      height: height,
      color: Colors.transparent,
      child: const Center(
        child: Icon(Icons.business_rounded, color: Color(0xFF94A3B8), size: 20),
      ),
    );
  }
}
