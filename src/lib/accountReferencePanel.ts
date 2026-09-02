import { generalGuide } from '../data/generalGuide';
import { DB, countryOrder } from '../data/countries';
import { wheelData } from '../data/wheel';
import { initFlavorWheel } from './flavorWheel';

const esc = (s: unknown) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function countryDetailHtml(key: string): string {
  const c = (DB as any)[key];
  if (!c) return '<p>Страна не найдена.</p>';
  return `<div class="ref-country-detail">
    <div class="ref-country-head"><span class="ref-flag">${c.flag}</span><h3>${esc(c.name)}</h3></div>
    <p class="ref-country-lead">${esc(c.growing || c.fact || '')}</p>
    <p><b>Вкусы:</b> ${esc((c.flavors || []).join(', '))}</p>
    <p><b>Обработка:</b> ${esc(c.proc || '—')}</p>
    <p><b>Заварка:</b> ${esc(c.brew || '—')}</p>
    <a href="/countries?c=${esc(key)}" class="ref-ext-link" target="_blank" rel="noopener">Открыть на сайте →</a>
  </div>`;
}

export function renderReferencePanel(): string {
  const countryCards = countryOrder
    .map((k) => {
      const c = (DB as any)[k];
      return `<button type="button" class="ref-country-card" data-ref-country="${esc(k)}">
        <span class="ref-flag">${c.flag}</span>
        <span class="ref-name">${esc(c.name)}</span>
        <span class="ref-flavors">${esc((c.flavors || []).slice(0, 3).join(' · '))}</span>
      </button>`;
    })
    .join('');

  const guideSections = generalGuide
    .map(
      (s) =>
        `<details class="gg-sec"><summary>${esc(s.title)}</summary><div class="gg-body">${s.body}</div></details>`,
    )
    .join('');

  return `<div class="ref-panel" id="refPanel">
    <div class="ref-view" data-ref-view="home">
      <div class="ref-links profile-card">
        <div class="ref-links-grid">
          <button type="button" class="ref-link-card ref-link-btn" data-ref-go="countries">🌍 Страны</button>
          <a href="/processing" class="ref-link-card" target="_blank" rel="noopener">⚗️ Обработки</a>
          <a href="/brewing" class="ref-link-card" target="_blank" rel="noopener">☕ Методы заварки</a>
          <button type="button" class="ref-link-card ref-link-btn" data-ref-go="wheel">🎯 Колесо вкусов</button>
          <a href="/blog/kofejnoe-zerno/strany-kofe" class="ref-link-card" target="_blank" rel="noopener">📖 Блог · страны кофе</a>
        </div>
      </div>
      <div class="sub-h ref-countries-block">🌍 Страны</div>
      <div class="ref-country-grid">${countryCards}</div>
      <div class="sub-h">📚 Как заваривать</div>
      <div class="general-guide"><div class="gg-head">Справочник Shmelco</div>${guideSections}</div>
      <div class="sub-h" style="margin-top:20px">🔬 Как сравнивать</div>
      <div class="profile-card" style="font-size:.84rem;line-height:1.55">
        <p><b>Один рецепт — два лота.</b> Заваривай оба зерна одинаково, чтобы различия были во вкусе.</p>
        <p style="margin-top:10px"><b>Сначала solo, потом рядом.</b> Чередуй глотки — контраст заметнее.</p>
        <p style="margin-top:10px"><b>Запиши вывод.</b> Не «нравится», а <i>чем отличаются</i>.</p>
      </div>
    </div>
    <div class="ref-view" data-ref-view="wheel" hidden>
      <button type="button" class="ref-back" data-ref-back>← Справочник</button>
      <p class="ref-view-hint">Колесо SCA — нажми сектор, чтобы увидеть ноты.</p>
      <div class="ref-wheel-wrap">
        <svg id="refWheelSvg" class="ref-wheel-svg" viewBox="0 0 720 720" aria-label="Колесо вкусов"></svg>
      </div>
    </div>
    <div class="ref-view" data-ref-view="countries" hidden>
      <button type="button" class="ref-back" data-ref-back>← Справочник</button>
      <div class="sub-h">🌍 Страны</div>
      <div class="ref-country-grid">${countryCards}</div>
    </div>
    <div class="ref-view" data-ref-view="country" hidden>
      <button type="button" class="ref-back" data-ref-back-countries>← Страны</button>
      <div id="refCountryBody"></div>
    </div>
  </div>`;
}

let wheelInited = false;

export function bindReferencePanel(root: HTMLElement): void {
  const panel = root.querySelector('#refPanel');
  if (!panel) return;

  const views = panel.querySelectorAll('.ref-view');
  const show = (name: string) => {
    views.forEach((v) => {
      const on = (v as HTMLElement).dataset.refView === name;
      (v as HTMLElement).hidden = !on;
    });
    if (name === 'wheel' && !wheelInited) {
      initFlavorWheel(wheelData as any[], {
        svgId: 'refWheelSvg',
        centerLabel: 'double',
        subTooltipPrefix: '<strong>Где найти:</strong> ',
      });
      wheelInited = true;
    }
  };

  panel.querySelectorAll('[data-ref-back]').forEach((btn) => {
    btn.addEventListener('click', () => show('home'));
  });
  panel.querySelector('[data-ref-back-countries]')?.addEventListener('click', () => show('countries'));

  panel.querySelectorAll('[data-ref-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const go = (btn as HTMLElement).dataset.refGo;
      if (go === 'wheel' || go === 'countries') show(go);
    });
  });

  panel.querySelectorAll('[data-ref-country]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = (btn as HTMLElement).dataset.refCountry || '';
      const body = panel.querySelector('#refCountryBody');
      if (body) body.innerHTML = countryDetailHtml(key);
      show('country');
    });
  });
}

export function resetReferenceToHome(root: HTMLElement): void {
  const panel = root.querySelector('#refPanel');
  if (!panel) return;
  panel.querySelectorAll('.ref-view').forEach((v) => {
    (v as HTMLElement).hidden = (v as HTMLElement).dataset.refView !== 'home';
  });
}
