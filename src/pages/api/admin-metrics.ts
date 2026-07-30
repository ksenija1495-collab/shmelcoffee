import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';

export const prerender = false;

const OWNER = (import.meta.env.METRICS_OWNER_EMAIL as string) || 'ksenija14.95@gmail.com';

function mskDayStartISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return new Date(`${y}-${m}-${d}T00:00:00+03:00`).toISOString();
}

function mskDateLabel(): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

async function countSince(
  admin: ReturnType<typeof createClient>,
  table: string,
  since: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);
  if (error) return 0;
  return count || 0;
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;
  if ((auth.user.email || '').toLowerCase() !== OWNER.toLowerCase()) {
    return new Response('forbidden', { status: 403 });
  }

  const since = mskDayStartISO();
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const admin = createClient(url, import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

  const [metricsRes, profiles, selections, cups, shelf, clicks, guides, purchases] =
    await Promise.all([
      admin.rpc('get_metrics'),
      countSince(admin, 'taste_profiles', since),
      countSince(admin, 'coffee_selections', since),
      countSince(admin, 'cups', since),
      countSince(admin, 'shelf_items', since),
      countSince(admin, 'bean_clicks', since),
      countSince(admin, 'guides', since),
      countSince(admin, 'prodamus_orders', since),
    ]);

  let registrationsToday = 0;
  const registrationEmails: string[] = [];
  let page = 1;
  while (page <= 20) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users || [];
    for (const u of users) {
      if (u.created_at && u.created_at >= since) {
        registrationsToday += 1;
        if (u.email) registrationEmails.push(u.email);
      }
    }
    if (users.length < 200) break;
    page += 1;
  }

  const [{ data: profileRows }, { data: cupRows }, { data: shelfRows }] = await Promise.all([
    admin.from('taste_profiles').select('user_id'),
    admin.from('cups').select('user_id'),
    admin.from('shelf_items').select('user_id'),
  ]);
  const activeIds = new Set([
    ...(cupRows || []).map((r: { user_id: string }) => r.user_id),
    ...(shelfRows || []).map((r: { user_id: string }) => r.user_id),
  ]);
  const profileIds = [...new Set((profileRows || []).map((r: { user_id: string }) => r.user_id))];
  const inactiveIds = profileIds.filter((id) => !activeIds.has(id));

  const inactive_users: { email: string; name?: string }[] = [];
  if (inactiveIds.length) {
    let uPage = 1;
    while (uPage <= 20 && inactive_users.length < 30) {
      const { data } = await admin.auth.admin.listUsers({ page: uPage, perPage: 200 });
      const users = data?.users || [];
      for (const u of users) {
        if (u.id && inactiveIds.includes(u.id) && u.email) {
          inactive_users.push({
            email: u.email,
            name: (u.user_metadata?.full_name || u.user_metadata?.name || '') as string,
          });
        }
      }
      if (users.length < 200) break;
      uPage += 1;
    }
  }

  const body = {
    totals: metricsRes.data || {},
    inactive_users,
    today: {
      date_label: mskDateLabel(),
      registrations: registrationsToday,
      registration_emails: registrationEmails,
      profiles,
      selections,
      cups,
      shelf_items: shelf,
      bean_clicks: clicks,
      guides,
      purchases,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
