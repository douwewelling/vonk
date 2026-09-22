// Beloningen: levels, kisten, winkel, thema's en medailles.

import { state, addActivity } from './store.js';
import { pick } from './util.js';

// ---------------------------------------------------------------------------
// Levels

const TITLES = [
  [30, 'Legende'],
  [21, 'Taalmeester'],
  [16, 'Polyglot'],
  [12, 'Woordkunstenaar'],
  [8, 'Taaltalent'],
  [5, 'Woordzoeker'],
  [3, 'Leerling'],
  [1, 'Beginner'],
];

export const xpNeeded = (level) => 100 + (level - 1) * 75;

export function levelInfo(xp) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpNeeded(level)) {
    rest -= xpNeeded(level);
    level++;
  }
  const need = xpNeeded(level);
  return { level, into: rest, need, progress: rest / need, title: TITLES.find(([l]) => level >= l)[1] };
}

/** Voegt XP toe aan het profiel én aan de dagring. */
export function gainXp(amount) {
  const before = levelInfo(state.profile.xp).level;
  state.profile.xp += amount;
  const after = levelInfo(state.profile.xp).level;
  const activity = addActivity({ xp: amount });
  return { levelBefore: before, levelAfter: after, activity };
}

// ---------------------------------------------------------------------------
// Thema's & winkel

export const THEMES = [
  { id: 'blauw', name: 'Standaard', grad: ['#0A84FF', '#5E5CE6'], price: 0 },
  { id: 'mint', name: 'Mint', grad: ['#00C7BE', '#30D158'], price: 300 },
  { id: 'oceaan', name: 'Oceaan', grad: ['#32ADE6', '#0A5BFF'], price: 300 },
  { id: 'roos', name: 'Roos', grad: ['#FF375F', '#FF8FA3'], price: 400 },
  { id: 'druif', name: 'Druif', grad: ['#BF5AF2', '#5E5CE6'], price: 400 },
  { id: 'zonsondergang', name: 'Zonsondergang', grad: ['#FF9F0A', '#FF2D55'], price: 500 },
  { id: 'aurora', name: 'Aurora', grad: ['#30D158', '#40C8E0', '#8E5CFF'], price: 900, rarity: 'episch' },
  { id: 'goud', name: 'Goud', grad: ['#FFD60A', '#FF9F0A', '#E0751A'], price: 1600, rarity: 'legendarisch' },
  { id: 'holo', name: 'Holografisch', grad: ['#7CF3FF', '#A78BFA', '#FF7AC6', '#FFD66B'], price: 2500, rarity: 'legendarisch' },
];

export const theme = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const themeGradient = (t) => `linear-gradient(135deg, ${t.grad.join(', ')})`;

export function applyTheme(id) {
  document.documentElement.dataset.accent = id;
}

export const SHOP = [
  { id: 'shield', name: 'Combo-schild', desc: 'Beschermt je combo bij één fout.', price: 60, icon: 'shield', color: 'var(--teal)' },
  { id: 'freeze', name: 'Reeksbevriezer', desc: 'Redt je reeks als je een dag overslaat.', price: 120, icon: 'snow', color: 'var(--blue)' },
  { id: 'boost', name: 'XP-boost', desc: 'Dubbele XP in je volgende sessie.', price: 150, icon: 'bolt', color: 'var(--orange)' },
];

// ---------------------------------------------------------------------------
// Kisten

export const RARITY = [
  { id: 'gewoon', name: 'Gewoon', color: '#8E8E93', grad: ['#C7C7CC', '#8E8E93'], weight: 60 },
  { id: 'zeldzaam', name: 'Zeldzaam', color: '#0A84FF', grad: ['#64D2FF', '#0A84FF'], weight: 28 },
  { id: 'episch', name: 'Episch', color: '#BF5AF2', grad: ['#DA8FFF', '#8E44E0'], weight: 10 },
  { id: 'legendarisch', name: 'Legendarisch', color: '#FF9F0A', grad: ['#FFE066', '#FF9F0A'], weight: 2 },
];

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

export function rollChest(minRarity = 0) {
  const pool = RARITY.map((r, i) => ({ ...r, i })).filter((r) => r.i >= minRarity);
  const total = pool.reduce((n, r) => n + r.weight, 0);
  let x = Math.random() * total;
  let rarity = pool[0].i;
  for (const r of pool) {
    x -= r.weight;
    if (x <= 0) {
      rarity = r.i;
      break;
    }
  }
  return { rarity, reward: rewardFor(rarity) };
}

function lockedThemes(filter) {
  return THEMES.filter((t) => t.price > 0 && !state.inventory.themes.includes(t.id) && filter(t));
}

