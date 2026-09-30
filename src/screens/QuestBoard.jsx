// The quest board: open opportunities you haven't started yet.
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../GameContext.js';
import QuestForm from '../components/QuestForm.jsx';
import ImportModal from '../components/ImportModal.jsx';
import { TYPES, typeLabel } from '../game/defaults.js';
import { deadlineInfo, safeUrl } from '../utils.js';

export default function QuestBoard() {
  const { save, today, actions, toast } = useGame();
  const [form, setForm] = useState(null); // null | { quest } (quest undefined = new)
  const [importer, setImporter] = useState(null); // null | { mode, initialRows }
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [soonOnly, setSoonOnly] = useState(false);

  // Ask the server which auto-fetchers exist (none, unless you add one).
  const [fetchers, setFetchers] = useState([]);
  const [fetching, setFetching] = useState(null);
  useEffect(() => {
    fetch('/api/fetchers')
      .then((response) => response.json())
      .then((body) => setFetchers(body.fetchers ?? []))
      .catch(() => setFetchers([]));
  }, []);

  const runFetcher = async (fetcher) => {
    setFetching(fetcher.id);
    try {
      const response = await fetch(`/api/fetch/${fetcher.id}`, { method: 'POST' });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setImporter({ mode: fetcher.id, initialRows: result.quests });
    } catch (error) {
      toast({ icon: '⚠️', title: 'FETCH FAILED', text: `${fetcher.name}: ${error.message}`, tone: 'red' });
    }
    setFetching(null);
  };

  // Work out each quest's deadline label once, then filter and sort.
  const quests = useMemo(() => {
    const words = search.trim().toLowerCase();
    return save.quests
      .map((quest) => ({ quest, deadline: deadlineInfo(quest, today) }))
      .filter(({ quest, deadline }) => {
        if (type !== 'all' && quest.type !== type) return false;
        if (soonOnly && deadline.tone !== 'urgent') return false;
        return !words || `${quest.company} ${quest.role} ${quest.division}`.toLowerCase().includes(words);
      })
      .sort((a, b) => {
        // Closed ones last, then soonest deadline first, then no-deadline ones.
        const rank = (d) => (d.tone === 'dead' ? 2 : d.days === null ? 1 : 0);
        return rank(a.deadline) - rank(b.deadline) || (a.deadline.days ?? 0) - (b.deadline.days ?? 0) || a.quest.company.localeCompare(b.quest.company);
      });
  }, [save.quests, today, search, type, soonOnly]);

  const closed = save.quests.filter((q) => deadlineInfo(q, today).tone === 'dead');

  return (
    <div>
      <div className="screen-head">
        <h1 className="pixel">QUEST BOARD</h1>
        <div className="head-actions">
          <button className="btn btn-green" onClick={() => setForm({})}>
            + ADD QUEST
          </button>
          <button className="btn" onClick={() => setImporter({ mode: 'paste' })}>
            PASTE IMPORT
          </button>
          <button className="btn" onClick={() => setImporter({ mode: 'csv' })}>
            CSV IMPORT
          </button>
          {fetchers.map((fetcher) => (
            <button key={fetcher.id} className="btn" disabled={fetching !== null} onClick={() => runFetcher(fetcher)} title={fetcher.permission}>
              {fetching === fetcher.id ? 'FETCHING...' : `FETCH: ${fetcher.name.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {save.quests.length > 0 && (
        <div className="filters">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, role, division..." aria-label="Search quests" />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={soonOnly} onChange={(e) => setSoonOnly(e.target.checked)} />
            <span>Closing within 7 days</span>
          </label>
          {closed.length > 0 && (
            <button
              className="btn btn-small btn-ghost"
              onClick={() => window.confirm(`Remove ${closed.length} closed quest${closed.length === 1 ? '' : 's'} from the board?`) && actions.deleteQuests(closed.map((q) => q.id))}
            >
              CLEAR {closed.length} CLOSED
            </button>
          )}
        </div>
      )}

      {save.quests.length === 0 ? (
        <div className="panel empty">
          <h2 className="pixel">NO QUESTS YET</h2>
          <p>Fill the board with roles you might apply to:</p>
          <ul>
            <li>
              <strong>Add quest</strong> - type one in.
            </li>
            <li>
              <strong>Paste import</strong> - copy rows from a tracker such as The Trackr or a list on Bright Network, and paste them in.
            </li>
            <li>
              <strong>CSV import</strong> - load a spreadsheet.
            </li>
          </ul>
          <p className="muted small">
            Nothing is downloaded from those sites automatically: The Trackr's terms don't allow automated extraction, and Bright Network blocks it. Copying rows
            yourself for your own use is fine.
          </p>
        </div>
      ) : quests.length === 0 ? (
        <p className="muted">No quests match those filters.</p>
      ) : (
        <div className="quest-grid">
          {quests.map(({ quest, deadline }) => (
            <article key={quest.id} className={`panel quest ${deadline.tone}`}>
              <div className="tags">
                <span className="tag">{typeLabel(quest.type)}</span>
                {quest.division && <span className="tag">{quest.division}</span>}
              </div>
              <h3 className="quest-company">{quest.company || '(no company)'}</h3>
              <p className="quest-role">{quest.role}</p>
              <div className="tags">
                <span className={`tag ${deadline.tone}`}>{deadline.tone === 'urgent' ? `⚠ ${deadline.label}` : deadline.label}</span>
                {quest.rolling && deadline.tone !== 'dead' && <span className="tag info">ROLLING - APPLY EARLY</span>}
              </div>
              <div className="quest-actions">
                <button className="btn btn-green" onClick={() => actions.startQuest(quest)} title={safeUrl(quest.link) ? 'Opens the application page and moves this to your tracker' : 'Moves this to your tracker (no link saved)'}>
                  START QUEST &gt;
                </button>
                <button className="btn btn-small btn-ghost" onClick={() => setForm({ quest })} title="Edit" aria-label="Edit quest">
                  EDIT
                </button>
                <button className="btn btn-small btn-ghost" onClick={() => window.confirm(`Remove ${quest.company} from the board?`) && actions.deleteQuest(quest.id)} title="Remove" aria-label="Remove quest">
                  DEL
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {form && <QuestForm quest={form.quest} onClose={() => setForm(null)} />}
      {importer && <ImportModal mode={importer.mode} initialRows={importer.initialRows} onClose={() => setImporter(null)} />}
    </div>
  );
}
