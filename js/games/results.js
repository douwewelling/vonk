// Het eindscherm: een waterval van beloningen (XP, level, reeks, ringen, kist, medailles).

import { state, addActivity, commit, day, ringProgress } from '../store.js';
import { levelInfo, gainXp, rollChest, grantReward, describeReward, RARITY, checkAchievements, applyTheme, theme } from '../rewards.js';
import { h, esc, nl, countUp, sleep, centerOf, plural } from '../util.js';
import { icon, ringsSVG, animateRings, toast } from '../ui.js';
import { LEVELS } from '../srs.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';
import { celebrate, confetti, sparkle, GOLD, PARTY } from '../fx/confetti.js';

/** Verwerkt XP en activiteit van een potje. */
export function commitRun({ xp = 0, correct = 0, seconds = 0, countSession = false }) {
  const xpBefore = state.profile.xp;
  const lvlBefore = levelInfo(xpBefore).level;
  const a1 = addActivity({ correct, seconds: Math.round(seconds) });
  const g = xp > 0 ? gainXp(xp) : { levelBefore: lvlBefore, levelAfter: lvlBefore, activity: { ringsClosed: [], allClosed: false, streak: null } };
  const allClosed = a1.allClosed || g.activity.allClosed;
  if (allClosed) state.records.perfectDays = (state.records.perfectDays || 0) + 1;
  state.records.totalCorrect += correct;
  state.records.seconds += Math.round(seconds);
  if (countSession) {
    state.records.sessions++;
    day().sessions++;
    const hr = new Date().getHours();
    if (hr >= 22) state.records.nightOwl++;
    if (hr < 7) state.records.earlyBird++;
  }
  const unlocked = checkAchievements();
  commit();
  return {
    xpBefore,
    xpAfter: state.profile.xp,
    levelBefore: g.levelBefore,
    levelAfter: g.levelAfter,
    ringsClosed: [...a1.ringsClosed, ...g.activity.ringsClosed],
    allClosed,
    streak: a1.streak || g.activity.streak,
    unlocked,
  };
}

const RING_NAMES = { xp: 'XP-ring', correct: 'Goed-ring', time: 'Minutenring' };

