import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/localization/language_provider.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/custom_text_field.dart';
import '../../../../../core/widgets/page_header.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// <summary>
/// Operational action scope for enterprise role assignment.
/// </summary>
enum ActionRoleType {
  /// Global editing authority across all tenant modules.
  globalEditor,

  /// Targeted authoring authority scoped to a designated module.
  featureEditor,

  /// Read-only inspection privileges across the workspace.
  readonly,
}

/// <summary>
/// Model representing a selectable primary authority role.
/// </summary>
class RoleDefinition {
  /// Unique name of the role.
  final String name;

  /// Organizational group tier (System or Feature).
  final String group;

  /// Descriptive role tier label.
  final String tier;

  /// Material icon representing the role.
  final IconData icon;

  /// Summary explanation of the role authority.
  final String summary;

  /// Contextual auto-assignment badge hint.
  final String hint;

  /// Default action role associated with this authority.
  final ActionRoleType defaultActionRole;

  /// Creates a [RoleDefinition].
  const RoleDefinition({
    required this.name,
    required this.group,
    required this.tier,
    required this.icon,
    required this.summary,
    required this.hint,
    required this.defaultActionRole,
  });
}

/// <summary>
/// Model representing a modular capability domain for Feature Editor scoping.
/// </summary>
class FeatureScopeItem {
  /// Unique key for the capability domain.
  final String key;

  /// Human-readable display label.
  final String label;

  /// Material icon representing the module.
  final IconData icon;

  /// Description of the capability area.
  final String description;

  /// List of permitted operational sections within the module.
  final List<String> permittedAreas;

  /// Creates a [FeatureScopeItem].
  const FeatureScopeItem({
    required this.key,
    required this.label,
    required this.icon,
    required this.description,
    required this.permittedAreas,
  });
}

/// <summary>
/// Dedicated administrative screen for issuing workspace onboarding invitations.
/// Delivers 1-to-1 visual and behavioral parity with the BCC Web Console
/// (/identity/console/invitations/create) including role hierarchy, modular capability scoping,
/// token expiration windows, live governance inspection, and direct registration link generation.
/// </summary>
class MemberInvitationCreateView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Callback to navigate back to the invitations registry.
  final VoidCallback? onNavigateBack;

  /// Callback invoked when an invitation is successfully created and the user returns to registry.
  final VoidCallback? onInvitationCreated;

  /// Creates a [MemberInvitationCreateView].
  const MemberInvitationCreateView({
    super.key,
    this.workspace,
    this.onNavigateBack,
    this.onInvitationCreated,
  });

  @override
  ConsumerState<MemberInvitationCreateView> createState() => _MemberInvitationCreateViewState();
}

class _MemberInvitationCreateViewState extends ConsumerState<MemberInvitationCreateView> {
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _customMsgCtrl = TextEditingController();

  String _selectedRole = 'Admin';
  String _activeGroupFilter = 'All';
  ActionRoleType _selectedActionRole = ActionRoleType.globalEditor;
  String _selectedFeatureArea = 'identity';
  String? _selectedCategoryId;
  int _expirationDays = 7;

  bool _isSending = false;
  bool _hasCopiedLink = false;
  Map<String, dynamic>? _dispatchedResult;
  List<Map<String, dynamic>> _categories = [];

  static const List<RoleDefinition> _allRoles = [
    RoleDefinition(
      name: 'Admin',
      group: 'System',
      tier: 'Organization Admin',
      icon: Icons.admin_panel_settings_rounded,
      summary: 'Full administrative governance and global operational authority across all tenant modules.',
      hint: 'Sets Global Edit',
      defaultActionRole: ActionRoleType.globalEditor,
    ),
    RoleDefinition(
      name: 'Member',
      group: 'System',
      tier: 'Workspace User',
      icon: Icons.person_rounded,
      summary: 'Standard workspace personnel with access to dedicated member workspace portal and profile.',
      hint: 'Member Portal Access',
      defaultActionRole: ActionRoleType.readonly,
    ),
    RoleDefinition(
      name: 'User Manager',
      group: 'Feature',
      tier: 'Identity Authority',
      icon: Icons.manage_accounts_rounded,
      summary: 'Directory user administration, onboarding approvals, and membership tier governance.',
      hint: 'Feature Edit',
      defaultActionRole: ActionRoleType.featureEditor,
    ),
    RoleDefinition(
      name: 'Identity Manager',
      group: 'Feature',
      tier: 'Security Governance',
      icon: Icons.shield_rounded,
      summary: 'Security policies, authentication methods, role assignments, and audit logging.',
      hint: 'Feature Edit',
      defaultActionRole: ActionRoleType.featureEditor,
    ),
  ];

