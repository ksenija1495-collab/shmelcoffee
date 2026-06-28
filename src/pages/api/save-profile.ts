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
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
