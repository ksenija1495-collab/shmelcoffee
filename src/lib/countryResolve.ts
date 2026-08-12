import { DB, countryOrder } from '../data/countries';

const nameToKey: Record<string, string> = {};
for (const [key, c] of Object.entries(DB)) {
  nameToKey[c.name.toLowerCase()] = key;
}

/** Доп. подсказки в названии зерна (Ява → Индонезия и т.п.) */
const ALIAS_TO_KEY: Record<string, string> = {
  bolivia: 'bolivia',
  caranavi: 'bolivia',
  каранави: 'bolivia',
  самайпата: 'bolivia',
  china: 'china',
  yunnan: 'china',
  юньнань: 'china',
  пуэр: 'china',
  мэнлянь: 'china',
  vietnam: 'vietnam',
  'viet nam': 'vietnam',
  далат: 'vietnam',
  dalat: 'vietnam',
  'da lat': 'vietnam',
  'son la': 'vietnam',
  шонла: 'vietnam',
  'лам донг': 'vietnam',
  malawi: 'malawi',
  мзузу: 'malawi',
  нгапани: 'malawi',
  ngapani: 'malawi',
  ява: 'indonesia',
  java: 'indonesia',
  sumatra: 'indonesia',
  сумatra: 'indonesia',
  sulawesi: 'indonesia',
  yirgacheffe: 'ethiopia',
  sidamo: 'ethiopia',
  guji: 'ethiopia',
  burundi: 'burundi',
  congo: 'drcongo',
  'др конго': 'drcongo',
  'д.р. конго': 'drcongo',
  'демократическая республика конго': 'drcongo',
  'drc': 'drcongo',
  'dr congo': 'drcongo',
  киву: 'drcongo',
  kivu: 'drcongo',
  калехе: 'drcongo',
  kalehe: 'drcongo',
  нямасаса: 'drcongo',
  nyamasasa: 'drcongo',
  salvador: 'elsalvador',
  'el salvador': 'elsalvador',
  nicaragua: 'nicaragua',
};

const byNameLength = countryOrder
  .map((key) => ({ key, name: DB[key].name }))
  .sort((a, b) => b.name.length - a.name.length);

export function resolveCountryKey(country?: string | null, hint?: string | null): string | null {
  const c = country?.trim();
  if (c) {
    const exact = nameToKey[c.toLowerCase()];
    if (exact) return exact;
    const lower = c.toLowerCase();
    for (const { key, name } of byNameLength) {
      const n = name.toLowerCase();
      if (lower.includes(n) || n.includes(lower)) return key;
    }
    for (const [alias, key] of Object.entries(ALIAS_TO_KEY)) {
      if (lower.includes(alias)) return key;
    }
  }

  const text = (hint || '').trim().toLowerCase();
  if (!text) return null;

  for (const { key, name } of byNameLength) {
    if (text.includes(name.toLowerCase())) return key;
  }

  for (const [alias, key] of Object.entries(ALIAS_TO_KEY)) {
    if (text.includes(alias)) return key;
  }

  return null;
}

export function countryNameForKey(key: string | null): string | null {
  if (!key || !DB[key]) return null;
  return DB[key].name;
}

export function collectOpenedCountryKeys(items: {
  country?: string | null;
  origin?: string | null;
  name?: string | null;
}[]): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    const k = resolveCountryKey(item.country || item.origin, item.name);
    if (k) keys.add(k);
  }
  return keys;
}

export { nameToKey };
