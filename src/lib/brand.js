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

module.exports = { crop, stampDrawing };
