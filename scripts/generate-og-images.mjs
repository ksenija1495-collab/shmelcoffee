import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/og');
mkdirSync(outDir, { recursive: true });

function ogSvg(title, subtitle, accent = '#a87c4f') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="100%" stop-color="#ead9c4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="#fff" fill-opacity="0.45" stroke="#E4D0B9" stroke-width="2"/>
  <text x="80" y="120" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="${accent}">SHMELCO · COFFEE GUIDE</text>
  <text x="80" y="290" font-family="Georgia,serif" font-size="64" font-weight="700" fill="#462918">${title}</text>
  <text x="80" y="360" font-family="Inter,sans-serif" font-size="30" fill="#7a5c48">${subtitle}</text>
  <text x="80" y="520" font-family="Inter,sans-serif" font-size="24" fill="#a89080">shmelcoffee.com/blog</text>
</svg>`;
}

const images = [
  { file: 'blog.png', title: 'Блог о кофе', subtitle: 'Specialty от зерна до чашки' },
  { file: 'blog-c1.png', title: 'Specialty coffee', subtitle: 'Основы, обжарка, дрип-пакеты' },
  { file: 'blog-c2.png', title: 'Методы заваривания', subtitle: 'V60, аэропресс, кемекс' },
  { file: 'blog-c3.png', title: 'Кофейное зерно', subtitle: 'Сорта, страны, обработка' },
  { file: 'blog-c5.png', title: 'Дегустация и вкус', subtitle: 'Как чувствовать чашку' },
  { file: 'recipes.png', title: 'Чемпионские рецепты', subtitle: 'WBrC · AeroPress · V60' },
];

for (const img of images) {
  const svg = ogSvg(img.title, img.subtitle);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  writeFileSync(join(outDir, img.file), resvg.render().asPng());
}

console.log(`Generated ${images.length} OG images → public/og/`);
