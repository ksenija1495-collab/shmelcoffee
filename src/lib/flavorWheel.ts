export type WheelSub = { name: string; org: string };
export type WheelCat = { name: string; color: string; subs: WheelSub[] };

export type FlavorWheelOptions = {
  centerLabel?: 'single' | 'double';
  linkOrigins?: (text: string) => string;
  subTooltipPrefix?: string;
};

const SIZE = 720;
const CX = SIZE / 2;
const CY = SIZE / 2;
const IR1 = 80;
const IR2 = 178;
const OR1 = 186;
const OR2 = 322;
const GAP = 1;

const TEXT = '#2a1608';
const HALO = '#F8F7ED';

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcSector(cx: number, cy: number, ri: number, ro: number, a1: number, a2: number) {
  const p1 = polarToXY(cx, cy, ro, a1);
  const p2 = polarToXY(cx, cy, ro, a2);
  const p3 = polarToXY(cx, cy, ri, a2);
  const p4 = polarToXY(cx, cy, ri, a1);
  const lg = a2 - a1 > 180 ? 1 : 0;
  return `M${p1.x},${p1.y} A${ro},${ro},0,${lg},1,${p2.x},${p2.y} L${p3.x},${p3.y} A${ri},${ri},0,${lg},0,${p4.x},${p4.y}Z`;
}

function hexToHSL(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Tangential rotation — text follows the arc, easier to read than radial. */
function tangentialRot(midA: number) {
  let rot = midA - 90;
  if (midA > 90 && midA < 270) rot += 180;
  return rot;
}

function arcLenAt(r: number, degSpan: number) {
  return (degSpan * Math.PI * r) / 180;
}

function textWidth(name: string, fontSize: number) {
  return name.length * fontSize * 0.56;
}

function labelAttrs(x: number, y: number, rot: number, fontSize: number, weight: number, extra = '') {
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
    transform="rotate(${rot},${x},${y})"
    font-family="'Inter',system-ui,sans-serif" font-size="${fontSize}" font-weight="${weight}"
    fill="${TEXT}" stroke="${HALO}" stroke-width="${Math.max(2.5, fontSize * 0.28)}"
    paint-order="stroke fill" style="pointer-events:none" ${extra}>`;
}

function pickSubFontSize(name: string, arcLen: number) {
  for (const size of [10, 9, 8]) {
    if (textWidth(name, size) <= arcLen * 0.92) return size;
  }
  return 0;
}

function centerMarkup(label: FlavorWheelOptions['centerLabel']) {
  if (label === 'double') {
    return `<text x="${CX}" y="${CY - 8}" text-anchor="middle" dominant-baseline="middle"
      font-family="'Cormorant Garamond',Georgia,serif" font-size="17" font-weight="700" fill="${TEXT}">КОЛЕСО</text>
      <text x="${CX}" y="${CY + 12}" text-anchor="middle" dominant-baseline="middle"
      font-family="'Cormorant Garamond',Georgia,serif" font-size="17" font-weight="700" fill="${TEXT}">ВКУСОВ</text>`;
  }
  return `<text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="middle"
    font-family="'Cormorant Garamond',Georgia,serif" font-size="16" font-weight="600" fill="${TEXT}">ВКУСЫ</text>`;
}

export type BuildWheelSvgOptions = {
  centerLabel?: 'single' | 'double';
  /** Extra attributes on sub-sector paths, e.g. data-note */
  subPathExtra?: (cat: WheelCat, sub: WheelSub) => string;
};

export function buildFlavorWheelSvgHtml(wheelData: WheelCat[], options: BuildWheelSvgOptions = {}): string {
  const n = wheelData.length;
  const catAng = 360 / n;
  let html = `<circle cx="${CX}" cy="${CY}" r="${IR1 - 6}" fill="${HALO}"/>`;
  html += centerMarkup(options.centerLabel ?? 'single');

  wheelData.forEach((cat, i) => {
    const a1 = i * catAng + GAP;
    const a2 = (i + 1) * catAng - GAP;
    html += `<path d="${arcSector(CX, CY, IR1, IR2, a1, a2)}" fill="${cat.color}" data-type="cat" data-idx="${i}" style="cursor:pointer;stroke:${HALO};stroke-width:1.5"/>`;

    const midA = (a1 + a2) / 2;
    const lR = (IR1 + IR2) / 2;
    const pos = polarToXY(CX, CY, lR, midA);
    const catArc = arcLenAt(lR, a2 - a1);
    const catSize = textWidth(cat.name, 13) <= catArc * 0.88 ? 13 : 11;
    html += `${labelAttrs(pos.x, pos.y, tangentialRot(midA), catSize, 700)}${cat.name}</text>`;

    const subAng = (a2 - a1) / cat.subs.length;
    cat.subs.forEach((sub, j) => {
      const sa1 = a1 + j * subAng + GAP * 0.35;
      const sa2 = a1 + (j + 1) * subAng - GAP * 0.35;
      const hsl = hexToHSL(cat.color);
      const lShift = j % 2 === 0 ? 5 : -5;
      const extra = options.subPathExtra?.(cat, sub) || '';
      html += `<path d="${arcSector(CX, CY, OR1, OR2, sa1, sa2)}" fill="hsl(${hsl.h},${hsl.s}%,${hsl.l + lShift}%)" data-type="sub" data-cat="${i}" data-sub="${j}" data-note="${sub.name.replace(/"/g, '&quot;')}" ${extra} style="cursor:pointer;stroke:${HALO};stroke-width:1"/>`;

      const smA = (sa1 + sa2) / 2;
      const sR = (OR1 + OR2) / 2;
      const subArc = arcLenAt(sR, sa2 - sa1);
      const subSize = pickSubFontSize(sub.name, subArc);
      if (subSize > 0) {
        const sp = polarToXY(CX, CY, sR, smA);
        html += `${labelAttrs(sp.x, sp.y, tangentialRot(smA), subSize, 600)}${sub.name}</text>`;
      }
    });
  });

  return html;
}

