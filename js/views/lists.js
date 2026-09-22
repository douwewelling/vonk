// Lijsten: overzicht, detailpagina, importeren en bewerken.

import { state, commit, getList, addList, deleteList, makeList, makeWord, currentList } from '../store.js';
import { esc, nl, plural, DAY } from '../util.js';
import { icon, miniRing, openSheet, alertDialog, toast, segmented } from '../ui.js';
import { langBadge, langOptions, lang } from '../data/langs.js';
import { parseList } from '../parse.js';
import { listStats, LEVELS } from '../srs.js';
import { startLearn } from '../games/learn.js';
import { startBlitz } from '../games/blitz.js';
import { startMatch } from '../games/match.js';
import { startBoss } from '../games/boss.js';
import { sfx } from '../fx/sound.js';

export const MODE_STYLE = {
  blitz: { name: 'Blitz', icon: 'bolt', g: 'linear-gradient(150deg,#FFD60A,#FF9500)', gc: '#FF9500' },
  match: { name: 'Koppel', icon: 'puzzle', g: 'linear-gradient(150deg,#34E08A,#00B3A4)', gc: '#00B3A4' },
  boss: { name: 'Eindbaas', icon: 'skull', g: 'linear-gradient(150deg,#BF5AF2,#FF375F)', gc: '#D0379A' },
};

export function modeIcon(mode) {
  const m = MODE_STYLE[mode];
  return `<span class="mode-icon" style="--g:${m.g};--gc:${m.gc}">${icon(m.icon)}</span>`;
}

export function playMode(mode, list) {
  sfx.tap();
  if (mode === 'learn') return startLearn({ lists: [list] });
  if (mode === 'blitz') return startBlitz(list);
  if (mode === 'match') return startMatch(list);
  if (mode === 'boss') return startBoss(list);
}

const langPair = (l) => `<span class="lang-pair">${langBadge(l.langA)}${icon('arrow')}${langBadge(l.langB)}</span>`;

// ---------------------------------------------------------------------------
// Overzicht

export function render(root) {
  const lists = state.lists;
  root.innerHTML = `
    <header class="titlebar">
      <div><div class="eyebrow">${plural(lists.length, 'lijst', 'lijsten')}</div><h1 class="large-title">Lijsten</h1></div>
      <button class="icon-btn accent" data-new aria-label="Nieuwe lijst">${icon('plus')}</button>
    </header>
    ${
      lists.length
        ? `<div class="group">${lists
            .map((l) => {
              const s = listStats(l);
              return `<a class="row list-row" href="#/lijst/${encodeURIComponent(l.id)}">
                <div class="row-main">
                  <div class="row-title">${esc(l.title)}${l.sample ? ' <span class="tag">Voorbeeld</span>' : ''}</div>
                  <div class="row-sub">${langPair(l)} · ${plural(s.total, 'woord', 'woorden')}${s.due ? ` · <span class="due-dot">${s.due} herhalen</span>` : ''}</div>
                </div>
                ${miniRing(s.progress, { size: 38, stroke: 4.5, label: `${Math.round(s.progress * 100)}` })}
                <span class="chev">${icon('chevron')}</span>
              </a>`;
            })
            .join('')}</div>`
        : `<div class="card empty">
            <span class="empty-icon">${icon('lists')}</span>
            <h3>Nog geen lijsten</h3>
            <p>Plak je woordjes uit StudyGo, Quizlet of Word en begin meteen met spelen.</p>
            <button class="btn btn-primary" data-new>${icon('plus')} Nieuwe lijst</button>
          </div>`
    }
    <p class="footnote">Tip: selecteer je woordjes in StudyGo, Quizlet, Word of Excel, kopieer ze en plak ze in een nieuwe lijst. Vonk herkent zelf hoe ze gescheiden zijn.</p>
  `;
  root.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => openNewList()));
}

// ---------------------------------------------------------------------------
// Detail

function dueText(w) {
  if (w.lvl < 3) return w.lvl === 0 ? 'Nog niet geleerd' : 'Wordt geleerd';
  const days = Math.ceil((w.due - Date.now()) / DAY);
  if (days <= 0) return 'Vandaag herhalen';
  if (days === 1) return 'Morgen herhalen';
  return `Herhalen over ${days} dagen`;
}

