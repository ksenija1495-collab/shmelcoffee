import { resolveCountryKey } from './countryResolve';
import type { DiaryCup } from './shelfAssistantDiary';
import type { PairSuggestion, SavedPair, ShelfBean } from './shelfAssistantPairings';
import { pairKey, scoreShelfPair } from './shelfAssistantPairings';

export type ComparisonGoalId =
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

const BRIGHT_COUNTRIES = new Set([
  'ethiopia', 'kenya', 'rwanda', 'burundi', 'malawi', 'drcongo', 'colombia', 'panama',
]);
const LOW_ACID_COUNTRIES = new Set(['brazil', 'indonesia', 'yemen', 'bolivia', 'guatemala', 'hawaii']);

function processKind(process?: string | null, name?: string | null): string {
  const p = `${process || ''} ${name || ''}`.toLowerCase();
  if (/анаэроб|anaerobic|carbonic|лакто|lactic|ферментир/.test(p)) return 'anaerobic';
  if (/натур|natural|сух/.test(p)) return 'natural';
  if (/хани|honey|пульп/.test(p)) return 'honey';
  if (/мыт|washed|wet/.test(p)) return 'washed';
  return 'other';
}

function varietyFamily(variety?: string | null, name?: string | null): string {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  if (/катимор|catimor/.test(t)) return 'catimor';
  if (/катуаи|catuai|катурра|caturra/.test(t)) return 'caturra-catuai';
  if (/стармай|starmaya/.test(t)) return 'starmaya';
  if (/гейш|geisha/.test(t)) return 'geisha';
  if (/sl28|sl34|бурбон|bourbon|батиан|batian/.test(t)) return 'dense';
  return 'other';
}

function acidityAxis(countryKey: string | null): 'bright' | 'low' | 'mid' {
  if (!countryKey) return 'mid';
  if (BRIGHT_COUNTRIES.has(countryKey)) return 'bright';
  if (LOW_ACID_COUNTRIES.has(countryKey)) return 'low';
  return 'mid';
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
  const vfA = varietyFamily(a.variety, a.name);
  const vfB = varietyFamily(b.variety, b.name);

  switch (goalId) {
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
): PairSuggestion[] {
  if (shelf.length < 2) return [];
  const savedKeys = new Set(savedPairs.map((p) => pairKey(p.bean_a, p.bean_b)));
  const exclude = new Set(opts?.excludeKeys ?? []);
  const out: PairSuggestion[] = [];

  for (let i = 0; i < shelf.length; i++) {
    for (let j = i + 1; j < shelf.length; j++) {
      const A = shelf[i];
      const B = shelf[j];
      if (!pairMatchesGoal(A, B, goalId, savedKeys)) continue;
      const key = pairKey(A.name, B.name);
      if (exclude.has(key)) continue;
      const scored = scoreShelfPair(A, B, shelf, cups, savedPairs);
      if (scored.score < 1) continue;
      out.push(scored);
    }
  }

  return out.sort((x, y) => y.score - x.score).slice(0, opts?.limit ?? 8);
}

export type AnchoredPartnerSuggestion = PairSuggestion & { goalId: ComparisonGoalId };

export function inferBestGoalForPair(
  a: ShelfBean,
  b: ShelfBean,
  savedPairs: SavedPair[] = [],
): ComparisonGoalId {
  const savedKeys = new Set(savedPairs.map((p) => pairKey(p.bean_a, p.bean_b)));
  const priority: ComparisonGoalId[] = [
    'saved',
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
    const goalId = inferBestGoalForPair(anchor, other, savedPairs);
    if (opts?.goalId && goalId !== opts.goalId) continue;
    out.push({ ...scored, a: anchor.name, b: other.name, goalId });
  }

  return out.sort((x, y) => y.score - x.score).slice(0, opts?.limit ?? 12);
}

export function goalById(id: ComparisonGoalId): ComparisonGoal {
  return COMPARISON_GOALS.find((g) => g.id === id) ?? COMPARISON_GOALS[0];
}
