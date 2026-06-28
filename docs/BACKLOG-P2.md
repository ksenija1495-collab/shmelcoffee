# Shmelcoffee — бэклог P2

> Не в разработке. P0/P1 — в main.

---

## 1. Email-регистрация: брендинг писем

**Проблема:** magic link приходит от Supabase (`noreply@mail.app.supabase.io`) — безлико.

**Варианты (не mutually exclusive):**
| Вариант | Effort | Эффект |
|---------|--------|--------|
| **Google OAuth** как основной CTA | ✅ уже есть | Без писем |
| **Custom SMTP** (Resend / Mailgun) в Supabase Auth | M | `hello@shmelcoffee.com`, HTML-шаблон Shmelco |
| Telegram Login | L | Привычно для RU, но отдельная интеграция |

**Рекомендация:** Resend + шаблон «Войти в Shmelco» с лого и тоном бренда. DNS: SPF/DKIM для домена.

---

## 2. Парсинг обжarщиков (weekly)

**Обжarщики v1:** Welder Catherine, Silky Drum, Fauno, Tasty Coffee (+ Rockets в каталоге).

**Что парсим:** название лота, страна, обработка, цена, URL, наличие.

### Куда писать — самый эффективный вариант

**Supabase `beans_catalog`** + weekly cron. Приложение читает из БД, не из git.

```
┌─────────────┐     cron (Vercel/Railway)      ┌──────────────────┐
│  Scraper    │ ──upsert──────────────────────▶│ beans_catalog    │
│  (4 sites)  │                                │ (Supabase)       │
└─────────────┘                                └────────┬─────────┘
                                                          │
                        quiz / picker / API ◀─────────────┘
```

**Почему так:**
- Не нужен redeploy при обновлении каталога
- Один источник правды для подборок и аналитики
- `COFFEE_DB.ts` остаётся fallback / seed для offline dev
- Минимум инфраструктуры: 1 таблица + 1 cron job + скрипт на Playwright/cheerio

**Альтернатива (хуже):** scraper → PR в git → auto-merge. Больше friction, Vercel rebuild каждую неделю.

**Таблица `beans_catalog`:**
```sql
id, roaster, name, country, processing, format, price, url,
in_stock bool, scraped_at, hash (для diff)
```

**Cron:** воскресенье 06:00 MSK, алерт в Telegram если >30% лотов пропало.

---

## 3. Прочее P2

- [ ] Telegram Login
- [ ] Паспорт: синхронизировать логику «открытых стран» с кабинетом
- [ ] A/B upsell-копирайта после теста
- [ ] Admin-дашборд кликов по обжarщикам (CSV export для переговоров)
- [ ] Автоматический retry Prodamus webhook (UI в кабинете Prodamus)

---

## SQL-миграции для P1 (запустить в Supabase)

1. `supabase/migration-guide-credits.sql`
2. `supabase/migration-bean-clicks.sql`
3. `supabase/migration-community-stats.sql`
