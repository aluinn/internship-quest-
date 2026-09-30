// computeGame: the one function the screens call.
// Give it the save file and today's date; it returns everything the HUD shows
// (XP, level, streak, weekly progress, stage counts, badges, offer chance).

import { STATUSES, PIPELINE, LIVE } from './defaults.js';
import { dayDiff, weekStart } from './dates.js';
import { appXp, levelInfo } from './xp.js';
import { getDateApplied } from './applications.js';
import { unlockedAchievements } from './achievements.js';
import { offerChance } from './probability.js';

// Streaks: given the list of days with at least one application, find the
// longest run of consecutive days and the run that is still going today.
export function computeStreak(days, today) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    run = previous && dayDiff(previous, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  // The streak is still alive if you applied today or yesterday
  // (yesterday counts: you still have time to apply today).
  const gap = previous ? dayDiff(previous, today) : null;
  const current = gap === 0 || gap === 1 ? run : 0;
  return { current, best, appliedToday: gap === 0 };
}

// Weekly target, turned into a "daily quest": how many to send today to stay
// on pace for the week (weeks run Monday to Sunday).
export function computeWeek(appliedDays, today, target) {
  const monday = weekStart(today);
  const thisWeek = appliedDays.filter((d) => weekStart(d) === monday);
  const done = thisWeek.length;
  const doneToday = thisWeek.filter((d) => d === today).length;
  const daysLeft = 7 - dayDiff(monday, today); // including today
  const stillNeeded = Math.max(0, target - (done - doneToday)); // at the start of today
  const todayGoal = Math.ceil(stillNeeded / daysLeft);
  return { target, done, doneToday, daysLeft, todayGoal, todayComplete: doneToday >= todayGoal, weekComplete: done >= target };
}

export function computeGame(save, today) {
  const { applications, settings } = save;

  // XP
  const perApp = new Map();
  let totalXp = 0;
  for (const app of applications) {
    const xp = appXp(app, settings.xp);
    perApp.set(app.id, xp);
    totalXp += xp.total;
  }
  const level = levelInfo(totalXp);

  // Applications actually sent (anything past the wishlist).
  const sent = applications.filter((a) => getDateApplied(a));
  const appliedDays = sent.map(getDateApplied);

  const streak = computeStreak(appliedDays, today);
  const week = computeWeek(appliedDays, today, settings.weeklyTarget);

  // How many applications are currently in each column.
  const stageCounts = {};
  for (const status of STATUSES) stageCounts[status.id] = 0;
  for (const app of applications) stageCounts[app.status] += 1;

  // How many applications ever reached each stage (for badges).
  const reached = {};
  for (const stage of PIPELINE) reached[stage] = sent.filter((a) => a.history.some((h) => h.status === stage)).length;

  const countBy = (keys) => {
    const counts = new Map();
    for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1);
    return Math.max(0, ...counts.values());
  };

  const stats = {
    applied: sent.length,
    live: applications.filter((a) => LIVE.includes(a.status)).length,
    offers: stageCounts.offer,
    rejected: sent.filter((a) => a.history.some((h) => h.status === 'rejected')).length,
    currentStreak: streak.current,
    bestStreak: streak.best,
    maxPerDay: countBy(appliedDays),
    bestWeek: countBy(appliedDays.map(weekStart)),
    weeklyTarget: settings.weeklyTarget,
    // "Deadline Dodger": sent more than 14 days before the deadline.
    earlyApplications: sent.filter((a) => a.deadline && dayDiff(getDateApplied(a), a.deadline) > 14).length,
    types: new Set(sent.map((a) => a.type)),
    reached,
    level: level.level,
  };

  return {
    totalXp,
    perApp,
    ...level,
    streak,
    week,
    stageCounts,
    stats,
    unlocked: unlockedAchievements(stats),
    offerChance: offerChance(applications, settings),
  };
}
