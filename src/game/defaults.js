// The fixed vocabulary of the game (statuses, types) and the default settings.
// Anything the Settings screen can change starts life here.

// Every status an application can have, in the order they appear on the board.
export const STATUSES = [
  { id: 'wishlist', label: 'Wishlist', short: 'Wishlist' },
  { id: 'applied', label: 'Applied', short: 'Applied' },
  { id: 'onlineTest', label: 'Online test', short: 'Online test' },
  { id: 'videoInterview', label: 'Video interview', short: 'Video int.' },
  { id: 'assessmentCentre', label: 'Assessment centre / Superday', short: 'AC / Superday' },
  { id: 'offer', label: 'Offer', short: 'Offer' },
  { id: 'rejected', label: 'Rejected', short: 'Rejected' },
];

// The stages that earn XP, earliest first.
export const PIPELINE = ['applied', 'onlineTest', 'videoInterview', 'assessmentCentre', 'offer'];

// "Live" applications are still in play: sent, but no final answer yet.
export const LIVE = ['applied', 'onlineTest', 'videoInterview', 'assessmentCentre'];

export const TYPES = [
  { id: 'spring-week', label: 'Spring week' },
  { id: 'summer', label: 'Summer internship' },
  { id: 'off-cycle', label: 'Off-cycle' },
  { id: 'grad', label: 'Graduate' },
];

// Suggestions for the division box (you can still type anything).
export const DIVISIONS = [
  'Investment Banking',
  'Markets',
  'Asset Management',
  'Wealth Management',
  'Research',
  'Private Equity',
  'Risk',
  'Operations',
  'Technology',
];

export const DEFAULT_SETTINGS = {
  // XP awarded the first time an application reaches each stage.
  xp: {
    applied: 100,
    onlineTest: 150,
    videoInterview: 250,
    assessmentCentre: 400,
    offer: 1000,
    rejected: 25, // "battle experience"
  },
  // Offer meter: chance that a freshly-sent application becomes an offer.
  baseProbability: 0.03,
  // ...multiplied by this once the application has reached a later stage.
  stageProbability: {
    applied: 1,
    onlineTest: 2,
    videoInterview: 4,
    assessmentCentre: 10,
  },
  weeklyTarget: 5,
  soundOn: true,
};

export const SAVE_VERSION = 1;

export function createEmptySave() {
  return {
    version: SAVE_VERSION,
    player: { name: 'PLAYER 1' },
    settings: structuredClone(DEFAULT_SETTINGS),
    quests: [],
    applications: [],
    seenAchievements: [],
  };
}

const statusIds = STATUSES.map((s) => s.id);
const typeIds = TYPES.map((t) => t.id);

// A number setting from the file, or the default if it is missing or nonsense.
function numberOr(value, fallback, min = 0, max = Infinity) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normaliseSettings(raw = {}) {
  const d = DEFAULT_SETTINGS;
  const xp = {};
  for (const key of Object.keys(d.xp)) xp[key] = Math.round(numberOr(raw.xp?.[key], d.xp[key], 0, 100000));
  const stageProbability = {};
  for (const key of Object.keys(d.stageProbability)) {
    stageProbability[key] = numberOr(raw.stageProbability?.[key], d.stageProbability[key], 0, 100);
  }
  return {
    xp,
    stageProbability,
    baseProbability: numberOr(raw.baseProbability, d.baseProbability, 0, 0.5),
    weeklyTarget: Math.round(numberOr(raw.weeklyTarget, d.weeklyTarget, 1, 50)),
    soundOn: raw.soundOn !== false,
  };
}

// Fill in anything missing from a save file, so an old, hand-edited or imported
// file can never crash the app.
export function normaliseSave(raw) {
  const empty = createEmptySave();
  if (!raw || typeof raw !== 'object') return empty;
  const list = (value) => (Array.isArray(value) ? value.filter((x) => x && typeof x === 'object') : []);
  const text = (value) => (typeof value === 'string' ? value : '');

  const common = (item) => ({
    id: text(item.id) || crypto.randomUUID(),
    company: text(item.company),
    role: text(item.role),
    type: typeIds.includes(item.type) ? item.type : 'summer',
    division: text(item.division),
    link: text(item.link),
    deadline: text(item.deadline) || null,
    rolling: Boolean(item.rolling),
    notes: text(item.notes),
  });

  return {
    version: SAVE_VERSION,
    player: { name: text(raw.player?.name) || empty.player.name },
    settings: normaliseSettings(raw.settings),
    quests: list(raw.quests).map((q) => ({
      ...common(q),
      source: text(q.source) || 'manual',
      addedAt: text(q.addedAt) || null,
    })),
    applications: list(raw.applications).map((a) => ({
      ...common(a),
      status: statusIds.includes(a.status) ? a.status : 'wishlist',
      history: list(a.history).filter((h) => statusIds.includes(h.status) && typeof h.date === 'string'),
      createdAt: text(a.createdAt) || null,
    })),
    seenAchievements: Array.isArray(raw.seenAchievements) ? raw.seenAchievements.filter((x) => typeof x === 'string') : [],
  };
}

export function statusLabel(id, short = false) {
  const status = STATUSES.find((s) => s.id === id);
  return status ? (short ? status.short : status.label) : id;
}

export function typeLabel(id) {
  return TYPES.find((t) => t.id === id)?.label ?? id;
}
