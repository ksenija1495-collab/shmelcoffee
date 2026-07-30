/** PHP-style query (products[0][name]=...) → nested object. */
export function parseProdamusFormBody(raw: string): Record<string, unknown> {
  const flat: Record<string, string> = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decodeURIComponent((eq >= 0 ? pair.slice(0, eq) : pair).replace(/\+/g, ' '));
    const val = decodeURIComponent((eq >= 0 ? pair.slice(eq + 1) : '').replace(/\+/g, ' '));
    flat[key] = val;
  }
  let result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    result = dictMerge(result, dictBuild(parseKey(k), v) as Record<string, unknown>);
  }
  return result;
}

function parseKey(key: string): string[] {
  const m = key.match(/^([^\[]+)(\[.+\])$/);
  if (!m) return [key];
  return [m[1], ...Array.from(m[2].matchAll(/\[([^\]]*)\]/g)).map((x) => x[1])];
}

function dictBuild(idx: string[], value: string): unknown {
  if (!idx.length) return value;
  const [head, ...rest] = idx;
  if (/^\d+$/.test(head)) {
    const arr: unknown[] = [];
    const n = Number(head);
    arr[n] = dictBuild(rest, value);
    return arr;
  }
  return { [head]: dictBuild(rest, value) };
}

function dictMerge(dct: Record<string, unknown>, merge: unknown): Record<string, unknown> {
  if (!merge || typeof merge !== 'object') return dct;
  const out: Record<string, unknown> = { ...dct };

  if (Array.isArray(merge)) {
    return out;
  }

  for (const [k, v] of Object.entries(merge as Record<string, unknown>)) {
    const cur = out[k];
    if (cur === undefined) {
      out[k] = v;
      continue;
    }
    if (Array.isArray(cur) && Array.isArray(v)) {
      const arr = [...cur];
      v.forEach((item, i) => {
        if (item === undefined) return;
        if (arr[i] === undefined) arr[i] = item;
        else if (typeof arr[i] === 'object' && typeof item === 'object' && arr[i] && item) {
          arr[i] = dictMerge(arr[i] as Record<string, unknown>, item);
        } else {
          arr[i] = item;
        }
      });
      out[k] = arr;
    } else if (
      typeof cur === 'object' && cur !== null && !Array.isArray(cur) &&
      typeof v === 'object' && v !== null && !Array.isArray(v)
    ) {
      out[k] = dictMerge(cur as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function parseProdamusPayload(raw: string, contentType: string): Record<string, unknown> {
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === 'object' && parsed && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  if (raw.includes('=')) return parseProdamusFormBody(raw);
  return {};
}

/** Prodamus подписывает вложенный объект submit, не весь POST. */
export function prodamusSubmitPayload(params: Record<string, unknown>): Record<string, unknown> {
  const submit = params.submit;
  if (submit && typeof submit === 'object' && !Array.isArray(submit)) {
    return submit as Record<string, unknown>;
  }
  return params;
}

export function prodamusPaymentFields(params: Record<string, unknown>): Record<string, unknown> {
  const submit = prodamusSubmitPayload(params);
  return Object.keys(submit).length ? submit : params;
}
