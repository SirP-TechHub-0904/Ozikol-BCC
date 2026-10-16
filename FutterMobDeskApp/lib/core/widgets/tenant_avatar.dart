import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'tenant_cached_image.dart';

/// Renders a company workspace avatar with multi-tenant offline disk caching.
/// Gracefully falls back to a branded monogram badge (initials) if no logo URL exists or network fails.
class TenantAvatar extends StatelessWidget {
  final String? logoUrl;
  final String name;
  final String? tenantKey;
  final double size;
  final double borderRadius;
  final Color? backgroundColor;

  const TenantAvatar({
    super.key,
    this.logoUrl,
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

    if (logoUrl != null && logoUrl!.trim().isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: backgroundColor ?? Colors.white,
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
        child: TenantCachedImage(
          imageUrl: logoUrl,
          tenantKey: tenantKey ?? name,
          width: size - 8,
          height: size - 8,
          borderRadius: borderRadius > 4 ? borderRadius - 4 : 0,
          fit: BoxFit.contain,
          fallbackWidget: _buildFallbackMonogram(isDark),
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
