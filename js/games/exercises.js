// De oefenvormen: kennismaken, meerkeuze, letterblokjes en zelf typen, plus het feedbackpaneel.

import { state } from '../store.js';
import { esc, shuffle, pick, sleep } from '../util.js';
import { icon } from '../ui.js';
import { lang } from '../data/langs.js';
import { checkAnswer, coreAnswer, displayAnswer, diffChars, normalize, variants } from '../check.js';
import { promptOf, answerOf, distractors } from '../srs.js';
import { speak, canSpeak } from '../fx/speech.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';

const TIPS = [
  'Zeg het woord hardop, dan onthoud je het beter.',
  'Bedenk er een ezelsbruggetje of een gek plaatje bij.',
  'Maak in je hoofd een zin met dit woord.',
  'Lijkt het op een woord dat je al kent?',
  'Kijk goed naar de spelling: straks typ je het zelf.',
];

const langName = (code) => lang(code).name;
const toLang = (code) => (code === 'xx' ? 'Vertaal het woord' : `Vertaal naar het ${langName(code)}`);
const langsOf = (list, dir) => (dir === 'ab' ? [list.langA, list.langB] : [list.langB, list.langA]);

function speakBtn(code, key = 'p') {
  return canSpeak(code) ? `<button type="button" class="icon-btn" data-speak="${key}" aria-label="Uitspreken">${icon('speaker')}</button>` : '';
}

function card({ prompt, promptLang, golden = false, compact = false }) {
  const long = prompt.length > 22;
  return `<div class="q-card${golden ? ' golden' : ''}"${compact ? ' style="min-height:120px;padding:22px 18px"' : ''}>
    ${canSpeak(promptLang) ? `<span class="speak">${speakBtn(promptLang)}</span>` : ''}
    <div class="q-word${long ? ' long' : ''}" lang="${lang(promptLang).tts || ''}">${esc(prompt)}</div>
  </div>`;
}

function kicker(label, golden) {
  return `<div class="q-kicker">
    <span class="eyebrow">${esc(label)}</span>
    ${golden ? `<span class="gold-chip">${icon('star')} Gouden kaart</span>` : ''}
  </div>`;
}

function maybeAutoSpeak(text, code) {
  if (state.settings.autoSpeak && code !== 'nl' && canSpeak(code)) speak(text, code);
}

function wireSpeak(root, map) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-speak]');
    if (!b) return;
    const [text, code] = map[b.dataset.speak] || [];
    if (text) speak(text, code);
  });
}

// ---------------------------------------------------------------------------
// Kennismaken

export function exIntro(stage, host, { word, list }) {
  host.innerHTML = `<div class="q-wrap">
    <div class="q-kicker"><span class="new-chip">${icon('sparkles')} Nieuw woord</span></div>
    <div class="q-card">
      <div class="intro-pair">
        <span class="eyebrow">${esc(langName(list.langA))}</span>
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap">
          <div class="q-word">${esc(word.a)}</div>${speakBtn(list.langA, 'a')}
        </div>
        <div class="intro-divider"></div>
        <span class="eyebrow">${esc(langName(list.langB))}</span>
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap">
          <div class="q-word" style="font-size:clamp(22px,6.5vw,32px);color:var(--label2)">${esc(word.b)}</div>${speakBtn(list.langB, 'b')}
        </div>
      </div>
    </div>
    <p class="intro-tip">${esc(pick(TIPS))}</p>
    <button class="btn btn-primary btn-block" data-go>Begrepen ${icon('arrow')}</button>
  </div>`;
  wireSpeak(host, { a: [word.a, list.langA], b: [word.b, list.langB] });
  maybeAutoSpeak(word.a, list.langA);
  if (list.langA === 'nl') maybeAutoSpeak(word.b, list.langB);

  return stage.race(
    new Promise((resolve) => {
      const t0 = performance.now();
      const go = () => {
        stage.keyHandler = null;
        sfx.pop();
        resolve({ correct: true, ms: performance.now() - t0, el: host.querySelector('.q-card') });
      };
      host.querySelector('[data-go]').addEventListener('click', go, { once: true });
      stage.keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      };
      setTimeout(() => host.querySelector('[data-go]')?.focus({ preventScroll: true }), 80);
    })
  );
}

// ---------------------------------------------------------------------------
// Meerkeuze

