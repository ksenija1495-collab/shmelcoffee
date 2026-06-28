import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const target = url.searchParams.get('url');
  const name = url.searchParams.get('name') || '';
  const roaster = url.searchParams.get('roaster') || '';
  const source = url.searchParams.get('source') || 'unknown';
  const key = url.searchParams.get('key') || '';

  if (!target) return new Response('missing url', { status: 400 });

  let dest: URL;
  try {
    dest = new URL(target);
  } catch {
    return new Response('invalid url', { status: 400 });
  }
  if (!['http:', 'https:'].includes(dest.protocol)) {
    return new Response('invalid protocol', { status: 400 });
  }

  let userId: string | null = null;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const userClient = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      );
      const { data } = await userClient.auth.getUser(token);
      userId = data.user?.id ?? null;
    } catch {
      /* anonymous click */
    }
  }

  try {
    const admin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    await admin.from('bean_clicks').insert({
      user_id: userId,
      bean_name: name,
      bean_key: key || null,
      roaster,
      target_url: dest.toString(),
      source,
    });
    if (userId) {
      await admin.rpc('log_event', { p_type: 'bean_click', p_user: userId }).catch(() => undefined);
    }
  } catch {
    /* не блокируем переход */
  }

  return new Response(null, {
    status: 302,
    headers: { Location: dest.toString() },
  });
};
