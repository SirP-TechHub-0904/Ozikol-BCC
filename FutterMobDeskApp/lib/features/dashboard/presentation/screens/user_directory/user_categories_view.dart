import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/models/workspace.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/widgets/primary_button.dart';
import '../../../data/account_repository.dart';

/// Screen presenting the Category management under User Directory.
class UserCategoriesView extends ConsumerStatefulWidget {
  /// The active workspace context.
  final Workspace? workspace;

  /// Creates a [UserCategoriesView].
  const UserCategoriesView({super.key, this.workspace});

  @override
  ConsumerState<UserCategoriesView> createState() => _UserCategoriesViewState();
}

class _UserCategoriesViewState extends ConsumerState<UserCategoriesView> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _categories = [];

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoading = true);
    final repo = ref.read(accountRepositoryProvider);
    final list = await repo.getCategories();
    setState(() {
      _categories = list.isNotEmpty
          ? list
          : [
              {'name': 'Executive', 'description': 'Senior leadership & officers', 'count': 4},
              {'name': 'Staff', 'description': 'Full-time operational team', 'count': 18},
              {'name': 'Associate', 'description': 'Contractors and external contributors', 'count': 7},
            ];
      _isLoading = false;
    });
  }

  void _showAddCategoryDialog() {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Member Category'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Category Name', hintText: 'e.g. Contractors'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descCtrl,
              decoration: const InputDecoration(labelText: 'Description', hintText: 'e.g. External partners'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          SizedBox(
            width: 100,
            child: PrimaryButton(
              text: 'Create',
              height: 38,
              onPressed: () async {
                if (nameCtrl.text.trim().isNotEmpty) {
                  final repo = ref.read(accountRepositoryProvider);
                  await repo.createCategory(nameCtrl.text, descCtrl.text);
                  if (ctx.mounted) Navigator.of(ctx).pop();
                  _loadCategories();
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                child: const Icon(Icons.category_outlined, size: 26, color: AppColors.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Member Categories',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Organize members into functional cohorts, classifications, and custom groups.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.gray400 : AppColors.gray600,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 140,
                child: PrimaryButton(
                  text: 'Add Category',
                  height: 42,
                  icon: const Icon(Icons.add_rounded, size: 18),
                  onPressed: _showAddCategoryDialog,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Categories Grid
          if (_isLoading) ...[
            const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 40), child: CircularProgressIndicator())),
          ] else ...[
            GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: MediaQuery.of(context).size.width >= 900 ? 3 : 1,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 2.2,
              ),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final name = (cat['name'] ?? 'Category').toString();
                final desc = (cat['description'] ?? 'Workspace cohort').toString();
                final count = cat['count'] ?? cat['memberCount'] ?? 0;

                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isDark ? AppColors.outlineDark : AppColors.outlineLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        children: [
                          Text(
                            name,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              '$count members',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        desc,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12.5, color: isDark ? AppColors.gray400 : AppColors.gray600),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}