export function exMC(stage, host, { word, list, dir, pool, golden = false, variant = '' }) {
  const prompt = promptOf(word, dir);
  const answer = answerOf(word, dir);
  const [pl] = langsOf(list, dir);
  const opts = shuffle([answer, ...distractors(answer, pool, 3)]);
  const blitz = variant === 'blitz';

  host.innerHTML = `<div class="q-wrap">
    ${blitz ? '' : kicker('Kies de juiste vertaling', golden)}
    ${card({ prompt, promptLang: pl, golden, compact: blitz })}
    <div class="options${blitz ? ' blitz-options' : ''}">
      ${opts.map((o, i) => `<button class="option" data-i="${i}"><span class="key">${i + 1}</span><span class="txt">${esc(o)}</span></button>`).join('')}
    </div>
  </div>`;
  wireSpeak(host, { p: [prompt, pl] });
  if (!blitz) maybeAutoSpeak(prompt, pl);

  return stage.race(
    new Promise((resolve) => {
      const t0 = performance.now();
      const box = host.querySelector('.options');
      let locked = false;
      const choose = (i) => {
        if (locked || i < 0 || i >= opts.length) return;
        locked = true;
        stage.keyHandler = null;
        box.classList.add('locked');
        const correct = opts[i] === answer;
        box.querySelectorAll('.option').forEach((b, j) => {
          if (opts[j] === answer) b.classList.add('correct');
          else if (j === i) b.classList.add('wrong');
          else b.classList.add('dim');
        });
        resolve({ correct, ms: performance.now() - t0, given: opts[i], expected: answer, fromChoice: true, el: box.querySelectorAll('.option')[i] });
      };
      box.addEventListener('click', (e) => {
        const b = e.target.closest('.option');
        if (b) choose(+b.dataset.i);
      });
      stage.keyHandler = (e) => {
        if (/^[1-4]$/.test(e.key)) {
          e.preventDefault();
          choose(+e.key - 1);
        }
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Zelf typen

export function exType(stage, host, { word, list, dir, golden = false, compact = false, label = '' }) {
  const prompt = promptOf(word, dir);
  const answer = answerOf(word, dir);
  const [pl, al] = langsOf(list, dir);
  const chars = lang(al).chars;
  const core = coreAnswer(answer);

  host.innerHTML = `<div class="q-wrap">
    ${kicker(label || toLang(al), golden)}
    ${card({ prompt, promptLang: pl, golden, compact })}
    <form class="stack" data-form autocomplete="off">
      <input class="answer-input" id="answer-input" name="answer" type="text" placeholder="Typ je antwoord"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
        lang="${lang(al).tts || ''}" aria-label="Jouw antwoord">
      <div class="hint-line" aria-live="polite"></div>
      ${chars ? `<div class="charbar">${[...chars].map((c) => `<button type="button" class="char" data-char="${c}">${c}</button>`).join('')}</div>` : ''}
      <div class="game-actions">
        <button type="button" class="btn btn-gray" data-hint aria-label="Hint: toon een letter">${icon('bulb')}</button>
        <button type="button" class="btn btn-gray" data-skip>Weet ik niet</button>
        <button type="submit" class="btn btn-primary">Controleer</button>
      </div>
    </form>
  </div>`;
  wireSpeak(host, { p: [prompt, pl] });
  maybeAutoSpeak(prompt, pl);
  stage.keyHandler = null;

  const input = host.querySelector('#answer-input');
  const hintLine = host.querySelector('.hint-line');
  setTimeout(() => input.focus({ preventScroll: true }), 60);

  return stage.race(
    new Promise((resolve) => {
      const t0 = performance.now();
      let hints = 0;
      let done = false;
      const finish = (r) => {
        if (done) return;
        done = true;
        input.readOnly = true;
        // Toetsenbord wegklappen als er feedback komt, zodat je die ziet
        if (!(r.correct && !r.close)) input.blur();
        host.querySelectorAll('button').forEach((b) => (b.disabled = true));
        resolve({ ms: performance.now() - t0, hints, el: host.querySelector('.q-card'), ...r });
      };

      host.querySelector('[data-form]').addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value;
        if (!val.trim()) {
          input.classList.remove('bad');
          void input.offsetWidth;
          input.classList.add('bad');
          haptic('light');
          return;
        }
        const res = checkAnswer(val, answer, { tolerance: state.settings.tolerance, accents: state.settings.accents, commaSyn: list.commaSyn });
        input.classList.add(res.ok ? 'ok' : 'bad');
        finish({ correct: res.ok, close: res.ok && !res.exact, note: res.note, expected: res.expected, given: val });
      });

      host.querySelector('[data-skip]').addEventListener('click', () => {
        finish({ correct: false, skipped: true, given: '', expected: displayAnswer(answer) });
      });

      host.querySelector('[data-hint]').addEventListener('click', () => {
        const letters = core.replace(/\s/g, '').length;
        if (hints >= letters - 1) return;
        hints++;
        sfx.tap();
        let shown = 0;
        hintLine.textContent = [...core]
          .map((c) => {
            if (c === ' ') return '  ';
            shown++;
            return shown <= hints ? c : '_';
          })
          .join(' ');
        input.focus({ preventScroll: true });
      });

      host.querySelector('.charbar')?.addEventListener('click', (e) => {
        const b = e.target.closest('[data-char]');
        if (!b) return;
        const s = input.selectionStart ?? input.value.length;
        const en = input.selectionEnd ?? input.value.length;
        input.setRangeText(b.dataset.char, s, en, 'end');
        input.focus({ preventScroll: true });
        sfx.tap();
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Letterblokjes

const DECOY = 'eaionrstlduk';

export function exTiles(stage, host, { word, list, dir, golden = false }) {
  const prompt = promptOf(word, dir);
  const answer = answerOf(word, dir);
  const [pl] = langsOf(list, dir);
  const target = coreAnswer(answer);
  const chars = [...target];
  const letters = chars.filter((c) => c !== ' ');
  const extra = letters.length >= 4 ? (letters.length >= 8 ? 2 : 1) : 0;
  const pool = [...letters];
  for (let i = 0; i < extra; i++) pool.push(DECOY[Math.floor(Math.random() * DECOY.length)]);
  const bank = shuffle(pool).map((ch) => ({ ch, used: false }));
  const slotChars = chars.map((c) => (c === ' ' ? ' ' : null));
  const slotTile = chars.map(() => -1);

  host.innerHTML = `<div class="q-wrap">
    ${kicker('Bouw de vertaling', golden)}
    ${card({ prompt, promptLang: pl, golden })}
    <div class="slots" aria-live="polite"></div>
    <div class="bank"></div>
    <div class="game-actions">
      <button type="button" class="btn btn-gray" data-clear>Wissen</button>
      <button type="button" class="btn btn-gray" data-skip style="flex:1">Weet ik niet</button>
    </div>
  </div>`;
  wireSpeak(host, { p: [prompt, pl] });
  maybeAutoSpeak(prompt, pl);

  const slotsEl = host.querySelector('.slots');
  const bankEl = host.querySelector('.bank');

  const render = () => {
    const firstEmpty = slotChars.findIndex((c) => c === null);
    slotsEl.innerHTML = chars
      .map((c, i) =>
        c === ' '
          ? '<span class="slot space"></span>'
          : `<button type="button" class="slot${slotChars[i] ? ' filled' : ''}${i === firstEmpty ? ' cursor' : ''}" data-slot="${i}" aria-label="${slotChars[i] ? `Letter ${esc(slotChars[i])} weghalen` : 'Leeg vakje'}">${esc(slotChars[i] || '')}</button>`
      )
      .join('');
    bankEl.innerHTML = bank.map((t, i) => `<button type="button" class="tile${t.used ? ' used' : ''}" data-tile="${i}">${esc(t.ch)}</button>`).join('');
  };
  render();

  return stage.race(
    new Promise((resolve) => {
      const t0 = performance.now();
      let done = false;

      const check = () => {
        if (slotChars.some((c) => c === null)) return;
        done = true;
        stage.keyHandler = null;
        const given = slotChars.join('');
        const correct = normalize(given) === normalize(target);
        slotsEl.classList.add(correct ? 'ok' : 'bad');
        host.querySelectorAll('button').forEach((b) => (b.disabled = true));
        setTimeout(() => resolve({ correct, given, expected: target, ms: performance.now() - t0, el: host.querySelector('.q-card') }), correct ? 120 : 420);
      };
      const place = (ti) => {
        if (done || bank[ti].used) return;
        const si = slotChars.findIndex((c) => c === null);
        if (si < 0) return;
        bank[ti].used = true;
        slotChars[si] = bank[ti].ch;
        slotTile[si] = ti;
        sfx.tap();
        haptic('select');
        render();
        check();
      };
      const unplace = (si) => {
        if (done || slotTile[si] < 0) return;
        bank[slotTile[si]].used = false;
        slotChars[si] = null;
        slotTile[si] = -1;
        sfx.tap();
        render();
      };

      bankEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tile]');
        if (b) place(+b.dataset.tile);
      });
      slotsEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-slot]');
        if (b) unplace(+b.dataset.slot);
      });
      host.querySelector('[data-clear]').addEventListener('click', () => {
        slotChars.forEach((c, i) => c && c !== ' ' && unplace(i));
      });
      host.querySelector('[data-skip]').addEventListener('click', () => {
        if (done) return;
        done = true;
        stage.keyHandler = null;
        resolve({ correct: false, skipped: true, given: '', expected: target, ms: performance.now() - t0 });
      });
      stage.keyHandler = (e) => {
        if (e.key === 'Backspace') {
          e.preventDefault();
          for (let i = slotTile.length - 1; i >= 0; i--) {
            if (slotTile[i] >= 0) {
              unplace(i);
              break;
            }
          }
          return;
        }
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          const k = e.key.toLowerCase();
          const ti = bank.findIndex((t) => !t.used && t.ch.toLowerCase() === k);
          if (ti >= 0) {
            e.preventDefault();
            place(ti);
          }
        }
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Feedback na een fout of een bijna-goed antwoord

function diffHTML(given, expected) {
  const d = diffChars(given, expected);
  const g = d.given.map((s) => (s.k === 'bad' ? `<span class="bad">${esc(s.t)}</span>` : esc(s.t))).join('');
  const w = d.want.map((s) => (s.k === 'miss' ? `<span class="miss">${esc(s.t)}</span>` : esc(s.t))).join('');
  return { g, w };
}

/**
 * @param {{kind: 'bad'|'close', word: object, list: object, dir: string, result: object, allowOverride?: boolean}} o
 * @returns {Promise<{override: boolean}>}
 */
export function showFeedback(stage, { kind, word, list, dir, result, allowOverride = false }) {
  const fb = stage.feedback;
  const inner = fb.querySelector('.feedback-inner');
  const answer = answerOf(word, dir);
  const prompt = promptOf(word, dir);
  const [, al] = langsOf(list, dir);
  const typed = result.given && result.given.trim() && !result.fromChoice;
  const alts = variants(answer, { commaSyn: list.commaSyn }).length > 2 && /[\/;|]/.test(answer);

  let title;
  let sub;
  let body = '';
  if (kind === 'close') {
    title = result.note === 'accent' ? 'Let op de accenten' : 'Bijna perfect!';
    sub = 'Goed gerekend. Zo schrijf je het precies:';
    const { g, w } = diffHTML(result.given, result.expected);
    body = `<div class="fb-answer"><span class="lbl">Jij</span><span class="diff">${g}</span><span class="lbl" style="margin-top:6px">Juist</span><span class="diff">${w}</span></div>`;
  } else {
    title = result.skipped ? 'Geen probleem' : pick(['Niet helemaal', 'Bijna!', 'Net niet']);
    sub = result.skipped ? 'Kijk er even goed naar, hij komt zo terug.' : 'Onthoud deze, hij komt zo nog een keer.';
    body = `<div class="fb-answer">
      <span class="lbl">${esc(prompt)}</span>
      <span class="val">${esc(displayAnswer(answer))}</span>
      ${alts ? `<span class="small muted">Ook goed: ${esc(answer.replace(/[()]/g, ''))}</span>` : ''}
    </div>`;
    if (typed && result.expected) {
      const { g, w } = diffHTML(result.given, result.expected);
      body += `<div class="fb-answer"><span class="lbl">Jij typte</span><span class="diff">${g}</span><span class="lbl" style="margin-top:6px">Verschil</span><span class="diff">${w}</span></div>`;
    }
  }

  inner.innerHTML = `
    <div class="fb-head">
      <span class="fb-icon">${icon(kind === 'close' ? 'check' : 'info')}</span>
      <div><div class="fb-title">${esc(title)}</div><div class="fb-sub">${esc(sub)}</div></div>
    </div>
    ${body}
    <div class="fb-actions">
      ${allowOverride && kind === 'bad' && typed ? '<button class="btn btn-plain" data-override>Ik had het goed</button>' : ''}
      <button class="btn btn-primary" data-next>Verder</button>
    </div>`;
  fb.className = `feedback ${kind === 'bad' ? 'bad' : 'good'}`;
  void fb.offsetWidth;
  fb.classList.add('show');
  if (canSpeak(al) && state.settings.autoSpeak) speak(answer, al);

  const shownAt = performance.now();
  return stage
    .race(
      new Promise((resolve) => {
        const done = (override) => {
          stage.keyHandler = null;
          sfx.tap();
          resolve({ override });
        };
        inner.querySelector('[data-next]').addEventListener('click', () => done(false), { once: true });
        inner.querySelector('[data-override]')?.addEventListener('click', () => done(true), { once: true });
        stage.keyHandler = (e) => {
          if (e.key === 'Enter' && performance.now() - shownAt > 350) {
            e.preventDefault();
            done(false);
          }
        };
        setTimeout(() => inner.querySelector('[data-next]')?.focus({ preventScroll: true }), 380);
      })
    )
    .then(async (r) => {
      fb.classList.remove('show');
      await sleep(180);
      return r && !r.aborted ? r : { override: false };
    });
}
