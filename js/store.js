// Alle voortgang leeft in één state-object, opgeslagen in localStorage.

import { uid, todayKey, dayDiff, addDays } from './util.js';
import { parseList } from './parse.js';
import { SAMPLE_LISTS } from './data/samples.js';

const KEY = 'vonk:v1';

export const GOALS = {
  relaxed: { label: 'Relaxed', xp: 60, correct: 12, minutes: 5 },
  normaal: { label: 'Normaal', xp: 150, correct: 30, minutes: 10 },
  serieus: { label: 'Serieus', xp: 250, correct: 50, minutes: 15 },
  intens: { label: 'Intens', xp: 400, correct: 80, minutes: 25 },
};

export function makeWord(a, b, ex = '', exb = '') {
  return { id: uid(), a, b, ex, exb, lvl: 0, due: 0, ivl: 0, reps: 0, lapses: 0, right: 0, wrong: 0, last: 0 };
}

export function makeList({ title, langA = 'en', langB = 'nl', pairs = [], sample = false, kind = 'words', showSentences = true, useSentences = true }) {
  return {
    id: uid(),
    title,
    langA,
    langB,
    dir: 'mix',
    commaSyn: true,
    kind,
    showSentences,
    useSentences,
    sample,
    createdAt: Date.now(),
    lastPlayed: 0,
    words: pairs.map((p) => makeWord(p.a, p.b, p.ex, p.exb)),
  };
}

function defaults() {
  return {
    version: 1,
    onboarded: false,
    profile: { name: '', xp: 0, sparks: 60, createdAt: Date.now() },
    settings: {
      sound: true,
      haptics: true,
      autoSpeak: true,
      theme: 'blauw',
      appearance: 'system',
      goal: 'normaal',
      tolerance: 'normaal',
      accents: 'soepel',
      newPerSession: 5,
    },
    lists: SAMPLE_LISTS.map((s) => makeList({ ...s, pairs: parseList(s.text).pairs, sample: true })),
    currentListId: null,
    daily: {},
    streak: { count: 0, best: 0, lastDay: null },
    inventory: { shield: 1, freeze: 1, boost: 0, themes: ['blauw'] },
    achievements: {},
    records: {
      bestCombo: 0,
      blitz: {},
      match: {},
      bossWins: 0,
      bossFlawless: 0,
      totalCorrect: 0,
      sessions: 0,
      seconds: 0,
      crits: 0,
      goldens: 0,
      legendaries: 0,
      perfects: 0,
      chests: 0,
      listsCreated: 0,
      nightOwl: 0,
      earlyBird: 0,
      perfectDays: 0,
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return merge(defaults(), JSON.parse(raw));
  } catch (e) {
    console.warn('Vonk: opgeslagen voortgang kon niet geladen worden', e);
    return defaults();
  }
}

/** Vult ontbrekende velden aan, zodat oudere back-ups blijven werken. */
function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base, ...saved };
  for (const k of ['profile', 'settings', 'streak', 'inventory', 'records']) {
    out[k] = { ...base[k], ...(saved[k] || {}) };
  }
  out.lists = Array.isArray(saved.lists) ? saved.lists : base.lists;
  out.lists.forEach((l) => {
    l.dir ??= 'mix';
    l.commaSyn ??= true;
    l.kind ??= 'words';
    l.useSentences ??= true;
    l.showSentences ??= true;
    l.words = (l.words || []).map((w) => ({ ...makeWord(w.a, w.b), ...w }));
    l.words.forEach((w) => {
      w.ex = w.ex || '';
      w.exb = w.exb || '';
    });
  });
  if (!Array.isArray(out.inventory.themes) || !out.inventory.themes.includes('blauw')) {
    out.inventory.themes = ['blauw', ...(out.inventory.themes || [])];
  }
  return out;
}

export let state = load();

// ---------------------------------------------------------------------------
// Opslaan & abonneren

const listeners = new Set();
let saveTimer = 0;

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 150);
}

export function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Vonk: opslaan mislukt', e);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Opslaan en alle schermen laten bijwerken. */
export function commit() {
  save();
  listeners.forEach((fn) => fn());
}

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveNow();
});

