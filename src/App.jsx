// App: the top of the tree. It owns the save file, works out the game state
// from it, and decides which screen is showing.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameContext } from './GameContext.js';
import { useSave } from './hooks/useSave.js';
import { sfx } from './sound/sfx.js';
import { safeUrl } from './utils.js';
import { computeGame } from './game/index.js';
import { todayDay } from './game/dates.js';
import { createEmptySave, normaliseSave, normaliseSettings } from './game/defaults.js';
import { ACHIEVEMENTS } from './game/achievements.js';
import * as rules from './game/applications.js';

import TitleScreen from './screens/TitleScreen.jsx';
import Dashboard from './screens/Dashboard.jsx';
import QuestBoard from './screens/QuestBoard.jsx';
import Applications from './screens/Applications.jsx';
import Achievements from './screens/Achievements.jsx';
import Settings from './screens/Settings.jsx';
import ApplicationForm from './components/ApplicationForm.jsx';
import XpBar from './components/XpBar.jsx';
import { Floaters, Toasts, LevelUp } from './components/Effects.jsx';

const SCREENS = [
  { id: 'dashboard', label: 'HUD', component: Dashboard },
  { id: 'quests', label: 'QUEST BOARD', component: QuestBoard },
  { id: 'applications', label: 'APPLICATIONS', component: Applications },
  { id: 'achievements', label: 'BADGES', component: Achievements },
  { id: 'settings', label: 'SETTINGS', component: Settings },
];

const SAVE_STATUS = { saving: 'SAVING...', saved: 'SAVED', 'save-error': 'SAVE FAILED - RETRYING', ready: '' };

// Today's date, refreshed every minute so the app notices midnight.
function useToday() {
  const [today, setToday] = useState(todayDay);
  useEffect(() => {
    const timer = setInterval(() => setToday(todayDay()), 60000);
    return () => clearInterval(timer);
  }, []);
  return today;
}

let nextEffectId = 1;

