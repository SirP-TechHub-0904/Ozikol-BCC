import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/localization/language_provider.dart';
import '../../../../core/models/workspace.dart';
import '../../../../core/services/realtime_sync_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/tenant_avatar.dart';
import '../../../dashboard/presentation/dashboard_shell_screen.dart';
import '../workspace_login_screen.dart';
import '../../state/workspace_state.dart';

/// <summary>
/// Displays the confirmation dialog to switch into another enrolled organization workspace.
/// Coordinates user confirmation, active session verification, and whole-system routing.
/// </summary>
/// <param name="context">The active BuildContext.</param>
/// <param name="targetWorkspace">The organization workspace to transition into.</param>
/// <returns>A Future completing when the dialog and subsequent routing conclude.</returns>
Future<void> showWorkspaceSwitchDialog(BuildContext context, Workspace targetWorkspace) {
  return showDialog<void>(
    context: context,
    barrierDismissible: true,
    builder: (dialogContext) => WorkspaceSwitchConfirmDialog(workspace: targetWorkspace),
  );
}

/// <summary>
/// Two-phase modal dialog that prompts for workspace transition confirmation,
/// verifies stored session credentials, and routes cleanly to either Dashboard or Login.
/// </summary>
class WorkspaceSwitchConfirmDialog extends ConsumerStatefulWidget {
  /// The target workspace being switched into.
  final Workspace workspace;

  /// Creates a new instance of [WorkspaceSwitchConfirmDialog].
  const WorkspaceSwitchConfirmDialog({
    super.key,
    required this.workspace,
  });

  @override
  ConsumerState<WorkspaceSwitchConfirmDialog> createState() => _WorkspaceSwitchConfirmDialogState();
}

class _WorkspaceSwitchConfirmDialogState extends ConsumerState<WorkspaceSwitchConfirmDialog> {
  bool _isChecking = false;
  String? _statusMessage;
  bool? _switchSuccess;

  /// <summary>
  /// Initiates session verification and orchestrates system-wide workspace switching.
  /// </summary>
  Future<void> _handleConfirmSwitch() async {
    setState(() {
      _isChecking = true;
      _statusMessage = 'ws.checking_last_login'.tr(ref, fallback: 'Switching workspace, checking for last login user...');
    });

    final notifier = ref.read(workspaceStateProvider.notifier);

    // Enforce a minimum display interval (650ms) so the feedback state is clearly perceptible
    final results = await Future.wait<dynamic>([
      notifier.verifyAndSwitchWorkspace(widget.workspace),
      Future.delayed(const Duration(milliseconds: 650)),
    ]);

    final result = results[0] as WorkspaceSwitchResult;

    if (!mounted) return;

    if (result.isAuthenticated) {
      // 1. Active Login Found -> Transition to Dashboard
      setState(() {
        _switchSuccess = true;
        _statusMessage = 'ws.login_verified'.tr(ref, fallback: 'Active login verified! Loading dashboard...');
      });

      await Future.delayed(const Duration(milliseconds: 400));
      if (!mounted) return;

      // Close modal first
      Navigator.of(context, rootNavigator: true).pop();

      // Synchronize duplex real-time SignalR push connection for the new tenant
      ref.read(realtimeSyncServiceProvider).connect(explicitTenantKey: widget.workspace.tenantKey);

      // Re-mount the entire dashboard shell cleanly to reset navigation stacks and telemetry
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const DashboardShellScreen()),
        (route) => false,
      );
    } else {
      // 2. No Active Login Found -> Transition to Login
      setState(() {
        _switchSuccess = false;
        _statusMessage = 'ws.no_active_login'.tr(ref, fallback: 'No active login found. Redirecting to login...');
      });

      await Future.delayed(const Duration(milliseconds: 400));
      if (!mounted) return;

      // Close modal first
      Navigator.of(context, rootNavigator: true).pop();

      // Disconnect duplex real-time SignalR push connection from previous session
      ref.read(realtimeSyncServiceProvider).disconnect();

      // Re-mount cleanly to the dedicated organization login screen
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => WorkspaceLoginScreen(workspace: result.workspace),
        ),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ws = widget.workspace;

    return PopScope(
      canPop: !_isChecking,
      child: Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            width: 1,
          ),
        ),
        backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
        elevation: 16,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(26),
            child: _isChecking ? _buildCheckingView(isDark) : _buildConfirmView(isDark, ws),
          ),
        ),
      ),
    );
  }

  /// <summary>
  /// Builds the initial confirmation dialog card prompting user confirmation.
  /// </summary>
  Widget _buildConfirmView(bool isDark, Workspace ws) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Organization Avatar / Emblem
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: AppColors.primary.withAlpha(80),
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withAlpha(40),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          child: TenantAvatar(
            iconUrl: ws.iconUrl,
            logoUrl: ws.logoUrl,
            name: ws.displayName,
            size: 52,
            borderRadius: 16,
          ),
        ),
        const SizedBox(height: 18),

        // Title
        Text(
          'ws.switch_title'.tr(ref, fallback: 'Switch Workspace'),
          style: TextStyle(
            fontSize: 19,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.2,
            color: isDark ? Colors.white : AppColors.gray900,
          ),
        ),
        const SizedBox(height: 10),

        // Prompt Question
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: TextStyle(
              fontSize: 14,
              height: 1.45,
              color: isDark ? AppColors.gray300 : AppColors.gray600,
            ),
            children: [
              TextSpan(text: '${'ws.switch_prompt'.tr(ref, fallback: 'Do you want to switch to')} '),
              TextSpan(
                text: ws.displayName,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppColors.primary,
                ),
              ),
              const TextSpan(text: '?'),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Partition Key / Domain pill
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceVariantDark : AppColors.gray100,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.domain_rounded,
                size: 13,
                color: isDark ? AppColors.gray400 : AppColors.gray500,
              ),
              const SizedBox(width: 6),
              Text(
                ws.primaryDomain.isNotEmpty ? ws.primaryDomain : ws.tenantKey,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.gray300 : AppColors.gray700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Action Buttons: Cancel & Switch Workspace (Royal Blue #0050E5)
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isDark ? AppColors.gray300 : AppColors.gray700,
                  side: BorderSide(
                    color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'btn.cancel'.tr(ref, fallback: 'Cancel'),
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _handleConfirmSwitch,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 2,
                  shadowColor: AppColors.primary.withAlpha(120),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'ws.confirm_switch'.tr(ref, fallback: 'Yes, Switch'),
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// <summary>
  /// Builds the interactive checking view shown while verifying stored sessions.
  /// Displays the required status message: "Switching workspace, checking for last login user...".
  /// </summary>
  Widget _buildCheckingView(bool isDark) {
    Widget indicator;
    if (_switchSuccess == true) {
      indicator = Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: const Color(0xFF10B981).withAlpha(30),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 30),
      );
    } else if (_switchSuccess == false) {
      indicator = Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.primary.withAlpha(30),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.login_rounded, color: AppColors.primary, size: 28),
      );
    } else {
      indicator = const SizedBox(
        width: 38,
        height: 38,
        child: CircularProgressIndicator(
          strokeWidth: 3.2,
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 8),
        indicator,
        const SizedBox(height: 20),

        // Primary status message as required
        Text(
          _statusMessage ?? 'ws.checking_last_login'.tr(ref, fallback: 'Switching workspace, checking for last login user...'),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : AppColors.gray900,
          ),
        ),
        const SizedBox(height: 8),

        // Subtitle
        Text(
          'ws.sync_environment'.tr(ref, fallback: 'Configuring tenant partitions and reloading client environment...'),
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? AppColors.gray400 : AppColors.gray500,
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
