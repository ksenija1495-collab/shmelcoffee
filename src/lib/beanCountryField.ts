import { DB, countryOrder } from '../data/countries';

export const BEAN_COUNTRY_OTHER = 'Другая страна…';

export function catalogCountryNames(): string[] {
  return countryOrder.map((k) => (DB as any)[k].name as string);
}

/** Список для select: 20 стран + «другое» */
export function countriesForSelect(): string[] {
  return [...catalogCountryNames(), BEAN_COUNTRY_OTHER];
}

export function toggleCountryCustomRow(selectId = 'f_country', rowId = 'countryCustomRow') {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  const row = document.getElementById(rowId);
  if (!sel || !row) return;
  row.style.display = sel.value === BEAN_COUNTRY_OTHER ? 'block' : 'none';
}

export function bindCountryOther(selectId = 'f_country', rowId = 'countryCustomRow') {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  sel?.addEventListener('change', () => toggleCountryCustomRow(selectId, rowId));
  toggleCountryCustomRow(selectId, rowId);
}

export function readCountryValue(
  selectId = 'f_country',
  customId = 'f_country_custom',
): string | null {
  const sel = (document.getElementById(selectId) as HTMLSelectElement | null)?.value;
  if (!sel) return null;
  if (sel === BEAN_COUNTRY_OTHER) {
    return (document.getElementById(customId) as HTMLInputElement | null)?.value.trim() || null;
  }
  return sel;
}

function countryInCatalog(name: string): string | null {
  const v = name.trim();
  if (!v) return null;
  const low = v.toLowerCase();
  for (const c of catalogCountryNames()) {
    if (c.toLowerCase() === low) return c;
  }
  return null;
}

export function resolveCountryForForm(value: string | null | undefined): { select: string; custom: string } {
  if (!value?.trim()) return { select: '', custom: '' };
  const hit = countryInCatalog(value);
  if (hit) return { select: hit, custom: '' };
  return { select: BEAN_COUNTRY_OTHER, custom: value.trim() };
}

export function setCountryValue(
  value: string | null | undefined,
  selectId = 'f_country',
  customId = 'f_country_custom',
  rowId = 'countryCustomRow',
) {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  const custom = document.getElementById(customId) as HTMLInputElement | null;
  if (!sel) return;
  const { select, custom: customVal } = resolveCountryForForm(value);
  sel.value = select;
  if (custom) custom.value = customVal;
  toggleCountryCustomRow(selectId, rowId);
}

/** Значение страны из select в bulk-import (parse-photo) */
export function readCountryFromSelect(select: HTMLSelectElement, customInput: HTMLInputElement | null): string | null {
  const v = select.value;
  if (!v) return null;
  if (v === BEAN_COUNTRY_OTHER) return customInput?.value.trim() || null;
  return v;
}
