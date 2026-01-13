let heroInterval = null;

const heroTranslations = {
    en: [
        ["Silence The Noise", "<span class='gradient-text-js'>Focus Our Minds</span>"],
        ["Skip The Ordinary", "<span class='gradient-text-js'>Imagine Our World</span>"],
        ["Leave The Ground", "<span class='gradient-text-js'>Raise Our Limits</span>"],
        ["Lead The Vision", "<span class='gradient-text-js'>Own The Orbit</span>"]
    ],
    ar: [
        ["نُسكت الضجيج", "<span class='gradient-text-js'>نُركّز عقولنا</span>"],
        ["نتجاوز المألوف", "<span class='gradient-text-js'>نتخيّل عالمنا</span>"],
        ["نترك الأرض", "<span class='gradient-text-js'>نرفع حدودنا</span>"],
        ["نقود الرؤية", "<span class='gradient-text-js'>نمتلك المدار</span>"]
    ]
};

function initHeroAnimation() {
    
    const currentLang = window.location.pathname.includes('/ar') ? 'ar' : 'en';
    const linesContent = heroTranslations[currentLang];
    const isAr = currentLang === 'ar';
    
    
    let currentLineIndex = 3;
    
    const dynamicLine1 = document.getElementById("dynamic-line1");
    const dynamicLine2 = document.getElementById("dynamic-line2");
    
    if (!dynamicLine1 || !dynamicLine2) return;
    
    // --- الحل هنا: لو فيه أنميشن شغال، وقفه تماماً قبل ما تبدأ ---
    if (heroInterval) {
        clearInterval(heroInterval);
        heroInterval = null;
    }
    
    const swapInterval = 4500;
    const slideOutDuration = 250;
    const slideInDuration = 500;
    const lineAppearDelay = 150;
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const changeHeroLines = async () => {
        // الخروج
        dynamicLine1.style.animation = `slideUpOut ${slideOutDuration / 1000}s forwards`;
        dynamicLine2.style.animation = `slideUpOut ${slideOutDuration / 1000}s forwards`;
        
        await sleep(slideOutDuration);
        
        currentLineIndex = (currentLineIndex + 1) % linesContent.length;
        dynamicLine1.innerHTML = linesContent[currentLineIndex][0];
        dynamicLine2.innerHTML = linesContent[currentLineIndex][1];
        
        // ريست
        [dynamicLine1, dynamicLine2].forEach(line => {
            line.style.animation = 'none';
            line.style.opacity = '0';
            line.style.transform = 'translateY(100%)';
        });
        
        await sleep(50); // وقت أطول شوية للريست عشان المتصفح ميهيسش
        
        // الدخول
        dynamicLine1.style.animation = `slideUpIn ${slideInDuration / 1000}s forwards`;
        await sleep(lineAppearDelay);
        dynamicLine2.style.animation = `slideUpIn ${slideInDuration / 1000}s forwards`;
    };
    
    // حفظ الـ ID بتاع الـ Interval عشان نقدر نمسحه لو الدالة اتنادت تاني
    heroInterval = setInterval(changeHeroLines, swapInterval);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initHeroAnimation();
    } catch (e) {
        console.error("Error rendering data:", e);
    }
});