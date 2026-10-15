import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/theme_mode_switcher.dart';
import '../state/workspace_state.dart';
import 'workspace_login_screen.dart';

/// Screen 1: Omni-identifier workspace entry.
/// Accepts Company Access Code, Default Subdomain, or Custom Domain.
class WorkspaceEntryScreen extends ConsumerStatefulWidget {
  const WorkspaceEntryScreen({super.key});

  @override
  ConsumerState<WorkspaceEntryScreen> createState() => _WorkspaceEntryScreenState();
}

class _WorkspaceEntryScreenState extends ConsumerState<WorkspaceEntryScreen> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
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
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
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
              const Text('Switch Preset:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
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
              child: const Text('Save Custom'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _handleContinue() async {
    if (!_formKey.currentState!.validate()) return;

    final input = _controller.text.trim();
    final notifier = ref.read(workspaceStateProvider.notifier);

    final resolved = await notifier.verifyWorkspace(input);
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

    return Scaffold(
      body: Stack(
        children: [
          // Top-Right Header Actions (Theme Switcher & Environment Settings)
          Positioned(
            top: 14,
            right: 14,
            child: SafeArea(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const ThemeModeSwitcher(compact: true),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: 'Configure API Server Environment',
                    child: IconButton(
                      icon: Icon(
                        Icons.settings_ethernet_rounded,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        size: 20,
                      ),
                      onPressed: _showServerSettingsDialog,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Background subtle ambient radial gradients
          Positioned(
            top: -120,
            right: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.primary.withAlpha(isDark ? 60 : 35),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            left: -80,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.tertiary.withAlpha(isDark ? 40 : 25),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Central Glass Card
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: GlassContainer(
                  borderRadius: 24,
                  padding: const EdgeInsets.all(36),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // App Brand Icon
                        Center(
                          child: Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppColors.primary, AppColors.secondary],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(18),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withAlpha(90),
                                  blurRadius: 18,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.business_center_rounded,
                              color: Colors.white,
                              size: 30,
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Title & Subtitle
                        Text(
                          'Enter Workspace',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                            color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Sign in using your organization access code or company domain.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Error Banner
                        if (state.errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.error.withAlpha(isDark ? 40 : 25),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: AppColors.error.withAlpha(80),
                              ),
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
                                      fontWeight: FontWeight.w500,
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

                        // Explanatory note
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              size: 14,
                              color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'You can enter your company code (e.g. acme) or your custom web domain.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 28),

                        // Action Button
                        PrimaryButton(
                          text: 'Continue',
                          isLoading: state.isLoading,
                          icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                          onPressed: _handleContinue,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
