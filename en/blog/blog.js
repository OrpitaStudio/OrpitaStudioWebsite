function renderNewsArticles() {
  const container = document.getElementById('news-grid');
  if (!container) return;
  
  container.innerHTML = newsArticles.map((article, index) => `
        <div class="opacity-0 animate-on-scroll" style="animation-delay: ${0.2 * index}s;">
            <div class="bg-slate-800/50 rounded-2xl flex flex-col gap-6 h-full w-full border-2 border-slate-700 overflow-hidden shadow-xl transition-all duration-300 hover:border-violet-500/50 group">
                
                <div class="relative w-full h-48 overflow-hidden flex-shrink-0">
                    <img src="${article.img}" alt="${article.title}" 
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                         style="mask-image: linear-gradient(to bottom, black 75%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent 100%);">
                </div>

                <div class="relative z-10 -mt-12 flex-1 flex flex-col justify-between h-full w-full">
                    <div class="px-6 pb-6">
                        <h3 class="text-xl font-bold text-white group-hover:text-violet-200 transition-colors">${article.title}</h3>
                        <p class="text-sm text-violet-400 font-medium mt-1">${article.subtitle}</p>
                        <p class="text-gray-400 mt-3 text-sm leading-relaxed line-clamp-3">
                            ${article.text}
                        </p>
                    </div>
                </div>

                 <div class="px-6 pb-6 mt-auto">
                    ${article.showButton ? `
                        <a href="${article.link}" 
                           aria-label="${article.buttonText || 'View Details'} regarding ${article.title}"
                           class="inline-block bg-slate-700 hover:bg-violet-600 text-white text-sm font-medium py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105">
                           ${article.buttonText || 'View Details'}
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

const newsArticles = [
    
    {
    title: "Who we sre",
    subtitle: "Meet our team",
    img: "/assets/imgs/ourstory/who-we-are-cover.webp",
    text: "A startup studio born in Alexandria, driven by passion and creativity...",
    link: "/en/about/",
    showButton: true,
       buttonText: "About Orpita"
    },
    {
        title: "Orpita joined GMTK 2025",
        subtitle: "Taking the plunge. Accepting the challenge.",
        img: "/assets/imgs/ourstory/orpita-joined-gmtk2025/orpita-joined-gmtk2025.webp",
        text: "Creating a legacy of stories and logical challenges through indie games...",
        link: "/en/blog/orpita-joined-gmtk2025/",
        showButton: true,
    buttonText: "Read article"
    },
    {
    title: "Join orpita studio !",
    subtitle: "Everything starts with a step",
    img: "/assets/imgs/ourstory/call-for-new-members.webp",
    text: "Our goal is to grow and expand to serve more players worldwide...",
    link: "/en/about/join/us/",
    showButton: true,
    buttonText: "Join Orpita"
    }
];

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Orpita Engine Starting...");
    
    // 1. ابني البيانات الأول (الترتيب مهم جداً)
    try {
        renderNewsArticles();
    } catch (e) {
        console.error("Error rendering data:", e);
    }
});