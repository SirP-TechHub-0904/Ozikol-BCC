import 'dart:ui';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/workspace.dart';
import '../theme/app_colors.dart';
import '../../features/workspace_auth/data/workspace_repository.dart';
import '../../features/workspace_auth/presentation/workspace_entry_screen.dart';
import '../../features/workspace_auth/state/workspace_state.dart';

/// Provider caching and resolving live [TenantBranding] and authentication screen layout settings.
final tenantBrandingProvider = FutureProvider.family<TenantBranding, String>((ref, tenantKey) async {
  final repo = ref.watch(workspaceRepositoryProvider);
  return repo.probeTenantBranding(tenantKey);
});

/// <summary>
/// Unified enterprise authentication shell housing desktop & mobile authentication screens
/// (Login, 2FA Verification, First-Time Password Reset, and Account Recovery).
/// Replicates Angular Web AuthLayoutComponent 1-to-1 with dynamic support for:
/// - Screen Layout Architecture: Dual-Pane Split Showcase vs Focused Centered Glass Card
/// - Full-Bleed Background Wallpapers (Curated Presets, Custom URLs, or Direct Desktop Uploads)
/// - Ambient Radial Gradient Backdrop & ImageFilter Blur Overlay
/// - Brand Hero Narrative (Security Badge Chip, Headline, Subtitle Copy, and Compliance Footers)
/// - Responsive Fallback on Narrow/Mobile screens (< 800px width)
/// </summary>
class DesktopAuthLayout extends ConsumerWidget {
  /// The active tenant workspace context.
  final Workspace workspace;

  /// The child authentication form widget (e.g. login credentials, 2FA challenge, password fields).
  final Widget child;

  /// Optional card title displayed above the form (e.g. 'Sign In to Workspace').
  final String? title;

  /// Optional card subtitle or instructions copy.
  final String? subtitle;

  /// Optional custom emblem or avatar widget placed at the top of the form card.
  final Widget? cardAvatar;

  /// Callback triggered when user taps the "Return to Home" / "Change Organization" trigger.
  final VoidCallback? onBackTap;

  /// Maximum width constraint for the credentials form card. Defaults to 440.0.
  final double cardMaxWidth;

  /// Whether to render the compliance disclaimer note at the bottom of the card. Defaults to true.
  final bool showFooterNote;

  /// Default high-resolution enterprise architectural wallpaper fallback.
  static const String defaultWallpaper =
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85';

