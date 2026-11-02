import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:window_manager/window_manager.dart';
import '../theme/app_colors.dart';
import 'tenant_cached_image.dart';

/// Clean, frameless desktop title bar providing native window controls
/// (Minimize, Maximize/Restore, Close) and draggable window area.
class DesktopTitleBar extends StatefulWidget {
  /// Optional title displayed on the left of the title bar.
  final String title;

  /// Optional URL of the tenant's uploaded square company icon (preferred for title bar).
  final String? iconUrl;

  /// Optional URL of the tenant's uploaded company logo.
  final String? logoUrl;

  /// Optional custom background color.
  final Color? backgroundColor;

  /// Whether to use light controls (e.g. over dark surfaces).
  final bool? isDarkTheme;

  const DesktopTitleBar({
    super.key,
    this.title = 'Ozikol BCC',
    this.iconUrl,
    this.logoUrl,
    this.backgroundColor,
    this.isDarkTheme,
  });

  @override
  State<DesktopTitleBar> createState() => _DesktopTitleBarState();
}

class _DesktopTitleBarState extends State<DesktopTitleBar> with WindowListener {
  bool _isMaximized = false;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
      windowManager.addListener(this);
      _checkMaximizedState();
    }
  }

  @override
  void dispose() {
    if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
      windowManager.removeListener(this);
    }
    super.dispose();
  }

  /// Immediately and cleanly closes and terminates the desktop application window.
  Future<void> _handleCloseRequest() async {
    try {
      if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
        await windowManager.destroy();
      }
    } catch (_) {
      exit(0);
    }
  }

  @override
  void onWindowClose() async {
    await _handleCloseRequest();
  }

  Future<void> _checkMaximizedState() async {
    try {
      final maximized = await windowManager.isMaximized();
      if (mounted) setState(() => _isMaximized = maximized);
    } catch (_) {}
  }

  @override
  void onWindowMaximize() {
    setState(() => _isMaximized = true);
  }

  @override
  void onWindowUnmaximize() {
    setState(() => _isMaximized = false);
  }

  Future<void> _toggleMaximize() async {
    if (_isMaximized) {
      await windowManager.unmaximize();
    } else {
      await windowManager.maximize();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb || (!Platform.isWindows && !Platform.isMacOS && !Platform.isLinux)) {
      return const SizedBox.shrink();
    }

    final isDark = widget.isDarkTheme ?? (Theme.of(context).brightness == Brightness.dark);
    final iconColor = isDark ? Colors.white70 : const Color(0xFF334155);

    final defaultBg = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final borderColor = isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0);

    final effectiveImageUrl = (widget.iconUrl != null && widget.iconUrl!.trim().isNotEmpty)
        ? widget.iconUrl
        : widget.logoUrl;

    return Material(
      type: MaterialType.transparency,
      child: Container(
        height: 36,
        decoration: BoxDecoration(
          color: widget.backgroundColor ?? defaultBg,
          border: Border(
            bottom: BorderSide(color: borderColor, width: 1),
          ),
        ),
        child: Row(
          children: [
            // Left App Branding & Draggable Title Area
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onDoubleTap: _toggleMaximize,
                child: DragToMoveArea(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Row(
                      children: [
                        if (effectiveImageUrl != null && effectiveImageUrl.trim().isNotEmpty)
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                                width: 0.8,
                              ),
                            ),
                            padding: const EdgeInsets.all(2),
                            child: TenantCachedImage(
                              imageUrl: effectiveImageUrl,
                              width: 16,
                              height: 16,
                              borderRadius: 2,
                              fit: BoxFit.contain,
                              fallbackWidget: Image.asset(
                                'assets/images/oz-logo-white.png',
                                width: 16,
                                height: 16,
                                color: isDark ? Colors.white : AppColors.primary,
                                colorBlendMode: BlendMode.srcIn,
                                errorBuilder: (context, error, stackTrace) => Icon(
                                  Icons.dashboard_rounded,
                                  size: 14,
                                  color: isDark ? Colors.white : AppColors.primary,
                                ),
                              ),
                            ),
                          )
                        else
                          Image.asset(
                            'assets/images/oz-logo-white.png',
                            width: 18,
                            height: 18,
                            color: isDark ? Colors.white : AppColors.primary,
                            colorBlendMode: BlendMode.srcIn,
                            errorBuilder: (context, error, stackTrace) => Icon(
                              Icons.dashboard_rounded,
                              size: 16,
                              color: isDark ? Colors.white : AppColors.primary,
                            ),
                          ),
                        const SizedBox(width: 8),
                        Text(
                          widget.title,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
                            color: isDark ? Colors.white : AppColors.primary,
                            decoration: TextDecoration.none,
                          ),
                        ),
                        if (widget.title.contains(' - Ozikol BCC')) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withAlpha(25),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: const Color(0xFF10B981).withAlpha(120),
                                width: 0.8,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 5,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'ACTIVE',
                                  style: TextStyle(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF059669),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Window Caption Buttons (Minimize, Maximize/Restore, Close)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _CaptionButton(
                  icon: Icons.remove_rounded,
                  tooltip: 'Minimize',
                  iconColor: iconColor,
                  onPressed: () => windowManager.minimize(),
                ),
                _CaptionButton(
                  icon: _isMaximized ? Icons.filter_none_rounded : Icons.crop_square_rounded,
                  size: _isMaximized ? 13 : 15,
                  tooltip: _isMaximized ? 'Restore' : 'Maximize',
                  iconColor: iconColor,
                  onPressed: _toggleMaximize,
                ),
                _CaptionButton(
                  icon: Icons.close_rounded,
                  tooltip: 'Close',
                  isClose: true,
                  iconColor: iconColor,
                  onPressed: _handleCloseRequest,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CaptionButton extends StatefulWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final String tooltip;
  final bool isClose;
  final Color iconColor;
  final double size;

  const _CaptionButton({
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    this.isClose = false,
    required this.iconColor,
    this.size = 16,
  });

  @override
  State<_CaptionButton> createState() => _CaptionButtonState();
}

class _CaptionButtonState extends State<_CaptionButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    Color bg = Colors.transparent;
    Color iconCol = widget.iconColor;

    if (_isHovered) {
      if (widget.isClose) {
        bg = const Color(0xFFE81123);
        iconCol = Colors.white;
      } else {
        bg = Colors.black.withAlpha(20);
      }
    }

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onPressed,
        child: Container(
          width: 44,
          height: 36,
          alignment: Alignment.center,
          color: bg,
          child: Icon(
            widget.icon,
            size: widget.size,
            color: iconCol,
          ),
        ),
      ),
    );
  }
}
