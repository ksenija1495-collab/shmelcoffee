import { DB, countryOrder } from '../data/countries';
import { resolveCountryKey } from './countryResolve';
import { formatCupRecipe } from './cupRecipe';
import { frequentRecipesFromCups, type FrequentRecipe } from './accountRecipesPanel';

export type CupInsightRow = {
  id?: string;
  name?: string | null;
  roaster?: string | null;
  country?: string | null;
  brew_method?: string | null;
  rating?: number | null;
  recipe?: unknown;
  created_at?: string;
};

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function cupCountsByCountryKey(cups: CupInsightRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of cups) {
    const k = resolveCountryKey(c.country, c.name);
    if (!k) continue;
    out.set(k, (out.get(k) || 0) + 1);
  }
  return out;
}

export function topRatedCups(cups: CupInsightRow[], limit = 5): CupInsightRow[] {
  return cups
    .filter((c) => (c.rating ?? 0) >= 4)
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    )
    .slice(0, limit);
}

export function renderDiscoCountryGrid(
  openedKeys: Set<string>,
  cupCounts: Map<string, number>,
): string {
  return countryOrder
    .map((k: string) => {
      const c = DB[k as keyof typeof DB];
      const open = openedKeys.has(k);
      const n = cupCounts.get(k) || 0;
      const countLabel = n ? ` · ${n}` : '';
      return `<span class="disco-chip ${open ? 'open' : 'closed'}" data-k="${k}">${c.flag} ${c.name}${open ? ' ✓' : ''}${countLabel}</span>`;
    })
    .join('');
}

export function renderProfileInsightsSection(cups: CupInsightRow[]): string {
  if (!cups.length) return '';
  const top = topRatedCups(cups, 5);
  const freq: FrequentRecipe[] = frequentRecipesFromCups(cups, 3);
  const topHtml = top.length
    ? `<div class="sub-h" style="margin-top:0;font-size:.78rem">⭐ Лучшие чашки</div>${top
        .map((c) => {
          const line = formatCupRecipe(c.recipe);
          return `<div class="recipe-item"><div><div class="recipe-item-h">${esc(c.name)}${c.rating ? ` · ${'★'.repeat(c.rating)}` : ''}</div><div class="recipe-item-sub">${esc([c.country, c.brew_method, line].filter(Boolean).join(' · '))}</div></div>${c.id ? `<a class="recipe-act-link" href="/cup?id=${esc(c.id)}">→</a>` : ''}</div>`;
        })
        .join('')}`
    : '';
  const freqHtml = freq.length
    ? `<div class="sub-h" style="margin-top:12px;font-size:.78rem">🔁 Частый рецепт</div>${freq
        .map(
          (f) =>
            `<div class="recipe-item"><div><div class="recipe-item-h">${esc(f.brew_method)}</div><div class="recipe-item-sub">${esc(f.line)} · ${f.count}×</div></div></div>`,
        )
        .join('')}`
    : '';
  if (!topHtml && !freqHtml) return '';
  return `<div class="sub-h">📊 Инсайты</div><div class="profile-card">${topHtml}${freqHtml}</div>`;
}