export function renderDetail(root, id) {
  const l = getList(id);
  if (!l) {
    root.innerHTML = `<nav class="navbar"><a class="back" href="#/lijsten">${icon('back')}Lijsten</a></nav>
      <div class="card empty"><h3>Deze lijst bestaat niet meer</h3><a class="btn btn-tinted" href="#/lijsten">Naar je lijsten</a></div>`;
    return;
  }
  const s = listStats(l);
  const pct = Math.round(s.progress * 100);
  root.innerHTML = `
    <nav class="navbar">
      <a class="back" href="#/lijsten">${icon('back')}Lijsten</a>
      <span class="navbar-title">${esc(l.title)}</span>
      <button class="icon-btn" data-add aria-label="Woorden toevoegen">${icon('plus')}</button>
    </nav>
    <div class="detail-head">
      ${langPair(l)}
      <h1 class="large-title">${esc(l.title)}</h1>
    </div>
    <div class="card detail-stats">
      <div class="detail-ring">${miniRing(s.progress, { size: 104, stroke: 11 })}<b>${pct}%</b></div>
      <div class="level-grid">
        <div style="--c:var(--label3)"><i></i>Nieuw<b>${s.fresh}</b></div>
        <div style="--c:var(--pink)"><i></i>Lerend<b>${s.learning}</b></div>
        <div style="--c:var(--accent)"><i></i>Gekend<b>${s.known}</b></div>
        <div style="--c:var(--gold)"><i></i>Beheerst<b>${s.mastered}</b></div>
      </div>
    </div>
    <div style="margin-top:14px">
      <button class="btn btn-primary btn-block" data-play="learn">${icon('play')} Leren${s.due ? ` · ${s.due} herhalen` : s.fresh ? ` · ${Math.min(s.fresh, state.settings.newPerSession)} nieuw` : ''}</button>
      <div class="play-grid">
        ${['blitz', 'match', 'boss'].map((m) => `<button class="play-tile" data-play="${m}">${modeIcon(m)}${MODE_STYLE[m].name}</button>`).join('')}
      </div>
    </div>

    <div class="section"><h2>Instellingen</h2></div>
    <div class="group">
      <div class="setting-stack">
        <div class="row-title">Wat wordt er gevraagd?</div>
        ${segmented('dir', [
          ['ab', `${lang(l.langA).short} → ${lang(l.langB).short}`],
          ['ba', `${lang(l.langB).short} → ${lang(l.langA).short}`],
          ['mix', 'Allebei'],
        ], l.dir)}
      </div>
      <label class="row">
        <div class="row-main"><div class="row-title">Komma = synoniem</div><div class="row-sub">"groot, lang" rekent elk woord goed. Zet uit voor rijtjes als "go, went, gone".</div></div>
        <input type="checkbox" class="switch" data-comma ${l.commaSyn ? 'checked' : ''} aria-label="Komma als synoniem">
      </label>
      <button class="row" data-rename><div class="row-main"><div class="row-title">Naam en talen wijzigen</div></div><span class="chev">${icon('chevron')}</span></button>
      <button class="row" data-reset><div class="row-main"><div class="row-title" style="color:var(--orange)">Voortgang wissen</div></div></button>
      <button class="row" data-delete><div class="row-main"><div class="row-title" style="color:var(--red)">Lijst verwijderen</div></div></button>
    </div>

    <div class="section"><h2>Woorden</h2><span class="muted small">${plural(l.words.length, 'woord', 'woorden')}</span></div>
    <div class="group">
      ${l.words
        .map(
          (w) => `<button class="row word-row" data-word="${w.id}">
            <span class="wa">${esc(w.a)}</span>
            <span class="wb">${esc(w.b)}</span>
            <span class="lvl-dots${w.lvl >= 5 ? ' max' : ''}" title="${LEVELS[w.lvl]}">${[1, 2, 3, 4, 5].map((i) => `<i class="${w.lvl >= i ? 'on' : ''}"></i>`).join('')}</span>
          </button>`
        )
        .join('')}
      <button class="row" data-add style="color:var(--accent)"><span class="row-icon" style="background:var(--accent)">${icon('plus')}</span><div class="row-main"><div class="row-title">Woorden toevoegen</div></div></button>
    </div>
  `;

  root.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => playMode(b.dataset.play, l)));
  root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openAddWords(l)));
  root.querySelector('[data-seg="dir"]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-value]');
    if (!b) return;
    l.dir = b.dataset.value;
    sfx.tap();
    commit();
  });
  root.querySelector('[data-comma]').addEventListener('change', (e) => {
    l.commaSyn = e.target.checked;
    commit();
  });
  root.querySelector('[data-rename]').addEventListener('click', () => openRename(l));
  root.querySelector('[data-reset]').addEventListener('click', async () => {
    const ok = await alertDialog({
      title: 'Voortgang wissen?',
      message: `Alle ${l.words.length} woorden in "${l.title}" worden weer nieuw. Je XP en medailles blijven.`,
      buttons: [
        { text: 'Annuleer', value: null },
        { text: 'Wissen', value: 'ok', style: 'destructive' },
      ],
    });
    if (ok !== 'ok') return;
    l.words = l.words.map((w) => ({ ...makeWord(w.a, w.b), id: w.id }));
    commit();
    toast('Voortgang gewist', { icon: 'repeat', color: 'var(--orange)' });
  });
  root.querySelector('[data-delete]').addEventListener('click', async () => {
    const ok = await alertDialog({
      title: `"${l.title}" verwijderen?`,
      message: 'De lijst en de voortgang van deze woorden verdwijnen. Dit kun je niet ongedaan maken.',
      buttons: [
        { text: 'Annuleer', value: null },
        { text: 'Verwijder', value: 'ok', style: 'destructive' },
      ],
    });
    if (ok !== 'ok') return;
    location.hash = '#/lijsten';
    deleteList(l.id);
    toast('Lijst verwijderd', { icon: 'trash', color: 'var(--red)' });
  });
  root.querySelectorAll('[data-word]').forEach((b) =>
    b.addEventListener('click', () => {
      const w = l.words.find((x) => x.id === b.dataset.word);
      if (w) openWordEdit(l, w);
    })
  );
}

