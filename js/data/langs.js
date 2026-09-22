// Talen: naam, kleur van de badge, stem voor uitspraak en speciale tekens.

export const LANGS = {
  nl: { name: 'Nederlands', short: 'NL', color: '#FF7A00', tts: 'nl-NL', chars: 'ëïéèö' },
  en: { name: 'Engels', short: 'EN', color: '#0A84FF', tts: 'en-GB', chars: '' },
  fr: { name: 'Frans', short: 'FR', color: '#5E5CE6', tts: 'fr-FR', chars: 'éèêëàâçîïôûùüœ' },
  de: { name: 'Duits', short: 'DE', color: '#E5484D', tts: 'de-DE', chars: 'äöüßÄÖÜ' },
  es: { name: 'Spaans', short: 'ES', color: '#F5A524', tts: 'es-ES', chars: 'áéíóúñü¿¡' },
  it: { name: 'Italiaans', short: 'IT', color: '#30A46C', tts: 'it-IT', chars: 'àèéìíòóù' },
  pt: { name: 'Portugees', short: 'PT', color: '#12A594', tts: 'pt-PT', chars: 'áâãàçéêíóôõú' },
  la: { name: 'Latijn', short: 'LA', color: '#AD7F58', tts: null, chars: 'āēīōū' },
  gr: { name: 'Grieks', short: 'GR', color: '#3E63DD', tts: 'el-GR', chars: 'αβγδεζηθικλμνξοπρστυφχψω' },
  sv: { name: 'Zweeds', short: 'SV', color: '#0090FF', tts: 'sv-SE', chars: 'åäö' },
  zh: { name: 'Chinees', short: 'ZH', color: '#E54666', tts: 'zh-CN', chars: '' },
  xx: { name: 'Anders', short: '··', color: '#8E8E93', tts: null, chars: '' },
};

export const lang = (code) => LANGS[code] || LANGS.xx;

export function langBadge(code) {
  const l = lang(code);
  return `<span class="lang" style="--lc:${l.color}" title="${l.name}">${l.short}</span>`;
}

export function langOptions(selected) {
  return Object.entries(LANGS)
    .map(([code, l]) => `<option value="${code}"${code === selected ? ' selected' : ''}>${l.name}</option>`)
    .join('');
}
