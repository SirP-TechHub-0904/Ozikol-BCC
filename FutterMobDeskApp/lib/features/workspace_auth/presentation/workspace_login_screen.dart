import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/contextual_info_button.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../dashboard/presentation/dashboard_shell_screen.dart';
import '../state/workspace_state.dart';

/// Clean, branded authentication screen for the resolved organization workspace.
/// Incorporates the clean UI kit architecture with wave-clipped AuthHeader,
/// pristine white/dark container surfaces, and frictionless single-sign-on input validation.
class WorkspaceLoginScreen extends ConsumerStatefulWidget {
  final Workspace workspace;

  const WorkspaceLoginScreen({
    super.key,
    required this.workspace,
  });

  @override
  ConsumerState<WorkspaceLoginScreen> createState() => _WorkspaceLoginScreenState();
}

class _WorkspaceLoginScreenState extends ConsumerState<WorkspaceLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn() async {
    if (!_formKey.currentState!.validate()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final notifier = ref.read(workspaceStateProvider.notifier);

    final success = await notifier.login(
      email: email,
      password: password,
      targetWorkspace: widget.workspace,
    );

    if (success && mounted) {
      // Clear route stack and navigate into the multi-workspace dashboard shell
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const DashboardShellScreen()),
        (route) => false,
      );
    }
  }

  void _handleChangeOrganization() {
    ref.read(workspaceStateProvider.notifier).clearError();
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      ref.read(workspaceStateProvider.notifier).cancelBypass();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ws = widget.workspace;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            // Wave Header with Organization Branding & Back Button
            AuthHeader(
              title: ws.displayName,
              subtitle: 'Sign in to access your organization workspace',
              showBackButton: true,
              onBackTap: _handleChangeOrganization,
              emblem: TenantAvatar(
                iconUrl: ws.iconUrl,
                logoUrl: ws.logoUrl,
                name: ws.displayName,
                tenantKey: ws.tenantKey,
                size: 54,
                borderRadius: 14,
              ),
            ),

            // Main Credentials Card
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(isDark ? 60 : 12),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Section Title with Contextual Info Icon
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Authentication',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.4,
                                    color: isDark ? AppColors.onBackgroundDark : AppColors.gray950,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const ContextualInfoButton(
                                  title: 'Workspace Authentication',
                                  purpose: 'Authenticates your identity against your tenant user directory and claims token.',
                                  expectedInputs: 'Use your organization work email and password.',
                                  impact: 'Issues a scoped JWT bearer token with tenant role permissions.',
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Enter your organization credentials to proceed.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                              ),
                            ),
                            const SizedBox(height: 24),

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
                              const SizedBox(height: 18),
                            ],

                            // Work Email Input Field
                            CustomTextField(
                              controller: _emailController,
                              label: 'Work Email',
                              placeholder: 'name@company.com',
                              keyboardType: TextInputType.emailAddress,
                              prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20, color: AppColors.primary),
                              showPasteButton: true,
                              textInputAction: TextInputAction.next,
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter your work email.';
                                }
                                if (!val.contains('@') || !val.contains('.')) {
                                  return 'Please enter a valid email address.';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),

                            // Password Input Field
                            CustomTextField(
                              controller: _passwordController,
                              label: 'Password',
                              placeholder: '••••••••',
                              isPassword: true,
                              prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => _handleSignIn(),
                              validator: (val) {
                                if (val == null || val.isEmpty) {
                                  return 'Please enter your password.';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 24),

                            // Sign In Action Button
                            PrimaryButton(
                              text: 'Sign In to Workspace',
                              height: 52,
                              borderRadius: 14,
                              isLoading: state.isLoading,
                              icon: const Icon(Icons.login_rounded, size: 18),
                              onPressed: _handleSignIn,
                            ),
                            const SizedBox(height: 16),

                            // Switch Organization Action
                            Center(
                              child: TextButton.icon(
                                icon: const Icon(Icons.swap_horiz_rounded, size: 16),
                                label: const Text('Change Organization'),
                                style: TextButton.styleFrom(
                                  foregroundColor: isDark ? AppColors.gray400 : AppColors.gray600,
                                  textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                onPressed: _handleChangeOrganization,
                              ),
                            ),
                          ],
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
    );
  }
}
