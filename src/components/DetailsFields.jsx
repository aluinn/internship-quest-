// The form fields shared by "log application" and "add quest".
import { TYPES, DIVISIONS } from '../game/defaults.js';

// `values` is the form's state; `set(name, value)` changes one field.
export default function DetailsFields({ values, set }) {
  return (
    <>
      <div className="form-row">
        <label>
          <span className="pixel">COMPANY *</span>
          <input value={values.company} onChange={(e) => set('company', e.target.value)} placeholder="e.g. Goldman Sachs" autoFocus required />
        </label>
        <label>
          <span className="pixel">ROLE</span>
          <input value={values.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. 2027 Summer Analyst" />
        </label>
      </div>
      <div className="form-row">
        <label>
          <span className="pixel">TYPE</span>
          <select value={values.type} onChange={(e) => set('type', e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="pixel">DIVISION</span>
          <input value={values.division} onChange={(e) => set('division', e.target.value)} list="divisions" placeholder="e.g. Markets" />
          <datalist id="divisions">
            {DIVISIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="form-row">
        <label>
          <span className="pixel">DEADLINE</span>
          <input type="date" value={values.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={values.rolling} onChange={(e) => set('rolling', e.target.checked)} />
          <span>Rolling deadline (reviewed as they come in - apply early)</span>
        </label>
      </div>
      <label>
        <span className="pixel">LINK</span>
        <input value={values.link} onChange={(e) => set('link', e.target.value)} placeholder="https://..." inputMode="url" />
      </label>
    </>
  );
}
