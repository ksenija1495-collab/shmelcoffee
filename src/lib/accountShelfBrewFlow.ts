import { recommendBrew, type BrewRecommendation } from './brewRecommend';
import {
  applyRecipeToParams,
  formatCupRecipe,
  normalizeRecipe,
  scaleRecipeToTargetVolume,
  type BrewRecipe,
} from './cupRecipe';
import { equipmentItemMatchesTag, EQUIPMENT_TAGS } from './equipmentTags';
import {
  bestDiaryRecipeForBean,
  lookupPreset,
  presetForFlight,
  type DiaryCupLike,
} from './tastingFlights';

export type ShelfBeanRow = {
  id: string;
  name: string;
  roaster?: string | null;
  country?: string | null;
  process?: string | null;
  variety?: string | null;
};

export type BrewPlanSource = 'diary' | 'rules' | 'preset';

export type ShelfBrewPlan = {
  source: BrewPlanSource;
  brewMethod: string;
  headline: string;
  reason: string;
  recipe: BrewRecipe;
};

const CORE_BREW_METHODS = ['V60', 'Aeropress', 'Hario Switch', 'Турка'] as const;

const EQUIP_TO_BREW: Record<string, string> = {
  v60: 'V60',
  aeropress: 'Aeropress',
  turka: 'Турка',
  chemex: 'Chemex',
  french: 'Френч-пресс',
  moka: 'Гейзерная',
  espresso: 'Эспрессо',
};

export function brewMethodsForEquipment(equipItems: { name?: string | null; category?: string | null }[]): string[] {
  const out = new Set<string>();
  for (const tag of EQUIPMENT_TAGS) {
    if (equipItems.some((item) => equipmentItemMatchesTag(item, tag))) {
      const m = EQUIP_TO_BREW[tag.id];
      if (m) out.add(m);
    }
  }
  if (!out.size) return [...CORE_BREW_METHODS];
  if (out.has('V60')) out.add('Hario Switch');
  return [...out];
}

function presetToRecipe(preset: ReturnType<typeof lookupPreset>): BrewRecipe {
  return {
    coffee_g: parseFloat(preset.coffee_g) || null,
    water_g: parseFloat(preset.water_g) || null,
    temp: preset.temp || null,
    time: preset.time || null,
    grind: preset.grind || null,
    blooming: preset.blooming_ml
      ? { ml: parseFloat(preset.blooming_ml), time: preset.blooming || null }
      : null,
  };
}

function recToRecipe(rec: BrewRecommendation['primary'], method: string): BrewRecipe {
  const coffee = parseFloat(rec.dose.replace(/[^\d.,]/g, '').replace(',', '.'));
  const water = parseFloat(rec.water.replace(/[^\d.,]/g, '').replace(',', '.'));
  return {
    coffee_g: Number.isFinite(coffee) ? coffee : null,
    water_g: Number.isFinite(water) ? water : null,
    temp: rec.temp || null,
    grind: rec.grind || null,
    time: rec.time || null,
  };
}

export function suggestBrewPlan(
  bean: ShelfBeanRow,
  cups: DiaryCupLike[],
  methods: string[],
): ShelfBrewPlan {
  const diaryBest = bestDiaryRecipeForBean(cups, bean);
  if (diaryBest?.recipe) {
    const norm = normalizeRecipe(diaryBest.recipe);
    return {
      source: 'diary',
      brewMethod: diaryBest.brew_method || 'Aeropress',
      headline: `Из дневника${diaryBest.rating ? ` · ${diaryBest.rating}★` : ''}`,
      reason: formatCupRecipe(diaryBest.recipe) || 'Лучший результат на этом лоте',
      recipe: norm || {},
    };
  }

  const rules = recommendBrew(bean);
  const preferredMethod = methods.find((m) => rules?.primary.method === m) || methods[0] || 'Aeropress';
  if (rules) {
    const pick = rules.primary.method === preferredMethod ? rules.primary : rules.secondary;
    return {
      source: 'rules',
      brewMethod: pick.method,
      headline: rules.headline,
      reason: pick.note || rules.why,
      recipe: recToRecipe(pick, pick.method),
    };
  }

  const preset = presetForFlight(preferredMethod);
  return {
    source: 'preset',
    brewMethod: preset.brew,
    headline: preset.label,
    reason: 'Базовый рецепт под способ заваривания',
    recipe: presetToRecipe(preset),
  };
}

export function planForMethod(bean: ShelfBeanRow, cups: DiaryCupLike[], method: string): ShelfBrewPlan {
  const diaryBest = bestDiaryRecipeForBean(cups, bean);
  if (diaryBest?.brew_method === method && diaryBest.recipe) {
    return {
      source: 'diary',
      brewMethod: method,
      headline: `Твой рецепт · ${method}`,
      reason: formatCupRecipe(diaryBest.recipe) || '',
      recipe: normalizeRecipe(diaryBest.recipe) || {},
    };
  }
  const preset = lookupPreset(method, method) || presetForFlight(method);
  return {
    source: 'preset',
    brewMethod: preset.brew,
    headline: preset.label,
    reason: 'Стартовые параметры — подстрой под вкус',
    recipe: presetToRecipe(preset),
  };
}

