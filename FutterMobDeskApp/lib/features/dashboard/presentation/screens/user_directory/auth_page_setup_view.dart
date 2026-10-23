import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the Auth Page Setup & Experience Studio under User Directory.
/// Replicates Angular Web AuthPageSetupComponent 1-to-1 with Screen Layout Architecture
/// (Split Showcase vs Centered Card), Curated Wallpaper Gallery, Brand Hero Narrative copy,
/// and a Live Interactive Mini-Simulator preview.
class AuthPageSetupView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional callback to navigate to other tabs.
  final void Function(int tabIndex)? onNavigateToTab;

  /// Creates an [AuthPageSetupView].
  const AuthPageSetupView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
  });

  @override
  ConsumerState<AuthPageSetupView> createState() => _AuthPageSetupViewState();
}

class _AuthPageSetupViewState extends ConsumerState<AuthPageSetupView> {
  bool _isLoading = true;
  bool _isSaving = false;

  Map<String, dynamic> _brand = {
    'loginLayout': 'split',
    'loginBackgroundImageUrl': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
    'loginTitle': 'Welcome to your Workspace',
    'loginSubtitle': 'Enter your authorized credentials to access member applications and services.',
    'loginNoteTitle': 'Enterprise Security Portal',
    'loginButtonText': 'Sign In to Workspace',
    'loginComplianceNotice': 'Authorized personnel only. All access events are encrypted, logged, and audited.',
    'showRegisterLinkOnLogin': true,
  };

  final _titleCtrl = TextEditingController();
  final _subtitleCtrl = TextEditingController();
  final _noteTitleCtrl = TextEditingController();
  final _btnTextCtrl = TextEditingController();
  final _complianceCtrl = TextEditingController();
  final _bgUrlCtrl = TextEditingController();

  final List<Map<String, String>> _wallpaperPresets = [
    {
      'id': 'arch-corporate',
      'name': 'Corporate Tower',
      'category': 'Architecture',
      'url': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
    },
    {
      'id': 'modern-gradient',
      'name': 'Royal Mesh',
      'category': 'Abstract',
      'url': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    },
    {
      'id': 'dark-minimal',
      'name': 'Dark Obsidian',
      'category': 'Minimal',
      'url': 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
    },
    {
      'id': 'workspace-studio',
      'name': 'Executive Suite',
      'category': 'Interior',
      'url': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80',
    },
    {
      'id': 'tech-cyber',
      'name': 'Data Cloud',
      'category': 'Technology',
      'url': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=80',
    },
    {
      'id': 'nature-clean',
      'name': 'Mountain Mist',
      'category': 'Landscape',
      'url': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadBrand();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _subtitleCtrl.dispose();
    _noteTitleCtrl.dispose();
    _btnTextCtrl.dispose();
    _complianceCtrl.dispose();
    _bgUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadBrand() async {
    setState(() => _isLoading = true);
    try {
      final repo = ref.read(accountRepositoryProvider);
      final res = await repo.getBrandSettings();
      if (mounted) {
        setState(() {
          if (res.isNotEmpty) {
            _brand = Map<String, dynamic>.from(res);
          }
          _titleCtrl.text = _brand['loginTitle'] as String? ?? 'Welcome to your Workspace';
          _subtitleCtrl.text = _brand['loginSubtitle'] as String? ?? 'Enter your credentials...';
          _noteTitleCtrl.text = _brand['loginNoteTitle'] as String? ?? 'Enterprise Security Portal';
          _btnTextCtrl.text = _brand['loginButtonText'] as String? ?? 'Sign In to Workspace';
          _complianceCtrl.text = _brand['loginComplianceNotice'] as String? ?? 'Authorized personnel only.';
          _bgUrlCtrl.text = _brand['loginBackgroundImageUrl'] as String? ?? '';
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveBrand() async {
    setState(() => _isSaving = true);
    _brand['loginTitle'] = _titleCtrl.text.trim();
    _brand['loginSubtitle'] = _subtitleCtrl.text.trim();
    _brand['loginNoteTitle'] = _noteTitleCtrl.text.trim();
    _brand['loginButtonText'] = _btnTextCtrl.text.trim();
    _brand['loginComplianceNotice'] = _complianceCtrl.text.trim();
    _brand['loginBackgroundImageUrl'] = _bgUrlCtrl.text.trim();

    try {
      final repo = ref.read(accountRepositoryProvider);
      final ok = await repo.updateBrandSettings(_brand);
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ok ? 'Auth page setup saved successfully.' : 'Failed to save setup.'),
            backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          ),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    final isSplitLayout = _brand['loginLayout'] != 'centered';
    final currentBg = _bgUrlCtrl.text.trim().isNotEmpty
        ? _bgUrlCtrl.text.trim()
        : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80';

    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= 1150;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ===================================================================
          // PAGE HEADER (1-to-1 with Angular AppPageHeader)
          // ===================================================================
          _buildPageHeader(isDark),
          const SizedBox(height: 20),

          // ===================================================================
          // 2-COLUMN LAYOUT: CONTROLS (LEFT) + LIVE MINI-SIMULATOR (RIGHT)
          // ===================================================================
          if (isDesktop)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 6,
                  child: _buildControlsColumn(isDark, isSplitLayout),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 4,
                  child: _buildLiveSimulatorCard(isDark, isSplitLayout, currentBg),
                ),
              ],
            )
          else ...[
            _buildControlsColumn(isDark, isSplitLayout),
            const SizedBox(height: 20),
            _buildLiveSimulatorCard(isDark, isSplitLayout, currentBg),
          ],
        ],
      ),
    );
  }

