import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Screen categorization types based on available layout width.
enum DeviceScreenType {
  /// Mobile portrait and compact screens (< 640px).
  mobile,

  /// Tablet and compact foldables (640px - 1023px).
  tablet,

  /// Standard desktop, laptops, and large tablets in landscape (1024px - 1439px).
  desktop,

  /// Ultra-wide monitors and multi-column displays (>= 1440px).
  wide,
}

/// Centralized Adaptive & Responsive Layout Adjuster for Ozikol BCC Flutter Suite.
/// Provides universal screen breakpoints, dynamic intrinsic-height grid systems,
/// auto-adjusting metric cards, responsive split containers, and text scale clamping.
/// Eliminates brittle childAspectRatio constraints and prevents layout overflows.
class CentralAdjuster {
  /// Mobile maximum width boundary (640px).
  static const double mobileMax = 640.0;

  /// Tablet maximum width boundary (1024px).
  static const double tabletMax = 1024.0;

  /// Standard desktop maximum width boundary (1440px).
  static const double desktopMax = 1440.0;

  /// Default grid column minimum width (240px).
  static const double defaultMinItemWidth = 240.0;

  /// Default gutter spacing (16px).
  static const double defaultSpacing = 16.0;

  /// Returns the [DeviceScreenType] based on current [BuildContext] width.
  ///
  /// <param name="context">The active build context.</param>
  /// <returns>The calculated [DeviceScreenType].</returns>
  static DeviceScreenType getScreenType(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width < mobileMax) return DeviceScreenType.mobile;
    if (width < tabletMax) return DeviceScreenType.tablet;
    if (width < desktopMax) return DeviceScreenType.desktop;
    return DeviceScreenType.wide;
  }

  /// Checks if the current display context is mobile-sized (< 640px).
  ///
  /// <param name="context">The active build context.</param>
  /// <returns>True if width is less than 640px.</returns>
  static bool isMobile(BuildContext context) {
    return MediaQuery.of(context).size.width < mobileMax;
  }

  /// Checks if the current display context is tablet-sized (640px - 1023px).
  ///
  /// <param name="context">The active build context.</param>
  /// <returns>True if width is between 640px and 1023px.</returns>
  static bool isTablet(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    return width >= mobileMax && width < tabletMax;
  }

  /// Checks if the current display context is desktop-sized (>= 1024px).
  ///
  /// <param name="context">The active build context.</param>
  /// <returns>True if width is at least 1024px.</returns>
  static bool isDesktop(BuildContext context) {
    return MediaQuery.of(context).size.width >= tabletMax;
  }

  /// Checks if the current display context is wide/4K (>= 1440px).
  ///
  /// <param name="context">The active build context.</param>
  /// <returns>True if width is at least 1440px.</returns>
  static bool isWide(BuildContext context) {
    return MediaQuery.of(context).size.width >= desktopMax;
  }

  /// Resolves a responsive value based on the current active breakpoint.
  ///
  /// <param name="context">The active build context.</param>
  /// <param name="mobile">Value used for mobile devices.</param>
  /// <param name="tablet">Optional value used for tablet devices.</param>
  /// <param name="desktop">Value used for desktop devices.</param>
  /// <param name="wide">Optional value used for ultra-wide displays.</param>
  /// <returns>The matching typed value.</returns>
  static T value<T>(
    BuildContext context, {
    required T mobile,
    T? tablet,
    required T desktop,
    T? wide,
  }) {
    final width = MediaQuery.of(context).size.width;
    if (width >= desktopMax && wide != null) return wide;
    if (width >= tabletMax) return desktop;
    if (width >= mobileMax && tablet != null) return tablet;
    return mobile;
  }

  /// Creates an adaptive responsive grid that calculates columns dynamically
  /// and uses intrinsic row heights so children never overflow vertically.
  ///
  /// <param name="children">The list of child widgets to display.</param>
  /// <param name="minItemWidth">Minimum width per column before wrapping.</param>
  /// <param name="spacing">Horizontal spacing between items.</param>
  /// <param name="runSpacing">Vertical spacing between rows.</param>
  /// <param name="maxColumns">Optional maximum number of columns.</param>
  /// <param name="minColumns">Optional minimum number of columns.</param>
  /// <param name="equalizeRowHeights">Whether all items in a row match the tallest item.</param>
  /// <returns>An [AdaptiveResponsiveGrid] widget.</returns>
  static Widget grid({
    required List<Widget> children,
    double minItemWidth = defaultMinItemWidth,
    double spacing = defaultSpacing,
    double runSpacing = defaultSpacing,
    int? maxColumns,
    int? minColumns,
    bool equalizeRowHeights = false,
  }) {
    return AdaptiveResponsiveGrid(
      minItemWidth: minItemWidth,
      spacing: spacing,
      runSpacing: runSpacing,
      maxColumns: maxColumns,
      minColumns: minColumns,
      equalizeRowHeights: equalizeRowHeights,
      children: children,
    );
  }

  /// Creates a responsive split row that displays two widgets side-by-side on desktop
  /// and automatically stacks them vertically on mobile/tablet.
  ///
  /// <param name="first">First widget (left on desktop, top on mobile).</param>
  /// <param name="second">Second widget (right on desktop, bottom on mobile).</param>
  /// <param name="breakpoint">Width threshold where items transition from row to column.</param>
  /// <param name="spacing">Gutter spacing between the two widgets.</param>
  /// <param name="firstFlex">Flex factor for the first widget on desktop.</param>
  /// <param name="secondFlex">Flex factor for the second widget on desktop.</param>
  /// <param name="crossAxisAlignment">Cross-axis alignment when in row mode.</param>
  /// <returns>An [AdaptiveSplitRow] widget.</returns>
  static Widget split({
    required Widget first,
    required Widget second,
    double breakpoint = tabletMax,
    double spacing = 18.0,
    int firstFlex = 1,
    int secondFlex = 1,
    CrossAxisAlignment crossAxisAlignment = CrossAxisAlignment.start,
  }) {
    return AdaptiveSplitRow(
      first: first,
      second: second,
      breakpoint: breakpoint,
      spacing: spacing,
      firstFlex: firstFlex,
      secondFlex: secondFlex,
      crossAxisAlignment: crossAxisAlignment,
    );
  }

  /// Creates an auto-adjusting operational metric card matching the BCC web layout.
  ///
  /// <param name="title">Upper metric category title.</param>
  /// <param name="value">Large headline metric value.</param>
  /// <param name="subtext">Descriptive subtitle or action link.</param>
  /// <param name="icon">Leading decorative icon.</param>
  /// <param name="gradientColors">Optional gradient colors for the icon box.</param>
  /// <param name="iconColor">Optional single icon color if gradient is omitted.</param>
  /// <param name="valueColor">Optional custom color for the headline value.</param>
  /// <param name="isAlert">Whether this card is in an alert/warning state.</param>
  /// <param name="onTap">Optional click callback.</param>
  /// <param name="trailing">Optional trailing action or status pill widget.</param>
  /// <returns>An [AdaptiveMetricCard] widget.</returns>
  static Widget metricCard({
    required String title,
    required String value,
    required String subtext,
    required IconData icon,
    List<Color>? gradientColors,
    Color? iconColor,
    Color? valueColor,
    bool isAlert = false,
    VoidCallback? onTap,
    Widget? trailing,
    bool? isCompact,
  }) {
    return AdaptiveMetricCard(
      title: title,
      value: value,
      subtext: subtext,
      icon: icon,
      gradientColors: gradientColors,
      iconColor: iconColor,
      valueColor: valueColor,
      isAlert: isAlert,
      onTap: onTap,
      trailing: trailing,
      isCompact: isCompact,
    );
  }

  /// Creates an auto-adjusting metric grid specifically tuned for top scorecard KPIs.
  ///
  /// <param name="cards">List of metric cards or widgets to display.</param>
  /// <param name="spacing">Gutter spacing between cards.</param>
  /// <param name="runSpacing">Vertical spacing between card rows.</param>
  /// <param name="maxColumns">Maximum columns on large screens (default 4).</param>
  /// <returns>An [AdaptiveMetricGrid] widget.</returns>
  static Widget metricGrid({
    required List<Widget> cards,
    double spacing = defaultSpacing,
    double runSpacing = defaultSpacing,
    int maxColumns = 4,
  }) {
    return AdaptiveMetricGrid(
      spacing: spacing,
      runSpacing: runSpacing,
      maxColumns: maxColumns,
      children: cards,
    );
  }

  /// Creates a standardized enterprise card container matching BCC design tokens.
  ///
  /// <param name="child">The content widget inside the card.</param>
  /// <param name="padding">Internal padding (defaults to 16 horizontal, 14 vertical).</param>
  /// <param name="header">Optional header widget.</param>
  /// <param name="onTap">Optional tap callback.</param>
  /// <param name="backgroundColor">Optional background color override.</param>
  /// <param name="borderRadius">Corner border radius (default 12).</param>
  /// <returns>An [AdaptiveCard] widget.</returns>
  static Widget card({
    required Widget child,
    EdgeInsetsGeometry? padding,
    Widget? header,
    VoidCallback? onTap,
    Color? backgroundColor,
    double borderRadius = 12.0,
  }) {
    return AdaptiveCard(
      padding: padding,
      header: header,
      onTap: onTap,
      backgroundColor: backgroundColor,
      borderRadius: borderRadius,
      child: child,
    );
  }

  /// Standardized responsive page shell that dynamically adjusts horizontal and
  /// vertical padding based on screen size, ensuring zero edge clipping.
  ///
  /// <param name="child">The main page scrollable or column content.</param>
  /// <param name="padding">Optional custom padding override.</param>
  /// <returns>An [AdaptivePageShell] widget.</returns>
  static Widget pageShell({
    required Widget child,
    EdgeInsetsGeometry? padding,
  }) {
    return AdaptivePageShell(
      padding: padding,
      child: child,
    );
  }

  /// <summary>
  /// Creates a standardized, responsive enterprise page header matching BCC design tokens.
  /// Automatically spans 100% width, gracefully handles actions wrapping, and adapts
  /// between single-row (desktop) and stacked column (mobile/compact) layouts.
  /// </summary>
  /// <param name="icon">Leading category or feature icon.</param>
  /// <param name="eyebrow">Upper category or module eyebrow tag (e.g. USER MANAGEMENT & DIRECTORY).</param>
  /// <param name="title">Headline page title.</param>
  /// <param name="subtitle">Descriptive subtext explaining the screen.</param>
  /// <param name="actions">List of action buttons or controls (e.g. Add Member, Export, Refresh).</param>
  /// <param name="isDark">Theme mode indicator.</param>
  /// <param name="iconColor">Optional icon color override (defaults to royal blue).</param>
  /// <param name="iconBgColor">Optional icon container background color.</param>
  /// <param name="onBack">Optional back navigation callback. When provided, renders an adaptive back button.</param>
  /// <returns>An [AdaptivePageHeader] widget.</returns>
  static Widget pageHeader({
    required IconData icon,
    required String eyebrow,
    required String title,
    required String subtitle,
    required List<Widget> actions,
    required bool isDark,
    Color? iconColor,
    Color? iconBgColor,
    VoidCallback? onBack,
  }) {
    return AdaptivePageHeader(
      icon: icon,
      eyebrow: eyebrow,
      title: title,
      subtitle: subtitle,
      actions: actions,
      isDark: isDark,
      iconColor: iconColor,
      iconBgColor: iconBgColor,
      onBack: onBack,
    );
  }

  /// <summary>
  /// Creates an adaptive enterprise table container that provides smooth horizontal scrolling
  /// on compact/mobile screens while automatically expanding to 100% card width on maximized
  /// desktop monitors, eliminating awkward blank space and distributing column spacing.
  /// </summary>
  /// <param name="builder">Builder function providing the context, resolved table width, and extra distributed spacing.</param>
  /// <param name="minWidth">Minimum width floor before horizontal scrolling begins (default 1040.0).</param>
  /// <param name="header">Optional header widget placed above the scrollable table.</param>
  /// <param name="footer">Optional footer widget placed below the scrollable table (e.g. pagination bar).</param>
  /// <param name="decoration">Optional custom box decoration for the table card.</param>
  /// <param name="borderRadius">Corner border radius (default 12.0).</param>
  /// <param name="numColumns">Column count used to compute per-column extra space distribution.</param>
  /// <returns>An [AdaptiveTableContainer] widget.</returns>
  static Widget tableContainer({
    required Widget Function(BuildContext context, double tableWidth, double extraSpacing) builder,
    double minWidth = 1040.0,
    Widget? header,
    Widget? footer,
    BoxDecoration? decoration,
    double borderRadius = 12.0,
    int numColumns = 7,
  }) {
    return AdaptiveTableContainer(
      builder: builder,
      minWidth: minWidth,
      header: header,
      footer: footer,
      decoration: decoration,
      borderRadius: borderRadius,
      numColumns: numColumns,
    );
  }
}

