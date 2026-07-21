import { parseBrewTimeInput } from './brewTime';

export type BrewPour = {
  ml?: number | null;
  time?: string | null;
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
    if ((!ml || !Number.isFinite(ml) || ml <= 0) && !time) return null;
    return {
      ml: ml && Number.isFinite(ml) && ml > 0 ? ml : null,
      time,
    };
  }
  return null;
}

export function formatPourValue(p: BrewPour | null | undefined): string {
  if (!p) return '';
  const parts: string[] = [];
  if (p.ml != null && p.ml > 0) parts.push(`${p.ml} мл`);
  if (p.time) parts.push(p.time);
  return parts.join(' · ');
}

export function encodePourToken(p: BrewPour): string {
  const ml = p.ml != null && p.ml > 0 ? String(p.ml) : '';
  const time = p.time?.trim() || '';
  if (ml && time) return `${ml}@${time}`;
  if (time) return time;
  if (ml) return `${ml}@`;
  return '';
}

export function decodePourToken(s: string): BrewPour {
  const t = s.trim();
  if (!t) return {};
  if (t.includes('@')) {
    const [mlPart, timePart] = t.split('@');
    const ml = mlPart ? parseFloat(mlPart.replace(',', '.')) : null;
    const time = timePart ? parseBrewTimeInput(timePart) || timePart : null;
    return {
      ml: ml != null && Number.isFinite(ml) && ml > 0 ? ml : null,
      time,
    };
  }
  if (/^\d+([.,]\d+)?$/.test(t)) {
    const ml = parseFloat(t.replace(',', '.'));
    return Number.isFinite(ml) && ml > 0 ? { ml } : {};
  }
  return { time: parseBrewTimeInput(t) || t };
}

export function decodePoursParam(raw: string): BrewPour[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(decodePourToken)
    .filter(pourHasData);
}
