import type { SupabaseClient } from '@supabase/supabase-js';

export type ShelfAssistantAccess = {
  hasAccess: boolean;
  source: 'subscription' | 'beta_credits' | 'none';
  activeUntil: string | null;
};

/** Проверка доступа к AI-ассистенту на полке. */
export async function getShelfAssistantAccess(
  admin: SupabaseClient,
  userId: string,
): Promise<ShelfAssistantAccess> {
  const { data: subRow } = await admin
    .from('shelf_assistant_subscriptions')
    .select('active_until')
    .eq('user_id', userId)
    .maybeSingle();

  const activeUntil = subRow?.active_until ?? null;
  if (activeUntil && new Date(activeUntil).getTime() > Date.now()) {
    return { hasAccess: true, source: 'subscription', activeUntil };
  }

  /* Временный мост до отдельного тарифа в Prodamus: оплатившие гиды тоже пробуют ассистента. */
  const { data: credits } = await admin
    .from('guide_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if ((credits?.balance ?? 0) > 0) {
    return { hasAccess: true, source: 'beta_credits', activeUntil: null };
  }

  return { hasAccess: false, source: 'none', activeUntil: null };
}

export function isShelfAssistantProduct(
  sum: number,
  label: string,
  threshold = 290,
): boolean {
  const text = label.toLowerCase();
  if (/ассистент|assistant|полк.*ai|shelf.?assist/i.test(text)) return true;
  return sum >= threshold;
}
