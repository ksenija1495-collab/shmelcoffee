export type BalanceScores = {
  acidity: number;
  sweetness: number;
  bitterness: number;
  body: number;
};

const AXES: { key: keyof BalanceScores; label: string; short: string; angle: number }[] = [
  { key: 'acidity', label: 'Кислотность', short: 'Кислот.', angle: -90 },
  { key: 'sweetness', label: 'Сладость', short: 'Слад.', angle: 0 },
  { key: 'body', label: 'Тело', short: 'Тело', angle: 90 },
  { key: 'bitterness', label: 'Горечь', short: 'Гор.', angle: 180 },
];

function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Radar «колесо баланса» 0–5 для карточки чашки */
export function balanceWheelSvg(scores: BalanceScores, size = 260): string {
  const pad = 36;
  const vb = size + pad * 2;
  const cx = vb / 2;
  const cy = vb / 2;
  const maxR = size * 0.3;
  const maxVal = 5;

  let svg = '';

  for (let ring = 1; ring <= 5; ring++) {
    const r = (maxR * ring) / maxVal;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E4D0B9" stroke-width="${ring === 5 ? 1.2 : 0.6}" opacity="${0.35 + ring * 0.08}"/>`;
  }

  AXES.forEach(({ angle }) => {
    const outer = pt(cx, cy, maxR, angle);
    svg += `<line x1="${cx}" y1="${cy}" x2="${outer.x}" y2="${outer.y}" stroke="#E4D0B9" stroke-width="0.8"/>`;
  });

  const poly = AXES.map(({ key, angle }) => {
    const val = Math.max(0, Math.min(maxVal, scores[key] ?? 0));
    const r = (maxR * val) / maxVal;
    const p = pt(cx, cy, r, angle);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  svg += `<polygon points="${poly}" fill="rgba(168,124,79,.22)" stroke="#a87c4f" stroke-width="2.2" stroke-linejoin="round"/>`;

  AXES.forEach(({ key, short, angle }) => {
    const val = Math.max(0, Math.min(maxVal, scores[key] ?? 0));
    const r = (maxR * val) / maxVal;
    const p = pt(cx, cy, r, angle);
    svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#a87c4f"/>`;
    const lp = pt(cx, cy, maxR + 28, angle);
    const anchor = Math.abs(angle) === 90 ? 'middle' : angle > -90 && angle < 90 ? 'start' : 'end';
    svg += `<text x="${lp.x}" y="${lp.y + 3}" text-anchor="${anchor}" font-family="Inter,sans-serif" font-size="10" font-weight="600" fill="#7a5c48">${short}</text>`;
    svg += `<text x="${lp.x}" y="${lp.y + 17}" text-anchor="${anchor}" font-family="'Cormorant Garamond',serif" font-size="14" font-weight="700" fill="#462918">${val}</text>`;
  });

  svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-size="11" font-weight="600" fill="#a89080">баланс</text>`;

  return `<svg viewBox="0 0 ${vb} ${vb}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Колесо баланса вкуса" style="overflow:visible">${svg}</svg>`;
}