// ---------------------------------------------------------------------------
// Importeren

function importFields(prefix, { withMeta = true, langA = 'en', langB = 'nl', title = '' } = {}) {
  return `<div class="form-grid">
    ${
      withMeta
        ? `<div><label class="label" for="${prefix}-title">Titel</label><input class="field" id="${prefix}-title" value="${esc(title)}" placeholder="Bijv. Engels, unit 4" maxlength="60" autocomplete="off"></div>
    <div><span class="label">Talen (links → rechts)</span>
      <div class="lang-select">
        <select class="field" id="${prefix}-la" aria-label="Taal links">${langOptions(langA)}</select>
        <button type="button" class="icon-btn" data-swaplang aria-label="Talen omwisselen">${icon('swap')}</button>
        <select class="field" id="${prefix}-lb" aria-label="Taal rechts">${langOptions(langB)}</select>
      </div>
    </div>`
        : ''
    }
    <div>
      <label class="label" for="${prefix}-text">Woorden</label>
      <textarea class="field" id="${prefix}-text" spellcheck="false" placeholder="house = huis&#10;to run = rennen&#10;(the) teacher = (de) leraar / docent"></textarea>
      <div data-preview></div>
      <p class="footnote">Eén woordpaar per regel, gescheiden door =, een tab, ; of een streepje. Tussen haakjes = mag weggelaten worden. Met / geef je meerdere goede antwoorden.</p>
    </div>
    <label class="switch-row"><span>Kolommen omdraaien<small>Gebruik dit als de vertaling links staat</small></span><input type="checkbox" class="switch" id="${prefix}-swap"></label>
  </div>`;
}

