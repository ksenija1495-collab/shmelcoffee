export type BrewRecipe = {
  coffee_g?: number | null;
  water_g?: number | null;
  grind?: string | null;
  grinder?: string | null;
  ratio?: string | null;
  temp?: string | null;
  time?: string | null;
  blooming?: string | null;
  pours?: string[];
};

const RECIPE_KEYS = ['coffee_g', 'water_g', 'grind', 'grinder', 'temp', 'time', 'blooming', 'pours'] as const;

/** Парсит «15 г / 250 мл» из текстовых рецептов методов (legacy). */
export function parseGramsFromRatioText(text: string): { coffee_g?: number; water_g?: number } {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*г[^\d]*(\d+(?:[.,]\d+)?)\s*мл/i);
  if (!m) return {};
  const coffee_g = parseFloat(m[1].replace(',', '.'));
  const water_g = parseFloat(m[2].replace(',', '.'));
  return {
    ...(Number.isFinite(coffee_g) ? { coffee_g } : {}),
    ...(Number.isFinite(water_g) ? { water_g } : {}),
  };
}

export function recipeHasData(recipe: Record<string, unknown>): boolean {
  return Object.entries(recipe).some(([, v]) => {
    if (v == null || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

export function normalizeRecipe(raw: unknown): BrewRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: BrewRecipe = {};
  if (r.coffee_g != null && r.coffee_g !== '') out.coffee_g = Number(r.coffee_g) || null;
  if (r.water_g != null && r.water_g !== '') out.water_g = Number(r.water_g) || null;
  if (!out.coffee_g && !out.water_g && r.ratio) {
    const parsed = parseGramsFromRatioText(String(r.ratio));
    if (parsed.coffee_g) out.coffee_g = parsed.coffee_g;
    if (parsed.water_g) out.water_g = parsed.water_g;
  }
  if (r.grind) out.grind = String(r.grind);
  if (r.grinder) out.grinder = String(r.grinder);
  if (r.temp) out.temp = String(r.temp);
  if (r.time) out.time = String(r.time);
  if (r.blooming) out.blooming = String(r.blooming);
  if (Array.isArray(r.pours)) out.pours = r.pours.map(String).filter(Boolean);
  return recipeHasData(out as Record<string, unknown>) ? out : null;
}

export function formatCupRecipe(recipe: unknown): string {
  const r = normalizeRecipe(recipe);
  if (!r) return '';
  const parts: string[] = [];
  if (r.coffee_g) parts.push(`${r.coffee_g} г зерна`);
  if (r.water_g) parts.push(`${r.water_g} г воды`);
  if (r.grind) parts.push(`помол ${r.grind}${r.grinder ? ` · ${r.grinder}` : ''}`);
  else if (r.grinder) parts.push(r.grinder);
  if (r.temp) parts.push(`${r.temp}°C`);
  if (r.time) parts.push(`∑ ${r.time}`);
  if (r.blooming) parts.push(`предсмачивание ${r.blooming}`);
  (r.pours || []).forEach((t, i) => { if (t) parts.push(`${i + 1}-й ${t}`); });
  return parts.join(' · ');
}

/** Короткая строка для карточки и шаринга */
export function formatCupRecipeShort(recipe: unknown, brewMethod?: string | null): string {
  const r = normalizeRecipe(recipe);
  const bits: string[] = [];
  if (brewMethod) bits.push(brewMethod);
  if (r?.coffee_g && r?.water_g) bits.push(`${r.coffee_g} г · ${r.water_g} г`);
  else if (r?.coffee_g) bits.push(`${r.coffee_g} г зерна`);
  else if (r?.water_g) bits.push(`${r.water_g} г воды`);
  if (r?.blooming) bits.push(`предсмач. ${r.blooming}`);
  const pours = r?.pours?.filter(Boolean) || [];
  if (pours.length) bits.push(`${pours.length} пролива`);
  return bits.join(' · ') || formatCupRecipe(recipe) || '';
}

export type CupRecipeLine = { label: string; value: string };

/** Структурированные строки рецепта для карточки чашки */
export function cupRecipeLines(recipe: unknown): CupRecipeLine[] {
  const r = normalizeRecipe(recipe);
  if (!r) return [];
  const lines: CupRecipeLine[] = [];
  if (r.coffee_g) lines.push({ label: 'Зерно', value: `${r.coffee_g} г` });
  if (r.water_g) lines.push({ label: 'Вода', value: `${r.water_g} г` });
  if (r.grind || r.grinder) {
    const grindBits = [r.grind, r.grinder].filter(Boolean).join(' · ');
    lines.push({ label: 'Помол', value: grindBits });
  }
  if (r.temp) lines.push({ label: 'Температура', value: `${r.temp}°C` });
  if (r.time) lines.push({ label: 'Общее время', value: r.time });
  if (r.blooming) lines.push({ label: 'Предсмачивание (блум)', value: r.blooming });
  (r.pours || []).forEach((t, i) => {
    if (t) lines.push({ label: `${i + 1}-й пролив`, value: t });
  });
  return lines;
}

export function recipeFingerprint(recipe: unknown): string {
  const r = normalizeRecipe(recipe);
  if (!r) return '';
  const stable: Record<string, unknown> = {};
  for (const k of RECIPE_KEYS) {
    const v = r[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    stable[k] = v;
  }
  return JSON.stringify(stable);
}

export function applyRecipeToParams(recipe: BrewRecipe, brewMethod?: string | null): URLSearchParams {
  const q = new URLSearchParams();
  if (brewMethod) q.set('brew', brewMethod);
  if (recipe.coffee_g) q.set('coffee_g', String(recipe.coffee_g));
  if (recipe.water_g) q.set('water_g', String(recipe.water_g));
  if (recipe.grind) q.set('grind', recipe.grind);
  if (recipe.grinder) q.set('grinder', recipe.grinder);
  if (recipe.temp) q.set('temp', recipe.temp);
  if (recipe.time) q.set('time', recipe.time);
  if (recipe.blooming) q.set('blooming', recipe.blooming);
  if (recipe.pours?.length) q.set('pours', recipe.pours.join(','));
  return q;
}