/// Adaptive responsive grid that automatically calculates columns from available container width
/// and uses intrinsic row heights so items never overflow.
class AdaptiveResponsiveGrid extends StatelessWidget {
  /// The list of items to place in the grid.
  final List<Widget> children;

  /// Minimum width required for each column before wrapping.
  final double minItemWidth;

  /// Horizontal spacing between items.
  final double spacing;

  /// Vertical spacing between rows.
  final double runSpacing;

  /// Maximum allowed columns.
  final int? maxColumns;

  /// Minimum allowed columns.
  final int? minColumns;

  /// Whether all items in the same row should stretch to match the tallest item.
  final bool equalizeRowHeights;

  /// Creates an [AdaptiveResponsiveGrid].
  const AdaptiveResponsiveGrid({
    super.key,
    required this.children,
    this.minItemWidth = CentralAdjuster.defaultMinItemWidth,
    this.spacing = CentralAdjuster.defaultSpacing,
    this.runSpacing = CentralAdjuster.defaultSpacing,
    this.maxColumns,
    this.minColumns,
    this.equalizeRowHeights = false,
  });

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final availableWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : MediaQuery.of(context).size.width;

        // Calculate columns based on available width and minItemWidth
        int cols = ((availableWidth + spacing) / (minItemWidth + spacing)).floor();
        if (maxColumns != null) cols = math.min(cols, maxColumns!);
        if (minColumns != null) cols = math.max(cols, minColumns!);
        cols = cols.clamp(1, math.max(1, children.length));

