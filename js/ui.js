// Herbruikbare UI: iconen, ringen, sheets, meldingen en zwevende tekst.

import { h, esc, reducedMotion } from './util.js';
import { haptic } from './fx/haptics.js';
import { sfx } from './fx/sound.js';

// ---------------------------------------------------------------------------
// Iconen (SF Symbols-achtig, 24×24, currentColor)

const P = {
  today: '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/>',
  lists: '<rect x="3" y="4" width="18" height="4.2" rx="1.6" fill="currentColor"/><rect x="3" y="10" width="18" height="4.2" rx="1.6" fill="currentColor" opacity=".72"/><rect x="3" y="16" width="18" height="4.2" rx="1.6" fill="currentColor" opacity=".45"/>',
  medal: '<path d="M7.2 2.5h3.2l1.6 4.1 1.6-4.1h3.2l-2.9 6.6a6.4 6.4 0 1 1-3.8 0z" fill="currentColor" opacity=".55"/><circle cx="12" cy="15" r="6.4" fill="currentColor"/><path d="m12 11.7 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="var(--bg-elev, #fff)"/>',
  person: '<circle cx="12" cy="12" r="10" fill="currentColor" opacity=".22"/><circle cx="12" cy="9.6" r="3.6" fill="currentColor"/><path d="M5.6 18.3c1.3-2.6 3.7-3.9 6.4-3.9s5.1 1.3 6.4 3.9A8.9 8.9 0 0 1 12 21a8.9 8.9 0 0 1-6.4-2.7z" fill="currentColor"/>',
  play: '<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  minus: '<path d="M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  close: '<path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  check: '<path d="m5 12.5 4.3 4.3L19 7.2" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  back: '<path d="M15 4.8 7.8 12l7.2 7.2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  arrow: '<path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  swap: '<path d="M7 7h11m-3-3 3 3-3 3M17 17H6m3 3-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  flame: '<path d="M12.6 2.2c.5 3.1-1 4.8-2.6 6.6C8.4 10.6 6.8 12.5 6.8 15a5.2 5.2 0 0 0 10.4 0c0-1.8-.7-3.2-1.6-4.3-.2 1.3-.9 2.2-1.9 2.6.6-3.8-.4-8.2-1.1-11.1z" fill="currentColor"/><path d="M12.2 21.3a3 3 0 0 1-3-3c0-1.7 1.3-2.7 2.4-4 .3 1.2 1 1.7 1.7 2 .2-.8.1-1.3 0-2 1.1 1 1.9 2.2 1.9 3.9a3 3 0 0 1-3 3.1z" fill="#FFE27A"/>',
  bolt: '<path d="M13.5 2 4.8 13.1h6.1L9.8 22l9.4-12.2h-6.3z" fill="currentColor"/>',
  puzzle: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h3.2a2.3 2.3 0 1 1 4.6 0h3.2A1.5 1.5 0 0 1 18 7.5v3.2a2.3 2.3 0 1 1 0 4.6v3.2a1.5 1.5 0 0 1-1.5 1.5h-3.2a2.3 2.3 0 1 0-4.6 0H5.5A1.5 1.5 0 0 1 4 18.5v-3.2a2.3 2.3 0 1 0 0-4.6z" fill="currentColor"/>',
  skull: '<path d="M12 2.5c-4.7 0-8 3.2-8 7.6 0 2.5 1.1 4.3 2.7 5.4v2.4c0 .9.7 1.6 1.6 1.6h.8v1.6h1.8v-1.6h2.2v1.6h1.8v-1.6h.8c.9 0 1.6-.7 1.6-1.6v-2.4c1.6-1.1 2.7-2.9 2.7-5.4 0-4.4-3.3-7.6-8-7.6z" fill="currentColor"/><circle cx="8.9" cy="10.6" r="2" fill="var(--hole, #fff)"/><circle cx="15.1" cy="10.6" r="2" fill="var(--hole, #fff)"/>',
  speaker: '<path d="M4 9.2h3.2L12 5v14l-4.8-4.2H4a1 1 0 0 1-1-1V10.2a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M15.3 8.7a4.6 4.6 0 0 1 0 6.6M18 6a8.4 8.4 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  bulb: '<path d="M12 2.8a6.6 6.6 0 0 0-3.9 11.9c.6.5 1 1.2 1 2V17h5.8v-.3c0-.8.4-1.5 1-2A6.6 6.6 0 0 0 12 2.8z" fill="currentColor"/><rect x="9.2" y="18.4" width="5.6" height="1.6" rx=".8" fill="currentColor"/><rect x="10" y="20.6" width="4" height="1.6" rx=".8" fill="currentColor"/>',
  shield: '<path d="M12 2.6 4.6 5.5v5.7c0 4.8 3.1 8.7 7.4 10.2 4.3-1.5 7.4-5.4 7.4-10.2V5.5z" fill="currentColor"/><path d="m8.6 12 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  snow: '<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.4 4.3 12 6.7l2.6-2.4M9.4 19.7l2.6-2.4 2.6 2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  spark: '<path d="M12 1.8c.5 4.9 2.3 7.6 8.6 10.2-6.3 2.6-8.1 5.3-8.6 10.2-.5-4.9-2.3-7.6-8.6-10.2C9.7 9.4 11.5 6.7 12 1.8z" fill="currentColor"/>',
  star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="currentColor"/>',
  heart: '<path d="M12 20.6s-8.4-4.9-8.4-11a4.7 4.7 0 0 1 8.4-2.9 4.7 4.7 0 0 1 8.4 2.9c0 6.1-8.4 11-8.4 11z" fill="currentColor"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.4" rx="1.3" fill="currentColor"/><rect x="5" y="12.4" width="14" height="8.6" rx="1.6" fill="currentColor" opacity=".8"/><path d="M12 8v13" stroke="var(--bg-elev, #fff)" stroke-width="2"/><path d="M12 8c-1-2.8-4.8-4.3-5.6-2.3-.7 1.8 2.8 2.3 5.6 2.3zm0 0c1-2.8 4.8-4.3 5.6-2.3.7 1.8-2.8 2.3-5.6 2.3z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1-.8-1.4-.8-2.3 0-1 .8-1.7 1.8-1.7h2.1A4.1 4.1 0 0 0 21 11.2C21 6.6 17 3 12 3z" fill="currentColor"/><circle cx="7.6" cy="11.4" r="1.5" fill="#FF453A"/><circle cx="10.2" cy="7.4" r="1.5" fill="#FFD60A"/><circle cx="14.8" cy="7.4" r="1.5" fill="#30D158"/><circle cx="17.2" cy="11" r="1.4" fill="#0A84FF"/>',
  clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5.2l3.4 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  target: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4.7c0-.6.5-1.1 1.1-1.1h2.8c.6 0 1.1.5 1.1 1.1v1.8M6.5 6.5l.9 12.6c.1 1 .9 1.8 1.9 1.8h5.4c1 0 1.8-.8 1.9-1.8l.9-12.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pencil: '<path d="m4 20 1-4.2L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  dots: '<circle cx="5.5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18.5" cy="12" r="2" fill="currentColor"/>',
  download: '<path d="M12 3.5v11m-4.4-4.4L12 14.5l4.4-4.4M4.5 16.5v2.2c0 1 .8 1.8 1.8 1.8h11.4c1 0 1.8-.8 1.8-1.8v-2.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  upload: '<path d="M12 14.5v-11M7.6 7.9 12 3.5l4.4 4.4M4.5 16.5v2.2c0 1 .8 1.8 1.8 1.8h11.4c1 0 1.8-.8 1.8-1.8v-2.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  sound: '<path d="M4 9.2h3.2L12 5v14l-4.8-4.2H4a1 1 0 0 1-1-1V10.2a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  vibrate: '<rect x="7.5" y="3" width="9" height="18" rx="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.8 8.5v7M20.2 8.5v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon: '<path d="M20 14.6A8.4 8.4 0 0 1 9.4 4a8.4 8.4 0 1 0 10.6 10.6z" fill="currentColor"/>',
  text: '<path d="M4 6.5h16M4 12h16M4 17.5h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  cards: '<rect x="6.5" y="3" width="13" height="16" rx="2.6" fill="currentColor" opacity=".45"/><rect x="3.5" y="6" width="13" height="15" rx="2.6" fill="currentColor"/>',
  repeat: '<path d="M4.5 11V9.6A3.6 3.6 0 0 1 8.1 6h11.4m-3-3 3 3-3 3M19.5 13v1.4a3.6 3.6 0 0 1-3.6 3.6H4.5m3 3-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  sparkles: '<path d="M10 3c.4 3.9 1.8 5.9 6.6 7.9-4.8 2-6.2 4-6.6 7.9-.4-3.9-1.8-5.9-6.6-7.9C8.2 8.9 9.6 6.9 10 3z" fill="currentColor"/><path d="M18.2 13.6c.2 2 .9 3 3.3 4-2.4 1-3.1 2-3.3 4-.2-2-.9-3-3.3-4 2.4-1 3.1-2 3.3-4z" fill="currentColor" opacity=".7"/>',
  info: '<circle cx="12" cy="12" r="9.5" fill="currentColor" opacity=".2"/><rect x="11" y="10.5" width="2" height="7" rx="1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/>',
  crown: '<path d="m3 8 4.5 3.6L12 5l4.5 6.6L21 8l-1.9 10.2H4.9z" fill="currentColor"/><rect x="4.9" y="19.2" width="14.2" height="2" rx="1" fill="currentColor"/>',
};

