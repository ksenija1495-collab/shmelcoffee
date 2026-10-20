import { CHAMPION_PICKER_ITEMS, type ChampionPickerItem } from '../data/championRecipePicker';
import { recipesData } from '../data/recipes';
import type { BrewRecipe } from './cupRecipe';
import { normalizeRecipe, scaleRecipeToTargetVolume } from './cupRecipe';

export type RecipeDetail = {
  championId?: string;
  title?: string;
  subtitle?: string;
  steps: string[];
  tip?: string;
};

export const DEFAULT_CUP_ML = 150;

/** Ближайший чемпионский / базовый рецепт под метод и целевой объём. */
export function pickChampionForMethod(brewMethod: string, targetMl = DEFAULT_CUP_ML): ChampionPickerItem | null {
  const items = CHAMPION_PICKER_ITEMS.filter((i) => i.brewMethod === brewMethod);
  if (!items.length) return null;
  const easy = items.find((i) => /прост|лёгк|easy/i.test(i.badgeText));
  if (easy) return easy;
  let best = items[0];
  let bestDist = Infinity;
  for (const item of items) {
    const w = item.recipe.water_g || 250;
    const d = Math.abs(w - targetMl);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

export function championDetail(item: ChampionPickerItem): RecipeDetail {
  const [methodKey, idxStr] = item.id.split(':');
  const idx = parseInt(idxStr, 10);
  const entry = recipesData[methodKey]?.recipes[idx];
  return {
    championId: item.id,
    title: item.title,
    subtitle: item.badgeText + ' · ' + item.methodName,
    steps: entry?.steps?.length ? entry.steps : [`${item.title}: ${item.badgeText}`],
    tip: entry?.tip,
  };
}

export function mergeChampionIntoPlan(
  base: BrewRecipe,
  champion: ChampionPickerItem,
  targetMl: number,
): BrewRecipe {
  const scaledBase = scaleRecipeToTargetVolume(base, targetMl) || base;
  const scaledChamp = scaleRecipeToTargetVolume(champion.recipe, targetMl) || champion.recipe;
  return {
    ...scaledChamp,
    coffee_g: scaledBase.coffee_g ?? scaledChamp.coffee_g,
    water_g: targetMl,
    grind: scaledChamp.grind || scaledBase.grind,
    temp: scaledChamp.temp || scaledBase.temp,
    time: scaledChamp.time || scaledBase.time,
    blooming: scaledChamp.blooming || scaledBase.blooming,
    pours: scaledChamp.pours?.length ? scaledChamp.pours : scaledBase.pours,
    aeropress_mode: scaledChamp.aeropress_mode || scaledBase.aeropress_mode,
  };
}

export function genericStepsForMethod(method: string): string[] {
  const m = method.toLowerCase();
  if (m.includes('v60') || m.includes('switch') || m.includes('chemex')) {
    return [
      'Взвесь зерно и воду под выбранный объём (ориентир 150 мл в чашке).',
      'Предсмачивание: 2–3× вес кофе, 30–45 с, лёгкое перемешивание.',
      'Основные проливы — круговыми движениями, не перегревай воду на delicate лотах.',
      'Дождись полного стекания; попробуй остывающую чашку на 55–60 °C.',
    ];
  }
  if (m.includes('aeropress')) {
    return [
      'Зерно + вода по рецепту, температура на 1–2 °C ниже, если лot natural/funky.',
      'Настой по таймеру, затем пресс медленно и ровно.',
      'При необходимости — байпас водой мимо кофе до целевого объёма в чашке.',
    ];
  }
  if (m.includes('турка')) {
    return [
      'Мелкий помол, холодная вода, медленный нагрев до трёх подъёмов пенки.',
      'Не кипяти долго — снимай с огня, когда пенка поднимается.',
    ];
  }
  return [
    'Сверь дозу и воду с подсказкой выше.',
    'Заваривай как обычно для этого метода; после — отметь вкус в дневнике.',
  ];
}

export function detailForPlan(
  brewMethod: string,
  championId?: string | null,
): RecipeDetail {
  if (championId) {
    const item = CHAMPION_PICKER_ITEMS.find((i) => i.id === championId);
    if (item) return championDetail(item);
  }
  const picked = pickChampionForMethod(brewMethod, DEFAULT_CUP_ML);
  if (picked) return championDetail(picked);
  return { steps: genericStepsForMethod(brewMethod) };
}

export function scaledPlanRecipe(recipe: BrewRecipe, targetMl: number): BrewRecipe {
  const norm = normalizeRecipe(recipe);
  if (!norm) return recipe;
  return scaleRecipeToTargetVolume(norm, targetMl) || norm;
}
