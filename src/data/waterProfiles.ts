/** Профили воды для дневника (v1 — пресеты). */
export const WATER_PROFILES = [
  { id: 'tap', label: 'Водопровод' },
  { id: 'filter', label: 'Фильтр / Брита' },
  { id: 'ro', label: 'ОСМО + реминерализация' },
  { id: 'soft', label: 'Мягкая / 3rd wave water' },
  { id: 'other', label: 'Другое' },
] as const;

export type WaterProfileId = (typeof WATER_PROFILES)[number]['id'];

export function waterProfileLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return WATER_PROFILES.find((p) => p.id === id)?.label ?? id;
}