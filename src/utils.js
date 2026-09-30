// Small helpers shared by several screens.
import { dayDiff, formatDay } from './game/dates.js';

// Only ever open http(s) links. "www.example.com" gets https:// added;
// anything else (e.g. javascript:) is refused.
export function safeUrl(link) {
  const text = String(link ?? '').trim();
  if (!text) return null;
  const candidate = /^https?:\/\//i.test(text) ? text : /^[\w-]+(\.[\w-]+)+/.test(text) ? `https://${text}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// How to show a deadline: the words, and a "tone" used for the colour.
export function deadlineInfo(item, today) {
  if (!item.deadline) {
    return item.rolling ? { label: 'ROLLING', tone: 'info', days: null } : { label: 'NO DEADLINE', tone: 'muted', days: null };
  }
  const days = dayDiff(today, item.deadline);
  if (days < 0) return { label: `CLOSED ${formatDay(item.deadline)}`, tone: 'dead', days };
  if (days === 0) return { label: 'CLOSES TODAY', tone: 'urgent', days };
  if (days === 1) return { label: 'CLOSES TOMORROW', tone: 'urgent', days };
  if (days <= 7) return { label: `${days} DAYS LEFT`, tone: 'urgent', days };
  return { label: `CLOSES ${formatDay(item.deadline)}`, tone: 'muted', days };
}

// 0.0873 -> "8.7%", 0.42 -> "42%". Never shows 100% unless it really is.
export function percent(value) {
  if (value >= 1) return '100%';
  const pct = Math.min(99, value * 100);
  return pct < 10 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}

// Offer a file to download (used for backups and the CSV template).
export function downloadText(filename, text, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
