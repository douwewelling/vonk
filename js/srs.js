// Gespreide herhaling: welk woord wanneer terugkomt, en in welke oefenvorm.
//
// Niveaus: 0 Nieuw → 1 Gezien → 2 Herkend → 3 Gekend → 4 Vast → 5 Beheerst.
// Een nieuw woord doorloopt in één sessie: kennismaken → meerkeuze → letterblokjes → zelf typen.
// Daarna komt het terug na 1, 3, 8, 21… dagen. Pas als je het op die momenten nog weet, stijgt het.

import { DAY, shuffle } from './util.js';
import { coreAnswer, normalize } from './check.js';

export const LEVELS = ['Nieuw', 'Gezien', 'Herkend', 'Gekend', 'Vast', 'Beheerst'];
export const MAX_LVL = 5;
const HOUR = 3600000;

export const isDue = (w, now = Date.now()) => w.lvl >= 3 && w.due <= now;

export function listStats(list, now = Date.now()) {
  const s = { total: list.words.length, fresh: 0, learning: 0, known: 0, mastered: 0, due: 0, progress: 0 };
  let sum = 0;
  for (const w of list.words) {
    if (w.lvl === 0) s.fresh++;
    else if (w.lvl <= 2) s.learning++;
    else if (w.lvl <= 4) s.known++;
    else s.mastered++;
    if (isDue(w, now)) s.due++;
    sum += w.lvl;
  }
  s.progress = s.total ? sum / (s.total * MAX_LVL) : 0;
  return s;
}

/** Past het antwoord in letterblokjes? */
export function canTiles(answer) {
  const core = coreAnswer(answer);
  const letters = core.replace(/\s/g, '');
  return letters.length >= 2 && letters.length <= 14 && core.split(' ').length <= 3;
}

/** De oefenstappen die een woord in deze sessie nog moet halen. */
export function stepsFor(w, answerForTiles) {
  const tiles = canTiles(answerForTiles) ? ['tiles'] : [];
  if (w.lvl <= 0) return ['intro', 'mc', ...tiles, 'type'];
  if (w.lvl === 1) return ['mc', ...tiles, 'type'];
  if (w.lvl === 2) return [...tiles, 'type'];
  return ['type'];
}

const dueIn = (days) => days * DAY - 4 * HOUR; // een paar uur speling, zodat 'morgen' ook morgenochtend is

function nextInterval(w) {
  const base = Math.max(1, w.ivl || 1);
  const factor = Math.max(1.6, 2.6 - 0.25 * (w.lapses || 0));
  return Math.min(180, Math.round(base * factor));
}

/**
 * Werkt een woord bij na een goed antwoord.
 * @returns {'seen'|'recognized'|'step'|'graduated'|'promoted'|'relearned'|'practice'}
 */
export function passStep(w, step, { now = Date.now(), relearn = false } = {}) {
  w.last = now;
  if (step === 'intro') {
    if (w.lvl < 1) w.lvl = 1;
    return 'seen';
  }
  w.right++;
  if (step === 'mc') {
    if (w.lvl < 2) {
      w.lvl = 2;
      return 'recognized';
    }
    return 'step';
  }
  if (step === 'tiles') return 'step';

  // step === 'type'
  if (w.lvl < 3) {
    w.lvl = 3;
    w.ivl = 1;
    w.reps++;
    w.due = now + dueIn(1);
    return 'graduated';
  }
  if (relearn) {
    w.ivl = 1;
    w.due = now + dueIn(1);
    return 'relearned';
  }
  if (w.due <= now) {
    w.reps++;
    w.lvl = Math.min(MAX_LVL, w.lvl + 1);
    w.ivl = nextInterval(w);
    w.due = now + dueIn(w.ivl);
    return 'promoted';
  }
  return 'practice';
}

/** Werkt een woord bij na een fout. @returns {'lapse'|'miss'} */
export function failStep(w, step, { now = Date.now() } = {}) {
  w.last = now;
  if (step === 'intro') return 'miss';
  w.wrong++;
  if (step === 'type' && w.lvl >= 3) {
    w.lapses++;
    w.lvl = Math.max(1, w.lvl - 2);
    w.ivl = 1;
    w.due = now;
    return 'lapse';
  }
  return 'miss';
}

/** Welke kant wordt gevraagd? 'ab' = toon A, vraag B. */
export function pickDirection(list) {
  if (list.dir === 'ab' || list.dir === 'ba') return list.dir;
  return Math.random() < 0.5 ? 'ab' : 'ba';
}

