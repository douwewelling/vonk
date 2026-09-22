// Koppel: tik woord en vertaling bij elkaar, zo snel mogelijk. Fout = 2 seconden straf.

import { state, save } from '../store.js';
import { esc, shuffle, sleep, fmtClock, centerOf } from '../util.js';
import { icon, floatText, toast } from '../ui.js';
import { openStage, countdown, shout, GRADS } from './stage.js';
import { Scorer } from './scoring.js';
import { showResults } from './results.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';
import { sparkle } from '../fx/confetti.js';

const PER_BOARD = 6;
const PENALTY = 2000;

const fmtMs = (ms) => {
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1).replace('.', ',')} s` : fmtClock(s);
};

function startCard(stage, list, boards) {
  const best = state.records.match[list.id];
  stage.body.classList.add('center');
  stage.body.innerHTML = `<div class="start-card">
    <span class="mode-icon" style="--g:linear-gradient(150deg,#34E08A,#00B3A4);--gc:#00B3A4">${icon('puzzle')}</span>
    <h2>Koppel</h2>
    <p>Tik een woord en daarna de vertaling. Maak het bord zo snel mogelijk leeg.</p>
    <div class="rules">
      <div class="rule" style="--c:var(--green)">${icon('cards')} <span>${boards} ${boards === 1 ? 'bord' : 'borden'} van maximaal ${PER_BOARD} paren</span></div>
      <div class="rule" style="--c:var(--red)">${icon('close')} <span>Fout koppel kost ${PENALTY / 1000} seconden</span></div>
      <div class="rule" style="--c:var(--yellow)">${icon('crown')} <span>${best ? `Jouw record: ${fmtMs(best)}` : 'Zet je eerste record neer'}</span></div>
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