export function initFlavorWheel(wheelData: WheelCat[], options: FlavorWheelOptions = {}) {
  const svg = document.getElementById('wheelSvg');
  if (!svg) return;

  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.innerHTML = buildFlavorWheelSvgHtml(wheelData, { centerLabel: options.centerLabel ?? 'single' });

  const linkOrigins = options.linkOrigins ?? ((t: string) => t);
  const subPrefix = options.subTooltipPrefix ?? '';

  svg.querySelectorAll('path[data-type]').forEach((p) => {
    const el = p as SVGPathElement;
    el.addEventListener('mouseenter', (e) => {
      const cat = wheelData[el.dataset.type === 'cat' ? el.dataset.idx! : el.dataset.cat!];
      const tt = document.getElementById('wheelTooltip');
      if (el.dataset.type === 'cat') {
        document.getElementById('tooltipTitle')!.textContent = cat.name;
        document.getElementById('tooltipOrigins')!.textContent = 'Нажмите для подробностей';
      } else {
        const sub = cat.subs[parseInt(el.dataset.sub!, 10)];
        document.getElementById('tooltipTitle')!.textContent = sub.name;
        document.getElementById('tooltipOrigins')!.innerHTML = subPrefix + sub.org;
      }
      tt?.classList.add('visible');
      if (tt) {
        tt.style.left = (e as MouseEvent).clientX + 14 + 'px';
        tt.style.top = (e as MouseEvent).clientY + 14 + 'px';
      }
    });
    el.addEventListener('mousemove', (e) => {
      const tt = document.getElementById('wheelTooltip');
      if (tt) {
        tt.style.left = (e as MouseEvent).clientX + 14 + 'px';
        tt.style.top = (e as MouseEvent).clientY + 14 + 'px';
      }
    });
    el.addEventListener('mouseleave', () => {
      document.getElementById('wheelTooltip')?.classList.remove('visible');
    });
    el.addEventListener('click', () => {
      const idx = el.dataset.type === 'cat' ? el.dataset.idx! : el.dataset.cat!;
      showWheelCat(parseInt(idx, 10), wheelData, linkOrigins);
    });
    el.style.transition = 'opacity .15s, filter .15s';
    el.addEventListener('mouseenter', () => {
      el.style.opacity = '0.82';
      el.style.filter = 'brightness(1.08)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.opacity = '1';
      el.style.filter = 'none';
    });
  });
}

export function showWheelCat(
  idx: number,
  wheelData: WheelCat[],
  linkOrigins: (text: string) => string = (t) => t,
) {
  const cat = wheelData[idx];
  const panel = document.getElementById('wheelInfoPanel');
  if (!panel) return;
  panel.innerHTML = `<h3>${cat.name}</h3><div class="wheel-flavor-list">${cat.subs
    .map(
      (s) =>
        `<div class="wheel-flavor-item"><div class="wheel-flavor-name">${s.name}</div><div class="wheel-flavor-origins">${linkOrigins(s.org)}</div></div>`,
    )
    .join('')}</div>`;
  panel.classList.add('active');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
