import 'package:flutter/material.dart';
import '../localization/language_provider.dart';
import '../theme/app_colors.dart';

/// <summary>
/// Describes how the page header back control behaves.
/// Supports three explicit modes so every screen states its navigation intent:
/// <list type="bullet">
///   <item><see cref="PageHeaderBack.none"/> – no back control (root/top-level pages).</item>
///   <item><see cref="PageHeaderBack.previous"/> – step back one level through navigation history.</item>
///   <item><see cref="PageHeaderBack.to"/> – jump to a specific destination (e.g. "Back to List").</item>
/// </list>
/// </summary>
class PageHeaderBack {
  /// Callback invoked when the back control is tapped. Null for [PageHeaderBack.none].
  final VoidCallback? onTap;

  /// Visible destination label for [PageHeaderBack.to] (e.g. "Back to List"). Null for history back.
  final String? label;

  /// Tooltip text shown on hover / long-press.
  final String tooltip;

  const PageHeaderBack._({this.onTap, this.label, required this.tooltip});

  /// <summary>No back control is rendered.</summary>
  static const PageHeaderBack none = PageHeaderBack._(tooltip: '');

  /// <summary>
  /// Steps back one level in the navigation history (renders an arrow-only tile).
  /// </summary>
  /// <param name="onBack">History pop callback (e.g. the shell's navigate-back handler).</param>
  /// <param name="tooltip">Hover text; defaults to "Back".</param>
  /// <returns>A history-back configuration.</returns>
  factory PageHeaderBack.previous(VoidCallback onBack, {String tooltip = 'Back'}) {
    return PageHeaderBack._(onTap: onBack, tooltip: tooltip);
  }

  /// <summary>
  /// Navigates to a specific destination regardless of history (renders arrow + label on
  /// wide headers, arrow-only with tooltip on compact headers).
  /// </summary>
  /// <param name="onNavigate">Callback that opens the target page.</param>
  /// <param name="label">Destination label, e.g. "Back to List".</param>
  /// <returns>A targeted-back configuration.</returns>
  factory PageHeaderBack.to(VoidCallback onNavigate, {required String label}) {
    return PageHeaderBack._(onTap: onNavigate, label: label, tooltip: label);
  }

  /// Whether a back control should be rendered.
  bool get isVisible => onTap != null;
}

/// <summary>Visual emphasis for a [PageHeaderAction].</summary>
enum PageHeaderActionStyle {
  /// Filled Royal Blue (#0050E5) call-to-action.
  primary,

  /// Outlined neutral button.
  secondary,

  /// Outlined red button reserved for destructive actions only.
  destructive,
}

/// <summary>
/// Data description of a header button. The header—not the screen—decides how to render it
/// at each breakpoint (full label, short label, icon-only, or overflow menu entry), which is
/// what guarantees consistency across every page.
/// </summary>
class PageHeaderAction {
  /// Full button label (already translated).
  final String label;

  /// Optional shorter label used on medium-width headers (e.g. "Form Builder").
  final String? compactLabel;

  /// Leading icon; also used for icon-only rendering.
  final IconData icon;

  /// Tap handler. Null renders the button disabled.
  final VoidCallback? onPressed;

  /// Visual emphasis.
  final PageHeaderActionStyle style;

  /// Shows a spinner and disables the button while true.
  final bool isLoading;

  /// Creates a [PageHeaderAction].
  const PageHeaderAction({
    required this.label,
    required this.icon,
    required this.onPressed,
    this.compactLabel,
    this.style = PageHeaderActionStyle.secondary,
    this.isLoading = false,
  });
}

/// <summary>
/// Breakpoint tiers for [PageHeader], resolved from the header's own width (not the window),
/// so behavior stays correct whether the sidebar is expanded or collapsed.
/// </summary>
enum PageHeaderTier {
  /// ≥ 1100px: single row, description visible, all actions labelled.
  wide,

  /// 780–1099px: single row, description hidden, secondary actions icon-only.
  medium,

  /// &lt; 780px: stacked; primary action full label, secondary actions in overflow menu.
  compact,
}

/// <summary>
/// The single standardized page header ("mold") for every BCC desktop and mobile screen.
/// Pass content and intent as parameters; layout adaptation is handled centrally.
/// </summary>
class PageHeader extends StatelessWidget {
  /// Width at or above which the header uses the [PageHeaderTier.wide] layout.
  static const double wideBreakpoint = 1100;

  /// Width below which the header uses the [PageHeaderTier.compact] layout.
  static const double compactBreakpoint = 780;

  /// Leading feature icon.
  final IconData icon;

  /// Module eyebrow above the title (e.g. "USER MANAGEMENT &amp; DIRECTORY").
  final String eyebrow;

  /// Page headline title.
  final String title;

  /// Optional description; hidden automatically on medium and compact tiers.
  final String? description;

  /// Back navigation behavior (none, previous, or specific destination).
  final PageHeaderBack back;

  /// Optional primary call-to-action (always visible with a label).
  final PageHeaderAction? primaryAction;

