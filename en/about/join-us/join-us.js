// 1. بيانات السيكشن الخاص بطريقة التقديم
const hiringSteps = [
    { 
        title: "Apply", 
        desc: "Browse our open positions and submit your application. Feel free to apply for multiple roles that match your skills and experience.", 
        icon: "form-edit.svg" 
    },
    { 
        title: "Application Received", 
        desc: "You'll receive an email confirmation once we've received your application successfully.", 
        icon: "gmail.svg" 
    },
    { 
        title: "Initial Review", 
        desc: "Our HR team will review your application carefully. If your profile matches our needs, we'll reach out via WhatsApp within 3-7 business days to schedule an interview.", 
        icon: "whatsapp.svg" 
    },
    { 
        title: "Virtual Interview", 
        desc: "Join us for a conversation on Google Meet. Please ensure you have a stable internet connection and a quiet environment.", 
        icon: "google-meet.svg" 
    },
    { 
        title: "Welcome Aboard", 
        desc: "Congratulations! If selected, you'll receive an offer via WhatsApp and a detailed onboarding email to help you get started with the team.", 
        icon: "done.svg" 
    }
];

// 2. قاعدة بيانات الوظائف
const jobs = [
    {
        title: "Unity Game Developer",
        type: "Game dev • Remote",
        icon: "/assets/svg/unity.svg",
        description: "Hello, we are looking for a Unity dev to join our team.",
        requirements: ["Unity developers only", "Experience with C#", "Problem solver"],
        delay: "0.2s"
    },
    {
        title: "2D Game Artist",
        type: "Art • Remote",
        icon: "/assets/svg/digital-artist.svg",
        description: "Creative artist needed for unique puzzle aesthetics.",
        requirements: ["Proficient in Photoshop/Illustrator", "Experience in 2D animation"],
        delay: "0.4s"
    }
];

// --- وظائف البناء (Generators) ---

function renderHiringSteps() {
    const container = document.getElementById('hiring-steps-container');
    if (!container) return;
    
    // تقسيم الشبكة لـ 9 أعمدة متساوية في اللابتوب
    container.className = "grid grid-cols-1 md:grid-cols-[repeat(29,minmax(0,1fr))] items-start gap-y-10 md:gap-y-0 w-full";
    
    container.innerHTML = hiringSteps.map((step, index) => {
        const isLast = index === hiringSteps.length - 1;
        return `
            <div class="md:col-span-5 flex flex-row md:flex-col items-start md:items-center text-left md:text-center group gap-5 md:gap-0">
                <div class="shrink-0 w-16 h-16 md:w-20 md:h-20 bg-slate-800 border-2 border-purple-500/30 rounded-full flex items-center justify-center md:mb-6 group-hover:border-purple-500 transition-all duration-300 shadow-lg">
                    <img src="/assets/svg/${step.icon}" class="w-6 h-6 md:w-8 md:h-8">
                </div>
                <div class="flex flex-col">
                    <h4 class="text-white font-bold text-lg md:text-lg md:mb-2 leading-tight">${step.title}</h4>
                    <p class="text-gray-400 text-xs md:text-sm px-2">${step.desc}</p>
                </div>
            </div>

            ${!isLast ? `
                <div class="md:col-span-1 flex items-center justify-center md:h-20 md:rotate-0 rotate-90 opacity-20 self-start md:self-auto pt-6 md:pt-0">
                    <img src="/assets/svg/right-arrow.svg" class="w-6 h-6">
                </div>
            ` : ''}
        `;
    }).join('');
}

function createJobCard(job) {
    return `
        <div class="border bg-slate-800/50 rounded-2xl border-slate-700 p-6 overflow-hidden opacity-0 animate-on-scroll" style="animation-delay: ${job.delay};">
            <div class="flex flex-row items-start gap-6">
                <div class="flex-shrink-0 w-16 h-16 bg-purple-900/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                    <img src="${job.icon}" class="w-10 h-10 object-contain" alt="${job.title}">
                </div>
                <div class="flex-grow">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 class="text-xl font-bold text-white mb-1">${job.title}</h3>
                            <p class="text-gray-400 text-sm font-medium">${job.type}</p>
                        </div>
                        <button onclick="toggleDetails(this)" class="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                            Read More ▼
                        </button>
                    </div>
                    <div class="max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-in-out detail-content">
                        <div class="pt-6 mt-6 border-t border-gray-800 text-gray-300 text-sm leading-relaxed">
                            <p class="mb-4">${job.description}</p>
                            <ul class="list-disc list-inside space-y-2">
                                ${job.requirements.map(req => `<li>${req}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="mt-6 flex flex-wrap items-center gap-4">
                            <button onclick="toggleModal()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-3xl transition-all">
                                Apply for this Role
                            </button>
                            <a href="https://wa.me/201203075900?text=Hello%20Orpita%20Studio!%20I'm%20interested%20in%20the%20${job.title}%20role..."
                               target="_blank"
                               class="border-2 border-slate-700 text-slate-300 font-bold py-2 px-6 rounded-3xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                               Ask about this role
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

// --- التحكم في الصفحة (Logic) ---

function toggleDetails(btn) {
    const cardContent = btn.closest('.flex-grow').querySelector('.detail-content');
    const isExpanded = cardContent.style.maxHeight !== '0px' && cardContent.style.maxHeight !== '';
    
    if (isExpanded) {
        cardContent.style.maxHeight = '0px';
        cardContent.style.opacity = '0';
        btn.innerText = 'Read More ▼';
    } else {
        cardContent.style.maxHeight = '1000px'; 
        cardContent.style.opacity = '1';
        btn.innerText = 'Read Less ▲';
    }
}

function toggleModal() {
    const modal = document.getElementById('jobModal');
    const content = document.getElementById('modalContent');
    if (!modal) return;

    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        content.classList.add('animate-fade-in-up'); 
    } else {
        modal.classList.add('hidden');
        content.classList.remove('animate-fade-in-up');
    }
}

// تشغيل الوظائف عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    renderHiringSteps();
    const positionsContainer = document.getElementById('positions-container');
    if (positionsContainer) {
        positionsContainer.innerHTML = jobs.map(job => createJobCard(job)).join('');
    }
});