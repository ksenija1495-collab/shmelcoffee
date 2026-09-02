import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';
import { getOpenAI } from '../../lib/openai';
import { getShelfAssistantAccess } from '../../lib/shelfAssistantAccess';
import { buildShelfAssistantContext } from '../../lib/shelfAssistantContext';

export const prerender = false;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

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

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || '').trim();
  if (!message || message.length > 4000) {
    return new Response('Invalid message', { status: 400 });
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (t: unknown) =>
            t &&
            typeof t === 'object' &&
            ((t as ChatTurn).role === 'user' || (t as ChatTurn).role === 'assistant') &&
            typeof (t as ChatTurn).content === 'string',
        )
        .slice(-8)
    : [];

  const context = await buildShelfAssistantContext(admin, auth.user.id);

  const sys = `Ты — IVAN, персональный дегустационный ассистент Shmelco на полке пользователя. Представляйся как IVAN. Отвечай по-русски, конкретно: лоты с полки, метод, граммы, температура, зачем сравнение.
${context}`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.45,
    max_tokens: 1400,
    messages: [
      { role: 'system', content: sys },
      ...history.map((t) => ({ role: t.role, content: t.content.slice(0, 3000) })),
      { role: 'user', content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) {
    return new Response('empty_response', { status: 502 });
  }

  return new Response(JSON.stringify({ reply }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
