import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { autoTable } from 'jspdf-autotable';

function formatDateField(value: any): any {
  if (!value) return value;

  // Check if it's already a Date object or a string that looks like a date
  const date = new Date(value);
  if (typeof value === 'string' && isNaN(date.getTime())) {
    return value; // Not a valid date string
  }

  if (
    Object.prototype.toString.call(date) === '[object Date]' &&
    !isNaN(date.getTime())
  ) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return value; // Fallback
}

function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const year = now.getFullYear();
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());

  return `${month}_${day}_${year} ${hour}_${minute}_${second}`;
}

function exportAsCSV(
  data: any[],
  fileNameAppend: string,
  customHeaders: { key: string; label: string }[],
  skipColumns: string[] = [],
) {
  if (!data.length) return;

  const csvRows: string[] = [];

  // Define fields that should be formatted as dates
  const dateFields = ['submittedDate', 'lastupdate', 'AssignedDate']; // Add more if needed

  const headers = customHeaders.filter((h) => !skipColumns.includes(h.key));

  // Push CSV header row
  csvRows.push(headers.map((h) => h.label).join(','));

  // Push data rows
  for (const row of data) {
    const values = headers.map((h) => {
      let value = row[h.key];

      // Format only if the key is a known date field
      if (dateFields.includes(h.key)) {
        value = formatDateField(value);
      } else {
        value = value !== undefined && value !== null ? value.toString() : '';
      }

      // Escape any double quotes in values
      const escaped = ('' + value).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });

    csvRows.push(values.join(','));
  }

  // Create CSV blob
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  // Download CSV
  const a = document.createElement('a');
  const fileName = `${fileNameAppend}_${generateTimestamp()}`;
  a.href = url;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function exportAsExcel(
  data: any[],
  fileNameAppend: string,
  customHeaders: { key: string; label: string }[],
  skipColumns: string[] = [],
) {
  if (!data.length) return;

  const dateFields = ['submittedDate', 'lastupdate', 'AssignedDate']; // Add any other known date fields

  const finalData = data.map((row) => {
    const newRow: { [key: string]: any } = {};
    for (const { key, label } of customHeaders) {
      if (!skipColumns.includes(key)) {
        const value = row[key];

        // Format only known date fields
        if (dateFields.includes(key)) {
          newRow[label] = formatDateField(value);
        } else {
          newRow[label] =
            value !== undefined && value !== null ? value.toString() : '';
        }
      }
    }
    return newRow;
  });

  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(finalData);

  // Auto calculate column width based on maximum content length
  const columnWidths = customHeaders
    .filter((h) => !skipColumns.includes(h.key))
    .map(({ label }) => {
      const maxContentLength = Math.max(
        label.length,
        ...finalData.map((row) =>
          row[label] ? row[label].toString().length : 0,
        ),
      );
      return { wch: maxContentLength + 2 }; // Add some padding
    });

  worksheet['!cols'] = columnWidths;

  const workbook: XLSX.WorkBook = {
    Sheets: { data: worksheet },
    SheetNames: ['data'],
  };

  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const fileName = `${fileNameAppend}_${generateTimestamp()}`;
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `${fileName}.xlsx`);
}

function exportAsPDF(
  data: any[],
  fileNameAppend: string,
  customHeaders: { key: string; label: string }[],
  skipColumns: string[] = [],
) {
  if (!data.length) return;

  const doc = new jsPDF({
    orientation: 'landscape', // <-- horizontal
    unit: 'mm',
    format: 'a4',
  });

  let headers: string[];
  const dateFields = ['submittedDate', 'lastupdate', 'AssignedDate'];

  const filteredHeaders = customHeaders.filter(
    (h) => !skipColumns.includes(h.key),
  );
  headers = filteredHeaders.map((h) => h.label);

  const tableData = data.map((row) =>
    filteredHeaders.map((h) => {
      const value = row[h.key];

      // Use your custom formatter if needed
      if (dateFields.includes(h.key)) {
        return formatDateField(value); // Use your helper for consistency
      }

      // Default fallback
      return value !== undefined && value !== null ? value.toString() : '';
    }),
  );

  autoTable(doc, {
    head: [headers],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  const fileName = `${fileNameAppend}_${generateTimestamp()}`;
  doc.save(`${fileName}.pdf`);
}

/*===================================================*/
//for tables having string instead of objects in data
/*===================================================*/

function exportAsCSVString(header: string, data: any[]) {
  if (!data.length) return;

  const csvRows = [];
  csvRows.push(header);

  for (const form of data) {
    let value = '' + form;
    value = value.replace(/"/g, '""');
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      value = `"${value}"`;
    }
    csvRows.push(value);
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const fileName = `form-overview_${generateTimestamp()}`;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function exportAsExcelString(header: string, data: any[]) {
  if (!data.length) return;

  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
    [header],
    ...data.map((item) => [item]),
  ]);

  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Forms List');

  const fileName = `form-overview_${generateTimestamp()}`;
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

function exportAsPDFString(tableHeaders: string[], data: string[]) {
  const doc = new jsPDF();
  doc.setFontSize(10);

  const startX = 10;
  const startY = 20;
  const cellWidth = 190;
  const cellHeight = 10;

  doc.setFillColor(200, 200, 255);
  doc.setDrawColor(0, 0, 0);
  doc.rect(startX, startY, cellWidth, cellHeight, 'FD');
  doc.text(tableHeaders[0], startX + 2, startY + 7);

  data.forEach((value, index) => {
    const y = startY + cellHeight * (index + 1);
    doc.rect(startX, y, cellWidth, cellHeight);
    doc.text(value, startX + 2, y + 7);
  });

  const fileName = `form-overview_${generateTimestamp()}`;
  doc.save(`${fileName}.pdf`);
}

export {
  exportAsCSV,
  exportAsCSVString,
  exportAsExcel,
  exportAsExcelString,
  exportAsPDF,
  exportAsPDFString,
};
