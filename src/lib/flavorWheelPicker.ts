import { buildFlavorWheelSvgHtml, type WheelCat } from './flavorWheel';

export type NoteWheelPickerOptions = {
  svgId?: string;
  panelId?: string;
  isSelected: (note: string) => boolean;
  onToggle: (note: string, catName: string) => void;
  onCustomAdd?: (note: string, catName: string) => void;
  escHtml?: (s: string) => string;
};

function defaultEsc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export function syncNoteWheelSelection(svgId: string, isSelected: (note: string) => boolean) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  svg.querySelectorAll('path[data-type="sub"]').forEach((p) => {
    const note = (p as SVGPathElement).dataset.note;
    if (!note) return;
    p.classList.toggle('wheel-seg-selected', isSelected(note));
  });
}

function renderPanel(
  cat: WheelCat,
  panel: HTMLElement,
  opts: NoteWheelPickerOptions,
) {
  const esc = opts.escHtml ?? defaultEsc;
  panel.innerHTML = `
    <div class="note-wheel-panel-head">
      <span class="note-wheel-panel-dot" style="background:${cat.color}"></span>
      <h3>${esc(cat.name)}</h3>
      <span class="note-wheel-panel-count">${cat.subs.length} подсказок</span>
    </div>
    <p class="note-wheel-panel-hint">Нажми — добавить или убрать ноту</p>
    <div class="note-wheel-chip-grid">${cat.subs.map((s) => {
      const on = opts.isSelected(s.name);
      return `<button type="button" class="note-wheel-chip${on ? ' on' : ''}" data-note="${esc(s.name)}" data-cat="${esc(cat.name)}">
        <span class="note-wheel-chip-name">${esc(s.name)}</span>
        <span class="note-wheel-chip-org">${esc(s.org)}</span>
      </button>`;
    }).join('')}</div>
    ${opts.onCustomAdd ? `
    <div class="note-custom-row note-wheel-custom">
      <input type="text" class="note-custom-inp" data-cat="${esc(cat.name)}" placeholder="Своя нота в «${esc(cat.name)}»…"/>
      <button type="button" class="note-custom-add" data-cat="${esc(cat.name)}" aria-label="Добавить ноту">+</button>
    </div>` : ''}`;
  panel.classList.add('active');

  panel.querySelectorAll('.note-wheel-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const el = btn as HTMLElement;
      opts.onToggle(el.dataset.note!, el.dataset.cat!);
      el.classList.toggle('on', opts.isSelected(el.dataset.note!));
      syncNoteWheelSelection(opts.svgId ?? 'noteWheelSvg', opts.isSelected);
    });
  });

  if (opts.onCustomAdd) {
    const addBtn = panel.querySelector('.note-custom-add') as HTMLButtonElement | null;
    const inp = panel.querySelector('.note-custom-inp') as HTMLInputElement | null;
    const submit = () => {
      if (!inp || !addBtn) return;
      const val = inp.value.trim();
      if (!val) { inp.focus(); return; }
      opts.onCustomAdd!(val, addBtn.dataset.cat || cat.name);
      inp.value = '';
      panel.querySelectorAll('.note-wheel-chip').forEach((chip) => {
        const n = (chip as HTMLElement).dataset.note!;
        chip.classList.toggle('on', opts.isSelected(n));
      });
      syncNoteWheelSelection(opts.svgId ?? 'noteWheelSvg', opts.isSelected);
    };
    addBtn?.addEventListener('click', (e) => { e.preventDefault(); submit(); });
    inp?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
  }
}

export function initNoteWheelPicker(wheelData: WheelCat[], options: NoteWheelPickerOptions) {
  const svgId = options.svgId ?? 'noteWheelSvg';
  const panelId = options.panelId ?? 'noteWheelPanel';
  const svg = document.getElementById(svgId);
  const panel = document.getElementById(panelId);
  if (!svg || !panel) return;

  svg.setAttribute('viewBox', '0 0 720 720');
  svg.innerHTML = buildFlavorWheelSvgHtml(wheelData, { centerLabel: 'single' });
  syncNoteWheelSelection(svgId, options.isSelected);

  let activeCat = 0;
  renderPanel(wheelData[activeCat], panel, options);

  svg.querySelectorAll('path[data-type]').forEach((p) => {
    const el = p as SVGPathElement;
    el.style.transition = 'opacity .15s, filter .15s, stroke .12s';

    el.addEventListener('mouseenter', () => {
      el.style.opacity = '0.82';
      el.style.filter = 'brightness(1.08)';
    });
    el.addEventListener('mouseleave', () => {
      if (!el.classList.contains('wheel-seg-selected')) {
        el.style.opacity = '1';
        el.style.filter = 'none';
      }
    });

    el.addEventListener('click', () => {
      if (el.dataset.type === 'sub') {
        const catIdx = parseInt(el.dataset.cat!, 10);
        const subIdx = parseInt(el.dataset.sub!, 10);
        const cat = wheelData[catIdx];
        const sub = cat.subs[subIdx];
        options.onToggle(sub.name, cat.name);
        syncNoteWheelSelection(svgId, options.isSelected);
        if (activeCat !== catIdx) {
          activeCat = catIdx;
          renderPanel(cat, panel, options);
        } else {
          panel.querySelectorAll('.note-wheel-chip').forEach((chip) => {
            const n = (chip as HTMLElement).dataset.note!;
            chip.classList.toggle('on', options.isSelected(n));
          });
        }
        return;
      }
      const idx = parseInt(el.dataset.idx!, 10);
      activeCat = idx;
      renderPanel(wheelData[idx], panel, options);
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

export function refreshNoteWheelPanel(
  wheelData: WheelCat[],
  catName: string | null,
  options: NoteWheelPickerOptions,
) {
  const panelId = options.panelId ?? 'noteWheelPanel';
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const cat = catName ? wheelData.find((c) => c.name === catName) : wheelData[0];
  if (cat) renderPanel(cat, panel, options);
  syncNoteWheelSelection(options.svgId ?? 'noteWheelSvg', options.isSelected);
}
