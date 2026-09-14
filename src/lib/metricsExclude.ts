/** UUID владельца / тестовых аккаунтов — не попадают в продуктовые метрики. */
export const DEFAULT_METRICS_EXCLUDE_USER_IDS = [
  'd83618c4-5c8f-4e82-a79d-eeba7a148661', // ksenija14.95@gmail.com
];

export function metricsExcludeUserIdsFromEnv(): string[] {
  const raw = (import.meta.env.METRICS_EXCLUDE_USER_IDS as string) || '';
  const fromEnv = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_METRICS_EXCLUDE_USER_IDS;
}

export function mergeExcludedIds(primary: string[], extra: string[] = []): Set<string> {
  return new Set([...primary, ...extra].filter(Boolean));
}

export function isMetricsExcluded(userId: string | null | undefined, excluded: Set<string>): boolean {
  return Boolean(userId && excluded.has(userId));
}
