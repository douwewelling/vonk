// Vandaag: ringen, reeks, de volgende sessie en de spellen.

import { state, commit, currentList, ringProgress, peekDay, goals, displayStreak } from '../store.js';
import { esc, nl, longDate, todayKey, addDays, keyToDate, DAY_LETTERS, plural } from '../util.js';
import { icon, ringsSVG, animateRings, miniRing } from '../ui.js';
import { levelInfo } from '../rewards.js';
import { listStats } from '../srs.js';
import { startLearn } from '../games/learn.js';
import { openListPicker, openNewList, modeIcon, playMode } from './lists.js';

function greeting() {
  const hr = new Date().getHours();
  const g = hr < 6 ? 'Goedenacht' : hr < 12 ? 'Goedemorgen' : hr < 18 ? 'Goedemiddag' : 'Goedenavond';
  const name = state.profile.name.trim();
  return name ? `${g}, ${name}` : g;
}

function weekHTML() {
  const today = todayKey();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const k = addDays(today, -i);
    const d = state.daily[k];
    const done = d && (d.xp > 0 || d.correct > 0);
    const letter = DAY_LETTERS[keyToDate(k).getDay()];
    html += `<div class="wd${done ? ' done' : ''}${i === 0 ? ' today' : ''}"><i>${done ? icon('check') : ''}</i>${letter}</div>`;
  }
  return html;
}

function heroHTML(list) {
  if (!list) {
    return `<div class="hero">
      <div class="eyebrow">Aan de slag</div>
      <div class="hero-list">Maak je eerste lijst</div>
      <p class="hero-sub">Plak je woordjes uit StudyGo, Quizlet of Word en begin meteen.</p>
      <div class="hero-row" style="margin-top:14px"><span></span><button class="hero-play" data-newlist aria-label="Nieuwe lijst">${icon('plus')}</button></div>
    </div>`;
  }
  const s = listStats(list);
  const chips = [];
  if (s.due) chips.push(`<span class="hero-chip">${icon('repeat')} ${s.due} herhalen</span>`);
  if (s.learning) chips.push(`<span class="hero-chip">${icon('cards')} ${s.learning} bezig</span>`);
  if (s.fresh) chips.push(`<span class="hero-chip">${icon('sparkles')} ${Math.min(s.fresh, state.settings.newPerSession)} nieuw</span>`);
  if (!chips.length) chips.push(`<span class="hero-chip">${icon('target')} Extra oefenen</span>`);
  const boost = state.inventory.boost > 0 ? `<span class="hero-chip">${icon('bolt')} XP ×2</span>` : '';
  return `<div class="hero">
    <div class="eyebrow">Jouw volgende sessie</div>
    <button class="hero-list" data-pick aria-label="Andere lijst kiezen">${esc(list.title)} ${icon('chevron')}</button>
    <div class="hero-row">
      <div>
        <div class="hero-meta">${chips.join('')}${boost}</div>
        <p class="hero-sub">${Math.round(s.progress * 100)}% beheerst · ${plural(s.total, 'woord', 'woorden')}</p>
      </div>
      <button class="hero-play" data-play aria-label="Start sessie">${icon('play')}</button>
    </div>
  </div>`;
}

