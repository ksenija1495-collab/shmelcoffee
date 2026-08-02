/*
 * Картинки для превью ссылок (Telegram, LinkedIn, поиск). Запускается в prebuild,
 * поэтому новая статья получает свою карточку автоматически.
 *
 * Что можно задать во фронтматтере статьи:
 *   ogTitle      — короткий заголовок для карточки, если основной длинный
 *   ogPhoto      — путь к фото из public, например /blog/cold-brew/nastoy-v-butylke.jpg
 *   ogPhotoFocus — какую часть фото оставить при обрезке: left | center | right
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const blogDir = join(root, 'src/content/blog');
const publicDir = join(root, 'public');
const outDir = join(publicDir, 'og');

const FONT_FILES = ['CormorantGaramond-Bold.ttf', 'Inter-Regular.ttf', 'Inter-Bold.ttf']
  .map((f) => join(__dirname, 'og-fonts', f));
const RESVG_OPTS = {
  font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  fitTo: { mode: 'width', value: 1200 },
};

const SERIF = 'Cormorant Garamond';
const SANS = 'Inter';
const INK = '#462918';
const MUTED = '#8a6f5c';

const CLUSTERS = {
  C1: { name: 'Основы specialty coffee', accent: '#a87c4f' },
  C2: { name: 'Методы заваривания', accent: '#47624f' },
  C3: { name: 'Кофейное зерно', accent: '#8f5230' },
  C5: { name: 'Дегустация и вкус', accent: '#6d5a3a' },
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Точная ширина строки: resvg отдаёт bbox отрисованного текста, поэтому переносы
   считаются по реальным метрикам шрифта, а не по среднему числу символов. */
function textWidth(text, { size, family, weight = 700, spacing = 0 }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400"><text x="0" y="300" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="#000">${esc(text)}</text></svg>`;
  const box = new Resvg(svg, { font: RESVG_OPTS.font }).getBBox();
  return box ? box.width : text.length * size * 0.5;
}

