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
    initNotificationDropdown();
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
        // Close notification dropdown if open
        const notifMenu = document.getElementById('notificationsDropdownMenu');
        if (notifMenu) notifMenu.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
        if (!userContainer.contains(e.target)) {
            userContainer.classList.remove('is-open');
        }
    });
}

/**
 * Topbar Notification Popover toggle
 */
function initNotificationDropdown() {
    const notifBtn = document.getElementById('notificationsDropdownBtn');
    const notifMenu = document.getElementById('notificationsDropdownMenu');

    if (!notifBtn || !notifMenu) return;

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifMenu.style.display === 'block';
        notifMenu.style.display = isOpen ? 'none' : 'block';
        notifBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

        // Close user dropdown if open
        const userContainer = document.querySelector('.topbar-user');
        if (userContainer) userContainer.classList.remove('is-open');
    });

    document.addEventListener('click', (e) => {
        if (!notifMenu.contains(e.target) && !notifBtn.contains(e.target)) {
            notifMenu.style.display = 'none';
            notifBtn.setAttribute('aria-expanded', 'false');
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
            if (window.ozToast) {
                window.ozToast('Copied to clipboard!', 'success', 2500);
            }
        } catch (err) {
            console.error('Failed to copy text', err);
        }
    });
}

/**
 * Global Professional Confirmation Dialogs & Floating Toast Engine
 */
