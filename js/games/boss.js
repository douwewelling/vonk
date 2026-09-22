// Eindbaas: een toets-simulatie. Elk goed getypt woord raakt de baas, elke fout kost een hart.
// Na afloop krijg je een geschat cijfer op de Nederlandse schaal van 1 tot 10.

import { state, save } from '../store.js';
import { esc, shuffle, sleep, pick, hashStr, nl, centerOf, randomInt } from '../util.js';
import { icon, floatText, toast, segmented } from '../ui.js';
import { passStep, failStep, pickDirection, weightedPick, hasSentencePair, canCloze } from '../srs.js';
import { openStage, countdown, shout, GRADS } from './stage.js';
import { Scorer } from './scoring.js';
import { exType, exSentence, exCloze, showFeedback } from './exercises.js';
import { showResults } from './results.js';
import { startLearn } from './learn.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';
import { celebrate } from '../fx/confetti.js';

const NAMES = ['Grammaticus', 'De Woordvreter', 'Spellingspook', 'Toetstrol', 'Meneer Overhoring', 'Vocabulator', 'Dr. Dictee', 'De Grote Blunder'];
const TAUNT_START = ['Denk je dat je mij kunt verslaan?', 'Ken je je woordjes wel?', 'Laat maar zien wat je kunt!'];
const TAUNT_HIT = ['Haha, mis!', "Dat was 'm niet!", 'Nog eens proberen?', 'Oefenen, oefenen!'];
const TAUNT_HURT = ['Au!', 'Hé!', 'Oei…', 'Dat deed pijn!', 'Grrr!'];
const TAUNT_LOW = ['Nee… niet zo snel!', 'Genade!', 'Ik voel me zwak…'];

