import { parseBrewTimeInput } from './brewTime';

/** mlMode: add = +N мл в этот пролив; to = долить «до» N мл на весах (кумулятив). */
export type BrewPour = {
  ml?: number | null;
  time?: string | null;
  mlMode?: 'add' | 'to';
  role?: 'pour' | 'bypass';
};

export function pourHasData(p: BrewPour | null | undefined): boolean {
  if (!p) return false;
  return (p.ml != null && p.ml > 0) || Boolean(p.time?.trim());
}

export function normalizePour(raw: unknown): BrewPour | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    return decodePourToken(s);
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const mlRaw = o.ml;
    const ml =
      mlRaw != null && mlRaw !== ''
        ? Number(typeof mlRaw === 'string' ? mlRaw.replace(',', '.') : mlRaw)
        : null;
    const timeRaw = o.time != null && o.time !== '' ? String(o.time) : null;
    const time = timeRaw ? parseBrewTimeInput(timeRaw) || timeRaw : null;
    const mlMode = o.mlMode === 'to' || o.to === true ? 'to' : 'add';
    const role = o.role === 'bypass' || o.bypass === true ? 'bypass' : 'pour';
    if ((!ml || !Number.isFinite(ml) || ml <= 0) && !time) return null;
    const out: BrewPour = {
      ml: ml && Number.isFinite(ml) && ml > 0 ? ml : null,
      time,
    };
    if (mlMode === 'to') out.mlMode = 'to';
    if (role === 'bypass') out.role = 'bypass';
    return out;
  }
  return null;
}

export function formatPourValue(p: BrewPour | null | undefined): string {
  if (!p) return '';
  const parts: string[] = [];
  if (p.role === 'bypass') parts.push('байпас');
  if (p.ml != null && p.ml > 0) {
    parts.push(p.mlMode === 'to' ? `до ${p.ml} мл` : `${p.ml} мл`);
  }
  if (p.time) parts.push(p.time);
  return parts.join(' · ');
}

/** URL/query token. Flags after | : to, bypass. Example: 150@0:45|to or 50@|bypass */
export function encodePourToken(p: BrewPour): string {
  const ml = p.ml != null && p.ml > 0 ? String(p.ml) : '';
  const time = p.time?.trim() || '';
  let base = '';
  if (ml && time) base = `${ml}@${time}`;
  else if (time) base = time;
  else if (ml) base = `${ml}@`;
  else return '';
  const flags: string[] = [];
  if (p.mlMode === 'to') flags.push('to');
  if (p.role === 'bypass') flags.push('bypass');
  return flags.length ? `${base}|${flags.join('|')}` : base;
}

function decodePourHead(headRaw: string): BrewPour {
  let head = headRaw.trim();
  const legacy: Pick<BrewPour, 'mlMode' | 'role'> = {};
  if (head.startsWith('~')) {
    legacy.mlMode = 'to';
    head = head.slice(1);
  }
  if (/^b:/i.test(head)) {
    legacy.role = 'bypass';
    head = head.slice(2);
  }

  let pour: BrewPour = {};
  if (head.includes('@')) {
    const [mlPart, timePart] = head.split('@');
    const ml = mlPart ? parseFloat(mlPart.replace(',', '.')) : null;
    const time = timePart ? parseBrewTimeInput(timePart) || timePart : null;
    pour = {
      ml: ml != null && Number.isFinite(ml) && ml > 0 ? ml : null,
      time,
    };
  } else if (/^\d+([.,]\d+)?$/.test(head)) {
    const ml = parseFloat(head.replace(',', '.'));
    pour = Number.isFinite(ml) && ml > 0 ? { ml } : {};
  } else if (head) {
    pour = { time: parseBrewTimeInput(head) || head };
  }
  return { ...pour, ...legacy };
}

export function decodePourToken(s: string): BrewPour {
  const t = s.trim();
  if (!t) return {};
  const [head, ...flagParts] = t.split('|');
  const flags = new Set(flagParts.map((f) => f.trim().toLowerCase()).filter(Boolean));
  const pour = decodePourHead(head);
  if (flags.has('to')) pour.mlMode = 'to';
  if (flags.has('bypass')) pour.role = 'bypass';
  return pour;
}

export function decodePoursParam(raw: string): BrewPour[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(decodePourToken)
    .filter(pourHasData);
}

export function pourRowLabel(indexAmongPours: number, p?: BrewPour | null): string {
  if (p?.role === 'bypass') return 'Байпас';
  return `${indexAmongPours}-й пролив`;
}
