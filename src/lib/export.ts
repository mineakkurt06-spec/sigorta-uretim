import * as XLSX from 'xlsx';

type ExportRow = Record<string, string | number | boolean | null | undefined>;

const dateValue = (value: string) => {
  const text = value.trim();
  const european = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (european) return new Date(`${european[3]}-${european[2].padStart(2, '0')}-${european[1].padStart(2, '0')}`).getTime();
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

const sortByEndDate = (rows: ExportRow[]) => {
  const dateKey = Object.keys(rows[0] || {}).find(key => /bitiş tarihi|bitis tarihi|bitiş|bitis/i.test(key));
  if (!dateKey) return rows;
  return [...rows].sort((left, right) => dateValue(String(left[dateKey] || '')) - dateValue(String(right[dateKey] || '')));
};

export function exportToExcel(rows: ExportRow[], fileName: string) {
  const sheet = XLSX.utils.json_to_sheet(sortByEndDate(rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Üretimler');
  XLSX.writeFile(workbook, fileName);
}

export function exportToPdf(rows: ExportRow[], title: string) {
  const sorted = sortByEndDate(rows);
  const columns = Object.keys(sorted[0] || {});
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) return;
  const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character));
  popup.document.write(`<html><head><title>${escape(title)}</title><style>body{font-family:Arial;padding:24px;color:#172033}h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>${escape(title)}</h1><table><thead><tr>${columns.map(column => `<th>${escape(column)}</th>`).join('')}</tr></thead><tbody>${sorted.map(row => `<tr>${columns.map(column => `<td>${escape(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

export function exportToCsv(rows: ExportRow[], fileName: string) {
  const sheet = XLSX.utils.json_to_sheet(sortByEndDate(rows));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
