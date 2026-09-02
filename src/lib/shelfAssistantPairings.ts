import { DB } from '../data/countries';
import { resolveCountryKey } from './countryResolve';
import type { DiaryCup } from './shelfAssistantDiary';

export type ShelfBean = {
  name: string;
  roaster?: string | null;
  country?: string | null;
  process?: string | null;
  variety?: string | null;
};

export type PairSuggestion = {
  a: string;
  b: string;
  reason: string;
  score: number;
};

export type SavedPair = {
  bean_a: string;
  bean_b: string;
  note?: string | null;
};

type ProcessKind = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';

function processKind(process?: string | null, name?: string | null): ProcessKind {
  const p = `${process || ''} ${name || ''}`.toLowerCase();
  if (/анаэроб|anaerobic|carbonic|лакто|lactic|ферментир/.test(p)) return 'anaerobic';
  if (/натур|natural|сух/.test(p)) return 'natural';
  if (/хани|honey|пульп/.test(p)) return 'honey';
  if (/мыт|washed|wet/.test(p)) return 'washed';
  return 'other';
}

export function varietyFamily(variety?: string | null, name?: string | null): string {
  const t = `${variety || ''} ${name || ''}`.toLowerCase();
  if (/катимор|catimor/.test(t)) return 'catimor';
  if (/катуаи|catuai|катурра|caturra/.test(t)) return 'caturra-catuai';
  if (/стармай|starmaya/.test(t)) return 'starmaya';
  if (/гейш|geisha/.test(t)) return 'geisha';
  if (/sl28|sl34|бурбон|bourbon|батиан|batian/.test(t)) return 'dense';
  return 'other';
}

export function varietyFamilyLabel(family: string): string {
  const labels: Record<string, string> = {
    dense: 'бурбон',
    geisha: 'гейша',
    catimor: 'катимор',
    'caturra-catuai': 'caturra/catuai',
    starmaya: 'starmaya',
    other: 'сорт',
  };
  return labels[family] || 'сорт';
}

export function effectiveVarietyFamily(
  bean: Pick<ShelfBean, 'variety' | 'name' | 'country'>,
): string {
  const vf = varietyFamily(bean.variety, bean.name);
  if (vf !== 'other') return vf;
  const ck = resolveCountryKey(bean.country, bean.name);
  if (ck && /^(rwanda|burundi|drcongo)$/.test(ck)) return 'dense';
  return 'other';
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('\0');
}

