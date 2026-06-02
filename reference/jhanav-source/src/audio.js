let ctx = null, masterGain = null, enabled = true;

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(ctx.destination);
}

export function unlockAudio() {
  init();
  if (ctx.state === "suspended") ctx.resume();
}
export function setEnabled(on) { enabled = !!on; }
export function isEnabled() { return enabled; }

function tone({ freq = 440, type = "sine", dur = 0.2, attack = 0.005, decay, gain = 0.3, freqEnd, lp }) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  const decayTime = decay ?? dur - attack;
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decayTime);
  let node = osc;
  if (lp) {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp;
    osc.connect(f); node = f;
  }
  node.connect(g).connect(masterGain);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise({ dur = 0.2, gain = 0.2, lp, bpFreq, bpEnd }) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const samples = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) ch[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = src;
  if (lp != null) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; src.connect(f); node = f; }
  if (bpFreq != null) {
    const f = ctx.createBiquadFilter(); f.type = "bandpass";
    f.frequency.setValueAtTime(bpFreq, t);
    if (bpEnd != null) f.frequency.linearRampToValueAtTime(bpEnd, t + dur);
    node.connect(f); node = f;
  }
  node.connect(g).connect(masterGain);
  src.start(t); src.stop(t + dur);
}

export const sfx = {
  tilePickup:       () => tone({ freq: 200, type: "triangle", dur: 0.06, gain: 0.18 }),
  tileDropCorrect: () => { tone({ freq: 520, type: "triangle", dur: 0.08, gain: 0.22 });
                            setTimeout(() => tone({ freq: 1318, type: "sine", dur: 0.2, gain: 0.18 }), 50); },
  correctDing: () => {
    // Bright 3-note ascending arpeggio C5-E5-G5
    const notes = [523, 659, 784];
    notes.forEach((f, i) => setTimeout(() =>
      tone({ freq: f, type: "sine", dur: 0.18, gain: 0.28 }), i * 60));
    // Sparkle layer: high-pitched G6 with slow decay
    setTimeout(() => tone({ freq: 1568, type: "sine", dur: 0.4, gain: 0.18, decay: 0.4 }), 120);
  },
  // Longer, more festive ding for completing a whole multiplication problem.
  // Ascending C-major arpeggio + a top-octave bell shimmer.
  correctYay: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() =>
      tone({ freq: f, type: "triangle", dur: 0.22, gain: 0.26 }), i * 80));
    setTimeout(() => tone({ freq: 1568, type: "sine", dur: 0.5, gain: 0.2, decay: 0.5 }), 320);
    setTimeout(() => tone({ freq: 2093, type: "sine", dur: 0.5, gain: 0.16, decay: 0.5 }), 400);
  },
  tileDropWrong:    () => tone({ freq: 180, freqEnd: 90, type: "triangle", dur: 0.25, gain: 0.22, lp: 800 }),
  slotFill:         () => tone({ freq: 1568, type: "sine", dur: 0.12, gain: 0.2 }),
  carryWhoosh:     () => { noise({ dur: 0.5, gain: 0.15, bpFreq: 300, bpEnd: 800 });
                            setTimeout(() => tone({ freq: 1760, type: "sine", dur: 0.08, gain: 0.15 }), 450); },
  borrowWhoosh:    () => { noise({ dur: 0.6, gain: 0.18, lp: 1000, bpFreq: 600, bpEnd: 200 });
                            tone({ freq: 440, freqEnd: 220, type: "triangle", dur: 0.6, gain: 0.15 }); },
  blockTap: (count = 1) => {
    const freq = Math.min(2093, 523 + count * 60);
    tone({ freq, type: "sine", dur: 0.18, gain: 0.2 });
  },
  trayFull: () => { tone({ freq: 523, type: "sine", dur: 0.1, gain: 0.2 });
                    setTimeout(() => tone({ freq: 659, type: "sine", dur: 0.12, gain: 0.2 }), 100); },
  starDing: (n = 1) => {
    const notes = n === 1 ? [659] : n === 2 ? [659, 784] : [659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => tone({ freq: f, type: "sine", dur: 0.25, gain: 0.25 }), i * 150));
  },
  levelComplete:    () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
                              setTimeout(() => tone({ freq: f, type: "triangle", dur: 0.18, gain: 0.18 }), i * 90)); },
  nodeUnlockPop:    () => tone({ freq: 220, type: "square", dur: 0.08, gain: 0.2 }),
  lockedTap:        () => tone({ freq: 110, freqEnd: 70, type: "triangle", dur: 0.2, gain: 0.15, lp: 600 }),
  mascotChirp:     () => { tone({ freq: 1568, type: "triangle", dur: 0.06, gain: 0.15 });
                            setTimeout(() => tone({ freq: 1976, type: "triangle", dur: 0.06, gain: 0.15 }), 70); },
  hintHmm:          () => tone({ freq: 659, type: "sine", dur: 0.6, gain: 0.1, attack: 0.15 }),
  transition:       () => noise({ dur: 0.28, gain: 0.15, lp: 1500 }),
};
