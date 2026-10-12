(function() {
  function initHeroSlider() {
    var section = document.querySelector('.oz-hero-slider');
    if (!section) return;

    var slides = section.querySelectorAll('.oz-slide');
    var dots = section.querySelectorAll('.oz-slider-dot');
    var prevBtn = section.querySelector('.oz-prev');
    var nextBtn = section.querySelector('.oz-next');

    if (slides.length <= 1) return;

    var currentIndex = 0;
    var timer = null;

    function showSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentIndex = index;

      for (var i = 0; i < slides.length; i++) {
        if (i === currentIndex) {
          slides[i].classList.add('active');
        } else {
          slides[i].classList.remove('active');
        }
      }

      for (var j = 0; j < dots.length; j++) {
        if (j === currentIndex) {
          dots[j].classList.add('active');
        } else {
          dots[j].classList.remove('active');
        }
      }
    }

    function nextSlide() {
      showSlide(currentIndex + 1);
    }

    function prevSlide() {
      showSlide(currentIndex - 1);
    }

    function startAutoPlay() {
      stopAutoPlay();
      timer = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
      if (timer) clearInterval(timer);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        prevSlide();
        startAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        nextSlide();
        startAutoPlay();
      });
    }

    for (var k = 0; k < dots.length; k++) {
      (function(idx) {
        dots[idx].addEventListener('click', function(e) {
          e.preventDefault();
          showSlide(idx);
          startAutoPlay();
        });
      })(k);
    }

    section.addEventListener('mouseenter', stopAutoPlay);
    section.addEventListener('mouseleave', startAutoPlay);

    startAutoPlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroSlider);
  } else {
    initHeroSlider();
  }
})();