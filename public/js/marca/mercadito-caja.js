/**
 * <mercadito-caja> · La box especial se abre y salen las facturas.
 * Atributos: autoplay="load" | replay-on-click | no-idle | src="ruta/a/caja-atlas.png"
 * Métodos: replay(), seek(ms)  ·  Evento: "caja:abierta" cuando terminan de salir las facturas
 */
(function () {
const DATA = {"R": [[0.83, 0.003841, 0.55775], [-0.078598, 0.990804, 0.11014], [-0.552197, -0.135254, 0.822669]], "t": [-1.639429, -0.60022, 18.73122], "f": 7419.795, "cx": 675, "cy": 355, "W": 2.3117, "D": 2.5356, "walls": [[24, 200], [797, 265], [1322, 168], [1320, 546], [793, 688], [24, 592]], "atlas": [1350, 1321], "sprites": {"base": [0, 0, 1350, 710], "croissant": [0, 714, 465, 293], "pain-au-chocolat": [469, 714, 464, 289], "roll-de-canela": [0, 1011, 451, 257], "rombo": [455, 1011, 358, 310]}};
const SCRIPT_SRC = document.currentScript && document.currentScript.src;
const INK = '#000', PAPER = '#fff', SW = 5.5, OY = 720, VX = -320, VY = -60, VW = 1900, VH = 1490;
const { R, t: T, f: F, cx: CX, cy: CY, W, D } = DATA;

// --- proyección: cámara ajustada al dibujo original de la caja -------------------
function P(x, y, z) {
  const px = R[0][0] * x + R[0][1] * y + R[0][2] * z + T[0];
  const py = R[1][0] * x + R[1][1] * y + R[1][2] * z + T[1];
  const pz = R[2][0] * x + R[2][1] * y + R[2][2] * z + T[2];
  return [CX + F * px / pz, OY + CY - F * py / pz];
}
const pts = arr => arr.map(p => P(...p).map(v => v.toFixed(1)).join(',')).join(' ');
const path = arr => 'M' + arr.map(p => P(...p).map(v => v.toFixed(1)).join(',')).join(' L') + ' Z';

// --- geometría del techo ------------------------------------------------------------
const HR = 0.30, D2 = D / 2, TH0 = Math.atan2(HR, D2), L = Math.hypot(D2, HR);
const TP = 0.30;  // las tapas son trapecios: el borde de arriba es más angosto que la bisagra
const HH = 0.27, BETA = Math.PI / 2 - TH0, HX0 = TP + 0.04, HX1 = W - TP - 0.04;
const deg = Math.PI / 180;

function lid(front, phi) {           // panel + pared de la manija, girando sobre su bisagra
  const th = TH0 + phi, s = front ? 1 : -1, z0 = front ? 0 : D;
  const u = [0, Math.sin(th), s * Math.cos(th)];
  // la manija de atrás se va doblando hacia atrás a medida que se abre la tapa
  const g = front ? 0 : 2 * BETA * clamp(phi / OPEN_B);
  const h = [0, Math.sin(th + BETA - g), s * Math.cos(th + BETA - g)];
  const at = (x, a, b) => [x + 0, 1 + a * L * u[1] + b * HH * h[1], z0 + a * L * u[2] + b * HH * h[2]];
  const panel = [at(0, 0, 0), at(W, 0, 0), at(W - TP, 1, 0), at(TP, 1, 0)];
  const c = .06;  // esquinas ochavadas de la manija
  const handle = [at(HX0, 1, 0), at(HX1, 1, 0), at(HX1, 1, 1 - c * 3), at(HX1 - c, 1, 1), at(HX0 + c, 1, 1), at(HX0, 1, 1 - c * 3)];
  // agujero de la manija: un arco ∩
  const hole = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * i / 24, hx = W / 2 - Math.cos(a) * W * 0.17, hy = .18 + Math.sin(a) * .55;
    hole.push(at(hx, 1, hy));
  }
  return { panel, handle, hole };
}
function gusset(right, alpha) {       // fuelle triangular de cada punta
  const e = right ? W : 0, s = right ? 1 : -1;
  const at = (z, hgt) => [e + s * hgt * Math.sin(alpha), 1 + hgt * Math.cos(alpha), z];
  const tri = [at(0, 0), at(D, 0), at(D2, HR)];
  const sw = .035;  // ranura vertical, de la base hacia la punta
  const slot = right ? [at(D2 - sw, HR * .14), at(D2 + sw, HR * .14), at(D2 + sw, HR * .70), at(D2 - sw, HR * .70)] : null;
  return { tri, slot };
}

// --- tiempo ---------------------------------------------------------------------------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const inOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const out = p => 1 - Math.pow(1 - p, 3);
const back = (p, s = 1.6) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
const bump = p => Math.sin(Math.PI * clamp(p));
const OPEN_F = 120 * deg, OPEN_B = 112 * deg, OPEN_G = 172 * deg;
const T_OPEN = 900, T_PASTRY = 1300, END = 3500;

// facturas: [sprite, salida (x,z dentro de la caja), destino en pantalla (x, y), giro final, escala]
const PASTRIES = [
  ['croissant',        [0.62, 1.10], [ -40, 290], -14, .98],
  ['roll-de-canela',   [1.05, 1.45], [ 390, 150],  -5, .96],
  ['rombo',            [1.40, 1.20], [ 830, 130],   6, 1.0],
  ['pain-au-chocolat', [1.75, 1.40], [1240, 215],  11, .98],
];

function state(t, idle) {
  const s = {};
  // la caja se sacude: algo se mueve adentro
  const shake = bump(seg(t, 150, 820));
  s.box = { r: Math.sin(t / 38) * 1.1 * shake, y: -Math.abs(Math.sin(t / 60)) * 6 * shake };
  const rattle = Math.max(0, Math.sin(t / 30)) * 5 * deg * shake;
  const pf = back(seg(t, T_OPEN, T_OPEN + 650), 1.3), pb = back(seg(t, T_OPEN + 60, T_OPEN + 720), 1.2);
  s.phiF = rattle + OPEN_F * pf;
  s.phiB = rattle * .6 + OPEN_B * pb;
  s.alpha = OPEN_G * out(seg(t, T_OPEN + 120, T_OPEN + 700));
  if (idle) { s.phiF += Math.sin(idle / 900) * 1.5 * deg; s.phiB -= Math.sin(idle / 1100 + 1) * 1.5 * deg; }
  s.pop = seg(t, T_OPEN + 80, T_OPEN + 600);
  s.pastries = PASTRIES.map(([name, [px, pz], [fx, fy], rot, sc], i) => {
    const t0 = T_PASTRY + i * 260, up = seg(t, t0, t0 + 520), fly = seg(t, t0 + 520, t0 + 1100);
    const [sx, sy] = P(px, 0.25, pz);           // dentro de la caja
    const [ax, ay] = P(px, 2.6, pz);            // arriba de la tapa de adelante
    let x, y, r, k;
    if (fly <= 0) { const e = out(up); x = sx; y = lerp(sy, ay, e); r = lerp(-8, 4, e) * (i % 2 ? -1 : 1); k = sc * .9; }
    else { const e = inOut(fly), b = back(fly, 1.4); x = lerp(ax, fx, e); y = lerp(ay, fy, b) - bump(fly) * 70; r = lerp(4 * (i % 2 ? -1 : 1), rot, e); k = lerp(sc * .9, sc, b); }
    if (idle) { y += Math.sin(idle / (900 + i * 130) + i * 1.7) * 7; r += Math.sin(idle / (1300 + i * 170) + i) * 1.6; }
    return { name, x, y, r, k, front: fly > 0, vis: up > 0 };
  });
  return s;
}

// --- dibujo ------------------------------------------------------------------------
const ATLAS = DATA.atlas, SP = DATA.sprites;
function sprite(name, href) {
  const [ax, ay, aw, ah] = SP[name];
  return `<svg x="${-aw / 2}" y="${-ah / 2}" width="${aw}" height="${ah}" viewBox="${ax} ${ay} ${aw} ${ah}" overflow="hidden"><image href="${href}" width="${ATLAS[0]}" height="${ATLAS[1]}"/></svg>`;
}
const WALLS = DATA.walls.map(([x, y]) => [x, y + OY]);
const wallsPath = 'M' + WALLS.map(p => p.join(',')).join(' L') + ' Z';

class MercaditoCaja extends HTMLElement {
  connectedCallback() {
    if (this._root) return;
    const href = this.getAttribute('src') || (SCRIPT_SRC ? new URL('img/caja-atlas.png', SCRIPT_SRC).href : 'img/caja-atlas.png');
    this._root = this.attachShadow({ mode: 'open' });
    const pasts = PASTRIES.map(([n]) => `<g class="p" data-n="${n}">${sprite(n, href)}</g>`).join('');
    const [bx, by, bw, bh] = SP.base;
    this._root.innerHTML = `<style>:host{display:block;aspect-ratio:${VW}/${VH}}svg.root{width:100%;height:100%;display:block;overflow:visible}</style>
<svg class="root" viewBox="${VX} ${VY} ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="La box especial de Mercadito se abre y salen las facturas">
  <defs><clipPath id="fuera"><path clip-rule="evenodd" d="M-2000,-2000 H4000 V4000 H-2000 Z ${wallsPath}"/></clipPath></defs>
  <g id="box">
    <g id="inside" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">
      <path id="floor" fill="#EFECE7"/><path id="iback" fill="#E6E2DC"/><path id="ileft" fill="#EAE7E1"/>
    </g>
    <g id="behind" fill="${PAPER}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"></g>
    <g id="pin" clip-path="url(#fuera)"></g>
    <svg x="${0}" y="${OY}" width="${bw}" height="${bh}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="hidden"><image href="${href}" width="${ATLAS[0]}" height="${ATLAS[1]}"/></svg>
    <g id="infront" fill="${PAPER}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"></g>
    <g id="pops" stroke="${INK}" stroke-width="5" stroke-linecap="round">${'<line/>'.repeat(5)}</g>
  </g>
  <g id="pout"></g>
  <g id="store" style="display:none">${pasts}</g>
</svg>`;
    const q = s => this._root.querySelector(s);
    this.$ = { box: q('#box'), floor: q('#floor'), iback: q('#iback'), ileft: q('#ileft'), behind: q('#behind'), infront: q('#infront'),
               pin: q('#pin'), pout: q('#pout'), pops: [...q('#pops').children], p: [...q('#store').children] };
    this.$.floor.setAttribute('d', path([[0, 0, 0], [W, 0, 0], [W, 0, D], [0, 0, D]]));
    this.$.iback.setAttribute('d', path([[0, 0, D], [W, 0, D], [W, 1, D], [0, 1, D]]));
    this.$.ileft.setAttribute('d', path([[0, 0, 0], [0, 0, D], [0, 1, D], [0, 1, 0]]));
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.seek(0);
    if (this.hasAttribute('replay-on-click')) { this.style.cursor = 'pointer'; this.addEventListener('click', () => this.replay()); }
    if (this.reduced) { this.seek(END); return; }
    if (this.getAttribute('autoplay') === 'load') this.replay();
    else {
      this._io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { this._io.disconnect(); this.replay(); } }, { threshold: .35 });
      this._io.observe(this);
    }
  }
  disconnectedCallback() { cancelAnimationFrame(this._raf); this._io && this._io.disconnect(); }
  replay() {
    cancelAnimationFrame(this._raf);
    if (this.reduced) return this.seek(END);
    const t0 = performance.now(); let fired = false;
    const loop = now => {
      const t = now - t0;
      if (t >= END && !fired) { fired = true; this.dispatchEvent(new CustomEvent('caja:abierta', { bubbles: true })); }
      if (t >= END && this.hasAttribute('no-idle')) return this.seek(END);
      this.seek(t); this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  seek(t) {
    const idle = t > END && !this.reduced ? t - END : 0;
    this.draw(state(Math.min(t, END), idle));
  }
  draw(s) {
    const $ = this.$;
    $.box.setAttribute('transform', `translate(0 ${s.box.y.toFixed(2)}) rotate(${s.box.r.toFixed(3)} 675 ${OY + 640})`);
    const fl = lid(true, s.phiF), bl = lid(false, s.phiB), gr = gusset(true, s.alpha), gl = gusset(false, s.alpha);
    const face = (arr, extra = '') => `<polygon points="${pts(arr)}"${extra}/>`;
    const line = (arr, w = 4) => `<polyline points="${pts(arr)}" fill="none" stroke-width="${w}"/>`;
    // atrás: fuelle izquierdo y tapa de atrás con su manija
    $.behind.innerHTML = face(gl.tri) + face(bl.panel) + face(bl.handle) + line(bl.hole);
    // adelante: fuelle derecho (con la ranura) y tapa de adelante con su manija
    $.infront.innerHTML = face(gr.tri) + face(gr.slot, ' stroke-width="4"') + face(fl.panel) + face(fl.handle) + line(fl.hole);
    // pops cuando se destraba
    const [hx, hy] = P(W / 2, 1 + HR + HH + .15, D2);
    $.pops.forEach((ln, i) => {
      const p = out(s.pop), a = (-90 + (i - 2) * 30) * deg, r0 = 30 + 60 * p, r1 = r0 + 34 * (1 - p) + 6;
      ln.style.display = s.pop > 0 && s.pop < 1 ? '' : 'none';
      ln.setAttribute('x1', hx + Math.cos(a) * r0); ln.setAttribute('y1', hy + Math.sin(a) * r0);
      ln.setAttribute('x2', hx + Math.cos(a) * r1); ln.setAttribute('y2', hy + Math.sin(a) * r1);
      ln.setAttribute('opacity', 1 - s.pop * s.pop);
    });
    // facturas: adentro (recortadas por las paredes) o ya afuera, por delante de todo
    s.pastries.forEach((p, i) => {
      const g = $.p[i];
      g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.r.toFixed(2)}) scale(${p.k.toFixed(3)})`);
      g.style.display = p.vis ? '' : 'none';
      const host = p.front ? $.pout : $.pin;
      if (g.parentNode !== host) host.appendChild(g);
    });
  }
}
customElements.define('mercadito-caja', MercaditoCaja);
})();
