// "My applications" as a table: one row each, with a status drop-down.
import { useGame } from '../GameContext.js';
import { STATUSES, typeLabel } from '../game/defaults.js';
import { getDateApplied } from '../game/applications.js';
import { formatDay } from '../game/dates.js';
import { deadlineInfo, safeUrl } from '../utils.js';

export default function ApplicationsTable({ applications }) {
  const { game, today, actions, openAppForm } = useGame();

  const remove = (app) => {
    if (window.confirm(`Delete ${app.company} - ${app.role || 'application'}? Its XP goes too.`)) actions.deleteApplication(app.id);
  };

  return (
    <div className="table-wrap panel">
      <table className="table">
        <thead>
          <tr>
            <th>COMPANY / ROLE</th>
            <th>TYPE</th>
            <th>DIVISION</th>
            <th>APPLIED</th>
            <th>DEADLINE</th>
            <th>STATUS</th>
            <th>XP</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const url = safeUrl(app.link);
            const deadline = deadlineInfo(app, today);
            const open = app.status === 'wishlist'; // deadlines only matter before you apply
            return (
              <tr key={app.id} className={app.status === 'rejected' ? 'dim' : ''}>
                <td>
                  <strong>{app.company}</strong>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="link-icon" title="Open application page">
                      ↗
                    </a>
                  )}
                  <div className="muted">{app.role}</div>
                </td>
                <td>{typeLabel(app.type)}</td>
                <td>{app.division}</td>
                <td>{formatDay(getDateApplied(app)) || '-'}</td>
                <td>
                  {app.deadline ? <span className={open ? `text-${deadline.tone}` : 'muted'}>{open ? deadline.label : formatDay(app.deadline)}</span> : app.rolling ? 'Rolling' : '-'}
                </td>
                <td>
                  <select className={`status-select st-${app.status}`} value={app.status} onChange={(e) => actions.setStatus(app.id, e.target.value)} aria-label="Status">
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="gold">{game.perApp.get(app.id)?.total ?? 0}</td>
                <td className="nowrap">
                  <button className="btn btn-small btn-ghost" onClick={() => openAppForm({ id: app.id })} title="Edit" aria-label="Edit">
                    EDIT
                  </button>
                  <button className="btn btn-small btn-ghost" onClick={() => remove(app)} title="Delete" aria-label="Delete">
                    DEL
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
