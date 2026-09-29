import type { SupabaseClient } from '@supabase/supabase-js';

export const SHELF_ASSIST_HISTORY_DAYS = 7;

export type ShelfAssistTurn = {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

function historySinceIso(days = SHELF_ASSIST_HISTORY_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function isShelfAssistantMessagesMigrationError(message?: string | null): boolean {
  const m = (message || '').toLowerCase();
  return m.includes('shelf_assistant_messages') || m.includes('does not exist');
}

/** Последние N дней переписки с IVAN (для UI и LLM). */
export async function loadShelfAssistantHistory(
  admin: SupabaseClient,
  userId: string,
  days = SHELF_ASSIST_HISTORY_DAYS,
): Promise<{ messages: ShelfAssistTurn[]; tableOk: boolean }> {
  const since = historySinceIso(days);
  const { data, error } = await admin
    .from('shelf_assistant_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(80);

  if (error) {
    if (isShelfAssistantMessagesMigrationError(error.message)) {
      return { messages: [], tableOk: false };
    }
    throw error;
  }

  const messages = (data ?? [])
    .filter(
      (r) =>
        (r.role === 'user' || r.role === 'assistant') &&
        typeof r.content === 'string' &&
        r.content.trim(),
    )
    .map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: String(r.content),
      created_at: r.created_at ?? undefined,
    }));

  return { messages, tableOk: true };
}

export async function pruneShelfAssistantHistory(
  admin: SupabaseClient,
  userId: string,
  days = SHELF_ASSIST_HISTORY_DAYS,
): Promise<void> {
  const since = historySinceIso(days);
  const { error } = await admin
    .from('shelf_assistant_messages')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', since);

  if (error && !isShelfAssistantMessagesMigrationError(error.message)) {
    console.warn('[shelf-assistant] prune failed:', error.message);
  }
}

export async function saveShelfAssistantTurns(
  admin: SupabaseClient,
  userId: string,
  userMessage: string,
  assistantReply: string,
): Promise<{ ok: boolean; tableOk: boolean }> {
  const rows = [
    { user_id: userId, role: 'user', content: userMessage.slice(0, 8000) },
    { user_id: userId, role: 'assistant', content: assistantReply.slice(0, 8000) },
  ];

  const { error } = await admin.from('shelf_assistant_messages').insert(rows);
  if (error) {
    if (isShelfAssistantMessagesMigrationError(error.message)) {
      return { ok: false, tableOk: false };
    }
    throw error;
  }

  await pruneShelfAssistantHistory(admin, userId);
  return { ok: true, tableOk: true };
}

/** Для OpenAI: только user/assistant, без дат. */
export function turnsForModel(messages: ShelfAssistTurn[], maxTurns = 16): ShelfAssistTurn[] {
  return messages.slice(-maxTurns).map(({ role, content }) => ({ role, content }));
}
