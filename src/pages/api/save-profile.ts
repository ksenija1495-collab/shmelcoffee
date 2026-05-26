import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const { userId, answers, profileType, brewMethod, tastes, notes } = await request.json();

  if (!userId || !answers || !profileType) {
    return new Response('Missing required fields', { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.from('taste_profiles').insert({
    user_id: userId,
    answers,
    profile_type: profileType,
    brew_method: brewMethod || null,
    preferred_tastes: tastes || [],
    preferred_notes: notes || [],
  }).select().single();

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};