        // Group children into chunks per row
        final List<List<Widget>> rows = [];
        for (int i = 0; i < children.length; i += cols) {
          final end = math.min(i + cols, children.length);
          rows.add(children.sublist(i, end));
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            for (int r = 0; r < rows.length; r++) ...[
              if (r > 0) SizedBox(height: runSpacing),
              if (equalizeRowHeights)
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: _buildRowItems(rows[r], cols),
                  ),
                )
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: _buildRowItems(rows[r], cols),
                ),
            ],
          ],
        );
      },
    );
  }

  List<Widget> _buildRowItems(List<Widget> rowItems, int totalCols) {
    final List<Widget> items = [];
    for (int i = 0; i < rowItems.length; i++) {
      if (i > 0) items.add(SizedBox(width: spacing));
      items.add(Expanded(child: rowItems[i]));
    }
    // Pad the remaining slots in the last row to maintain column alignment
    final remainingSlots = totalCols - rowItems.length;
    for (int s = 0; s < remainingSlots; s++) {
      items.add(SizedBox(width: spacing));
      items.add(const Expanded(child: SizedBox.shrink()));
    }
    return items;
  }
}

/// Auto-adjusting metric scorecard card that adapts typography, padding, and icons
/// to its allocated container width, matching the BCC web portal design.
class AdaptiveMetricCard extends StatelessWidget {
  /// Category label in small uppercase text.
  final String title;

