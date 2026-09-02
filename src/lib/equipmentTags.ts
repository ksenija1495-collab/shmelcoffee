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
  { id: 'grinder', label: 'Кофемолка', name: 'Кофемолка', category: 'Кофемолка' },
  { id: 'scales', label: 'Весы', name: 'Весы', category: 'Весы' },
];

export function equipmentItemMatchesTag(
  item: { name?: string | null; category?: string | null },
  tag: EquipmentTag,
): boolean {
  const name = (item.name || '').trim().toLowerCase();
  const cat = (item.category || '').trim().toLowerCase();
  return (
    name === tag.name.toLowerCase()
    || name === tag.label.toLowerCase()
    || cat === tag.category.toLowerCase()
  );
}

export function findEquipmentItemForTag(
  equipItems: { id?: string; name?: string | null; category?: string | null }[],
  tagId: string,
) {
  const tag = EQUIPMENT_TAGS.find((t) => t.id === tagId);
  if (!tag) return undefined;
  return equipItems.find((item) => equipmentItemMatchesTag(item, tag));
}
