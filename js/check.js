// Nakijken van antwoorden: alternatieven, optionele stukjes, tikfouten en accenten.

const PUNCT_EDGE = /^[\s.,!?¿¡"“”'‘’]+|[\s.,!?"“”]+$/g;

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae');
}

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(PUNCT_EDGE, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .trim();
}

/** Alle geldige schrijfwijzen voor een antwoord. "(de) leraar / docent" → leraar, de leraar, docent. */
export function variants(answer, { commaSyn = true } = {}) {
  const alts = String(answer)
    .split(commaSyn ? /\s*[\/;|,]\s*/ : /\s*[\/;|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = new Set();
  for (const alt of alts) {
    for (const v of expandOptional(alt)) {
      const n = normalize(v);
      if (n) out.add(n);
    }
  }
  const full = normalize(String(answer).replace(/[()]/g, ''));
  if (full) out.add(full);
  return [...out];
}

function expandOptional(s) {
  if ((s.match(/\(/g) || []).length > 5) {
    return [s.replace(/[()]/g, ''), s.replace(/\([^()]*\)/g, '').replace(/\s+/g, ' ')];
  }
  const m = s.match(/\(([^()]*)\)/);
  if (!m) return [s];
  const before = s.slice(0, m.index);
  const after = s.slice(m.index + m[0].length);
  const withPart = expandOptional(before + m[1] + after);
  const without = expandOptional((before + after).replace(/\s+/g, ' '));
  return [...withPart, ...without];
}

/** Eerste alternatief zonder optionele delen, bijv. voor letterblokjes. */
export function coreAnswer(answer) {
  const first = String(answer).split(/\s*[\/;|]\s*/)[0] || String(answer);
  return first.replace(/\([^()]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Nette weergave van het voorkeursantwoord (zonder haakjes-tekens). */
export function displayAnswer(answer) {
  return String(answer).split(/\s*[\/;|]\s*/)[0].replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      // Verwisselde buurletters tellen als één fout
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev[j - 1]);
      }
    }
    prev = cur;
  }
  return prev[b.length];
}

function allowedTypos(len, tolerance) {
  if (tolerance === 'streng') return 0;
  const extra = tolerance === 'soepel' ? 1 : 0;
  if (len <= 3) return 0;
  if (len <= 6) return 1 + extra;
  if (len <= 12) return 1 + extra;
  return 2 + extra;
}

/**
 * @returns {{ok: boolean, exact: boolean, note: null|'typo'|'accent', expected: string}}
 */
export function checkAnswer(input, answer, { tolerance = 'normaal', accents = 'soepel', commaSyn = true } = {}) {
  const given = normalize(input);
  const vars = variants(answer, { commaSyn });
  const shown = displayAnswer(answer);
  if (!given) return { ok: false, exact: false, note: null, expected: shown };

  if (vars.includes(given)) return { ok: true, exact: true, note: null, expected: shown };

  // Accenten vergeten?
  const givenPlain = stripAccents(given);
  for (const v of vars) {
    if (stripAccents(v) === givenPlain) {
      return { ok: accents !== 'streng', exact: false, note: 'accent', expected: v };
    }
  }

  // Kleine tikfout?
  let best = null;
  let bestD = Infinity;
  for (const v of vars) {
    const d = levenshtein(givenPlain, stripAccents(v));
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  if (best && bestD <= allowedTypos(best.length, tolerance)) {
    return { ok: true, exact: false, note: 'typo', expected: best };
  }
  return { ok: false, exact: false, note: null, expected: best && bestD <= best.length / 2 ? best : shown };
}

/**
 * Letter-voor-letter verschil tussen invoer en juist antwoord, voor de uitleg na een fout.
 * @returns {{given: {t: string, k: 'ok'|'bad'}[], want: {t: string, k: 'ok'|'miss'}[]}}
 */
export function diffChars(input, expected) {
  const a = String(input);
  const b = String(expected);
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = A[i - 1] === B[j - 1];
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (same ? 0 : 1));
    }
  }
  const given = [];
  const want = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      given.unshift({ t: a[i - 1], k: 'ok' });
      want.unshift({ t: b[j - 1], k: 'ok' });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      given.unshift({ t: a[i - 1], k: 'bad' });
      want.unshift({ t: b[j - 1], k: 'miss' });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      given.unshift({ t: a[i - 1], k: 'bad' });
      i--;
    } else {
      want.unshift({ t: b[j - 1], k: 'miss' });
      j--;
    }
  }
  return { given, want };
}
