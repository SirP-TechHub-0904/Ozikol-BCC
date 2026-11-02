import 'dart:io';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

/// <summary>
/// Column specification for exporting tabular data across CSV, Word, and PDF print formats.
/// </summary>
class ExportColumn {
  /// <summary>
  /// The object key or map field identifier.
  /// </summary>
  final String key;

  /// <summary>
  /// The user-facing display header title.
  /// </summary>
  final String header;

  /// <summary>
  /// Optional formatting closure transforming the raw value into a formatted string.
  /// </summary>
  final String Function(dynamic value, Map<String, dynamic> row)? format;

  /// <summary>
  /// Creates an instance of [ExportColumn].
  /// </summary>
  const ExportColumn({
    required this.key,
    required this.header,
    this.format,
  });
}

/// <summary>
/// Enterprise export service for generating CSV spreadsheets, Microsoft Word documents, and printable PDF documents.
/// Mirrors the exact feature parity of the Angular Web ExportService.
/// </summary>
class ExportService {
  /// <summary>
  /// Resolves the canonical user downloads directory or system temporary directory as fallback.
  /// </summary>
  static Directory _getDestinationDirectory() {
    try {
      if (Platform.isWindows) {
        final userProfile = Platform.environment['USERPROFILE'];
        if (userProfile != null && userProfile.isNotEmpty) {
          final downloadsDir = Directory('$userProfile\\Downloads');
          if (downloadsDir.existsSync()) {
            return downloadsDir;
          }
        }
      } else if (Platform.isMacOS || Platform.isLinux) {
        final home = Platform.environment['HOME'];
        if (home != null && home.isNotEmpty) {
          final downloadsDir = Directory('$home/Downloads');
          if (downloadsDir.existsSync()) {
            return downloadsDir;
          }
        }
      }
    } catch (_) {
      // Fall through to system temp on permission/platform exceptions
    }
    return Directory.systemTemp;
  }

