/** UTF-8 byte-order mark so Excel opens ₹ and Indian names correctly. */
const BOM = String.fromCharCode(0xfeff);

/** Builds a CSV file in the browser and downloads it. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const escape = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    // Neutralise spreadsheet formulas and quote when needed.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`${BOM}${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Paise as a plain rupee number for CSV (e.g. 1200050 -> "12000.50"). */
export const csvRupees = (paise: number) => (paise / 100).toFixed(2);
