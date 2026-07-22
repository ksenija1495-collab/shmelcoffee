/** Маппинг названий из recipesData / гидов → значения в select add-cup (BREWS). */
export const RECIPE_NAME_TO_BREW: Record<string, string> = {
  V60: 'V60',
  'Hario Switch': 'Hario Switch',
  'Kalita Wave': 'Kalita',
  Kalita: 'Kalita',
  Кемекс: 'Chemex',
  Chemex: 'Chemex',
  Аэропресс: 'Aeropress',
  Aeropress: 'Aeropress',
  'Френч-пресс': 'Френч-пресс',
  'Мока (гейзерная)': 'Гейзерная',
  'Гейзер (мока)': 'Гейзерная',
  'Турка (джезва)': 'Турка',
  Турка: 'Турка',
  Эспрессо: 'Эспрессо',
  'Cold Brew': 'Cold Brew',
};

export function brewMethodForForm(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  return RECIPE_NAME_TO_BREW[trimmed] || trimmed;
}
