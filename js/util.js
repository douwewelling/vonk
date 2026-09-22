// Kleine hulpfuncties die overal gebruikt worden.

export const DAY = 86400000;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Maakt één element van een HTML-string. */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const randomInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const chance = (p) => Math.random() < p;

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function hashStr(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

/** Lokale datum als 'JJJJ-MM-DD'. */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Aantal kalenderdagen van a naar b (b - a). */
export function dayDiff(a, b) {
  return Math.round((keyToDate(b) - keyToDate(a)) / DAY);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const DAY_LETTERS = ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'];

export function longDate(d = new Date()) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Nederlandse getalnotatie: 8,4 en 1.250 */
export function nl(n, decimals = 0) {
  return Number(n).toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDuration(sec) {
  sec = Math.round(sec);
  if (sec < 60) return `${sec} sec`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${hr} u ${rest} min` : `${hr} u`;
}

export const plural = (n, one, many) => `${nl(n)} ${n === 1 ? one : many}`;

/** Telt een getal soepel op in een element. */
export function countUp(el, to, { from = 0, duration = 900, format = (v) => nl(v) } = {}) {
  if (!el) return Promise.resolve();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || duration <= 0) {
    el.textContent = format(to);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = format(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Center van een element in viewport-coördinaten. */
export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