// ---------------------------------------------------------------------------
// Lijsten

export const getList = (id) => state.lists.find((l) => l.id === id) || null;

export function currentList() {
  return getList(state.currentListId) || [...state.lists].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))[0] || null;
}

export function addList(list) {
  state.lists.unshift(list);
  if (!list.sample) state.records.listsCreated++;
  state.currentListId = list.id;
  commit();
  return list;
}

export function deleteList(id) {
  state.lists = state.lists.filter((l) => l.id !== id);
  if (state.currentListId === id) state.currentListId = null;
  commit();
}

export function findWord(id) {
  for (const list of state.lists) {
    const w = list.words.find((x) => x.id === id);
    if (w) return { word: w, list };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dagelijkse ringen & reeks

export const goals = () => GOALS[state.settings.goal] || GOALS.normaal;

export function day(key = todayKey()) {
  if (!state.daily[key]) state.daily[key] = { xp: 0, correct: 0, seconds: 0, sessions: 0 };
  return state.daily[key];
}

export function peekDay(key = todayKey()) {
  return state.daily[key] || { xp: 0, correct: 0, seconds: 0, sessions: 0 };
}

export function ringProgress(key = todayKey()) {
  const d = peekDay(key);
  const g = goals();
  return [d.xp / g.xp, d.correct / g.correct, d.seconds / (g.minutes * 60)];
}

function ringsDone(d, g) {
  return { xp: d.xp >= g.xp, correct: d.correct >= g.correct, time: d.seconds >= g.minutes * 60 };
}

/**
 * Voegt activiteit toe aan vandaag.
 * @returns {{ringsClosed: string[], allClosed: boolean, streak: null|{count: number, usedFreeze: number}}}
 */
export function addActivity({ xp = 0, correct = 0, seconds = 0 } = {}) {
  const d = day();
  const g = goals();
  const before = ringsDone(d, g);
  d.xp += xp;
  d.correct += correct;
  d.seconds += seconds;
  const after = ringsDone(d, g);
  const ringsClosed = Object.keys(after).filter((k) => after[k] && !before[k]);
  const allClosed = ringsClosed.length > 0 && after.xp && after.correct && after.time;
  const streak = xp > 0 || correct > 0 ? touchStreak() : null;
  pruneDaily();
  save();
  return { ringsClosed, allClosed, streak };
}

function touchStreak() {
  const t = todayKey();
  const s = state.streak;
  if (s.lastDay === t) return null;
  let usedFreeze = 0;
  if (!s.lastDay) {
    s.count = 1;
  } else {
    const gap = dayDiff(s.lastDay, t);
    if (gap <= 1) {
      s.count += 1;
    } else {
      const missed = gap - 1;
      if (state.inventory.freeze >= missed) {
        state.inventory.freeze -= missed;
        usedFreeze = missed;
        s.count += 1;
      } else {
        s.count = 1;
      }
    }
  }
  s.lastDay = t;
  s.best = Math.max(s.best, s.count);
  return { count: s.count, usedFreeze };
}

/** De reeks zoals hij nu telt (0 als hij verbroken is en geen bevriezer hem redt). */
export function displayStreak() {
  const s = state.streak;
  if (!s.lastDay) return 0;
  const gap = dayDiff(s.lastDay, todayKey());
  if (gap <= 1) return s.count;
  return gap - 1 <= state.inventory.freeze ? s.count : 0;
}

export const streakDoneToday = () => state.streak.lastDay === todayKey();

function pruneDaily() {
  const cutoff = addDays(todayKey(), -120);
  for (const k of Object.keys(state.daily)) if (k < cutoff) delete state.daily[k];
}

// ---------------------------------------------------------------------------
// Back-up

export function exportData() {
  return JSON.stringify({ app: 'vonk', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importData(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.lists)) throw new Error('Dit bestand is geen Vonk-back-up.');
  state = merge(defaults(), data);
  saveNow();
  commit();
}

export function resetAll() {
  state = defaults();
  saveNow();
  commit();
}
