// The player's avatar, drawn as a grid of coloured squares.
// Each letter in the map below is one pixel; the outfit changes with your rank.

const BODY = [
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSSH...',
  '...SESSES...',
  '...SSSSSS...',
  '....SMMS....',
  '..CCWTTWCC..',
  '.CCCWTTWCCC.',
  '.SCCCTTCCCS.',
  '..CCCCCCCC..',
  '...PP..PP...',
  '...BB..BB...',
];
const NO_HAT = '............';
const CROWN = '...K.KK.K...';

// One outfit per rank tier (see RANKS in game/xp.js): C = clothes, W = collar, T = tie.
const OUTFITS = [
  { C: '#3ddc84', W: '#3ddc84', T: '#3ddc84' }, // Fresher: hoodie
  { C: '#4d9de0', W: '#f4f4f4', T: '#4d9de0' }, // Spring Weeker: jumper over a shirt
  { C: '#f4f4f4', W: '#f4f4f4', T: '#ff5a5f' }, // Summer Intern: shirt and tie
  { C: '#2b3a67', W: '#f4f4f4', T: '#ff5a5f' }, // Analyst: navy suit
  { C: '#2b3a67', W: '#f4f4f4', T: '#ffd23f' }, // Associate: gold tie
  { C: '#4a4a5e', W: '#f4f4f4', T: '#8a5cf6' }, // Vice President
  { C: '#22223b', W: '#f4f4f4', T: '#ffd23f' }, // Director
  { C: '#5b2a86', W: '#f4f4f4', T: '#ffd23f', crown: true }, // Managing Director
  { C: '#ffd23f', W: '#f4f4f4', T: '#ff5a5f', crown: true }, // Partner
];

const FIXED = { H: '#5a3825', S: '#f2c29b', E: '#14142b', M: '#c9736b', P: '#22223b', B: '#0b0b17', K: '#ffd23f' };

export default function PixelSprite({ tier = 0, size = 120 }) {
  const outfit = OUTFITS[Math.min(tier, OUTFITS.length - 1)];
  const rows = [outfit.crown ? CROWN : NO_HAT, ...BODY];
  const colours = { ...FIXED, ...outfit };
  const pixels = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== '.') pixels.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={colours[ch]} />);
    });
  });
  return (
    <svg className="sprite" width={size} height={(size * rows.length) / 12} viewBox={`0 0 12 ${rows.length}`} shapeRendering="crispEdges" role="img" aria-label="Your character">
      {pixels}
    </svg>
  );
}
