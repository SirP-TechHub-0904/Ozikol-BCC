import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

/// <summary>
/// Column specification for exporting tabular data across CSV, Word, and native PDF formats.
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
/// Enterprise export service for generating CSV spreadsheets, Microsoft Word documents,
/// and native in-app vector PDF preview and print capabilities.
/// Operates 100% inside the app without requiring an external browser.
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
      if (Platform.isWindows) {
        Process.run('cmd', ['/c', 'start', '', file.absolute.path]);
      } else {
        await launchUrl(Uri.file(file.absolute.path), mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      try {
        await launchUrl(Uri.file(file.absolute.path));
      } catch (_) {}
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
      if (Platform.isWindows) {
        Process.run('cmd', ['/c', 'start', '', file.absolute.path]);
      } else {
        await launchUrl(Uri.file(file.absolute.path), mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      try {
        await launchUrl(Uri.file(file.absolute.path));
      } catch (_) {}
    }

    return file.absolute.path;
  }

  /// <summary>
  /// Generates a binary PDF document in memory using pure vector layout.
  /// Formatted in A4 Landscape with BCC branding, metadata headers, and pagination.
  /// </summary>
  /// <param name="title">Document heading title.</param>
  /// <param name="organizationName">The tenant organization or workspace brand.</param>
  /// <param name="columns">The column definitions.</param>
  /// <param name="data">The list of member records.</param>
  /// <param name="filterSummary">Optional filter criteria description.</param>
  /// <returns>Binary PDF byte array.</returns>
  static Future<Uint8List> buildPdfDocument({
    required String title,
    required String organizationName,
    required List<ExportColumn> columns,
    required List<Map<String, dynamic>> data,
    String? filterSummary,
  }) async {
    final pdf = pw.Document();
    final nowStr = DateFormat('MMMM d, yyyy h:mm a').format(DateTime.now());

    final headers = columns.map((c) => c.header).toList();
    final tableData = data.map((row) {
      return columns.map((c) {
        dynamic val = row[c.key];
        if (c.format != null) return c.format!(val, row);
        if (val == null) return '-';
        if (val is List) return val.join(', ');
        return val.toString();
      }).toList();
    }).toList();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        header: (pw.Context context) {
          return pw.Container(
            margin: const pw.EdgeInsets.only(bottom: 12),
            decoration: const pw.BoxDecoration(
              border: pw.Border(
                bottom: pw.BorderSide(color: PdfColor.fromInt(0xFF0050E5), width: 1.5),
              ),
            ),
            padding: const pw.EdgeInsets.only(bottom: 8),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.end,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      title,
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                        color: const PdfColor.fromInt(0xFF0F172A),
                      ),
                    ),
                    pw.SizedBox(height: 3),
                    pw.Text(
                      '$organizationName  |  Generated: $nowStr${filterSummary != null ? '  |  $filterSummary' : ''}',
                      style: const pw.TextStyle(
                        fontSize: 8.5,
                        color: PdfColor.fromInt(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: pw.BoxDecoration(
                    color: const PdfColor.fromInt(0xFFEFF6FF),
                    borderRadius: pw.BorderRadius.circular(4),
                  ),
                  child: pw.Text(
                    '${data.length} Total Records',
                    style: pw.TextStyle(
                      fontSize: 8.5,
                      fontWeight: pw.FontWeight.bold,
                      color: const PdfColor.fromInt(0xFF0050E5),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
        footer: (pw.Context context) {
          return pw.Container(
            margin: const pw.EdgeInsets.only(top: 8),
            padding: const pw.EdgeInsets.only(top: 6),
            decoration: const pw.BoxDecoration(
              border: pw.Border(
                top: pw.BorderSide(color: PdfColor.fromInt(0xFFE2E8F0), width: 0.8),
              ),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'Ozikol Business Command Center  -  Official Membership Roll',
                  style: const pw.TextStyle(fontSize: 8, color: PdfColor.fromInt(0xFF94A3B8)),
                ),
                pw.Text(
                  'Page ${context.pageNumber} of ${context.pagesCount}',
                  style: pw.TextStyle(
                    fontSize: 8,
                    fontWeight: pw.FontWeight.bold,
                    color: const PdfColor.fromInt(0xFF64748B),
                  ),
                ),
              ],
            ),
          );
        },
        build: (pw.Context context) => [
          pw.TableHelper.fromTextArray(
            headers: headers,
            data: tableData,
            border: pw.TableBorder.all(
              color: const PdfColor.fromInt(0xFFE2E8F0),
              width: 0.5,
            ),
            headerStyle: pw.TextStyle(
              fontSize: 8.5,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
            ),
            headerDecoration: const pw.BoxDecoration(
              color: PdfColor.fromInt(0xFF0050E5),
            ),
            cellStyle: const pw.TextStyle(
              fontSize: 7.5,
              color: PdfColor.fromInt(0xFF1E293B),
            ),
            cellAlignment: pw.Alignment.centerLeft,
            cellPadding: const pw.EdgeInsets.symmetric(horizontal: 5, vertical: 4),
            rowDecoration: const pw.BoxDecoration(
              color: PdfColors.white,
            ),
            oddRowDecoration: const pw.BoxDecoration(
              color: PdfColor.fromInt(0xFFF8FAFC),
            ),
          ),
        ],
      ),
    );

    return pdf.save();
  }

  /// <summary>
  /// Opens a modern in-app modal preview displaying the generated PDF document.
  /// The user can zoom, pan, print directly to hardware printers, or save to PDF file.
  /// Operates 100% inside the desktop/mobile app without opening a web browser.
  /// </summary>
  /// <param name="context">The Flutter build context.</param>
  /// <param name="title">Document heading title.</param>
  /// <param name="organizationName">The tenant organization or workspace brand.</param>
  /// <param name="columns">The column definitions.</param>
  /// <param name="data">The list of member records.</param>
  /// <param name="filterSummary">Optional filter criteria description.</param>
  static Future<void> showInAppPdfPreview({
    required BuildContext context,
    required String title,
    required String organizationName,
    required List<ExportColumn> columns,
    required List<Map<String, dynamic>> data,
    String? filterSummary,
  }) async {
    if (data.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No records available to export.'),
          backgroundColor: Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cleanFileName = '${title.replaceAll(RegExp(r'[^\w\s-]'), '').trim().replaceAll(RegExp(r'\s+'), '_')}.pdf';

    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return Dialog(
          backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          clipBehavior: Clip.antiAlias,
          child: SizedBox(
            width: 960,
            height: 720,
            child: Column(
              children: [
                // Top Header Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0050E5),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.picture_as_pdf_rounded, color: Colors.white, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '$organizationName • ${data.length} Members',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                        tooltip: 'Close Preview',
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                ),
                // In-App PDF Preview & Print Engine
                Expanded(
                  child: PdfPreview(
                    build: (format) => buildPdfDocument(
                      title: title,
                      organizationName: organizationName,
                      columns: columns,
                      data: data,
                      filterSummary: filterSummary,
                    ),
                    allowPrinting: true,
                    allowSharing: true,
                    canChangeOrientation: false,
                    canChangePageFormat: false,
                    canDebug: false,
                    initialPageFormat: PdfPageFormat.a4.landscape,
                    pdfFileName: cleanFileName,
                    previewPageMargin: const EdgeInsets.all(12),
                    loadingWidget: const Center(
                      child: CircularProgressIndicator(color: Color(0xFF0050E5)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
