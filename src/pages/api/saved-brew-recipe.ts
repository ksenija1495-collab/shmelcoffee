import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';

export const prerender = false;

function adminClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

const MIGRATION_HINT =
  'Таблица saved_brew_recipes не создана. Выполни supabase/FIX-RUN-NOW.sql в Supabase SQL Editor.';

async function tableReady(supabase: ReturnType<typeof adminClient>): Promise<boolean> {
  const { error } = await supabase.from('saved_brew_recipes').select('id').limit(0);
  return !error;
}

function migrationResponse() {
  return new Response(JSON.stringify({ error: MIGRATION_HINT }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const supabase = adminClient();
  if (!(await tableReady(supabase))) return migrationResponse();

  const { data, error } = await supabase
    .from('saved_brew_recipes')
    .select('id,name,brew_method,recipe')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data || []), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const name = String(body.name || '').trim();
  if (!name) return new Response('name required', { status: 400 });
  if (!body.recipe || typeof body.recipe !== 'object') {
    return new Response('recipe required', { status: 400 });
  }

  const supabase = adminClient();
  if (!(await tableReady(supabase))) return migrationResponse();

  const { data, error } = await supabase
    .from('saved_brew_recipes')
    .insert({
      user_id: auth.user.id,
      name,
      brew_method: body.brew_method || null,
      recipe: body.recipe,
    })
    .select('id')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const body = await request.json();
  const id = String(body.id || '').trim();
  const name = String(body.name || '').trim();
  if (!id) return new Response('id required', { status: 400 });
  if (!name) return new Response('name required', { status: 400 });
  if (!body.recipe || typeof body.recipe !== 'object') {
    return new Response('recipe required', { status: 400 });
  }

  const supabase = adminClient();
  if (!(await tableReady(supabase))) return migrationResponse();

  const { data, error } = await supabase
    .from('saved_brew_recipes')
    .update({
      name,
      brew_method: body.brew_method || null,
      recipe: body.recipe,
    })
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select('id')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, url }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;

  const id = String(url.searchParams.get('id') || '').trim();
  if (!id) return new Response('id required', { status: 400 });

  const supabase = adminClient();
  if (!(await tableReady(supabase))) return migrationResponse();

  const { error } = await supabase
    .from('saved_brew_recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
