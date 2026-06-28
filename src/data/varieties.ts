/** Ботанические сорта арабики для форм и генерации гидов */
export const BEAN_VARIETIES = [
  'Гейша (Geisha)',
  'Типика (Typica)',
  'Бурбон (Bourbon)',
  'Жёлтый бурбон',
  'Розовый бурбон',
  'Катурра (Caturra)',
  'Каткаи (Catuai)',
  'SL-28',
  'SL-34',
  'Хейрлум (Heirloom)',
  'Пакас (Pacas)',
  'Марагогипе (Maragogipe)',
  'Ruiru 11',
  'Сангри (S795)',
  'Кастillo',
  'Tabi',
  'Другой / смесь',
] as const;

export type BeanVariety = (typeof BEAN_VARIETIES)[number];
