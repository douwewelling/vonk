// Combo's, multipliers, kritieke treffers en XP: het beloningshart van elk spel.

import { state } from '../store.js';
import { pick, centerOf } from '../util.js';
import { floatText, toast } from '../ui.js';
import { sfx } from '../fx/sound.js';
import { haptic } from '../fx/haptics.js';
import { sparkle, confetti, GOLD } from '../fx/confetti.js';
import { shout, GRADS } from './stage.js';

const MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
const SPARK = ['#FFFFFF', '#FFD60A', '#64D2FF', '#30D158'];
const PRAISE = {
  5: 'Lekker bezig',
  10: 'Vlammend',
  15: 'Niet te stoppen',
  20: 'Onwaarschijnlijk',
  25: 'Legendarisch',
  30: 'Op vuur',
  40: 'Taalmachine',
  50: 'Kettingreactie',
  75: 'Onmenselijk',
  100: 'Mythisch',
};

export class Scorer {
  constructor(stage, { boost = false, allowShield = true } = {}) {
    this.stage = stage;
    this.boost = boost;
    this.allowShield = allowShield;
    this.xp = 0;
    this.combo = 0;
    this.best = 0;
    this.correct = 0;
    this.wrong = 0;
    this.crits = 0;
    this.goldens = 0;
    this.shieldsUsed = 0;
    this.lastLostCombo = 0;
  }

  /** ×1 → ×1,5 → ×2 → ×2,5 → ×3, elke 5 goed op rij een stap hoger. */
  get mult() {
    return Math.min(3, 1 + Math.floor(this.combo / 5) * 0.5);
  }

  /** Klein beetje XP zonder combo (bijv. kennismaken met een nieuw woord). */
  bonus(amount, at) {
    const gain = this.boost ? amount * 2 : amount;
    this.xp += gain;
    this.stage.setXp(this.xp);
    if (at) {
      const p = centerOf(at);
      floatText(p.x, p.y - 40, `+${gain} XP`);
    }
    return gain;
  }

  /**
   * Goed antwoord.
   * @param {{base?: number, fast?: boolean, golden?: boolean, at?: Element|null, critChance?: number}} o
   */
  hit({ base = 10, fast = false, golden = false, at = null, critChance = 0.1 } = {}) {
    this.combo++;
    this.correct++;
    this.best = Math.max(this.best, this.combo);
    const mult = this.mult;
    let gain = (Math.max(1, base) + (fast ? 2 : 0)) * mult;
    const crit = Math.random() < critChance;
    if (crit) {
      gain *= 2;
      this.crits++;
    }
    if (golden) {
      gain += 30;
      this.goldens++;
    }
    if (this.boost) gain *= 2;
    gain = Math.round(gain);
    this.xp += gain;

    const p = at ? centerOf(at) : { x: innerWidth / 2, y: innerHeight * 0.35 };
    sfx.correct(this.combo - 1);
    haptic(crit || golden ? 'success' : 'light');
    floatText(p.x, p.y - 30, `+${gain} XP`, golden ? 'gold' : crit ? 'crit' : '');
    sparkle(p.x, p.y, { count: crit || golden ? 22 : 10, power: crit ? 7 : 4.5, colors: golden || crit ? GOLD : SPARK });

    if (golden) {
      setTimeout(() => {
        shout('Gouden kaart!', { sub: '+30 XP', grad: GRADS.gold });
        sfx.golden();
        confetti({ x: p.x, y: p.y, count: 60, spread: 360, power: 9, colors: GOLD, gravity: 0.2 });
      }, 120);
    } else if (crit) {
      setTimeout(() => {
        shout('Kritiek!', { sub: 'dubbele XP', grad: GRADS.crit });
        sfx.crit();
      }, 90);
    } else if (MILESTONES.includes(this.combo)) {
      setTimeout(() => {
        const step = this.combo <= 20 && this.combo % 5 === 0 ? ` · XP ×${String(mult).replace('.', ',')}` : '';
        shout(`${this.combo} op rij!`, { sub: (PRAISE[this.combo] || '') + step, grad: GRADS.combo });
        sfx.combo(this.combo);
        haptic('success');
        confetti({ x: innerWidth / 2, y: innerHeight * 0.42, count: 40 + this.combo, spread: 110, power: 12 });
      }, 150);
    }

    this.stage.setXp(this.xp);
    this.stage.setCombo(this.combo, mult);
    this.stage.setHeat(Math.min(1, this.combo / 20));
    return { gain, crit };
  }

  /** Fout antwoord. Een combo-schild kan de reeks redden. */
  miss() {
    this.wrong++;
    if (this.allowShield && this.combo >= 3 && state.inventory.shield > 0) {
      state.inventory.shield--;
      this.shieldsUsed++;
      toast(`Combo-schild gebruikt: je ${this.combo}-combo blijft staan`, { icon: 'shield', color: 'var(--teal)' });
      sfx.pop();
      haptic('medium');
      return { shielded: true };
    }
    this.lastLostCombo = this.combo;
    if (this.combo >= 5) toast(`Combo van ${this.combo} verloren`, { icon: 'flame', color: 'var(--label3)', duration: 1500 });
    this.combo = 0;
    this.stage.setCombo(0, 1);
    this.stage.setHeat(0);
    sfx.wrong();
    haptic('error');
    return { shielded: false };
  }

  /** "Ik had het goed": draai de laatste fout terug. */
  undoMiss() {
    this.wrong = Math.max(0, this.wrong - 1);
    if (this.lastLostCombo) {
      this.combo = this.lastLostCombo;
      this.lastLostCombo = 0;
      this.stage.setCombo(this.combo, this.mult);
    }
  }

  get accuracy() {
    const n = this.correct + this.wrong;
    return n ? this.correct / n : 1;
  }
}

export const praise = () => pick(['Goed zo!', 'Top!', 'Perfect!', 'Lekker!', 'Knap!', 'Yes!', 'Precies!', 'Helemaal goed!']);
