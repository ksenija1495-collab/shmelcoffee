import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAvailableComparisonGoals,
  goalById,
  type ComparisonGoalId,
} from './comparisonGoals';
import type { SavedPair } from './shelfAssistantPairings';
import {
  beanFromShelfItem,
  buildFlightCupUrl,
  flightTitleFromBeans,
  presetForFlight,
  type FlightBean,
  type TastingFlight,
  FLIGHT_BREW_PRESETS,
  lookupPreset,
} from './tastingFlights';
import { formatCupRecipe } from './cupRecipe';
import { filterAvailableShelfBeans } from './shelfAvailability';
import {
  brewMethodOptions,
  buildBrewTodayPlans,
  diarySummaryLine,
  pickBrewTodayPlan,
  SOLO_GOALS,
  type BrewTodayEntry,
  type BrewTodayMode,
  type BrewTodayPlan,
  type BrewTodayWizardState,
} from './brewToday';
import { applyRecipeToParams } from './cupRecipe';

const esc = (s: unknown) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function parseBeans(raw: unknown): FlightBean[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b: any, i: number) => ({
      slot: typeof b.slot === 'number' ? b.slot : i,
      shelf_item_id: b.shelf_item_id || null,
      name: String(b.name || 'Кофе'),
      roaster: b.roaster || null,
      country: b.country || null,
      process: b.process || null,
      variety: b.variety || null,
    }))
    .sort((a, b) => a.slot - b.slot);
}

function cupsForFlight(cups: any[], flightId: string): Map<number, any> {
  const map = new Map<number, any>();
  cups.filter((c) => c.flight_id === flightId).forEach((c) => {
    if (typeof c.flight_slot === 'number') map.set(c.flight_slot, c);
  });
  return map;
}

function buildCupUrlFromPlan(plan: BrewTodayPlan, presetKey?: string): string {
  const bean = plan.beans[0];
  const key = presetKey || plan.brewPresetKey;
  const preset = lookupPreset(key);
  const q = applyRecipeToParams(
    {
      coffee_g: parseFloat(preset.coffee_g),
      water_g: parseFloat(preset.water_g),
      temp: preset.temp,
      time: preset.time,
      grind: preset.grind,
      blooming: preset.blooming_ml
        ? { ml: parseFloat(preset.blooming_ml), time: preset.blooming || '' }
        : undefined,
    },
    preset.brew,
  );
  if (bean.name) q.set('name', bean.name);
  if (bean.roaster) q.set('roaster', bean.roaster);
  if (bean.country) q.set('country', bean.country);
  if (bean.process) q.set('process', bean.process);
  if (bean.variety) q.set('variety', bean.variety);
  if (plan.focus) q.set('focus', plan.focus);
  q.set('from_brew_today', '1');
  return '/add-cup?' + q.toString();
}

function buildSoloCupUrl(plan: BrewTodayPlan): string {
  return buildCupUrlFromPlan(plan);
}

function renderPlanCard(plan: BrewTodayPlan | null, altTotal: number, altIndex: number): string {
  if (!plan) {
    return `<div class="brew-plan empty" id="brewPlanCard">
      <p class="flight-hint">Не нашлось подходящего варианта — добавь зерно на полку или выбери другую цель.</p>
    </div>`;
  }
  const beansLine = plan.beans.map((b) => esc(b.name)).join(plan.mode === 'compare' ? ' × ' : '');
  const modeLabel = plan.mode === 'compare'
    ? '⚖️ Сравнение лотов'
    : plan.mode === 'methods'
    ? '🔀 Один лот × два способа'
    : '🔍 Исследование одного лота';
  const goalLine = plan.goalId
    ? `${goalById(plan.goalId).emoji} ${esc(goalById(plan.goalId).label)}`
    : plan.mode === 'solo' ? '🔍 Solo-исследование' : '';

  return `<div class="brew-plan profile-card" id="brewPlanCard">
    <div class="brew-plan-mode">${modeLabel}</div>
    <div class="brew-plan-beans">${beansLine}</div>
    ${goalLine ? `<div class="brew-plan-goal">${goalLine}</div>` : ''}
    <div class="brew-plan-brew">☕ ${esc(plan.brewLabel)}</div>
    ${plan.secondBrewLabel ? `<div class="brew-plan-brew">☕ ${esc(plan.secondBrewLabel)}</div>` : ''}
    <div class="brew-plan-focus"><b>🎯 Фокус:</b> ${esc(plan.focus)}</div>
    <div class="brew-plan-reason">${esc(plan.reason)}</div>
    <div class="brew-plan-diary">📔 ${esc(plan.diaryHint)}</div>
    <div class="flight-pair-actions" style="margin-top:12px">
      <button type="button" class="flight-pair-btn primary" id="brewPlanAccept">Принять · заварить</button>
      <button type="button" class="flight-pair-btn" id="brewPlanNext" ${altTotal < 2 ? 'disabled' : ''}>↻ Другой вариант</button>
    </div>
    <div class="flight-pair-counter" id="brewPlanCounter">${altTotal > 1 ? `${altIndex + 1} из ${altTotal}` : ''}</div>
  </div>`;
}

