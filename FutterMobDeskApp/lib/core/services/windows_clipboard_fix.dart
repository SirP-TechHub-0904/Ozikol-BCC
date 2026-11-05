import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Fixes Windows 11 clipboard history (`Win + V`) synthetic paste failure (Flutter issue #143997).
///
/// When an item is selected from Windows Clipboard History (`Win + V`), Windows injects
/// a synthetic keystroke sequence via Win32 `SendInput` where `Ctrl` is released prematurely
/// milliseconds before `V`, and physical keys carry the synthetic scan code `0x1600000000`.
///
/// This interceptor ONLY triggers when:
/// 1. `Ctrl` is NOT physically pressed (`!HardwareKeyboard.instance.isControlPressed`),
/// 2. Key is `V`,
/// 3. Physical key is synthetic `0x1600000000`,
/// 4. `Ctrl` was released within the last 80ms by `SendInput`.
///
/// Manual user keystrokes (`Ctrl + V`) have `isControlPressed == true` and are NEVER intercepted,
/// allowing Flutter's native text editing engine to paste cleanly without duplication.
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
      // If Control is physically held down, this is a normal manual Ctrl+V.
      // NEVER intercept normal manual Ctrl+V; Flutter handles it natively!
      if (HardwareKeyboard.instance.isControlPressed) {
        return false;
      }

      final isKeyV = event.logicalKey == LogicalKeyboardKey.keyV;
      // Synthetic physical key scan code for SendInput on Windows is specifically 0x1600000000
      final isSyntheticV = event.physicalKey.usbHidUsage == 0x1600000000;
      final recentlyReleasedCtrl = _lastControlUp != null &&
          DateTime.now().difference(_lastControlUp!).inMilliseconds < 80;

      // Only fire when Windows 11 Win+V injects synthetic V after releasing Ctrl
      if (isKeyV && isSyntheticV && recentlyReleasedCtrl) {
        final primaryFocus = FocusManager.instance.primaryFocus;
        if (primaryFocus != null && primaryFocus.context != null) {
          Actions.maybeInvoke(
            primaryFocus.context!,
            const PasteTextIntent(SelectionChangedCause.keyboard),
          );
          _lastControlUp = null;
          return true; // Successfully consumed synthetic Win+V event
        }
      }
    }

    return false;
  }
}

