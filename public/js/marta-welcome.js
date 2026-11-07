(() => {
  const dialog = document.querySelector('[data-marta-welcome]');
  if (!dialog) return;
  const $ = (s) => dialog.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [
    ['LA VERDADERA JEFA', 'Hola, soy Marta.', 'La masa madre y la verdadera jefa de Mercadito.', 3200],
    ['VOS DISFRUTÁS, YO CREZCO', 'Tus sellos me alimentan.', 'Cada visita suma un sello. Vos disfrutás lo que hacemos conmigo y yo recibo mi cucharada de harina.', 5000],
    ['EL CARIÑO VA Y VUELVE', 'Si crezco, te alimento.', 'Cuantos más sellos sumás, más crezco. Y cuanto más crezco, más beneficios desbloqueás. Vos me alimentás, yo te alimento.', 5500],
    ['ESTE ES TU NIVEL REAL', $('[data-mw-ending-title]').content.textContent.trim(), $('[data-mw-ending-copy]').content.textContent.trim(), 0],
  ];
  let step = 0, timer, paused = reduced;
  const previousFocus = document.activeElement;
  const originalOverflow = document.body.style.overflow;
  const schedule = () => {
    clearTimeout(timer);
    if (!paused && !document.hidden && steps[step][3]) timer = setTimeout(() => render(step + 1), steps[step][3]);
  };
  const render = (index) => {
    step = index;
    const [eyebrow, title, copy] = steps[step];
    $('[data-mw-eyebrow]').textContent = eyebrow;
    $('[data-mw-title]').textContent = title;
    $('[data-mw-copy]').textContent = copy;
    $('[data-mw-character]').replaceChildren($(`[data-mw-art="${step}"]`).content.cloneNode(true));
    dialog.dataset.step = step;
    dialog.querySelectorAll('.mw-dots span').forEach((dot, i) => {
      dot.classList.toggle('active', i === step);
      dot.classList.toggle('done', i < step);
    });
    $('.mw-dots').setAttribute('aria-label', `Paso ${step + 1} de 4`);
    $('[data-mw-next]').textContent = step === 3 ? '¡A alimentar a Marta!' : 'Siguiente →';
    $('[data-mw-pause]').hidden = step === 3;
    $('[data-mw-pause]').textContent = paused ? 'Continuar' : 'Pausar';
    $('[data-mw-pause]').setAttribute('aria-label', paused ? 'Continuar avance automático' : 'Pausar avance automático');
    schedule();
  };
  const close = () => dialog.close();
  $('[data-mw-next]').addEventListener('click', () => step === 3 ? close() : render(step + 1));
  $('[data-mw-close]').addEventListener('click', close);
  $('[data-mw-pause]').addEventListener('click', () => { paused = !paused; $('[data-mw-pause]').textContent = paused ? 'Continuar' : 'Pausar'; $('[data-mw-pause]').setAttribute('aria-label', paused ? 'Continuar avance automático' : 'Pausar avance automático'); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  dialog.addEventListener('close', () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', schedule);
    document.body.style.overflow = originalOverflow;
    previousFocus?.focus();
    dialog.remove();
  }, { once: true });
  customElements.whenDefined('marta-sube-nivel').then(() => {
    if (!dialog.isConnected) return;
    render(0);
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    $('[data-mw-next]').focus();
  });
})();
