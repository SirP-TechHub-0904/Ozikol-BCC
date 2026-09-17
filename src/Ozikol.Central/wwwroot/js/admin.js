/**
 * Ozikol Central Administration & Management Suite JS
 * Core interactivity: sidebar drawer, collapse rail, dropdown accordions, theme toggle, search, alerts
 */

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initSidebarCollapse();
    initDropdownMenus();
    initTheme();
    initUserDropdown();
    initActiveNavLinks();
    initDismissibleAlerts();
    initGlobalSearchShortcut();
    initClipboardButtons();
});

/**
 * Mobile sidebar drawer & overlay toggling
 */
function initSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.add('is-open');
        if (overlay) overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('is-open');
        if (overlay) overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
}

/**
 * Desktop sidebar collapse rail (icon-only mode) with localStorage persistence
 */
function initSidebarCollapse() {
    const sidebar = document.getElementById('adminSidebar');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const wrapper = document.getElementById('adminContentWrapper');
    const STORAGE_KEY = 'ozikol_sidebar_collapsed';

    if (!sidebar || !collapseBtn) return;

    // Restore saved state
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
        sidebar.classList.add('is-collapsed');
        if (wrapper) wrapper.style.marginLeft = 'var(--sidebar-rail-width)';
    }

    collapseBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('is-collapsed');
        if (wrapper) {
            wrapper.style.marginLeft = isCollapsed
                ? 'var(--sidebar-rail-width)'
                : 'var(--sidebar-width)';
        }
        localStorage.setItem(STORAGE_KEY, isCollapsed ? 'true' : 'false');
    });
}

/**
 * Sidebar Submenu Accordion Dropdowns
 */
function initDropdownMenus() {
    const dropdowns = document.querySelectorAll('.nav-item-dropdown');

    dropdowns.forEach(dropdown => {
        const toggleBtn = dropdown.querySelector('.nav-dropdown-toggle');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isExpanded = dropdown.classList.toggle('is-expanded');
            toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        });
    });
}

/**
 * User avatar dropdown toggle
 */
function initUserDropdown() {
    const userBadge = document.getElementById('userBadgeBtn');
    const userContainer = document.querySelector('.topbar-user');

    if (!userBadge || !userContainer) return;

    userBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        userContainer.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
        if (!userContainer.contains(e.target)) {
            userContainer.classList.remove('is-open');
        }
    });
}

/**
 * Highlight active sidebar link based on current path (longest matching prefix)
 * and auto-expand parent dropdown accordion
 */
function initActiveNavLinks() {
    const currentPath = window.location.pathname.toLowerCase();

    // Collect all navigatable links
    const allLinks = Array.from(document.querySelectorAll('.sidebar-nav .nav-link:not(.nav-dropdown-toggle), .nav-submenu .nav-sublink'));

    // Clear all previous active states
    allLinks.forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.nav-dropdown-toggle').forEach(t => {
        t.classList.remove('child-active');
    });

    // Find the single best matching link (prefer exact match, otherwise longest matching path segment)
    let bestMatch = null;
    let maxMatchLength = -1;

    allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const normalizedHref = href.toLowerCase().split('?')[0].split('#')[0];

        if (normalizedHref === '/centralwks' || normalizedHref === '') return;

        if (currentPath === normalizedHref) {
            // Exact match gets highest priority
            bestMatch = link;
            maxMatchLength = 999999;
        } else if (maxMatchLength < 999999 && (currentPath.startsWith(normalizedHref + '/') || currentPath.startsWith(normalizedHref + '?'))) {
            if (normalizedHref.length > maxMatchLength) {
                bestMatch = link;
                maxMatchLength = normalizedHref.length;
            }
        }
    });

    if (bestMatch) {
        bestMatch.classList.add('active');

        // If it's a submenu link, expand parent dropdown and highlight parent toggle
        const parentDropdown = bestMatch.closest('.nav-item-dropdown');
        if (parentDropdown) {
            parentDropdown.classList.add('is-expanded');
            const toggle = parentDropdown.querySelector('.nav-dropdown-toggle');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'true');
                toggle.classList.add('child-active');
            }
        }
    }
}

/**
 * Dark / Light theme toggle with local storage persistence
 */
function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const storedTheme = localStorage.getItem('oz_admin_theme') || 'light';

    // Apply stored theme
    if (storedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    if (themeIcon) themeIcon.textContent = storedTheme === 'light' ? 'dark_mode' : 'light_mode';

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';

            if (next === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }

            if (themeIcon) themeIcon.textContent = next === 'light' ? 'dark_mode' : 'light_mode';
            localStorage.setItem('oz_admin_theme', next);
        });
    }
}

/**
 * Auto-dismissing alerts with manual close support
 */
function initDismissibleAlerts() {
    const alerts = document.querySelectorAll('.admin-alert');
    alerts.forEach(alert => {
        const closeBtn = alert.querySelector('.admin-alert-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alert.style.opacity = '0';
                alert.style.transform = 'translateY(-6px)';
                alert.style.transition = 'all 0.2s ease';
                setTimeout(() => alert.remove(), 200);
            });
        }

        // Auto close success alerts after 6 seconds
        if (alert.classList.contains('admin-alert-success')) {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateY(-6px)';
                    alert.style.transition = 'all 0.2s ease';
                    setTimeout(() => alert.remove(), 200);
                }
            }, 6000);
        }
    });
}

/**
 * Quick shortcut to search: press '/' to focus table search or topbar search
 */
function initGlobalSearchShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            const tableSearch = document.querySelector('.table-search-box input');
            const topbarSearch = document.querySelector('.topbar-search input');
            if (tableSearch) {
                tableSearch.focus();
            } else if (topbarSearch) {
                topbarSearch.focus();
            }
        }
    });
}

/**
 * Copy to clipboard button helper: elements with [data-copy-text] or [data-copy-target]
 */
function initClipboardButtons() {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-copy-text], [data-copy-target]');
        if (!btn) return;

        let textToCopy = btn.getAttribute('data-copy-text');
        if (!textToCopy) {
            const targetId = btn.getAttribute('data-copy-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                textToCopy = targetEl.value || targetEl.innerText;
            }
        }

        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy.trim());
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                const originalIcon = icon.textContent;
                icon.textContent = 'check';
                icon.style.color = 'var(--admin-success)';
                setTimeout(() => {
                    icon.textContent = originalIcon;
                    icon.style.color = '';
                }, 1500);
            }
        } catch (err) {
            console.error('Failed to copy text', err);
        }
    });
}
