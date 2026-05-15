(() => {
  if (document.querySelector('.global-footer') || document.querySelector('.lp-footer')) return;

  /* ── Slim footer for dashboard/logged-in pages (sidebar present) ── */
  if (document.getElementById('sidebar')) {
    if (!document.getElementById('gf-slim-css')) {
      const s = document.createElement('style');
      s.id = 'gf-slim-css';
      s.textContent = `
        .dashboard-footer {
          margin-left: var(--sidebar-width, 240px);
          background: var(--color-navy, #071a3d);
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 0.875rem 1.5rem;
          text-align: center;
          font-size: 0.78rem;
          color: #cbd5e1;
          letter-spacing: 0.01em;
          transition: margin-left 0.3s ease;
        }
        .dashboard-footer .df-brand {
          color: #ffd600;
          font-weight: 600;
        }
        .has-sidebar.sidebar-collapsed .dashboard-footer {
          margin-left: var(--sidebar-rail-width, 72px);
        }
        @media (max-width: 900px) {
          .dashboard-footer { margin-left: 0; }
        }
      `;
      document.head.appendChild(s);
    }
    const footer = document.createElement('footer');
    footer.className = 'dashboard-footer';
    footer.innerHTML = `© 2026 <span class="df-brand">ImpactCircle</span>. All rights reserved. &nbsp;·&nbsp; Greater Moncton, NB, Canada`;
    document.body.appendChild(footer);
    return;
  }

  /* ── Full public footer ── */
  if (!document.getElementById('gf-css')) {
    const s = document.createElement('style');
    s.id = 'gf-css';
    s.textContent = `
      .global-footer {
        background: #071a3d;
        color: rgba(255,255,255,0.65);
        padding: 4rem 0 1.75rem;
        margin-top: auto;
      }
      .gf-inner {
        max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;
      }
      .gf-grid {
        display: grid;
        grid-template-columns: 1.5fr 1fr 1fr 1fr;
        gap: 2.5rem;
        margin-bottom: 3rem;
      }
      @media (max-width: 900px) {
        .gf-grid { grid-template-columns: 1fr 1fr; }
      }
      @media (max-width: 540px) {
        .gf-grid { grid-template-columns: 1fr; }
      }
      .gf-logo { height: 80px; width: auto; display: block; margin-bottom: 0.875rem; object-fit: contain; }
      .gf-brand-desc { font-size: 0.8125rem; line-height: 1.65; max-width: 240px; color: #cbd5e1; }
      .gf-social { display: flex; gap: 0.625rem; margin-top: 1.25rem; }
      .gf-social a {
        width: 34px; height: 34px; background: rgba(255,255,255,0.07); border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.8rem; font-weight: 700;
        transition: background 0.15s, color 0.15s;
      }
      .gf-social a:hover { background: #0066ff; color: white; text-decoration: none; }
      .gf-col h4 {
        color: white; font-size: 0.875rem; font-weight: 700;
        margin-bottom: 1.1rem; margin-top: 0;
      }
      .gf-col a {
        display: block; color: #cbd5e1; font-size: 0.825rem;
        padding: 0.3rem 0; text-decoration: none; transition: color 0.15s;
      }
      .gf-col a:hover { color: #ffd600; text-decoration: none; }
      .gf-bottom {
        border-top: 1px solid rgba(255,255,255,0.08);
        padding-top: 1.5rem; text-align: center; font-size: 0.8125rem;
        color: rgba(255,255,255,0.4);
      }
    `;
    document.head.appendChild(s);
  }

  const footer = document.createElement('footer');
  footer.className = 'global-footer';
  footer.innerHTML = `
    <div class="gf-inner">
      <div class="gf-grid">
        <div>
          <img src="/images/logo.png" alt="ImpactCircle" class="gf-logo">
          <p class="gf-brand-desc">A verified volunteer, CSR, and community impact exchange platform for Greater Moncton, NB.</p>
          <div class="gf-social">
            <a href="https://www.linkedin.com" target="_blank" rel="noopener" title="LinkedIn">in</a>
            <a href="https://x.com" target="_blank" rel="noopener" title="Twitter / X">𝕏</a>
            <a href="https://www.instagram.com" target="_blank" rel="noopener" title="Instagram">ig</a>
            <a href="mailto:info@impactcircle.ca" title="Email">@</a>
          </div>
        </div>
        <div class="gf-col">
          <h4>Platform</h4>
          <a href="/register-volunteer">Join as Volunteer</a>
          <a href="/register-org">Register Organization</a>
          <a href="/upcoming-shifts">Browse Shifts</a>
          <a href="/categories">Categories</a>
          <a href="/login">Sign In</a>
        </div>
        <div class="gf-col">
          <h4>Impact Areas</h4>
          <a href="/upcoming-shifts?category=Food+Security+%26+Nutrition">Food Security & Nutrition</a>
          <a href="/upcoming-shifts?category=Youth+%26+Children">Youth & Children</a>
          <a href="/upcoming-shifts?category=Newcomer+%26+Cultural+Integration">Newcomer & Cultural Integration</a>
          <a href="/upcoming-shifts?category=Shelter+%26+Housing+Support">Shelter & Housing Support</a>
          <a href="/upcoming-shifts?category=Community+Coordination">Community Coordination</a>
        </div>
        <div class="gf-col">
          <h4>About</h4>
          <a href="/about">About Us</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact Us</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms of Use</a>
        </div>
      </div>
      <div class="gf-bottom">
        © 2026 ImpactCircle. All rights reserved. &nbsp;·&nbsp; Greater Moncton, NB, Canada
      </div>
    </div>
  `;

  document.body.appendChild(footer);
})();