  static const List<FeatureScopeItem> _featureScopes = [
    FeatureScopeItem(
      key: 'identity',
      label: 'Identity & Access Control',
      icon: Icons.shield_outlined,
      description: 'Security policies, multi-factor authentication enforcement, session governance, and active credentials.',
      permittedAreas: ['Roles & Matrix', 'Security Policies', 'Active Sessions', 'Audit Telemetry'],
    ),
    FeatureScopeItem(
      key: 'directory',
      label: 'Directory & Membership',
      icon: Icons.people_outline_rounded,
      description: 'User roster administration, directory categories, profile dossiers, and access tiers.',
      permittedAreas: ['All Members', 'Member Categories', 'User Settings', 'KPI Leaderboard'],
    ),
    FeatureScopeItem(
      key: 'content',
      label: 'Content & Templates',
      icon: Icons.web_rounded,
      description: 'Web page authoring, modular section hydration, dynamic header/footer menus, and template tokens.',
      permittedAreas: ['Template Editor', 'Section Blocks', 'Menu Hierarchies', 'Brand Injection'],
    ),
    FeatureScopeItem(
      key: 'comms',
      label: 'Communications & Queues',
      icon: Icons.mark_email_read_outlined,
      description: 'Unified notification pool, outbound email queue, template formatting, and anti-spam verification.',
      permittedAreas: ['Notification Pool', 'Email Queue', 'SMS Broadcasts', 'Spam Monitor'],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _customMsgCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final repo = ref.read(accountRepositoryProvider);
      final list = await repo.getCategories();
      if (mounted) {
        setState(() => _categories = list);
      }
    } catch (_) {}
  }

  void _onRoleSelected(RoleDefinition role) {
    setState(() {
      _selectedRole = role.name;
      _selectedActionRole = role.defaultActionRole;
      if (role.name == 'User Manager') {
        _selectedFeatureArea = 'directory';
      } else if (role.name == 'Identity Manager') {
        _selectedFeatureArea = 'identity';
      }
    });
  }

  String _getActionRoleString(ActionRoleType type) {
    switch (type) {
      case ActionRoleType.globalEditor:
        return 'GlobalEditor';
      case ActionRoleType.featureEditor:
        return 'FeatureEditor';
      case ActionRoleType.readonly:
        return 'Readonly';
    }
  }

  String _getActionRoleLabel(ActionRoleType type) {
    switch (type) {
      case ActionRoleType.globalEditor:
        return 'Global Editor';
      case ActionRoleType.featureEditor:
        return 'Feature Editor';
      case ActionRoleType.readonly:
        return 'Read Only';
    }
  }

