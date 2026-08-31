import type { SupabaseClient } from '@supabase/supabase-js';
import { suggestPairings } from './shelfAssistantPairings';
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
): string {
  if (!flightsAvailable) return renderFlightsMigrationBox();

  const beans = shelf.filter((s) => s.kind === 'bean');
  const pairs = beans.length >= 2
    ? suggestPairings(
        beans.map((s) => ({
          name: s.name,
          roaster: s.roaster,
          country: s.country,
          process: s.process,
          variety: s.variety,
        })),
        cups.map((c) => ({
          name: c.name,
          country: c.country,
          rating: c.rating,
          brew_method: c.brew_method,
          created_at: c.created_at,
        })),
      )
    : [];

  const beanOptions = beans.map(
    (s) => `<option value="${esc(s.id)}">${esc(s.name)}${s.country ? ` · ${esc(s.country)}` : ''}</option>`,
  ).join('');

  const brewOptions = Object.keys(FLIGHT_BREW_PRESETS)
    .map((k) => `<option value="${esc(k)}">${esc(FLIGHT_BREW_PRESETS[k].label)}</option>`)
    .join('');

  const createBlock = `<details class="flight-create" id="flightCreateForm" ${openCreate || !flights.length ? 'open' : ''}>
    <summary>+ Новое сравнение</summary>
    <div class="flight-create-body profile-card">
      ${pairs.length ? `<p class="flight-suggest">💡 С полки: <button type="button" class="flight-suggest-btn" data-pair-a="${esc(pairs[0].a)}" data-pair-b="${esc(pairs[0].b)}">${esc(pairs[0].a)} × ${esc(pairs[0].b)}</button></p>` : ''}
      <label class="flight-label">Способ заварки</label>
      <select id="flightBrew" class="flight-inp">${brewOptions}</select>
      <label class="flight-label">Лот A</label>
      <select id="flightBeanA" class="flight-inp"><option value="">— выберите зерно —</option>${beanOptions}</select>
      <label class="flight-label">Лот B</label>
      <select id="flightBeanB" class="flight-inp"><option value="">— выберите зерно —</option>${beanOptions}</select>
      <label class="flight-label">На что смотреть (необязательно)</label>
      <input id="flightFocus" class="flight-inp" placeholder="Кислотность, сладость, тело…" maxlength="200"/>
      ${beans.length < 2 ? `<p class="flight-hint">Добавь минимум 2 зерна на <a href="/add-shelf?kind=bean">полку</a>, чтобы сравнивать.</p>` : ''}
      <button type="button" class="btn btn-primary" id="flightCreateBtn" style="margin-top:12px;font-size:.82rem" ${beans.length < 2 ? 'disabled' : ''}>Создать сравнение</button>
    </div>
  </details>`;

  const list = flights.length
    ? flights.map((f) => renderFlightCard(f, cups)).join('')
    : `<div class="empty-state">Сравнения помогают <b>отличать</b> вкусы. Выбери два лота с полки, заваривай по одному рецепту — и запиши, чем они различаются.</div>`;

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

  return `<div class="flight-card profile-card" data-flight-id="${f.id}">
    <div class="flight-head">
      <div>
        <div class="flight-title">${esc(f.title || flightTitleFromBeans(beans))}</div>
        <div class="flight-sub">${esc(preset.label)} · ${filled}/${beans.length} чашек</div>
      </div>
      <span class="flight-status">${statusLabel}</span>
    </div>
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
  onRefresh: () => void,
): void {
  const beans = shelf.filter((s) => s.kind === 'bean');
  const byId = new Map(beans.map((s) => [s.id, s]));
  const byName = new Map(beans.map((s) => [String(s.name).trim().toLowerCase(), s]));

  root.querySelectorAll('.flight-suggest-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const aName = (btn as HTMLElement).dataset.pairA || '';
      const bName = (btn as HTMLElement).dataset.pairB || '';
      const selA = root.querySelector('#flightBeanA') as HTMLSelectElement;
      const selB = root.querySelector('#flightBeanB') as HTMLSelectElement;
      const itemA = byName.get(aName.toLowerCase());
      const itemB = byName.get(bName.toLowerCase());
      if (itemA && selA) selA.value = itemA.id;
      if (itemB && selB) selB.value = itemB.id;
      (root.querySelector('#flightCreateForm') as HTMLDetailsElement)?.setAttribute('open', '');
    });
  });

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
      source: 'manual',
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
