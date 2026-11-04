import { CHAMPION_PICKER_ITEMS } from '../data/championRecipePicker';
import { applyRecipeToParams, formatCupRecipe, recipeFingerprint } from './cupRecipe';
import {
  EQUIPMENT_TAGS,
  brewMethodsForEquipment,
  equipmentItemMatchesTag,
  type EquipmentTag,
} from './equipmentTags';
import { savedRecipeSummary } from './savedRecipesUi';
import { SHMELCO_COFFEE_G, SHMELCO_CUP_ML, standardRecipeRec } from './brewStandards';
import type { DiaryCupLike } from './tastingFlights';

export type SavedRecipeRow = {
  id: string;
  name: string;
  brew_method?: string | null;
  recipe?: unknown;
};

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function migrationRecipesBox(): string {
  return `<div class="migration-box"><b>Сохранённые рецепты недоступны — нужна миграция в Supabase</b>
      <ol>
        <li>Открой <a href="https://supabase.com/dashboard/project/vakdjxdbfoxkrsedgwcl/sql/new" target="_blank" rel="noopener">SQL Editor</a></li>
        <li>Вставь файл <code>supabase/FIX-RUN-NOW.sql</code> из репозитория</li>
        <li>Нажми Run → обнови эту страницу</li>
      </ol>
      Чемпионские рецепты ниже работают без миграции.</div>`;
}

export function renderMyRecipesBlock(recipes: SavedRecipeRow[], unavailable: boolean): string {
  if (unavailable) return migrationRecipesBox();
  if (!recipes.length) {
    return `<details class="acc-recipe-block"><summary><span>📋 Мои рецепты</span><span class="acc-champ-count">0</span></summary>
        <div class="acc-recipe-block-body"><p class="field-hint" style="margin:0">Сохраняй удачные заварки из карточки чашки или формы «Добавить кофе».</p></div></details>`;
  }
  const items = recipes
    .map((r) => {
      const q = applyRecipeToParams(r.recipe as any, r.brew_method || '');
      return `<a class="acc-champ-item" href="/add-cup?${q.toString()}"><span class="acc-champ-item-title">${esc(r.name)}</span><span class="acc-champ-item-sub">${esc(r.brew_method || '—')} · ${esc(savedRecipeSummary(r))}</span></a>`;
    })
    .join('');
  return `<details class="acc-recipe-block"><summary><span>📋 Мои рецепты</span><span class="acc-champ-count">${recipes.length}</span></summary><div class="acc-recipe-block-body">${items}</div></details>`;
}

export function renderChampionRecipesBlock(): string {
  const byBrew = new Map<string, typeof CHAMPION_PICKER_ITEMS>();
  for (const item of CHAMPION_PICKER_ITEMS) {
    const list = byBrew.get(item.brewMethod) || [];
    list.push(item);
    byBrew.set(item.brewMethod, list);
  }
  const brews = [...byBrew.keys()].sort((a, b) => a.localeCompare(b, 'ru'));
  const inner = brews
    .map((brew) => {
      const items = byBrew.get(brew)!;
      return `<details class="acc-champ-brew">
        <summary><span>${esc(brew)}</span><span class="acc-champ-count">${items.length}</span></summary>
        <div class="acc-champ-list">${items
          .map((item) => {
            const q = applyRecipeToParams(item.recipe as any, item.brewMethod);
            return `<a class="acc-champ-item" href="/add-cup?${q.toString()}">
            <span class="acc-champ-item-title">${esc(item.methodIcon)} ${esc(item.title)}</span>
            <span class="acc-champ-item-sub">${esc(item.badgeText)} · ${esc(item.methodName)}</span>
          </a>`;
          })
          .join('')}</div>
      </details>`;
    })
    .join('');
  return `<details class="acc-recipe-block acc-champ-block">
      <summary><span>🏆 Чемпионские</span><span class="acc-champ-count">${CHAMPION_PICKER_ITEMS.length}</span></summary>
      <div class="acc-recipe-block-body">${inner}<a class="acc-champ-more" href="/blog/chempionskie-recepty">Все в блоге →</a></div>
    </details>`;
}

