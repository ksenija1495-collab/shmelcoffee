import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const PAID = ['success', 'paid', 'active', 'succeeded', 'completed'];
const UNIT_PRICE = 99; // ₽ за 1 гид; пакеты кратны 99 → N кредитов
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async () =>
  new Response('prodamus webhook ok', { status: 200 });

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function parsePayload(raw: string, contentType: string): Record<string, unknown> {
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const flat: Record<string, unknown> = {};
  new URLSearchParams(raw).forEach((v, k) => {
    flat[k] = v;
  });
  return flat;
}

/** Prodamus: order_id в webhook — их ID; наш UUID — в order_num или customer_extra. */
function resolveUserId(params: Record<string, unknown>): string {
  for (const key of ['order_num', 'customer_extra', 'order_id']) {
    const val = str(params[key]);
    if (UUID_RE.test(val)) return val;
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

export const POST: APIRoute = async ({ request, url }) => {
  const secret = import.meta.env.PRODAMUS_SECRET;
  const provided = url.searchParams.get('secret');
  if (!secret || provided !== secret) return new Response('forbidden', { status: 403 });

  const contentType = request.headers.get('content-type') || '';
  const raw = await request.text();
  const params = parsePayload(raw, contentType);

  const status = str(params.payment_status || params.status).toLowerCase();
  if (!PAID.includes(status)) return new Response('ignored', { status: 200 });

  const prodamusOrderId = str(params.order_id);
  const email = str(params.customer_email || params.email);
  const sum =
    parseFloat(str(params.sum || params.order_sum || params.amount) || String(UNIT_PRICE)) ||
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
    const { data: existing } = await supabase
      .from('prodamus_orders')
      .select('order_id')
      .eq('order_id', prodamusOrderId)
      .maybeSingle();
    if (existing) return new Response('already_processed', { status: 200 });
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
    await supabase
      .from('prodamus_orders')
      .insert({ order_id: prodamusOrderId, user_id: uid, credits })
      .then(() => undefined, () => undefined);
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
