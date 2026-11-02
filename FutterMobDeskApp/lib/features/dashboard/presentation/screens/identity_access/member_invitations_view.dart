import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/page_header.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting Administrative User Invitations under Identity & Access Control.
/// Delivers 1-to-1 operational and visual parity with the BCC Web Console
/// (/identity/console/invitations), displaying the Onboarding Token Registry table,
/// status badges, direct link copying with post-frame safety, and action handlers.
/// </summary>
class MemberInvitationsView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Callback to navigate to the dedicated invitation creation screen.
  final VoidCallback? onNavigateToCreate;

  /// Creates a [MemberInvitationsView].
  const MemberInvitationsView({
    super.key,
    this.workspace,
    this.onNavigateToCreate,
  });

  @override
  ConsumerState<MemberInvitationsView> createState() => _MemberInvitationsViewState();
}

class _MemberInvitationsViewState extends ConsumerState<MemberInvitationsView> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _invitations = [];
  String? _recentlyCopiedId;
  String? _resendingId;

  @override
  void initState() {
    super.initState();
    _loadInvitations();
  }

  Future<void> _loadInvitations() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);

    try {
      final list = await repo.getInvitations();
      if (mounted) {
        setState(() {
          _invitations = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _invitations = [];
          _isLoading = false;
        });
      }
    }
  }

  /// <summary>
  /// Safely copies the direct registration invitation link to system clipboard
  /// using a post-frame callback to prevent MouseTracker assertion collisions.
  /// </summary>
  void _copyLink(String id, String? url) {
    if (url == null || url.isEmpty) return;

    Clipboard.setData(ClipboardData(text: url));

    setState(() => _recentlyCopiedId = id);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration invitation link copied to clipboard!'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 2),
        ),
      );
    });

    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && _recentlyCopiedId == id) {
        setState(() => _recentlyCopiedId = null);
      }
    });
  }

  Future<void> _resendInvitation(String id, String email) async {
    setState(() => _resendingId = id);
    final repo = ref.read(accountRepositoryProvider);

    bool success = false;
    try {
      success = await repo.resendInvitation(id);
    } catch (_) {
      success = false;
    }

    if (mounted) {
      setState(() => _resendingId = null);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? '${'invite.resent_to'.tr(ref, fallback: 'Invitation email resent to')} $email'
                  : 'invite.resend_failed'.tr(ref, fallback: 'Failed to resend invitation email.'),
            ),
            backgroundColor: success ? AppColors.success : AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      });
    }
  }

  Future<void> _revokeInvitation(String id, String email) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 22),
            const SizedBox(width: 8),
            Text('invite.revoke_title'.tr(ref, fallback: 'Revoke Invitation?')),
          ],
        ),
        content: Text(
          '${'invite.revoke_confirm'.tr(ref, fallback: 'Are you sure you want to cancel the pending registration token for')} $email? ${'invite.revoke_consequence'.tr(ref, fallback: 'The recipient will no longer be able to activate an account.')}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('auth.cancel'.tr(ref, fallback: 'Cancel')),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            child: Text('invite.revoke_token'.tr(ref, fallback: 'Revoke Token')),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.revokeInvitation(id);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'invite.revoked_success'.tr(ref, fallback: 'Invitation token revoked successfully.')
                : 'invite.revoke_failed'.tr(ref, fallback: 'Failed to revoke invitation.'),
          ),
          backgroundColor: success ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      if (success) _loadInvitations();
    });
  }

  String _formatDate(dynamic rawDate) {
    if (rawDate == null) return '—';
    final str = rawDate.toString();
    final dt = DateTime.tryParse(str);
    if (dt == null) return str;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final m = months[dt.month - 1];
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final min = dt.minute.toString().padLeft(2, '0');
    final sec = dt.second.toString().padLeft(2, '0');

    return '$m ${dt.day}, ${dt.year}, $hour:$min:$sec $period';
  }

  void _onIssueInvite() {
    if (widget.onNavigateToCreate != null) {
      widget.onNavigateToCreate!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          PageHeader(
            eyebrow: 'invite.eyebrow'.tr(ref, fallback: 'ONBOARDING REGISTRY'),
            icon: Icons.mail_outline_rounded,
            title: 'invite.title'.tr(ref, fallback: 'Administrative User Invitations'),
            description: 'invite.description'.tr(
              ref,
              fallback: 'Issue secure onboarding tokens to administrators, editors, or moderators with pre-assigned workspace roles.',
            ),
            primaryAction: PageHeaderAction(
              label: 'invite.send_invite'.tr(ref, fallback: 'Send Onboarding Invite'),
              compactLabel: 'invite.invite_compact'.tr(ref, fallback: 'Invite'),
              icon: Icons.send_rounded,
              style: PageHeaderActionStyle.primary,
              onPressed: _onIssueInvite,
            ),
            secondaryActions: [
              PageHeaderAction(
                label: 'invite.refresh_registry'.tr(ref, fallback: 'Refresh Registry'),
                compactLabel: 'btn.refresh'.tr(ref, fallback: 'Refresh'),
                icon: Icons.refresh_rounded,
                isLoading: _isLoading,
                onPressed: _loadInvitations,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Main Card: Onboarding Token Registry
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(color: Color(0x05000000), blurRadius: 12, offset: Offset(0, 4)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Card Head
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.list_alt_rounded, color: Color(0xFF8B5CF6), size: 18),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'invite.token_registry'.tr(ref, fallback: 'Onboarding Token Registry'),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton.icon(
                        onPressed: _onIssueInvite,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.add_rounded, size: 16),
                        label: Text(
                          'invite.issue_new_invite'.tr(ref, fallback: 'Issue New Invitation'),
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, thickness: 1),

                // Card Body / Table
                if (_isLoading)
                  const Padding(
                    padding: EdgeInsets.all(48),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_invitations.isEmpty)
                  _buildEmptyState(isDark)
                else
                  _buildTable(isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }  Widget _buildEmptyState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(48),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.drafts_outlined, size: 48, color: isDark ? AppColors.gray600 : AppColors.gray400),
            const SizedBox(height: 14),
            Text(
              'invite.no_invites_yet'.tr(
                ref,
                fallback: 'No invitations issued yet. Click "Issue New Invitation" to onboard a new workspace member.',
              ),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _onIssueInvite,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.send_rounded, size: 16),
              label: Text(
                'invite.issue_first_invite'.tr(ref, fallback: 'Issue First Invitation'),
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTable(bool isDark) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: constraints.maxWidth),
            child: DataTable(
              headingRowHeight: 42,
              dataRowMinHeight: 52,
              dataRowMaxHeight: 56,
              horizontalMargin: 24,
              columnSpacing: 24,
              headingRowColor: WidgetStateProperty.all(
                isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
              ),
              columns: [
                _buildColumnHeader('invite.col_recipient_email'.tr(ref, fallback: 'RECIPIENT EMAIL')),
                _buildColumnHeader('invite.col_role_scope'.tr(ref, fallback: 'ASSIGNED ROLE & SCOPE')),
                _buildColumnHeader('invite.col_sent_date'.tr(ref, fallback: 'SENT DATE')),
                _buildColumnHeader('invite.col_expiration_date'.tr(ref, fallback: 'EXPIRATION DATE')),
                _buildColumnHeader('invite.col_status'.tr(ref, fallback: 'ONBOARDING STATUS')),
                _buildColumnHeader('invite.col_action'.tr(ref, fallback: 'ACTION'), alignment: Alignment.centerRight),
              ],
              rows: _invitations.map((invite) {
                final id = (invite['id'] ?? '').toString();
                final email = (invite['email'] ?? 'name@company.com').toString();
                final assignedRole = (invite['assignedRole'] ?? invite['role'] ?? 'Member').toString();
                final featureArea = invite['featureArea']?.toString();
                final status = (invite['status'] ?? 'Pending').toString();
                final sentDate = invite['sentDate'] ?? invite['sentAt'];
                final expiresDate = invite['expiresDate'] ?? invite['expiresAt'];
                final invitationUrl = invite['invitationUrl']?.toString();
                final isPending = status.toLowerCase() == 'pending';
                final isCopied = _recentlyCopiedId == id;

                return DataRow(
                  cells: [
                    // RECIPIENT EMAIL
                    DataCell(
                      Text(
                        email,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    // ASSIGNED ROLE & SCOPE
                    DataCell(
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              assignedRole,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          if (featureArea != null && featureArea.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.25)),
                              ),
                              child: Text(
                                featureArea,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF10B981),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    // SENT DATE
                    DataCell(
                      Text(
                        _formatDate(sentDate),
                        style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray300 : const Color(0xFF334155)),
                      ),
                    ),
                    // EXPIRATION DATE
                    DataCell(
                      Text(
                        _formatDate(expiresDate),
                        style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray300 : const Color(0xFF334155)),
                      ),
                    ),
                    // ONBOARDING STATUS
                    DataCell(
                      _buildStatusPill(status),
                    ),
                    // ACTION
                    DataCell(
                      Align(
                        alignment: Alignment.centerRight,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isPending) ...[
                              // Copy Link
                              if (invitationUrl != null && invitationUrl.isNotEmpty) ...[
                                InkWell(
                                  onTap: () => _copyLink(id, invitationUrl),
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: isCopied
                                          ? const Color(0xFF10B981).withValues(alpha: 0.12)
                                          : (isDark ? const Color(0xFF1E293B) : Colors.white),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: isCopied ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          isCopied ? Icons.check_rounded : Icons.link_rounded,
                                          size: 15,
                                          color: isCopied ? const Color(0xFF10B981) : (isDark ? AppColors.gray300 : const Color(0xFF475569)),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          isCopied ? 'invite.copied'.tr(ref, fallback: 'Copied!') : 'invite.copy_link'.tr(ref, fallback: 'Copy Link'),
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w600,
                                            color: isCopied ? const Color(0xFF10B981) : (isDark ? AppColors.gray300 : const Color(0xFF475569)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              // Resend Button
                              InkWell(
                                onTap: _resendingId == id ? null : () => _resendInvitation(id, email),
                                borderRadius: BorderRadius.circular(100),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: isDark ? const Color(0xFF1E3A8A).withValues(alpha: 0.35) : const Color(0xFFE8F1FD),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (_resendingId == id) ...[
                                        const SizedBox(
                                          width: 13,
                                          height: 13,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                                        ),
                                        const SizedBox(width: 6),
                                      ] else ...[
                                        const Icon(Icons.refresh_rounded, size: 15, color: AppColors.primary),
                                        const SizedBox(width: 6),
                                      ],
                                      Text(
                                        _resendingId == id ? 'invite.sending'.tr(ref, fallback: 'Sending...') : 'invite.resend'.tr(ref, fallback: 'Resend'),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Revoke Button
                              InkWell(
                                onTap: () => _revokeInvitation(id, email),
                                borderRadius: BorderRadius.circular(100),
                                child: const Padding(
                                  padding: EdgeInsets.all(4),
                                  child: Icon(Icons.cancel_outlined, size: 18, color: AppColors.error),
                                ),
                              ),
                            ] else ...[
                              Text(
                                status.toLowerCase() == 'accepted' ? 'invite.enrolled'.tr(ref, fallback: 'Enrolled') : 'invite.expired'.tr(ref, fallback: 'Expired'),
                                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }

  DataColumn _buildColumnHeader(String title, {Alignment alignment = Alignment.centerLeft}) {
    return DataColumn(
      label: Align(
        alignment: alignment,
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF64748B),
            letterSpacing: 0.4,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusPill(String status) {
    Color bg;
    Color fg;
    String label;

    switch (status.toLowerCase()) {
      case 'accepted':
        bg = const Color(0xFF16A34A).withValues(alpha: 0.12);
        fg = const Color(0xFF16A34A);
        label = 'invite.accepted'.tr(ref, fallback: 'Accepted');
        break;
      case 'expired':
        bg = const Color(0xFFEF4444).withValues(alpha: 0.12);
        fg = const Color(0xFFEF4444);
        label = 'invite.expired'.tr(ref, fallback: 'Expired');
        break;
      case 'pending':
      default:
        bg = const Color(0xFF3B82F6).withValues(alpha: 0.12);
        fg = AppColors.primary;
        label = 'invite.pending'.tr(ref, fallback: 'Pending');
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}