function rewardFor(r) {
  if (r === 0) {
    return pick([
      { type: 'xp', amount: rnd(25, 50) },
      { type: 'sparks', amount: rnd(15, 35) },
      { type: 'sparks', amount: rnd(20, 40) },
    ]);
  }
  if (r === 1) {
    return pick([
      { type: 'shield', amount: 1 },
      { type: 'freeze', amount: 1 },
      { type: 'xp', amount: 100 },
      { type: 'sparks', amount: rnd(60, 90) },
    ]);
  }
  if (r === 2) {
    const th = lockedThemes((t) => !t.rarity || t.rarity === 'episch');
    if (th.length && Math.random() < 0.5) return { type: 'theme', id: pick(th).id };
    return pick([{ type: 'boost', amount: 1 }, { type: 'sparks', amount: 180 }, { type: 'xp', amount: 250 }]);
  }
  const th = lockedThemes((t) => t.rarity === 'legendarisch' || t.rarity === 'episch');
  if (th.length && Math.random() < 0.6) return { type: 'theme', id: pick(th).id };
  return { type: 'sparks', amount: 600 };
}

export function describeReward(rw) {
  switch (rw.type) {
    case 'xp':
      return { title: `+${rw.amount} XP`, sub: 'Extra ervaring', icon: 'star' };
    case 'sparks':
      return { title: `+${rw.amount} vonken`, sub: 'Te besteden in de winkel', icon: 'spark' };
    case 'shield':
      return { title: 'Combo-schild', sub: 'Beschermt je combo bij één fout', icon: 'shield' };
    case 'freeze':
      return { title: 'Reeksbevriezer', sub: 'Redt je reeks als je een dag mist', icon: 'snow' };
    case 'boost':
      return { title: 'XP-boost', sub: 'Dubbele XP in je volgende sessie', icon: 'bolt' };
    case 'theme':
      return { title: `Thema ${theme(rw.id).name}`, sub: 'Nieuw uiterlijk ontgrendeld', icon: 'palette' };
    default:
      return { title: 'Verrassing', sub: '', icon: 'gift' };
  }
}

