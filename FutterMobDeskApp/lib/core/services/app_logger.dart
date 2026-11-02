import 'dart:collection';
import 'package:flutter/foundation.dart';

/// Severity level for structured application logs.
enum LogLevel {
  debug,
  info,
  warning,
  error,
}

/// Structured log record containing timestamp, severity level, tag, and sanitized payload.
class LogEntry {
  final DateTime timestamp;
  final LogLevel level;
  final String tag;
  final String message;
  final String? error;
  final String? stackTrace;

  const LogEntry({
    required this.timestamp,
    required this.level,
    required this.tag,
    required this.message,
    this.error,
    this.stackTrace,
  });

  @override
  String toString() {
    final timeStr = timestamp.toIso8601String().substring(11, 23);
    final levelStr = level.name.toUpperCase().padRight(7);
    final errStr = error != null ? ' | Error: $error' : '';
    return '[$timeStr] [$levelStr] [$tag] $message$errStr';
  }
}

/// Central application logger providing structured diagnostic logging,
/// automatic PII scrubbing, circular memory buffering, and crash telemetry breadcrumbs.
class AppLogger {
  AppLogger._();

  static const int _maxBufferSize = 150;
  static final Queue<LogEntry> _logBuffer = Queue<LogEntry>();

  /// Logs a debug diagnostic message.
  static void debug(String tag, String message) {
    _log(LogLevel.debug, tag, message);
  }

  /// Logs an informational event (e.g., workspace switch, route navigation, sync complete).
  static void info(String tag, String message) {
    _log(LogLevel.info, tag, message);
  }

  /// Logs a non-critical warning (e.g., cache miss, fallback used, network retry).
  static void warning(String tag, String message, [dynamic error]) {
    _log(LogLevel.warning, tag, message, error: error?.toString());
  }

  /// Logs an error or exception.
  static void error(String tag, String message, [dynamic error, StackTrace? stackTrace]) {
    _log(
      LogLevel.error,
      tag,
      message,
      error: error?.toString(),
      stackTrace: stackTrace?.toString(),
    );
  }

  /// Internal handler that sanitizes, buffers, and emits logs.
  static void _log(
    LogLevel level,
    String tag,
    String message, {
    String? error,
    String? stackTrace,
  }) {
    final sanitizedMessage = _scrubSensitive(message);
    final sanitizedError = error != null ? _scrubSensitive(error) : null;
    final sanitizedStack = stackTrace != null ? _scrubSensitive(stackTrace) : null;

    final entry = LogEntry(
      timestamp: DateTime.now(),
      level: level,
      tag: tag,
      message: sanitizedMessage,
      error: sanitizedError,
      stackTrace: sanitizedStack,
    );

    // Maintain circular in-memory buffer for breadcrumbs and diagnostics
    if (_logBuffer.length >= _maxBufferSize) {
      _logBuffer.removeFirst();
    }
    _logBuffer.addLast(entry);

    // Print to developer console in debug mode
    if (kDebugMode) {
      debugPrint(entry.toString());
      if (entry.stackTrace != null) {
        debugPrint(entry.stackTrace);
      }
    }
  }

  /// Retrieves the buffered log entries as a list.
  static List<LogEntry> getRecentLogs() {
    return _logBuffer.toList();
  }

  /// Formats the recent log buffer into a single string for crash telemetry breadcrumbs.
  static String getRecentLogsAsText({int limit = 50}) {
    final logs = _logBuffer.toList();
    final start = logs.length > limit ? logs.length - limit : 0;
    return logs.sublist(start).map((e) => e.toString()).join('\n');
  }

  /// Clears the in-memory log buffer.
  static void clearBuffer() {
    _logBuffer.clear();
  }

  /// Scrubs sensitive PII, JWT bearer tokens, passwords, and API keys.
  static String _scrubSensitive(String input) {
    var sanitized = input;
    // Scrub Bearer JWT tokens
    sanitized = sanitized.replaceAll(
      RegExp(r'Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*'),
      'Bearer [REDACTED_JWT]',
    );
    // Scrub passwords
    sanitized = sanitized.replaceAll(
      RegExp(r'"password"\s*:\s*"[^"]*"', caseSensitive: false),
      '"password":"[REDACTED]"',
    );
    // Scrub Google/Gemini API keys
    sanitized = sanitized.replaceAll(
      RegExp(r'AIzaSy[A-Za-z0-9\-_]{33}'),
      '[REDACTED_GEMINI_KEY]',
    );
    return sanitized;
  }
}
