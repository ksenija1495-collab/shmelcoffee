/** Зерно «закончилось» — не предлагать в сравнениях и AI-помощнике. */
export function isShelfBeanAvailable(item: { status?: string | null; kind?: string | null }): boolean {
  if (item.kind && item.kind !== 'bean') return true;
  return item.status !== 'out';
}

export function filterAvailableShelfBeans<T extends { status?: string | null; kind?: string | null }>(
  items: T[],
): T[] {
  return items.filter(isShelfBeanAvailable);
}
