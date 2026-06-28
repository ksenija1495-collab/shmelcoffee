import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

/** Баланс гидов — через service role, т.к. RLS на guide_credits может быть не настроен. */
export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('unauthorized', { status: 401 });

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const userClient = createClient(url, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data: u } = await userClient.auth.getUser(token);
  const user = u?.user;
  if (!user) return new Response('unauthorized', { status: 401 });

  const admin = createClient(url, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin
    .from('guide_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ balance: data?.balance ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
