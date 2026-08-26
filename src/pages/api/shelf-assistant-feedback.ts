import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';
import { getShelfAssistantAccess } from '../../lib/shelfAssistantAccess';

export const prerender = false;

type FeedbackBody = {
  kind?: string;
  rating?: number;
  userMessage?: string;
  assistantReply?: string;
  beanA?: string;
  beanB?: string;
  note?: string;
};

export const POST: APIRoute = async ({ request }) => {
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

  const body = (await request.json().catch(() => ({}))) as FeedbackBody;
  const kind = body.kind;

  if (kind === 'message_rating') {
    const rating = body.rating;
    if (rating !== 1 && rating !== -1) {
      return new Response('Invalid rating', { status: 400 });
    }
    const { error } = await admin.from('shelf_assistant_feedback').insert({
      user_id: auth.user.id,
      kind: 'message_rating',
      rating,
      user_message: String(body.userMessage || '').slice(0, 4000) || null,
      assistant_reply: String(body.assistantReply || '').slice(0, 8000) || null,
    });
    if (error) {
      return new Response(error.message, { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (kind === 'pairing_success') {
    const beanA = String(body.beanA || '').trim();
    const beanB = String(body.beanB || '').trim();
    if (!beanA || !beanB || beanA === beanB) {
      return new Response('Invalid pair', { status: 400 });
    }
    const [a, b] = [beanA, beanB].sort((x, y) => x.localeCompare(y, 'ru'));
    const { error } = await admin.from('shelf_assistant_feedback').insert({
      user_id: auth.user.id,
      kind: 'pairing_success',
      bean_a: a,
      bean_b: b,
      note: String(body.note || '').slice(0, 500) || null,
    });
    if (error) {
      return new Response(error.message, { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Invalid kind', { status: 400 });
};
