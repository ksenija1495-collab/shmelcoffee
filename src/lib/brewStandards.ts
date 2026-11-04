/**
 * Единые дозы Shmelco: меньше вариантов, но граммы и миллилитры всегда согласованы.
 * Ориентир чашки фильтра: 150 ml (1:15 → 10 g).
 */
import type { BrewRecipe } from './cupRecipe';

export type StandardRecipeRec = {
  method: string;
  dose: string;
  water: string;
  temp: string;
  grind: string;
  steps: string[];
  rationale: string;
};

export type BrewRecipeRec = {
  method: string;
  label: string;
  dose: string;
  water: string;
  temp: string;
  grind: string;
  time: string;
  note: string;
};

export const SHMELCO_CUP_ML = 150;
export const SHMELCO_COFFEE_G = 10;
export const SHMELCO_RATIO = 15;

/** Парсит «15 г» и «180 мл + 50 мл байпас» → суммарная вода. */
export function parseDoseWater(dose: string, water: string): { coffee_g: number | null; water_g: number | null } {
  const coffeeM = dose.match(/(\d+(?:[.,]\d+)?)/);
  const coffee_g = coffeeM ? parseFloat(coffeeM[1].replace(',', '.')) : null;
  const waterParts = [...water.matchAll(/(\d+(?:[.,]\d+)?)\s*мл/gi)].map((m) =>
    parseFloat(m[1].replace(',', '.')),
  );
  const water_g = waterParts.length
    ? Math.round(waterParts.reduce((a, b) => a + b, 0))
    : null;
  return {
    coffee_g: Number.isFinite(coffee_g!) ? coffee_g : null,
    water_g: Number.isFinite(water_g!) ? water_g : null,
  };
}

export function recipeRecToBrewRecipe(rec: Pick<BrewRecipeRec, 'dose' | 'water' | 'temp' | 'grind' | 'time'>): BrewRecipe {
  const { coffee_g, water_g } = parseDoseWater(rec.dose, rec.water);
  const tempM = rec.temp.match(/\d+/);
  return {
    coffee_g,
    water_g,
    temp: tempM ? tempM[0] : rec.temp || null,
    grind: rec.grind && rec.grind !== '—' ? rec.grind : null,
    time: rec.time || null,
  };
}

type MethodKey =
  | 'V60'
  | 'Hario Switch'
  | 'Aeropress'
  | 'Chemex'
  | 'Kalita'
  | 'Турка'
  | 'Дрип-пакет'
  | 'Френч-пресс'
  | 'Гейзерная'
  | 'Эспрессо';

const FILTER_METHODS = new Set<MethodKey>(['V60', 'Hario Switch', 'Chemex', 'Kalita', 'Дрип-пакет']);

export function normalizeMethodKey(method: string): MethodKey | null {
  const m = method.trim();
  if (/drip|дрип/i.test(m)) return 'Дрип-пакет';
  if (/switch/i.test(m)) return 'Hario Switch';
  if (/v60/i.test(m)) return 'V60';
  if (/aero/i.test(m)) return 'Aeropress';
  if (/chemex|кемекс/i.test(m)) return 'Chemex';
  if (/kalita/i.test(m)) return 'Kalita';
  if (/турк|turka|джезв/i.test(m)) return 'Турка';
  if (/френч|french/i.test(m)) return 'Френч-пресс';
  if (/гейзер|moka/i.test(m)) return 'Гейзерная';
  if (/espresso|эспрессо/i.test(m)) return 'Эспрессо';
  return null;
}

/** Канонический рецепт под метод (один на метод, без «второго пролива»). */
export function standardRecipeRec(method: string, tempC = 92): BrewRecipeRec {
  const key = normalizeMethodKey(method) || 'V60';
  const t = `${Math.round(tempC)}°C`;

  if (key === 'Дрип-пакет') {
    return {
      method: 'Дрип-пакет',
      label: 'Как на пакете',
      dose: '—',
      water: `${SHMELCO_CUP_ML} мл`,
      temp: t,
      grind: '—',
      time: '3 пролива',
      note: 'Залей три пролива по линии на пакете — в дневнике достаточно метода и оценки.',
    };
  }
  if (key === 'Турка') {
    return {
      method: 'Турка',
      label: 'Базовый',
      dose: '7 г',
      water: '105 мл',
      temp: 'медленный нагрев',
      grind: 'в пыль',
      time: '~3:00',
      note: 'Малый объём под одну чашку (~1:15).',
    };
  }
  if (key === 'Aeropress') {
    return {
      method: 'Aeropress',
      label: 'Базовый',
      dose: `${SHMELCO_COFFEE_G} г`,
      water: `${SHMELCO_CUP_ML} мл`,
      temp: t,
      grind: '12',
      time: '1:30',
      note: 'Вся вода в камере; при необходимости разбавь до 150 ml после пресса.',
    };
  }
  if (key === 'Hario Switch') {
    return {
      method: 'Hario Switch',
      label: 'Базовый',
      dose: `${SHMELCO_COFFEE_G} г`,
      water: `${SHMELCO_CUP_ML} мл`,
      temp: t,
      grind: '13',
      time: '2:30',
      note: 'Блум 20 ml · три пролива · короткая пауза с закрытым клапаном после каждого (см. банк рецептов).',
    };
  }
  if (FILTER_METHODS.has(key)) {
    return {
      method: key,
      label: 'Базовый',
      dose: `${SHMELCO_COFFEE_G} г`,
      water: `${SHMELCO_CUP_ML} мл`,
      temp: t,
      grind: '13',
      time: '2:45',
      note: 'Блум 20 ml (0:40), затем проливы до 150 ml. Соотношение 1:15.',
    };
  }
  return {
    method: key,
    label: 'Базовый',
    dose: `${SHMELCO_COFFEE_G} г`,
    water: `${SHMELCO_CUP_ML} мл`,
    temp: t,
    grind: '13',
    time: '2:45',
    note: 'Универсальная стартовая доза 10 г / 150 ml.',
  };
}

export function standardBrewRecipe(method: string, tempC = 92): BrewRecipe {
  return recipeRecToBrewRecipe(standardRecipeRec(method, tempC));
}

export function scaleStandardToMl(method: string, targetMl: number, tempC = 92): BrewRecipe {
  const base = standardBrewRecipe(method, tempC);
  if (!base.water_g || targetMl <= 0) return base;
  const factor = targetMl / base.water_g;
  const coffee = base.coffee_g ? Math.round(base.coffee_g * factor * 10) / 10 : SHMELCO_COFFEE_G * factor;
  return {
    ...base,
    coffee_g: Math.round(coffee * 10) / 10,
    water_g: targetMl,
    blooming: base.blooming?.ml
      ? { ...base.blooming, ml: Math.max(1, Math.round(base.blooming.ml * factor)) }
      : base.blooming,
  };
}
