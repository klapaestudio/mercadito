# Mercadito de Sabores — Fidelización

Web app de fidelización para Mercadito de Sabores: los clientes suman sellos en cada visita, suben de nivel (Marta 1, 2 y 3) y reciben beneficios.

- Node.js + Express, vistas EJS renderizadas en el servidor y CSS propio.
- SQLite (`better-sqlite3`). La base y las sesiones viven en `DATA_DIR`.
- Sin servicios de terceros.

> **Estado:** etapa 1 de 7 (base del proyecto, login y roles).

## Correr en local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev
```

Abrí <http://localhost:3000>.

La primera vez se crea solo el usuario admin con `ADMIN_USER` / `ADMIN_PASSWORD` del `.env` (por defecto `admin` / `cambiame123`).

### Datos de ejemplo

```bash
npm run seed
```

Este comando **borra** clientes, cajeros, visitas, beneficios, notificaciones, eventos y reservas, y los vuelve a crear. No toca los admins ni la configuración.

| Rol | Usuario | Contraseña |
|---|---|---|
| Admin | `admin` | la de `ADMIN_PASSWORD` |
| Cajero | `caja` | `caja1234` |
| Bianca Dondio, Marta 3, cumple esta semana | `1150000001` | `cliente123` |
| Costanza Rinaldi, Marta 2, con un café para canjear | `1150000002` | `cliente123` |
| Martina Gómez, Marta 1, a 1 sello de completar | `1150000003` | `cliente123` |
| Tomás Aguirre, 42 días sin venir | `1150000006` | `cliente123` |
| Federico Paz, recién registrado | `1150000010` | `cliente123` |

Hay 12 clientes en total (`1150000001` a `1150000012`). Al final, el seed imprime la lista con nivel y sellos de cada uno.

También crea cuatro eventos: uno en ventana de prioridad Marta 3, uno abierto y casi lleno, uno que todavía no abre reservas y uno pasado.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática al editar `src/` |
| `npm start` | Servidor en modo normal (el que usa Railway) |
| `npm run seed` | Carga datos de ejemplo (borra los anteriores) |
| `npm run icons` | Regenera los íconos PNG de la PWA a partir de `public/img/logo.svg` |

## Variables de entorno

Ver `.env.example`.

| Variable | Para qué |
|---|---|
| `PORT` | Puerto HTTP (Railway lo define solo) |
| `NODE_ENV` | `production` activa cookies `secure` (requiere HTTPS) |
| `DATA_DIR` | Carpeta de la base SQLite (`app.db`) |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Admin inicial (solo si todavía no existe ningún admin) |
| `TZ_APP` | Zona horaria del local (por defecto `America/Argentina/Buenos_Aires`) |

## Estructura

```
assets/            originales de marca (no se modifican)
public/            archivos estáticos: css, js, img (logo, dibujos, íconos), vendor
src/
  server.js        arranque de Express
  config.js        variables de entorno
  db/              conexión, esquema SQL y datos iniciales
  lib/             utilidades (fechas, store de sesiones, menú, encuadre de dibujos)
  middleware/      autenticación, roles y CSRF
  services/        reglas de negocio
  routes/          rutas por área
  views/           plantillas EJS
scripts/           tareas de desarrollo (íconos)
```

## Seguridad

- Contraseñas con bcrypt.
- Bloqueo de 15 minutos tras 5 intentos fallidos por usuario (o 30 por IP).
- Cookie de sesión `httpOnly` y `sameSite=lax`, con `secure` en producción. Dura 6 meses desde la última visita.
- Token CSRF en todos los formularios.
- Recuperación de contraseña desde el mostrador: el cajero genera una contraseña temporal y el cliente tiene que cambiarla al ingresar.

## Deploy en Railway + GitHub (para más adelante)

> Estos pasos **todavía no se ejecutaron**: el proyecto por ahora corre solo en local.

1. Crear un repositorio en GitHub y subir el proyecto:
   ```bash
   git remote add origin https://github.com/<usuario>/<repo>.git
   git push -u origin main
   ```
2. En Railway: **New Project → Deploy from GitHub repo** y elegir el repositorio. Railway detecta Node y usa `railway.json` (`npm start`, healthcheck en `/health`).
3. **Agregar un volumen** al servicio (Settings → Volumes) montado en `/data`. Sin volumen, la base se borra en cada deploy.
4. Configurar las variables (Settings → Variables):
   ```
   NODE_ENV=production
   DATA_DIR=/data
   SESSION_SECRET=<texto largo y aleatorio>
   ADMIN_USER=<usuario admin>
   ADMIN_PASSWORD=<contraseña segura>
   TZ_APP=America/Argentina/Buenos_Aires
   ```
5. En Settings → Networking, **Generate Domain** para obtener la URL pública con HTTPS.
6. Cada `git push` a `main` vuelve a deployar.

**Plan chico:** usar una sola réplica. SQLite no admite varias instancias escribiendo el mismo archivo.
