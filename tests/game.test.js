// Tests for the game rules. Run them with:  npm test
// Each test builds a small save, runs a rule, and checks the answer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptySave, normaliseSave, DEFAULT_SETTINGS } from '../src/game/defaults.js';
import { saveApplication, setStatus, deleteApplication, startQuest, addQuests, makeQuest, getDateApplied } from '../src/game/applications.js';
import { computeGame, computeStreak, computeWeek } from '../src/game/index.js';
import { levelInfo } from '../src/game/xp.js';
import { offerChance, chanceAfterMore, appsToReach } from '../src/game/probability.js';
import { weekStart, dayDiff, addDays } from '../src/game/dates.js';

const TODAY = '2026-09-30'; // a Wednesday

// Helper: a save with one application per given day.
function saveWith(days, extra = {}) {
  let save = createEmptySave();
  days.forEach((day, i) => {
    save = saveApplication(save, null, { company: `Bank ${i}`, role: 'Summer Analyst', status: 'applied', dateApplied: day, ...extra }, TODAY);
  });
  return save;
}

test('dates', () => {
  assert.equal(dayDiff('2026-09-30', '2026-10-02'), 2);
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(weekStart('2026-09-30'), '2026-09-28'); // Monday
  assert.equal(weekStart('2026-09-27'), '2026-09-21'); // a Sunday belongs to the week before
});

test('levels: 100 XP for level 2, 200 more for level 3', () => {
  assert.deepEqual([levelInfo(0).level, levelInfo(99).level, levelInfo(100).level, levelInfo(299).level, levelInfo(300).level], [1, 1, 2, 2, 3]);
  assert.equal(levelInfo(150).into, 50);
  assert.equal(levelInfo(150).need, 200);
  assert.equal(levelInfo(300).title, 'Spring Weeker');
});

test('applying awards XP, each later stage adds its bonus', () => {
  let save = saveWith([TODAY]);
  const id = save.applications[0].id;
  assert.equal(computeGame(save, TODAY).totalXp, 100);

  save = setStatus(save, id, 'onlineTest', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 250);

  // Skipping the video interview only pays for stages actually reached.
  save = setStatus(save, id, 'assessmentCentre', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 650);

  save = setStatus(save, id, 'offer', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 1650);
});

test('rejection keeps earned XP and adds battle experience', () => {
  let save = saveWith([TODAY]);
  const id = save.applications[0].id;
  save = setStatus(save, id, 'onlineTest', TODAY);
  save = setStatus(save, id, 'rejected', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 100 + 150 + 25);
  assert.equal(computeGame(save, TODAY).stats.rejected, 1);

  // Un-rejecting (fixing a mistake) removes the battle experience again.
  save = setStatus(save, id, 'onlineTest', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 250);
});

test('moving backwards removes later stages; wishlist earns nothing', () => {
  let save = saveWith([TODAY]);
  const id = save.applications[0].id;
  save = setStatus(save, id, 'videoInterview', TODAY);
  save = setStatus(save, id, 'applied', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 100);
  save = setStatus(save, id, 'wishlist', TODAY);
  assert.equal(computeGame(save, TODAY).totalXp, 0);
  assert.equal(getDateApplied(save.applications[0]), null);
});

test('logging straight into a later stage records the application too', () => {
  const save = saveApplication(createEmptySave(), null, { company: 'A', role: 'B', status: 'onlineTest', dateApplied: '2026-09-01' }, TODAY);
  assert.equal(getDateApplied(save.applications[0]), '2026-09-01');
  assert.equal(computeGame(save, TODAY).totalXp, 250);
});

test('editing keeps the id and can change the applied date; deleting removes XP', () => {
  let save = saveWith([TODAY]);
  const app = save.applications[0];
  save = saveApplication(save, app.id, { ...app, company: 'Renamed', status: 'applied', dateApplied: '2026-09-20' }, TODAY);
  assert.equal(save.applications.length, 1);
  assert.equal(save.applications[0].company, 'Renamed');
  assert.equal(getDateApplied(save.applications[0]), '2026-09-20');
  save = deleteApplication(save, app.id);
  assert.equal(computeGame(save, TODAY).totalXp, 0);
});

test('custom XP values from settings are used', () => {
  const save = saveWith([TODAY]);
  save.settings.xp.applied = 500;
  assert.equal(computeGame(save, TODAY).totalXp, 500);
});

