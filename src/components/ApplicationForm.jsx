// "Log an application" / "edit application" pop-up.
import { useState } from 'react';
import Modal from './Modal.jsx';
import DetailsFields from './DetailsFields.jsx';
import { useGame } from '../GameContext.js';
import { STATUSES } from '../game/defaults.js';
import { getDateApplied } from '../game/applications.js';

export default function ApplicationForm({ options, onClose }) {
  const { save, today, actions } = useGame();
  const existing = options.id ? save.applications.find((a) => a.id === options.id) : null;

  // The form keeps its own copy of the fields until you press SAVE.
  const [values, setValues] = useState(() =>
    existing
      ? { ...existing, dateApplied: getDateApplied(existing) ?? today }
      : { company: '', role: '', type: 'summer', division: '', deadline: null, rolling: false, link: '', notes: '', status: 'applied', dateApplied: today },
  );
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = (event) => {
    event.preventDefault(); // stop the browser reloading the page
    if (!values.company.trim()) return;
    actions.saveApplication(existing?.id ?? null, values);
    onClose();
  };

  const xp = save.settings.xp.applied;
  return (
    <Modal title={existing ? 'EDIT APPLICATION' : 'LOG APPLICATION'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <DetailsFields values={values} set={set} />
        <div className="form-row">
          <label>
            <span className="pixel">STATUS</span>
            <select value={values.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {values.status !== 'wishlist' && (
            <label>
              <span className="pixel">DATE APPLIED</span>
              <input type="date" value={values.dateApplied ?? ''} max={today} onChange={(e) => set('dateApplied', e.target.value)} />
            </label>
          )}
        </div>
        <label>
          <span className="pixel">NOTES</span>
          <textarea rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Referral, contact, test type..." />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" className="btn btn-green">
            {existing ? 'SAVE' : values.status === 'wishlist' ? 'ADD TO WISHLIST' : `LOG IT  +${xp} XP`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
