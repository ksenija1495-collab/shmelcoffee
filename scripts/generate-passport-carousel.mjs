import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Inline archetypes (mirror src/data/passportArchetypes.ts)
const ARCHETYPES = [
  { id: 'fruity', name: 'Фруктовый исследователь', emoji: '🍓', line: 'ищет яркость и сочную кислотность', wheelFams: ['Ягоды', 'Цитрус', 'Фрукты'], tags: ['Ягодные', 'Цитрусовые', 'Сочные'] },
  { id: 'floral', name: 'Цветочный эстет', emoji: '🌸', line: 'любит тонкие чайные и цветочные ноты', wheelFams: ['Цветочный'], tags: ['Чайные', 'Жасмин', 'Деликатные'] },
  { id: 'chocolate', name: 'Шоколадный гедонист', emoji: '🍫', line: 'выбирает плотность, орех и какао', wheelFams: ['Ореховый'], tags: ['Какао', 'Орехи', 'Плотное тело'] },
  { id: 'caramel', name: 'Карамельный уютник', emoji: '🍯', line: 'ценит сладость, мёд и карамель', wheelFams: ['Сладкий'], tags: ['Мёд', 'Карамель', 'Уют'] },
  { id: 'spicy', name: 'Пряный авантюрист', emoji: '🌶️', line: 'тянется к специям и характеру', wheelFams: ['Пряный', 'Обжарочный'], tags: ['Специи', 'Характер', 'Смелые'] },
  { id: 'tropical', name: 'Тропический мечтатель', emoji: '🥭', line: 'обожает спелые тропические фрукты', wheelFams: ['Фрукты'], tags: ['Манго', 'Ананас', 'Экзотика'] },
];

// Dynamic import compiled TS won't work easily — duplicate minimal wheel from data
const wheelData = [
  { name: 'Цветочный', color: '#E8A0BF', subs: [{}, {}, {}] },
  { name: 'Ягоды', color: '#C0392B', subs: [{}, {}, {}] },
  { name: 'Фрукты', color: '#E67E22', subs: [{}, {}, {}] },
  { name: 'Цитрус', color: '#F1C40F', subs: [{}, {}, {}] },
  { name: 'Сладкий', color: '#D4A574', subs: [{}, {}, {}] },
  { name: 'Ореховый', color: '#8B6914', subs: [{}, {}, {}] },
  { name: 'Пряный', color: '#A0522D', subs: [{}, {}, {}] },
  { name: 'Обжарочный', color: '#5D4037', subs: [{}, {}, {}] },
];

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function buildMiniWheel(pref, size = 320) {
  const cx = size / 2, cy = size / 2;
  const ir1 = 40, ir2 = 88, or1 = 92, or2 = 142, gap = 1.2;
  const n = wheelData.length, catAng = 360 / n;
  const p2 = (r, deg) => { const rad = (deg - 90) * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
  const sector = (ri, ro, a1, a2) => {
    const A = p2(ro, a1), B = p2(ro, a2), C = p2(ri, a2), D = p2(ri, a1);
    const lg = a2 - a1 > 180 ? 1 : 0;
    return `M${A.x},${A.y} A${ro},${ro},0,${lg},1,${B.x},${B.y} L${C.x},${C.y} A${ri},${ri},0,${lg},0,${D.x},${D.y}Z`;
  };
  let html = `<circle cx="${cx}" cy="${cy}" r="${ir1 - 6}" fill="#F8F7ED"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Georgia,serif" font-size="14" font-weight="600" fill="#462918">ВКУС</text>`;
  wheelData.forEach((cat, i) => {
    const a1 = i * catAng + gap, a2 = (i + 1) * catAng - gap;
    const on = pref.has(cat.name);
    html += `<path d="${sector(ir1, ir2, a1, a2)}" fill="${cat.color}" opacity="${on ? 1 : 0.16}" stroke="#fff" stroke-width="1.5"/>`;
    const subAng = (a2 - a1) / cat.subs.length;
    cat.subs.forEach((_s, j) => {
      const sa1 = a1 + j * subAng + gap * 0.4, sa2 = a1 + (j + 1) * subAng - gap * 0.4;
      html += `<path d="${sector(or1, or2, sa1, sa2)}" fill="${cat.color}" opacity="${on ? 0.7 : 0.1}" stroke="#fff" stroke-width="0.8"/>`;
    });
  });
  return html;
}

function passportCarouselSvg(arch, slideIndex, total) {
  const pref = new Set(arch.wheelFams);
  const wheel = buildMiniWheel(pref);
  const tagSpacing = 220;
  const tagsX = 540 - ((arch.tags.length - 1) * tagSpacing) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fffaf2"/><stop offset="100%" stop-color="#f0e4d0"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="48" y="48" width="984" height="1254" rx="36" fill="#fff" fill-opacity="0.55" stroke="#E4D0B9" stroke-width="2"/>
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="#a87c4f">ВКУСОВОЙ ПАСПОРТ · SHMELCO</text>
  <text x="540" y="240" text-anchor="middle" font-size="120">${arch.emoji}</text>
  <text x="540" y="340" text-anchor="middle" font-family="Georgia,serif" font-size="64" font-weight="700" fill="#462918">${escapeXml(arch.name)}</text>
  <text x="540" y="410" text-anchor="middle" font-family="Inter,sans-serif" font-size="32" fill="#7a5c48">${escapeXml(arch.line)}</text>
  <g transform="translate(380, 440)">${wheel}</g>
  <g transform="translate(${tagsX}, 1080)">${arch.tags.map((t, i) => `<g transform="translate(${i * tagSpacing}, 0)"><rect x="-90" y="-36" width="180" height="52" rx="26" fill="rgba(168,124,79,0.12)" stroke="rgba(168,124,79,0.35)"/><text x="0" y="8" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" font-weight="600" fill="#a87c4f">${escapeXml(t)}</text></g>`).join('')}</g>
  <text x="540" y="1180" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" fill="#a89080">Пройди тест на shmelcoffee.com → узнай свой тип</text>
  <text x="540" y="1240" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" fill="#a89080">shmelcoffee.com</text>
  <text x="980" y="1280" text-anchor="end" font-family="Inter,sans-serif" font-size="20" fill="#c9ad8e">${slideIndex}/${total}</text>
</svg>`;
}

const outDir = join(root, 'public/passport-carousel');
mkdirSync(outDir, { recursive: true });

ARCHETYPES.forEach((arch, i) => {
  const svg = passportCarouselSvg(arch, i + 1, ARCHETYPES.length);
  writeFileSync(join(outDir, `${arch.id}.svg`), svg, 'utf8');
});

writeFileSync(
  join(outDir, 'README.txt'),
  `Карусель паспорта вкуса — 6 слайдов (1080×1350 SVG).\nКонвертация в PNG: открой SVG в Figma/Sketch или https://cloudconvert.com/svg-to-png\n`,
  'utf8',
);

console.log(`Generated ${ARCHETYPES.length} slides → public/passport-carousel/`);
