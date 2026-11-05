import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/models/workspace.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../models/committee_models.dart';
import '../../services/committees_api_service.dart';
import '../../state/committees_state.dart';
import '../widgets/committee_info_icon.dart';
import '../widgets/committee_tour_guide_sheet.dart';

/// <summary>
/// Personal Member Connected Cloud Documents Vault View (`/committees/workspace/cloud-links`).
/// Delivers 1-to-1 operational and visual parity with the Angular Web Cloud Vault component.
/// Allows members to pin and access Google Docs, Google Sheets, NotebookLM, Slides, and Excel Online workbooks.
/// </summary>
class CommitteesCloudVaultView extends ConsumerStatefulWidget {
  /// Active workspace session.
  final Workspace? workspace;

  /// Optional back navigation callback.
  final VoidCallback? onNavigateBack;

  /// Creates a [CommitteesCloudVaultView].
  const CommitteesCloudVaultView({
    super.key,
    this.workspace,
    this.onNavigateBack,
  });

  @override
  ConsumerState<CommitteesCloudVaultView> createState() => _CommitteesCloudVaultViewState();
}

class _CommitteesCloudVaultViewState extends ConsumerState<CommitteesCloudVaultView> {
  final TextEditingController _titleCtrl = TextEditingController();
  final TextEditingController _urlCtrl = TextEditingController();
  String? _selectedCommitteeId;
  bool _isLoading = true;
  bool _isSaving = false;
  List<PinnedCloudResource> _documents = [];

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadDocuments() async {
    setState(() => _isLoading = true);
    try {
      final docs = await ref.read(committeesApiServiceProvider).getMyCloudDocuments();
      if (mounted) {
        setState(() {
          _documents = docs;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleLinkDocument() async {
    final title = _titleCtrl.text.trim();
    final url = _urlCtrl.text.trim();

    if (title.isEmpty || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter both document title and cloud URL.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final parsedUri = Uri.tryParse(url);
    if (parsedUri == null || (!parsedUri.isScheme('http') && !parsedUri.isScheme('https'))) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid HTTP or HTTPS document URL.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final payload = {
        'title': title,
        'documentUrl': url,
        if (_selectedCommitteeId != null && _selectedCommitteeId!.isNotEmpty)
          'committeeId': _selectedCommitteeId,
      };

      await ref.read(committeesApiServiceProvider).linkCloudDocument(payload);
      _titleCtrl.clear();
      _urlCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cloud document connected successfully.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
      await _loadDocuments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to link cloud document: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _handleUnlinkDocument(PinnedCloudResource doc) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Disconnect Document'),
        content: Text('Are you sure you want to disconnect "${doc.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ref.read(committeesApiServiceProvider).unlinkCloudDocument(doc.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document disconnected.')),
        );
      }
      await _loadDocuments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to disconnect: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _openDocumentUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open document link.')),
        );
      }
    }
  }

  IconData _getProviderIcon(String provider) {
    final p = provider.toLowerCase();
    if (p.contains('sheet') || p.contains('excel')) return Icons.table_chart_rounded;
    if (p.contains('slide') || p.contains('presentation')) return Icons.slideshow_rounded;
    if (p.contains('notebook')) return Icons.menu_book_rounded;
    return Icons.description_rounded;
  }

