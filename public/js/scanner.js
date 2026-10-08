// Lector de QR en caja (html5-qrcode, servido desde /vendor)
(() => {
  const startBtn = document.getElementById('scan-start');
  const stopBtn = document.getElementById('scan-stop');
  const reader = document.getElementById('reader');
  const idle = document.getElementById('scanner-idle');
  const errorBox = document.getElementById('scanner-error');
  if (!startBtn || !window.Html5Qrcode) return;

  let scanner = null;
  let done = false;

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  };

  const setScanning = (on) => {
    reader.classList.toggle('hidden', !on);
    idle.classList.toggle('hidden', on);
    startBtn.classList.toggle('hidden', on);
    stopBtn.classList.toggle('hidden', !on);
  };

  /** El QR trae una URL .../caja/qr/<token>; también aceptamos el token solo. */
  const tokenFrom = (text) => {
    const m = String(text).match(/\/caja\/qr\/([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{16,}$/.test(text) ? text : null;
  };

  const stop = async () => {
    if (scanner) {
      try { await scanner.stop(); } catch { /* ya estaba detenido */ }
      scanner.clear();
      scanner = null;
    }
    setScanning(false);
  };

  startBtn.addEventListener('click', async () => {
    errorBox.classList.add('hidden');
    if (!window.isSecureContext) {
      showError('La cámara solo funciona con HTTPS o en localhost. Buscá al cliente por celular o nombre.');
      return;
    }
    setScanning(true);
    done = false;
    scanner = new Html5Qrcode('reader');
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } },
        (text) => {
          if (done) return;
          const token = tokenFrom(text);
          if (!token) { showError('Ese QR no es de Mercadito de Sabores.'); return; }
          done = true;
          if (navigator.vibrate) navigator.vibrate(60);
          stop().finally(() => { window.location.href = `/caja/qr/${encodeURIComponent(token)}`; });
        },
        () => {},
      );
    } catch (err) {
      await stop();
      showError('No pudimos abrir la cámara. Revisá los permisos del navegador o buscá al cliente por celular.');
    }
  });

  stopBtn.addEventListener('click', stop);
  window.addEventListener('pagehide', stop);
})();
