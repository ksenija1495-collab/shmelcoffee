import { BEAN_VARIETIES, BEAN_VARIETY_OTHER } from '../data/varieties';

export { BEAN_VARIETY_OTHER };

export function toggleVarietyCustomRow(selectId = 'f_variety', rowId = 'varietyCustomRow') {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  const row = document.getElementById(rowId);
  if (!sel || !row) return;
  row.style.display = sel.value === BEAN_VARIETY_OTHER ? 'block' : 'none';
}

export function bindVarietyOther(selectId = 'f_variety', rowId = 'varietyCustomRow') {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  sel?.addEventListener('change', () => toggleVarietyCustomRow(selectId, rowId));
  toggleVarietyCustomRow(selectId, rowId);
}

export function readVarietyValue(selectId = 'f_variety', customId = 'f_variety_custom'): string | null {
  const sel = (document.getElementById(selectId) as HTMLSelectElement | null)?.value;
  if (!sel) return null;
  if (sel === BEAN_VARIETY_OTHER) {
    return (document.getElementById(customId) as HTMLInputElement | null)?.value.trim() || null;
  }
  return sel;
}

export function setVarietyValue(
  value: string | null | undefined,
  selectId = 'f_variety',
  customId = 'f_variety_custom',
  rowId = 'varietyCustomRow',
) {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null;
  const custom = document.getElementById(customId) as HTMLInputElement | null;
  if (!sel) return;
  if (!value) {
    sel.value = '';
    if (custom) custom.value = '';
    toggleVarietyCustomRow(selectId, rowId);
    return;
  }
  if ((BEAN_VARIETIES as readonly string[]).includes(value)) {
    sel.value = value;
    if (custom) custom.value = '';
  } else {
    sel.value = BEAN_VARIETY_OTHER;
    if (custom) custom.value = value;
  }
  toggleVarietyCustomRow(selectId, rowId);
}
