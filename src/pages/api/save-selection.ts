import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const { profileId, coffees, format } = await request.json();

  if (!coffees || !coffees.length) {
    return new Response('Missing required fields', { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data, error } = await supabase.from('coffee_selections').insert({
    user_id: auth.user.id,
    profile_id: profileId || null,
    coffees,
    format: format || 'mixed',
  }).select().single();

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
