/**
 * ui-core.js
 * Core UI logic (Optimized for Performance & Centralized State):
 * - Grid building, cell interactions, modes.
 * - Interaction with GameState instead of loose globals.
 * - Async Solver handling with UI locking.
 */

/* ------------------------------------------------------------------
   I. DOM Elements & Initialization
   ------------------------------------------------------------------ */
const gridEl = document.getElementById('grid');
const statusMessageEl = document.getElementById('statusMessage');
const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
const countSymCheckbox = document.getElementById('countSym');
const countSymStatus = document.getElementById('countSymStatus');

// Mode buttons
const modeBlockBtn = document.getElementById('modeBlock');
const modeStarBtn = document.getElementById('modeStar');
const modeSwitchBtn = document.getElementById('modeSwitch');
const modeMustBombBtn = document.getElementById('modeMustBomb');
const modeEraseBtn = document.getElementById('modeErase');

/* ------------------------------------------------------------------
   II. Basic UI / Status helpers
   ------------------------------------------------------------------ */

function showStatus(message, isError = false) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
  statusMessageEl.style.display = 'block';

  if (!isError) setTimeout(() => { statusMessageEl.style.display = 'none'; }, 3000);
}

function setMode(m) {
  // Update global state
  GameState.config.mode = m;

  [modeBlockBtn, modeStarBtn, modeSwitchBtn, modeMustBombBtn, modeEraseBtn].forEach(b => b.classList.remove('active'));
  if (m === 'block') modeBlockBtn.classList.add('active');
  if (m === 'star') modeStarBtn.classList.add('active');
  if (m === 'switch') modeSwitchBtn.classList.add('active');
  if (m === 'mustBomb') modeMustBombBtn.classList.add('active');
  if (m === 'erase') modeEraseBtn.classList.add('active');
}

function resetProgress() {
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressPct').textContent = '0%';
  document.getElementById('timeInfo').textContent = 'Ready';
  document.getElementById('combCount').textContent = '—';
  
  document.getElementById('cancel').disabled = true;
  statusMessageEl.style.display = 'none';
}

/* ------------------------------------------------------------------
   III. Grid build & interaction
   ------------------------------------------------------------------ */

function buildGrid() {
  // 1. Update State Configuration
  GameState.config.cols = Math.max(2, parseInt(document.getElementById('gridCols').value, 10) || 5);
  GameState.config.rows = Math.max(2, parseInt(document.getElementById('gridRows').value, 10) || 5);

  // 2. Update UI Layout
  gridEl.style.gridTemplateColumns = `repeat(${GameState.config.cols}, 44px)`;

  // 3. Reset Results in State
  GameState.results.solutions = [];
  GameState.results.lastTotalCombinations = 0n;

  // 4. Re-render
  renderGrid();
  updateCounts(); // From analysis-viewer.js
  clearAnalysis(); // From analysis-viewer.js
  resetProgress();
  updateExportData(); // From analysis-viewer.js
  updateDifficultyAnalysis(); // From analysis-viewer.js
  
  showStatus('Grid rebuilt with new dimensions');
}

function renderGrid() {
  const total = GameState.config.rows * GameState.config.cols;
  gridEl.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'cell heatmap-cell';
    d.dataset.i = i; 

    const idxSpan = document.createElement('span');
    idxSpan.className = 'cell-index';
    idxSpan.textContent = i;

    const overlay = document.createElement('div');
    overlay.className = 'heatmap-overlay';
    overlay.id = `heatmap-${i}`;
    overlay.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'cell-content';

    d.appendChild(idxSpan);
    d.appendChild(overlay);
    d.appendChild(content);

    d.addEventListener('click', () => cellClicked(i));

    gridEl.appendChild(d);
  }

  refreshGridVisual();
}