function initProfessionalModals() {
    const backdrop = document.getElementById('ozConfirmModalBackdrop');
    const titleEl = document.getElementById('ozConfirmModalTitle');
    const msgEl = document.getElementById('ozConfirmModalMessage');
    const iconContainer = document.getElementById('ozConfirmModalIconContainer');
    const iconEl = document.getElementById('ozConfirmModalIcon');
    const proceedBtn = document.getElementById('ozConfirmModalProceedBtn');
    const cancelBtn = document.getElementById('ozConfirmModalCancelBtn');
    const toastContainer = document.getElementById('ozToastContainer');

    let currentResolve = null;

    function closeModal(result) {
        if (!backdrop) return;
        backdrop.classList.remove('is-active');
        setTimeout(() => {
            backdrop.style.display = 'none';
        }, 200);

        if (currentResolve) {
            currentResolve(result);
            currentResolve = null;
        }
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal(false));
    }

    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => closeModal(true));
    }

    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal(false);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop && backdrop.classList.contains('is-active')) {
            closeModal(false);
        }
    });

    /**
     * Show professional confirmation modal dialog
     */
    window.ozConfirm = function(options) {
        return new Promise((resolve) => {
            currentResolve = resolve;

            let config = {
                title: 'Confirm Action',
                message: 'Are you sure you want to proceed?',
                type: 'danger',
                icon: 'delete_forever',
                confirmText: 'Proceed',
                cancelText: 'Cancel'
            };

            if (typeof options === 'string') {
                config.message = options;
            } else if (typeof options === 'object' && options !== null) {
                config = Object.assign(config, options);
            }

            // Smart heuristics for icon & colors based on intent
            const lowerMsg = (config.message + ' ' + (config.title || '')).toLowerCase();
            if (lowerMsg.includes('delete') || lowerMsg.includes('drop') || lowerMsg.includes('purge') || lowerMsg.includes('destroy') || lowerMsg.includes('reject') || lowerMsg.includes('critical')) {
                config.type = 'danger';
                config.icon = 'delete_forever';
                config.title = config.title === 'Confirm Action' ? 'Confirm Deletion' : config.title;
                config.confirmText = config.confirmText === 'Proceed' ? 'Delete Permanently' : config.confirmText;
            } else if (lowerMsg.includes('suspend') || lowerMsg.includes('deactivate') || lowerMsg.includes('revoke')) {
                config.type = 'warning';
                config.icon = 'warning';
                config.title = config.title === 'Confirm Action' ? 'Confirm Suspension' : config.title;
                config.confirmText = config.confirmText === 'Proceed' ? 'Confirm Action' : config.confirmText;
            } else if (lowerMsg.includes('reactivate') || lowerMsg.includes('activate') || lowerMsg.includes('approve') || lowerMsg.includes('apply') || lowerMsg.includes('migration')) {
                config.type = 'info';
                config.icon = 'task_alt';
                config.title = config.title === 'Confirm Action' ? 'Confirm Execution' : config.title;
                config.confirmText = config.confirmText === 'Proceed' ? 'Apply Now' : config.confirmText;
            }

            if (titleEl) titleEl.textContent = config.title;
            if (msgEl) msgEl.textContent = config.message;
            if (iconEl) iconEl.textContent = config.icon;

            if (iconContainer) {
                iconContainer.className = 'oz-modal-icon-badge ' + config.type;
            }

            if (proceedBtn) {
                proceedBtn.textContent = config.confirmText;
                proceedBtn.className = 'oz-modal-btn ' + (config.type === 'danger' ? 'oz-modal-btn-danger' : (config.type === 'warning' ? 'oz-modal-btn-warning' : 'oz-modal-btn-primary'));
            }

            if (cancelBtn) {
                cancelBtn.textContent = config.cancelText;
            }

            if (backdrop) {
                backdrop.style.display = 'flex';
                // Trigger reflow for animation
                backdrop.offsetHeight;
                backdrop.classList.add('is-active');
                if (proceedBtn) proceedBtn.focus();
            }
        });
    };

    /**
     * Show professional floating toast notification
     */
    window.ozToast = function(message, type = 'info', duration = 3200) {
        if (!toastContainer) return;

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = `oz-toast ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined oz-toast-icon">${icons[type] || 'info'}</span>
            <div class="oz-toast-message">${escapeToastHtml(message)}</div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('is-hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    };

    /**
     * Alias for alert to prevent ugly browser modal dialogs
     */
    window.ozAlert = function(message, type = 'info') {
        const lower = String(message || '').toLowerCase();
        let derivedType = type;
        if (lower.includes('error') || lower.includes('failed') || lower.includes('invalid')) {
            derivedType = 'error';
        } else if (lower.includes('success') || lower.includes('copied')) {
            derivedType = 'success';
        } else if (lower.includes('warning') || lower.includes('caution')) {
            derivedType = 'warning';
        }
        window.ozToast(message, derivedType);
    };

    // Override native window.alert to seamlessly display professional toast
    window.alert = function(msg) {
        window.ozAlert(msg);
    };

    function escapeToastHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * Global Interceptor for forms & buttons using inline confirm(...) or data-confirm
     */
    document.addEventListener('click', async (e) => {
        const target = e.target.closest('button, a, input[type="submit"]');
        if (!target) return;

        // Check for data-confirm or inline onclick containing confirm(
        const dataConfirm = target.getAttribute('data-confirm');
        const onclickAttr = target.getAttribute('onclick');

        if (dataConfirm) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const confirmed = await window.ozConfirm({
                message: dataConfirm,
                title: target.getAttribute('data-confirm-title') || 'Confirm Action',
                confirmText: target.getAttribute('data-confirm-btn') || 'Proceed'
            });

            if (confirmed) {
                if (target.tagName === 'A' && target.href) {
                    window.location.href = target.href;
                } else if (target.form) {
                    target.form.submit();
                }
            }
        } else if (onclickAttr && onclickAttr.includes('confirm(')) {
            // Extract the prompt string inside confirm('...')
            const match = onclickAttr.match(/confirm\(\s*(['"])(.*?)\1\s*\)/);
            if (match && match[2]) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const promptText = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
                const confirmed = await window.ozConfirm(promptText);

                if (confirmed) {
                    if (target.form) {
                        target.form.submit();
                    } else if (target.tagName === 'A' && target.href) {
                        window.location.href = target.href;
                    }
                }
            }
        }
    }, true);

    document.addEventListener('submit', async (e) => {
        const form = e.target;
        const onsubmitAttr = form.getAttribute('onsubmit');
        const dataConfirm = form.getAttribute('data-confirm');

        if (form.__ozBypassed) {
            delete form.__ozBypassed;
            return;
        }

        if (dataConfirm) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const confirmed = await window.ozConfirm({
                message: dataConfirm,
                title: form.getAttribute('data-confirm-title') || 'Confirm Action',
                confirmText: form.getAttribute('data-confirm-btn') || 'Proceed'
            });

            if (confirmed) {
                form.__ozBypassed = true;
                form.submit();
            }
        } else if (onsubmitAttr && onsubmitAttr.includes('confirm(')) {
            const match = onsubmitAttr.match(/confirm\(\s*(['"])(.*?)\1\s*\)/);
            if (match && match[2]) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const promptText = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
                const confirmed = await window.ozConfirm(promptText);

                if (confirmed) {
                    form.__ozBypassed = true;
                    form.submit();
                }
            }
        }
    }, true);
}

// Ensure initProfessionalModals is initialized on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initProfessionalModals();
});
