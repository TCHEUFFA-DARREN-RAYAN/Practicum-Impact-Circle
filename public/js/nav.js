(() => {
  const user      = API.getUser();
  const isLoggedIn = API.isLoggedIn();
  const currentPath = window.location.pathname;

  /* =============================================================
     PUBLIC GLASSMORPHISM NAV  (not logged in)
  ============================================================= */
  if (!isLoggedIn) {
    document.body.classList.add('public-page');

    const navEl = document.getElementById('navbar');
    navEl.classList.add('glass-mode');

    /* Nav groups — all public pages reachable from here */
    const NAV_GROUPS = [
      { label: 'Home', href: '/' },
      {
        label: 'About',
        items: [
          { href: '/about',        label: 'About Us',        desc: 'Our mission and story'                },
          { href: '/how-it-works', label: 'How It Works',    desc: 'Guide for volunteers & organizations' },
        ],
      },
      {
        label: 'Volunteers',
        items: [
          { href: '/upcoming-shifts', label: 'Browse Shifts',  desc: 'Find volunteer opportunities'   },
          { href: '/categories',      label: 'Categories',     desc: 'Explore by cause area'          },
          { href: '/volunteers',      label: 'Why Volunteer?', desc: 'Benefits of giving back'        },
        ],
      },
      {
        label: 'Organizations',
        items: [
          { href: '/organizations', label: 'For Organizations', desc: 'Post shifts & manage volunteers' },
          { href: '/faq',           label: 'FAQ',               desc: 'Common questions answered'       },
        ],
      },
      { label: 'Contact', href: '/contact' },
    ];

    /* ── Desktop groups ── */
    const desktopHTML = NAV_GROUPS.map((g, i) => {
      const delay = `${150 + i * 60}ms`;
      if (g.href) {
        return `<a href="${g.href}" class="gn-link${currentPath === g.href ? ' active' : ''}" style="--ld:${delay}">${g.label}</a>`;
      }
      const hasActive = g.items.some(it => currentPath === it.href);
      return `
        <div class="gn-item${hasActive ? ' has-active' : ''}">
          <button class="gn-trigger${hasActive ? ' active' : ''}" style="--ld:${delay}">
            ${g.label}
            <svg class="gn-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="gn-dropdown">
            ${g.items.map(it => `
              <a href="${it.href}" class="gn-dd-item${currentPath === it.href ? ' active' : ''}">
                <span class="gn-dd-title">${it.label}</span>
                <span class="gn-dd-desc">${it.desc}</span>
              </a>`).join('')}
          </div>
        </div>`;
    }).join('');

    /* ── Mobile menu ── */
    const mobileHTML = NAV_GROUPS.map(g => {
      if (g.href) {
        return `<a href="${g.href}" class="gm-link${currentPath === g.href ? ' active' : ''}">${g.label}</a>`;
      }
      const hasActive = g.items.some(it => currentPath === it.href);
      return `
        <div class="gm-group${hasActive ? ' open' : ''}">
          <button class="gm-trigger">
            ${g.label}
            <svg class="gn-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="gm-sub">
            ${g.items.map(it => `<a href="${it.href}" class="gm-sub-link${currentPath === it.href ? ' active' : ''}">${it.label}</a>`).join('')}
          </div>
        </div>`;
    }).join('');

    /* ── Render ── */
    navEl.innerHTML = `
      <div class="glass-nav" id="glassNav">
        <div class="gn-orb gn-orb-l"></div>
        <div class="gn-orb gn-orb-r"></div>
        <div class="gn-inner">

          <a href="/" class="gn-brand">
            <img src="/images/logo.png" alt="ImpactCircle" class="gn-logo-img">
          </a>

          <nav class="gn-links">${desktopHTML}</nav>

          <div class="gn-auth">
            <a href="/login"    class="gn-btn-outline">Sign In</a>
            <a href="/register-volunteer" class="gn-btn-cta">Register</a>
          </div>

          <button class="gn-hamburger" id="gnHamburger" aria-label="Open menu" aria-expanded="false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

        </div>
      </div>

      <div class="gm-menu" id="gnMobileMenu" aria-hidden="true">
        ${mobileHTML}
        <div class="gm-auth">
          <a href="/login"    class="gn-btn-outline">Sign In</a>
          <a href="/register-volunteer" class="gn-btn-cta">Register</a>
        </div>
      </div>`;

    /* Mount animation */
    requestAnimationFrame(() => document.getElementById('glassNav')?.classList.add('mounted'));

    /* Desktop: dropdown toggle */
    navEl.querySelectorAll('.gn-trigger').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const item    = btn.closest('.gn-item');
        const wasOpen = item.classList.contains('open');
        navEl.querySelectorAll('.gn-item.open').forEach(el => el.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });

    /* Mobile: hamburger */
    const hamburger  = document.getElementById('gnHamburger');
    const mobileMenu = document.getElementById('gnMobileMenu');
    hamburger?.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
    });

    /* Mobile: accordion */
    navEl.querySelectorAll('.gm-trigger').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.gm-group')?.classList.toggle('open'));
    });

    /* Click outside → close everything */
    document.addEventListener('click', e => {
      if (!e.target.closest('#navbar')) {
        navEl.querySelectorAll('.gn-item.open').forEach(el => el.classList.remove('open'));
        mobileMenu?.classList.remove('open');
        hamburger?.setAttribute('aria-expanded', 'false');
      }
    });

    /* ESC closes */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        navEl.querySelectorAll('.gn-item.open').forEach(el => el.classList.remove('open'));
        mobileMenu?.classList.remove('open');
      }
    });

    return; /* stop — skip logged-in code */
  }

  /* =============================================================
     LOGGED-IN NAV  (solid bar + sidebar)
  ============================================================= */

  /* ── Icon set (Feather-style SVG) ── */
  const IC = {
    dashboard:   `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    verify:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    tag:         `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    file:        `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    chart:       `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    search:      `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    user:        `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    home:        `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    plus:        `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    heart:       `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    calendar:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    star:        `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    bookmark:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    message:     `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    settings:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    trending:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    users:       `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    building:    `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`,
    clipboard:   `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
    checkCircle: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    bell:        `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    briefcase:   `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  };

  /* ── Sidebar links per role ── */
  const SIDEBAR_LINKS = {
    admin: [
      { href: '/admin',                 label: 'Admin Dashboard',          icon: 'dashboard'   },
      { href: '/admin/users',           label: 'Manage Users',             icon: 'users'       },
      { href: '/admin/organizations',   label: 'Manage Organizations',     icon: 'building'    },
      { href: '/gigs',                  label: 'All Gigs',                 icon: 'search'      },
      { href: '/admin/categories',      label: 'Manage Categories',        icon: 'tag'         },
      { href: '/admin/calendar',        label: 'Calendar',                 icon: 'calendar'    },
      { href: '/admin/analytics',       label: 'Reports & Analytics',      icon: 'chart'       },
      { href: '/admin/export',          label: 'Export Data',              icon: 'file'        },
      { href: '/admin/verify',          label: 'Approvals & Verification', icon: 'verify'      },
      { href: '/admin/announcements',   label: 'Announcements',            icon: 'bell'        },
      { href: '/messages',              label: 'Messages',                 icon: 'message'     },
      { href: '/admin/settings',        label: 'Settings',                 icon: 'settings'    },
    ],
    volunteer: [
      { href: '/volunteer-dashboard',   label: 'My Dashboard',             icon: 'home'        },
      { href: '/volunteer/applications',label: 'My Applications',          icon: 'clipboard'   },
      { href: '/gigs',                  label: 'Browse Gigs',              icon: 'heart'       },
      { href: '/volunteer/schedule',    label: 'My Schedule',              icon: 'calendar'    },
      { href: '/volunteer/impact',      label: 'My Impact',                icon: 'trending'    },
      { href: '/messages',              label: 'Messages',                 icon: 'message'     },
      { href: '/volunteer/settings',    label: 'Settings',                 icon: 'settings'    },
    ],
    org: [
      { href: '/org-dashboard',         label: 'Organization Dashboard',   icon: 'dashboard'   },
      { href: '/org/opportunities',     label: 'My Posted Gigs',           icon: 'briefcase'   },
      { href: '/org-gig-create',        label: 'Post an Opportunity',      icon: 'plus'        },
      { href: '/gigs',                  label: 'All Gigs',                 icon: 'search'      },
      { href: '/org/applications',      label: 'Volunteer Applications',   icon: 'clipboard'   },
      { href: '/org/volunteers',        label: 'Volunteer Tracker',        icon: 'checkCircle' },
      { href: '/org/attendance/0',      label: 'Attendance Tracking',      icon: 'verify'      },
      { href: '/org/schedule',          label: 'Calendar',                 icon: 'calendar'    },
      { href: '/messages',              label: 'Messages',                 icon: 'message'     },
      { href: '/org/analytics',         label: 'Analytics',                icon: 'chart'       },
      { href: '/org/announcements',     label: 'Announcements',            icon: 'bell'        },
      { href: '/org/roles',             label: 'Team & Roles',             icon: 'users'       },
      { href: '/org/settings',          label: 'Settings',                 icon: 'settings'    },
    ],
  };

  /* ── Top-bar nav links per role ── */
  const navLinks = {
    volunteer: [
      { href: '/volunteer-dashboard', label: 'Dashboard'         },
      { href: '/upcoming-shifts',     label: 'Browse Shifts'     },
      { href: '/volunteer-profile',   label: 'My Profile'        },
    ],
    org: [
      { href: '/org-dashboard',   label: 'Dashboard'             },
      { href: '/org-gig-create',  label: '+ Post Opportunity'    },
    ],
    admin: [
      { href: '/admin',             label: 'Dashboard'           },
      { href: '/admin/categories',  label: 'Categories'          },
      { href: '/admin/analytics',   label: 'Analytics'           },
    ],
  };

  /* ── Build links & right-side HTML ── */
  const links    = navLinks[user.role] || [];
  const linksHTML = links
    .map(l => `<a href="${l.href}" class="${currentPath === l.href ? 'active' : ''}">${l.label}</a>`)
    .join('');

  const rightHTML = `
    <div class="notif-wrapper">
      <div class="nav-bell" id="bellBtn" title="Notifications">
        <span class="bell-badge hidden" id="bellBadge">0</span>
      </div>
      <div class="notif-panel" id="notifPanel">
        <div class="notif-header">
          <h4>Notifications</h4>
          <button class="btn btn-ghost btn-sm" id="markAllRead">Mark all read</button>
        </div>
        <div id="notifList"><div class="notif-empty">Loading...</div></div>
      </div>
    </div>
    <div class="nav-user">
      <div class="nav-avatar" style="${user.avatarUrl ? 'padding:0;overflow:hidden;' : ''}">${user.avatarUrl && user.id ? `<img src="/api/uploads/${user.id}/${user.avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (user.email?.[0] || '?').toUpperCase()}</div>
      <div>
        <div style="color:#0f172a;font-size:0.8rem;font-weight:700;line-height:1.2">${user.email?.split('@')[0]}</div>
        <div style="color:#64748b;font-size:0.68rem;text-transform:capitalize;line-height:1.2">${user.role}</div>
      </div>
    </div>
    <button class="btn btn-sm" onclick="logout()"
      style="background:#ffffff;color:#334155;border:1px solid #e2e8f0;font-size:0.8rem;padding:0.3rem 0.75rem;box-shadow:0 1px 2px rgba(15,23,42,0.04)">
      Logout
    </button>`;

  const mobileLinks = [
    ...links,
    { href: '#', label: 'Logout', onclick: 'logout()' },
  ];
  const mobileHTML = mobileLinks
    .map(l => `<a href="${l.href}" ${l.onclick ? `onclick="${l.onclick}"` : ''} class="${currentPath === l.href ? 'active' : ''}">${l.label}</a>`)
    .join('');

  document.getElementById('navbar').innerHTML = `
    <div class="nav-inner">
      <a href="/" class="nav-brand"><img src="/images/logo.png" alt="Impact Circle" class="nav-logo"></a>
      <nav class="nav-links">${linksHTML}</nav>
      <div class="nav-right">${rightHTML}</div>
      <button class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="nav-mobile-menu" id="mobileMenu">${mobileHTML}</div>`;

  /* ── Sidebar ── */
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl && user) {
    document.body.classList.add('has-sidebar');
    const roleLinks = SIDEBAR_LINKS[user.role] || [];
    const sidebarLinksHTML = roleLinks.map(l => {
      const exactDash = ['/admin', '/volunteer-dashboard', '/org-dashboard'];
      const isActive =
        currentPath === l.href ||
        (!exactDash.includes(l.href) && l.href !== '/' && (currentPath === l.href || currentPath.startsWith(`${l.href}/`)));
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return `<a href="${l.href}" class="sidebar-link${isActive ? ' active' : ''}" title="${esc(l.label)}" aria-label="${esc(l.label)}">${IC[l.icon] || ''}<span class="sidebar-link-text">${l.label}</span></a>`;
    }).join('');

    const roleLabels = { admin: 'Administration', volunteer: 'Volunteer', org: 'Organization' };
    sidebarEl.innerHTML = `
      <a href="/" class="sidebar-brand" aria-label="ImpactCircle Home">
        <img src="/images/logo.png" alt="" class="sidebar-brand-logo" width="120" height="32" decoding="async">
        <span class="sidebar-brand-text">
          <span class="sidebar-brand-name">ImpactCircle</span>
          <span class="sidebar-brand-sub">${roleLabels[user.role] || user.role}</span>
        </span>
      </a>
      <nav class="sidebar-nav">
        <div class="sidebar-section">
          <div class="sidebar-section-label">${roleLabels[user.role] || user.role}</div>
          ${sidebarLinksHTML}
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${(user.email?.[0] || '?').toUpperCase()}</div>
          <div class="sidebar-user-meta">
            <div class="sidebar-user-name">${user.email?.split('@')[0]}</div>
            <div class="sidebar-user-role">${user.role}</div>
          </div>
        </div>
      </div>`;

    requestAnimationFrame(() => sidebarEl.classList.add('ready'));

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'sidebarToggleDesktop';
    toggleBtn.className = 'sidebar-toggle-desktop';
    toggleBtn.setAttribute('aria-label', 'Toggle sidebar width');
    document.body.appendChild(toggleBtn);

    const applySidebarCollapsedState = collapsed => {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      toggleBtn.textContent = collapsed ? '›' : '‹';
      toggleBtn.title = collapsed ? 'Expand sidebar (show labels)' : 'Collapse to icons';
      toggleBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar to icon rail');
    };

    applySidebarCollapsedState(localStorage.getItem('sidebarCollapsed') === '1');

    toggleBtn.addEventListener('click', () => {
      const collapsed = !document.body.classList.contains('sidebar-collapsed');
      applySidebarCollapsedState(collapsed);
      localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
      sidebarEl.classList.remove('open');
      document.getElementById('sidebarBackdrop')?.classList.remove('open');
    });
  }

  /* ── Hamburger ── */
  const hamburger = document.getElementById('hamburger');
  hamburger?.addEventListener('click', () => {
    if (sidebarEl) {
      const isOpen = sidebarEl.classList.toggle('open');
      document.getElementById('sidebarBackdrop')?.classList.toggle('open', isOpen);
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
  loadNotifications();
  setInterval(loadNotifications, 30000);
  document.getElementById('bellBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) markAllRead();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.notif-wrapper')) document.getElementById('notifPanel')?.classList.remove('open');
  });
  document.getElementById('markAllRead')?.addEventListener('click', () => markAllRead());

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
        </div>`).join('');
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
