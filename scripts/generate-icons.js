/**
 * Genera los íconos PNG de la PWA a partir de public/img/logo.svg.
 * No modifica el SVG: solo cambia el encuadre (viewBox) en memoria para centrar
 * el logo sobre un cuadrado blanco. Se corre una vez con `npm run icons`
 * y los PNG quedan versionados en public/img/icons/.
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'public/img/logo.svg'), 'utf8');
const outDir = path.join(root, 'public/img/icons');
fs.mkdirSync(outDir, { recursive: true });

// Centro y ancho del logotipo dentro del lienzo original de 1920x1080
const CX = 960;
const CY = 540;
const LOGO_W = 312;

function render(file, size, logoShare) {
  const side = LOGO_W / logoShare;
  const vb = `${CX - side / 2} ${CY - side / 2} ${side} ${side}`;
  const svg = src.replace(/viewBox="[^"]*"/, `viewBox="${vb}" width="${size}" height="${size}"`);
  const png = new Resvg(svg, { background: '#ffffff', fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(outDir, file), png);
  console.log('✓', file);
}

render('icon-192.png', 192, 0.8);
render('icon-512.png', 512, 0.8);
render('icon-maskable-512.png', 512, 0.62); // deja margen para la zona segura
render('apple-touch-icon.png', 180, 0.78);
render('favicon-32.png', 32, 0.94);
