function renderSocialLinks() {
  const container = document.querySelector('.social-links-container'); // ضيف الكلاس ده في الـ HTML
  if (!container) return;
  
  container.innerHTML = socialLinks.map(link => `
        <a href="${link.url}" 
           aria-label="${link.name}" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="text-gray-400 hover:text-violet-400 transform hover:scale-125 transition-all duration-200 opacity-0 animate-on-scroll" 
           style="animation-delay: ${link.delay};">
            <svg class="w-7 h-7 fill-current">
                <use xlink:href="/assets/svg/icons-sprite.svg#icon-${link.icon}"></use>
            </svg>
        </a>
    `).join('');
}

const socialLinks = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/orpita-game-studio/', icon: 'linkedin', delay: '0.3s' },
  { name: 'YouTube', url: 'https://www.youtube.com/@OrpitaStudio', icon: 'youtube', delay: '0.4s' },
  { name: 'Facebook', url: 'https://www.facebook.com/OrpitaStudio', icon: 'facebook', delay: '0.5s' },
  { name: 'Instagram', url: 'https://www.instagram.com/orpitastudio', icon: 'instagram', delay: '0.6s' },
  { name: 'itch.io', url: 'https://orpita-studio.itch.io/', icon: 'itchio', delay: '0.7s' },
  { name: 'Whatsapp', url: 'https://wa.me/201203075900', icon: 'whatsapp', delay: '0.8s' }
];

document.addEventListener('DOMContentLoaded', () => {
    try {
        renderSocialLinks();
    } catch (e) {
        console.error("Error rendering data:", e);
    }
});
