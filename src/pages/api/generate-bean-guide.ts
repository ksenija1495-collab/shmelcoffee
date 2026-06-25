import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const bean = body.bean || {};
  const method = (body.method || '').toString().trim();
  if (!bean.name) return new Response('Missing bean name', { status: 400 });

  const url = import.meta.env.PUBLIC_SUPABASE_URL;

  // Проверяем пользователя по его токену
  const userClient = createClient(url, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data: u } = await userClient.auth.getUser(token);
  const user = u?.user;
  if (!user) return new Response('unauthorized', { status: 401 });

  const admin = createClient(url, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

  // Списываем 1 кредит-гид атомарно
  const { data: consumed } = await admin.rpc('consume_guide_credit', { p_user: user.id });
  if (!consumed) return new Response('payment_required', { status: 402 });
  const refund = async () => { await admin.rpc('add_guide_credits', { p_user: user.id, p_amount: 1 }); };

  const { data: profile } = await admin
    .from('taste_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const profileContext = profile
    ? `Вкусовой профиль пользователя: ${profile.profile_type}. Предпочитает: ${(profile.preferred_tastes || []).join(', ')}.`
    : 'Вкусовой профиль не заполнен — дай универсальные ориентиры.';

  const beanDesc = `${bean.name}${bean.roaster ? `, обжарщик ${bean.roaster}` : ''}${bean.country ? `, страна ${bean.country}` : ''}${bean.process ? `, обработка ${bean.process}` : ''}`;
  const methodText = method || 'способ на выбор пользователя';

  const prompt = `Ты — эксперт SCA из Shmelco Coffee Guide. Составь персональный гид по конкретному зерну и конкретному способу заваривания под вкус пользователя.\n\n${profileContext}\n\nЗерно: ${beanDesc}.\nСпособ заваривания: ${methodText}.\n\nНапиши гид в формате HTML (без обёрток <html>, только контент с <h2>, <h3>, <p>, <ul>):\n1. Чего ожидать от этого зерна именно на этом способе (вкус, аромат, тело).\n2. Точный рецепт под «${methodText}»: помол, пропорция (ratio, в граммах и мл), температура воды, время, по шагам. Подстрой под профиль пользователя.\n3. На что обратить внимание при дегустации; бытовые аналогии для новичка.\n4. Если вышло слишком кисло или слишком горько — что менять (помол, температура, время).\n5. 1–2 совета, что попробовать дальше.\nПиши по-русски, тепло, как друг, который шарит в кофе. Без менторства.`;

  try {
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1700,
      temperature: 0.7,
    });
    const content = completion.choices[0]?.message?.content || 'Не удалось сгенерировать гид.';
    const { error } = await admin.from('guides').insert({ user_id: user.id, selection_id: null, content });
    if (error) { await refund(); return new Response(error.message, { status: 500 }); }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    await refund();
    return new Response(`OpenAI error: ${e.message}`, { status: 500 });
  }
};
