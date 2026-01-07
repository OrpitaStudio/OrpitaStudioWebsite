/**
 * Global Script for Component Loading and Dynamic Link Management (Multi-language)
 * File: assets/js/load.js
 */

// --- 0. TRANSLATION DATA (i18n) ---
const translations = {
    'en': {
        // Navigation Links
        'nav_home': 'Home',
        'nav_games': 'Games',
        'nav_minesetter': 'Minesetter',
        'nav_about': 'About Us',
        'nav_contact': 'Contact',
        // Language Switchers
        'lang_ar': 'العربية (AR)',
        'lang_en': 'English (EN)',
        // Footer Text
        'copyright_text': 'All rights reserved.'
    },
    'ar': {
        // Navigation Links
        'nav_home': 'الرئيسية',
        'nav_games': 'الألعاب',
        'nav_minesetter': 'ماينسيتر',
        'nav_about': 'من نحن',
        'nav_contact': 'اتصل بنا',
        // Language Switchers
        'lang_ar': 'العربية (AR)',
        'lang_en': 'English (EN)',
        // Footer Text
        'copyright_text': 'جميع الحقوق محفوظة.'
    }
};

// --- 1. CORE LOGIC FUNCTIONS ---

/**
 * Determines the current language from the URL path.
 * @returns {string} The current language ('en' or 'ar').
 */
function getCurrentLanguage() {
    const path = window.location.pathname;
    return path.includes('/ar/') ? 'ar' : 'en';
}

/**
 * Fetches HTML content from a specified file and inserts it into a target element.
 * After successful insertion, runs dynamic functions (links, translation, year update).
 * * @param {string} targetId - The ID of the container element (e.g., 'footer-placeholder').
 * @param {string} filePath - The relative path to the HTML component file (e.g., '../assets/html/footer.html').
 */
function loadComponent(placeholderId, url, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const placeholder = document.getElementById(placeholderId);
            if (placeholder) {
                placeholder.innerHTML = data;
                
                // ذكاء اصطناعي صغير: ترجم وحدث اللينكات للمكون ده بس فوراً
                applyTranslations(placeholder);
                setDynamicLinks(placeholder);
                
                if (callback) callback();
            }
        })
        .catch(err => console.error(`Error loading ${url}:`, err));
}

// التعديل في نهاية ملف load.js



/**
 * Updates internal links ('data-lang-link') and language switchers ('data-lang-target')
 * based on the current language detected.
 */
function setDynamicLinks(container = document) {
    const userLang = getCurrentLanguage();
    const path = window.location.pathname;
    
    // 1. Update Language Switcher Links
    const langSwitchers = container.querySelectorAll('[data-lang-target]');
    langSwitchers.forEach(link => {
        const targetLang = link.getAttribute('data-lang-target');
        const pathSegments = path.split('/');
        const currentPageFile = pathSegments[pathSegments.length - 1] || 'index.html';
        
        // Set the new absolute path (e.g., /ar/index.html)
        link.href = `/${targetLang}/${currentPageFile}`;
        
        if (targetLang === userLang) {
            // Highlight current language link
            link.classList.remove('text-gray-400', 'hover:text-violet-400');
            link.classList.add('text-violet-300', 'cursor-default');
            link.addEventListener('click', function(e) { e.preventDefault(); });
        }
    });
    
    // 2. Update CORE DYNAMIC LINKS (data-lang-link)
    const dynamicLinks = container.querySelectorAll('[data-lang-link]');
    
    dynamicLinks.forEach(linkElement => {
        const pagePath = linkElement.getAttribute('data-lang-link');
        const currentHref = linkElement.getAttribute('href');
        
        // CASE 1: External Links (https://example.com) - Ignored
        if (currentHref && (currentHref.startsWith('http') || currentHref.startsWith('https'))) {
            return;
        }
        
        if (pagePath) {
            let finalPathSegment;
            
            if (pagePath === 'home') {
                finalPathSegment = 'index.html';
            
            } else {
                finalPathSegment = pagePath;
            }
            
            // Apply the ABSOLUTE DYNAMIC PATH (e.g., /en/games.html)
            linkElement.href = `/${userLang}/${finalPathSegment}`;
        }
    });
}


/**
 * Applies the correct text content based on the detected language and 'data-i18n' keys.
 * Also sets the document's 'lang' and 'dir' attributes for accessibility and styling.
 */
function applyTranslations(container = document) {
    const userLang = getCurrentLanguage();
    const currentTranslations = translations[userLang];
    
    if (!currentTranslations) return;
    
    // Set text direction based on language
    document.documentElement.setAttribute('lang', userLang);
    document.documentElement.setAttribute('dir', userLang === 'ar' ? 'rtl' : 'ltr');
    
    // Find all elements with the translation key
    const translatableElements = container.querySelectorAll('[data-i18n]');
    
    translatableElements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = currentTranslations[key];
        
        if (translation) {
            element.textContent = translation;
        } else {
            console.warn(`Missing translation key: ${key} for language ${userLang}`);
        }
    });
}

// --- 2. HELPER FUNCTION ---

/**
 * Helper function to update the year in the footer dynamically.
 */
function updateCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}


// --- 3. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // نستخدم async/await عشان نضمن الترتيب
    try {
        // 1. حمل الهيدر الأول
        await new Promise(resolve => loadComponent('header-placeholder', '/assets/html/header.html', resolve));
        if (typeof initMainApp === 'function') initMainApp();
        
        // 2. حمل الفوتر بعده
        await new Promise(resolve => loadComponent('footer-placeholder', '/assets/html/footer.html', resolve));
        updateCurrentYear();
        
        // في الآخر خالص شغل سكريبت الصفحة
        if (typeof initIndexPage === 'function') initIndexPage();
        
    } catch (error) {
        console.error("Layout loading failed:", error);
    }
});