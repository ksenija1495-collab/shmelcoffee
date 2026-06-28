/** Ссылка через трекер кликов → redirect на сайт обжарщика */
export function beanOutUrl(params: {
  url: string;
  name: string;
  roaster: string;
  source: string;
  key?: string;
}): string {
  const q = new URLSearchParams();
  q.set('url', params.url);
  q.set('name', params.name);
  q.set('roaster', params.roaster);
  q.set('source', params.source);
  if (params.key) q.set('key', params.key);
  return `/api/bean-out?${q.toString()}`;
}