  /// Secondary actions; icon-only on medium, overflow menu on compact.
  final List<PageHeaderAction> secondaryActions;

  /// Arbitrary extra widgets (refresh icon, status pill, legacy buttons) placed before actions.
  final List<Widget> trailing;

  /// Optional contextual (i) info widget rendered beside the title (e.g. ContextualInfoButton).
  final Widget? info;

  /// Optional "Replay tour" handler; renders a (?) icon button when provided.
  final VoidCallback? onReplayTour;

  /// Shows a thin progress bar along the bottom edge while true.
  final bool isLoading;

  /// Optional icon color override (defaults to Royal Blue).
  final Color? iconColor;

  /// Optional icon tile background override.
  final Color? iconBgColor;

  /// Creates a [PageHeader].
  const PageHeader({
    super.key,
    required this.icon,
    required this.eyebrow,
    required this.title,
    this.description,
    this.back = PageHeaderBack.none,
    this.primaryAction,
    this.secondaryActions = const [],
    this.trailing = const [],
    this.info,
    this.onReplayTour,
    this.isLoading = false,
    this.iconColor,
    this.iconBgColor,
  });

  /// <summary>Resolves the layout tier for a given header width.</summary>
  /// <param name="width">Available header width.</param>
  /// <returns>The matching [PageHeaderTier].</returns>
  static PageHeaderTier tierFor(double width) {
    if (width >= wideBreakpoint) return PageHeaderTier.wide;
    if (width >= compactBreakpoint) return PageHeaderTier.medium;
    return PageHeaderTier.compact;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 1)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final tier = tierFor(constraints.maxWidth);
                return tier == PageHeaderTier.compact
                    ? _buildCompact(context, isDark)
                    : _buildSingleRow(context, isDark, tier);
              },
            ),
          ),
          if (isLoading) const LinearProgressIndicator(minHeight: 2.5),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Layouts
  // ---------------------------------------------------------------------------

  /// Wide/medium: [back][icon][text] ........ [trailing][secondary][primary]
  Widget _buildSingleRow(BuildContext context, bool isDark, PageHeaderTier tier) {
    final isWide = tier == PageHeaderTier.wide;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (back.isVisible) ...[
          _buildBackControl(isDark, showLabel: isWide),
          const SizedBox(width: 12),
        ],
        _buildIconTile(isDark),
        const SizedBox(width: 14),
        Expanded(flex: 3, child: _buildTextBlock(isDark, showDescription: isWide)),
        const SizedBox(width: 16),
        // Actions get up to 40% of the row and wrap onto a second line instead of
        // overflowing when a screen supplies many buttons.
        Flexible(
          flex: 2,
          child: Align(
            alignment: Alignment.centerRight,
            child: _buildActionsRow(context, isDark, iconOnlySecondary: !isWide, useCompactLabels: !isWide),
          ),
        ),
      ],
    );
  }

  /// Compact: title row on top (text only, back button handled by mobile shell top bar), actions row underneath.
  Widget _buildCompact(BuildContext context, bool isDark) {
    final hasActions = primaryAction != null || secondaryActions.isNotEmpty || trailing.isNotEmpty || onReplayTour != null;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            // Decorative icon tile and back button omitted on mobile/compact:
            // The mobile app shell top bar already provides the back arrow.
            Expanded(child: _buildTextBlock(isDark, showDescription: false)),
          ],
        ),
        if (hasActions) ...[
          const SizedBox(height: 12),
          // When a custom single widget is provided for mobile actions (e.g. balanced 2-button row),
          // render it directly so it can span the full container width.
          if (trailing.length == 1 && secondaryActions.isEmpty && primaryAction == null && onReplayTour == null)
            trailing.first
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                ...trailing,
                if (onReplayTour != null) _buildTourButton(context, isDark),
                if (secondaryActions.isNotEmpty) _buildOverflowMenu(context, isDark),
                if (primaryAction != null) _buildActionButton(primaryAction!, isDark, iconOnly: false, compactLabel: false, isMobile: true),
              ],
            ),
        ],
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Parts
  // ---------------------------------------------------------------------------

  /// Back control: arrow tile for history back; arrow + label pill for targeted back.
  Widget _buildBackControl(bool isDark, {required bool showLabel}) {
    final bg = isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF);
    final border = isDark ? AppColors.outlineDark : const Color(0xFFBFDBFE);
    final hasLabel = back.label != null && showLabel;

    return Tooltip(
      message: back.tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: back.onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            height: 42,
            width: hasLabel ? null : 42,
            padding: hasLabel ? const EdgeInsets.symmetric(horizontal: 12) : null,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.arrow_back_rounded, size: 20, color: AppColors.primary),
                if (hasLabel) ...[
                  const SizedBox(width: 6),
                  Text(
                    back.label!,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppColors.primary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildIconTile(bool isDark) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: iconBgColor ?? AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: iconColor ?? AppColors.primary, size: 24),
    );
  }

  /// Eyebrow (1 line), title (1 line + tooltip), optional description (max 2 lines).
  Widget _buildTextBlock(bool isDark, {required bool showDescription}) {
    final hasDescription = showDescription && description != null && description!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          eyebrow.toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.06,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            Flexible(
              child: Tooltip(
                message: title,
                waitDuration: const Duration(milliseconds: 700),
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                  ),
                ),
              ),
            ),
            if (info != null) ...[const SizedBox(width: 4), info!],
          ],
        ),
        if (hasDescription) ...[
          const SizedBox(height: 2),
          Text(
            description!,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: isDark ? AppColors.gray400 : AppColors.gray600),
          ),
        ],
      ],
    );
  }

  Widget _buildActionsRow(
    BuildContext context,
    bool isDark, {
    required bool iconOnlySecondary,
    required bool useCompactLabels,
  }) {
    final children = <Widget>[
      ...trailing,
      if (onReplayTour != null) _buildTourButton(context, isDark),
      for (final a in secondaryActions)
        _buildActionButton(a, isDark, iconOnly: iconOnlySecondary, compactLabel: useCompactLabels),
      if (primaryAction != null)
        _buildActionButton(primaryAction!, isDark, iconOnly: false, compactLabel: useCompactLabels),
    ];

    return Wrap(
      alignment: WrapAlignment.end,
      spacing: 10,
      runSpacing: 10,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: children,
    );
  }

  Widget _buildTourButton(BuildContext context, bool isDark) {
    return IconButton(
      tooltip: context.trc('ui.replay_tour', fallback: 'Replay tour'),
      onPressed: onReplayTour,
      splashRadius: 18,
      icon: Icon(Icons.help_outline_rounded, size: 20, color: isDark ? AppColors.gray400 : AppColors.gray600),
    );
  }

  /// Renders a [PageHeaderAction] per style and current tier.
  Widget _buildActionButton(
    PageHeaderAction a,
    bool isDark, {
    required bool iconOnly,
    required bool compactLabel,
    bool isMobile = false,
  }) {
    final label = compactLabel ? (a.compactLabel ?? a.label) : a.label;
    final onPressed = a.isLoading ? null : a.onPressed;
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(8));
    final Widget leading = a.isLoading
        ? SizedBox(
            width: isMobile ? 12 : 14,
            height: isMobile ? 12 : 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: a.style == PageHeaderActionStyle.primary ? Colors.white : AppColors.primary,
            ),
          )
        : Icon(a.icon, size: isMobile ? 14 : 16);

    // Destructive red is reserved for destructive actions only (brand rule)
    final fg = switch (a.style) {
      PageHeaderActionStyle.primary => Colors.white,
      PageHeaderActionStyle.destructive => const Color(0xFFDC2626),
      PageHeaderActionStyle.secondary => isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
    };
    final side = BorderSide(
      color: a.style == PageHeaderActionStyle.destructive
          ? const Color(0xFFDC2626).withValues(alpha: 0.4)
          : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
    );

    if (iconOnly) {
      return Tooltip(
        message: a.label,
        child: SizedBox(
          width: isMobile ? 34 : 40,
          height: isMobile ? 34 : 40,
          child: OutlinedButton(
            onPressed: onPressed,
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.zero,
              shape: shape,
              side: side,
              foregroundColor: fg,
            ),
            child: leading,
          ),
        ),
      );
    }

    final hPad = isMobile ? 12.0 : 18.0;
    final vPad = isMobile ? 7.0 : 12.0;
    final fontSize = isMobile ? 12.0 : 13.0;

    if (a.style == PageHeaderActionStyle.primary) {
      return ElevatedButton.icon(
        onPressed: onPressed,
        icon: leading,
        label: Text(label, style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w700)),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: isMobile ? const Size(0, 35) : null,
          padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
          shape: shape,
        ),
      );
    }

    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: leading,
      label: Text(label, style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600)),
      style: OutlinedButton.styleFrom(
        minimumSize: isMobile ? const Size(0, 35) : null,
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 12.0 : 16.0, vertical: vPad),
        shape: shape,
        side: side,
        foregroundColor: fg,
      ),
    );
  }

  /// Compact-tier overflow (⋯) menu holding all secondary actions.
  Widget _buildOverflowMenu(BuildContext context, bool isDark) {
    return PopupMenuButton<int>(
      tooltip: context.trc('shell.more_actions', fallback: 'More actions'),
      icon: Icon(Icons.more_horiz_rounded, color: isDark ? AppColors.gray300 : AppColors.gray600),
      onSelected: (i) => secondaryActions[i].onPressed?.call(),
      itemBuilder: (context) => [
        for (var i = 0; i < secondaryActions.length; i++)
          PopupMenuItem<int>(
            value: i,
            enabled: secondaryActions[i].onPressed != null && !secondaryActions[i].isLoading,
            child: Row(
              children: [
                Icon(
                  secondaryActions[i].icon,
                  size: 16,
                  color: secondaryActions[i].style == PageHeaderActionStyle.destructive
                      ? const Color(0xFFDC2626)
                      : null,
                ),
                const SizedBox(width: 10),
                Text(secondaryActions[i].label),
              ],
            ),
          ),
      ],
    );
  }
}
