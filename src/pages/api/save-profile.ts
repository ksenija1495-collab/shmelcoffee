import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const { answers, profileType, brewMethod, tastes, notes } = await request.json();

  if (!answers || !profileType) {
    return new Response('Missing required fields', { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const payload = {
    answers,
    profile_type: profileType,
    brew_method: brewMethod || null,
    preferred_tastes: tastes || [],
    preferred_notes: notes || [],
  };

  const { data: existing } = await supabase
    .from('taste_profiles')
    .select('id')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let data;
  let error;

  if (existing?.id) {
    ({ data, error } = await supabase
      .from('taste_profiles')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('taste_profiles')
      .insert({ ...payload, user_id: auth.user.id })
      .select()
      .single());
  }

  if (error) return new Response(error.message, { status: 500 });

  // Кредиты не должны блокировать ответ новым пользователям (RPC/таблица могут висеть).
  const isNewProfile = !existing?.id;
  if (isNewProfile) {
    const grant = (async () => {
      const { data: creditRow } = await supabase
        .from('guide_credits')
        .select('balance')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (!creditRow || creditRow.balance === 0) {
        await supabase.rpc('add_guide_credits', { p_user: auth.user.id, p_amount: 1 });
      }
    })();
    try {
      await Promise.race([
        grant,
        new Promise((_, reject) => setTimeout(() => reject(new Error('credits timeout')), 2500)),
      ]);
    } catch {
      /* guide_credits может быть не настроен / медленный — профиль уже сохранён */
    }
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
