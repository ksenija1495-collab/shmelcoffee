export type TasteCharacterDim = 'acidity' | 'sweetness' | 'bitterness';

export type TasteCharacterOption = { id: string; label: string; desc: string };

export type TasteCharacterDimConfig = {
  label: string;
  hint: string;
  options: TasteCharacterOption[];
};

export const TASTE_CHARACTER: Record<TasteCharacterDim, TasteCharacterDimConfig> = {
  acidity: {
    label: 'Кислотность',
    hint: 'Не «кисло», а яркость. Какой тип чувствуешь?',
    options: [
      { id: 'citric', label: 'Цитрусовая', desc: 'лимон, лайм, грейпфрут' },
      { id: 'malic', label: 'Яблочная', desc: 'зелёное яблоко, виноград' },
      { id: 'phosphoric', label: 'Ягодная / винная', desc: 'черника, игристое' },
      { id: 'bright', label: 'Яркая, сочная', desc: 'как спелый фрукт' },
      { id: 'soft', label: 'Мягкая, округлая', desc: 'без остроты' },
    ],
  },
  sweetness: {
    label: 'Сладость',
    hint: 'Кофе сладкий по-разному. Какой тип?',
    options: [
      { id: 'fruit', label: 'Фруктовая', desc: 'ягоды, персик, сок' },
      { id: 'honey', label: 'Медовая', desc: 'мёд, патока' },
      { id: 'caramel', label: 'Карамельная', desc: 'ириска, сахар' },
      { id: 'cocoa', label: 'Шоколадная', desc: 'какао, какао-порошок' },
      { id: 'dry', label: 'Сухая, ореховая', desc: 'миндаль, сухой финиш' },
    ],
  },
  bitterness: {
    label: 'Горечь',
    hint: 'Горечь бывает разная — не только «пережарили».',
    options: [
      { id: 'cocoa', label: 'Какао / шоколад', desc: 'горький шоколад' },
      { id: 'roast', label: 'Обжарочная', desc: 'орех, зерно, жар' },
      { id: 'herbal', label: 'Травянистая', desc: 'сено, зелень' },
      { id: 'astringent', label: 'Вяжущая', desc: 'сухой, терпкий финиш' },
      { id: 'clean', label: 'Чистая, короткая', desc: 'без неприятного хвоста' },
    ],
  },
};

export const TASTE_CHARACTER_DIMS: TasteCharacterDim[] = ['acidity', 'sweetness', 'bitterness'];
