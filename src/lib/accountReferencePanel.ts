import { generalGuide } from '../data/generalGuide';
import { DB, countryOrder } from '../data/countries';

const esc = (s: unknown) =>
  String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function renderReferencePanel(): string {
  const countryCards = countryOrder
    .map((k) => {
      const c = (DB as any)[k];
      return `<a class="ref-country-card" href="/countries?c=${k}">
        <span class="ref-flag">${c.flag}</span>
        <span class="ref-name">${esc(c.name)}</span>
        <span class="ref-flavors">${esc((c.flavors || []).slice(0, 3).join(' · '))}</span>
      </a>`;
    })
    .join('');

  const guideSections = generalGuide
    .map(
      (s) =>
        `<details class="gg-sec"><summary>${esc(s.title)}</summary><div class="gg-body">${s.body}</div></details>`,
    )
    .join('');

  return `<div class="ref-links profile-card">
    <div class="ref-links-grid">
      <a href="/countries" class="ref-link-card">🌍 Страны кофе</a>
      <a href="/processing" class="ref-link-card">⚗️ Обработки</a>
      <a href="/brewing" class="ref-link-card">☕ Методы заварки</a>
      <a href="/wheel" class="ref-link-card">🎯 Колесо вкусов</a>
      <a href="/blog/kofejnoe-zerno/strany-kofe" class="ref-link-card">📖 Гид по странам</a>
    </div>
  </div>
  <div class="sub-h">🌍 Страны</div>
  <div class="ref-country-grid">${countryCards}</div>
  <div class="sub-h">📚 Как заваривать</div>
  <div class="general-guide"><div class="gg-head">Справочник Shmelco</div>${guideSections}</div>
  <div class="sub-h" style="margin-top:20px">🔬 Как сравнивать</div>
  <div class="profile-card" style="font-size:.84rem;line-height:1.55">
    <p><b>Один рецепт — два лота.</b> Заваривай оба зерна одинаково (граммы, вода, температура, время), чтобы различия были во вкусе, а не в параметрах.</p>
    <p style="margin-top:10px"><b>Сначала solo, потом рядом.</b> Попробуй каждый отдельно, потом чередуй глотки — так контраст заметнее.</p>
    <p style="margin-top:10px"><b>Запиши вывод.</b> Не «нравится / не нравится», а <i>чем отличаются</i>: кислотность, сладость, аромат, послевкусие.</p>
  </div>`;
}
