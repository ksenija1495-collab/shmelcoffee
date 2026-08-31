import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const url = env.PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const pub = createClient(url, anonKey);

async function tableCount(table) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  return error ? { table, error: error.message } : { table, count: count ?? 0 };
}

async function main() {
  const tables = [
    'taste_profiles',
    'coffee_selections',
    'cups',
    'shelf_items',
    'guides',
    'bean_clicks',
    'prodamus_orders',
    'saved_brew_recipes',
    'guide_credits',
    'tasting_notes',
  ];

  const [tableCounts, communityRes, metricsRes, profilesRes, cupsRes, shelfRes, purchasesRes] =
    await Promise.all([
      Promise.all(tables.map(tableCount)),
      pub.rpc('get_community_stats'),
      admin.rpc('get_metrics'),
      admin.from('taste_profiles').select('user_id, profile_type, preferred_tastes, created_at'),
      admin.from('cups').select('user_id, created_at'),
      admin.from('shelf_items').select('user_id, created_at'),
      admin.from('prodamus_orders').select('user_id, status, created_at'),
    ]);

  let registrations = 0;
  const regByMonth = {};
  let page = 1;
  while (page <= 50) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    for (const u of users) {
      registrations += 1;
      if (u.created_at) {
        const m = u.created_at.slice(0, 7);
        regByMonth[m] = (regByMonth[m] ?? 0) + 1;
      }
    }
    if (users.length < 200) break;
    page += 1;
  }

  const profiles = profilesRes.data ?? [];
  const cups = cupsRes.data ?? [];
  const shelf = shelfRes.data ?? [];
  const purchases = purchasesRes.data ?? [];

  const profileUsers = new Set(profiles.map((p) => p.user_id));
  const activeUsers = new Set([...cups.map((c) => c.user_id), ...shelf.map((s) => s.user_id)]);
  const cupUsers = new Set(cups.map((c) => c.user_id));
  const shelfUsers = new Set(shelf.map((s) => s.user_id));
  const paidStatuses = new Set(['paid', 'success', 'completed']);
  const payingUsers = new Set(
    purchases.filter((p) => paidStatuses.has(String(p.status ?? '').toLowerCase())).map((p) => p.user_id),
  );

  const flavorCounts = {};
  const profileTypes = {};
  for (const p of profiles) {
    profileTypes[p.profile_type] = (profileTypes[p.profile_type] ?? 0) + 1;
    for (const f of p.preferred_tastes ?? []) {
      flavorCounts[f] = (flavorCounts[f] ?? 0) + 1;
    }
  }

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  const out = {
    generated_at: new Date().toISOString(),
    funnel: {
      registrations,
      quiz_done: profileUsers.size,
      active_users: activeUsers.size,
      cup_users: cupUsers.size,
      shelf_users: shelfUsers.size,
      paying_users: payingUsers.size,
    },
    conversions_pct: {
      registration_to_quiz: pct(profileUsers.size, registrations),
      registration_to_active: pct(activeUsers.size, registrations),
      active_to_paying: pct(payingUsers.size, activeUsers.size),
    },
    table_counts: Object.fromEntries(tableCounts.map(({ table, count, error }) => [table, error ?? count])),
    registrations_by_month: regByMonth,
    quiz_profile_types: profileTypes,
    quiz_flavors: flavorCounts,
    community_stats: communityRes.error ? { error: communityRes.error.message } : communityRes.data,
    get_metrics_rpc: metricsRes.error ? { error: metricsRes.error.message } : metricsRes.data,
  };

  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
