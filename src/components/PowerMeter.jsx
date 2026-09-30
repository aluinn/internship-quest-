// The offer meter: a row of blocks that light up as the estimated chance rises.
import { percent } from '../utils.js';

const SEGMENTS = 20;

export default function PowerMeter({ chance }) {
  // Always light at least one block once there is any chance at all.
  const lit = chance <= 0 ? 0 : Math.max(1, Math.min(SEGMENTS, Math.round(chance * SEGMENTS)));
  return (
    <div className="meter" role="meter" aria-valuenow={Math.round(chance * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Estimated chance of at least one offer">
      <div className="meter-blocks">
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const zone = i < 7 ? 'low' : i < 14 ? 'mid' : 'high';
          return <div key={i} className={`meter-block ${i < lit ? `on ${zone}` : ''}`} />;
        })}
      </div>
      <div className="pixel meter-value">{percent(chance)}</div>
    </div>
  );
}
