import type { SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_USER_DEFINITION =
  'записал чашку в дневник или добавил зерно/оборудование на полку за последние 30 дней';

export const CHURN_DEFINITION =
  'был активен на прошлой неделе (7–14 дней назад), но не активен в последние 7 дней';

export type WeeklyUserStats = {
  generatedAt: string;
  weekLabel: string;
  totalRegistered: number;
  newThisWeek: number;
  newThisWeekPct: number;
  activeLast7Days: number;
  activeLast7DaysPct: number;
  activeLast30Days: number;
  activeLast30DaysPct: number;
  activePrevWeek: number;
  everActive: number;
  quizOnly: number;
  inactiveNeverEngaged: number;
  churnedThisWeek: number;
  churnedThisWeekPct: number;
  activeDefinition: string;
  churnDefinition: string;
};

export function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

type ActivityRow = { user_id: string; created_at: string };

function msDays(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

function inRange(iso: string, from: number, to: number) {
  const t = new Date(iso).getTime();
  return t >= from && t < to;
}

async function listAllAuthUsers(admin: SupabaseClient) {
  const users: { id: string; created_at: string; last_sign_in_at?: string | null }[] = [];
  let page = 1;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users ?? [];
    for (const u of batch) {
      users.push({
        id: u.id,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      });
    }
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

/** Последняя продуктовая активность: чашка, полка, гид. */
function buildLastProductActivity(rows: ActivityRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.user_id || !r.created_at) continue;
    const t = new Date(r.created_at).getTime();
    const prev = map.get(r.user_id) ?? 0;
    if (t > prev) map.set(r.user_id, t);
  }
  return map;
}

function wasActiveInWindow(lastActivity: number | undefined, from: number, to: number) {
  if (!lastActivity) return false;
  return lastActivity >= from && lastActivity < to;
}

export async function computeWeeklyUserStats(admin: SupabaseClient): Promise<WeeklyUserStats> {
  const now = Date.now();
  const weekAgo = now - msDays(7);
  const twoWeeksAgo = now - msDays(14);
  const monthAgo = now - msDays(30);

  const [users, cupsRes, shelfRes, guidesRes, profilesRes] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from('cups').select('user_id, created_at'),
    admin.from('shelf_items').select('user_id, created_at'),
    admin.from('guides').select('user_id, created_at'),
    admin.from('taste_profiles').select('user_id'),
  ]);

  const activityRows: ActivityRow[] = [
    ...((cupsRes.data ?? []) as ActivityRow[]),
    ...((shelfRes.data ?? []) as ActivityRow[]),
    ...((guidesRes.data ?? []) as ActivityRow[]),
  ];
  const lastActivity = buildLastProductActivity(activityRows);
  const profileUsers = new Set((profilesRes.data ?? []).map((p) => p.user_id));

  let newThisWeek = 0;
  let activeLast7Days = 0;
  let activeLast30Days = 0;
  let activePrevWeek = 0;
  let everActive = 0;
  let quizOnly = 0;
  let inactiveNeverEngaged = 0;
  let churnedThisWeek = 0;

  for (const u of users) {
    const reg = new Date(u.created_at).getTime();
    if (reg >= weekAgo) newThisWeek += 1;

    const last = lastActivity.get(u.id);
    const active7 = wasActiveInWindow(last, weekAgo, now + 1);
    const active30 = wasActiveInWindow(last, monthAgo, now + 1);
    const wasActivePrevWeek = wasActiveInWindow(last, twoWeeksAgo, weekAgo);

    if (last) everActive += 1;
    if (active7) activeLast7Days += 1;
    if (active30) activeLast30Days += 1;
    if (wasActivePrevWeek) activePrevWeek += 1;

    if (wasActivePrevWeek && !active7) churnedThisWeek += 1;

    const hasQuiz = profileUsers.has(u.id);
    if (hasQuiz && !last) quizOnly += 1;
    if (!hasQuiz && !last) inactiveNeverEngaged += 1;
  }

  const weekLabel = new Date(now).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });

  return {
    generatedAt: new Date(now).toISOString(),
    weekLabel,
    totalRegistered: users.length,
    newThisWeek,
    newThisWeekPct: pct(newThisWeek, users.length),
    activeLast7Days,
    activeLast7DaysPct: pct(activeLast7Days, users.length),
    activeLast30Days,
    activeLast30DaysPct: pct(activeLast30Days, users.length),
    activePrevWeek,
    everActive,
    quizOnly,
    inactiveNeverEngaged,
    churnedThisWeek,
    churnedThisWeekPct: pct(churnedThisWeek, activePrevWeek),
    activeDefinition: ACTIVE_USER_DEFINITION,
    churnDefinition: CHURN_DEFINITION,
  };
}

export function formatWeeklyUserStatsTelegram(stats: WeeklyUserStats): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = [
    '📊 ShmelCoffee · недельный отчёт',
    `📅 ${esc(stats.weekLabel)} (сб 9:00 МСК)`,
    '',
    `👥 Всего зарегистрировано: <b>${stats.totalRegistered}</b>`,
    `🆕 Новых за 7 дней: <b>${stats.newThisWeek}</b> (<b>${stats.newThisWeekPct}%</b> от всех зарег.)`,
    '',
    `✅ Активных за 7 дней: <b>${stats.activeLast7Days}</b> (<b>${stats.activeLast7DaysPct}%</b> от всех зарег.)`,
    `✅ Активных за 30 дней: <b>${stats.activeLast30Days}</b> (<b>${stats.activeLast30DaysPct}%</b> от всех зарег.)`,
    `<i>Активный = ${esc(stats.activeDefinition)}</i>`,
    '',
    `📉 Отвалились на этой неделе: <b>${stats.churnedThisWeek}</b> (<b>${stats.churnedThisWeekPct}%</b> от активных на прошлой неделе)`,
    `<i>Отвал = ${esc(stats.churnDefinition)}</i>`,
    '',
    '📋 Справочно:',
    `• хоть раз активны в продукте: ${stats.everActive}`,
    `• только квиз, без чашек/полки: ${stats.quizOnly}`,
    `• без квиза и без активности: ${stats.inactiveNeverEngaged}`,
  ];
  return lines.join('\n');
}
