export type ReactivationEmailVars = {
  name?: string;
  topCountry?: string;
  topCountryFlag?: string;
  ctaUrl?: string;
};

/** HTML-письмо re-activation · inline styles для почтовиков */
export function reactivationEmailHtml(v: ReactivationEmailVars = {}): string {
  const name = v.name?.trim() || 'друг';
  const flag = v.topCountryFlag || '☕';
  const country = v.topCountry || 'новую страну';
  const cta = v.ctaUrl || 'https://shmelcoffee.com/add-cup';

  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0e4d0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0e4d0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffaf2;border:1px solid #e4d0b9;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(70,41,24,.12);">
        <tr><td style="padding:28px 32px 8px;text-align:center;">
          <div style="font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#a87c4f;">Shmelco · Coffee Guide</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;font-size:48px;line-height:1;">${flag}</td></tr>
        <tr><td style="padding:12px 32px 0;text-align:center;font-family:Georgia,serif;font-size:28px;font-weight:700;color:#462918;line-height:1.25;">
          ${name}, карта ждёт первую страну
        </td></tr>
        <tr><td style="padding:16px 32px 0;text-align:center;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.65;color:#7a5c48;">
          Ты уже прошла тест вкуса — остался один шаг: записать <b>первую чашку</b> или добавить зерно на полку.<br><br>
          Так откроется ${country} на твоей карте открытий — и профиль станет точнее.
        </td></tr>
        <tr><td style="padding:28px 32px;text-align:center;">
          <a href="${cta}" style="display:inline-block;padding:14px 28px;background:#462918;color:#fffaf2;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">Записать первую чашку →</a>
        </td></tr>
        <tr><td style="padding:0 32px 24px;text-align:center;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.55;color:#a89080;">
          Или добавь зерно: <a href="https://shmelcoffee.com/add-shelf?kind=bean" style="color:#a87c4f;font-weight:600;">полка →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;background:rgba(168,124,79,.08);border-top:1px solid #e4d0b9;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.55;color:#a89080;text-align:center;">
          2 минуты · без обязательств · только твой вкус<br>
          <a href="https://shmelcoffee.com/account?tab=disco" style="color:#a87c4f;">Карта открытий</a> ·
          <a href="https://shmelcoffee.com/blog/kofejnoe-zerno/strany-kofe" style="color:#a87c4f;">Гид по странам</a>
        </td></tr>
      </table>
      <div style="font-family:Inter,Arial,sans-serif;font-size:11px;color:#a89080;margin-top:16px;">shmelcoffee.com · Product Atelier</div>
    </td></tr>
  </table>
</body>
</html>`;
}
