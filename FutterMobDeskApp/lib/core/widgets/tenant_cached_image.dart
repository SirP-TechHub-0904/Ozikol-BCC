import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Multi-tenant partitioned cached network image widget.
/// Enforces tenant-isolated image cache keys so workspace logos, member avatars,
/// and document attachments are cached reliably to disk and accessible offline.
class TenantCachedImage extends StatelessWidget {
  final String? imageUrl;
  final String? tenantKey;
  final double? width;
  final double? height;
  final BoxFit fit;
  final double borderRadius;
  final Widget? fallbackWidget;
  final Widget Function(BuildContext, String)? placeholderBuilder;
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
    this.placeholderBuilder,
    this.errorBuilder,
  });

  /// Constructs a partitioned cache key for disk storage
  String get _partitionedCacheKey {
    final effectiveTenant = (tenantKey ?? 'global').toLowerCase().trim();
    return 'tenant_${effectiveTenant}_${imageUrl!}';
  }

  /// Evicts an image URL from both CachedNetworkImage disk cache and Flutter's in-memory decoded image cache.
  static Future<void> evictImage(String? imageUrl, {String? tenantKey}) async {
    if (imageUrl == null || imageUrl.trim().isEmpty) return;
    try {
      final effectiveTenant = (tenantKey ?? 'global').toLowerCase().trim();
      final partitionedKey = 'tenant_${effectiveTenant}_$imageUrl';

      await CachedNetworkImage.evictFromCache(imageUrl, cacheKey: partitionedKey);
      await CachedNetworkImage.evictFromCache(imageUrl);
      PaintingBinding.instance.imageCache.evict(NetworkImage(imageUrl));
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

    Widget imageWidget = CachedNetworkImage(
      imageUrl: imageUrl!,
      cacheKey: _partitionedCacheKey,
      width: width,
      height: height,
      fit: fit,
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

    if (borderRadius > 0) {
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
