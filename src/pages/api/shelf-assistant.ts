import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';
import { getOpenAI } from '../../lib/openai';
import { getShelfAssistantAccess } from '../../lib/shelfAssistantAccess';
import { buildShelfAssistantContext } from '../../lib/shelfAssistantContext';
import {
  loadShelfAssistantHistory,
  saveShelfAssistantTurns,
  turnsForModel,
} from '../../lib/shelfAssistantHistory';

export const prerender = false;

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

  const { messages: storedHistory } = await loadShelfAssistantHistory(admin, auth.user.id);
  const history = turnsForModel(storedHistory, 16);

  const context = await buildShelfAssistantContext(admin, auth.user.id);

  const sys = `Ты — IVAN, персональный дегустационный ассистент Shmelco на полке пользователя. Представляйся как IVAN. Отвечай по-русски, конкретно: лоты с полки, метод, граммы, температура, зачем сравнение.

Критично:
- Сначала блок «Лучшие рецепты по лотам» — не игнорируй его в пользу шаблонного Switch.
- Для Hario Switch всегда пиши, когда клапан закрыт и когда открыт. Не выдавай V60-проливы под видом Switch.
- «Малый объём» = AP-концентрат или лучший короткий рецепт из дневника, не 250 мл по умолчанию.
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

  const saved = await saveShelfAssistantTurns(admin, auth.user.id, message, reply);

  return new Response(JSON.stringify({ reply, historySaved: saved.ok, historyTableOk: saved.tableOk }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
