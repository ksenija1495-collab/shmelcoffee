import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { selectionId } = await request.json();
  if (!selectionId) return new Response('Missing selectionId', { status: 400 });

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: selection, error: selErr } = await supabase
    .from('coffee_selections')
    .select('*')
    .eq('id', selectionId)
    .single();

  if (selErr || !selection) return new Response('Selection not found', { status: 404 });

  // Paywall: персональная генерация доступна только по активной подписке
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('active_until')
    .eq('user_id', selection.user_id)
    .maybeSingle();
  if (!sub || new Date(sub.active_until) <= new Date()) {
    return new Response('subscription_required', { status: 402 });
  }

  const { data: profile } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', selection.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const coffeeList = (selection.coffees as any[])
    .map((c: any) => `- ${c.name} (${c.roaster}) — ${c.origin || 'unknown origin'}, ${c.process || ''}, ноты: ${c.notes || 'не указаны'}`)
    .join('\n');

  const profileContext = profile
    ? `Вкусовой профиль пользователя: ${profile.profile_type}. Предпочитает: ${(profile.preferred_tastes || []).join(', ')}. Метод заваривания: ${profile.brew_method || 'не указан'}.`
    : 'Вкусовой профиль не заполнен.';

  const prompt = `Ты — эксперт по specialty кофе из Shmelco Coffee Guide. Пользователь получил дегустационный сет. Составь персональный гид по дегустации этих кофе.\n\n${profileContext}\n\nКофе в сете:\n${coffeeList}\n\nФормат: ${selection.format === 'drip' ? 'дрип-пакеты' : selection.format === 'beans' ? 'зерно для воронки/фильтра' : 'микс'}\n\nНапиши гид в формате HTML (без обёрток <html>, только контент с <h2>, <h3>, <p>, <ul>):\n1. Краткое введение (2-3 предложения, тёплый тон)\n2. Для каждого кофе:\n   - Что ожидать (вкусовой профиль, аромат)\n   - Как лучше заварить (температура, пропорции, время)\n   - На что обратить внимание при дегустации\n   - С чем сравнить в жизни (аналогии для новичка)\n3. Порядок дегустации (от лёгкого к тёмному)\n4. 2-3 совета по развитию вкусового восприятия\n\nПиши на русском, дружелюбно, без менторства. Как друг который шарит в кофе.`;

  try {
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || 'Не удалось сгенерировать гид.';

    const { error: insertErr } = await supabase.from('guides').insert({
      user_id: selection.user_id,
      selection_id: selectionId,
      content,
    });

    if (insertErr) return new Response(insertErr.message, { status: 500 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(`OpenAI error: ${e.message}`, { status: 500 });
  }
};
