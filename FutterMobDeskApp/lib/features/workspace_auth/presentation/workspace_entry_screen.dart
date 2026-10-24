import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_tour_dialog.dart';
import '../../../core/widgets/contextual_info_button.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../../core/widgets/theme_mode_switcher.dart';
import '../../../core/widgets/oz_lang_switcher.dart';
import '../state/workspace_state.dart';
import 'workspace_login_screen.dart';

/// Clean, responsive Landing & Workspace Entry Screen for Mobile and Desktop.
/// Incorporates pure white Ozikol enterprise branding, natural welcoming copy,
/// real-time connectivity status, and frictionless multi-tenant workspace resolution.
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

  bool _rememberOrganization = true;
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  static const List<_FeatureSlide> _slides = [
    _FeatureSlide(
      badgeText: 'WORKSPACE',
      title: 'All Your Work in One Place',
      subtitle:
          'Connect to your organization and access your tools, projects, and team data in one simple workspace.',
      icon: Icons.business_center_rounded,
    ),
    _FeatureSlide(
      badgeText: 'NOTIFICATIONS',
      title: 'Stay Updated in Real Time',
      subtitle:
          'Receive instant notifications, alerts, and messages across email, in-app feeds, and chat right as they happen.',
      icon: Icons.notifications_active_rounded,
    ),
    _FeatureSlide(
      badgeText: 'SYNC & SPEED',
      title: 'Fast and Reliable Everywhere',
      subtitle:
          'Everything stays in sync across your desktop, phone, and tablet so you can work seamlessly without interruption.',
      icon: Icons.bolt_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(workspaceStateProvider.notifier).clearError();
        ref.read(workspaceStateProvider.notifier).probeAllEnrolledBranding();
      }
    });
    _startCarouselTimer();
    _initConnectivity();
    _checkTourGuide();
    _loadRememberedOrganization();
  }

  Future<void> _loadRememberedOrganization() async {
    try {
      final storage = ref.read(storageServiceProvider);
      final isRemembered = storage.isRememberOrganizationEnabled();
      final code = storage.getRememberedOrganizationCode();
      if (mounted) {
        setState(() {
          _rememberOrganization = isRemembered;
          if (_controller.text.isEmpty && code != null && code.isNotEmpty) {
            _controller.text = code;
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _initConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      if (mounted) {
        setState(() {
          _isOnline = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
        });
      }
    } catch (_) {}

    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      if (mounted) {
        setState(() {
          _isOnline = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
        });
      }
    });
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
          title: 'Enter Organization Access Code or URL',
          description:
              'Type your organization access code or custom URL (e.g. access code or domain.com) to securely connect to your workspace.',
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
    _connectivitySubscription?.cancel();
    _pageController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleContinue([String? directCode]) async {
    final code = directCode ?? _controller.text.trim();
    if (directCode == null && !_formKey.currentState!.validate()) return;
    if (code.isEmpty) return;

    final notifier = ref.read(workspaceStateProvider.notifier);
    final resolved = await notifier.verifyWorkspace(code, remember: _rememberOrganization);

    if (resolved != null && mounted) {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => WorkspaceLoginScreen(workspace: resolved),
        ),
      );
      if (mounted) {
        ref.read(workspaceStateProvider.notifier).clearError();
      }
    }
  }

  /// <summary>
  /// Displays a confirmation dialog before removing a workspace from the enrolled list.
  /// </summary>
  /// <param name="ws">The workspace to remove.</param>
  Future<void> _confirmRemoveWorkspace(Workspace ws) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.error.withAlpha(25),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.delete_outline_rounded,
                color: AppColors.error,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Remove Workspace',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to remove "${ws.displayName}" from your connected workspaces? You can reconnect anytime by entering the organization access code.',
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.gray300 : AppColors.gray700,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: Text(
              'Cancel',
              style: TextStyle(
                color: isDark ? AppColors.gray400 : AppColors.gray600,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            child: const Text(
              'Remove',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(workspaceStateProvider.notifier).removeEnrolledWorkspace(ws.tenantKey);
    }
  }

  /// <summary>
  /// Renders a previously connected workspace item card with a clickable body to continue
  /// and a refined, uniform 3-dot micro-action button with a smart dropdown menu.
  /// </summary>
  /// <param name="ws">The enrolled workspace metadata.</param>
  /// <param name="isDark">Whether dark mode is currently active.</param>
  /// <returns>A stylized responsive card widget.</returns>
  Widget _buildEnrolledWorkspaceCard(Workspace ws, bool isDark) {
    final borderColor = isDark ? AppColors.outlineDark : AppColors.outlineLight;
    final cardBg = isDark ? AppColors.surfaceVariantDark.withAlpha(140) : AppColors.gray50;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _handleContinue(ws.tenantKey),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: borderColor,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                // Workspace Avatar (with cached logo/icon or fallback initials)
                TenantAvatar(
                  iconUrl: ws.iconUrl,
                  logoUrl: ws.logoUrl,
                  name: ws.displayName,
                  tenantKey: ws.tenantKey,
                  size: 38,
                  borderRadius: 10,
                ),
                const SizedBox(width: 12),

                // Workspace Name and Subtitle
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        ws.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Connected Workspace',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isDark ? AppColors.gray400 : AppColors.gray500,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),

                // 3-Dot Options Dropdown (Refined micro-button matching border lines)
                PopupMenuButton<String>(
                  tooltip: 'Workspace options',
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: borderColor,
                      width: 1,
                    ),
                  ),
                  color: isDark ? AppColors.surfaceDark : Colors.white,
                  surfaceTintColor: Colors.transparent,
                  elevation: 8,
                  shadowColor: Colors.black.withAlpha(30),
                  offset: const Offset(0, 38),
                  onSelected: (action) {
                    if (action == 'continue') {
                      _handleContinue(ws.tenantKey);
                    } else if (action == 'remove') {
                      _confirmRemoveWorkspace(ws);
                    }
                  },
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: borderColor,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.more_vert_rounded,
                        size: 18,
                        color: isDark ? AppColors.gray300 : AppColors.gray600,
                      ),
                    ),
                  ),
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      value: 'continue',
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.primary.withAlpha(35) : const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.login_rounded,
                                size: 14,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Continue',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white : AppColors.gray900,
                              letterSpacing: 0.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _CustomMenuDivider(isDark: isDark),
                    PopupMenuItem<String>(
                      value: 'remove',
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.error.withAlpha(35) : const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.delete_outline_rounded,
                                size: 14,
                                color: AppColors.error,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'Remove Workspace',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.error,
                              letterSpacing: 0.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRememberOrganizationCheckbox(bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 4),
      child: InkWell(
        onTap: () => setState(() => _rememberOrganization = !_rememberOrganization),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: Checkbox(
                  value: _rememberOrganization,
                  activeColor: AppColors.primary,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                  side: BorderSide(
                    color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                    width: 1.5,
                  ),
                  onChanged: (val) {
                    setState(() => _rememberOrganization = val ?? true);
                  },
                ),
              ),
              const SizedBox(width: 10),
              Flexible(
                child: Text(
                  'Remember this organization in future',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 900;
          return isDesktop
              ? _buildDesktopLayout(context, state, isDark)
              : _buildMobileLayout(context, state, isDark);
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
                  child: IgnorePointer(
                    child: ExcludeSemantics(
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
                  ),
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top Brand Identity with Pure White Ozikol Logo
                        Row(
                          children: [
                            Image.asset(
                              'assets/images/ozikol-white.png',
                              height: 32,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) => const Text(
                                'OZIKOL',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Container(
                              height: 24,
                              width: 1,
                              color: Colors.white.withAlpha(70),
                            ),
                            const SizedBox(width: 14),
                            Text(
                              'Business Command Center',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: Colors.white.withAlpha(190),
                              ),
                            ),
                          ],
                        ),

                        const Spacer(),

                        // Feature Showcase Carousel with Natural English Copy
                        SizedBox(
                          height: 230,
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

                        // 3 Bottom Cards (Plain, Natural English)
                        Row(
                          children: [
                            _buildFeatureCard('Fast & Secure', 'Encrypted workspace', Icons.shield_outlined),
                            const SizedBox(width: 14),
                            _buildFeatureCard('Always Synced', 'Across all devices', Icons.sync_rounded),
                            const SizedBox(width: 14),
                            _buildFeatureCard('24/7 Available', 'Work anytime', Icons.access_time_rounded),
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
                        // Online / Offline Status Indicator Pill
                        Container(
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
                                decoration: BoxDecoration(
                                  color: _isOnline ? AppColors.success : AppColors.error,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _isOnline ? 'Online' : 'Offline',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: _isOnline
                                      ? AppColors.success
                                      : AppColors.error,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        const OzLangSwitcher(compact: true),
                        const SizedBox(width: 8),
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
                                      expectedInputs: 'Enter your organization access code or custom domain URL (e.g. access code or domain.com).',
                                      impact: 'Loads your organization security policies, tenant branding, and routes notifications appropriately.',
                                      bestPractices: 'Contact your organization administrator if you are unsure of your access code.',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Sign in using your organization access code or custom URL.',
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

                                // Input Field with requested placeholder and label
                                CustomTextField(
                                  controller: _controller,
                                  label: 'Organization Code',
                                  placeholder: 'e.g. access code or url',
                                  prefixIcon: const Icon(Icons.apartment_rounded, size: 20, color: AppColors.primary),
                                  showPasteButton: true,
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) => _handleContinue(),
                                  validator: (val) {
                                    if (val == null || val.trim().isEmpty) {
                                      return 'Please enter your organization code.';
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
                                        'Enter your organization access code or custom URL.',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppColors.gray400 : AppColors.gray500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),

                                // Remember this organization in future
                                _buildRememberOrganizationCheckbox(isDark),
                                const SizedBox(height: 18),

                                // Continue Action Button
                                PrimaryButton(
                                  text: 'Continue',
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
                                  ...state.enrolledWorkspaces.map(
                                    (ws) => _buildEnrolledWorkspaceCard(ws, isDark),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Bottom Brand Footer (Clean, no internal server route exposed)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Powered by Ozikol',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.gray500 : AppColors.gray400,
                        letterSpacing: 0.3,
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
  ) {
    final screenHeight = MediaQuery.of(context).size.height;

    return SafeArea(
      child: Column(
        children: [
          // Top Navigation Bar with Online Status
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Image.asset(
                  isDark ? 'assets/images/ozikol-white.png' : 'assets/images/ozikol.png',
                  height: 26,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Text(
                    'OZIKOL',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.8),
                  ),
                ),
                const Spacer(),
                // Online/Offline Status Dot
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : AppColors.gray100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: _isOnline ? AppColors.success : AppColors.error,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _isOnline ? 'Online' : 'Offline',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _isOnline ? AppColors.success : AppColors.error,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                const OzLangSwitcher(compact: true),
                const SizedBox(width: 6),
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
                                expectedInputs: 'Enter your organization access code or custom domain URL (e.g. access code or domain.com).',
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Enter your organization access code or custom URL.',
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
                            label: 'Organization Code',
                            placeholder: 'e.g. access code or url',
                            prefixIcon: const Icon(Icons.apartment_rounded, size: 20, color: AppColors.primary),
                            showPasteButton: true,
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _handleContinue(),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Please enter your organization code.';
                              }
                              return null;
                            },
                          ),
                          _buildRememberOrganizationCheckbox(isDark),
                          const SizedBox(height: 18),

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
                            Column(
                              children: state.enrolledWorkspaces
                                  .map((ws) => _buildEnrolledWorkspaceCard(ws, isDark))
                                  .toList(),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                  Text(
                    'Powered by Ozikol',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.gray500 : AppColors.gray400,
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

  Widget _buildFeatureCard(String title, String subtitle, IconData icon) {
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
              title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
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

/// <summary>
/// A subtle horizontal divider for PopupMenuButton dropdowns that matches
/// the card and panel border lines without harsh solid black dividers.
/// </summary>
class _CustomMenuDivider extends PopupMenuEntry<String> {
  /// Whether dark mode is currently active.
  final bool isDark;

  const _CustomMenuDivider({required this.isDark});

  @override
  double get height => 9.0;

  @override
  bool represents(String? value) => false;

  @override
  State<_CustomMenuDivider> createState() => _CustomMenuDividerState();
}

class _CustomMenuDividerState extends State<_CustomMenuDivider> {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      color: widget.isDark ? AppColors.outlineDark : AppColors.outlineLight,
    );
  }
}