export function scoreShelfPair(
  A: ShelfBean,
  B: ShelfBean,
  _shelf: ShelfBean[],
  cups: DiaryCup[],
  savedPairs: SavedPair[] = [],
): PairSuggestion {
  const lowRated = new Set(
    cups.filter((c) => (c.rating ?? 0) <= 3).map((c) => c.name.toLowerCase()),
  );
  const topCountries = new Set(
    cups
      .filter((c) => (c.rating ?? 0) >= 4)
      .map((c) => resolveCountryKey(c.country, c.name))
      .filter(Boolean) as string[],
  );
  const savedKeys = new Set(savedPairs.map((p) => pairKey(p.bean_a, p.bean_b)));

  const ckA = resolveCountryKey(A.country, A.name);
  const ckB = resolveCountryKey(B.country, B.name);
  const pkA = processKind(A.process, A.name);
  const pkB = processKind(B.process, B.name);
  const vfA = effectiveVarietyFamily(A);
  const vfB = effectiveVarietyFamily(B);

  let score = 0;
  const reasons: string[] = [];

  if (ckA && ckB && ckA !== ckB) {
    score += 4;
    reasons.push('разные страны — контраст терруара');
  } else if (ckA && ckB && ckA === ckB) {
    score -= 2;
    if (pkA !== pkB) {
      score += 2;
      reasons.push('одна страна, но разная обработка');
    } else if (vfA !== vfB) {
      score += 1;
      reasons.push('одна страна, разные сорта');
    } else {
      reasons.push('одна страна и похожий профиль — слабее для сравнения');
    }
  }

  if (pkA !== pkB && (pkA === 'anaerobic' || pkB === 'anaerobic' || pkA === 'natural' || pkB === 'natural')) {
    score += 2;
    reasons.push('контраст обработки (чистое vs фермент)');
  }

  if (vfA === vfB && vfA !== 'other' && ckA && ckB && ckA !== ckB) {
    score += 5;
    reasons.unshift(`один сорт (${varietyFamilyLabel(vfA)}) — терруар, не генетика`);
  } else if (vfA !== vfB) {
    score += 1;
    reasons.push('разные сорта');
  }

  const countryPair = [ckA, ckB].filter(Boolean).sort().join('-');
  if (countryPair === 'drcongo-rwanda') {
    score += 2;
    reasons.push('Киву: Руанда чайнее, Конго смородиннее');
  } else if (countryPair === 'burundi-rwanda') {
    score += 1;
    reasons.push('соседи: Руанда мягче, Бурунди ягоднее');
  }

  if (ckA && topCountries.has(ckA)) score += 1;
  if (ckB && topCountries.has(ckB)) score += 1;

  if (lowRated.has(A.name.toLowerCase()) || lowRated.has(B.name.toLowerCase())) {
    score -= 3;
    reasons.push('один из лотов уже получал ≤3★');
  }

  if (savedKeys.has(pairKey(A.name, B.name))) {
    score += 5;
    reasons.push('пользователь уже отмечал эту пару');
  }

  const axis = `${ckA || ''}-${ckB || ''}`;
  if (/china.*brazil|brazil.*china/.test(axis)) {
    score += 2;
    reasons.push('Китай × Бразилия — чай/орех vs фрукт/сладость');
  }
  if (/china.*indonesia|indonesia.*china/.test(axis)) {
    score += 1;
    reasons.push('Азия vs Азия, но разная логика обработки');
  }

  return { a: A.name, b: B.name, score, reason: reasons.slice(0, 3).join('; ') || 'пара с полки' };
}

function countrySnippet(countryKey: string | null): string {
  if (!countryKey || !DB[countryKey]) return '';
  const c = DB[countryKey];
  return `типичные ноты: ${(c.flavors || []).slice(0, 4).join(', ')}; заварка: ${(c.brew || '').slice(0, 120)}`;
}

export function shelfBeanWithCountryHint(bean: ShelfBean): string {
  const key = resolveCountryKey(bean.country, bean.name);
  const meta = [bean.country, bean.process, bean.variety].filter(Boolean).join(' · ');
  const hint = countrySnippet(key);
  return `${bean.name}${bean.roaster ? ` (${bean.roaster})` : ''} — ${meta || '—'}${hint ? `\n   ${hint}` : ''}`;
}

export function suggestPairings(
  shelf: ShelfBean[],
  cups: DiaryCup[],
  savedPairs: SavedPair[] = [],
): PairSuggestion[] {
  if (shelf.length < 2) return [];

  const out: PairSuggestion[] = [];

  for (let i = 0; i < shelf.length; i++) {
    for (let j = i + 1; j < shelf.length; j++) {
      const scored = scoreShelfPair(shelf[i], shelf[j], shelf, cups, savedPairs);
      if (scored.score < 2) continue;
      out.push(scored);
    }
  }

  return out.sort((x, y) => y.score - x.score).slice(0, 8);
}

export function formatPairSuggestions(pairs: PairSuggestion[]): string {
  if (!pairs.length) return 'Недостаточно зёрен на полке для пар.';
  return pairs.map((p, i) => `${i + 1}. ${p.a} × ${p.b} — ${p.reason}`).join('\n');
}

export function formatSavedPairs(pairs: SavedPair[]): string {
  if (!pairs.length) return '';
  return pairs
    .slice(0, 8)
    .map((p) => `- ${p.bean_a} × ${p.bean_b}${p.note ? ` — «${String(p.note).slice(0, 100)}»` : ''}`)
    .join('\n');
}
