(() => {
  const user = API.getUser();
  const isLoggedIn = API.isLoggedIn();

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
    csr: [
      { href: '/csr-dashboard', label: 'Dashboard' },
    ],
  };

  const links = isLoggedIn && user ? (navLinks[user.role] || []) : [];
  const currentPath = window.location.pathname;

  const linksHTML = links.map(l => `<a href="${l.href}" class="${currentPath === l.href || currentPath.startsWith(l.href + '/') ? 'active' : ''}">${l.label}</a>`).join('');

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
        <div style="color:white;font-size:0.8rem;font-weight:600">${user.email?.split('@')[0]}</div>
        <div style="color:#94a3b8;font-size:0.7rem;text-transform:capitalize">${user.role}</div>
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="logout()" style="color:#94a3b8">Logout</button>
  ` : `
    <a href="/login" class="btn btn-secondary btn-sm">Log In</a>
    <a href="/register-volunteer" class="btn btn-primary btn-sm">Get Started</a>
  `;

  const mobileLinks = [
    ...links,
    ...(isLoggedIn ? [{ href: '#', label: 'Logout', onclick: 'logout()' }] : [{ href: '/login', label: 'Log In' }, { href: '/register-volunteer', label: 'Get Started' }]),
  ];

  const mobileHTML = mobileLinks.map(l => `<a href="${l.href}" ${l.onclick ? `onclick="${l.onclick}"` : ''}>${l.label}</a>`).join('');

  document.getElementById('navbar').innerHTML = `
    <div class="nav-inner">
      <a href="/" class="nav-brand">Impact<span>Circle</span></a>
      <nav class="nav-links">${linksHTML}</nav>
      <div class="nav-right">${rightHTML}</div>
      <button class="nav-hamburger" id="hamburger" aria-label="Menu"></button>
    </div>
    <div class="nav-mobile-menu" id="mobileMenu">${mobileHTML}</div>
  `;

  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.toggle('open');
  });

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
    try {
      await API.patch('/notifications/read', {});
      loadNotifications();
    } catch {}
  }
})();

function logout() {
  API.clearSession();
  window.location.replace('/login');
}