function cellClicked(i) {
  const mode = GameState.config.mode;
  // Destructure sets from GameState for cleaner code
  const { blocks, stars, switches, mustBombs } = GameState.grid;

  if (mode === 'block') {
    if (blocks.has(i)) blocks.delete(i);
    else { blocks.add(i); stars.delete(i); mustBombs.delete(i); switches.delete(i); }
  } else if (mode === 'star') {
    if (blocks.has(i)) return;
    if (stars.has(i)) stars.delete(i);
    else { stars.add(i); mustBombs.delete(i); }
  } else if (mode === 'switch') {
    if (blocks.has(i)) return;
    if (switches.has(i)) switches.delete(i);
    else { switches.add(i); stars.delete(i); mustBombs.delete(i); }
  } else if (mode === 'mustBomb') {
    if (blocks.has(i) || switches.has(i)) return;
    if (mustBombs.has(i)) mustBombs.delete(i);
    else { mustBombs.add(i); stars.delete(i); }
  } else { // erase
    blocks.delete(i); stars.delete(i); mustBombs.delete(i); switches.delete(i);
  }

  refreshGridVisual();
  updateCounts();
  updateExportData();
  updateDifficultyAnalysis();
}

/* ------------------------------------------------------------------
   IV. Visual refresh
   ------------------------------------------------------------------ */
function refreshGridVisual(solution = null) {
  const total = GameState.config.rows * GameState.config.cols;
  const { blocks, stars, switches, mustBombs } = GameState.grid;

  let normalBombSet = new Set();
  let powerBombSet  = new Set();
  let negativeBombSet = new Set();
  let numbers = {};
  let currentBlocks;

  if (solution) {
    // Solution View
    normalBombSet = new Set(solution.normalBombs || []);
    powerBombSet  = new Set(solution.powerBombs || []);
    negativeBombSet = new Set(solution.negativeBombs || []);
    const blockedSwitches = new Set(solution.switchState || []);
    currentBlocks = new Set([...blocks, ...blockedSwitches]);

    // Compute neighbors locally for visualization
    // (Note: Ideally this logic should be shared, but keeping it here for UI instant feedback is fine)
    const neighbors = []; 
    for(let k=0; k<total; k++) neighbors[k] = [];
    for(let k=0; k<total; k++) {
        if(currentBlocks.has(k)) continue;
        const r = Math.floor(k/GameState.config.cols), c = k%GameState.config.cols;
        for(let dr=-1; dr<=1; dr++){
            for(let dc=-1; dc<=1; dc++){
                if(dr===0 && dc===0) continue;
                const rr=r+dr, cc=c+dc;
                if(rr>=0 && rr<GameState.config.rows && cc>=0 && cc<GameState.config.cols){
                    const idx = rr*GameState.config.cols + cc;
                    if(!currentBlocks.has(idx)) neighbors[k].push(idx);
                }
            }
        }
    }

    for (let i = 0; i < total; i++) numbers[i] = 0;
    const allBombs = new Set([...normalBombSet, ...powerBombSet, ...negativeBombSet]);

    normalBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] += 1; });
    powerBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] += 2; });
    negativeBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] -= 1; });
  } else {
    // Design Mode
    currentBlocks = blocks;
  }

  for (let i = 0; i < total; i++) {
    const el = gridEl.children[i];
    const content = el.querySelector('.cell-content');
    const heatmap = el.querySelector('.heatmap-overlay');

    el.className = 'cell heatmap-cell';
    content.className = 'cell-content';
    content.innerHTML = '';
    if (heatmap) heatmap.style.display = 'none';

    const isBomb = solution && (normalBombSet.has(i) || powerBombSet.has(i) || negativeBombSet.has(i));

    if (isBomb) {
      if (normalBombSet.has(i)) { el.classList.add('bomb'); content.textContent = 'B'; }
      else if (powerBombSet.has(i)) { el.classList.add('bomb2'); content.textContent = 'P'; }
      else if (negativeBombSet.has(i)) { el.classList.add('bomb-neg'); content.textContent = 'N'; }

      if (mustBombs.has(i)) {
        el.classList.add('is-must-bomb');
        content.textContent = 'MB'; 
      }
      if (switches.has(i)) el.classList.add('is-switch-bomb');

    } else if (currentBlocks.has(i)) {
      if (switches.has(i)) {
        el.classList.add('switch-blocked'); content.textContent = 'S';
      } else {
        el.classList.add('block'); content.textContent = 'X';
      }

    } else if (solution && numbers[i] !== 0) {
      const num = document.createElement('span');
      num.className = 'number';
      num.textContent = numbers[i];
      content.appendChild(num);
      el.classList.add('affected');

    } else {
      if (switches.has(i)) {
        el.classList.add('switch-off'); content.textContent = 'S';
      } else if (stars.has(i)) {
        el.classList.add('star'); content.textContent = '★';
      } else if (mustBombs.has(i)) {
        el.classList.add('must-bomb'); content.textContent = 'MB';
      } else {
        content.textContent = '';
      }
    }
  }
}