  /// Large headline metric value.
  final String value;

  /// Subtitle or secondary action link text.
  final String subtext;

  /// Leading decorative icon.
  final IconData icon;

  /// Optional gradient colors for the icon container.
  final List<Color>? gradientColors;

  /// Optional single icon color.
  final Color? iconColor;

  /// Optional custom text color for the value.
  final Color? valueColor;

  /// Whether the card represents an alert state.
  final bool isAlert;

  /// Optional tap callback.
  final VoidCallback? onTap;

  /// Optional trailing widget (e.g. badge, chevron, button).
  final Widget? trailing;

  /// Internal padding override.
  final EdgeInsetsGeometry? padding;

  /// Optional compact sizing override. Defaults to responsive width detection.
  final bool? isCompact;

  /// Creates an [AdaptiveMetricCard].
  const AdaptiveMetricCard({
    super.key,
    required this.title,
    required this.value,
    required this.subtext,
    required this.icon,
    this.gradientColors,
    this.iconColor,
    this.valueColor,
    this.isAlert = false,
    this.onTap,
    this.trailing,
    this.padding,
    this.isCompact,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final compact = isCompact ?? CentralAdjuster.isMobile(context);

    final iconBoxSize = compact ? 36.0 : 42.0;
    final iconGlyphSize = compact ? 18.0 : 20.0;
    final titleFontSize = compact ? 9.5 : 10.5;
    final valueFontSize = compact ? 19.0 : 22.0;
    final subtextFontSize = compact ? 10.0 : 11.0;
    final cardPadding = padding ??
        EdgeInsets.symmetric(
          horizontal: compact ? 11.0 : 14.0,
          vertical: compact ? 9.0 : 11.0,
        );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: cardPadding,
          decoration: BoxDecoration(
            color: isAlert
                ? (isDark ? const Color(0xFF38151D) : const Color(0xFFFFF1F2))
                : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isAlert
                  ? const Color(0xFFFECDD3)
                  : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: iconBoxSize,
                height: iconBoxSize,
                decoration: BoxDecoration(
                  gradient: gradientColors != null
                      ? LinearGradient(
                          colors: gradientColors!,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: gradientColors == null
                      ? (iconColor?.withValues(alpha: 0.12) ?? AppColors.primary.withValues(alpha: 0.12))
                      : null,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: gradientColors != null ? Colors.white : (iconColor ?? AppColors.primary),
                  size: iconGlyphSize,
                ),
              ),
              SizedBox(width: compact ? 10 : 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: titleFontSize,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.05,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: valueFontSize,
                        fontWeight: FontWeight.w800,
                        color: valueColor ??
                            (isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtext,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: subtextFontSize,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.gray400 : AppColors.gray500,
                      ),
                    ),
                  ],
                ),
              ),
              if (trailing != null) ...[
                const SizedBox(width: 8),
                trailing!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Specialized responsive grid for operational metric scorecards.
class AdaptiveMetricGrid extends StatelessWidget {
  /// Metric cards or widgets to lay out.
  final List<Widget> children;

  /// Horizontal spacing between cards.
  final double spacing;

  /// Vertical spacing between rows.
  final double runSpacing;

  /// Maximum allowed columns on large screens.
  final int maxColumns;

  /// Minimum width required per card before wrapping.
  final double minItemWidth;

  /// Creates an [AdaptiveMetricGrid].
  const AdaptiveMetricGrid({
    super.key,
    required this.children,
    this.spacing = CentralAdjuster.defaultSpacing,
    this.runSpacing = CentralAdjuster.defaultSpacing,
    this.maxColumns = 4,
    this.minItemWidth = 220.0,
  });

  @override
  Widget build(BuildContext context) {
    return AdaptiveResponsiveGrid(
      spacing: spacing,
      runSpacing: runSpacing,
      maxColumns: maxColumns,
      minItemWidth: minItemWidth,
      equalizeRowHeights: false,
      children: children,
    );
  }
}

/// Responsive split container that lays out two widgets side-by-side on desktop
/// and automatically stacks them vertically on smaller screens.
class AdaptiveSplitRow extends StatelessWidget {
  /// Left or top widget.
  final Widget first;

  /// Right or bottom widget.
  final Widget second;

  /// Width breakpoint for row layout.
  final double breakpoint;

  /// Spacing between the widgets.
  final double spacing;

  /// Flex weight for the first widget on desktop.
  final int firstFlex;

  /// Flex weight for the second widget on desktop.
  final int secondFlex;

  /// Cross-axis alignment for the row mode.
  final CrossAxisAlignment crossAxisAlignment;

  /// Creates an [AdaptiveSplitRow].
  const AdaptiveSplitRow({
    super.key,
    required this.first,
    required this.second,
    this.breakpoint = CentralAdjuster.tabletMax,
    this.spacing = 18.0,
    this.firstFlex = 1,
    this.secondFlex = 1,
    this.crossAxisAlignment = CrossAxisAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : MediaQuery.of(context).size.width;

        if (width >= breakpoint) {
          return Row(
            crossAxisAlignment: crossAxisAlignment,
            children: [
              Expanded(flex: firstFlex, child: first),
              SizedBox(width: spacing),
              Expanded(flex: secondFlex, child: second),
            ],
          );
        } else {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              first,
              SizedBox(height: spacing),
              second,
            ],
          );
        }
      },
    );
  }
}

