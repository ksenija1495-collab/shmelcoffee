import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';
import { getShelfAssistantAccess } from '../../lib/shelfAssistantAccess';
import {
  loadShelfAssistantHistory,
  SHELF_ASSIST_HISTORY_DAYS,
} from '../../lib/shelfAssistantHistory';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const admin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const access = await getShelfAssistantAccess(admin, auth.user.id);
  if (!access.hasAccess) {
    return new Response(JSON.stringify({ error: 'subscription_required' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, tableOk } = await loadShelfAssistantHistory(admin, auth.user.id);

  const contextDate = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return new Response(
    JSON.stringify({
      messages,
      tableOk,
      historyDays: SHELF_ASSIST_HISTORY_DAYS,
      contextDate,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