export function render(root) {
  const li = levelInfo(state.profile.xp);
  const list = currentList();
  const rp = ringProgress();
  const g = goals();
  const d = peekDay();
  const streak = displayStreak();
  const doneToday = d.xp > 0 || d.correct > 0;
  const dueLists = state.lists.filter((l) => listStats(l).due > 0);
  const dueAll = dueLists.reduce((n, l) => n + listStats(l).due, 0);
  const blitzBest = list ? state.records.blitz[list.id] : 0;
  const matchBest = list ? state.records.match[list.id] : 0;

  root.innerHTML = `
    <header class="titlebar">
      <div><div class="eyebrow">${esc(longDate())}</div><h1 class="large-title">${esc(greeting())}</h1></div>
      <div class="head-actions">
        <a class="pill spark-pill" href="#/profiel" aria-label="${nl(state.profile.sparks)} vonken">${icon('spark')}<span class="num">${nl(state.profile.sparks)}</span></a>
        <a class="avatar" href="#/profiel" aria-label="Profiel, level ${li.level}">${miniRing(li.progress, { size: 44, stroke: 3.5 })}<span class="avatar-face">${li.level}</span></a>
      </div>
    </header>

    <div class="stack">
      ${heroHTML(list)}

      <div class="card rings-card">
        ${ringsSVG(rp)}
        <div class="ring-stats">
          <div class="ring-stat" style="--c:var(--ring1x)"><span class="ring-stat-label">XP</span><span class="ring-stat-value">${nl(d.xp)}<small>/${nl(g.xp)}</small></span></div>
          <div class="ring-stat" style="--c:var(--ring2x)"><span class="ring-stat-label">Goed beantwoord</span><span class="ring-stat-value">${nl(d.correct)}<small>/${nl(g.correct)}</small></span></div>
          <div class="ring-stat" style="--c:var(--ring3x)"><span class="ring-stat-label">Minuten</span><span class="ring-stat-value">${Math.floor(d.seconds / 60)}<small>/${g.minutes}</small></span></div>
        </div>
      </div>

      <div class="card streak-card">
        <div class="streak-flame${streak ? '' : ' cold'}">${icon('flame')}</div>
        <div>
          <div class="streak-top">
            <div class="streak-count">${streak}<span>${streak === 1 ? 'dag' : 'dagen'} reeks</span></div>
            ${state.inventory.freeze ? `<span class="freeze-chip" title="Reeksbevriezers">${icon('snow')} ${state.inventory.freeze}</span>` : ''}
          </div>
          <div class="week">${weekHTML()}</div>
          ${doneToday ? '' : `<div class="small" style="color:var(--orange);font-weight:600;margin-top:8px">${streak ? 'Leer vandaag om je reeks te houden.' : 'Begin vandaag een nieuwe reeks.'}</div>`}
        </div>
      </div>

      ${
        dueLists.length > 1
          ? `<button class="review-all" data-review>
              <span class="row-icon" style="background:var(--orange)">${icon('repeat')}</span>
              <div class="row-main"><div class="row-title">Alles herhalen</div><div class="row-sub">${dueAll} woorden uit ${dueLists.length} lijsten zijn toe aan herhaling</div></div>
              <span class="chev">${icon('chevron')}</span>
            </button>`
          : ''
      }
    </div>

    <div class="section"><h2>Spellen</h2>${list ? `<span class="muted small">${esc(list.title)}</span>` : ''}</div>
    <div class="modes">
      <button class="mode" data-mode="blitz">${modeIcon('blitz')}<div><div class="mode-title">Blitz</div><div class="mode-sub">${blitzBest ? `Record ${blitzBest}` : '60 seconden'}</div></div></button>
      <button class="mode" data-mode="match">${modeIcon('match')}<div><div class="mode-title">Koppel</div><div class="mode-sub">${matchBest ? `Record ${(matchBest / 1000).toFixed(1).replace('.', ',')} s` : 'Paren tikken'}</div></div></button>
      <button class="mode" data-mode="boss">${modeIcon('boss')}<div><div class="mode-title">Eindbaas</div><div class="mode-sub">Toets-simulatie</div></div></button>
    </div>

    <div class="section"><h2>Jouw level</h2></div>
    <a class="card level-card" href="#/profiel" style="color:inherit;text-decoration:none">
      <div class="level-badge">${li.level}</div>
      <div>
        <div class="level-top"><strong>${esc(li.title)}</strong><span>${nl(li.into)} / ${nl(li.need)} XP</span></div>
        <div class="bar"><div class="bar-fill" style="width:${li.progress * 100}%"></div></div>
      </div>
    </a>
  `;

  animateRings(root);
  root.querySelector('[data-play]')?.addEventListener('click', () => playMode('learn', list));
  root.querySelector('[data-newlist]')?.addEventListener('click', () => openNewList());
  root.querySelector('[data-pick]')?.addEventListener('click', () =>
    openListPicker((l) => {
      state.currentListId = l.id;
      commit();
    })
  );
  root.querySelector('[data-review]')?.addEventListener('click', () => startLearn({ lists: dueLists }));
  root.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!list) return openNewList();
      playMode(b.dataset.mode, list);
    })
  );
}
