import { COFFEE_DB } from '../data/coffees';
import { ROASTERS, type RoasterEntry } from '../data/roasters';

const domainByRoasterName = new Map<string, string>();

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

for (const c of COFFEE_DB) {
  const key = c.roaster.trim().toLowerCase();
  if (!key || domainByRoasterName.has(key)) continue;
  const d = domainFromUrl(c.url);
  if (d) domainByRoasterName.set(key, d);
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type ResolvedRoaster = {
  displayName: string;
  logoUrl: string | null;
  initials: string;
};

function initialsFrom(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function logoUrlFor(entry: RoasterEntry, domain?: string): string | null {
  if (entry.logo) return entry.logo;
  const d = entry.domain || domain;
  if (!d) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`;
}

function matchEntry(raw: string): RoasterEntry | null {
  const n = norm(raw);
  if (!n) return null;

  for (const r of ROASTERS) {
    if (norm(r.name) === n) return r;
    for (const a of r.aliases) {
      const al = norm(a);
      if (n === al || n.includes(al) || al.includes(n)) return r;
    }
  }

  for (const r of ROASTERS) {
    const rn = norm(r.name);
    if (n.includes(rn) || rn.includes(n)) return r;
  }

  return null;
}

/** Резолв обжарщика из текстового поля чашки */
export function resolveRoaster(raw?: string | null): ResolvedRoaster | null {
  const name = raw?.trim();
  if (!name) return null;

  const matched = matchEntry(name);
  if (matched) {
    return {
      displayName: matched.name,
      logoUrl: logoUrlFor(matched),
      initials: initialsFrom(matched.name),
    };
  }

  const domain = domainByRoasterName.get(norm(name));
  return {
    displayName: name,
    logoUrl: domain ? logoUrlFor({ name, aliases: [] }, domain) : null,
    initials: initialsFrom(name),
  };
}
