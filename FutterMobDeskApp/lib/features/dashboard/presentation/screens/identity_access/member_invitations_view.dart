import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Screen presenting Member Invitations under Identity & Access Control.
/// Allows workspace administrators to invite prospective users, assign roles/categories,
/// and manage lifecycle actions (resend, revoke, inspect status).
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
      'role': 'Administrator',
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
      'role': 'Member',
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
    final list = await repo.getInvitations();

    if (mounted) {
      setState(() {
        _invitations = list.isNotEmpty ? list : _defaultInvitationsFallback;
        _isLoading = false;
      });
    }
  }

  void _showSendInvitationDialog() {
    final emailCtrl = TextEditingController();
    String selectedRole = 'Member';
    String selectedCategory = 'Staff';
    bool isSending = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Text('Send Workspace Invitation'),
            content: SizedBox(
              width: 440,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CustomTextField(
                    label: 'Recipient Email',
                    placeholder: 'name@company.com',
                    prefixIcon: const Icon(Icons.mail_outline),
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 16),
                  const Text('Assign Role', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: selectedRole,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'Member', child: Text('Member / Viewer')),
                      DropdownMenuItem(value: 'Staff', child: Text('Staff / Manager')),
                      DropdownMenuItem(value: 'Administrator', child: Text('Administrator')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedRole = val);
                    },
                  ),
                  const SizedBox(height: 16),
                  const Text('Assign Category', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: selectedCategory,
                    decoration: const InputDecoration(border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'Executive', child: Text('Executive')),
                      DropdownMenuItem(value: 'Staff', child: Text('Staff')),
                      DropdownMenuItem(value: 'Associate', child: Text('Associate')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => selectedCategory = val);
                    },
                  ),
                ],
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
                        if (emailCtrl.text.trim().isEmpty) return;
                        setDialogState(() => isSending = true);
                        final repo = ref.read(accountRepositoryProvider);
                        final success = await repo.sendInvitation(
                          email: emailCtrl.text.trim(),
                          role: selectedRole,
                          categoryId: selectedCategory,
                        );
                        if (!ctx.mounted) return;
                        Navigator.of(ctx).pop();
                        _loadInvitations();
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(success ? 'Invitation sent' : 'Failed to send invitation'),
                            backgroundColor: success ? AppColors.success : AppColors.error,
                          ),
                        );
                      },
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _resendInvite(String id) async {
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.resendInvitation(id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Invitation email resent' : 'Failed to resend invitation'),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  Future<void> _revokeInvite(String id) async {
    final repo = ref.read(accountRepositoryProvider);
    final success = await repo.revokeInvitation(id);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Invitation revoked' : 'Failed to revoke invitation'),
          backgroundColor: success ? AppColors.success : AppColors.error,
        ),
      );
      _loadInvitations();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filtered = _invitations.where((inv) {
      if (_selectedFilter == 'All') return true;
      return inv['status']?.toString().toLowerCase() == _selectedFilter.toLowerCase();
    }).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Member Invitations',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Invite prospective users to join your workspace and monitor activation status',
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? AppColors.gray400 : AppColors.gray600,
                    ),
                  ),
                ],
              ),
              PrimaryButton(
                text: 'Send Invitation',
                icon: const Icon(Icons.send_outlined, size: 18),
                onPressed: _showSendInvitationDialog,
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
              padding: const EdgeInsets.all(48),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.mail_outline, size: 48, color: isDark ? AppColors.gray600 : AppColors.gray400),
                  const SizedBox(height: 12),
                  Text(
                    'No invitations found matching filter',
                    style: TextStyle(
                      fontSize: 15,
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
                    borderRadius: BorderRadius.circular(12),
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
                                    fontSize: 15,
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
                      if (isPending) ...[
                        TextButton.icon(
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Resend'),
                          onPressed: () => _resendInvite(inv['id'].toString()),
                        ),
                        IconButton(
                          icon: const Icon(Icons.cancel_outlined, size: 18, color: AppColors.error),
                          tooltip: 'Revoke Invitation',
                          onPressed: () => _revokeInvite(inv['id'].toString()),
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
