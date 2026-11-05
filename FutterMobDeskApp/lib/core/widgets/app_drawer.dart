import 'package:flutter/material.dart';
import '../localization/language_provider.dart';
import '../theme/app_colors.dart';

/// Standardized badge pills matching the Ozikol Central / Web Admin design system.
class AppDrawerBadge extends StatelessWidget {
  /// Badge label (e.g. "SOON", "LIVE", "NEW", "HOT").
  final String label;

  /// Background fill color.
  final Color backgroundColor;

  /// Text color.
  final Color textColor;

  const AppDrawerBadge({
    super.key,
    required this.label,
    required this.backgroundColor,
    this.textColor = Colors.white,
  });

  /// Grey pill for upcoming / planned modules (matches .badge-soon).
  factory AppDrawerBadge.soon([String label = 'SOON']) {
    return AppDrawerBadge(
      label: label,
      backgroundColor: const Color(0xFF64748B),
    );
  }

  /// Red/Orange pill for active real-time features (matches .badge-hot).
  factory AppDrawerBadge.live([String label = 'LIVE']) {
    return AppDrawerBadge(
      label: label,
      backgroundColor: const Color(0xFFF06548),
    );
  }

  /// Teal/Green pill for newly released capabilities (matches .badge-new).
  factory AppDrawerBadge.newItem([String label = 'NEW']) {
    return AppDrawerBadge(
      label: label,
      backgroundColor: const Color(0xFF0AB39C),
    );
  }

  /// Orange pill for hot features (matches .badge-hot).
  factory AppDrawerBadge.hot([String label = 'HOT']) {
    return AppDrawerBadge(
      label: label,
      backgroundColor: const Color(0xFFF06548),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5.5, vertical: 2),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w800,
          color: textColor,
          letterSpacing: 0.4,
          height: 1.1,
        ),
      ),
    );
  }
}

/// Single sub-item within an expandable [AppDrawerItem].
class AppDrawerSubItem {
  /// Display title of the sub-item (e.g. "Dashboard Overview", "All Members", "Settings").
  final String title;

  /// Optional icon for this sub-item.
  final IconData? icon;

  /// Tap callback.
  final VoidCallback onTap;

  /// Whether this sub-item is currently selected.
  final bool isSelected;

  /// Whether this item is enabled or an upcoming disabled module.
  final bool isEnabled;

  /// Optional trailing badge or widget.
  final Widget? trailing;

  /// Creates an accordion sub-item.
  const AppDrawerSubItem({
    required this.title,
    this.icon,
    required this.onTap,
    this.isSelected = false,
    this.isEnabled = true,
    this.trailing,
  });
}

/// Single item within an [AppDrawerSection].
/// Can represent either a flat navigation item or an expandable accordion with [subItems].
class AppDrawerItem {
  /// Icon for this item.
  final IconData icon;

  /// Display title.
  final String title;

  /// Optional tap callback for flat items or when clicking the accordion parent.
  final VoidCallback? onTap;

  /// Optional trailing widget (e.g. badge, locked lock icon).
  final Widget? trailing;

  /// Whether this item is currently selected/active.
  final bool isSelected;

  /// Whether this item is enabled or an upcoming disabled module.
  final bool isEnabled;

  /// Optional sub-items revealing a three-tier accordion structure.
  final List<AppDrawerSubItem>? subItems;

  /// Whether this accordion should be expanded initially.
  final bool initiallyExpanded;

  /// Creates a drawer navigation item.
  const AppDrawerItem({
    required this.icon,
    required this.title,
    this.onTap,
    this.trailing,
    this.isSelected = false,
    this.isEnabled = true,
    this.subItems,
    this.initiallyExpanded = false,
  });
}

/// Logical grouping of [AppDrawerItem] items with an optional section heading
/// and a contextual information trigger [onInfoTap] for suite guidance.
class AppDrawerSection {
  /// Section heading text (e.g. "EXECUTIVE COMMAND", "USER MANAGEMENT").
  final String? title;

  /// Optional contextual info trigger callback. When provided, renders a faint (i) icon.
  final VoidCallback? onInfoTap;

  /// Optional tooltip for the info icon.
  final String? infoTooltip;

