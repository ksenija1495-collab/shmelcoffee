import type { SupabaseClient } from '@supabase/supabase-js';

export type SavedBrewRecipeRow = {
  id: string;
  name: string;
  brew_method?: string | null;
  recipe: unknown;
};

async function authToken(supabase: SupabaseClient): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function fetchSavedBrewRecipes(supabase: SupabaseClient): Promise<{
  ok: boolean;
  recipes: SavedBrewRecipeRow[];
  error?: string;
}> {
  const token = await authToken(supabase);
  if (!token) return { ok: false, recipes: [], error: 'unauthorized' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  let res: Response;
  try {
    res = await fetch('/api/saved-brew-recipe', {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
  } catch {
    return { ok: false, recipes: [], error: 'timeout' };
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, recipes: [], error: body.error || 'migration_required' };
  }
  if (!res.ok) {
    return { ok: false, recipes: [], error: await res.text() };
  }
  const recipes = await res.json();
  return { ok: true, recipes: Array.isArray(recipes) ? recipes : [] };
}

export async function upsertSavedBrewRecipe(
  supabase: SupabaseClient,
  payload: { name: string; brew_method: string | null; recipe: unknown },
  updateId?: string | null,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const token = await authToken(supabase);
  if (!token) return { ok: false, error: 'unauthorized' };

  const res = await fetch('/api/saved-brew-recipe', {
    method: updateId ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateId ? { ...payload, id: updateId } : payload),
  });

  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error || 'migration_required' };
  }
  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }
  const data = await res.json();
  return { ok: true, id: data.id };
}