function wirePreview(root, prefix, onChange) {
  const ta = root.querySelector(`#${prefix}-text`);
  const swap = root.querySelector(`#${prefix}-swap`);
  const prev = root.querySelector('[data-preview]');
  const update = () => {
    const res = parseList(ta.value, { swap: swap.checked });
    if (!ta.value.trim()) {
      prev.innerHTML = '';
    } else if (!res.pairs.length) {
      prev.innerHTML = `<div class="preview-status warn">${icon('info')} Nog geen woordparen herkend. Zet op elke regel bijvoorbeeld "woord = vertaling".</div>`;
    } else {
      prev.innerHTML = `<div class="preview-status">${icon('check')} ${plural(res.pairs.length, 'woordpaar', 'woordparen')} herkend${res.sep ? ` (gescheiden door ${esc(res.sep === 'tab' ? 'tabs' : `"${res.sep}"`)})` : ''}${res.skipped ? ` · ${res.skipped} regel${res.skipped === 1 ? '' : 's'} overgeslagen` : ''}</div>
        <div class="preview-box" style="margin-top:8px">${res.pairs
          .slice(0, 4)
          .map((p) => `<div class="preview-row"><span>${esc(p.a)}</span><span>${esc(p.b)}</span></div>`)
          .join('')}${res.pairs.length > 4 ? `<div class="preview-row"><span class="muted">en nog ${res.pairs.length - 4}…</span><span></span></div>` : ''}</div>`;
    }
    onChange(res);
  };
  ta.addEventListener('input', update);
  swap.addEventListener('change', update);
  root.querySelector('[data-swaplang]')?.addEventListener('click', () => {
    const a = root.querySelector(`#${prefix}-la`);
    const b = root.querySelector(`#${prefix}-lb`);
    [a.value, b.value] = [b.value, a.value];
    sfx.tap();
  });
  update();
}

export function openNewList() {
  let parsed = { pairs: [] };
  const sheet = openSheet({
    title: 'Nieuwe lijst',
    body: importFields('nl'),
    foot: `<button class="btn btn-primary btn-block" data-save disabled>Lijst opslaan</button>`,
  });
  const el = sheet.el;
  const save = el.querySelector('[data-save]');
  const titleIn = el.querySelector('#nl-title');
  const validate = () => (save.disabled = !(parsed.pairs.length && titleIn.value.trim()));
  wirePreview(el, 'nl', (res) => {
    parsed = res;
    validate();
  });
  titleIn.addEventListener('input', validate);
  setTimeout(() => titleIn.focus(), 380);
  save.addEventListener('click', () => {
    const list = makeList({
      title: titleIn.value.trim(),
      langA: el.querySelector('#nl-la').value,
      langB: el.querySelector('#nl-lb').value,
      pairs: parsed.pairs,
    });
    addList(list);
    sheet.close();
    sfx.pop();
    toast(`${plural(list.words.length, 'woord', 'woorden')} toegevoegd`, { icon: 'check' });
    location.hash = `#/lijst/${encodeURIComponent(list.id)}`;
  });
}

export function openAddWords(list) {
  let parsed = { pairs: [] };
  const sheet = openSheet({
    title: 'Woorden toevoegen',
    body: importFields('aw', { withMeta: false }),
    foot: `<button class="btn btn-primary btn-block" data-save disabled>Toevoegen</button>`,
  });
  const el = sheet.el;
  const save = el.querySelector('[data-save]');
  wirePreview(el, 'aw', (res) => {
    parsed = res;
    save.disabled = !res.pairs.length;
  });
  setTimeout(() => el.querySelector('#aw-text').focus(), 380);
  save.addEventListener('click', () => {
    const have = new Set(list.words.map((w) => `${w.a.toLowerCase()} ${w.b.toLowerCase()}`));
    let added = 0;
    for (const p of parsed.pairs) {
      const k = `${p.a.toLowerCase()} ${p.b.toLowerCase()}`;
      if (have.has(k)) continue;
      have.add(k);
      list.words.push(makeWord(p.a, p.b));
      added++;
    }
    commit();
    sheet.close();
    toast(added ? `${plural(added, 'woord', 'woorden')} toegevoegd` : 'Die woorden stonden er al in', { icon: added ? 'check' : 'info', color: added ? 'var(--green)' : 'var(--orange)' });
  });
}

