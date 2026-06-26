import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  // Поддерживаем массивы (мульти-выбор) и старый одиночный формат
  const beans: any[] = Array.isArray(body.beans) ? body.beans : (body.bean ? [body.bean] : []);
  const methods: string[] = Array.isArray(body.methods) ? body.methods : (body.method ? [String(body.method)] : []);
  const cleanBeans = beans.filter((b) => b && b.name).slice(0, 6);
  const cleanMethods = methods.map((m) => String(m).trim()).filter(Boolean).slice(0, 3);
  if (!cleanBeans.length) return new Response('Missing bean(s)', { status: 400 });

  const url = import.meta.env.PUBLIC_SUPABASE_URL;

  const userClient = createClient(url, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data: u } = await userClient.auth.getUser(token);
  const user = u?.user;
  if (!user) return new Response('unauthorized', { status: 401 });

  const admin = createClient(url, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

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

  const beansList = cleanBeans
    .map((b, i) => `${i + 1}. ${b.name}${b.roaster ? `, обжарщик ${b.roaster}` : ''}${b.country ? `, страна ${b.country}` : ''}${b.process ? `, обработка ${b.process}` : ''}`)
    .join('\n');
  const methodsText = cleanMethods.length ? cleanMethods.join(', ') : 'способ на выбор пользователя';

  const prompt = `Ты — эксперт SCA из Shmelco Coffee Guide. Пользователь выбрал зёрна и способы заваривания, чтобы заваривать и сравнивать. Составь персональный гид под его вкус.\n\n${profileContext}\n\nЗёрна (${cleanBeans.length}):\n${beansList}\n\nСпособы заваривания (${cleanMethods.length || 1}): ${methodsText}\n\nНапиши гид в формате HTML (без обёрток <html>, только контент: <h2>, <h3>, <p>, <ul>):\n1. Коротко по каждому зерну: чего ожидать (вкус, аромат, тело) с учётом страны и обработки.\n2. По каждому выбранному способу — точный рецепт: помол, пропорция (ratio в граммах и мл), температура воды, время, по шагам.\n3. Какое зерно на каком способе раскрывается лучше и почему. Если зёрен и способов несколько — дай рекомендации по парам «зерно + способ».\n4. План сравнительной дегустации: в каком порядке пробовать (от лёгкого к плотному), на что обращать внимание, как фиксировать различия.\n5. Если вышло слишком кисло или слишком горько — что менять (помол, температура, время).\nПиши по-русски, тепло, как друг, который шарит в кофе. Без менторства.`;

  const maxTok = Math.min(3500, 1100 + cleanBeans.length * 330 + Math.max(cleanMethods.length, 1) * 220);

  try {
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTok,
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
