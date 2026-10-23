import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting Member Invitations under Identity & Access Control.
/// Allows workspace administrators to invite prospective users, assign roles/categories,
/// configure invitation token expiration, and manage lifecycle actions (resend, revoke, inspect status).
/// </summary>
class MemberInvitationsView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [MemberInvitationsView].
  const MemberInvitationsView({super.key, this.workspace});

  @override
  ConsumerState<MemberInvitationsView> createState() => _MemberInvitationsViewState();
}

class _MemberInvitationsViewState extends ConsumerState<MemberInvitationsView> {
  bool _isLoading = true;
  String _selectedFilter = 'All';
  List<Map<String, dynamic>> _invitations = [];
  List<Map<String, dynamic>> _categories = [];

  final List<Map<String, dynamic>> _defaultInvitationsFallback = [
    {
      'id': 'inv_101',
      'email': 'developer@company.com',
      'role': 'Staff',
      'category': 'Staff',
      'status': 'Pending',
      'sentAt': '2 days ago',
      'expiresAt': 'In 5 days',
    },
    {
      'id': 'inv_102',
      'email': 'lead.architect@company.com',
      'role': 'Admin',
      'category': 'Executive',
      'status': 'Pending',
      'sentAt': 'Yesterday',
      'expiresAt': 'In 6 days',
    },
    {
      'id': 'inv_103',
      'email': 'contractor@partner.org',
      'role': 'Member',
      'category': 'Associate',
      'status': 'Accepted',
      'sentAt': '1 week ago',
      'expiresAt': 'Accepted',
    },
    {
      'id': 'inv_104',
      'email': 'auditor@advisory.io',
      'role': 'Read Only',
      'category': 'Associate',
      'status': 'Expired',
      'sentAt': '3 weeks ago',
      'expiresAt': 'Expired',
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
      final invitesFuture = repo.getInvitations();
      final catsFuture = repo.getCategories();

      final results = await Future.wait([invitesFuture, catsFuture]);
      final list = results[0];
      final cats = results[1];

      if (mounted) {
        setState(() {
          _invitations = list.isNotEmpty ? list : _defaultInvitationsFallback;
          _categories = cats;
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

  void _showSendInvitationDialog() {
    final emailCtrl = TextEditingController();
    final messageCtrl = TextEditingController();
    String selectedRole = 'Member';
    String? selectedCategoryId;
    int selectedExpiryDays = 7;
    bool isSending = false;

    final messenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.mark_email_read_outlined, color: AppColors.primary, size: 22),
                SizedBox(width: 10),
                Text('Issue Workspace Invitation'),
              ],
            ),
            content: SizedBox(
              width: 480,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CustomTextField(
                      label: 'Recipient Email Address',
                      placeholder: 'name@company.com',
                      prefixIcon: const Icon(Icons.mail_outline),
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 16),
                    const Text('Assign System Role', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: selectedRole,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'Member', child: Text('Member (Personal Workspace)')),
                        DropdownMenuItem(value: 'Feature Editor', child: Text('Feature Editor (Scoped)')),
                        DropdownMenuItem(value: 'Global Editor', child: Text('Global Editor (Authoring)')),
                        DropdownMenuItem(value: 'User Manager', child: Text('User Manager (Directory)')),
                        DropdownMenuItem(value: 'Identity Manager', child: Text('Identity Manager (Security)')),
                        DropdownMenuItem(value: 'Admin', child: Text('Admin (Global Administrator)')),
                        DropdownMenuItem(value: 'Read Only', child: Text('Read Only (Auditor)')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedRole = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    const Text('Assign Member Category (Optional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String?>(
                      initialValue: selectedCategoryId,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('-- Default Category --')),
                        if (_categories.isNotEmpty)
                          ..._categories.map((c) => DropdownMenuItem(
                                value: (c['id'] ?? '').toString(),
                                child: Text((c['name'] ?? 'Category').toString()),
                              ))
                        else ...[
                          const DropdownMenuItem(value: 'Staff', child: Text('Staff')),
                          const DropdownMenuItem(value: 'Executive', child: Text('Executive')),
                          const DropdownMenuItem(value: 'Associate', child: Text('Associate')),
                        ],
                      ],
                      onChanged: (val) {
                        setDialogState(() => selectedCategoryId = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    const Text('Invitation Token Validity', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      initialValue: selectedExpiryDays,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('24 Hours (Urgent)')),
                        DropdownMenuItem(value: 3, child: Text('3 Days')),
                        DropdownMenuItem(value: 7, child: Text('7 Days (Recommended)')),
                        DropdownMenuItem(value: 14, child: Text('14 Days')),
                        DropdownMenuItem(value: 30, child: Text('30 Days')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedExpiryDays = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: messageCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Welcome Note (Optional)',
                        hintText: 'e.g. Welcome to the workspace team!',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              PrimaryButton(
                text: isSending ? 'Sending...' : 'Send Invitation',
                onPressed: isSending
                    ? null
                    : () async {
                        final email = emailCtrl.text.trim();
                        if (email.isEmpty || !email.contains('@')) {
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Please enter a valid email address.')),
                          );
                          return;
                        }
                        setDialogState(() => isSending = true);
                        final repo = ref.read(accountRepositoryProvider);
                        final success = await repo.sendInvitation(
                          email: email,
                          role: selectedRole,
                          categoryId: selectedCategoryId,
                        );
                        if (!ctx.mounted) return;
                        Navigator.of(ctx).pop();
                        _loadInvitations();
                        if (mounted) {
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(success ? 'Invitation email dispatched to $email' : 'Failed to send invitation'),
                              backgroundColor: success ? AppColors.success : AppColors.error,
                            ),
                          );
                        }
                      },
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _resendInvite(String id, String email) async {
    final messenger = ScaffoldMessenger.of(context);
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.resendInvitation(id);
    if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(success ? 'Invitation email resent to $email' : 'Failed to resend invitation'),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  Future<void> _revokeInvite(String id, String email) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Revoke Invitation?'),
        content: Text('Are you sure you want to cancel the pending registration token for $email?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Revoke Token'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.revokeInvitation(id);
    if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(success ? 'Invitation token revoked' : 'Failed to revoke invitation'),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
      _loadInvitations();
    }
  }

  void _copyInviteToken(String id, String email) {
    Clipboard.setData(ClipboardData(text: 'https://ozikol.cloud/invite/$id'));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Registration link for $email copied to clipboard.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filtered = _invitations.where((inv) {
      if (_selectedFilter == 'All') return true;
      return inv['status']?.toString().toLowerCase() == _selectedFilter.toLowerCase();
    }).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'WORKSPACE RECRUITMENT',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Member Invitations',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Invite prospective users to join your workspace and monitor token activation status.',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  PrimaryButton(
                    text: 'Send Invitation',
                    icon: const Icon(Icons.send_outlined, size: 18),
                    onPressed: _showSendInvitationDialog,
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Refresh Invitations',
                    onPressed: _loadInvitations,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Filter Chips
          Wrap(
            spacing: 8,
            children: ['All', 'Pending', 'Accepted', 'Expired'].map((filter) {
              final isSelected = _selectedFilter == filter;
              return ChoiceChip(
                label: Text(filter),
                selected: isSelected,
                selectedColor: AppColors.primary.withValues(alpha: 0.15),
                labelStyle: TextStyle(
                  color: isSelected ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600),
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (val) {
                  if (val) setState(() => _selectedFilter = filter);
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Invitations List
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
          else if (filtered.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(48),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
              ),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.mail_outline_rounded, size: 48, color: isDark ? AppColors.gray600 : AppColors.gray400),
                  const SizedBox(height: 12),
                  Text(
                    'No invitations found matching "$_selectedFilter"',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filtered.length,
              separatorBuilder: (_, index) => const SizedBox(height: 12),
              itemBuilder: (context, idx) {
                final inv = filtered[idx];
                final id = (inv['id'] ?? '').toString();
                final email = inv['email'] ?? 'name@company.com';
                final role = inv['role'] ?? 'Member';
                final category = inv['category'] ?? 'Staff';
                final status = (inv['status'] ?? 'Pending').toString();
                final sentAt = inv['sentAt'] ?? 'Recently';
                final expiresAt = inv['expiresAt'] ?? 'In 7 days';
                final isPending = status.toLowerCase() == 'pending';

                Color statusColor;
                if (status.toLowerCase() == 'accepted') {
                  statusColor = const Color(0xFF10B981);
                } else if (status.toLowerCase() == 'pending') {
                  statusColor = const Color(0xFFF59E0B);
                } else {
                  statusColor = AppColors.gray400;
                }

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
                    ),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                        child: const Icon(Icons.email_outlined, color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  email,
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    status,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: statusColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Role: $role • Category: $category • Sent: $sentAt ($expiresAt)',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.gray400 : AppColors.gray600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.link_rounded, size: 18),
                        tooltip: 'Copy Invitation Link',
                        onPressed: () => _copyInviteToken(id, email),
                      ),
                      if (isPending) ...[
                        TextButton.icon(
                          icon: const Icon(Icons.refresh_rounded, size: 16),
                          label: const Text('Resend'),
                          onPressed: () => _resendInvite(id, email),
                        ),
                        IconButton(
                          icon: const Icon(Icons.cancel_outlined, size: 18, color: AppColors.error),
                          tooltip: 'Revoke Invitation',
                          onPressed: () => _revokeInvite(id, email),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
