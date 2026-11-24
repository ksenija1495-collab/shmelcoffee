import { PROCESS_OPTIONS } from '../data/processing';
import {
  BEAN_COUNTRY_OTHER,
  bindCountryOther,
  countriesForSelect,
  readCountryFromSelect,
  setCountryValue,
} from './beanCountryField';

export type ShelfEditRow = {
  id: string;
  name: string;
  roaster?: string | null;
  country?: string | null;
  process?: string | null;
  variety?: string | null;
  status?: string | null;
  /** Лучшая чашка из дневника — одна строка */
  diaryLine?: string | null;
};

type SupabaseLike = {
  from: (table: string) => {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => { eq: (col2: string, val2: string) => Promise<{ error: { message: string } | null }> };
    };
  };
};

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'ok', label: '🟢 Есть' },
  { value: 'low', label: '🟡 Заканчивается' },
  { value: 'out', label: '⚪️ Закончилось' },
];

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function optHtml(arr: readonly string[], selected: string | null, ph: string) {
  const sel = (selected || '').trim();
  const extra = sel && !arr.includes(sel) ? `<option value="${esc(sel)}" selected>${esc(sel)}</option>` : '';
  return `<option value="">${ph}</option>${extra}${arr.map((x) => `<option value="${esc(x)}"${x === sel ? ' selected' : ''}>${esc(x)}</option>`).join('')}`;
}

function ensureProcessOption(select: HTMLSelectElement, value: string | null | undefined) {
  const v = (value || '').trim();
  if (!v) return;
  if (![...select.options].some((o) => o.value === v)) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  }
  select.value = v;
}

const dash = (v: string | null | undefined) => (v?.trim() ? esc(v.trim()) : '—');

const MODAL_HTML = `
<div id="shelfEditModal" class="shelf-brew-modal" hidden>
  <div class="shelf-brew-sheet shelf-edit-sheet" role="dialog" aria-labelledby="shelfEditTitle">
    <div class="shelf-brew-sheet-h">
      <span id="shelfEditTitle">Карточка зерна</span>
      <button type="button" class="shelf-brew-close" id="shelfEditClose" aria-label="Закрыть">×</button>
    </div>
    <div id="shelfEditView">
      <dl class="shelf-card-dl" id="shelfEditViewDl"></dl>
      <div id="shelfEditDiary" class="shelf-card-diary" hidden></div>
      <label class="shelf-edit-fl">Запас</label>
      <select id="shelfEditStatusView" class="shelf-edit-inp"></select>
      <div class="shelf-edit-actions">
        <button type="button" class="shelf-brew-choice-btn primary" id="shelfEditToForm">Редактировать</button>
        <button type="button" class="shelf-brew-choice-btn" id="shelfEditBrew">☕ Заварить</button>
      </div>
    </div>
    <div id="shelfEditForm" hidden>
      <button type="button" class="ref-back" id="shelfEditBackToView" style="margin-bottom:10px">← К просмотру</button>
      <label class="shelf-edit-fl">Название</label>
      <input type="text" id="shelfEditName" class="shelf-edit-inp" autocomplete="off"/>
      <label class="shelf-edit-fl">Обжарщик</label>
      <input type="text" id="shelfEditRoaster" class="shelf-edit-inp" autocomplete="off"/>
      <label class="shelf-edit-fl">Сорт / разновидность</label>
      <input type="text" id="shelfEditVariety" class="shelf-edit-inp" placeholder="необязательно" autocomplete="off"/>
      <div class="shelf-edit-row2">
        <div>
          <label class="shelf-edit-fl">Страна</label>
          <select id="shelfEditCountry" class="shelf-edit-inp"></select>
          <div id="shelfEditCountryCustomRow" style="display:none;margin-top:6px">
            <input type="text" id="shelfEditCountryCustom" class="shelf-edit-inp" placeholder="Своя страна"/>
          </div>
        </div>
        <div>
          <label class="shelf-edit-fl">Обработка</label>
          <select id="shelfEditProcess" class="shelf-edit-inp"></select>
        </div>
      </div>
      <label class="shelf-edit-fl">Запас</label>
      <select id="shelfEditStatusForm" class="shelf-edit-inp"></select>
      <div id="shelfEditMsg" class="shelf-edit-msg"></div>
      <button type="button" class="shelf-brew-choice-btn primary" id="shelfEditSave" style="width:100%;margin-top:12px">Сохранить</button>
    </div>
  </div>
</div>`;

