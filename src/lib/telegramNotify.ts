/** Отправка сообщений в Telegram Bot API. */
export async function sendTelegramMessage(
  text: string,
  opts?: { parseMode?: 'Markdown' | 'HTML'; disablePreview?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const token = import.meta.env.TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.TELEGRAM_METRICS_CHAT_ID;

  if (!token || !chatId) {
    return { ok: false, error: 'missing_telegram_env' };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: opts?.parseMode ?? 'HTML',
      disable_web_page_preview: opts?.disablePreview ?? true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body.slice(0, 500) };
  }

  return { ok: true };
}
