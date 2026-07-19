export type RoasterEntry = {
  name: string;
  aliases: string[];
  domain?: string;
  /** Локальный путь, если есть свой asset */
  logo?: string;
};

/** Популярные обжарщики + алиасы для fuzzy-match по полю cups.roaster */
export const ROASTERS: RoasterEntry[] = [
  { name: 'Submarine', aliases: ['submarine', 'submarine coffee', 'сабмарин'], domain: 'submarine.coffee' },
  { name: 'The Welder Catherine', aliases: ['welder catherine', 'theweldercatherine', 'кatherine'], domain: 'theweldercatherine.ru' },
  { name: 'Rockets Coffee', aliases: ['rockets', 'rockets coffee'], domain: 'rockets.coffee' },
  { name: 'Silky Drum', aliases: ['silky drum', 'silkydrum'], domain: 'silkydrum.ru' },
  { name: 'Fauno Coffee', aliases: ['fauno', 'fauno coffee'], domain: 'fauno.coffee' },
  { name: 'Tasty Coffee', aliases: ['tasty coffee', 'tasty', 'тasty'], domain: 'tastycoffee.ru' },
  { name: 'Sibaristica', aliases: ['sibaristica', 'сибаристика'], domain: 'sibaristica.com' },
  { name: 'Double B Coffee', aliases: ['double b', 'double b coffee'], domain: 'doubleb.ru' },
  { name: 'Skuratov Coffee', aliases: ['skuratov', 'skuratov coffee'], domain: 'skuratovcoffee.ru' },
  { name: 'Bushido', aliases: ['bushido', 'bushido coffee'], domain: 'bushidocoffee.ru' },
  { name: 'Self Edge Coffee', aliases: ['self edge', 'selfedge'], domain: 'selfedge.ru' },
  { name: 'Panorama', aliases: ['panorama', 'panorama coffee'], domain: 'panoramafestival.ru' },
  { name: 'Mad Espresso Team', aliases: ['mad espresso', 'met'], domain: 'madespressoteam.ru' },
  { name: 'Favorit Coffee', aliases: ['favorit', 'favorit coffee'], domain: 'favorit.coffee' },
  { name: 'Smart Coffee', aliases: ['smart coffee'], domain: 'smartc.ru' },
  { name: 'Coffee Owl', aliases: ['coffee owl', 'coffeeowl'], domain: 'coffeeowl.ru' },
  { name: 'Bazzara', aliases: ['bazzara'], domain: 'bazzara.ru' },
  { name: 'Bravo Coffee', aliases: ['bravo coffee'], domain: 'bravocoffee.ru' },
  { name: 'Adept', aliases: ['adept coffee', 'adept'], domain: 'adeptcoffee.ru' },
  { name: 'Solo Coffee', aliases: ['solo coffee'], domain: 'solocoffee.ru' },
];