export function buildAddCupUrl(
  bean: ShelfBeanRow,
  plan: ShelfBrewPlan,
  targetMl?: number,
): string {
  let recipe = plan.recipe;
  if (targetMl && recipe.water_g) {
    const scaled = scaleRecipeToTargetVolume(recipe, targetMl);
    if (scaled) recipe = scaled;
  }
  const q = applyRecipeToParams(recipe, plan.brewMethod);
  if (bean.name) q.set('name', bean.name);
  if (bean.roaster) q.set('roaster', bean.roaster);
  if (bean.country) q.set('country', bean.country);
  if (bean.process) q.set('process', bean.process);
  if (bean.variety) q.set('variety', bean.variety);
  q.set('from_shelf', '1');
  if (targetMl) q.set('target_ml', String(targetMl));
  return '/add-cup?' + q.toString();
}

const esc = (s: unknown) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function bindShelfBrewFlow(
  root: ParentNode,
  ctx: {
    beansById: Map<string, ShelfBeanRow>;
    cups: DiaryCupLike[];
    equipItems: { name?: string | null; category?: string | null }[];
  },
): void {
  const modal = root.querySelector('#shelfBrewModal') as HTMLElement | null;
  if (!modal) return;

  const titleEl = modal.querySelector('#shelfBrewTitle') as HTMLElement;
  const stepChoose = modal.querySelector('#shelfBrewStepChoose') as HTMLElement;
  const stepPlan = modal.querySelector('#shelfBrewStepPlan') as HTMLElement;
  const stepMethod = modal.querySelector('#shelfBrewStepMethod') as HTMLElement;
  const planBody = modal.querySelector('#shelfBrewPlanBody') as HTMLElement;
  const methodList = modal.querySelector('#shelfBrewMethodList') as HTMLElement;
  const volumeRow = modal.querySelector('#shelfBrewVolumes') as HTMLElement;

  let currentBean: ShelfBeanRow | null = null;
  let currentPlan: ShelfBrewPlan | null = null;
  let targetMl: number | undefined = 200;

  const methods = brewMethodsForEquipment(ctx.equipItems);

  const close = () => {
    modal.hidden = true;
    currentBean = null;
    currentPlan = null;
  };

  const renderVolumes = () => {
    if (!volumeRow) return;
    volumeRow.innerHTML = [120, 200, 250].map(
      (ml) =>
        `<button type="button" class="shelf-brew-vol${targetMl === ml ? ' on' : ''}" data-vol="${ml}">${ml} ml</button>`,
    ).join('');
    volumeRow.querySelectorAll('[data-vol]').forEach((btn) => {
      btn.addEventListener('click', () => {
        targetMl = parseInt((btn as HTMLElement).dataset.vol || '200', 10);
        renderVolumes();
        if (currentPlan && planBody) {
          planBody.innerHTML = planHtml(currentPlan, targetMl);
        }
      });
    });
  };

  const planHtml = (plan: ShelfBrewPlan, vol?: number) => {
    const scaled = vol ? scaleRecipeToTargetVolume(plan.recipe, vol) : plan.recipe;
    const line = formatCupRecipe(scaled || plan.recipe);
    return `<div class="shelf-brew-plan-src">${esc(plan.headline)}</div>
      <div class="shelf-brew-plan-line">${esc(line || plan.reason)}</div>
      <div class="shelf-brew-plan-why">${esc(plan.reason)}</div>`;
  };

  const openPlan = (plan: ShelfBrewPlan) => {
    currentPlan = plan;
    stepChoose.hidden = true;
    stepMethod.hidden = true;
    stepPlan.hidden = false;
    renderVolumes();
    if (planBody) planBody.innerHTML = planHtml(plan, targetMl);
  };

  const openForBean = (bean: ShelfBeanRow) => {
    currentBean = bean;
    targetMl = 200;
    titleEl.textContent = bean.name;
    stepChoose.hidden = false;
    stepPlan.hidden = true;
    stepMethod.hidden = true;
    modal.hidden = false;
  };

  root.querySelectorAll('[data-shelf-brew]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = (btn as HTMLElement).dataset.shelfBrew!;
      const bean = ctx.beansById.get(id);
      if (bean) openForBean(bean);
    });
  });

  modal.querySelector('#shelfBrewClose')?.addEventListener('click', close);
  modal.querySelector('[data-shelf-brew-back]')?.addEventListener('click', () => {
    stepPlan.hidden = true;
    stepMethod.hidden = true;
    stepChoose.hidden = false;
  });

  modal.querySelector('#shelfBrewSuggest')?.addEventListener('click', () => {
    if (!currentBean) return;
    openPlan(suggestBrewPlan(currentBean, ctx.cups, methods));
  });

  modal.querySelector('#shelfBrewPickMethod')?.addEventListener('click', () => {
    stepChoose.hidden = true;
    stepPlan.hidden = true;
    stepMethod.hidden = false;
    if (methodList) {
      methodList.innerHTML = methods
        .map(
          (m) =>
            `<button type="button" class="shelf-brew-method" data-method="${esc(m)}">${esc(m)}</button>`,
        )
        .join('');
      methodList.querySelectorAll('[data-method]').forEach((b) => {
        b.addEventListener('click', () => {
          if (!currentBean) return;
          const method = (b as HTMLElement).dataset.method!;
          openPlan(planForMethod(currentBean, ctx.cups, method));
        });
      });
    }
  });

  modal.querySelector('#shelfBrewGo')?.addEventListener('click', () => {
    if (!currentBean || !currentPlan) return;
    window.location.href = buildAddCupUrl(currentBean, currentPlan, targetMl);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}
