export type PassportArchetype = {
  id: string;
  name: string;
  emoji: string;
  line: string;
  /** Семейства колеса вкусов для подсветки */
  wheelFams: string[];
  tags: string[];
};

export const PASSPORT_ARCHETYPES: PassportArchetype[] = [
  {
    id: 'fruity',
    name: 'Фруктовый исследователь',
    emoji: '🍓',
    line: 'ищет яркость и сочную кислотность',
    wheelFams: ['Ягоды', 'Цитрус', 'Фрукты'],
    tags: ['Ягодные', 'Цитрусовые', 'Сочные'],
  },
  {
    id: 'floral',
    name: 'Цветочный эстет',
    emoji: '🌸',
    line: 'любит тонкие чайные и цветочные ноты',
    wheelFams: ['Цветочный'],
    tags: ['Чайные', 'Жасмин', 'Деликатные'],
  },
  {
    id: 'chocolate',
    name: 'Шоколадный гедонист',
    emoji: '🍫',
    line: 'выбирает плотность, орех и какао',
    wheelFams: ['Ореховый'],
    tags: ['Какао', 'Орехи', 'Плотное тело'],
  },
  {
    id: 'caramel',
    name: 'Карамельный уютник',
    emoji: '🍯',
    line: 'ценит сладость, мёд и карамель',
    wheelFams: ['Сладкий'],
    tags: ['Мёд', 'Карамель', 'Уют'],
  },
  {
    id: 'spicy',
    name: 'Пряный авантюрист',
    emoji: '🌶️',
    line: 'тянется к специям и характеру',
    wheelFams: ['Пряный', 'Обжарочный'],
    tags: ['Специи', 'Характер', 'Смелые'],
  },
  {
    id: 'tropical',
    name: 'Тропический мечтатель',
    emoji: '🥭',
    line: 'обожает спелые тропические фрукты',
    wheelFams: ['Фрукты'],
    tags: ['Манго', 'Ананас', 'Экзотика'],
  },
];

export const PASSPORT_ARCH_BY_ID = Object.fromEntries(
  PASSPORT_ARCHETYPES.map((a) => [a.id, a]),
) as Record<string, PassportArchetype>;
