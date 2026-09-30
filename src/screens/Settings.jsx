// Settings: tune the XP values, the offer meter, your weekly target and sound,
// and back up or reset your data.
import { useRef, useState } from 'react';
import { useGame } from '../GameContext.js';
import { DEFAULT_SETTINGS, STATUSES } from '../game/defaults.js';
import { todayDay } from '../game/dates.js';
import { downloadText } from '../utils.js';

// A number box that lets you type freely (including clearing it) and only
// passes on real numbers. While you're typing it shows your text; otherwise
// it shows the saved value.
function NumberField({ label, value, onChange, min = 0, max, step = 1, suffix }) {
  const [draft, setDraft] = useState(null); // null = not being edited
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="number-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft ?? String(value)}
          onFocus={() => setDraft(String(value))}
          onBlur={() => setDraft(null)}
          onChange={(event) => {
            setDraft(event.target.value);
            const number = Number(event.target.value);
            if (event.target.value !== '' && Number.isFinite(number) && number >= min && (max === undefined || number <= max)) onChange(number);
          }}
        />
        {suffix && <span className="muted">{suffix}</span>}
      </span>
    </label>
  );
}

const XP_LABELS = { ...Object.fromEntries(STATUSES.map((s) => [s.id, s.label])), rejected: 'Rejected (battle experience)' };

export default function Settings() {
  const { save, actions, toast } = useGame();
  const { settings } = save;
  const fileInput = useRef(null);

  const setXp = (key, value) => actions.updateSettings({ xp: { ...settings.xp, [key]: value } });
  const setMultiplier = (key, value) => actions.updateSettings({ stageProbability: { ...settings.stageProbability, [key]: value } });

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.applications)) throw new Error('not a save file');
      if (window.confirm(`Replace everything with this backup (${data.applications.length} applications)? This cannot be undone.`)) {
        actions.replaceSave(data);
        toast({ icon: '💾', title: 'BACKUP LOADED', text: `${data.applications.length} applications restored.` });
      }
    } catch {
      toast({ icon: '⚠️', title: 'IMPORT FAILED', text: "That file isn't an Internship Quest backup.", tone: 'red' });
    }
  };

  return (
    <div>
      <div className="screen-head">
        <h1 className="pixel">SETTINGS</h1>
      </div>
      <div className="settings">
        <section className="panel">
          <h2 className="pixel">PLAYER</h2>
          <label>
            <span>Name</span>
            <input value={save.player.name} maxLength={20} onChange={(e) => actions.setPlayerName(e.target.value)} />
          </label>
          <NumberField label="Weekly target (applications per week)" value={settings.weeklyTarget} min={1} max={50} onChange={(n) => actions.updateSettings({ weeklyTarget: n })} />
          <label className="check">
            <input type="checkbox" checked={settings.soundOn} onChange={(e) => actions.updateSettings({ soundOn: e.target.checked })} />
            <span>Sound effects</span>
          </label>
        </section>

        <section className="panel">
          <h2 className="pixel">XP VALUES</h2>
          <p className="muted small">XP awarded the first time an application reaches each stage. Changing these re-scores everything you've already logged.</p>
          {Object.keys(settings.xp).map((key) => (
            <NumberField key={key} label={XP_LABELS[key]} value={settings.xp[key]} max={100000} step={5} suffix="XP" onChange={(n) => setXp(key, Math.round(n))} />
          ))}
        </section>

        <section className="panel">
          <h2 className="pixel">OFFER METER</h2>
          <p className="muted small">
            A motivational estimate only. Each live application gets the base chance, multiplied up once it reaches a later stage. The meter shows the chance
            that at least one turns into an offer.
          </p>
          <NumberField
            label="Base chance per application"
            value={+(settings.baseProbability * 100).toFixed(2)}
            max={50}
            step={0.5}
            suffix="%"
            onChange={(n) => actions.updateSettings({ baseProbability: n / 100 })}
          />
          {Object.keys(settings.stageProbability)
            .filter((key) => key !== 'applied')
            .map((key) => (
              <NumberField key={key} label={`${XP_LABELS[key]} multiplier`} value={settings.stageProbability[key]} max={100} step={0.5} suffix="× base" onChange={(n) => setMultiplier(key, n)} />
            ))}
        </section>

        <section className="panel">
          <h2 className="pixel">DATA</h2>
          <p className="muted small">
            Your game is saved automatically to <code>data/save.json</code> in the project folder. A backup is a copy you can keep somewhere safe.
          </p>
          <div className="stack">
            <button className="btn" onClick={() => downloadText(`internship-quest-backup-${todayDay()}.json`, JSON.stringify(save, null, 2), 'application/json')}>
              DOWNLOAD BACKUP
            </button>
            <input ref={fileInput} type="file" accept=".json,application/json" onChange={importBackup} hidden />
            <button className="btn btn-ghost" onClick={() => fileInput.current.click()}>
              LOAD BACKUP...
            </button>
            <button className="btn btn-ghost" onClick={() => window.confirm('Put XP values, offer meter and weekly target back to their defaults?') && actions.updateSettings({ ...DEFAULT_SETTINGS, soundOn: settings.soundOn })}>
              RESET SETTINGS TO DEFAULTS
            </button>
            <button
              className="btn btn-red"
              onClick={() => window.confirm('NEW GAME: delete every application and quest? Download a backup first if you might want them back.') && actions.newGame()}
            >
              NEW GAME (DELETE ALL DATA)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
