import crypto from 'node:crypto';

/** Рекурсивная сортировка + строковые значения (как в официальной схеме Prodamus). */
export function prodamusSortData(data: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(data).sort()) {
    sorted[key] = prodamusSortValue(data[key]);
  }
  return sorted;
}

function prodamusSortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return prodamusSortData(item as Record<string, unknown>);
      }
      return String(item ?? '');
    });
  }
  if (typeof value === 'object' && value !== null) {
    return prodamusSortData(value as Record<string, unknown>);
  }
  return String(value ?? '');
}

export function prodamusSign(data: Record<string, unknown>, secret: string): string {
  const json = JSON.stringify(prodamusSortData(data));
  return crypto.createHmac('sha256', secret).update(json).digest('hex');
}

export function prodamusVerify(data: Record<string, unknown>, secret: string, sign: string): boolean {
  if (!sign) return false;
  const expected = prodamusSign(data, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected.toLowerCase()),
      Buffer.from(sign.toLowerCase()),
    );
  } catch {
    return expected.toLowerCase() === sign.toLowerCase();
  }
}
