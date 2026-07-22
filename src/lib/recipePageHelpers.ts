import { decodeBrewTerms } from './decodeBrewTerms';
import { brewMethodForForm } from './brewMethodMap';
import { encodePourToken } from './brewPour';
import type { RecipeEntry } from '../data/recipes';

export const paramLabels: Record<string, string> = {
  dose: 'Зерно',
  water: 'Вода',
  ratio: 'Пропорция',
  grind: 'Помол',
  temp: 'Температура',
  time: 'Время',
  yield: 'Выход в чашку',
  milk: 'Молоко',
};

export const champParamOrder = ['dose', 'water', 'grind', 'ratio', 'temp', 'time', 'yield', 'milk'] as const;

export function recipeDisplayText(text: string | undefined): string {
  return decodeBrewTerms(String(text ?? ''));
}

export function recipeQuery(
  method: string,
  r: RecipeEntry,
  recipesData: Record<string, { name: string }>,
): string {
  const q = new URLSearchParams();
  const brewName = recipesData[method]?.name;
  q.set('brew', brewMethodForForm(brewName) || method);
  const map: Record<string, string> = {
    dose: 'coffee_g',
    water: 'water_g',
    grind: 'grind',
    temp: 'temp',
    time: 'time',
  };
  for (const [pk, qk] of Object.entries(map)) {
    const raw = r.params[pk];
    if (!raw) continue;
    const num = raw.match(/[\d]+(?:[.,]\d+)?/);
    if (qk === 'coffee_g' || qk === 'water_g') {
      if (num) q.set(qk, num[0].replace(',', '.'));
    } else if (qk === 'temp') {
      const t = raw.match(/\d+/);
      if (t) q.set('temp', t[0]);
    } else {
      q.set(qk, raw.replace(/\s*°C.*/, '').trim());
    }
  }
  if (r.blooming?.ml) q.set('blooming_ml', String(r.blooming.ml));
  if (r.blooming?.time) q.set('blooming', r.blooming.time);
  if (r.pours?.length) {
    q.set(
      'pours',
      r.pours.map((p) => encodePourToken({ ml: p.ml ?? null, time: p.time ?? null })).filter(Boolean).join(','),
    );
  }
  return `/add-cup?${q.toString()}`;
}

export function resolveRecipeTab(
  recipesData: Record<string, unknown>,
  searchParams: URLSearchParams,
): string {
  const tabParam = searchParams.get('tab') || searchParams.get('method');
  if (tabParam && tabParam in recipesData) return tabParam;
  return 'aeropress';
}
