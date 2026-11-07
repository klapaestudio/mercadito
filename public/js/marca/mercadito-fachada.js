/*
 * <mercadito-fachada> — fachada de Mercadito de Sabores, animada.
 *
 * 1. La fachada se dibuja: vereda, líneas verticales, horizontales y detalles.
 * 2. Los personajes aparecen de a grupos (izquierda, centro, derecha), con vida.
 * 3. Queda en movimiento sutil y continuo.
 *
 * Uso:
 *   <script type="module" src="/ruta/mercadito-fachada.js"></script>
 *   <mercadito-fachada></mercadito-fachada>
 *
 * Necesita, junto a este archivo: fachada-data.js y la carpeta img/.
 *
 * Atributos opcionales:
 *   autoplay="load"     arranca al cargar (por defecto, cuando entra en pantalla)
 *   replay-on-click     se repite al tocarla
 *   no-idle             sin movimiento continuo al final
 *   src="/ruta/img/"    otra carpeta de imágenes
 *
 * Método: el.replay()   Evento: "fachada:done" cuando terminan las entradas.
 */
(function () {
const SCRIPT_SRC = document.currentScript && document.currentScript.src;
const DATA = {"W":2643,"H":1291,"bar":{"y":1244,"h":44,"x":15,"w":2613},"lines":[["h",667.0,17.5,2385.0,0.99],["h",667.0,31.83,2385.0,0.74],["h",667.0,51.49,2385.0,0.74],["h",667.0,56.18,2385.0,0.74],["h",667.0,75.25,2385.0,0.99],["h",200.0,218.2,2385.0,0.74],["h",756.0,223.5,2385.0,0.74],["h",756.0,225.5,2385.0,0.74],["h",756.0,236.5,2385.0,0.99],["h",756.0,238.17,2385.0,0.74],["h",983.0,381.83,1176.0,0.74],["h",1871.0,381.83,2107.0,0.74],["h",1407.0,386.18,1644.0,0.74],["h",939.0,399.83,1176.0,0.74],["h",1870.0,399.84,2107.0,0.74],["h",992.0,403.3,1114.0,1.36],["h",1923.0,403.3,2046.0,1.36],["h",1407.0,404.21,1644.0,0.74],["h",1460.0,407.69,1583.0,1.36],["h",949.0,410.71,1167.0,1.36],["h",1880.0,410.71,2098.0,1.36],["h",1417.0,415.01,1635.0,1.48],["h",996.0,426.19,1117.0,0.74],["h",1927.0,426.19,2048.0,0.74],["h",996.0,431.49,1117.0,0.74],["h",1927.0,431.49,2048.0,0.74],["h",996.0,442.19,1117.0,0.74],["h",1927.0,442.19,2048.0,0.74],["h",996.0,447.49,1117.0,0.74],["h",1927.0,447.49,2048.0,0.74],["h",996.0,472.51,1117.0,0.74],["h",1927.0,472.51,2048.0,0.74],["h",996.0,492.81,1117.0,0.74],["h",1927.0,492.81,2048.0,0.74],["h",950.0,507.51,1166.0,0.75],["h",1444.0,507.51,1607.0,0.99],["h",1881.0,507.51,2097.0,0.75],["h",951.0,509.75,1164.0,0.99],["h",1882.0,509.51,2095.0,0.75],["h",953.0,511.18,1162.0,0.74],["h",254.0,660.01,668.0,0.99],["h",261.0,667.12,661.0,1.3],["h",263.0,773.5,668.0,0.75],["h",1444.0,776.5,1607.0,0.75],["h",263.0,779.51,668.0,0.75],["h",1444.0,779.5,1607.0,0.75],["h",953.0,823.82,1162.0,0.74],["h",951.0,825.26,1164.0,0.99],["h",951.0,827.5,1164.0,0.75],["h",756.0,937.82,950.0,0.74],["h",1165.0,937.83,1446.0,0.74],["h",1606.0,937.83,1881.0,0.74],["h",2096.0,937.83,2385.0,0.74],["h",756.0,943.5,950.0,0.74],["h",1165.0,943.5,1446.0,0.74],["h",1606.0,943.5,1881.0,0.74],["h",2096.0,943.5,2385.0,0.74],["h",756.0,950.82,950.0,0.74],["h",1165.0,950.5,1460.0,0.74],["h",1606.0,950.5,1881.0,0.74],["h",2096.0,950.48,2385.0,0.74],["h",756.0,952.26,950.0,0.99],["h",1165.0,952.5,1451.0,0.74],["h",1606.0,952.5,1881.0,0.74],["h",2096.0,952.5,2385.0,0.74],["h",756.0,959.82,950.0,0.74],["h",1165.0,959.5,1435.0,0.74],["h",1606.0,959.5,1881.0,0.74],["h",2096.0,959.5,2385.0,0.74],["h",524.0,1007.84,625.0,0.74],["h",523.0,1012.49,625.0,0.75],["h",2108.0,1018.45,2385.0,1.24],["h",756.0,1018.5,950.0,1.24],["h",1177.0,1018.5,1422.0,1.24],["h",1606.0,1018.5,1881.0,1.24],["h",756.0,1026.17,932.0,0.74],["h",1217.0,1026.17,1421.0,0.74],["h",1606.0,1026.21,1863.0,0.74],["h",2115.0,1026.16,2385.0,0.74],["h",756.0,1028.82,934.0,0.74],["h",1218.0,1028.83,1418.0,0.74],["h",1606.0,1028.79,1865.0,0.74],["h",2112.0,1028.83,2385.0,0.74],["h",1680.0,1123.15,1776.0,1.4],["h",1679.0,1127.14,1776.0,1.47],["h",1527.0,1157.01,1607.0,0.99],["h",756.0,1170.74,933.0,0.99],["h",1183.0,1170.74,1383.0,0.99],["h",2114.0,1170.79,2218.0,0.99],["h",1444.0,1180.0,1607.0,0.99],["h",254.0,1188.19,661.0,0.99],["h",1444.0,1203.25,1607.0,0.99],["h",376.0,1218.5,451.0,0.68],["h",15.0,1226.26,100.0,0.99],["h",168.0,1226.22,2628.0,0.99],["v",667.52,17.0,219.0,0.99],["v",2384.01,17.0,1243.0,1.49],["v",735.0,75.0,219.0,0.99],["v",1395.5,75.0,219.0,0.99],["v",1656.26,75.0,219.0,0.99],["v",2285.26,75.0,219.0,0.99],["v",200.25,218.0,1227.0,0.99],["v",756.51,218.0,1171.0,0.99],["v",1395.5,236.0,939.0,0.99],["v",1656.26,236.0,939.0,0.99],["v",2285.25,238.0,938.0,0.99],["v",1165.51,507.0,1016.0,0.75],["v",1445.02,507.0,1204.0,0.99],["v",1606.74,507.0,1227.0,0.99],["v",2096.51,507.0,1016.0,0.75],["v",949.82,508.0,1016.0,0.74],["v",1880.82,508.0,1016.0,0.74],["v",951.26,509.0,1016.0,0.99],["v",1163.31,509.0,975.0,0.99],["v",1882.25,509.0,1016.0,0.99],["v",2094.5,509.0,1016.0,0.75],["v",953.5,511.0,824.0,0.75],["v",1161.83,511.0,824.0,0.74],["v",254.26,659.0,1189.0,0.99],["v",667.5,660.0,1227.0,0.99],["v",1293.51,662.0,760.0,1.48],["v",261.51,666.0,1189.0,0.75],["v",660.49,667.0,774.0,0.75],["v",485.15,779.0,1189.0,0.74],["v",487.82,779.0,1227.0,0.74],["v",660.5,779.0,1227.0,0.75],["v",1382.01,1025.0,1171.0,0.99],["v",1669.5,1026.0,1177.0,0.99],["v",1726.23,1126.0,1227.0,1.26],["v",1732.38,1126.0,1227.0,0.99]],"details":[{"id":"d00","x":742,"y":19,"w":40,"h":55,"a":[96,626]},{"id":"d01","x":1349,"y":19,"w":40,"h":55,"a":[139,626]},{"id":"d02","x":1663,"y":19,"w":40,"h":55,"a":[182,626]},{"id":"d03","x":2239,"y":19,"w":39,"h":55,"a":[225,626]},{"id":"d04","x":925,"y":351,"w":72,"h":414,"a":[3,3]},{"id":"d05","x":1856,"y":382,"w":72,"h":383,"a":[78,3]},{"id":"d06","x":2044,"y":382,"w":77,"h":383,"a":[153,3]},{"id":"d07","x":1113,"y":383,"w":77,"h":382,"a":[233,3]},{"id":"d08","x":1581,"y":387,"w":64,"h":28,"a":[718,626]},{"id":"d09","x":1407,"y":388,"w":43,"h":27,"a":[785,626]},{"id":"d10","x":252,"y":431,"w":418,"h":55,"a":[267,626]},{"id":"d11","x":1278,"y":599,"w":28,"h":63,"a":[3,626]},{"id":"d12","x":1743,"y":599,"w":27,"h":46,"a":[688,626]},{"id":"d13","x":1953,"y":608,"w":59,"h":60,"a":[34,626]},{"id":"d14","x":985,"y":658,"w":152,"h":22,"a":[831,626]},{"id":"d15","x":98,"y":704,"w":71,"h":150,"a":[1061,420]},{"id":"d16","x":1237,"y":759,"w":116,"h":153,"a":[942,420]},{"id":"d17","x":1958,"y":828,"w":88,"h":68,"a":[1282,420]},{"id":"d18","x":1655,"y":939,"w":19,"h":86,"a":[1241,420]},{"id":"d19","x":1380,"y":945,"w":16,"h":80,"a":[1263,420]},{"id":"d20","x":919,"y":968,"w":299,"h":203,"a":[3,420]},{"id":"d21","x":1850,"y":1016,"w":277,"h":155,"a":[662,420]},{"id":"d22","x":263,"y":1183,"w":38,"h":4,"a":[991,626]},{"id":"d23","x":340,"y":1184,"w":39,"h":3,"a":[1032,626]},{"id":"d24","x":1173,"y":1224,"w":40,"h":1,"a":[1074,626]},{"id":"d25","x":14,"y":1227,"w":2,"h":16,"a":[986,626]}],"figs":{"farol":{"x":101,"y":929,"w":157,"h":296,"a":[576,3]},"skater":{"x":359,"y":1060,"w":125,"h":165,"a":[508,420]},"nena":{"x":1005,"y":879,"w":103,"h":144,"a":[1135,420]},"mujer":{"x":1065,"y":970,"w":165,"h":258,"a":[1080,3]},"pareja":{"x":1383,"y":914,"w":201,"h":311,"a":[372,3]},"lector":{"x":1667,"y":1024,"w":200,"h":201,"a":[305,420]},"bici":{"x":2130,"y":951,"w":341,"h":293,"a":[736,3]},"chorro":{"x":1985,"y":651,"w":28,"h":190,"a":[2,694]}},"front":{"x":106,"y":860,"w":56,"h":371,"a":[313,3]},"atlas":{"w":1400,"h":886}};

const { W, H } = DATA;
const pct = (v, total) => `${(v / total) * 100}%`;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE_DRAW = 'cubic-bezier(.65,0,.35,1)';
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_ARRIVE = 'cubic-bezier(.22,1,.36,1)';

// Orden de entrada de los personajes, en grupos de dos o tres.
const T_CHAR = 3350;
const GROUPS = [
  { at: 0,    figs: ['skater', 'farol'] },
  { at: 900,  figs: ['mujer', 'nena', 'pareja'] },
  { at: 1850, figs: ['bici', 'lector'] },
];

const css = `
:host{display:block;position:relative;contain:layout paint}
.stage{position:relative;width:100%;aspect-ratio:${W}/${H};overflow:hidden;background:var(--mf-paper,#fff);-webkit-tap-highlight-color:transparent}
:host([replay-on-click]) .stage{cursor:pointer}
svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
svg line{stroke:#000;stroke-linecap:butt;stroke-dasharray:1 1}
.l{position:absolute;overflow:hidden;pointer-events:none}
.l > img{position:absolute;display:block;max-width:none;user-select:none;-webkit-user-drag:none}
.slot{position:absolute}
.slot > .fig{inset:0;transform-origin:50% 100%;will-change:transform,opacity}
.slot.clipbottom{clip-path:inset(-60% -60% 0 -60%)}
.pre .draw{opacity:0}
.pre svg line{stroke-dashoffset:1}
.pre .bar{transform:scaleX(0)}
.pre .fig{opacity:0}
.chorro{clip-path:inset(0 0 100% 0)}
@media (prefers-reduced-motion: reduce){ .pre .draw,.pre .fig{opacity:1} .pre svg line{stroke-dashoffset:0} .pre .bar{transform:none} .chorro{clip-path:none} }
`;

class MercaditoFachada extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._anims = [];
    this._idle = [];
    this._timers = [];
  }

  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this._render();
    this._ready = this._preload();
    if (reduceMotion()) { this.$('.stage').classList.remove('pre'); return; }
    if (this.getAttribute('autoplay') === 'load') {
      this._ready.then(() => this.replay());
    } else {
      this._io = new IntersectionObserver((es) => {
        for (const e of es) {
          if (e.isIntersecting && !this._played) this._ready.then(() => this.replay());
          for (const a of this._idle) e.isIntersecting ? a.play() : a.pause();
        }
      }, { threshold: 0.25 });
      this._io.observe(this);
    }
    if (this.hasAttribute('replay-on-click')) this.$('.stage').addEventListener('click', () => this.replay());
  }

  disconnectedCallback() { this._io?.disconnect(); this._stop(); }

  $(s) { return this.shadowRoot.querySelector(s); }
  $$(s) { return [...this.shadowRoot.querySelectorAll(s)]; }

  _img() {
    const src = this.getAttribute('src');
    return src ? new URL(src, document.baseURI).href.replace(/\/?$/, '/') : (SCRIPT_SRC ? new URL('img/', SCRIPT_SRC).href : 'img/');
  }

  _render() {
    const img = this._img();
    const box = (b) => `left:${pct(b.x, W)};top:${pct(b.y, H)};width:${pct(b.w, W)};height:${pct(b.h, H)}`;
    const bar = DATA.bar;
    const lines = DATA.lines.map(([o, a, b, c, w], i) => o === 'h'
      ? `<line class="draw" data-i="${i}" x1="${a}" y1="${b}" x2="${c}" y2="${b}" stroke-width="${w * 1.5}" pathLength="1"/>`
      : `<line class="draw" data-i="${i}" x1="${a}" y1="${b}" x2="${a}" y2="${c}" stroke-width="${w * 1.5}" pathLength="1"/>`).join('');
    // Todas las capas salen de una sola imagen (atlas): cada pieza es una ventana sobre ella.
    const { w: AW, h: AH } = DATA.atlas;
    const atlas = `${img}atlas.png`;
    const cut = (b) => `<img src="${atlas}" alt="" style="width:${(AW / b.w) * 100}%;height:${(AH / b.h) * 100}%;left:${(-b.a[0] / b.w) * 100}%;top:${(-b.a[1] / b.h) * 100}%">`;
    const details = DATA.details.map((d) => `<div class="l draw det" data-id="${d.id}" style="${box(d)}">${cut(d)}</div>`).join('');
    const figs = Object.entries(DATA.figs).map(([k, f]) =>
      `<div class="slot ${k === 'nena' ? 'clipbottom' : ''}" data-k="${k}" style="${box(f)};z-index:${k === 'chorro' ? 1 : 2}"><div class="l fig ${k === 'chorro' ? 'chorro' : ''}">${cut(f)}</div></div>`).join('');
    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      <div class="stage pre" role="img" aria-label="Fachada de Mercadito de Sabores con vecinos y clientes en la vereda">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          ${bar ? `<rect class="bar" x="${bar.x}" y="${bar.y}" width="${bar.w}" height="${bar.h}" fill="#000" style="transform-box:fill-box;transform-origin:0 50%"/>` : ''}
          ${lines}
        </svg>
        ${details}
        ${figs}
        <div class="l draw front" style="${box(DATA.front)};z-index:3">${cut(DATA.front)}</div>
      </div>`;
  }

  _preload() {
    const i = this.$('img');
    if (!i) return Promise.resolve();
    return (i.decode ? i.decode() : new Promise((r) => { i.onload = r; })).catch(() => {});
  }

  _stop() {
    for (const a of [...this._anims, ...this._idle]) a.cancel();
    this._anims = []; this._idle = [];
    this._timers.forEach(clearTimeout); this._timers = [];
  }

  _a(el, kf, o) { const a = el.animate(kf, { fill: 'both', ...o }); this._anims.push(a); return a; }
  _later(fn, ms) { this._timers.push(setTimeout(fn, ms)); }

  replay() {
    if (reduceMotion()) return;
    this._played = true;
    this._stop();
    const stage = this.$('.stage');
    stage.classList.remove('pre');

    // ── 1 · La fachada se dibuja ───────────────────────────────────────
    const bar = this.$('.bar');
    if (bar) this._a(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1100, easing: 'cubic-bezier(.7,0,.2,1)' });

    this.$$('svg line').forEach((el) => {
      const [o, a, b, c] = DATA.lines[+el.dataset.i];
      const len = o === 'h' ? (c - a) / W : (c - b) / H;
      let delay, dur;
      if (o === 'v') {               // de abajo hacia arriba, barriendo de izquierda a derecha
        delay = 380 + (a / W) * 650 + (1 - c / H) * 200;
        dur = 520 + len * 900;
        el.setAttribute('y1', c); el.setAttribute('y2', b);
      } else {                       // de abajo hacia arriba; cada una de izquierda a derecha
        delay = 700 + (1 - b / H) * 1150 + (a / W) * 260;
        dur = 480 + len * 1000;
      }
      this._a(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: EASE_DRAW });
      this._a(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 60, delay });
    });

    // detalles: cada pieza se revela con tinta, en el sentido de su forma
    this.$$('.det').forEach((el) => {
      const d = DATA.details.find((x) => x.id === el.dataset.id);
      const cx = (d.x + d.w / 2) / W, cy = (d.y + d.h / 2) / H;
      const big = d.w * d.h > W * H * 0.004;
      const wide = d.w > d.h * 1.6;
      const from = wide ? 'inset(0 100% 0 0)' : 'inset(100% 0 0 0)';
      const delay = 1500 + cx * 900 + (1 - cy) * 350 + (big ? 120 : 0);
      this._a(el, [{ clipPath: from, opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }],
        { duration: wide && big ? 1000 : 750, delay, easing: EASE_OUT });
    });
    const front = this.$('.front');
    this._a(front, [{ clipPath: 'inset(100% 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }],
      { duration: 900, delay: 520, easing: EASE_DRAW });

    // ── 2 · Llegan los personajes ──────────────────────────────────────
    const f = (k) => this.$(`[data-k="${k}"] > .fig`);
    const enter = {
      // patina desde la izquierda, frena y se balancea
      skater: (t) => this._a(f('skater'), [
        { transform: 'translateX(-420%) rotate(-3deg)', opacity: 1 },
        { transform: 'translateX(-60%) rotate(-2deg)', opacity: 1, offset: .55 },
        { transform: 'translateX(6%) rotate(2.5deg)', offset: .8 },
        { transform: 'translateX(-2%) rotate(-1deg)', offset: .9 },
        { transform: 'translateX(0) rotate(0)', opacity: 1 },
      ], { duration: 1250, delay: t, easing: 'cubic-bezier(.3,.7,.4,1)' }),
      // se asoma desde atrás del farol
      farol: (t) => this._a(f('farol'), [
        { transform: 'translateX(-28%) rotate(-7deg) scale(.97)', opacity: 0 },
        { transform: 'translateX(4%) rotate(2deg) scale(1.01)', opacity: 1, offset: .55 },
        { transform: 'translateX(-1%) rotate(-.8deg)', offset: .8 },
        { transform: 'none', opacity: 1 },
      ], { duration: 950, delay: t + 260, easing: EASE_ARRIVE }),
      // camina con su café desde la izquierda
      mujer: (t) => this._a(f('mujer'), [
        { transform: 'translate(-150%,0)', opacity: 0 },
        { transform: 'translate(-125%,-3%)', opacity: 1, offset: .12 },
        { transform: 'translate(-98%,0)', offset: .24 },
        { transform: 'translate(-72%,-3%)', offset: .36 },
        { transform: 'translate(-48%,0)', offset: .48 },
        { transform: 'translate(-27%,-2.5%)', offset: .6 },
        { transform: 'translate(-11%,0)', offset: .72 },
        { transform: 'translate(-2%,-1.5%)', offset: .84 },
        { transform: 'translate(0,0)', opacity: 1 },
      ], { duration: 1500, delay: t, easing: 'cubic-bezier(.25,.6,.4,1)' }),
      // aparece en la ventana, por detrás de la baranda, y saluda
      nena: (t) => this._a(f('nena'), [
        { transform: 'translateY(105%)', opacity: 1 },
        { transform: 'translateY(-9%)', offset: .55 },
        { transform: 'translateY(3%)', offset: .75 },
        { transform: 'translateY(0)', opacity: 1 },
      ], { duration: 800, delay: t + 380, easing: EASE_ARRIVE }),
      // salen por la puerta: avanzan hacia la vereda
      pareja: (t) => this._a(f('pareja'), [
        { transform: 'translateY(-4%) scale(.86)', opacity: 0, filter: 'blur(2px)' },
        { transform: 'translateY(1%) scale(1.025)', opacity: 1, filter: 'blur(0)', offset: .55 },
        { transform: 'translateY(0) scale(.995)', offset: .8 },
        { transform: 'none', opacity: 1, filter: 'none' },
      ], { duration: 1000, delay: t + 650, easing: EASE_ARRIVE }),
      // entra pedaleando desde la derecha y frena
      bici: (t) => {
        const x0 = ((W - DATA.figs.bici.x) / DATA.figs.bici.w) * 100 + 8;
        this._a(f('bici'), [
          { transform: `translate(${x0}%,0) rotate(0)`, opacity: 1 },
          { transform: `translate(${x0 * .55}%,-1.2%)`, offset: .25 },
          { transform: `translate(${x0 * .25}%,0)`, offset: .5 },
          { transform: `translate(${x0 * .07}%,-.8%) rotate(-.6deg)`, offset: .72 },
          { transform: 'translate(-1.5%,0) rotate(.9deg)', offset: .86 },
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        ], { duration: 1650, delay: t, easing: 'cubic-bezier(.2,.65,.35,1)' });
      },
      // levanta el diario
      lector: (t) => this._a(f('lector'), [
        { transform: 'translateY(9%) scaleY(.92)', opacity: 0 },
        { transform: 'translateY(-4%) scaleY(1.03)', opacity: 1, offset: .5 },
        { transform: 'translateY(1%) scaleY(.99)', offset: .75 },
        { transform: 'none', opacity: 1 },
      ], { duration: 850, delay: t + 420, easing: EASE_ARRIVE }),
    };
    for (const g of GROUPS) for (const k of g.figs) enter[k](T_CHAR + g.at);

    // el café se sirve cuando llega el último grupo
    const tPour = T_CHAR + 2300;
    const ch = this.$('[data-k="chorro"] > .fig');
    this._a(ch, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: 0 });
    this._a(ch, [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 1200, delay: tPour, easing: 'cubic-bezier(.5,0,.6,1)' });

    const tDone = T_CHAR + 3700;
    this._later(() => this.dispatchEvent(new CustomEvent('fachada:done', { bubbles: true, composed: true })), tDone);
    if (!this.hasAttribute('no-idle')) this._later(() => this._startIdle(), tDone);
  }

  // ── 3 · Vida: pequeños movimientos en bucle, cada uno a su ritmo ──────
  _startIdle() {
    const f = (k) => this.$(`[data-k="${k}"] > .fig`);
    const loop = (k, kf, o) => {
      const el = f(k);
      // se agrega encima de la entrada, sin reemplazarla
      const a = el.animate(kf, { iterations: Infinity, easing: 'ease-in-out', composite: 'add', ...o });
      this._idle.push(a);
    };
    loop('bici', [{ transform: 'translateY(0)' }, { transform: 'translateY(-1%)' }, { transform: 'translateY(0)' }], { duration: 760 });
    loop('mujer', [{ transform: 'rotate(0)' }, { transform: 'translateY(-1.2%) rotate(.7deg)' }, { transform: 'rotate(0)' }], { duration: 1200 });
    loop('farol', [{ transform: 'rotate(0)' }, { transform: 'rotate(-1.3deg)' }, { transform: 'rotate(0)' }], { duration: 3400 });
    loop('skater', [{ transform: 'rotate(0)' }, { transform: 'rotate(1.6deg)' }, { transform: 'rotate(-.7deg)' }, { transform: 'rotate(0)' }], { duration: 4000 });
    loop('pareja', [{ transform: 'rotate(0)' }, { transform: 'rotate(.8deg)' }, { transform: 'rotate(0)' }], { duration: 4600 });
    loop('lector', [
      { transform: 'translateY(0)' }, { transform: 'translateY(0)', offset: .78 },
      { transform: 'translateY(-2%)', offset: .85 }, { transform: 'translateY(.4%)', offset: .92 }, { transform: 'translateY(0)' },
    ], { duration: 6200, easing: 'linear' });
    loop('nena', [
      { transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: .66 },
      { transform: 'rotate(-5deg)', offset: .72 }, { transform: 'rotate(5deg)', offset: .8 },
      { transform: 'rotate(-4deg)', offset: .88 }, { transform: 'rotate(3deg)', offset: .94 }, { transform: 'rotate(0)' },
    ], { duration: 4800, easing: 'linear' });
    // café: se termina de servir y se vuelve a servir
    const ch = f('chorro');
    const pour = ch.animate([
      { clipPath: 'inset(0 0 0% 0)' }, { clipPath: 'inset(0 0 0% 0)', offset: .7 },
      { clipPath: 'inset(100% 0 0 0)', offset: .78 }, { clipPath: 'inset(0 0 100% 0)', offset: .781 },
      { clipPath: 'inset(0 0 100% 0)', offset: .83 }, { clipPath: 'inset(0 0 0% 0)' },
    ], { duration: 8000, iterations: Infinity, easing: 'linear' });
    this._idle.push(pour);
  }
}

if (!customElements.get('mercadito-fachada')) customElements.define('mercadito-fachada', MercaditoFachada);
})();
