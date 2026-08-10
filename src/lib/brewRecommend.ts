/**
 * Бесплатные рекомендации по заварке для зерна на полке.
 * Правила по стране (DB) + обработке + сорту — без AI и без списания кредитов гида.
 */
import { DB } from '../data/countries';
import { resolveCountryKey } from './countryResolve';
import { isVarietyBlend, varietyBlendLabel } from './varietyBlend';

export type BrewRecipeRec = {
  method: string;
  label: string;
  dose: string;
  water: string;
  temp: string;
  grind: string;
  time: string;
  note: string;
};

export type BrewRecommendation = {
  primary: BrewRecipeRec;
  secondary: BrewRecipeRec;
  why: string;
  avoid: string[];
  countryTip: string;
  headline: string;
};

export type BrewBeanInput = {
  country?: string | null;
  process?: string | null;
  variety?: string | null;
  name?: string | null;
};

type ProcessKind = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';

function processKind(process?: string | null): ProcessKind {
  const p = (process || '').toLowerCase();
  if (/анаэроб|carbonic|лакто|lactic|ферментир/.test(p)) return 'anaerobic';
  if (/натур|natural|сух/.test(p)) return 'natural';
  if (/хани|honey|пульп/.test(p)) return 'honey';
  if (/мыт|washed|wet-hulled|вет/.test(p)) return 'washed';
  return 'other';
}

function isDenseVariety(variety?: string | null, name?: string | null): boolean {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  return /sl28|sl34|батиан|batian|гейш|geisha|пакамар|pacamara|бурбон|bourbon/.test(t);
}

function isCatimorFamily(variety?: string | null, name?: string | null): boolean {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  return /катимор|catimor|катуаи|catuai|катурра|caturra/.test(t);
}

