// Profiel: level, vonken, winkel, thema's, instellingen en back-up.

import { state, commit, GOALS, exportData, importData, resetAll } from '../store.js';
import { esc, nl, download, todayKey } from '../util.js';
import { icon, miniRing, openSheet, alertDialog, toast, segmented } from '../ui.js';
import { levelInfo, THEMES, SHOP, themeGradient, applyTheme } from '../rewards.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';
import { sparkle } from '../fx/confetti.js';
import { centerOf } from '../util.js';

function initials(name) {
  const n = name.trim();
  if (!n) return '';
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function render(root) {
  const li = levelInfo(state.profile.xp);
  const inv = state.inventory;
  const s = state.settings;

  root.innerHTML = `
    <header class="titlebar"><div><div class="eyebrow">Level ${li.level} · ${esc(li.title)}</div><h1 class="large-title">Profiel</h1></div></header>

    <div class="profile-head">
      <div class="avatar">${miniRing(li.progress, { size: 96, stroke: 6 })}<span class="avatar-face">${esc(initials(state.profile.name) || li.level)}</span></div>
      <button class="profile-name" data-name>${esc(state.profile.name.trim() || 'Jouw naam')} ${icon('pencil')}</button>
      <div class="muted small">${nl(li.into)} / ${nl(li.need)} XP naar level ${li.level + 1}</div>
    </div>

    <div class="card wallet" style="margin-top:14px">
      <div>
        <div class="eyebrow">Vonken</div>
        <div class="wallet-amount">${icon('spark')}<span class="num">${nl(state.profile.sparks)}</span></div>
      </div>
      <div class="inventory">
        <span class="inv" style="--c:var(--teal)" title="Combo-schilden">${icon('shield')} ${inv.shield}</span>
        <span class="inv" style="--c:var(--blue)" title="Reeksbevriezers">${icon('snow')} ${inv.freeze}</span>
        <span class="inv" style="--c:var(--orange)" title="XP-boosts">${icon('bolt')} ${inv.boost}</span>
      </div>
    </div>
    <p class="footnote">Vonken verdien je met medailles en uit kisten. Kisten krijg je na elke leersessie, na een verslagen eindbaas en bij een nieuw record.</p>

    <div class="section"><h2>Winkel</h2></div>
    <div class="group">
      ${SHOP.map(
        (it) => `<div class="row">
          <span class="row-icon" style="background:${it.color}">${icon(it.icon)}</span>
          <div class="row-main"><div class="row-title">${esc(it.name)}</div><div class="row-sub">${esc(it.desc)} Je hebt er ${inv[it.id]}.</div></div>
          <button class="btn btn-small btn-tinted price-btn" data-buy="${it.id}" ${state.profile.sparks < it.price ? 'disabled' : ''}>${icon('spark')} ${it.price}</button>
        </div>`
      ).join('')}
    </div>

    <div class="section"><h2>Thema's</h2><span class="muted small">${inv.themes.length}/${THEMES.length}</span></div>
    <div class="themes">
      ${THEMES.map((t) => {
        const owned = inv.themes.includes(t.id);
        const active = s.theme === t.id;
        return `<button class="theme-btn" data-theme="${t.id}" aria-label="Thema ${esc(t.name)}${owned ? '' : `, kost ${t.price} vonken`}">
          <span class="swatch${active ? ' active' : ''}${owned ? '' : ' locked'}${t.id === 'holo' ? ' holo' : ''}" style="--g:${themeGradient(t)}">${active ? icon('check') : owned ? '' : icon('spark')}</span>
          <span>${esc(t.name)}</span>
          ${owned ? '' : `<span class="theme-price">${icon('spark')} ${nl(t.price)}</span>`}
        </button>`;
      }).join('')}
    </div>

    <div class="section"><h2>Instellingen</h2></div>
    <div class="group">
      <div class="setting-stack">
        <div class="row-title">Dagdoel</div>
        ${segmented('goal', Object.entries(GOALS).map(([k, g]) => [k, g.label]), s.goal)}
        <div class="small muted">${GOALS[s.goal].xp} XP · ${GOALS[s.goal].correct} goed · ${GOALS[s.goal].minutes} minuten per dag</div>
      </div>
      <div class="row">
        <div class="row-main"><div class="row-title">Nieuwe woorden per sessie</div></div>
        <div class="stepper"><button data-step="-1" aria-label="Minder">${icon('minus')}</button><span class="num">${s.newPerSession}</span><button data-step="1" aria-label="Meer">${icon('plus')}</button></div>
      </div>
      <div class="setting-stack">
        <div class="row-title">Spelling nakijken</div>
        ${segmented('tolerance', [['streng', 'Streng'], ['normaal', 'Normaal'], ['soepel', 'Soepel']], s.tolerance)}
        <div class="small muted">${s.tolerance === 'streng' ? 'Elke letter moet kloppen.' : s.tolerance === 'soepel' ? 'Twee tikfouten mogen, je ziet wel de juiste spelling.' : 'Eén kleine tikfout mag, je ziet wel de juiste spelling.'}</div>
      </div>
      <div class="setting-stack">
        <div class="row-title">Accenten (é, ü, ç)</div>
        ${segmented('accents', [['soepel', 'Mogen missen'], ['streng', 'Moeten kloppen']], s.accents)}
      </div>
      <label class="row"><span class="row-icon" style="background:var(--pink)">${icon('sound')}</span><div class="row-main"><div class="row-title">Geluid</div></div><input type="checkbox" class="switch" data-set="sound" ${s.sound ? 'checked' : ''}></label>
      <label class="row"><span class="row-icon" style="background:var(--purple)">${icon('vibrate')}</span><div class="row-main"><div class="row-title">Trillen</div></div><input type="checkbox" class="switch" data-set="haptics" ${s.haptics ? 'checked' : ''}></label>
      <label class="row"><span class="row-icon" style="background:var(--blue)">${icon('speaker')}</span><div class="row-main"><div class="row-title">Uitspraak automatisch</div><div class="row-sub">Leest vreemde woorden voor</div></div><input type="checkbox" class="switch" data-set="autoSpeak" ${s.autoSpeak ? 'checked' : ''}></label>
      <div class="setting-stack">
        <div class="row-title">Weergave</div>
        ${segmented('appearance', [['system', 'Systeem'], ['light', 'Licht'], ['dark', 'Donker']], s.appearance)}
      </div>
    </div>

    <div class="section"><h2>Gegevens</h2></div>
    <div class="group">
      <button class="row" data-export><span class="row-icon" style="background:var(--green)">${icon('download')}</span><div class="row-main"><div class="row-title">Back-up downloaden</div><div class="row-sub">Al je lijsten en voortgang in één bestand</div></div></button>
      <label class="row" style="cursor:pointer"><span class="row-icon" style="background:var(--teal)">${icon('upload')}</span><div class="row-main"><div class="row-title">Back-up terugzetten</div></div><input type="file" accept="application/json,.json" data-import hidden></label>
      <button class="row" data-wipe><span class="row-icon" style="background:var(--red)">${icon('trash')}</span><div class="row-main"><div class="row-title" style="color:var(--red)">Alles wissen</div></div></button>
    </div>
    <p class="footnote">Vonk bewaart alles alleen in deze browser, op dit apparaat. Maak af en toe een back-up als je van apparaat wisselt.</p>
    <p class="footnote" style="text-align:center;margin-top:20px">Vonk 1.0 · woordjes leren met een vonk</p>
  `;

  root.querySelector('[data-name]').addEventListener('click', editName);

  root.querySelectorAll('[data-buy]').forEach((b) =>
    b.addEventListener('click', async () => {
      const it = SHOP.find((x) => x.id === b.dataset.buy);
      if (!it || state.profile.sparks < it.price) return;
      const ok = await alertDialog({
        title: `${it.name} kopen?`,
        message: `${it.desc} Kost ${it.price} vonken.`,
        buttons: [
          { text: 'Annuleer', value: null },
          { text: 'Koop', value: 'ok', style: 'primary' },
        ],
      });
      if (ok !== 'ok') return;
      state.profile.sparks -= it.price;
      state.inventory[it.id]++;
      const p = centerOf(b);
      sparkle(p.x, p.y, { count: 16 });
      sfx.chestOpen(1);
      haptic('success');
      commit();
      toast(`${it.name} gekocht`, { icon: it.icon, color: it.color });
    })
  );

  root.querySelectorAll('[data-theme]').forEach((b) =>
    b.addEventListener('click', async () => {
      const t = THEMES.find((x) => x.id === b.dataset.theme);
      if (!t) return;
      if (!state.inventory.themes.includes(t.id)) {
        if (state.profile.sparks < t.price) {
          toast(`Nog ${nl(t.price - state.profile.sparks)} vonken nodig`, { icon: 'spark', color: 'var(--label3)' });
          sfx.wrong();
          return;
        }
        const ok = await alertDialog({
          title: `Thema ${t.name} ontgrendelen?`,
          message: `Kost ${nl(t.price)} vonken.`,
          buttons: [
            { text: 'Annuleer', value: null },
            { text: 'Ontgrendel', value: 'ok', style: 'primary' },
          ],
        });
        if (ok !== 'ok') return;
        state.profile.sparks -= t.price;
        state.inventory.themes.push(t.id);
        sfx.chestOpen(2);
        haptic('success');
      } else {
        sfx.pop();
      }
      state.settings.theme = t.id;
      applyTheme(t.id);
      commit();
    })
  );

  root.querySelectorAll('[data-seg]').forEach((seg) =>
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-value]');
      if (!b) return;
      const key = seg.dataset.seg;
      state.settings[key] = b.dataset.value;
      if (key === 'appearance') applyAppearance();
      sfx.tap();
      commit();
    })
  );

  root.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      state.settings.newPerSession = Math.min(12, Math.max(2, state.settings.newPerSession + +b.dataset.step));
      sfx.tap();
      commit();
    })
  );

  root.querySelectorAll('[data-set]').forEach((sw) =>
    sw.addEventListener('change', () => {
      state.settings[sw.dataset.set] = sw.checked;
      if (sw.checked) {
        sfx.pop();
        haptic('light');
      }
      commit();
    })
  );

  root.querySelector('[data-export]').addEventListener('click', () => {
    download(`vonk-backup-${todayKey()}.json`, exportData());
    toast('Back-up gedownload', { icon: 'download' });
  });

  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await alertDialog({
      title: 'Back-up terugzetten?',
      message: 'Je huidige lijsten en voortgang worden vervangen door die uit het bestand.',
      buttons: [
        { text: 'Annuleer', value: null },
        { text: 'Terugzetten', value: 'ok', style: 'destructive' },
      ],
    });
    if (ok !== 'ok') {
      e.target.value = '';
      return;
    }
    try {
      importData(await file.text());
      applyTheme(state.settings.theme);
      applyAppearance();
      toast('Back-up teruggezet');
    } catch (err) {
      alertDialog({ title: 'Dat lukte niet', message: err.message || 'Het bestand kon niet gelezen worden.' });
    }
  });

  root.querySelector('[data-wipe]').addEventListener('click', async () => {
    const ok = await alertDialog({
      title: 'Alles wissen?',
      message: 'Al je lijsten, XP, medailles en voortgang verdwijnen. Download eerst een back-up als je twijfelt.',
      buttons: [
        { text: 'Annuleer', value: null },
        { text: 'Wis alles', value: 'ok', style: 'destructive' },
      ],
    });
    if (ok !== 'ok') return;
    resetAll();
    applyTheme(state.settings.theme);
    applyAppearance();
    location.hash = '#/vandaag';
    toast('Alles gewist', { icon: 'trash', color: 'var(--red)' });
  });
}

export function applyAppearance() {
  const a = state.settings.appearance;
  if (a === 'light' || a === 'dark') document.documentElement.dataset.theme = a;
  else delete document.documentElement.dataset.theme;
}

function editName() {
  const sheet = openSheet({
    title: 'Jouw naam',
    body: `<div class="form-grid"><div><label class="label" for="pf-name">Naam</label><input class="field" id="pf-name" value="${esc(state.profile.name)}" maxlength="24" autocomplete="given-name" placeholder="Hoe mogen we je noemen?"></div></div>`,
    foot: `<button class="btn btn-primary btn-block" data-save>Opslaan</button>`,
  });
  const input = sheet.el.querySelector('#pf-name');
  setTimeout(() => input.focus(), 380);
  const save = () => {
    state.profile.name = input.value.trim();
    commit();
    sheet.close();
  };
  sheet.el.querySelector('[data-save]').addEventListener('click', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
}