export type FrequentRecipe = {
  fp: string;
  brew_method: string;
  line: string;
  count: number;
  avgRating: number | null;
};

export function frequentRecipesFromCups(cups: DiaryCupLike[], limit = 5): FrequentRecipe[] {
  const map = new Map<
    string,
    { brew_method: string; line: string; count: number; ratingSum: number; ratingN: number }
  >();
  for (const c of cups) {
    if (!c.recipe) continue;
    const fp = recipeFingerprint(c.recipe);
    if (!fp) continue;
    const brew = c.brew_method || '—';
    const key = `${brew}::${fp}`;
    const line = formatCupRecipe(c.recipe) || fp;
    const prev = map.get(key);
    const rating = c.rating ?? 0;
    if (prev) {
      prev.count += 1;
      if (rating > 0) {
        prev.ratingSum += rating;
        prev.ratingN += 1;
      }
    } else {
      map.set(key, {
        brew_method: brew,
        line,
        count: 1,
        ratingSum: rating > 0 ? rating : 0,
        ratingN: rating > 0 ? 1 : 0,
      });
    }
  }
  return [...map.entries()]
    .map(([fp, v]) => ({
      fp,
      brew_method: v.brew_method,
      line: v.line,
      count: v.count,
      avgRating: v.ratingN ? Math.round((v.ratingSum / v.ratingN) * 10) / 10 : null,
    }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .slice(0, limit);
}

export function renderFrequentRecipesBlock(cups: DiaryCupLike[]): string {
  const freq = frequentRecipesFromCups(cups);
  if (!freq.length) {
    return `<p class="field-hint" style="margin:0">Повторяющиеся параметры появятся, когда одну и ту же дозу запишешь минимум дважды.</p>`;
  }
  const rows = freq
    .map(
      (f) =>
        `<div class="recipe-item"><div><div class="recipe-item-h">${esc(f.brew_method)} · ${esc(f.line)}</div><div class="recipe-item-sub">${f.count} чашки${f.avgRating ? ` · ср. ${f.avgRating}★` : ''}</div></div></div>`,
    )
    .join('');
  return `<div class="sub-h" style="margin-top:0;font-size:.78rem">🔁 Частые из дневника</div>${rows}`;
}

export function renderEquipmentRecipeHints(
  equipItems: { name?: string | null; category?: string | null }[],
): string {
  const methods = brewMethodsForEquipment(equipItems);
  if (!methods.length) return '';
  const hints = methods
    .map((m) => {
      const rec = standardRecipeRec(m);
      const dose =
        rec.dose === '—'
          ? `${SHMELCO_CUP_ML} ml · ${rec.time}`
          : `${rec.dose} / ${rec.water}`;
      return `<div class="recipe-item"><div><div class="recipe-item-h">${esc(m)}</div><div class="recipe-item-sub">Старт: ${esc(dose)} · ${esc(rec.temp)}</div></div></div>`;
    })
    .join('');
  return `<div class="sub-h" style="margin-top:14px;font-size:.78rem">⚙️ Под твоё оборудование</div><p class="field-hint" style="margin:0 0 8px">Базовая доза Shmelco: ${SHMELCO_COFFEE_G} g / ${SHMELCO_CUP_ML} ml — чемпионские вариации ниже, без других граммов в подсказках.</p>${hints}`;
}

export function renderRecipesPanel(
  savedRecipes: SavedRecipeRow[],
  recipesUnavailable: boolean,
  cups: DiaryCupLike[],
  equipItems: { name?: string | null; category?: string | null }[],
): string {
  return `${renderEquipmentRecipeHints(equipItems)}
    <div class="profile-card" style="margin-top:14px">${renderFrequentRecipesBlock(cups)}</div>
    <div class="profile-card" style="margin-top:14px">${renderMyRecipesBlock(savedRecipes, recipesUnavailable)}${renderChampionRecipesBlock()}</div>`;
}

/** Теги оборудования для UI (экспорт для account). */
export { EQUIPMENT_TAGS, equipmentItemMatchesTag, type EquipmentTag };
