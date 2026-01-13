(function() {
    const { utils, KEYS } = window.Orpita;
    
    // 1. حاجز الأمان: لو مفيش موافقة، اخرج
    if (utils.getCookie(KEYS.CONSENT) !== 'accepted') return;

    // 2. تحديث عداد الزيارات
    let visits = parseInt(utils.getCookie(KEYS.VISITS)) || 0;
    visits++;
    utils.setCookie(KEYS.VISITS, visits, 365);

    // 3. وظيفة فتح Tally الموحدة
    const openTally = (id, isPopup = false) => {
        if (typeof Tally !== 'undefined') {
            Tally.openPopup(id, {
                // لو هو Popup خليه يظهر في الركن، لو مش Popup خليه Modal في النص
                layout: isPopup ? 'popup' : 'modal', 
                position: isPopup ? 'right' : 'center', 
                width: isPopup ? 350 : 450,
                hideTitle: true
            });
        } else {
            window.open(`https://tally.so/r/${id}`, '_blank');
        }
    };

    // --- المنطق الأول: Popup الاستبيان (تحت شمال) بعد 10 ثواني ---
    if (!utils.getCookie(KEYS.SURVEY_INVITE)) {
        setTimeout(() => {
            const surveyBanner = document.createElement('div');
            surveyBanner.className = "fixed w-[350px] bg-slate-950/90 backdrop-blur-md border-2 border-violet-600 rounded-2xl p-6 z-[1001] shadow-[0_0_20px_rgba(124,58,237,0.3)] flex flex-col gap-5 animate-fade-in-up";
            surveyBanner.style.bottom = "24px"; surveyBanner.style.left = "24px"; surveyBanner.style.position = "fixed";
            
            surveyBanner.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 w-10 h-10 bg-violet-600/10 border border-violet-500/50 rounded-3xl p-1 flex items-center justify-center">
                        <img src="/assets/svg/survey-icon.svg" class="w-7 h-7 object-contain">
                    </div>
                    <div class="flex flex-col gap-1">
                        <h4 class="text-white font-bold text-base uppercase font-['Orbitron']">Feedback</h4>
                        <p class="text-slate-400 text-xs">Help shape Orpita's future!</p>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button id="s-accept" class="flex-1 bg-violet-600 text-white text-[10px] font-bold py-3 rounded-lg uppercase">Yes, Sure</button>
                    <button id="s-decline" class="flex-1 border border-slate-700 text-slate-400 text-[10px] font-bold py-3 rounded-lg uppercase">Later</button>
                </div>`;
            
            document.body.appendChild(surveyBanner);

            document.getElementById('s-accept').onclick = () => {
                openTally('yP2LX8',false);
                utils.setCookie(KEYS.SURVEY_INVITE, 'done', 30);
                surveyBanner.remove();
            };
            document.getElementById('s-decline').onclick = () => {
                utils.setCookie(KEYS.SURVEY_INVITE, 'refused', 7);
                surveyBanner.remove();
            };
        }, 10000);
    }

    // --- المنطق الثاني: الـ API التلقائي بعد 3 زيارات أو أسبوع ---
    let lastShown = utils.getCookie(KEYS.LAST_API);
    let shouldTriggerAuto = false;

    if (!lastShown && visits >= 3) shouldTriggerAuto = true;
    else if (lastShown && (Date.now() - parseInt(lastShown)) / (1000*60*60*24) >= 7) shouldTriggerAuto = true;

    if (shouldTriggerAuto) {
        setTimeout(() => {
            openTally('68jqbN',true);
            utils.setCookie(KEYS.LAST_API, Date.now(), 365);
        }, 2000);
    }
})();