function fillStatusSelect(sel: HTMLSelectElement, value: string) {
  sel.innerHTML = STATUS_OPTS.map((o) => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`).join('');
}

export function bindShelfEdit(
  root: HTMLElement,
  opts: {
    supabase: SupabaseLike;
    userId: string;
    getBean: (id: string) => ShelfEditRow | undefined;
    onSaved: () => void;
  },
) {
  if (!root.querySelector('#shelfEditModal')) {
    root.insertAdjacentHTML('beforeend', MODAL_HTML);
  }
  const modal = root.querySelector('#shelfEditModal') as HTMLElement;
  const viewPanel = root.querySelector('#shelfEditView') as HTMLElement;
  const formPanel = root.querySelector('#shelfEditForm') as HTMLElement;
  const countries = countriesForSelect();
  const countrySel = root.querySelector('#shelfEditCountry') as HTMLSelectElement;
  const processSel = root.querySelector('#shelfEditProcess') as HTMLSelectElement;
  const statusView = root.querySelector('#shelfEditStatusView') as HTMLSelectElement;
  const statusForm = root.querySelector('#shelfEditStatusForm') as HTMLSelectElement;
  countrySel.innerHTML = optHtml(countries, null, 'страна');
  processSel.innerHTML = optHtml(PROCESS_OPTIONS, null, 'обработка');
  bindCountryOther('shelfEditCountry', 'shelfEditCountryCustomRow');

  let editingId: string | null = null;
  let currentRow: ShelfEditRow | null = null;

  const close = () => {
    modal.hidden = true;
    editingId = null;
    currentRow = null;
    const msg = root.querySelector('#shelfEditMsg') as HTMLElement;
    if (msg) msg.textContent = '';
  };

  const showView = () => {
    viewPanel.hidden = false;
    formPanel.hidden = true;
  };

  const showForm = () => {
    viewPanel.hidden = true;
    formPanel.hidden = false;
  };

  const renderView = (row: ShelfEditRow) => {
    const dl = root.querySelector('#shelfEditViewDl') as HTMLElement;
    dl.innerHTML = `
      <div class="shelf-card-dl-row"><dt>Название</dt><dd>${dash(row.name)}</dd></div>
      <div class="shelf-card-dl-row"><dt>Обжарщик</dt><dd>${dash(row.roaster)}</dd></div>
      <div class="shelf-card-dl-row"><dt>Страна</dt><dd>${dash(row.country)}</dd></div>
      <div class="shelf-card-dl-row"><dt>Обработка</dt><dd>${dash(row.process)}</dd></div>
      <div class="shelf-card-dl-row"><dt>Сорт</dt><dd>${dash(row.variety)}</dd></div>`;
    const diary = root.querySelector('#shelfEditDiary') as HTMLElement;
    if (row.diaryLine) {
      diary.hidden = false;
      diary.textContent = `Из дневника: ${row.diaryLine}`;
    } else {
      diary.hidden = true;
      diary.textContent = '';
    }
    const st = row.status && STATUS_OPTS.some((o) => o.value === row.status) ? row.status! : 'ok';
    fillStatusSelect(statusView, st);
  };

  const fillForm = (row: ShelfEditRow) => {
    (root.querySelector('#shelfEditName') as HTMLInputElement).value = row.name || '';
    (root.querySelector('#shelfEditRoaster') as HTMLInputElement).value = row.roaster || '';
    (root.querySelector('#shelfEditVariety') as HTMLInputElement).value = row.variety || '';
    setCountryValue(row.country, 'shelfEditCountry', 'shelfEditCountryCustom', 'shelfEditCountryCustomRow');
    ensureProcessOption(processSel, row.process);
    const st = row.status && STATUS_OPTS.some((o) => o.value === row.status) ? row.status! : 'ok';
    fillStatusSelect(statusForm, st);
  };

  const open = (row: ShelfEditRow, mode: 'view' | 'edit') => {
    editingId = row.id;
    currentRow = row;
    (root.querySelector('#shelfEditTitle') as HTMLElement).textContent = row.name || 'Карточка зерна';
    renderView(row);
    fillForm(row);
    modal.hidden = false;
    if (mode === 'edit') {
      showForm();
      (root.querySelector('#shelfEditName') as HTMLInputElement).focus();
    } else {
      showView();
    }
  };

  const saveStatusOnly = async (status: string) => {
    if (!editingId) return;
    await opts.supabase.from('shelf_items').update({ status }).eq('id', editingId).eq('user_id', opts.userId);
  };

  root.querySelector('#shelfEditClose')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  root.querySelector('#shelfEditToForm')?.addEventListener('click', () => {
    if (currentRow) fillForm(currentRow);
    showForm();
  });
  root.querySelector('#shelfEditBackToView')?.addEventListener('click', () => {
    if (currentRow) {
      const st = statusForm.value;
      currentRow = { ...currentRow, status: st };
      renderView(currentRow);
    }
    showView();
  });

  root.querySelector('#shelfEditBrew')?.addEventListener('click', () => {
    const id = editingId;
    close();
    if (id) (root.querySelector(`[data-shelf-brew="${id}"]`) as HTMLElement)?.click();
  });

  statusView.addEventListener('change', async () => {
    const st = statusView.value;
    if (currentRow) currentRow.status = st;
    await saveStatusOnly(st);
    opts.onSaved();
  });

  const save = async () => {
    if (!editingId) return;
    const name = (root.querySelector('#shelfEditName') as HTMLInputElement).value.trim();
    if (!name) {
      const msg = root.querySelector('#shelfEditMsg') as HTMLElement;
      msg.className = 'shelf-edit-msg err';
      msg.textContent = 'Нужно название';
      return;
    }
    const roaster = (root.querySelector('#shelfEditRoaster') as HTMLInputElement).value.trim() || null;
    const variety = (root.querySelector('#shelfEditVariety') as HTMLInputElement).value.trim() || null;
    const country = readCountryFromSelect(
      root.querySelector('#shelfEditCountry') as HTMLSelectElement,
      root.querySelector('#shelfEditCountryCustom') as HTMLInputElement,
    );
    const process = (root.querySelector('#shelfEditProcess') as HTMLSelectElement).value.trim() || null;
    const status = statusForm.value || 'ok';
    const msg = root.querySelector('#shelfEditMsg') as HTMLElement;
    const btn = root.querySelector('#shelfEditSave') as HTMLButtonElement;
    msg.className = 'shelf-edit-msg';
    msg.textContent = 'Сохраняю…';
    btn.disabled = true;
    const { error } = await opts.supabase
      .from('shelf_items')
      .update({ name, roaster, country, process, variety, status })
      .eq('id', editingId)
      .eq('user_id', opts.userId);
    btn.disabled = false;
    if (error) {
      msg.className = 'shelf-edit-msg err';
      msg.textContent = error.message;
      return;
    }
    close();
    opts.onSaved();
  };

  root.querySelector('#shelfEditSave')?.addEventListener('click', () => void save());

  const bindOpen = (el: Element, mode: 'view' | 'edit') => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = (el as HTMLElement).dataset.shelfView || (el as HTMLElement).dataset.shelfEdit;
      if (!id) return;
      const row = opts.getBean(id);
      if (!row) return;
      open(row, mode);
    });
  };

  root.querySelectorAll('[data-shelf-edit]').forEach((btn) => bindOpen(btn, 'edit'));
  root.querySelectorAll('[data-shelf-view]').forEach((btn) => bindOpen(btn, 'view'));
}