let chestUid = 0;
function chestSVG() {
  const id = `cg${++chestUid}`;
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--c1)"/><stop offset="1" stop-color="var(--c2)"/></linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="38" ry="5" fill="#000" opacity=".12"/>
    <g>
      <rect x="18" y="52" width="84" height="56" rx="12" fill="url(#${id})"/>
      <rect x="18" y="52" width="84" height="26" rx="12" fill="url(#${id}s)"/>
      <rect x="53" y="52" width="14" height="56" fill="#fff" opacity=".92"/>
      <rect x="25" y="60" width="5" height="36" rx="2.5" fill="#fff" opacity=".3"/>
    </g>
    <g class="lid">
      <rect x="12" y="36" width="96" height="22" rx="9" fill="url(#${id})"/>
      <rect x="12" y="36" width="96" height="11" rx="6" fill="#fff" opacity=".25"/>
      <rect x="53" y="36" width="14" height="22" fill="#fff" opacity=".95"/>
      <path d="M60 36c-5-13-22-18-25-9-2 7 13 9 25 9zm0 0c5-13 22-18 25-9 2 7-13 9-25 9z" fill="#fff"/>
      <circle cx="60" cy="35" r="5.5" fill="#fff"/>
    </g>
  </svg>`;
}

function medalMini(a) {
  return `<div class="unlock">
    <div class="medal-disc" style="--t1:${a.tint[0]};--t2:${a.tint[1]}"><span>${a.emoji}</span></div>
    <div class="row-main"><div class="row-title">${esc(a.title)}</div><div class="row-sub">Medaille behaald · +${a.sparks || 40} vonken</div></div>
  </div>`;
}

/**
 * @param {object} stage
 * @param {{title: string, subtitle?: string, badge?: {icon?: string, text?: string, grad?: string},
 *   stats?: {k: string, v: number, icon: string, c?: string, suffix?: string, fmt?: 'pct'|'time'|'grade'}[],
 *   xp?: number, correct?: number, seconds?: number, countSession?: boolean, chest?: number|null,
 *   changes?: {word: object, list: object, from: number, to: number}[], note?: string,
 *   actions?: {text: string, style?: string, icon?: string, onClick: Function}[], celebrate?: boolean}} run
 */
export async function showResults(stage, run) {
  stage.keyHandler = null;
  stage.onQuit = () => stage.close();
  stage.setProgress(1);
  stage.setHeat(0.3);
  const res = commitRun(run);

  const fmt = (s) => (v) => (s.fmt === 'pct' ? `${v}` : s.fmt === 'grade' ? nl(v / 10, 1) : s.fmt === 'time' ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : nl(v));
  const badge = run.badge || { icon: 'check' };
  const lb = levelInfo(res.xpBefore);

  stage.body.classList.remove('center');
  stage.body.innerHTML = `<div class="results">
    <div class="results-hero">
      <div class="results-badge${badge.text != null ? ' big-num' : ''}" style="${badge.grad ? `--g:${badge.grad}` : ''}">${badge.text != null ? esc(badge.text) : icon(badge.icon || 'check')}</div>
      <h2>${esc(run.title)}</h2>
      ${run.subtitle ? `<p>${esc(run.subtitle)}</p>` : ''}
    </div>
    ${run.stats?.length ? `<div class="stat-row">${run.stats
      .map(
        (s, i) => `<div class="rstat" style="--c:${s.c || 'var(--accent)'}">
          <div class="k">${icon(s.icon)} ${esc(s.k)}</div>
          <div class="v"><span data-stat="${i}">${fmt(s)(0)}</span>${s.suffix ? `<small>${esc(s.suffix)}</small>` : ''}</div>
        </div>`
      )
      .join('')}</div>` : ''}
    <div class="card level-card" data-level>
      <div class="level-badge" data-lvl>${lb.level}</div>
      <div>
        <div class="level-top"><strong data-ltitle>${esc(lb.title)}</strong><span data-lxp>+${nl(run.xp || 0)} XP</span></div>
        <div class="bar"><div class="bar-fill" style="width:${lb.progress * 100}%"></div></div>
      </div>
    </div>
    <div data-slot="events" class="stack"></div>
    <div data-slot="chest"></div>
    <div data-slot="changes"></div>
    <div data-slot="unlocks" class="unlocks"></div>
    ${run.note ? `<p class="footnote" style="text-align:center">${esc(run.note)}</p>` : ''}
    <div class="results-actions">
      ${(run.actions || [])
        .map((a, i) => `<button class="btn ${a.style || 'btn-tinted'} btn-block" data-act="${i}">${a.icon ? icon(a.icon) : ''}${esc(a.text)}</button>`)
        .join('')}
      <button class="btn btn-primary btn-block" data-done>Klaar</button>
    </div>
  </div>`;
  stage.body.scrollTop = 0;

  const $ = (sel) => stage.body.querySelector(sel);
  let closeResolve;
  let chestCtl = null;
  const closed = new Promise((r) => (closeResolve = r));
  const leave = () => {
    sfx.tap();
    if (chestCtl && !chestCtl.opened) chestCtl.forceOpen();
    stage.close();
    closeResolve();
  };
  $('[data-done]').addEventListener('click', leave);
  stage.body.querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', () => {
      leave();
      setTimeout(() => run.actions[+b.dataset.act].onClick(), 380);
    })
  );
  stage.keyHandler = (e) => {
    if (e.key === 'Enter' && !stage.body.querySelector('.chest.idle, .chest.t1, .chest.t2')) {
      e.preventDefault();
      $('[data-done]').click();
    }
  };

  if (run.celebrate) {
    celebrate({ big: true });
    sfx.victory();
  } else {
    sfx.ring();
  }

  // 1. Statistieken tellen op
  await sleep(250);
  (run.stats || []).forEach((s, i) => countUp(stage.body.querySelector(`[data-stat="${i}"]`), s.v, { duration: 900, format: fmt(s) }));
  await sleep(800);

  // 2. Levelbalk
  await animateLevel(stage, res.xpBefore, res.xpAfter);

  // 3. Reeks & ringen
  const events = $('[data-slot="events"]');
  if (res.streak) {
    const s = res.streak;
    events.appendChild(
      h(`<div class="level-up-banner" style="background:linear-gradient(135deg,#FFB340,#FF5E3A)">
        <div class="level-badge">${icon('flame')}</div>
        <div><b>Reeks: ${plural(s.count, 'dag', 'dagen')}</b><div class="small" style="opacity:.9">${s.usedFreeze ? 'Je reeksbevriezer heeft je reeks gered!' : s.count === 1 ? 'Kom morgen terug om hem te laten groeien.' : 'Je hebt vandaag geleerd. Top!'}</div></div>
      </div>`)
    );
    sfx.combo(10);
    haptic('success');
    await sleep(500);
  }
  if (res.ringsClosed.length) {
    const rp = ringProgress();
    const el = h(`<div class="card" style="display:flex;align-items:center;gap:14px">
      ${ringsSVG(rp, { size: 64, stroke: 8, gap: 2 })}
      <div><b>${res.allClosed ? 'Alle ringen rond!' : `${res.ringsClosed.map((r) => RING_NAMES[r]).join(' en ')} gesloten!`}</b>
      <div class="small muted">${res.allClosed ? 'Je dagdoel is helemaal gehaald.' : 'Nog even doorgaan voor de rest?'}</div></div>
    </div>`);
    events.appendChild(el);
    animateRings(el);
    sfx.ring();
    haptic('success');
    confetti({ x: innerWidth / 2, y: innerHeight * 0.5, count: res.allClosed ? 120 : 50, spread: 120, power: 14 });
    await sleep(600);
  }

  // 4. Woorden die stegen
  if (run.changes?.length) {
    const ups = run.changes.filter((c) => c.to > c.from).sort((a, b) => b.to - a.to);
    const downs = run.changes.filter((c) => c.to < c.from);
    const shown = [...ups.slice(0, 6), ...downs.slice(0, 3)];
    if (shown.length) {
      $('[data-slot="changes"]').innerHTML = `<div class="section" style="margin-top:4px"><h2>Woorden</h2><span class="muted small">${ups.length} omhoog${downs.length ? ` · ${downs.length} opnieuw` : ''}</span></div>
      <div class="group word-changes">${shown
        .map(
          (c) => `<div class="row word-change"><div class="row-main"><div class="row-title">${esc(c.word.a)}</div><div class="row-sub">${esc(c.word.b)}</div></div>
          <span class="lvl-arrow${c.to < c.from ? ' down' : ''}">${esc(LEVELS[c.to])} ${c.to > c.from ? '↑' : '↺'}</span></div>`
        )
        .join('')}</div>`;
    }
  }

  // 5. Medailles
  const showUnlocks = async (list) => {
    const box = $('[data-slot="unlocks"]');
    for (const a of list) {
      if (stage.closed) return;
      box.appendChild(h(medalMini(a)));
      sfx.levelUp();
      haptic('success');
      const p = centerOf(box.lastElementChild.querySelector('.medal-disc'));
      sparkle(p.x, p.y, { count: 20 });
      await sleep(500);
    }
  };
  const unlocked = [...res.unlocked, ...checkAchievements()];
  if (unlocked.length) {
    commit();
    await showUnlocks(unlocked);
  }

  // 6. Kist: als laatste, jij bepaalt wanneer hij opengaat
  if (run.chest != null && !stage.closed) {
    chestCtl = chestFlow(stage, $('[data-slot="chest"]'), run.chest);
    await chestCtl.promise;
    const more = checkAchievements();
    if (more.length) {
      commit();
      await showUnlocks(more);
    }
  }

  return closed;
}

async function animateLevel(stage, fromXp, toXp) {
  const card = stage.body.querySelector('[data-level]');
  const fill = card.querySelector('.bar-fill');
  const a = levelInfo(fromXp);
  const b = levelInfo(toXp);
  if (b.level > a.level) {
    fill.style.width = '100%';
    await sleep(900);
    card.querySelector('[data-lvl]').textContent = b.level;
    card.querySelector('[data-ltitle]').textContent = b.title;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    void fill.offsetWidth;
    fill.style.transition = '';
    fill.style.width = `${b.progress * 100}%`;
    const banner = h(`<div class="level-up-banner">
      <div class="level-badge">${b.level}</div>
      <div><b>Level ${b.level} bereikt!</b><div class="small" style="opacity:.9">Je bent nu ${esc(b.title)}.</div></div>
    </div>`);
    card.after(banner);
    sfx.levelUp();
    haptic('heavy');
    celebrate({ big: true });
    await sleep(900);
  } else {
    fill.style.width = `${b.progress * 100}%`;
    await sleep(700);
  }
}

/**
 * Een kist die je met drie tikken opent. Geeft een controller terug zodat een
 * ongeopende kist bij het sluiten alsnog wordt uitgekeerd.
 */
function chestFlow(stage, slot, minRarity) {
  const roll = rollChest(minRarity);
  const rar = RARITY[roll.rarity];
  const t = theme(state.settings.theme);
  slot.innerHTML = `<div class="chest-zone" style="--rc:${t.grad[0]}">
    <div class="chest-rays"></div>
    <button class="chest idle" aria-label="Kist openen" style="--c1:${t.grad[0]};--c2:${t.grad[t.grad.length - 1]}">${chestSVG()}</button>
    <p class="tap-hint">Tik om je kist te openen</p>
  </div>`;
  const zone = slot.querySelector('.chest-zone');
  const btn = zone.querySelector('.chest');
  const hint = zone.querySelector('.tap-hint');
  setTimeout(() => zone.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);

  const ctl = { opened: false, promise: null, forceOpen: null };
  let resolveP;
  ctl.promise = new Promise((r) => (resolveP = r));

  const grant = () => {
    ctl.opened = true;
    const xpRes = grantReward(roll.reward, roll.rarity);
    commit();
    return xpRes;
  };

  ctl.forceOpen = () => {
    if (ctl.opened) return;
    grant();
    const d = describeReward(roll.reward);
    toast(`${rar.name} kist: ${d.title}`, { icon: d.icon, color: rar.color, duration: 2600 });
    resolveP();
  };

  let taps = 0;
  btn.addEventListener('click', () => {
    if (taps >= 3 || ctl.opened) return;
    taps++;
    btn.classList.remove('idle', 't1', 't2', 't3');
    void btn.offsetWidth;
    const p = centerOf(btn);
    if (taps === 1) {
      btn.classList.add('t1');
      sfx.chestTap(1);
      haptic('light');
      hint.textContent = 'Nog twee keer…';
    } else if (taps === 2) {
      zone.style.setProperty('--rc', rar.color);
      btn.style.setProperty('--c1', rar.grad[0]);
      btn.style.setProperty('--c2', rar.grad[1]);
      btn.classList.add('t2');
      sfx.chestTap(2);
      haptic('medium');
      sparkle(p.x, p.y, { colors: [rar.color, '#fff'], count: 12 + roll.rarity * 6 });
      hint.textContent = roll.rarity >= 2 ? 'Wauw, die gloeit…' : 'Nog één keer!';
    } else {
      btn.classList.add('t3');
      sfx.chestTap(3);
      haptic('heavy');
      setTimeout(open, 480);
    }
  });

  function open() {
    if (ctl.opened) return;
    btn.classList.add('open');
    zone.classList.add('opened');
    sfx.chestOpen(roll.rarity);
    haptic('success');
    const p = centerOf(btn);
    const colors = roll.rarity === 3 ? GOLD : [rar.color, ...PARTY.slice(0, 3), '#fff'];
    confetti({ x: p.x, y: p.y, count: 50 + roll.rarity * 40, spread: 360, power: 10 + roll.rarity * 2, colors, gravity: 0.24 });
    if (roll.rarity >= 2) setTimeout(() => celebrate({ colors, big: roll.rarity === 3 }), 250);

    const xpRes = grant();
    const d = describeReward(roll.reward);
    const card = h(`<div class="reward-card">
      <span class="rar">${esc(rar.name)}</span>
      <span class="ric">${icon(d.icon)}</span>
      <b>${esc(d.title)}</b>
      <span>${esc(d.sub)}</span>
      ${roll.reward.type === 'theme' ? '<button class="btn btn-small btn-tinted" data-apply style="margin-top:6px">Nu gebruiken</button>' : ''}
    </div>`);
    hint.replaceWith(card);
    card.querySelector('[data-apply]')?.addEventListener('click', (e) => {
      state.settings.theme = roll.reward.id;
      applyTheme(roll.reward.id);
      commit();
      e.currentTarget.textContent = 'In gebruik';
      e.currentTarget.disabled = true;
      sfx.pop();
    });
    if (xpRes) {
      const b = levelInfo(state.profile.xp);
      const lc = stage.body.querySelector('[data-level]');
      lc.querySelector('[data-lvl]').textContent = b.level;
      lc.querySelector('[data-ltitle]').textContent = b.title;
      lc.querySelector('.bar-fill').style.width = `${b.progress * 100}%`;
      if (xpRes.levelAfter > xpRes.levelBefore) setTimeout(() => sfx.levelUp(), 600);
    }
    setTimeout(resolveP, 700);
  }

  return ctl;
}
