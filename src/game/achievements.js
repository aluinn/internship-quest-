// Achievements (badges).
//
// Each one has a `test` that looks at the player's stats and says whether it is
// unlocked, and an optional `progress` that returns [current, goal] for the
// progress bar on the Achievements screen.
//
// To add a badge, add one more object to this list - nothing else needs to change.

export const ACHIEVEMENTS = [
  { id: 'first-blood', icon: '🗡️', name: 'First Blood', desc: 'Send your first application', test: (s) => s.applied >= 1, progress: (s) => [s.applied, 1] },
  { id: 'apps-5', icon: '🔥', name: 'Warming Up', desc: 'Send 5 applications', test: (s) => s.applied >= 5, progress: (s) => [s.applied, 5] },
  { id: 'apps-10', icon: '🔟', name: '10 Apps', desc: 'Send 10 applications', test: (s) => s.applied >= 10, progress: (s) => [s.applied, 10] },
  { id: 'apps-25', icon: '⚙️', name: 'Grinder', desc: 'Send 25 applications', test: (s) => s.applied >= 25, progress: (s) => [s.applied, 25] },
  { id: 'apps-50', icon: '🏭', name: '50 Apps', desc: 'Send 50 applications', test: (s) => s.applied >= 50, progress: (s) => [s.applied, 50] },
  { id: 'streak-3', icon: '⚡', name: 'On a Roll', desc: 'Apply 3 days in a row', test: (s) => s.bestStreak >= 3, progress: (s) => [s.bestStreak, 3] },
  { id: 'streak-7', icon: '🌋', name: '7-Day Streak', desc: 'Apply 7 days in a row', test: (s) => s.bestStreak >= 7, progress: (s) => [s.bestStreak, 7] },
  { id: 'hat-trick', icon: '🎩', name: 'Hat-Trick', desc: 'Send 3 applications in one day', test: (s) => s.maxPerDay >= 3, progress: (s) => [s.maxPerDay, 3] },
  { id: 'target', icon: '🎯', name: 'Target Locked', desc: 'Hit your weekly target', test: (s) => s.bestWeek >= s.weeklyTarget, progress: (s) => [s.bestWeek, s.weeklyTarget] },
  { id: 'dodger', icon: '⏰', name: 'Deadline Dodger', desc: 'Apply more than 2 weeks before a deadline', test: (s) => s.earlyApplications >= 1 },
  { id: 'all-seasons', icon: '🌱', name: 'All Seasons', desc: 'Apply to a spring week and a summer internship', test: (s) => s.types.has('spring-week') && s.types.has('summer') },
  { id: 'first-test', icon: '🧮', name: 'Number Cruncher', desc: 'Reach an online test', test: (s) => s.reached.onlineTest >= 1 },
  { id: 'first-video', icon: '📹', name: 'On Camera', desc: 'Reach a video interview', test: (s) => s.reached.videoInterview >= 1 },
  { id: 'first-superday', icon: '🏛️', name: 'First Superday', desc: 'Reach an assessment centre or superday', test: (s) => s.reached.assessmentCentre >= 1 },
  { id: 'thick-skin', icon: '🛡️', name: 'Thick Skin', desc: 'Survive 5 rejections', test: (s) => s.rejected >= 5, progress: (s) => [s.rejected, 5] },
  { id: 'level-10', icon: '⭐', name: 'Double Figures', desc: 'Reach level 10', test: (s) => s.level >= 10, progress: (s) => [s.level, 10] },
  { id: 'offer', icon: '👑', name: 'Final Boss', desc: 'Land an offer', test: (s) => s.reached.offer >= 1 },
];

export function unlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);
}
