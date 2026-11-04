/** Выбор метода (не доз) — дозы всегда из brewStandards. */
import type { BrewBeanInput } from './brewRecommend';
import { resolveCountryKey } from './countryResolve';
import { DB } from '../data/countries';

type ProcessKind = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';

function processKind(process?: string | null): ProcessKind {
  const p = (process || '').toLowerCase();
  if (/анаэроб|carbonic|лакто|lactic|ферментир/.test(p)) return 'anaerobic';
  if (/натур|natural|сух/.test(p)) return 'natural';
  if (/хани|honey|пульп/.test(p)) return 'honey';
  if (/мыт|washed|wet-hulled|вет/.test(p)) return 'washed';
  return 'other';
}

export function pickBrewMethods(input: BrewBeanInput): {
  primaryMethod: string;
  secondaryMethod: string;
  why: string;
  avoid: string[];
} {
  const key = resolveCountryKey(input.country, input.name);
  const country = key ? DB[key] : null;
  const pk = processKind(input.process);
  const body = country?.bLvl ?? 50;
  const acid = country?.aLvl ?? 60;
  const lightBody = body <= 45;
  const highAcid = acid >= 70;
  const avoid: string[] = [];

  let primaryMethod = 'V60';
  let secondaryMethod = 'Hario Switch';
  let why = 'Мытый или универсальный лот — фильтр-пролив для прозрачности.';

  if (key === 'yemen') {
    primaryMethod = 'Турка';
    secondaryMethod = 'Hario Switch';
    why = 'Йемен — турка; фильтр только для сравнения.';
    avoid.push('V60 как основной — мало тела');
  } else if (key === 'indonesia' && /вет|wet|хул|giling|sumatra/i.test(String(input.process || ''))) {
    primaryMethod = 'Aeropress';
    secondaryMethod = 'Френч-пресс';
    why = 'Wet-hull / Суматра — иммерсия и тело, не длинный V60.';
    avoid.push('V60 95 °C — землистый хвост');
  } else if (pk === 'anaerobic') {
    primaryMethod = 'Aeropress';
    secondaryMethod = 'Hario Switch';
    why = 'Анаэроб — короткий контакт, контроль фермента.';
    avoid.push('Длинная иммерсия @ 96 °C');
  } else if (pk === 'natural') {
    primaryMethod = lightBody ? 'Hario Switch' : 'Aeropress';
    secondaryMethod = 'V60';
    why = 'Натурал — Switch или AP удерживают сладость без мутного хвоста.';
    if (body >= 60) avoid.push('Длинный горячий V60 без калибровки °C');
  } else if (pk === 'honey') {
    primaryMethod = 'V60';
    secondaryMethod = 'Hario Switch';
    why = 'Honey — пролив или короткий Switch; не перегрев.';
  } else if (lightBody || highAcid) {
    primaryMethod = 'V60';
    secondaryMethod = 'Aeropress';
    why = 'Лёгкая мытая чашка — V60; AP для чуть большего тела.';
  } else {
    primaryMethod = 'V60';
    secondaryMethod = 'Hario Switch';
    why = 'Мытая структура — V60; Switch для сравнения сладости.';
    avoid.push('Switch >2 min закрытый @ 96 °C на light roast');
  }

  if (highAcid && pk === 'natural') {
    avoid.push('Колд брю первым — мало ароматики');
  }

  return { primaryMethod, secondaryMethod, why, avoid: avoid.slice(0, 3) };
}
