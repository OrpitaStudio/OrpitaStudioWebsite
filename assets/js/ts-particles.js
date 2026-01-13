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
      number: { value: 50, density: { enable: true, value_area: 700 } },
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

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ابني البيانات الأول (الترتيب مهم جداً)
  try {
    initParticles();
  } catch (e) {
    console.error("Error rendering data:", e);
  }
});