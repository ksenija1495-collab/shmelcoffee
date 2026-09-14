import {
  getAvailableComparisonGoals,
  goalById,
  suggestPartnersForAnchor,
  suggestPairingsForGoal,
  suggestBrewPresetKey,
  type AnchoredPartnerSuggestion,
  type ComparisonGoalId,
} from './comparisonGoals';
import type { SavedPair, ShelfBean } from './shelfAssistantPairings';
import type { DiaryCup } from './shelfAssistantDiary';
import { bestDiaryRecipeForBean } from './tastingFlights';
import { FLIGHT_BREW_PRESETS } from './tastingFlights';
import { formatCupRecipe } from './cupRecipe';
import { recommendBrew } from './brewRecommend';
import { EQUIPMENT_TAGS } from './equipmentTags';

export type BrewTodayEntry = 'bean' | 'method' | 'free';
export type BrewTodayMode = 'solo' | 'compare';

export type BrewTodayWizardState = {
  entry: BrewTodayEntry | null;
  mode: BrewTodayMode | null;
  beanId: string | null;
  method: string | null;
  goalId: ComparisonGoalId | null;
  altIndex: number;
};

export type BrewTodayPlan = {
  mode: BrewTodayMode;
  beans: {
    shelfId: string | null;
    name: string;
    country?: string | null;
    process?: string | null;
    variety?: string | null;
    roaster?: string | null;
  }[];
  brewPresetKey: string;
  brewLabel: string;
  focus: string;
  reason: string;
  diaryHint: string;
  goalId?: ComparisonGoalId;
};

const BREW_METHODS = [
  'V60',
  'Hario Switch',
  'AeroPress',
  'Chemex',
  'Френч-пресс',
  'Эспрессо',
];