export function renderFlightsMigrationBox(): string {
  return `<div class="migration-box"><b>Заварить сегодня недоступно — нужна миграция в Supabase</b>
    <ol>
      <li>Открой <a href="https://supabase.com/dashboard/project/vakdjxdbfoxkrsedgwcl/sql/new" target="_blank" rel="noopener">SQL Editor</a></li>
      <li>Вставь файл <code>supabase/migration-tasting-flights.sql</code></li>
      <li>Run → обнови страницу</li>
    </ol></div>`;
}

export function renderFlightsPanel(
  flights: TastingFlight[],
  shelf: any[],
  cups: any[],
  flightsAvailable: boolean,
  openCreate: boolean,
  savedPairs: SavedPair[] = [],
): string {
  if (!flightsAvailable) return renderFlightsMigrationBox();

  const beans = filterAvailableShelfBeans(shelf.filter((s) => s.kind === 'bean'));
  const equipCats = shelf.filter((s) => s.kind === 'equipment').map((s) => s.category || s.name || '');
  const methods = brewMethodOptions(equipCats);
  const diaryLine = diarySummaryLine(cups);

  const beanOptions = beans.map(
    (s) => `<option value="${esc(s.id)}">${esc(s.name)}${s.country ? ` · ${esc(s.country)}` : ''}</option>`,
  ).join('');

  const methodOptions = `<option value="">— подбери способ сам —</option>` + methods.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('');

  const wizard = `<div class="brew-today profile-card" id="brewTodayWizard" ${openCreate || !flights.length ? '' : ''}>
    <div class="brew-diary-bar" id="brewDiaryBar">📔 ${esc(diaryLine)}</div>

    <div class="brew-step" id="brewStepEntry">
      <div class="brew-step-h">С чего начнём?</div>
      <div class="brew-chips">
        <button type="button" class="brew-chip" data-brew-entry="bean">🫘 Конкретное зерно</button>
        <button type="button" class="brew-chip" data-brew-entry="method">⚙️ Подобрать лот под способ</button>
        <button type="button" class="brew-chip" data-brew-entry="methods">🔀 Один лот × два способа</button>
        <button type="button" class="brew-chip" data-brew-entry="small">🥄 Малый объём · ~13 г</button>
        <button type="button" class="brew-chip" data-brew-entry="free">✨ Подскажи с нуля</button>
      </div>
    </div>

    <div class="brew-step" id="brewStepMode" hidden>
      <div class="brew-step-h">Что сегодня?</div>
      <div class="brew-chips">
        <button type="button" class="brew-chip" data-brew-mode="solo">🔍 Исследовать одно зерно</button>
        <button type="button" class="brew-chip" data-brew-mode="compare">⚖️ Сравнить два лота</button>
      </div>
    </div>

    <div class="brew-step" id="brewStepPick" hidden>
      <div class="brew-step-h" id="brewPickLabel">Выбор</div>
      <select id="brewPickBean" class="flight-inp" hidden><option value="">— зерно —</option>${beanOptions}</select>
      <select id="brewPickMethod" class="flight-inp" hidden>${methodOptions}</select>
      <button type="button" class="flight-pair-btn" id="brewPickContinue" style="margin-top:10px">Дальше →</button>
    </div>

    <div class="brew-step" id="brewStepGoal" hidden>
      <div class="brew-step-h" id="brewGoalLabel">Цель</div>
      <div class="flight-goal-chips" id="brewGoalChips"></div>
      <button type="button" class="flight-pair-btn primary" id="brewGoalContinue" style="margin-top:8px">Подобрать вариант →</button>
    </div>

    <div class="brew-step" id="brewStepResult" hidden>
      <div class="brew-step-h">Предложение на сегодня</div>
      <div id="brewPlanWrap"></div>
    </div>

    <div class="brew-active-session" id="brewActiveSession" hidden></div>
  </div>
  <div id="shelfAssistantMount"></div>`;

  const activeFlights = flights.filter((f) => f.status === 'active' || f.status === 'draft');
  const historyFlights = flights.filter((f) => f.status === 'completed');

  const listTitle = activeFlights.length
    ? `<div class="brew-list-h">В процессе</div>`
    : '';
  const list = activeFlights.length
    ? activeFlights.map((f) => renderFlightCard(f, cups)).join('')
    : '';

  const history = historyFlights.length
    ? `<details class="brew-history"><summary>История (${historyFlights.length})</summary><div class="flight-list">${historyFlights.map((f) => renderFlightCard(f, cups)).join('')}</div></details>`
    : !flights.length
    ? `<div class="empty-state">Пройди мастер выше — он учтёт дневник и полку, предложит зерно и рецепт, поможет записать чашку.</div>`
    : '';

  return `${wizard}${listTitle ? listTitle + `<div class="flight-list">${list}</div>` : list}${history}`;
}