export function icon(name, cls = '') {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${P[name] || ''}</svg>`;
}

// ---------------------------------------------------------------------------
// Activiteitsringen

let ringUid = 0;

/**
 * Drie concentrische ringen zoals in Apple Fitness. Waarden >1 lopen een tweede ronde.
 * @param {number[]} values
 */
export function ringsSVG(values, { size = 150, stroke = 17, gap = 3.5, animate = true } = {}) {
  const id = `r${++ringUid}`;
  const c = size / 2;
  const cols = [
    ['var(--ring1a)', 'var(--ring1b)', 'var(--ring1t)'],
    ['var(--ring2a)', 'var(--ring2b)', 'var(--ring2t)'],
    ['var(--ring3a)', 'var(--ring3b)', 'var(--ring3t)'],
  ];
  let defs = `<filter id="${id}s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="1.6" flood-color="#000" flood-opacity=".45"/></filter>`;
  let body = '';
  values.forEach((raw, i) => {
    const v = Math.max(0, raw || 0);
    const r = c - stroke / 2 - i * (stroke + gap);
    if (r <= stroke / 2) return;
    const C = 2 * Math.PI * r;
    const [a, b, t] = cols[i % 3];
    defs += `<linearGradient id="${id}g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>`;
    body += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${t}" stroke-width="${stroke}"/>`;
    const first = Math.min(v, 1);
    const dash = (p) => `${Math.max(0.0001, p * C)} ${C + 1}`;
    body += `<circle class="ring-arc" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#${id}g${i})" stroke-width="${stroke}" stroke-linecap="round" transform="rotate(-90 ${c} ${c})" stroke-dasharray="${animate ? dash(0) : dash(first)}" data-to="${dash(first)}" style="opacity:${v > 0 ? 1 : 0}"/>`;
    if (v > 1) {
      const over = Math.min(v - 1, 0.999);
      body += `<circle class="ring-arc" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${a}" stroke-width="${stroke}" stroke-linecap="round" transform="rotate(-90 ${c} ${c})" filter="url(#${id}s)" stroke-dasharray="${animate ? dash(0) : dash(over)}" data-to="${dash(over)}" data-delay="1"/>`;
    }
  });
  return `<svg class="rings" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Dagringen"><defs>${defs}</defs>${body}</svg>`;
}

