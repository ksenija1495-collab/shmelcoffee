import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { prodamusSign, prodamusVerify } from '../../lib/prodamusHmac';
import {
  parseProdamusPayload,
  prodamusPaymentFields,
  prodamusSubmitPayload,
} from '../../lib/prodamusParse';

export const prerender = false;

const PAID = ['success', 'paid', 'active', 'succeeded', 'completed'];
const UNIT_PRICE = 99;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async () =>
  new Response('prodamus webhook ok', { status: 200 });

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function resolveUserId(params: Record<string, unknown>): string {
  const buckets = [prodamusPaymentFields(params), params];
  for (const src of buckets) {
    for (const key of ['customer_extra', 'order_num']) {
      const val = str(src[key]);
      if (UUID_RE.test(val)) return val;
    }
  }
  return '';
}

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const normalized = email.toLowerCase();
  let page = 1;
  while (page <= 20) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users || [];
    const match = users.find((u) => (u.email || '').toLowerCase() === normalized);
    if (match) return match.id;
    if (users.length < 200) break;
    page += 1;
  }
  return '';
}

function verifyProdamusRequest(
  params: Record<string, unknown>,
  secret: string,
  receivedSign: string,
  querySecret: string | null,
): boolean {
  if (receivedSign) {
    const signPayload = prodamusSubmitPayload(params);
    delete signPayload.sign;
    delete signPayload.signature;
    return prodamusVerify(signPayload, secret, receivedSign);
  }
  // Ручной ping / старый URL с ?secret= (Prodamus в notify его не добавляет)
  return Boolean(querySecret && querySecret === secret);
}

export const POST: APIRoute = async ({ request, url }) => {
  const secret = import.meta.env.PRODAMUS_SECRET;
  if (!secret) {
    console.error('[prodamus-webhook] PRODAMUS_SECRET missing');
    return new Response('misconfigured', { status: 500 });
  }

  const contentType = request.headers.get('content-type') || '';
  const raw = await request.text();
  const params = parseProdamusPayload(raw, contentType);
  const payment = prodamusPaymentFields(params);

  const receivedSign =
    request.headers.get('Sign') ||
    request.headers.get('sign') ||
    str(params.sign || params.signature);

  if (!verifyProdamusRequest(params, secret, receivedSign, url.searchParams.get('secret'))) {
    console.warn('[prodamus-webhook] forbidden', {
      hasSign: Boolean(receivedSign),
      hasSubmit: Boolean(params.submit),
      keys: Object.keys(params).slice(0, 8),
    });
    return new Response('forbidden', { status: 403 });
  }

  const status = str(payment.payment_status || payment.status).toLowerCase();
  if (!PAID.includes(status)) return new Response('ignored', { status: 200 });

  const prodamusOrderId = str(payment.order_id);
  const email = str(payment.customer_email || payment.email || params.customer_email);
  const sum =
    parseFloat(str(payment.sum || payment.order_sum || payment.amount) || String(UNIT_PRICE)) ||
    UNIT_PRICE;
  const credits = Math.max(1, Math.round(sum / UNIT_PRICE));

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let uid = resolveUserId(params);
  if (!uid && email) {
    try {
      uid = await findUserByEmail(supabase, email);
    } catch {
      /* ignore */
    }
  }
  if (!uid) {
    console.warn('[prodamus-webhook] user_not_found', { prodamusOrderId, email });
    return new Response('user_not_found', { status: 200 });
  }

  if (prodamusOrderId) {
    const { data: existing, error: existErr } = await supabase
      .from('prodamus_orders')
      .select('order_id')
      .eq('order_id', prodamusOrderId)
      .maybeSingle();
    if (existErr?.code === 'PGRST205') {
      console.warn('[prodamus-webhook] prodamus_orders table missing — run supabase/RUN-IN-SQL-EDITOR.sql');
    } else if (existing) {
      return new Response('already_processed', { status: 200 });
    }
  }

  const { error } = await supabase.rpc('add_guide_credits', { p_user: uid, p_amount: credits });
  if (error) {
    console.error('[prodamus-webhook] add_guide_credits failed', error.message, {
      prodamusOrderId,
      uid,
    });
    return new Response(error.message, { status: 500 });
  }

  if (prodamusOrderId) {
    const { error: orderErr } = await supabase
      .from('prodamus_orders')
      .insert({ order_id: prodamusOrderId, user_id: uid, credits });
    if (orderErr) {
      if (orderErr.code === 'PGRST205') {
        console.warn('[prodamus-webhook] credits granted but order not logged (no table)');
      } else {
        console.error('[prodamus-webhook] prodamus_orders insert failed', orderErr.message);
        await supabase.rpc('add_guide_credits', { p_user: uid, p_amount: -credits });
        return new Response('order_log_failed', { status: 500 });
      }
    }
  }

  try {
    for (let i = 0; i < credits; i++) {
      await supabase.rpc('log_event', { p_type: 'purchase', p_user: uid });
    }
  } catch {
    /* не критично */
  }

  console.info('[prodamus-webhook] ok', { prodamusOrderId, uid, credits, email });
  return new Response('ok', { status: 200 });
};