  /// <summary>
  /// Creates an instance of [DesktopAuthLayout].
  /// </summary>
  const DesktopAuthLayout({
    super.key,
    required this.workspace,
    required this.child,
    this.title,
    this.subtitle,
    this.cardAvatar,
    this.onBackTap,
    this.cardMaxWidth = 440.0,
    this.showFooterNote = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktopWidth = screenWidth >= 840;

    // Watch live tenant branding or fall back gracefully
    final brandingAsync = ref.watch(tenantBrandingProvider(workspace.tenantKey));
    final branding = brandingAsync.valueOrNull ??
        TenantBranding(
          logoUrl: workspace.logoUrl,
          iconUrl: workspace.iconUrl,
          organizationName: workspace.displayName,
          loginLayout: 'centered',
        );

    final isSplit = branding.loginLayout == 'split' && isDesktopWidth;
    final bgUrl = (branding.loginBackgroundImageUrl != null &&
            branding.loginBackgroundImageUrl!.trim().isNotEmpty)
        ? branding.loginBackgroundImageUrl!.trim()
        : defaultWallpaper;

    final logoUrl = (branding.useWhiteLogoInLogin &&
            branding.companyWhiteLogoUrl != null &&
            branding.companyWhiteLogoUrl!.isNotEmpty)
        ? branding.companyWhiteLogoUrl
        : (branding.logoUrl ?? workspace.logoUrl);

    final chipText = branding.loginNoteTitle ?? 'Enterprise Security Portal';
    final heroTitle = branding.loginTitle ?? 'Welcome to ${workspace.displayName}';
    final heroDesc = branding.loginNote ??
        branding.loginSubtitle ??
        'Enter your authorized credentials to access member applications, identity services, and workspace records.';
    final footerNote = branding.loginNoteFooter ??
        'Authorized personnel only. All authentication attempts and access events are encrypted, logged, and audited.';

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: Stack(
        children: [
          // 1. Full-Bleed Background Image Wallpaper
          Positioned.fill(
            child: CachedNetworkImage(
              imageUrl: bgUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(color: const Color(0xFF0F172A)),
              errorWidget: (context, url, error) => Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0050E5), Color(0xFF090D16)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
            ),
          ),

          // 2. Ambient Radial Gradient Backdrop & Blur Filter Overlay
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 5.0, sigmaY: 5.0),
              child: Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(-0.7, -0.5),
                    radius: 1.4,
                    colors: [
                      const Color(0xFF0F172A).withValues(alpha: 0.72),
                      const Color(0xFF090D16).withValues(alpha: 0.90),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 3. Screen Layout (Split Showcase vs Centered Card)
          Positioned.fill(
            child: SafeArea(
              child: isSplit
                  ? _buildSplitLayout(
                      context: context,
                      ref: ref,
                      isDark: isDark,
                      logoUrl: logoUrl,
                      chipText: chipText,
                      heroTitle: heroTitle,
                      heroDesc: heroDesc,
                      footerNote: footerNote,
                    )
                  : _buildCenteredLayout(
                      context: context,
                      ref: ref,
                      isDark: isDark,
                      logoUrl: logoUrl,
                      footerNote: footerNote,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // A. SPLIT SCREEN SHOWCASE (Dual-Pane Desktop Experience)
  // ===========================================================================
  Widget _buildSplitLayout({
    required BuildContext context,
    required WidgetRef ref,
    required bool isDark,
    required String? logoUrl,
    required String chipText,
    required String heroTitle,
    required String heroDesc,
    required String footerNote,
  }) {
    return Row(
      children: [
        // Left Showcase Panel (Hero Narrative, Branding, Attributions)
        Expanded(
          flex: 11,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 36),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Brand Header Row
                Row(
                  children: [
                    _buildBrandLogo(logoUrl: logoUrl, size: 40),
                    const SizedBox(width: 14),
                    Text(
                      workspace.displayName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),

                const Spacer(),

                // Center Hero Narrative
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 540),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Security Badge Chip
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.verified_user_rounded, size: 13, color: Color(0xFF60A5FA)),
                            const SizedBox(width: 6),
                            Text(
                              chipText,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Headline
                      Text(
                        heroTitle,
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.2,
                          letterSpacing: -0.8,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Description
                      Text(
                        heroDesc,
                        style: TextStyle(
                          fontSize: 14.5,
                          color: Colors.white.withValues(alpha: 0.8),
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Bottom Footer: Change Workspace Button + Platform Attribution
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildChangeWorkspacePill(context, ref),
                    const Text(
                      'Powered by Ozikol BCC',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Colors.white54,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Right Credentials Form Card Panel
        Expanded(
          flex: 9,
          child: Container(
            color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.85) : Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 24),
            child: Center(
              child: SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: cardMaxWidth),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildCardHeader(isDark, logoUrl: logoUrl, showLogo: false),
                      const SizedBox(height: 20),
                      child,
                      if (showFooterNote && footerNote.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        Text(
                          footerNote,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 10.5,
                            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            height: 1.4,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // B. CENTERED GLASS CARD (Single Focused Card Experience)
  // ===========================================================================
  Widget _buildCenteredLayout({
    required BuildContext context,
    required WidgetRef ref,
    required bool isDark,
    required String? logoUrl,
    required String footerNote,
  }) {
    return Stack(
      children: [
        // Floating Top-Left "Return to Home / Change Organization" Pill
        Positioned(
          top: 18,
          left: 20,
          child: _buildChangeWorkspacePill(context, ref),
        ),

        // Centered Glass Card Content
        Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: cardMaxWidth),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B).withValues(alpha: 0.95) : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.28),
                          blurRadius: 36,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildCardHeader(isDark, logoUrl: logoUrl, showLogo: true),
                        const SizedBox(height: 22),
                        child,
                      ],
                    ),
                  ),

                  // Bottom Disclaimer & Platform Attribution
                  if (showFooterNote && footerNote.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Text(
                      footerNote,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Colors.white70,
                        height: 1.35,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  const Text(
                    'Powered by Ozikol BCC',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.white38,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // HELPER WIDGETS
  // ===========================================================================

  Widget _buildCardHeader(bool isDark, {required String? logoUrl, required bool showLogo}) {
    return Column(
      children: [
        if (showLogo) ...[
          _buildBrandLogo(logoUrl: logoUrl, size: 52),
          const SizedBox(height: 14),
        ] else if (cardAvatar != null) ...[
          cardAvatar!,
          const SizedBox(height: 14),
        ],
        if (title != null && title!.isNotEmpty)
          Text(
            title!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
            ),
          ),
        if (subtitle != null && subtitle!.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12.5,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              height: 1.35,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBrandLogo({required String? logoUrl, double size = 44}) {
    if (logoUrl != null && logoUrl.trim().isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.25),
        child: CachedNetworkImage(
          imageUrl: logoUrl,
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorWidget: (context, url, error) => _buildFallbackAvatar(size),
        ),
      );
    }
    return _buildFallbackAvatar(size);
  }

  Widget _buildFallbackAvatar(double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF0050E5),
        borderRadius: BorderRadius.circular(size * 0.25),
      ),
      child: Center(
        child: Text(
          workspace.initials,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: size * 0.4,
          ),
        ),
      ),
    );
  }

  Widget _buildChangeWorkspacePill(BuildContext context, WidgetRef ref) {
    return Tooltip(
      message: 'Back',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (onBackTap != null) {
              onBackTap!();
            } else {
              final notifier = ref.read(workspaceStateProvider.notifier);
              notifier.clearError();
              notifier.cancelBypass(clearRemembered: true);
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()),
                (route) => false,
              );
            }
          },
          borderRadius: BorderRadius.circular(999),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 10,
              ),
            ],
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.arrow_back_rounded, size: 14, color: Colors.white),
              SizedBox(width: 6),
              Text(
                'Change Organization',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                  letterSpacing: 0.2,
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
