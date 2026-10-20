/** Дополнительные блоки для country-textbook (§2 регионы, §4 матрица, §5 ошибки, §6 A/B). */
export const DEEP = {
  ethiopia: {
    regions: `**Родина *Coffea arabica*.** Export specialty держится на **имени региона + обработке**, не на «одной Эфиопии».

### Карта зон

| Зона | Высота / контекст | Архетип в чашке | Обработка | Заварка (ориентир) |
|------|-------------------|-----------------|-----------|-------------------|
| **Yirgacheffe** (Gedeo) | 1700–2200 m, прохладные ночи | жасмин, bergamot, чай, лимон | **washed** — эталон «чистой» Эфиопии | V60 **92–94 °C**, ступенчатые проливы |
| **Sidama** | плато, лесные участки | ягода + цитрус, чуть плотнее Yirg | washed / natural / honey | natural **89–91 °C**; washed **92–93 °C** |
| **Guji** | юг, новые станции | вино, ягода, тропик (natural) | **natural / anaerobic** boom | Switch **короткий** или V60 **мягче** на funky |
| **Jimma / Limu** | запад | цитрус, специи, мягче «цветка» | washed чаще | V60 **91–93 °C** |
| **Harrar** | восток, сухой климат | **natural «дикий»**: сухофрукт, вино, не «чай» | **natural** классика | не ждать Yirgacheffe-clarity; **89–92 °C** |

### Heirloom на поле

**Kurume, Dega, Wolisho**, линии **JARC 74xxx**, отдельные **Gesha**-участки — см. учебник variety.

### Что читать на этикетке

**Регион → станция (washing station) → обработка → высота.** Одна страна — десятки «микро-стран».`,
    processing: `| Обработка | В чашке | Типичная ошибка | Заварка |
|-----------|---------|-----------------|---------|
| **Washed** | цветок, bergamot, чай | **96 °C** + мелкий помол → сухой финиш | V60 **92–94 °C** |
| **Natural** | ягода, вино, компот | перегрев → **фермент + горечь** | **89–91 °C**, короче иммерсия |
| **Honey** | мед, слива, округлость | путать с natural «грязью» | V60 **91–93 °C** |
| **Anaerobic** | тропик, специя, «конфета» | один неудачный лot → вывод «не моё» | **AP 88–90 °C** или Switch **короткий** |`,
    errors: `- **Kenya-temp (96 °C)** на **мытой Yirgacheffe** → вяжущая сухость вместо «сочной» кислоты.\n- **French press / long immersion** на **delicate washed** → потеря прозрачности, «грязный» цветок.\n- **Один лот natural Guji** → вывод «Эфиопия = вино» (игнор washed Sidama).`,
    ab: ['**Washed vs natural** одного региона (Sidama, Guji, Yirgacheffe).', '**Одна станция, два урожая** — сезон vs возраст зерна (если есть).', '**Остывающая чашка** ~55 °C vs ~70 °C — где живёт bergamot.'],
  },
  kenya: {
    regions: `**Scott Labs 1930‑е:** **SL-28 / SL-34** задали «kenyan profile». **Nairobi auction**, классы **AA, AB** — **screen size**, не «лучший вкус», но маркер плотности зерна.

| Регион | Terroir | В чашке | Заметка |
|--------|---------|---------|---------|
| **Nyeri** | склоны Mt. Kenya, красная вулканическая почва | смородина, томат, грейпфрут | часто «референс» Kenya |
| **Kirinyaga** | сосед Nyeri, чуть мягче | ягода + цитрус, чистота | AA — плотное зерно |
| **Embu, Murang'a** | восточные склоны | яркая кислота, специи | смотри **double washed** |
| **1400–2000 m** | прохладные ночи | **phosphoric** «сочность» | не путать с «кислотой» under-extract |`,
    processing: `| Стиль | Смысл | Заварка |
|-------|-------|---------|
| **Double washed** | ферментация + второй промыв → **чистота + яркость** | V60 **медленный**, **92–94 °C** |
| **Natural Kenya** | редкость, тропик + ягода | **90–92 °C**, не «африканский максимум» |`,
    errors: `- **Длинная горячая иммерсия** → **tannin**, сухой хвост.\n- **Не пить остывающую** — **tomato / currant** часто **лучше на 50–60 °C**.\n- **Ждать цветочную Эфиопию** — другой архетип.`,
    ab: ['**Kenya SL vs Bolivia SL** — один рецепт V60, terroir вместо сорта.', '**AA vs AB** одного кооператива (если есть) — плотность vs прозрачность.'],
  },
  rwanda: {
    regions: `**Post-2000:** инвестиции в **washing stations** — страна как **модель recovery через quality**.

| Зона | Высота | Профиль | Заварка |
|------|--------|---------|---------|
| **Lake Kivu hills** | **1900 m+** | красное яблоко, цветок, чай | V60 / Switch **91–93 °C** |
| **Nyamasheke, Huye** | крутые склоны | honey/natural **растут** | natural **−1–2 °C** к washed |
| **Мелкие фермеры → станция** | смесь сортов | **неоднородность** → ступенчатый пролив | **Остывание критично** |`,
    errors: `- **Перегрев** на **лёгком washed** → «острый» финиш.\n- **Switch долго закрыт** на **delicate** → сухость.`,
    ab: ['**Washed vs honey** одной станции.', '**Rwanda vs Burundi** — мягче vs ярче при схожем Bourbon.'],
  },
  burundi: {
    regions: `**«Младший брат Kenya»** — ярко, но **мягче** и **чаще сладость**.

| Регион | Контекст | Чашка |
|--------|----------|-------|
| **Kayanza** | холмы к озеру | красная ягода, цитрус |
| **Ngozi** | север | цветок, мед |
| **Tanganyika hills** | восток | структура, чай |

**Red Bourbon, Mibirizi, Jackson** — washed доминирует; **natural на CoE** — отдельная игра.`,
    errors: `- **96 °C V60** на **light washed** → сухой финиш (как Kenya, но тело легче).\n- **Espresso first** на **floral lots** → потеря верха.`,
    ab: ['**Burundi vs Rwanda** blind на одной температуре.', '**Natural CoE vs classic washed** — граница «компот / ягода».'],
  },
  drcongo: {
    regions: `**Kivu** — **1800–2200 m**, **Red Bourbon**, **мелкие фермеры + станции**.

| Зона | Профиль | Обработка |
|------|---------|-----------|
| **Kalehe, Bukavu** | ягода, цитрус, **чуть дикее** Rwanda | **washed** — лучший баланс |
| **Логистика** | риск дефектов / нестабильности | **natural** — **комpot risk** |

**Лёгкое тело** — не давить **long hot immersion**.`,
    errors: `- **Ожидать Kenya-density** — чашка **прозрачнее и легче**.\n- **Natural без контроля** → **компот**, не «Guji funky».`,
    ab: ['**DRC Kivu vs Rwanda** — «дикость» ягоды.', '**Washed only** vs natural (если есть пара).'],
  },
  malawi: {
    regions: `**Две «страны» в одном паспорте:**

| Зона | Кто / высота | Terroir | Чашка |
|------|--------------|---------|-------|
| **Ngapani, Chipale** (Sable) | **1000–1400 m**, капельное орошение, **574 ha** | стабильный «plantation» профиль | **чёрный чай**, цитрус, **лёгкое тело** |
| **North (Mzuzu, Nyika, Viphya)** | **1200–1700 m**, мелкие фермеры, **больше дождей** | ярче кислота | абрикос, цветок, лакрица |

**1879:** весь export arabica — от **одного** выжившего дерева; позже **Geisha 56 и Agaro** из Эфиопии — **rust resistance**, не panama auction story.`,
    processing: `| Стиль | Доступность | Заварка |
|-------|-------------|---------|
| **Washed** | **~единственный** стандарт | V60, Chemex, **AP + bypass** |
| **Natural / honey (Sable)** | редко до РФ | мягче °C, короче иммерсия |`,
    errors: `- **Ждать Panama Geisha** от **Geisha 56** — другая генетика и цель селекции.\n- **Espresso** — **мало density**, профиль **разваливается**.\n- **Путать с Kenya** — **нет** смородины/томата, **чайная** структура.`,
    ab: ['**Ngapani vs north** (если есть оба) — plantation vs farmer brightness.', '**Malawi Geisha 56 vs Panama Geisha** — снять ожидания.'],
  },
  colombia: {
    regions: `**Андский «универсал» specialty** — от **comfort washed** до **experimental anaerobic**.

| Регион | Высота / контекст | Архетип |
|--------|-------------------|---------|
| **Huila** | 1500–1900 m | сладость, красное яблоко, карамель |
| **Nariño** | юг, холоднее | яркая кислота, цитрус |
| **Cauca** | indigenous + microlots | honey/natural boom |
| **Antioquia** | север, традиция | орех, шоколад (чаще коммерция) |

**Castillo vs Caturra vs Colombia variety** — **не** ждать одного профиля от «Colombia».`,
    processing: `| Линия | Чашка | Заварка |
|-------|-------|---------|
| **Classic washed** | орех, кaramel, яблоко | V60, espresso, AP |
| **Honey / natural** | тропик, вино | **−1–2 °C**, experimental осторожно |
| **Anaerobic** | «конфета», специя | **AP / Switch короткий** |`,
    errors: `- **Geisha-ожидания** от **Castillo**.\n- **Один anaerobic fail** → «Colombia не моё».`,
    ab: ['**Huila washed vs Cauca honey**.', '**Espresso vs V60** на одном classic washed.'],
  },
  brazil: {
    regions: `**~35% мирового объёма** — **fazendas**, механизация, **ниже средняя высота** vs Andes.

| Регион | Профиль | Сбор |
|--------|---------|------|
| **Minas Gerais** | орех, шоколад, **низкая kislota** | natural norm |
| **Cerrado** | стабильный «commercial specialty» | pulped natural |
| **São Paulo / Mogiana** | сладость, body | natural / PN |

**800–1400 m** — **не** ждать Ethiopia-clarity без **washed microlot**.`,
    processing: `| Обработка | Чашка | Заварка |
|-----------|-------|---------|
| **Natural (dry)** | шоколад, орех, плотность | espresso, moka, AP; V60 **89–91 °C** |
| **Pulped natural** | чище, кaramel | универсал |
| **Washed Brazil** | реже, **другой** профиль | V60 **91–92 °C** |`,
    errors: `- **95 °C V60** на **natural high** → **горькая** плоскость.\n- **Ждать яркую kislota** без **конкретного microlot**.`,
    ab: ['**Natural vs pulped natural** одной fazenda.', '**Cold brew vs hot V60** — шоколадная ось.'],
  },
  peru: {
    regions: `**Comfort specialty** — **мягкий шоколад-орех**, без крайностей.

| Регион | Контекст |
|--------|----------|
| **Cajamarca** | северные Андes, **1600–1900 m** |
| **Cusco** | юг, **Typica / Bourbon** |
| **San Martín** | переходная зона, **Catimor** в миксе |

**Мелкие кооперативы** — **washed** как база.`,
    errors: `- **Under-extract** → «кисло и пусто» **не** значит «Peru sour» — часто **просто рецепт**.\n- **Сравнивать с Kenya** — другая ось (комфорт).`,
    ab: ['**Cajamarca vs Cusco** washed.', '**AP vs V60** на одном лоте — body vs clarity.'],
  },
  bolivia: {
    regions: `**Высокогорный specialty** — **Yungas (Caranavi)**, **Samaypata**.

| Контекст | Сорта | Чашка |
|----------|-------|-------|
| **1600–2000 m** | **SL-28/34**, Batian, Typica, **Java**, Geisha | **персик, сливочность**, не kenyan currant |
| **Rodriguez / naturals** | specialty naturals | вино, ягода — **отдельная калибровка °C** |

**Espresso убивает сливочность** на **delicate SL** lots.`,
    errors: `- **Kenya-рецепт** на **Bolivia SL** → сухость.\n- **Espresso first** на **Batian AP-lots**.`,
    ab: ['**Bolivia SL vs Kenya SL** — terroir test.', '**Washed vs Rodriguez natural**.'],
  },
  guatemala: {
    regions: `**Вулканы, ** **Bourbon culture**, **filter Geisha** (Rosma) vs **espresso Antigua**.

| Регион | Terroir | Архетип |
|--------|---------|---------|
| **Antigua** | Volcán de Agua / Fuego | **шоколад, орех**, структура |
| **Huehuetenango** | **1500–2000 m**, сухой ветер | **fruity, winey** potential |
| **Acatenango** | высота | цитрус, сладость |
| **Cobán** | влажность, туман | **floral, tea** |

**Rosma Geisha** — **V60 91–92 °C**, percolation; см. учебник Geisha §3.1.`,
    processing: `| Обработка | Заварка |
|-----------|---------|
| **Washed** | структура, **espresso Antigua** |
| **Honey** | сладость, **V60 91–93 °C** |
| **Geisha microlot** | **только filter**, не «универсал» |`,
    errors: `- **Panama-temp на Guatemala Geisha** без калибровки → сухость.\n- **Один Huehuetenango natural** → вывод «вся Guatemala = вино».`,
    ab: ['**Antigua espresso vs Huehuetenango V60**.', '**Honey vs washed** одного региона.'],
  },
  honduras: {
    regions: `| Регион | Высота | Профиль |
|--------|--------|---------|
| **Copán** | запад | шоколад, орех + **яркость** на high grown |
| **Marcala** | **1200–1600 m** | **citric, clean washed** |
| **Santa Bárbara** | север | honey/natural specialty |

**Parainema, IHCAFE lines** — смотри **обработку**, не только сорт.`,
    errors: `- **Low grown как espresso only** — **Marcala high** **требует V60**.\n- **Путать commodity** с **Cup of Excellence lots**.`,
    ab: ['**Marcala washed vs Copán honey**.', '**High vs lower altitude** (если указано).'],
  },
  costarica: {
    regions: `**Robusta запрещён законом** — **100% arabica narrative**. **Pioneer honey grades** (yellow / red / black).

| Регион | Профиль |
|--------|---------|
| **Tarrazú** | яблоко, кaramel, **clean acid** |
| **West Valley** | honey experiments, **fruity** |

**Black honey** — **ближе к natural по экстракции** → **AP pressure / короче пролив**.`,
    errors: `- **Black honey как washed** → **переэкстракция** или **грязь**.\n- **Игнорировать grade honey** на этикетке.`,
    ab: ['**Yellow vs red vs black honey** одного региона.', '**Tarrazú washed vs honey**.'],
  },
  panama: {
    regions: `**Boquete, Volcán Barú** — **1500–1900+ m**, **Geisha** как **отдельная категория** от «Panama Caturra».

| Линия | Чашка | Заварка |
|-------|-------|---------|
| **Washed Geisha** | жасмин, bergamot, tea | **V60 90–92 °C**, **percolation** |
| **Natural Geisha** | тропик, mango | **89–91 °C**, осторожная иммерсия |
| **Caturra/Catuaí** | орех, сладость | espresso / V60 **92 °C** |

См. **geisha-panama-guatemala-ethiopia.md** — percolation vs «запекание».`,
    errors: `- **96 °C + immersion** на **washed Geisha** → «запечённый» хвост.\n- **Сравнивать auction Geisha** с **commodity Panama**.`,
    ab: ['**Washed vs natural Geisha** (если доступны).', '**Geisha vs Caturra** одного региона.'],
  },
  elsalvador: {
    regions: `**Родина Pacamara** (Pacas × Maragogipe). **Volcanoes Santa Ana, Apaneca**.

| Сорт / линия | Чашка | Заварка |
|--------------|-------|---------|
| **Pacamara** | тропик, **big body**, сложный | **V60 slow 90–92 °C** |
| **Bourbon / Pacas** | шоколад, орех | **espresso** |
| **Tekisic** | сладость | универсал |

**CoE tradition** — **honey/natural Pacamara** отдельно от classic washed.`,
    errors: `- **Espresso Pacamara light roast** → горечь вместо тропика.\n- **Pacamara как «быстрый V60»** — нужен **медленный drawdown**.`,
    ab: ['**Pacamara vs Pacas** одной фермы.', '**Honey Pacamara vs washed Bourbon**.'],
  },
  nicaragua: {
    regions: `| Регион | Сорта / профиль |
|--------|-----------------|
| **Matagalpa, Jinotega** | **Maragogipe, Pacamara**, comfort |
| **Nueva Segovia** | **Java**, **bright specialty** |

**Мягкий универсал** — **не** extreme acid / **не** Sumatra earth.`,
    errors: `- **Maragogipe coarse-only** → **watery** — нужен **баланс contact time**.\n- **Ждать Panama Geisha** от **Java Nicaragua**.`,
    ab: ['**Nueva Segovia vs Matagalpa**.', '**Java variety vs Pacamara** (variety test).'],
  },
  indonesia: {
    regions: `**Архipelago — минимум две «Индонезии» в чашке:**

| Остров / стиль | Обработка | Архетип | Заварка |
|----------------|-----------|---------|---------|
| **Sumatra** (Aceh, Lintong, Mandheling) | **giling basah / wet-hull** | земля, табак, **heavy body** | **immersion, espresso**, AP |
| **Java** (Frinsa, West Java) | **washed / natural / lactic** | **wine, berry**, modern natural | **V60 91–93 °C** или **AP 88–90 °C** на funky blend |
| **Sulawesi, Bali, Flores** | mixed | специи, какао, **отдельные правила** | по этикетке |

**Aceh** = **место**. **Ateng** = **сорт**. **Sigarar Utang** = **сорт**.`,
    processing: `| Стиль | Чашка | Не делать |
|-------|-------|-----------|
| Wet-hull Sumatra | earth, tobacco | **95 °C V60** «за clarity» |
| Washed Java | чище, сладость | ждать **Mandheling body** |
| Natural Java funky | lactic, wine | **длинная иммерсия @ 93 °C** |

**Frinsa Manis (natural blend):** **AP 88–90 °C**, bypass — не **Sumatra-рецепт**.`,
    errors: `- **Один Sumatra** → «Indonesia = грязь» (игнор **Java washed**).\n- **Java natural как Sumatra** в **турке долго** → **горечь + ferment**.`,
    ab: ['**Sumatra wet-hull vs Java natural** — не одна страна.', '**Washed Java vs natural Java** одной станции.'],
  },
  vietnam: {
    regions: `**95% robusta** — **commodity phin / espresso**; **specialty arabica** — **отдельная вселенная**.

| Зона | Что это | Заварка |
|------|---------|---------|
| **Dalat (Central Highlands)** | arabica **1200–1600 m** | V60 **92–93 °C**, цитрус |
| **Son La (north)** | **Blue Son La** line | **bright, clean** — filter |
| **Robusta belt** | **phin culture** | **phin, espresso**, **не V60-clarity** |

**Не сравнивать** robusta phin с **Son La arabica** без **переключения ожиданий**.`,
    errors: `- **V60 specialty recipe** на **commodity robusta** → «кисло и пусто».\n- **Один arabica lot** → «Vietnam = citrus» (игнор **robusta majority**).`,
    ab: ['**Phin robusta vs Son La arabica V60** — две страны в одном паспорте.', '**Dalat vs Son La** arabica.'],
  },
  china: {
    regions: `**Yunnan** — **Pu'er, Baoshan, Dehong**; **Hainan** — **robusta** (отдельно от specialty arabica narrative).

| Линия | Сорта | Тренд |
|-------|-------|-------|
| **Classic washed** | Catimor, Typica | орех, **чистая сладость** |
| **New wave** | Geisha experiments | **anaerobic / honey** |

**93–94 °C** на **classic nutty** — норма; **experimental** **−2 °C**.`,
    errors: `- **Ждать Ethiopia** от **Catimor Yunnan**.\n- **Смешивать Hainan robusta** с **Yunnan arabica** в голове.`,
    ab: ['**Classic washed vs anaerobic honey** Yunnan.', '**Yunnan vs Indonesia Java washed**.'],
  },
  yemen: {
    regions: `**XV век, порт Mocha, qahwa** — **древние landraces**, **terraced** **1400–2200 m**, **мало воды**.

| Сорт (landrace) | Контекст |
|-----------------|----------|
| **Udaini, Dawairi, Jaadi** | **не SL-28** — **другая генетика и история** |
| **Регионы на этикетке** | **Haraaz, Sa'adah, Ismaili** — **разные сухость/специя** |

**Только natural** (водный дефicit) — **не** «lazy natural», а **культура**.`,
    processing: `| Метод | Заварка | Профиль |
|-------|---------|---------|
| **Natural sun-dried** | **турка**, V60, AP | **сухофрукт, специя, wine** |
| **Старый crop** | **мягче °C** | риск **плоской** горечи |

**Турка 15 g / 150 ml, grind ~11** — референс из дневника; **не** ждать **Ethiopia flower on V60** как main.`,
    errors: `- **V60 95 °C** как **Yirgacheffe** → **специя + сухость**.\n- **Fresh vs aged Yemen** — **разные** правила (aged **не** «испортился» автоматически).`,
    ab: ['**Turka vs V60** одного лота.', '**Yemen natural vs Ethiopia natural** — spice vs berry-flower.'],
  },
};
