import { recommendBrew, type BrewRecommendation } from './brewRecommend';
import {
  applyRecipeToParams,
  formatCupRecipe,
  normalizeRecipe,
  scaleRecipeToTargetVolume,
  type BrewRecipe,
} from './cupRecipe';
import { brewMethodsForEquipment } from './equipmentTags';
import { recipeRecToBrewRecipe, scaleStandardToMl } from './brewStandards';
import { bestDiaryRecipeForBean, type DiaryCupLike } from './tastingFlights';
import {
  DEFAULT_CUP_ML,
  detailForPlan,
  pickChampionForMethod,
  scaledPlanRecipe,
} from './shelfRecipeDetail';

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
  championId?: string;
  detail?: RecipeDetail;
};

export { brewMethodsForEquipment } from './equipmentTags';

function recToRecipe(rec: BrewRecommendation['primary'], method: string, targetMl: number): BrewRecipe {
  const base = recipeRecToBrewRecipe(rec);
  const scaled = scaleRecipeToTargetVolume(base, targetMl);
  return scaled || scaleStandardToMl(method, targetMl);
}

function enrichPlan(plan: ShelfBrewPlan, _bean: ShelfBeanRow, targetMl: number): ShelfBrewPlan {
  let recipe =
    plan.source === 'diary'
      ? scaledPlanRecipe(plan.recipe, targetMl)
      : scaleStandardToMl(plan.brewMethod, targetMl);
  let championId = plan.championId;
  if (plan.source !== 'diary') {
    const champ = pickChampionForMethod(plan.brewMethod, targetMl);
    if (champ) championId = champ.id;
  }
  const detail = detailForPlan(plan.brewMethod, championId);
  return { ...plan, recipe, championId, detail };
}

export function suggestBrewPlan(
  bean: ShelfBeanRow,
  cups: DiaryCupLike[],
  methods: string[],
  targetMl = DEFAULT_CUP_ML,
): ShelfBrewPlan {
  const diaryBest = bestDiaryRecipeForBean(cups, bean);
  if (diaryBest?.recipe) {
    const norm = normalizeRecipe(diaryBest.recipe);
    const base: ShelfBrewPlan = {
      source: 'diary',
      brewMethod: diaryBest.brew_method || 'Aeropress',
      headline: `Из дневника${diaryBest.rating ? ` · ${diaryBest.rating}★` : ''}`,
      reason: formatCupRecipe(diaryBest.recipe) || 'Лучший результат на этом лоте',
      recipe: norm || {},
    };
    return enrichPlan(base, bean, targetMl);
  }

  const rules = recommendBrew(bean);
  const preferredMethod = methods.find((m) => rules?.primary.method === m) || methods[0] || 'Aeropress';
  if (rules) {
    const pick =
      methods.includes(rules.primary.method)
        ? rules.primary
        : methods.includes(rules.secondary.method)
          ? rules.secondary
          : rules.primary.method === preferredMethod
            ? rules.primary
            : rules.secondary;
    const base: ShelfBrewPlan = {
      source: 'rules',
      brewMethod: pick.method,
      headline: rules.headline,
      reason: pick.note || rules.why,
      recipe: recToRecipe(pick, pick.method, targetMl),
    };
    return enrichPlan(base, bean, targetMl);
  }

  const base: ShelfBrewPlan = {
    source: 'preset',
    brewMethod: preferredMethod,
    headline: 'Базовый рецепт',
    reason: 'Стартовые параметры Shmelco под выбранный метод',
    recipe: scaleStandardToMl(preferredMethod, targetMl),
  };
  return enrichPlan(base, bean, targetMl);
}

export function planForMethod(
  bean: ShelfBeanRow,
  cups: DiaryCupLike[],
  method: string,
  targetMl = DEFAULT_CUP_ML,
): ShelfBrewPlan {
  const diaryBest = bestDiaryRecipeForBean(cups, bean);
  if (diaryBest?.brew_method === method && diaryBest.recipe) {
    const base: ShelfBrewPlan = {
      source: 'diary',
      brewMethod: method,
      headline: `Твой рецепт · ${method}`,
      reason: formatCupRecipe(diaryBest.recipe) || '',
      recipe: normalizeRecipe(diaryBest.recipe) || {},
    };
    return enrichPlan(base, bean, targetMl);
  }
  const rules = recommendBrew(bean);
  if (rules && (rules.primary.method === method || rules.secondary.method === method)) {
    const pick = rules.primary.method === method ? rules.primary : rules.secondary;
    const base: ShelfBrewPlan = {
      source: 'rules',
      brewMethod: method,
      headline: `${rules.headline} · ${method}`,
      reason: pick.note || rules.why,
      recipe: recToRecipe(pick, method, targetMl),
    };
    return enrichPlan(base, bean, targetMl);
  }
  const base: ShelfBrewPlan = {
    source: 'preset',
    brewMethod: method,
    headline: 'Базовый рецепт',
    reason: 'Стартовые параметры Shmelco — подстрой температуру, не дозу',
    recipe: scaleStandardToMl(method, targetMl),
  };
  return enrichPlan(base, bean, targetMl);
}

