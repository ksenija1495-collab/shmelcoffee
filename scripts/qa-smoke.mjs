/**
 * Smoke: desktop + mobile viewports, script placement, key pages render.
 * Run: node scripts/qa-smoke.mjs [baseUrl]
 */
import { chromium, devices } from 'playwright';

const base = (process.argv[2] || 'http://127.0.0.1:4325').replace(/\/$/, '');
const paths = ['/', '/account/', '/add-cup/', '/quiz/', '/cup/', '/blog/chempionskie-recepty/', '/login/'];
const viewports = [
  { name: 'desktop', context: { viewport: { width: 1280, height: 800 } } },
  { name: 'mobile', context: devices['iPhone 13'] },
];

const errors = [];

function checkHtmlScripts(html, path) {
  const htmlEnd = html.lastIndexOf('</html>');
  if (htmlEnd < 0) return [`${path} missing </html>`];
  const scriptRe = /<script[^>]+type="module"[^>]+src="[^"]+\.js"[^>]*><\/script>/g;
  const found = [];
  let m;
  while ((m = scriptRe.exec(html))) found.push(m.index);
  const after = found.filter((i) => i > htmlEnd);
  if (after.length) return [`${path} module script after </html>`];
  return [];
}

for (const path of paths) {
  const url = base + path;
  const res = await fetch(url);
  if (!res.ok) errors.push(`[static] ${path} HTTP ${res.status}`);
  const html = await res.text();
  errors.push(...checkHtmlScripts(html, path).map((e) => `[static] ${e}`));
}

for (const vp of viewports) {
  const browser = await chromium.launch();
  const context = await browser.newContext(vp.context);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`[${vp.name}] pageerror: ${e.message}`));

  for (const path of paths) {
    const url = base + path;
    let resp;
    try {
      resp = await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    } catch (e) {
      errors.push(`[${vp.name}] ${path} goto: ${e.message}`);
      continue;
    }
    const status = resp?.status() ?? 0;
    if (status >= 400) errors.push(`[${vp.name}] ${path} HTTP ${status}`);

    await page.waitForTimeout(400);

    let bodyLen = 0;
    let title = '';
    try {
      const snap = await page.evaluate(() => ({
        bodyLen: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length,
        title: document.title,
      }));
      bodyLen = snap.bodyLen;
      title = snap.title;
    } catch (e) {
      errors.push(`[${vp.name}] ${path} evaluate: ${e.message}`);
      continue;
    }

    if (bodyLen < 20) errors.push(`[${vp.name}] ${path} nearly empty body (${bodyLen} chars, "${title}")`);
  }

  await browser.close();
}

if (errors.length) {
  console.error('QA FAILED:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}

// Account zone: bottom nav must not use <nav> (conflicts with top nav CSS) and stay short
{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...(viewports.find((v) => v.name === 'mobile')?.context || devices['iPhone 13']), javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/account/', { waitUntil: 'load', timeout: 20000 });
  const navBox = await page.evaluate(() => {
    const el = document.querySelector('.mobile-acc-nav');
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, height: r.height, bottom: r.bottom, vh: window.innerHeight };
  });
  if (navBox.missing) errors.push('[mobile] /account/ missing .mobile-acc-nav (no-js)');
  else {
    if (navBox.tag === 'NAV') errors.push('[mobile] /account/ mobile-acc-nav must not be <nav>');
    if (navBox.height > 120) errors.push(`[mobile] /account/ mobile nav too tall (${Math.round(navBox.height)}px)`);
    if (navBox.bottom < navBox.vh - 4) errors.push('[mobile] /account/ mobile nav not pinned to bottom');
  }
  await browser.close();
}

if (errors.length) {
  console.error('QA FAILED:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('QA OK:', viewports.map((v) => v.name).join(', '), paths.length, 'pages each');
