import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../models/workspace.dart';

/// Service managing synchronization between Flutter workspace state
/// and the native Windows Taskbar Jump List (Recent Organizations & Tasks).
class WindowsJumpListService {
  static const MethodChannel _channel = MethodChannel('com.ozikol.bcc/jumplist');

  /// Callback invoked when a user clicks an organization in the Windows Taskbar Jump List
  /// while the application is running.
  static void Function(String tenantKey)? onTenantSelectedFromJumpList;

  /// Callback invoked when a user clicks "New Workspace Sign In" in the Windows Jump List.
  static void Function()? onNewWorkspaceAction;

  /// Callback invoked when a user clicks "Switch Organization" in the Windows Jump List.
  static void Function()? onSwitchWorkspaceAction;

  static bool _initialized = false;

  /// Initializes the jump list message listener on Windows.
  static void initialize() {
    if (_initialized || kIsWeb || !Platform.isWindows) return;
    _initialized = true;

    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onJumpListLaunch') {
        final rawArg = call.arguments?.toString() ?? '';
        handleJumpListArgument(rawArg);
      }
    });
  }

  /// Parses a jump list command-line argument and fires the corresponding callback.
  static void handleJumpListArgument(String rawArg) {
    final trimmed = rawArg.trim();
    if (trimmed.isEmpty) return;

    if (trimmed.contains('--tenant=')) {
      final startIndex = trimmed.indexOf('--tenant=') + '--tenant='.length;
      var tenantKey = trimmed.substring(startIndex);
      // Strip any following flags or quotes
      if (tenantKey.contains(' ')) {
        tenantKey = tenantKey.split(' ').first;
      }
      tenantKey = tenantKey.replaceAll('"', '').replaceAll("'", '').trim();

      if (tenantKey.isNotEmpty) {
        onTenantSelectedFromJumpList?.call(tenantKey);
      }
    } else if (trimmed.contains('--action=new-workspace')) {
      onNewWorkspaceAction?.call();
    } else if (trimmed.contains('--action=switch-workspace')) {
      onSwitchWorkspaceAction?.call();
    }
  }

  /// Synchronizes enrolled workspace list to the native Windows Taskbar Jump List.
  static Future<bool> syncEnrolledWorkspaces(List<Workspace> workspaces) async {
    if (kIsWeb || !Platform.isWindows) return false;

    try {
      final payload = workspaces.map((w) {
        return {
          'tenantKey': w.tenantKey,
          'displayName': w.displayName.isNotEmpty ? w.displayName : w.tenantKey,
        };
      }).toList();

      final result = await _channel.invokeMethod<bool>('updateRecentWorkspaces', payload);
      return result ?? false;
    } catch (_) {
      // Gracefully ignore in non-Windows test environments
      return false;
    }
  }

  /// Clears the Windows taskbar jump list.
  static Future<bool> clearJumpList() async {
    if (kIsWeb || !Platform.isWindows) return false;

    try {
      final result = await _channel.invokeMethod<bool>('clearRecentWorkspaces');
      return result ?? false;
    } catch (_) {
      return false;
    }
  }
}
