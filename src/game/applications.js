// Every change to the save file is a small pure function here:
// it takes the old save and returns a NEW save, never editing the old one.
// React needs that (it spots changes by comparing objects), and it makes the
// rules easy to test.

import { PIPELINE } from './defaults.js';

const newId = () => crypto.randomUUID();
const clean = (value) => String(value ?? '').trim();

// The day this application was sent, or null if it is still on the wishlist.
export function getDateApplied(app) {
  return app.history.find((h) => h.status === 'applied')?.date ?? null;
}

// Furthest pipeline stage this application ever reached (even if it was
// rejected afterwards), or null.
export function furthestStage(app) {
  let best = null;
  for (const stage of PIPELINE) {
    if (app.history.some((h) => h.status === stage)) best = stage;
  }
  return best;
}

// Move an application to `status` on `date`, keeping its history consistent.
//  - wishlist: not sent yet, so the history is wiped.
//  - moving forward: the new stage is added to the history.
//  - moving backward: treated as fixing a mistake, so later stages are removed.
//  - rejected: stages already reached are kept (you earned that XP).
export function applyStatus(app, status, date) {
  if (status === 'wishlist') return { ...app, status, history: [] };

  let history = app.history.filter((h) => h.status !== 'rejected');
  // You can't reach any stage without having applied first.
  if (!history.some((h) => h.status === 'applied')) history = [{ status: 'applied', date }, ...history];

  if (status === 'rejected') {
    history = [...history, { status: 'rejected', date }];
  } else {
    const index = PIPELINE.indexOf(status);
    history = history.filter((h) => PIPELINE.indexOf(h.status) <= index);
    if (!history.some((h) => h.status === status)) history = [...history, { status, date }];
  }
  return { ...app, status, history };
}

function setDateApplied(app, date) {
  return { ...app, history: app.history.map((h) => (h.status === 'applied' ? { ...h, date } : h)) };
}

// The fields shared by quests and applications, tidied up.
function details(fields) {
  return {
    company: clean(fields.company),
    role: clean(fields.role),
    type: fields.type || 'summer',
    division: clean(fields.division),
    link: clean(fields.link),
    deadline: fields.deadline || null,
    rolling: Boolean(fields.rolling),
    notes: clean(fields.notes),
  };
}

// Create (id = null) or edit an application from the form's fields.
export function saveApplication(save, id, fields, today) {
  const existing = id ? save.applications.find((a) => a.id === id) : null;
  let app = existing
    ? { ...existing, ...details(fields) }
    : { id: newId(), ...details(fields), status: 'wishlist', history: [], createdAt: today };

  const status = fields.status || 'applied';
  if (status !== app.status) app = applyStatus(app, status, today);
  // The form's "date applied" wins over today's date (for logging old applications).
  if (fields.dateApplied && getDateApplied(app)) app = setDateApplied(app, fields.dateApplied);

  const applications = existing
    ? save.applications.map((a) => (a.id === id ? app : a))
    : [...save.applications, app];
  return { ...save, applications };
}

export function setStatus(save, id, status, today) {
  return {
    ...save,
    applications: save.applications.map((a) => (a.id === id && a.status !== status ? applyStatus(a, status, today) : a)),
  };
}

export function deleteApplication(save, id) {
  return { ...save, applications: save.applications.filter((a) => a.id !== id) };
}

// ---- quest board ----

export function makeQuest(fields, today, source = 'manual') {
  return { id: newId(), ...details(fields), source, addedAt: today };
}

export function addQuests(save, quests) {
  return { ...save, quests: [...save.quests, ...quests] };
}

export function updateQuest(save, id, fields) {
  return { ...save, quests: save.quests.map((q) => (q.id === id ? { ...q, ...details(fields) } : q)) };
}

export function deleteQuest(save, id) {
  return { ...save, quests: save.quests.filter((q) => q.id !== id) };
}

// "Start quest": take it off the board and put it in the tracker as a wishlist
// entry. XP is only awarded once it is marked Applied.
export function startQuest(save, id, today) {
  const quest = save.quests.find((q) => q.id === id);
  if (!quest) return save;
  const { source, addedAt, ...rest } = quest;
  const app = { ...rest, id: newId(), status: 'wishlist', history: [], createdAt: today };
  return {
    ...save,
    quests: save.quests.filter((q) => q.id !== id),
    applications: [...save.applications, app],
  };
}

// Used to spot duplicates when importing: same company and role, ignoring
// capitals, punctuation and spacing.
export function questKey(item) {
  const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${norm(item.company)}|${norm(item.role)}`;
}
