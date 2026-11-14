export type RoomGuide = {
  slug: string;
  tab: string;
  title: string;
  kind: 'Каппинг' | 'Дрип-набор';
  when?: string;
  href: string;
};

/** Закрытая полка. В меню сайта не ссылаемся. Новый гайд — страница в src/pages/g/ и строка сюда. */
export const roomGuides: RoomGuide[] = [
  {
    slug: 'istoriya-kofe',
    tab: 'История кофе',
    title: 'Каппинг-встреча. История кофе от Эфиопии до современных селекций',
    kind: 'Каппинг',
    when: '22 ноября',
    href: '/g/istoriya-kofe',
  },
  {
    slug: 'istoriya-kofe-nabor',
    tab: 'История кофе — набор',
    title: 'История кофе в пяти чашках',
    kind: 'Дрип-набор',
    href: '/g/istoriya-kofe-nabor',
  },
];
