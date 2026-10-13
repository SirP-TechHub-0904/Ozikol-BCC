(function() {
  function initNav() {
    var toggleBtn = document.getElementById('ozNavToggleBtn') || document.querySelector('.oz-nav-toggler');
    var drawer = document.getElementById('ozNavDrawer');
    if (!toggleBtn || !drawer) return;

    // Toggle Mobile Drawer
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = drawer.classList.toggle('active');
      toggleBtn.classList.toggle('open', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Mobile Dropdown Click Accordion Toggle
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

    // Close on click outside
    document.addEventListener('click', function(e) {
      if (drawer.classList.contains('active') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
        drawer.classList.remove('active');
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Reset mobile classes on resize to desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth > 991) {
        drawer.classList.remove('active');
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.querySelectorAll('.oz-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
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