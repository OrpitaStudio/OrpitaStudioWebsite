/* =============================================================
   ORPITA HEADER LOGIC - REFACTORED
   ============================================================= */

// --- SECTION 1: CONFIGURATION & DATA ---
// Defines the navigation structure and current language context
const OrpitaNav = {
    lang: window.location.pathname.includes('/ar/') ? 'ar' : 'en',
    menu: [
        {
            title: { en: 'Games', ar: 'الألعاب' },
            links: [
                { name: { en: 'All games', ar: 'كل الألعاب' }, url: '/games/' },
                { name: { en: 'One more day', ar: 'يوم واحد آخر' }, url: '/games/one-more-day/' }
            ]
        },
        {
            title: { en: 'About', ar: 'من نحن' },
            links: [
                { name: { en: 'About us', ar: 'من نحن' }, url: '/about' },
                { name: { en: 'Join the Team', ar: 'انضم إلى الفريق' }, url: '/about/join-us' }
            ]
        },
        { title: { en: 'News', ar: 'الأخبار' }, url: '/news', isLink: true }
    ],

    // --- SECTION 2: RENDER ENGINE ---
    // Injects HTML into Desktop and Mobile containers
    render() {
        const nav = document.getElementById('main-nav'), mobile = document.querySelector('#mobile-dropdown nav');
        if (!nav || !mobile) return;

        const getUrl = (path) => `/${this.lang}${path}`;
        
        // Desktop Generation
        nav.innerHTML = this.menu.map(item => {
            const label = item.title[this.lang];
            if (item.isLink) return `<a href="${getUrl(item.url)}" class="text-gray-300 hover:text-violet-400 font-medium transition-colors">${label}</a>`;
            return `
                <div class="relative dropdown-container">
                    <button class="dropdown-btn flex items-center gap-1 text-gray-300 hover:text-violet-400 font-medium py-2">
                        ${label}<span class="dropdown-icon transition-transform duration-300"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></span>
                    </button>
                    <div class="dropdown-menu absolute top-full left-0 mt-2 w-52 opacity-0 invisible translate-y-2 transition-all duration-300 z-50">
                        <div class="bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl">
                            ${item.links.map(l => `<a href="${getUrl(l.url)}" class="block px-4 py-2 text-sm text-gray-300 hover:bg-violet-600/20 hover:text-violet-400 rounded-lg">${l.name[this.lang]}</a>`).join('')}
                        </div>
                    </div>
                </div>`;
        }).join('');

        // Mobile Generation
        mobile.innerHTML = `<a href="${getUrl('/')}" class="text-white font-medium border-b border-white/5 pb-2">${this.lang === 'ar' ? 'الرئيسية' : 'Home'}</a>` + 
        this.menu.map(item => {
            const label = item.title[this.lang];
            if (item.isLink) return `<a href="${getUrl(item.url)}" class="text-white font-medium">${label}</a>`;
            return `<div class="flex flex-col gap-2"><span class="text-xs font-bold text-violet-400 uppercase tracking-widest pt-2">${label}</span>${item.links.map(l => `<a href="${getUrl(l.url)}" class="pl-4 text-sm text-gray-400">${l.name[this.lang]}</a>`).join('')}</div>`;
        }).join('');

        this.initEvents();
        setupLanguageSwitcher(); 
        updateCurrentYear();
    },

    // --- SECTION 3: INTERACTION LOGIC ---
    // Manages dropdown toggles and outside clicks
    initEvents() {
        const closeAll = () => {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('opacity-0', 'invisible', 'translate-y-2'));
            document.querySelectorAll('.dropdown-icon').forEach(i => i.classList.remove('rotate-180'));
            document.getElementById('mobile-dropdown')?.classList.add('opacity-0', 'invisible');
        };

        document.querySelectorAll('.dropdown-container').forEach(c => {
            const btn = c.querySelector('.dropdown-btn'), menu = c.querySelector('.dropdown-menu');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !menu.classList.contains('opacity-0');
                closeAll();
                if (!isOpen) { 
                    menu.classList.remove('opacity-0', 'invisible', 'translate-y-2'); 
                    btn.querySelector('.dropdown-icon').classList.add('rotate-180'); 
                }
            });
        });

        document.getElementById('mobile-menu-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dd = document.getElementById('mobile-dropdown');
            dd.classList.toggle('opacity-0'); dd.classList.toggle('invisible');
        });

        document.addEventListener('click', closeAll);
    }
};

// --- SECTION 4: UTILITIES ---
// Helper functions for Language Switcher and Date
function setupLanguageSwitcher() {
    const btnEn = document.getElementById('lang-en'), btnAr = document.getElementById('lang-ar');
    if (!btnEn || !btnAr) return;
    
    const path = window.location.pathname, isAr = path.includes('/ar/');
    const active = "text-xs font-bold text-violet-400 transition-colors";
    const inactive = "text-xs font-bold text-gray-500 hover:text-white transition-colors";

    btnAr.className = isAr ? active : inactive;
    btnEn.className = !isAr ? active : inactive;
    
    btnEn.onclick = (e) => { e.preventDefault(); if (isAr) window.location.href = path.replace('/ar/', '/en/'); };
    btnAr.onclick = (e) => { 
        e.preventDefault(); 
        if (!isAr) window.location.href = path.includes('/en/') ? path.replace('/en/', '/ar/') : '/ar' + path; 
    };
}

// --- SECTION 5: INITIALIZATION ---
// Safe startup ensuring DOM elements exist
function initOrpitaHeader() {
    if (!document.getElementById('main-nav')) { setTimeout(initOrpitaHeader, 50); return; }
    OrpitaNav.render();
}

document.readyState === 'complete' ? initOrpitaHeader() : window.addEventListener('load', initOrpitaHeader);