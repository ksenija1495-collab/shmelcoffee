import { formatAeropressMode, formatCupRecipe, normalizeRecipe } from './cupRecipe';
import { formatTasteCharacterLine, normalizeTasteCharacter } from './tasteCharacter';
import { resolveCountryKey } from './countryResolve';
import { DB } from '../data/countries';

export type DiaryCup = {
  name: string;
  country?: string | null;
  process?: string | null;
  variety?: string | null;
  brew_method?: string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string;
  recipe?: unknown;
  acidity?: number | null;
  sweetness?: number | null;
  body?: number | null;
  bitterness?: number | null;
  taste_character?: unknown;
};

export type InferredPair = { a: string; b: string; note: string };

function normBeanName(name: string): string {
  return name.trim().toLowerCase();
}

function isNegativeComment(comment?: string | null): boolean {
  const t = (comment || '').toLowerCase();
  return /водянист|горч|кисл|слаб|пуст|плоск|не хватило|разочар|много байпас/.test(t);
}

function cupSortKey(c: DiaryCup): number {
  const rating = c.rating ?? 0;
  const ts = c.created_at ? Date.parse(c.created_at) : 0;
  return rating * 1e12 + ts;
}

function formatBestCupLine(c: DiaryCup): string {
  const brew = c.brew_method || 'метод?';
  const rating = c.rating ? `${c.rating}★` : 'без оценки';
  const recipe = formatCupRecipe(c.recipe);
  const note = c.comment ? ` — «${String(c.comment).slice(0, 100)}»` : '';
  return `${brew} ${rating}${recipe ? ` · ${recipe}` : ''}${note}`;
}

/** Лучший рецепт на лот + что не повторять — детерминированный приоритет для IVAN. */
export function buildBeanBrewPriorityBlock(cups: DiaryCup[]): string {
  const byBean = new Map<string, DiaryCup[]>();
  for (const c of cups) {
    if (!c.name?.trim()) continue;
    const key = normBeanName(c.name);
    const list = byBean.get(key) || [];
    list.push(c);
    byBean.set(key, list);
  }

  if (!byBean.size) {
    return 'Пока нет данных для приоритетных рецептов по лотам.';
  }

  const lines: string[] = [];
  const sortedBeans = [...byBean.entries()].sort((a, b) => {
    const bestA = Math.max(...a[1].map((c) => c.rating ?? 0));
    const bestB = Math.max(...b[1].map((c) => c.rating ?? 0));
    return bestB - bestA || a[0].localeCompare(b[0], 'ru');
  });

  for (const [, beanCups] of sortedBeans) {
    const rated = beanCups.filter((c) => c.rating != null);
    if (!rated.length) continue;

    const best = [...rated].sort((a, b) => cupSortKey(b) - cupSortKey(a))[0];
    if ((best.rating ?? 0) < 4) continue;

    const displayName = best.name;
    const avoid = rated.filter((c) => {
      if (c === best) return false;
      if ((c.rating ?? 0) <= 3) return true;
      if ((c.rating ?? 0) < (best.rating ?? 0)) return true;
      if ((c.rating ?? 0) <= 4 && isNegativeComment(c.comment)) return true;
      return false;
    });

    let line = `- ${displayName} → ЛУЧШИЙ: ${formatBestCupLine(best)}`;
    if (avoid.length) {
      const avoidBits = avoid
        .slice(0, 3)
        .map((c) => `${c.brew_method || '?'} ${c.rating}★${c.comment ? ` («${String(c.comment).slice(0, 60)}»)` : ''}`)
        .join('; ');
      line += `. НЕ ПОВТОРЯТЬ: ${avoidBits}`;
    }
    lines.push(line);
  }

  return lines.length
    ? lines.join('\n')
    : 'Нет лотов с 4–5★ в дневнике — ориентируйся на общие правила методов.';
}

