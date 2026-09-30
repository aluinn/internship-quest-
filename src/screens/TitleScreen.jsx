// The title screen. Any key or click starts the game.
import { useEffect } from 'react';
import PixelSprite from '../components/PixelSprite.jsx';

export default function TitleScreen({ game, name, onStart }) {
  useEffect(() => {
    const onKey = (event) => {
      // Ignore keys that are part of browser shortcuts (Cmd+R and friends).
      if (!event.metaKey && !event.ctrlKey && !event.altKey) onStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <button className="title-screen" onClick={onStart}>
      <div className="title-stars" aria-hidden="true" />
      <h1 className="pixel title-logo">
        INTERNSHIP
        <span className="gold">QUEST</span>
      </h1>
      <PixelSprite tier={game.tier} size={144} />
      <p className="pixel blink title-start">PRESS START</p>
      <p className="title-sub">
        {game.stats.applied > 0
          ? `${name} · LV ${game.level} ${game.title} · ${game.stats.applied} application${game.stats.applied === 1 ? '' : 's'} sent`
          : 'Every application is XP. Press any key.'}
      </p>
    </button>
  );
}
