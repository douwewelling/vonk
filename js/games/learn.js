// Leren: de hoofdmodus. Slimme herhaling met oplopende moeilijkheid en een combo-teller.

import { state, save, findWord } from '../store.js';
import { sleep, pick, plural, randomInt } from '../util.js';
import { alertDialog, toast } from '../ui.js';
import { buildQueue, remainingSteps, passStep, failStep, stepsFor, answerOf } from '../srs.js';
import { checkAchievements } from '../rewards.js';
import { openStage } from './stage.js';
import { Scorer } from './scoring.js';
import { exIntro, exMC, exTiles, exType, showFeedback } from './exercises.js';
import { showResults, commitRun } from './results.js';
import { speak, canSpeak } from '../fx/speech.js';

const BASE_XP = { mc: 5, tiles: 6, type: 8 };

/** Andere antwoorden van dezelfde kant, als foute opties voor meerkeuze. */
function poolFor(list, dir, word) {
  const side = dir === 'ab' ? 'b' : 'a';
  const code = side === 'b' ? list.langB : list.langA;
  const pool = list.words.filter((w) => w !== word).map((w) => w[side]);
  if (pool.length < 8) {
    for (const l of state.lists) {
      if (l === list) continue;
      const sameSide = side === 'b' ? l.langB === code : l.langA === code;
      const flipped = side === 'b' ? l.langA === code : l.langB === code;
      if (sameSide) l.words.forEach((w) => pool.push(w[side]));
      else if (flipped) l.words.forEach((w) => pool.push(w[side === 'b' ? 'a' : 'b']));
    }
  }
  return pool;
}

function reinsert(queue, item, min = 2, max = 4) {
  const at = Math.min(queue.length, randomInt(min, max));
  queue.splice(at, 0, item);
}

/**
 * @param {{lists: object[], onlyIds?: string[]|null, title?: string}} o
 */
