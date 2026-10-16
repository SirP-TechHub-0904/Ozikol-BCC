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

  /// Width of the drawer / sidebar (defaults to 250px).
  final double width;

  /// Width of the sidebar when collapsed into icon-rail mode (defaults to 68px).
  final double collapsedWidth;

  /// Background color (defaults to theme surface).
  final Color? backgroundColor;

  /// When true, acts as a permanent desktop sidebar (no close button, flat border).
  final bool isPermanentSidebar;

  /// When true, collapses the sidebar into an icon-only navigation rail.
  final bool isCollapsed;

  /// Optional callback invoked when the user toggles the sidebar collapse state.
  final VoidCallback? onToggleCollapse;

  /// Creates an adaptive [AppDrawer].
  const AppDrawer({
    super.key,
    this.header,
    this.footer,
    this.sections = const [],
    this.onClose,
    this.width = 250,
    this.collapsedWidth = 68,
    this.backgroundColor,
    this.isPermanentSidebar = false,
    this.isCollapsed = false,
    this.onToggleCollapse,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBg = backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surfaceLight);
    final effectiveWidth = isCollapsed ? collapsedWidth : width;

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
              padding: EdgeInsets.fromLTRB(
                isCollapsed ? 4 : 16,
                12,
                isCollapsed ? 4 : 16,
                12,
              ),
              child: header!,
            ),

          // Navigation Sections
          Expanded(
            child: ListView.separated(
              padding: EdgeInsets.symmetric(
                horizontal: isCollapsed ? 6 : 12,
                vertical: 8,
              ),
              itemCount: sections.length,
              separatorBuilder: (context, index) => SizedBox(height: isCollapsed ? 10 : 16),
              itemBuilder: (context, index) {
                final section = sections[index];

                return Column(
                  crossAxisAlignment: isCollapsed ? CrossAxisAlignment.center : CrossAxisAlignment.start,
                  children: [
                    if (section.title != null && section.title!.trim().isNotEmpty)
                      if (!isCollapsed)
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
                        )
                      else
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Divider(
                            height: 1,
                            thickness: 1,
                            color: isDark
                                ? AppColors.outlineDark.withValues(alpha: 0.4)
                                : const Color(0xFFE2E8F0),
                            indent: 6,
                            endIndent: 6,
                          ),
                        ),
                    ...section.items.map((item) => _DrawerItemTile(
                          item: item,
                          isDark: isDark,
                          isCollapsed: isCollapsed,
                        )),
                  ],
                );
              },
            ),
          ),

          // Optional Footer
          if (footer != null)
            Padding(
              padding: EdgeInsets.all(isCollapsed ? 6 : 16),
              child: footer!,
            ),
        ],
      ),
    );

    if (isPermanentSidebar) {
      final targetWidth = isCollapsed ? collapsedWidth : width;

      return AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOutCubic,
        width: effectiveWidth,
        decoration: BoxDecoration(
          color: effectiveBg,
          border: Border(
            right: BorderSide(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
              width: 1,
            ),
          ),
        ),
        child: ClipRect(
          child: OverflowBox(
            minWidth: targetWidth,
            maxWidth: targetWidth,
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: targetWidth,
              child: content,
            ),
          ),
        ),
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
  final bool isCollapsed;

  const _DrawerItemTile({
    required this.item,
    required this.isDark,
    this.isCollapsed = false,
  });

  @override
  Widget build(BuildContext context) {
    final activeBg = isDark ? AppColors.primary.withValues(alpha: 0.15) : AppColors.primaryContainer;
    final activeFg = AppColors.primary;
    final defaultFg = isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight;

    if (isCollapsed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Tooltip(
            message: item.title,
            preferBelow: false,
            waitDuration: const Duration(milliseconds: 200),
            child: Material(
              color: item.isSelected ? activeBg : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: item.onTap,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 44,
                  height: 40,
                  alignment: Alignment.center,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Icon(
                        item.icon,
                        size: 20,
                        color: item.isSelected ? activeFg : (isDark ? AppColors.gray400 : AppColors.gray600),
                      ),
                      if (item.trailing != null)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

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
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
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
