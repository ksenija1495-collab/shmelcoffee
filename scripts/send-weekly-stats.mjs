/**
 * Ручной запуск недельного отчёта (локально или CI).
 * Требует в .env: CRON_SECRET, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * TELEGRAM_BOT_TOKEN, TELEGRAM_METRICS_CHAT_ID
 *
 * Или после деплоя:
 * curl -s "https://shmelcoffee.com/api/cron/weekly-user-stats?secret=YOUR_CRON_SECRET"
 */
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

const base = process.argv[2] || 'https://shmelcoffee.com';
const secret = env.CRON_SECRET;
if (!secret) {
  console.error('CRON_SECRET missing in .env');
  process.exit(1);
}

const dry = process.argv.includes('--dry');
const url = `${base}/api/cron/weekly-user-stats?secret=${encodeURIComponent(secret)}${dry ? '&dry=1' : ''}`;

const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
const text = await res.text();
console.log(res.status, text);
