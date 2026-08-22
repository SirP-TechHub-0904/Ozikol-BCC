// BCP layout controller.
// Owns the standard sidebar/topbar shell, theme switching, pinned tasks, dropdowns,
// and guided tour behavior for authorized BCP pages. Menu items are currently
// standardized here; the next implementation stage should hydrate them from roles,
// enabled features, and permission assignments instead of keeping them static.
document.addEventListener('DOMContentLoaded', () => {
  standardizeLayout();

  const sidebar = document.getElementById('sidebar');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const toggleThemeBtn = document.getElementById('toggle-theme');
  const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');
  const body = document.body;

  function standardizeLayout() {
    // The layout placeholders come from Razor partials. This function fills them
    // with the official Material Design UI shell so every BCP area renders consistently.
    const sidebarEl = document.getElementById('sidebar');
    const topbarEl = document.getElementById('topbar');
    const mainEl = document.getElementById('main-content');

    if (sidebarEl && sidebarEl.children.length === 0) {
      // Future sidebar generation point: filter these groups by enabled feature,
      // user role, and action-level permission before rendering them.
      sidebarEl.innerHTML = `
        <div class="sidebar-header">
          <a href="/BcpConsole/Console/Dashboard" class="brand-logo ozikol-brand-logo" title="Ozikol">
            <img src="/bcp/img/Ozikol-Logo.png" alt="Ozikol" class="brand-logo-img">
          </a>
        </div>

        <nav class="sidebar-nav">
          <div id="pinned-sidebar-section"></div>

          <div class="menu-title">Console</div>
          <div class="nav-item">
            <a class="nav-link" href="/BcpConsole/Console/Dashboard">
              <div class="nav-link-content">
                <span class="material-symbols-outlined">space_dashboard</span>
                <span>Console Dashboard</span>
              </div>
              <button class="pin-btn" data-title="Console Dashboard" data-url="/BcpConsole/Console/Dashboard" data-icon="space_dashboard" title="Pin Task">
                <span class="material-symbols-outlined">push_pin</span>
              </button>
            </a>
          </div>

          <div class="menu-title">Identity</div>
          ${navGroup('admin_panel_settings', 'Identity Control', 'Identity Control', '/BcpIdentity/Console/Dashboard', 'admin_panel_settings', [
        subItem('Users', '/BcpIdentity/Console/Users', 'groups'),
        subItem('Roles', '/BcpIdentity/Console/Roles', 'badge'),
        subItem('Permissions', '/BcpIdentity/Console/Permissions', 'verified_user'),
        subItem('Invitations', '/BcpIdentity/Console/Invitations', 'mail'),
        subItem('Password Policy', '/BcpIdentity/Console/PasswordPolicy', 'password'),
        subItem('MFA Policy', '/BcpIdentity/Console/MfaPolicy', 'passkey'),
        subItem('Sessions', '/BcpIdentity/Console/Sessions', 'devices'),
        subItem('Login Audit', '/BcpIdentity/Console/LoginAudit', 'manage_search'),
        subItem('Locked Accounts', '/BcpIdentity/Console/LockedAccounts', 'lock')
      ])}

          <div class="menu-title">User Management</div>
          ${navGroup('groups', 'User Management', 'User Management', '/BcpIdentity/Console/Users', 'groups', [
        subItem('Dashboard', '/BcpIdentity/Console/Dashboard', 'dashboard'),
        subItem('Users', '/BcpIdentity/Console/Users', 'groups'),
        subItem('Feature Access', '/BcpIdentity/Console/Permissions', 'rule'),
        subItem('Roles', '/BcpIdentity/Console/Roles', 'admin_panel_settings')
      ])}

          <div class="menu-title">Workspace</div>
          ${navGroup('account_circle', 'My Account', 'My Account', '/BcpWorkspace/Workspace/Dashboard', 'account_circle', [
        subItem('Workspace Dashboard', '/BcpWorkspace/Workspace/Dashboard', 'dashboard'),
        subItem('Profile', '/BcpIdentity/Workspace/Profile', 'person'),
        subItem('Security', '/BcpIdentity/Workspace/Security', 'shield_lock'),
        subItem('Change Password', '/BcpIdentity/Workspace/ChangePassword', 'password'),
        subItem('Two Factor', '/BcpIdentity/Workspace/TwoFactor', 'passkey'),
        subItem('Recovery Codes', '/BcpIdentity/Workspace/RecoveryCodes', 'key'),
        subItem('Trusted Devices', '/BcpIdentity/Workspace/TrustedDevices', 'devices'),
        subItem('Active Sessions', '/BcpIdentity/Workspace/ActiveSessions', 'schedule')
      ])}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-footer-brand">
            <img src="/bcp/img/icon.png" alt="Ozikol" class="sidebar-footer-icon">
            <div>
              <div class="sidebar-footer-title">Ozikol BCP</div>
              <div class="sidebar-footer-meta">v1.0.0</div>
            </div>
          </div>
          <div class="sidebar-footer-actions">
            <a href="javascript:void(0)" title="Help"><span class="material-symbols-outlined">help_outline</span></a>
            <a href="javascript:void(0)" title="Docs"><span class="material-symbols-outlined">article</span></a>
            <a href="/BcpIdentity/Workspace/Security" title="Settings"><span class="material-symbols-outlined">settings</span></a>
          </div>
        </div>
      `;
    }

    if (topbarEl) {
      const userEmail = topbarEl.dataset.userEmail || 'User';
      const userRole = topbarEl.dataset.userRole || 'Signed in';
      const roleLower = userRole.toLowerCase().trim();
      const isAdminOrSuperAdmin = roleLower === 'admin' || roleLower === 'superadmin' || roleLower === 'super admin';

      // The topbar remains shared across Console and Workspace so platform tools
      // like search, notifications, pinned tasks, theme, and profile stay predictable.
      topbarEl.innerHTML = `
        <div class="topbar-left">
          <button type="button" class="topbar-action-btn" id="toggle-sidebar" title="Toggle Navigation">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <a href="/BcpConsole/Console/Dashboard" class="topbar-brand-logo" title="Ozikol">
            <img src="/bcp/img/icon.png" alt="Ozikol" class="topbar-brand-img">
          </a>
          <div class="topbar-search-box">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" placeholder="Search..." aria-label="Search">
          </div>
        </div>

        <div class="topbar-right">
          <button type="button" class="topbar-action-btn mobile-search-btn" id="mobile-search-btn" title="Search">
            <span class="material-symbols-outlined">search</span>
          </button>

          <div class="apps-grid-wrapper">
            <button type="button" class="topbar-action-btn" id="apps-grid-btn" title="Apps">
              <span class="material-symbols-outlined">grid_view</span>
            </button>
            <div id="apps-grid-dropdown" class="apps-grid-dropdown">
              <div class="apps-grid-header">Your Favorites</div>
              <div class="apps-grid-container">
                ${appGridItem('Console', 'space_dashboard', '/BcpConsole/Console/Dashboard', '#2563eb')}
                ${appGridItem('Users', 'groups', '/BcpIdentity/Console/Users', '#22c55e')}
                ${appGridItem('Roles', 'badge', '/BcpIdentity/Console/Roles', '#0050e5')}
                ${appGridItem('Permissions', 'verified_user', '/BcpIdentity/Console/Permissions', '#0ab39c')}
                ${appGridItem('Sessions', 'devices', '/BcpIdentity/Console/Sessions', '#f59e0b')}
                ${appGridItem('Profile', 'account_circle', '/BcpIdentity/Workspace/Profile', '#64748b')}
              </div>
            </div>
          </div>

          <div class="calendar-wrapper">
            <button type="button" class="topbar-action-btn" id="calendar-btn" title="Calendar">
              <span class="material-symbols-outlined">calendar_today</span>
            </button>
            <div id="calendar-dropdown" class="calendar-dropdown-menu">
              <div class="calendar-header">
                <span class="calendar-month-title">July 2026</span>
                <div style="display:flex; gap:4px;">
                  <button type="button" class="calendar-nav-btn"><span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span></button>
                  <button type="button" class="calendar-nav-btn"><span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span></button>
                </div>
              </div>
              <div class="calendar-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
              <div class="calendar-days-grid">
                ${[28, 29, 30].map(day => `<span class="day-cell empty">${day}</span>`).join('')}
                ${Array.from({ length: 31 }, (_, index) => `<span class="day-cell${index + 1 === 23 ? ' today' : ''}">${index + 1}</span>`).join('')}
                <span class="day-cell empty">1</span>
              </div>
            </div>
          </div>

          <button type="button" class="topbar-action-btn" id="toggle-fullscreen" title="Toggle Fullscreen">
            <span class="material-symbols-outlined">fullscreen</span>
          </button>
          <button type="button" class="topbar-action-btn" id="toggle-theme" title="Toggle Theme">
            <span class="material-symbols-outlined">dark_mode</span>
          </button>

          <div class="notifications-wrapper">
            <button type="button" class="topbar-action-btn" id="notifications-btn" title="Notifications">
              <span class="material-symbols-outlined">notifications</span>
              <span class="action-badge badge-notify" id="notif-badge" style="display:none;">0</span>
            </button>
            <div id="notifications-dropdown" class="notifications-dropdown-menu">
              <div class="notifications-header">
                <span class="notifications-title">Notifications <span class="badge-pill" id="notif-header-badge" style="background:var(--sidebar-active-color); font-size:10px;"></span></span>
                <button type="button" class="notifications-clear-btn" id="notif-clear-all-btn">Clear All</button>
              </div>
              <div class="notifications-list" id="notif-list">
                <div style="text-align:center; padding:20px; color:var(--sidebar-color);">Loading...</div>
              </div>
              <div class="notifications-footer">
                <a href="/BcpWorkspace/Workspace/Notifications" class="notifications-footer-link">View All Notifications</a>
              </div>
            </div>
          </div>

          <div class="user-profile-wrapper">
            <button type="button" class="user-profile-btn" id="user-profile-btn" title="User Menu">
              <span class="user-avatar user-avatar-fallback material-symbols-outlined">account_circle</span>
              <div class="user-info">
                <span class="user-name" title="${userEmail}">${userEmail}</span>
                <span class="user-role">${userRole}</span>
              </div>
            </button>
             <div id="user-profile-dropdown" class="profile-dropdown-menu">
               ${isAdminOrSuperAdmin ? '' : `
                 <div class="profile-menu-header">Account</div>
                 <div class="mobile-quick-tools">
                   <div class="mobile-tools-header">Quick Tools</div>
                   <div class="mobile-tools-grid">
                     <button type="button" class="mobile-tool-btn" data-target-menu="apps-grid-dropdown" title="Apps Grid"><span class="material-symbols-outlined">grid_view</span><span class="mobile-tool-label">Apps</span></button>
                     <button type="button" class="mobile-tool-btn" data-target-menu="calendar-dropdown" title="Calendar"><span class="material-symbols-outlined">calendar_today</span><span class="mobile-tool-label">Calendar</span></button>
                     <button type="button" class="mobile-tool-btn" data-target-menu="notifications-dropdown" title="Notifications"><span class="material-symbols-outlined">notifications</span><span class="mobile-tool-label">Alerts</span></button>
                     <button type="button" class="mobile-tool-btn" data-action="theme" title="Toggle Theme"><span class="material-symbols-outlined">dark_mode</span><span class="mobile-tool-label">Theme</span></button>
                     <button type="button" class="mobile-tool-btn" data-action="fullscreen" title="Fullscreen"><span class="material-symbols-outlined">fullscreen</span><span class="mobile-tool-label">Full</span></button>
                   </div>
                 </div>
                 ${profileItem('account_circle', 'Profile', '/BcpIdentity/Workspace/Profile')}
                 ${profileItem('shield_lock', 'Security', '/BcpIdentity/Workspace/Security')}
                 ${profileItem('devices', 'Active Sessions', '/BcpIdentity/Workspace/ActiveSessions')}
                <div class="profile-menu-divider"></div>
                
               `}
               ${profileItem('logout', 'Logout', '/BcpIdentity/Authenticate/Logout')}
             </div>
          </div>
        </div>
      `;
    }

    if (mainEl && topbarEl && !document.getElementById('mobile-search-bar')) {
      topbarEl.insertAdjacentHTML('afterend', `
        <div id="mobile-search-bar" class="mobile-search-bar">
          <div class="mobile-search-inner">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="Search..." aria-label="Mobile Search">
          </div>
        </div>
      `);
    } else {
      const mobileSearchBar = document.getElementById('mobile-search-bar');
      if (mobileSearchBar) {
        mobileSearchBar.innerHTML = `
          <div class="mobile-search-inner">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="Search..." aria-label="Mobile Search">
          </div>
        `;
      }
    }

    function subItem(title, url, icon, extra = '') {
      return `
        <li>
          <div class="sub-nav-wrapper">
            <a href="${url}" class="sub-nav-item">
              <div class="sub-nav-content">
                <span class="dash">-</span>
                <span>${title}</span>
                ${extra}
              </div>
            </a>
            <button type="button" class="pin-btn" data-title="${title}" data-url="${url}" data-icon="${icon}" title="Pin Task">
              <span class="material-symbols-outlined">push_pin</span>
            </button>
          </div>
        </li>
      `;
    }

    function linkedSubItem(title, url) {
      return `<li><a href="${url}" class="sub-nav-item"><span class="sub-nav-content"><span class="material-symbols-outlined sub-nav-bullet" style="font-size: 8px;">circle</span>${title}</span></a></li>`;
    }

    function simpleSubItem(title, url) {
      return `<li><a href="${url}" class="sub-nav-item"><span class="sub-nav-content"><span class="dash">-</span>${title}</span></a></li>`;
    }

    function navGroup(icon, label, pinTitle, pinUrl, pinIcon, items) {
      return `
        <div class="nav-item has-sub">
          <a class="nav-link" href="javascript:void(0)">
            <div class="nav-link-content">
              <span class="material-symbols-outlined">${icon}</span>
              <span>${label}</span>
            </div>
            <div class="nav-link-actions">
              <button class="pin-btn" data-title="${pinTitle}" data-url="${pinUrl}" data-icon="${pinIcon}" title="Pin Task">
                <span class="material-symbols-outlined">push_pin</span>
              </button>
              <span class="material-symbols-outlined arrow-icon">chevron_right</span>
            </div>
          </a>
          <ul class="nav-submenu">${items.join('')}</ul>
        </div>
      `;
    }

    function appGridItem(label, icon, url, color) {
      return `
        <a href="${url}" class="app-grid-item">
          <div class="app-grid-icon-box" style="background: ${color}1f; color: ${color};">
            <span class="material-symbols-outlined">${icon}</span>
          </div>
          <span class="app-grid-label">${label}</span>
        </a>
      `;
    }

    function notificationItem(icon, color, title, desc, time) {
      return `
        <a href="javascript:void(0)" class="notification-item">
          <div class="notification-avatar-icon" style="background:${color};">
            <span class="material-symbols-outlined" style="font-size:18px;">${icon}</span>
          </div>
          <div class="notification-body">
            <span class="notification-item-title">${title}</span>
            <span class="notification-item-desc">${desc}</span>
            <span class="notification-item-time">${time}</span>
          </div>
        </a>
      `;
    }

    function profileItem(icon, label, url = 'javascript:void(0)') {
      return `
        <a href="${url}" class="profile-menu-item">
          <div class="profile-menu-item-content">
            <span class="material-symbols-outlined">${icon}</span>
            <span>${label}</span>
          </div>
        </a>
      `;
    }
  }

  // 0. Product Tour / First-Time Onboarding
  function initProductTour() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('start-product-tour')) return;

    const tourBtn = document.createElement('button');
    tourBtn.type = 'button';
    tourBtn.className = 'topbar-action-btn tour-help-btn';
    tourBtn.id = 'start-product-tour';
    tourBtn.title = 'Start Product Tour';
    tourBtn.setAttribute('aria-label', 'Start Product Tour');
    tourBtn.innerHTML = '<span class="material-symbols-outlined">help_outline</span>';

    const fullscreenBtn = document.getElementById('toggle-fullscreen');
    if (fullscreenBtn) {
      topbarRight.insertBefore(tourBtn, fullscreenBtn);
    } else {
      topbarRight.insertBefore(tourBtn, topbarRight.firstChild);
    }

    const pageName = window.location.pathname || '/BcpConsole/Console/Dashboard';
    const storageKey = `productTourCompleted:${pageName}`;
    let currentStep = 0;
    let activeSteps = [];
    let overlay;
    let highlight;
    let popover;

    function candidate(selector, title, text, placement = 'bottom') {
      return { selector, title, text, placement };
    }

    const fallbackSteps = [
      candidate('#toggle-sidebar', 'Navigation menu', 'Use this button to expand or collapse the sidebar when you need more screen space.', 'bottom'),
      candidate('#sidebar', 'Main menu', 'The sidebar groups dashboards, widgets, forms, tables, and feature areas so users can move around the platform quickly.', 'right'),
      candidate('.topbar-search-box', 'Search', 'Search helps users jump to features, records, reports, settings, and platform modules.', 'bottom'),
      candidate('#pinned-taskbar', 'Pinned tasks', 'Pinned pages appear here for quick access to frequently used tools.', 'bottom'),
      candidate('.console-actions, .bcp-actions', 'Page actions', 'Primary page controls live here, such as date filters, reset layout, add widgets, and exports.', 'bottom'),
      candidate('.console-widget, .bcp-card, .m3-card', 'Widgets', 'Widgets summarize one part of the platform. They should be clickable and lead to the related feature dashboard.', 'right'),
      candidate('.widget-actions, .dismiss-widget, .minimize-widget, .dismiss-btn', 'Widget controls', 'Users can minimize, dismiss, or manage widgets to personalize their dashboard.', 'left'),
      candidate('#add-widgets, .quick-grid, .shortcut-grid', 'Add or launch tools', 'Quick actions and Add widgets let users restore hidden widgets or launch common workflows.', 'left'),
      candidate('.feature-list, .feature-toolbar, .nav-submenu', 'Feature status', 'Feature areas can show active, inactive, locked, trial, or setup-required states.', 'right'),
      candidate('#toggle-theme', 'Theme switch', 'Users can switch between light and dark mode from the top bar.', 'bottom'),
      candidate('.user-profile-wrapper', 'Profile menu', 'Account options, profile actions, and mobile quick tools are grouped here.', 'left')
    ];

    function readPageTourSteps() {
      const script = document.getElementById('bcp-page-tour');
      if (!script) return [];

      try {
        const parsed = JSON.parse(script.textContent || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter(step => step && step.selector && step.title && step.text)
          .map(step => candidate(step.selector, step.title, step.text, step.placement || 'bottom'));
      } catch {
        return [];
      }
    }

    // Feature pages can publish a small JSON tour using #bcp-page-tour.
    // If they do not, the Material Design shell falls back to the general product tour.
    const steps = readPageTourSteps().concat(fallbackSteps);

    function getElement(step) {
      return document.querySelector(step.selector);
    }

    function buildSteps() {
      return steps.filter(step => {
        const element = getElement(step);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function ensureTourNodes() {
      overlay = document.createElement('div');
      overlay.className = 'tour-overlay';

      highlight = document.createElement('div');
      highlight.className = 'tour-highlight';

      popover = document.createElement('div');
      popover.className = 'tour-popover';

      document.body.appendChild(overlay);
      document.body.appendChild(highlight);
      document.body.appendChild(popover);
    }

    function setRect(element) {
      const rect = element.getBoundingClientRect();
      const pad = 6;
      highlight.style.top = `${Math.max(8, rect.top - pad)}px`;
      highlight.style.left = `${Math.max(8, rect.left - pad)}px`;
      highlight.style.width = `${Math.min(window.innerWidth - 16, rect.width + pad * 2)}px`;
      highlight.style.height = `${Math.min(window.innerHeight - 16, rect.height + pad * 2)}px`;
      return rect;
    }

    function placePopover(rect, placement) {
      const gap = 14;
      const popRect = popover.getBoundingClientRect();
      let top = rect.bottom + gap;
      let left = rect.left;

      if (placement === 'right') {
        top = rect.top;
        left = rect.right + gap;
      } else if (placement === 'left') {
        top = rect.top;
        left = rect.left - popRect.width - gap;
      } else if (placement === 'top') {
        top = rect.top - popRect.height - gap;
        left = rect.left;
      }

      if (left + popRect.width > window.innerWidth - 12) left = window.innerWidth - popRect.width - 12;
      if (left < 12) left = 12;
      if (top + popRect.height > window.innerHeight - 12) top = rect.top - popRect.height - gap;
      if (top < 12) top = 12;

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    }

    function endTour(markComplete = false) {
      overlay?.remove();
      highlight?.remove();
      popover?.remove();
      overlay = null;
      highlight = null;
      popover = null;
      if (markComplete) localStorage.setItem(storageKey, 'true');
    }

    function renderStep() {
      const step = activeSteps[currentStep];
      if (!step) {
        endTour(true);
        return;
      }

      const element = getElement(step);
      if (!element) {
        currentStep += 1;
        renderStep();
        return;
      }

      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

      setTimeout(() => {
        const rect = setRect(element);
        const isLast = currentStep === activeSteps.length - 1;
        popover.innerHTML = `
          <div class="tour-progress">Step ${currentStep + 1} of ${activeSteps.length}</div>
          <h3 class="tour-title">${step.title}</h3>
          <p class="tour-text">${step.text}</p>
          <div class="tour-actions">
            <div class="tour-actions-left">
              <button class="tour-btn" type="button" data-tour-action="skip">Skip</button>
            </div>
            <div class="tour-actions-right">
              <button class="tour-btn" type="button" data-tour-action="back"${currentStep === 0 ? ' disabled' : ''}>Back</button>
              <button class="tour-btn primary" type="button" data-tour-action="${isLast ? 'finish' : 'next'}">${isLast ? 'Finish' : 'Next'}</button>
            </div>
          </div>
        `;
        placePopover(rect, step.placement);
      }, 180);
    }

    function startTour(force = false) {
      activeSteps = buildSteps();
      if (!activeSteps.length) return;
      currentStep = 0;
      endTour(false);
      ensureTourNodes();
      renderStep();
      if (force) localStorage.removeItem(storageKey);
    }

    tourBtn.addEventListener('click', () => startTour(true));

    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-tour-action]')?.dataset.tourAction;
      if (!action) return;
      event.preventDefault();

      if (action === 'skip') {
        endTour(true);
      } else if (action === 'back') {
        currentStep = Math.max(0, currentStep - 1);
        renderStep();
      } else if (action === 'next') {
        currentStep += 1;
        renderStep();
      } else if (action === 'finish') {
        endTour(true);
      }
    });

    window.addEventListener('resize', () => {
      if (popover && activeSteps.length) renderStep();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && popover) endTour(true);
    });

    setTimeout(() => {
      if (localStorage.getItem(storageKey) !== 'true') startTour(false);
    }, 800);
  }

  initProductTour();

  // 1. Sidebar Default State & Persistence (Desktop open by default)
  const isMobile = window.innerWidth <= 900;
  const isSidebarClosedStored = localStorage.getItem('sidebarClosed') === 'true';

  if (isMobile) {
    body.classList.add('sidebar-closed');
  } else {
    // Desktop: default to OPEN unless user explicitly minimized it
    if (isSidebarClosedStored) {
      body.classList.add('sidebar-closed');
    } else {
      body.classList.remove('sidebar-closed');
    }
  }

  // Sidebar Toggle Button Click
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      body.classList.toggle('sidebar-closed');
      const closed = body.classList.contains('sidebar-closed');
      if (window.innerWidth > 900) {
        localStorage.setItem('sidebarClosed', closed);
      }
    });
  }

  // Mobile click outside to close sidebar
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && !body.classList.contains('sidebar-closed')) {
      if (sidebar && !sidebar.contains(e.target) && toggleSidebarBtn && !toggleSidebarBtn.contains(e.target)) {
        body.classList.add('sidebar-closed');
      }
    }
  });

  // 2. Dark/Light Theme Toggle
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    if (toggleThemeBtn) {
      const themeIcon = toggleThemeBtn.querySelector('md-icon, .material-symbols-outlined');
      if (themeIcon) themeIcon.textContent = 'light_mode';
    }
  }

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      body.classList.toggle('dark-mode');
      const isDark = body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      const themeIcon = toggleThemeBtn.querySelector('md-icon, .material-symbols-outlined');
      if (themeIcon) themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    });
  }

  // 3. Fullscreen Toggle
  if (toggleFullscreenBtn) {
    toggleFullscreenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }

  // 4. Accordion Menu Interaction
  const navParents = document.querySelectorAll('.nav-item.has-sub');
  navParents.forEach(item => {
    const parentLink = item.querySelector('.nav-link');
    if (parentLink) {
      parentLink.addEventListener('click', (e) => {
        const href = parentLink.getAttribute('href');
        if (!href || href === '#' || href === 'javascript:void(0)' || href.startsWith('javascript:')) {
          e.preventDefault();
        }

        const isOpen = item.classList.contains('open');

        navParents.forEach(other => {
          if (other !== item) other.classList.remove('open');
        });

        if (!isOpen) {
          item.classList.add('open');
        } else {
          item.classList.remove('open');
        }
      });
    }
  });

  // 5. Active Link Highlight & Micro-Bullet Dot Controller
  const currentPath = window.location.pathname || '/BcpConsole/Console/Dashboard';
  const currentHash = window.location.hash;

  function updateActiveSubNavState() {
    const hash = window.location.hash;
    const allSubNavItems = document.querySelectorAll('.sub-nav-item');
    allSubNavItems.forEach(item => item.classList.remove('active'));

    let activeFound = false;

    // Match exact page + hash if hash present
    if (hash) {
      allSubNavItems.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith(hash)) {
          link.classList.add('active');
          activeFound = true;
        }
      });
    }

    // If no hash match, match main page URL without hash
    if (!activeFound) {
      allSubNavItems.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          const targetPage = href.split('#')[0];
          const hasHash = href.includes('#');
          if (!hasHash && (targetPage === currentPath || (currentPath === '' && targetPage === '/BcpConsole/Console/Dashboard'))) {
            link.classList.add('active');
            activeFound = true;
          }
        }
      });
    }

    // Default fallback for BCP console.
    if (!activeFound && (currentPath === '/BcpConsole/Console/Dashboard' || currentPath === '')) {
      const dashboardLink = document.querySelector('.nav-link[href="/BcpConsole/Console/Dashboard"]') || document.querySelector('.sub-nav-item[href="/BcpConsole/Console/Dashboard"]');
      if (dashboardLink) dashboardLink.classList.add('active');
    }

    // Ensure parent accordion is expanded for active item
    const activeItem = document.querySelector('.sub-nav-item.active');
    if (activeItem) {
      const parentSubmenu = activeItem.closest('.nav-item.has-sub');
      if (parentSubmenu) {
        parentSubmenu.classList.add('open');
      }
    }

    // Update bullet icons: solid dot (fiber_manual_record) for active, hollow dot (circle) for inactive
    allSubNavItems.forEach(link => {
      const content = link.querySelector('.sub-nav-content');
      const dash = link.querySelector('.dash');
      if (dash) dash.remove();

      let bullet = link.querySelector('.sub-nav-bullet');
      if (!bullet && content) {
        bullet = document.createElement('span');
        bullet.className = 'material-symbols-outlined sub-nav-bullet';
        bullet.style.fontSize = '8px';
        content.insertBefore(bullet, content.firstChild);
      }

      if (bullet) {
        if (link.classList.contains('active')) {
          bullet.textContent = 'fiber_manual_record';
        } else {
          bullet.textContent = 'circle';
        }
      }
    });
  }

  // Same page smooth scroll + active state switch on click
  const allNavLinks = document.querySelectorAll('.nav-link, .sub-nav-item');
  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      const targetPage = href.split('#')[0];
      if (targetPage === currentPath || (currentPath === '' && targetPage === '/BcpConsole/Console/Dashboard') || targetPage === '') {
        if (href.includes('#')) {
          link.addEventListener('click', (e) => {
            const hash = href.split('#')[1];
            const targetEl = document.getElementById(hash);
            if (targetEl) {
              e.preventDefault();
              history.pushState(null, null, `#${hash}`);
              targetEl.scrollIntoView({ behavior: 'smooth' });
              updateActiveSubNavState();
            }
          });
        }
      }
    }
  });

  // Initial active state calculation
  updateActiveSubNavState();
  window.addEventListener('hashchange', updateActiveSubNavState);

  // 6. Dismissable Cards Logic
  const dismissBtns = document.querySelectorAll('.dismiss-btn');
  dismissBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = e.target.closest('.m3-card');
      if (card) {
        card.classList.add('dismissed');
        setTimeout(() => {
          card.style.display = 'none';
        }, 300);
      }
    });
  });

  // ==========================================
  // 7. PINNED NAVIGATION & TASKBAR SYSTEM
  // ==========================================
  const defaultPins = [
    { title: "Console", url: "/BcpConsole/Console/Dashboard", icon: "space_dashboard" },
    { title: "Users", url: "/BcpIdentity/Console/Users", icon: "groups" },
    { title: "Permissions", url: "/BcpIdentity/Console/Permissions", icon: "verified_user" }
  ];

  let rawPinned = JSON.parse(localStorage.getItem('pinnedTasks')) || defaultPins;
  let pinnedTasks = rawPinned.map(t => ({
    ...t,
    title: (t.title || '').replace(/^circle/i, '').replace(/^fiber_manual_record/i, '').trim()
  }));

  function savePinnedTasks() {
    localStorage.setItem('pinnedTasks', JSON.stringify(pinnedTasks));
    renderPinnedTaskbar();
    updatePinIconsState();
  }

  function isTaskPinned(url, title) {
    const cleanTitle = (title || '').replace(/^circle/i, '').replace(/^fiber_manual_record/i, '').trim();
    return pinnedTasks.some(t => t.title.toLowerCase() === cleanTitle.toLowerCase() || (url && url !== '#' && !url.startsWith('javascript:') && t.url === url));
  }

  function togglePinTask(title, url, icon = 'push_pin') {
    const cleanTitle = (title || '').replace(/^circle/i, '').replace(/^fiber_manual_record/i, '').trim();
    const existingIndex = pinnedTasks.findIndex(t => t.title.toLowerCase() === cleanTitle.toLowerCase());
    if (existingIndex > -1) {
      pinnedTasks.splice(existingIndex, 1);
    } else {
      pinnedTasks.push({
        title: cleanTitle,
        url: (url && url !== '#' && !url.startsWith('javascript:')) ? url : '/BcpConsole/Console/Dashboard',
        icon: icon || 'push_pin'
      });
    }
    savePinnedTasks();
  }

  function hydrateSidebarPinButtons() {
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    // A. Submenu items (.sub-nav-item, .submenu-link)
    const subNavItems = sidebarEl.querySelectorAll('.sub-nav-item, .submenu-link');
    subNavItems.forEach(link => {
      const parentContainer = link.closest('li') || link.parentNode;
      if (parentContainer && !parentContainer.querySelector('.pin-btn')) {
        const url = link.getAttribute('href');
        if (!url || url === '#' || url.startsWith('javascript:')) return;

        const clone = link.cloneNode(true);
        clone.querySelectorAll('.material-symbols-outlined, .dash, .sub-nav-bullet, .pin-btn, .badge-pill').forEach(el => el.remove());
        const title = clone.textContent.replace(/^-/, '').trim();
        if (!title) return;

        const parentNavGroup = link.closest('.nav-item.has-sub, .nav-item.has-submenu');
        let icon = 'push_pin';
        if (parentNavGroup) {
          const iconEl = parentNavGroup.querySelector('.nav-link-content .material-symbols-outlined');
          if (iconEl) icon = iconEl.textContent.trim();
        }

        let wrapper = link.closest('.sub-nav-wrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.className = 'sub-nav-wrapper';
          link.parentNode.insertBefore(wrapper, link);
          wrapper.appendChild(link);
        }

        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.className = 'pin-btn';
        pinBtn.dataset.title = title;
        pinBtn.dataset.url = url;
        pinBtn.dataset.icon = icon;
        pinBtn.title = 'Pin Task';
        pinBtn.innerHTML = '<span class="material-symbols-outlined">push_pin</span>';
        wrapper.appendChild(pinBtn);
      }
    });

    // B. Direct top-level links (.nav-link)
    const navLinks = sidebarEl.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const url = link.getAttribute('href');
      if (!url || url === '#' || url.startsWith('javascript:')) return;

      const navItem = link.closest('.nav-item') || link.parentNode;
      if (navItem && !navItem.classList.contains('has-sub') && !navItem.classList.contains('has-submenu')) {
        if (!link.querySelector('.pin-btn') && !navItem.querySelector('.pin-btn')) {
          const clone = link.cloneNode(true);
          clone.querySelectorAll('.material-symbols-outlined, .dash, .sub-nav-bullet, .pin-btn, .badge-pill').forEach(el => el.remove());
          const title = clone.textContent.trim();
          if (!title) return;

          const iconEl = link.querySelector('.nav-link-content .material-symbols-outlined');
          const icon = iconEl ? iconEl.textContent.trim() : 'space_dashboard';

          const pinBtn = document.createElement('button');
          pinBtn.type = 'button';
          pinBtn.className = 'pin-btn';
          pinBtn.dataset.title = title;
          pinBtn.dataset.url = url;
          pinBtn.dataset.icon = icon;
          pinBtn.title = 'Pin Task';
          pinBtn.innerHTML = '<span class="material-symbols-outlined">push_pin</span>';
          link.appendChild(pinBtn);
        }
      }
    });
  }

  function updatePinIconsState() {
    hydrateSidebarPinButtons();
    const pinBtns = document.querySelectorAll('.pin-btn');
    pinBtns.forEach(btn => {
      const title = btn.dataset.title;
      const url = btn.dataset.url;
      if (title && isTaskPinned(url, title)) {
        btn.classList.add('pinned');
        const iconEl = btn.querySelector('.material-symbols-outlined');
        if (iconEl) iconEl.textContent = 'keep';
      } else {
        btn.classList.remove('pinned');
        const iconEl = btn.querySelector('.material-symbols-outlined');
        if (iconEl) iconEl.textContent = 'push_pin';
      }
    });
  }

  function renderPinnedTaskbar() {
    const pinnedSidebarContainer = document.getElementById('pinned-sidebar-section');
    const taskbarContainer = document.getElementById('pinned-taskbar');
    const dropdownList = document.getElementById('pinned-menu-list');
    const countBadge = document.getElementById('pinned-count');

    if (countBadge) {
      countBadge.textContent = pinnedTasks.length;
      countBadge.style.display = pinnedTasks.length > 0 ? 'flex' : 'none';
    }

    // A. Render Top Sidebar "Pin Navigation" Section (Only shows if at least 1 item is pinned)
    if (pinnedSidebarContainer) {
      pinnedSidebarContainer.innerHTML = '';
      if (pinnedTasks.length > 0) {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'menu-title';
        sectionHeader.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;';
        sectionHeader.innerHTML = `
          <span>Pin Navigation</span>
          <span class="badge-pill" style="background:var(--sidebar-active-color); font-size:9px;">${pinnedTasks.length}</span>
        `;

        const listUl = document.createElement('ul');
        listUl.className = 'pinned-sidebar-list';
        listUl.style.cssText = 'padding:0; margin:0 0 12px 0; list-style:none;';

        pinnedTasks.forEach(task => {
          const li = document.createElement('li');
          const isActive = task.url === currentPath;
          li.innerHTML = `
            <div class="sub-nav-wrapper">
              <a href="${task.url}" class="sub-nav-item ${isActive ? 'active' : ''}">
                <div class="sub-nav-content">
                  <span class="material-symbols-outlined" style="font-size:16px; color:var(--sidebar-active-color);">${task.icon || 'push_pin'}</span>
                  <span>${task.title}</span>
                </div>
              </a>
              <button type="button" class="pin-btn pinned" data-title="${task.title}" data-url="${task.url}" data-icon="${task.icon || 'push_pin'}" title="Unpin Task">
                <span class="material-symbols-outlined">keep</span>
              </button>
            </div>
          `;

          listUl.appendChild(li);
        });

        pinnedSidebarContainer.appendChild(sectionHeader);
        pinnedSidebarContainer.appendChild(listUl);
      }
    }

    // B. Render Header Taskbar Chips
    if (taskbarContainer) {
      taskbarContainer.innerHTML = '';
      if (pinnedTasks.length > 0) {
        pinnedTasks.forEach(task => {
          const chip = document.createElement('a');
          chip.className = 'pinned-chip';
          chip.href = task.url;
          chip.innerHTML = `
            <span class="material-symbols-outlined">${task.icon || 'push_pin'}</span>
            <span>${task.title}</span>
            <span class="unpin-chip-btn material-symbols-outlined" title="Unpin Task">close</span>
          `;

          const unpinBtn = chip.querySelector('.unpin-chip-btn');
          unpinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePinTask(task.title, task.url, task.icon);
          });

          taskbarContainer.appendChild(chip);
        });
      }
    }

    // C. Render Dropdown Menu Items
    if (dropdownList) {
      dropdownList.innerHTML = '';
      if (pinnedTasks.length === 0) {
        dropdownList.innerHTML = '<div class="pinned-menu-empty">No pinned tasks yet. Hover sidebar items to pin.</div>';
      } else {
        pinnedTasks.forEach(task => {
          const item = document.createElement('div');
          item.className = 'pinned-menu-item';
          item.innerHTML = `
            <a href="${task.url}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:8px;">
              <span class="material-symbols-outlined" style="font-size:16px; color:var(--sidebar-active-color);">${task.icon || 'push_pin'}</span>
              <span>${task.title}</span>
            </a>
            <button type="button" class="pinned-action-btn" title="Unpin">
              <span class="material-symbols-outlined" style="font-size:16px;">close</span>
            </button>
          `;

          const removeBtn = item.querySelector('button');
          removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePinTask(task.title, task.url, task.icon);
          });

          dropdownList.appendChild(item);
        });
      }
    }
  }

  // Global Delegated Click Listener for all .pin-btn elements (handles both static and dynamic elements without link bubble navigation)
  document.addEventListener('click', (e) => {
    const pinBtn = e.target.closest('.pin-btn');
    if (pinBtn) {
      e.preventDefault();
      e.stopPropagation();
      const title = pinBtn.dataset.title;
      const url = pinBtn.dataset.url;
      const icon = pinBtn.dataset.icon || 'push_pin';
      if (title) {
        togglePinTask(title, url, icon);
      }
    }
  });

  // ==========================================
  // TOPBAR DROPDOWN MENUS CONTROLLER
  // ==========================================
  const dropdownPairs = [
    { btnId: 'apps-grid-btn', menuId: 'apps-grid-dropdown' },
    { btnId: 'calendar-btn', menuId: 'calendar-dropdown' },
    { btnId: 'notifications-btn', menuId: 'notifications-dropdown' },
    { btnId: 'pinned-tasks-btn', menuId: 'pinned-menu-dropdown' },
    { btnId: 'user-profile-btn', menuId: 'user-profile-dropdown' }
  ];

  function closeAllTopbarDropdowns() {
    dropdownPairs.forEach(pair => {
      const menu = document.getElementById(pair.menuId);
      if (menu) menu.classList.remove('show');
    });
  }

  dropdownPairs.forEach(pair => {
    const btn = document.getElementById(pair.btnId);
    const menu = document.getElementById(pair.menuId);

    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = menu.classList.contains('show');
        closeAllTopbarDropdowns();
        if (!isOpen) {
          menu.classList.add('show');
        }
      });
    }
  });

  document.addEventListener('click', (e) => {
    let isClickInsideAny = false;
    dropdownPairs.forEach(pair => {
      const btn = document.getElementById(pair.btnId);
      const menu = document.getElementById(pair.menuId);
      if ((btn && btn.contains(e.target)) || (menu && menu.contains(e.target))) {
        isClickInsideAny = true;
      }
    });

    if (!isClickInsideAny) {
      closeAllTopbarDropdowns();
    }
  });

  // Mobile Search Bar Toggle
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const mobileSearchBar = document.getElementById('mobile-search-bar');

  if (mobileSearchBtn && mobileSearchBar) {
    mobileSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      mobileSearchBar.classList.toggle('show');
      if (mobileSearchBar.classList.contains('show')) {
        const input = mobileSearchBar.querySelector('input');
        if (input) input.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (mobileSearchBar && !mobileSearchBar.contains(e.target) && !mobileSearchBtn.contains(e.target)) {
        mobileSearchBar.classList.remove('show');
      }
    });
  }

  // Mobile Quick Tools click handlers inside User Profile Dropdown
  const mobileToolBtnList = document.querySelectorAll('.mobile-tool-btn');
  mobileToolBtnList.forEach(toolBtn => {
    toolBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetMenuId = toolBtn.dataset.targetMenu;
      const targetAction = toolBtn.dataset.action;

      closeAllTopbarDropdowns();

      if (targetMenuId) {
        const targetMenu = document.getElementById(targetMenuId);
        if (targetMenu) targetMenu.classList.add('show');
      } else if (targetAction === 'theme' && toggleThemeBtn) {
        toggleThemeBtn.click();
      } else if (targetAction === 'fullscreen' && toggleFullscreenBtn) {
        toggleFullscreenBtn.click();
      }
    });
  });

  // Pin Current Page Button in Pinned Dropdown
  const pinCurrentBtn = document.getElementById('pin-current-page-btn');
  if (pinCurrentBtn) {
    pinCurrentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pageTitle = document.title.replace('Ozikol BCP - ', '').replace('Ozikol BCP', 'Dashboard');
      const pageUrl = window.location.pathname || '/BcpConsole/Console/Dashboard';
      togglePinTask(pageTitle, pageUrl, 'web');
    });
  }

  // Initialize Pinned Tasks UI
  renderPinnedTaskbar();
  updatePinIconsState();

  // ── Live Notification Bell ─────────────────────────────────────────
  const notifBadge = document.getElementById('notif-badge');
  const notifHeaderBadge = document.getElementById('notif-header-badge');
  const notifList = document.getElementById('notif-list');
  const notifClearBtn = document.getElementById('notif-clear-all-btn');

  const categoryColors = {
    Security: '#f06548',
    Account: '#0050e5',
    UserManagement: '#0ab39c',
    Performance: '#e67e22',
    System: '#8b5cf6',
    Finance: '#0050e5',
    Communication: '#299cdb',
    General: '#878a99'
  };

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications?take=15');
      if (!res.ok) return;
      const data = await res.json();

      // Update badge
      if (data.unreadCount > 0) {
        if (notifBadge) { notifBadge.textContent = data.unreadCount; notifBadge.style.display = ''; }
        if (notifHeaderBadge) notifHeaderBadge.textContent = data.unreadCount + ' New';
      } else {
        if (notifBadge) notifBadge.style.display = 'none';
        if (notifHeaderBadge) notifHeaderBadge.textContent = '';
      }

      // Render items
      if (notifList) {
        if (data.notifications.length === 0) {
          notifList.innerHTML = '<div style="text-align:center; padding:24px; color:var(--sidebar-color);"><span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px; opacity:0.4;">notifications_off</span>No notifications</div>';
        } else {
          notifList.innerHTML = data.notifications.map(n => {
            const color = categoryColors[n.category] || '#878a99';
            const unreadStyle = n.isRead ? '' : 'background:var(--md-sys-color-primary-container, rgba(0,80,229,0.06));';
            const href = n.actionUrl ? n.actionUrl : 'javascript:void(0)';
            return `
              <a href="${href}" class="notification-item" data-notif-id="${n.id}" style="${unreadStyle}">
                <div class="notification-avatar-icon" style="background:${color};">
                  <span class="material-symbols-outlined" style="font-size:18px;">${n.icon || 'notifications'}</span>
                </div>
                <div class="notification-body">
                  <span class="notification-item-title">${n.title}</span>
                  <span class="notification-item-desc">${n.message}</span>
                  <span class="notification-item-time">${n.timeAgo}</span>
                </div>
              </a>`;
          }).join('');

          // Mark individual as read on click
          notifList.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async function () {
              const id = this.dataset.notifId;
              if (id) {
                await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
                this.style.background = '';
                loadNotifications();
              }
            });
          });
        }
      }
    } catch (e) {
      // Silently fail — notifications are not critical
    }
  }

  // Clear all event delegation (guarantees click handler works regardless of dynamic DOM injection timing)
  document.addEventListener('click', async function (e) {
    const clearBtn = e.target.closest('#notif-clear-all-btn');
    if (clearBtn) {
      e.preventDefault();
      e.stopPropagation();
      try {
        await fetch('/api/notifications/read-all', { method: 'POST' });
      } catch (err) { }
      loadNotifications();
    }
  });

  // Load on page load + refresh when dropdown opens
  loadNotifications();
  const notifBtn = document.getElementById('notifications-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', function () {
      loadNotifications();
    });
  }
});
