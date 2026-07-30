function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export type CarouselCover = {
  title: string;
  subtitle: string;
  stat: string;
};

export type CarouselLotSlide = {
  id: string;
  flag: string;
  country: string;
  lot: string;
  roaster: string;
  city: string;
  score: string;
  notes: string[];
  badge?: string;
};

export type CarouselCta = {
  title: string;
  line: string;
};

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxLen && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function bg(): string {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="100%" stop-color="#f0e4d0"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="48" y="48" width="984" height="1254" rx="36" fill="#fff" fill-opacity="0.55" stroke="#E4D0B9" stroke-width="2"/>`;
}

function footer(slideIndex: number, total: number): string {
  return `<text x="540" y="1180" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#a89080">Полный гид → shmelcoffee.com/blog/kofejnoe-zerno/loty-obzharshchik-goda</text>
  <text x="540" y="1240" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" fill="#a89080">shmelcoffee.com</text>
  <text x="980" y="1280" text-anchor="end" font-family="Inter,sans-serif" font-size="20" fill="#c9ad8e">${slideIndex}/${total}</text>`;
}

/** Обложка карусели 1080×1350 */
export function awardCarouselCoverSvg(cover: CarouselCover, slideIndex: number, total: number): string {
  const titleLines = wrapText(cover.title, 22);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${bg()}
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#a87c4f">ОБЖARЩИК ГОДА 2026 · SHMELCO</text>
  <text x="540" y="280" text-anchor="middle" font-size="100">🏆</text>
  ${titleLines.map((l, i) => `<text x="540" y="${400 + i * 72}" text-anchor="middle" font-family="Georgia,serif" font-size="58" font-weight="700" fill="#462918">${escapeXml(l)}</text>`).join('')}
  <text x="540" y="620" text-anchor="middle" font-family="Inter,sans-serif" font-size="30" fill="#7a5c48">${escapeXml(cover.subtitle)}</text>
  <rect x="240" y="700" width="600" height="72" rx="36" fill="rgba(168,124,79,0.12)" stroke="rgba(168,124,79,0.35)"/>
  <text x="540" y="748" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" font-weight="600" fill="#a87c4f">${escapeXml(cover.stat)}</text>
  <text x="540" y="860" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#7a5c48">Листай → лучшие лоты с оценкой 85–88+</text>
  ${footer(slideIndex, total)}
</svg>`;
}

/** Карточка лота */
export function awardCarouselLotSvg(lot: CarouselLotSlide, slideIndex: number, total: number): string {
  const badgeLines = lot.badge ? wrapText(lot.badge, 38) : [];
  const tagSpacing = 200;
  const tagsX = 540 - ((lot.notes.length - 1) * tagSpacing) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${bg()}
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#a87c4f">ЛОТ · ОЦЕНЁН СУДЬЯМИ</text>
  <text x="540" y="250" text-anchor="middle" font-size="96">${lot.flag}</text>
  <text x="540" y="330" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" fill="#7a5c48">${escapeXml(lot.country)}</text>
  <text x="540" y="420" text-anchor="middle" font-family="Georgia,serif" font-size="52" font-weight="700" fill="#462918">${escapeXml(lot.lot)}</text>
  <text x="540" y="490" text-anchor="middle" font-family="Inter,sans-serif" font-size="32" font-weight="600" fill="#462918">${escapeXml(lot.roaster)}</text>
  <text x="540" y="535" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#a89080">${escapeXml(lot.city)}</text>
  <circle cx="540" cy="640" r="58" fill="rgba(90,140,90,0.15)" stroke="rgba(90,140,90,0.45)" stroke-width="3"/>
  <text x="540" y="655" text-anchor="middle" font-family="Georgia,serif" font-size="44" font-weight="700" fill="#4a7a45">${escapeXml(lot.score)}</text>
  <text x="540" y="690" text-anchor="middle" font-family="Inter,sans-serif" font-size="20" fill="#7a5c48">CQI · этап 1</text>
  ${badgeLines.map((l, i) => `<text x="540" y="${780 + i * 34}" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" font-weight="600" fill="#a87c4f">${escapeXml(l)}</text>`).join('')}
  <g transform="translate(${tagsX}, 920)">
    ${lot.notes.map((t, i) => `<g transform="translate(${i * tagSpacing}, 0)"><rect x="-88" y="-32" width="176" height="48" rx="24" fill="rgba(168,124,79,0.1)" stroke="rgba(168,124,79,0.3)"/><text x="0" y="6" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" font-weight="600" fill="#a87c4f">${escapeXml(t)}</text></g>`).join('')}
  </g>
  ${footer(slideIndex, total)}
</svg>`;
}

/** Финальный CTA */
export function awardCarouselCtaSvg(cta: CarouselCta, slideIndex: number, total: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${bg()}
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#a87c4f">SHMELCO COFFEE GUIDE</text>
  <text x="540" y="320" text-anchor="middle" font-size="88">☕</text>
  <text x="540" y="430" text-anchor="middle" font-family="Georgia,serif" font-size="54" font-weight="700" fill="#462918">${escapeXml(cta.title)}</text>
  <text x="540" y="520" text-anchor="middle" font-family="Inter,sans-serif" font-size="30" fill="#7a5c48">${escapeXml(cta.line)}</text>
  <rect x="290" y="620" width="500" height="64" rx="32" fill="#462918"/>
  <text x="540" y="662" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" font-weight="700" fill="#fffaf2">shmelcoffee.com/quiz</text>
  <text x="540" y="780" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#a89080">Запиши чашку → открой страну на карте</text>
  ${footer(slideIndex, total)}
</svg>`;
}