/** Past een beloning toe op de state. Geeft eventueel XP-info terug. */
export function grantReward(rw, rarity = 0) {
  state.records.chests++;
  if (rarity === 3) state.records.legendaries++;
  switch (rw.type) {
    case 'xp':
      return gainXp(rw.amount);
    case 'sparks':
      state.profile.sparks += rw.amount;
      break;
    case 'shield':
    case 'freeze':
    case 'boost':
      state.inventory[rw.type] += rw.amount;
      break;
    case 'theme':
      if (!state.inventory.themes.includes(rw.id)) state.inventory.themes.push(rw.id);
      break;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Medailles

const knownCount = (s) => s.lists.reduce((n, l) => n + l.words.filter((w) => w.lvl >= 3).length, 0);
const masteredCount = (s) => s.lists.reduce((n, l) => n + l.words.filter((w) => w.lvl >= 5).length, 0);
const bestBlitz = (s) => Math.max(0, ...Object.values(s.records.blitz || {}));
const bestMatch = (s) => Math.min(Infinity, ...Object.values(s.records.match || {}));

export const ACHIEVEMENTS = [
  { id: 'first', emoji: '✨', title: 'Eerste vonk', desc: 'Rond je eerste sessie af.', goal: 1, get: (s) => s.records.sessions, tint: ['#FFE066', '#FF9F0A'] },
  { id: 'combo10', emoji: '🔥', title: 'Op dreef', desc: 'Haal een combo van 10.', goal: 10, get: (s) => s.records.bestCombo, tint: ['#FFB340', '#FF375F'] },
  { id: 'combo25', emoji: '☄️', title: 'Onstuitbaar', desc: 'Haal een combo van 25.', goal: 25, get: (s) => s.records.bestCombo, tint: ['#FF6482', '#BF5AF2'], sparks: 80 },
  { id: 'combo50', emoji: '🌋', title: 'Kettingreactie', desc: 'Haal een combo van 50.', goal: 50, get: (s) => s.records.bestCombo, tint: ['#FF453A', '#7D1FFF'], sparks: 150 },
  { id: 'perfect', emoji: '💎', title: 'Foutloos', desc: 'Een sessie van minstens 10 beurten zonder één fout.', goal: 1, get: (s) => s.records.perfects, tint: ['#7AF7FF', '#5E5CE6'] },
  { id: 'words25', emoji: '📚', title: 'Woordenschat', desc: 'Krijg 25 woorden op niveau Gekend.', goal: 25, get: knownCount, tint: ['#6EE7B7', '#0EA5E9'] },
  { id: 'words100', emoji: '🧠', title: 'Wandelend woordenboek', desc: 'Krijg 100 woorden op niveau Gekend.', goal: 100, get: knownCount, tint: ['#F9A8D4', '#8B5CF6'], sparks: 150 },
  { id: 'master10', emoji: '👑', title: 'Meester', desc: 'Krijg 10 woorden op niveau Beheerst.', goal: 10, get: masteredCount, tint: ['#FFE066', '#E0751A'], sparks: 120 },
  { id: 'streak3', emoji: '📅', title: 'Drie op rij', desc: 'Leer 3 dagen achter elkaar.', goal: 3, get: (s) => s.streak.best, tint: ['#FFB340', '#FF6A1A'] },
  { id: 'streak7', emoji: '🗓️', title: 'Weekstrijder', desc: 'Houd een reeks van 7 dagen vol.', goal: 7, get: (s) => s.streak.best, tint: ['#FF9F0A', '#FF2D55'], sparks: 100 },
  { id: 'streak30', emoji: '🏆', title: 'Maandmonster', desc: 'Houd een reeks van 30 dagen vol.', goal: 30, get: (s) => s.streak.best, tint: ['#FFD60A', '#FF453A'], sparks: 300 },
  { id: 'rings', emoji: '⭕', title: 'Rond!', desc: 'Sluit alle drie je ringen op één dag.', goal: 1, get: (s) => s.records.perfectDays || 0, tint: ['#FF4F84', '#2ED3F5'] },
  { id: 'blitz20', emoji: '⚡', title: 'Bliksem', desc: 'Scoor 20 punten in Blitz.', goal: 20, get: bestBlitz, tint: ['#FFE066', '#FF9F0A'] },
  { id: 'blitz35', emoji: '🌩️', title: 'Onweer', desc: 'Scoor 35 punten in Blitz.', goal: 35, get: bestBlitz, tint: ['#A5B4FC', '#4F46E5'], sparks: 100 },
  { id: 'match25', emoji: '🧩', title: 'Koppelkoning', desc: 'Voltooi Koppel binnen 25 seconden.', goal: 1, get: (s) => (bestMatch(s) <= 25000 ? 1 : 0), tint: ['#86EFAC', '#10B981'] },
  { id: 'boss', emoji: '⚔️', title: 'Baasverslinder', desc: 'Versla een eindbaas.', goal: 1, get: (s) => s.records.bossWins, tint: ['#FCA5A5', '#B91C1C'] },
  { id: 'flawless', emoji: '🛡️', title: 'Ongeschonden', desc: 'Versla een eindbaas zonder een hart te verliezen.', goal: 1, get: (s) => s.records.bossFlawless, tint: ['#99F6E4', '#0F766E'], sparks: 120 },
  { id: 'crits', emoji: '💥', title: 'Kritieke massa', desc: 'Maak 25 kritieke treffers.', goal: 25, get: (s) => s.records.crits, tint: ['#FDBA74', '#EA580C'] },
  { id: 'golden', emoji: '🌟', title: 'Goudzoeker', desc: 'Beantwoord 5 gouden kaarten goed.', goal: 5, get: (s) => s.records.goldens, tint: ['#FFF3B0', '#E8A400'] },
  { id: 'legend', emoji: '🎁', title: 'Jackpot', desc: 'Open een legendarische kist.', goal: 1, get: (s) => s.records.legendaries, tint: ['#FFE066', '#FF6A1A'], sparks: 100 },
  { id: 'night', emoji: '🦉', title: 'Nachtuil', desc: 'Rond een sessie af na 22:00.', goal: 1, get: (s) => s.records.nightOwl, tint: ['#818CF8', '#1E1B4B'] },
  { id: 'early', emoji: '🐦', title: 'Vroege vogel', desc: 'Rond een sessie af vóór 7:00.', goal: 1, get: (s) => s.records.earlyBird, tint: ['#FDE68A', '#F97316'] },
  { id: 'creator', emoji: '✍️', title: 'Lijstmaker', desc: 'Maak je eigen woordenlijst.', goal: 1, get: (s) => s.records.listsCreated, tint: ['#C4B5FD', '#7C3AED'] },
  { id: 'level10', emoji: '🚀', title: 'Dubbele cijfers', desc: 'Bereik level 10.', goal: 10, get: (s) => levelInfo(s.profile.xp).level, tint: ['#93C5FD', '#2563EB'], sparks: 100 },
  { id: 'level25', emoji: '🪐', title: 'Ruimtereiziger', desc: 'Bereik level 25.', goal: 25, get: (s) => levelInfo(s.profile.xp).level, tint: ['#F0ABFC', '#6D28D9'], sparks: 250 },
];

export function achievementProgress(a) {
  const v = Math.min(a.goal, Math.max(0, a.get(state) || 0));
  return { value: v, progress: v / a.goal };
}

/** Controleert alle medailles; nieuw behaalde worden direct uitgekeerd. */
export function checkAchievements() {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    if ((a.get(state) || 0) >= a.goal) {
      state.achievements[a.id] = Date.now();
      state.profile.sparks += a.sparks || 40;
      unlocked.push(a);
    }
  }
  return unlocked;
}