function norm(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

export function diarySummaryLine(cups: DiaryCup[]): string {
  const rated = cups.filter((c) => c.rating != null);
  if (!rated.length) return 'Дневник пока пуст — подберём с полки.';
  const top = rated.filter((c) => (c.rating ?? 0) >= 4);
  const brewCounts = new Map<string, number>();
  top.forEach((c) => {
    const m = c.brew_method || '';
    if (m) brewCounts.set(m, (brewCounts.get(m) || 0) + 1);
  });
  const favBrew = [...brewCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const recent = rated.slice(0, 3).map((c) => {
    const stars = c.rating ? `${c.rating}★` : '';
    return `${c.name}${c.brew_method ? ` · ${c.brew_method}` : ''} ${stars}`.trim();
  });
  return [
    favBrew ? `Чаще 4–5★ на: ${favBrew}.` : '',
    recent.length ? `Недавно: ${recent.join('; ')}.` : '',
  ].filter(Boolean).join(' ');
}

export function diaryHintForBean(cups: DiaryCup[], bean: ShelfBean & { id?: string }): string {
  const nameKey = norm(bean.name);
  const matches = cups.filter((c) => norm(c.name) === nameKey);
  if (!matches.length) return 'В дневнике этого лота ещё не было — хороший день для первого знакомства.';

  const best = bestDiaryRecipeForBean(cups, { name: bean.name, roaster: bean.roaster });
  if (best) {
    const rec = formatCupRecipe(best.recipe);
    const stars = best.rating ? `${'★'.repeat(best.rating)}` : '';
    return `Лучшее из дневника: ${best.brew_method || 'заварка'}${rec ? ` · ${rec}` : ''} ${stars}`.trim();
  }

  const last = matches[0];
  const stars = last.rating ? `${last.rating}/5` : 'без оценки';
  return `Последняя чашка: ${last.brew_method || '—'}, ${stars}${last.comment ? ` — «${String(last.comment).slice(0, 80)}»` : ''}`;
}

function preferredDiaryBrew(cups: DiaryCup[]): string | null {
  const top = cups.filter((c) => (c.rating ?? 0) >= 4 && c.brew_method);
  const counts = new Map<string, number>();
  top.forEach((c) => counts.set(c.brew_method!, (counts.get(c.brew_method!) || 0) + 1));
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

function presetKeyForMethod(method: string, a: ShelfBean, b?: ShelfBean): string {
  if (method === 'V60') return suggestBrewPresetKey(a, b || a, 'countries');
  if (/aero/i.test(method)) return 'AeroPress';
  if (/switch/i.test(method)) return 'V60';
  return suggestBrewPresetKey(a, b || a);
}

function shelfBeanFromItem(s: any): ShelfBean & { id: string } {
  return {
    id: s.id,
    name: s.name,
    roaster: s.roaster,
    country: s.country,
    process: s.process,
    variety: s.variety,
  };
}

function planFromPair(
  pair: AnchoredPartnerSuggestion,
  shelfItems: any[],
  cups: DiaryCup[],
  mode: BrewTodayMode,
): BrewTodayPlan {
  const findShelf = (name: string) =>
    shelfItems.find((s) => norm(s.name) === norm(name) && s.kind === 'bean');

  const aItem = findShelf(pair.a);
  const bItem = mode === 'compare' ? findShelf(pair.b) : null;
  const a = aItem ? shelfBeanFromItem(aItem) : { id: '', name: pair.a };
  const b = bItem ? shelfBeanFromItem(bItem) : { id: '', name: pair.b };

  const brewPresetKey = pair.brewPresetKey || suggestBrewPresetKey(a, mode === 'compare' ? b : a, pair.goalId);
  const preset = FLIGHT_BREW_PRESETS[brewPresetKey] || FLIGHT_BREW_PRESETS.V60;
  const hints = [
    diaryHintForBean(cups, a),
    mode === 'compare' && bItem ? diaryHintForBean(cups, b) : '',
  ].filter(Boolean);

  return {
    mode,
    beans: mode === 'compare'
      ? [
          { shelfId: aItem?.id || null, name: a.name, country: a.country, process: a.process, variety: a.variety, roaster: a.roaster },
          { shelfId: bItem?.id || null, name: b.name, country: b.country, process: b.process, variety: b.variety, roaster: b.roaster },
        ]
      : [{ shelfId: aItem?.id || null, name: a.name, country: a.country, process: a.process, variety: a.variety, roaster: a.roaster }],
    brewPresetKey,
    brewLabel: preset.label,
    focus: goalById(pair.goalId).focusDefault,
    reason: pair.reason,
    diaryHint: hints.join(' · '),
    goalId: pair.goalId,
  };
}

function soloPlans(
  shelfItems: any[],
  shelfBeans: ShelfBean[],
  cups: DiaryCup[],
  state: BrewTodayWizardState,
): BrewTodayPlan[] {
  const out: BrewTodayPlan[] = [];
  const beans = shelfItems.filter((s) => s.kind === 'bean');

  if (state.beanId) {
    const item = beans.find((s) => s.id === state.beanId);
    if (item) {
      const sb = shelfBeanFromItem(item);
      const brewKey = state.method
        ? presetKeyForMethod(state.method, sb)
        : suggestBrewPresetKey(sb, sb, 'terroir');
      const preset = FLIGHT_BREW_PRESETS[brewKey] || FLIGHT_BREW_PRESETS.V60;
      const rec = recommendBrew(sb);
      out.push({
        mode: 'solo',
        beans: [{ shelfId: item.id, name: sb.name, country: sb.country, process: sb.process, variety: sb.variety, roaster: sb.roaster }],
        brewPresetKey: brewKey,
        brewLabel: preset.label,
        focus: 'Исследовать один лот: тип кислотности, сладость, тело при остывании',
        reason: rec?.why || 'Solo — чтобы услышать лот без сравнения',
        diaryHint: diaryHintForBean(cups, sb),
      });
    }
  }

  if (state.method && !state.beanId) {
    const pref = preferredDiaryBrew(cups);
    const sorted = [...beans].sort((a, b) => {
      const aMatch = cups.some((c) => norm(c.name) === norm(a.name) && (c.rating ?? 0) >= 4) ? 1 : 0;
      const bMatch = cups.some((c) => norm(c.name) === norm(b.name) && (c.rating ?? 0) >= 4) ? 1 : 0;
      return bMatch - aMatch;
    });
    for (const item of sorted.slice(0, 6)) {
      const sb = shelfBeanFromItem(item);
      const brewKey = presetKeyForMethod(state.method, sb);
      const preset = FLIGHT_BREW_PRESETS[brewKey] || FLIGHT_BREW_PRESETS.AeroPress;
      out.push({
        mode: 'solo',
        beans: [{ shelfId: item.id, name: sb.name, country: sb.country, process: sb.process, variety: sb.variety, roaster: sb.roaster }],
        brewPresetKey: brewKey,
        brewLabel: preset.label,
        focus: `Исследовать через ${state.method}: что раскрывается в этом лоте`,
        reason: `Выбран способ ${state.method} — подобран лот с полки`,
        diaryHint: diaryHintForBean(cups, sb),
      });
    }
  }

  if (!state.beanId && !state.method) {
    for (const item of beans.slice(0, 8)) {
      const sb = shelfBeanFromItem(item);
      const hasDiary = cups.some((c) => norm(c.name) === norm(sb.name));
      if (hasDiary) continue;
      const brewKey = suggestBrewPresetKey(sb, sb);
      const preset = FLIGHT_BREW_PRESETS[brewKey] || FLIGHT_BREW_PRESETS.V60;
      out.push({
        mode: 'solo',
        beans: [{ shelfId: item.id, name: sb.name, country: sb.country, process: sb.process, variety: sb.variety, roaster: sb.roaster }],
        brewPresetKey: brewKey,
        brewLabel: preset.label,
        focus: 'Первое знакомство с лотом — solo, без спешки',
        reason: 'Ещё не было в дневнике — хороший кандидат на исследование',
        diaryHint: diaryHintForBean(cups, sb),
      });
    }
    for (const item of beans) {
      const sb = shelfBeanFromItem(item);
      const best = bestDiaryRecipeForBean(cups, sb);
      if (!best || (best.rating ?? 0) < 4) continue;
      const brewKey = suggestBrewPresetKey(sb, sb);
      const preset = FLIGHT_BREW_PRESETS[brewKey] || FLIGHT_BREW_PRESETS.V60;
      out.push({
        mode: 'solo',
        beans: [{ shelfId: item.id, name: sb.name, country: sb.country, process: sb.process, variety: sb.variety, roaster: sb.roaster }],
        brewPresetKey: brewKey,
        brewLabel: preset.label,
        focus: 'Повторить удачный профиль — сравни с памятью',
        reason: 'Лот уже заходил в дневнике на 4★+ — повтори лучший рецепт',
        diaryHint: diaryHintForBean(cups, sb),
      });
    }
  }

  return out;
}

function comparePlans(
  shelfItems: any[],
  shelfBeans: ShelfBean[],
  cups: DiaryCup[],
  savedPairs: SavedPair[],
  state: BrewTodayWizardState,
): BrewTodayPlan[] {
  const goalId = state.goalId || getAvailableComparisonGoals(shelfBeans, savedPairs)[0]?.id || 'countries';
  let pairs: AnchoredPartnerSuggestion[] = [];

  if (state.beanId) {
    const item = shelfItems.find((s) => s.id === state.beanId && s.kind === 'bean');
    if (item) {
      pairs = suggestPartnersForAnchor(item.name, shelfBeans, cups, savedPairs, {
        goalId: state.goalId || undefined,
        limit: 12,
      });
    }
  } else {
    pairs = suggestPairingsForGoal(shelfBeans, cups, savedPairs, goalId, { limit: 12 });
  }

  if (state.method) {
    pairs = pairs.filter(() => true);
  }

  return pairs.map((p) => planFromPair(p, shelfItems, cups, 'compare'));
}

export function buildBrewTodayPlans(
  shelfItems: any[],
  cups: DiaryCup[],
  savedPairs: SavedPair[],
  state: BrewTodayWizardState,
): BrewTodayPlan[] {
  const shelfBeans: ShelfBean[] = shelfItems
    .filter((s) => s.kind === 'bean')
    .map((s) => ({
      name: s.name,
      roaster: s.roaster,
      country: s.country,
      process: s.process,
      variety: s.variety,
    }));

  if (!state.mode) return [];

  if (state.mode === 'solo') {
    return soloPlans(shelfItems, shelfBeans, cups, state);
  }
  return comparePlans(shelfItems, shelfBeans, cups, savedPairs, state);
}

export function pickBrewTodayPlan(
  shelfItems: any[],
  cups: DiaryCup[],
  savedPairs: SavedPair[],
  state: BrewTodayWizardState,
): BrewTodayPlan | null {
  const plans = buildBrewTodayPlans(shelfItems, cups, savedPairs, state);
  if (!plans.length) return null;
  return plans[state.altIndex % plans.length];
}

export function brewMethodOptions(equipCategories: string[]): string[] {
  const fromEquip = EQUIPMENT_TAGS
    .filter((t) => equipCategories.some((c) => norm(c).includes(norm(t.category)) || norm(c).includes(norm(t.label))))
    .map((t) => {
      if (t.id === 'v60') return 'V60';
      if (t.id === 'aeropress') return 'AeroPress';
      if (t.id === 'chemex') return 'Chemex';
      if (t.id === 'french') return 'Френч-пресс';
      if (t.id === 'espresso') return 'Эспрессо';
      return t.label;
    });
  return [...new Set([...fromEquip, ...BREW_METHODS])];
}

export const SOLO_GOALS: { id: string; label: string; focus: string }[] = [
  { id: 'discover', label: 'Познакомиться с лотом', focus: 'Первый solo — тип кислотности, сладость, тело' },
  { id: 'repeat', label: 'Повторить удачное', focus: 'Сравнить с прошлым разом из дневника' },
  { id: 'method', label: 'Попробовать способ', focus: 'Что даёт этот метод этому лоту' },
];
