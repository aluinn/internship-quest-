// The offer meter.
//
// This is a motivational toy, NOT a real prediction. It assumes every
// application is an independent coin-flip with a small chance of success:
//
//   P(at least one offer) = 1 - (1 - p1) x (1 - p2) x ... x (1 - pn)
//
// i.e. "one minus the chance that every single one fails".

const MAX_SINGLE = 0.95; // no single live application is ever treated as certain

// Chance that this one application turns into an offer.
export function appProbability(app, settings) {
  if (app.status === 'offer') return 1;
  if (app.status === 'wishlist' || app.status === 'rejected') return 0;
  const multiplier = settings.stageProbability[app.status] ?? 1;
  return Math.min(MAX_SINGLE, Math.max(0, settings.baseProbability * multiplier));
}

export function offerChance(applications, settings) {
  let allFail = 1;
  for (const app of applications) allFail *= 1 - appProbability(app, settings);
  return 1 - allFail;
}

// What the meter would read after sending `n` more fresh applications.
export function chanceAfterMore(chance, n, baseProbability) {
  return 1 - (1 - chance) * Math.pow(1 - baseProbability, n);
}

// How many more fresh applications are needed to reach `target` (0-1).
// Returns null if it can't be reached (base chance of zero).
export function appsToReach(chance, target, baseProbability) {
  if (chance >= target) return 0;
  if (baseProbability <= 0 || target >= 1) return null;
  const n = Math.log((1 - target) / (1 - chance)) / Math.log(1 - baseProbability);
  return Math.ceil(n - 1e-9);
}