/** Паттерн малых чашек из топ-AP записей дневника. */
export function buildSmallVolumePatternBlock(cups: DiaryCup[]): string {
  const apTop = cups.filter(
    (c) =>
      (c.rating ?? 0) >= 4 &&
      /aeropress|аэропресс/i.test(c.brew_method || ''),
  );
  if (!apTop.length) return '';

  const samples = apTop
    .map((c) => {
      const r = normalizeRecipe(c.recipe);
      if (!r?.coffee_g) return null;
      const brewMl = r.water_g ?? null;
      const bypassMl = r.pours?.find((p) => p.role === 'bypass')?.ml ?? null;
      const total = brewMl != null ? brewMl + (bypassMl ?? 0) : null;
      return {
        name: c.name,
        rating: c.rating,
        coffee_g: r.coffee_g,
        brewMl,
        bypassMl,
        total,
        apMode: formatAeropressMode(r.aeropress_mode),
        comment: c.comment,
      };
    })
    .filter(Boolean) as Array<{
    name: string;
    rating: number | null | undefined;
    coffee_g: number;
    brewMl: number | null;
    bypassMl: number | null;
    total: number | null;
    apMode: string;
    comment?: string | null;
  }>;

  const concentrates = samples.filter((s) => s.brewMl != null && s.brewMl <= 100);
  if (!concentrates.length) return '';

  const best = [...concentrates].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (a.total ?? 999) - (b.total ?? 999),
  )[0];

  const parts = [
    `Паттерн «малый объём» из дневника (4–5★ на AP):`,
    `концентрат ~${best.coffee_g} г / ${best.brewMl} мл в AP`,
    best.bypassMl ? `+ bypass ~${best.bypassMl} мл` : null,
    best.total ? `(итого ~${best.total} мл в чашке)` : null,
    best.apMode ? `· ${best.apMode}` : null,
    `— пример: ${best.name}${best.comment ? ` («${String(best.comment).slice(0, 80)}»)` : ''}.`,
    `Если просят «мало / одну чашку / небольшой объём» — не предлагай Switch 250 мл; предлагай этот формат или лучший рецепт лота из блока выше.`,
  ].filter(Boolean);

  return parts.join(' ');
}

function isFermented(process?: string | null, name?: string | null): boolean {
  const t = `${process || ''} ${name || ''}`.toLowerCase();
  return /анаэроб|anaerobic|carbonic|лакто|lactic|фермент|natural|натур|honey|хани/.test(t);
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Профиль вкуса из дневника — приоритетнее квиза. */
export function buildDiaryProfileBlock(cups: DiaryCup[]): string {
  const rated = cups.filter((c) => c.rating != null);
  if (!rated.length) {
    return 'Дневник пуст или без оценок — ориентируйся на полку и квиз осторожно.';
  }

  const top = rated.filter((c) => (c.rating ?? 0) >= 4);
  const low = rated.filter((c) => (c.rating ?? 0) <= 3);

  const topCountries = countBy(top, (c) => resolveCountryKey(c.country, c.name) || c.country || '');
  const topBrews = countBy(top, (c) => c.brew_method || '');
  const fermentedTop = top.filter((c) => isFermented(c.process, c.name)).length;
  const fermentedLow = low.filter((c) => isFermented(c.process, c.name)).length;

  const sensoryTop = {
    acidity: avg(top.map((c) => c.acidity).filter((n): n is number => n != null)),
    sweetness: avg(top.map((c) => c.sweetness).filter((n): n is number => n != null)),
    body: avg(top.map((c) => c.body).filter((n): n is number => n != null)),
    bitterness: avg(top.map((c) => c.bitterness).filter((n): n is number => n != null)),
  };

  const lines: string[] = [];
  lines.push(`Чашек с оценкой: ${rated.length}, из них ${top.length} на 4–5★.`);

  const countryLabel = (k: string) => (k && DB[k]?.name) || k || '?';
  const countryLine = [...topCountries.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, n]) => `${countryLabel(k)} (${n}×)`)
    .join(', ');
  if (countryLine) lines.push(`Любимые origin в дневнике: ${countryLine}.`);

  const brewLine = [...topBrews.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => `${k} (${n}×)`)
    .join(', ');
  if (brewLine) lines.push(`Чаще заваривает: ${brewLine}.`);

  if (fermentedTop >= 2 && fermentedTop > fermentedLow) {
    lines.push('Паттерн: ферментированные/анаэробные лоты чаще получают высокие оценки.');
  }
  if (fermentedLow >= 2 && fermentedLow > fermentedTop) {
    lines.push('Паттерн: на ферментированных бывают низкие оценки — предлагай контролируемую заварку.');
  }

  const sensParts = [
    sensoryTop.acidity != null ? `кисл ${sensoryTop.acidity}` : null,
    sensoryTop.sweetness != null ? `слад ${sensoryTop.sweetness}` : null,
    sensoryTop.body != null ? `тело ${sensoryTop.body}` : null,
    sensoryTop.bitterness != null ? `гор ${sensoryTop.bitterness}` : null,
  ].filter(Boolean);
  if (sensParts.length) lines.push(`Средняя сенсорика топ-чашек: ${sensParts.join(', ')}.`);

  if (low.length) {
    const avoid = low
      .slice(0, 4)
      .map((c) => `${c.name}${c.rating ? ` (${c.rating}★)` : ''}`)
      .join('; ');
    lines.push(`Не понравилось / слабее: ${avoid}.`);
  }

  return lines.join('\n');
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

