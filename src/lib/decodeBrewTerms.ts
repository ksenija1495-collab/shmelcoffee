/** Расшифровка кофейного жаргона для новичков — подставляет пояснение рядом с термином */
export function decodeBrewTerms(text: string): string {
  if (!text) return text;
  let s = text;

  const rules: [RegExp, string][] = [
    [/\bBloom:\s*/gi, 'Предсмачивание (первый замочек): '],
    [/\bbloom\s+(\d)/gi, 'предсмачивание $1'],
    [/\bBloom\b/gi, 'предсмачивание'],
    [/\bблум(инг)?\b/gi, 'предсмачивание'],
    [/\bswirl\b/gi, 'лёгкое закручивание воронки (swirl)'],
    [/\bSwirl\b/g, 'Лёгкое закручивание воронки (swirl)'],
    [/\bbypass\b/gi, 'разбавление водой (bypass)'],
    [/\bBypass\b/g, 'Разбавление водой (bypass)'],
    [/\binverted[-\s]?метод\b/gi, 'перевёрнутый метод (inverted)'],
    [/\binverted\b/gi, 'перевёрнутый (inverted)'],
    [/\bWDT\b/g, 'распределение иглой по зерну (WDT)'],
    [/\bgooseneck\b/gi, 'чайник с тонким носиком (gooseneck)'],
    [/\bpour-over\b/gi, 'пролив через фильтр (pour-over)'],
    [/\bPour-over\b/g, 'Пролив через фильтр (pour-over)'],
    [/\bPOUR OVER\b/g, 'ПРОЛИВ'],
    [/\bflash brew\b/gi, 'горячий пролив сразу на лёд (flash brew)'],
    [/\bFlash brew\b/g, 'Горячий пролив сразу на лёд (flash brew)'],
    [/\byield\b/gi, 'выход в чашку'],
    [/\bristretto\b/gi, 'короткий эспрессо (ristretto)'],
    [/\bCold Drip\b/gi, 'холодное капание (cold drip)'],
    [/\bcold brew\b/gi, 'холодное настаивание (cold brew)'],
    [/\bCold Brew\b/g, 'Холодное настаивание (cold brew)'],
  ];

  for (const [re, rep] of rules) s = s.replace(re, rep);
  return s;
}
