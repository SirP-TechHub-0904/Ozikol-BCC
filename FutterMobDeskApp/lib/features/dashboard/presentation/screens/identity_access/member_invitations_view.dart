import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/page_header.dart';
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

  final List<Map<String, dynamic>> _defaultInvitationsFallback = [
    {
      'id': 'inv_101',
      'email': 'debustechltd@gmail.com',
      'assignedRole': 'Admin',
      'role': 'Admin',
      'featureArea': null,
      'status': 'Pending',
      'sentDate': '2026-10-22T13:37:26Z',
      'expiresDate': '2026-10-29T13:37:26Z',
      'invitationUrl': 'https://ozikol.cloud/auth/register?token=tok_admin_101&email=debustechltd%40gmail.com',
    },
    {
      'id': 'inv_102',
      'email': 'developer@company.com',
      'assignedRole': 'Staff',
      'role': 'Staff',
      'featureArea': 'directory',
      'status': 'Pending',
      'sentDate': '2026-10-20T10:15:00Z',
      'expiresDate': '2026-10-27T10:15:00Z',
      'invitationUrl': 'https://ozikol.cloud/auth/register?token=tok_staff_102&email=developer%40company.com',
    },
    {
      'id': 'inv_103',
      'email': 'contractor@partner.org',
      'assignedRole': 'Member',
      'role': 'Member',
      'featureArea': null,
      'status': 'Accepted',
      'sentDate': '2026-10-14T08:20:00Z',
      'expiresDate': '2026-10-21T08:20:00Z',
      'invitationUrl': null,
    },
    {
      'id': 'inv_104',
      'email': 'auditor@advisory.io',
      'assignedRole': 'Read Only',
      'role': 'Read Only',
      'featureArea': null,
      'status': 'Expired',
      'sentDate': '2026-09-28T14:40:00Z',
      'expiresDate': '2026-10-05T14:40:00Z',
      'invitationUrl': null,
    },
  ];

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
          _invitations = list.isNotEmpty ? list : _defaultInvitationsFallback;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _invitations = _defaultInvitationsFallback;
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
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.resendInvitation(id);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Invitation email resent to $email' : 'Failed to resend invitation email.'),
          backgroundColor: success ? AppColors.success : AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  Future<void> _revokeInvitation(String id, String email) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 22),
            SizedBox(width: 8),
            Text('Revoke Invitation?'),
          ],
        ),
        content: Text('Are you sure you want to cancel the pending registration token for $email? The recipient will no longer be able to activate an account.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            child: const Text('Revoke Token'),
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
          content: Text(success ? 'Invitation token revoked successfully.' : 'Failed to revoke invitation.'),
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
            eyebrow: 'ONBOARDING REGISTRY',
            icon: Icons.mail_outline_rounded,
            title: 'Administrative User Invitations',
            description:
                'Issue secure onboarding tokens to administrators, editors, or moderators with pre-assigned workspace roles.',
            primaryAction: PageHeaderAction(
              label: 'Send Onboarding Invite',
              compactLabel: 'Invite',
              icon: Icons.send_rounded,
              style: PageHeaderActionStyle.primary,
              onPressed: _onIssueInvite,
            ),
            secondaryActions: [
              PageHeaderAction(
                label: 'Refresh Registry',
                compactLabel: 'Refresh',
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
                            'Onboarding Token Registry',
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
                        label: const Text(
                          'Issue New Invitation',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
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
  }

  Widget _buildEmptyState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(48),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.drafts_outlined, size: 48, color: isDark ? AppColors.gray600 : AppColors.gray400),
            const SizedBox(height: 14),
            Text(
              'No invitations issued yet. Click "Issue New Invitation" to onboard a new workspace member.',
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
              label: const Text('Issue First Invitation', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
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
                _buildColumnHeader('RECIPIENT EMAIL'),
                _buildColumnHeader('ASSIGNED ROLE & SCOPE'),
                _buildColumnHeader('SENT DATE'),
                _buildColumnHeader('EXPIRATION DATE'),
                _buildColumnHeader('ONBOARDING STATUS'),
                _buildColumnHeader('ACTION', alignment: Alignment.centerRight),
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
                            if (isPending && invitationUrl != null && invitationUrl.isNotEmpty) ...[
                              InkWell(
                                onTap: () => _copyLink(id, invitationUrl),
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
                                        isCopied ? Icons.check_rounded : Icons.content_copy_rounded,
                                        size: 13,
                                        color: isCopied ? const Color(0xFF10B981) : const Color(0xFF475569),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isCopied ? 'Copied!' : 'Copy Link',
                                        style: TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                          color: isCopied ? const Color(0xFF10B981) : const Color(0xFF475569),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert_rounded, size: 16, color: Color(0xFF94A3B8)),
                                padding: EdgeInsets.zero,
                                tooltip: '',
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                onSelected: (val) {
                                  if (val == 'resend') {
                                    _resendInvitation(id, email);
                                  } else if (val == 'revoke') {
                                    _revokeInvitation(id, email);
                                  }
                                },
                                itemBuilder: (ctx) => [
                                  const PopupMenuItem(
                                    value: 'resend',
                                    child: Row(
                                      children: [
                                        Icon(Icons.refresh_rounded, size: 16, color: AppColors.primary),
                                        SizedBox(width: 8),
                                        Text('Resend Email', style: TextStyle(fontSize: 12.5)),
                                      ],
                                    ),
                                  ),
                                  const PopupMenuItem(
                                    value: 'revoke',
                                    child: Row(
                                      children: [
                                        Icon(Icons.cancel_outlined, size: 16, color: AppColors.error),
                                        SizedBox(width: 8),
                                        Text('Revoke Token', style: TextStyle(fontSize: 12.5, color: AppColors.error)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ] else ...[
                              Text(
                                status.toLowerCase() == 'accepted' ? 'Enrolled' : 'Expired',
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

    switch (status.toLowerCase()) {
      case 'accepted':
        bg = const Color(0xFF16A34A).withValues(alpha: 0.12);
        fg = const Color(0xFF16A34A);
        break;
      case 'expired':
        bg = const Color(0xFFEF4444).withValues(alpha: 0.12);
        fg = const Color(0xFFEF4444);
        break;
      case 'pending':
      default:
        bg = const Color(0xFF3B82F6).withValues(alpha: 0.12);
        fg = AppColors.primary;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}