export function formatDiaryCupLine(c: DiaryCup): string {
  const date = c.created_at?.slice(0, 10) || '';
  const rating = c.rating ? `${c.rating}/5` : 'без оценки';
  const brew = c.brew_method ? `, ${c.brew_method}` : '';
  const meta = [c.country, c.process, c.variety].filter(Boolean).join(' · ');
  const sens = [
    c.acidity != null ? `кисл ${c.acidity}` : null,
    c.sweetness != null ? `слад ${c.sweetness}` : null,
    c.body != null ? `тело ${c.body}` : null,
    c.bitterness != null ? `гор ${c.bitterness}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const charLine = formatTasteCharacterLine(normalizeTasteCharacter(c.taste_character));
  const recipe = formatCupRecipe(c.recipe);
  const note = c.comment ? ` — «${String(c.comment).slice(0, 140)}»` : '';
  const extras = [meta, sens, charLine, recipe ? `рецепт: ${recipe}` : null]
    .filter(Boolean)
    .join('; ');
  return `- ${date}: ${c.name}${brew}, ${rating}${extras ? ` (${extras})` : ''}${note}`;
}

/** Пары из одного дня дегустации с оценками 4+ и разными странами. */
export function inferDiaryPairs(cups: DiaryCup[]): InferredPair[] {
  const byDate = new Map<string, DiaryCup[]>();
  for (const c of cups) {
    if ((c.rating ?? 0) < 4) continue;
    const d = c.created_at?.slice(0, 10);
    if (!d) continue;
    const list = byDate.get(d) || [];
    list.push(c);
    byDate.set(d, list);
  }

  const pairs: InferredPair[] = [];
  const seen = new Set<string>();

  for (const dayCups of byDate.values()) {
    for (let i = 0; i < dayCups.length; i++) {
      for (let j = i + 1; j < dayCups.length; j++) {
        const a = dayCups[i];
        const b = dayCups[j];
        const ckA = resolveCountryKey(a.country, a.name);
        const ckB = resolveCountryKey(b.country, b.name);
        if (ckA && ckB && ckA === ckB) continue;
        const key = [a.name, b.name].sort().join('\0');
        if (seen.has(key)) continue;
        seen.add(key);
        const comments = [a.comment, b.comment].filter(Boolean).join('; ');
        pairs.push({
          a: a.name,
          b: b.name,
          note: comments || `сравнение ${a.created_at?.slice(0, 10) || ''}, оба ${a.rating}–${b.rating}★`,
        });
      }
    }
  }

  return pairs.slice(0, 6);
}
