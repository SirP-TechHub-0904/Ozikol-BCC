import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Single item within an [AppDrawerSection].
class AppDrawerItem {
  /// Icon for this item.
  final IconData icon;

  /// Display title.
  final String title;

  /// Tap callback.
  final VoidCallback onTap;

  /// Optional trailing widget (e.g. badge, locked lock icon, chevron).
  final Widget? trailing;

  /// Whether this item is currently selected/active.
  final bool isSelected;

  /// Creates a drawer navigation item.
  const AppDrawerItem({
    required this.icon,
    required this.title,
    required this.onTap,
    this.trailing,
    this.isSelected = false,
  });
}

/// Logical grouping of [AppDrawerItem] items with an optional section heading.
class AppDrawerSection {
  /// Section heading text (e.g. "WORKSPACE HUB", "OPERATIONS").
  final String? title;

  /// List of items belonging to this section.
  final List<AppDrawerItem> items;

  /// Creates a grouped section in the drawer.
  const AppDrawerSection({
    this.title,
    required this.items,
  });
}

/// Adaptive navigation drawer & desktop sidebar.
/// Functions as a slide-out drawer on Mobile, and a permanent pinned sidebar on Desktop.
class AppDrawer extends StatelessWidget {
  /// Optional top header widget (e.g. tenant branding or user avatar).
  final Widget? header;

  /// Optional footer widget pinned to the bottom (e.g. version or logout button).
  final Widget? footer;

  /// List of navigation sections.
  final List<AppDrawerSection> sections;

  /// Explicit close callback (defaults to Navigator.pop).
  final VoidCallback? onClose;

  /// Width of the drawer / sidebar (defaults to 260px).
  final double width;

  /// Background color (defaults to theme surface).
  final Color? backgroundColor;

  /// When true, acts as a permanent desktop sidebar (no close button, flat border).
  final bool isPermanentSidebar;

  /// Creates an adaptive [AppDrawer].
  const AppDrawer({
    super.key,
    this.header,
    this.footer,
    this.sections = const [],
    this.onClose,
    this.width = 260,
    this.backgroundColor,
    this.isPermanentSidebar = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBg = backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surfaceLight);

    final content = SafeArea(
      child: Column(
        children: [
          // Header & Mobile Close Button
          if (!isPermanentSidebar) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 8, 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(
                    onPressed: onClose ?? () => Navigator.of(context).maybePop(),
                    icon: Icon(
                      Icons.close_rounded,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                ],
              ),
            ),
          ],

          if (header != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: header!,
            ),

          // Navigation Sections
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: sections.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final section = sections[index];

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (section.title != null && section.title!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                        child: Text(
                          section.title!.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: isDark ? AppColors.gray500 : AppColors.gray600,
                          ),
                        ),
                      ),
                    ...section.items.map((item) => _DrawerItemTile(item: item, isDark: isDark)),
                  ],
                );
              },
            ),
          ),

          // Optional Footer
          if (footer != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: footer!,
            ),
        ],
      ),
    );

    if (isPermanentSidebar) {
      return Container(
        width: width,
        decoration: BoxDecoration(
          color: effectiveBg,
          border: Border(
            right: BorderSide(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
              width: 1,
            ),
          ),
        ),
        child: content,
      );
    }

    return Drawer(
      width: width,
      backgroundColor: effectiveBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
      ),
      child: content,
    );
  }
}

class _DrawerItemTile extends StatelessWidget {
  final AppDrawerItem item;
  final bool isDark;

  const _DrawerItemTile({
    required this.item,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final activeBg = isDark ? AppColors.primary.withValues(alpha: 0.15) : AppColors.primaryContainer;
    final activeFg = AppColors.primary;
    final defaultFg = isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight;

    return Material(
      color: item.isSelected ? activeBg : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Icon(
                item.icon,
                size: 20,
                color: item.isSelected ? activeFg : (isDark ? AppColors.gray400 : AppColors.gray600),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: item.isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: item.isSelected ? activeFg : defaultFg,
                  ),
                ),
              ),
              if (item.trailing != null) item.trailing!,
            ],
          ),
        ),
      ),
    );
  }
}
