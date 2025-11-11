// Wait for the document to fully load before initializing
document.addEventListener('DOMContentLoaded', () => {
  initMainApp();
});

// Initialize all COMMON functions
function initMainApp() {
  initCommonNavigation();
  initParticles();
  initScrollAnimations(); // <-- اتغير اسمه عشان يكون أوضح
}

/* ===============================
   1. Common Navigation Logic
   - Adds header background on scroll
   - Handles mobile menu toggle
=============================== */
function initCommonNavigation() {
  const header = document.getElementById('main-header');
  const burgerButton = document.getElementById('burger-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuLinks = document.querySelectorAll('.mobile-menu-link');

  // Check for elements first
  if (header) {
    // Header scroll effect
    const handleHeaderScroll = () => {
      if (window.scrollY > 10) header.classList.add('header-scrolled');
      else header.classList.remove('header-scrolled');
    };
    window.addEventListener('scroll', handleHeaderScroll);
    handleHeaderScroll(); // Run once on load
  }

  // Mobile burger toggle
  if (burgerButton && mobileMenu) {
    const toggleMenu = () => {
      burgerButton.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    };
    burgerButton.addEventListener('click', toggleMenu);

    // Close mobile menu on link click
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenu.classList.contains('open')) toggleMenu();
      });
    });
  } else {
    console.warn("Mobile menu elements not found. Skipping mobile menu init.");
  }
}

/* ===============================
   2. Particles.js Background Setup
=============================== */
function initParticles() {
  if (typeof tsParticles === 'undefined') {
    console.warn("tsParticles not loaded. Skipping initParticles.");
    return;
  }

  tsParticles.load("tsparticles", {
    fpsLimit: 60,
    background: { color: "#030712" },
    particles: {
      number: { value: 60, density: { enable: true, value_area: 720 } },
      color: { value: ["#8b5cf6", "#a78bfa", "#c4b5fd"] },
      shape: { type: "circle" },
      opacity: { value: 0.4, random: true },
      size: { value: { min: 1, max: 3 } },
      links: {
        enable: true,
        distance: 150,
        color: "#7c3aed",
        opacity: 0.5,
        width: 1
      },
      move: {
        enable: true,
        speed: 1,
        direction: "none",
        out_mode: "out",
        random: true,
        straight: false
      }
    },
    detectRetina: true
  });
}

/* ===============================
   3. Scroll-triggered Animations
   - Triggers fade-in-up when element enters viewport
=============================== */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  if (animatedElements.length === 0) return; // Don't run if no elements

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  animatedElements.forEach(el => observer.observe(el));
}