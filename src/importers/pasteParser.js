// Paste import: turn text (or a table) you copied from a website into quests.
//
// Copied text is messy and every site lays it out differently, so this is a
// best-effort guesser. The import window always shows a preview you can edit
// before anything is added.
//
// The work happens in three steps:
//   1. get a "grid" (rows of cells) from an HTML table, tab-separated text,
//      or a CSV file;
//   2. work out which column is the company, role, deadline and link;
//   3. build one quest per row.
// Text with no columns at all (e.g. a list of job cards) goes through
// parseBlocks instead.

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/i;

// ---------- dates ----------

function monthNumber(word) {
  const w = word.toLowerCase();
  if (w.length < 3) return 0;
  // Accept "nov", "november" and "sept".
  const index = MONTH_NAMES.findIndex((name) => name.startsWith(w) || (w === 'sept' && name === 'september'));
  return index + 1;
}

function buildDay(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null; // e.g. 31 Feb
  return date.toISOString().slice(0, 10);
}

const fullYear = (text) => (text.length === 2 ? 2000 + Number(text) : Number(text)); // '26' -> 2026

// A date with no year ("30 Nov") means the next one coming up - unless that
// day was within the last ~3 months, in which case it has probably just passed.
function guessYear(month, day, today) {
  const year = Number(today.slice(0, 4));
  const thisYear = buildDay(year, month, day);
  if (!thisYear) return year;
  const daysAgo = (Date.parse(today) - Date.parse(thisYear)) / 86400000;
  return daysAgo > 90 ? year + 1 : year;
}

// Find the first date anywhere in `text` and return it as 'YYYY-MM-DD'.
// Understands 2026-11-30, 30/11/2026 (UK order), 30 Nov 2026, 30th November,
// Nov 30 2026. Returns null if there is no date.
export function parseDate(text, today) {
  if (!text) return null;
  const s = String(text);
  let m;

  if ((m = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(s))) {
    const day = buildDay(+m[1], +m[2], +m[3]);
    if (day) return day;
  }
  if ((m = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4}|\d{2})\b/.exec(s))) {
    const day = buildDay(fullYear(m[3]), +m[2], +m[1]);
    if (day) return day;
  }
  for (m of s.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\b\.?,?(?:\s+(\d{4})\b)?/g)) {
    const month = monthNumber(m[2]);
    if (!month) continue;
    const day = buildDay(m[3] ? +m[3] : guessYear(month, +m[1], today), month, +m[1]);
    if (day) return day;
  }
  for (m of s.matchAll(/\b([A-Za-z]{3,9})\b\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4})\b)?/g)) {
    const month = monthNumber(m[1]);
    if (!month) continue;
    const day = buildDay(m[3] ? +m[3] : guessYear(month, +m[2], today), month, +m[2]);
    if (day) return day;
  }
  return null;
}

// ---------- guessing type and division from the role title ----------

export function detectType(text) {
  const s = String(text || '').toLowerCase();
  if (/spring|insight/.test(s)) return 'spring-week';
  if (/off[\s-]?cycle/.test(s)) return 'off-cycle';
  if (/summer|intern/.test(s)) return 'summer';
  if (/\bgrad(uate)?\b|full[\s-]?time/.test(s)) return 'grad';
  return null;
}

const DIVISION_RULES = [
  [/investment banking|\bibd?\b|m&a|mergers|capital markets|advisory/, 'Investment Banking'],
  [/markets|sales (&|and) trading|\btrading\b|\bs&t\b/, 'Markets'],
  [/asset management|investment management|\bam\b/, 'Asset Management'],
  [/wealth|private bank/, 'Wealth Management'],
  [/private equity|\bpe\b/, 'Private Equity'],
  [/research/, 'Research'],
  [/\brisk\b/, 'Risk'],
  [/operations/, 'Operations'],
  [/technology|software|engineering/, 'Technology'],
];

export function detectDivision(text) {
  const s = String(text || '').toLowerCase();
  for (const [pattern, division] of DIVISION_RULES) if (pattern.test(s)) return division;
  return '';
}

// ---------- step 1: getting a grid ----------
// A grid is an array of rows; each row is an array of cells { text, link }.

const cell = (text, link = null) => ({ text: String(text ?? '').replace(/\s+/g, ' ').trim(), link });

function linkIn(text) {
  const match = URL_PATTERN.exec(text || '');
  return match ? match[0] : null;
}

