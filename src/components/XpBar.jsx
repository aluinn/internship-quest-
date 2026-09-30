// The XP bar: `into` XP earned towards the next level, out of `need`.
export default function XpBar({ into, need, small = false }) {
  const width = Math.min(100, (into / need) * 100);
  return (
    <div className={`xpbar ${small ? 'small' : ''}`} role="progressbar" aria-valuenow={into} aria-valuemin={0} aria-valuemax={need} aria-label="XP towards next level">
      <div className="xpbar-fill" style={{ width: `${width}%` }} />
      {!small && (
        <span className="xpbar-text pixel">
          {into} / {need} XP
        </span>
      )}
    </div>
  );
}
