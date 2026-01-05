
// 2. وظيفة بناء الكروت (The DRY Generator)
function renderGames() {
    const wrapper = document.querySelector('.game-carousel .swiper-wrapper');
    if (!wrapper) return;
    
    wrapper.innerHTML = myGames.map(game => `
        <div class="swiper-slide">
            <div class="bg-slate-800/50 rounded-2xl flex flex-col gap-6 h-full w-full border-2 border-slate-700 overflow-hidden shadow-xl transition-transform duration-300 hover:border-violet-500/50 group transition-all">
                <img src="${game.image}" alt="${game.title}" 
                     class="w-full h-48 object-cover flex-shrink-0 group-hover:scale-110 transition-transform" 
                     style="mask-image: linear-gradient(to bottom, black 75%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 75%, transparent 100%);">
                
                <div class="relative z-10 -mt-12 flex-1 flex flex-col justify-between h-full w-full">
                    <div class="px-6 pb-6">
                        <h3 class="text-xl font-bold text-white group-hover:text-violet-200 transition-colors">${game.title}</h3>
                        <p class="text-sm ${game.statusColor} font-medium mt-1">${game.status}</p>
                        <p class="text-gray-400 mt-3 text-sm leading-relaxed line-clamp-3">
                            ${game.description}
                        </p>
                    </div>
                </div>
                <div class="px-6 pb-6">
                 <a href="${game.link}" class="inline-block self-start mt-4 bg-slate-700 hover:bg-violet-600 text-white text-sm font-medium py-2 px-6 rounded-full transition-all duration-300 ${game.status === 'Not available' ? 'opacity-50' : ''}">
                             View Details
                 </a>
                 </div>
            </div>
        </div>
    `).join('');
}

