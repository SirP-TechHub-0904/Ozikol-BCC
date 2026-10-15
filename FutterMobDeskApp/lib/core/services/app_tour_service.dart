import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage_service.dart';

/// Single interactive step in an interactive screen tour.
class TourStep {
  /// Unique identifier for this step.
  final String id;

  /// Header title introducing the capability.
  final String title;

  /// Concise explanatory text detailing the workflow and value.
  final String description;

  /// Contextual icon representing the action.
  final IconData icon;

  /// GlobalKey attached to the target widget to spotlight.
  final GlobalKey targetKey;

  const TourStep({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.targetKey,
  });
}

/// State of an active walkthrough tour.
class TourState {
  final bool isActive;
  final List<TourStep> steps;
  final int currentStepIndex;
  final String screenKey;

  const TourState({
    this.isActive = false,
    this.steps = const [],
    this.currentStepIndex = 0,
    this.screenKey = '',
  });

  TourStep? get currentStep => (isActive && currentStepIndex < steps.length) ? steps[currentStepIndex] : null;
  bool get isFirstStep => currentStepIndex == 0;
  bool get isLastStep => currentStepIndex >= steps.length - 1;
}

/// Central tour guide engine managing interactive walkthroughs and persistence.
class AppTourService extends StateNotifier<TourState> {
  final SecureStorageService _storageService;

  AppTourService(this._storageService) : super(const TourState());

  /// Checks whether the user has already completed the tour for [screenKey].
  bool hasCompletedTour(String screenKey) {
    return _storageService.getBool('has_completed_tour_$screenKey');
  }

  /// Starts the interactive tour for [screenKey] if not completed, or if [force] is true.
  void startTour({
    required String screenKey,
    required List<TourStep> steps,
    bool force = false,
  }) {
    if (steps.isEmpty) return;
    if (!force && hasCompletedTour(screenKey)) return;

    state = TourState(
      isActive: true,
      steps: steps,
      currentStepIndex: 0,
      screenKey: screenKey,
    );
  }

  /// Advances to the next tour step or finishes if at the last step.
  void nextStep() {
    if (!state.isActive) return;
    if (state.isLastStep) {
      finishTour();
    } else {
      state = TourState(
        isActive: true,
        steps: state.steps,
        currentStepIndex: state.currentStepIndex + 1,
        screenKey: state.screenKey,
      );
    }
  }

  /// Navigates to the preceding tour step.
  void prevStep() {
    if (!state.isActive || state.isFirstStep) return;
    state = TourState(
      isActive: true,
      steps: state.steps,
      currentStepIndex: state.currentStepIndex - 1,
      screenKey: state.screenKey,
    );
  }

  /// Skips the remainder of the tour and marks it completed.
  void skipTour() {
    finishTour();
  }

  /// Completes the tour, dismisses the overlay, and persists completion state.
  void finishTour() {
    final screenKey = state.screenKey;
    state = const TourState(isActive: false);
    if (screenKey.isNotEmpty) {
      _storageService.setBool('has_completed_tour_$screenKey', true);
    }
  }
}

/// Global provider for the AppTourService
final appTourServiceProvider = StateNotifierProvider<AppTourService, TourState>((ref) {
  final storage = ref.watch(storageServiceProvider);
  return AppTourService(storage);
});
