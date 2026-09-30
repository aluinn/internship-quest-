// My applications: the same list shown as a table or as a board by stage.
import { useMemo, useState } from 'react';
import { useGame } from '../GameContext.js';
import ApplicationsTable from '../components/ApplicationsTable.jsx';
import KanbanBoard from '../components/KanbanBoard.jsx';
import { STATUSES } from '../game/defaults.js';
import { getDateApplied } from '../game/applications.js';

const SORTS = {
  newest: { label: 'Newest first', compare: (a, b) => (getDateApplied(b) ?? '9999').localeCompare(getDateApplied(a) ?? '9999') },
  deadline: { label: 'Deadline', compare: (a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') },
  company: { label: 'Company A-Z', compare: (a, b) => a.company.localeCompare(b.company) },
  status: { label: 'Stage', compare: (a, b) => STATUSES.findIndex((s) => s.id === a.status) - STATUSES.findIndex((s) => s.id === b.status) },
};

export default function Applications() {
  const { save, openAppForm } = useGame();
  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const applications = useMemo(() => {
    const words = search.trim().toLowerCase();
    return save.applications
      .filter((a) => !words || `${a.company} ${a.role} ${a.division}`.toLowerCase().includes(words))
      .sort(SORTS[sort].compare); // filter() made a copy, so sorting it is safe
  }, [save.applications, search, sort]);

  return (
    <div>
      <div className="screen-head">
        <h1 className="pixel">MY APPLICATIONS</h1>
        <div className="head-actions">
          <button className="btn btn-green" onClick={() => openAppForm()}>
            + LOG APPLICATION
          </button>
          <div className="toggle">
            <button className={`btn ${view === 'board' ? '' : 'btn-ghost'}`} onClick={() => setView('board')}>
              BOARD
            </button>
            <button className={`btn ${view === 'table' ? '' : 'btn-ghost'}`} onClick={() => setView('table')}>
              TABLE
            </button>
          </div>
        </div>
      </div>

      {save.applications.length === 0 ? (
        <div className="panel empty">
          <h2 className="pixel">NOTHING LOGGED YET</h2>
          <p>Log your first application to earn XP, or start a quest from the quest board.</p>
        </div>
      ) : (
        <>
          <div className="filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, role, division..." aria-label="Search applications" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {Object.entries(SORTS).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
            {view === 'board' && <span className="muted">Drag a card to another column, or use its arrows.</span>}
          </div>
          {view === 'board' ? <KanbanBoard applications={applications} /> : <ApplicationsTable applications={applications} />}
        </>
      )}
    </div>
  );
}