export default function App() {
  const { save, setSave, latest, status, error } = useSave();
  const today = useToday();
  const [started, setStarted] = useState(false);
  const [screen, setScreen] = useState('dashboard');
  const [appForm, setAppForm] = useState(null); // null = closed, { id } = edit, {} = new

  // Short-lived visual effects.
  const [floaters, setFloaters] = useState([]); // "+100 XP" rising text
  const [toasts, setToasts] = useState([]); // pop-up messages
  const [levelUp, setLevelUp] = useState(null);
  // useCallback keeps this the same function between renders; otherwise the
  // level-up screen would restart its auto-close timer every time App re-draws.
  const closeLevelUp = useCallback(() => setLevelUp(null), []);

  // Everything the HUD shows is recalculated whenever the save (or the date) changes.
  const game = useMemo(() => (save ? computeGame(save, today) : null), [save, today]);

  const soundOn = save?.settings.soundOn ?? true;
  useEffect(() => sfx.setMuted(!soundOn), [soundOn]);

  const toast = useCallback((message) => {
    const id = nextEffectId++;
    setToasts((list) => [...list, { id, ...message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);

  const floater = useCallback((text) => {
    const id = nextEffectId++;
    setFloaters((list) => [...list, { id, text }]);
    setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), 1600);
  }, []);

  // commit: the ONE way the save changes. It applies `change` (a function from
  // old save to new save), then compares the game before and after to decide
  // what to celebrate: XP gained, a level-up, new badges.
  const commit = useCallback(
    (change, { silent = false, sound = 'xp' } = {}) => {
      const before = latest.current;
      if (!before) return;
      let after = change(before);
      if (after === before) return;

      const was = computeGame(before, today);
      const now = computeGame(after, today);
      const newBadges = now.unlocked.filter((id) => !before.seenAchievements.includes(id));
      after = { ...after, seenAchievements: now.unlocked };
      setSave(after);

      const gained = now.totalXp - was.totalXp;
      const leveled = now.level > was.level;
      if (!silent && gained > 0) {
        floater(`+${gained} XP`);
        sfx[sound]();
      }
      if (!silent && leveled) {
        setLevelUp({ level: now.level, title: now.title, newRank: now.title !== was.title });
        setTimeout(sfx.levelUp, 350);
      }
      for (const id of newBadges) {
        const badge = ACHIEVEMENTS.find((a) => a.id === id);
        toast({ icon: badge.icon, title: 'BADGE UNLOCKED', text: badge.name, tone: 'gold' });
      }
      if (newBadges.length > 0 && !leveled) setTimeout(sfx.achievement, 450);
    },
    [latest, today, setSave, floater, toast],
  );

  // Everything the screens are allowed to do.
  const actions = useMemo(
    () => ({
      saveApplication(id, fields) {
        commit((s) => rules.saveApplication(s, id, fields, today), { sound: fields.status === 'rejected' ? 'reject' : 'xp' });
      },
      setStatus(id, status) {
        const app = latest.current.applications.find((a) => a.id === id);
        if (!app || app.status === status) return;
        commit((s) => rules.setStatus(s, id, status, today), { sound: status === 'rejected' ? 'reject' : 'xp' });
        if (status === 'rejected') toast({ icon: '🛡️', title: 'BATTLE EXPERIENCE', text: 'Every rejection makes you stronger.', tone: 'red' });
        if (status === 'offer') toast({ icon: '👑', title: 'OFFER!', text: `${app.company} said yes!`, tone: 'gold' });
      },
      deleteApplication: (id) => commit((s) => rules.deleteApplication(s, id), { silent: true }),
      addQuests(list, source) {
        commit((s) => rules.addQuests(s, list.map((q) => rules.makeQuest(q, today, source))), { silent: true });
        sfx.quest();
        toast({ icon: '📜', title: 'QUEST BOARD UPDATED', text: `${list.length} quest${list.length === 1 ? '' : 's'} added.` });
      },
      updateQuest: (id, fields) => commit((s) => rules.updateQuest(s, id, fields), { silent: true }),
      deleteQuest: (id) => commit((s) => rules.deleteQuest(s, id), { silent: true }),
      deleteQuests: (ids) => commit((s) => ({ ...s, quests: s.quests.filter((q) => !ids.includes(q.id)) }), { silent: true }),
      // Open the application page and move the quest into the tracker.
      startQuest(quest) {
        const url = safeUrl(quest.link);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
        commit((s) => rules.startQuest(s, quest.id, today), { silent: true });
        sfx.quest();
        toast({ icon: '⚔️', title: 'QUEST STARTED', text: 'Mark it APPLIED in your tracker to claim the XP.' });
      },
      updateSettings: (patch) => commit((s) => ({ ...s, settings: normaliseSettings({ ...s.settings, ...patch }) }), { silent: true }),
      setPlayerName: (name) => commit((s) => ({ ...s, player: { ...s.player, name } }), { silent: true }),
      replaceSave: (raw) => commit(() => normaliseSave(raw), { silent: true }),
      newGame: () => commit((s) => ({ ...createEmptySave(), settings: s.settings, player: s.player }), { silent: true }),
    }),
    [commit, latest, today, toast],
  );

  const context = useMemo(
    () => ({ save, game, today, actions, toast, goto: setScreen, openAppForm: (options = {}) => setAppForm(options) }),
    [save, game, today, actions, toast],
  );

  // ---- what to draw ----

  if (status === 'failed') {
    return (
      <div className="center-screen">
        <div className="panel">
          <h1 className="pixel red">SAVE FILE ERROR</h1>
          <p>{error}</p>
          <p>
            Nothing has been overwritten. Check that you started the app with <code>npm run dev</code> and that the terminal shows no errors, then
            reload this page.
          </p>
        </div>
      </div>
    );
  }
  if (!save) {
    return (
      <div className="center-screen">
        <p className="pixel blink">LOADING SAVE...</p>
      </div>
    );
  }
  if (!started) {
    return (
      <TitleScreen
        game={game}
        name={save.player.name}
        onStart={() => {
          sfx.start();
          setStarted(true);
        }}
      />
    );
  }

  const Screen = SCREENS.find((s) => s.id === screen).component;

  return (
    <GameContext.Provider value={context}>
      <div className="app">
        <header className="topbar">
          <button className="logo pixel" onClick={() => setScreen('dashboard')}>
            INTERNSHIP<span className="gold"> QUEST</span>
          </button>
          <div className="mini-hud">
            <span className="pixel">LV {game.level}</span>
            <XpBar into={game.into} need={game.need} small />
            <span className="pixel gold" title="Current streak">
              🔥{game.streak.current}
            </span>
          </div>
          <span className={`pixel save-status ${status}`}>{SAVE_STATUS[status] ?? ''}</span>
          <button
            className="btn btn-small btn-ghost"
            title={soundOn ? 'Mute sound' : 'Turn sound on'}
            aria-label={soundOn ? 'Mute sound' : 'Turn sound on'}
            onClick={() => actions.updateSettings({ soundOn: !soundOn })}
          >
            {soundOn ? 'SOUND ON' : 'SOUND OFF'}
          </button>
        </header>

        <nav className="tabs">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              className={`tab pixel ${s.id === screen ? 'active' : ''}`}
              onClick={() => {
                sfx.click();
                setScreen(s.id);
              }}
            >
              {s.label}
              {s.id === 'quests' && save.quests.length > 0 && <span className="tab-count">{save.quests.length}</span>}
            </button>
          ))}
        </nav>

        <main className="main">
          <Screen />
        </main>

        {appForm && <ApplicationForm options={appForm} onClose={() => setAppForm(null)} />}
        <Floaters items={floaters} />
        <Toasts items={toasts} />
        {levelUp && <LevelUp info={levelUp} onDone={closeLevelUp} />}
      </div>
    </GameContext.Provider>
  );
}
