// The back end: a tiny web server whose main job is to keep your save file on disk.
// The browser can't write files itself, so the React app asks this server to.
//
//   GET  /api/save         -> read the save file
//   PUT  /api/save         -> replace the save file
//   GET  /api/fetchers     -> list auto-fetchers (none enabled by default)
//   POST /api/fetch/:id    -> run one auto-fetcher

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSave, writeSave, backupSave, SAVE_PATH } from './storage.js';
import { listFetchers, runFetcher } from './fetchers/index.js';

const PORT = Number(process.env.PORT) || 3001;
const app = express();

// Understand JSON request bodies (up to 5 MB - far more than a save needs).
app.use(express.json({ limit: '5mb' }));

app.get('/api/save', async (req, res) => {
  try {
    res.json({ save: await readSave() });
  } catch (error) {
    console.error('Could not read the save file:', error.message);
    res.status(500).json({ error: `Could not read ${SAVE_PATH}: ${error.message}` });
  }
});

app.put('/api/save', async (req, res) => {
  const save = req.body;
  // A basic sanity check so a bad request can't wipe the file.
  if (!save || !Array.isArray(save.applications) || !Array.isArray(save.quests)) {
    return res.status(400).json({ error: 'That does not look like a save file.' });
  }
  try {
    await writeSave(save);
    res.json({ ok: true });
  } catch (error) {
    console.error('Could not write the save file:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/fetchers', (req, res) => res.json({ fetchers: listFetchers() }));
app.post('/api/fetch/:id', async (req, res) => res.json(await runFetcher(req.params.id)));

// After `npm run build` there is a dist/ folder holding the finished front end.
// `npm start` serves it from here, so the whole app runs on this one server.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
}

await backupSave();

// 127.0.0.1 means "this computer only": nobody else on your network can reach it.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Save server running at http://127.0.0.1:${PORT}  (save file: ${SAVE_PATH})`);
});