function bossSVG(hue) {
  const id = `b${hue}${Math.random().toString(36).slice(2, 6)}`;
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="${id}" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="hsl(${hue} 95% 72%)"/>
        <stop offset="1" stop-color="hsl(${hue} 70% 42%)"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="190" rx="58" ry="7" fill="#000" opacity=".14"/>
    <path d="M60 66 44 18l38 32z" fill="hsl(${hue} 55% 32%)"/>
    <path d="M140 66 156 18l-38 32z" fill="hsl(${hue} 55% 32%)"/>
    <path d="M100 32c50 0 78 40 78 88 0 42-32 64-78 64s-78-22-78-64c0-48 28-88 78-88z" fill="url(#${id})"/>
    <ellipse cx="100" cy="146" rx="46" ry="28" fill="#fff" opacity=".16"/>
    <ellipse cx="70" cy="58" rx="16" ry="9" fill="#fff" opacity=".35" transform="rotate(-25 70 58)"/>
    <g class="eyes">
      <ellipse cx="74" cy="100" rx="17" ry="19" fill="#fff"/>
      <ellipse cx="126" cy="100" rx="17" ry="19" fill="#fff"/>
      <circle cx="78" cy="104" r="8.5" fill="#1b1325"/>
      <circle cx="122" cy="104" r="8.5" fill="#1b1325"/>
      <circle cx="81" cy="100" r="2.8" fill="#fff"/>
      <circle cx="125" cy="100" r="2.8" fill="#fff"/>
    </g>
    <path d="M56 78l32 12M144 78l-32 12" stroke="#1b1325" stroke-width="7" stroke-linecap="round"/>
    <path d="M70 136q30 22 60 0q-30 8-60 0z" fill="#3a0d1c"/>
    <path d="M80 138l5 9 5-8M110 138l5 8 5-9" fill="#fff"/>
  </svg>`;
}

function chooseWords(list, count) {
  if (count === 'all' || count >= list.words.length) return shuffle(list.words);
  const pool = [...list.words];
  const out = [];
  while (out.length < count && pool.length) {
    const w = weightedPick(pool);
    out.push(w);
    pool.splice(pool.indexOf(w), 1);
  }
  return shuffle(out);
}

/** Welke zinsvraag kan er bij dit woord? */
const sentenceKind = (w) => (hasSentencePair(w) ? 'sentence' : canCloze(w) ? 'cloze' : null);

/** Zet gekozen woorden om in toetsvragen. */
function buildQuestions(words, mode) {
  const qs = [];
  for (const w of words) {
    const sk = sentenceKind(w);
    if (mode !== 'sentences' || !sk) qs.push({ w, kind: 'type' });
    if (mode !== 'words' && sk) qs.push({ w, kind: sk });
  }
  // Woord- en zinsvraag van hetzelfde woord niet direct na elkaar
  const shuffled = shuffle(qs);
  for (let i = 1; i < shuffled.length; i++) {
    if (shuffled[i].w === shuffled[i - 1].w) {
      const j = shuffled.findIndex((q, k) => k > i + 1 && q.w !== shuffled[i].w);
      if (j > 0) [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return shuffled;
}

function startCard(stage, list, hue, name) {
  const n = list.words.length;
  const withSentence = list.words.filter((w) => sentenceKind(w)).length;
  let mode = withSentence ? (list.useSentences ? 'mix' : 'words') : 'words';
  const counts = [
    [10, '10'],
    [20, '20'],
    ['all', `Alles (${n})`],
  ].filter(([v]) => v === 'all' || v < n);
  let count = n > 20 ? 20 : 'all';
  stage.body.classList.add('center');
  stage.body.innerHTML = `<div class="start-card">
    <div class="boss" style="width:130px;height:130px">${bossSVG(hue)}</div>
    <h2>${esc(name)}</h2>
    <p>De eindbaas overhoort je zoals op een echte toets: alles zelf typen. Versla hem voordat je hartjes op zijn.</p>
    <div class="rules">
      <div class="rule" style="--c:var(--red)">${icon('heart')} <span>Elke fout kost een hart</span></div>
      <div class="rule" style="--c:var(--green)">${icon('flame')} <span>5 goed op rij geeft een hart terug</span></div>
      <div class="rule" style="--c:var(--accent)">${icon('target')} <span>Aan het eind krijg je een geschat cijfer</span></div>
    </div>
    ${counts.length > 1 ? `<div style="width:100%"><span class="label" style="text-align:left">Aantal woorden</span>${segmented('count', counts, count)}</div>` : ''}
    ${withSentence ? `<div style="width:100%"><span class="label" style="text-align:left">Vragen</span>${segmented('mode', [['words', 'Woorden'], ['mix', 'Woorden + zinnen'], ['sentences', 'Alleen zinnen']], mode)}<p class="footnote" style="text-align:left;padding:8px 4px 0">Zinnen zijn invulzinnen: typ het woord dat op de streepjes hoort.</p></div>` : ''}
    <button class="btn btn-primary btn-block" data-start>${icon('bolt')} Vecht!</button>
  </div>`;
  stage.body.querySelectorAll('[data-seg]').forEach((seg) =>
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-value]');
      if (!b) return;
      if (seg.dataset.seg === 'count') count = b.dataset.value === 'all' ? 'all' : +b.dataset.value;
      else mode = b.dataset.value;
      seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      sfx.tap();
    })
  );
  return stage.race(
    new Promise((resolve) => {
      const btn = stage.body.querySelector('[data-start]');
      btn.addEventListener('click', () => resolve({ count, mode }), { once: true });
      setTimeout(() => btn.focus({ preventScroll: true }), 100);
    })
  );
}

export async function startBoss(list) {
  if (list.words.length < 3) {
    toast('De eindbaas wil minstens 3 woorden', { icon: 'info', color: 'var(--orange)' });
    return;
  }
  const hue = hashStr(list.id) % 360;
  const name = NAMES[hashStr(list.title) % NAMES.length];
  const stage = openStage();
  const choice = await startCard(stage, list, hue, name);
  if (!choice || choice.aborted || stage.aborted) return;
  list.lastPlayed = Date.now();
  state.currentListId = list.id;

  const words = chooseWords(list, choice.count);
  const queue = buildQuestions(words, choice.mode);
  const maxHp = queue.length;
  let hp = maxHp;
  const maxHearts = Math.min(5, 3 + Math.floor(maxHp / 15));
  let hearts = maxHearts;
  let heartsLost = 0;
  let streak = 0;
  const firstTry = new Set();
  const failed = new Set();
  const failedWords = new Set();
  const scorer = new Scorer(stage);

  await countdown(stage);
  if (stage.aborted) return;
  const startedAt = Date.now();

  stage.onQuit = () => stage.abort();
  stage.body.classList.remove('center');
  stage.body.innerHTML = `
    <div class="boss-top">
      <div class="boss-name"><span>${esc(name)}</span><span data-hp>${maxHp} / ${maxHp}</span></div>
      <div class="hp"><div class="hp-lag" style="width:100%"></div><div class="hp-fill" style="width:100%"></div></div>
      <div class="hearts" data-hearts></div>
    </div>
    <div class="arena"><div class="boss">${bossSVG(hue)}</div></div>
    <div data-ex></div>`;
  const hpText = stage.body.querySelector('[data-hp]');
  const hpFill = stage.body.querySelector('.hp-fill');
  const hpLag = stage.body.querySelector('.hp-lag');
  const heartsEl = stage.body.querySelector('[data-hearts]');
  const arena = stage.body.querySelector('.arena');
  const bossEl = arena.querySelector('.boss');
  const exHost = stage.body.querySelector('[data-ex]');

  const say = (text) => {
    arena.querySelector('.boss-say')?.remove();
    const b = document.createElement('div');
    b.className = 'boss-say';
    b.textContent = text;
    arena.appendChild(b);
    setTimeout(() => b.remove(), 1800);
  };
  const renderHearts = (gain = false) => {
    heartsEl.innerHTML = Array.from({ length: maxHearts }, (_, i) => icon('heart', i < hearts ? (gain && i === hearts - 1 ? 'gain' : '') : 'lost')).join('');
  };
  const setHp = () => {
    hpText.textContent = `${hp} / ${maxHp}`;
    const pct = `${(hp / maxHp) * 100}%`;
    hpFill.style.width = pct;
    hpLag.style.width = pct;
    stage.setProgress(1 - hp / maxHp);
  };
  const anim = (cls) => {
    bossEl.classList.remove('hit', 'attack');
    void bossEl.offsetWidth;
    bossEl.classList.add(cls);
    setTimeout(() => bossEl.classList.remove(cls), 600);
  };
  renderHearts();
  say(pick(TAUNT_START));

  while (queue.length && hearts > 0 && !stage.aborted) {
    const q = queue.shift();
    const w = q.w;
    const qid = `${w.id}:${q.kind}`;
    const dir = pickDirection(list);
    const r =
      q.kind === 'cloze'
        ? await exCloze(stage, exHost, { word: w, list })
        : q.kind === 'sentence'
          ? await exSentence(stage, exHost, { word: w, list, dir })
          : await exType(stage, exHost, { word: w, list, dir, compact: true, label: `Nog ${hp} te gaan` });
    if (!r || r.aborted || stage.aborted) break;

    let ok = r.correct;
    if (!ok) {
      hearts--;
      heartsLost++;
      streak = 0;
      renderHearts();
      anim('attack');
      sfx.bossAttack();
      stage.hurt();
      scorer.miss();
      say(pick(TAUNT_HIT));
      if (!failedWords.has(w.id)) failStep(w, 'type');
      failed.add(qid);
      failedWords.add(w.id);
      const fb = await showFeedback(stage, { kind: 'bad', word: w, list, dir, result: r, allowOverride: true });
      if (stage.aborted) break;
      if (fb.override) {
        ok = true;
        hearts++;
        heartsLost--;
        renderHearts();
        scorer.undoMiss();
        failed.delete(qid);
        if (![...failed].some((id) => id.startsWith(`${w.id}:`))) failedWords.delete(w.id);
        r.close = false;
      } else if (hearts > 0) {
        queue.splice(Math.min(queue.length, randomInt(2, 5)), 0, q);
      }
    }

    if (ok) {
      hp--;
      streak++;
      if (!failed.has(qid)) {
        firstTry.add(qid);
        if (!failedWords.has(w.id)) passStep(w, 'type');
      }
      const fast = r.ms < 4000 + String(r.expected || '').length * 200;
      const { crit } = scorer.hit({ base: 8, fast, at: bossEl, critChance: 0.12 });
      anim('hit');
      sfx.bossHit();
      const p = centerOf(bossEl);
      floatText(p.x + randomInt(-30, 30), p.y - 50, crit ? 'KRITIEK!' : pick(['Raak!', 'Pats!', 'Boem!', 'Au!']), crit ? 'crit' : 'bad');
      setHp();
      if (hp > 0) say(hp <= Math.ceil(maxHp * 0.25) ? pick(TAUNT_LOW) : pick(TAUNT_HURT));
      if (streak % 5 === 0 && hearts < maxHearts) {
        hearts++;
        renderHearts(true);
        sfx.heal();
        toast('5 op rij: +1 hart', { icon: 'heart', color: 'var(--red)' });
      }
      if (r.close) {
        await showFeedback(stage, { kind: 'close', word: w, list, dir, result: r });
        if (stage.aborted) break;
      } else {
        await sleep(650);
      }
    }
    save();
  }

  if (stage.closed) return;
  if (stage.aborted && hp > 0 && hearts > 0) {
    stage.close();
    return;
  }

  const victory = hp === 0;
  const grade = Math.max(1, Math.round((1 + (9 * firstTry.size) / maxHp) * 10) / 10);
  exHost.innerHTML = '';
  if (victory) {
    bossEl.classList.add('dead');
    sfx.bossHit();
    haptic('heavy');
    shout('Verslagen!', { grad: GRADS.gold });
    celebrate({ big: true });
    state.records.bossWins++;
    if (heartsLost === 0) state.records.bossFlawless++;
  } else {
    say('Hahaha! Tot de volgende keer!');
    sfx.defeat();
    haptic('error');
  }
  state.records.bestCombo = Math.max(state.records.bestCombo, scorer.best);
  state.records.crits += scorer.crits;
  save();
  await sleep(1300);

  const failedIds = [...failedWords];
  await showResults(stage, {
    title: victory ? (heartsLost === 0 ? 'Ongeschonden gewonnen!' : 'Eindbaas verslagen!') : 'De baas won deze ronde',
    subtitle: victory ? `${firstTry.size} van de ${maxHp} vragen in één keer goed.` : 'Oefen de woorden die misgingen en daag hem daarna opnieuw uit.',
    badge: { text: nl(grade, 1), grad: grade >= 5.5 ? 'linear-gradient(150deg,#34E08A,#16A34A)' : 'linear-gradient(150deg,#FF8A65,#E5484D)' },
    stats: [
      { k: 'Geschat cijfer', v: Math.round(grade * 10), icon: 'target', c: grade >= 5.5 ? 'var(--green)' : 'var(--red)', fmt: 'grade' },
      { k: 'In één keer goed', v: firstTry.size, icon: 'check', c: 'var(--green)', suffix: ` / ${maxHp}` },
      { k: 'Beste combo', v: scorer.best, icon: 'flame', c: 'var(--orange)' },
      { k: 'XP verdiend', v: scorer.xp, icon: 'star', c: 'var(--yellow)' },
    ],
    xp: scorer.xp,
    correct: scorer.correct,
    seconds: Math.min(1800, (Date.now() - startedAt) / 1000),
    countSession: true,
    chest: victory ? 1 : null,
    celebrate: victory,
    note: 'Het cijfer is een schatting: het deel van de vragen dat je in één keer goed had, omgerekend naar 1 tot 10.',
    actions: [
      ...(failedIds.length ? [{ text: failedIds.length === 1 ? 'Oefen het lastige woord' : `Oefen de ${failedIds.length} lastige woorden`, icon: 'cards', style: 'btn-tinted', onClick: () => startLearn({ lists: [list], onlyIds: failedIds }) }] : []),
      { text: victory ? 'Nog een gevecht' : 'Opnieuw proberen', icon: 'repeat', style: 'btn-gray', onClick: () => startBoss(list) },
    ],
  });
}
