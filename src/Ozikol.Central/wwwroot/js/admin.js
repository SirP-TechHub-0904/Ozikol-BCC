/**
 * Ozikol Central Administration & Management Suite JS
 * Core interactivity: sidebar drawer, theme toggle, search, alerts, dropdowns
 */

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
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
 * Highlight active sidebar link based on current path
 */
function initActiveNavLinks() {
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const normalizedHref = href.toLowerCase();

        // Exact match or prefix match for CRUD child pages
        if (currentPath === normalizedHref || (normalizedHref !== '/admin' && normalizedHref !== '/admin/dashboard' && currentPath.startsWith(normalizedHref))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Dark / Light theme toggle with local storage persistence
 */
function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const storedTheme = localStorage.getItem('oz_admin_theme') || 'dark';

    if (storedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            
            if (next === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }

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
 * Copy to clipboard button helper: elements with [data-copy-target]
 */
function initClipboardButtons() {
    const copyBtns = document.querySelectorAll('[data-copy-target]');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.getAttribute('data-copy-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const textToCopy = input.value || input.innerText;
            try {
                await navigator.clipboard.writeText(textToCopy);
                const originalText = btn.innerHTML;
                btn.innerHTML = '✓ Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        });
    });
}
