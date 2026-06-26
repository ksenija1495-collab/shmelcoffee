import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
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
  const methodsText = cleanMethods.length ? cleanMethods.join(', ') : 'V60';
  const planDays = Math.min(10, Math.max(7, cleanBeans.length * Math.max(cleanMethods.length, 1)));

  const sys = 'Ты — эксперт SCA из Shmelco Coffee Guide. Отвечай ТОЛЬКО валидным JSON по заданной схеме, без markdown и пояснений. Пиши по-русски, тепло и по делу, как друг, который шарит в кофе.';

  const prompt = `${profileContext}

Зёрна (${cleanBeans.length}):
${beansList}

Способы заваривания (${cleanMethods.length || 1}): ${methodsText}

Составь персональный гид по дегустации и план на ${planDays} дней (комбинируй зёрна и способы по дням, от лёгкого к плотному).

Верни JSON строго по схеме:
{
  "title": "короткий заголовок гида",
  "beans": [
    {
      "name": "название зерна (как дано)",
      "roaster": "обжарщик или пусто",
      "country": "страна (как дано у зерна, на русском)",
      "family": "одна вкусовая семья из: fruity, floral, chocolate, caramel, spicy, tropical",
      "tags": ["2-4 короткие вкусовые ноты, напр. цитрус, ягоды, мёд"],
      "expect": "2-3 предложения: вкус, аромат, тело с учётом страны и обработки"
    }
  ],
  "methods": [
    {
      "name": "точное название способа из списка выше",
      "grind": "помол",
      "ratio": "пропорция, напр. 15 г / 250 мл",
      "temp": "температура воды, напр. 92-94°C",
      "time": "общее время",
      "steps": ["шаг 1", "шаг 2", "..."],
      "perBean": [{ "bean": "название зерна", "tip": "как подстроить этот способ под это зерно" }]
    }
  ],
  "weekPlan": [
    { "day": "День 1", "bean": "название зерна", "method": "способ", "focus": "на что обратить внимание в этот день" }
  ],
  "nextTips": ["совет что попробовать дальше 1", "совет 2", "совет 3"]
}

Требования: family выбери ближайшую; methods.name — ровно из списка способов; в weekPlan ${planDays} дней; nextTips — ровно 2-3 пункта простым списком.`;

  const maxTok = Math.min(4000, 1500 + cleanBeans.length * 320 + Math.max(cleanMethods.length, 1) * 320 + planDays * 60);

  try {
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
      max_tokens: maxTok,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content || '{}';
    let content = raw;
    try { content = JSON.stringify(JSON.parse(raw)); } catch { /* keep raw */ }

    const { error } = await admin.from('guides').insert({ user_id: user.id, selection_id: null, content });
    if (error) { await refund(); return new Response(error.message, { status: 500 }); }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    await refund();
    return new Response(`OpenAI error: ${e.message}`, { status: 500 });
  }
};
