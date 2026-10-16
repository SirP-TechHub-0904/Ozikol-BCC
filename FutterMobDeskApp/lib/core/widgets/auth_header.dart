import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Modern wave-clipped header for authentication, workspace entry, and landing screens.
/// Derived from the clean UI kit architecture with fluid bezier curves, royal blue gradient,
/// back navigation trigger, and branded typography.
class AuthHeader extends StatelessWidget {
  /// The primary title text displayed inside the header.
  final String title;

  /// Optional subtitle or domain description text.
  final String? subtitle;

  /// Optional badge or pill widget displayed below the title.
  final Widget? badge;

  /// Whether to display the iOS/modern back button.
  final bool showBackButton;

  /// Optional custom callback invoked when the back button is tapped.
  final VoidCallback? onBackTap;

  /// Optional custom emblem/icon widget. Defaults to an enterprise briefcase emblem.
  final Widget? emblem;

  /// Custom height override. Defaults to responsive height (180-210).
  final double? height;

  const AuthHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.badge,
    this.showBackButton = false,
    this.onBackTap,
    this.emblem,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final headerHeight = height ?? (screenHeight < 700 ? 180.0 : 210.0);
    final topPadding = screenHeight < 700 ? 14.0 : 20.0;
    final bottomPadding = screenHeight < 700 ? 28.0 : 36.0;

    return ClipPath(
      clipper: const _WaveHeaderClipper(),
      child: Container(
        width: double.infinity,
        height: headerHeight,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.secondary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, topPadding, 16, bottomPadding),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      emblem ??
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(45),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: Colors.white.withAlpha(80),
                                width: 1.2,
                              ),
                            ),
                            child: const Icon(
                              Icons.cloud_done_rounded,
                              color: Colors.white,
                              size: 26,
                            ),
                          ),
                      const SizedBox(height: 10),
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: -0.3,
                          height: 1.1,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          subtitle!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: Colors.white.withAlpha(210),
                          ),
                        ),
                      ],
                      if (badge != null) ...[
                        const SizedBox(height: 8),
                        badge!,
                      ],
                    ],
                  ),
                ),
                if (showBackButton)
                  Align(
                    alignment: Alignment.topLeft,
                    child: Tooltip(
                      message: 'Back',
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: onBackTap ??
                              () {
                                if (Navigator.of(context).canPop()) {
                                  Navigator.of(context).pop();
                                }
                              },
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(35),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withAlpha(60),
                                width: 1,
                              ),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.arrow_back_ios_new_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Precise bezier wave clipper creating a smooth curved bottom edge.
class _WaveHeaderClipper extends CustomClipper<Path> {
  const _WaveHeaderClipper();

  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 38);

    final firstControlPoint = Offset(size.width * 0.25, size.height);
    final firstEndPoint = Offset(size.width * 0.5, size.height - 18);
    path.quadraticBezierTo(
      firstControlPoint.dx,
      firstControlPoint.dy,
      firstEndPoint.dx,
      firstEndPoint.dy,
    );

    final secondControlPoint = Offset(size.width * 0.75, size.height - 36);
    final secondEndPoint = Offset(size.width, size.height - 10);
    path.quadraticBezierTo(
      secondControlPoint.dx,
      secondControlPoint.dy,
      secondEndPoint.dx,
      secondEndPoint.dy,
    );

    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
