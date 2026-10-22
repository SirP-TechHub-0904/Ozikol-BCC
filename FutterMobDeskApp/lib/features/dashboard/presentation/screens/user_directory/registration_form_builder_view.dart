import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';

/// Screen presenting the Registration Form Builder under User Directory.
/// Allows administrators to configure required fields, custom questions, and onboarding rules.
class RegistrationFormBuilderView extends ConsumerWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [RegistrationFormBuilderView].
  const RegistrationFormBuilderView({super.key, this.workspace});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final fields = [
      {'label': 'Full Name', 'type': 'Text Field', 'required': true, 'system': true},
      {'label': 'Work Email', 'type': 'Email Field', 'required': true, 'system': true},
      {'label': 'Password', 'type': 'Password Field', 'required': true, 'system': true},
      {'label': 'Phone Number', 'type': 'Phone Field', 'required': false, 'system': false},
      {'label': 'Member Category', 'type': 'Dropdown Select', 'required': true, 'system': false},
      {'label': 'Designation / Role', 'type': 'Text Field', 'required': false, 'system': false},
    ];

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
                child: const Icon(Icons.dynamic_form_outlined, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Registration Form Builder',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Configure dynamic onboarding fields, question order, and validation criteria for new members.',
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

          // Fields Schema Card
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Configured Registration Fields',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const Spacer(),
                    OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Field addition modal available in full schema editor.')),
                        );
                      },
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text('Add Field'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: fields.length,
                  separatorBuilder: (_, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final f = fields[index];
                    final label = f['label'] as String;
                    final type = f['type'] as String;
                    final isReq = f['required'] as bool;
                    final isSys = f['system'] as bool;

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.drag_indicator_rounded, size: 18, color: isDark ? AppColors.gray500 : AppColors.gray400),
                          const SizedBox(width: 12),
                          Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                          const SizedBox(width: 8),
                          Text('($type)', style: TextStyle(fontSize: 12, color: isDark ? AppColors.gray400 : AppColors.gray600)),
                          const Spacer(),
                          if (isReq)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('Required', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.error)),
                            ),
                          const SizedBox(width: 8),
                          if (isSys)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.info.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('System', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.info)),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
