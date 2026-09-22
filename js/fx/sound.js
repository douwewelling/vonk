// Alle geluiden worden live gesynthetiseerd met Web Audio, er zijn geen audiobestanden nodig.

import { state } from '../store.js';

let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.34;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const on = () => state.settings.sound && ac();
const semi = (f, n) => f * Math.pow(2, n / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];

function tone(freq, { t = 0, dur = 0.18, type = 'sine', vol = 0.3, attack = 0.006, slideTo = null, detune = 0 } = {}) {
  const c = ctx;
  const t0 = c.currentTime + t;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

let noiseBuf = null;
function noise({ t = 0, dur = 0.3, vol = 0.15, freq = 2000, type = 'bandpass', sweepTo = null, q = 0.8 } = {}) {
  const c = ctx;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + t;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.04, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function chime(freq, t = 0, vol = 0.22, dur = 0.5) {
  tone(freq, { t, dur, vol, type: 'sine' });
  tone(freq * 2, { t, dur: dur * 0.6, vol: vol * 0.25, type: 'sine' });
  tone(freq * 3.01, { t, dur: dur * 0.35, vol: vol * 0.08, type: 'sine' });
}

export const sfx = {
  unlock() {
    ac();
  },
  tap() {
    if (!on()) return;
    tone(1250, { dur: 0.035, vol: 0.06, type: 'triangle' });
  },
  pop() {
    if (!on()) return;
    tone(700, { dur: 0.08, vol: 0.14, slideTo: 1300 });
  },
  /** Stijgt in toonhoogte met je combo: elke goede beurt klinkt een stapje hoger. */
  correct(combo = 0) {
    if (!on()) return;
    const f = semi(587.33, PENTA[Math.min(combo, PENTA.length - 2)]);
    chime(f, 0, 0.26, 0.2);
    chime(semi(f, 7), 0.075, 0.24, 0.32);
  },
  close() {
    if (!on()) return;
    chime(659.25, 0, 0.2, 0.2);
    chime(783.99, 0.08, 0.16, 0.26);
  },
  wrong() {
    if (!on()) return;
    tone(233, { dur: 0.26, vol: 0.22, type: 'triangle', slideTo: 150 });
    tone(175, { t: 0.05, dur: 0.24, vol: 0.14, type: 'sine', slideTo: 120 });
  },
  combo(n = 5) {
    if (!on()) return;
    const lift = Math.min(10, Math.floor(n / 5) * 2);
    [0, 4, 7, 12, 16].forEach((s, i) => chime(semi(523.25, s + lift), i * 0.055, 0.17, 0.35));
  },
  crit() {
    if (!on()) return;
    [0, 7, 12, 19, 24].forEach((s, i) => tone(semi(880, s), { t: i * 0.035, dur: 0.16, vol: 0.09, type: 'square' }));
    noise({ dur: 0.4, vol: 0.07, freq: 6000, type: 'highpass' });
  },
  golden() {
    if (!on()) return;
    [0, 4, 7, 11, 14, 19, 23].forEach((s, i) => chime(semi(783.99, s), i * 0.055, 0.14, 0.6));
    noise({ t: 0.05, dur: 0.8, vol: 0.05, freq: 9000, type: 'highpass' });
  },
  levelUp() {
    if (!on()) return;
    [0, 4, 7, 12].forEach((s, i) => tone(semi(392, s), { t: i * 0.09, dur: 0.22, vol: 0.14, type: 'triangle' }));
    [0, 4, 7, 12, 16].forEach((s) => chime(semi(523.25, s), 0.38, 0.12, 1.1));
    noise({ t: 0.36, dur: 0.9, vol: 0.05, freq: 8000, type: 'highpass' });
  },
  chestTap(n = 1) {
    if (!on()) return;
    tone(200 + n * 90, { dur: 0.14, vol: 0.22, type: 'triangle', slideTo: 140 + n * 110 });
    noise({ dur: 0.12, vol: 0.12, freq: 700 + n * 300 });
  },
  chestOpen(rarity = 0) {
    if (!on()) return;
    noise({ dur: 0.5, vol: 0.14, freq: 500, sweepTo: 6000 });
    const chord = [0, 4, 7, 12, 16, 19, 24].slice(0, 3 + rarity);
    chord.forEach((s, i) => chime(semi(523.25, s), 0.12 + i * 0.06, 0.15, 0.9));
  },
  ring() {
    if (!on()) return;
    [0, 5, 9, 12, 17].forEach((s, i) => chime(semi(440, s), i * 0.07, 0.14, 0.5));
  },
  tick(urgent = false) {
    if (!on()) return;
    tone(urgent ? 1500 : 1000, { dur: 0.03, vol: urgent ? 0.1 : 0.06, type: 'square' });
  },
  bossHit() {
    if (!on()) return;
    noise({ dur: 0.18, vol: 0.28, freq: 1400, type: 'lowpass' });
    tone(190, { dur: 0.18, vol: 0.32, slideTo: 60 });
  },
  bossAttack() {
    if (!on()) return;
    tone(98, { dur: 0.45, vol: 0.2, type: 'sawtooth', slideTo: 49 });
    noise({ dur: 0.35, vol: 0.2, freq: 380, type: 'lowpass' });
  },
  heal() {
    if (!on()) return;
    [0, 4, 7, 12].forEach((s, i) => chime(semi(659.25, s), i * 0.06, 0.13, 0.5));
  },
  victory() {
    if (!on()) return;
    [0, 4, 7].forEach((s, i) => tone(semi(392, s), { t: i * 0.12, dur: 0.18, vol: 0.14, type: 'triangle' }));
    [0, 4, 7, 12].forEach((s) => tone(semi(392, s + 5), { t: 0.42, dur: 0.9, vol: 0.09, type: 'triangle' }));
    [0, 4, 7, 12, 16, 19].forEach((s, i) => chime(semi(523.25, s), 0.45 + i * 0.05, 0.12, 1.2));
  },
  defeat() {
    if (!on()) return;
    [0, -3, -7, -12].forEach((s, i) => tone(semi(392, s), { t: i * 0.16, dur: 0.3, vol: 0.14, type: 'triangle' }));
  },
  match(i = 0) {
    if (!on()) return;
    chime(semi(659.25, PENTA[Math.min(i, PENTA.length - 1)]), 0, 0.22, 0.3);
  },
  record() {
    if (!on()) return;
    [0, 7, 12, 16, 19, 24].forEach((s, i) => chime(semi(587.33, s), i * 0.07, 0.15, 0.7));
  },
  whoosh() {
    if (!on()) return;
    noise({ dur: 0.35, vol: 0.1, freq: 700, sweepTo: 4000 });
  },
};
