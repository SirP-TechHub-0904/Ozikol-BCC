import 'package:flutter/material.dart';

/// Contextual info icon `(i)` meeting Rule 13 architectural standards.
/// Displays an intuitive popover (desktop) or bottom sheet (mobile) explaining:
/// - Purpose
/// - Expected Inputs / Formats
/// - Impact
/// - Best Practices
class CommitteeInfoIcon extends StatelessWidget {
  final String title;
  final String purpose;
  final String inputs;
  final String impact;
  final String bestPractices;
  final double size;

  const CommitteeInfoIcon({
    super.key,
    required this.title,
    required this.purpose,
    required this.inputs,
    required this.impact,
    required this.bestPractices,
    this.size = 18,
  });

  void _showInfo(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 768;
    if (isDesktop) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0050E5).withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.info_outline_rounded, color: Color(0xFF0050E5), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildSection('Purpose', purpose, Icons.lightbulb_outline),
                  const SizedBox(height: 12),
                  _buildSection('Expected Inputs & Formats', inputs, Icons.input_outlined),
                  const SizedBox(height: 12),
                  _buildSection('System Impact', impact, Icons.track_changes_outlined),
                  const SizedBox(height: 12),
                  _buildSection('Best Practices', bestPractices, Icons.verified_outlined),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Got it', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          builder: (_, scrollCtrl) => Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: ListView(
              controller: scrollCtrl,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0050E5).withAlpha(25),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.info_outline_rounded, color: Color(0xFF0050E5), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                _buildSection('Purpose', purpose, Icons.lightbulb_outline),
                const SizedBox(height: 12),
                _buildSection('Expected Inputs & Formats', inputs, Icons.input_outlined),
                const SizedBox(height: 12),
                _buildSection('System Impact', impact, Icons.track_changes_outlined),
                const SizedBox(height: 12),
                _buildSection('Best Practices', bestPractices, Icons.verified_outlined),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0050E5),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(46),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Understand', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }

  Widget _buildSection(String heading, String content, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.withAlpha(15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF0050E5)),
              const SizedBox(width: 8),
              Text(
                heading,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0050E5)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            content,
            style: const TextStyle(fontSize: 13, height: 1.4, color: Colors.black87),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(Icons.info_outline_rounded, size: size, color: const Color(0xFF0050E5)),
      tooltip: 'Information & Guidelines',
      onPressed: () => _showInfo(context),
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
    );
  }
}

