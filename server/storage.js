// Reading and writing the save file (data/save.json).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The folder this file is in, then up one level into data/.
// (INTERNSHIP_QUEST_DATA lets tests point at a throwaway folder instead.)
const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.INTERNSHIP_QUEST_DATA || path.join(here, '..', 'data');
export const SAVE_PATH = path.join(DATA_DIR, 'save.json');
const BACKUP_PATH = path.join(DATA_DIR, 'save.backup.json');

// Returns the saved game, or null if there isn't one yet.
// A file that exists but can't be read throws, so the app stops rather than
// starting an empty game and saving over your data.
export async function readSave() {
  let text;
  try {
    text = await fs.readFile(SAVE_PATH, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null; // "no such file": first run
    throw error;
  }
  return JSON.parse(text);
}

// Saves are written one at a time, in order, by chaining them on this promise.
let queue = Promise.resolve();

export function writeSave(save) {
  const job = queue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Write to a temporary file, then rename it over the real one. A rename is
    // all-or-nothing, so a crash mid-save can't leave a half-written file.
    const temp = `${SAVE_PATH}.tmp`;
    await fs.writeFile(temp, JSON.stringify(save, null, 2));
    await fs.rename(temp, SAVE_PATH);
  });
  queue = job.catch(() => {}); // one failed save must not block the next
  return job;
}

// Each time the server starts, keep a copy of the save as it was.
// A save that can't be read is NOT copied, so a damaged file never replaces a good backup.
export async function backupSave() {
  try {
    const text = await fs.readFile(SAVE_PATH, 'utf8');
    JSON.parse(text); // throws if the file is damaged
    await fs.writeFile(BACKUP_PATH, text);
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Save file not backed up:', error.message);
  }
}