function viewSolution(sol) { refreshGridVisual(sol); }

/* ------------------------------------------------------------------
   V. Star Condition Editor
   ------------------------------------------------------------------ */

const CONDITION_TEMPLATES = {
  getScore: {
    label: 'Required Sum:',
    input: id => `<input type="number" data-key="value" id="${id}-value" placeholder="e.g., 23" style="width:100px;"/>`,
    parser: inputs => ({ type: 'getScore', value: Number(inputs.value) })
  },
  emptyCellsCount: {
    label: 'Required Zero-Value Cell Count:',
    input: id => `<input type="number" data-key="value" id="${id}-value" min="0" placeholder="e.g., 5" style="width:100px;"/>`,
    parser: inputs => ({ type: 'emptyCellsCount', value: Number(inputs.value) })
  },
  anyCellValue: {
    label: 'Specific Value Required:',
    input: id => `<input type="number" data-key="value" id="${id}-value" placeholder="e.g., 10" style="width:100px;"/>`,
    parser: inputs => ({ type: 'anyCellValue', value: Number(inputs.value) })
  },
  placeBombAt: {
    label: 'Cell IDs (comma separated):',
    input: id => `<input type="text" data-key="cells" id="${id}-cells" placeholder="e.g., 6, 13, 22" style="flex-grow:1;"/>`,
    parser: inputs => {
      const cells = String(inputs.cells).split(',').map(s => s.trim()).filter(Boolean).map(Number);
      if (cells.some(isNaN)) { showStatus("Error: Place Bomb At IDs must be numbers.", true); return null; }
      return { type: 'placeBombAt', cells };
    }
  },
  cellValues: {
    label: 'Cell ID & Value Pairs (ID1, Val1, ...):',
    input: id => `<input type="text" data-key="requirements" id="${id}-req" placeholder="e.g., 9, 10, 6, 10" style="flex-grow:1;"/>`,
    parser: inputs => {
      const parts = String(inputs.requirements).split(',').map(s => s.trim()).filter(Boolean).map(Number);
      if (parts.some(isNaN) || parts.length % 2 !== 0) {
        showStatus("Error: Cell Values must be ID, Value pairs.", true); return null;
      }
      const reqs = [];
      for (let i = 0; i < parts.length; i += 2) reqs.push({ id: parts[i], value: parts[i + 1] });
      return { type: 'cellValues', requirements: reqs };
    }
  },
  setSwitches: {
    label: 'Switch ID & State Pairs (ID1, ON/OFF, ...):',
    input: id => `<input type="text" data-key="requirements" id="${id}-req" placeholder="e.g., 5, ON, 6, OFF" style="flex-grow:1;"/>`,
    parser: inputs => {
      const parts = String(inputs.requirements).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length % 2 !== 0) { showStatus("Error: Switch States format invalid.", true); return null; }
      const reqs = [];
      for (let i = 0; i < parts.length; i += 2) {
        const id = Number(parts[i]); const state = String(parts[i + 1]).toUpperCase();
        if (isNaN(id) || (state !== 'ON' && state !== 'OFF')) {
          showStatus(`Error: Switch data invalid (${parts[i]}, ${parts[i+1]}).`, true); return null;
        }
        reqs.push({ id, state: `SWITCH_${state}` });
      }
      return { type: 'setSwitches', requirements: reqs };
    }
  }
};

let conditionIdCounter = 0;

function handleConditionTypeChange(event) {
  const selectEl = event.target;
  const conditionRow = selectEl.closest('.condition-row');
  const valueArea = conditionRow.querySelector('.condition-value-area');
  const type = selectEl.value;

  valueArea.innerHTML = '';
  if (type && CONDITION_TEMPLATES[type]) {
    const template = CONDITION_TEMPLATES[type];
    const uniqueId = `cond-${conditionIdCounter++}`;
    valueArea.innerHTML = `
      <div style="display:flex;flex-direction:column;width:100%">
        <label class="small" style="font-weight:bold">${template.label}</label>
        ${template.input(uniqueId)}
      </div>
    `;
  } else {
    valueArea.innerHTML = '<span class="small" style="color:var(--muted)">Select a type to configure.</span>';
  }
}

