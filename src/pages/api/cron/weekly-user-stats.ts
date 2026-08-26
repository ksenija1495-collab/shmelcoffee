import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import {
  computeWeeklyUserStats,
  formatWeeklyUserStatsTelegram,
} from '../../../lib/weeklyUserStats';
import { sendTelegramMessage } from '../../../lib/telegramNotify';

export const prerender = false;

function authorized(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('Authorization') || '';
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

export const GET: APIRoute = async ({ request }) => {
  if (!authorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return new Response('Missing Supabase env', { status: 500 });
  }

  try {
    const admin = createClient(url, serviceKey);
    const stats = await computeWeeklyUserStats(admin);
    const message = formatWeeklyUserStatsTelegram(stats);

    const dryRun = new URL(request.url).searchParams.get('dry') === '1';
    if (dryRun) {
      return new Response(JSON.stringify({ stats, message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sent = await sendTelegramMessage(message);
    if (!sent.ok) {
      return new Response(JSON.stringify({ error: sent.error, stats }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(msg, { status: 500 });
  }
};
