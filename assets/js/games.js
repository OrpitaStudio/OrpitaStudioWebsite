// 1. كود الـ Read More (شغال تمام)
const readMoreBtn = document.getElementById('read-more-btn');
if (readMoreBtn) {
  readMoreBtn.addEventListener('click', function() {
    const extraContent = document.getElementById('extra-content');
    const btnText = this.querySelector('span');
    const arrow = document.getElementById('arrow-icon');
    
    if (extraContent.classList.contains('hidden')) {
      extraContent.classList.remove('hidden');
      setTimeout(() => { extraContent.classList.add('opacity-100'); }, 10);
      btnText.textContent = 'Show Less';
      arrow.classList.add('rotate-180');
    } else {
      extraContent.classList.remove('opacity-100');
      setTimeout(() => { extraContent.classList.add('hidden'); }, 500);
      btnText.textContent = 'Read Full Story';
      arrow.classList.remove('rotate-180');
    }
  });
}

// 2. دالة الـ Gallery
function initGallery() {
  const main = document.getElementById('main-gallery-image');
  const thumbs = document.querySelectorAll('.gallery-thumb');
  
  if (!main || !thumbs.length) return;
  
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      if (t.classList.contains('gallery-active')) return;
      
      const src = t.dataset.image || t.src;
      const alt = t.dataset.alt || t.alt || '';
      
      main.style.opacity = '0';
      
      setTimeout(() => {
        main.src = src;
        main.alt = alt;
        main.style.opacity = '1';
      }, 200);
      
      thumbs.forEach(x => x.classList.remove('gallery-active', 'border-violet-500', 'ring-2', 'ring-violet-500'));
      t.classList.add('gallery-active', 'border-violet-500', 'ring-2', 'ring-violet-500');
    });
  });
}

// 3. السطر السحري (استدعاء الدالة)
// ده اللي كان ناقصك عشان الجاليري يشتغل أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', initGallery);