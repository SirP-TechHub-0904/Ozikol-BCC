import '../localization/language_provider.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_colors.dart';

/// Interactive walkthrough step representation.
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

/// Standardized interactive screen walkthrough and tour guide component.
/// Fulfills repository Rule 13:
/// - Screen tour guide with step-by-step introduction.
/// - Persists completion in SharedPreferences (`has_completed_tour_{screenKey}`).
/// - Provides clean replay anytime via `(?)` action.
class AppTourDialog extends StatefulWidget {
  final String screenKey;
  final String screenTitle;
  final List<TourStep> steps;

  const AppTourDialog({
    super.key,
    required this.screenKey,
    required this.screenTitle,
    required this.steps,
  });

  /// Displays the interactive tour guide dialog.
  static Future<void> show(
    BuildContext context, {
    required String screenKey,
    required String screenTitle,
    required List<TourStep> steps,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AppTourDialog(
        screenKey: screenKey,
        screenTitle: screenTitle,
        steps: steps,
      ),
    );
  }

  /// Checks if the user has completed this screen's walkthrough.
  static Future<bool> hasCompleted(String screenKey) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('has_completed_tour_$screenKey') ?? false;
  }

  /// Marks the walkthrough as completed for the current workspace/device.
  static Future<void> markCompleted(String screenKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_completed_tour_$screenKey', true);
  }

  @override
  State<AppTourDialog> createState() => _AppTourDialogState();
}

class _AppTourDialogState extends State<AppTourDialog> {
  int _currentIndex = 0;

  bool get _isLastStep => _currentIndex == widget.steps.length - 1;

  void _nextStep() {
    if (_isLastStep) {
      _finishTour();
    } else {
      setState(() => _currentIndex++);
    }
  }

  void _prevStep() {
    if (_currentIndex > 0) {
      setState(() => _currentIndex--);
    }
  }

  Future<void> _finishTour() async {
    await AppTourDialog.markCompleted(widget.screenKey);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final step = widget.steps[_currentIndex];

    return Dialog(
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(
          color: isDark ? AppColors.outlineDark : AppColors.outlineLight,
          width: 1,
        ),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(26, 24, 26, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(isDark ? 50 : 25),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'TOUR • STEP ${_currentIndex + 1} OF ${widget.steps.length}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: _finishTour,
                    tooltip: context.trc('sh.skip_tour', fallback: 'Skip Tour'),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Step Icon & Content
              Center(
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(isDark ? 40 : 20),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    step.icon,
                    color: AppColors.primary,
                    size: 30,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                step.title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.onBackgroundDark : AppColors.onBackgroundLight,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                step.description,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 24),

              // Progress Indicator Dots
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(widget.steps.length, (index) {
                  final active = index == _currentIndex;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: active ? 20 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary : (isDark ? AppColors.outlineDark : AppColors.outlineLight),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              // Action Buttons
              Row(
                children: [
                  if (_currentIndex > 0)
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        onPressed: _prevStep,
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        child: Text(context.trc('sh.back', fallback: 'Back')),
                      ),
                    ),
                  if (_currentIndex > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _nextStep,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      child: Text(_isLastStep ? context.trc('sh.got_it_final', fallback: 'Got It') : context.trc('sh.next_step', fallback: 'Next Step')),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
