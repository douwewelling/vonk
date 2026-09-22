// Blitz: zoveel mogelijk goed in 60 seconden. Fout kost 2 seconden.

import { state, save } from '../store.js';
import { sleep, centerOf, nl } from '../util.js';
import { icon, floatText, toast } from '../ui.js';
import { weightedPick, pickDirection } from '../srs.js';
import { openStage, countdown, shout, GRADS } from './stage.js';
import { Scorer } from './scoring.js';
import { exMC } from './exercises.js';
import { showResults } from './results.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';

const DURATION = 60;
const PENALTY = 2;

function poolFor(list, dir) {
  return list.words.map((w) => (dir === 'ab' ? w.b : w.a));
}

function startCard(stage, list) {
  const best = state.records.blitz[list.id] || 0;
  stage.body.classList.add('center');
  stage.body.innerHTML = `<div class="start-card">
    <span class="mode-icon" style="--g:linear-gradient(150deg,#FFD60A,#FF9500);--gc:#FF9500">${icon('bolt')}</span>
    <h2>Blitz</h2>
    <p>Zoveel mogelijk woorden in ${DURATION} seconden. Snel denken, niet twijfelen.</p>
    <div class="rules">
      <div class="rule" style="--c:var(--orange)">${icon('clock')} <span>${DURATION} seconden op de klok</span></div>
      <div class="rule" style="--c:var(--red)">${icon('close')} <span>Fout antwoord kost ${PENALTY} seconden</span></div>
      <div class="rule" style="--c:var(--pink)">${icon('flame')} <span>Combo's vermenigvuldigen je XP</span></div>
      <div class="rule" style="--c:var(--yellow)">${icon('crown')} <span>${best ? `Jouw record: ${best}` : 'Zet je eerste record neer'}</span></div>
    </div>
    <button class="btn btn-primary btn-block" data-start>${icon('play')} Start</button>
  </div>`;
  return stage.race(
    new Promise((resolve) => {
      const btn = stage.body.querySelector('[data-start]');
      btn.addEventListener('click', () => resolve(true), { once: true });
      stage.keyHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          resolve(true);
        }
      };
      setTimeout(() => btn.focus({ preventScroll: true }), 100);
    })
  );
}

export async function startBlitz(list) {
  if (list.words.length < 4) {
    toast('Blitz heeft minstens 4 woorden nodig', { icon: 'info', color: 'var(--orange)' });
    return;
  }
  const stage = openStage();
  stage.hideProgress();
  const go = await startCard(stage, list);
  if (!go || go.aborted || stage.aborted) return;
  stage.keyHandler = null;
  list.lastPlayed = Date.now();
  state.currentListId = list.id;
  await countdown(stage);
  if (stage.aborted) return;

  const scorer = new Scorer(stage, { allowShield: false });
  let score = 0;
  let timeLeft = DURATION;
  let last = null;
  const R = 32;
  const C = 2 * Math.PI * R;

  stage.body.classList.remove('center');
  stage.body.innerHTML = `
    <div class="blitz-head">
      <div class="timer"><svg viewBox="0 0 74 74"><circle class="track" cx="37" cy="37" r="${R}" fill="none" stroke-width="7"/><circle class="arc" cx="37" cy="37" r="${R}" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><b>${DURATION}</b></div>
      <div></div>
      <div class="score-big"><b class="num" data-score>0</b><span>punten</span></div>
    </div>
    <div data-q></div>`;
  const timerEl = stage.body.querySelector('.timer');
  const arc = timerEl.querySelector('.arc');
  const tLabel = timerEl.querySelector('b');
  const scoreEl = stage.body.querySelector('[data-score]');
  const qHost = stage.body.querySelector('[data-q]');

  stage.onQuit = () => stage.abort();

  let timeUp;
  const timeUpP = new Promise((r) => (timeUp = r));
  let lastTick = performance.now();
  let lastWhole = DURATION;
  let ticker = 0;
  const tick = () => {
    if (stage.aborted) {
      clearInterval(ticker);
      return;
    }
    const t = performance.now();
    timeLeft -= (t - lastTick) / 1000;
    lastTick = t;
    const shown = Math.max(0, Math.ceil(timeLeft));
    tLabel.textContent = shown;
    arc.setAttribute('stroke-dashoffset', String(C * (1 - Math.max(0, timeLeft) / DURATION)));
    timerEl.classList.toggle('urgent', timeLeft <= 10);
    if (shown !== lastWhole) {
      lastWhole = shown;
      if (shown <= 10 && shown > 0) sfx.tick(shown <= 5);
    }
    if (timeLeft <= 0) {
      clearInterval(ticker);
      timeUp({ timeUp: true });
    }
  };
  // setInterval i.p.v. requestAnimationFrame: de klok loopt ook door als de app even op de achtergrond staat.
  ticker = setInterval(tick, 100);

  while (timeLeft > 0 && !stage.aborted) {
    const word = weightedPick(list.words, last);
    last = word;
    const dir = pickDirection(list);
    const r = await Promise.race([exMC(stage, qHost, { word, list, dir, pool: poolFor(list, dir), variant: 'blitz' }), timeUpP]);
    if (!r || r.aborted || r.timeUp || stage.aborted) break;
    if (r.correct) {
      score++;
      scoreEl.textContent = nl(score);
      scorer.hit({ base: 3, fast: r.ms < 1600, at: r.el, critChance: 0.08 });
      await sleep(230);
    } else {
      timeLeft -= PENALTY;
      scorer.miss();
      word.wrong++;
      if (word.lvl >= 3) word.due = Math.min(word.due, Date.now());
      const p = centerOf(timerEl);
      floatText(p.x, p.y + 30, `−${PENALTY}s`, 'bad');
      await sleep(650);
    }
  }
  if (stage.closed) return;
  if (stage.aborted && timeLeft > 0) {
    stage.close();
    return;
  }

  // Tijd voorbij
  stage.keyHandler = null;
  sfx.whoosh();
  haptic('heavy');
  shout('Tijd!', { grad: GRADS.crit });
  await sleep(900);

  const best = state.records.blitz[list.id] || 0;
  const record = score > best;
  if (record) state.records.blitz[list.id] = score;
  state.records.bestCombo = Math.max(state.records.bestCombo, scorer.best);
  state.records.crits += scorer.crits;
  save();

  await showResults(stage, {
    title: record ? (best ? 'Nieuw record!' : 'Eerste record!') : 'Tijd voorbij!',
    subtitle: record ? (best ? `Je oude record was ${best}. Knap!` : 'Nu is het aan je volgende poging.') : `Nog ${best - score + 1} punten voor een nieuw record.`,
    badge: { text: String(score), grad: 'linear-gradient(150deg,#FFD60A,#FF9500)' },
    stats: [
      { k: 'Score', v: score, icon: 'bolt', c: 'var(--orange)' },
      { k: 'Record', v: Math.max(best, score), icon: 'crown', c: 'var(--yellow)' },
      { k: 'XP verdiend', v: scorer.xp, icon: 'star', c: 'var(--yellow)' },
      { k: 'Nauwkeurig', v: Math.round(scorer.accuracy * 100), icon: 'target', c: 'var(--green)', suffix: '%' },
    ],
    xp: scorer.xp,
    correct: scorer.correct,
    seconds: DURATION,
    chest: record && score >= 10 ? 0 : null,
    celebrate: record,
    note: 'Blitz traint snel herkennen. Fout gegane woorden komen vaker terug in je sessies.',
    actions: [{ text: 'Nog een keer', icon: 'repeat', onClick: () => startBlitz(list) }],
  });
}