function injectSingleConditionRow(starId) {
  const containerEl = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
  if (!containerEl) return;
  const template = document.getElementById('conditionRowTemplate');
  const clone = document.importNode(template.content, true);
  const row = clone.querySelector('.condition-row');
  const selectEl = row.querySelector('.condition-type-select');
  selectEl.addEventListener('change', handleConditionTypeChange);
  const removeBtn = row.querySelector('.remove-condition-btn');
  if (removeBtn) removeBtn.style.display = 'none';
  containerEl.appendChild(row);
}

function getStarConditionsFromUI() {
  const allStarConditions = [];
  for (let starId = 1; starId <= 3; starId++) {
    const containerEl = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
    if (!containerEl) { allStarConditions.push([]); continue; }
    const row = containerEl.querySelector('.condition-row');
    if (!row) { allStarConditions.push([]); continue; }

    const typeSelect = row.querySelector('.condition-type-select');
    const type = typeSelect.value;
    if (!type) { allStarConditions.push([]); continue; }

    const template = CONDITION_TEMPLATES[type];
    const valueArea = row.querySelector('.condition-value-area');
    const inputs = {};
    let valid = true;

    valueArea.querySelectorAll('[data-key]').forEach(inputEl => {
      const key = inputEl.getAttribute('data-key');
      const value = String(inputEl.value || '').trim();
      if (value === '') {
        showStatus(`Error: condition input empty in Star ${starId}.`, true);
        valid = false;
        return;
      }
      inputs[key] = value;
    });

    if (!valid) return [];

    const conditionObject = template.parser(inputs);
    if (!conditionObject) { return []; }
    allStarConditions.push([conditionObject]);
  }
  return allStarConditions;
}

function initStarEditor() {
  for (let starId = 1; starId <= 3; starId++) injectSingleConditionRow(starId);
}

/* ------------------------------------------------------------------
   VI. Event listeners & initial boot
   ------------------------------------------------------------------ */

modeBlockBtn.addEventListener('click', () => setMode('block'));
modeStarBtn.addEventListener('click', () => setMode('star'));
modeSwitchBtn.addEventListener('click', () => setMode('switch'));
modeMustBombBtn.addEventListener('click', () => setMode('mustBomb'));
modeEraseBtn.addEventListener('click', () => setMode('erase'));

document.getElementById('build').addEventListener('click', buildGrid);
document.getElementById('clear').addEventListener('click', () => {
  const { blocks, stars, switches, mustBombs } = GameState.grid;
  blocks.clear(); stars.clear(); mustBombs.clear(); switches.clear();
  refreshGridVisual(); updateCounts(); updateExportData(); updateDifficultyAnalysis();
  showStatus('All special cells cleared');
});
document.getElementById('gridCols').addEventListener('change', buildGrid);
document.getElementById('gridRows').addEventListener('change', buildGrid);

// --- Updated Solver Controller for Web Worker Support ---
document.getElementById('solve').addEventListener('click', async () => {
  const solveBtn = document.getElementById('solve');
  const cancelBtn = document.getElementById('cancel');

  // 1. Lock UI
  resetProgress();
  solveBtn.disabled = true;
  solveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Working...';
  cancelBtn.disabled = false;

  const startTime = performance.now();

  try {
    // 2. Wait for Worker via Controller
    await solveHandler(); 
    
    // 3. Analysis
    handlePostSolveAnalysis(startTime); 

  } catch (err) {
    console.error("Solver Error:", err);
    // Error handled in status
  } finally {
    // 4. Unlock UI
    solveBtn.disabled = false;
    solveBtn.innerHTML = '<i class="fas fa-play"></i> SOLVE';
    cancelBtn.disabled = true;
  }
});

document.getElementById('cancel').addEventListener('click', () => {
    cancelSolver(); // Calls the new controller cancellation
});

toggleHeatmapBtn.addEventListener('click', () => {
  GameState.results.showHeatmap = !GameState.results.showHeatmap;
  toggleHeatmapBtn.textContent = GameState.results.showHeatmap ? 'Hide Heatmap' : 'Show Heatmap';
  refreshGridVisual();
});

countSymCheckbox.addEventListener('change', () => {
  countSymStatus.textContent = countSymCheckbox.checked ? '✓ Counting symmetries' : '✗ Not counting symmetries';
});

