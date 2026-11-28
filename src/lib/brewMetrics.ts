import { normalizeRecipe, type BrewRecipe } from './cupRecipe';
import { waterProfileLabel } from '../data/waterProfiles';

export type BrewMetricsLine = {
  key: string;
  label: string;
  value: string;
  tier: 'high' | 'research';
};

export function brewRatioText(coffeeG?: number | null, waterG?: number | null): string | null {
  if (!coffeeG || !waterG || coffeeG <= 0 || waterG <= 0) return null;
  const r = waterG / coffeeG;
  const rounded = Math.round(r * 10) / 10;
  return `1:${rounded} (${coffeeG} г · ${waterG} г)`;
}

/** TDS в % (например 1.35). EY % = TDS * beverage_g / coffee_g */
export function computeExtractionYield(
  tdsPercent: number | null | undefined,
  beverageG: number | null | undefined,
  coffeeG: number | null | undefined,
): number | null {
  if (tdsPercent == null || beverageG == null || coffeeG == null) return null;
  if (!Number.isFinite(tdsPercent) || !Number.isFinite(beverageG) || !Number.isFinite(coffeeG)) return null;
  if (coffeeG <= 0 || beverageG <= 0 || tdsPercent <= 0) return null;
  const ey = (tdsPercent * beverageG) / coffeeG;
  return Math.round(ey * 10) / 10;
}

export function daysSinceRoast(roastDateIso: string | null | undefined, at = new Date()): number | null {
  if (!roastDateIso) return null;
  const roast = new Date(roastDateIso);
  if (Number.isNaN(roast.getTime())) return null;
  const d = Math.floor((at.getTime() - roast.getTime()) / 86400000);
  return d >= 0 ? d : null;
}

function parseTds(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMass(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function enrichRecipeMetrics(raw: BrewRecipe | Record<string, unknown>): BrewRecipe {
  const base = normalizeRecipe(raw) || (typeof raw === 'object' ? ({ ...raw } as BrewRecipe) : {});
  const tds = parseTds((raw as BrewRecipe).tds ?? (base as BrewRecipe).tds);
  const beverage_g = parseMass((raw as BrewRecipe).beverage_g ?? (base as BrewRecipe).beverage_g);
  const coffee_g = base.coffee_g ?? parseMass((raw as BrewRecipe).coffee_g);
  const ey = computeExtractionYield(tds, beverage_g, coffee_g);
  const out: BrewRecipe = { ...base };
  if (tds != null) out.tds = tds;
  if (beverage_g != null) out.beverage_g = beverage_g;
  if (ey != null) out.extraction_yield = ey;
  return out;
}

export function brewMetricsLines(
  recipe: unknown,
  opts?: { cupCreatedAt?: string | null },
): BrewMetricsLine[] {
  const r = normalizeRecipe(recipe);
  if (!r) return [];
  const lines: BrewMetricsLine[] = [];

  const ratio = brewRatioText(r.coffee_g, r.water_g);
  if (ratio) lines.push({ key: 'ratio', label: 'Соотношение', value: ratio, tier: 'high' });

  const time = r.time?.trim() || r.brew_time_total?.trim();
  if (time) lines.push({ key: 'time', label: 'Общее время заваривания', value: time, tier: 'high' });

  const roastDate = r.roast_date?.trim();
  if (roastDate) {
    const at = opts?.cupCreatedAt ? new Date(opts.cupCreatedAt) : new Date();
    const days = daysSinceRoast(roastDate, at);
    const val = days != null ? `${days} дн. · обжарка ${roastDate}` : roastDate;
    lines.push({ key: 'roast', label: 'Дней после обжарки', value: val, tier: 'high' });
  } else if (r.days_since_roast != null && r.days_since_roast >= 0) {
    lines.push({
      key: 'roast',
      label: 'Дней после обжарки',
      value: `${r.days_since_roast} дн.`,
      tier: 'high',
    });
  }

  if (r.beverage_g) {
    lines.push({
      key: 'bev',
      label: 'Масса напитка',
      value: `${r.beverage_g} г`,
      tier: 'research',
    });
  }
  if (r.tds != null) {
    lines.push({ key: 'tds', label: 'TDS', value: `${r.tds}%`, tier: 'research' });
  }
  const ey =
    r.extraction_yield ??
    computeExtractionYield(r.tds ?? null, r.beverage_g ?? null, r.coffee_g ?? null);
  if (ey != null) {
    lines.push({ key: 'ey', label: 'EY · выход экстракции', value: `${ey}%`, tier: 'research' });
  }
  const wp = waterProfileLabel(r.water_profile);
  if (wp) lines.push({ key: 'water', label: 'Вода', value: wp, tier: 'research' });

  return lines;
}

export function brewMetricsSummary(recipe: unknown): string {
  return brewMetricsLines(recipe)
    .filter((l) => l.tier === 'high')
    .map((l) => `${l.label}: ${l.value}`)
    .join(' · ');
}