  /// List of items belonging to this section.
  final List<AppDrawerItem> items;

  /// Creates a grouped section in the drawer.
  const AppDrawerSection({
    this.title,
    this.onInfoTap,
    this.infoTooltip,
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
          // Header Row with Logo and Mobile Close Button (at the very top of sidebar)
          if (header != null || !isPermanentSidebar)
            Padding(
              padding: EdgeInsets.fromLTRB(
                isCollapsed ? 4 : 12,
                8,
                isCollapsed ? 4 : 8,
                8,
              ),
              child: Row(
                children: [
                  if (header != null)
                    Expanded(child: header!),
                  if (!isPermanentSidebar)
                    IconButton(
                      tooltip: context.trc('shell.close_menu', fallback: 'Close Menu'),
                      onPressed: onClose ??
                          () {
                            if (Scaffold.maybeOf(context)?.isDrawerOpen ?? false) {
                              Scaffold.of(context).closeDrawer();
                            } else if (Navigator.of(context).canPop()) {
                              Navigator.of(context).pop();
                            }
                          },
                      icon: Icon(
                        Icons.close_rounded,
                        size: 20,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                ],
              ),
            ),

          // Navigation Sections
          Expanded(
            child: ListView.separated(
              padding: EdgeInsets.symmetric(
                horizontal: isCollapsed ? 6 : 10,
                vertical: 8,
              ),
              itemCount: sections.length,
              separatorBuilder: (context, index) => SizedBox(height: isCollapsed ? 10 : 14),
              itemBuilder: (context, index) {
                final section = sections[index];

                return Column(
                  crossAxisAlignment: isCollapsed ? CrossAxisAlignment.center : CrossAxisAlignment.start,
                  children: [
                    if (section.title != null && section.title!.trim().isNotEmpty)
                      if (!isCollapsed)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(10, 4, 6, 6),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  section.title!.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: isDark ? AppColors.gray500 : AppColors.gray600,
                                  ),
                                ),
                              ),
                              if (section.onInfoTap != null)
                                Tooltip(
                                  message: section.infoTooltip ?? 'Suite Capabilities & Overview',
                                  child: InkWell(
                                    onTap: section.onInfoTap,
                                    borderRadius: BorderRadius.circular(10),
                                    child: Padding(
                                      padding: const EdgeInsets.all(4),
                                      child: Icon(
                                        Icons.info_outline_rounded,
                                        size: 14,
                                        color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
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

class _DrawerItemTile extends StatefulWidget {
  final AppDrawerItem item;
  final bool isDark;
  final bool isCollapsed;

  const _DrawerItemTile({
    required this.item,
    required this.isDark,
    this.isCollapsed = false,
  });

  @override
  State<_DrawerItemTile> createState() => _DrawerItemTileState();
}

class _DrawerItemTileState extends State<_DrawerItemTile> {
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    final hasActiveSub = widget.item.subItems?.any((s) => s.isSelected) ?? false;
    _isExpanded = widget.item.initiallyExpanded || hasActiveSub;
  }

  @override
  void didUpdateWidget(covariant _DrawerItemTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    final hasActiveSub = widget.item.subItems?.any((s) => s.isSelected) ?? false;
    if (hasActiveSub && !_isExpanded) {
      _isExpanded = true;
    }
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
    if (widget.item.onTap != null) {
      widget.item.onTap!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final item = widget.item;
    final hasSub = item.subItems != null && item.subItems!.isNotEmpty;
    final hasActiveSub = item.subItems?.any((s) => s.isSelected) ?? false;
    final isAnySelected = item.isSelected || hasActiveSub;

    final activeBg = isDark ? AppColors.primary.withValues(alpha: 0.15) : AppColors.primaryContainer;
    final activeFg = AppColors.primary;
    final defaultFg = isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight;

    // Collapsed Icon Rail View (68px)
    if (widget.isCollapsed) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Tooltip(
            message: item.title,
            preferBelow: false,
            waitDuration: const Duration(milliseconds: 200),
            child: Material(
              color: isAnySelected ? activeBg : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: () {
                  if (hasSub) {
                    _showCollapsedSubMenu(context);
                  } else if (item.onTap != null) {
                    item.onTap!();
                  }
                },
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
                        color: isAnySelected ? activeFg : (isDark ? AppColors.gray400 : AppColors.gray600),
                      ),
                      if (item.trailing != null || hasSub)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: isAnySelected ? activeFg : (isDark ? AppColors.gray500 : const Color(0xFF94A3B8)),
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

    // Expanded Sidebar Mode View (250px)
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Material(
          color: (item.isSelected && !hasSub) ? activeBg : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            onTap: hasSub ? _toggleExpanded : (item.isEnabled ? item.onTap : null),
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
              child: Row(
                children: [
                  Icon(
                    item.icon,
                    size: 19,
                    color: isAnySelected
                        ? activeFg
                        : (!item.isEnabled
                            ? (isDark ? AppColors.gray500 : const Color(0xFF94A3B8))
                            : (isDark ? AppColors.gray400 : AppColors.gray600)),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.8,
                        fontWeight: isAnySelected ? FontWeight.w700 : FontWeight.w500,
                        color: (item.isSelected && !hasSub)
                            ? activeFg
                            : (!item.isEnabled
                                ? (isDark ? AppColors.gray500 : const Color(0xFF94A3B8))
                                : defaultFg),
                      ),
                    ),
                  ),
                  if (item.trailing != null) ...[
                    item.trailing!,
                    const SizedBox(width: 4),
                  ],
                  if (hasSub)
                    AnimatedRotation(
                      turns: _isExpanded ? 0.25 : 0.0,
                      duration: const Duration(milliseconds: 180),
                      curve: Curves.easeInOut,
                      child: Icon(
                        Icons.chevron_right_rounded,
                        size: 17,
                        color: isDark ? AppColors.gray400 : AppColors.gray500,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),

        // Accordion Submenu
        if (hasSub && _isExpanded)
          Padding(
            padding: const EdgeInsets.only(left: 19, top: 2, bottom: 4),
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(
                    color: isDark ? AppColors.outlineDark.withValues(alpha: 0.6) : const Color(0xFFE2E8F0),
                    width: 1.5,
                  ),
                ),
              ),
              padding: const EdgeInsets.only(left: 9),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: item.subItems!.map((sub) {
                  final isSubActive = sub.isSelected;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 1.5),
                    child: Material(
                      color: isSubActive ? activeBg : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      child: InkWell(
                        onTap: sub.isEnabled ? sub.onTap : null,
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6.5),
                          child: Row(
                            children: [
                              Icon(
                                sub.icon ?? Icons.arrow_right_rounded,
                                size: sub.icon != null ? 14 : 16,
                                color: isSubActive
                                    ? activeFg
                                    : (!sub.isEnabled
                                        ? (isDark ? AppColors.gray500 : const Color(0xFF94A3B8))
                                        : (isDark ? AppColors.gray400 : AppColors.gray500)),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  sub.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSubActive ? FontWeight.w700 : FontWeight.w500,
                                    color: isSubActive
                                        ? activeFg
                                        : (!sub.isEnabled
                                            ? (isDark ? AppColors.gray500 : const Color(0xFF94A3B8))
                                            : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569))),
                                  ),
                                ),
                              ),
                              if (sub.trailing != null) sub.trailing!,
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
      ],
    );
  }

  void _showCollapsedSubMenu(BuildContext context) {
    final RenderBox? box = context.findRenderObject() as RenderBox?;
    if (box == null) return;
    final position = box.localToGlobal(Offset.zero);

    showMenu<void>(
      context: context,
      position: RelativeRect.fromLTRB(
        position.dx + 56,
        position.dy,
        position.dx + 260,
        position.dy + 200,
      ),
      items: [
        PopupMenuItem<void>(
          enabled: false,
          child: Text(
            widget.item.title.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
        ),
        const PopupMenuDivider(),
        ...?widget.item.subItems?.map((sub) => PopupMenuItem<void>(
          onTap: sub.onTap,
          child: Row(
            children: [
              if (sub.icon != null) ...[
                Icon(sub.icon, size: 16, color: sub.isSelected ? AppColors.primary : null),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Text(
                  sub.title,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: sub.isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: sub.isSelected ? AppColors.primary : null,
                  ),
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }
}
