(() => {
  const user = API.getUser();
  const isLoggedIn = API.isLoggedIn();

  /* ── Icon set (Feather-style SVG) ── */
  const IC = {
    dashboard: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    verify:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    tag:       `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    gift:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
    alert:     `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    file:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    chart:     `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    search:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    user:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    home:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    plus:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    trending:  `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  };

  const SIDEBAR_LINKS = {
    admin: [
      { href: '/admin',            label: 'Dashboard',      icon: 'dashboard' },
      { href: '/admin/verify',     label: 'Verifications',  icon: 'verify'    },
      { href: '/admin/categories', label: 'Categories',     icon: 'tag'       },
      { href: '/admin/rewards',    label: 'Rewards',        icon: 'gift'      },
      { href: '/admin/disputes',   label: 'Disputes',       icon: 'alert'     },
      { href: '/admin/audit',      label: 'Audit Log',      icon: 'file'      },
      { href: '/admin/analytics',  label: 'Analytics',      icon: 'chart'     },
    ],
    volunteer: [
      { href: '/volunteer-dashboard', label: 'Dashboard',   icon: 'home'   },
      { href: '/gigs',                label: 'Browse Gigs', icon: 'search' },
      { href: '/rewards',             label: 'Rewards',     icon: 'gift'   },
      { href: '/volunteer-profile',   label: 'My Profile',  icon: 'user'   },
    ],
    org: [
      { href: '/org-dashboard',   label: 'Dashboard',  icon: 'home'   },
      { href: '/org-gig-create',  label: 'Post a Gig', icon: 'plus'   },
      { href: '/gigs',            label: 'Browse Gigs',icon: 'search' },
    ],
    csr: [
      { href: '/csr-dashboard', label: 'Dashboard', icon: 'trending' },
    ],
  };

  const currentPath = window.location.pathname;

  /* ── Navbar ── */
  const rightHTML = isLoggedIn && user ? `
    <div class="notif-wrapper">
      <div class="nav-bell" id="bellBtn" title="Notifications"><span class="bell-badge hidden" id="bellBadge">0</span></div>
      <div class="notif-panel" id="notifPanel">
        <div class="notif-header"><h4>Notifications</h4><button class="btn btn-ghost btn-sm" id="markAllRead">Mark all read</button></div>
        <div id="notifList"><div class="notif-empty">Loading...</div></div>
      </div>
    </div>
    <div class="nav-user">
      <div class="nav-avatar">${(user.email?.[0] || '?').toUpperCase()}</div>
      <div>
        <div style="color:#0f172a;font-size:0.8rem;font-weight:600">${user.email?.split('@')[0]}</div>
        <div style="color:#0f172a;font-size:0.7rem;text-transform:capitalize">${user.role}</div>
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="logout()" style="color:#0f172a">Logout</button>
  ` : `
    <a href="/login" class="btn btn-secondary btn-sm">Log In</a>
    <a href="/register-volunteer" class="btn btn-primary btn-sm">Get Started</a>
  `;

  const navLinks = {
    volunteer: [
      { href: '/volunteer-dashboard', label: 'Dashboard' },
      { href: '/gigs', label: 'Browse Gigs' },
      { href: '/rewards', label: 'Rewards' },
      { href: '/volunteer-profile', label: 'Profile' },
    ],
    org: [
      { href: '/org-dashboard', label: 'Dashboard' },
      { href: '/org-gig-create', label: '+ Post Gig' },
      { href: '/gigs', label: 'Browse Gigs' },
    ],
    admin: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/verify', label: 'Verifications' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/rewards', label: 'Rewards' },
      { href: '/admin/disputes', label: 'Disputes' },
      { href: '/admin/audit', label: 'Audit Log' },
      { href: '/admin/analytics', label: 'Analytics' },
    ],
    csr: [{ href: '/csr-dashboard', label: 'Dashboard' }],
  };
  const links = isLoggedIn && user ? (navLinks[user.role] || []) : [];
  const linksHTML = links.map(l => `<a href="${l.href}" class="${currentPath === l.href || currentPath.startsWith(l.href + '/') ? 'active' : ''}">${l.label}</a>`).join('');

  const mobileLinks = [
    ...links,
    ...(isLoggedIn ? [{ href: '#', label: 'Logout', onclick: 'logout()' }] : [{ href: '/login', label: 'Log In' }, { href: '/register-volunteer', label: 'Get Started' }]),
  ];
  const mobileHTML = mobileLinks.map(l => `<a href="${l.href}" ${l.onclick ? `onclick="${l.onclick}"` : ''}>${l.label}</a>`).join('');

  document.getElementById('navbar').innerHTML = `
    <div class="nav-inner">
      <a href="/" class="nav-brand"><img src="/images/logo.png" alt="Impact Circle" class="nav-logo"></a>
      <nav class="nav-links">${linksHTML}</nav>
      <div class="nav-right">${rightHTML}</div>
      <button class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div class="nav-mobile-menu" id="mobileMenu">${mobileHTML}</div>
  `;

  /* ── Sidebar ── */
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl && isLoggedIn && user) {
    document.body.classList.add('has-sidebar');
    const roleLinks = SIDEBAR_LINKS[user.role] || [];
    const sidebarLinksHTML = roleLinks.map(l => {
      const isActive = currentPath === l.href || (l.href !== '/' && currentPath.startsWith(l.href));
      return `<a href="${l.href}" class="sidebar-link${isActive ? ' active' : ''}">${IC[l.icon] || ''}${l.label}</a>`;
    }).join('');

    sidebarEl.innerHTML = `
      <nav class="sidebar-nav">
        <div class="sidebar-section">
          <div class="sidebar-section-label">${user.role === 'admin' ? 'Administration' : user.role === 'volunteer' ? 'Volunteer' : user.role === 'org' ? 'Organization' : 'CSR Partner'}</div>
          ${sidebarLinksHTML}
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${(user.email?.[0] || '?').toUpperCase()}</div>
          <div>
            <div class="sidebar-user-name">${user.email?.split('@')[0]}</div>
            <div class="sidebar-user-role">${user.role}</div>
          </div>
        </div>
      </div>
    `;

    /* Small delay so the CSS transition doesn't fire on page load */
    requestAnimationFrame(() => sidebarEl.classList.add('ready'));

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'sidebarToggleDesktop';
    toggleBtn.className = 'sidebar-toggle-desktop';
    toggleBtn.setAttribute('aria-label', 'Toggle sidebar');
    document.body.appendChild(toggleBtn);

    const applySidebarCollapsedState = (collapsed) => {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      toggleBtn.textContent = collapsed ? '›' : '‹';
      toggleBtn.title = collapsed ? 'Show sidebar' : 'Hide sidebar';
    };

    const stored = localStorage.getItem('sidebarCollapsed') === '1';
    applySidebarCollapsedState(stored);

    toggleBtn.addEventListener('click', () => {
      const collapsed = !document.body.classList.contains('sidebar-collapsed');
      applySidebarCollapsedState(collapsed);
      localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
      sidebarEl.classList.remove('open');
      document.getElementById('sidebarBackdrop')?.classList.remove('open');
    });
  }

  /* ── Hamburger: toggles sidebar on pages that have one, else mobile menu ── */
  const hamburger = document.getElementById('hamburger');
  hamburger?.addEventListener('click', () => {
    if (sidebarEl) {
      const isOpen = sidebarEl.classList.toggle('open');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (backdrop) backdrop.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    } else {
      const menu = document.getElementById('mobileMenu');
      const isOpen = menu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }
  });

  document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
    sidebarEl?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('open');
  });

  /* ── Notifications ── */
  if (isLoggedIn) {
    loadNotifications();
    setInterval(loadNotifications, 30000);
    document.getElementById('bellBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.getElementById('notifPanel');
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) markAllRead();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notif-wrapper')) document.getElementById('notifPanel')?.classList.remove('open');
    });
    document.getElementById('markAllRead')?.addEventListener('click', () => markAllRead());
  }

  async function loadNotifications() {
    try {
      const { data } = await API.get('/notifications');
      const badge = document.getElementById('bellBadge');
      if (badge) { badge.textContent = data.unreadCount; badge.classList.toggle('hidden', data.unreadCount === 0); }
      const list = document.getElementById('notifList');
      if (!list) return;
      if (!data.notifications.length) { list.innerHTML = '<div class="notif-empty">No notifications yet.</div>'; return; }
      list.innerHTML = data.notifications.map(n => `
        <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="window.location='${n.link || '#'}'">
          <p>${n.message}</p>
          <small>${fmt.fromNow(n.createdAt)}</small>
        </div>
      `).join('');
    } catch {}
  }

  async function markAllRead() {
    try { await API.patch('/notifications/read', {}); loadNotifications(); } catch {}
  }
})();

function logout() {
  API.clearSession();
  window.location.replace('/login');
}