// Tab-separated text (what you usually get copying a table) or a markdown-style
// table using | between columns. Returns null if the text has no columns.
export function textToGrid(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter((line) => line.trim());
  if (lines.length === 0) return null;
  const mostly = (test) => lines.filter(test).length >= Math.ceil(lines.length / 2);

  let split = null;
  if (mostly((line) => line.includes('\t'))) split = (line) => line.split('\t');
  else if (mostly((line) => (line.match(/\|/g) || []).length >= 2)) {
    split = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
  }
  if (!split) return null;

  return lines
    .map((line) => split(line).map((part) => cell(part, linkIn(part))))
    .filter((row) => !row.every((c) => /^[-:\s]*$/.test(c.text))); // drop |---|---| rows
}

// A table copied from a web page. Browsers put an HTML version on the
// clipboard too, and unlike the plain text it still contains the links.
// (DOMParser only exists in the browser, so this one can't run in Node tests.)
export function htmlToGrid(html) {
  if (!html || typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = [...doc.querySelectorAll('table')];
  if (tables.length === 0) return null;
  // If several tables were copied, use the biggest.
  const table = tables.sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length)[0];
  const grid = [...table.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('th,td')].map((td) => {
      const href = td.querySelector('a[href]')?.getAttribute('href') ?? '';
      return cell(td.textContent, /^https?:\/\//i.test(href) ? href : linkIn(td.textContent));
    }),
  );
  return grid.filter((row) => row.some((c) => c.text));
}

// ---------- step 2: which column is which ----------

// Column titles we recognise in a header row. They must match the whole cell
// (after dropping filler words like "name" and "date"), so that a data row such
// as "Summer Analyst Programme" is not mistaken for a header.
const HEADER_WORDS = [
  ['company', /^(company|firm|employer|organi[sz]ation)$/],
  ['role', /^(programme|program|role|position|title|job|job title|opportunity|scheme)$/],
  ['opens', /^open(s|ing|ed)?$/],
  ['deadline', /^(clos(e|es|ing)|deadline|apply by|due|end)$/],
  ['link', /^(link|url|apply|website)$/],
  ['type', /^(type|programme type|job type)$/],
  ['division', /^(division|category|area|sector|department|business area)$/],
  ['rolling', /^rolling( basis| deadline)?\??$/],
];

function headerField(text) {
  const raw = text.toLowerCase();
  if (/last year|previous/.test(raw)) return null; // e.g. "Last year opening"
  const s = raw.replace(/^application\s+/, '').replace(/\s+(name|dates?)$/, '').trim();
  for (const [field, pattern] of HEADER_WORDS) if (pattern.test(s)) return field;
  return null;
}

// Values that look like table tick-boxes rather than names.
const FLAG_VALUE = /^(yes|no|y|n|true|false|optional|n\/a|tbc|tba|-|–|✓|✔|✗|✘|x)?$/i;

function guessColumns(grid, today) {
  const width = Math.max(...grid.map((row) => row.length));
  const columns = {};
  const dateColumns = [];
  const textColumns = [];

  for (let i = 0; i < width; i += 1) {
    const filled = grid.map((row) => row[i]?.text ?? '').filter(Boolean);
    if (filled.length === 0) continue;
    const share = (test) => filled.filter(test).length / filled.length;
    // A column that says the same thing on every row (e.g. "Apply") is not a name.
    const repeated = filled.length >= 3 && share((t) => t === filled[0]) > 0.6;

    if (share((t) => Boolean(linkIn(t)) && t.length < 300) > 0.6) columns.link ??= i;
    else if (share((t) => t.length < 40 && Boolean(parseDate(t, today))) > 0.6) dateColumns.push(i);
    else if (repeated || share((t) => FLAG_VALUE.test(t) || /^rolling$/i.test(t)) > 0.6) continue;
    else textColumns.push(i);
  }

  // Trackers usually list opening date then closing date.
  columns.deadline = dateColumns[1] ?? dateColumns[0];
  columns.company = textColumns[0];
  columns.role = textColumns[1];
  return columns;
}

function readHeader(row) {
  const columns = {};
  row.forEach((c, i) => {
    const field = headerField(c.text);
    if (field && columns[field] === undefined) columns[field] = i;
  });
  return columns;
}

// ---------- step 3: rows -> quests ----------

const SEPARATOR = /\s+[-–—|]\s+/;

// Build a quest from loose pieces, filling in type/division by guessing.
function buildQuest({ company = '', role = '', deadline = null, link = '', rolling = false, type = null, division = '' }, defaultType) {
  // "Company - Role" typed into a single column.
  if (company && !role && SEPARATOR.test(company)) {
    const [first, ...rest] = company.split(SEPARATOR);
    company = first;
    role = rest.join(' - ');
  }
  return {
    company: company.trim(),
    role: role.trim(),
    type: type || detectType(role) || defaultType,
    division: division || detectDivision(role),
    deadline,
    rolling,
    link: link || '',
  };
}

