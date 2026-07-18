import type { SupabaseClient } from '@supabase/supabase-js';

const columnCache = new Map<string, boolean>();

export async function tableHasColumn(
  supabase: SupabaseClient,
  table: string,
  column: string,
): Promise<boolean> {
  const key = `${table}.${column}`;
  if (columnCache.has(key)) return columnCache.get(key)!;

  const { error } = await supabase.from(table).select(column).limit(0);
  const ok = !error;
  columnCache.set(key, ok);
  return ok;
}
