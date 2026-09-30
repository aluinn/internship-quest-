// A pop-up window. Click the dark background or press Escape to close it.
import { useEffect } from 'react';

export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`panel modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2 className="pixel">{title}</h2>
          <button className="btn btn-small btn-ghost" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
