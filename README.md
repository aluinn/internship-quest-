# Internship Quest

An 8-bit tracker for internship applications. Every application earns XP, you level up, and an "offer power" meter fills as you apply.

## Running it

Open this folder in VS Code, open the terminal (**Terminal → New Terminal**), and type:

```
npm run dev
```

That one command starts two things and opens the game in your browser at http://localhost:5173:

- **the save server** (`server/index.js`) – reads and writes your save file;
- **Vite** – serves the game itself and reloads the page whenever you edit a file in `src/`.

To stop it, click in the terminal and press **Ctrl + C**.

Other commands:

| Command | What it does |
| --- | --- |
| `npm install` | Downloads the libraries listed in `package.json` into `node_modules/`. Only needed once, or after deleting `node_modules`. |
| `npm test` | Runs the checks in `tests/` for the game rules and the importers. |
| `npm start` | Builds a finished version and serves it from one server at http://127.0.0.1:3001 (no auto-reload). |

## Your data

Everything is stored in `data/save.json` (created the first time you change something). It is plain text, so you can open it to see how the data is shaped.

- Each time the server starts it copies the save to `data/save.backup.json`.
- **Settings → Download backup** gives you a copy to keep elsewhere.
- XP, level, streak and badges are *not* stored. They are recalculated from your applications every time, so editing or deleting something can never leave them wrong.

## How the game works

| Stage reached | XP (change in Settings) |
| --- | --- |
| Applied | 100 |
| Online test | 150 |
| Video interview | 250 |
| Assessment centre / Superday | 400 |
| Offer | 1000 |
| Rejected ("battle experience") | 25 |

- **Levels:** level 1 → 2 costs 100 XP, and each level costs 100 more than the last.
- **Streak:** days in a row with at least one application. It survives until the end of the next day.
- **Daily quest:** your weekly target (Monday–Sunday) divided over the days left in the week.
- **Offer power:** a motivational estimate, not a prediction. Each live application gets a base chance (default 3%), multiplied once it reaches a later stage (×2 online test, ×4 video interview, ×10 assessment centre). The meter shows `1 − (1 − p₁)(1 − p₂)…`, the chance that at least one comes through.

## Filling the quest board

- **Add quest** – type one in.
- **Paste import** – copy rows from a tracker or job site and paste them. Tables keep their links. Plain lists work as one role per line: `Company - Role - 30 Nov 2026 - https://link`. You always get a preview to correct before anything is added.
- **CSV import** – load a spreadsheet saved as `.csv`. The import window has a template to download.

### Why nothing is fetched automatically

- **The Trackr:** its Terms of Use (s.11.3a) forbid extracting data "by automated or systematic means without our written permission".
- **Bright Network:** blocks automated requests with a browser check.

Copying rows yourself for your own use is fine, which is what paste import is for. If a source ever does allow automated access, `server/fetchers/` is ready: copy `_template.js`, fill it in, and add it to the list in `index.js`. Each fetcher runs separately, so a broken one only shows an error message.

## Where things are

```
server/
  index.js            the save server (4 small routes)
  storage.js          reads/writes data/save.json safely
  fetchers/           optional auto-fetchers (none enabled)
src/
  App.jsx             owns the save, switches screens, triggers celebrations
  game/               the rules - plain JavaScript, no React
    defaults.js         statuses, types, default settings
    applications.js     every change to the save (add, move stage, delete...)
    xp.js               XP and levels
    index.js            computeGame(): streak, weekly target, stats
    achievements.js     the badge list - add one object to add a badge
    probability.js      offer meter maths
    dates.js            date helpers
  importers/          paste and CSV parsing
  screens/            Title, Dashboard, QuestBoard, Applications, Achievements, Settings
  components/         reusable pieces (XP bar, meter, forms, board, table...)
  hooks/useSave.js    loads the save and auto-saves changes
  sound/sfx.js        8-bit sounds generated in the browser
  styles/retro.css    the whole look; colours are variables at the top
tests/                checks for game rules and importers
```

Good first things to change: the palette at the top of `src/styles/retro.css`, the rank titles in `src/game/xp.js`, or a new badge in `src/game/achievements.js`.
