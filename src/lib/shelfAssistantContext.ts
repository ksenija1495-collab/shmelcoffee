import type { SupabaseClient } from '@supabase/supabase-js';
import { DB } from '../data/countries';
import {
  buildDiaryProfileBlock,
  formatDiaryCupLine,
  inferDiaryPairs,
  type DiaryCup,
} from './shelfAssistantDiary';
import {
  formatPairSuggestions,
  formatSavedPairs,
  shelfBeanWithCountryHint,
  suggestPairings,
  type SavedPair,
} from './shelfAssistantPairings';
import { filterAvailableShelfBeans } from './shelfAvailability';

const FLAVOR_LABELS: Record<string, string> = {
  fruity: 'фруктовые',
  floral: 'цветочные',
  chocolate: 'шоколадные',
  caramel: 'карамельные',
  spicy: 'пряные',
  tropical: 'тропические',
};

export async function buildShelfAssistantContext(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const [profileRes, shelfRes, cupsRes, feedbackRes] = await Promise.all([
    admin
      .from('taste_profiles')
      .select('profile_type, preferred_tastes, brew_method, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('shelf_items')
      .select('name, roaster, country, process, variety, status, kind')
      .eq('user_id', userId)
      .eq('kind', 'bean')
      .order('name', { ascending: true }),
    admin
      .from('cups')
      .select(
        'name, country, process, variety, brew_method, rating, comment, created_at, recipe, acidity, sweetness, body, bitterness, taste_character',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(24),
    admin
      .from('shelf_assistant_feedback')
      .select('bean_a, bean_b, note, kind, created_at')
      .eq('user_id', userId)
      .eq('kind', 'pairing_success')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;
  const shelfAll = shelfRes.data ?? [];
  const shelf = filterAvailableShelfBeans(shelfAll);
  const cups = (cupsRes.data ?? []) as DiaryCup[];
  const savedPairs = feedbackRes.error ? [] : ((feedbackRes.data ?? []) as SavedPair[]);
  const inferredPairs = inferDiaryPairs(cups);

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const diaryProfileBlock = buildDiaryProfileBlock(cups);

  const quizBlock = profile
    ? `Квиз (справочно, может расходиться с дневником): ${profile.profile_type || '—'}. Вкусы: ${(profile.preferred_tastes || [])
        .map((f: string) => FLAVOR_LABELS[f] || f)
        .join(', ') || '—'}. Способ: ${profile.brew_method || '—'}.`
    : 'Квиз не пройден.';

  const shelfBlock = shelf.length
    ? shelf.map((b, i) => `${i + 1}. ${shelfBeanWithCountryHint(b)}`).join('\n')
    : 'Полка пуста.';

  const pairBlock = formatPairSuggestions(suggestPairings(shelf, cups, savedPairs));

  const successLines: string[] = [];
  if (savedPairs.length) {
    successLines.push('Отмечено пользователем:');
    successLines.push(formatSavedPairs(savedPairs));
  }
  if (inferredPairs.length) {
    successLines.push('Из дневника (в один день, 4+★, разные страны):');
    successLines.push(
      inferredPairs.map((p) => `- ${p.a} × ${p.b} — ${p.note}`).join('\n'),
    );
  }
  const successBlock = successLines.length
    ? successLines.join('\n')
    : 'Пока нет отмеченных удачных пар.';

  const cupsBlock = cups.length
    ? cups.slice(0, 12).map(formatDiaryCupLine).join('\n')
    : 'Чашек в дневнике пока нет.';

  const recentBeanNames = [...new Set(cups.map((c) => c.name).filter(Boolean))].slice(0, 20);

  return `Сегодня: ${today}.

Профиль из дневника (ВАЖНЕЕ квиза):
${diaryProfileBlock}

${quizBlock}

Зёрна на полке (${shelf.length}):
${shelfBlock}

Предрасчитанные пары для сравнения (опирайся на них, объясни «зачем»):
${pairBlock}

Удачные пары:
${successBlock}

Недавние чашки (полные данные — рецепты и сенсорика):
${cupsBlock}

Лоты из дневника (могут не быть на полке): ${recentBeanNames.join(', ') || '—'}

Правила ответа:
- Главный источник — дневник и предрасчитанные пары, не квиз.
- Опирайся только на полку, дневник и список лотов выше; не выдумывай пачки.
- Не предлагай лоты, которых нет на полке в наличии (статус «закончилось» / out — их нет в списке полки выше).
- Если просят сравнение — назови 2 конкретных лота и зачем; предпочитай предрасчитанные пары.
- Не предлагай пары, где один лот уже ≤3★ в дневнике, если есть альтернатива.
- Если пользователь просит «с другой страной» — только cross-origin, не два лота одной страны.
- Рецепты давай структурно: доза, вода, °C, помол, время, проливы; копируй успешные рецепты из дневника, если подходят.
- AeroPress с байпасом: зерно+вода в AP, пресс, потом долить bypass-воду мимо кофе.
- V60: bloom + проливы; «до N мл» = итоговый вес на весах.
- Пиши по-русски, коротко, тон Shmelco — умный, без воды.`;
}

/** Для UI: имена лотов для выбора пары. */
export function mergeBeanNameOptions(
  shelf: { name: string }[],
  cups: { name: string }[],
): string[] {
  return [...new Set([...shelf.map((s) => s.name), ...cups.map((c) => c.name)].filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'ru'),
  );
}
