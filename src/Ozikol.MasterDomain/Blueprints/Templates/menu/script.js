(function() {
  function initNav() {
    var toggleBtn = document.getElementById('ozNavToggleBtn') || document.querySelector('.oz-nav-toggler');
    var drawer = document.getElementById('ozNavDrawer');

    // 1. Toggle Mobile Drawer
    if (toggleBtn && drawer) {
      toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = drawer.classList.toggle('active');
        toggleBtn.classList.toggle('open', isOpen);
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // 2. Mobile Dropdown Click Accordion Toggle
    var dropdownToggles = document.querySelectorAll('.oz-dropdown-toggle');
    dropdownToggles.forEach(function(toggle) {
      toggle.addEventListener('click', function(e) {
        if (window.innerWidth <= 991) {
          e.preventDefault();
          var parentDropdown = toggle.closest('.oz-dropdown');
          if (parentDropdown) {
            parentDropdown.classList.toggle('open');
          }
        }
      });
    });

    // 3. Desktop Dropdown Graceful Hover with Delay
    // Prevents dropdown vanishing while cursor traverses the gap to sub-items
    var desktopDropdowns = document.querySelectorAll('.oz-dropdown');
    desktopDropdowns.forEach(function(dropdown) {
      var closeTimer = null;

      dropdown.addEventListener('mouseenter', function() {
        if (window.innerWidth > 991) {
          if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
          }
          dropdown.classList.add('is-open');
        }
      });

      dropdown.addEventListener('mouseleave', function() {
        if (window.innerWidth > 991) {
          closeTimer = setTimeout(function() {
            dropdown.classList.remove('is-open');
          }, 400); // 400ms graceful close delay
        }
      });
    });

    // 4. Close on click outside
    document.addEventListener('click', function(e) {
      if (drawer && drawer.classList.contains('active') && !drawer.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        drawer.classList.remove('active');
        if (toggleBtn) {
          toggleBtn.classList.remove('open');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      }

      // Close open desktop dropdowns when clicking outside
      if (window.innerWidth > 991) {
        desktopDropdowns.forEach(function(dropdown) {
          if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('is-open');
          }
        });
      }
    });

    // 5. Reset classes on resize
    window.addEventListener('resize', function() {
      if (window.innerWidth > 991) {
        if (drawer) drawer.classList.remove('active');
        if (toggleBtn) {
          toggleBtn.classList.remove('open');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
        document.querySelectorAll('.oz-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
        });
      } else {
        document.querySelectorAll('.oz-dropdown.is-open').forEach(function(el) {
          el.classList.remove('is-open');
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();