/// Standardized enterprise card container matching BCC design tokens.
class AdaptiveCard extends StatelessWidget {
  /// Content inside the card.
  final Widget child;

  /// Internal padding.
  final EdgeInsetsGeometry? padding;

  /// Optional header widget placed above the child.
  final Widget? header;

  /// Optional click callback.
  final VoidCallback? onTap;

  /// Background color override.
  final Color? backgroundColor;

  /// Corner radius.
  final double borderRadius;

  /// Creates an [AdaptiveCard].
  const AdaptiveCard({
    super.key,
    required this.child,
    this.padding,
    this.header,
    this.onTap,
    this.backgroundColor,
    this.borderRadius = 12.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget cardBody = Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor ?? (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (header != null) ...[
            header!,
            const SizedBox(height: 14),
          ],
          child,
        ],
      ),
    );

    if (onTap != null) {
      cardBody = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: cardBody,
        ),
      );
    }

    return cardBody;
  }
}

/// Standardized page shell with responsive padding and overflow immunity.
class AdaptivePageShell extends StatelessWidget {
  /// The page content.
  final Widget child;

  /// Optional padding override.
  final EdgeInsetsGeometry? padding;

  /// Creates an [AdaptivePageShell].
  const AdaptivePageShell({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final isDesktop = CentralAdjuster.isDesktop(context);
    final effectivePadding = padding ??
        EdgeInsets.symmetric(
          horizontal: isDesktop ? 24.0 : 16.0,
          vertical: isDesktop ? 20.0 : 14.0,
        );

    return SingleChildScrollView(
      padding: effectivePadding,
      child: child,
    );
  }
}

/// <summary>
/// Adaptive enterprise table container widget that dynamically responds to window resize events.
/// Provides smooth horizontal scrolling on compact/unmaximized windows while automatically
/// expanding table width and column spacing to 100% of the canvas on maximized desktop displays.
/// </summary>
class AdaptiveTableContainer extends StatelessWidget {
  /// Builder receiving active context, resolved table width, and distributed extra spacing.
  final Widget Function(BuildContext context, double tableWidth, double extraSpacing) builder;

