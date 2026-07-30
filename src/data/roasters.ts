export type RoasterEntry = {
  name: string;
  aliases: string[];
  domain?: string;
  /** Локальный путь, если есть свой asset */
  logo?: string;
};

/** Популярные обжарщики + алиасы для fuzzy-match по полю cups.roaster */
export const ROASTERS: RoasterEntry[] = [
  // Топ «Обжарщик года 2026» + каталог квиза
  { name: 'Submarine', aliases: ['submarine', 'submarine coffee', 'сабмарин', 'sbmrne'], domain: 'sbmrne.ru' },
  { name: 'The Welder Catherine', aliases: ['welder catherine', 'theweldercatherine', 'сварщица екатерина', 'кatherine'], domain: 'theweldercatherine.ru' },
  { name: 'Tasty Coffee', aliases: ['tasty coffee', 'tasty', 'тasty', 'тasty coffee'], domain: 'shop.tastycoffee.ru' },
  { name: 'Triptych Coffee', aliases: ['triptych', 'triptych coffee', 'триптих', 'триптих кофе'], domain: 'triptychcoffee.com' },
  { name: 'СОК Кофе', aliases: ['сок кофе', 'сок', 'sok coffee', 'sok.coffee'], domain: 'sok.coffee' },
  { name: 'TAB', aliases: ['tab', 'tab coffee', 'letstab', 'тав'], domain: 'letstab.ru' },
  { name: 'KOF', aliases: ['kof', 'kof.', 'kof coffee', 'kof roastery'], domain: 'kof.ru' },
  { name: 'Silky Drum', aliases: ['silky drum', 'silkydrum'], domain: 'silkydrum.ru' },
  { name: 'Rockets Coffee', aliases: ['rockets', 'rockets coffee'], domain: 'rockets.coffee' },
  { name: 'Sibaristica', aliases: ['sibaristica', 'сибаристика'], domain: 'sibaristica.com' },
  { name: 'Fauno Coffee', aliases: ['fauno', 'fauno coffee'], domain: 'fauno.coffee' },
  { name: 'HQ! coffee', aliases: ['hq coffee', 'hq! coffee', 'hq-coffee'], domain: 'hq-coffee.ru' },
  { name: 'Caffeine Lab', aliases: ['caffeine lab', 'caffeine lab coffee roasters'], domain: 'caffeinelab.ru' },
  { name: 'Roastberry', aliases: ['roastberry', 'roastberry coffee'], domain: 'roastberry.ru' },
  { name: 'Atlas Coffee', aliases: ['atlas coffee', 'atlas'], domain: 'atlascoffee.ru' },
  { name: 'Solo Coffee', aliases: ['solo coffee', 'solocoffee'], domain: 'solocoffee.su' },
  { name: 'Zavod Coffee', aliases: ['zavod coffee', 'zavod'], domain: 'zavod.coffee' },
  { name: 'Camera Obscura', aliases: ['camera obscura', 'камера обскура'], domain: 'cameraobscura.coffee' },
  { name: 'Kofeop', aliases: ['kofeop', 'kofeop roastery'], domain: 'kofeop.ru' },
  { name: 'Bravos', aliases: ['bravos', 'bravos coffee', 'bravo coffee'], domain: 'bravoscoffee.ru' },
  { name: 'Ingresso Coffee', aliases: ['ingresso', 'ingresso coffee'], domain: 'ingresso.coffee' },
  { name: 'ForCup', aliases: ['forcup', 'forcup roasters'], domain: 'forcup.ru' },
  { name: 'Most Coffee Roasters', aliases: ['most coffee', 'most roasters'], domain: 'mostcoffee.ru' },
  { name: 'Skuratov Coffee', aliases: ['skuratov', 'skuratov coffee'], domain: 'skuratovcoffee.ru' },
  { name: 'Double B Coffee', aliases: ['double b', 'double b coffee', 'даблби', 'dablb'], domain: 'doubleb.ru' },
  { name: 'Bushido', aliases: ['bushido', 'bushido coffee'], domain: 'bushidocoffee.ru' },
  { name: 'Self Edge Coffee', aliases: ['self edge', 'selfedge'], domain: 'selfedge.ru' },
  { name: 'Mad Espresso Team', aliases: ['mad espresso', 'met'], domain: 'madespressoteam.ru' },
  { name: 'Favorit Coffee', aliases: ['favorit', 'favorit coffee'], domain: 'favorit.coffee' },
  { name: 'Smart Coffee', aliases: ['smart coffee'], domain: 'smartc.ru' },
  { name: 'Coffee Owl', aliases: ['coffee owl', 'coffeeowl', 'кофе сова'], domain: 'coffeeowl.ru' },
  { name: 'Torrefacto', aliases: ['torrefacto'], domain: 'torrefacto.ru' },
  { name: 'Verle', aliases: ['verle', 'verle coffee'], domain: 'verle.ru' },
  { name: 'Adept', aliases: ['adept coffee', 'adept'], domain: 'adeptcoffee.ru' },
  { name: 'Blue Hawaii Roast', aliases: ['blue hawaii', 'blue hawaii roast'], domain: 'bluehawaiiroast.ru' },
  { name: 'Bailyday', aliases: ['bailyday'], domain: 'bailyday.coffee' },
  { name: 'Mikale', aliases: ['mikale'], domain: 'mikale.coffee' },
  { name: 'Нефть Coffee Roasters', aliases: ['нефть', 'neft coffee'], domain: 'neftcoffee.ru' },
  { name: 'Человек и Пароход', aliases: ['человек и пароход', 'chelovek i parohod'], domain: 'human-and-steamboat.ru' },
];
