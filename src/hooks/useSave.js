// useSave: loads the save file when the app starts and writes it back
// (a moment after) every time it changes.

import { useCallback, useEffect, useRef, useState } from 'react';
import { normaliseSave } from '../game/defaults.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useSave() {
  const [save, setSaveState] = useState(null);
  // loading -> ready -> (saving -> saved)* ; or "failed" / "save-error"
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  // Refs hold values that must be up to date inside timers and event handlers.
  const latest = useRef(null); // the newest save, even before React re-renders
  const dirty = useRef(false); // true when there are changes not yet on disk
  const timer = useRef(null);

  // Load once on start-up. The save server can take a second to start, so retry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let problem = 'Could not reach the save server.';
      for (let attempt = 0; attempt < 20 && !cancelled; attempt += 1) {
        try {
          const response = await fetch('/api/save');
          const body = await response.json().catch(() => null);
          if (response.ok && body) {
            if (cancelled) return;
            const loaded = normaliseSave(body.save);
            latest.current = loaded;
            setSaveState(loaded);
            setStatus('ready');
            return;
          }
          // The server answered but could not read the file: retrying won't help.
          if (body?.error) {
            problem = body.error;
            break;
          }
        } catch {
          // Server not up yet - wait and try again.
        }
        await sleep(500);
      }
      if (!cancelled) {
        setError(problem);
        setStatus('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async (leaving = false) => {
    if (!dirty.current || !latest.current) return;
    dirty.current = false;
    setStatus('saving');
    try {
      const response = await fetch('/api/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest.current),
        keepalive: leaving, // lets the request finish even if the tab is closing
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      if (!dirty.current) setStatus('saved');
    } catch {
      dirty.current = true;
      setStatus('save-error');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), 3000); // keep trying
    }
  }, []);

  // Replace the save. Writing to disk waits 300ms so a burst of changes
  // (e.g. typing in Settings) becomes one write.
  const setSave = useCallback(
    (next) => {
      latest.current = next;
      setSaveState(next);
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), 300);
    },
    [flush],
  );

  // If the tab is closed during that 300ms, save straight away.
  useEffect(() => {
    const onLeave = () => {
      clearTimeout(timer.current);
      flush(true);
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [flush]);

  return { save, setSave, latest, status, error };
}