  /// Minimum width required by the table content before horizontal scrolling begins.
  final double minWidth;

  /// Optional header widget placed above the scrollable table (e.g. search/filter or quick stats).
  final Widget? header;

  /// Optional footer widget placed below the scrollable table (e.g. pagination controls).
  final Widget? footer;

  /// Optional box decoration override.
  final BoxDecoration? decoration;

  /// Corner radius for the enclosing card container.
  final double borderRadius;

  /// Number of columns in the table, used to compute per-column extra space distribution.
  final int numColumns;

  /// <summary>
  /// Creates an [AdaptiveTableContainer] instance.
  /// </summary>
  const AdaptiveTableContainer({
    super.key,
    required this.builder,
    this.minWidth = 1040.0,
    this.header,
    this.footer,
    this.decoration,
    this.borderRadius = 12.0,
    this.numColumns = 7,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final defaultDecoration = BoxDecoration(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.02),
          blurRadius: 3,
          offset: const Offset(0, 1),
        ),
      ],
    );

    return Container(
      decoration: decoration ?? defaultDecoration,
      clipBehavior: Clip.antiAlias,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final double availableWidth = constraints.maxWidth.isFinite
              ? constraints.maxWidth
              : MediaQuery.of(context).size.width;

          final bool hasEnoughWidth = availableWidth >= minWidth;
          final double targetWidth = math.max(availableWidth, minWidth);
          final double extraWidth = targetWidth > minWidth ? (targetWidth - minWidth) : 0.0;
          final int gapCount = math.max(1, numColumns - 1);
          final double extraSpacing = extraWidth / gapCount;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (header != null) ...[
                header!,
                Divider(height: 1, color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              ],
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: hasEnoughWidth ? const NeverScrollableScrollPhysics() : const ClampingScrollPhysics(),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minWidth: targetWidth,
                    maxWidth: hasEnoughWidth ? availableWidth : targetWidth,
                  ),
                  child: builder(context, targetWidth, extraSpacing),
                ),
              ),
              if (footer != null) ...[
                Divider(height: 1, color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                footer!,
              ],
            ],
          );
        },
      ),
    );
  }
}

