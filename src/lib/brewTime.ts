/** Секунды → «m:ss» для хранения */
export function formatBrewTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4);
}

/** Живое форматирование при наборе: 150 → 1:50, 30 → 0:30 */
export function formatBrewTimeDisplay(digits: string): string {
  const d = digitsOnly(digits);
  if (!d) return '';

  if (d.length === 1) return d;

  if (d.length === 2) {
    const n = parseInt(d, 10);
    if (n < 60) return `0:${d.padStart(2, '0')}`;
    return formatBrewTime(n);
  }

  const secStr = d.slice(-2);
  const minStr = d.slice(0, -2);
  const sec = parseInt(secStr, 10);
  if (sec >= 60) return formatBrewTime(parseInt(d, 10));
  const min = parseInt(minStr, 10) || 0;
  return `${min}:${secStr.padStart(2, '0')}`;
}

/** «45», «150», «0:45», «1:30» → нормализованное «m:ss» */
export function parseBrewTimeInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  if (t.includes(':')) {
    const [mp, sp] = t.split(':');
    const m = parseInt(mp, 10);
    const s = parseInt(sp, 10);
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) return null;
    return formatBrewTime(m * 60 + s);
  }

  const digits = digitsOnly(t);
  if (!digits) return null;

  if (digits.length <= 2) {
    return formatBrewTime(parseInt(digits, 10));
  }

  const display = formatBrewTimeDisplay(digits);
  if (!display.includes(':')) return formatBrewTime(parseInt(digits, 10));

  const [mp, sp] = display.split(':');
  const m = parseInt(mp, 10);
  const s = parseInt(sp, 10);
  if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) return null;
  return formatBrewTime(m * 60 + s);
}

export function bindBrewTimeInput(el: HTMLInputElement | null) {
  if (!el || el.dataset.brewTimeBound) return;
  el.dataset.brewTimeBound = '1';

  el.addEventListener('input', () => {
    const digits = digitsOnly(el.value);
    const formatted = formatBrewTimeDisplay(digits);
    el.value = formatted;
    el.setSelectionRange(formatted.length, formatted.length);
  });

  el.addEventListener('blur', () => {
    if (!el.value.trim()) return;
    const normalized = parseBrewTimeInput(el.value);
    if (normalized) el.value = normalized;
  });
}

export function readBrewTimeInput(el: HTMLInputElement | null): string | null {
  if (!el) return null;
  const v = el.value.trim();
  if (!v) return null;
  return parseBrewTimeInput(v);
}

export function setBrewTimeInputValue(el: HTMLInputElement | null, value: string | null | undefined) {
  if (!el) return;
  if (!value) {
    el.value = '';
    return;
  }
  const normalized = parseBrewTimeInput(value);
  el.value = normalized || value;
}
