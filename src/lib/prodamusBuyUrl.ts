/** Ссылка на оплату Prodamus с привязкой к пользователю (webhook читает order_num / customer_extra). */
export function buildProdamusBuyUrl(
  baseUrl: string,
  user: { id: string; email?: string | null },
  successOrigin?: string,
): string {
  if (!baseUrl) return '';
  const origin = successOrigin || import.meta.env.SITE || 'https://shmelcoffee.com';
  const base = origin.replace(/\/$/, '');
  const sep = baseUrl.includes('?') ? '&' : '?';
  const q = new URLSearchParams();
  // order_id — уникальный заказ магазина; order_num — стабильный id пользователя для webhook
  q.set('order_id', crypto.randomUUID());
  q.set('order_num', user.id);
  q.set('customer_extra', user.id);
  if (user.email) q.set('customer_email', user.email);
  q.set('urlSuccess', `${base}/account?paid=1`);
  q.set('urlReturn', `${base}/account`);
  return baseUrl + sep + q.toString();
}

/** Оплата подписки AI-ассистента на полке. */
export function buildProdamusShelfAssistUrl(
  baseUrl: string,
  user: { id: string; email?: string | null },
  successOrigin?: string,
): string {
  if (!baseUrl) return '';
  const origin = successOrigin || import.meta.env.SITE || 'https://shmelcoffee.com';
  const base = origin.replace(/\/$/, '');
  const sep = baseUrl.includes('?') ? '&' : '?';
  const q = new URLSearchParams();
  q.set('order_id', crypto.randomUUID());
  q.set('order_num', user.id);
  q.set('customer_extra', user.id);
  if (user.email) q.set('customer_email', user.email);
  q.set('urlSuccess', `${base}/account?tab=shelf&assist=1`);
  q.set('urlReturn', `${base}/account?tab=shelf`);
  q.set('products[0][name]', 'Shmelco AI-ассистент на полке');
  return baseUrl + sep + q.toString();
}
