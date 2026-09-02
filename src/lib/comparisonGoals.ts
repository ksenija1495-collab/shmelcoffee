import { resolveCountryKey } from './countryResolve';
import type { DiaryCup } from './shelfAssistantDiary';
import type { PairSuggestion, SavedPair, ShelfBean } from './shelfAssistantPairings';
import { pairKey, scoreShelfPair, effectiveVarietyFamily } from './shelfAssistantPairings';

export type ComparisonGoalId =
  | 'terroir'
  | 'countries'
  | 'process'
  | 'variety'
  | 'acidity'
  | 'sweetness_body'
  | 'saved';

export type ComparisonGoal = {
  id: ComparisonGoalId;
  emoji: string;
  label: string;
  focusDefault: string;
};

export const COMPARISON_GOALS: ComparisonGoal[] = [
  {
    id: 'terroir',
    emoji: '🌋',
    label: 'Сорт × терруар',
    focusDefault:
      'Один сорт — разное происхождение: тип кислотности, сладость, тело и длина послевкусия при остывании',
  },
  {
    id: 'countries',
    emoji: '🌍',
    label: 'Страны',
    focusDefault: 'Терруар: откуда чувствуется происхождение — кислотность, сладость, аромат',
  },
  {
    id: 'process',
    emoji: '🧪',
    label: 'Обработку',
    focusDefault: 'Обработка: чистота vs фермент, сухость vs сочность, послевкусие',
  },
  {
    id: 'variety',
    emoji: '🌱',
    label: 'Сорт',
    focusDefault: 'Сорт: плотность, сладость, характер кислотности при одном методе',
  },
  {
    id: 'acidity',
    emoji: '🍋',
    label: 'Кислотность',
    focusDefault: 'Кислотность: яркость и тип — цитрус, ягода, чайность, а не «кисло»',
  },
  {
    id: 'sweetness_body',
    emoji: '🍯',
    label: 'Сладость и тело',
    focusDefault: 'Сладость и тело: текстура, сладость, сухой vs сочный финиш',
  },
  {
    id: 'saved',
    emoji: '⭐',
    label: 'Удачные пары',
    focusDefault: 'Повтор: что снова отличается — закрепи прошлый успех',
  },
];

const TERROIR_PAIR_HINTS: Record<string, string> = {
  'drcongo-rwanda':
    'Руанда — чай, цитрус, карамель; Конго — смородина, малина, длиннее финиш',
  'burundi-rwanda': 'Руанда мягче и чайнее; Бурунди ягоднее и ярче',
  'burundi-drcongo': 'Оба бурбон у озера: Бурунди чище, Конго «дичее»',
  'kenya-rwanda': 'Кения — томат и смородина; Руанда — мягче, цитрус',
  'kenya-burundi': 'Кения плотнее и «томатнее»; Бурунди чайнее',
  'colombia-peru': 'Оба бурбон в Андах: Колумбия ярче, Перу мягче и шоколаднее',
  'bolivia-kenya': 'SL28/батиан: Боливия персик, Кения смородина — сорт vs терруар',
};

const BRIGHT_COUNTRIES = new Set([
  'ethiopia', 'kenya', 'rwanda', 'burundi', 'drcongo', 'malawi', 'colombia', 'panama',
]);
const LOW_ACID_COUNTRIES = new Set(['brazil', 'indonesia', 'yemen', 'bolivia', 'guatemala', 'hawaii']);
const AFRICAN_BRIGHT = new Set(['ethiopia', 'kenya', 'rwanda', 'burundi', 'drcongo', 'malawi']);

function isWashed(process?: string | null, name?: string | null): boolean {
  const p = `${process || ''} ${name || ''}`.toLowerCase();
  if (/натур|natural|хани|honey|анаэроб|anaerobic/.test(p)) return false;
  return /мыт|washed|wet/.test(p) || Boolean(process || name);
}

