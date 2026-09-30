// The little celebrations: floating "+100 XP", pop-up toasts, and the level-up screen.
import { useEffect } from 'react';

export function Floaters({ items }) {
  return (
    <div className="floaters" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="floater pixel">
          {item.text}
        </div>
      ))}
    </div>
  );
}

export function Toasts({ items }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.tone ?? ''}`}>
          <span className="toast-icon">{item.icon}</span>
          <div>
            <div className="pixel toast-title">{item.title}</div>
            <div>{item.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LevelUp({ info, onDone }) {
  // Close by itself after a few seconds (or on click).
  useEffect(() => {
    const timer = setTimeout(onDone, 3200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="overlay levelup" onClick={onDone}>
      <div className="levelup-box">
        <div className="pixel levelup-title">LEVEL UP!</div>
        <div className="pixel levelup-level">LV {info.level}</div>
        <div className="pixel gold">{info.newRank ? `NEW RANK: ${info.title.toUpperCase()}` : info.title.toUpperCase()}</div>
      </div>
    </div>
  );
}
