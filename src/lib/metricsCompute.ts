import type { SupabaseClient } from '@supabase/supabase-js';
import { isMetricsExcluded, metricsExcludeUserIdsFromEnv } from './metricsExclude';

export type ProductMetrics = {
  registrations: number;
  quiz_done: number;
  active: number;
  generated: number;
  guides_total: number;
  purchases: number;
  paying_users: number;
  passport_views: number;
  passport_shares: number;
  excluded_user_ids: string[];
};

async function listAuthUsers(admin: SupabaseClient) {
  const users: { id: string; email?: string | null; created_at?: string }[] = [];
  let page = 1;
  while (page <= 50) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const batch = data?.users || [];
    users.push(
      ...batch.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })),
    );
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function loadExcludedFromDb(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin.from('metrics_excluded_users').select('user_id');
  if (error || !data?.length) return [];
  return data.map((r: { user_id: string }) => r.user_id);
}

export async function resolveMetricsExcludedIds(admin: SupabaseClient): Promise<Set<string>> {
  const fromDb = await loadExcludedFromDb(admin);
  const base = metricsExcludeUserIdsFromEnv();
  return new Set([...base, ...fromDb]);
}

export async function computeProductMetrics(
  admin: SupabaseClient,
  excluded: Set<string>,
): Promise<ProductMetrics> {
  const users = await listAuthUsers(admin);
  const registrations = users.filter((u) => !isMetricsExcluded(u.id, excluded)).length;

  const [profilesRes, cupsRes, shelfRes, guidesRes, eventsRes] = await Promise.all([
    admin.from('taste_profiles').select('user_id'),
    admin.from('cups').select('user_id'),
    admin.from('shelf_items').select('user_id'),
    admin.from('guides').select('user_id'),
    admin.from('events').select('user_id, type'),
  ]);

  const profileUsers = new Set(
    (profilesRes.data || [])
      .filter((r) => !isMetricsExcluded(r.user_id, excluded))
      .map((r) => r.user_id),
  );

  const cupUsers = new Set(
    (cupsRes.data || [])
      .filter((r) => !isMetricsExcluded(r.user_id, excluded))
      .map((r) => r.user_id),
  );
  const shelfUsers = new Set(
    (shelfRes.data || [])
      .filter((r) => !isMetricsExcluded(r.user_id, excluded))
      .map((r) => r.user_id),
  );
  const active = new Set([...cupUsers, ...shelfUsers]);

  const guides = (guidesRes.data || []).filter((r) => !isMetricsExcluded(r.user_id, excluded));
  const guideUsers = new Set(guides.map((r) => r.user_id));

  const events = (eventsRes.data || []).filter((r) => !isMetricsExcluded(r.user_id, excluded));
  const purchases = events.filter((e) => e.type === 'purchase').length;
  const payingUsers = new Set(events.filter((e) => e.type === 'purchase').map((e) => e.user_id));
  const passportViews = events.filter((e) => e.type === 'passport_view').length;
  const passportShares = events.filter((e) => e.type === 'passport_share').length;

  return {
    registrations,
    quiz_done: profileUsers.size,
    active: active.size,
    generated: guideUsers.size,
    guides_total: guides.length,
    purchases,
    paying_users: payingUsers.size,
    passport_views: passportViews,
    passport_shares: passportShares,
    excluded_user_ids: [...excluded],
  };
}

export async function countSinceExcluding(
  admin: SupabaseClient,
  table: string,
  since: string,
  excluded: Set<string>,
): Promise<number> {
  const { data, error } = await admin.from(table).select('user_id, created_at').gte('created_at', since);
  if (error || !data) return 0;
  return data.filter((r) => !isMetricsExcluded(r.user_id, excluded)).length;
}
