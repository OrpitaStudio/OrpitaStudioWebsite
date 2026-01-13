// 1. قاموس البيانات الموحد (Translations)
const pageTranslations = {
    en: {
        steps: [
            { title: "Apply", desc: "Browse our open positions and submit your application.", icon: "form-edit.svg" },
            { title: "Application Received", desc: "You'll receive an email confirmation once we've received your application successfully.", icon: "gmail.svg" },
            { title: "Initial Review", desc: "Our HR team will review your application carefully. We'll reach out via WhatsApp within 3-7 business days.", icon: "whatsapp.svg" },
            { title: "Virtual Interview", desc: "Join us for a conversation on Google Meet. Please ensure a stable connection.", icon: "google-meet.svg" },
            { title: "Welcome Aboard", desc: "Congratulations! If selected, you'll receive an offer via WhatsApp and a detailed onboarding email.", icon: "done.svg" }
        ],
        jobs: [
            
        ],
        ui: {
            readMore: "Read More ▼",
            readLess: "Read Less ▲",
            applyBtn: "Apply for this Role",
            askBtn: "Ask about this role",
            waMsg: "Hello Orpita Studio! I'm interested in the ",
            noJobs: "No positions available at the moment",
            followUs: "Follow us on social media for updates"
        }
    },
    ar: {
        steps: [
            { title: "قدّم الآن", desc: "تصفح الوظائف المتاحة وقدم طلبك بسهولة من خلال الموقع.", icon: "form-edit.svg" },
            { title: "تم الاستلام", desc: "ستصلك رسالة تأكيد عبر البريد الإلكتروني فور استلام طلبك بنجاح.", icon: "gmail.svg" },
            { title: "مراجعة أولية", desc: "سيقوم فريق الموارد البشرية بمراجعة طلبك. إذا كنت مناسباً، سنتواصل معك عبر واتساب خلال 3-7 أيام.", icon: "whatsapp.svg" },
            { title: "مقابلة افتراضية", desc: "انضم إلينا في محادثة عبر Google Meet. يرجى التأكد من استقرار الإنترنت.", icon: "google-meet.svg" },
            { title: "مرحباً بك", desc: "مبروك! في حال قبولك، ستصلك رسالة العرض عبر واتساب وإيميل تفصيلي للبدء.", icon: "done.svg" }
        ],
        jobs: [
            {
                title: "مطور ألعاب يونيتي",
                type: "تطوير ألعاب • عن بعد",
                icon: "/assets/svg/unity.svg",
                description: "أهلاً بك، نحن نبحث عن مطور يونيتي شغوف للانضمام إلى فريقنا.",
                requirements: ["مطورين يونيتي فقط", "خبرة جيدة في لغة C#", "مهارة حل المشكلات"],
                delay: "0.2s"
            },
            {
                title: "رسام ألعاب 2D",
                type: "فنون • عن بعد",
                icon: "/assets/svg/digital-artist.svg",
                description: "مطلوب رسام مبدع لتطوير الهوية البصرية لألعابنا الفريدة.",
                requirements: ["إتقان Photoshop/Illustrator", "خبرة في التحريك ثنائي الأبعاد"],
                delay: "0.4s"
            }
        ],
        ui: {
            readMore: "اقرأ المزيد ▼",
            readLess: "اقرأ أقل ▲",
            applyBtn: "قدم على هذه الوظيفة",
            askBtn: "اسأل عن الوظيفة",
            waMsg: "أهلاً Orpita Studio! أنا مهتم بوظيفة ",
            noJobs: "لا توجد وظائف متاحة حالياً",
            followUs: "تابعنا على وسائل التواصل للتحديثات"
        }
    }
};

// --- وظائف البناء (Generators) ---

function renderHiringSteps(langData, isAr) {
    const container = document.getElementById('hiring-steps-container');
    if (!container) return;
    
    container.style.direction = isAr ? 'rtl' : 'ltr';
    container.className = "grid grid-cols-1 md:grid-cols-29 items-start gap-y-5 md:gap-y-0 w-full";
    
    container.innerHTML = langData.steps.map((step, index) => {
        const isLast = index === langData.steps.length - 1;
        return `
            <div class="md:col-span-5 flex flex-row md:flex-col items-start md:items-center ${isAr ? 'text-right' : 'text-left'} md:text-center group gap-2 md:gap-0">
                <div class="shrink-0 w-16 h-16 md:w-20 md:h-20 bg-slate-800 border-2 border-purple-500/30 rounded-full flex items-center justify-center md:mb-2 group-hover:border-purple-500 transition-all duration-300 shadow-lg">
                    <img src="/assets/svg/${step.icon}" class="w-6 h-6 md:w-8 md:h-8" alt="${step.title}">
                </div>
                <div class="flex flex-col">
                    <h4 class="text-white font-bold text-lg md:text-lg md:mb-3 leading-tight">${step.title}</h4>
                    <p class="text-gray-400 text-xs md:text-sm p-2">${step.desc}</p>
                </div>
            </div>

            ${!isLast ? `
                <div class="md:col-span-1 flex items-center justify-center md:h-20 ${isAr ? 'md:rotate-180 rotate-90 ' : ' rotate-90 md:rotate-0 '} opacity-50 self-start md:self-auto">
                    <img src="/assets/svg/right-arrow.svg" class="w-9 h-9" alt="arrow">
                </div>
            ` : ''}
        `;
    }).join('');
}

