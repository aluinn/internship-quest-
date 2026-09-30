// CSV import. A CSV file is a table saved as text: one row per line, with
// commas between the cells. Cells containing commas are wrapped in "quotes".

import { gridToQuests } from './pasteParser.js';

// Excel in some countries uses ; instead of , - pick whichever the first line uses most.
function detectDelimiter(text) {
  const firstLine = text.split('\n')[0] ?? '';
  const count = (ch) => firstLine.split(ch).length - 1;
  return [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];
}

// Split CSV text into rows of strings, handling quoted cells properly
// ("a ""quoted"" word", commas and line breaks inside quotes).
export function parseCsv(input) {
  const text = String(input).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        value += '"'; // "" inside quotes means one literal quote
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else value += ch;
    } else if (ch === '"' && value === '') inQuotes = true;
    else if (ch === delimiter) {
      row.push(value);
      value = '';
    } else if (ch === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else value += ch;
  }
  if (value !== '' || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function csvToQuests(text, options) {
  const urlIn = (s) => /https?:\/\/\S+/i.exec(s)?.[0] ?? null;
  const grid = parseCsv(text).map((row) => row.map((c) => ({ text: c.replace(/\s+/g, ' ').trim(), link: urlIn(c) })));
  return gridToQuests(grid, options);
}

// The example file offered for download in the import window.
export const CSV_TEMPLATE = [
  'Company,Role,Type,Division,Deadline,Rolling,Link',
  'Example Bank,2027 Summer Analyst - Investment Banking,Summer internship,Investment Banking,30/11/2026,Yes,https://example.com/apply',
  'Example Asset Managers,Spring Insight Week,Spring week,Asset Management,15 Jan 2027,No,https://example.com/spring',
].join('\n');
