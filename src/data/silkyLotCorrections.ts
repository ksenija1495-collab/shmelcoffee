/**
 * Эталонные поля для лотов Silky Drum (сеты «История кофе» + корзина 2026).
 * Используется при правке полки и однократных фикcах в БД.
 */
export type ShelfBeanPatch = {
  roaster?: string;
  country?: string;
  process?: string;
  variety?: string | null;
};

export const SILKY_LOT_CORRECTIONS: Record<string, ShelfBeanPatch> = {
  /** https://www.silkydrum.ru/catalog/indonesia-kerinci-washed */
  'Индонезия Керинчи': {
    roaster: 'Silky Drum',
    country: 'Индонезия',
    process: 'Мытая (Washed)',
    variety: 'андунгсари, сигарар утанг',
  },
  /** roasted.ru / Silky: натуральный + анаэробный; в каталоге SD сейчас нет slug */
  'Индонезия Суматра Семендо Финка Али': {
    roaster: 'Silky Drum',
    country: 'Индонезия',
    process: 'Анаэробная',
    variety: null,
  },
  'Китай Хуангуан': {
    roaster: 'Silky Drum',
    country: 'Китай',
    process: 'Анаэробная',
    variety: 'сарчимор',
  },
  'Кения Барагви': {
    roaster: 'Silky Drum',
    country: 'Кения',
    process: 'Мытая (Washed)',
    variety: 'SL28, SL34, Батиан, Руиру 11',
  },
  'Гондурас Мириам Александра': {
    roaster: 'Silky Drum',
    country: 'Гондурас',
    process: 'Натуральная (Natural)',
    variety: 'гейша',
  },
  'Кения Мутиту': {
    roaster: 'Silky Drum',
    country: 'Кения',
    process: 'Натуральная (Natural)',
    variety: 'SL28',
  },
  'Эфиопия Арича': {
    roaster: 'Silky Drum',
    country: 'Эфиопия',
    process: 'Мытая (Washed)',
    variety: 'местные разновидности',
  },
  'Эфиопия Хоро Бетела': {
    roaster: 'Silky Drum',
    country: 'Эфиопия',
    process: 'Натуральная (Natural)',
    variety: 'местные разновидности',
  },
  'Бразилия Рио Паранайба': {
    roaster: 'Silky Drum',
    country: 'Бразилия',
    process: 'Натуральная (Natural)',
    variety: 'жёлтый катуаи 62',
  },
  /** https://silkydrum.ru/catalog/rwanda-nyungwe-natural */
  'Руанда Ньюнгве': {
    roaster: 'Silky Drum',
    country: 'Руанда',
    process: 'Натуральная (Natural)',
    variety: 'красный бурбон',
  },
};

/** Единое имя обжарщика на полке */
export const ROASTER_ALIASES: Record<string, string> = {
  'Silky Drums': 'Silky Drum',
  'silky drum': 'Silky Drum',
  'SILKY DRUM': 'Silky Drum',
};