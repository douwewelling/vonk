// Trillingen: Android via navigator.vibrate, iPhone (iOS 18+) via een verborgen systeem-switch.

import { state } from '../store.js';

const PATTERNS = { select: 5, light: 9, medium: 16, heavy: 28, success: [12, 60, 18], error: [28, 70, 28] };
let iosSwitch = null;

export function haptic(kind = 'light') {
  if (!state.settings.haptics) return;
  if (typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(PATTERNS[kind] ?? 10);
    } catch (e) {
      /* niet ondersteund */
    }
    return;
  }
  iosTick(kind === 'success' || kind === 'error' || kind === 'heavy' ? 2 : 1);
}

function iosTick(times) {
  // Een tekstveld mag zijn focus niet verliezen, anders klapt het toetsenbord in.
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && ae.type !== 'checkbox'))) return;
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
  if (times > 1) setTimeout(() => iosSwitch && iosSwitch.click(), 110);
}
