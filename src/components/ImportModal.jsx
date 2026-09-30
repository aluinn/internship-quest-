// Paste import and CSV import. Both end in the same place: a preview table
// where you can fix anything the parser got wrong before adding the quests.

import { useMemo, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { useGame } from '../GameContext.js';
import { TYPES } from '../game/defaults.js';
import { questKey } from '../game/applications.js';
import { parsePaste } from '../importers/pasteParser.js';
import { csvToQuests, CSV_TEMPLATE } from '../importers/csvParser.js';
import { downloadText } from '../utils.js';

export default function ImportModal({ mode, initialRows = null, onClose }) {
  const { save, today, actions } = useGame();
  const [text, setText] = useState('');
  const [defaultType, setDefaultType] = useState('summer');
  const [message, setMessage] = useState('');
  const fileInput = useRef(null);

  // Company+role pairs you already have, to flag duplicates.
  const known = useMemo(() => new Set([...save.quests, ...save.applications].map(questKey)), [save]);

  // Turn parsed quests into preview rows. Duplicates start un-ticked.
  const toPreview = (quests) => {
    const seen = new Set();
    return quests.map((quest, index) => {
      const key = questKey(quest);
      const duplicate = known.has(key) || seen.has(key);
      seen.add(key);
      return { ...quest, key: index, duplicate, include: !duplicate };
    });
  };

  // null until something has been parsed. Rows handed in directly (from an
  // auto-fetcher) skip straight to the preview.
  const [rows, setRows] = useState(() => (initialRows ? toPreview(initialRows) : null));

  const showPreview = (quests) => {
    const preview = toPreview(quests);
    setRows(preview);
    setMessage(preview.length === 0 ? 'Could not find any opportunities in that. Try copying the whole table, or use one line per role: Company - Role - deadline - link.' : '');
  };

  const options = { today, defaultType };

  // When you paste, the browser offers two versions of what was copied: plain
  // text, and HTML. The HTML one still has the table structure and the links,
  // so we grab both before the text lands in the box.
  const onPaste = (event) => {
    const pastedText = event.clipboardData.getData('text/plain');
    const html = event.clipboardData.getData('text/html');
    event.preventDefault();
    setText(pastedText);
    showPreview(parsePaste({ text: pastedText, html }, options));
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    showPreview(csvToQuests(await file.text(), options));
  };

  const edit = (key, name, value) => setRows((list) => list.map((row) => (row.key === key ? { ...row, [name]: value } : row)));
  const swap = () => setRows((list) => list.map((row) => ({ ...row, company: row.role, role: row.company })));

  const chosen = rows?.filter((row) => row.include && (row.company.trim() || row.role.trim())) ?? [];
  const importChosen = () => {
    actions.addQuests(chosen.map(({ key, duplicate, include, ...quest }) => quest), mode);
    onClose();
  };

  const title = mode === 'csv' ? 'CSV IMPORT' : mode === 'paste' ? 'PASTE IMPORT' : 'IMPORT';
  return (
    <Modal title={title} onClose={onClose} wide>
      {rows === null || rows.length === 0 ? (
        <div className="form">
          <label>
            <span className="pixel">IF THE TYPE ISN'T CLEAR FROM THE ROLE, TREAT IT AS</span>
            <select value={defaultType} onChange={(e) => setDefaultType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {mode === 'paste' && (
            <>
              <p>
                On a tracker or job site, select the rows you want (drag across the table), copy, then paste into this box. Tables keep their links;
                plain lists work as one role per line, like <code>Company - Role - 30 Nov 2026 - https://link</code>.
              </p>
              <textarea
                rows={9}
                value={text}
                onPaste={onPaste}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste here (Ctrl+V / Cmd+V)..."
                autoFocus
              />
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={onClose}>
                  CANCEL
                </button>
                <button className="btn" disabled={!text.trim()} onClick={() => showPreview(parsePaste({ text, html: '' }, options))}>
                  PARSE TEXT
                </button>
              </div>
            </>
          )}

          {mode === 'csv' && (
            <>
              <p>
                Choose a .csv file (from Excel or Google Sheets: File → Download → CSV). The first row should name the columns: Company, Role, Type,
                Division, Deadline, Rolling, Link. Only Company is required.
              </p>
              <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" onChange={onFile} hidden />
              <div className="form-actions">
                <button className="btn btn-ghost" onClick={() => downloadText('quests-template.csv', CSV_TEMPLATE, 'text/csv')}>
                  DOWNLOAD TEMPLATE
                </button>
                <button className="btn" onClick={() => fileInput.current.click()}>
                  CHOOSE CSV FILE
                </button>
              </div>
            </>
          )}
          {message && <p className="red">{message}</p>}
        </div>
      ) : (
        <div className="form">
          <p>
            Found {rows.length}. Check them over - you can edit any box, and untick rows you don't want.
            {rows.some((r) => r.duplicate) && ' Rows marked DUPLICATE are already on your board or in your tracker.'}
          </p>
          <div className="table-wrap">
            <table className="table preview">
              <thead>
                <tr>
                  <th></th>
                  <th>COMPANY</th>
                  <th>ROLE</th>
                  <th>TYPE</th>
                  <th>DEADLINE</th>
                  <th>ROLLING</th>
                  <th>LINK</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className={row.include ? '' : 'dim'}>
                    <td>
                      <input type="checkbox" checked={row.include} onChange={(e) => edit(row.key, 'include', e.target.checked)} aria-label="Include this row" />
                    </td>
                    <td>
                      <input value={row.company} onChange={(e) => edit(row.key, 'company', e.target.value)} aria-label="Company" />
                      {row.duplicate && <span className="tag urgent">DUPLICATE</span>}
                    </td>
                    <td>
                      <input value={row.role} onChange={(e) => edit(row.key, 'role', e.target.value)} aria-label="Role" />
                    </td>
                    <td>
                      <select value={row.type} onChange={(e) => edit(row.key, 'type', e.target.value)} aria-label="Type">
                        {TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="date" value={row.deadline ?? ''} onChange={(e) => edit(row.key, 'deadline', e.target.value || null)} aria-label="Deadline" />
                    </td>
                    <td>
                      <input type="checkbox" checked={row.rolling} onChange={(e) => edit(row.key, 'rolling', e.target.checked)} aria-label="Rolling deadline" />
                    </td>
                    <td>
                      <input value={row.link} onChange={(e) => edit(row.key, 'link', e.target.value)} aria-label="Link" placeholder="(none)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setRows(null)}>
              &lt; BACK
            </button>
            <button className="btn btn-ghost" onClick={swap} title="Use this if the parser put role titles in the company column">
              SWAP COMPANY / ROLE
            </button>
            <button className="btn btn-green" disabled={chosen.length === 0} onClick={importChosen}>
              ADD {chosen.length} QUEST{chosen.length === 1 ? '' : 'S'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