function renderFlightCard(f: TastingFlight, cups: any[]): string {
  const beans = parseBeans(f.beans);
  const slotCups = cupsForFlight(cups, f.id);
  const preset = presetForFlight(f.brew_method);
  const statusLabel = f.status === 'completed' ? '🏁 Готово' : f.status === 'draft' ? '📝 Черновик' : '🔬 В процессе';
  const filled = beans.filter((b) => slotCups.has(b.slot)).length;

  const slots = beans.map((b) => {
    const cup = slotCups.get(b.slot);
    const href = buildFlightCupUrl(f, b, { focus: f.focus || undefined });
    const meta = [b.roaster, b.country, b.process].filter(Boolean).map(esc).join(' · ');
    if (cup) {
      const stars = cup.rating ? '★'.repeat(cup.rating) : '';
      const rec = formatCupRecipe(cup.recipe);
      return `<div class="flight-slot done">
        <div class="flight-slot-h">${esc(b.name)} ${stars}</div>
        <div class="flight-slot-meta">${meta || '—'}</div>
        ${rec ? `<div class="flight-slot-rec">${esc(rec)}</div>` : ''}
        <a href="/cup?id=${cup.id}" class="flight-slot-link">Карточка чашки →</a>
      </div>`;
    }
    return `<div class="flight-slot">
      <div class="flight-slot-h">${esc(b.name)}</div>
      <div class="flight-slot-meta">${meta || '—'}</div>
      <a href="${href}" class="add-cup-btn flight-slot-brew">☕ Записать чашку</a>
    </div>`;
  }).join('');

  const focusLine = f.focus
    ? `<div class="flight-focus-line"><span class="flight-focus-lbl">🎯 Цель:</span> ${esc(f.focus)}</div>`
    : '';

  return `<div class="flight-card profile-card" data-flight-id="${f.id}">
    <div class="flight-head">
      <div>
        <div class="flight-title">${esc(f.title || flightTitleFromBeans(beans))}</div>
        <div class="flight-sub">${esc(preset.label)} · ${filled}/${beans.length} чашек</div>
      </div>
      <span class="flight-status">${statusLabel}</span>
    </div>
    ${focusLine}
    <div class="flight-slots">${slots}</div>
    <div class="flight-conclusion">
      <label class="flight-label">Чем отличились?</label>
      <textarea class="flight-conclusion-inp" data-flight-conclusion="${f.id}" rows="2" placeholder="Например: A — ярче и кислее, B — сладче и плотнее…">${esc(f.conclusion || '')}</textarea>
    </div>
    <div class="flight-actions">
      <button type="button" class="sel-action-btn" data-flight-save="${f.id}">💾 Сохранить вывод</button>
      ${f.status !== 'completed' ? `<button type="button" class="sel-action-btn primary" data-flight-complete="${f.id}">✓ Завершить</button>` : ''}
      <button type="button" class="sel-action-btn sel-del" data-flight-del="${f.id}">🗑</button>
    </div>
  </div>`;
}

