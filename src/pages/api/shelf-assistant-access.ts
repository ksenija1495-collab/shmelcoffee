import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';
import { getShelfAssistantAccess } from '../../lib/shelfAssistantAccess';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const admin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const access = await getShelfAssistantAccess(admin, auth.user.id);

  return new Response(
    JSON.stringify({
      hasAccess: access.hasAccess,
      source: access.source,
      activeUntil: access.activeUntil,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
