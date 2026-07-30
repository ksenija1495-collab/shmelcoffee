import { wheelData } from '../data/wheel';

export type CarouselArchetype = {
  id: string;
  name: string;
  emoji: string;
  line: string;
  wheelFams: string[];
  tags: string[];
};

function buildMiniWheel(pref: Set<string>, size = 320): string {
  const cx = size / 2;
  const cy = size / 2;
  const ir1 = 40;
  const ir2 = 88;
  const or1 = 92;
  const or2 = 142;
  const gap = 1.2;
  const n = wheelData.length;
  const catAng = 360 / n;
  const p2 = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const sector = (ri: number, ro: number, a1: number, a2: number) => {
    const A = p2(ro, a1);
    const B = p2(ro, a2);
    const C = p2(ri, a2);
    const D = p2(ri, a1);
    const lg = a2 - a1 > 180 ? 1 : 0;
    return `M${A.x},${A.y} A${ro},${ro},0,${lg},1,${B.x},${B.y} L${C.x},${C.y} A${ri},${ri},0,${lg},0,${D.x},${D.y}Z`;
  };
  let html = `<circle cx="${cx}" cy="${cy}" r="${ir1 - 6}" fill="#F8F7ED"/>`;
  html += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="600" fill="#462918">ВКУС</text>`;
  wheelData.forEach((cat, i) => {
    const a1 = i * catAng + gap;
    const a2 = (i + 1) * catAng - gap;
    const on = pref.has(cat.name);
    html += `<path d="${sector(ir1, ir2, a1, a2)}" fill="${cat.color}" opacity="${on ? 1 : 0.16}" stroke="#fff" stroke-width="1.5"/>`;
    const subAng = (a2 - a1) / cat.subs.length;
    cat.subs.forEach((_s, j) => {
      const sa1 = a1 + j * subAng + gap * 0.4;
      const sa2 = a1 + (j + 1) * subAng - gap * 0.4;
      html += `<path d="${sector(or1, or2, sa1, sa2)}" fill="${cat.color}" opacity="${on ? 0.7 : 0.1}" stroke="#fff" stroke-width="0.8"/>`;
    });
  });
  return html;
}

/** SVG 1080×1350 для карусели Instagram (4:5). */
export function passportCarouselSvg(arch: CarouselArchetype, slideIndex: number, total: number): string {
  const pref = new Set(arch.wheelFams);
  const wheel = buildMiniWheel(pref);
  const tags = arch.tags
    .map(
      (t) =>
        `<text x="0" y="0" font-family="Inter,sans-serif" font-size="28" font-weight="600" fill="#a87c4f">${escapeXml(t)}</text>`,
    )
    .join('');
  const tagY = 1080;
  const tagSpacing = 220;
  const tagsX = 540 - ((arch.tags.length - 1) * tagSpacing) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="100%" stop-color="#f0e4d0"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="48" y="48" width="984" height="1254" rx="36" fill="#fff" fill-opacity="0.55" stroke="#E4D0B9" stroke-width="2"/>
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="#a87c4f">ВКУСОВОЙ ПАСПОРТ · SHMELCO</text>
  <text x="540" y="240" text-anchor="middle" font-size="120">${arch.emoji}</text>
  <text x="540" y="340" text-anchor="middle" font-family="Georgia,serif" font-size="64" font-weight="700" fill="#462918">${escapeXml(arch.name)}</text>
  <text x="540" y="410" text-anchor="middle" font-family="Inter,sans-serif" font-size="32" fill="#7a5c48">${escapeXml(arch.line)}</text>
  <g transform="translate(380, 440)">${wheel}</g>
  <g transform="translate(${tagsX}, ${tagY})">
    ${arch.tags
      .map(
        (t, i) =>
          `<g transform="translate(${i * tagSpacing}, 0)"><rect x="-90" y="-36" width="180" height="52" rx="26" fill="rgba(168,124,79,0.12)" stroke="rgba(168,124,79,0.35)"/><text x="0" y="8" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" font-weight="600" fill="#a87c4f">${escapeXml(t)}</text></g>`,
      )
      .join('')}
  </g>
  <text x="540" y="1180" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" fill="#a89080">Пройди тест на shmelcoffee.com → узнай свой тип</text>
  <text x="540" y="1240" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" fill="#a89080">shmelcoffee.com</text>
  <text x="980" y="1280" text-anchor="end" font-family="Inter,sans-serif" font-size="20" fill="#c9ad8e">${slideIndex}/${total}</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
