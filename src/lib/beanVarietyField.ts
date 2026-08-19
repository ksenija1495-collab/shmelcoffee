import { BEAN_VARIETIES, BEAN_VARIETY_OTHER } from '../data/varieties';

export { BEAN_VARIETY_OTHER };

export function toggleVarietyCustomRow(selectId = 'f_variety', rowId = 'varietyCustomRow') {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  const row = document.getElementById(rowId);
  if (!sel || !row) return;
  row.style.display = sel.value === BEAN_VARIETY_OTHER ? 'block' : 'none';
}

export function bindVarietyOther(selectId = 'f_variety', rowId = 'varietyCustomRow') {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  sel?.addEventListener('change', () => toggleVarietyCustomRow(selectId, rowId));
  toggleVarietyCustomRow(selectId, rowId);
}

export function readVarietyValue(selectId = 'f_variety', customId = 'f_variety_custom'): string | null {
  const sel = (document.getElementById(selectId) as HTMLSelectElement | null)?.value;
  if (!sel) return null;
  if (sel === BEAN_VARIETY_OTHER) {
    return (document.getElementById(customId) as HTMLInputElement | null)?.value.trim() || null;
  }
  return sel;
}

function varietyBaseLabel(s: string): string {
  return s.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

/** Сопоставляет строку с полки / URL с пунктом справочника сортов. */
export function findVarietyInCatalog(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if ((BEAN_VARIETIES as readonly string[]).includes(v)) return v;

  const lower = v.toLowerCase();
  for (const opt of BEAN_VARIETIES) {
    if (opt.toLowerCase() === lower) return opt;
    const base = varietyBaseLabel(opt);
    const rawBase = varietyBaseLabel(v);
    if (base === rawBase) return opt;
    if (rawBase.includes(base) || base.includes(rawBase)) return opt;
  }
  return null;
}

export function resolveVarietyForForm(value: string | null | undefined): { select: string; custom: string } {
  if (!value?.trim()) return { select: '', custom: '' };
  const v = value.trim();

  const direct = findVarietyInCatalog(v);
  if (direct) return { select: direct, custom: '' };

  const parts = v.split(/\s*\/\s*|\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const matches = [...new Set(parts.map(findVarietyInCatalog).filter(Boolean) as string[])];
    if (matches.length === 1) return { select: matches[0], custom: '' };
    return { select: BEAN_VARIETY_OTHER, custom: v };
  }

  return { select: BEAN_VARIETY_OTHER, custom: v };
}

export function setVarietyValue(
  value: string | null | undefined,
  selectId = 'f_variety',
  customId = 'f_variety_custom',
  rowId = 'varietyCustomRow',
) {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  const custom = document.getElementById(customId) as HTMLInputElement | null;
  if (!sel) return;
  const { select, custom: customVal } = resolveVarietyForForm(value);
  sel.value = select;
  if (custom) custom.value = customVal;
  toggleVarietyCustomRow(selectId, rowId);
}
