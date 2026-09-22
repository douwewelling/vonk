// Opstarten: navigatie, tabbalk, welkomstscherm en offline-ondersteuning.

import { state, subscribe, commit } from './store.js';
import { $, esc } from './util.js';
import { icon, openSheet } from './ui.js';
import { applyTheme } from './rewards.js';
import { listStats } from './srs.js';
import { sfx } from './fx/sound.js';
import * as home from './views/home.js';
import * as lists from './views/lists.js';
import * as awards from './views/awards.js';
import * as profile from './views/profile.js';

const TABS = [
  { id: 'vandaag', label: 'Vandaag', icon: 'today', view: home },
  { id: 'lijsten', label: 'Lijsten', icon: 'lists', view: lists },
  { id: 'prestaties', label: 'Prestaties', icon: 'medal', view: awards },
  { id: 'profiel', label: 'Profiel', icon: 'person', view: profile },
];

const APP_ICON = `<svg viewBox="0 0 120 120" class="welcome-icon" aria-hidden="true">
  <defs><linearGradient id="wi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB340"/><stop offset=".55" stop-color="#FF3D6E"/><stop offset="1" stop-color="#7A5CFF"/></linearGradient></defs>
  <rect width="120" height="120" rx="27" fill="url(#wi)"/>
  <path d="M60 18c2.4 19.6 9.6 30.4 34.6 42-25 11.6-32.2 22.4-34.6 42-2.4-19.6-9.6-30.4-34.6-42C50.4 48.4 57.6 37.6 60 18z" fill="#fff"/>
  <path d="M92 20c.9 6.6 3.3 10.2 11.6 14.1-8.3 3.9-10.7 7.5-11.6 14.1-.9-6.6-3.3-10.2-11.6-14.1C88.7 30.2 91.1 26.6 92 20z" fill="#fff" opacity=".75"/>
</svg>`;

function route() {
  const [, a = 'vandaag', b = null] = (location.hash || '#/vandaag').split('/');
  return { tab: a, param: b ? decodeURIComponent(b) : null };
}

let lastRoute = null;

function renderTabbar(activeId) {
  const bar = $('#tabbar');
  const idx = Math.max(0, TABS.findIndex((t) => t.id === activeId));
  const due = state.lists.reduce((n, l) => n + listStats(l).due, 0);
  if (!bar.dataset.ready) {
    bar.innerHTML =
      '<span class="tab-lens"></span>' +
      TABS.map((t) => `<a class="tab" href="#/${t.id}" data-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span></a>`).join('');
    bar.dataset.ready = '1';
    bar.addEventListener('click', (e) => {
      if (e.target.closest('.tab')) sfx.tap();
    });
  }
  bar.querySelectorAll('.tab').forEach((el) => {
    const on = el.dataset.tab === activeId;
    if (on) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
    el.querySelector('.badge')?.remove();
    if (el.dataset.tab === 'lijsten' && due > 0) el.insertAdjacentHTML('beforeend', `<span class="badge">${due > 99 ? '99+' : due}</span>`);
  });
  bar.querySelector('.tab-lens').style.transform = `translateX(${idx * 100}%)`;
}

function render(anim = '') {
  const r = route();
  const view = $('#view');
  let tabId = r.tab;
  if (r.tab === 'lijst') {
    tabId = 'lijsten';
    lists.renderDetail(view, r.param);
  } else {
    const tab = TABS.find((t) => t.id === r.tab) || TABS[0];
    tabId = tab.id;
    tab.view.render(view);
  }
  renderTabbar(tabId);
  if (anim) {
    view.classList.remove('enter', 'push', 'pop');
    void view.offsetWidth;
    view.classList.add(anim);
  }
  updateNavbar();
}

function onRoute() {
  const r = route();
  const prev = lastRoute;
  lastRoute = r;
  let anim = 'enter';
  if (prev && r.tab === 'lijst' && prev.tab !== 'lijst') anim = 'push';
  else if (prev && prev.tab === 'lijst' && r.tab === 'lijsten') anim = 'pop';
  render(anim);
  window.scrollTo(0, 0);
}

function updateNavbar() {
  const nav = document.querySelector('.navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 70);
}

function welcome() {
  const sheet = openSheet({
    title: '',
    body: `<div class="welcome">
      ${APP_ICON}
      <h2>Welkom bij Vonk</h2>
      <div class="stack" style="gap:18px">
        <div class="feature" style="--c:var(--orange)"><span class="feature-icon">${icon('flame')}</span><div><h4>Combo's, kisten en records</h4><p>Elke goede beurt telt. Bouw combo's, pak kritieke treffers en open kisten vol beloningen.</p></div></div>
        <div class="feature" style="--c:var(--green)"><span class="feature-icon">${icon('repeat')}</span><div><h4>Slimme herhaling</h4><p>Vonk onthoudt welke woorden lastig zijn en laat ze terugkomen vlak voordat je ze vergeet.</p></div></div>
        <div class="feature" style="--c:var(--purple)"><span class="feature-icon">${icon('skull')}</span><div><h4>Eindbaas = toets</h4><p>Test jezelf zoals op een echte toets en krijg een geschat cijfer.</p></div></div>
        <div class="feature" style="--c:var(--blue)"><span class="feature-icon">${icon('lists')}</span><div><h4>Jouw eigen woordjes</h4><p>Plak je lijst uit StudyGo, Quizlet of Word. Er staan al drie voorbeeldlijsten klaar.</p></div></div>
      </div>
      <div><label class="label" for="wl-name">Hoe heet je?</label><input class="field" id="wl-name" maxlength="24" autocomplete="given-name" placeholder="Je voornaam (mag leeg blijven)" value="${esc(state.profile.name)}"></div>
    </div>`,
    foot: `<button class="btn btn-primary btn-block" data-go>Aan de slag</button>`,
    onClose: () => {
      state.onboarded = true;
      commit();
    },
  });
  const go = () => {
    sfx.unlock();
    sfx.chestOpen(1);
    state.profile.name = sheet.el.querySelector('#wl-name').value.trim();
    sheet.close();
  };
  sheet.el.querySelector('[data-go]').addEventListener('click', go);
  sheet.el.querySelector('#wl-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go();
  });
}

function boot() {
  if (location.protocol === 'file:') return;
  applyTheme(state.settings.theme);
  profile.applyAppearance();

  window.addEventListener('hashchange', onRoute);
  window.addEventListener('scroll', updateNavbar, { passive: true });
  subscribe(() => render());
  onRoute();

  // Audio mag pas na de eerste aanraking starten (browserregel)
  const unlock = () => {
    sfx.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Nieuwe dag? Dan bijwerken wanneer je terugkomt.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !document.querySelector('.stage')) render();
  });

  if (!state.onboarded) setTimeout(welcome, 450);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
