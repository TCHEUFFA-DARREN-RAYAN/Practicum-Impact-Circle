(() => {
  if (document.querySelector('.global-footer') || document.querySelector('.lp-footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'global-footer';
  footer.innerHTML = `
    <div class="global-footer-inner">
      <div class="global-footer-copy">© 2026 ImpactCircle</div>
    </div>
  `;

  document.body.appendChild(footer);
})();