export async function startLearn({ lists, onlyIds = null }) {
  const queue = buildQueue(lists, { maxNew: state.settings.newPerSession, onlyIds });
  if (!queue.length) {
    toast('Deze lijst heeft nog geen woorden', { icon: 'info', color: 'var(--orange)' });
    return;
  }
  const now = Date.now();
  lists.forEach((l) => (l.lastPlayed = now));
  if (lists.length === 1) state.currentListId = lists[0].id;

  const stage = openStage();
  const boost = state.inventory.boost > 0;
  if (boost) {
    state.inventory.boost--;
    setTimeout(() => toast('XP-boost actief: dubbele XP!', { icon: 'bolt', color: 'var(--orange)' }), 600);
  }
  save();

  const scorer = new Scorer(stage, { boost });
  const before = new Map();
  for (const it of queue) {
    const f = findWord(it.wordId);
    if (f) before.set(it.wordId, f.word.lvl);
  }

  let done = 0;
  let exercises = 0;
  let mistakes = 0;
  let lastT = Date.now();
  let activeSec = 0;
  const host = stage.body;

  stage.onQuit = async () => {
    const choice = await alertDialog({
      title: 'Sessie stoppen?',
      message: 'Je XP en je voortgang tot nu toe blijven bewaard. Alleen de kist mis je.',
      buttons: [
        { text: 'Doorgaan', value: null, style: 'primary' },
        { text: 'Stoppen', value: 'quit', style: 'destructive' },
      ],
      vertical: true,
    });
    if (choice === 'quit') stage.abort();
  };

  const updateProgress = () => stage.setProgress(done / Math.max(1, done + remainingSteps(queue)));

  while (queue.length && !stage.aborted) {
    const item = queue.shift();
    const found = findWord(item.wordId);
    if (!found) continue;
    const { word, list } = found;
    const step = item.steps[item.stepIdx];
    const golden = item.golden && step !== 'intro';

    let r;
    if (step === 'intro') r = await exIntro(stage, host, { word, list });
    else if (step === 'mc') r = await exMC(stage, host, { word, list, dir: item.dir, pool: poolFor(list, item.dir, word), golden });
    else if (step === 'tiles') r = await exTiles(stage, host, { word, list, dir: item.dir, golden });
    else r = await exType(stage, host, { word, list, dir: item.dir, golden });
    if (stage.aborted || !r || r.aborted) break;

    const t = Date.now();
    activeSec += Math.min(45, (t - lastT) / 1000);
    lastT = t;

    if (step === 'intro') {
      passStep(word, 'intro');
      scorer.bonus(1, r.el);
      item.stepIdx++;
      done++;
      reinsert(queue, item, 1, 3);
      updateProgress();
      save();
      continue;
    }

    exercises++;
    let ok = r.correct;
    if (!ok) {
      scorer.miss();
      const fb = await showFeedback(stage, { kind: 'bad', word, list, dir: item.dir, result: r, allowOverride: step === 'type' });
      if (stage.aborted) break;
      if (fb.override) {
        ok = true;
        scorer.undoMiss();
        r.close = false;
      }
    }

    if (ok) {
      if (item.golden) item.golden = false;
      const ansLang = item.dir === 'ab' ? list.langB : list.langA;
      const limit = step === 'type' ? 4000 + answerOf(word, item.dir).length * 220 : 2600;
      scorer.hit({ base: BASE_XP[step] - (r.hints || 0) * 2, fast: r.ms < limit, golden, at: r.el });
      if (r.close) {
        await showFeedback(stage, { kind: 'close', word, list, dir: item.dir, result: r });
        if (stage.aborted) break;
      } else {
        if (step !== 'mc' && ansLang !== 'nl' && state.settings.autoSpeak && canSpeak(ansLang)) speak(answerOf(word, item.dir), ansLang);
        await sleep(step === 'mc' ? 620 : 700);
      }
      passStep(word, step, { relearn: item.relearn });
      item.stepIdx++;
      done++;
      if (item.stepIdx < item.steps.length) reinsert(queue, item, 2, 4);
    } else {
      mistakes++;
      const res = failStep(word, step);
      item.misses++;
      if (res === 'lapse') {
        item.steps = stepsFor(word, answerOf(word, item.dir));
        item.stepIdx = 0;
        item.relearn = true;
      }
      if (item.misses <= 3) reinsert(queue, item, 2, 3);
    }
    updateProgress();
    save();
  }

  // Einde of gestopt
  state.records.bestCombo = Math.max(state.records.bestCombo, scorer.best);
  state.records.crits += scorer.crits;
  state.records.goldens += scorer.goldens;

  const changes = [];
  for (const [id, from] of before) {
    const f = findWord(id);
    if (f && f.word.lvl !== from) changes.push({ word: f.word, list: f.list, from, to: f.word.lvl });
  }

  if (stage.aborted && !stage.closed) {
    const res = commitRun({ xp: scorer.xp, correct: scorer.correct, seconds: activeSec });
    stage.close();
    if (scorer.xp) toast(`+${scorer.xp} XP bewaard`, { icon: 'star', color: 'var(--yellow)' });
    res.unlocked.forEach((a, i) => setTimeout(() => toast(`Medaille: ${a.title}`, { emoji: a.emoji, color: a.tint[1] }), 2400 * (i + 1)));
    return;
  }
  if (stage.closed) return;

  const perfect = exercises >= 10 && mistakes === 0;
  if (perfect) state.records.perfects++;
  const ups = changes.filter((c) => c.to > c.from).length;
  const accuracy = Math.round(scorer.accuracy * 100);
  const single = lists.length === 1 ? lists[0] : null;

  await showResults(stage, {
    title: perfect ? 'Foutloze sessie!' : pick(['Sessie voltooid!', 'Lekker bezig!', 'Goed gedaan!']),
    subtitle: ups ? `${plural(ups, 'woord steeg', 'woorden stegen')} een niveau.` : 'Elke herhaling maakt je geheugen sterker.',
    badge: { icon: perfect ? 'sparkles' : 'check', grad: perfect ? 'linear-gradient(135deg,#7AF7FF,#5E5CE6)' : '' },
    stats: [
      { k: 'XP verdiend', v: scorer.xp, icon: 'star', c: 'var(--yellow)' },
      { k: 'Nauwkeurig', v: accuracy, icon: 'target', c: 'var(--green)', suffix: '%' },
      { k: 'Beste combo', v: scorer.best, icon: 'flame', c: 'var(--orange)' },
      { k: 'Tijd', v: Math.round(activeSec), icon: 'clock', c: 'var(--teal)', fmt: 'time' },
    ],
    xp: scorer.xp,
    correct: scorer.correct,
    seconds: activeSec,
    countSession: true,
    chest: perfect ? 1 : 0,
    changes,
    celebrate: perfect,
    actions: [{ text: 'Nog een ronde', icon: 'repeat', style: 'btn-tinted', onClick: () => startLearn({ lists: single ? [single] : lists }) }],
  });
  checkAchievements();
}
