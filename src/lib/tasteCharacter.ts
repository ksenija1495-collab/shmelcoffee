import { TASTE_CHARACTER, type TasteCharacterDim } from '../data/tasteCharacter';

export type TasteCharacterValue = {
  /** @deprecated single preset — читаем для старых записей */
  preset?: string | null;
  presets?: string[];
  custom?: string | null;
};

export type TasteCharacter = Partial<Record<TasteCharacterDim, TasteCharacterValue>>;

export function tasteCharPresets(value: TasteCharacterValue | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value.presets) && value.presets.length) {
    return value.presets.filter((p) => p && p !== 'none');
  }
  if (value.preset && value.preset !== 'none') return [value.preset];
  return [];
}

export function labelForTasteCharacterPreset(dim: TasteCharacterDim, presetId: string): string | null {
  if (!presetId || presetId === 'none') return null;
  const opt = TASTE_CHARACTER[dim].options.find((o) => o.id === presetId);
  return opt?.label || presetId;
}

export function labelsForTasteCharacter(dim: TasteCharacterDim, value: TasteCharacterValue | null | undefined): string[] {
  if (!value) return [];
  const custom = value.custom?.trim();
  if (custom) return [custom];
  return tasteCharPresets(value)
    .map((id) => labelForTasteCharacterPreset(dim, id))
    .filter((l): l is string => Boolean(l));
}

export function labelForTasteCharacter(dim: TasteCharacterDim, value: TasteCharacterValue | null | undefined): string | null {
  const labels = labelsForTasteCharacter(dim, value);
  return labels.length ? labels.join(', ') : null;
}

export function normalizeTasteCharacter(raw: unknown): TasteCharacter | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const out: TasteCharacter = {};
  (['acidity', 'sweetness', 'bitterness'] as TasteCharacterDim[]).forEach((dim) => {
    const v = src[dim];
    if (!v || typeof v !== 'object') return;
    const row = v as Record<string, unknown>;
    const custom = row.custom ? String(row.custom).trim() : null;
    const presetsRaw = row.presets;
    let presets: string[] = [];
    if (Array.isArray(presetsRaw)) {
      presets = presetsRaw.map(String).filter((p) => p && p !== 'none');
    } else if (row.preset) {
      const p = String(row.preset);
      if (p !== 'none') presets = [p];
    }
    if (custom) {
      out[dim] = { presets: [], custom };
    } else if (presets.length) {
      out[dim] = { presets, custom: null };
    }
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
