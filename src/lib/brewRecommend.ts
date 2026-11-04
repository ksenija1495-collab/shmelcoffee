/**
 * Рекомендации по заварке: **метод + температура**, дозы — единый стандарт 10 g / 150 ml.
 */
import { DB } from '../data/countries';
import { resolveCountryKey } from './countryResolve';
import { isVarietyBlend, varietyBlendLabel } from './varietyBlend';
import {
  SHMELCO_COFFEE_G,
  SHMELCO_CUP_ML,
  standardRecipeRec,
  type BrewRecipeRec,
} from './brewStandards';
import { pickBrewMethods } from './recommendBrewMethods';

export type { BrewRecipeRec };

export type BrewRecommendation = {
  primary: BrewRecipeRec;
  secondary: BrewRecipeRec;
  why: string;
  avoid: string[];
  countryTip: string;
  headline: string;
};

export type BrewBeanInput = {
  country?: string | null;
  process?: string | null;
  variety?: string | null;
  name?: string | null;
};

function parseAltitudeMid(altitude: string): number | null {
  const nums = altitude.match(/\d{3,4}/g)?.map(Number);
  if (!nums?.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function isDenseVariety(variety?: string | null, name?: string | null): boolean {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  return /sl28|sl34|батиан|batian|гейш|geisha|пакамар|pacamara|бурбон|bourbon/.test(t);
}

function isCatimorFamily(variety?: string | null, name?: string | null): boolean {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  return /катимор|catimor|катуаи|catuai|катурра|caturra/.test(t);
}

export function recommendBrew(input: BrewBeanInput): BrewRecommendation | null {
  const key = resolveCountryKey(input.country, input.name);
  const country = key ? DB[key] : null;
  const dense = isDenseVariety(input.variety, input.name);
  const catimor = isCatimorFamily(input.variety, input.name);
  const blend = isVarietyBlend(input.variety, input.name);
  const alt = country ? parseAltitudeMid(country.altitude) : null;
  const highAlt = alt != null && alt >= 1700;
  const lowAlt = alt != null && alt > 0 && alt < 1400;
  const pk = (input.process || '').toLowerCase();

  let tempPrimary = 92;
  if (highAlt || dense) tempPrimary += 1;
  if (lowAlt || catimor) tempPrimary -= 2;
  if (/натур|natural|анаэроб|anaerobic/.test(pk)) tempPrimary -= 1;
  tempPrimary = Math.min(94, Math.max(88, tempPrimary));

  const tempSecondary = Math.min(94, Math.max(88, tempPrimary - 1));

  const { primaryMethod, secondaryMethod, why: methodWhy, avoid } = pickBrewMethods(input);

  const primary = standardRecipeRec(primaryMethod, tempPrimary);
  const secondary = standardRecipeRec(secondaryMethod, tempSecondary);

  let why = methodWhy;
  why += ` Доза Shmelco: ${SHMELCO_COFFEE_G} g / ${SHMELCO_CUP_ML} ml (1:15) — меняй только температуру и метод, не три цифры сразу.`;

  const countryName = country?.name || input.country || 'это зерно';
  const processLabel = (input.process || '').replace(/\s*\([^)]*\)/, '') || 'обработка не указана';
  const headline = blend
    ? `${countryName} · ${processLabel} · смесь: ${varietyBlendLabel(input.variety)}`
    : `${countryName} · ${processLabel}`;

  if (blend) {
    why += ' Смесь сортов — слушай баланс, не один дескриптор.';
  }

  return {
    primary,
    secondary,
    why,
    avoid,
    countryTip: country?.brew || 'Фильтр: V60, Switch, AeroPress. Одна доза — 10 g / 150 ml.',
    headline,
  };
}

export function formatBrewRecCompact(rec: BrewRecommendation): string {
  const p = rec.primary;
  return `${p.method} · ${p.dose} / ${p.water} · ${p.temp} · помол ${p.grind}`;
}

export function renderBrewRecHtml(rec: BrewRecommendation, opts?: { compact?: boolean }): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const card = (r: BrewRecipeRec) => `
    <div class="brew-rec-card">
      <div class="brew-rec-label">${esc(r.label)} · ${esc(r.method)}</div>
      <div class="brew-rec-params">${esc(r.dose)} · ${esc(r.water)} · ${esc(r.temp)} · помол ${esc(r.grind)}</div>
      <div class="brew-rec-time">${esc(r.time)}</div>
      <div class="brew-rec-note">${esc(r.note)}</div>
    </div>`;
  if (opts?.compact) {
    return `<div class="brew-rec brew-rec-compact">
      <div class="brew-rec-h">☕ Как заварить</div>
      <div class="brew-rec-params">${esc(formatBrewRecCompact(rec))}</div>
      <div class="brew-rec-note">${esc(rec.primary.note)}</div>
    </div>`;
  }
  return `<div class="brew-rec">
    <div class="brew-rec-h">☕ Как заварить</div>
    <div class="brew-rec-sub">${esc(rec.headline)}</div>
    <p class="brew-rec-standard">Стандарт Shmelco: ${SHMELCO_COFFEE_G} g / ${SHMELCO_CUP_ML} ml</p>
    ${card(rec.primary)}
    <p class="brew-rec-alt">Альтернатива: <b>${esc(rec.secondary.method)}</b> — те же граммы и миллилитры, другой контакт с водой.</p>
    <div class="brew-rec-why"><b>Почему:</b> ${esc(rec.why)}</div>
    ${rec.avoid.length ? `<div class="brew-rec-avoid"><b>Не стоит:</b> ${rec.avoid.map(esc).join(' · ')}</div>` : ''}
  </div>`;
}
