/** Ítems del menú lateral por rol. */
const MENUS = {
  cliente: [
    { href: '/inicio', label: 'Inicio' },
    { href: '/mi-qr', label: 'Mi QR' },
    { href: '/beneficios', label: 'Beneficios' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/notificaciones', label: 'Notificaciones', badge: 'unread' },
    { href: '/mi-cuenta', label: 'Mi cuenta' },
  ],
  cajero: [
    { href: '/caja', label: 'Cargar visita' },
    { href: '/mi-cuenta', label: 'Mi cuenta' },
  ],
  admin: [
    { href: '/admin', label: 'Resumen' },
    { href: '/caja', label: 'Cargar visita' },
    { href: '/admin/clientes', label: 'Clientes' },
    { href: '/admin/eventos', label: 'Eventos' },
    { section: 'Configuración' },
    { href: '/admin/sellos', label: 'Sellos' },
    { href: '/admin/niveles', label: 'Niveles' },
    { href: '/admin/beneficios', label: 'Beneficios' },
    { href: '/admin/automaticos', label: 'Cumpleaños y Te extrañamos' },
    { href: '/admin/usuarios', label: 'Usuarios del sistema' },
    { section: 'Cuenta' },
    { href: '/mi-cuenta', label: 'Mi cuenta' },
  ],
};

function forRole(role) {
  return MENUS[role] || [];
}

/** ¿El ítem está activo para la ruta actual? "/admin" solo coincide exacto. */
function isActive(href, path) {
  if (href === path) return true;
  return href !== '/admin' && path.startsWith(href + '/');
}

module.exports = { forRole, isActive };
