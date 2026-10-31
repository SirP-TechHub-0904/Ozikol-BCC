import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:window_manager/window_manager.dart';

import 'core/config/single_tenant_config.dart';
import 'core/constants/api_constants.dart';
import 'core/services/app_logger.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/storage/tenant_cache_service.dart';
import 'core/network/api_client.dart';
import 'core/services/crash_reporter_service.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/dashboard/presentation/dashboard_shell_screen.dart';
import 'features/workspace_auth/presentation/workspace_entry_screen.dart';
import 'features/workspace_auth/presentation/workspace_login_screen.dart';
import 'features/workspace_auth/state/workspace_state.dart';
import 'core/services/client_config_service.dart';
import 'core/services/realtime_sync_service.dart';
import 'core/services/windows_clipboard_fix.dart';
import 'core/services/windows_jump_list_service.dart';
import 'core/localization/language_provider.dart';
import 'core/widgets/desktop_title_bar.dart';
import 'core/widgets/maintenance_screen.dart';

void main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configure modern transparent edge-to-edge system bars for Android/iOS
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
    ),
  );
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Initialize Windows 11 clipboard history paste stream interceptor & taskbar jump list
  WindowsClipboardFix.initialize();
  WindowsJumpListService.initialize();

  // Cap in-memory image cache to prevent Android lowmemorykiller (LMK) terminations
  PaintingBinding.instance.imageCache.maximumSize = 100;
  PaintingBinding.instance.imageCache.maximumSizeBytes = 30 << 20; // 30 MB

  // Desktop window configuration (Windows, macOS, Linux)
  if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
    try {
      await windowManager.ensureInitialized();
      const windowOptions = WindowOptions(
        size: Size(1200, 800),
        minimumSize: Size(960, 640),
        center: true,
        backgroundColor: Colors.white,
        skipTaskbar: false,
        titleBarStyle: TitleBarStyle.hidden,
        title: 'Business Command Center',
      );
      await windowManager.waitUntilReadyToShow(windowOptions, () async {
        await windowManager.show();
        await windowManager.focus();
      });
    } catch (_) {
      // Gracefully continue if running in headless or non-desktop environment
    }
  }

  // Dynamically resolve local Android dev host (127.0.0.1 for adb reverse on physical device, 10.0.2.2 for emulator)
  if (!kIsWeb && Platform.isAndroid) {
    await ApiConstants.resolveAndroidHost();
  }

  // Initialize secure storage service and multi-tenant cache
  final storageService = await SecureStorageService.create();
  await SingleTenantConfig.initialize(storageService);
  final cacheService = await TenantCacheService.create(storageService);
  final apiClient = ApiClient(storageService);
  final crashReporter = CrashReporterService(apiClient, storageService, cacheService);

  // Inspect command-line arguments for jump list tenant activation
  String? startupTenant;
  for (final arg in args) {
    if (arg.startsWith('--tenant=')) {
      startupTenant = arg.substring('--tenant='.length).trim();
      if (startupTenant.contains(' ')) {
        startupTenant = startupTenant.split(' ').first;
      }
      startupTenant = startupTenant.replaceAll('"', '').replaceAll("'", '').trim();
    }
  }

  if (startupTenant != null && startupTenant.isNotEmpty) {
    await storageService.setActiveTenantKey(startupTenant);
    final workspaces = await storageService.getWorkspaces();
    final match = workspaces.where(
      (w) => w.tenantKey.toLowerCase() == startupTenant!.toLowerCase(),
    ).firstOrNull;
    if (match != null) {
      await storageService.saveRememberedWorkspace(match);
      await storageService.setRememberedOrganizationCode(match.tenantKey);
    }
  }

  // Initialize startup stability monitor
  await crashReporter.initStartupCrashMonitor();

  // Print startup environment diagnostics to developer console
  if (kDebugMode) {
    final platformName = kIsWeb ? 'Web' : Platform.operatingSystem;
    final isMobile = !kIsWeb && (Platform.isAndroid || Platform.isIOS);
    debugPrint('\n======================================================');
    debugPrint('🚀 [OZIKOL BCC STARTUP] Platform: $platformName (${isMobile ? "Mobile" : "Desktop"})');
    debugPrint('🔗 API Base URL: ${apiClient.dio.options.baseUrl}');
    debugPrint('🏢 Active Tenant Key: ${storageService.getActiveTenantKey() ?? "None"}');
    debugPrint('======================================================\n');
  }

  // Wire global crash telemetry & console logging
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('\n======================================================');
    debugPrint('🚨 [FLUTTER FRAMEWORK ERROR]');
    debugPrint('Exception: ${details.exception}');
    debugPrint('Library: ${details.library ?? "unknown"}');
    debugPrint('Context: ${details.context?.toDescription() ?? "none"}');
    if (details.stack != null) {
      debugPrint('StackTrace:\n${details.stack}');
    }
    debugPrint('======================================================\n');
    AppLogger.error('FlutterError', 'Framework error: ${details.exception}', details.exception, details.stack);
    crashReporter.reportCrash(details.exception, details.stack);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('\n======================================================');
    debugPrint('🚨 [PLATFORM DISPATCHER EXCEPTION]');
    debugPrint('Error: $error');
    debugPrint('StackTrace:\n$stack');
    debugPrint('======================================================\n');
    AppLogger.error('PlatformDispatcher', 'Platform exception: $error', error, stack);
    crashReporter.reportCrash(error, stack);
    return true;
  };

  // Launch application in the root zone matching WidgetsFlutterBinding.ensureInitialized
  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storageService),
        tenantCacheServiceProvider.overrideWithValue(cacheService),
        apiClientProvider.overrideWithValue(apiClient),
        crashReporterServiceProvider.overrideWithValue(crashReporter),
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
    final crashReporter = ref.watch(crashReporterServiceProvider);
    final themeMode = ref.watch(themeModeProvider);
    final currentLang = ref.watch(languageProvider);

    // Synchronize duplex real-time push connection with active workspace session
    ref.listen<WorkspaceState>(workspaceStateProvider, (previous, next) {
      final prevTenant = previous?.activeWorkspace?.tenantKey;
      final nextTenant = next.activeWorkspace?.tenantKey;
      if (nextTenant != null && nextTenant != prevTenant) {
        ref.read(realtimeSyncServiceProvider).connect(explicitTenantKey: nextTenant);
      } else if (nextTenant == null && prevTenant != null) {
        ref.read(realtimeSyncServiceProvider).disconnect();
      }
    });

    return MaterialApp(
      title: 'Business Command Center',
      locale: Locale(currentLang),
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      scrollBehavior: const MaterialScrollBehavior().copyWith(
        overscroll: false,
        physics: const ClampingScrollPhysics(),
        dragDevices: {
          PointerDeviceKind.touch,
          PointerDeviceKind.trackpad,
          PointerDeviceKind.stylus,
        },
      ),
      builder: (context, child) {
        final content = child ?? const SizedBox.shrink();
        final isDesktop = !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);

        final activeWs = workspaceState.hasActiveSession ? workspaceState.activeWorkspace : null;

        Widget body = isDesktop
            ? Column(
                children: [
                  DesktopTitleBar(
                    title: activeWs != null ? '${activeWs.displayName} - Command Center' : 'Business Command Center',
                    iconUrl: activeWs?.iconUrl,
                    logoUrl: activeWs?.logoUrl,
                  ),
                  Expanded(child: content),
                ],
              )
            : content;

        if (crashReporter.isSafeMode) {
          body = Column(
            children: [
              Material(
                color: AppColors.error,
                child: SafeArea(
                  bottom: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.shield_outlined, color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Safe Mode active: Repeated crashes detected. Cache isolated.',
                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                        TextButton(
                          onPressed: () async {
                            await crashReporter.recoverFromCrashLoop();
                            ref.invalidate(workspaceStateProvider);
                          },
                          child: const Text('Reset Cache', style: TextStyle(color: Colors.white, decoration: TextDecoration.underline)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(child: body),
            ],
          );
        }
        return body;
      },
      home: configAsync.when(
        data: (config) {
          if (config.isMaintenanceMode) {
            return MaintenanceScreen(
              message: config.maintenanceMessage,
              onRefresh: () => ref.refresh(clientConfigProvider),
            );
          }
          if (workspaceState.isInitializing) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          if (workspaceState.hasActiveSession) {
            return const DashboardShellScreen();
          }
          if (SingleTenantConfig.isLocked) {
            return WorkspaceLoginScreen(
              workspace: workspaceState.pendingWorkspace ?? SingleTenantConfig.buildLockedWorkspace(),
            );
          }
          if (workspaceState.shouldBypassEntryScreen && workspaceState.pendingWorkspace != null) {
            return WorkspaceLoginScreen(workspace: workspaceState.pendingWorkspace!);
          }
          return const WorkspaceEntryScreen();
        },
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (error, stackTrace) {
          // If config fetch fails, continue safely with cached/default state
          if (workspaceState.hasActiveSession) {
            return const DashboardShellScreen();
          }
          if (SingleTenantConfig.isLocked) {
            return WorkspaceLoginScreen(
              workspace: workspaceState.pendingWorkspace ?? SingleTenantConfig.buildLockedWorkspace(),
            );
          }
          if (workspaceState.shouldBypassEntryScreen && workspaceState.pendingWorkspace != null) {
            return WorkspaceLoginScreen(workspace: workspaceState.pendingWorkspace!);
          }
          return const WorkspaceEntryScreen();
        },
      ),
    );
  }
}
