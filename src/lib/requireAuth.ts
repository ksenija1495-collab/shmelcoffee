import type { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

export async function getAuthUser(
  request: Request,
): Promise<{ user: User } | { error: Response }> {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: new Response('unauthorized', { status: 401 }) };
  }

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const client = createClient(url, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data } = await client.auth.getUser(token);
  if (!data.user) {
    return { error: new Response('unauthorized', { status: 401 }) };
  }

  return { user: data.user };
}

export function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
