// Prestaties: statistieken, de week in ringen en je medaillekast.

import { state, ringProgress } from '../store.js';
import { esc, nl, todayKey, addDays, keyToDate, DAY_LETTERS, fmtDuration } from '../util.js';
import { icon, ringsSVG, animateRings, openSheet } from '../ui.js';
import { ACHIEVEMENTS, achievementProgress, levelInfo } from '../rewards.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';

function medalHTML(a) {
  const earned = !!state.achievements[a.id];
  const p = achievementProgress(a);
  return `<button class="medal${earned ? '' : ' locked'}" data-medal="${a.id}">
    <span class="medal-disc" style="--t1:${a.tint[0]};--t2:${a.tint[1]}"><span>${a.emoji}</span></span>
    <span class="medal-title">${esc(a.title)}</span>
    ${earned ? '' : `<span class="medal-sub">${nl(p.value)} / ${nl(a.goal)}</span>`}
  </button>`;
}

export function render(root) {
  const r = state.records;
  const known = state.lists.reduce((n, l) => n + l.words.filter((w) => w.lvl >= 3).length, 0);
  const total = state.lists.reduce((n, l) => n + l.words.length, 0);
  const earned = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  const today = todayKey();

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const k = addDays(today, -i);
    week.push(`<div class="${i === 0 ? 'today' : ''}">${ringsSVG(ringProgress(k), { size: 42, stroke: 5, gap: 1.2 })}${DAY_LETTERS[keyToDate(k).getDay()]}</div>`);
  }

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const ea = state.achievements[a.id] ? 1 : 0;
    const eb = state.achievements[b.id] ? 1 : 0;
    if (ea !== eb) return eb - ea;
    return achievementProgress(b).progress - achievementProgress(a).progress;
  });

  root.innerHTML = `
    <header class="titlebar">
      <div><div class="eyebrow">${earned} van ${ACHIEVEMENTS.length} medailles</div><h1 class="large-title">Prestaties</h1></div>
    </header>

    <div class="grid-2">
      <div class="card stat-tile" style="--c:var(--yellow)"><span class="k">${icon('star')} Totale XP</span><span class="v">${nl(state.profile.xp)}</span></div>
      <div class="card stat-tile" style="--c:var(--green)"><span class="k">${icon('check')} Woorden gekend</span><span class="v">${nl(known)}<small>/${nl(total)}</small></span></div>
      <div class="card stat-tile" style="--c:var(--orange)"><span class="k">${icon('flame')} Beste combo</span><span class="v">${nl(r.bestCombo)}</span></div>
      <div class="card stat-tile" style="--c:var(--red)"><span class="k">${icon('flame')} Langste reeks</span><span class="v">${nl(state.streak.best)}<small> ${state.streak.best === 1 ? 'dag' : 'dagen'}</small></span></div>
      <div class="card stat-tile" style="--c:var(--accent)"><span class="k">${icon('cards')} Sessies</span><span class="v">${nl(r.sessions)}</span></div>
      <div class="card stat-tile" style="--c:var(--teal)"><span class="k">${icon('clock')} Studietijd</span><span class="v" style="font-size:24px">${fmtDuration(r.seconds)}</span></div>
    </div>

    <div class="section"><h2>Deze week</h2><span class="muted small">Level ${levelInfo(state.profile.xp).level}</span></div>
    <div class="card week-rings">${week.join('')}</div>

    <div class="section"><h2>Medailles</h2><span class="muted small">${earned}/${ACHIEVEMENTS.length}</span></div>
    <div class="medals">${sorted.map(medalHTML).join('')}</div>
  `;
  animateRings(root);

  root.querySelectorAll('[data-medal]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = ACHIEVEMENTS.find((x) => x.id === b.dataset.medal);
      if (a) openMedal(a);
    })
  );
}

function openMedal(a) {
  const when = state.achievements[a.id];
  const p = achievementProgress(a);
  openSheet({
    title: 'Medaille',
    body: `<div class="medal-big${when ? '' : ' locked'}">
      <span class="medal-disc" style="--t1:${a.tint[0]};--t2:${a.tint[1]};${when ? '' : 'filter:grayscale(1);opacity:.45'}"><span>${a.emoji}</span></span>
      <h2>${esc(a.title)}</h2>
      <p>${esc(a.desc)}</p>
      ${
        when
          ? `<span class="tag" style="background:color-mix(in srgb, var(--green) 16%, transparent);color:var(--green)">Behaald op ${new Date(when).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>`
          : `<div style="width:min(260px,100%)"><div class="bar"><div class="bar-fill" style="width:${p.progress * 100}%"></div></div><p class="small" style="margin-top:6px">${nl(p.value)} van ${nl(a.goal)} · beloning ${a.sparks || 40} vonken</p></div>`
      }
    </div>`,
  });
  if (when) {
    sfx.levelUp();
    haptic('success');
  } else {
    sfx.tap();
  }
}