export async function startMatch(list) {
  if (list.words.length < 3) {
    toast('Koppel heeft minstens 3 woorden nodig', { icon: 'info', color: 'var(--orange)' });
    return;
  }
  const words = shuffle(list.words).slice(0, list.words.length >= 10 ? 12 : Math.min(PER_BOARD, list.words.length));
  const boards = [];
  for (let i = 0; i < words.length; i += PER_BOARD) boards.push(words.slice(i, i + PER_BOARD));
  if (boards.length > 1 && boards[boards.length - 1].length < 3) boards[boards.length - 2].push(...boards.pop());

  const stage = openStage();
  const go = await startCard(stage, list, boards.length);
  if (!go || go.aborted || stage.aborted) return;
  stage.keyHandler = null;
  list.lastPlayed = Date.now();
  state.currentListId = list.id;
  await countdown(stage);
  if (stage.aborted) return;

  const scorer = new Scorer(stage, { allowShield: false });
  stage.onQuit = () => stage.abort();
  stage.body.classList.remove('center');
  stage.body.innerHTML = `<div class="match-head"><span class="eyebrow" data-board></span><span class="match-time num" data-time>0,0 s</span></div><div data-grid></div>`;
  const timeEl = stage.body.querySelector('[data-time]');
  const boardEl = stage.body.querySelector('[data-board]');
  const gridHost = stage.body.querySelector('[data-grid]');

  const t0 = performance.now();
  let penalty = 0;
  let mistakes = 0;
  let matched = 0;
  const total = words.length;
  const frame = () => {
    if (stage.aborted || finished) return;
    timeEl.textContent = fmtMs(performance.now() - t0 + penalty);
    requestAnimationFrame(frame);
  };
  let finished = false;
  requestAnimationFrame(frame);

  for (let b = 0; b < boards.length && !stage.aborted; b++) {
    boardEl.textContent = boards.length > 1 ? `Bord ${b + 1} van ${boards.length}` : 'Koppel de paren';
    const set = boards[b];
    const left = shuffle(set);
    const right = shuffle(set);
    gridHost.innerHTML = `<div class="match-grid q-wrap">
      <div class="match-col">${left.map((w) => `<button class="mtile" data-side="a" data-id="${w.id}">${esc(w.a)}</button>`).join('')}</div>
      <div class="match-col">${right.map((w) => `<button class="mtile" data-side="b" data-id="${w.id}">${esc(w.b)}</button>`).join('')}</div>
    </div>`;

    const r = await stage.race(
      new Promise((resolve) => {
        let sel = null;
        let left = set.length;
        gridHost.addEventListener('click', function onClick(e) {
          const t = e.target.closest('.mtile');
          if (!t || t.classList.contains('ok')) return;
          if (!sel) {
            sel = t;
            t.classList.add('sel');
            sfx.tap();
            haptic('select');
            return;
          }
          if (sel === t) {
            t.classList.remove('sel');
            sel = null;
            return;
          }
          if (sel.dataset.side === t.dataset.side) {
            sel.classList.remove('sel');
            sel = t;
            t.classList.add('sel');
            sfx.tap();
            return;
          }
          const a = sel;
          sel = null;
          a.classList.remove('sel');
          if (a.dataset.id === t.dataset.id) {
            a.classList.add('ok');
            t.classList.add('ok');
            matched++;
            left--;
            stage.setProgress(matched / total);
            scorer.hit({ base: 3, at: t, critChance: 0.05 });
            sfx.match(scorer.combo);
            const p = centerOf(t);
            sparkle(p.x, p.y, { count: 8 });
            setTimeout(() => {
              a.classList.add('gone');
              t.classList.add('gone');
            }, 520);
            if (!left) {
              gridHost.removeEventListener('click', onClick);
              setTimeout(() => resolve({ cleared: true }), 560);
            }
          } else {
            a.classList.add('bad');
            t.classList.add('bad');
            penalty += PENALTY;
            mistakes++;
            scorer.miss();
            const p = centerOf(timeEl);
            floatText(p.x, p.y + 26, `+${PENALTY / 1000}s`, 'bad');
            setTimeout(() => {
              a.classList.remove('bad');
              t.classList.remove('bad');
            }, 420);
          }
        });
      })
    );
    if (!r || r.aborted || stage.aborted) break;
    if (b < boards.length - 1) {
      sfx.whoosh();
      shout('Volgende!', { grad: GRADS.green });
      await sleep(500);
    }
  }
  finished = true;
  if (stage.closed) return;
  if (stage.aborted) {
    stage.close();
    return;
  }

  const ms = Math.round(performance.now() - t0 + penalty);
  timeEl.textContent = fmtMs(ms);
  const best = state.records.match[list.id];
  const record = !best || ms < best;
  if (record) state.records.match[list.id] = ms;
  state.records.bestCombo = Math.max(state.records.bestCombo, scorer.best);
  save();
  haptic('success');

  await showResults(stage, {
    title: record ? (best ? 'Nieuw record!' : 'Eerste record!') : 'Alles gekoppeld!',
    subtitle: record && best ? `${fmtMs(best - ms)} sneller dan je vorige record.` : mistakes ? `${mistakes} ${mistakes === 1 ? 'fout' : 'fouten'} kostte je ${fmtMs(mistakes * PENALTY)}.` : 'Zonder één fout!',
    badge: { text: fmtMs(ms).replace(' s', 's'), grad: 'linear-gradient(150deg,#34E08A,#00B3A4)' },
    stats: [
      { k: 'Tijd', v: Math.round(ms / 100), icon: 'clock', c: 'var(--teal)', fmt: 'grade', suffix: ' s' },
      { k: 'Record', v: Math.round(Math.min(ms, best || ms) / 100), icon: 'crown', c: 'var(--yellow)', fmt: 'grade', suffix: ' s' },
      { k: 'Fouten', v: mistakes, icon: 'close', c: 'var(--red)' },
      { k: 'XP verdiend', v: scorer.xp, icon: 'star', c: 'var(--yellow)' },
    ],
    xp: scorer.xp,
    correct: scorer.correct,
    seconds: ms / 1000,
    chest: record ? 0 : null,
    celebrate: record,
    actions: [{ text: 'Nog een keer', icon: 'repeat', onClick: () => startMatch(list) }],
  });
}
