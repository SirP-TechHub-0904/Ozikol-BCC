import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:window_manager/window_manager.dart';

import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/dashboard/presentation/dashboard_shell_screen.dart';
import 'features/workspace_auth/presentation/workspace_entry_screen.dart';
import 'features/workspace_auth/state/workspace_state.dart';
import 'core/services/client_config_service.dart';
import 'core/widgets/maintenance_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Desktop window configuration (Windows, macOS, Linux)
  if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
    try {
      await windowManager.ensureInitialized();
      const windowOptions = WindowOptions(
        size: Size(1200, 800),
        minimumSize: Size(960, 640),
        center: true,
        backgroundColor: Colors.transparent,
        skipTaskbar: false,
        title: 'Ozikol Management Information System',
      );
      await windowManager.waitUntilReadyToShow(windowOptions, () async {
        await windowManager.show();
        await windowManager.focus();
      });
    } catch (_) {
      // Gracefully continue if running in headless or non-desktop environment
    }
  }

  // Initialize secure storage service
  final storageService = await SecureStorageService.create();

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storageService),
      ],
      child: const OzikolApp(),
    ),
  );
}

class OzikolApp extends ConsumerWidget {
  const OzikolApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspaceState = ref.watch(workspaceStateProvider);
    final configAsync = ref.watch(clientConfigProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'Ozikol MIS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      home: configAsync.when(
        data: (config) {
          if (config.isMaintenanceMode) {
            return MaintenanceScreen(
              message: config.maintenanceMessage,
              onRefresh: () => ref.refresh(clientConfigProvider),
            );
          }
          if (workspaceState.isLoading) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return workspaceState.hasActiveSession
              ? const DashboardShellScreen()
              : const WorkspaceEntryScreen();
        },
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (error, stackTrace) {
          // If config fetch fails, continue safely with cached/default state
          return workspaceState.hasActiveSession
              ? const DashboardShellScreen()
              : const WorkspaceEntryScreen();
        },
      ),
    );
  }
}
