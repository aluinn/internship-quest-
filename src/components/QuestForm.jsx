// "Add quest" / "edit quest" pop-up for the quest board.
import { useState } from 'react';
import Modal from './Modal.jsx';
import DetailsFields from './DetailsFields.jsx';
import { useGame } from '../GameContext.js';

export default function QuestForm({ quest, onClose }) {
  const { actions } = useGame();
  const [values, setValues] = useState(
    () => quest ?? { company: '', role: '', type: 'summer', division: '', deadline: null, rolling: false, link: '', notes: '' },
  );
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!values.company.trim()) return;
    if (quest) actions.updateQuest(quest.id, values);
    else actions.addQuests([values], 'manual');
    onClose();
  };

  return (
    <Modal title={quest ? 'EDIT QUEST' : 'ADD QUEST'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <DetailsFields values={values} set={set} />
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            CANCEL
          </button>
          <button type="submit" className="btn btn-green">
            {quest ? 'SAVE' : 'ADD TO BOARD'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
