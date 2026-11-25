/** Ботанический вид (не сорт культивар). */
export const BEAN_SPECIES = [
  { value: 'arabica', label: 'Арабика' },
  { value: 'liberica', label: 'Либерика' },
  { value: 'robusta', label: 'Робуста (канефора)' },
  { value: 'unknown', label: 'Не знаю' },
] as const;

export type BeanSpeciesValue = (typeof BEAN_SPECIES)[number]['value'];