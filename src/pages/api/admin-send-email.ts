import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../lib/requireAuth';
import { reactivationEmailHtml } from '../../lib/emailTemplates/reactivation';

export const prerender = false;

const OWNER = (import.meta.env.METRICS_OWNER_EMAIL as string) || 'ksenija14.95@gmail.com';

export const POST: APIRoute = async ({ request }) => {
  const auth = await getAuthUser(request);
  if ('error' in auth) return auth.error;
  if ((auth.user.email || '').toLowerCase() !== OWNER.toLowerCase()) {
    return new Response('forbidden', { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const to = String(body.to || '').trim();
  const template = String(body.template || 'reactivation');
  if (!to) return new Response('to required', { status: 400 });

  const vars = {
    name: body.name ? String(body.name) : undefined,
    topCountry: body.topCountry ? String(body.topCountry) : undefined,
    topCountryFlag: body.topCountryFlag ? String(body.topCountryFlag) : undefined,
    ctaUrl: body.ctaUrl ? String(body.ctaUrl) : undefined,
  };

  const html =
    template === 'reactivation'
      ? reactivationEmailHtml(vars)
      : reactivationEmailHtml(vars);

  const subject =
    template === 'reactivation'
      ? `${vars.topCountryFlag || '☕'} Открой первую страну на карте кофе`
      : 'Shmelco Coffee';

  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey) {
    return new Response(
      JSON.stringify({ ok: false, preview: true, subject, html }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: import.meta.env.RESEND_FROM || 'Shmelco <hello@shmelcoffee.com>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  const data = await res.json();
  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
