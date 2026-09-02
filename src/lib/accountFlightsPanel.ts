import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAvailableComparisonGoals,
  goalById,
  suggestPairingsForGoal,
  suggestPartnersForAnchor,
  type AnchoredPartnerSuggestion,
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
} from './tastingFlights';
import { formatCupRecipe } from './cupRecipe';
import { filterAvailableShelfBeans } from './shelfAvailability';

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

function shelfBeansFromItems(shelf: any[]) {
  return filterAvailableShelfBeans(shelf.filter((s) => s.kind === 'bean')).map((s) => ({
    name: s.name,
    roaster: s.roaster,
    country: s.country,
    process: s.process,
    variety: s.variety,
  }));
}

export function renderFlightsMigrationBox(): string {
  return `<div class="migration-box"><b>Сравнения недоступны — нужна миграция в Supabase</b>
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
  const shelfBeans = shelfBeansFromItems(shelf);
  const goals = getAvailableComparisonGoals(shelfBeans, savedPairs);
  const defaultGoal = goals[0]?.id ?? 'countries';
  const initialPairs = shelfBeans.length >= 2
    ? suggestPairingsForGoal(shelfBeans, cups, savedPairs, defaultGoal)
    : [];
  const initialPair = initialPairs[0];

  const beanOptions = beans.map(
    (s) => `<option value="${esc(s.id)}">${esc(s.name)}${s.country ? ` · ${esc(s.country)}` : ''}</option>`,
  ).join('');

  const brewOptions = Object.keys(FLIGHT_BREW_PRESETS)
    .map((k) => `<option value="${esc(k)}">${esc(FLIGHT_BREW_PRESETS[k].label)}</option>`)
    .join('');

  const goalChips = goals.length
    ? goals.map((g, i) =>
      `<button type="button" class="flight-goal-chip${g.id === defaultGoal ? ' on' : ''}" data-flight-goal="${g.id}">${g.emoji} ${esc(g.label)}</button>`,
    ).join('')
    : '';

  const pairPicker = initialPair && goals.length
    ? `<div class="flight-pair-pick" id="flightGoalPick">
        <div class="flight-pair-names" id="flightGoalPairNames">${esc(initialPair.a)} × ${esc(initialPair.b)}</div>
        <div class="flight-pair-reason" id="flightGoalPairReason">${esc(initialPair.reason)}</div>
        <div class="flight-pair-actions">
          <button type="button" class="flight-pair-btn primary" id="flightGoalAccept">Принять пару</button>
          <button type="button" class="flight-pair-btn" id="flightGoalNext" ${initialPairs.length < 2 ? 'disabled' : ''}>↻ Другая</button>
        </div>
        <div class="flight-pair-counter" id="flightGoalPairCounter">${initialPairs.length > 1 ? `1 из ${initialPairs.length}` : ''}</div>
      </div>`
    : goals.length
    ? `<p class="flight-hint" id="flightGoalPickEmpty">Для выбранной цели не нашлось пар — выбери лоты вручную ниже.</p>`
    : '';

  const createBlock = `<details class="flight-create" id="flightCreateForm" ${openCreate || !flights.length ? 'open' : ''}>
    <summary>+ Новое сравнение</summary>
    <div class="flight-create-body profile-card">
      <label class="flight-label" style="margin-top:0">Моё зерно</label>
      <select id="flightBeanA" class="flight-inp"><option value="">— выберите зерно —</option>${beanOptions}</select>
      <div class="flight-pair-pick" id="flightAnchorPick" hidden>
        <p class="flight-mode-hint">С чем сравнить <b id="flightAnchorName"></b>?</p>
        <div class="flight-pair-names" id="flightPairNames"></div>
        <div class="flight-pair-reason" id="flightPairReason"></div>
        <div class="flight-auto-goal" id="flightAutoGoal"></div>
        <div class="flight-pair-actions">
          <button type="button" class="flight-pair-btn primary" id="flightPairAccept">Принять</button>
          <button type="button" class="flight-pair-btn" id="flightPairNext">↻ Другой лот</button>
        </div>
        <div class="flight-pair-counter" id="flightPairCounter"></div>
      </div>
      <p class="flight-mode-hint" id="flightGoalModeHint">Или выбери цель — подберём пару целиком:</p>
      ${goals.length ? `<p class="flight-label" style="margin-top:0">Что хочешь научиться отличать?</p>
      <div class="flight-goal-chips" id="flightGoalChips">${goalChips}</div>
      ${pairPicker}` : ''}
      <label class="flight-label">Способ заварки</label>
      <select id="flightBrew" class="flight-inp">${brewOptions}</select>
      <label class="flight-label">Лот B</label>
      <select id="flightBeanB" class="flight-inp"><option value="">— выберите зерно —</option>${beanOptions}</select>
      <label class="flight-label">Цель сравнения</label>
      <input id="flightFocus" class="flight-inp" value="${esc(goalById(defaultGoal).focusDefault)}" placeholder="На что смотреть в чашке…" maxlength="240"/>
      ${beans.length < 2 ? `<p class="flight-hint">Добавь минимум 2 зерна в <a href="/add-shelf?kind=bean">зерно</a>, чтобы сравнивать.</p>` : ''}
      <button type="button" class="btn btn-primary" id="flightCreateBtn" style="margin-top:12px;font-size:.82rem" ${beans.length < 2 ? 'disabled' : ''}>Создать сравнение</button>
    </div>
  </details>`;

  const list = flights.length
    ? flights.map((f) => renderFlightCard(f, cups)).join('')
    : `<div class="empty-state">Сравнения помогают <b>отличать</b> вкусы. Выбери цель, прими пару из зерна — и заваривай по одному рецепту.</div>`;

  return `${createBlock}<div class="flight-list">${list}</div>`;
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
  const shelfBeans = shelfBeansFromItems(shelf);
  const byId = new Map(beans.map((s) => [s.id, s]));
  const byName = new Map(beans.map((s) => [String(s.name).trim().toLowerCase(), s]));

  let currentGoal: ComparisonGoalId = (
    root.querySelector('.flight-goal-chip.on') as HTMLElement | null
  )?.dataset.flightGoal as ComparisonGoalId || 'countries';

  let goalPairIndex = 0;
  let goalPairs = suggestPairingsForGoal(shelfBeans, cups, savedPairs, currentGoal);
  let anchorPartners: AnchoredPartnerSuggestion[] = [];
  let partnerIndex = 0;
  let anchorMode = false;

  const focusInp = root.querySelector('#flightFocus') as HTMLInputElement | null;
  const selA = root.querySelector('#flightBeanA') as HTMLSelectElement | null;
  const selB = root.querySelector('#flightBeanB') as HTMLSelectElement | null;
  const anchorPick = root.querySelector('#flightAnchorPick') as HTMLElement | null;
  const anchorNameEl = root.querySelector('#flightAnchorName');
  const pairNames = root.querySelector('#flightPairNames');
  const pairReason = root.querySelector('#flightPairReason');
  const autoGoalEl = root.querySelector('#flightAutoGoal');
  const pairCounter = root.querySelector('#flightPairCounter');
  const pairNext = root.querySelector('#flightPairNext') as HTMLButtonElement | null;
  const goalPick = root.querySelector('#flightGoalPick') as HTMLElement | null;
  const goalModeHint = root.querySelector('#flightGoalModeHint') as HTMLElement | null;
  const goalPairNames = root.querySelector('#flightGoalPairNames');
  const goalPairReason = root.querySelector('#flightGoalPairReason');
  const goalPairCounter = root.querySelector('#flightGoalPairCounter');
  const goalPairNext = root.querySelector('#flightGoalNext') as HTMLButtonElement | null;

  const setGoalUi = (goalId: ComparisonGoalId) => {
    currentGoal = goalId;
    root.querySelectorAll('.flight-goal-chip').forEach((chip) => {
      chip.classList.toggle('on', (chip as HTMLElement).dataset.flightGoal === goalId);
    });
  };

  const applyPartnerToForm = (partner: AnchoredPartnerSuggestion) => {
    const itemB = byName.get(partner.b.toLowerCase());
    if (itemB && selB) selB.value = itemB.id;
    setGoalUi(partner.goalId);
    if (focusInp) focusInp.value = goalById(partner.goalId).focusDefault;
  };

  const renderAnchorPartner = () => {
    const partner = anchorPartners[partnerIndex];
    if (!anchorPick) return;
    if (!partner) {
      anchorPick.hidden = false;
      if (anchorNameEl && selA?.value) {
        const itemA = byId.get(selA.value);
        if (itemA) anchorNameEl.textContent = itemA.name;
      }
      if (pairNames) pairNames.textContent = 'Подходящих лотов не нашлось';
      if (pairReason) pairReason.textContent = 'Попробуй другую цель ниже или выбери лот B вручную.';
      if (autoGoalEl) autoGoalEl.textContent = '';
      if (pairNext) pairNext.disabled = true;
      return;
    }
    anchorPick.hidden = false;
    if (anchorNameEl) anchorNameEl.textContent = partner.a;
    if (pairNames) pairNames.textContent = `${partner.a} × ${partner.b}`;
    if (pairReason) pairReason.textContent = partner.reason;
    const g = goalById(partner.goalId);
    if (autoGoalEl) autoGoalEl.innerHTML = `🎯 Цель: <b>${g.emoji} ${esc(g.label)}</b> — ${esc(g.focusDefault)}`;
    if (pairCounter) {
      pairCounter.textContent = anchorPartners.length > 1
        ? `${partnerIndex + 1} из ${anchorPartners.length}`
        : '';
    }
    if (pairNext) pairNext.disabled = anchorPartners.length < 2;
    applyPartnerToForm(partner);
  };

  const loadAnchorPartners = (goalFilter?: ComparisonGoalId) => {
    const idA = selA?.value;
    if (!idA) {
      anchorMode = false;
      anchorPartners = [];
      partnerIndex = 0;
      if (anchorPick) anchorPick.hidden = true;
      if (goalModeHint) goalModeHint.hidden = false;
      if (goalPick) goalPick.hidden = false;
      return;
    }
    const itemA = byId.get(idA);
    if (!itemA) return;
    anchorMode = true;
    anchorPartners = suggestPartnersForAnchor(
      itemA.name,
      shelfBeans,
      cups,
      savedPairs,
      goalFilter ? { goalId: goalFilter } : undefined,
    );
    partnerIndex = 0;
    if (goalModeHint) goalModeHint.hidden = true;
    if (goalPick) goalPick.hidden = true;
    renderAnchorPartner();
  };

  const renderGoalPairCard = () => {
    if (!goalPairNames || !goalPairReason) return;
    const pair = goalPairs[goalPairIndex];
    if (!pair) {
      if (goalPick) goalPick.hidden = true;
      return;
    }
    if (goalPick) goalPick.hidden = false;
    goalPairNames.textContent = `${pair.a} × ${pair.b}`;
    goalPairReason.textContent = pair.reason;
    if (goalPairCounter) {
      goalPairCounter.textContent = goalPairs.length > 1 ? `${goalPairIndex + 1} из ${goalPairs.length}` : '';
    }
    if (goalPairNext) goalPairNext.disabled = goalPairs.length < 2;
  };

  const setGoal = (goalId: ComparisonGoalId, opts?: { skipAnchorReload?: boolean }) => {
    if (anchorMode && selA?.value && !opts?.skipAnchorReload) {
      setGoalUi(goalId);
      loadAnchorPartners(goalId);
      return;
    }
    setGoalUi(goalId);
    goalPairIndex = 0;
    goalPairs = suggestPairingsForGoal(shelfBeans, cups, savedPairs, goalId);
    if (focusInp) focusInp.value = goalById(goalId).focusDefault;
    renderGoalPairCard();
  };

  selA?.addEventListener('change', () => {
    if (selA.value) loadAnchorPartners();
    else {
      anchorMode = false;
      if (anchorPick) anchorPick.hidden = true;
      if (goalModeHint) goalModeHint.hidden = false;
      if (goalPick) goalPick.hidden = false;
      setGoal(currentGoal);
    }
  });

  root.querySelectorAll('[data-flight-goal]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setGoal((chip as HTMLElement).dataset.flightGoal as ComparisonGoalId);
    });
  });

  root.querySelector('#flightPairAccept')?.addEventListener('click', () => {
    const partner = anchorPartners[partnerIndex];
    if (!partner) return;
    applyPartnerToForm(partner);
  });

  root.querySelector('#flightPairNext')?.addEventListener('click', () => {
    if (anchorPartners.length < 2) return;
    partnerIndex = (partnerIndex + 1) % anchorPartners.length;
    renderAnchorPartner();
  });

  root.querySelector('#flightGoalAccept')?.addEventListener('click', () => {
    const pair = goalPairs[goalPairIndex];
    if (!pair) return;
    const itemA = byName.get(pair.a.toLowerCase());
    const itemB = byName.get(pair.b.toLowerCase());
    if (itemA && selA) selA.value = itemA.id;
    if (itemB && selB) selB.value = itemB.id;
    loadAnchorPartners(currentGoal);
  });

  root.querySelector('#flightGoalNext')?.addEventListener('click', () => {
    if (goalPairs.length < 2) return;
    goalPairIndex = (goalPairIndex + 1) % goalPairs.length;
    renderGoalPairCard();
  });

  renderGoalPairCard();

  root.querySelector('#flightCreateBtn')?.addEventListener('click', async () => {
    const brew = (root.querySelector('#flightBrew') as HTMLSelectElement)?.value || 'AeroPress';
    const idA = (root.querySelector('#flightBeanA') as HTMLSelectElement)?.value;
    const idB = (root.querySelector('#flightBeanB') as HTMLSelectElement)?.value;
    const focus = (root.querySelector('#flightFocus') as HTMLInputElement)?.value.trim() || null;
    if (!idA || !idB || idA === idB) {
      alert('Выбери два разных лота из зерна.');
      return;
    }
    const sA = byId.get(idA);
    const sB = byId.get(idB);
    if (!sA || !sB) return;
    const flightBeans = [beanFromShelfItem(sA, 0), beanFromShelfItem(sB, 1)];
    const title = flightTitleFromBeans(flightBeans);
    const btn = root.querySelector('#flightCreateBtn') as HTMLButtonElement;
    btn.disabled = true;
    const { error } = await supabase.from('tasting_flights').insert({
      user_id: userId,
      title,
      brew_method: brew,
      beans: flightBeans,
      focus,
      status: 'active',
      source: 'goal_picker',
    });
    btn.disabled = false;
    if (error) {
      alert('Не удалось создать: ' + error.message);
      return;
    }
    onRefresh();
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
      if (!confirm('Удалить это сравнение?')) return;
      const id = (btn as HTMLElement).dataset.flightDel!;
      await supabase.from('tasting_flights').delete().eq('id', id);
      onRefresh();
    });
  });
}
