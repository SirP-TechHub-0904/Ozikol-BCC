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

    // 2. Click to toggle dropdowns (Desktop & Mobile)
    var dropdownToggles = document.querySelectorAll('.oz-dropdown-toggle');
    dropdownToggles.forEach(function(toggle) {
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var parentDropdown = toggle.closest('.oz-dropdown');
        if (!parentDropdown) return;

        var isAlreadyOpen = parentDropdown.classList.contains('is-open') || parentDropdown.classList.contains('open');

        // Close all other open dropdowns
        document.querySelectorAll('.oz-dropdown.is-open, .oz-dropdown.open').forEach(function(d) {
          if (d !== parentDropdown) {
            d.classList.remove('is-open', 'open');
            var dToggle = d.querySelector('.oz-dropdown-toggle');
            if (dToggle) dToggle.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle clicked dropdown
        if (isAlreadyOpen) {
          parentDropdown.classList.remove('is-open', 'open');
          toggle.setAttribute('aria-expanded', 'false');
        } else {
          parentDropdown.classList.add('is-open', 'open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // 3. Close open dropdowns and drawer when clicking anywhere outside
    document.addEventListener('click', function(e) {
      if (drawer && drawer.classList.contains('active') && !drawer.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        drawer.classList.remove('active');
        if (toggleBtn) {
          toggleBtn.classList.remove('open');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      }

      // Close all dropdowns if click is outside any dropdown
      if (!e.target.closest('.oz-dropdown')) {
        document.querySelectorAll('.oz-dropdown.is-open, .oz-dropdown.open').forEach(function(d) {
          d.classList.remove('is-open', 'open');
          var dToggle = d.querySelector('.oz-dropdown-toggle');
          if (dToggle) dToggle.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // 4. Close dropdowns on Escape key press
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        document.querySelectorAll('.oz-dropdown.is-open, .oz-dropdown.open').forEach(function(d) {
          d.classList.remove('is-open', 'open');
          var dToggle = d.querySelector('.oz-dropdown-toggle');
          if (dToggle) dToggle.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // 5. Reset open states on window resize
    window.addEventListener('resize', function() {
      if (window.innerWidth > 991) {
        if (drawer) drawer.classList.remove('active');
        if (toggleBtn) {
          toggleBtn.classList.remove('open');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();