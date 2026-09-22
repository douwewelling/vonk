// Het volledige speelscherm dat over de app heen schuift, plus gedeelde effecten.

import { h, clamp, sleep, nl } from '../util.js';
import { icon } from '../ui.js';
import { sfx } from '../fx/sound.js';

export function openStage({ className = '' } = {}) {
  const el = h(`<div class="stage ${className}" role="dialog" aria-modal="true" aria-label="Spel">
    <div class="stage-top">
      <button class="icon-btn" data-quit aria-label="Stoppen">${icon('close')}</button>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill"></div></div>
      <div class="stage-chips">
        <span class="chip combo" hidden>${icon('flame')}<span class="num">×2</span></span>
        <span class="chip xp">${icon('star')}<span class="num">0</span></span>
      </div>
    </div>
    <div class="stage-body"></div>
    <div class="hurt-flash"></div>
    <div class="feedback" aria-live="polite"><div class="feedback-inner"></div></div>
  </div>`);
  document.body.appendChild(el);
  document.getElementById('tabbar')?.classList.add('hide');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));

  const fill = el.querySelector('.progress-fill');
  const bar = el.querySelector('.progress');
  const comboChip = el.querySelector('.chip.combo');
  const xpChip = el.querySelector('.chip.xp');
  let maxP = 0;
  let abortResolve;

  const api = {
    el,
    body: el.querySelector('.stage-body'),
    feedback: el.querySelector('.feedback'),
    aborted: false,
    closed: false,
    abortPromise: new Promise((r) => (abortResolve = r)),
    keyHandler: null,
    onQuit: null,

    setProgress(p) {
      maxP = Math.max(maxP, clamp(p, 0, 1));
      fill.style.width = `${maxP * 100}%`;
      bar.setAttribute('aria-valuenow', String(Math.round(maxP * 100)));
    },
    resetProgress() {
      maxP = 0;
      fill.style.width = '0%';
    },
    hideProgress() {
      bar.style.visibility = 'hidden';
    },
    setXp(n) {
      xpChip.querySelector('.num').textContent = nl(n);
      xpChip.classList.remove('bump');
      void xpChip.offsetWidth;
      xpChip.classList.add('bump');
    },
    setCombo(combo, mult) {
      if (mult <= 1) {
        comboChip.hidden = true;
        return;
      }
      const wasHidden = comboChip.hidden;
      comboChip.hidden = false;
      comboChip.querySelector('.num').textContent = `×${String(mult).replace('.', ',')} · ${combo}`;
      comboChip.classList.toggle('x3', mult >= 2 && mult < 3);
      comboChip.classList.toggle('x4', mult >= 3);
      if (!wasHidden) {
        comboChip.classList.remove('bump');
        void comboChip.offsetWidth;
        comboChip.classList.add('bump');
      }
    },
    hideChips() {
      el.querySelector('.stage-chips').style.visibility = 'hidden';
    },
    setHeat(v) {
      el.style.setProperty('--heat', String(clamp(v, 0, 1)));
      el.classList.toggle('hot', v >= 0.75);
    },
    hurt() {
      el.classList.remove('hurt');
      void el.offsetWidth;
      el.classList.add('hurt');
      setTimeout(() => el.classList.remove('hurt'), 520);
    },
    abort() {
      api.aborted = true;
      abortResolve({ aborted: true });
    },
    close() {
      if (api.closed) return;
      api.closed = true;
      api.aborted = true;
      abortResolve({ aborted: true });
      el.classList.remove('show');
      document.getElementById('tabbar')?.classList.remove('hide');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey, true);
      window.speechSynthesis?.cancel();
      setTimeout(() => el.remove(), 600);
    },
    /** Wacht op een belofte, maar stop direct als het spel wordt afgebroken. */
    race(promise) {
      return Promise.race([promise, api.abortPromise]);
    },
  };

  const quit = () => {
    sfx.tap();
    if (api.onQuit) api.onQuit();
    else api.close();
  };
  el.querySelector('[data-quit]').addEventListener('click', quit);

  function onKey(e) {
    if (document.querySelector('.alert-wrap')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      quit();
      return;
    }
    api.keyHandler?.(e);
  }
  document.addEventListener('keydown', onKey, true);

  return api;
}

/** Grote tekst midden in beeld ("10 op rij!"). */
export function shout(text, { sub = '', grad = '' } = {}) {
  document.querySelectorAll('.shout').forEach((s) => s.remove());
  const el = h(`<div class="shout" aria-hidden="true"${grad ? ` style="--g:${grad}"` : ''}>${text}${sub ? `<small>${sub}</small>` : ''}</div>`);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/** 3-2-1 aftellen over het speelscherm. */
export async function countdown(stage) {
  const el = h('<div class="countdown"><b>3</b></div>');
  stage.el.appendChild(el);
  for (const n of ['3', '2', '1']) {
    const b = h(`<b>${n}</b>`);
    el.replaceChildren(b);
    sfx.tick(n === '1');
    await sleep(620);
    if (stage.aborted) break;
  }
  el.remove();
  sfx.whoosh();
}

export const GRADS = {
  combo: 'linear-gradient(160deg, #FFB340, #FF3D6E)',
  crit: 'linear-gradient(160deg, #FFD60A, #FF6A1A)',
  gold: 'linear-gradient(120deg, #FFE066, #FF9F0A, #E8A400)',
  bad: 'linear-gradient(160deg, #FF6B6B, #D7263D)',
  green: 'linear-gradient(160deg, #6EE7A0, #16A34A)',
};
