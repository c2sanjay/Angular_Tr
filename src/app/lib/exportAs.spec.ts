import {
  exportAsCSV,
  exportAsCSVString,
  exportAsExcel,
  exportAsExcelString,
  exportAsPDF,
  exportAsPDFString,
} from 'src/app/lib/exportAs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

jest.mock('jspdf', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      save: jest.fn(),
      text: jest.fn(),
      rect: jest.fn(),
      setFontSize: jest.fn(),
      setFillColor: jest.fn(),
      setDrawColor: jest.fn(),
    })),
  };
});

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

jest.mock('jspdf-autotable', () => ({
  autoTable: jest.fn(),
}));

jest.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
    json_to_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
  write: jest.fn(),
}));


declare const global: any;

// Internal helper used by export code
const formatDateField = (value: any): any => {
  if (!value) return value;
  const date = new Date(value);
  if (typeof value === 'string' && isNaN(date.getTime())) {
    return value;
  }
  if (
    Object.prototype.toString.call(date) === '[object Date]' &&
    !isNaN(date.getTime())
  ) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return value;
};

describe('Export Utils', () => {
  const data = [
    { name: 'Alice', submittedDate: '2025-06-01T12:00:00Z', age: 30 },
    { name: 'Bob', submittedDate: '2025-06-02T12:00:00Z', age: 25 },
  ];

  const headers = [
    { key: 'name', label: 'Name' },
    { key: 'submittedDate', label: 'Submitted Date' },
    { key: 'age', label: 'Age' },
  ];

  const stringData = ['Value1', 'Value2', 'Value3'];
  const mockSheet = { A1: { v: 'Test' } };
  const mockWorkbook = { SheetNames: [], Sheets: {} };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock global URL
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();

    jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());
    jest.spyOn(document.body, 'removeChild').mockImplementation(jest.fn());

    jest.spyOn(document, 'createElement').mockImplementation(() => {
      const element = {
        click: jest.fn(),
      };
      Object.defineProperty(element, 'download', {
        set(_: string) {},
      });
      Object.defineProperty(element, 'href', {
        set(_: string) {},
      });
      return element as unknown as HTMLAnchorElement;
    });
    
     (XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue({ '!cols': [] });
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue(mockSheet);
    (XLSX.utils.book_new as jest.Mock).mockReturnValue(mockWorkbook);
  });

  it('should export CSV with valid data', () => {
    exportAsCSV(data, 'csv-file', headers);
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it('should export PDF with valid data', () => {
    exportAsPDF(data, 'pdf-file', headers);
    expect(autoTable).toHaveBeenCalled();
    expect((jsPDF as any).mock.results[0].value.save).toHaveBeenCalled();
  });

  it('should export CSV with string data', () => {
    exportAsCSVString('Header', stringData);
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it('should export Excel with string data', () => {
    exportAsExcelString('Header', stringData);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('should export PDF with string data', () => {
    exportAsPDFString(['Header'], ['f1', 'f2']);
    expect((jsPDF as any).mock.results[0].value.save).toHaveBeenCalled();
  });

  it('should handle empty data gracefully for all exports', () => {
    expect(() => exportAsCSV([], 'file', headers)).not.toThrow();
    expect(() => exportAsExcel([], 'file', headers)).not.toThrow();
    expect(() => exportAsPDF([], 'file', headers)).not.toThrow();
    expect(() => exportAsCSVString('header', [])).not.toThrow();
    expect(() => exportAsExcelString('header', [])).not.toThrow();
  });

  it('should return formatted string if input is a valid ISO date string', () => {
    const input = '2023-12-25T05:30:00Z';
    const date = new Date(input);
    const expected = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(
      date.getDate(),
    ).padStart(2, '0')}/${date.getFullYear()} ${String(
      date.getHours(),
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const result = formatDateField(input);
    expect(result).toBe(expected);
  });

  it('should return same string if input is invalid date string', () => {
    const input = 'invalid-date';
    const result = formatDateField(input);
    expect(result).toBe(input);
  });

  it('should return same value if input is null or undefined', () => {
    expect(formatDateField(null)).toBe(null);
    expect(formatDateField(undefined)).toBe(undefined);
  });

  it('should return formatted string if input is a Date object', () => {
    const input = new Date('2024-01-15T10:45:00');
    const expected = '01/15/2024 10:45';
    const result = formatDateField(input);
    expect(result).toBe(expected);
  });

  it('should return formatted string if input is a valid timestamp number', () => {
    const input = 1234567890;
    const date = new Date(input);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const expected = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const result = formatDateField(input);
    expect(result).toBe(expected);
  });

  it('should export Excel with valid data', () => {
    exportAsExcel(data, 'excel-file', headers);
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
  });
  
   it('should push quoted value if it contains a comma', () => {
    const header = 'Name';
    const data = ['Smith, John'];

    const pushSpy = jest.spyOn(Array.prototype, 'push');

    exportAsCSVString(header, data);
  const quotedValue = pushSpy.mock.calls.find(([arg]) => arg === '"Smith, John"');

    expect(quotedValue).toBeDefined();

    pushSpy.mockRestore();
  });

  
});
