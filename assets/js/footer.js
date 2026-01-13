const translations = {
  'en': {
    'footer_studio':'Studio',
    'footer_explore':'Explore',
    'nav_home': 'Home',
    'nav_games': 'Games',
    'nav_news': 'News',
    'nav_about': 'About Us',
    'nav_contact': 'Contact',
    'footer_lang': 'Language',
    'lang_ar': 'العربية (ar)',
    'lang_en': 'English',
    'footer_lang_note': 'Choose your preferred language for the best experience.',
    'copyright_text': 'All rights reserved.',
    'terms_text': 'Terms & Privacy',
    'footer_desc' : 'Crafting immersive worlds and unforgettable experiences. Join us on our journey to redefine gaming boundaries.'
  },
'ar': {
    'footer_studio': 'الاستوديو',
    'footer_explore': 'استكشف',
    'nav_home': 'الرئيسية',
    'nav_games': 'الألعاب',
    'nav_news': 'الأخبار',
    'nav_about': 'من نحن',
    'nav_contact': 'تواصل معنا',
    'footer_lang': 'اللغة',
    'lang_ar': 'العربية',
    'lang_en': 'English',
    'footer_lang_note': 'اختر لغتك المفضلة للحصول على أفضل تجربة.',
    'copyright_text': 'جميع الحقوق محفوظة.',
    'terms_text': 'الشروط والخصوصية',
    'footer_desc': 'نصنع عوالم غامرة وتجارب لا تُنسى. انضم لرحلتنا لإعادة تعريف حدود الألعاب.'
  }
};

const getCurrentLanguage = () => window.location.pathname.includes('/ar/') ? 'ar' : 'en';

function applyTranslations(container = document) {
  const lang = getCurrentLanguage();
  const data = translations[lang];
  if (!data) return;
  
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  
  container.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    data[key] ? (el.textContent = data[key]) : console.warn(`Missing key: ${key}`);
  });
}

function setDynamicLinks(container = document) {
  const userLang = getCurrentLanguage();
  const path = window.location.pathname;
  
  // 1. Language Switchers logic
  container.querySelectorAll('[data-lang-target]').forEach(link => {
    const target = link.getAttribute('data-lang-target');
    const file = path.split('/').pop() || 'index.html';
    link.href = `/${target}/${file}`;
    
    if (target === userLang) {
      link.classList.remove('text-gray-400', 'hover:text-violet-400');
      link.classList.add('text-violet-300', 'cursor-default');
      link.onclick = (e) => e.preventDefault();
    }
  });
  
  // 2. Internal Dynamic Links logic
  container.querySelectorAll('[data-lang-link]').forEach(el => {
    const href = el.getAttribute('href');
    if (href && (href.startsWith('http'))) return;
    
    const page = el.getAttribute('data-lang-link');
    el.href = `/${userLang}/${page === 'home' ? 'index.html' : page}`;
  });
}

function updateCurrentYear() {
    const el = document.getElementById('current-year');
    if (el) el.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. ابني البيانات الأول (الترتيب مهم جداً)
  try {
    initScrollAnimations();
  } catch (e) {
    console.error("Error rendering data:", e);
  }
});