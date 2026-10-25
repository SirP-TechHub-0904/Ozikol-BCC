import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/workspace.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/custom_text_field.dart';
import '../../../core/widgets/desktop_auth_layout.dart';
import '../../../core/widgets/primary_button.dart';
import '../../dashboard/presentation/dashboard_shell_screen.dart';
import '../state/workspace_state.dart';
import 'first_time_password_screen.dart';
import 'forgot_password_screen.dart';
import 'two_factor_challenge_screen.dart';
import 'workspace_entry_screen.dart';

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
  bool _rememberMe = true;

  @override
  void initState() {
    super.initState();
    _loadRememberedEmail();
  }

  /// <summary>
  /// Loads saved email and Remember Me preference from persistent secure storage.
  /// </summary>
  Future<void> _loadRememberedEmail() async {
    try {
      final storage = ref.read(storageServiceProvider);
      final isRemembered = storage.isRememberLoginEnabled(widget.workspace.tenantKey);
      final rememberedEmail = storage.getRememberedEmail(widget.workspace.tenantKey);
      if (mounted) {
        setState(() {
          _rememberMe = isRemembered;
          if (isRemembered && rememberedEmail != null && rememberedEmail.isNotEmpty) {
            _emailController.text = rememberedEmail;
          }
        });
      }
    } catch (_) {}
  }

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

    final outcome = await notifier.login(
      email: email,
      password: password,
      targetWorkspace: widget.workspace,
    );

    if (!mounted) return;

    // 1. Intercept Two-Factor Authentication Challenge
    if (outcome.requiresMfa) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => TwoFactorChallengeScreen(
            workspace: widget.workspace,
            userId: outcome.mfaUserId ?? '',
            provider: outcome.mfaProvider ?? 'Email',
            email: email,
          ),
        ),
      );
      return;
    }

    // 2. Intercept Mandatory First-Time / Temporary Password Force Change
    if (outcome.mustChangePassword) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => FirstTimePasswordScreen(
            workspace: widget.workspace,
            email: email,
            temporaryPassword: password,
          ),
        ),
      );
      return;
    }

    // 3. Normal Successful Login
    if (outcome.isSuccess) {
      final storage = ref.read(storageServiceProvider);
      await storage.setRememberLoginEnabled(_rememberMe, widget.workspace.tenantKey);
      if (_rememberMe) {
        await storage.setRememberedEmail(email, widget.workspace.tenantKey);
      } else {
        await storage.setRememberedEmail(null, widget.workspace.tenantKey);
      }

      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const DashboardShellScreen()),
        (route) => false,
      );
    }
  }

  /// <summary>
  /// Handles the user request to switch or change to another organization workspace.
  /// Cancels bypass state, purges remembered organization from storage, and safely
  /// navigates back to the <see cref="WorkspaceEntryScreen"/>.
  /// </summary>
  /// <returns>A future representing the asynchronous navigation operation.</returns>
  Future<void> _handleChangeOrganization() async {
    final notifier = ref.read(workspaceStateProvider.notifier);
    notifier.clearError();
    await notifier.cancelBypass(clearRemembered: true);

    if (!mounted) return;

    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      await Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const WorkspaceEntryScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(workspaceStateProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ws = widget.workspace;

    return PopScope(
      canPop: Navigator.of(context).canPop(),
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _handleChangeOrganization();
        }
      },
      child: DesktopAuthLayout(
        workspace: ws,
        title: 'Authentication',
        subtitle: 'Enter your organization credentials to proceed.',
        onBackTap: _handleChangeOrganization,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [

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
                            const SizedBox(height: 8),

                            // Remember Me & Forgot Password Row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Remember Me in future login
                                Flexible(
                                  child: InkWell(
                                    onTap: () => setState(() => _rememberMe = !_rememberMe),
                                    borderRadius: BorderRadius.circular(6),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          SizedBox(
                                            width: 18,
                                            height: 18,
                                            child: Checkbox(
                                              value: _rememberMe,
                                              activeColor: AppColors.primary,
                                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                              side: BorderSide(
                                                color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                                                width: 1.5,
                                              ),
                                              onChanged: (val) {
                                                setState(() => _rememberMe = val ?? true);
                                              },
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Flexible(
                                            child: Text(
                                              'Remember me',
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                                color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),

                                const SizedBox(width: 4),

                                // Forgot Password Action Link
                                TextButton(
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  onPressed: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => ForgotPasswordScreen(workspace: widget.workspace),
                                      ),
                                    );
                                  },
                                  child: Text(
                                    'Forgot Password?',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? const Color(0xFF60A5FA) : AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),

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
    );
  }
}
