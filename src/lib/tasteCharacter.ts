import { TASTE_CHARACTER, type TasteCharacterDim } from '../data/tasteCharacter';

export type TasteCharacterValue = { preset?: string | null; custom?: string | null };
export type TasteCharacter = Partial<Record<TasteCharacterDim, TasteCharacterValue>>;

export function labelForTasteCharacter(dim: TasteCharacterDim, value: TasteCharacterValue | null | undefined): string | null {
  if (!value) return null;
  const custom = value.custom?.trim();
  if (custom) return custom;
  const preset = value.preset;
  if (!preset) return null;
  const opt = TASTE_CHARACTER[dim].options.find((o) => o.id === preset);
  return opt?.label || preset;
}

export function normalizeTasteCharacter(raw: unknown): TasteCharacter | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const out: TasteCharacter = {};
  (['acidity', 'sweetness', 'bitterness'] as TasteCharacterDim[]).forEach((dim) => {
    const v = src[dim];
    if (!v || typeof v !== 'object') return;
    const row = v as Record<string, unknown>;
    const preset = row.preset ? String(row.preset) : null;
    const custom = row.custom ? String(row.custom).trim() : null;
    if (preset || custom) out[dim] = { preset, custom: custom || null };
  });
  return Object.keys(out).length ? out : null;
}

export function formatTasteCharacterLine(tc: TasteCharacter | null | undefined): string {
  if (!tc) return '';
  const parts: string[] = [];
  (['acidity', 'sweetness', 'bitterness'] as TasteCharacterDim[]).forEach((dim) => {
    const label = labelForTasteCharacter(dim, tc[dim]);
    if (label) parts.push(`${TASTE_CHARACTER[dim].label.toLowerCase()}: ${label}`);
  });
  return parts.join(' · ');
}

export function tasteCharacterHasData(tc: TasteCharacter | null | undefined): boolean {
  return Boolean(formatTasteCharacterLine(tc));
}
