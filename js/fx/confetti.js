// Lichtgewicht confetti en sterretjes op één canvas boven alles.

import { reducedMotion } from '../util.js';

export const PARTY = ['#FF375F', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#BF5AF2'];
export const GOLD = ['#FFD60A', '#FFE66D', '#FFB800', '#FFF4C2', '#FF9F0A'];

const canvas = document.getElementById('fx');
const g = canvas.getContext('2d');
let parts = [];
let raf = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
}
resize();
window.addEventListener('resize', resize);

function start() {
  if (!raf) raf = requestAnimationFrame(frame);
}

export function confetti({
  x = innerWidth / 2,
  y = innerHeight / 2,
  count = 70,
  spread = 70,
  angle = -90,
  power = 13,
  colors = PARTY,
  gravity = 0.32,
  scalar = 1,
  shapes = ['rect', 'rect', 'strip', 'circle'],
} = {}) {
  if (reducedMotion()) count = Math.min(count, 10);
  for (let i = 0; i < count; i++) {
    const a = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180;
    const v = power * (0.5 + Math.random() * 0.65);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      g: gravity,
      drag: 0.984,
      size: (5 + Math.random() * 6) * scalar,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      tilt: Math.random() * Math.PI * 2,
      vt: 0.07 + Math.random() * 0.12,
      life: 0,
      max: 120 + Math.random() * 70,
    });
  }
  start();
}

/** Sterretjes rond een punt, bijvoorbeeld bij een goed antwoord. */
export function sparkle(x, y, { colors = GOLD, count = 14, power = 5 } = {}) {
  if (reducedMotion()) count = Math.min(count, 4);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const v = power * (0.5 + Math.random() * 0.8);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      g: 0.04,
      drag: 0.93,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: 'star',
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      tilt: 0,
      vt: 0,
      life: 0,
      max: 38 + Math.random() * 22,
    });
  }
  start();
}

/** Groot feest: salvo's vanuit beide hoeken. */
export function celebrate({ colors = PARTY, big = false } = {}) {
  const w = innerWidth;
  const hgt = innerHeight;
  const n = big ? 110 : 70;
  confetti({ x: 0, y: hgt * 0.72, angle: -58, spread: 50, power: big ? 21 : 18, count: n, colors });
  confetti({ x: w, y: hgt * 0.72, angle: -122, spread: 50, power: big ? 21 : 18, count: n, colors });
  if (big) {
    setTimeout(() => confetti({ x: w / 2, y: hgt * 0.35, angle: -90, spread: 360, power: 11, count: 90, colors, gravity: 0.22 }), 260);
  }
}

function star(ctx, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? s : s * 0.32;
    const a = (i / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function frame() {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  const alive = [];
  for (const p of parts) {
    p.life++;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.tilt += p.vt;
    if (p.life > p.max || p.y > innerHeight + 40) continue;
    alive.push(p);
    const fade = p.life > p.max - 25 ? (p.max - p.life) / 25 : 1;
    g.save();
    g.globalAlpha = Math.max(0, fade);
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.fillStyle = p.color;
    if (p.shape === 'star') {
      star(g, p.size * (0.6 + 0.4 * Math.sin((p.life / p.max) * Math.PI)));
    } else {
      g.scale(1, Math.cos(p.tilt));
      if (p.shape === 'circle') {
        g.beginPath();
        g.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        g.fill();
      } else if (p.shape === 'strip') {
        g.fillRect(-p.size * 0.7, -1.6, p.size * 1.4, 3.2);
      } else {
        g.fillRect(-p.size / 2, -p.size / 3.2, p.size, p.size / 1.6);
      }
    }
    g.restore();
  }
  parts = alive;
  if (parts.length) {
    raf = requestAnimationFrame(frame);
  } else {
    raf = 0;
    g.clearRect(0, 0, innerWidth, innerHeight);
  }
}
