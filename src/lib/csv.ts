export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  return rows.slice(1).map((cells) =>
    headers.reduce<CsvRow>((acc, header, index) => {
      acc[header] = cells[index] ?? '';
      return acc;
    }, {}),
  );
}

export function toCsv(rows: CsvRow[]) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string) => {
    const normalized = value ?? '';
    return /[",\n\r]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header] ?? '')).join(','))].join('\n');
}

export function downloadTextFile(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function toExcelHtml(rows: CsvRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const cell = (value: string) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${headers
    .map((header) => `<th>${cell(header)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${headers.map((header) => `<td>${cell(row[header] ?? '')}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></body></html>`;
}