function openRename(list) {
  const sheet = openSheet({
    title: 'Lijst bewerken',
    body: `<div class="form-grid">
      <div><label class="label" for="rn-title">Titel</label><input class="field" id="rn-title" value="${esc(list.title)}" maxlength="60" autocomplete="off"></div>
      <div><span class="label">Talen (links → rechts)</span>
        <div class="lang-select">
          <select class="field" id="rn-la" aria-label="Taal links">${langOptions(list.langA)}</select>
          <span class="muted">${icon('arrow')}</span>
          <select class="field" id="rn-lb" aria-label="Taal rechts">${langOptions(list.langB)}</select>
        </div>
      </div>
    </div>`,
    foot: `<button class="btn btn-primary btn-block" data-save>Opslaan</button>`,
  });
  sheet.el.querySelector('[data-save]').addEventListener('click', () => {
    const t = sheet.el.querySelector('#rn-title').value.trim();
    if (t) list.title = t;
    list.langA = sheet.el.querySelector('#rn-la').value;
    list.langB = sheet.el.querySelector('#rn-lb').value;
    list.sample = false;
    commit();
    sheet.close();
    toast('Opgeslagen');
  });
}

function openWordEdit(list, w) {
  const sheet = openSheet({
    title: 'Woord',
    body: `<div class="form-grid">
      <div><label class="label" for="we-a">${esc(lang(list.langA).name)}</label><input class="field" id="we-a" value="${esc(w.a)}" autocomplete="off" spellcheck="false"></div>
      <div><label class="label" for="we-b">${esc(lang(list.langB).name)}</label><input class="field" id="we-b" value="${esc(w.b)}" autocomplete="off" spellcheck="false"></div>
      <div class="group">
        <div class="row"><div class="row-main"><div class="row-title">Niveau</div></div><span class="row-value">${LEVELS[w.lvl]}</span></div>
        <div class="row"><div class="row-main"><div class="row-title">Goed / fout</div></div><span class="row-value">${nl(w.right)} / ${nl(w.wrong)}</span></div>
        <div class="row"><div class="row-main"><div class="row-title">Planning</div></div><span class="row-value">${dueText(w)}</span></div>
      </div>
      <button class="btn btn-danger btn-block" data-del>${icon('trash')} Verwijder woord</button>
    </div>`,
    foot: `<button class="btn btn-primary btn-block" data-save>Opslaan</button>`,
  });
  const el = sheet.el;
  el.querySelector('[data-save]').addEventListener('click', () => {
    const a = el.querySelector('#we-a').value.trim();
    const b = el.querySelector('#we-b').value.trim();
    if (a && b) {
      w.a = a;
      w.b = b;
      commit();
    }
    sheet.close();
  });
  el.querySelector('[data-del]').addEventListener('click', () => {
    list.words = list.words.filter((x) => x !== w);
    commit();
    sheet.close();
    toast('Woord verwijderd', { icon: 'trash', color: 'var(--red)' });
  });
}

/** Kies een lijst (bijv. vanaf het Vandaag-scherm). */
export function openListPicker(onPick) {
  const cur = currentList();
  const sheet = openSheet({
    title: 'Kies een lijst',
    body: `<div class="group">${state.lists
      .map((l) => {
        const s = listStats(l);
        return `<button class="row" data-id="${l.id}">
          <div class="row-main"><div class="row-title">${esc(l.title)}</div><div class="row-sub">${langPair(l)} · ${Math.round(s.progress * 100)}% ${s.due ? `· ${s.due} herhalen` : ''}</div></div>
          ${cur && cur.id === l.id ? `<span style="color:var(--accent);width:22px">${icon('check')}</span>` : ''}
        </button>`;
      })
      .join('')}
      <button class="row" data-new style="color:var(--accent)"><span class="row-icon" style="background:var(--accent)">${icon('plus')}</span><div class="row-main"><div class="row-title">Nieuwe lijst</div></div></button>
    </div>`,
  });
  sheet.el.querySelectorAll('[data-id]').forEach((b) =>
    b.addEventListener('click', () => {
      sfx.tap();
      sheet.close();
      onPick(getList(b.dataset.id));
    })
  );
  sheet.el.querySelector('[data-new]').addEventListener('click', () => {
    sheet.close();
    setTimeout(openNewList, 300);
  });
}
