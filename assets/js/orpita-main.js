
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
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  
  // 1. تأكد أن الهيدر موجود قبل تنفيذ أي شيء
  if (!header||!menuBtn||!mobileMenu) return;
  
  // 2. تأثير السكرول
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }
  });
  
  // 3. فتح المنيو - (داخل الدالة لضمان الوصول للمتغيرات)
  menuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  
  // تبديل شكل الزر (X <-> Burger)
  menuBtn.classList.toggle('open');
  
  // تبديل ظهور المنيو
  mobileMenu.classList.toggle('active');
});

// إغلاق المنيو عند الضغط في أي مكان خارج المنيو
document.addEventListener('click', (e) => {
  if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
    mobileMenu.classList.remove('active');
    menuBtn.classList.remove('open'); // يرجع لشكل البرجر
  }
});

// إغلاق المنيو عند الضغط على الروابط
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
    menuBtn.classList.remove('open');
  });
});
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
    background: {
  color: {
    value: "linear-gradient(180deg, #938912 0%, #666666 100%)"
  }
},
    particles: {
      number: { value:50, density: { enable: true, value_area: 700 } },
      color: { value: ["#8b5cf6", "#a78bfa", "#c4b5fd"] },
      shape: { type: "circle" },
      opacity: { value: 0.75, random: true },
      size: { value: { min: 1, max: 3 } },
      links: {
        enable: true,
        distance: 150,
        color: "#7c3aed",
        opacity: 0.75,
        width: 1
      },
      move: {
        enable: true,
        speed: 1.2,
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