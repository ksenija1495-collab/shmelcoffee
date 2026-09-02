import { applyRecipeToParams } from './cupRecipe';

export type FlightBean = {
  slot: number;
  shelf_item_id?: string | null;
  name: string;
  roaster?: string | null;
  country?: string | null;
  process?: string | null;
  variety?: string | null;
};

export type TastingFlight = {
  id: string;
  user_id: string;
  title: string;
  brew_method?: string | null;
  beans: FlightBean[];
  focus?: string | null;
  conclusion?: string | null;
  status: 'draft' | 'active' | 'completed';
  source?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BrewPreset = {
  brew: string;
  coffee_g: string;
  water_g: string;
  temp: string;
  time?: string;
  blooming_ml?: string;
  blooming?: string;
  grind?: string;
  label: string;
};

export const FLIGHT_BREW_PRESETS: Record<string, BrewPreset> = {
  AeroPress: {
    brew: 'AeroPress',
    coffee_g: '15',
    water_g: '230',
    temp: '88',
    time: '120',
    grind: 'средний',
    label: 'AP классика · 15 г / 230 мл · 88 °C · ~2:00',
  },
  'AeroPress (короткий)': {
    brew: 'AeroPress',
    coffee_g: '17',
    water_g: '85',
    temp: '85',
    time: '90',
    grind: 'средний',
    label: 'AP короткий · 17 г / 85 мл · 85 °C · ~1:30',
  },
  V60: {
    brew: 'V60',
    coffee_g: '15',
    water_g: '250',
    temp: '93',
    time: '180',
    blooming_ml: '45',
    blooming: '40',
    grind: 'средний',
    label: 'V60 · 15 г / 250 мл · 93 °C · блум 45 мл',
  },
  'V60 (африка)': {
    brew: 'V60',
    coffee_g: '15',
    water_g: '250',
    temp: '92',
    time: '165',
    blooming_ml: '40',
    blooming: '30',
    grind: 'средний',
    label: 'V60 · африка мытая · 15 г / 250 мл · 92 °C · ~2:45',
  },
  'V60 (тройное)': {
    brew: 'V60',
    coffee_g: '10',
    water_g: '170',
    temp: '92',
    time: '150',
    blooming_ml: '30',
    blooming: '35',
    grind: 'средний',
    label: 'V60 тройное · 10 г / 170 мл · для 3-way compare',
  },
};

export function flightTitleFromBeans(beans: FlightBean[]): string {
  const names = beans
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((b) => b.country || b.name)
    .filter(Boolean);
  if (names.length >= 2) return `${names[0]} × ${names[1]}`;
  if (names.length === 1) return String(names[0]);
  return 'Сравнение';
}

export function presetForFlight(brewMethod?: string | null): BrewPreset {
  const key = brewMethod || 'AeroPress';
  return FLIGHT_BREW_PRESETS[key] || FLIGHT_BREW_PRESETS.AeroPress;
}

export function buildFlightCupUrl(
  flight: Pick<TastingFlight, 'id' | 'brew_method'>,
  bean: FlightBean,
  extra?: { focus?: string },
): string {
  const preset = presetForFlight(flight.brew_method);
  const q = applyRecipeToParams(
    {
      coffee_g: parseFloat(preset.coffee_g),
      water_g: parseFloat(preset.water_g),
      temp: preset.temp,
      time: preset.time,
      grind: preset.grind,
      blooming: preset.blooming_ml
        ? { ml: parseFloat(preset.blooming_ml), time: preset.blooming || '' }
        : undefined,
    },
    preset.brew,
  );
  q.set('flight_id', flight.id);
  q.set('flight_slot', String(bean.slot));
  if (bean.name) q.set('name', bean.name);
  if (bean.roaster) q.set('roaster', bean.roaster);
  if (bean.country) q.set('country', bean.country);
  if (bean.process) q.set('process', bean.process);
  if (bean.variety) q.set('variety', bean.variety);
  q.set('from_flight', '1');
  if (extra?.focus) q.set('focus', extra.focus);
  return '/add-cup?' + q.toString();
}

export type DiaryCupLike = {
  id?: string;
  name?: string | null;
  roaster?: string | null;
  rating?: number | null;
  brew_method?: string | null;
  recipe?: unknown;
  created_at?: string;
};

export function bestDiaryRecipeForBean(cups: DiaryCupLike[], bean: { name: string; roaster?: string | null }): DiaryCupLike | null {
  const nameKey = bean.name.trim().toLowerCase();
  if (!nameKey) return null;
  const roasterKey = (bean.roaster || '').trim().toLowerCase();
  const matches = cups
    .filter((c) => {
      if ((c.rating ?? 0) < 4) return false;
      if ((c.name || '').trim().toLowerCase() !== nameKey) return false;
      if (roasterKey && (c.roaster || '').trim().toLowerCase() !== roasterKey) return false;
      return Boolean(c.recipe);
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return matches[0] || null;
}

export function beanFromShelfItem(s: any, slot: number): FlightBean {
  return {
    slot,
    shelf_item_id: s.id,
    name: s.name || 'Кофе',
    roaster: s.roaster || null,
    country: s.country || null,
    process: s.process || null,
    variety: s.variety || null,
  };
}
