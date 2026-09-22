// Uitspraak via de ingebouwde stemmen van het apparaat (op Apple-apparaten klinken die erg goed).

import { lang } from '../data/langs.js';

const supported = 'speechSynthesis' in window;
let voices = [];

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}
if (supported) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export const canSpeak = (code) => supported && !!lang(code).tts;

function bestVoice(tag) {
  const t = tag.toLowerCase();
  const prefix = t.slice(0, 2);
  const cands = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(prefix));
  return (
    cands.find((v) => v.lang.toLowerCase() === t && /premium|enhanced|natural|siri|neural/i.test(v.name)) ||
    cands.find((v) => v.lang.toLowerCase() === t && /google|microsoft/i.test(v.name)) ||
    cands.find((v) => v.lang.toLowerCase() === t) ||
    cands[0] ||
    null
  );
}

export function speak(text, code) {
  if (!canSpeak(code)) return;
  const tag = lang(code).tts;
  const clean = String(text).split(/\s*[\/;|]\s*/)[0].replace(/[()]/g, '').trim();
  if (!clean) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = tag;
    u.rate = 0.92;
    const v = bestVoice(tag);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch (e) {
    /* geen stem beschikbaar */
  }
}
