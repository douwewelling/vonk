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
    .replace(/(\p{L})'\s+/gu, "$1'") // "l' école" → "l'école", maar "zowel 's morgens" blijft los
    .trim();
}

/** Lange antwoorden zijn zinnen (voor de opmaak: groot tekstvak, geen hoofdletterlabel). */
export const isSentence = (text) => String(text).trim().split(/\s+/).length >= 4 || String(text).length > 28;

/** Splitst op scheidingstekens, maar niet binnen haakjes: "schenken (met name, vooral)". */
function splitOutsideParens(text, seps) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(text)) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && seps.includes(ch)) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * Is de komma hier een scheiding tussen synoniemen ("de relatie, het contact")
 * of hoort hij bij een zin ("Aujourd'hui, il fait beau.")?
 * Synoniemen: geen zinseinde-teken en elk deel hooguit zes woorden.
 */
export function commaIsSynonym(answer) {
  const t = String(answer).replace(/\([^()]*\)/g, '').trim();
  if (!t.includes(',') || /[.!?]$/.test(t) || /^[¿¡]/.test(t)) return false;
  return t.split(',').every((p) => {
    const n = p.trim().split(/\s+/).filter(Boolean).length;
    return n >= 1 && n <= 6;
  });
}

/**
 * De losse goede antwoorden. Scheidingstekens: / ; | en (bij synoniemen) de komma.
 * "billijk, wat gevraagd kan worden" → ["billijk", "wat gevraagd kan worden"]
 */
export function alternatives(answer, { commaSyn = true } = {}) {
  const seps = commaSyn && commaIsSynonym(answer) ? '/;|,' : '/;|';
  return splitOutsideParens(answer, seps);
}