export function bindFlightsPanel(
  root: HTMLElement,
  supabase: SupabaseClient,
  userId: string,
  shelf: any[],
  cups: any[],
  savedPairs: SavedPair[],
  onRefresh: () => void,
): void {
  const beans = filterAvailableShelfBeans(shelf.filter((s) => s.kind === 'bean'));
  const shelfBeans = beans.map((s) => ({
    name: s.name,
    roaster: s.roaster,
    country: s.country,
    process: s.process,
    variety: s.variety,
  }));
  const byId = new Map(beans.map((s) => [s.id, s]));

  const wizard = root.querySelector('#brewTodayWizard');
  if (!wizard) return;

  const state: BrewTodayWizardState = {
    entry: null,
    mode: null,
    beanId: null,
    method: null,
    goalId: null,
    altIndex: 0,
  };

  const stepEntry = wizard.querySelector('#brewStepEntry') as HTMLElement;
  const stepMode = wizard.querySelector('#brewStepMode') as HTMLElement;
  const stepPick = wizard.querySelector('#brewStepPick') as HTMLElement;
  const stepGoal = wizard.querySelector('#brewStepGoal') as HTMLElement;
  const stepResult = wizard.querySelector('#brewStepResult') as HTMLElement;
  const pickLabel = wizard.querySelector('#brewPickLabel');
  const pickBean = wizard.querySelector('#brewPickBean') as HTMLSelectElement;
  const pickMethod = wizard.querySelector('#brewPickMethod') as HTMLSelectElement;
  const goalChipsEl = wizard.querySelector('#brewGoalChips');
  const goalLabel = wizard.querySelector('#brewGoalLabel');
  const planWrap = wizard.querySelector('#brewPlanWrap');
  const activeSession = wizard.querySelector('#brewActiveSession') as HTMLElement;

  let currentPlan: BrewTodayPlan | null = null;
  let altTotal = 0;

  const markChip = (selector: string, attr: string, value: string) => {
    wizard.querySelectorAll(selector).forEach((el) => {
      el.classList.toggle('on', (el as HTMLElement).dataset[attr] === value);
    });
  };

  const showGoals = () => {
    if (!goalChipsEl) return;
    if (state.mode === 'solo') {
      if (goalLabel) goalLabel.textContent = 'Зачем завариваешь?';
      goalChipsEl.innerHTML = SOLO_GOALS.map((g, i) =>
        `<button type="button" class="flight-goal-chip${i === 0 ? ' on' : ''}" data-brew-solo-goal="${g.id}">${esc(g.label)}</button>`,
      ).join('');
      state.goalId = null;
    } else {
      const goals = getAvailableComparisonGoals(shelfBeans, savedPairs);
      const defaultGoal = goals[0]?.id ?? 'countries';
      state.goalId = state.goalId || defaultGoal;
      if (goalLabel) goalLabel.textContent = 'Что хочешь отличить?';
      goalChipsEl.innerHTML = goals.map((g) =>
        `<button type="button" class="flight-goal-chip${g.id === state.goalId ? ' on' : ''}" data-brew-goal="${g.id}">${g.emoji} ${esc(g.label)}</button>`,
      ).join('');
    }
    stepGoal.hidden = false;
  };

  const applySoloGoalFocus = () => {
    if (state.mode !== 'solo' || !currentPlan) return;
    const soloBtn = wizard.querySelector('[data-brew-solo-goal].on') as HTMLElement | null;
    const sg = SOLO_GOALS.find((g) => g.id === soloBtn?.dataset.brewSoloGoal);
    if (sg) currentPlan.focus = sg.focus;
  };

  const syncWizardPicks = () => {
    if (pickMethod && pickMethod.value) state.method = pickMethod.value;
    if (!pickBean.hidden && pickBean.value) state.beanId = pickBean.value;
    else if (!pickBean.hidden && !pickBean.value) state.beanId = null;
  };

  const renderResult = () => {
    syncWizardPicks();
    const plans = buildBrewTodayPlans(shelf, cups, savedPairs, state);
    altTotal = plans.length;
    currentPlan = pickBrewTodayPlan(shelf, cups, savedPairs, state);
    applySoloGoalFocus();
    if (planWrap) {
      planWrap.innerHTML = renderPlanCard(currentPlan, altTotal, state.altIndex);
    }
    stepResult.hidden = false;
  };

  wizard.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.id === 'brewPlanNext' || t.closest('#brewPlanNext')) {
      if (altTotal < 2) return;
      state.altIndex = (state.altIndex + 1) % altTotal;
      currentPlan = pickBrewTodayPlan(shelf, cups, savedPairs, state);
      applySoloGoalFocus();
      if (planWrap) planWrap.innerHTML = renderPlanCard(currentPlan, altTotal, state.altIndex);
      return;
    }
    if (t.id !== 'brewPlanAccept' && !t.closest('#brewPlanAccept')) return;
      if (!currentPlan) return;
      const btn = wizard.querySelector('#brewPlanAccept') as HTMLButtonElement;
      btn.disabled = true;

      if (currentPlan.mode === 'solo') {
        const url = buildSoloCupUrl(currentPlan);
        activeSession.hidden = false;
        activeSession.innerHTML = `<div class="brew-session-card profile-card">
          <div class="brew-step-h">Заваривай и фиксируй</div>
          <p class="flight-hint">${esc(currentPlan.focus)}</p>
          <p class="brew-plan-brew">☕ ${esc(currentPlan.brewLabel)}</p>
          <a href="${url}" class="add-cup-btn" style="display:inline-block;margin-top:10px">☕ Записать чашку</a>
        </div>`;
        btn.disabled = false;
        return;
      }

      if (currentPlan.mode === 'methods') {
        const urlA = buildCupUrlFromPlan(currentPlan, currentPlan.brewPresetKey);
        const urlB = buildCupUrlFromPlan(currentPlan, currentPlan.secondBrewPresetKey);
        activeSession.hidden = false;
        activeSession.innerHTML = `<div class="brew-session-card profile-card">
          <div class="brew-step-h">Один лот — два метода</div>
          <p class="flight-hint">${esc(currentPlan.focus)}</p>
          <div class="brew-session-slots">
            <a href="${urlA}" class="add-cup-btn">☕ 1 · ${esc(currentPlan.brewLabel)}</a>
            <a href="${urlB}" class="add-cup-btn">☕ 2 · ${esc(currentPlan.secondBrewLabel || '')}</a>
          </div>
        </div>`;
        btn.disabled = false;
        return;
      }

      const idA = currentPlan.beans[0]?.shelfId;
      const idB = currentPlan.beans[1]?.shelfId;
      if (!idA || !idB) {
        alert('Не нашлось оба лота на полке.');
        btn.disabled = false;
        return;
      }
      const sA = byId.get(idA);
      const sB = byId.get(idB);
      if (!sA || !sB) {
        btn.disabled = false;
        return;
      }
      const flightBeans = [beanFromShelfItem(sA, 0), beanFromShelfItem(sB, 1)];
      const title = flightTitleFromBeans(flightBeans);
      const { data, error } = await supabase.from('tasting_flights').insert({
        user_id: userId,
        title,
        brew_method: currentPlan.brewPresetKey,
        beans: flightBeans,
        focus: currentPlan.focus,
        status: 'active',
        source: 'brew_today',
      }).select('id').single();

      btn.disabled = false;
      if (error) {
        alert('Не удалось создать: ' + error.message);
        return;
      }

      const flight = {
        id: data.id,
        brew_method: currentPlan.brewPresetKey,
        focus: currentPlan.focus,
      };
      const urlA = buildFlightCupUrl(flight, flightBeans[0], { focus: currentPlan.focus });
      const urlB = buildFlightCupUrl(flight, flightBeans[1], { focus: currentPlan.focus });

      activeSession.hidden = false;
      activeSession.innerHTML = `<div class="brew-session-card profile-card">
        <div class="brew-step-h">Сравнение создано — заваривай по одному рецепту</div>
        <p class="brew-plan-brew">☕ ${esc(currentPlan.brewLabel)}</p>
        <p class="flight-hint">${esc(currentPlan.focus)}</p>
        <div class="brew-session-slots">
          <a href="${urlA}" class="add-cup-btn">☕ Чашка A · ${esc(flightBeans[0].name)}</a>
          <a href="${urlB}" class="add-cup-btn">☕ Чашка B · ${esc(flightBeans[1].name)}</a>
        </div>
      </div>`;
      onRefresh();
  });

  wizard.querySelectorAll('[data-brew-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.entry = (btn as HTMLElement).dataset.brewEntry as BrewTodayEntry;
      state.altIndex = 0;
      state.beanId = null;
      state.method = null;
      markChip('[data-brew-entry]', 'brewEntry', state.entry);

      if (state.entry === 'methods') {
        state.mode = 'methods';
        stepMode.hidden = true;
        stepGoal.hidden = true;
        stepPick.hidden = false;
        pickBean.hidden = false;
        pickMethod.hidden = true;
        if (pickLabel) pickLabel.textContent = 'Какое зерно? Можно пропустить — подберём лот, которому два метода дадут больше всего.';
        return;
      }
      if (state.entry === 'small') {
        state.mode = 'solo';
        stepMode.hidden = true;
        stepGoal.hidden = true;
        stepPick.hidden = false;
        pickBean.hidden = true;
        pickMethod.hidden = false;
        if (pickLabel) pickLabel.textContent = 'Способ для малой дозы (или оставь любой и нажми Дальше)';
        return;
      }
      if (state.entry === 'method') {
        state.mode = null;
        stepMode.hidden = true;
        stepPick.hidden = false;
        pickBean.hidden = true;
        pickMethod.hidden = false;
        if (pickLabel) pickLabel.textContent = 'Каким способом? Подберём лот под него.';
        return;
      }
      stepMode.hidden = false;
      stepPick.hidden = true;
    });
  });

  wizard.querySelectorAll('[data-brew-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = (btn as HTMLElement).dataset.brewMode as BrewTodayMode;
      state.altIndex = 0;
      markChip('[data-brew-mode]', 'brewMode', state.mode);

      if (state.entry === 'bean') {
        stepPick.hidden = false;
        pickBean.hidden = false;
        pickMethod.hidden = true;
        if (pickLabel) pickLabel.textContent = 'Какое зерно?';
      } else if (state.entry === 'method') {
        if (state.method) {
          showGoals();
        } else {
          stepPick.hidden = false;
          pickBean.hidden = true;
          pickMethod.hidden = false;
          if (pickLabel) pickLabel.textContent = 'Каким способом? Подберём лот под него.';
        }
      } else {
        stepPick.hidden = true;
        showGoals();
      }
    });
  });

  wizard.querySelector('#brewPickContinue')?.addEventListener('click', () => {
    if (!pickBean.hidden && pickBean.value) state.beanId = pickBean.value;
    else if (!pickBean.hidden) state.beanId = null;
    if (!pickMethod.hidden) state.method = pickMethod.value || null;
    state.altIndex = 0;

    if (state.entry === 'methods' || state.entry === 'small') {
      renderResult();
      return;
    }
    if (state.entry === 'method' && !state.method) {
      if (pickLabel) pickLabel.textContent = 'Выбери способ — под него соберём лот.';
      return;
    }
    if (state.entry === 'method' && !state.mode) {
      stepMode.hidden = false;
      return;
    }
    showGoals();
  });

  wizard.querySelector('#brewGoalContinue')?.addEventListener('click', () => {
    syncWizardPicks();
    state.altIndex = 0;
    renderResult();
  });

  wizard.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const goalBtn = t.closest('[data-brew-goal]') as HTMLElement | null;
    if (goalBtn) {
      state.goalId = goalBtn.dataset.brewGoal as ComparisonGoalId;
      wizard.querySelectorAll('[data-brew-goal]').forEach((c) => c.classList.toggle('on', c === goalBtn));
      return;
    }
    const soloBtn = t.closest('[data-brew-solo-goal]') as HTMLElement | null;
    if (soloBtn) {
      wizard.querySelectorAll('[data-brew-solo-goal]').forEach((c) => c.classList.toggle('on', c === soloBtn));
      const sg = SOLO_GOALS.find((g) => g.id === soloBtn.dataset.brewSoloGoal);
      if (sg && currentPlan) currentPlan.focus = sg.focus;
    }
  });

  root.querySelectorAll('[data-flight-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.flightSave!;
      const ta = root.querySelector(`textarea[data-flight-conclusion="${id}"]`) as HTMLTextAreaElement;
      const conclusion = ta?.value.trim() || null;
      await supabase.from('tasting_flights').update({ conclusion, updated_at: new Date().toISOString() }).eq('id', id);
      (btn as HTMLButtonElement).textContent = '✓ Сохранено';
      setTimeout(() => { (btn as HTMLButtonElement).textContent = '💾 Сохранить вывод'; }, 2000);
    });
  });

  root.querySelectorAll('[data-flight-complete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.flightComplete!;
      const ta = root.querySelector(`textarea[data-flight-conclusion="${id}"]`) as HTMLTextAreaElement;
      const conclusion = ta?.value.trim() || null;
      await supabase.from('tasting_flights').update({
        status: 'completed',
        conclusion,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      onRefresh();
    });
  });

  root.querySelectorAll('[data-flight-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить эту сессию?')) return;
      const id = (btn as HTMLElement).dataset.flightDel!;
      await supabase.from('tasting_flights').delete().eq('id', id);
      onRefresh();
    });
  });
}
