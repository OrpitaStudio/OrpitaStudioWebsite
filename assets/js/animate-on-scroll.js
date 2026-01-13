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
  }, { threshold: 0.05 });
  
  animatedElements.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ابني البيانات الأول (الترتيب مهم جداً)
  try {
    initScrollAnimations();
  } catch (e) {
    console.error("Error rendering data:", e);
  }
});