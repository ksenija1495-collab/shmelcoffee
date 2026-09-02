import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getAvailableComparisonGoals,
  goalById,
  suggestPairingsForGoal,
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
    ? `<div class="flight-pair-pick" id="flightPairPick">
        <div class="flight-pair-names" id="flightPairNames">${esc(initialPair.a)} × ${esc(initialPair.b)}</div>
        <div class="flight-pair-reason" id="flightPairReason">${esc(initialPair.reason)}</div>
        <div class="flight-pair-actions">
          <button type="button" class="flight-pair-btn primary" id="flightPairAccept">Принять пару</button>
          <button type="button" class="flight-pair-btn" id="flightPairNext" ${initialPairs.length < 2 ? 'disabled' : ''}>↻ Другая</button>
        </div>
        <div class="flight-pair-counter" id="flightPairCounter">${initialPairs.length > 1 ? `1 из ${initialPairs.length}` : ''}</div>
      </div>`
    : goals.length
    ? `<p class="flight-hint">Для выбранной цели не нашлось пар — выбери лоты вручную ниже.</p>`
    : '';

  const createBlock = `<details class="flight-create" id="flightCreateForm" ${openCreate || !flights.length ? 'open' : ''}>
    <summary>+ Новое сравнение</summary>
    <div class="flight-create-body profile-card">
      ${goals.length ? `<p class="flight-label" style="margin-top:0">Что хочешь научиться отличать?</p>
      <div class="flight-goal-chips" id="flightGoalChips">${goalChips}</div>
      ${pairPicker}` : ''}
      <label class="flight-label">Способ заварки</label>
      <select id="flightBrew" class="flight-inp">${brewOptions}</select>
      <label class="flight-label">Лот A</label>
      <select id="flightBeanA" class="flight-inp"><option value="">— выберите зерно —</option>${beanOptions}</select>
      <label class="flight-label">Лот B</label>
      <select id="flightBeanB" class="flight-inp"><option value="">— выберите зерно —</option>${beanOptions}</select>
      <label class="flight-label">Цель сравнения</label>
      <input id="flightFocus" class="flight-inp" value="${esc(goalById(defaultGoal).focusDefault)}" placeholder="На что смотреть в чашке…" maxlength="240"/>
      ${beans.length < 2 ? `<p class="flight-hint">Добавь минимум 2 зерна на <a href="/add-shelf?kind=bean">полку</a>, чтобы сравнивать.</p>` : ''}
      <button type="button" class="btn btn-primary" id="flightCreateBtn" style="margin-top:12px;font-size:.82rem" ${beans.length < 2 ? 'disabled' : ''}>Создать сравнение</button>
    </div>
  </details>`;

  const list = flights.length
    ? flights.map((f) => renderFlightCard(f, cups)).join('')
    : `<div class="empty-state">Сравнения помогают <b>отличать</b> вкусы. Выбери цель, прими пару с полки — и заваривай по одному рецепту.</div>`;

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

  let pairIndex = 0;
  let currentPairs = suggestPairingsForGoal(shelfBeans, cups, savedPairs, currentGoal);

  const focusInp = root.querySelector('#flightFocus') as HTMLInputElement | null;
  const selA = root.querySelector('#flightBeanA') as HTMLSelectElement | null;
  const selB = root.querySelector('#flightBeanB') as HTMLSelectElement | null;
  const pairNames = root.querySelector('#flightPairNames');
  const pairReason = root.querySelector('#flightPairReason');
  const pairCounter = root.querySelector('#flightPairCounter');
  const pairNext = root.querySelector('#flightPairNext') as HTMLButtonElement | null;
  const pairPick = root.querySelector('#flightPairPick');

  const applyPairToForm = (pair: { a: string; b: string }) => {
    const itemA = byName.get(pair.a.toLowerCase());
    const itemB = byName.get(pair.b.toLowerCase());
    if (itemA && selA) selA.value = itemA.id;
    if (itemB && selB) selB.value = itemB.id;
  };

  const renderPairCard = () => {
    if (!pairNames || !pairReason) return;
    const pair = currentPairs[pairIndex];
    if (!pair) {
      if (pairPick) (pairPick as HTMLElement).style.display = 'none';
      return;
    }
    if (pairPick) (pairPick as HTMLElement).style.display = '';
    pairNames.textContent = `${pair.a} × ${pair.b}`;
    pairReason.textContent = pair.reason;
    if (pairCounter) {
      pairCounter.textContent = currentPairs.length > 1 ? `${pairIndex + 1} из ${currentPairs.length}` : '';
    }
    if (pairNext) pairNext.disabled = currentPairs.length < 2;
  };

  const setGoal = (goalId: ComparisonGoalId) => {
    currentGoal = goalId;
    pairIndex = 0;
    currentPairs = suggestPairingsForGoal(shelfBeans, cups, savedPairs, goalId);
    root.querySelectorAll('.flight-goal-chip').forEach((chip) => {
      chip.classList.toggle('on', (chip as HTMLElement).dataset.flightGoal === goalId);
    });
    if (focusInp) focusInp.value = goalById(goalId).focusDefault;
    renderPairCard();
  };

  root.querySelectorAll('[data-flight-goal]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setGoal((chip as HTMLElement).dataset.flightGoal as ComparisonGoalId);
    });
  });

  root.querySelector('#flightPairAccept')?.addEventListener('click', () => {
    const pair = currentPairs[pairIndex];
    if (!pair) return;
    applyPairToForm(pair);
    (root.querySelector('#flightCreateForm') as HTMLDetailsElement)?.setAttribute('open', '');
  });

  root.querySelector('#flightPairNext')?.addEventListener('click', () => {
    if (currentPairs.length < 2) return;
    pairIndex = (pairIndex + 1) % currentPairs.length;
    renderPairCard();
  });

  renderPairCard();

  root.querySelector('#flightCreateBtn')?.addEventListener('click', async () => {
    const brew = (root.querySelector('#flightBrew') as HTMLSelectElement)?.value || 'AeroPress';
    const idA = (root.querySelector('#flightBeanA') as HTMLSelectElement)?.value;
    const idB = (root.querySelector('#flightBeanB') as HTMLSelectElement)?.value;
    const focus = (root.querySelector('#flightFocus') as HTMLInputElement)?.value.trim() || null;
    if (!idA || !idB || idA === idB) {
      alert('Выбери два разных лота с полки.');
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
