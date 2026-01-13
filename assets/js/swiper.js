function initSwiper() {
  if (typeof Swiper === 'undefined') return;
  
  new Swiper('.game-carousel', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    
    /* الإعدادات اللي طلبتها: خطي وبيرجع للأول */
    loop: false,
    rewind: true, // هيرجع للأول بسلاسة لما يخلص
    
    slidesPerView: "auto",
    spaceBetween: 30, // زودنا المسافة شوية عشان الـ 3D يبان أنضف
    
    /* سرعة الحركة: خليتها 800ms (أقل من ثانية) عشان التوازن */
    speed: 1500,
    
    coverflowEffect: {
      rotate: 0, // مفيش دوران (مودرن أكتر)
      stretch: 0, // مفيش شد
      depth: 80, // عمق متوسط عشان ميبقاش "أوفر" في الشاشات
      modifier: 1, // قوة التأثير
      slideShadows: false, // شيلنا الضل عشان أنت عامل ستايلك الخاص
    },
    
    autoplay: {
      delay: 5000, // وقت كافي لرؤية اللعبة
      disableOnInteraction: false,
      pauseOnMouseEnter: true, // يحترم وقوف المستخدم بالماوس
    },
    
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true, // حركة النقط بتبقى تفاعلية وشكلها أذكى
    },
    
    /* مراقبة التغييرات لضمان الأداء على التابلت */
    observer: true,
    observeParents: true,
    watchSlidesProgress: true,
    
    /*breakpoints: تعديل العمق حسب الجهاز */
    breakpoints: {
      320: {
        coverflowEffect: {
          depth: 40,
          modifier: 1,
        }
      },
      1024: {
        coverflowEffect: {
          depth: 80,
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initSwiper();
    } catch (e) {
        console.error("Error rendering data:", e);
    }
});