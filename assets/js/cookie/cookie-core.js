// Orpita Core Engine - Centralized Cookie & Event Management
window.Orpita = {
  // ثوابت لمنع الأخطاء الإملائية في أسماء الكوكيز
  KEYS: {
    CONSENT: 'orpita_consent',
    VISITS: 'orpita_visit_count',
    LAST_API: 'orpita_last_api_date',
    SURVEY_INVITE: 'orpita_survey_invitation'
  },
  
  // دوال الكوكيز الموحدة
  utils: {
    setCookie: (name, value, days) => {
      let d = new Date();
      d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
    },
    getCookie: (name) => {
      let v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
      return v ? v[2] : null;
    }
  }
};