export function buildAddCupUrl(
  bean: ShelfBeanRow,
  plan: ShelfBrewPlan,
  targetMl?: number,
  step: 'recipe' | 'taste' = 'recipe',
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
  q.set('brew_step', step);
  if (targetMl) q.set('target_ml', String(targetMl));
  if (plan.championId) q.set('champion_id', plan.championId);
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
  let targetMl: number = DEFAULT_CUP_ML;
  let planMode: 'suggest' | { method: string } | null = null;

  const methods = brewMethodsForEquipment(ctx.equipItems);
  const methodsHint = methods.length
    ? `Доступно по твоему оборудованию: ${methods.join(', ')}`
    : 'Способы: V60, AeroPress, Switch, турка';

  const close = () => {
    modal.hidden = true;
    currentBean = null;
    currentPlan = null;
  };

  const renderVolumes = () => {
    if (!volumeRow) return;
    volumeRow.innerHTML = [120, 150, 200, 250].map(
      (ml) =>
        `<button type="button" class="shelf-brew-vol${targetMl === ml ? ' on' : ''}" data-vol="${ml}">${ml} ml</button>`,
    ).join('');
    volumeRow.querySelectorAll('[data-vol]').forEach((btn) => {
      btn.addEventListener('click', () => {
        targetMl = parseInt((btn as HTMLElement).dataset.vol || String(DEFAULT_CUP_ML), 10);
        renderVolumes();
        rebuildPlan();
      });
    });
  };

  const rebuildPlan = () => {
    if (!currentBean || !planMode) return;
    currentPlan =
      planMode === 'suggest'
        ? suggestBrewPlan(currentBean, ctx.cups, methods, targetMl)
        : planForMethod(currentBean, ctx.cups, planMode.method, targetMl);
    if (planBody) planBody.innerHTML = planHtml(currentPlan, targetMl);
  };

  const planHtml = (plan: ShelfBrewPlan, vol?: number) => {
    const scaled = vol ? scaleRecipeToTargetVolume(plan.recipe, vol) : plan.recipe;
    const line = formatCupRecipe(scaled || plan.recipe);
    const detail = plan.detail || detailForPlan(plan.brewMethod, plan.championId);
    const stepsHtml = detail.steps
      .map((s, i) => `<li>${esc(s)}</li>`)
      .join('');
    const tipHtml = detail.tip ? `<p class="shelf-brew-plan-tip">${esc(detail.tip)}</p>` : '';
    const titleHtml = detail.title
      ? `<div class="shelf-brew-plan-champ">${esc(detail.title)}${detail.subtitle ? ` · <span>${esc(detail.subtitle)}</span>` : ''}</div>`
      : '';
    return `<div class="shelf-brew-plan-src">${esc(plan.headline)} · ${esc(plan.brewMethod)}</div>
      ${titleHtml}
      <div class="shelf-brew-plan-line">${esc(line || plan.reason)}</div>
      <div class="shelf-brew-plan-why">${esc(plan.reason)}</div>
      <ol class="shelf-brew-steps">${stepsHtml}</ol>
      ${tipHtml}`;
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
    targetMl = DEFAULT_CUP_ML;
    planMode = null;
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

  const equipHint = modal.querySelector('#shelfBrewEquipHint');
  if (equipHint) equipHint.textContent = methodsHint;

  modal.querySelector('#shelfBrewSuggest')?.addEventListener('click', () => {
    if (!currentBean) return;
    planMode = 'suggest';
    openPlan(suggestBrewPlan(currentBean, ctx.cups, methods, targetMl));
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
          planMode = { method };
          openPlan(planForMethod(currentBean, ctx.cups, method, targetMl));
        });
      });
    }
  });

  modal.querySelector('#shelfBrewGo')?.addEventListener('click', () => {
    if (!currentBean || !currentPlan) return;
    window.location.href = buildAddCupUrl(currentBean, currentPlan, targetMl, 'recipe');
  });
  modal.querySelector('#shelfBrewGoTaste')?.addEventListener('click', () => {
    if (!currentBean || !currentPlan) return;
    window.location.href = buildAddCupUrl(currentBean, currentPlan, targetMl, 'taste');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}
