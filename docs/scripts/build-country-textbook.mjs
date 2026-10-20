/**
 * Генерирует полные country-textbook/*.md из src/data/countries.ts
 * Запуск: node docs/scripts/build-country-textbook.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEEP } from './country-textbook-deep-blocks.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ts = readFileSync(join(root, 'src/data/countries.ts'), 'utf8');

const orderMatch = ts.match(/export const countryOrder = \[([\s\S]*?)\];/);
const order = [...orderMatch[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);

function parseCountry(key) {
  const re = new RegExp(`\\s${key}:\\s*\\{([\\s\\S]*?)\\n  \\}(?:,|\\n\\};)`, 'm');
  const block = ts.match(re)?.[1];
  if (!block) return null;
  const pick = (field) => {
    const m = block.match(new RegExp(`${field}:'([^']*(?:\\\\'[^']*)*)'`, 's'))
      || block.match(new RegExp(`${field}:'([^']*)'`));
    return m ? m[1].replace(/\\'/g, "'") : '';
  };
  const flavorsM = block.match(/flavors:\[(.*?)\]/s);
  const flavors = flavorsM
    ? [...flavorsM[1].matchAll(/'([^']*)'/g)].map((x) => x[1])
    : [];
  return {
    key,
    name: pick('name'),
    flag: pick('flag'),
    region: pick('region'),
    altitude: pick('altitude'),
    varieties: pick('varieties'),
    aDesc: pick('aDesc'),
    bDesc: pick('bDesc'),
    growing: pick('growing'),
    fact: pick('fact'),
    proc: pick('proc'),
    brew: pick('brew'),
    compare: pick('compare'),
    flavors,
  };
}

const links = {
  ethiopia: '../variety-textbook/kurume-jarc-ethiopia.md',
  kenya: '../variety-textbook/sl28-sl34-kenya-vs-bolivia.md',
  guatemala: '../variety-textbook/geisha-panama-guatemala-ethiopia.md',
  panama: '../variety-textbook/geisha-panama-guatemala-ethiopia.md',
  indonesia: '../variety-textbook/java-frinsa-sigarar-ateng-timor.md',
  burundi: '../variety-textbook/bourbon-red-yellow-pink.md',
};

function brewPhysics(c) {
  const highAcid = /ярк|высок|фосфор|90|95/.test(c.aDesc + c.flavors.join(' '));
  const lowAcid = /низк|very low|10/.test(c.aDesc) || c.key === 'brazil' || c.key === 'indonesia';
  const light = /лёгк|чайн|light/i.test(c.bDesc);
  if (highAcid && light) {
    return `**Пролив (V60, Switch открытый)** — основной способ: **лёгкие** ароматы и **кислота** выходят **рано**, пока вода **течёт сквозь** слой. **91–94 °C**, **ступенчатые** проливы, drawdown **не обрывать** рано (under → «кисло и пусто»).\n\n**Иммерсия** (Switch **долго** закрыт, турка) — **риск**: вместо **цветка/ягод** получишь **сухой** **хвост** и **горечь**, особенно на **светлой** обжарке.`;
  }
  if (lowAcid) {
    return `**Низкая кислотность** → **иммерсия** (AP, french press, espresso, moka) **часто** **лучше**, чем **длинный** **горячий** V60: **тело и сладость** **важнее** **«верха»**.\n\n**V60** **можно**, но **89–92 °C**, **не** **ждать** **Ethiopia-clarity**. **Перегрев** → **плоская горечь**, не «яркость».`;
  }
  return `**Сбалансированный** профиль: **V60** **91–93 °C** для **чистоты**; **AP / Switch короткий** для **сладости**. **Не** **менять** **сразу** **метод, темп и помол** — **один** рычаг за сессию.\n\n**Эспрессо** и **молоко** — **уместны**, если **лот** **ориентирован** на **шоколад/орех** (Colombia, Peru, Nicaragua).`;
}

function abTests(c) {
  const deepAb = DEEP[c.key]?.ab;
  if (deepAb?.length) {
    return deepAb.map((t, i) => `${i + 1}. ${t}`).join('\n');
  }
  const tests = [];
  if (/Ethiopia|эфиоп/i.test(c.compare) || c.key === 'ethiopia') {
    tests.push('**Мытая vs natural** **одного** **региона** (Sidama, Guji…).');
  }
  if (c.key === 'kenya' || c.key === 'bolivia') {
    tests.push('**Один** **рецепт V60**, **Kenya SL** vs **Bolivia SL** — **terroir**, не **сорт**.');
  }
  if (c.key === 'indonesia') {
    tests.push('**Sumatra wet-hull** vs **Java washed/natural** — **не** **сравнивать** как «одну Индонезию».');
  }
  if (c.key === 'vietnam') {
    tests.push('**Robusta phin** vs **Son La arabica V60** — **две** **разные** **страны** **в** **одном** **паспорте**.');
  }
  if (tests.length < 2) {
    tests.push('**Washed vs honey** (или **natural**) **одного** **региона**, **один** **метод** **заварки**.');
  }
  tests.push('**Остывающая** **чашка**: **запись** **верх / середина / финиш** при **~55 °C** и **~70 °C**.');
  return tests.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

function md(c) {
  const deep = DEEP[c.key] || {};
  const link = links[c.key];
  const varietyNote = link
    ? `\n\n**Учебник variety / terroir:** [${link}](${link}).`
    : '';
  const flavorLine = c.flavors.length ? c.flavors.join(', ') : '—';
  const regionBlock = deep.regions
    || `${c.name} **неоднородна**: **регион на этикетке** важнее **одного** **«национального»** **вкуса**. Смотри **обработку**, **высоту**, **станцию**.`;
  const procExtra = deep.processing ? `\n\n### Матрица обработка → чашка\n\n${deep.processing}` : '';
  const errorsExtra = deep.errors
    ? `\n${deep.errors.split('\n').map((l) => (l.startsWith('-') ? l : `- ${l}`)).join('\n')}`
    : '';

  return `# ${c.name} ${c.flag}: учебная страница страны

---

## 1. Роль в мире кофе

${c.growing}

**Регион мира:** ${c.region}. **Типичная высота:** ${c.altitude}.  
**В чашке (ориентир):** кислотность — *${c.aDesc}*; тело — *${c.bDesc}*.  
**Частые ноты:** ${flavorLine}.

---

## 2. Регионы и terroir

${regionBlock}

---

## 3. Сорта (variety)

На полях **${c.name}** чаще встречаются: **${c.varieties}**.  
Variety **задаёт склонность**, **обработка и обжарка** — **калибровку** рецепта.${varietyNote}

---

## 4. Обработка и заварка

### Что делают на станции (контекст)

${c.proc}${procExtra}

### Как заваривать дома (из профиля Shmelco)

${c.brew}

**Температура и метод (общая логика):**

${brewPhysics(c)}

---

## 5. Физика чашки и типичные ошибки

- **Under-extract** (слишком **грубо**, **быстрый** **слив**, **холодная** **вода**): **кисло и пусто**, «скучно» — **не** **делай** **вывод** **о** **стране**.
- **Over-extract** (**мелко**, **96 °C**, **длинная** **иммерсия** на **мытом** **light**): **сухой**, **вяжущий** **финиш**.
- **Неверный метод**: **ждать** **Panama-geisha** **в** **турке** **или** **Sumatra-earth** **в** **V60** **95 °C** **без** **калибровки**.${errorsExtra}

---

## 6. A/B для обучения

${abTests(c)}

---

## 7. С кем сравнивать

${c.compare}

---

## 8. Интересный факт

${c.fact}

---

*См. также:* [processing-brewing-atlas.md](../processing-brewing-atlas.md) · [variety-brewing-atlas.md](../variety-brewing-atlas.md) · [country-brewing-atlas.md](../country-brewing-atlas.md)
`;
}

const outDir = join(root, 'docs/country-textbook');
for (const key of order) {
  const c = parseCountry(key);
  if (!c) {
    console.error('skip', key);
    continue;
  }
  const path = join(outDir, `${key}.md`);
  writeFileSync(path, md(c), 'utf8');
  console.log('wrote', path);
}
