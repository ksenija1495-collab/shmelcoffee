/** Ссылка на оплату Prodamus с привязкой к пользователю (webhook читает customer_extra / order_num). */
export function buildProdamusBuyUrl(
  baseUrl: string,
  user: { id: string; email?: string | null },
): string {
  if (!baseUrl) return '';
  const sep = baseUrl.includes('?') ? '&' : '?';
  const q = new URLSearchParams();
  q.set('order_id', user.id);
  q.set('customer_extra', user.id);
  q.set('customer_email', user.email || '');
  q.set('urlSuccess', 'https://shmelcoffee.com/account?paid=1');
  return baseUrl + sep + q.toString();
}