function parseAltitudeMid(altitude: string): number | null {
  const nums = altitude.match(/\d{3,4}/g)?.map(Number);
  if (!nums?.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function recipe(
  method: string,
  label: string,
  dose: string,
  water: string,
  temp: string,
  grind: string,
  time: string,
  note: string,
): BrewRecipeRec {
  return { method, label, dose, water, temp, grind, time, note };
}

export function recommendBrew(input: BrewBeanInput): BrewRecommendation | null {
  const key = resolveCountryKey(input.country, input.name);
  const country = key ? DB[key] : null;
  const pk = processKind(input.process);
  const dense = isDenseVariety(input.variety, input.name);
  const catimor = isCatimorFamily(input.variety, input.name);
  const blend = isVarietyBlend(input.variety, input.name);
  const alt = country ? parseAltitudeMid(country.altitude) : null;
  const body = country?.bLvl ?? 50;
  const acid = country?.aLvl ?? 60;
  const lightBody = body <= 45;
  const highAcid = acid >= 70;
  const highAlt = alt != null && alt >= 1700;
  const lowAlt = alt != null && alt > 0 && alt < 1400;

  // Температура: плотное высокогорье → выше; низкогорье / натурал / катимор → ниже
  let tempPrimary = 92;
  if (highAlt || dense) tempPrimary += 1;
  if (lowAlt || catimor) tempPrimary -= 2;
  if (pk === 'natural' || pk === 'anaerobic') tempPrimary -= 1;
  if (pk === 'washed' && highAcid) tempPrimary += 0;
  tempPrimary = Math.min(95, Math.max(86, tempPrimary));

  const tempSecondary = Math.min(95, Math.max(86, tempPrimary - (pk === 'washed' ? 0 : 2)));

  let primary: BrewRecipeRec;
  let secondary: BrewRecipeRec;
  let why: string;
  const avoid: string[] = [];

  if (pk === 'anaerobic') {
    primary = recipe(
      'Aeropress',
      'Первый пролив',
      '17 г',
      '85 мл',
      `${tempPrimary}°C`,
      '11',
      'настой 1:00–1:20',
      'Малый объём — ферментация остаётся громкой, без мутного хвоста',
    );
    secondary = recipe(
      'Hario Switch',
      'Второй пролив',
      '15 г',
      '240 мл',
      `${tempSecondary}°C`,
      '13',
      'иммерсия 1:15, затем слив',
      'Короче двух минут: иначе горечь обжарки обгоняет сладость',
    );
    why =
      'Анаэроб уже дал интенсивность в зерне. Задача метода — не «раскрыть» ещё сильнее, а удержать контроль: короткий контакт, умеренная температура.';
    avoid.push('Долгая иммерсия при 96°C — ферментация уезжает в алкоголь и горечь');
    avoid.push('Эспрессо первым — сожмёт сложный профиль в один плотный удар');
  } else if (pk === 'natural') {
    if (catimor || lowAlt || body >= 60) {
      primary = recipe(
        'Aeropress',
        'Первый пролив',
        '17 г',
        '85 мл',
        `${tempPrimary}°C`,
        '11',
        'настой 1:10',
        'Концентрат тела и сладости без древесного хвоста',
      );
      secondary = recipe(
        'V60',
        'Второй пролив',
        '15 г',
        '250 мл',
        `${tempSecondary + 2}°C`,
        '13',
        '5 проливов по ~50 мл, ~3:10',
        'Диагностика: есть ли фруктовая верхушка под какао/орехом',
      );
      why =
        'Натурал + плотное/низкогорное зерно растворимее обычного. Риск — переэкстракция и муть, не недобор. Малый аэропресс забирает середину; V60 проверяет, жив ли цитрус.';
    } else {
      primary = recipe(
        'Hario Switch',
        'Первый пролив',
        '15 г',
        '250 мл',
        `${tempPrimary}°C`,
        '13',
        'блум 40 мл / 0:40, иммерсия до 1:15–1:30',
        'Иммерсия тянет сладость натурала, бумага сохраняет чистоту',
      );
      secondary = recipe(
        'V60',
        'Второй пролив',
        '15 г',
        '250 мл',
        `${tempPrimary}°C`,
        '13',
        '4:6 — первый пролив 60–70 мл, затем три коротких',
        'Покажет ягодную кислотность без иммерсионной подушки',
      );
      why =
        'Натурал любит ровный контакт — сахара из мякоти раскрываются в середине экстракции. Switch даёт сладость; V60 — разрешение по дескрипторам.';
    }
    avoid.push('Колд брю — потеряешь летучую фруктовую ароматику, ради которой брали натурал');
    if (lightBody) avoid.push('Эспрессо — мало плотности, профиль схлопнется');
  } else if (pk === 'honey') {
    primary = recipe(
      'V60',
      'Первый пролив',
      '15 г',
      '240 мл',
      `${Math.min(95, tempPrimary + 1)}°C`,
      '13',
      'соотношение 1:16, ровные проливы ~3:10',
      'Чуть плотнее и теплее — хани часто «пустой» на кислоте без тела',
    );
    secondary = recipe(
      'Aeropress',
      'Второй пролив',
      '15 г',
      '180 мл + 50 мл байпас',
      `${tempSecondary}°C`,
      '12',
      'настой 1:20, затем долить водой',
      'Байпас даёт крепость без горького хвоста',
    );
    why =
      'Хани — между мытой чистотой и натуральной сладостью. Температура чуть выше вытягивает меланоидины; время контакта держим коротким, чтобы не уйти в вяжущесть.';
    avoid.push('Мелкий помол на V60 — drawdown затянется и съест медовую середину горечью');
  } else {
    // washed / other — приоритет прозрачности
    if (lightBody || highAcid) {
      primary = recipe(
        'V60',
        'Первый пролив',
        '15 г',
        '250 мл',
        `${tempPrimary}°C`,
        '13',
        '5×50 мл, интервал 45 сек, ~3:10',
        'Чайная структура и кислота читаются только в проливе',
      );
      secondary = recipe(
        'Aeropress',
        'Второй пролив',
        '15 г',
        '180 мл + 50 мл байпас',
        `${tempSecondary}°C`,
        '12',
        'настой 1:20',
        'Чуть больше тела без потери чистоты',
      );
      why =
        'Мытый лёгкий лот живёт прозрачностью. Иммерсия смажет чайность; эспрессо развалит профиль. V60 — главный метод.';
    } else {
      primary = recipe(
        'V60',
        'Первый пролив',
        '20 г',
        '300 мл',
        `${tempPrimary}°C`,
        '13',
        'схема 4:6, финиш ~3:30',
        'Классика для мытого фильтра средней плотности',
      );
      secondary = recipe(
        'Hario Switch',
        'Второй пролив',
        '15 г',
        '250 мл',
        `${tempSecondary}°C`,
        '13',
        'иммерсия ≤1:30',
        'Сравнение: сколько сладости добавляет иммерсия',
      );
      why =
        'Мытая обработка уже дала чистоту. Задача — не перегреть и не передержать: растворимые кислоты выходят рано, сладость — в середине.';
    }
    avoid.push('Switch при 96°C и 2 минутах — на фильтровой обжарке часто даёт roast-горечь');
    if (lightBody) avoid.push('Эспрессо — плотности не хватит, чашка станет пустой');
  }

  if (!avoid.some((a) => /колд/i.test(a)) && (highAcid || pk === 'natural')) {
    avoid.push('Колд брю первым знакомством — летучие ноты почти не перейдут в напиток');
  }

  const countryName = country?.name || input.country || 'это зерно';
  const processLabel = (input.process || '').replace(/\s*\([^)]*\)/, '') || 'неизвестная обработка';
  const headline = blend
    ? `${countryName} · ${processLabel} · смесь: ${varietyBlendLabel(input.variety)}`
    : `${countryName} · ${processLabel}`;

  if (blend) {
    why +=
      ' Это смесь сортов — чашка будет усреднённой: не жди чистого характера одного сорта, слушай баланс.';
  }

  return {
    primary,
    secondary,
    why,
    avoid: avoid.slice(0, 3),
    countryTip: country?.brew || 'Фильтр-методы: V60, аэропресс, Switch. Подбирай температуру под плотность зерна.',
    headline,
  };
}

export function formatBrewRecCompact(rec: BrewRecommendation): string {
  const p = rec.primary;
  return `${p.method} · ${p.dose} / ${p.water} · ${p.temp} · помол ${p.grind}`;
}

export function renderBrewRecHtml(rec: BrewRecommendation, opts?: { compact?: boolean }): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const card = (r: BrewRecipeRec) => `
    <div class="brew-rec-card">
      <div class="brew-rec-label">${esc(r.label)} · ${esc(r.method)}</div>
      <div class="brew-rec-params">${esc(r.dose)} · ${esc(r.water)} · ${esc(r.temp)} · помол ${esc(r.grind)}</div>
      <div class="brew-rec-time">${esc(r.time)}</div>
      <div class="brew-rec-note">${esc(r.note)}</div>
    </div>`;
  if (opts?.compact) {
    return `<div class="brew-rec brew-rec-compact">
      <div class="brew-rec-h">☕ Как заварить</div>
      <div class="brew-rec-params">${esc(formatBrewRecCompact(rec))}</div>
      <div class="brew-rec-note">${esc(rec.primary.note)}</div>
    </div>`;
  }
  return `<div class="brew-rec">
    <div class="brew-rec-h">☕ Как заварить</div>
    <div class="brew-rec-sub">${esc(rec.headline)}</div>
    ${card(rec.primary)}
    ${card(rec.secondary)}
    <div class="brew-rec-why"><b>Почему:</b> ${esc(rec.why)}</div>
    ${rec.avoid.length ? `<div class="brew-rec-avoid"><b>Не стоит:</b> ${rec.avoid.map(esc).join(' · ')}</div>` : ''}
  </div>`;
}