// ui-core.js (تعديل مستمع الحدث لـ exportBtn)

document.getElementById('exportBtn').addEventListener('click', async () => {
  // 1. قراءة الاسم الحالي كقيمة افتراضية
  let currentFileName = document.getElementById('exportFileName').value.trim() || 'level_custom';
  
  // 2. عرض نافذة مطالبة (Prompt) لاسم المستوى (remoteId)
  const levelName = prompt("Enter Level ID (used for remoteId):", currentFileName);
  
  if (!levelName) {
    if (typeof showStatus === 'function') showStatus('Export cancelled.', true);
    return;
  }
  
  // 3. توليد JSON بالهيكلة الجديدة والاسم المُدخَل (تُنفذ في analysis-viewer.js)
  document.getElementById('exportFileName').value = levelName;
  if (typeof updateExportData === 'function') {
    updateExportData();
  } else {
    if (typeof showStatus === 'function') showStatus('Error: updateExportData function not found!', true);
    return;
  }
  
  // 4. قراءة سلسلة JSON المُحدَّثة
  let rawJson = document.getElementById('exportData').value;
  let jsonObj;
  try {
    jsonObj = JSON.parse(rawJson);
  } catch (e) {
    if (typeof showStatus === 'function') showStatus('Invalid JSON data!', true);
    return;
  }
  
  // JSON منسق
  let formattedJson = JSON.stringify(jsonObj, null, 2);
  
  const initialCellsRegex = /\{\n\s*"id": (\d+),\n\s*"state": "(.*?)"\n\s*\}/g;
  
  formattedJson = formattedJson.replace(initialCellsRegex, (match, id, state) => {
    // هنا يتم تحويل الكائن متعدد الأسطر إلى: { "id": 1, "state": "BLOCK" }
    return `{ "id": ${id}, "state": "${state}" }`;
  });
  
  // ... تابع باقي الكود (النسخ والتحميل) باستخدام formattedJson
  // تعديل placementIds لسطر واحد
  if (jsonObj.solution && Array.isArray(jsonObj.solution.placementIds)) {
    const singleLinePlacement = JSON.stringify(jsonObj.solution.placementIds);
    formattedJson = formattedJson.replace(
      /"placementIds": \[[^\]]*\]/,
      `"placementIds": ${singleLinePlacement}`
    );
  }
  if (!formattedJson) {
    if (typeof showStatus === 'function') showStatus('No data to export after generation!', true);
    return;
  }
  
  // 5. 🆕 سؤال المستخدم: نسخ أم تصدير؟
  const shouldCopy = confirm("Do you want to copy the JSON content to the clipboard? (Click 'Cancel' to download the file instead.)");
  
  if (shouldCopy) {
    // 6. 🆕 منطق النسخ إلى الحافظة
    try {
      await navigator.clipboard.writeText(formattedJson);
      if (typeof showStatus === 'function') showStatus('JSON content copied to clipboard successfully!');
      return; // الخروج بعد النسخ بنجاح
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      // الفشل في النسخ (قد يحدث بسبب إعدادات المتصفح)
      if (typeof showStatus === 'function') showStatus('Failed to copy to clipboard. Proceeding to download...', true);
      // المتابعة إلى منطق التحميل في حالة الفشل
    }
  }
  
  // 7. منطق التصدير/التحميل (يتم الوصول إليه إذا لم يختار المستخدم النسخ أو فشل النسخ)
  let fileName = levelName;
  if (!fileName.endsWith('.json')) fileName += '.json';
  
  if ('showSaveFilePicker' in window) {
    try {
      const options = {
        suggestedName: fileName,
        types: [{
          description: 'Minesweeper Level JSON',
          accept: { 'application/json': ['.json'] },
        }],
      };
      const handle = await window.showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(formattedJson);
      await writable.close();
      if (typeof showStatus === 'function') showStatus(`File saved successfully!`);
      return;
    } catch (err) {
      if (err.name !== 'AbortError') console.error('File System API failed:', err);
      else return;
    }
  }
  
  // Fallback Download
  const blob = new Blob([formattedJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showStatus === 'function') showStatus(`File downloaded.`);
});
// Initial boot sequence
buildGrid();
resetProgress();
initStarEditor();