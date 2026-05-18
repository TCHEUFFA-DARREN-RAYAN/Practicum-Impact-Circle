/* QR scanner helper — opens a modal that uses the device camera (html5-qrcode)
   to scan an ImpactCircle check-in QR code, then navigates to /checkin/:token.
   Usage: include this script and call ImpactQR.open(). */
(function () {
  let scanner = null;
  let modalEl = null;

  function ensureLib() {
    return new Promise((resolve, reject) => {
      if (window.Html5Qrcode) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load QR scanner library.'));
      document.head.appendChild(s);
    });
  }

  function ensureModal() {
    if (modalEl) return modalEl;
    if (!document.getElementById('impact-qr-styles')) {
      const css = document.createElement('style');
      css.id = 'impact-qr-styles';
      css.textContent = `
        .impact-qr-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1100;
          display: none; align-items: center; justify-content: center; padding: 1rem;
        }
        .impact-qr-backdrop.show { display: flex; }
        .impact-qr-box {
          background: #fff; border-radius: 14px; max-width: 520px; width: 100%;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 0.875rem;
        }
        .impact-qr-box h3 { margin: 0; font-size: 1.1rem; }
        .impact-qr-box .impact-qr-close {
          background: none; border: none; font-size: 1.5rem;
          cursor: pointer; line-height: 1; padding: 0; color: #64748b;
        }
        #impact-qr-reader { width: 100%; }
        .impact-qr-status { font-size: 0.85rem; color: #64748b; }
        .impact-qr-status.error { color: #991b1b; }`;
      document.head.appendChild(css);
    }
    modalEl = document.createElement('div');
    modalEl.className = 'impact-qr-backdrop';
    modalEl.innerHTML = `
      <div class="impact-qr-box">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3>Scan QR Code to Check In</h3>
          <button type="button" class="impact-qr-close" aria-label="Close">×</button>
        </div>
        <div id="impact-qr-reader"></div>
        <div class="impact-qr-status">Point your camera at the gig's QR poster.</div>
      </div>`;
    document.body.appendChild(modalEl);
    modalEl.querySelector('.impact-qr-close').addEventListener('click', close);
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
    return modalEl;
  }

  function setStatus(text, isError) {
    const el = modalEl && modalEl.querySelector('.impact-qr-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('error', !!isError);
  }

  async function open() {
    ensureModal();
    modalEl.classList.add('show');
    setStatus('Loading camera...', false);

    try {
      await ensureLib();
    } catch (e) {
      setStatus(e.message, true);
      return;
    }

    try {
      scanner = new Html5Qrcode('impact-qr-reader');
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => handleScan(decodedText),
        () => { /* per-frame decode errors */ }
      );
      setStatus("Point your camera at the gig's QR poster.", false);
    } catch (_) {
      setStatus("Camera unavailable. Use your phone's camera to scan the QR poster instead.", true);
    }
  }

  async function close() {
    if (modalEl) modalEl.classList.remove('show');
    if (scanner) {
      try { await scanner.stop(); scanner.clear(); } catch (_) {}
      scanner = null;
    }
  }

  function handleScan(decodedText) {
    let token = null;
    try {
      const url = new URL(decodedText);
      const m = url.pathname.match(/\/checkin\/([^\/?#]+)/);
      if (m) token = m[1];
    } catch (_) {
      if (/^[A-Za-z0-9_-]{8,}$/.test(decodedText)) token = decodedText;
    }
    if (!token) {
      setStatus('That QR code is not a valid ImpactCircle check-in code.', true);
      return;
    }
    close();
    window.location.href = '/checkin/' + token;
  }

  window.ImpactQR = { open, close };
})();
