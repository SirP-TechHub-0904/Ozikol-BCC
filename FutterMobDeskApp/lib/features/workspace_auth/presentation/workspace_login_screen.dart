import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/glass_container.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/tenant_avatar.dart';
import '../../dashboard/presentation/dashboard_shell_screen.dart';
import '../state/workspace_state.dart';

/// Screen 2: Branded login screen for the resolved organization workspace.
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

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ws = widget.workspace;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 18,
            color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
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
                    // Organization Avatar & Identity
                    Center(
                      child: TenantAvatar(
                        logoUrl: ws.logoUrl,
                        name: ws.displayName,
                        size: 64,
                        borderRadius: 18,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Organization Title
                    Text(
                      ws.displayName,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                        color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Domain Badge
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(isDark ? 40 : 20),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppColors.primary.withAlpha(60),
                          ),
                        ),
                        child: Text(
                          ws.primaryDomain,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Error Banner
                    if (state.errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.error.withAlpha(isDark ? 40 : 25),
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
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Work Email Field
                    CustomTextField(
                      controller: _emailController,
                      label: 'Work Email',
                      placeholder: 'name@company.com',
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: const Icon(Icons.mail_outline_rounded, size: 19, color: Color(0xFF64748B)),
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
                    const SizedBox(height: 18),

                    // Password Field
                    CustomTextField(
                      controller: _passwordController,
                      label: 'Password',
                      placeholder: '••••••••',
                      isPassword: true,
                      prefixIcon: const Icon(Icons.lock_outline_rounded, size: 19, color: Color(0xFF64748B)),
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _handleSignIn(),
                      validator: (val) {
                        if (val == null || val.isEmpty) {
                          return 'Please enter your password.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 28),

                    // Sign In Button
                    PrimaryButton(
                      text: 'Sign In to Workspace',
                      isLoading: state.isLoading,
                      icon: const Icon(Icons.login_rounded, size: 18),
                      onPressed: _handleSignIn,
                    ),
                    const SizedBox(height: 20),

                    // Change Workspace Link
                    Center(
                      child: TextButton.icon(
                        icon: const Icon(Icons.swap_horiz_rounded, size: 16),
                        label: const Text('Change Organization'),
                        style: TextButton.styleFrom(
                          foregroundColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
