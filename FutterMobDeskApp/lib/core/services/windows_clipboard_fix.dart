import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Fixes Windows 11 clipboard history (`Win + V`) synthetic paste failure (Flutter issue #143997).
///
/// When an item is selected from Windows Clipboard History (`Win + V`), Windows injects
/// a synthetic keystroke sequence via Win32 `SendInput` where `Ctrl` is released prematurely
/// before `V`, and physical keys carry the unmapped synthetic scan code `0x1600000000`.
///
/// This interceptor catches the synthetic key event or unmapped paste intent on desktop
/// and programmatically triggers [PasteTextIntent] on the currently active text field.
class WindowsClipboardFix {
  static bool _initialized = false;
  static DateTime? _lastControlUp;

  /// Initializes the global keyboard interceptor for Windows clipboard history.
  static void initialize() {
    if (_initialized) return;
    if (kIsWeb || !Platform.isWindows) return;
    _initialized = true;

    HardwareKeyboard.instance.addHandler(_handleKeyEvent);
  }

  /// Handles hardware keyboard events to detect synthetic Windows 11 Win+V paste streams.
  static bool _handleKeyEvent(KeyEvent event) {
    // Windows Win+V SendInput releases Ctrl milliseconds before sending V.
    if (event is KeyUpEvent &&
        (event.logicalKey == LogicalKeyboardKey.controlLeft ||
            event.logicalKey == LogicalKeyboardKey.controlRight ||
            event.logicalKey == LogicalKeyboardKey.control)) {
      _lastControlUp = DateTime.now();
      return false;
    }

    if (event is KeyDownEvent) {
      final isKeyV = event.logicalKey == LogicalKeyboardKey.keyV;
      // Synthetic physical key scan code for SendInput on Windows is 0x1600000000 (scan code 0)
      final isSyntheticV = event.physicalKey.usbHidUsage == 0x1600000000 ||
          event.physicalKey.usbHidUsage == 0;
      final recentlyReleasedCtrl = _lastControlUp != null &&
          DateTime.now().difference(_lastControlUp!).inMilliseconds < 400;
      final isCtrlActive =
          HardwareKeyboard.instance.isControlPressed || recentlyReleasedCtrl;

      // When Windows 11 Win+V injects synthetic V (or V with synthetic scan code / recently released Ctrl)
      if (isKeyV && (isSyntheticV || isCtrlActive)) {
        final primaryFocus = FocusManager.instance.primaryFocus;
        if (primaryFocus != null && primaryFocus.context != null) {
          final result = Actions.maybeInvoke(
            primaryFocus.context!,
            const PasteTextIntent(SelectionChangedCause.keyboard),
          );
          if (result != null) {
            _lastControlUp = null;
            return true; // Successfully consumed and pasted into focused text field!
          }
        }
      }
    }

    return false;
  }
}
