/** Ботанические сорта арабики для форм и генерации гидов */
export const BEAN_VARIETIES = [
  'Гейша (Geisha)',
  'Типика (Typica)',
  'Бурбон (Bourbon)',
  'Красный бурбон',
  'Жёлтый бурбон',
  'Розовый бурбон',
  'Стармайя (Starmaya)',
  'Катурра (Caturra)',
  'Каткаи (Catuai)',
  'SL-28',
  'SL-34',
  'Хейрлум (Heirloom)',
  'Пакас (Pacas)',
  'Марагогипе (Maragogipe)',
  'Ruiru 11',
  'Сангри (S795)',
  'Кастийо (Castillo)',
  'Tabi',
  'Другой / смесь',
] as const;

export const BEAN_VARIETY_OTHER = 'Другой / смесь' as const;

export type BeanVariety = (typeof BEAN_VARIETIES)[number];
