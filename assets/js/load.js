 function loadComponent(id, url, callback) {
    fetch(url)
        .then(res => res.text())
        .then(html => {
            const target = document.getElementById(id);
            if (target) {
                target.innerHTML = html;
                applyTranslations(target);
                setDynamicLinks(target);
                if (callback) callback();
            }
        })
        .catch(err => console.error(`Failed to load ${url}:`, err));
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Step 1: Load Header & Initialize Core UI
        await new Promise(res => loadComponent('header-placeholder', '/assets/html/header.html', res));
        if (typeof renderNav === 'function') renderNav();
        if (typeof initMainApp === 'function') initMainApp();
        
        // Step 2: Load Footer & Set Date
        await new Promise(res => loadComponent('footer-placeholder', '/assets/html/footer.html', res));
        updateCurrentYear();
        
        // Step 3: Trigger Page Specific Logic
        if (typeof initIndexPage === 'function') initIndexPage();
        
    } catch (error) {
        console.error("Critical: Layout loading failed:", error);
    }
});