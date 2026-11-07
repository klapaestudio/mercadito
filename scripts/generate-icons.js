/**
 * Genera los íconos PNG de la PWA a partir del ícono de Marta (assets/marca/).
 * - icono-app-negro.svg: Marta blanca sobre negro, para la pantalla de inicio.
 * - favicon.svg: Marta sola, para la pestaña del navegador.
 * Para el ícono "maskable" se agranda el lienzo en memoria, así Marta queda dentro
 * de la zona segura. Se corre una vez con `npm run icons` y los PNG quedan
 * versionados en public/img/icons/.
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, 'assets/marca', f), 'utf8');
const icono = read('icono-app-negro.svg');
const favicon = read('favicon.svg');
const outDir = path.join(root, 'public/img/icons');
fs.mkdirSync(outDir, { recursive: true });

// El ícono mide 400x400 desde (0,-65). zoom > 1 deja más aire alrededor de Marta.
function render(file, size, svg, { zoom = 1 } = {}) {
  let s = svg;
  if (zoom !== 1) {
    const side = 400 * zoom, x = 200 - side / 2, y = 135 - side / 2;
    s = s.replace(/viewBox="[^"]*"/, `viewBox="${x} ${y} ${side} ${side}"`)
         .replace(/<rect [^>]*fill="#000"\/>/, `<rect x="${x}" y="${y}" width="${side}" height="${side}" fill="#000"/>`);
  }
  const png = new Resvg(s, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(outDir, file), png);
  console.log('✓', file);
}

render('icon-192.png', 192, icono);
render('icon-512.png', 512, icono);
render('icon-maskable-512.png', 512, icono, { zoom: 1.25 });
render('apple-touch-icon.png', 180, icono);
render('favicon-32.png', 32, favicon);
fs.writeFileSync(path.join(outDir, 'favicon.svg'), favicon);
console.log('✓ favicon.svg');
