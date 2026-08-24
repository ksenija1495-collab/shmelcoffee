import type { SupabaseClient } from '@supabase/supabase-js';

const FLAVOR_LABELS: Record<string, string> = {
  fruity: 'фруктовые',
  floral: 'цветочные',
  chocolate: 'шоколадные',
  caramel: 'карамельные',
  spicy: 'пряные',
  tropical: 'тропические',
};

function line(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

export async function buildShelfAssistantContext(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const [profileRes, shelfRes, cupsRes] = await Promise.all([
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
      .select('name, country, process, variety, brew_method, rating, comment, created_at, recipe')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const profile = profileRes.data;
  const shelf = shelfRes.data ?? [];
  const cups = cupsRes.data ?? [];

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const profileBlock = profile
    ? `Профиль вкуса: ${profile.profile_type || '—'}. Вкусы: ${(profile.preferred_tastes || [])
        .map((f: string) => FLAVOR_LABELS[f] || f)
        .join(', ') || '—'}. Способ: ${profile.brew_method || '—'}.`
    : 'Профиль вкуса не заполнен.';

  const shelfBlock = shelf.length
    ? shelf
        .map(
          (b, i) =>
            `${i + 1}. ${b.name}${b.roaster ? ` (${b.roaster})` : ''} — ${line([
              b.country,
              b.process,
              b.variety,
              b.status && b.status !== 'ok' ? `запас: ${b.status}` : null,
            ])}`,
        )
        .join('\n')
    : 'Полка пуста.';

  const cupsBlock = cups.length
    ? cups
        .slice(0, 8)
        .map((c) => {
          const date = c.created_at?.slice(0, 10) || '';
          const rating = c.rating ? `${c.rating}/5` : 'без оценки';
          const brew = c.brew_method ? `, ${c.brew_method}` : '';
          const note = c.comment ? ` — «${String(c.comment).slice(0, 120)}»` : '';
          return `- ${date}: ${c.name}${brew}, ${rating}${note}`;
        })
        .join('\n')
    : 'Чашек в дневнике пока нет.';

  return `Сегодня: ${today}.

${profileBlock}

Зёрна на полке (${shelf.length}):
${shelfBlock}

Недавние чашки:
${cupsBlock}

Правила ответа:
- Опирайся только на полку и дневник пользователя; не выдумывай лоты.
- Если просят сравнение — назови конкретные 2 лота с полки и зачем.
- Рецепты давай структурно: доза, вода, °C, помол, время, проливы.
- AeroPress с байпасом: зерно+вода в AP, пресс, потом долить bypass-воду мимо кофе (разбавление).
- V60: bloom + проливы; «до N мл» = итоговый вес на весах.
- Пиши по-русски, коротко и по делу, тон Shmelco — умный, без воды.`;
}