/** Рекомендуемый ключ пресета из FLIGHT_BREW_PRESETS. */
export function suggestBrewPresetKey(
  a: ShelfBean,
  b: ShelfBean,
  goalId?: ComparisonGoalId,
): string {
  const ckA = resolveCountryKey(a.country, a.name);
  const ckB = resolveCountryKey(b.country, b.name);
  const bothAfrican = Boolean(ckA && ckB && AFRICAN_BRIGHT.has(ckA) && AFRICAN_BRIGHT.has(ckB));
  const bothWashed = isWashed(a.process, a.name) && isWashed(b.process, b.name);
  const terroir = isTerroirPair(a, b);

  if ((goalId === 'terroir' || terroir) && bothAfrican && bothWashed) return 'V60 (африка)';
  if (bothAfrican && bothWashed) return 'V60 (африка)';
  if (goalId === 'terroir' || terroir) return 'V60';
  return 'AeroPress';
}

function processKind(process?: string | null, name?: string | null): string {
  const p = `${process || ''} ${name || ''}`.toLowerCase();
  if (/анаэроб|anaerobic|carbonic|лакто|lactic|ферментир/.test(p)) return 'anaerobic';
  if (/натур|natural|сух/.test(p)) return 'natural';
  if (/хани|honey|пульп/.test(p)) return 'honey';
  if (/мыт|washed|wet/.test(p)) return 'washed';
  return 'other';
}

function acidityAxis(countryKey: string | null): 'bright' | 'low' | 'mid' {
  if (!countryKey) return 'mid';
  if (BRIGHT_COUNTRIES.has(countryKey)) return 'bright';
  if (LOW_ACID_COUNTRIES.has(countryKey)) return 'low';
  return 'mid';
}

export function isTerroirPair(a: ShelfBean, b: ShelfBean): boolean {
  const ckA = resolveCountryKey(a.country, a.name);
  const ckB = resolveCountryKey(b.country, b.name);
  const vfA = effectiveVarietyFamily(a);
  const vfB = effectiveVarietyFamily(b);
  return vfA === vfB && vfA !== 'other' && Boolean(ckA && ckB && ckA !== ckB);
}

export function terroirCompareHint(a: ShelfBean, b: ShelfBean): string {
  if (!isTerroirPair(a, b)) return '';
  const ckA = resolveCountryKey(a.country, a.name);
  const ckB = resolveCountryKey(b.country, b.name);
  const key = [ckA, ckB].filter(Boolean).sort().join('-');
  return (
    TERROIR_PAIR_HINTS[key] ||
    'Смотри: тип кислотности (цитрус vs ягода), сладость (карамель vs фрукт), тело при остывании'
  );
}

function pairMatchesGoal(
  a: ShelfBean,
  b: ShelfBean,
  goalId: ComparisonGoalId,
  savedKeys: Set<string>,
): boolean {
  const ckA = resolveCountryKey(a.country, a.name);
  const ckB = resolveCountryKey(b.country, b.name);
  const pkA = processKind(a.process, a.name);
  const pkB = processKind(b.process, b.name);
  const vfA = effectiveVarietyFamily(a);
  const vfB = effectiveVarietyFamily(b);

  switch (goalId) {
    case 'terroir':
      return isTerroirPair(a, b);
    case 'countries':
      return Boolean(ckA && ckB && ckA !== ckB);
    case 'process':
      return pkA !== pkB && pkA !== 'other' && pkB !== 'other';
    case 'variety':
      return vfA !== vfB && !(vfA === 'other' && vfB === 'other');
    case 'acidity': {
      const axA = acidityAxis(ckA);
      const axB = acidityAxis(ckB);
      return (axA === 'bright' && axB === 'low') || (axA === 'low' && axB === 'bright');
    }
    case 'sweetness_body':
      return (
        (pkA === 'natural' || pkA === 'anaerobic' || pkA === 'honey') &&
        (pkB === 'washed' || pkB === 'other')
      ) || (
        (pkB === 'natural' || pkB === 'anaerobic' || pkB === 'honey') &&
        (pkA === 'washed' || pkA === 'other')
      );
    case 'saved':
      return savedKeys.has(pairKey(a.name, b.name));
    default:
      return true;
  }
}

