// Menú hamburguesa en celular
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
})();

// Confirmación antes de acciones importantes (data-confirm en el form o en el botón)
document.addEventListener('submit', (e) => {
  const msg = e.submitter?.dataset.confirm || e.target.dataset.confirm;
  if (msg && !window.confirm(msg)) { e.preventDefault(); return; }
  // Evita doble envío
  if (e.target.method === 'post' && e.submitter) {
    setTimeout(() => { e.submitter.disabled = true; }, 0);
  }
});

// Al volver con "atrás", rehabilita los botones
window.addEventListener('pageshow', () => {
  document.querySelectorAll('button[disabled]:not([data-keep-disabled])').forEach((b) => {
    if (b.form?.method === 'post' && !b.hasAttribute('data-server-disabled')) b.disabled = false;
  });
});

// Filas de tabla clickeables
document.addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button, form')) window.location.href = row.dataset.href;
});

// Pantalla de festejo
document.querySelectorAll('[data-close-celebration]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const el = btn.closest('.celebrate');
    el.classList.add('closing');
    setTimeout(() => el.remove(), 300);
  });
});

// Formulario de beneficio: muestra Nivel/Evento según cuándo se otorga
(() => {
  const select = document.querySelector('[data-toggle-trigger]');
  if (!select) return;
  const sync = () => document.querySelectorAll('[data-show-for]').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.showFor !== select.value);
  });
  select.addEventListener('change', sync);
  sync();
})();

// PWA: service worker
// Marta salta cuando la tocás
document.querySelectorAll('[data-hop]').forEach((el) => {
  el.addEventListener('click', () => {
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
