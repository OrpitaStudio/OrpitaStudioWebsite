// state.js — Centralized State Management

const GameState = {
  // إعدادات الشبكة
  config: {
    cols: 5,
    rows: 5,
    mode: 'block' // 'block' | 'star' | 'switch' | 'mustBomb' | 'erase'
  },
  
  // محتوى الشبكة
  grid: {
    blocks: new Set(),
    //stars: new Set(),
    switches: new Set(),
    mustBombs: new Set()
  },
  
  // نتائج الحل
  results: {
    solutions: [],
    abortFlag: false,
    lastTotalCombinations: 0n,
    showHeatmap: false,
    heatmapType: 'all' // Default
  }
};

// اختصارات للتوافق مع الكود القديم (Optional getters)
// ولكن يفضل استخدام GameState.config.rows مباشرة في باقي الملفات
// للحفاظ على التوافق السريع الآن سنعرف متغيرات تشير للـ State
// (لكن في ui-core و solver تم التحديث لاستخدام GameState)