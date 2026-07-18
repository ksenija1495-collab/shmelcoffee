/** Секунды → «m:ss» для хранения */
export function formatBrewTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** «45», «130», «0:45», «1:30» → нормализованное «m:ss» */
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

  const digits = t.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length <= 2) {
    return formatBrewTime(parseInt(digits, 10));
  }

  const sec = parseInt(digits.slice(-2), 10);
  const min = parseInt(digits.slice(0, -2) || '0', 10);
  if (sec >= 60) return formatBrewTime(parseInt(digits, 10));
  return formatBrewTime(min * 60 + sec);
}

/** «m:ss» → компактные цифры для поля: 0:45 → «45», 1:30 → «130» */
export function brewTimeToDigits(normalized: string): string {
  const parsed = parseBrewTimeInput(normalized);
  if (!parsed) return normalized;
  const [m, s] = parsed.split(':').map(Number);
  if (m === 0) return String(s);
  return `${m}${String(s).padStart(2, '0')}`;
}

export function bindBrewTimeInput(el: HTMLInputElement | null) {
  if (!el || el.dataset.brewTimeBound) return;
  el.dataset.brewTimeBound = '1';
  el.addEventListener('input', () => {
    el.value = el.value.replace(/\D/g, '').slice(0, 4);
  });
  el.addEventListener('blur', () => {
    if (!el.value.trim()) return;
    const normalized = parseBrewTimeInput(el.value);
    if (normalized) el.value = brewTimeToDigits(normalized);
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
  if (!value) { el.value = ''; return; }
  const normalized = parseBrewTimeInput(value);
  el.value = normalized ? brewTimeToDigits(normalized) : value;
}
