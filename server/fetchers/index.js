// Auto-fetchers: optional modules that download open opportunities from a website.
//
// NONE ARE ENABLED. Both sites this project was built around rule it out:
//   - The Trackr: Terms of Use s.11.3(a) forbid scraping or extracting data
//     "by automated or systematic means without our written permission".
//   - Bright Network: blocks automated requests with a browser check.
// Use paste import or CSV import for those instead.
//
// Before adding a fetcher, read the site's terms and robots.txt and only go
// ahead if automated access is allowed (or you have written permission).
//
// To add one: copy _template.js to e.g. mySource.js, fill it in, then import it
// here and add it to the list. Each fetcher runs inside its own try/catch with
// a time limit, so a broken one reports an error instead of breaking the app.

// import mySource from './mySource.js';

const fetchers = [
  // mySource,
];

const TIME_LIMIT_MS = 20000;

export function listFetchers() {
  return fetchers.map(({ id, name, permission }) => ({ id, name, permission }));
}

export async function runFetcher(id) {
  const fetcher = fetchers.find((f) => f.id === id);
  if (!fetcher) return { ok: false, error: `No fetcher called "${id}"` };
  try {
    const quests = await fetcher.fetch(AbortSignal.timeout(TIME_LIMIT_MS));
    if (!Array.isArray(quests)) throw new Error('Fetcher did not return a list');
    return { ok: true, quests };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