  Color _getProviderColor(String provider) {
    final p = provider.toLowerCase();
    if (p.contains('sheet') || p.contains('excel')) return const Color(0xFF10B981);
    if (p.contains('slide')) return const Color(0xFFEA580C);
    if (p.contains('notebook')) return const Color(0xFF8B5CF6);
    return const Color(0xFF0050E5);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final aliases = ref.watch(committeesProvider).aliases;
    final enrolledCommittees = ref.watch(committeesProvider).myCommittees;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF090D16) : const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDocuments,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.onNavigateBack != null)
                      IconButton(
                        icon: const Icon(Icons.arrow_back_rounded),
                        onPressed: widget.onNavigateBack,
                        tooltip: 'Back',
                      ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'PEOPLE & COMMUNITY',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                  color: isDark ? const Color(0xFF60A5FA) : const Color(0xFF0050E5),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const CommitteeInfoIcon(
                                title: 'Connected Cloud Docs',
                                purpose: 'Pin and centralize Google Docs, Google Sheets, NotebookLM, and Excel Online workbooks for collaborative access.',
                                inputs: 'Document title and valid Google/Microsoft shareable URL.',
                                impact: 'Enables instant one-click access to meeting minutes and spreadsheets directly within your workspace.',
                                bestPractices: 'Set Google Drive sharing settings to Anyone with the link can view.',
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Connected Cloud Docs',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Connect Google Docs, Sheets, Slides, Cloud Notebooks, or Excel Online workbooks and pin them to your ${aliases.aliasPlural.toLowerCase()}.',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.help_outline_rounded),
                      tooltip: 'Tour Guide',
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          builder: (ctx) => const CommitteeTourGuideSheet(
                            screenKey: 'committees_cloud_vault',
                            screenTitle: 'Connected Cloud Docs',
                            steps: [
                              TourStep(
                                title: 'Cloud Document Hub',
                                description: 'Keep all your collaborative spreadsheets and meeting docs in one place.',
                                icon: Icons.cloud_done_rounded,
                              ),
                              TourStep(
                                title: 'Google & Microsoft Support',
                                description: 'Supports Google Docs, Sheets, Slides, NotebookLM, and Excel Online.',
                                icon: Icons.integration_instructions_rounded,
                              ),
                              TourStep(
                                title: 'Direct Launch',
                                description: 'Tap any card to open the document directly in your browser.',
                                icon: Icons.open_in_new_rounded,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Link New Document Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.add_link_rounded, color: const Color(0xFF0050E5), size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Link a Cloud Document',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      CustomTextField(
                        controller: _titleCtrl,
                        label: 'Document Title',
                        placeholder: 'e.g. Q4 Budget Sheet or Meeting Notebook',
                      ),
                      const SizedBox(height: 12),
                      CustomTextField(
                        controller: _urlCtrl,
                        label: 'Google Docs / Sheets / Slides / Excel URL',
                        placeholder: 'https://docs.google.com/...',
                      ),
                      const SizedBox(height: 12),
                      if (enrolledCommittees.isNotEmpty) ...[
                        DropdownButtonFormField<String>(
                          initialValue: _selectedCommitteeId,
                          decoration: InputDecoration(
                            labelText: 'Pin to ${aliases.aliasSingular} (Optional)',
                            filled: true,
                            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text('Personal Vault Only'),
                            ),
                            ...enrolledCommittees.map(
                              (c) => DropdownMenuItem(
                                value: c.id,
                                child: Text(c.name),
                              ),
                            ),
                          ],
                          onChanged: (val) => setState(() => _selectedCommitteeId = val),
                        ),
                        const SizedBox(height: 14),
                      ],
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF0050E5),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: _isSaving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.add_rounded, size: 18),
                          label: Text(_isSaving ? 'Connecting...' : 'Link Document'),
                          onPressed: _isSaving ? null : _handleLinkDocument,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Documents Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Connected Documents (${_documents.length})',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                    ),
                    if (_isLoading)
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),

                const SizedBox(height: 12),

                // Documents List / Empty State
                if (!_isLoading && _documents.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.cloud_done_outlined,
                          size: 48,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'No Cloud Documents Connected Yet',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Paste a Google Docs, Sheets, Slides, or Excel Online share link above.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ..._documents.map(
                    (doc) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: _getProviderColor(doc.provider).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              _getProviderIcon(doc.provider),
                              color: _getProviderColor(doc.provider),
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _getProviderColor(doc.provider).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    doc.provider.replaceAll('_', ' ').toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: _getProviderColor(doc.provider),
                                      letterSpacing: 0.4,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  doc.title,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  doc.url,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.open_in_new_rounded, size: 18),
                            tooltip: 'Open in browser',
                            onPressed: () => _openDocumentUrl(doc.url),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 18),
                            tooltip: 'Copy link',
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: doc.url));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Document link copied to clipboard.')),
                              );
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.error),
                            tooltip: 'Disconnect',
                            onPressed: () => _handleUnlinkDocument(doc),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
