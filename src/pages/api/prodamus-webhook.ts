import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const PAID = ['success', 'paid', 'active', 'succeeded', 'completed'];
const UNIT_PRICE = 99; // ₽ за 1 гид; пакеты кратны 99 → N кредитов

export const GET: APIRoute = async () =>
  new Response('prodamus webhook ok', { status: 200 });

export const POST: APIRoute = async ({ request, url }) => {
  const secret = import.meta.env.PRODAMUS_SECRET;
  const provided = url.searchParams.get('secret');
  if (!secret || provided !== secret) return new Response('forbidden', { status: 403 });

  const ct = request.headers.get('content-type') || '';
  const raw = await request.text();
  const params: Record<string, string> = {};
  if (ct.includes('application/json')) {
    try { Object.assign(params, JSON.parse(raw)); } catch { /* ignore */ }
  } else {
    new URLSearchParams(raw).forEach((v, k) => { params[k] = v; });
  }

  const status = (params['payment_status'] || params['status'] || '').toLowerCase();
  if (!PAID.includes(status)) return new Response('ignored', { status: 200 });

  const orderId = params['order_id'] || params['order_num'] || params['_param_uid'] || params['customer_extra'] || '';
  const email = params['customer_email'] || params['email'] || '';
  const sum = parseFloat(params['sum'] || params['order_sum'] || params['amount'] || String(UNIT_PRICE)) || UNIT_PRICE;
  const credits = Math.max(1, Math.round(sum / UNIT_PRICE));

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let uid = '';
  if (orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    uid = orderId;
  }
  if (!uid && email) {
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const u = (data?.users || []).find((x: any) => (x.email || '').toLowerCase() === email.toLowerCase());
      if (u) uid = u.id;
    } catch { /* ignore */ }
  }
  if (!uid) return new Response('user_not_found', { status: 200 });

  const { error } = await supabase.rpc('add_guide_credits', { p_user: uid, p_amount: credits });
  if (error) return new Response(error.message, { status: 500 });

  // аналитика: фиксируем покупку (по событию на каждый купленный кредит)
  try {
    for (let i = 0; i < credits; i++) {
      await supabase.rpc('log_event', { p_type: 'purchase', p_user: uid });
    }
  } catch { /* не критично */ }

  return new Response('ok', { status: 200 });
};
