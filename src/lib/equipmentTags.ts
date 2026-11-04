export type EquipmentTag = {
  id: string;
  label: string;
  name: string;
  category: string;
};

/** Теги оборудования — один клик на вкладке «Зерно». */
export const EQUIPMENT_TAGS: EquipmentTag[] = [
  { id: 'v60', label: 'V60', name: 'V60', category: 'Воронка' },
  { id: 'aeropress', label: 'AeroPress', name: 'AeroPress', category: 'Аэропресс' },
  { id: 'moka', label: 'Moka pot', name: 'Moka pot', category: 'Гейзерная' },
  { id: 'french', label: 'Френч-пресс', name: 'Френч-пресс', category: 'Френч-пресс' },
  { id: 'chemex', label: 'Chemex', name: 'Chemex', category: 'Кемекс' },
  { id: 'espresso', label: 'Эспрессо', name: 'Эспрессо', category: 'Эспрессо-машина' },
  { id: 'turka', label: 'Турка', name: 'Турка', category: 'Турка' },
  { id: 'switch', label: 'Switch', name: 'Hario Switch', category: 'Switch' },
  { id: 'drip', label: 'Дрип-пакет', name: 'Дрип-пакет', category: 'Дрип-пакет' },
];

const CORE_BREW_METHODS = ['V60', 'Aeropress', 'Hario Switch', 'Турка'] as const;

export const EQUIP_TO_BREW: Record<string, string> = {
  v60: 'V60',
  aeropress: 'Aeropress',
  turka: 'Турка',
  chemex: 'Chemex',
  french: 'Френч-пресс',
  moka: 'Гейзерная',
  espresso: 'Эспрессо',
  switch: 'Hario Switch',
  drip: 'Дрип-пакет',
};

export function brewMethodsForEquipment(
  equipItems: { name?: string | null; category?: string | null }[],
): string[] {
  const out = new Set<string>();
  for (const tag of EQUIPMENT_TAGS) {
    if (equipItems.some((item) => equipmentItemMatchesTag(item, tag))) {
      const m = EQUIP_TO_BREW[tag.id];
      if (m) out.add(m);
    }
  }
  if (!out.size) return [...CORE_BREW_METHODS];
  if (out.has('V60')) out.add('Hario Switch');
  return [...out];
}

export function equipmentItemMatchesTag(
  item: { name?: string | null; category?: string | null },
  tag: EquipmentTag,
): boolean {
  const name = (item.name || '').trim().toLowerCase();
  const cat = (item.category || '').trim().toLowerCase();
  const tagName = tag.name.toLowerCase();
  const tagLabel = tag.label.toLowerCase();
  const tagCat = tag.category.toLowerCase();
  if (name === tagName || name === tagLabel || cat === tagCat) return true;
  if (tag.id === 'switch' && (/switch|свитч/i.test(name) || /switch|свитч/i.test(cat))) return true;
  if (tag.id === 'drip' && (/drip|дрип/i.test(name) || /drip|дрип/i.test(cat))) return true;
  return false;
}

export function findEquipmentItemForTag(
  equipItems: { id?: string; name?: string | null; category?: string | null }[],
  tagId: string,
) {
  const tag = EQUIPMENT_TAGS.find((t) => t.id === tagId);
  if (!tag) return undefined;
  return equipItems.find((item) => equipmentItemMatchesTag(item, tag));
}