function renderStoryArticles() {
    const container = document.getElementById('story-grid');
    if (!container) return;
    
    container.innerHTML = storyArticles.map((article, index) => `
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

                <div class="px-6 pb-6">
                    <a href="${article.link}" class="inline-block self-start mt-2 bg-slate-700 hover:bg-violet-600 text-center text-white text-sm font-medium py-2 px-6 rounded-full transition-all duration-300 shadow-md">
                        Read more
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

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
                <use xlink:href="/assets/imgs/icons-sprite.svg#icon-${link.icon}"></use>
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

// 1. قاعدة بيانات الألعاب (تقدر تضيف أي لعبة هنا بسهولة)
const myGames = [
    {
        title: "One more day",
        status: "Not available",
        statusColor: "text-red-400",
        image: "/assets/imgs/games/one-more-day/one-more-day-cover.webp",
        description: "One More Day is a narrative-focused game where you step into the shoes of Dr. Zain, facing tense hospital situations.",
        link: "./games/one-more-day"
    },
    {
        title: "Minesetter",
        status: "In development",
        statusColor: "text-yellow-400",
        image: "/assets/imgs/games/minesetter/minesetter-comming-soon.webp",
        description: "A reversed version of the classic Minesweeper game, but with entirely new rules.",
        link: "#"
    },
    {
        title: "more game coming soon",
        status: "Coming Soon ...",
        statusColor: "text-purple-400",
        image: "/assets/imgs/games/new-game/new-game-comming-soon.webp",
        description: "New games are coming soon, stay tuned!",
        link: "#"
    }
    
];

const storyArticles = [
    {
        title: "Join orpita studio !",
        subtitle: "Everything starts with a step",
        img: "/assets/imgs/ourstory/call-for-new-members.webp",
        text: "Our goal is to grow and expand to serve more players worldwide...",
        link: "#"
    },
    {
        title: "Orpita joined GMTK 2025",
        subtitle: "Taking the plunge. Accepting the challenge.",
        img: "/assets/imgs/ourstory/orpita-goined-gmtk2025.webp",
        text: "Creating a legacy of stories and logical challenges through indie games...",
        link: "./blog/orpita-gmtk2025"
    },
    {
        title: "Who we sre",
        subtitle: "Meet our team",
        img: "/assets/imgs/ourstory/who-we-are-cover.webp",
        text: "A startup studio born in Alexandria, driven by passion and creativity...",
        link: "./about"
    }
];



// Initialize all functions SPECIFIC to the index page
function initIndexPage() {
  
  initSwiper();
  initHeroAnimation();
}

/* ===============================
   1. Index-Page Navigation Logic
   - Highlights active section in navbar (Scroll-Spy)
=============================== */

/* ===============================
   2. Swiper.js Carousel Initialization
=============================== */
function initSwiper() {
  if (typeof Swiper === 'undefined') return;
  
  new Swiper('.game-carousel', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    loop: false,
    rewind: true,
    slidesPerView: "auto", // لازم auto عشان الـ CSS يشتغل صح
    spaceBetween: 20,
    loopedSlides: 4, 
    // 2. خليه ينسخ كروت إضافية عشان يغطي الفراغ وقت النقل
    loopAdditionalSlides: 3,
    speed: 1200,
    observer: true,
    observeParents: true,
    
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 100,
      modifier: 1.2,
      slideShadows: false,
    },
    watchSlidesProgress: true,
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    
    observer: true,
    observeParents: true,
    
    breakpoints: {
      320: {
        coverflowEffect: {
          depth: 50, // خففنا الـ 3D في الموبايل عشان السنترة تظبط
          modifier: 1,
        }
      },
      1024: {
        coverflowEffect: {
          depth: 150,
          modifier: 1.2,
        }
      }
    }
  });
}

/* ===============================
   3. Hero Text Animation (Dynamic Lines)
=============================== */
function initHeroAnimation() {
  const linesContent = [
    ["silence the noise.", "<span class='gradient-text-js'>focus our mind</span>."],
    ["skip the ordinary.", "<span class='gradient-text-js'>imagine our world</span>."],
    ["leave the ground.", "<span class='gradient-text-js'>raise our limits</span>."],
    ["lead the vision.", "<span class='gradient-text-js'>own the orbit</span>."],
  ];

  let currentLineIndex = 0;
  const dynamicLine1 = document.getElementById("dynamic-line1");
  const dynamicLine2 = document.getElementById("dynamic-line2");

  if (!dynamicLine1 || !dynamicLine2) {
    console.warn("Hero text elements not found. Skipping initHeroAnimation.");
    return;
  }

  const swapInterval = 4500;
  const slideOutDuration = 250;
  const slideInDuration = 500;
  const lineAppearDelay = 150;

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

  const initialDelay = 150;
  const initialDuration = 150;
  const startIntervalTimer = initialDelay + initialDuration;

  setTimeout(() => {
    setInterval(changeHeroLines, swapInterval);
  }, startIntervalTimer);
}

// شغلها أول ما الصفحة تحمل
// التعديل السحري في نهاية ملف الـ JS بتاعك
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Orpita Engine Starting...");
    
    // 1. ابني البيانات الأول (الترتيب مهم جداً)
    try {
        renderGames();
        renderStoryArticles();
        renderSocialLinks();
        console.log("Data Rendered Successfully");
    } catch (e) {
        console.error("Error rendering data:", e);
    }
    
    // 2. انتظر لحظة بسيطة للتأكد من أن الـ HTML الجديد "استقر" في الصفحة
    setTimeout(() => {
        // 3. شغل الـ Swiper والـ Animations بعد ما الكروت تكون "اتولدت" فعلاً
        if (typeof Swiper !== 'undefined') {
            initSwiper();
            console.log("Swiper Initialized");
        } else {
            console.error("Swiper is not defined! Check your CDN link.");
        }
        
        initHeroAnimation();
    }, 100); // تأخير 100 مللي ثانية بيحل مشاكل الـ Rendering في المتصفحات
});
