import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';

/// Screen presenting the Auth Page Setup under User Directory.
/// Customizes the visual branding, welcome copy, and sign-in aesthetics for the workspace.
class AuthPageSetupView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates an [AuthPageSetupView].
  const AuthPageSetupView({super.key, this.workspace});

  @override
  ConsumerState<AuthPageSetupView> createState() => _AuthPageSetupViewState();
}

class _AuthPageSetupViewState extends ConsumerState<AuthPageSetupView> {
  final _headlineController = TextEditingController();
  final _welcomeCopyController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _headlineController.text = 'Sign In to ${widget.workspace?.organizationName ?? "Workspace"}';
    _welcomeCopyController.text = 'Enter your work email and credentials to access your account.';
  }

  @override
  void dispose() {
    _headlineController.dispose();
    _welcomeCopyController.dispose();
    super.dispose();
  }

  void _handleSave() {
    setState(() => _isSaving = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Auth page setup saved successfully.')),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.branding_watermark_outlined, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Auth Page Setup',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Personalize the tenant login card, welcome message, and onboarding portal presentation.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Setup Form
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CustomTextField(
                  controller: _headlineController,
                  label: 'Sign In Page Headline',
                  placeholder: 'e.g. Sign In to Your Organization',
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  controller: _welcomeCopyController,
                  label: 'Welcome Description Copy',
                  placeholder: 'e.g. Enter credentials to access...',
                ),
                const SizedBox(height: 24),
                Align(
                  alignment: Alignment.centerRight,
                  child: SizedBox(
                    width: 160,
                    child: PrimaryButton(
                      text: 'Save Auth Setup',
                      isLoading: _isSaving,
                      onPressed: _handleSave,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
