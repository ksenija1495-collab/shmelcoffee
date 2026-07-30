import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const CAROUSEL_LOTS = [
  { id: 'tasty-bolivia-caranavi', flag: '🇧🇴', country: 'Боливия', lot: 'Боливия Caranavi', roaster: 'Tasty Coffee', city: 'Ижевск', score: '88+', notes: ['сочность', 'сладость', 'чистота'], badge: '★ Фаворит Stereo · макс. балл сезона' },
  { id: 'solo-blend-top', flag: '🇨🇴', country: 'Колумбия', lot: 'Blend TOP 2.0', roaster: 'Solo Coffee', city: 'Москва', score: '88+', notes: ['баланс', 'сладость', 'яркость'], badge: 'ТОП-25 · произвольный обжар' },
  { id: 'silky-colombia-finca-satus', flag: '🇨🇴', country: 'Колумбия', lot: 'Колумбия Finca Satus', roaster: 'Silky Drum', city: 'Москва', score: '87+', notes: ['красные ягоды', 'цитрус', 'чистота'], badge: '★ Фаворит Stereo' },
  { id: 'triptych-colombia-plaza', flag: '🇨🇴', country: 'Колумбия', lot: 'Carlos Plaza Bourbon', roaster: 'Triptych Coffee', city: 'Тамбов', score: '87+', notes: ['карамель', 'ягоды', 'структура'], badge: 'ТОП-25 · #1 обязательный обжар' },
  { id: 'hq-kenya-karagoto', flag: '🇰🇪', country: 'Кения', lot: 'Kenya Karagoto AA', roaster: 'HQ! coffee', city: 'Москва', score: '87+', notes: ['смородина', 'цитрус', 'чай'], badge: 'ТОП-25' },
  { id: 'most-colombia-geisha', flag: '🇨🇴', country: 'Колумбия', lot: 'Colombia Geisha', roaster: 'Most Coffee', city: 'Санкт-Петербург', score: '87+', notes: ['жасмин', 'бергамот', 'чай'], badge: 'ТОП-25 · редкий сорт' },
  { id: 'atlas-colombia-pink-bourbon', flag: '🇨🇴', country: 'Колумбия', lot: 'Pink Bourbon', roaster: 'Atlas Coffee', city: 'Иркутск', score: '87+', notes: ['розовый бурбон', 'сладость', 'фрукты'], badge: '🏆 Лучший произвольный обжар' },
  { id: 'kofeop-ethiopia-dukamo', flag: '🇪🇹', country: 'Эфиопия', lot: 'Эфиопия Dukamo CVA', roaster: 'Kofeop', city: 'Челябинск', score: '86+', notes: ['цветы', 'фрукты', 'сложность'], badge: '★ Фаворит Stereo' },
  { id: 'submarine-mexico-la-perla', flag: '🇲🇽', country: 'Мексика', lot: 'Finca La Perla', roaster: 'Submarine', city: 'Москва', score: '86+', notes: ['шоколад', 'орех', 'цитрус'], badge: '★ Фаворит Stereo' },
  { id: 'sok-kenya-riara', flag: '🇰🇪', country: 'Кения', lot: 'Кения Riara', roaster: 'СОК Кофе', city: 'Тюмень', score: '86+', notes: ['смородина', 'чай', 'сочность'], badge: 'ТОП-25 · #1 финалист' },
];

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function wrapText(text, maxLen) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxLen && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function bg() {
  return `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fffaf2"/><stop offset="100%" stop-color="#f0e4d0"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="48" y="48" width="984" height="1254" rx="36" fill="#fff" fill-opacity="0.55" stroke="#E4D0B9" stroke-width="2"/>`;
}

function footer(slideIndex, total) {
  return `<text x="540" y="1180" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#a89080">Полный гид → shmelcoffee.com/blog/kofejnoe-zerno/loty-obzharshchik-goda</text>
  <text x="540" y="1240" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" fill="#a89080">shmelcoffee.com</text>
  <text x="980" y="1280" text-anchor="end" font-family="Inter,sans-serif" font-size="20" fill="#c9ad8e">${slideIndex}/${total}</text>`;
}

