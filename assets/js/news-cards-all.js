function renderNewsArticles() {
  const container = document.getElementById('news-grid');
  if (!container) return;
  
  const currentLang = window.location.pathname.includes('/ar') ? 'ar' : 'en';
  const newsArticles = newsTranslations[currentLang];
  const isAr = currentLang === 'ar';
  
  // ضبط اتجاه الشبكة (Grid) بالكامل
  container.style.direction = isAr ? 'rtl' : 'ltr';
  
  container.innerHTML = newsArticles.map((article, index) => `
    <div class="opacity-0 animate-on-scroll flex-shrink-0 md:shrink w-[65vw] md:w-full" style="animation-delay: ${0.2 * index}s;">
        <div class="bg-slate-800/50 rounded-2xl flex flex-col gap-6 h-full w-full border-2 border-slate-700 overflow-hidden shadow-xl transition-all duration-300 hover:border-violet-500/50 group">
            
            <div class="relative w-full h-48 overflow-hidden flex-shrink-0">
                <img src="${article.img}" alt="${article.title}" 
                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                     style="mask-image: linear-gradient(to bottom, black 75%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent 100%);">
            </div>

            <div class="relative z-10 -mt-12 flex-1 flex flex-col justify-between h-full w-full ${isAr ? 'text-right' : 'text-left'}">
                <div class="px-6 pb-6">
                    <h3 class="text-xl font-bold text-white group-hover:text-violet-200 transition-colors">${article.title}</h3>
                    <p class="text-xs text-violet-400 font-medium mt-1 uppercase tracking-wider">${article.subtitle}</p>
                    <p class="text-gray-400 mt-3 text-sm leading-relaxed line-clamp-3">
                        ${article.text}
                    </p>
                </div>
            </div>

            <div class="px-6 pb-6 mt-auto ${isAr ? 'text-right' : 'text-left'}">
                ${article.showButton ? `
                    <a href="${article.link}" 
                       aria-label="${article.buttonText || 'View Details'} regarding ${article.title}"
                       class="inline-block bg-slate-700 hover:bg-violet-600 text-white text-sm font-medium py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105">
                       ${article.buttonText}
                    </a>
                ` : `
                    <span class="text-xs text-gray-500 italic">
                        ${isAr ? 'ترقبوا الإطلاق' : 'Stay tuned for launch'}
                    </span>
                `}
            </div>
        </div>
    </div>
  `).join('');
}

const newsTranslations = {
  en: [
    {
      title: "Who We Are",
      subtitle: "Meet Our Team",
      img: "/assets/imgs/ourstory/who-we-are-cover.webp",
      text: "A startup studio born in Alexandria, Egypt, driven by passion, creativity, and a vision to craft games that matter.",
      link: "/en/about/",
      showButton: true,
      buttonText: "About Orpita"
    },
    {
      title: "Orpita Joined GMTK 2025",
      subtitle: "Taking the Plunge. Accepting the Challenge.",
      img: "/assets/imgs/ourstory/orpita-joined-gmtk2025/orpita-joined-gmtk2025.webp",
      text: "We're participating in GMTK Game Jam 2025, one of the world's largest game jams. Follow our journey as we create something special in just 96 hours.",
      link: "/en/news/orpita-joined-gmtk2025/",
      showButton: true,
      buttonText: "Read Article"
    },
    {
      title: "Join Orpita Studio!",
      subtitle: "Every Journey Starts With a Step",
      img: "/assets/imgs/ourstory/call-for-new-members.webp",
      text: "We're looking for passionate artists, developers, and storytellers to join our growing team. Help us shape the future of indie gaming.",
      link: "/en/about/join/us/",
      showButton: true,
      buttonText: "Join Orpita"
    }
  ],
  ar: [
    {
      title: "من نحن",
      subtitle: "تعرّف على فريقنا",
      img: "/assets/imgs/ourstory/who-we-are-cover.webp",
      text: "استوديو ناشئ انطلق من الإسكندرية، مصر، يقوده الشغف والإبداع ورؤية لصنع ألعاب ذات قيمة حقيقية.",
      link: "/ar/about/",
      showButton: true,
      buttonText: "عن Orpita"
    },
    {
      title: "Orpita تنضم لـ GMTK 2025",
      subtitle: "نخوض التحدي. نقبل المغامرة.",
      img: "/assets/imgs/ourstory/orpita-joined-gmtk2025/orpita-joined-gmtk2025.webp",
      text: "نشارك في GMTK Game Jam 2025، أحد أكبر منافسات صناعة الألعاب في العالم. تابع رحلتنا ونحن نصنع شيئاً مميزاً في 96 ساعة فقط.",
      link: "/ar/news/orpita-joined-gmtk2025/",
      showButton: true,
      buttonText: "اقرأ المقال"
    },
    {
      title: "انضم لاستوديو Orpita!",
      subtitle: "كل رحلة تبدأ بخطوة",
      img: "/assets/imgs/ourstory/call-for-new-members.webp",
      text: "نبحث عن فنانين، مطورين، ورواة قصص شغوفين للانضمام لفريقنا المتنامي. ساعدنا في تشكيل مستقبل الألعاب المستقلة.",
      link: "/ar/about/join/us/",
      showButton: true,
      buttonText: "انضم لـ Orpita"
    }
  ]
};

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ابني البيانات الأول (الترتيب مهم جداً)
  try {
    renderNewsArticles();
  } catch (e) {
    console.error("Error rendering data:", e);
  }
});