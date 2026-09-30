// Badges: unlocked ones in colour, locked ones greyed out with progress.
import { useGame } from '../GameContext.js';
import { ACHIEVEMENTS } from '../game/achievements.js';

export default function Achievements() {
  const { game } = useGame();
  return (
    <div>
      <div className="screen-head">
        <h1 className="pixel">BADGES</h1>
        <span className="pixel gold">
          {game.unlocked.length} / {ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="badge-grid">
        {ACHIEVEMENTS.map((badge) => {
          const unlocked = game.unlocked.includes(badge.id);
          const [current, goal] = badge.progress ? badge.progress(game.stats) : [unlocked ? 1 : 0, 1];
          return (
            <div key={badge.id} className={`panel badge ${unlocked ? 'unlocked' : 'locked'}`}>
              <div className="badge-icon">{unlocked ? badge.icon : '🔒'}</div>
              <div className="pixel badge-name">{badge.name.toUpperCase()}</div>
              <div className="badge-desc">{badge.desc}</div>
              {!unlocked && goal > 1 && (
                <div className="badge-progress">
                  <div className="stage-bar">
                    <div className="stage-fill" style={{ width: `${Math.min(100, (current / goal) * 100)}%` }} />
                  </div>
                  <span className="muted">
                    {Math.min(current, goal)}/{goal}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
