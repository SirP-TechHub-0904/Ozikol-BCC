import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/models/workspace.dart';
import '../../models/committee_models.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// Browse & Join Directory view (`/committees/workspace/discover`).
/// Provides:
/// - Search bar for names, codes, categories
/// - Filter chips: All Open, Parent Groups, Sub-Units
/// - Real-time capacity checks
/// - 1-Click Join and Extra-Info Form bottom sheet intake
class CommitteesDiscoverView extends ConsumerStatefulWidget {
  final Workspace? workspace;
  final ValueChanged<String>? onOpenCommitteeDetail;
  final VoidCallback? onNavigateToHub;

  const CommitteesDiscoverView({
    super.key,
    this.workspace,
    this.onOpenCommitteeDetail,
    this.onNavigateToHub,
  });

  @override
  ConsumerState<CommitteesDiscoverView> createState() => _CommitteesDiscoverViewState();
}

class _CommitteesDiscoverViewState extends ConsumerState<CommitteesDiscoverView> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _selectedFilter = 'all'; // 'all', 'parents', 'subunits'
  String? _joiningCommitteeId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(committeesProvider.notifier).loadDiscover();
      _checkTourGuide();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _checkTourGuide({bool force = false}) {
    final aliases = ref.read(committeesProvider).aliases;
    CommitteeTourGuideSheet.checkAndShow(
      context,
      screenKey: 'committees_discover',
      screenTitle: 'Browse & Join ${aliases.aliasPlural}',
      steps: [
        TourStep(
          title: 'Open Directory',
          description: 'Search and find active ${aliases.aliasPlural.toLowerCase()} across your workspace.',
          icon: Icons.search_rounded,
        ),
        TourStep(
          title: 'Capacity & Eligibility',
          description: 'Check available seating quotas and requirements before joining.',
          icon: Icons.people_outline,
        ),
        TourStep(
          title: '1-Click Enrollment',
          description: 'Join open groups instantly or complete extra-info intake questions required by group leaders.',
          icon: Icons.how_to_reg_outlined,
        ),
      ],
      force: force,
    );
  }

  Future<void> _handleJoin(Committee committee) async {
    setState(() => _joiningCommitteeId = committee.id);
    try {
      final success = await ref.read(committeesProvider.notifier).joinFromWorkspace(committee.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('You have successfully joined ${committee.name}!'),
              backgroundColor: const Color(0xFF059669),
              action: SnackBarAction(
                label: 'Open Hub',
                textColor: Colors.white,
                onPressed: () => widget.onOpenCommitteeDetail?.call(committee.id),
              ),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to join. Group may be full or require approval.')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _joiningCommitteeId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(committeesProvider);
    final aliases = state.aliases;

    final query = _searchCtrl.text.trim().toLowerCase();
    final filtered = state.discoverCommittees.where((c) {
      if (_selectedFilter == 'parents' && c.isSubUnit) return false;
      if (_selectedFilter == 'subunits' && !c.isSubUnit) return false;
      if (query.isNotEmpty) {
        final nameMatch = c.name.toLowerCase().contains(query);
        final codeMatch = c.code?.toLowerCase().contains(query) ?? false;
        final catMatch = c.category?.toLowerCase().contains(query) ?? false;
        return nameMatch || codeMatch || catMatch;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Row(
          children: [
            Text('Browse & Join ${aliases.aliasPlural}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(width: 8),
            CommitteeInfoIcon(
              title: 'Discover ${aliases.aliasPlural}',
              purpose: 'Allows workspace members to find and join open operational groups and sub-units.',
              inputs: 'Filter by categories or enter keywords into the search box.',
              impact: 'Joining enrolls you immediately and gives you access to the group roster, reports, and cloud files.',
              bestPractices: 'Ensure you meet meeting schedule requirements before enrolling.',
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded, color: Color(0xFF0050E5)),
            tooltip: 'Replay Tour Guide',
            onPressed: () => _checkTourGuide(force: true),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => ref.read(committeesProvider.notifier).loadDiscover(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Filter & Search Controls
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              children: [
                TextField(
                  controller: _searchCtrl,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search by name, code, or category tag...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () => setState(() => _searchCtrl.clear()))
                        : null,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildFilterChip('All Open', 'all'),
                    const SizedBox(width: 8),
                    _buildFilterChip(aliases.aliasPlural, 'parents'),
                    const SizedBox(width: 8),
                    _buildFilterChip(aliases.subGroupAliasPlural, 'subunits'),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Discover Grid / Feed
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Text(
                          'No ${aliases.aliasPlural.toLowerCase()} match your search query.',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: () => ref.read(committeesProvider.notifier).loadDiscover(),
                        child: LayoutBuilder(
                          builder: (ctx, constraints) {
                            final crossAxisCount = constraints.maxWidth >= 1100
                                ? 3
                                : constraints.maxWidth >= 700
                                    ? 2
                                    : 1;
                            return GridView.builder(
                              padding: const EdgeInsets.all(16),
                              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: crossAxisCount,
                                crossAxisSpacing: 16,
                                mainAxisSpacing: 16,
                                mainAxisExtent: 220,
                              ),
                              itemCount: filtered.length,
                              itemBuilder: (_, i) => _buildDiscoverCard(filtered[i], aliases, state),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      selectedColor: const Color(0xFF0050E5),
      labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87),
      backgroundColor: Colors.grey.shade100,
      onSelected: (_) => setState(() => _selectedFilter = value),
    );
  }

  Widget _buildDiscoverCard(Committee c, CommitteeAliases aliases, CommitteesState state) {
    final isEnrolled = state.myCommittees.any((m) => m.id == c.id);
    final isFull = c.isFull;
    final isJoining = _joiningCommitteeId == c.id;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF0050E5).withAlpha(15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  c.isSubUnit ? aliases.subGroupAliasSingular : aliases.aliasSingular,
                  style: const TextStyle(color: Color(0xFF0050E5), fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
              if (isEnrolled)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withAlpha(20),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('Enrolled', style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold)),
                )
              else if (isFull)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.red.withAlpha(20),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('Full', style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            c.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(
            c.description ?? 'Collaborate with fellow workspace members.',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const Spacer(),
          Row(
            children: [
              const Icon(Icons.people_outline, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text(
                '${c.memberCount}${c.maxMembers > 0 ? " / ${c.maxMembers}" : ""} Enrolled',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (isEnrolled)
            OutlinedButton.icon(
              onPressed: () => widget.onOpenCommitteeDetail?.call(c.id),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(36),
                side: const BorderSide(color: Color(0xFF059669)),
                foregroundColor: const Color(0xFF059669),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.check_circle_outline, size: 16),
              label: const Text('Enrolled — Open Hub', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            )
          else if (isFull)
            ElevatedButton(
              onPressed: null,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(36),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Capacity Reached', style: TextStyle(fontSize: 12)),
            )
          else
            ElevatedButton.icon(
              onPressed: isJoining ? null : () => _handleJoin(c),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0050E5),
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(36),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: isJoining
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.add_circle_outline, size: 16),
              label: Text(isJoining ? 'Joining...' : 'Join ${aliases.aliasSingular}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }
}

