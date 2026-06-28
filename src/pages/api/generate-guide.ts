import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getAuthUser } from '../../lib/requireAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const { selectionId } = await request.json();
  if (!selectionId) return new Response('Missing selectionId', { status: 400 });

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: selection, error: selErr } = await supabase
    .from('coffee_selections')
    .select('*')
    .eq('id', selectionId)
    .single();

  if (selErr || !selection) return new Response('Selection not found', { status: 404 });
  if (selection.user_id !== auth.user.id) return new Response('forbidden', { status: 403 });

  const { data: consumed } = await supabase.rpc('consume_guide_credit', { p_user: auth.user.id });
  if (!consumed) return new Response('payment_required', { status: 402 });

  const refund = async () => {
    await supabase.rpc('add_guide_credits', { p_user: auth.user.id, p_amount: 1 });
  };

  const { data: profile } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', auth.user.id)
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
      user_id: auth.user.id,
      selection_id: selectionId,
      content,
    });

    if (insertErr) { await refund(); return new Response(insertErr.message, { status: 500 }); }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    await refund();
    return new Response(`OpenAI error: ${e.message}`, { status: 500 });
  }
};
