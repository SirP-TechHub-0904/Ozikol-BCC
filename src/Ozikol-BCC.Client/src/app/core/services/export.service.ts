import { Injectable } from '@angular/core';

export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any, row?: any) => string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Exports data to formatted CSV / Excel (.csv) with UTF-8 BOM.
   */
  exportToCsv(filename: string, columns: ExportColumn[], data: any[]): void {
    if (!data || data.length === 0) return;

    const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => {
      return columns.map(c => {
        let val = row[c.key];
        if (c.format) {
          val = c.format(val, row);
        } else if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = Array.isArray(val) ? val.join('; ') : JSON.stringify(val);
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Exports formatted HTML-table as Microsoft Word document (.doc).
   */
  exportToWord(filename: string, title: string, organizationName: string, columns: ExportColumn[], data: any[], filterSummary?: string): void {
    const tableHeaderHtml = columns.map(c => `<th style="background-color:#0050e5; color:#ffffff; padding:10px; border:1px solid #cbd5e1; text-align:left; font-size:12px;">${c.header}</th>`).join('');
    
    const tableRowsHtml = data.map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns.map(c => {
        let val = row[c.key];
        if (c.format) {
          val = c.format(val, row);
        } else if (val === null || val === undefined) {
          val = '-';
        } else if (Array.isArray(val)) {
          val = val.join(', ');
        }
        return `<td style="padding:8px 10px; border:1px solid #e2e8f0; font-size:11px; color:#1e293b;">${val}</td>`;
      }).join('');
      return `<tr style="background-color:${bg};">${cells}</tr>`;
    }).join('');

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; }
          h1 { color: #0f172a; font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="sub"><strong>${organizationName}</strong> | Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ${filterSummary ? `| Filter: ${filterSummary}` : ''}</p>
        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">Official Member Register Report</div>
      </body>
      </html>
    `;

    this.downloadFile(docContent, `${filename}.doc`, 'application/msword');
  }

  /**
   * Opens an isolated branded printable window for saving to PDF / Print.
   */
  printReport(title: string, organizationName: string, columns: ExportColumn[], data: any[], filterSummary?: string): void {
    const tableHeaderHtml = columns.map(c => `<th style="background:#0f172a; color:#ffffff; padding:10px 12px; font-size:11px; text-transform:uppercase; text-align:left; letter-spacing:0.05em;">${c.header}</th>`).join('');
    
    const tableRowsHtml = data.map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns.map(c => {
        let val = row[c.key];
        if (c.format) {
          val = c.format(val, row);
        } else if (val === null || val === undefined) {
          val = '-';
        } else if (Array.isArray(val)) {
          val = val.join(', ');
        }
        return `<td style="padding:9px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#334155;">${val}</td>`;
      }).join('');
      return `<tr style="background:${bg};">${cells}</tr>`;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${organizationName}</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0050e5; padding-bottom: 16px; margin-bottom: 20px; }
          .header-left h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #0f172a; }
          .header-left p { margin: 0; font-size: 13px; color: #64748b; }
          .header-right { text-align: right; }
          .badge { display: inline-block; padding: 4px 10px; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 700; border-radius: 9999px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <button onclick="window.print()" style="background: #0050e5; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
          <button onclick="window.close()" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">Close</button>
        </div>
        <div class="header">
          <div class="header-left">
            <h1>${title}</h1>
            <p><strong>${organizationName}</strong> | Total Records: <strong>${data.length}</strong> ${filterSummary ? `| Filter: <em>${filterSummary}</em>` : ''}</p>
          </div>
          <div class="header-right">
            <span class="badge">Official Register</span>
            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Printed: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <span>Official Member Register Report</span>
          <span>Confidential Institutional Document</span>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
