import 'dart:typed_data';
import 'dart:ui';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/central_adjuster.dart';
import '../../../../../core/widgets/desktop_auth_layout.dart';
import '../../../../workspace_auth/presentation/forgot_password_screen.dart';
import '../../../../workspace_auth/presentation/workspace_login_screen.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting the Auth Page Setup & Experience Studio under User Directory.
/// Replicates Angular Web AuthPageSetupComponent 1-to-1 with:
/// - Screen Layout Architecture (Split Showcase vs Centered Card) with instant auto-save
/// - Curated Wallpaper Gallery with real image thumbnails (6 Enterprise presets)
/// - Direct Desktop Image File Upload with instant local preview and Cloudinary sync
/// - Brand Hero Narrative copy (Title, Subtitle, Badge Chip, Compliance Disclaimer, Submit Button)
/// - Public Self-Registration & White Contrast Logo Toggles
/// - Live Interactive Mini-Simulator Preview with wallpaper blur and layout modes
/// - Direct quick-action links to test live Sign In and Reset Password screens
/// </summary>
class AuthPageSetupView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Optional callback to navigate to other tabs.
  final void Function(int tabIndex)? onNavigateToTab;

  /// Optional callback to navigate back to previous screen.
  final VoidCallback? onNavigateBack;

  /// Optional callback to navigate back to previous screen (alias).
  final VoidCallback? onBackTap;

  /// Creates an [AuthPageSetupView].
  const AuthPageSetupView({
    super.key,
    this.workspace,
    this.onNavigateToTab,
    this.onNavigateBack,
    this.onBackTap,
  });

  @override
  ConsumerState<AuthPageSetupView> createState() => _AuthPageSetupViewState();
}

class _AuthPageSetupViewState extends ConsumerState<AuthPageSetupView> {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploading = false;
  bool _isSavingLayout = false;
  bool _lastSavedLayout = false;

  Uint8List? _localUploadedBytes;

  Map<String, dynamic> _brand = {
    'loginLayout': 'centered',
    'loginBackgroundImageUrl': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85',
    'loginTitle': '',
    'loginSubtitle': '',
    'loginNoteTitle': '',
    'loginButtonText': 'Sign In',
    'loginComplianceNotice': '',
    'loginNoteFooter': '',
    'allowPublicRegistration': true,
    'showRegisterLinkOnLogin': true,
    'useWhiteLogoInLogin': false,
  };

  final _titleCtrl = TextEditingController();
  final _subtitleCtrl = TextEditingController();
  final _noteTitleCtrl = TextEditingController();
  final _btnTextCtrl = TextEditingController();
  final _complianceCtrl = TextEditingController();
  final _bgUrlCtrl = TextEditingController();

  static const String defaultWallpaper =
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85';

