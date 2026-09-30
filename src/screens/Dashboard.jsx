// The main HUD: your character, today's quest, the offer meter and your stats.
import { useGame } from '../GameContext.js';
import PixelSprite from '../components/PixelSprite.jsx';
import XpBar from '../components/XpBar.jsx';
import PowerMeter from '../components/PowerMeter.jsx';
import { STATUSES } from '../game/defaults.js';
import { chanceAfterMore, appsToReach } from '../game/probability.js';
import { deadlineInfo, percent } from '../utils.js';

const MILESTONES = [0.1, 0.25, 0.5, 0.75, 0.9];

export default function Dashboard() {
  const { save, game, today, actions, openAppForm, goto } = useGame();
  const { week, streak, stats } = game;
  const base = save.settings.baseProbability;

  // --- daily quest wording ---
  const remainingToday = Math.max(0, week.todayGoal - week.doneToday);
  let questText;
  if (week.weekComplete) questText = 'Weekly target smashed! Anything more is a bonus round.';
  else if (week.todayComplete) questText = "Today's quest complete. See you tomorrow!";
  else questText = `Send ${remainingToday} application${remainingToday === 1 ? '' : 's'} today to stay on pace.`;

  // --- offer meter wording ---
  const chance = game.offerChance;
  const nextMilestone = MILESTONES.find((m) => m > chance + 1e-9);
  const toMilestone = nextMilestone ? appsToReach(chance, nextMilestone, base) : null;

  // --- deadlines coming up in the next 7 days (board + wishlist) ---
  const closing = [
    ...save.quests.map((q) => ({ item: q, kind: 'quest' })),
    ...save.applications.filter((a) => a.status === 'wishlist').map((a) => ({ item: a, kind: 'wishlist' })),
  ]
    .map((entry) => ({ ...entry, deadline: deadlineInfo(entry.item, today) }))
    .filter((entry) => entry.deadline.tone === 'urgent')
    .sort((a, b) => a.deadline.days - b.deadline.days)
    .slice(0, 5);

  const maxStage = Math.max(1, ...Object.values(game.stageCounts));

  return (
    <div className="dashboard">
      <section className="panel player">
        <PixelSprite tier={game.tier} />
        <div className="player-info">
          <div className="pixel player-name">{save.player.name}</div>
          <div className="pixel gold player-level">LV {game.level}</div>
          <div className="pixel player-rank">{game.title.toUpperCase()}</div>
          <XpBar into={game.into} need={game.need} />
          <div className="muted">
            {game.totalXp} XP total
            {game.nextRank && ` · next rank "${game.nextRank.title}" at LV ${game.nextRank.level}`}
          </div>
        </div>
        <button className="btn btn-green btn-big" onClick={() => openAppForm()}>
          + LOG APPLICATION
        </button>
      </section>

      <section className="panel">
        <h2 className="pixel">DAILY QUEST</h2>
        <p className={`quest-text ${week.todayComplete || week.weekComplete ? 'green' : ''}`}>
          {week.todayComplete || week.weekComplete ? '✔ ' : '▶ '}
          {questText}
        </p>
        <div className="pixel label">
          THIS WEEK {week.done}/{week.target}
        </div>
        <div className="pips">
          {Array.from({ length: Math.min(week.target, 30) }, (_, i) => (
            <div key={i} className={`pip ${i < week.done ? 'on' : ''}`} />
          ))}
        </div>
        <p className="streak">
          <span className="pixel gold">🔥 {streak.current}-DAY STREAK</span>
          <span className="muted">
            {' '}
            best {streak.best}
            {streak.current > 0 && !streak.appliedToday && ' · apply today to keep it alive!'}
          </span>
        </p>
      </section>

      <section className="panel">
        <h2 className="pixel">OFFER POWER</h2>
        <PowerMeter chance={chance} />
        {chance >= 1 ? (
          <p className="green">Offer secured. You beat the game.</p>
        ) : base > 0 ? (
          <>
            <p>
              Apply to 5 more to reach <strong className="gold">{percent(chanceAfterMore(chance, 5, base))}</strong>.
            </p>
            {toMilestone > 0 && (
              <p>
                {toMilestone} more application{toMilestone === 1 ? '' : 's'} to hit {Math.round(nextMilestone * 100)}%.
              </p>
            )}
          </>
        ) : null}
        <p className="muted small">
          A motivational estimate, not a real prediction. It assumes each live application has a {+(base * 100).toFixed(1)}% chance of an offer (more at
          later stages) and shows the chance that at least one comes through. Change it in Settings.
        </p>
      </section>

      <section className="panel">
        <h2 className="pixel">STATS</h2>
        <div className="tiles">
          <div className="tile">
            <div className="pixel tile-value">{stats.applied}</div>
            <div className="tile-label">applications sent</div>
          </div>
          <div className="tile">
            <div className="pixel tile-value">{stats.live}</div>
            <div className="tile-label">still live</div>
          </div>
          <div className="tile">
            <div className="pixel tile-value">{stats.offers}</div>
            <div className="tile-label">offers</div>
          </div>
          <div className="tile">
            <div className="pixel tile-value">
              {game.unlocked.length}
            </div>
            <div className="tile-label">badges</div>
          </div>
        </div>
        <div className="stages">
          {STATUSES.map((status) => (
            <div key={status.id} className="stage-row">
              <span className="stage-name">{status.short}</span>
              <div className="stage-bar">
                <div className={`stage-fill st-${status.id}`} style={{ width: `${(game.stageCounts[status.id] / maxStage) * 100}%` }} />
              </div>
              <span className="pixel stage-count">{game.stageCounts[status.id]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="pixel">CLOSING SOON</h2>
        {closing.length === 0 ? (
          <p className="muted">
            Nothing on your board closes in the next 7 days.{' '}
            <button className="link" onClick={() => goto('quests')}>
              Open the quest board
            </button>{' '}
            to add opportunities.
          </p>
        ) : (
          <ul className="closing">
            {closing.map(({ item, kind, deadline }) => (
              <li key={item.id}>
                <span className="tag urgent">{deadline.label}</span>
                <span className="closing-name">
                  <strong>{item.company}</strong> <span className="muted">{item.role}</span>
                </span>
                {kind === 'quest' ? (
                  <button className="btn btn-small" onClick={() => actions.startQuest(item)}>
                    START QUEST
                  </button>
                ) : (
                  <button className="btn btn-small btn-green" onClick={() => actions.setStatus(item.id, 'applied')}>
                    MARK APPLIED
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
