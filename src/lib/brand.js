/**
 * Encuadres de los SVG de marca. Los archivos se usan tal cual; como varios tienen
 * mucho lienzo vacío, se recortan con CSS (ver partials/art.ejs).
 * W/H = tamaño del viewBox original; x/y/w/h = zona visible.
 */
const ART = {
  logo: { src: '/img/logo.svg', W: 1920, H: 1080, x: 800, y: 510, w: 320, h: 60 },
  1: { src: '/img/dibujo1.svg', W: 64, H: 64, x: 0, y: 0, w: 64, h: 64 },
  2: { src: '/img/dibujo2.svg', W: 1080, H: 1920, x: 28, y: 680, w: 1024, h: 560 },
  3: { src: '/img/dibujo3.svg', W: 1080, H: 1920, x: 40, y: 556, w: 1000, h: 808 },
};

/** Estilos inline para el contenedor y la imagen recortada. */
function crop(key) {
  const a = ART[key] || ART[1];
  const pct = (n) => `${+(n * 100).toFixed(4)}%`;
  return {
    src: a.src,
    box: `aspect-ratio:${a.w}/${a.h}`,
    img: `width:${pct(a.W / a.w)};left:${pct(-a.x / a.w)};top:${pct(-a.y / a.h)}`,
  };
}

/** Dibujo para el sello n (1-based): rota entre los tres. */
const stampDrawing = (n) => ((n - 1) % 3) + 1;

/* ---------- Ilustraciones de marca (public/img/marca) ---------- */

const fs = require('fs');
const path = require('path');

const MARCA = '/img/marca';
/** Las 4 facturas del menú, en el orden en que se van sellando. */
const FACTURAS = ['croissant', 'roll-de-canela', 'pain-au-chocolat', 'rombo'];
const factura = (n) => `${MARCA}/facturas/${FACTURAS[(n - 1) % FACTURAS.length]}.svg`;
const expresion = (nombre) => `${MARCA}/expresiones/marta-${nombre}.svg`;
const ilus = {
  taza: `${MARCA}/cafe-solo.svg`,
  martaSinFrasco: `${MARCA}/marta/marta-sin-frasco.svg`,
  torta: `${MARCA}/torta.svg`,
};

/**
 * Frasco de Marta (1, 2 o 3) como SVG en línea, para animarlo con CSS (.marta-vivo).
 * Los ids se prefijan para que puedan convivir varios frascos en la misma página;
 * data-p guarda el id original para el CSS.
 */
const cache = {};
let seq = 0;
/**
 * SVG de marca en línea, para animar sus capas con CSS. Los ids se prefijan para que
 * puedan convivir varias copias en la misma página; data-p guarda el id original.
 */
function inline(rel, cls, label) {
  if (!cache[rel]) {
    cache[rel] = fs.readFileSync(path.join(__dirname, '../../public', rel), 'utf8')
      .replace(/<\?xml[^>]*>\s*/, '').replace(/<title>[^<]*<\/title>\s*/, '')
      .replace(/<svg[^>]*>/, (tag) => tag.replace(/\s(width|height)="\d+"/g, ''));
  }
  const p = `m${(seq = (seq + 1) % 1e6)}-`;
  return cache[rel]
    .replace(/id="([^"]+)"/g, (_, id) => `id="${p}${id}" data-p="${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${p}${id})`)
    .replace('<svg ', `<svg class="${cls}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} `);
}

/** Frasco de Marta (1, 2 o 3), animado con CSS (.marta-vivo). */
function marta(n) {
  const k = Math.min(3, Math.max(1, n | 0));
  return inline(`${MARCA}/marta/frasco-nivel-${k}.svg`, `marta-vivo n${k}`, `Marta, nivel ${k}`);
}

/** Etiqueta de Marta (su logo: "Marta" en cursiva + "masa madre · n.º N"), para nombrar el nivel. */
const etiqueta = (n, name, cls = '') => inline(`${MARCA}/marta/etiqueta-nivel-${Math.min(3, Math.max(1, n | 0))}.svg`, `etiqueta ${cls}`.trim(), name || `Marta ${n}`);

/** Cara de Marta (expresión) en línea: parpadea y flota (.marta-cara). */
const martaCara = (nombre, cls = '') => inline(`${MARCA}/expresiones/marta-${nombre}.svg`, `marta-cara ${cls}`.trim());

module.exports = { crop, stampDrawing, factura, expresion, ilus, marta, martaCara, etiqueta };
