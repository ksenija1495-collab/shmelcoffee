import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getOpenAI } from '../../lib/openai';
import { DB, countryOrder } from '../../data/countries';
import { resolveCountryKey } from '../../lib/countryResolve';
import { PROCESS_OPTIONS } from '../../data/processing';

export const prerender = false;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_BEANS = 24;

type ParsedBean = {
  name: string;
  variety: string | null;
  roaster: string | null;
  country: string | null;
  process: string | null;
  isBlend: boolean;
  note: string | null;
};

function normalizeProcess(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toLowerCase();
  const hit = PROCESS_OPTIONS.find((p) => {
    const base = p.toLowerCase().replace(/\s*\([^)]*\)/, '');
    return t.includes(base) || base.includes(t) || t.includes(p.toLowerCase());
  });
  if (hit) return hit;
  if (/натур|natural|сух/.test(t)) return 'Натуральная (Natural)';
  if (/хани|honey/.test(t)) return 'Хани (Honey)';
  if (/мыт|washed/.test(t)) return 'Мытая (Washed)';
  if (/анаэроб|anaerobic/.test(t)) return 'Анаэробная';
  if (/лакто|lactic/.test(t)) return 'Лактоферментация (Lactic)';
  if (/carbonic/.test(t)) return 'Carbonic maceration';
  if (/wet.?hull|гилинг|вет/.test(t)) return 'Wet-hulled';
  return raw.trim();
}

function normalizeCountry(raw?: string | null, hint?: string | null): string | null {
  const key = resolveCountryKey(raw, hint);
  if (key && DB[key]) return DB[key].name;
  return raw?.trim() || null;
}

function normalizeBean(b: any): ParsedBean | null {
  const name = String(b?.name || '').trim();
  if (!name) return null;
  const variety = b?.variety ? String(b.variety).trim() : null;
  const isBlend = Boolean(b?.isBlend) || /\/|\+|смес|blend/i.test(variety || '');
  return {
    name,
    variety: variety || null,
    roaster: b?.roaster ? String(b.roaster).trim() : null,
    country: normalizeCountry(b?.country, name),
    process: normalizeProcess(b?.process),
    isBlend,
    note: b?.note ? String(b.note).trim().slice(0, 160) : null,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const userClient = createClient(url, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const { data: u } = await userClient.auth.getUser(token);
  if (!u?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

  if (!import.meta.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'openai_not_configured' }), { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const image = String(body.image || '');
  if (!image.startsWith('data:image/')) {
    return new Response(JSON.stringify({ error: 'need_image_data_url' }), { status: 400 });
  }
  const b64 = image.split(',')[1] || '';
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'image_too_large', maxMb: 5 }), { status: 413 });
  }

  const countries = countryOrder.map((k) => DB[k].name).join(', ');
  const processes = PROCESS_OPTIONS.join('; ');

  const sys = `Ты разбираешь фото списка кофейного зерна (чек, заказ, скриншот корзины, рукописный список, полка).
Верни ТОЛЬКО JSON без markdown:
{
  "beans": [
    {
      "name": "название лота как на пачке/в заказе",
      "variety": "сорт(а) или null",
      "roaster": "обжарщик или null",
      "country": "страна на русском или null",
      "process": "обработка или null",
      "isBlend": true/false,
      "note": "короткая пометка если неуверен или null"
    }
  ]
}
Правила:
- Только зерно (bean), не оборудование и не доставка.
- Максимум ${MAX_BEANS} позиций. Дубликаты схлопни.
- isBlend=true если несколько сортов в одном лоте (через /, +, «смесь»).
- Страну по возможности из списка: ${countries}.
- Обработку нормализуй к одному из: ${processes}.
- Если на фото цены/штуки — игнорируй, бери только зерно.
- Если текста почти нет — beans: [].`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: sys },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Распознай все позиции зерна на этом фото и верни JSON.' },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 2200,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const beans = (Array.isArray(parsed.beans) ? parsed.beans : [])
      .map(normalizeBean)
      .filter(Boolean)
      .slice(0, MAX_BEANS) as ParsedBean[];

    return new Response(JSON.stringify({ ok: true, beans, count: beans.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'parse_failed', message: e?.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
