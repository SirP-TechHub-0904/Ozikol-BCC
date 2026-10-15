import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_tour_dialog.dart';
import '../../../core/widgets/contextual_info_button.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../../core/widgets/theme_mode_switcher.dart';
import '../state/workspace_state.dart';
import 'workspace_login_screen.dart';

/// Clean, responsive Landing & Workspace Entry Screen for Mobile and Desktop.
/// Completely replaces legacy boilerplate designs with modern enterprise branding,
/// an interactive capability showcase carousel, and frictionless multi-tenant resolution.
class WorkspaceEntryScreen extends ConsumerStatefulWidget {
  const WorkspaceEntryScreen({super.key});

  @override
  ConsumerState<WorkspaceEntryScreen> createState() => _WorkspaceEntryScreenState();
}

class _WorkspaceEntryScreenState extends ConsumerState<WorkspaceEntryScreen> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _pageController = PageController();
  int _carouselIndex = 0;
  Timer? _carouselTimer;

  static const List<_FeatureSlide> _slides = [
    _FeatureSlide(
      title: 'Modular Enterprise Ecosystem',
      subtitle:
          'Connect to your organization workspace with isolated tenant databases, custom domains, and zero cross-tenant leakage.',
      icon: Icons.domain_rounded,
      badgeText: 'MULTI-TENANT ISOLATION',
    ),
    _FeatureSlide(
      title: 'Unified Multi-Channel Pool',
      subtitle:
          'Seamless notifications and alerts across In-App feeds, Postmark email, WhatsApp webhooks, and SMS with 6-tier severity.',
      icon: Icons.mark_email_read_rounded,
      badgeText: 'UNIFIED NOTIFICATIONS',
    ),
    _FeatureSlide(
      title: 'Real-Time Telemetry & Sync',
      subtitle:
          'Sub-second synchronization, Sentry crash diagnostics, and robust offline caching built for mobile and desktop.',
      icon: Icons.sensors_rounded,
      badgeText: 'REAL-TIME TELEMETRY',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startCarouselTimer();
    _checkTourGuide();
  }

  void _startCarouselTimer() {
    _carouselTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (!mounted || !_pageController.hasClients) return;
      final next = (_carouselIndex + 1) % _slides.length;
      _pageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    });
  }

  Future<void> _checkTourGuide() async {
    final completed = await AppTourDialog.hasCompleted('workspace_landing');
    if (!completed && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _openTourGuide();
      });
    }
  }

  void _openTourGuide() {
    AppTourDialog.show(
      context,
      screenKey: 'workspace_landing',
      screenTitle: 'Workspace Access & Landing Tour',
      steps: const [
        TourStep(
          title: 'Enter Organization Code or Domain',
          description:
              'Type your company access code (e.g. acmecorp) or custom subdomain to securely resolve your organization.',
          icon: Icons.apartment_rounded,
        ),
        TourStep(
          title: 'Direct Multi-Tenant Security',
          description:
              'Each workspace connects to an isolated database partition with custom security policies and branding.',
          icon: Icons.security_rounded,
        ),
        TourStep(
          title: 'Instant Multi-Workspace Switching',
          description:
              'Seamlessly jump between multiple enrolled organizations without re-entering credentials.',
          icon: Icons.swap_horiz_rounded,
        ),
      ],
    );
  }

  @override
  void dispose() {
    _carouselTimer?.cancel();
    _pageController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _showServerSettingsDialog() {
    final storage = ref.read(storageServiceProvider);
    final currentCustom = storage.getCustomBaseUrl();
    final customController = TextEditingController(text: currentCustom ?? '');

    showDialog(
      context: context,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return AlertDialog(
          backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
          ),
          title: const Row(
            children: [
              Icon(Icons.dns_rounded, color: AppColors.primary, size: 22),
              SizedBox(width: 10),
              Text('API Server Environment', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Active Base URL:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
              const SizedBox(height: 4),
              SelectableText(
                currentCustom ?? ApiConstants.defaultBaseUrl,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
              const Divider(height: 24),
              const Text('Switch Environment:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                leading: const Icon(Icons.computer_rounded, color: AppColors.success),
                title: const Text('Local .NET API (Development)'),
                subtitle: Text(ApiConstants.defaultBaseUrl, style: const TextStyle(fontSize: 11)),
                onTap: () async {
                  await storage.setCustomBaseUrl(null);
                  if (ctx.mounted) Navigator.pop(ctx);
                  setState(() {});
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                leading: const Icon(Icons.cloud_outlined, color: AppColors.primary),
                title: const Text('Production Cloud (Online)'),
                subtitle: const Text(ApiConstants.productionBaseUrl, style: TextStyle(fontSize: 11)),
                onTap: () async {
                  await storage.setCustomBaseUrl(ApiConstants.productionBaseUrl);
                  if (ctx.mounted) Navigator.pop(ctx);
                  setState(() {});
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: customController,
                decoration: const InputDecoration(
                  labelText: 'Custom Server / LAN IP',
                  hintText: 'e.g. http://192.168.1.50:51025',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Close'),
            ),
            ElevatedButton(
              onPressed: () async {
                final txt = customController.text.trim();
                await storage.setCustomBaseUrl(txt.isNotEmpty ? txt : null);
                if (ctx.mounted) Navigator.pop(ctx);
                setState(() {});
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Save Custom'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _handleContinue([String? directCode]) async {
    final code = directCode ?? _controller.text.trim();
    if (directCode == null && !_formKey.currentState!.validate()) return;
    if (code.isEmpty) return;

    final notifier = ref.read(workspaceStateProvider.notifier);
    final resolved = await notifier.verifyWorkspace(code);

    if (resolved != null && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => WorkspaceLoginScreen(workspace: resolved),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final storage = ref.watch(storageServiceProvider);
    final activeBaseUrl = storage.getCustomBaseUrl() ?? ApiConstants.defaultBaseUrl;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 900;
          return isDesktop
              ? _buildDesktopLayout(context, state, isDark, activeBaseUrl)
              : _buildMobileLayout(context, state, isDark, activeBaseUrl);
        },
      ),
    );
  }

  // =========================================================================
  // DESKTOP LAYOUT (SPLIT-SCREEN HERO & ACTION PORTAL)
  // =========================================================================
  Widget _buildDesktopLayout(
    BuildContext context,
    WorkspaceState state,
    bool isDark,
    String activeBaseUrl,
  ) {
    return Row(
      children: [
        // Left Column: Enterprise Hero Showcase (52% width)
        Expanded(
          flex: 52,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark
                    ? [const Color(0xFF0F172A), const Color(0xFF090D16)]
                    : [AppColors.primary, const Color(0xFF0D3BB8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Stack(
              children: [
                // Subtle ambient glow
                Positioned(
                  top: -80,
                  left: -60,
                  child: Container(
                    width: 380,
                    height: 380,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [Colors.white.withAlpha(25), Colors.transparent],
                      ),
                    ),
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top Brand Identity
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.white.withAlpha(40),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withAlpha(60)),
                              ),
                              child: const Icon(Icons.cloud_done_rounded, color: Colors.white, size: 24),
                            ),
                            const SizedBox(width: 14),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'OZIKOL MIS',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                Text(
                                  'Enterprise Multi-Tenant Cloud Platform',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w400,
                                    color: Colors.white.withAlpha(190),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),

                        const Spacer(),

                        // Feature Showcase Carousel
                        SizedBox(
                          height: 250,
                          child: PageView.builder(
                            controller: _pageController,
                            itemCount: _slides.length,
                            onPageChanged: (index) {
                              setState(() => _carouselIndex = index);
                            },
                            itemBuilder: (context, index) {
                              final slide = _slides[index];
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withAlpha(35),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.white.withAlpha(50)),
                                    ),
                                    child: Text(
                                      slide.badgeText,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.5,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    slide.title,
                                    style: const TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                      letterSpacing: -0.5,
                                      height: 1.2,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    slide.subtitle,
                                    style: TextStyle(
                                      fontSize: 14,
                                      height: 1.5,
                                      color: Colors.white.withAlpha(210),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),

                        // Carousel Indicator Dots
                        Row(
                          children: List.generate(_slides.length, (index) {
                            final active = index == _carouselIndex;
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              margin: const EdgeInsets.only(right: 6),
                              width: active ? 28 : 8,
                              height: 6,
                              decoration: BoxDecoration(
                                color: active ? Colors.white : Colors.white.withAlpha(80),
                                borderRadius: BorderRadius.circular(3),
                              ),
                            );
                          }),
                        ),

                        const Spacer(),

                        // KPI Metrics Cards
                        Row(
                          children: [
                            _buildKpiCard('99.99%', 'Cloud Uptime', Icons.verified_rounded),
                            const SizedBox(width: 14),
                            _buildKpiCard('Zero Loss', 'Notification Pool', Icons.all_inbox_rounded),
                            const SizedBox(width: 14),
                            _buildKpiCard('< 1.2s', 'Sync Latency', Icons.bolt_rounded),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Right Column: Clean Workspace Resolution Portal (48% width)
        Expanded(
          flex: 48,
          child: Container(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            child: SafeArea(
              child: Column(
                children: [
                  // Top Navigation & Utility Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        // Environment Selector Pill
                        InkWell(
                          onTap: _showServerSettingsDialog,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceVariantDark : AppColors.gray100,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppColors.success,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  activeBaseUrl.contains('51025')
                                      ? 'Local .NET Dev'
                                      : (activeBaseUrl.contains('cloud') ? 'Production Cloud' : 'Custom Server'),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.gray300 : AppColors.gray700,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(Icons.arrow_drop_down_rounded, size: 18, color: isDark ? AppColors.gray400 : AppColors.gray500),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const ThemeModeSwitcher(compact: true),
                        const SizedBox(width: 8),
                        Tooltip(
                          message: 'Replay Tour Guide',
                          child: IconButton(
                            icon: Icon(
                              Icons.help_outline_rounded,
                              size: 20,
                              color: isDark ? AppColors.gray400 : AppColors.gray500,
                            ),
                            onPressed: _openTourGuide,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Main Form Body
                  Expanded(
                    child: Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 440),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Header with Title & Contextual Info Icon
                                Row(
                                  children: [
                                    Text(
                                      'Enter Workspace',
                                      style: TextStyle(
                                        fontSize: 26,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.6,
                                        color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const ContextualInfoButton(
                                      title: 'Workspace Resolution',
                                      purpose: 'Connects this client application to your isolated tenant database and permissions layer.',
                                      expectedInputs: 'Enter your company access code (e.g. acmecorp) or your custom web domain (e.g. acme.ozikol.cloud).',
                                      impact: 'Loads your organization security policies, tenant branding, and routes notifications appropriately.',
                                      bestPractices: 'Contact your organization administrator if you are unsure of your access code.',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Sign in using your organization access code or custom web domain.',
                                  style: TextStyle(
                                    fontSize: 14,
                                    height: 1.4,
                                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                                  ),
                                ),
                                const SizedBox(height: 28),

                                // Error Banner
                                if (state.errorMessage != null) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: AppColors.error.withAlpha(isDark ? 40 : 20),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: AppColors.error.withAlpha(80)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 18),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            state.errorMessage!,
                                            style: const TextStyle(
                                              color: AppColors.error,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                ],

                                // Input Field
                                CustomTextField(
                                  controller: _controller,
                                  label: 'Domain or Access Code',
                                  placeholder: 'e.g. acmecorp or acme.ozikol.cloud',
                                  prefixIcon: const Icon(Icons.apartment_rounded, size: 20, color: AppColors.primary),
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) => _handleContinue(),
                                  validator: (val) {
                                    if (val == null || val.trim().isEmpty) {
                                      return 'Please enter your organization code or domain.';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 8),

                                // Explanatory helper text
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.info_outline_rounded,
                                      size: 14,
                                      color: isDark ? AppColors.gray500 : AppColors.gray400,
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        'Use your assigned organization code or full web domain.',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppColors.gray400 : AppColors.gray500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),

                                // Continue Action Button
                                PrimaryButton(
                                  text: 'Continue to Workspace',
                                  height: 52,
                                  borderRadius: 14,
                                  isLoading: state.isLoading,
                                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                                  onPressed: () => _handleContinue(),
                                ),

                                // Enrolled Workspaces Quick Switcher
                                if (state.enrolledWorkspaces.isNotEmpty) ...[
                                  const SizedBox(height: 32),
                                  Row(
                                    children: [
                                      Expanded(child: Divider(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        child: Text(
                                          'PREVIOUSLY CONNECTED',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.6,
                                            color: isDark ? AppColors.gray500 : AppColors.gray400,
                                          ),
                                        ),
                                      ),
                                      Expanded(child: Divider(color: isDark ? AppColors.outlineDark : AppColors.outlineLight)),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  ...state.enrolledWorkspaces.map((ws) {
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: InkWell(
                                        onTap: () => _handleContinue(ws.tenantKey),
                                        borderRadius: BorderRadius.circular(12),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: isDark ? AppColors.surfaceVariantDark : AppColors.gray50,
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(
                                              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              TenantAvatar(
                                                logoUrl: ws.logoUrl,
                                                name: ws.displayName,
                                                size: 34,
                                                borderRadius: 10,
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      ws.displayName,
                                                      style: TextStyle(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.w700,
                                                        color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                                                      ),
                                                    ),
                                                    Text(
                                                      ws.primaryDomain,
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        color: isDark ? AppColors.gray400 : AppColors.gray500,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.primary),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Bottom Active Server Status
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Server connected to: $activeBaseUrl',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.gray500 : AppColors.gray400,
                      ),
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

  // =========================================================================
  // MOBILE LAYOUT (CLEAN ONBOARDING CAROUSEL & MODERN ACCESS CARD)
  // =========================================================================
  Widget _buildMobileLayout(
    BuildContext context,
    WorkspaceState state,
    bool isDark,
    String activeBaseUrl,
  ) {
    final screenHeight = MediaQuery.of(context).size.height;

    return SafeArea(
      child: Column(
        children: [
          // Top Navigation Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(isDark ? 40 : 25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.cloud_done_rounded, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'OZIKOL MIS',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.dns_rounded, size: 20),
                  onPressed: _showServerSettingsDialog,
                  tooltip: 'Server Environment',
                ),
                const ThemeModeSwitcher(compact: true),
                IconButton(
                  icon: const Icon(Icons.help_outline_rounded, size: 20),
                  onPressed: _openTourGuide,
                  tooltip: 'Tour Guide',
                ),
              ],
            ),
          ),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Column(
                children: [
                  // Feature Carousel
                  SizedBox(
                    height: (screenHeight * 0.28).clamp(180.0, 230.0),
                    child: PageView.builder(
                      controller: _pageController,
                      itemCount: _slides.length,
                      onPageChanged: (index) {
                        setState(() => _carouselIndex = index);
                      },
                      itemBuilder: (context, index) {
                        final slide = _slides[index];
                        return Container(
                          padding: const EdgeInsets.all(18),
                          margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isDark
                                  ? [AppColors.surfaceDark, AppColors.surfaceVariantDark]
                                  : [const Color(0xFFF1F6FF), const Color(0xFFE6F0FF)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: isDark ? AppColors.outlineDark : const Color(0xFFD6E4FF),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withAlpha(isDark ? 50 : 25),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(slide.icon, color: AppColors.primary, size: 20),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    slide.badgeText,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Text(
                                slide.title,
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                slide.subtitle,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  height: 1.4,
                                  color: isDark ? AppColors.gray400 : AppColors.gray700,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),

                  // Carousel Indicators
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_slides.length, (index) {
                        final active = index == _carouselIndex;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: active ? 22 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: active ? AppColors.primary : (isDark ? AppColors.outlineDark : AppColors.gray300),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        );
                      }),
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Main Resolution Form Card
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(isDark ? 60 : 12),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Enter Workspace',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const ContextualInfoButton(
                                title: 'Workspace Resolution',
                                purpose: 'Connects your device to your isolated tenant database.',
                                expectedInputs: 'Company code (e.g. acmecorp) or domain (e.g. acme.ozikol.cloud).',
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Enter your company code or web domain.',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Error Banner
                          if (state.errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.error.withAlpha(25),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.error.withAlpha(80)),
                              ),
                              child: Text(
                                state.errorMessage!,
                                style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                            const SizedBox(height: 14),
                          ],

                          CustomTextField(
                            controller: _controller,
                            label: 'Domain or Access Code',
                            placeholder: 'e.g. acmecorp or acme.ozikol.cloud',
                            prefixIcon: const Icon(Icons.apartment_rounded, size: 20, color: AppColors.primary),
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _handleContinue(),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Please enter your organization code or domain.';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          PrimaryButton(
                            text: 'Continue',
                            height: 50,
                            borderRadius: 14,
                            isLoading: state.isLoading,
                            icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                            onPressed: () => _handleContinue(),
                          ),

                          // Enrolled Quick Switches
                          if (state.enrolledWorkspaces.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            const Divider(),
                            const SizedBox(height: 8),
                            Text(
                              'Previously Connected Workspaces:',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? AppColors.gray400 : AppColors.gray600),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: state.enrolledWorkspaces.map((ws) {
                                return ActionChip(
                                  avatar: TenantAvatar(logoUrl: ws.logoUrl, name: ws.displayName, size: 20, borderRadius: 6),
                                  label: Text(ws.displayName, style: const TextStyle(fontSize: 12)),
                                  onPressed: () => _handleContinue(ws.tenantKey),
                                );
                              }).toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(String metric, String label, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withAlpha(25),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withAlpha(40)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(height: 8),
            Text(
              metric,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: Colors.white.withAlpha(190),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureSlide {
  final String title;
  final String subtitle;
  final IconData icon;
  final String badgeText;

  const _FeatureSlide({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.badgeText,
  });
}