export const promptOf = (w, dir) => (dir === 'ab' ? w.a : w.b);
export const answerOf = (w, dir) => (dir === 'ab' ? w.b : w.a);

/**
 * Stelt een leersessie samen: eerst wat vandaag herhaald moet worden, dan wat je aan het leren bent,
 * dan een paar nieuwe woorden. Is er niets te doen, dan oefen je je zwakste woorden.
 */
export function buildQueue(lists, { maxNew = 5, now = Date.now(), onlyIds = null } = {}) {
  const pool = [];
  for (const list of lists) for (const w of list.words) pool.push({ w, list });

  let chosen;
  if (onlyIds) {
    const ids = new Set(onlyIds);
    chosen = pool.filter((x) => ids.has(x.w.id));
  } else {
    const due = pool.filter((x) => isDue(x.w, now)).sort((x, y) => x.w.due - y.w.due).slice(0, 20);
    const learning = pool
      .filter((x) => x.w.lvl >= 1 && x.w.lvl <= 2)
      .sort((x, y) => x.w.last - y.w.last)
      .slice(0, 8);
    const newCap = Math.max(2, maxNew - Math.floor(due.length / 6));
    const fresh = pool.filter((x) => x.w.lvl === 0).slice(0, newCap);
    chosen = [...due, ...learning, ...fresh];
    if (chosen.length < 8) {
      const taken = new Set(chosen.map((x) => x.w.id));
      const extra = pool
        .filter((x) => !taken.has(x.w.id) && x.w.lvl >= 3)
        .sort((x, y) => x.w.lvl - y.w.lvl || y.w.lapses - x.w.lapses || x.w.last - y.w.last)
        .slice(0, 10 - chosen.length);
      chosen.push(...extra);
    }
  }

  const items = chosen.map(({ w, list }) => {
    // Richting per item vast, zodat de leerstappen consistent blijven
    const dir = pickDirection(list);
    return {
      wordId: w.id,
      listId: list.id,
      dir,
      steps: stepsFor(w, answerOf(w, dir)),
      stepIdx: 0,
      misses: 0,
      relearn: false,
      golden: false,
    };
  });

  // Nieuwe woorden gespreid tussen de herhalingen
  const olds = shuffle(items.filter((it) => it.steps[0] !== 'intro'));
  const news = items.filter((it) => it.steps[0] === 'intro');
  const queue = [];
  while (olds.length || news.length) {
    if (olds.length) queue.push(olds.shift());
    if (olds.length && queue.length % 3 !== 0) queue.push(olds.shift());
    if (news.length) queue.push(news.shift());
  }

  // Eén gouden kaart per sessie, op een verrassende plek
  const candidates = queue.filter((it) => it.steps.some((s) => s !== 'intro'));
  if (candidates.length >= 3) candidates[Math.floor(Math.random() * candidates.length)].golden = true;

  return queue;
}

export const remainingSteps = (queue) => queue.reduce((n, it) => n + (it.steps.length - it.stepIdx), 0);

/**
 * Drie foute opties die op het goede antwoord lijken (zelfde lidwoord, vergelijkbare lengte).
 * Moeilijkere afleiders = beter leren.
 */
export function distractors(correct, pool, n = 3) {
  const cn = normalize(correct);
  const art = (s) => {
    const m = String(s).match(/^\(?(de|het|een|the|a|an|to|le|la|les|l'|un|une|der|die|das|ein|eine|el|los|las|il|lo|gli)\)?[\s']/i);
    return m ? m[1].toLowerCase() : '';
  };
  const ca = art(correct);
  const seen = new Set([cn]);
  const scored = [];
  for (const s of pool) {
    const k = normalize(s);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const score =
      Math.abs(s.length - correct.length) * 0.5 +
      (art(s) === ca ? 0 : 2.5) +
      (k[0] === cn[0] ? -0.8 : 0) +
      Math.random() * 3.5;
    scored.push({ s, score });
  }
  scored.sort((x, y) => x.score - y.score);
  return scored.slice(0, n).map((x) => x.s);
}

/** Willekeurig woord, zwakke woorden vaker (voor Blitz en de eindbaas). */
export function weightedPick(words, exclude = null) {
  const cands = words.filter((w) => w !== exclude);
  const list = cands.length ? cands : words;
  let total = 0;
  const weights = list.map((w) => {
    const wt = 1 + (MAX_LVL - w.lvl) * 0.8 + Math.min(4, w.lapses || 0);
    total += wt;
    return wt;
  });
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}