/** Laat alle ringen in een container vanaf nul vollopen. */
export function animateRings(root) {
  const arcs = root.querySelectorAll('.ring-arc[data-to]');
  if (reducedMotion()) {
    arcs.forEach((el) => el.setAttribute('stroke-dasharray', el.dataset.to));
    return;
  }
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      arcs.forEach((el) => {
        el.style.transition = `stroke-dasharray 1.3s cubic-bezier(.2,.8,.2,1) ${el.dataset.delay ? '1.1s' : '0.1s'}`;
        el.setAttribute('stroke-dasharray', el.dataset.to);
      });
    })
  );
}

/** Kleine voortgangsring, bijv. per lijst. */
export function miniRing(p, { size = 34, stroke = 4.5, color = 'var(--accent)', label = '' } = {}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, p));
  return `<svg class="mini-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--fill2)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${Math.max(0.001, v * C)} ${C}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    ${label ? `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${size * 0.3}" font-weight="800" fill="currentColor" font-family="ui-rounded, Nunito, system-ui">${label}</text>` : ''}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Sheets

const layer = () => document.getElementById('layer');
let openSheets = 0;

/**
 * Opent een sheet vanaf de onderkant.
 * @param {{title?: string, body: string|HTMLElement, foot?: string, left?: string, onClose?: Function, className?: string}} o
 */