// Turn a grid into quests. `defaultType` is used when the role title gives no clue.
export function gridToQuests(grid, { today, defaultType = 'summer' }) {
  if (!grid || grid.length === 0) return [];

  const header = readHeader(grid[0]);
  const hasHeader = Object.keys(header).length >= 2;
  const rows = hasHeader ? grid.slice(1) : grid;
  if (rows.length === 0) return [];
  const columns = hasHeader ? header : guessColumns(rows, today);
  // A header that names only some columns: guess the rest.
  if (hasHeader && (columns.company === undefined || columns.role === undefined)) {
    const guessed = guessColumns(rows, today);
    const taken = new Set(Object.values(columns));
    for (const field of ['company', 'role', 'deadline', 'link']) {
      if (columns[field] === undefined && guessed[field] !== undefined && !taken.has(guessed[field])) columns[field] = guessed[field];
    }
  }

  const at = (row, field) => (columns[field] === undefined ? '' : (row[columns[field]]?.text ?? ''));

  const quests = [];
  for (const row of rows) {
    const company = at(row, 'company');
    const role = at(row, 'role');
    if (!company && !role) continue;
    const everything = row.map((c) => c.text).join(' ');
    // Prefer a link on the company/role cell, then the link column, then any link in the row.
    const link =
      row[columns.role]?.link || row[columns.company]?.link || row[columns.link]?.link || linkIn(at(row, 'link')) || row.find((c) => c.link)?.link || '';
    quests.push(
      buildQuest(
        {
          company: linkIn(company) ? '' : company,
          role: linkIn(role) ? '' : role,
          deadline: parseDate(at(row, 'deadline'), today),
          link,
          // With a "Rolling" column, read its Yes/No; otherwise look for the word anywhere in the row.
          rolling: columns.rolling === undefined ? /rolling/i.test(everything) : /^(yes|y|true|rolling|✓|✔)/i.test(at(row, 'rolling')),
          type: detectType(at(row, 'type')),
          division: columns.division === undefined ? '' : at(row, 'division'),
        },
        defaultType,
      ),
    );
  }
  return quests.filter((q) => q.company || q.role);
}

// Text with no columns: either one opportunity per line
//   "Goldman Sachs - Summer Analyst - closes 30 Nov 2026 - https://..."
// or blocks of lines separated by blank lines (a copied list of job cards),
// where the first plain line is taken as the company and the second as the role.
export function parseBlocks(text, { today, defaultType = 'summer' }) {
  const clean = String(text).replace(/\r/g, '');
  const hasBlankLines = /\n\s*\n/.test(clean.trim());
  const chunks = hasBlankLines ? clean.split(/\n\s*\n/) : clean.split('\n');

  const quests = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const link = linkIn(chunk) || '';
    const rolling = /rolling/i.test(chunk);
    let deadline = null;
    const names = [];

    // Split a single line into its " - " separated pieces; a block into lines.
    const pieces = hasBlankLines ? chunk.split('\n') : chunk.replace(URL_PATTERN, ' ').split(SEPARATOR);
    for (const raw of pieces) {
      const piece = raw.replace(URL_PATTERN, '').trim();
      if (!piece) continue;
      const date = parseDate(piece, today);
      const aboutDates = /deadline|clos|apply by|due|open|posted|rolling/i.test(piece);
      if (date && (aboutDates || piece.length < 25)) {
        // An "opens" date is not a deadline.
        if (!/open|posted/i.test(piece) || /clos|deadline/i.test(piece)) deadline ??= date;
        continue;
      }
      // Skip labels and buttons that were copied along with the listing.
      if (/^rolling/i.test(piece) || /^(apply|view|save|new|featured|deadline|closes|closing)\b.{0,12}$/i.test(piece)) continue;
      names.push(piece);
    }

    if (names.length === 0) continue;
    // "Summer Analyst at Goldman Sachs" on one line.
    const atMatch = names.length === 1 ? /^(.+?)\s+at\s+(.+)$/i.exec(names[0]) : null;
    // On a single line everything after the company is the role ("Analyst - Markets");
    // in a block, later lines tend to be location and other details, so only take the second.
    const rest = hasBlankLines ? (names[1] ?? '') : names.slice(1).join(' - ');
    const [company, role] = atMatch ? [atMatch[2], atMatch[1]] : [names[0], rest];
    quests.push(buildQuest({ company, role, deadline, link, rolling }, defaultType));
  }
  return quests;
}

// The one function the import window calls for pasted content.
// `html` is the clipboard's HTML version, if the browser provided one.
export function parsePaste({ text, html }, options) {
  const grid = htmlToGrid(html) ?? textToGrid(text);
  const fromGrid = grid ? gridToQuests(grid, options) : [];
  return fromGrid.length > 0 ? fromGrid : parseBlocks(text, options);
}
