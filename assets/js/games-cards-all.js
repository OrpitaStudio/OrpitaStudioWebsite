function renderNewsgamess() {
    const container = document.getElementById('games-grid');
    if (!container) return;
    
    // Determine current language
    const currentLang = window.location.pathname.includes('/ar') ? 'ar' : 'en';
    const gamesData = gamesTranslations[currentLang];
    const isAr = currentLang === 'ar';
    
    // Set container direction for RTL support
    container.style.direction = isAr ? 'rtl' : 'ltr';
    
    // Build the grid items
    container.innerHTML = gamesData.map((game, index) => `
        <div class="opacity-0 animate-on-scroll flex-shrink-0 md:shrink w-[65vw] md:w-full" style="animation-delay: ${0.2 * index}s;">
            <div class="bg-slate-800/50 rounded-2xl flex flex-col gap-6 h-full w-full border-2 border-slate-700 overflow-hidden shadow-xl transition-all duration-300 hover:border-violet-500/50 group">
                
                <div class="relative w-full h-48 overflow-hidden flex-shrink-0">
                    <img src="${game.image}" alt="${game.title}" 
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                         style="mask-image: linear-gradient(to bottom, black 75%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent 100%);">
                </div>

                <div class="relative z-10 -mt-12 flex-1 flex flex-col justify-between h-full w-full ${isAr ? 'text-right' : 'text-left'}">
                    <div class="px-6 pb-6">
                        <h3 class="text-xl font-bold text-white group-hover:text-violet-200 transition-colors">${game.title}</h3>
                        <p class="text-sm ${game.statusColor} font-medium mt-1">${game.status}</p>
                        <p class="text-gray-400 mt-3 text-sm leading-relaxed line-clamp-3">
                            ${game.description}
                        </p>
                    </div>
                </div>

                <div class="px-6 pb-6 mt-auto ${isAr ? 'text-right' : 'text-left'}">
                    ${game.showButton ? `
                        <a href="${game.link}" 
                           aria-label="${game.buttonText || 'View Details'} regarding ${game.title}"
                           class="inline-block bg-slate-700 hover:bg-violet-600 text-white text-sm font-medium py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105">
                           ${game.buttonText || 'View Details'}
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

const gamesTranslations = {
    en: [
        {
            title: "One More Day",
            status: "Not Available",
            statusColor: "text-red-400",
            image: "/assets/imgs/games/one-more-day/one-more-day-cover.webp",
            description: "One More Day is a narrative-focused game where you step into the shoes of Dr. Zain, facing tense hospital situations.",
            link: "/en/games/one-more-day/",
            showButton: true,
            buttonText: "View Game"
        },
        {
            title: "Minesetter",
            status: "In Development",
            statusColor: "text-yellow-400",
            image: "/assets/imgs/games/minesetter/minesetter-comming-soon.webp",
            description: "A reversed version of the classic Minesweeper game, but with entirely new rules.",
            link: "/en/games/minesetter/",
            showButton: false,
            buttonText: "View Project"
        },
        {
            title: "More Games Coming Soon",
            status: "Coming Soon",
            statusColor: "text-purple-400",
            image: "/assets/imgs/games/new-game/new-game-comming-soon.webp",
            description: "New games are coming soon, stay tuned for fresh experiences and unique stories!",
            link: "",
            showButton: false,
            buttonText: "Stay Tuned"
        }
    ],
    ar: [
        {
            title: "One More Day",
            status: "غير متاح",
            statusColor: "text-red-400",
            image: "/assets/imgs/games/one-more-day/one-more-day-cover.webp",
            description: "One More Day لعبة تركز على السرد القصصي حيث تلعب دور د. زين، وتواجه مواقف مستشفى مشحونة.",
            link: "/ar/games/one-more-day/",
            showButton: true,
            buttonText: "شاهد اللعبة"
        },
        {
            title: "Minesetter",
            status: "قيد التطوير",
            statusColor: "text-yellow-400",
            image: "/assets/imgs/games/minesetter/minesetter-comming-soon.webp",
            description: "نسخة معكوسة من لعبة Minesweeper الكلاسيكية، لكن بقواعد جديدة تماماً.",
            link: "/ar/games/minesetter/",
            showButton: false,
            buttonText: "شاهد المشروع"
        },
        {
            title: "ألعاب جديدة قريباً",
            status: "قريباً",
            statusColor: "text-purple-400",
            image: "/assets/imgs/games/new-game/new-game-comming-soon.webp",
            description: "ألعاب جديدة قادمة قريباً، ترقبوا تجارب مميزة وقصصاً فريدة!",
            link: "",
            showButton: false,
            buttonText: "ترقبوا"
        }
    ]
};
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ابني البيانات الأول (الترتيب مهم جداً)
  try {
    renderNewsgamess();
  } catch (e) {
    console.error("Error rendering data:", e);
  }
});