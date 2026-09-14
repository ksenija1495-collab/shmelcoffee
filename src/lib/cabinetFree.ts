import type { SupabaseClient } from '@supabase/supabase-js';

/** Пока кабинет бесплатный — подписки и кредиты гидов не проверяем. PUBLIC_CABINET_FREE=false чтобы вернуть оплату. */
export function isCabinetFree(): boolean {
  return import.meta.env.PUBLIC_CABINET_FREE !== 'false';
}

export async function consumeGuideCreditIfNeeded(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (isCabinetFree()) return true;
  const { data: consumed } = await admin.rpc('consume_guide_credit', { p_user: userId });
  return Boolean(consumed);
}

export async function refundGuideCredit(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  if (isCabinetFree()) return;
  await admin.rpc('add_guide_credits', { p_user: userId, p_amount: 1 });
}
