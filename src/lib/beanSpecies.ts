import { BEAN_SPECIES, type BeanSpeciesValue } from '../data/beanSpecies';

export type { BeanSpeciesValue };

/** Нормализация значения из БД / формы. Пустое = арабика по умолчанию. */
export function normalizeBeanSpecies(raw: unknown): BeanSpeciesValue | null {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!v || v === 'arabica' || v === 'арабика') return 'arabica';
  if (v === 'liberica' || v === 'либерика' || v === 'liberi') return 'liberica';
  if (v === 'robusta' || v === 'canephora' || v === 'робуста' || v === 'канефора') return 'robusta';
  if (v === 'unknown' || v === 'не знаю') return 'unknown';
  return null;
}

export function inferBeanSpeciesFromText(variety?: string | null, name?: string | null): BeanSpeciesValue | null {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  if (/liberica|либерик/.test(t)) return 'liberica';
  if (/robusta|canephora|робуст|канефор/.test(t)) return 'robusta';
  return null;
}

export function resolveBeanSpecies(input: {
  bean_type?: string | null;
  variety?: string | null;
  name?: string | null;
}): BeanSpeciesValue {
  return (
    normalizeBeanSpecies(input.bean_type) ||
    inferBeanSpeciesFromText(input.variety, input.name) ||
    'arabica'
  );
}

export function beanSpeciesLabel(value: BeanSpeciesValue | null | undefined): string {
  const v = value || 'arabica';
  return BEAN_SPECIES.find((o) => o.value === v)?.label ?? 'Арабика';
}

/** Показывать на карточке, если не дефолтная арабика */
export function beanSpeciesTag(value: BeanSpeciesValue | null | undefined): string | null {
  const sp = resolveBeanSpecies({ bean_type: value });
  if (sp === 'arabica' || sp === 'unknown') return null;
  return beanSpeciesLabel(sp).toLowerCase();
}

export function isLiberica(input: {
  bean_type?: string | null;
  variety?: string | null;
  name?: string | null;
}): boolean {
  return resolveBeanSpecies(input) === 'liberica';
}

export function isRobusta(input: {
  bean_type?: string | null;
  variety?: string | null;
  name?: string | null;
}): boolean {
  return resolveBeanSpecies(input) === 'robusta';
}