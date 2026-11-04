import 'package:flutter/material.dart';
import '../../models/committee_models.dart';

/// Modal dialog for pinning Cloud Documents (Google Docs, Sheets, Slides, NotebookLM, Excel Online).
class CommitteeCloudShelfDialog extends StatefulWidget {
  final String committeeId;
  final Future<void> Function(Map<String, dynamic> payload) onPin;

  const CommitteeCloudShelfDialog({
    super.key,
    required this.committeeId,
    required this.onPin,
  });

  static Future<void> show(
    BuildContext context, {
    required String committeeId,
    required Future<void> Function(Map<String, dynamic> payload) onPin,
  }) {
    return showDialog(
      context: context,
      builder: (_) => CommitteeCloudShelfDialog(
        committeeId: committeeId,
        onPin: onPin,
      ),
    );
  }

  @override
  State<CommitteeCloudShelfDialog> createState() => _CommitteeCloudShelfDialogState();
}

class _CommitteeCloudShelfDialogState extends State<CommitteeCloudShelfDialog> {
  final TextEditingController _titleCtrl = TextEditingController();
  final TextEditingController _urlCtrl = TextEditingController();
  int _activeMode = 1; // 0 = Google Sign-in / Picker, 1 = Direct URL paste
  bool _isSubmitting = false;
  String _detectedProvider = 'google_docs';

  @override
  void initState() {
    super.initState();
    _urlCtrl.addListener(_onUrlChanged);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  void _onUrlChanged() {
    final text = _urlCtrl.text.trim();
    if (text.isNotEmpty) {
      final detected = PinnedCloudResource.detectProvider(null, text);
      if (detected != _detectedProvider) {
        setState(() => _detectedProvider = detected);
      }
    }
  }

  IconData _getProviderIcon(String provider) {
    switch (provider) {
      case 'google_sheets':
        return Icons.table_chart_rounded;
      case 'google_slides':
        return Icons.slideshow_rounded;
      case 'notebook_lm':
        return Icons.auto_stories_rounded;
      case 'excel_online':
        return Icons.grid_on_rounded;
      case 'google_docs':
      default:
        return Icons.description_rounded;
    }
  }

  Color _getProviderColor(String provider) {
    switch (provider) {
      case 'google_sheets':
        return const Color(0xFF0F9D58);
      case 'google_slides':
        return const Color(0xFFF4B400);
      case 'notebook_lm':
        return const Color(0xFF8E24AA);
      case 'excel_online':
        return const Color(0xFF107C41);
      case 'google_docs':
      default:
        return const Color(0xFF4285F4);
    }
  }

  String _getProviderLabel(String provider) {
    switch (provider) {
      case 'google_sheets':
        return 'Google Sheets';
      case 'google_slides':
        return 'Google Slides';
      case 'notebook_lm':
        return 'NotebookLM';
      case 'excel_online':
        return 'Excel Online / OneDrive';
      case 'google_docs':
      default:
        return 'Google Docs';
    }
  }

  Future<void> _handleSave() async {
    final title = _titleCtrl.text.trim();
    final url = _urlCtrl.text.trim();

    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a document title.')),
      );
      return;
    }

    if (url.isEmpty || !url.startsWith('http')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid document URL (https://...).')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await widget.onPin({
        'committeeId': widget.committeeId,
        'title': title,
        'url': url,
        'provider': _detectedProvider,
      });
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Document successfully pinned to Cloud Shelf!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error pinning document: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF0050E5).withAlpha(25),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.cloud_upload_outlined, color: Color(0xFF0050E5), size: 22),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text('Pin Cloud Document & Shelf', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Dual-Mode Toggle Bar
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        setState(() => _activeMode = 0);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Google Drive Picker requires web browser origin. You can paste any direct Google Docs, Sheets, or Notebook link below!'),
                            duration: Duration(seconds: 4),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _activeMode == 0 ? const Color(0xFF0050E5).withAlpha(20) : null,
                        side: BorderSide(
                          color: _activeMode == 0 ? const Color(0xFF0050E5) : Colors.grey.shade300,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: const Icon(Icons.add_to_drive_rounded, size: 16),
                      label: const Text('Google Sign-In', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _activeMode = 1),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _activeMode == 1 ? const Color(0xFF0050E5).withAlpha(20) : null,
                        side: BorderSide(
                          color: _activeMode == 1 ? const Color(0xFF0050E5) : Colors.grey.shade300,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: const Icon(Icons.link_rounded, size: 16),
                      label: const Text('Paste Link', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Title input
              const Text('Document Title *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: _titleCtrl,
                decoration: InputDecoration(
                  hintText: 'e.g. Q4 Strategy Budget or Live Minutes',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
              const SizedBox(height: 14),

              // URL input
              const Text('Cloud Link URL *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: _urlCtrl,
                decoration: InputDecoration(
                  hintText: 'https://docs.google.com/spreadsheets/d/...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),

              // Provider Badge detection
              if (_urlCtrl.text.trim().isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _getProviderColor(_detectedProvider).withAlpha(20),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _getProviderColor(_detectedProvider).withAlpha(60)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_getProviderIcon(_detectedProvider), size: 16, color: _getProviderColor(_detectedProvider)),
                      const SizedBox(width: 8),
                      Text(
                        'Detected: ${_getProviderLabel(_detectedProvider)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _getProviderColor(_detectedProvider),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _handleSave,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0050E5),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _isSubmitting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Pin to Group Shelf', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}

