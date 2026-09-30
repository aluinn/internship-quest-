// XP and levels.
//
// XP is never stored. It is worked out from each application's history every
// time, so editing or deleting an application can never leave the total wrong.

import { PIPELINE, statusLabel } from './defaults.js';

// Rank titles, unlocked at these levels.
export const RANKS = [
  { level: 1, title: 'Fresher' },
  { level: 3, title: 'Spring Weeker' },
  { level: 5, title: 'Summer Intern' },
  { level: 8, title: 'Analyst' },
  { level: 12, title: 'Associate' },
  { level: 16, title: 'Vice President' },
  { level: 20, title: 'Director' },
  { level: 25, title: 'Managing Director' },
  { level: 30, title: 'Partner' },
];

// XP needed to go from `level` to the next one. Level 1 -> 2 costs 100 XP
// (one application with default settings), and each level costs 100 more.
export function xpToNext(level) {
  return 100 * level;
}

export function rankFor(level) {
  let tier = 0;
  RANKS.forEach((rank, i) => {
    if (level >= rank.level) tier = i;
  });
  return { title: RANKS[tier].title, tier, nextRank: RANKS[tier + 1] ?? null };
}

// Turn a total XP number into { level, into, need, title, ... } where `into`
// is the XP already earned towards the next level and `need` is its full cost.
export function levelInfo(totalXp) {
  let level = 1;
  let into = Math.max(0, totalXp);
  while (into >= xpToNext(level)) {
    into -= xpToNext(level);
    level += 1;
  }
  return { level, into, need: xpToNext(level), ...rankFor(level) };
}

// XP earned by one application: one award per stage it has reached, plus the
// "battle experience" award if it ended in a rejection.
export function appXp(app, xpSettings) {
  const parts = [];
  for (const stage of PIPELINE) {
    if (app.history.some((h) => h.status === stage)) {
      parts.push({ status: stage, label: statusLabel(stage), xp: xpSettings[stage] ?? 0 });
    }
  }
  if (app.history.some((h) => h.status === 'rejected')) {
    parts.push({ status: 'rejected', label: 'Battle experience', xp: xpSettings.rejected ?? 0 });
  }
  return { total: parts.reduce((sum, p) => sum + p.xp, 0), parts };
}
