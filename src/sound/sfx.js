// 8-bit sound effects, made on the fly with the Web Audio API - no sound files.
// Each effect is a list of [frequency in Hz, length in seconds] notes played
// with a square wave, the classic chiptune sound. A frequency of 0 is a rest.

let context = null;
let muted = false;

function getContext() {
  // Browsers only allow sound after the user has clicked or pressed a key,
  // which is one reason the game opens on a PRESS START screen.
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume();
  return context;
}

function play(notes, { wave = 'square', volume = 0.06 } = {}) {
  if (muted) return;
  try {
    const audio = getContext();
    let time = audio.currentTime;
    for (const [frequency, length] of notes) {
      if (frequency > 0) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = wave;
        oscillator.frequency.value = frequency;
        // Start at full volume and fade quickly so notes don't click.
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(time);
        oscillator.stop(time + length);
      }
      time += length;
    }
  } catch {
    // No audio available - the game works fine without it.
  }
}

export const sfx = {
  setMuted(value) {
    muted = value;
  },
  click: () => play([[660, 0.04]], { volume: 0.03 }),
  start: () => play([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.2]]),
  xp: () => play([[988, 0.07], [1319, 0.18]]), // the classic "coin"
  quest: () => play([[330, 0.07], [440, 0.07], [554, 0.12]]),
  achievement: () => play([[659, 0.09], [784, 0.09], [988, 0.09], [1319, 0.25]]),
  levelUp: () => play([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [0, 0.05], [784, 0.1], [1047, 0.35]]),
  reject: () => play([[220, 0.12], [165, 0.2]], { wave: 'triangle', volume: 0.12 }),
};
