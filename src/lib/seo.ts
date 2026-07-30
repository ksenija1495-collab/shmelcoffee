export const SITE_URL = 'https://shmelcoffee.com';
export const SITE_NAME = 'Shmelco Coffee Guide';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/blog.png`;

export const CLUSTER_SEO: Record<string, { name: string; pillarSlug: string; ogImage: string }> = {
  C1: { name: 'Основы specialty coffee', pillarSlug: 'specialty-coffee', ogImage: `${SITE_URL}/og/blog-c1.png` },
  C2: { name: 'Методы заваривания', pillarSlug: 'metody-zavarivaniya', ogImage: `${SITE_URL}/og/blog-c2.png` },
  C3: { name: 'Кофейное зерно', pillarSlug: 'kofejnoe-zerno', ogImage: `${SITE_URL}/og/blog-c3.png` },
  C5: { name: 'Дегустация и вкус', pillarSlug: 'degustaciya-kofe', ogImage: `${SITE_URL}/og/blog-c5.png` },
};

export const NOINDEX_PATH_PREFIXES = [
  '/account',
  '/add-cup',
  '/add-shelf',
  '/cup',
  '/login',
  '/auth/callback',
  '/generate',
  '/metrics',
];

export const SITEMAP_EXCLUDE_PREFIXES = [
  ...NOINDEX_PATH_PREFIXES,
  '/api/',
];

export const ORG_SCHEMA = {
  '@type': 'Organization' as const,
  name: 'Shmelco Coffee',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject' as const,
    url: `${SITE_URL}/favicon.svg`,
  },
};

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

export function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isSitemapExcluded(url: string): boolean {
  return SITEMAP_EXCLUDE_PREFIXES.some((p) => url.includes(p));
}