  Future<void> _dispatchInvitation() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      _showFeedback('invite.create.err_email'.tr(ref, fallback: 'Please provide a valid recipient email address.'), isError: true);
      return;
    }

    setState(() => _isSending = true);

    final repo = ref.read(accountRepositoryProvider);
    final actionRoleStr = _selectedRole == 'Member' ? null : _getActionRoleString(_selectedActionRole);
    final featureAreaStr = (_selectedRole != 'Member' && _selectedActionRole == ActionRoleType.featureEditor)
        ? _selectedFeatureArea
        : null;

    final result = await repo.sendInvitation(
      email: email,
      role: _selectedRole,
      actionRole: actionRoleStr,
      featureArea: featureAreaStr,
      categoryId: _selectedCategoryId,
      expirationDays: _expirationDays,
      customMessage: _customMsgCtrl.text.trim().isEmpty ? null : _customMsgCtrl.text.trim(),
    );

    if (!mounted) return;

    setState(() => _isSending = false);

    if (result['success'] == true) {
      setState(() {
        _dispatchedResult = {
          'email': email,
          'role': _selectedRole,
          'actionRole': actionRoleStr,
          'featureArea': featureAreaStr,
          'invitationUrl': result['invitationUrl'] ??
              'https://ozikol.cloud/auth/register?token=${result['token'] ?? 'pending'}&email=${Uri.encodeComponent(email)}',
          'expiresDays': _expirationDays,
        };
      });
      _showFeedback('invite.create.success_msg'.tr(ref, fallback: 'Onboarding invitation issued successfully.'));
    } else {
      _showFeedback(result['message']?.toString() ?? 'invite.create.failed_msg'.tr(ref, fallback: 'Failed to issue invitation.'), isError: true);
    }
  }

  void _copyDirectLink(String url) {
    if (url.isEmpty) return;
    Clipboard.setData(ClipboardData(text: url));
    setState(() => _hasCopiedLink = true);
    _showFeedback('invite.create.copied_msg'.tr(ref, fallback: 'Direct onboarding link copied to clipboard.'));
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _hasCopiedLink = false);
    });
  }

  void _resetForm() {
    setState(() {
      _emailCtrl.clear();
      _customMsgCtrl.clear();
      _dispatchedResult = null;
      _hasCopiedLink = false;
      _selectedRole = 'Admin';
      _selectedActionRole = ActionRoleType.globalEditor;
      _selectedFeatureArea = 'identity';
      _selectedCategoryId = null;
      _expirationDays = 7;
    });
  }

  void _showFeedback(String message, {bool isError = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: isError ? AppColors.error : AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
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
          // Header with Back Control
          PageHeader(
            icon: Icons.person_add_rounded,
            eyebrow: 'invite.create.eyebrow'.tr(ref, fallback: 'IDENTITY ONBOARDING'),
            title: 'invite.create.title'.tr(ref, fallback: 'Issue Workspace Onboarding Invitation'),
            description: 'invite.create.desc'.tr(ref, fallback:
                'Dispatch secure cryptographic tokens to pre-provision enterprise system roles and modular capability scopes for new personnel.'),
            back: widget.onNavigateBack != null
                ? PageHeaderBack.to(widget.onNavigateBack!, label: 'invite.create.back'.tr(ref, fallback: 'Back to Registry'))
                : PageHeaderBack.none,
            primaryAction: _dispatchedResult == null
                ? PageHeaderAction(
                    label: _isSending
                        ? 'invite.create.dispatching'.tr(ref, fallback: 'Dispatching...')
                        : 'invite.create.dispatch_btn'.tr(ref, fallback: 'Dispatch Invitation'),
                    compactLabel: 'invite.create.send'.tr(ref, fallback: 'Send'),
                    icon: Icons.send_rounded,
                    style: PageHeaderActionStyle.primary,
                    isLoading: _isSending,
                    onPressed: _isSending ? null : _dispatchInvitation,
                  )
                : null,
            secondaryActions: [
              PageHeaderAction(
                label: 'common.cancel'.tr(ref, fallback: 'Cancel'),
                compactLabel: 'common.cancel'.tr(ref, fallback: 'Cancel'),
                icon: Icons.close_rounded,
                onPressed: widget.onNavigateBack,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // SUCCESS DISPATCH CARD
          if (_dispatchedResult != null)
            _buildSuccessCard(isDark)
          else
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 1040;
                if (isWide) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // LEFT COLUMN: Configuration Form (60%)
                      Expanded(
                        flex: 6,
                        child: Column(
                          children: [
                            _buildRecipientCard(isDark),
                            const SizedBox(height: 20),
                            _buildRoleSelectionCard(isDark),
                            const SizedBox(height: 20),
                            _buildActionRoleCard(isDark),
                            const SizedBox(height: 24),
                            _buildSubmitBar(isDark),
                          ],
                        ),
                      ),
                      const SizedBox(width: 24),
                      // RIGHT COLUMN: Live Governance & Email Preview (40%)
                      Expanded(
                        flex: 4,
                        child: Column(
                          children: [
                            _buildGovernanceSummaryCard(isDark),
                            const SizedBox(height: 20),
                            _buildLiveEmailPreviewCard(isDark),
                          ],
                        ),
                      ),
                    ],
                  );
                } else {
                  return Column(
                    children: [
                      _buildRecipientCard(isDark),
                      const SizedBox(height: 20),
                      _buildRoleSelectionCard(isDark),
                      const SizedBox(height: 20),
                      _buildActionRoleCard(isDark),
                      const SizedBox(height: 20),
                      _buildGovernanceSummaryCard(isDark),
                      const SizedBox(height: 20),
                      _buildLiveEmailPreviewCard(isDark),
                      const SizedBox(height: 24),
                      _buildSubmitBar(isDark),
                    ],
                  );
                }
              },
            ),
        ],
      ),
    );
  }

  // =========================================================================
  // SUCCESS DISPATCH CARD
  // =========================================================================
  Widget _buildSuccessCard(bool isDark) {
    final email = _dispatchedResult!['email'] ?? '';
    final role = _dispatchedResult!['role'] ?? '';
    final url = _dispatchedResult!['invitationUrl'] ?? '';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F291E) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF86EFAC)),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 16, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.mark_email_read_rounded, color: Color(0xFF16A34A), size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'invite.create.success_title'.tr(ref, fallback: 'Invitation Dispatched Successfully'),
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: isDark ? const Color(0xFF86EFAC) : const Color(0xFF14532D),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'invite.create.success_desc'.tr(ref, fallback: 'An onboarding email has been enqueued for @email with pre-assigned role @role.')
                          .replaceAll('@email', email)
                          .replaceAll('@role', role),
                      style: TextStyle(
                        fontSize: 13.5,
                        color: isDark ? const Color(0xFFBBF7D0) : const Color(0xFF166534),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'invite.create.direct_link_label'.tr(ref, fallback: 'Direct Registration Link (Share directly with recipient):'),
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.gray300 : const Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
            ),
            child: Row(
              children: [
                const Icon(Icons.link_rounded, size: 18, color: AppColors.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: SelectableText(
                    url,
                    style: TextStyle(
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton.icon(
                  onPressed: () => _copyDirectLink(url),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: Icon(_hasCopiedLink ? Icons.check_rounded : Icons.content_copy_rounded, size: 16),
                  label: Text(_hasCopiedLink ? 'invite.create.copied_link'.tr(ref, fallback: 'Copied Link') : 'invite.create.copy_link'.tr(ref, fallback: 'Copy Direct Link'),
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: _resetForm,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                label: Text('invite.create.invite_another'.tr(ref, fallback: 'Invite Another Member'),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(width: 14),
              ElevatedButton.icon(
                onPressed: () {
                  if (widget.onInvitationCreated != null) {
                    widget.onInvitationCreated!();
                  } else if (widget.onNavigateBack != null) {
                    widget.onNavigateBack!();
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
                  foregroundColor: isDark ? Colors.white : const Color(0xFF0F172A),
                  elevation: 1,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                  ),
                ),
                icon: const Icon(Icons.format_list_bulleted_rounded, size: 18),
                label: Text('invite.create.view_registry'.tr(ref, fallback: 'View Onboarding Registry'),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // CARD 0: RECIPIENT & MEMBERSHIP DETAILS
  // =========================================================================
  Widget _buildRecipientCard(bool isDark) {
    return _buildCardWrapper(
      isDark: isDark,
      icon: Icons.alternate_email_rounded,
      iconColor: AppColors.primary,
      title: 'invite.create.recipient_title'.tr(ref, fallback: 'Recipient & Workspace Membership'),
      subtitle: 'invite.create.recipient_subtitle'.tr(ref, fallback: 'Specify recipient identity details, organization categorization, and invitation duration.'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CustomTextField(
            label: 'invite.create.email_label'.tr(ref, fallback: 'Recipient Email Address *'),
            placeholder: 'name@company.com',
            prefixIcon: const Icon(Icons.mail_outline_rounded),
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 6),
          Text(
            'invite.create.email_hint'.tr(ref, fallback: 'The invitation token and activation link will be dispatched to this mailbox.'),
            style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
          ),
          const SizedBox(height: 18),

          // Member Category Dropdown
          Text(
            'invite.create.category_label'.tr(ref, fallback: 'Target Member Category'),
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              textBaseline: TextBaseline.alphabetic,
              color: isDark ? AppColors.gray300 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String?>(
                value: _selectedCategoryId,
                isExpanded: true,
                dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
                items: [
                  DropdownMenuItem<String?>(
                    value: null,
                    child: Text('invite.create.category_standard'.tr(ref, fallback: 'Standard / General Member'), style: const TextStyle(fontSize: 13)),
                  ),
                  ..._categories.map((c) {
                    final id = c['id']?.toString();
                    final name = c['name']?.toString() ?? 'Category';
                    final code = c['code'] != null ? ' (${c['code']})' : '';
                    return DropdownMenuItem<String?>(
                      value: id,
                      child: Text('$name$code', style: const TextStyle(fontSize: 13)),
                    );
                  }),
                ],
                onChanged: (val) => setState(() => _selectedCategoryId = val),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Expiration Window
          Text(
            'invite.create.expiry_label'.tr(ref, fallback: 'Invitation Expiration Window'),
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.gray300 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              _buildExpiryPill(7, 'invite.create.expiry_7'.tr(ref, fallback: '7 Days (Recommended)'), Icons.timelapse_rounded, isDark),
              _buildExpiryPill(14, 'invite.create.expiry_14'.tr(ref, fallback: '14 Days'), Icons.calendar_today_rounded, isDark),
              _buildExpiryPill(30, 'invite.create.expiry_30'.tr(ref, fallback: '30 Days'), Icons.date_range_rounded, isDark),
              _buildExpiryPill(1, 'invite.create.expiry_1'.tr(ref, fallback: '24 Hours (Urgent)'), Icons.bolt_rounded, isDark),
            ],
          ),
          const SizedBox(height: 18),

          // Custom Welcome Note
          Text(
            'invite.create.note_label'.tr(ref, fallback: 'Welcome Note / Administrator Message (Optional)'),
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.gray300 : AppColors.gray600,
            ),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _customMsgCtrl,
            maxLines: 2,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              hintText: 'invite.create.note_placeholder'.tr(ref, fallback: 'e.g. Welcome to our enterprise workspace! Please establish your credentials to access your designated modules.'),
              hintStyle: TextStyle(color: isDark ? AppColors.gray600 : AppColors.gray400, fontSize: 13),
              filled: true,
              fillColor: isDark ? AppColors.surfaceDark : Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
            style: TextStyle(fontSize: 13, color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A)),
          ),
          const SizedBox(height: 6),
          Text(
            'invite.create.note_hint'.tr(ref, fallback: 'This personal message will be highlighted inside the onboarding invitation email.'),
            style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
          ),
        ],
      ),
    );
  }

  Widget _buildExpiryPill(int days, String label, IconData icon, bool isDark) {
    final isSelected = _expirationDays == days;
    return InkWell(
      onTap: () => setState(() => _expirationDays = days),
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.12)
              : (isDark ? AppColors.surfaceDark : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primary : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: isSelected ? AppColors.primary : (isDark ? AppColors.gray400 : AppColors.gray600)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? AppColors.primary : (isDark ? AppColors.onSurfaceDark : const Color(0xFF334155)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // CARD 1: PRIMARY AUTHORITY ROLE
  // =========================================================================
  Widget _buildRoleSelectionCard(bool isDark) {
    final filteredRoles = _allRoles.where((r) {
      if (_activeGroupFilter == 'All') return true;
      return r.group.toLowerCase() == _activeGroupFilter.toLowerCase();
    }).toList();

    return _buildCardWrapper(
      isDark: isDark,
      icon: Icons.badge_outlined,
      iconColor: const Color(0xFF8B5CF6),
      title: 'invite.create.card1_title'.tr(ref, fallback: 'Card 1: Primary Authority Role'),
      subtitle: 'invite.create.card1_subtitle'.tr(ref, fallback: 'Choose the user\'s primary identity persona. Grouped into System Governance and Modular Feature Authorities.'),
      trailing: Wrap(
        spacing: 6,
        children: ['All', 'System', 'Feature'].map((filter) {
          final isSelected = _activeGroupFilter == filter;
          final filterLabel = filter == 'All'
              ? 'common.all'.tr(ref, fallback: 'All')
              : (filter == 'System' ? 'invite.create.filter_system'.tr(ref, fallback: 'System') : 'invite.create.filter_feature'.tr(ref, fallback: 'Feature'));
          return InkWell(
            onTap: () => setState(() => _activeGroupFilter = filter),
            borderRadius: BorderRadius.circular(6),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : (isDark ? AppColors.surfaceDark : const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                filterLabel,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : (isDark ? AppColors.gray400 : const Color(0xFF475569)),
                ),
              ),
            ),
          );
        }).toList(),
      ),
      child: Column(
        children: [
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 380,
              mainAxisExtent: 170,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
            ),
            itemCount: filteredRoles.length,
            itemBuilder: (context, idx) {
              final role = filteredRoles[idx];
              final isSelected = _selectedRole == role.name;

              return InkWell(
                onTap: () => _onRoleSelected(role),
                borderRadius: BorderRadius.circular(12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (isDark ? const Color(0xFF132338) : const Color(0xFFEFF6FF))
                        : (isDark ? AppColors.surfaceDark : Colors.white),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                      width: isSelected ? 1.8 : 1,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.12), blurRadius: 10, offset: const Offset(0, 2))]
                        : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              role.icon,
                              size: 18,
                              color: isSelected ? Colors.white : AppColors.primary,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              role.tier,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.gray300 : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            role.name,
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            role.summary,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11.5,
                              height: 1.3,
                              color: isDark ? AppColors.gray400 : AppColors.gray600,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            role.hint,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          Icon(
                            isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                            size: 18,
                            color: isSelected ? AppColors.primary : (isDark ? AppColors.gray600 : const Color(0xFFCBD5E1)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // CARD 2: OPERATIONAL EDIT ACCESS LEVEL
  // =========================================================================
  Widget _buildActionRoleCard(bool isDark) {
    if (_selectedRole == 'Member') {
      return _buildCardWrapper(
        isDark: isDark,
        icon: Icons.tune_rounded,
        iconColor: const Color(0xFF10B981),
        title: 'invite.create.card2_title'.tr(ref, fallback: 'Card 2: Operational Edit Access Level'),
        subtitle: 'invite.create.card2_subtitle_member'.tr(ref, fallback: 'Standard members do not hold operational administrative edit roles.'),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF131D2E) : const Color(0xFFF0F9FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBAE6FD)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.dashboard_customize_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'invite.create.member_portal_title'.tr(ref, fallback: 'Dedicated Member Workspace Portal'),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFBAE6FD) : const Color(0xFF0369A1),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'invite.create.member_portal_desc'.tr(ref, fallback: 'A Member is a standard workspace user with their own dedicated user dashboard and workspace applications. They do not hold administrative or operational editing roles within the BCC Administration Console.'),
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: isDark ? AppColors.gray300 : const Color(0xFF0C4A6E),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _buildFeaturePill('invite.create.pill_portal'.tr(ref, fallback: 'Authenticated Member Dashboard'), isDark),
                        _buildFeaturePill('invite.create.pill_profile'.tr(ref, fallback: 'Personal Profile & 2FA'), isDark),
                        _buildFeaturePill('invite.create.pill_presence'.tr(ref, fallback: 'Member Directory Presence'), isDark),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    final actionOptions = [
      {
        'type': ActionRoleType.globalEditor,
        'title': 'Global Editor',
        'badge': 'Full Access',
        'icon': Icons.language_rounded,
        'summary': 'Tenant-wide create, edit, update, and delete authority across all active modules.',
      },
      {
        'type': ActionRoleType.featureEditor,
        'title': 'Feature Editor',
        'badge': 'Scoped Access',
        'icon': Icons.tune_rounded,
        'summary': 'Targeted authoring and edit rights restricted to a designated capability domain.',
      },
      {
        'type': ActionRoleType.readonly,
        'title': 'Read Only',
        'badge': 'Audit Only',
        'icon': Icons.visibility_rounded,
        'summary': 'Audit and inspection privileges across workspace modules with all mutation controls disabled.',
      },
    ];

    return _buildCardWrapper(
      isDark: isDark,
      icon: Icons.tune_rounded,
      iconColor: const Color(0xFF10B981),
      title: 'invite.create.card2_title'.tr(ref, fallback: 'Card 2: Operational Edit Access Level'),
      subtitle: 'invite.create.card2_subtitle'.tr(ref, fallback: 'Controls the user operational write power: tenant-wide global edit, targeted module edit, or view-only auditing.'),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          _getActionRoleLabel(_selectedActionRole),
          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.primary),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 380,
              mainAxisExtent: 160,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
            ),
            itemCount: actionOptions.length,
            itemBuilder: (context, idx) {
              final opt = actionOptions[idx];
              final type = opt['type'] as ActionRoleType;
              final isSelected = _selectedActionRole == type;

              return InkWell(
                onTap: () => setState(() => _selectedActionRole = type),
                borderRadius: BorderRadius.circular(12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (isDark ? const Color(0xFF132338) : const Color(0xFFEFF6FF))
                        : (isDark ? AppColors.surfaceDark : Colors.white),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : (isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
                      width: isSelected ? 1.8 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(opt['icon'] as IconData, size: 18, color: isSelected ? Colors.white : AppColors.primary),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              opt['badge'] as String,
                              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: isDark ? AppColors.gray300 : const Color(0xFF475569)),
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            opt['title'] as String,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            opt['summary'] as String,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 11.5, height: 1.3, color: isDark ? AppColors.gray400 : AppColors.gray600),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isSelected ? 'invite.create.active_scope'.tr(ref, fallback: 'Active Scope') : 'invite.create.select_scope'.tr(ref, fallback: 'Select Scope'),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? AppColors.primary : (isDark ? AppColors.gray500 : const Color(0xFF94A3B8)),
                            ),
                          ),
                          Icon(
                            isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                            size: 18,
                            color: isSelected ? AppColors.primary : (isDark ? AppColors.gray600 : const Color(0xFFCBD5E1)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          // Feature Editor Scope Picker
          if (_selectedActionRole == ActionRoleType.featureEditor) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF111827) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
              ),
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
                            'invite.create.domain_title'.tr(ref, fallback: 'Designated Capability Domain'),
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'invite.create.domain_desc'.tr(ref, fallback: 'This user will be granted full authoring, write, and publishing rights strictly within this selected module.'),
                            style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _selectedFeatureArea.toUpperCase(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 380,
                      mainAxisExtent: 140,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _featureScopes.length,
                    itemBuilder: (context, idx) {
                      final scope = _featureScopes[idx];
                      final isSelected = _selectedFeatureArea == scope.key;

                      return InkWell(
                        onTap: () => setState(() => _selectedFeatureArea = scope.key),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (isDark ? const Color(0xFF132338) : const Color(0xFFEFF6FF))
                                : (isDark ? AppColors.surfaceDark : Colors.white),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? AppColors.primary : (isDark ? AppColors.outlineDark : const Color(0xFFCBD5E1)),
                              width: isSelected ? 1.6 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Icon(scope.icon, size: 18, color: isSelected ? AppColors.primary : AppColors.gray500),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      scope.label,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                scope.description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.gray400 : AppColors.gray600),
                              ),
                              Wrap(
                                spacing: 4,
                                children: scope.permittedAreas.take(3).map((area) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '✓ $area',
                                      style: TextStyle(fontSize: 10, color: isDark ? AppColors.gray300 : const Color(0xFF475569)),
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFeaturePill(String text, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE0F2FE),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_rounded, size: 13, color: AppColors.primary),
          const SizedBox(width: 4),
          Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isDark ? AppColors.gray200 : const Color(0xFF0369A1))),
        ],
      ),
    );
  }

  // =========================================================================
  // RIGHT COLUMN: GOVERNANCE & ACCESS SUMMARY
  // =========================================================================
  Widget _buildGovernanceSummaryCard(bool isDark) {
    final email = _emailCtrl.text.trim();
    final actionLabel = _selectedRole == 'Member' ? 'invite.create.portal_user'.tr(ref, fallback: 'Portal User') : _getActionRoleLabel(_selectedActionRole);

    return _buildCardWrapper(
      isDark: isDark,
      icon: Icons.shield_outlined,
      iconColor: const Color(0xFF6366F1),
      title: 'invite.create.gov_title'.tr(ref, fallback: 'Governance & Access Summary'),
      subtitle: 'invite.create.gov_subtitle'.tr(ref, fallback: 'Real-time breakdown of assigned authorities upon onboarding.'),
      child: Column(
        children: [
          _buildSummaryRow(
            label: 'invite.create.gov_recipient'.tr(ref, fallback: 'Recipient Mailbox'),
            value: email.isNotEmpty ? email : 'name@company.com',
            icon: Icons.alternate_email_rounded,
            isDark: isDark,
          ),
          const Divider(height: 18),
          _buildSummaryRow(
            label: 'invite.create.gov_role'.tr(ref, fallback: 'Primary Role'),
            value: _selectedRole,
            icon: Icons.badge_outlined,
            isDark: isDark,
            badgeColor: AppColors.primary,
          ),
          const Divider(height: 18),
          _buildSummaryRow(
            label: 'invite.create.gov_access'.tr(ref, fallback: 'Operational Access'),
            value: actionLabel,
            icon: Icons.tune_rounded,
            isDark: isDark,
            badgeColor: const Color(0xFF10B981),
          ),
          if (_selectedRole != 'Member' && _selectedActionRole == ActionRoleType.featureEditor) ...[
            const Divider(height: 18),
            _buildSummaryRow(
              label: 'invite.create.gov_bound'.tr(ref, fallback: 'Bound Capability'),
              value: _selectedFeatureArea.toUpperCase(),
              icon: Icons.link_rounded,
              isDark: isDark,
            ),
          ],
          const Divider(height: 18),
          _buildSummaryRow(
            label: 'invite.create.gov_expiry'.tr(ref, fallback: 'Token Expiry'),
            value: '$_expirationDays ${'invite.create.days'.tr(ref, fallback: 'Days')}',
            icon: Icons.timelapse_rounded,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow({
    required String label,
    required String value,
    required IconData icon,
    required bool isDark,
    Color? badgeColor,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: isDark ? AppColors.gray400 : AppColors.gray600),
            const SizedBox(width: 8),
            Text(label, style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600)),
          ],
        ),
        if (badgeColor != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              value,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: badgeColor),
            ),
          )
        else
          Text(
            value,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
            ),
          ),
      ],
    );
  }

  // =========================================================================
  // RIGHT COLUMN: LIVE EMAIL PREVIEW SIMULATION
  // =========================================================================
  Widget _buildLiveEmailPreviewCard(bool isDark) {
    final email = _emailCtrl.text.trim();
    final customMsg = _customMsgCtrl.text.trim();
    final brand = widget.workspace?.displayName ?? 'Workspace';

    return _buildCardWrapper(
      isDark: isDark,
      icon: Icons.mail_rounded,
      iconColor: AppColors.primary,
      title: 'invite.create.sim_title'.tr(ref, fallback: 'Email Dispatch Simulation'),
      subtitle: 'invite.create.sim_subtitle'.tr(ref, fallback: 'Preview the invitation as it will appear in the recipient\'s inbox.'),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.circle, size: 10, color: Color(0xFFEF4444)),
                const SizedBox(width: 5),
                const Icon(Icons.circle, size: 10, color: Color(0xFFF59E0B)),
                const SizedBox(width: 5),
                const Icon(Icons.circle, size: 10, color: Color(0xFF10B981)),
                const SizedBox(width: 12),
                Text(
                  '${'invite.create.sim_subject'.tr(ref, fallback: 'Subject: You are invited to join')} $brand',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.gray400 : AppColors.gray600,
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            Text(
              '${'invite.create.sim_hello'.tr(ref, fallback: 'Hello')} ${email.isNotEmpty ? email.split('@').first : 'there'},',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'invite.create.sim_body'.tr(ref, fallback: 'You have been invited to join the @brand workspace as a @role.')
                  .replaceAll('@brand', brand)
                  .replaceAll('@role', _selectedRole),
              style: TextStyle(
                fontSize: 12.5,
                height: 1.4,
                color: isDark ? AppColors.gray300 : const Color(0xFF334155),
              ),
            ),
            if (customMsg.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.only(
                    topRight: Radius.circular(8),
                    bottomRight: Radius.circular(8),
                  ),
                  border: Border(left: BorderSide(color: AppColors.primary, width: 4)),
                ),
                child: Text(
                  '“$customMsg”',
                  style: const TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: const [
                    BoxShadow(color: Color(0x330050E5), blurRadius: 8, offset: Offset(0, 3)),
                  ],
                ),
                child: Text(
                  'invite.create.sim_accept_btn'.tr(ref, fallback: 'Accept Invitation & Register'),
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'invite.create.sim_disclaimer'.tr(ref, fallback: 'This invitation is secure and will expire in @days days. If you did not request this invitation, you can safely ignore this message.')
                  .replaceAll('@days', '$_expirationDays'),
              style: TextStyle(fontSize: 11, color: isDark ? AppColors.gray500 : const Color(0xFF94A3B8)),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // BOTTOM SUBMIT BAR
  // =========================================================================
  Widget _buildSubmitBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          OutlinedButton(
            onPressed: widget.onNavigateBack,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text('invite.create.cancel_return'.tr(ref, fallback: 'Cancel & Return'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
          PrimaryButton(
            text: _isSending ? 'invite.create.dispatching'.tr(ref, fallback: 'Dispatching...') : 'invite.create.dispatch_long_btn'.tr(ref, fallback: 'Dispatch Onboarding Invitation'),
            icon: const Icon(Icons.send_rounded, size: 16),
            isLoading: _isSending,
            onPressed: _isSending ? null : _dispatchInvitation,
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // CARD WRAPPER HELPER
  // =========================================================================
  Widget _buildCardWrapper({
    required bool isDark,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    Widget? trailing,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.outlineDark : const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x05000000), blurRadius: 10, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: isDark ? AppColors.onSurfaceDark : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}
