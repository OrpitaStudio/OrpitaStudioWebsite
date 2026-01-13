function renderGames() {
  const wrapper = document.querySelector('.game-carousel .swiper-wrapper');
  if (!wrapper) return;
  
  // --- السطور اللي هتنقلها ---
  const currentLang = window.location.pathname.includes('/ar') ? 'ar' : 'en';
  const myGames = gamesData[currentLang];
  const isAr = currentLang === 'ar';
  wrapper.style.direction = isAr ? 'rtl' : 'ltr';
  // ---------------------------
  
  wrapper.innerHTML = myGames.map(game => `
        <div class="swiper-slide h-auto">
            <div class="bg-slate-800/50 rounded-2xl flex flex-col gap-6 h-full w-full border-2 border-slate-700 overflow-hidden shadow-xl hover:border-violet-500/50 group transition-all duration-300">
                
                <div class="overflow-hidden">
                    <img src="${game.image}" alt="${game.title}" 
                         class="w-full h-48 object-cover flex-shrink-0 group-hover:scale-110 transition-transform duration-500" 
                         style="mask-image: linear-gradient(to bottom, black 75%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent 100%);">
                </div>
                

<div class="relative z-10 -mt-12 flex-1 flex flex-col px-6 pb-2 ${isAr ? 'text-right' : 'text-left'}">
                    <h4 class="text-xl font-bold text-white group-hover:text-violet-200 transition-colors">${game.title}</h4>
                    <p class="text-sm ${game.statusColor} font-medium mt-1">${game.status}</p>
                    <p class="text-gray-400 mt-3 text-sm leading-relaxed line-clamp-3">
                        ${game.description}
                    </p>
                </div>


<div class="px-6 pb-6 mt-auto ${isAr ? 'text-right' : 'text-left'}">
                    ${game.showButton ? `
                        <a href="${game.link}" 
                           aria-label="${game.buttonText || 'View Details'} regarding ${game.title}"
                           class="inline-block bg-slate-700 hover:bg-violet-600 text-white text-sm font-medium py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105">
                           ${game.buttonText || 'View Details'}
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}



// 1. قاعدة بيانات الألعاب (تقدر تضيف أي لعبة هنا بسهولة)
const gamesData = {
    en: [
        {
            title: "One More Day",
            status: "Not Available",
            statusColor: "text-red-400",
            image: "/assets/imgs/games/one-more-day/one-more-day-cover.webp",
            description: "One More Day is a narrative-focused game where you step into the shoes of Dr. Zain, facing tense hospital situations.",
            link: "en/games/one-more-day/",
            showButton: true,
            buttonText: "View Game"
        },
        {
            title: "Minesetter",
            status: "In Development",
            statusColor: "text-yellow-400",
            image: "/assets/imgs/games/minesetter/minesetter-comming-soon.webp",
            description: "A reversed version of the classic Minesweeper game, but with entirely new rules.",
            link: "en/games/minesetter/",
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
    try {
        renderGames();
    } catch (e) {
        console.error("Error rendering data:", e);
    }
});
