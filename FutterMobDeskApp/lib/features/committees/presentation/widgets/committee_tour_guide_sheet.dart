import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TourStep {
  final String title;
  final String description;
  final IconData icon;

  const TourStep({
    required this.title,
    required this.description,
    required this.icon,
  });
}

/// Tour Guide walkthrough sheet meeting Rule 13 interactive standards.
class CommitteeTourGuideSheet extends StatefulWidget {
  final String screenKey;
  final String screenTitle;
  final List<TourStep> steps;

  const CommitteeTourGuideSheet({
    super.key,
    required this.screenKey,
    required this.screenTitle,
    required this.steps,
  });

  static Future<void> checkAndShow(
    BuildContext context, {
    required String screenKey,
    required String screenTitle,
    required List<TourStep> steps,
    bool force = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final prefKey = 'has_completed_tour_$screenKey';
    final completed = prefs.getBool(prefKey) ?? false;

    if (!completed || force) {
      if (!context.mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (_) => CommitteeTourGuideSheet(
          screenKey: screenKey,
          screenTitle: screenTitle,
          steps: steps,
        ),
      );
      await prefs.setBool(prefKey, true);
    }
  }

  @override
  State<CommitteeTourGuideSheet> createState() => _CommitteeTourGuideSheetState();
}

class _CommitteeTourGuideSheetState extends State<CommitteeTourGuideSheet> {
  int _currentStep = 0;

  @override
  Widget build(BuildContext context) {
    final step = widget.steps[_currentStep];
    final isLast = _currentStep == widget.steps.length - 1;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.explore_outlined, color: Color(0xFF0050E5), size: 22),
                    const SizedBox(width: 8),
                    Text(
                      '${widget.screenTitle} Tour',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Text(
                  'Step ${_currentStep + 1} of ${widget.steps.length}',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                ),
              ],
            ),
            const Divider(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0050E5).withAlpha(15),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0050E5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(step.icon, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          step.title,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          step.description,
                          style: TextStyle(fontSize: 13, height: 1.4, color: Colors.grey.shade800),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentStep > 0)
                  OutlinedButton(
                    onPressed: () => setState(() => _currentStep--),
                    child: const Text('Previous'),
                  )
                else
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Skip Tour', style: TextStyle(color: Colors.grey)),
                  ),
                ElevatedButton(
                  onPressed: () {
                    if (isLast) {
                      Navigator.of(context).pop();
                    } else {
                      setState(() => _currentStep++);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0050E5),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(isLast ? 'Complete Tour' : 'Next Step', style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