/// <summary>
/// Standardized responsive page header matching the BCC web application design system.
/// Spans 100% of the available width, elegantly aligns title metadata to the left and
/// actions to the right, and automatically transitions to stacked wrap layout on narrow screens.
/// </summary>
class AdaptivePageHeader extends StatelessWidget {
  /// Leading icon.
  final IconData icon;

  /// Eyebrow tag text above title (e.g. USER MANAGEMENT & DIRECTORY).
  final String eyebrow;

  /// Main headline title.
  final String title;

  /// Descriptive subtitle.
  final String subtitle;

  /// Action buttons or controls aligned to the right or wrapped below.
  final List<Widget> actions;

  /// Dark mode indicator.
  final bool isDark;

  /// Optional icon color override.
  final Color? iconColor;

  /// Optional icon container background color.
  final Color? iconBgColor;

  /// Optional back navigation callback. When provided, renders an adaptive back button.
  final VoidCallback? onBack;

  /// Creates an [AdaptivePageHeader].
  const AdaptivePageHeader({
    super.key,
    required this.icon,
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    required this.actions,
    required this.isDark,
    this.iconColor,
    this.iconBgColor,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveIconColor = iconColor ?? AppColors.primary;
    final effectiveIconBg = iconBgColor ?? AppColors.primary.withValues(alpha: 0.1);
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;
    final bgColor = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isStacked = constraints.maxWidth < 780;

          final titleBlock = Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              if (onBack != null) ...[
                Tooltip(
                  message: 'Back',
                  child: InkWell(
                    onTap: onBack,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isDark ? AppColors.outlineDark : const Color(0xFFBFDBFE),
                        ),
                      ),
                      child: const Icon(Icons.arrow_back_rounded, size: 20, color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: effectiveIconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: effectiveIconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      eyebrow.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.06,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );

          final actionsBlock = Wrap(
            spacing: 10,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: actions,
          );

          if (isStacked) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                titleBlock,
                const SizedBox(height: 14),
                actionsBlock,
              ],
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(child: titleBlock),
              const SizedBox(width: 16),
              actionsBlock,
            ],
          );
        },
      ),
    );
  }
}