test('streaks', () => {
  assert.deepEqual(computeStreak([], TODAY), { current: 0, best: 0, appliedToday: false });
  assert.deepEqual(computeStreak(['2026-09-28', '2026-09-29', '2026-09-30'], TODAY), { current: 3, best: 3, appliedToday: true });
  // Applied yesterday but not yet today: the streak is still alive.
  assert.equal(computeStreak(['2026-09-28', '2026-09-29'], TODAY).current, 2);
  // Missed a day: current streak resets, best is remembered.
  assert.deepEqual(computeStreak(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-28'], TODAY), { current: 0, best: 3, appliedToday: false });
  // Two applications on one day count once.
  assert.equal(computeStreak([TODAY, TODAY], TODAY).current, 1);
});

test('weekly target becomes a daily quest', () => {
  // Wednesday, nothing sent yet, target 5: 5 days left (Wed-Sun) -> 1 today.
  assert.deepEqual(computeWeek([], TODAY, 5), { target: 5, done: 0, doneToday: 0, daysLeft: 5, todayGoal: 1, todayComplete: false, weekComplete: false });
  const week = computeWeek(['2026-09-28', TODAY, '2026-09-20'], TODAY, 5);
  assert.equal(week.done, 2); // last week's doesn't count
  assert.equal(week.todayComplete, true);
  // Sunday with 4 still to do: all 4 are due today.
  assert.equal(computeWeek(['2026-09-28'], '2026-10-04', 5).todayGoal, 4);
  assert.equal(computeWeek(Array(5).fill('2026-09-28'), TODAY, 5).weekComplete, true);
});

test('achievements unlock from stats', () => {
  assert.deepEqual(computeGame(createEmptySave(), TODAY).unlocked, []);
  const one = computeGame(saveWith([TODAY]), TODAY);
  assert.ok(one.unlocked.includes('first-blood'));
  assert.ok(!one.unlocked.includes('apps-10'));

  const ten = computeGame(saveWith(Array.from({ length: 10 }, (_, i) => addDays(TODAY, -i))), TODAY);
  for (const id of ['apps-5', 'apps-10', 'streak-3', 'streak-7', 'target']) assert.ok(ten.unlocked.includes(id), id);
  assert.ok(!ten.unlocked.includes('hat-trick'));

  assert.ok(computeGame(saveWith([TODAY, TODAY, TODAY]), TODAY).unlocked.includes('hat-trick'));
});

test('Deadline Dodger needs MORE than 14 days before the deadline', () => {
  assert.ok(!computeGame(saveWith([TODAY], { deadline: '2026-10-14' }), TODAY).unlocked.includes('dodger'));
  assert.ok(computeGame(saveWith([TODAY], { deadline: '2026-10-15' }), TODAY).unlocked.includes('dodger'));
});

test('First Superday and stage counts', () => {
  let save = saveWith([TODAY, TODAY]);
  save = setStatus(save, save.applications[0].id, 'assessmentCentre', TODAY);
  const game = computeGame(save, TODAY);
  assert.ok(game.unlocked.includes('first-superday'));
  assert.equal(game.stageCounts.applied, 1);
  assert.equal(game.stageCounts.assessmentCentre, 1);
  assert.equal(game.stats.live, 2);
});

test('offer chance: 1 - product of (1 - p)', () => {
  const settings = DEFAULT_SETTINGS;
  assert.equal(offerChance([], settings), 0);
  let save = saveWith([TODAY, TODAY]);
  assert.ok(Math.abs(offerChance(save.applications, settings) - (1 - 0.97 * 0.97)) < 1e-12);

  // A later stage counts for more; rejected and wishlist count for nothing.
  save = setStatus(save, save.applications[0].id, 'assessmentCentre', TODAY); // 3% x 10 = 30%
  assert.ok(Math.abs(offerChance(save.applications, settings) - (1 - 0.7 * 0.97)) < 1e-12);
  save = setStatus(save, save.applications[0].id, 'rejected', TODAY);
  save = setStatus(save, save.applications[1].id, 'wishlist', TODAY);
  assert.equal(offerChance(save.applications, settings), 0);

  save = setStatus(save, save.applications[1].id, 'offer', TODAY);
  assert.equal(offerChance(save.applications, settings), 1);
});

test('offer chance projections', () => {
  assert.ok(Math.abs(chanceAfterMore(0, 5, 0.03) - (1 - 0.97 ** 5)) < 1e-12);
  const n = appsToReach(0, 0.5, 0.03);
  assert.equal(n, 23); // 0.97^23 is the first power below 0.5
  assert.ok(chanceAfterMore(0, n, 0.03) >= 0.5 && chanceAfterMore(0, n - 1, 0.03) < 0.5);
  assert.equal(appsToReach(0.6, 0.5, 0.03), 0);
  assert.equal(appsToReach(0, 0.5, 0), null);
});

test('start quest moves it from the board to the tracker as a wishlist entry', () => {
  let save = addQuests(createEmptySave(), [makeQuest({ company: 'A', role: 'Spring Week', type: 'spring-week', deadline: '2026-11-01', link: 'https://example.com' }, TODAY)]);
  save = startQuest(save, save.quests[0].id, TODAY);
  assert.equal(save.quests.length, 0);
  assert.equal(save.applications.length, 1);
  assert.equal(save.applications[0].status, 'wishlist');
  assert.equal(save.applications[0].type, 'spring-week');
  assert.equal(computeGame(save, TODAY).totalXp, 0);
});

test('normaliseSave repairs missing or broken data', () => {
  assert.deepEqual(normaliseSave(null).applications, []);
  const save = normaliseSave({ applications: [{ company: 'A', status: 'nonsense' }, 'junk'], settings: { xp: { applied: 'abc' }, weeklyTarget: 0 } });
  assert.equal(save.applications.length, 1);
  assert.equal(save.applications[0].status, 'wishlist');
  assert.deepEqual(save.applications[0].history, []);
  assert.equal(save.settings.xp.applied, 100);
  assert.equal(save.settings.xp.offer, 1000);
  assert.equal(save.settings.weeklyTarget, 1);
  assert.equal(computeGame(save, TODAY).totalXp, 0); // and it doesn't crash
});