function wrap(text, maxWidth, font) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitTitle(text, maxWidth, maxLines, sizes) {
  for (const size of sizes) {
    const lines = wrap(text, maxWidth, { size, family: SERIF });
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  return { size, lines: wrap(text, maxWidth, { size, family: SERIF }).slice(0, maxLines) };
}

function photoData(publicPath) {
  const file = join(publicDir, publicPath.replace(/^\//, ''));
  if (!existsSync(file)) {
    console.warn(`  ! og photo not found: ${publicPath}`);
    return null;
  }
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

const FOCUS_ALIGN = { left: 'xMinYMid', center: 'xMidYMid', right: 'xMaxYMid' };

function card({ title, label, accent = '#a87c4f', photo = null, focus = 'center', footer = 'shmelcoffee.com' }) {
  const hasPhoto = Boolean(photo);
  const padX = 76;
  const photoX = 648;
  const panelW = hasPhoto ? photoX : 1200;
  const maxTextW = panelW - padX - 44;
  const { size, lines } = fitTitle(
    title,
    maxTextW,
    hasPhoto ? 4 : 3,
    hasPhoto ? [54, 48, 44, 40, 36] : [72, 64, 56, 50, 44],
  );
  const lineH = Math.round(size * 1.18);
  const blockH = lines.length * lineH;
  const titleTop = Math.round((630 - blockH) / 2) + Math.round(size * 0.76);

  const labelW = label ? textWidth(label, { size: 19, family: SANS, weight: 700, spacing: 1.4 }) : 0;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#FBF9F0"/>
      <stop offset="100%" stop-color="#EDE3D0"/>
    </linearGradient>
    <clipPath id="photoClip">
      <rect x="${photoX}" y="0" width="${1200 - photoX}" height="630"/>
    </clipPath>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  ${hasPhoto
    ? `<g clip-path="url(#photoClip)">
         <image x="${photoX}" y="0" width="${1200 - photoX}" height="630" preserveAspectRatio="${FOCUS_ALIGN[focus] || FOCUS_ALIGN.center} slice" href="${photo}"/>
       </g>
       <rect x="${photoX - 1}" y="0" width="2" height="630" fill="#E4D0B9"/>`
    : `<rect x="40" y="40" width="1120" height="550" rx="26" fill="#ffffff" fill-opacity="0.4" stroke="#E4D0B9" stroke-width="2"/>
       <circle cx="1085" cy="545" r="150" fill="${accent}" fill-opacity="0.07"/>
       <circle cx="1085" cy="545" r="96" fill="${accent}" fill-opacity="0.07"/>`}

  <text x="${padX}" y="106" font-family="${SANS}" font-size="21" font-weight="700" letter-spacing="5.5" fill="${accent}">SHMELCO · COFFEE GUIDE</text>

  ${lines.map((l, i) =>
    `<text x="${padX}" y="${titleTop + i * lineH}" font-family="${SERIF}" font-size="${size}" font-weight="700" fill="${INK}">${esc(l)}</text>`
  ).join('\n  ')}

  ${label
    ? `<rect x="${padX}" y="492" width="${Math.round(labelW) + 40}" height="44" rx="22" fill="${accent}" fill-opacity="0.12"/>
       <text x="${padX + 20}" y="521" font-family="${SANS}" font-size="19" font-weight="700" letter-spacing="1.4" fill="${accent}">${esc(label)}</text>`
    : ''}

  <text x="${padX}" y="574" font-family="${SANS}" font-size="21" font-weight="400" fill="${MUTED}">${esc(footer)}</text>
</svg>`;
}

function render(svg, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, new Resvg(svg, RESVG_OPTS).render().asPng());
}

function readFrontmatter(file) {
  const raw = readFileSync(file, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    data[kv[1]] = value;
  }
  return data;
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.md') ? [full] : [];
  });
}

/* Обзорные страницы блога — те же карточки, чтобы превью выглядели одинаково */
const sections = [
  { file: 'blog.png', title: 'Блог о кофе', label: 'Specialty от зерна до чашки', accent: '#a87c4f' },
  { file: 'blog-c1.png', title: 'Основы specialty coffee', label: 'Обжарка, дрип-пакеты, старт', accent: CLUSTERS.C1.accent },
  { file: 'blog-c2.png', title: 'Методы заваривания', label: 'V60, аэропресс, кемекс, cold brew', accent: CLUSTERS.C2.accent },
  { file: 'blog-c3.png', title: 'Кофейное зерно', label: 'Сорта, страны, обработка', accent: CLUSTERS.C3.accent },
  { file: 'blog-c5.png', title: 'Дегустация и вкус', label: 'Как чувствовать чашку', accent: CLUSTERS.C5.accent },
  { file: 'recipes.png', title: 'Чемпионские рецепты', label: 'WBrC · AeroPress · V60', accent: '#a87c4f' },
];

for (const s of sections) {
  render(card({ title: s.title, label: s.label, accent: s.accent }), join(outDir, s.file));
}

const posts = walk(blogDir);
for (const file of posts) {
  const data = readFrontmatter(file);
  if (!data.title) {
    console.warn(`  ! no title in ${relative(root, file)}`);
    continue;
  }
  const slug = relative(blogDir, file).replace(/\.md$/, '').replace(/\/index$/, '').replace(/^index$/, '');
  const cluster = CLUSTERS[data.cluster] || { name: '', accent: '#a87c4f' };
  // Описание уходит и в поиск, и в превью ссылки: короткое не продаёт, длинное обрежется
  const len = (data.description || '').length;
  if (len < 110 || len > 165) console.warn(`  ! description ${len} симв. (нужно 110–165): ${slug}`);
  render(
    card({
      title: data.ogTitle || data.title,
      label: cluster.name,
      accent: cluster.accent,
      photo: data.ogPhoto ? photoData(data.ogPhoto) : null,
      focus: data.ogPhotoFocus || 'center',
    }),
    join(outDir, 'blog', `${slug}.png`),
  );
}

console.log(`Generated ${sections.length} section + ${posts.length} article OG images → public/og/`);