  Widget _buildPageHeader(bool isDark) {
    return CentralAdjuster.pageHeader(
      icon: Icons.branding_watermark_rounded,
      eyebrow: 'USER MANAGEMENT & ACCESS SUITE',
      title: 'Auth Page Setup',
      subtitle:
          'Customize authentication screen layouts (Split Showcase vs Centered Card), background wallpapers, and narrative copy.',
      isDark: isDark,
      actions: [
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Simulating live sign-in preview in side panel.'),
                backgroundColor: Color(0xFF0050E5),
              ),
            );
          },
          icon: const Icon(Icons.open_in_new_rounded, size: 16),
          label: const Text('Preview Live Sign-In'),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        FilledButton.icon(
          onPressed: _isSaving ? null : _saveBrand,
          icon: _isSaving
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.save_rounded, size: 16),
          label: Text(_isSaving ? 'Saving...' : 'Save Changes'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildControlsColumn(bool isDark, bool isSplitLayout) {
    return Column(
      children: [
        // SECTION 1: LAYOUT ARCHITECTURE
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.dashboard_customize_rounded,
          title: 'Screen Layout Architecture',
          subtitle: 'Choose between a dual-pane showcase layout or a focused single centered card.',
          child: Row(
            children: [
              // Option 1: Split Screen Showcase
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() => _brand['loginLayout'] = 'split');
                    _saveBrand();
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSplitLayout
                          ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                          : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSplitLayout
                            ? const Color(0xFF0050E5)
                            : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                        width: isSplitLayout ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Split Screen Showcase',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isSplitLayout ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                              ),
                            ),
                            Icon(
                              isSplitLayout ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                              color: isSplitLayout ? const Color(0xFF0050E5) : const Color(0xFFCBD5E1),
                              size: 18,
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Dual-panel experience: brand narrative showcase on the left and bright auth form card on the right.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Option 2: Centered Card
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() => _brand['loginLayout'] = 'centered');
                    _saveBrand();
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: !isSplitLayout
                          ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                          : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: !isSplitLayout
                            ? const Color(0xFF0050E5)
                            : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                        width: !isSplitLayout ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Centered Card (Don\'t Split)',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: !isSplitLayout ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                              ),
                            ),
                            Icon(
                              !isSplitLayout ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                              color: !isSplitLayout ? const Color(0xFF0050E5) : const Color(0xFFCBD5E1),
                              size: 18,
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Single glass card centered on full-bleed background wallpaper with ambient backdrop blur.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // SECTION 2: BACKGROUND WALLPAPER GALLERY
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.wallpaper_rounded,
          title: 'Background Wallpaper & Visuals',
          subtitle: 'Select a curated royalty-free enterprise wallpaper or provide a custom image URL.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'CURATED ENTERPRISE PRESETS',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
              const SizedBox(height: 10),
              CentralAdjuster.grid(
                minItemWidth: 220,
                spacing: 12,
                runSpacing: 12,
                maxColumns: 3,
                children: _wallpaperPresets.map((preset) {
                  final isSelected = _bgUrlCtrl.text == preset['url'];
                  return InkWell(
                    onTap: () {
                      setState(() {
                        _bgUrlCtrl.text = preset['url']!;
                        _brand['loginBackgroundImageUrl'] = preset['url']!;
                      });
                      _saveBrand();
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFF0050E5)
                              : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFF0050E5).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Icon(Icons.image_rounded, color: Color(0xFF0050E5), size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  preset['name']!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  preset['category']!,
                                  style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle_rounded, color: Color(0xFF0050E5), size: 16),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              Text(
                'CUSTOM IMAGE URL',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _bgUrlCtrl,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.link_rounded, size: 18, color: Color(0xFF94A3B8)),
                  hintText: 'https://images.unsplash.com/...',
                  filled: true,
                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // SECTION 3: HERO WRITE-UPS & NARRATIVE
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.edit_note_rounded,
          title: 'Brand Hero Write-Ups & Narrative',
          subtitle: 'Customize headlines, security badges, greeting copy, and compliance footers.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('HERO BADGE / SECURITY CHIP', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _noteTitleCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'e.g. Enterprise Security Portal',
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('GREETING HEADLINE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _titleCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'e.g. Welcome to your Workspace',
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              Text('SUBTITLE NARRATIVE', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
              const SizedBox(height: 6),
              TextField(
                controller: _subtitleCtrl,
                onChanged: (_) => setState(() {}),
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Enter your authorized credentials...',
                  filled: true,
                  fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('SUBMIT BUTTON TEXT', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _btnTextCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'e.g. Sign In to Workspace',
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('COMPLIANCE DISCLAIMER', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _complianceCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'Authorized personnel only...',
                            filled: true,
                            fillColor: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
        const SizedBox(height: 20),

        // SECTION 4: LOGIN CARD GOVERNANCE
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.how_to_reg_rounded,
          title: 'Login Card Governance',
          subtitle: 'Enable or disable member self-registration prompt on the sign-in card.',
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Show Self-Registration Link on Login Card',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Renders "Don\'t have an account? Register here" link beneath the sign-in form.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                ],
              ),
              Switch(
                value: _brand['showRegisterLinkOnLogin'] != false,
                onChanged: (val) {
                  setState(() => _brand['showRegisterLinkOnLogin'] = val);
                  _saveBrand();
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLiveSimulatorCard(bool isDark, bool isSplitLayout, String currentBg) {
    final noteTitle = _noteTitleCtrl.text.isNotEmpty ? _noteTitleCtrl.text : 'Enterprise Security Portal';
    final title = _titleCtrl.text.isNotEmpty ? _titleCtrl.text : 'Welcome to your Workspace';
    final subtitle = _subtitleCtrl.text.isNotEmpty ? _subtitleCtrl.text : 'Enter credentials...';
    final btnText = _btnTextCtrl.text.isNotEmpty ? _btnTextCtrl.text : 'Sign In to Workspace';
    final showReg = _brand['showRegisterLinkOnLogin'] != false;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'LIVE INTERACTIVE SIMULATOR',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.05,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text('Real-Time Preview', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0050E5))),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Simulated browser view of tenant authentication experience',
            style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),

          // Mini Simulator Box
          Container(
            height: 460,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: isSplitLayout
                  ? Row(
                      children: [
                        // Left Showcase Panel
                        Expanded(
                          flex: 5,
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFF0050E5), Color(0xFF1E3A8A)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    noteTitle,
                                    style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Colors.white),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  title,
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  subtitle,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 11, color: Colors.white70),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Right Sign-in Card
                        Expanded(
                          flex: 5,
                          child: Container(
                            color: Colors.white,
                            padding: const EdgeInsets.all(20),
                            child: _buildSimulatorForm(btnText, showReg),
                          ),
                        ),
                      ],
                    )
                  : Stack(
                      children: [
                        // Centered Background
                        Container(
                          width: double.infinity,
                          height: double.infinity,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                            ),
                          ),
                        ),
                        Center(
                          child: Container(
                            width: 260,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: const [
                                BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 4)),
                              ],
                            ),
                            child: _buildSimulatorForm(btnText, showReg),
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

  Widget _buildSimulatorForm(String btnText, bool showReg) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: const Color(0xFF0050E5),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(Icons.corporate_fare_rounded, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
            const Text(
              'Ozikol BCC',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          height: 32,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          alignment: Alignment.centerLeft,
          child: const Text('user@company.com', style: TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8))),
        ),
        const SizedBox(height: 8),
        Container(
          height: 32,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          alignment: Alignment.centerLeft,
          child: const Text('••••••••••••', style: TextStyle(fontSize: 10.5, color: Color(0xFF94A3B8))),
        ),
        const SizedBox(height: 12),
        Container(
          height: 34,
          decoration: BoxDecoration(
            color: const Color(0xFF0050E5),
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          child: Text(
            btnText,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
          ),
        ),
        if (showReg) ...[
          const SizedBox(height: 10),
          const Center(
            child: Text(
              "Don't have an account? Register here",
              style: TextStyle(fontSize: 9.5, color: Color(0xFF0050E5), fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSectionCard({
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.gray400 : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