function enrichPair(
  a: ShelfBean,
  b: ShelfBean,
  scored: PairSuggestion,
  savedPairs: SavedPair[],
): AnchoredPartnerSuggestion {
  const goalId = inferBestGoalForPair(a, b, savedPairs);
  const terroirHint = goalId === 'terroir' ? terroirCompareHint(a, b) : undefined;
  const brewPresetKey = suggestBrewPresetKey(a, b, goalId);
  let reason = scored.reason;
  if (terroirHint && !reason.includes(terroirHint.slice(0, 20))) {
    reason = reason ? `${reason}; ${terroirHint}` : terroirHint;
  }
  return {
    ...scored,
    a: a.name,
    b: b.name,
    goalId,
    reason,
    terroirHint,
    brewPresetKey,
  };
}

export function getAvailableComparisonGoals(
  shelf: ShelfBean[],
  savedPairs: SavedPair[] = [],
): ComparisonGoal[] {
  if (shelf.length < 2) return [];
  const savedKeys = new Set(savedPairs.map((p) => pairKey(p.bean_a, p.bean_b)));
  return COMPARISON_GOALS.filter((g) => {
    for (let i = 0; i < shelf.length; i++) {
      for (let j = i + 1; j < shelf.length; j++) {
        if (pairMatchesGoal(shelf[i], shelf[j], g.id, savedKeys)) return true;
      }
    }
    return false;
  });
}

export function suggestPairingsForGoal(
  shelf: ShelfBean[],
  cups: DiaryCup[],
  savedPairs: SavedPair[],
  goalId: ComparisonGoalId,
  opts?: { limit?: number; excludeKeys?: string[] },
): AnchoredPartnerSuggestion[] {
  if (shelf.length < 2) return [];
  const savedKeys = new Set(savedPairs.map((p) => pairKey(p.bean_a, p.bean_b)));
  const exclude = new Set(opts?.excludeKeys ?? []);
  const out: AnchoredPartnerSuggestion[] = [];

  for (let i = 0; i < shelf.length; i++) {
    for (let j = i + 1; j < shelf.length; j++) {
      const A = shelf[i];
      const B = shelf[j];
      if (!pairMatchesGoal(A, B, goalId, savedKeys)) continue;
      const key = pairKey(A.name, B.name);
      if (exclude.has(key)) continue;
      const scored = scoreShelfPair(A, B, shelf, cups, savedPairs);
      if (scored.score < 1) continue;
      out.push(enrichPair(A, B, scored, savedPairs));
    }
  }

  return out.sort((x, y) => y.score - x.score).slice(0, opts?.limit ?? 8);
}

export type AnchoredPartnerSuggestion = PairSuggestion & {
  goalId: ComparisonGoalId;
  terroirHint?: string;
  brewPresetKey?: string;
};

export function inferBestGoalForPair(
  a: ShelfBean,
  b: ShelfBean,
  savedPairs: SavedPair[] = [],
): ComparisonGoalId {
  const savedKeys = new Set(savedPairs.map((p) => pairKey(p.bean_a, p.bean_b)));
  const priority: ComparisonGoalId[] = [
    'saved',
    'terroir',
    'countries',
    'process',
    'variety',
    'acidity',
    'sweetness_body',
  ];
  for (const goalId of priority) {
    if (pairMatchesGoal(a, b, goalId, savedKeys)) return goalId;
  }
  return 'countries';
}

export function suggestPartnersForAnchor(
  anchorName: string,
  shelf: ShelfBean[],
  cups: DiaryCup[],
  savedPairs: SavedPair[] = [],
  opts?: { limit?: number; goalId?: ComparisonGoalId },
): AnchoredPartnerSuggestion[] {
  const anchor = shelf.find((s) => s.name === anchorName);
  if (!anchor) return [];

  const out: AnchoredPartnerSuggestion[] = [];
  for (const other of shelf) {
    if (other.name === anchor.name) continue;
    const scored = scoreShelfPair(anchor, other, shelf, cups, savedPairs);
    if (scored.score < 1) continue;
    const enriched = enrichPair(anchor, other, scored, savedPairs);
    if (opts?.goalId && enriched.goalId !== opts.goalId) continue;
    out.push(enriched);
  }

  return out.sort((x, y) => y.score - x.score).slice(0, opts?.limit ?? 12);
}

export function goalById(id: ComparisonGoalId): ComparisonGoal {
  return COMPARISON_GOALS.find((g) => g.id === id) ?? COMPARISON_GOALS[0];
}