  final List<Map<String, String>> _wallpaperPresets = [
    {
      'id': 'preset-glass-arch',
      'name': 'Modern Glass Architecture',
      'category': 'ENTERPRISE',
      'url': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=85',
    },
    {
      'id': 'preset-dark-tech',
      'name': 'Obsidian Deep Tech',
      'category': 'CYBER',
      'url': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=85',
    },
    {
      'id': 'preset-blue-mesh',
      'name': 'Royal Blue Mesh',
      'category': 'BCC BRAND',
      'url': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=85',
    },
    {
      'id': 'preset-clean-studio',
      'name': 'Minimalist Slate Studio',
      'category': 'MINIMAL',
      'url': 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=85',
    },
    {
      'id': 'preset-cyber-slate',
      'name': 'Matrix Data Grid',
      'category': 'SECURITY',
      'url': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=85',
    },
    {
      'id': 'preset-warm-ambient',
      'name': 'Ambient Warm Light',
      'category': 'WARM',
      'url': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=85',
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
          final apiLayout = _brand['loginLayout']?.toString().toLowerCase();
          final bgKeyLayout = _brand['loginBackgroundImageKey']?.toString().toLowerCase();
          if (apiLayout == 'split' || apiLayout == 'centered') {
            _brand['loginLayout'] = apiLayout;
          } else if (bgKeyLayout == 'split' || bgKeyLayout == 'centered') {
            _brand['loginLayout'] = bgKeyLayout;
          } else {
            _brand['loginLayout'] = 'centered';
          }

          _titleCtrl.text = _brand['loginTitle'] as String? ?? '';
          _subtitleCtrl.text = (_brand['loginSubtitle'] ?? _brand['loginNote']) as String? ?? '';
          _noteTitleCtrl.text = _brand['loginNoteTitle'] as String? ?? '';
          _btnTextCtrl.text = _brand['loginButtonText'] as String? ?? 'Sign In';
          _complianceCtrl.text = (_brand['loginComplianceNotice'] ?? _brand['loginNoteFooter']) as String? ?? '';
          _bgUrlCtrl.text = _brand['loginBackgroundImageUrl'] as String? ?? defaultWallpaper;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveBrand({bool silent = false, String? successMessage}) async {
    if (!silent) setState(() => _isSaving = true);

    _brand['loginTitle'] = _titleCtrl.text.trim();
    _brand['loginSubtitle'] = _subtitleCtrl.text.trim();
    _brand['loginNote'] = _subtitleCtrl.text.trim();
    _brand['loginNoteTitle'] = _noteTitleCtrl.text.trim();
    _brand['loginButtonText'] = _btnTextCtrl.text.trim();
    _brand['loginComplianceNotice'] = _complianceCtrl.text.trim();
    _brand['loginNoteFooter'] = _complianceCtrl.text.trim();
    _brand['loginBackgroundImageUrl'] = _bgUrlCtrl.text.trim();
    _brand['loginBackgroundImageKey'] = _brand['loginLayout'] == 'split' ? 'split' : 'centered';

    try {
      final repo = ref.read(accountRepositoryProvider);
      final ok = await repo.updateBrandSettings(_brand);

      // Invalidate branding provider so open auth layouts update immediately
      if (widget.workspace != null) {
        ref.invalidate(tenantBrandingProvider(widget.workspace!.tenantKey));
      }

      if (mounted) {
        setState(() {
          _isSaving = false;
          _lastSavedLayout = true;
        });
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ok
                  ? (successMessage ?? 'Authentication page setup saved successfully!')
                  : 'Failed to save settings.'),
              backgroundColor: ok ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _selectLayout(String layout) async {
    if (_brand['loginLayout'] == layout && !_isSavingLayout) return;

    setState(() {
      _brand['loginLayout'] = layout;
      _brand['loginBackgroundImageKey'] = layout;
      _isSavingLayout = true;
      _lastSavedLayout = false;
    });

    final repo = ref.read(accountRepositoryProvider);
    await repo.updateBrandSettings(_brand);

    if (widget.workspace != null) {
      ref.invalidate(tenantBrandingProvider(widget.workspace!.tenantKey));
    }

    if (mounted) {
      setState(() {
        _isSavingLayout = false;
        _lastSavedLayout = true;
      });
      final friendly = layout == 'split' ? 'Split Screen Showcase' : 'Centered Card (Single)';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Screen layout switched to $friendly and auto-saved.'),
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _pickAndUploadImage() async {
    try {
      final pickedFile = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      );

      if (pickedFile != null) {
        final fileBytes = await pickedFile.readAsBytes();

        if (fileBytes.isNotEmpty) {
          // Immediately show local preview
          setState(() {
            _localUploadedBytes = fileBytes;
            _isUploading = true;
          });

          final repo = ref.read(accountRepositoryProvider);
          final uploadRes = await repo.uploadAsset(
            fileBytes: fileBytes,
            fileName: pickedFile.name,
            assetType: 'bg',
          );

          if (mounted) {
            setState(() => _isUploading = false);
          }

          if (uploadRes != null && uploadRes['url'] != null) {
            final secureUrl = uploadRes['url'].toString();
            setState(() {
              _bgUrlCtrl.text = secureUrl;
              _brand['loginBackgroundImageUrl'] = secureUrl;
            });
            await _saveBrand(silent: true);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Custom wallpaper uploaded to cloud storage and saved!'),
                  backgroundColor: Color(0xFF10B981),
                ),
              );
            }
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Wallpaper loaded locally for preview. Click "Save Configuration" to persist.'),
                  backgroundColor: Color(0xFFF59E0B),
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _selectPreset(Map<String, String> preset) {
    setState(() {
      _localUploadedBytes = null;
      _bgUrlCtrl.text = preset['url']!;
      _brand['loginBackgroundImageUrl'] = preset['url']!;
    });
    _saveBrand(silent: true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Selected ${preset['name']} wallpaper and saved.'),
        backgroundColor: const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _clearWallpaper() {
    setState(() {
      _localUploadedBytes = null;
      _bgUrlCtrl.text = defaultWallpaper;
      _brand['loginBackgroundImageUrl'] = defaultWallpaper;
    });
    _saveBrand(silent: true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Reverted to platform default wallpaper and saved.'),
        backgroundColor: Color(0xFF10B981),
        duration: Duration(seconds: 2),
      ),
    );
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
    final currentBg = _bgUrlCtrl.text.trim().isNotEmpty ? _bgUrlCtrl.text.trim() : defaultWallpaper;
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
      eyebrow: 'auth_setup.eyebrow'.tr(ref, fallback: 'USER MANAGEMENT & ACCESS SUITE'),
      title: 'auth_setup.title'.tr(ref, fallback: 'Auth Page Setup'),
      subtitle: 'auth_setup.subtitle'.tr(ref, fallback:
          'Customize authentication screen layouts (Split Showcase vs Centered Card), background wallpapers, hero narrative copy, and member registration links.'),
      isDark: isDark,
      onBack: widget.onBackTap,
      actions: [
        if (widget.onBackTap != null) ...[
          OutlinedButton.icon(
            onPressed: widget.onBackTap,
            icon: const Icon(Icons.arrow_back_rounded, size: 16),
            label: Text('common.back'.tr(ref, fallback: 'Back')),
            style: OutlinedButton.styleFrom(
              foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
              side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
            ),
          ),
        ],
        OutlinedButton.icon(
          onPressed: () {
            if (widget.workspace != null) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => WorkspaceLoginScreen(workspace: widget.workspace!),
                ),
              );
            }
          },
          icon: const Icon(Icons.open_in_new_rounded, size: 16),
          label: Text('auth_setup.preview_live'.tr(ref, fallback: 'Preview Live Page ↗')),
          style: OutlinedButton.styleFrom(
            foregroundColor: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
            side: BorderSide(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
        ),
        FilledButton.icon(
          onPressed: _isSaving ? null : () => _saveBrand(),
          icon: _isSaving
              ? const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.save_rounded, size: 16),
          label: Text(_isSaving ? 'common.saving'.tr(ref, fallback: 'Saving...') : 'auth_setup.save_config'.tr(ref, fallback: 'Save Configuration')),
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
        // =====================================================================
        // SECTION 1: LAYOUT ARCHITECTURE
        // =====================================================================
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.dashboard_customize_rounded,
          title: 'auth_setup.s1_title'.tr(ref, fallback: 'Screen Layout Architecture'),
          subtitle: 'auth_setup.s1_subtitle'.tr(ref, fallback: 'Choose between a dual-pane showcase layout or a focused single centered card. Switching auto-saves instantly.'),
          trailingBadge: _isSavingLayout
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF0050E5))),
                    const SizedBox(width: 6),
                    Text('common.saving'.tr(ref, fallback: 'Saving...'), style: const TextStyle(fontSize: 11, color: Color(0xFF0050E5), fontWeight: FontWeight.w600)),
                  ],
                )
              : (_lastSavedLayout
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_rounded, size: 14, color: Color(0xFF10B981)),
                        const SizedBox(width: 4),
                        Text('common.auto_saved'.tr(ref, fallback: 'Auto-saved'), style: const TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
                      ],
                    )
                  : null),
          child: Row(
            children: [
              // Option 1: Split Screen Showcase
              Expanded(
                child: InkWell(
                  onTap: () => _selectLayout('split'),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isSplitLayout
                          ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                          : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
                      borderRadius: BorderRadius.circular(12),
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
                        // Visual Wireframe Preview Box
                        Container(
                          height: 72,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF334155)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 5,
                                child: Padding(
                                  padding: const EdgeInsets.all(8.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Container(height: 4, width: 28, color: const Color(0xFF64748B)),
                                      const SizedBox(height: 4),
                                      Container(height: 4, width: 44, color: const Color(0xFF475569)),
                                      const SizedBox(height: 4),
                                      Container(height: 4, width: 36, color: const Color(0xFF334155)),
                                    ],
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 5,
                                child: Container(
                                  margin: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Center(
                                    child: Container(
                                      width: 10,
                                      height: 10,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF0050E5),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'auth_setup.split_title'.tr(ref, fallback: 'Split Screen Showcase'),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: isSplitLayout ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Icon(
                              isSplitLayout ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                              color: isSplitLayout ? const Color(0xFF0050E5) : const Color(0xFFCBD5E1),
                              size: 18,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'auth_setup.split_desc'.tr(ref, fallback: 'Dual-panel experience featuring brand narrative showcase on the left and bright auth form card on the right.'),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Option 2: Centered Card (Don't Split)
              Expanded(
                child: InkWell(
                  onTap: () => _selectLayout('centered'),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: !isSplitLayout
                          ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFEFF6FF))
                          : (isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC)),
                      borderRadius: BorderRadius.circular(12),
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
                        // Visual Wireframe Preview Box
                        Container(
                          height: 72,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFF334155)),
                          ),
                          child: Center(
                            child: Container(
                              width: 86,
                              height: 52,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(6),
                                boxShadow: const [
                                  BoxShadow(color: Color(0x33000000), blurRadius: 4, offset: Offset(0, 2)),
                                ],
                              ),
                              child: Center(
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF0050E5),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'auth_setup.centered_title'.tr(ref, fallback: 'Centered Card (Don\'t Split)'),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: !isSplitLayout ? const Color(0xFF0050E5) : (isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Icon(
                              !isSplitLayout ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                              color: !isSplitLayout ? const Color(0xFF0050E5) : const Color(0xFFCBD5E1),
                              size: 18,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'auth_setup.centered_desc'.tr(ref, fallback: 'Single glass card centered on full-bleed background wallpaper with ambient backdrop blur.'),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
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

        // =====================================================================
        // SECTION 2: BACKGROUND WALLPAPER & VISUALS
        // =====================================================================
        // =====================================================================
        // SECTION 2: BACKGROUND WALLPAPER & VISUALS
        // =====================================================================
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.wallpaper_rounded,
          title: 'auth_setup.s2_title'.tr(ref, fallback: 'Background Wallpaper & Visuals'),
          subtitle: 'auth_setup.s2_subtitle'.tr(ref, fallback: 'Select a curated royalty-free enterprise wallpaper, provide a custom image URL, or upload your own.'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'auth_setup.curated_presets'.tr(ref, fallback: 'CURATED ENTERPRISE PRESETS'),
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),
              CentralAdjuster.grid(
                minItemWidth: 200,
                spacing: 12,
                runSpacing: 12,
                maxColumns: 3,
                children: _wallpaperPresets.map((preset) {
                  final isSelected = _bgUrlCtrl.text == preset['url'] && _localUploadedBytes == null;
                  return InkWell(
                    onTap: () => _selectPreset(preset),
                    borderRadius: BorderRadius.circular(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 84,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFF0050E5)
                                  : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                              width: isSelected ? 2.5 : 1,
                            ),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Stack(
                              children: [
                                Positioned.fill(
                                  child: CachedNetworkImage(
                                    imageUrl: preset['url']!,
                                    fit: BoxFit.cover,
                                    placeholder: (context, url) => Container(color: const Color(0xFF1E293B)),
                                    errorWidget: (context, url, error) => Container(color: const Color(0xFF0050E5)),
                                  ),
                                ),
                                // Category badge top-left
                                Positioned(
                                  top: 6,
                                  left: 6,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.65),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      preset['category']!,
                                      style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                                // Checkmark top-right
                                if (isSelected)
                                  Positioned(
                                    top: 6,
                                    right: 6,
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF0050E5),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.check_rounded, color: Colors.white, size: 14),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          preset['name']!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                            color: isSelected
                                ? const Color(0xFF0050E5)
                                : (isDark ? AppColors.onSurfaceDark : const Color(0xFF334155)),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Desktop Direct Image Upload Dropzone
              Text(
                'auth_setup.upload_title'.tr(ref, fallback: 'UPLOAD CUSTOM WALLPAPER FROM DESKTOP'),
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.gray400 : AppColors.gray600,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: _isUploading ? null : _pickAndUploadImage,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceVariantDark : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF0050E5).withValues(alpha: 0.35),
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_isUploading) ...[
                        const SizedBox(
                          width: 32,
                          height: 32,
                          child: CircularProgressIndicator(strokeWidth: 3, color: Color(0xFF0050E5)),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'auth_setup.uploading'.tr(ref, fallback: 'Uploading image to cloud storage...'),
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0050E5)),
                        ),
                      ] else ...[
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0050E5).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.cloud_upload_rounded, color: Color(0xFF0050E5), size: 26),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'auth_setup.browse_desktop'.tr(ref, fallback: 'Click to browse and upload image from desktop'),
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'auth_setup.upload_formats'.tr(ref, fallback: 'Supports PNG, JPG, JPEG, and WebP (up to 10MB). Image previews immediately in the simulator.'),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Custom URL & Clear Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'auth_setup.custom_url_header'.tr(ref, fallback: 'OR PROVIDE CUSTOM IMAGE URL'),
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                      letterSpacing: 0.5,
                    ),
                  ),
                  InkWell(
                    onTap: _clearWallpaper,
                    child: Text(
                      'auth_setup.revert_default'.tr(ref, fallback: 'Revert to Default Wallpaper'),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0050E5)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _bgUrlCtrl,
                onChanged: (_) => setState(() => _localUploadedBytes = null),
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

        // =====================================================================
        // SECTION 3: HERO WRITE-UPS & NARRATIVE
        // =====================================================================
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.edit_note_rounded,
          title: 'auth_setup.s3_title'.tr(ref, fallback: 'Brand Hero Write-Ups & Narrative'),
          subtitle: 'auth_setup.s3_subtitle'.tr(ref, fallback: 'Customize headlines, security badges, greeting copy, and compliance footers.'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('auth_setup.hero_badge_label'.tr(ref, fallback: 'HERO BADGE / SECURITY CHIP'), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _noteTitleCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'auth_setup.hero_badge_hint'.tr(ref, fallback: 'e.g. Enterprise Security Portal'),
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
                        Text('auth_setup.greeting_label'.tr(ref, fallback: 'GREETING HEADLINE'), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _titleCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'auth_setup.greeting_hint'.tr(ref, fallback: 'e.g. Welcome to your Workspace'),
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

              Text('auth_setup.subtitle_label'.tr(ref, fallback: 'SUBTITLE NARRATIVE'), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
              const SizedBox(height: 6),
              TextField(
                controller: _subtitleCtrl,
                onChanged: (_) => setState(() {}),
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'auth_setup.subtitle_hint'.tr(ref, fallback: 'Enter your authorized credentials...'),
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
                        Text('auth_setup.submit_btn_label'.tr(ref, fallback: 'SUBMIT BUTTON TEXT'), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _btnTextCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'auth_setup.submit_btn_hint'.tr(ref, fallback: 'e.g. Sign In'),
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
                        Text('auth_setup.compliance_label'.tr(ref, fallback: 'COMPLIANCE DISCLAIMER'), style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _complianceCtrl,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            hintText: 'auth_setup.compliance_hint'.tr(ref, fallback: 'Authorized personnel only...'),
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

        // =====================================================================
        // SECTION 4: MEMBER REGISTRATION & BRAND TOGGLES
        // =====================================================================
        _buildSectionCard(
          isDark: isDark,
          icon: Icons.how_to_reg_rounded,
          title: 'auth_setup.s4_title'.tr(ref, fallback: 'Member Registration & Brand Toggles'),
          subtitle: 'auth_setup.s4_subtitle'.tr(ref, fallback: 'Govern public onboarding access and brand contrast variants on authentication screens.'),
          child: Column(
            children: [
              // Public Self-Registration Toggle
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'auth_setup.self_reg_title'.tr(ref, fallback: 'Allow Public Member Self-Registration'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'auth_setup.self_reg_desc'.tr(ref, fallback: 'When enabled, the "Need a new account? Register here" link appears on the login card. When disabled, the link is hidden.'),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _brand['allowPublicRegistration'] != false && _brand['showRegisterLinkOnLogin'] != false,
                    activeThumbColor: const Color(0xFF0050E5),
                    onChanged: (val) {
                      setState(() {
                        _brand['allowPublicRegistration'] = val;
                        _brand['showRegisterLinkOnLogin'] = val;
                      });
                      _saveBrand(silent: true);
                    },
                  ),
                ],
              ),
              const Divider(height: 24, thickness: 1, color: Color(0xFFE2E8F0)),

              // White Contrast Logo Toggle
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'auth_setup.white_logo_title'.tr(ref, fallback: 'Use White Contrast Logo in Auth Pages'),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'auth_setup.white_logo_desc'.tr(ref, fallback: 'Displays the white contrast version of your company logo on authentication screens (recommended for dark wallpapers).'),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: _brand['useWhiteLogoInLogin'] == true,
                    activeThumbColor: const Color(0xFF0050E5),
                    onChanged: (val) {
                      setState(() => _brand['useWhiteLogoInLogin'] = val);
                      _saveBrand(silent: true);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLiveSimulatorCard(bool isDark, bool isSplitLayout, String currentBg) {
    final noteTitle = _noteTitleCtrl.text.trim();
    final title = _titleCtrl.text.trim().isNotEmpty ? _titleCtrl.text.trim() : 'Sign In';
    final subtitle = _subtitleCtrl.text.trim();
    final btnText = _btnTextCtrl.text.trim().isNotEmpty ? _btnTextCtrl.text.trim() : 'Sign In';
    final footerNote = _complianceCtrl.text.trim();
    final showReg = _brand['allowPublicRegistration'] != false && _brand['showRegisterLinkOnLogin'] != false;
    final workspaceName = widget.workspace?.displayName ?? 'testspace';

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
              Row(
                children: [
                  const Icon(Icons.visibility_rounded, size: 16, color: Color(0xFF0050E5)),
                  const SizedBox(width: 6),
                  Text(
                    'auth_setup.live_preview'.tr(ref, fallback: 'Live Interactive Preview'),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  isSplitLayout ? 'auth_setup.badge_split'.tr(ref, fallback: 'Split Showcase') : 'auth_setup.badge_centered'.tr(ref, fallback: 'Centered Card'),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0050E5)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Mini Simulator Box with Real Image Wallpaper & Blur
          Container(
            height: 480,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  // Wallpaper
                  Positioned.fill(
                    child: _localUploadedBytes != null
                        ? Image.memory(_localUploadedBytes!, fit: BoxFit.cover)
                        : CachedNetworkImage(
                            imageUrl: currentBg,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(color: const Color(0xFF0F172A)),
                            errorWidget: (context, url, error) => Container(color: const Color(0xFF0050E5)),
                          ),
                  ),

                  // Ambient Radial Gradient & Blur
                  Positioned.fill(
                    child: ClipRect(
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: RadialGradient(
                              center: const Alignment(-0.6, -0.4),
                              radius: 1.3,
                              colors: [
                                const Color(0xFF0F172A).withValues(alpha: 0.72),
                                const Color(0xFF090D16).withValues(alpha: 0.90),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Simulated Layout
                  Positioned.fill(
                    child: isSplitLayout
                        ? Row(
                            children: [
                              // Left Showcase Panel
                              Expanded(
                                flex: 5,
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        workspaceName,
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                                      ),
                                      const Spacer(),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(
                                          noteTitle,
                                          style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Colors.white),
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        title,
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        subtitle,
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 9.5, color: Colors.white70),
                                      ),
                                      const Spacer(),
                                      const Text('Powered by Ozikol', style: TextStyle(fontSize: 8, color: Colors.white38)),
                                    ],
                                  ),
                                ),
                              ),

                              // Right Card Panel
                              Expanded(
                                flex: 5,
                                child: Container(
                                  color: Colors.white,
                                  padding: const EdgeInsets.all(14),
                                  child: Center(
                                    child: _buildSimulatorForm(btnText, showReg, workspaceName, title, subtitle),
                                  ),
                                ),
                              ),
                            ],
                          )
                        : Center(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  // Floating return home indicator
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withValues(alpha: 0.4),
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(Icons.arrow_back_rounded, size: 10, color: Colors.white),
                                            const SizedBox(width: 4),
                                            Text('auth_setup.return_home'.tr(ref, fallback: 'Return to Home'), style: const TextStyle(fontSize: 8.5, color: Colors.white)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),

                                  // Centered Glass Card
                                  Container(
                                    width: 200,
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      boxShadow: const [
                                        BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 4)),
                                      ],
                                    ),
                                    child: _buildSimulatorForm(btnText, showReg, workspaceName, title, subtitle),
                                  ),
                                  const SizedBox(height: 8),
                                   if (footerNote.isNotEmpty) ...[
                                     Text(
                                    footerNote,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 7.5, color: Colors.white54),
                                  ),
                                   ],
                                  const SizedBox(height: 4),
                                  const Text('Powered by Ozikol', style: TextStyle(fontSize: 8, color: Colors.white38)),
                                ],
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Quick Action Testing Links
          OutlinedButton.icon(
            onPressed: () {
              if (widget.workspace != null) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => WorkspaceLoginScreen(workspace: widget.workspace!),
                  ),
                );
              }
            },
            icon: const Icon(Icons.open_in_new_rounded, size: 15),
            label: Text('auth_setup.open_signin'.tr(ref, fallback: 'Open Live Sign In Page')),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(38),
              side: const BorderSide(color: Color(0xFFCBD5E1)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () {
              if (widget.workspace != null) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ForgotPasswordScreen(workspace: widget.workspace!),
                  ),
                );
              }
            },
            icon: const Icon(Icons.lock_reset_rounded, size: 15),
            label: Text('auth_setup.open_reset'.tr(ref, fallback: 'Open Live Reset Password Page')),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(38),
              side: const BorderSide(color: Color(0xFFCBD5E1)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimulatorForm(String btnText, bool showReg, String wsName, String title, String subtitle) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(wsName, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
        const SizedBox(height: 6),
        Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(subtitle, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8, color: Color(0xFF64748B))),
        ],
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            border: Border.all(color: const Color(0xFFCBD5E1)),
            borderRadius: BorderRadius.circular(5),
          ),
          child: const Text('name@company.com', style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            border: Border.all(color: const Color(0xFFCBD5E1)),
            borderRadius: BorderRadius.circular(5),
          ),
          child: const Text('••••••••••••', style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8))),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF0050E5),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Text(btnText, textAlign: TextAlign.center, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Colors.white)),
        ),
        if (showReg) ...[
          const SizedBox(height: 8),
          Text('auth_setup.register_link'.tr(ref, fallback: 'Need an account? Register'), style: const TextStyle(fontSize: 8.5, color: Color(0xFF0050E5), fontWeight: FontWeight.w600)),
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
    Widget? trailingBadge,
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
                  color: const Color(0xFF0050E5).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: const Color(0xFF0050E5), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                          ),
                        ),
                        ?trailingBadge,
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}
