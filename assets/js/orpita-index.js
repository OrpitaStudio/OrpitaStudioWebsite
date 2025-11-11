// Wait for the document to fully load before initializing
document.addEventListener('DOMContentLoaded', () => {
  // This assumes orpita-main.js has already run its common functions
  initIndexPage();
});

// Initialize all functions SPECIFIC to the index page
function initIndexPage() {
  initIndexScrollSpy();
  initSwiper();
  initHeroAnimation();
}

/* ===============================
   1. Index-Page Navigation Logic
   - Highlights active section in navbar (Scroll-Spy)
=============================== */
function initIndexScrollSpy() {
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav a');
  const homeLink = document.getElementById('nav-home');

  if (sections.length === 0 || navLinks.length === 0 || !homeLink) {
    console.warn("Index navigation (scroll-spy) elements not found.");
    return;
  }

  const handleScroll = () => {
    // Highlight active link
    let currentSection = '';
    const triggerPoint = 150;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= triggerPoint && rect.bottom >= triggerPoint)
        currentSection = section.getAttribute('id');
    });

    navLinks.forEach(link => link.classList.remove('active-link'));

    if (currentSection) {
      const activeLink = document.querySelector(`nav a[href="#${currentSection}"]`);
      if (activeLink) activeLink.classList.add('active-link');
    } else if (window.scrollY < window.innerHeight / 2) {
      homeLink.classList.add('active-link');
    }
  };

  // Activate home link initially
  homeLink.classList.add('active-link');
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Run once on load
}

/* ===============================
   2. Swiper.js Carousel Initialization
=============================== */
function initSwiper() {
  if (typeof Swiper === 'undefined') {
    console.warn("Swiper not loaded. Skipping initSwiper.");
    return;
  }

  new Swiper('.game-carousel', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    loop: true,
    slidesPerView: 'auto',
    spaceBetween: 30,
    speed: 1000,
    coverflowEffect: {
      rotate: 0,
      stretch: -15,
      depth: 200,
      modifier: 1.5,
      slideShadows: false,
    },
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      320: { slidesPerView: 'auto', coverflowEffect: { depth: 100, modifier: 1 } },
      1024: { slidesPerView: 'auto', coverflowEffect: { depth: 200, modifier: 1.5 } }
    }
  });
}

/* ===============================
   3. Hero Text Animation (Dynamic Lines)
=============================== */
function initHeroAnimation() {
  const linesContent = [
    ["See <span class='gradient-text-js'>The Universe</span>.", "Build <span class='gradient-text-js'>Our Own</span>."],
    ["Orbit <span class='gradient-text-js'>The Impossible</span>.", "Make <span class='gradient-text-js'>It Real</span>."],
    ["Breathe <span class='gradient-text-js'>In Stardust</span>.", "Exhale <span class='gradient-text-js'>Imagination</span>."],
    ["Launch <span class='gradient-text-js'>Into The Void</span>.", "Return <span class='gradient-text-js'>With Stories</span>."],
    ["Explore <span class='gradient-text-js'>The Stars</span>.", "Craft <span class='gradient-text-js'>New Worlds</span>."]
  ];

  let currentLineIndex = 0;
  const dynamicLine1 = document.getElementById("dynamic-line1");
  const dynamicLine2 = document.getElementById("dynamic-line2");

  if (!dynamicLine1 || !dynamicLine2) {
    console.warn("Hero text elements not found. Skipping initHeroAnimation.");
    return;
  }

  const swapInterval = 3500;
  const slideOutDuration = 500;
  const slideInDuration = 500;
  const lineAppearDelay = 100;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const changeHeroLines = async () => {
    dynamicLine1.style.animation = `slideUpOut ${slideOutDuration / 1000}s forwards`;
    dynamicLine2.style.animation = `slideUpOut ${slideOutDuration / 1000}s forwards`;

    await sleep(slideOutDuration);

    currentLineIndex = (currentLineIndex + 1) % linesContent.length;
    dynamicLine1.innerHTML = linesContent[currentLineIndex][0];
    dynamicLine2.innerHTML = linesContent[currentLineIndex][1];

    // Reset styles for slideIn
    dynamicLine1.style.animation = 'none';
    dynamicLine1.style.opacity = '0';
    dynamicLine1.style.transform = 'translateY(100%)';
    dynamicLine2.style.animation = 'none';
    dynamicLine2.style.opacity = '0';
    dynamicLine2.style.transform = 'translateY(100%)';

    await sleep(20); // Wait for browser to apply reset

    dynamicLine1.style.animation = `slideUpIn ${slideInDuration / 1000}s forwards`;
    await sleep(lineAppearDelay);
    dynamicLine2.style.animation = `slideUpIn ${slideInDuration / 1000}s forwards`;
  };

  const initialDelay = 1100;
  const initialDuration = 800;
  const startIntervalTimer = initialDelay + initialDuration;

  setTimeout(() => {
    setInterval(changeHeroLines, swapInterval);
  }, startIntervalTimer);
}