/** Alle geldige schrijfwijzen voor een antwoord. "(de) leraar / docent" → leraar, de leraar, docent. */
export function variants(answer, { commaSyn = true } = {}) {
  const alts = alternatives(answer, { commaSyn });
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

/** Eerste alternatief zonder optionele delen, bijv. voor letterblokjes en hints. */
export function coreAnswer(answer, { commaSyn = true } = {}) {
  const first = alternatives(answer, { commaSyn })[0] || String(answer);
  return first.replace(/\([^()]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Nette weergave van het voorkeursantwoord (zonder haakjes-tekens). */
export function displayAnswer(answer) {
  return String(answer).split(/\s*[\/;|]\s*/)[0].replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
}

// --- Het antwoord terugvinden in een voorbeeldzin ----------------------------
// In een zin staat een woord vaak verbogen of vervoegd ("buhlen" → "buhlten",
// "der Antrag" → "Heiratsantrag"). Daarom zoeken we op de stam van het woord.

const ARTICLES = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'de', 'het', 'een', 'the', 'a', 'an', 'to', 'le', 'la', 'les', "l'", 'un', 'une', 'des',
  'el', 'los', 'las', 'il', 'lo', 'gli', 'o', 'os', 'as',
]);
const FILLERS = new Set([
  'sich', 'mich', 'dich', 'uns', 'euch', 'zich', 'se', "s'", 'etwas', 'jemanden', 'jemandem', 'jmdn', 'jmdm', 'etw', 'iets', 'iemand',
  'um', 'auf', 'an', 'in', 'mit', 'zu', 'von', 'für', 'über', 'aus', 'bei', 'nach', 'vor', 'durch', 'gegen', 'ohne', 'unter',
  'naar', 'om', 'op', 'met', 'van', 'voor', 'aan', 'bij', 'uit', 'over', 'of', 'for', 'with', 'at', 'on', 'by', 'from', 'up', 'off',
  'sein', 'haben', 'werden', 'zijn', 'hebben', 'worden', 'be', 'have', 'être', 'avoir',
]);
const ENDINGS = ['ungen', 'ieren', 'ern', 'eln', 'en', 'er', 'es', 'em', 'e', 'n', 't', 's'];

// Scheidbare voorvoegsels van Duitse werkwoorden, langste eerst (zurücklegen → zurückgelegt, legte … zurück)
const SEPARABLE = [
  'wiederher', 'herunter', 'zusammen', 'zurueck', 'zurück', 'heraus', 'herein', 'hinaus', 'vorweg', 'weiter', 'wieder',
  'heim', 'inne', 'fest', 'fort', 'nach', 'her', 'hin', 'los', 'mit', 'vor', 'weg', 'auf', 'aus', 'bei', 'ein', 'dar', 'an', 'ab', 'zu',
].map(fold);
const INSEPARABLE = ['be', 'ent', 'emp', 'er', 'ge', 'miss', 'ver', 'zer'];

/** Kleine letters en umlauts weg, zodat "Zöpfe" bij "Zopf" en "erlosch" bij "erlöschen" past. */
function fold(s) {
  return String(s).toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

function stem(word) {
  for (const end of ENDINGS) {
    const min = end === 'en' ? 3 : 4;
    if (word.endsWith(end) && word.length - end.length >= min) return word.slice(0, -end.length);
  }
  return word;
}

const isVerb = (w) => /(en|eln|ern)$/.test(w) && w.length >= 5;

/**
 * Patronen om een antwoord in een zin terug te vinden: stammen, voltooide deelwoorden
 * (ge-), zu-infinitieven en gesplitste werkwoorden ("löste … aus").
 */
export function answerPatterns(answer) {
  const stems = new Set();
  const splits = [];
  for (const alt of String(answer).split(/\s*[/;|,]\s*/)) {
    const words = alt.replace(/[()]/g, ' ').split(/\s+/);
    for (const raw of words) {
      const lw = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').toLowerCase();
      if (lw.length < 3 || ARTICLES.has(lw) || FILLERS.has(lw)) continue;
      const w = fold(lw);
      const s = stem(w);
      stems.add(s);
      if (!isVerb(w)) continue;
      const pre = SEPARABLE.find((p) => w.startsWith(p) && w.length - p.length >= 4);
      if (pre) {
        const base = stem(w.slice(pre.length));
        stems.add(pre + 'ge' + base);
        stems.add(pre + 'zu' + base);
        splits.push({ particle: pre, base });
      } else if (!INSEPARABLE.some((p) => w.startsWith(p))) {
        stems.add('ge' + s);
      }
    }
  }
  return { stems: [...stems], splits };
}

export const answerStems = (answer) => answerPatterns(answer).stems;

/**
 * Waar staat het antwoord in de zin? Geeft hele woorden terug, zodat een gat
 * nooit een half woord laat zien.
 * @returns {{start: number, end: number, text: string}[]}
 */
export function sentenceSpans(sentence, answer) {
  const { stems, splits } = answerPatterns(answer);
  if (!stems.length) return [];
  const words = [...String(sentence).matchAll(/\p{L}[\p{L}'’-]*/gu)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    text: m[0],
    f: fold(m[0]),
  }));
  const picked = new Set();
  words.forEach((w, i) => {
    const hit = stems.some((s) => w.f.startsWith(s) || (s.length >= 4 && w.f.length >= s.length + 4 && w.f.includes(s)) || (s.length >= 5 && w.f.includes(s)));
    if (hit) picked.add(i);
  });
  // Gesplitst werkwoord: de stam ergens in de zin en het voorvoegsel als laatste woord
  const last = words.length - 1;
  for (const { particle, base } of splits) {
    if (last < 1 || words[last].f !== particle) continue;
    const i = words.findIndex((w, j) => j < last && w.f.startsWith(base));
    if (i >= 0) {
      picked.add(i);
      picked.add(last);
    }
  }
  return [...picked].sort((a, b) => a - b).map((i) => ({ start: words[i].start, end: words[i].end, text: words[i].text }));
}

/** Komt het antwoord (in een of andere vorm) in de zin voor? Zo niet, dan kan er geen gat in. */
export const sentenceHasAnswer = (ex, answer) => sentenceSpans(ex, answer).length > 0;

/** Het antwoord zonder lidwoord ervoor: "die Beziehung" → "Beziehung". */
export function withoutArticle(answer) {
  const words = displayAnswer(answer).split(' ');
  return words.length > 1 && ARTICLES.has(words[0].toLowerCase()) ? words.slice(1).join(' ') : displayAnswer(answer);
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
  if (tolerance === 'streng') return len > 24 ? 1 : 0;
  const extra = tolerance === 'soepel' ? 1 : 0;
  if (len <= 3) return 0;
  if (len <= 12) return 1 + extra;
  if (len <= 24) return 2 + extra;
  // Zinnen: ongeveer één tikfout per tien tekens
  return Math.round(len / 10) + extra;
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

  // Kleine tikfout? Alleen binnen een antwoord met evenveel woorden: een heel woord
  // weglaten of toevoegen ("wat gevraagd" voor "wat gevraagd kan worden") is geen tikfout.
  const words = (s) => s.split(' ').filter(Boolean).length;
  let best = null;
  let bestD = Infinity;
  let near = null;
  let nearD = Infinity;
  for (const v of vars) {
    const d = levenshtein(givenPlain, stripAccents(v));
    if (d < nearD) {
      nearD = d;
      near = v;
    }
    if (words(v) !== words(givenPlain)) continue;
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  if (best && bestD <= allowedTypos(best.length, tolerance)) {
    return { ok: true, exact: false, note: 'typo', expected: best };
  }
  return { ok: false, exact: false, note: null, expected: near && nearD <= near.length / 2 ? near : shown };
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