function coverSvg(slideIndex, total) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${bg()}
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#a87c4f">ОБЖARЩИК ГОДА 2026 · SHMELCO</text>
  <text x="540" y="280" text-anchor="middle" font-size="100">🏆</text>
  <text x="540" y="400" text-anchor="middle" font-family="Georgia,serif" font-size="58" font-weight="700" fill="#462918">Зерно, которое</text>
  <text x="540" y="472" text-anchor="middle" font-family="Georgia,serif" font-size="58" font-weight="700" fill="#462918">оценили судьи</text>
  <text x="540" y="560" text-anchor="middle" font-family="Inter,sans-serif" font-size="30" fill="#7a5c48">Лучшие лоты российских обжarщиков · сезон 2025/2026</text>
  <rect x="200" y="640" width="680" height="72" rx="36" fill="rgba(168,124,79,0.12)" stroke="rgba(168,124,79,0.35)"/>
  <text x="540" y="688" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" font-weight="600" fill="#a87c4f">67 обжarщиков · 114 лотов · 37 судей</text>
  <text x="540" y="820" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#7a5c48">Листай → топ с баллами 85–88+</text>
  ${footer(slideIndex, total)}
</svg>`;
}

function lotSvg(lot, slideIndex, total) {
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
  <g transform="translate(${tagsX}, 920)">${lot.notes.map((t, i) => `<g transform="translate(${i * tagSpacing}, 0)"><rect x="-88" y="-32" width="176" height="48" rx="24" fill="rgba(168,124,79,0.1)" stroke="rgba(168,124,79,0.3)"/><text x="0" y="6" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" font-weight="600" fill="#a87c4f">${escapeXml(t)}</text></g>`).join('')}</g>
  ${footer(slideIndex, total)}
</svg>`;
}

function ctaSvg(slideIndex, total) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  ${bg()}
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#a87c4f">SHMELCO COFFEE GUIDE</text>
  <text x="540" y="320" text-anchor="middle" font-size="88">☕</text>
  <text x="540" y="430" text-anchor="middle" font-family="Georgia,serif" font-size="54" font-weight="700" fill="#462918">Попробуй и запиши</text>
  <text x="540" y="520" text-anchor="middle" font-family="Inter,sans-serif" font-size="30" fill="#7a5c48">Тест вкуса → подборка → карта стран</text>
  <rect x="290" y="620" width="500" height="64" rx="32" fill="#462918"/>
  <text x="540" y="662" text-anchor="middle" font-family="Inter,sans-serif" font-size="28" font-weight="700" fill="#fffaf2">shmelcoffee.com/quiz</text>
  <text x="540" y="780" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#a89080">Запиши чашку → открой страну на карте</text>
  ${footer(slideIndex, total)}
</svg>`;
}

const outDir = join(root, 'public/roaster-award-carousel');
mkdirSync(outDir, { recursive: true });

const total = 1 + CAROUSEL_LOTS.length + 1;
writeFileSync(join(outDir, '00-cover.svg'), coverSvg(1, total), 'utf8');
CAROUSEL_LOTS.forEach((lot, i) => {
  writeFileSync(join(outDir, `${String(i + 1).padStart(2, '0')}-${lot.id}.svg`), lotSvg(lot, i + 2, total), 'utf8');
});
writeFileSync(join(outDir, `${String(CAROUSEL_LOTS.length + 1).padStart(2, '0')}-cta.svg`), ctaSvg(total, total), 'utf8');

writeFileSync(
  join(outDir, 'README.txt'),
  `Карусель «Лоты Обжarщик года» — ${total} слайдов (1080×1350).\n00-cover → 10 лотов → cta.\nФайлы: .svg (исходник) + .png (для Instagram).\nПерегенерация: node scripts/generate-roaster-award-carousel.mjs\n`,
  'utf8',
);

for (const file of readdirSync(outDir).filter((f) => f.endsWith('.svg'))) {
  const svgPath = join(outDir, file);
  const pngPath = join(outDir, file.replace(/\.svg$/, '.png'));
  const resvg = new Resvg(readFileSync(svgPath, 'utf8'), { fitTo: { mode: 'width', value: 1080 } });
  writeFileSync(pngPath, resvg.render().asPng());
}

console.log(`Generated ${total} slides (+ PNG) → public/roaster-award-carousel/`);
