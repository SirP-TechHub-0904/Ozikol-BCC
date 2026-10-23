import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Leading button modes for [AppTopBar].
enum AppTopBarLeadingType {
  /// Displays a menu icon to toggle drawer.
  menu,

  /// Displays a back navigation chevron.
  back,

  /// Displays tenant or application avatar/logo.
  avatar,

  /// No leading button (empty space reserved).
  none,
}

/// Action item displayed on the trailing side of [AppTopBar].
class AppTopBarAction {
  /// Icon for this action button.
  final IconData icon;

  /// Callback executed when the icon is tapped.
  final VoidCallback onTap;

  /// Optional badge overlay (e.g. unread count badge).
  final Widget? badge;

  /// Optional tooltip text on hover / long-press.
  final String? tooltip;

  /// Custom icon color (defaults to theme foreground).
  final Color? iconColor;

  /// Optional custom widget to replace the default icon (e.g. loading spinner).
  final Widget? customWidget;

  /// Creates a top bar action button configuration.
  const AppTopBarAction({
    required this.icon,
    required this.onTap,
    this.badge,
    this.tooltip,
    this.iconColor,
    this.customWidget,
  });
}

/// Universal top application bar for Ozikol BCC (Business Command Center) screens.
/// Adapts seamlessly across desktop windows and mobile screens with dark mode support.
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  /// Leading widget style (menu, back, avatar, or none).
  final AppTopBarLeadingType leadingType;

  /// Callback executed when leading icon is tapped.
  final VoidCallback? onLeadingPressed;

  /// Custom leading widget to override default icons.
  final Widget? leadingWidget;

  /// Optional badge overlay on the leading widget.
  final Widget? leadingBadge;

  /// Fixed size of the leading widget container.
  final double leadingSize;

  /// Main screen or section title.
  final String? title;

  /// Secondary subtitle or active workspace name.
  final String? subtitle;

  /// Custom center content (e.g. search bar or filter pills).
  final Widget? centerContent;

  /// List of trailing action buttons.
  final List<AppTopBarAction> actions;

  /// Custom background color. Defaults to theme surface.
  final Color? backgroundColor;

  /// Height of the top bar (defaults to 64px).
  final double height;

  /// Whether title should be centered.
  final bool centerTitle;

  /// Horizontal edge padding.
  final double horizontalPadding;

  /// Creates an [AppTopBar].
  const AppTopBar({
    super.key,
    this.leadingType = AppTopBarLeadingType.none,
    this.onLeadingPressed,
    this.leadingWidget,
    this.leadingBadge,
    this.leadingSize = 42,
    this.title,
    this.subtitle,
    this.centerContent,
    this.actions = const [],
    this.backgroundColor,
    this.height = 64,
    this.centerTitle = false,
    this.horizontalPadding = 16,
  });

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBg = backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surfaceLight);
    final fgColor = isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight;

    return Material(
      color: effectiveBg,
      child: SafeArea(
        bottom: false,
        child: Container(
          height: height,
          padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                width: 1,
              ),
            ),
          ),
          child: Row(
            children: [
              // Leading Button
              _buildLeading(context, fgColor),

              const SizedBox(width: 12),

              // Title Section or Custom Center Content
              Expanded(
                child: centerContent ??
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment:
                          centerTitle ? CrossAxisAlignment.center : CrossAxisAlignment.start,
                      children: [
                        if (title != null)
                          Text(
                            title!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: fgColor,
                            ),
                          ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            subtitle!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                        ],
                      ],
                    ),
              ),

              // Trailing Actions
              if (actions.isNotEmpty)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: actions
                      .map((action) => Padding(
                            padding: const EdgeInsets.only(left: 6),
                            child: _buildActionButton(context, action, isDark, fgColor),
                          ))
                      .toList(),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeading(BuildContext context, Color fgColor) {
    switch (leadingType) {
      case AppTopBarLeadingType.menu:
        return IconButton(
          icon: leadingWidget ?? Icon(Icons.menu_rounded, color: fgColor),
          onPressed: onLeadingPressed ?? () => Scaffold.of(context).openDrawer(),
          tooltip: 'Open navigation',
        );

      case AppTopBarLeadingType.back:
        return IconButton(
          icon: leadingWidget ?? Icon(Icons.arrow_back_ios_new_rounded, color: fgColor, size: 20),
          onPressed: onLeadingPressed ?? () => Navigator.of(context).maybePop(),
          tooltip: 'Back',
        );

      case AppTopBarLeadingType.avatar:
        return Stack(
          clipBehavior: Clip.none,
          children: [
            GestureDetector(
              onTap: onLeadingPressed,
              child: leadingWidget ??
                  Container(
                    width: leadingSize,
                    height: leadingSize,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary,
                    ),
                    child: const Icon(Icons.domain_rounded, color: Colors.white, size: 20),
                  ),
            ),
            if (leadingBadge != null)
              Positioned(
                top: 0,
                right: 0,
                child: leadingBadge!,
              ),
          ],
        );

      case AppTopBarLeadingType.none:
        return const SizedBox.shrink();
    }
  }

  Widget _buildActionButton(
    BuildContext context,
    AppTopBarAction action,
    bool isDark,
    Color fgColor,
  ) {
    final button = Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: action.customWidget ??
              Icon(
                action.icon,
                color: action.iconColor ?? (isDark ? AppColors.gray300 : AppColors.gray700),
                size: 22,
              ),
          onPressed: action.onTap,
          tooltip: action.tooltip,
        ),
        if (action.badge != null)
          Positioned(
            top: 6,
            right: 6,
            child: action.badge!,
          ),
      ],
    );

    return button;
  }
}
