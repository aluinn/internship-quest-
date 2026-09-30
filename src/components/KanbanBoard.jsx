// "My applications" as a board: one column per stage.
// Move a card with its arrow buttons, or drag it to another column.
import { useState } from 'react';
import { useGame } from '../GameContext.js';
import { STATUSES, typeLabel } from '../game/defaults.js';
import { furthestStage } from '../game/applications.js';
import { deadlineInfo } from '../utils.js';

// The order the arrow buttons step through (Rejected is a separate button).
const ORDER = ['wishlist', 'applied', 'onlineTest', 'videoInterview', 'assessmentCentre', 'offer'];

export default function KanbanBoard({ applications }) {
  const { save, game, today, actions, openAppForm } = useGame();
  const [dragOver, setDragOver] = useState(null); // column currently being hovered with a card

  const drop = (event, status) => {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData('text/plain');
    if (id) actions.setStatus(id, status);
  };

  return (
    <div className="kanban">
      {STATUSES.map((status) => {
        const cards = applications.filter((a) => a.status === status.id);
        const reward = save.settings.xp[status.id];
        return (
          <section
            key={status.id}
            className={`kanban-col st-${status.id} ${dragOver === status.id ? 'drag-over' : ''}`}
            onDragOver={(event) => {
              event.preventDefault(); // tells the browser "you may drop here"
              setDragOver(status.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(event) => drop(event, status.id)}
          >
            <h3 className="pixel kanban-head">
              {status.short.toUpperCase()} <span className="count">{cards.length}</span>
            </h3>
            {reward !== undefined && <div className="kanban-xp">+{reward} XP</div>}
            {cards.map((app) => {
              const step = ORDER.indexOf(app.status);
              const deadline = deadlineInfo(app, today);
              return (
                <article key={app.id} className="kanban-card" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', app.id)}>
                  <button className="card-title" onClick={() => openAppForm({ id: app.id })} title="Edit">
                    <strong>{app.company}</strong>
                    <span className="muted">{app.role}</span>
                  </button>
                  <div className="tags">
                    <span className="tag">{typeLabel(app.type)}</span>
                    {app.status === 'wishlist' && app.deadline && <span className={`tag ${deadline.tone}`}>{deadline.label}</span>}
                    <span className="tag xp">{game.perApp.get(app.id)?.total ?? 0} XP</span>
                  </div>
                  <div className="card-actions">
                    {/* step is -1 for rejected cards, which only get the "undo" button */}
                    {step > 0 && (
                      <button className="btn btn-small btn-ghost" onClick={() => actions.setStatus(app.id, ORDER[step - 1])} title={`Back to ${STATUSES.find((s) => s.id === ORDER[step - 1]).label}`}>
                        &lt;
                      </button>
                    )}
                    {step >= 0 && step < ORDER.length - 1 && (
                      <button className="btn btn-small btn-green" onClick={() => actions.setStatus(app.id, ORDER[step + 1])} title={`Move to ${STATUSES.find((s) => s.id === ORDER[step + 1]).label}`}>
                        &gt;
                      </button>
                    )}
                    {step >= 1 && step < ORDER.length - 1 && (
                      <button className="btn btn-small btn-red" onClick={() => actions.setStatus(app.id, 'rejected')} title="Rejected">
                        X
                      </button>
                    )}
                    {app.status === 'rejected' && (
                      <button className="btn btn-small btn-ghost" onClick={() => actions.setStatus(app.id, furthestStage(app) ?? 'applied')} title="Not rejected after all - put it back where it was">
                        UNDO
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {cards.length === 0 && <div className="kanban-empty">-</div>}
          </section>
        );
      })}
    </div>
  );
}
