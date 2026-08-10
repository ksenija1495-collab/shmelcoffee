/** Смесь сортов: «Катимор / Катурра», «SL-28 / SL-34», «Другой / смесь». */

export function isVarietyBlend(variety?: string | null, name?: string | null): boolean {
  const v = (variety || '').trim();
  const n = (name || '').trim();
  if (!v && !n) return false;
  if (/смес|blend|mixed/i.test(v) || /смес|blend/i.test(n)) return true;
  // Разделитель сортов — не путать с «SL-28» внутри одного названия
  if (/\s\/\s|\s*\+\s*|,\s*(?=.*(?:катимор|катурра|катуаи|бурбон|типика|гейш|sl|батиан|heirloom|catimor|bourbon|typica))/i.test(v)) {
    return true;
  }
  // Два+ известных сорта через /
  const parts = v.split(/\s*\/\s*|\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2;
}

export function varietyBlendLabel(variety?: string | null): string {
  const v = (variety || '').trim();
  if (!v) return 'смесь сортов';
  return v.replace(/\s*\([^)]*\)/g, '').trim();
}