export function openSheet({ title = '', body, foot = '', left = '', onClose, className = '' }) {
  const backdrop = h('<div class="backdrop"></div>');
  const sheet = h(`<section class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title || 'Venster')}">
    <div class="sheet-grabber"></div>
    <header class="sheet-head">
      <div>${left}</div>
      <h3>${esc(title)}</h3>
      <button class="icon-btn" data-close aria-label="Sluiten">${icon('close')}</button>
    </header>
    <div class="sheet-body"></div>
    ${foot ? `<footer class="sheet-foot">${foot}</footer>` : ''}
  </section>`);
  const bodyEl = sheet.querySelector('.sheet-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);

  layer().append(backdrop, sheet);
  openSheets++;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.classList.add('show');
  });

  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('show');
    sheet.classList.remove('show');
    sheet.style.transform = '';
    openSheets--;
    if (!openSheets) document.body.style.overflow = '';
    setTimeout(() => {
      backdrop.remove();
      sheet.remove();
    }, 480);
    document.removeEventListener('keydown', onKey);
    onClose?.(value);
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && sheet === layer().querySelector('.sheet.show:last-of-type')) close();
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', () => close());
  sheet.querySelector('[data-close]').addEventListener('click', () => {
    sfx.tap();
    close();
  });

  // Omlaag vegen om te sluiten
  const head = sheet.querySelector('.sheet-grabber');
  const headBar = sheet.querySelector('.sheet-head');
  let startY = null;
  let dy = 0;
  const down = (e) => {
    if (e.target.closest('button')) return;
    startY = e.clientY;
    dy = 0;
    sheet.classList.add('dragging');
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.clientY - startY);
    sheet.style.transform = `translate(-50%, ${dy}px)`;
  };
  const up = () => {
    if (startY === null) return;
    startY = null;
    sheet.classList.remove('dragging');
    if (dy > 110) close();
    else sheet.style.transform = '';
  };
  for (const el of [head, headBar]) {
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  const first = sheet.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 350);

  return { el: sheet, body: bodyEl, close };
}

/**
 * Melding in iOS-stijl.
 * @returns {Promise<string|null>} de waarde van de gekozen knop
 */
export function alertDialog({ title, message = '', buttons = [{ text: 'OK', value: 'ok', style: 'primary' }], vertical = false }) {
  return new Promise((resolve) => {
    const backdrop = h('<div class="backdrop"></div>');
    const wrap = h(`<div class="alert-wrap" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="alert">
        <h3>${esc(title)}</h3>
        ${message ? `<p>${esc(message)}</p>` : ''}
        <div class="alert-actions${vertical || buttons.length > 2 ? ' vertical' : ''}">
          ${buttons
            .map((b, i) => `<button class="btn ${b.style === 'destructive' ? 'btn-danger' : b.style === 'primary' ? 'btn-primary' : 'btn-gray'}" data-i="${i}">${esc(b.text)}</button>`)
            .join('')}
        </div>
      </div>
    </div>`);
    layer().append(backdrop, wrap);
    const box = wrap.querySelector('.alert');
    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      box.classList.add('show');
    });
    haptic('light');
    const done = (value) => {
      backdrop.classList.remove('show');
      box.style.opacity = '0';
      box.style.transform = 'scale(.94)';
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        backdrop.remove();
        wrap.remove();
      }, 260);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') done(null);
    };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (b) {
        sfx.tap();
        done(buttons[+b.dataset.i].value);
      } else if (e.target === wrap) done(null);
    });
    setTimeout(() => wrap.querySelector('.btn-primary, .btn-danger, .btn')?.focus(), 60);
  });
}

// ---------------------------------------------------------------------------
// Dynamic Island-melding

let islandTimer = 0;
export function toast(text, { icon: ic = 'check', color = 'var(--green)', emoji = '', duration = 2200 } = {}) {
  const el = document.getElementById('island');
  el.innerHTML = `<span class="island-icon" style="--ic:${color}">${emoji || icon(ic)}</span><span>${esc(text)}</span>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(islandTimer);
  islandTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ---------------------------------------------------------------------------
// Zwevende tekst (+15 XP)

export function floatText(x, y, text, cls = '') {
  const el = h(`<div class="float-text ${cls}">${esc(text)}</div>`);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/** Segmented control. Waarde wordt uitgelezen via data-value op de knoppen. */
export function segmented(name, options, value) {
  return `<div class="segmented" role="group" data-seg="${name}">${options
    .map(([v, label]) => `<button type="button" data-value="${v}" aria-pressed="${v === value}">${esc(label)}</button>`)
    .join('')}</div>`;
}
