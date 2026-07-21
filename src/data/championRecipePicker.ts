import { recipesData, type RecipeEntry } from './recipes';
import type { BrewRecipe } from '../lib/cupRecipe';

export type ChampionPickerItem = {
  id: string;
  methodKey: string;
  methodName: string;
  methodIcon: string;
  title: string;
  badgeText: string;
  brewMethod: string;
  recipe: BrewRecipe;
};

function entryToRecipe(r: RecipeEntry): BrewRecipe {
  const parsed: BrewRecipe = {};
  const dose = r.params.dose?.match(/[\d]+(?:[.,]\d+)?/);
  const water = r.params.water?.match(/[\d]+(?:[.,]\d+)?/);
  if (dose) parsed.coffee_g = parseFloat(dose[0].replace(',', '.'));
  if (water) parsed.water_g = parseFloat(water[0].replace(',', '.'));
  if (r.params.grind) parsed.grind = r.params.grind;
  if (r.params.temp) parsed.temp = r.params.temp.replace(/\s*°C.*/, '').trim() + (r.params.temp.includes('°') ? '' : '');
  if (r.params.time) parsed.time = r.params.time;
  if (r.blooming) {
    parsed.blooming = {
      ml: r.blooming.ml ?? null,
      time: r.blooming.time ?? null,
    };
  }
  if (r.pours?.length) {
    parsed.pours = r.pours.map((p) => ({
      ml: p.ml ?? null,
      time: p.time ?? null,
    }));
  }
  return parsed;
}

export const CHAMPION_PICKER_ITEMS: ChampionPickerItem[] = Object.entries(recipesData).flatMap(
  ([methodKey, method]) =>
    method.recipes.map((r, idx) => ({
      id: `${methodKey}:${idx}`,
      methodKey,
      methodName: method.name,
      methodIcon: method.icon,
      title: r.title,
      badgeText: r.badgeText,
      brewMethod: method.name === 'V60' ? 'V60' : method.name,
      recipe: entryToRecipe(r),
    })),
);