function createJobCard(job, ui, isAr) {
    return `
        <div class="border bg-slate-800/50 rounded-2xl border-slate-700 p-6 overflow-hidden opacity-0 animate-on-scroll ${isAr ? 'text-right' : 'text-left'}" style="animation-delay: ${job.delay};">
            <div class="flex flex-col md:flex-row ${isAr ? 'md:flex-row-reverse' : ''} items-start gap-6">
                <div class="flex-shrink-0 w-16 h-16 bg-purple-900/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                    <img src="${job.icon}" class="w-10 h-10 object-contain" alt="${job.title}" onerror="this.style.opacity='0.3'">
                </div>
                <div class="flex-grow w-full">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 class="text-xl font-bold text-white mb-1">${job.title}</h3>
                            <p class="text-gray-400 text-sm font-medium">${job.type}</p>
                        </div>
                        <button onclick="toggleDetails(this, '${ui.readMore}', '${ui.readLess}')" class="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                            ${ui.readMore}
                        </button>
                    </div>
                    <div class="max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out detail-content">
                        <div class="pt-6 mt-6 border-t border-gray-800 text-gray-300 text-sm leading-relaxed">
                            <p class="mb-4">${job.description}</p>
                            <ul class="list-disc ${isAr ? 'list-inside pr-4' : 'list-inside pl-4'} space-y-2">
                                ${job.requirements.map(req => `<li>${req}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="mt-6 flex flex-wrap items-center gap-4 ${isAr ? 'justify-start' : ''}">
                            <button onclick="toggleModal()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-3xl transition-all">
                                ${ui.applyBtn}
                            </button>
                            <a href="https://wa.me/201203075900?text=${encodeURIComponent(ui.waMsg + job.title)}"
                               target="_blank"
                               class="border-2 border-slate-700 text-slate-300 font-bold py-2 px-6 rounded-3xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                                ${ui.askBtn}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

// --- التحكم في الصفحة (Logic) ---

function toggleDetails(btn, readMoreTxt, readLessTxt) {
    const cardContent = btn.closest('.flex-grow').querySelector('.detail-content');
    const isExpanded = cardContent.classList.contains('expanded');
    
    if (isExpanded) {
        cardContent.style.maxHeight = '0px';
        cardContent.style.opacity = '0';
        cardContent.classList.remove('expanded');
        btn.innerText = readMoreTxt;
    } else {
        cardContent.style.maxHeight = cardContent.scrollHeight + 'px';
        cardContent.style.opacity = '1';
        cardContent.classList.add('expanded');
        btn.innerText = readLessTxt;
    }
}

function toggleModal() {
    const modal = document.getElementById('jobModal');
    const content = document.getElementById('modalContent');
    if (!modal) return;
    
    const isHidden = modal.classList.contains('hidden');
    modal.classList.toggle('hidden');
    
    if (!isHidden) {
        content.classList.add('animate-fade-in-up');
        document.addEventListener('keydown', closeModalOnEsc);
    } else {
        document.removeEventListener('keydown', closeModalOnEsc);
    }
}

function closeModalOnEsc(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('jobModal');
        if (modal && !modal.classList.contains('hidden')) {
            toggleModal();
        }
    }
}

// تشغيل الوظائف عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const currentLang = window.location.pathname.includes('/ar') ? 'ar' : 'en';
    const isAr = currentLang === 'ar';
    const langData = pageTranslations[currentLang];

    renderHiringSteps(langData, isAr);

    const positionsContainer = document.getElementById('positions-container');
    if (positionsContainer) {
        positionsContainer.style.direction = isAr ? 'rtl' : 'ltr';
        
        if (langData.jobs.length === 0) {
            positionsContainer.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <p class="text-xl mb-2">${langData.ui.noJobs}</p>
                    <p class="text-sm">${langData.ui.followUs}</p>
                </div>
            `;
        } else {
            positionsContainer.innerHTML = langData.jobs.map(job => createJobCard(job, langData.ui, isAr)).join('');
        }
    }
});