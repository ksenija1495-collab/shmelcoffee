import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { shelfId } = await request.json();
  if (!shelfId) return new Response('Missing shelfId', { status: 400 });

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: bean, error: beanErr } = await supabase
    .from('shelf_items')
    .select('*')
    .eq('id', shelfId)
    .single();

  if (beanErr || !bean) return new Response('Shelf item not found', { status: 404 });

  // Оплата: списываем 1 кредит-гид атомарно; нет кредитов → 402
  const { data: consumed } = await supabase.rpc('consume_guide_credit', { p_user: bean.user_id });
  if (!consumed) return new Response('payment_required', { status: 402 });

  const refund = async () => { await supabase.rpc('add_guide_credits', { p_user: bean.user_id, p_amount: 1 }); };

  const { data: profile } = await supabase
    .from('taste_profiles')
    .select('*')
    .eq('user_id', bean.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const profileContext = profile
    ? `Вкусовой профиль пользователя: ${profile.profile_type}. Предпочитает: ${(profile.preferred_tastes || []).join(', ')}. Метод заваривания: ${profile.brew_method || 'не указан'}.`
    : 'Вкусовой профиль не заполнен.';

  const beanDesc = `${bean.name}${bean.roaster ? `, обжарщик ${bean.roaster}` : ''}${bean.country ? `, страна ${bean.country}` : ''}${bean.process ? `, обработка ${bean.process}` : ''}`;

  const prompt = `Ты — эксперт по specialty кофе из Shmelco Coffee Guide. Пользователь добавил на свою полку зерно и хочет персональный гид: как раскрыть это зерно и продегустировать его под свой вкус.\n\n${profileContext}\n\nЗерно: ${beanDesc}.\n\nНапиши гид в формате HTML (без обёрток <html>, только контент с <h2>, <h3>, <p>, <ul>):\n1. Чего ожидать от этого зерна (вкус, аромат, тело) с учётом страны и обработки.\n2. Как заварить под профиль пользователя: метод, температура воды, пропорция (ratio), помол, время. Если в профиле есть метод — опирайся на него.\n3. На что обратить внимание при дегустации; с чем сравнить в жизни (аналогии для новичка).\n4. 2 совета, что попробовать дальше, если понравится или нет.\nПиши по-русски, тепло, как друг, который шарит в кофе. Без менторства.`;

  try {
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1600,
      temperature: 0.7,
    });
    const content = completion.choices[0]?.message?.content || 'Не удалось сгенерировать гид.';

    const { error: insertErr } = await supabase.from('guides').insert({
      user_id: bean.user_id,
      selection_id: null,
      content,
    });
    if (insertErr) { await refund(); return new Response(insertErr.message, { status: 500 }); }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    await refund();
    return new Response(`OpenAI error: ${e.message}`, { status: 500 });
  }
};
