import { DB } from '../data/countries';
import { resolveCountryKey } from './countryResolve';

export type CountryCardData = {
  key: string;
  name: string;
  flag: string;
  region: string;
  flavors: string[];
  href: string;
};

/** Данные для карточки страны на cup card */
export function countryCardData(country?: string | null, hint?: string | null): CountryCardData | null {
  const key = resolveCountryKey(country, hint);
  if (!key || !DB[key]) return null;
  const c = DB[key];
  return {
    key,
    name: c.name,
    flag: c.flag,
    region: c.region,
    flavors: (c.flavors || []).slice(0, 3),
    href: `/countries?c=${key}`,
  };
}

/** Декоративный акцент карты по региону */
export function regionMapAccent(region: string): string {
  const r = region.toLowerCase();
  if (r.includes('африка')) return '#6b8f71';
  if (r.includes('америка')) return '#a87c4f';
  if (r.includes('азия')) return '#b5704d';
  if (r.includes('восток') || r.includes('йemen')) return '#9b7a6a';
  return '#8b6b5a';
}
