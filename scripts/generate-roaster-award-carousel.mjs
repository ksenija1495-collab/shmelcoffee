import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

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

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxLen) {
  const words = String(text).split(/\s+/);
  const lines = [];
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

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(180deg, #fffaf2 0%, #f0e4d0 100%);
    color: #462918;
  }
  .frame {
    position: absolute; inset: 48px;
    border-radius: 36px;
    background: rgba(255,255,255,0.55);
    border: 2px solid #E4D0B9;
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    padding: 48px 40px 56px;
  }
  .kicker {
    font-size: 22px; font-weight: 700; letter-spacing: 5px;
    color: #a87c4f; text-transform: uppercase; margin-bottom: 24px;
  }
  .emoji { font-size: 96px; line-height: 1.1; margin: 8px 0 16px; }
  .emoji-lg { font-size: 100px; margin: 16px 0 24px; }
  .emoji-md { font-size: 88px; margin: 24px 0; }
  .title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 58px; font-weight: 700; line-height: 1.08;
    color: #462918; max-width: 900px;
  }
  .title-sm { font-size: 52px; }
  .subtitle {
    font-size: 30px; color: #7a5c48; margin-top: 18px; max-width: 860px; line-height: 1.35;
  }
  .country { font-size: 28px; color: #7a5c48; margin-top: 8px; }
  .roaster { font-size: 32px; font-weight: 600; margin-top: 18px; }
  .city { font-size: 26px; color: #a89080; margin-top: 8px; }
  .pill {
    display: inline-block; margin-top: 28px; padding: 18px 36px;
    border-radius: 36px; background: rgba(168,124,79,0.12);
    border: 1px solid rgba(168,124,79,0.35);
    font-size: 28px; font-weight: 600; color: #a87c4f;
  }
  .hint { font-size: 26px; color: #7a5c48; margin-top: auto; padding-top: 32px; }
  .score-wrap {
    width: 116px; height: 116px; border-radius: 50%;
    border: 3px solid rgba(90,140,90,0.45);
    background: rgba(90,140,90,0.15);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    margin: 24px 0 8px;
  }
  .score { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 44px; font-weight: 700; color: #4a7a45; line-height: 1; }
  .score-label { font-size: 20px; color: #7a5c48; margin-top: 4px; }
  .badge { font-size: 24px; font-weight: 600; color: #a87c4f; margin-top: 16px; max-width: 820px; line-height: 1.35; }
  .tags { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-top: 28px; }
  .tag {
    padding: 10px 22px; border-radius: 24px;
    background: rgba(168,124,79,0.1); border: 1px solid rgba(168,124,79,0.3);
    font-size: 24px; font-weight: 600; color: #a87c4f;
  }
  .cta-btn {
    margin-top: 28px; padding: 18px 48px; border-radius: 32px;
    background: #462918; color: #fffaf2; font-size: 28px; font-weight: 700;
  }
  .footer {
    position: absolute; left: 0; right: 0; bottom: 72px;
    text-align: center; color: #a89080;
  }
  .footer-line { font-size: 26px; }
  .footer-site { font-size: 24px; margin-top: 10px; }
  .footer-num {
    position: absolute; right: 72px; bottom: 48px;
    font-size: 20px; color: #c9ad8e;
  }
`;

function htmlShell(body, slideIndex, total) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="frame">${body}</div>
  <div class="footer">
    <div class="footer-line">Полный гид → shmelcoffee.com/blog/kofejnoe-zerno/loty-obzharshchik-goda</div>
    <div class="footer-site">shmelcoffee.com</div>
  </div>
  <div class="footer-num">${slideIndex}/${total}</div>
</body>
</html>`;
}

function coverHtml(slideIndex, total) {
  return htmlShell(`
    <div class="kicker">Обжarщик года 2026 · SHMELCO</div>
    <div class="emoji-lg">🏆</div>
    <div class="title">Зерно, которое<br>оценили судьи</div>
    <div class="subtitle">Лучшие лоты российских обжarщиков · сезон 2025/2026</div>
    <div class="pill">67 обжarщиков · 114 лотов · 37 судей</div>
    <div class="hint">Листай → топ с баллами 85–88+</div>
  `.replace(/Обжarщик/g, 'Обжарщик').replace(/обжarщик/g, 'обжарщик'), slideIndex, total);
}

function lotHtml(lot, slideIndex, total) {
  const badges = wrapText(lot.badge || '', 42).map((l) => `<div class="badge">${esc(l)}</div>`).join('');
  const tags = lot.notes.map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  return htmlShell(`
    <div class="kicker">Лот · оценён судьями</div>
    <div class="emoji">${lot.flag}</div>
    <div class="country">${esc(lot.country)}</div>
    <div class="title title-sm">${esc(lot.lot)}</div>
    <div class="roaster">${esc(lot.roaster)}</div>
    <div class="city">${esc(lot.city)}</div>
    <div class="score-wrap">
      <div class="score">${esc(lot.score)}</div>
      <div class="score-label">CQI · этап 1</div>
    </div>
    ${badges}
    <div class="tags">${tags}</div>
  `, slideIndex, total);
}

function ctaHtml(slideIndex, total) {
  return htmlShell(`
    <div class="kicker">SHMELCO COFFEE GUIDE</div>
    <div class="emoji-md">☕</div>
    <div class="title title-sm">Попробуй и запиши</div>
    <div class="subtitle">Тест вкуса → подборка → карта стран</div>
    <div class="cta-btn">shmelcoffee.com/quiz</div>
    <div class="hint">Запиши чашку → открой страну на карте</div>
  `, slideIndex, total);
}

// --- SVG (optional source files) ---
function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function bg() {
  return `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fffaf2"/><stop offset="100%" stop-color="#f0e4d0"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#bg)"/>
  <rect x="48" y="48" width="984" height="1254" rx="36" fill="#fff" fill-opacity="0.55" stroke="#E4D0B9" stroke-width="2"/>`;
}

function footerSvg(slideIndex, total) {
  return `<text x="540" y="1180" text-anchor="middle" font-family="Inter,sans-serif" font-size="26" fill="#a89080">Полный гид → shmelcoffee.com/blog/kofejnoe-zerno/loty-obzharshchik-goda</text>
  <text x="540" y="1240" text-anchor="middle" font-family="Inter,sans-serif" font-size="24" fill="#a89080">shmelcoffee.com</text>
  <text x="980" y="1280" text-anchor="end" font-family="Inter,sans-serif" font-size="20" fill="#c9ad8e">${slideIndex}/${total}</text>`;
}

function coverSvg(slideIndex, total) {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${bg()}
  <text x="540" y="120" text-anchor="middle" font-family="Inter,sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#a87c4f">ОБЖARЩИК ГОДА 2026 · SHMELCO</text>
  ${footerSvg(slideIndex, total)}</svg>`;
}

function lotSvg(lot, slideIndex, total) {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${bg()}
  <text x="540" y="420" text-anchor="middle" font-family="Georgia,serif" font-size="52" font-weight="700" fill="#462918">${escapeXml(lot.lot)}</text>
  ${footerSvg(slideIndex, total)}</svg>`;
}

function ctaSvg(slideIndex, total) {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${bg()}${footerSvg(slideIndex, total)}</svg>`;
}

const outDir = join(root, 'public/roaster-award-carousel');
mkdirSync(outDir, { recursive: true });

const total = 1 + CAROUSEL_LOTS.length + 1;
const slides = [
  { file: '00-cover', html: coverHtml(1, total), svg: coverSvg(1, total) },
  ...CAROUSEL_LOTS.map((lot, i) => ({
    file: `${String(i + 1).padStart(2, '0')}-${lot.id}`,
    html: lotHtml(lot, i + 2, total),
    svg: lotSvg(lot, i + 2, total),
  })),
  {
    file: `${String(CAROUSEL_LOTS.length + 1).padStart(2, '0')}-cta`,
    html: ctaHtml(total, total),
    svg: ctaSvg(total, total),
  },
];

for (const slide of slides) {
  writeFileSync(join(outDir, `${slide.file}.svg`), slide.svg, 'utf8');
}

writeFileSync(
  join(outDir, 'README.txt'),
  `Карусель «Лоты Обжarщик года» — ${total} слайдов (1080×1350 PNG).\nОтправляй .png в Instagram / Telegram.\nПерегенерация: node scripts/generate-roaster-award-carousel.mjs\n`,
  'utf8',
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

for (const slide of slides) {
  await page.setContent(slide.html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(outDir, `${slide.file}.png`),
    type: 'png',
    fullPage: false,
  });
  console.log('PNG', slide.file);
}

await browser.close();
console.log(`Generated ${total} PNG slides → public/roaster-award-carousel/`);
