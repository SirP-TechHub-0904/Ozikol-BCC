import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'tenant_cached_image.dart';

/// <summary>
/// Renders a company workspace avatar with multi-tenant offline disk caching.
/// Dynamically frames loaded brand icons/logos and gracefully falls back
/// to a branded monogram badge (initials) without double-box nesting if no image exists or if network fails.
/// </summary>
class TenantAvatar extends StatelessWidget {
  /// Optional URL of the tenant's brand logo.
  final String? logoUrl;

  /// Optional URL of the tenant's square icon / favicon.
  final String? iconUrl;

  /// The organization or workspace name used for initials fallback.
  final String name;

  /// The tenant key namespace for disk cache partitioning.
  final String? tenantKey;

  /// The width and height of the avatar box in logical pixels.
  final double size;

  /// The border radius applied to the avatar corners.
  final double borderRadius;

  /// Optional custom background color override.
  final Color? backgroundColor;

  const TenantAvatar({
    super.key,
    this.logoUrl,
    this.iconUrl,
    required this.name,
    this.tenantKey,
    this.size = 48.0,
    this.borderRadius = 14.0,
    this.backgroundColor,
  });

  /// Extracts 2-letter uppercase initials from the organization name
  String get initials {
    final clean = name.trim();
    if (clean.isEmpty) return 'OZ';
    final parts = clean.split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      final first = parts[0].isNotEmpty ? parts[0][0] : '';
      final second = parts[1].isNotEmpty ? parts[1][0] : '';
      return '$first$second'.toUpperCase();
    }
    return clean.substring(0, clean.length >= 2 ? 2 : clean.length).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveImageUrl = (iconUrl != null && iconUrl!.trim().isNotEmpty)
        ? iconUrl
        : logoUrl;

    if (effectiveImageUrl != null && effectiveImageUrl.trim().isNotEmpty) {
      return TenantCachedImage(
        imageUrl: effectiveImageUrl,
        tenantKey: tenantKey ?? name,
        width: size,
        height: size,
        borderRadius: borderRadius,
        fit: BoxFit.contain,
        fallbackWidget: _buildFallbackMonogram(isDark),
        errorBuilder: (context, url, error) => _buildFallbackMonogram(isDark),
        placeholderBuilder: (context, url) => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: backgroundColor ?? (isDark ? AppColors.surfaceVariantDark : Colors.white),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
          ),
          child: const Center(
            child: SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
            ),
          ),
        ),
        imageBuilder: (context, imageProvider) => Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: backgroundColor ?? (isDark ? AppColors.surfaceDark : Colors.white),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(isDark ? 50 : 20),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.all(4),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(borderRadius > 4 ? borderRadius - 4 : 0),
            child: Image(
              image: imageProvider,
              fit: BoxFit.contain,
            ),
          ),
        ),
      );
    }

    return _buildFallbackMonogram(isDark);
  }

  Widget _buildFallbackMonogram(bool isDark) {
    // Generate harmonious background gradient based on name hash
    final hash = name.hashCode.abs();
    final hue = (hash % 360).toDouble();
    final color = HSLColor.fromAHSL(1.0, hue, 0.70, isDark ? 0.45 : 0.50).toColor();

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? color,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          BoxShadow(
            color: color.withAlpha(80),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: size * 0.40,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }
}