  /// <summary>
  /// Exports member records to a UTF-8 BOM CSV spreadsheet file and opens it.
  /// </summary>
  /// <param name="filename">The base target filename without extension.</param>
  /// <param name="columns">The column specifications.</param>
  /// <param name="data">The list of row records.</param>
  /// <returns>The absolute path of the generated file.</returns>
  static Future<String?> exportToCsv({
    required String filename,
    required List<ExportColumn> columns,
    required List<Map<String, dynamic>> data,
  }) async {
    if (data.isEmpty) return null;

    final headers = columns.map((c) => '"${c.header.replaceAll('"', '""')}"').join(',');
    final rows = data.map((row) {
      return columns.map((c) {
        dynamic val = row[c.key];
        String formattedVal;
        if (c.format != null) {
          formattedVal = c.format!(val, row);
        } else if (val == null) {
          formattedVal = '';
        } else if (val is List) {
          formattedVal = val.join('; ');
        } else {
          formattedVal = val.toString();
        }
        return '"${formattedVal.replaceAll('"', '""')}"';
      }).join(',');
    }).toList();

    // UTF-8 BOM for automatic Excel character encoding recognition
    final csvContent = '\uFEFF${[headers, ...rows].join('\r\n')}';
    final targetDir = _getDestinationDirectory();
    final file = File('${targetDir.path}${Platform.pathSeparator}$filename.csv');
    await file.writeAsString(csvContent);

    // Launch with system default application
    try {
      await launchUrl(Uri.file(file.absolute.path));
    } catch (_) {
      // Graceful continuation if launch not supported
    }

    return file.absolute.path;
  }

  /// <summary>
  /// Exports member records as a formatted Microsoft Word (.doc) document and opens it.
  /// </summary>
  /// <param name="filename">The target filename without extension.</param>
  /// <param name="title">Document heading title.</param>
  /// <param name="organizationName">The tenant organization or workspace brand.</param>
  /// <param name="columns">The column definitions.</param>
  /// <param name="data">The list of member records.</param>
  /// <param name="filterSummary">Optional filter criteria description.</param>
  /// <returns>The absolute path of the generated file.</returns>
  static Future<String?> exportToWord({
    required String filename,
    required String title,
    required String organizationName,
    required List<ExportColumn> columns,
    required List<Map<String, dynamic>> data,
    String? filterSummary,
  }) async {
    final tableHeaderHtml = columns
        .map((c) =>
            '<th style="background-color:#0050e5; color:#ffffff; padding:10px; border:1px solid #cbd5e1; text-align:left; font-size:12px;">${c.header}</th>')
        .join('');

    final buffer = StringBuffer();
    for (int idx = 0; idx < data.length; idx++) {
      final row = data[idx];
      final bg = idx % 2 == 0 ? '#ffffff' : '#f8fafc';
      final cells = columns.map((c) {
        dynamic val = row[c.key];
        String formattedVal;
        if (c.format != null) {
          formattedVal = c.format!(val, row);
        } else if (val == null) {
          formattedVal = '-';
        } else if (val is List) {
          formattedVal = val.join(', ');
        } else {
          formattedVal = val.toString();
        }
        return '<td style="padding:8px 10px; border:1px solid #e2e8f0; font-size:11px; color:#1e293b;">$formattedVal</td>';
      }).join('');
      buffer.write('<tr style="background-color:$bg;">$cells</tr>');
    }

    final nowStr = DateFormat('MMMM d, yyyy h:mm a').format(DateTime.now());
    final docContent = '''
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>$title</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; }
    h1 { color: #0f172a; font-size: 20px; margin-bottom: 4px; }
    p.sub { color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>$title</h1>
  <p class="sub"><strong>$organizationName</strong> | Generated on: $nowStr ${filterSummary != null ? '| Filter: $filterSummary' : ''}</p>
  <table>
    <thead>
      <tr>$tableHeaderHtml</tr>
    </thead>
    <tbody>
      ${buffer.toString()}
    </tbody>
  </table>
  <div class="footer">Official Member Register Report - Generated automatically by Ozikol Business Command Center</div>
</body>
</html>
''';

    final targetDir = _getDestinationDirectory();
    final file = File('${targetDir.path}${Platform.pathSeparator}$filename.doc');
    await file.writeAsString(docContent);

    try {
      await launchUrl(Uri.file(file.absolute.path));
    } catch (_) {
      // Graceful continuation
    }

    return file.absolute.path;
  }

  /// <summary>
  /// Generates a branded, printable landscape HTML report and opens it in the default browser with Print / Save as PDF capability.
  /// </summary>
  /// <param name="title">Document heading title.</param>
  /// <param name="organizationName">The tenant organization or workspace brand.</param>
  /// <param name="columns">The column definitions.</param>
  /// <param name="data">The list of member records.</param>
  /// <param name="filterSummary">Optional filter criteria description.</param>
  /// <returns>The absolute path of the temporary printable file.</returns>
  static Future<String?> printReport({
    required String title,
    required String organizationName,
    required List<ExportColumn> columns,
    required List<Map<String, dynamic>> data,
    String? filterSummary,
  }) async {
    final tableHeaderHtml = columns
        .map((c) =>
            '<th style="background:#0f172a; color:#ffffff; padding:10px 12px; font-size:11px; text-transform:uppercase; text-align:left; letter-spacing:0.05em;">${c.header}</th>')
        .join('');

    final buffer = StringBuffer();
    for (int idx = 0; idx < data.length; idx++) {
      final row = data[idx];
      final bg = idx % 2 == 0 ? '#ffffff' : '#f8fafc';
      final cells = columns.map((c) {
        dynamic val = row[c.key];
        String formattedVal;
        if (c.format != null) {
          formattedVal = c.format!(val, row);
        } else if (val == null) {
          formattedVal = '-';
        } else if (val is List) {
          formattedVal = val.join(', ');
        } else {
          formattedVal = val.toString();
        }
        return '<td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#334155;">$formattedVal</td>';
      }).join('');
      buffer.write('<tr style="background:$bg;">$cells</tr>');
    }

    final nowStr = DateFormat('MMMM d, yyyy h:mm a').format(DateTime.now());
    final htmlContent = '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>$title - $organizationName</title>
  <style>
    @page { size: landscape; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; background: #ffffff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0050e5; padding-bottom: 16px; margin-bottom: 20px; }
    .header-left h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #0f172a; }
    .header-left p { margin: 0; font-size: 13px; color: #64748b; }
    .header-right { text-align: right; }
    .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 700; border-radius: 9999px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .no-print { margin-bottom: 20px; display: flex; gap: 10px; }
    .btn-print { background: #0050e5; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(0,80,229,0.3); }
    .btn-print:hover { background: #003ebd; }
    @media print {
      .no-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">
      Print / Save as PDF
    </button>
  </div>
  <div class="header">
    <div class="header-left">
      <h1>$title</h1>
      <p><strong>$organizationName</strong> &bull; Generated on: $nowStr ${filterSummary != null ? '&bull; $filterSummary' : ''}</p>
    </div>
    <div class="header-right">
      <span class="badge">Official Register &bull; ${data.length} Members</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>$tableHeaderHtml</tr>
    </thead>
    <tbody>
      ${buffer.toString()}
    </tbody>
  </table>
  <div class="footer">
    <span>Business Command Center &bull; Official Records</span>
    <span>Confidential &bull; Page 1 of 1</span>
  </div>
</body>
</html>
''';

    final tempDir = Directory.systemTemp;
    final file = File('${tempDir.path}${Platform.pathSeparator}Member_Report_${DateTime.now().millisecondsSinceEpoch}.html');
    await file.writeAsString(htmlContent);

    try {
      await launchUrl(Uri.file(file.absolute.path));
    } catch (_) {
      // Graceful continuation
    }

    return file.absolute.path;
  }
}
