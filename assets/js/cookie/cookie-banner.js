(function() {
    const { utils, KEYS } = window.Orpita;
    if (utils.getCookie(KEYS.CONSENT)) return;

    const banner = document.createElement('div');
    banner.id = 'orpita-cookie-banner';
    banner.className = "fixed w-[350px] bg-slate-950/90 backdrop-blur-md border-2 border-violet-600 rounded-2xl p-6 z-[1000] shadow-[0_0_20px_rgba(124,58,237,0.3)] hidden flex-col gap-5 animate-fade-in-up";
    banner.style.bottom = "24px"; banner.style.right = "24px"; banner.style.position = "fixed";

    banner.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 bg-violet-600/10 border border-violet-500/50 rounded-3xl p-1 flex items-center justify-center">
                <img src="/assets/svg/cookie.svg" class="w-7 h-7 object-contain">
            </div>
            <div class="flex flex-col gap-1">
                <h4 class="text-white font-bold text-base uppercase font-['Orbitron']">Cookies</h4>
                <p class="text-slate-400 text-xs">Improve your experience in Orpita. Agree?</p>
            </div>
        </div>
        <div class="flex gap-3">
            <button id="o-accept" class="flex-1 bg-violet-600 text-white text-[11px] font-black py-3 rounded-lg uppercase tracking-widest active:scale-95">Accept All</button>
            <button id="o-decline" class="flex-1 border border-slate-700 text-slate-400 text-[11px] font-black py-3 rounded-lg uppercase tracking-widest active:scale-95">Later</button>
        </div>`;
    
    document.body.appendChild(banner);
    setTimeout(() => { banner.classList.remove('hidden'); banner.classList.add('flex'); }, 1000);

    document.getElementById('o-accept').onclick = () => {
        utils.setCookie(KEYS.CONSENT, 'accepted', 365);
        banner.remove();
        location.reload(); // لإعادة تشغيل السكريبتات اللي مستنية الموافقة
    };

    document.getElementById('o-decline').onclick = () => {
        utils.setCookie(KEYS.CONSENT, 'declined', 7);
        banner.remove();
    };
})();