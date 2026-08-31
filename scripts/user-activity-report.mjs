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

const admin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const FLAVOR = {
  fruity: 'Фруктовые',
  floral: 'Цветочные',
  chocolate: 'Шоколадные',
  caramel: 'Карамельные',
  spicy: 'Пряные',
  tropical: 'Тропические',
};

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

async function main() {
  const users = [];
  let page = 1;
  while (page <= 20) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users || []) {
      users.push({
        id: u.id,
        email: u.email || '(без email)',
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
      });
    }
    if ((data?.users || []).length < 200) break;
    page += 1;
  }

  const [profiles, cups, shelf, guides, selections, credits, orders, recipes, clicks] =
    await Promise.all([
      admin.from('taste_profiles').select('user_id, profile_type, preferred_tastes, created_at'),
      admin.from('cups').select('user_id, country, roaster, created_at'),
      admin.from('shelf_items').select('user_id, country, roaster, kind, created_at'),
      admin.from('guides').select('user_id, created_at'),
      admin.from('coffee_selections').select('user_id, status, created_at'),
      admin.from('guide_credits').select('user_id, balance'),
      admin.from('prodamus_orders').select('user_id, created_at'),
      admin.from('saved_brew_recipes').select('user_id'),
      admin.from('bean_clicks').select('user_id'),
    ]);

  const group = (rows) => {
    const m = new Map();
    for (const r of rows || []) {
      if (!m.has(r.user_id)) m.set(r.user_id, []);
      m.get(r.user_id).push(r);
    }
    return m;
  };

  const pmap = group(profiles.data);
  const cmap = group(cups.data);
  const smap = group(shelf.data);
  const gmap = group(guides.data);
  const selmap = group(selections.data);
  const credmap = new Map((credits.data || []).map((c) => [c.user_id, c.balance]));
  const ordmap = group(orders.data);
  const rmap = group(recipes.data);
  const clkmap = group(clicks.data);

  const report = users
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    .map((u) => {
      const ps = pmap.get(u.id) || [];
      const cs = cmap.get(u.id) || [];
      const ss = smap.get(u.id) || [];
      const gs = gmap.get(u.id) || [];
      const sels = selmap.get(u.id) || [];
      const ords = ordmap.get(u.id) || [];
      const recs = rmap.get(u.id) || [];
      const clks = clkmap.get(u.id) || [];

      const cupCountries = uniq(cs.map((c) => c.country));
      const shelfCountries = uniq(ss.map((s) => s.country));
      const opened = uniq([...cupCountries, ...shelfCountries]);
      const quizCountries = uniq(
        ps.flatMap((p) => (p.profile_type || '').split(',').map((s) => s.trim()).filter(Boolean)),
      );
      const flavors = uniq(
        ps.flatMap((p) => (p.preferred_tastes || []).map((f) => FLAVOR[f] || f)),
      );

      const segment =
        cs.length || ss.length ? 'активный' : ps.length ? 'только тест' : 'без теста';

      return {
        email: u.email,
        registered: u.created_at?.slice(0, 10),
        last_sign_in: u.last_sign_in?.slice(0, 10) || '—',
        segment,
        quiz_top_countries: quizCountries.slice(0, 3).join(', ') || '—',
        flavors: flavors.join(', ') || '—',
        cups: cs.length,
        shelf_items: ss.length,
        countries_opened: opened.length,
        countries: opened.join(', ') || '—',
        guides: gs.length,
        guide_credits: credmap.get(u.id) ?? 0,
        paid_orders: ords.length,
        selections: sels.length,
        saved_recipes: recs.length,
        buy_clicks: clks.length,
        last_activity:
          [...cs, ...ss, ...gs, ...ps].map((x) => x.created_at).sort().pop()?.slice(0, 10) || '—',
      };
    });

  process.stdout.write(
    JSON.stringify(
      {
        total: report.length,
        active: report.filter((r) => r.segment === 'активный').length,
        users: report,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
