import { formatCupRecipeShort } from './cupRecipe';

export type SavedRecipeRow = {
  id: string;
  name: string;
  brew_method?: string | null;
  recipe: unknown;
  created_at?: string;
};

export function savedRecipeSummary(row: SavedRecipeRow): string {
  return formatCupRecipeShort(row.recipe, row.brew_method) || '—';
}

export function defaultSavedRecipeName(brewMethod: string, recipe: Record<string, unknown>): string {
  const coffee = recipe.coffee_g;
  const water = recipe.water_g;
  const ratio = coffee && water ? `${coffee}/${water}` : '';
  return [brewMethod, ratio].filter(Boolean).join(' · ') || 'Мой рецепт';
}
