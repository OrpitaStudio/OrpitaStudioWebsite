/**
 * ui-core.js - Core UI Logic and State Interaction
 * Handles DOM manipulation, grid building, cell events, and managing 
 * the async solver process within the UI context.
 * Requires GameState (state.js), solveHandler, cancelSolver (solver-controller.js), 
 * and analysis functions (analysis-viewer.js) to be globally available.
 */

// --- 1. DOM ELEMENTS & INITIALIZATION ---

const gridEl = document.getElementById('grid');
const statusMessageEl = document.getElementById('statusMessage');
const countSymCheckbox = document.getElementById('countSym');
const countSymStatus = document.getElementById('countSymStatus');

// Mode buttons
const modeBlockBtn = document.getElementById('modeBlock');
const modeSwitchBtn = document.getElementById('modeSwitch');
const modeMustBombBtn = document.getElementById('modeMustBomb');
const modeEraseBtn = document.getElementById('modeErase');

let conditionIdCounter = 0; // Counter for condition editor unique IDs

// --- 2. UI / STATUS HELPERS ---

/**
 * Displays a temporary status message to the user.
 * @param {string} message - The message text.
 * @param {boolean} isError - If true, displays as an error and persists until manually cleared.
 */
function showStatus(message, isError = false) {
    statusMessageEl.textContent = message;
    statusMessageEl.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusMessageEl.style.display = 'block';

    if (!isError) setTimeout(() => { statusMessageEl.style.display = 'none'; }, 3000);
}

/**
 * Sets the current cell interaction mode and updates button visuals.
 * @param {string} m - 'block' | 'switch' | 'mustBomb' | 'erase'
 */
function setMode(m) {
    GameState.config.mode = m;
    [modeBlockBtn, modeSwitchBtn, modeMustBombBtn, modeEraseBtn].forEach(b => b.classList.remove('active'));

    if (m === 'block') modeBlockBtn.classList.add('active');
    else if (m === 'switch') modeSwitchBtn.classList.add('active');
    else if (m === 'mustBomb') modeMustBombBtn.classList.add('active');
    else if (m === 'erase') modeEraseBtn.classList.add('active');
}

/**
 * Resets the solver progress bar and status information.
 */
function resetProgress() {
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressPct').textContent = '0%';
    document.getElementById('timeInfo').textContent = 'Ready';
    document.getElementById('combCount').textContent = '—';
    
    document.getElementById('cancel').disabled = true;
    statusMessageEl.style.display = 'none';
}

/**
 * Toggles the visibility of the heatmap view and options.
 */
window.toggleHeatmapView = function() {
    const cb = document.getElementById('toggleHeatmap');
    GameState.results.showHeatmap = cb.checked;
    
    const opts = document.getElementById('heatmapOptions');
    if (opts) opts.style.display = cb.checked ? 'block' : 'none';
    
    if (typeof updateGridDisplay === 'function') updateGridDisplay();
};

/**
 * Sets the active heatmap type filter.
 * @param {string} val - 'all' | 'normal' | 'power' | 'negative'
 */
window.setHeatmapType = function(val) {
    GameState.results.heatmapType = val;
    if (typeof updateGridDisplay === 'function') updateGridDisplay();
};

// --- 3. GRID BUILD & INTERACTION ---

/**
 * Reconfigures the grid dimensions based on input fields and rebuilds the grid UI.
 */
function buildGrid() {
    GameState.config.cols = Math.max(2, parseInt(document.getElementById('gridCols').value, 10) || 5);
    GameState.config.rows = Math.max(2, parseInt(document.getElementById('gridRows').value, 10) || 5);

    gridEl.style.gridTemplateColumns = `repeat(${GameState.config.cols}, 44px)`;

    GameState.results.solutions = [];
    GameState.results.lastTotalCombinations = 0n;

    renderGrid();
    if (typeof updateCounts === 'function') updateCounts();
    if (typeof clearAnalysis === 'function') clearAnalysis();
    resetProgress();
    if (typeof updateExportData === 'function') updateExportData();
    if (typeof updateDifficultyAnalysis === 'function') updateDifficultyAnalysis();
    
    showStatus('Grid rebuilt with new dimensions');
}

/**
 * Generates and appends all cell elements to the grid container.
 */
function renderGrid() {
    const total = GameState.config.rows * GameState.config.cols;
    gridEl.innerHTML = '';
    
    for (let i = 0; i < total; i++) {
        const d = document.createElement('div');
        d.className = 'cell heatmap-cell';
        d.id = `c${i}`;
        d.dataset.i = i;
        
        // 1. Heatmap percentage overlay (Top-Left)
        d.appendChild(Object.assign(document.createElement('span'), { className: 'heatmap-percent' }));
        
        // 2. Cell ID index (Bottom-Right)
        d.appendChild(Object.assign(document.createElement('span'), { className: 'cell-index', textContent: i }));
        
        // 3. Cell content (For numbers/icons)
        d.appendChild(Object.assign(document.createElement('div'), { className: 'cell-content' }));
        
        d.addEventListener('click', () => cellClicked(i));
        gridEl.appendChild(d);
    }
    
    refreshGridVisual();
}

/**
 * Handles the logic when a cell is clicked, modifying the GameState based on the current mode.
 * @param {number} i - The cell ID (index).
 */
function cellClicked(i) {
    const mode = GameState.config.mode;
    const { blocks, switches, mustBombs } = GameState.grid;

    if (mode === 'block') {
        if (blocks.has(i)) blocks.delete(i);
        else { blocks.add(i); mustBombs.delete(i); switches.delete(i); }
    } else if (mode === 'switch') {
        if (blocks.has(i)) return; // Switches cannot be placed on blocks
        if (switches.has(i)) switches.delete(i);
        else { switches.add(i); mustBombs.delete(i); }
    } else if (mode === 'mustBomb') {
        if (blocks.has(i) || switches.has(i)) return; // MustBombs cannot be placed on blocks/switches
        if (mustBombs.has(i)) mustBombs.delete(i);
        else { mustBombs.add(i); }
    } else { // erase mode
        blocks.delete(i); mustBombs.delete(i); switches.delete(i);
    }

    refreshGridVisual();
    if (typeof updateCounts === 'function') updateCounts();
    if (typeof updateExportData === 'function') updateExportData();
    if (typeof updateDifficultyAnalysis === 'function') updateDifficultyAnalysis();
}

// --- 4. VISUAL REFRESH ---

/**
 * Re-renders the grid cells based on the current GameState or a provided solution.
 * @param {object | null} solution - An optional solution object to display (Solution View).
 */
function refreshGridVisual(solution = null) {
    const total = GameState.config.rows * GameState.config.cols;
    const { blocks, switches, mustBombs } = GameState.grid;

    let normalBombSet = new Set(), powerBombSet = new Set(), negativeBombSet = new Set();
    let numbers = {};
    let currentBlocks = blocks;

    if (solution) {
        // Solution View Setup
        normalBombSet = new Set([...(solution.normalBombs || []), ...mustBombs]);
        powerBombSet = new Set(solution.powerBombs || []);
        negativeBombSet = new Set(solution.negativeBombs || []);
        const blockedSwitches = new Set(solution.switchState || []);
        currentBlocks = new Set([...blocks, ...blockedSwitches]);

        // Neighbor calculation (for number visualization only)
        const neighbors = Array(total).fill(0).map(() => []);
        for (let k = 0; k < total; k++) {
            if (currentBlocks.has(k)) continue;
            const r = Math.floor(k / GameState.config.cols), c = k % GameState.config.cols;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rr = r + dr, cc = c + dc;
                    if (rr >= 0 && rr < GameState.config.rows && cc >= 0 && cc < GameState.config.cols) {
                        const idx = rr * GameState.config.cols + cc;
                        if (!currentBlocks.has(idx)) neighbors[k].push(idx);
                    }
                }
            }
        }

        // Calculate cell numbers
        for (let i = 0; i < total; i++) numbers[i] = 0;
        const allBombs = new Set([...normalBombSet, ...powerBombSet, ...negativeBombSet]);

        normalBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] += 1; });
        powerBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] += 2; });
        negativeBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] -= 1; });
    }

    // Apply visual classes and content
    for (let i = 0; i < total; i++) {
        const el = gridEl.children[i];
        const content = el.querySelector('.cell-content');
        
        // Reset classes and content
        el.className = 'cell heatmap-cell';
        content.className = 'cell-content';
        content.innerHTML = '';

        // Heatmap rendering (Design Mode only)
        if (!solution && GameState.results.showHeatmap && typeof renderHeatmap === 'function') {
             // renderHeatmap function (from analysis-viewer.js) handles heatmap rendering logic
             renderHeatmap(i, el);
        }
        
        const isBomb = solution && (normalBombSet.has(i) || powerBombSet.has(i) || negativeBombSet.has(i));
        
        if (isBomb) {
            // Bomb Cell Styling
            if (normalBombSet.has(i)) { el.classList.add('bomb'); content.textContent = 'B'; }
            else if (powerBombSet.has(i)) { el.classList.add('bomb2'); content.textContent = 'P'; }
            else if (negativeBombSet.has(i)) { el.classList.add('bomb-neg'); content.textContent = 'N'; }

            if (mustBombs.has(i)) {
                el.classList.add('is-must-bomb');
                content.textContent = 'MB';
            }

            // Switch containing a bomb is marked as 'open'
            if (switches.has(i)) {
                el.classList.add('is-switch-bomb');
                el.classList.add('switch-open');
            }

        } else if (currentBlocks.has(i)) {
            // Blocked/Closed Switch Styling
            if (switches.has(i)) {
                el.classList.add('switch-blocked');
                content.textContent = 'S';
            } else {
                el.classList.add('block');
                content.textContent = 'X';
            }

        } else if (solution && numbers[i] !== 0) {
            // Number Cell Styling (and open switch)
            if (switches.has(i)) el.classList.add('switch-open');
            
            const num = document.createElement('span');
            num.className = 'number';
            num.textContent = numbers[i];
            content.appendChild(num);
            el.classList.add('affected');

        } else {
            // Empty Cells (Default/Design Mode)
            if (switches.has(i)) {
                el.classList.add(solution ? 'switch-open' : 'switch-off');
                if (!solution) content.textContent = 'S';
            } else if (mustBombs.has(i)) {
                el.classList.add('must-bomb');
                content.textContent = 'MB';
            } else {
                content.textContent = '';
            }
        }
    }
}

/** Renders the current state of the grid (Design Mode). */
function updateGridDisplay() {
    refreshGridVisual(null);
}

/** Renders a specific solution on the grid. */
function viewSolution(sol) {
    refreshGridVisual(sol);
}

// --- 5. STAR CONDITION EDITOR LOGIC ---

// Templates for dynamically generating condition input fields
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

/**
 * Reads and parses star conditions from the UI into the required structure for the solver.
 * @returns {Array<Array<Object>>} - Array of conditions, grouped by Star (C1, C2, C3).
 */
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

/** Initializes the Star Condition Editor by adding default rows. */
function initStarEditor() {
    for (let starId = 1; starId <= 3; starId++) injectSingleConditionRow(starId);
}

// في ملف ui-core.js
/**
 * يقرأ كائن شروط النجوم المُصدَّر ويقوم بتحديث واجهة المستخدم (Star Editor).
 * @param {Object} exportedStarConditions - كائن الشروط المُستورد من JSON.
 */
function setStarConditionsToUI(exportedStarConditions) {
    // 1. مسح جميع الشروط الحالية من الـ UI
    for (let starId = 1; starId <= 3; starId++) {
        const container = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
        if (container) container.innerHTML = '';
        injectSingleConditionRow(starId); // إعادة إضافة صف فارغ واحد
    }
    
    if (!exportedStarConditions || Object.keys(exportedStarConditions).length === 0) {
        return; // لا يوجد شروط للاستيراد
    }
    
    // 2. تطبيق الشروط المستوردة على النجمة الأولى (لتفادي تعقيد التعامل مع 3 شروط)
    // **ملاحظة:** يتم افتراض أن جميع الشروط المستوردة تنطبق على النجمة 1 فقط
    // لأن كائن التصدير يدمج جميع الشروط في كائن واحد.
    const containerEl = document.querySelector('.single-condition-container[data-star-id="1"]');
    const row = containerEl?.querySelector('.condition-row');
    if (!row) return;
    
    const typeSelect = row.querySelector('.condition-type-select');
    const valueArea = row.querySelector('.condition-value-area');
    
    // تحديد النوع والقيمة من الكائن المُستورد
    let conditionType = '';
    let conditionValue = '';
    
    // يرجى ملاحظة: يتم التحقق من الأنواع بالترتيب.
    if (exportedStarConditions.getScore !== undefined) {
        conditionType = 'getScore';
        conditionValue = exportedStarConditions.getScore;
    } else if (exportedStarConditions.placeBombAt) {
        conditionType = 'placeBombAt';
        conditionValue = exportedStarConditions.placeBombAt.join(', ');
    } else if (exportedStarConditions.anyCellValue !== undefined) {
        conditionType = 'anyCellValue';
        conditionValue = exportedStarConditions.anyCellValue;
    } else if (exportedStarConditions.cellValues) {
        conditionType = 'cellValues';
        conditionValue = exportedStarConditions.cellValues.map(r => `${r.id}, ${r.value}`).join(', ');
    } else if (exportedStarConditions.emptyCellsCount !== undefined) {
        conditionType = 'emptyCellsCount';
        conditionValue = exportedStarConditions.emptyCellsCount;
    } else if (exportedStarConditions.setSwitches) {
        conditionType = 'setSwitches';
        conditionValue = exportedStarConditions.setSwitches.map(r => `${r.id}, ${r.state.replace('SWITCH_', '')}`).join(', ');
    }
    
    // 3. تطبيق التغييرات على الـ UI
    if (conditionType) {
        // تحديث عنصر الاختيار (Select)
        typeSelect.value = conditionType;
        
        // محاكاة حدث التغيير لإنشاء حقول الإدخال المناسبة
        typeSelect.dispatchEvent(new Event('change'));
        
        // ملء القيمة
        const inputKey = CONDITION_TEMPLATES[conditionType].input(null).match(/data-key="(.*?)"/)?.[1] || 'value';
        const inputEl = valueArea.querySelector(`[data-key="${inputKey}"]`);
        
        if (inputEl) {
            inputEl.value = conditionValue;
        }
        
        // بما أننا ملأنا النجمة الأولى، نزيل الصف الفارغ الذي أضفناه في البداية
        // (نترك الأمر كما هو للسماح بإضافة المزيد إذا كان هناك شروط أكثر)
    }
}
/**
 * يطبق بيانات مستوى اللعبة المحملة على عناصر واجهة المستخدم والـ GameState.
 * @param {Object} levelData - كائن بيانات المستوى المُستورد.
 */
function setUIFromLevelData(levelData) {
    // 1. تحديث إعدادات الشبكة
    GameState.config.cols = levelData.gridColumns || 5;
    GameState.config.rows = levelData.gridRows || 5;
    document.getElementById('gridCols').value = GameState.config.cols;
    document.getElementById('gridRows').value = GameState.config.rows;
    buildGrid(); // لإعادة بناء الشبكة
    
    // 2. تحديث قواعد القنابل
    document.getElementById('bombs1').value = levelData.bombsCount || 0;
    document.getElementById('bombs2').value = levelData.bombsPlusCount || 0;
    document.getElementById('bombsNeg').value = levelData.bombsNegCount || 0;
    
    // 3. تحديث النتيجة المستهدفة
    document.getElementById('targetMin').value = levelData.targetMin !== undefined ? levelData.targetMin : '';
    document.getElementById('targetMax').value = levelData.targetMax !== undefined ? levelData.targetMax : '';
    // يتم افتراض Range Mode إذا لم يتساوى الحد الأدنى والأقصى، لكن هنا نحافظ على إعدادات الـ UI الحالية.
    
    // 4. تحديث خلايا الشبكة (Blocks, Switches, MustBombs)
    GameState.grid.blocks.clear();
    GameState.grid.switches.clear();
    GameState.grid.mustBombs.clear();
    
    if (levelData.initialCells) {
        levelData.initialCells.forEach(cell => {
            if (cell.state === 'BLOCK') GameState.grid.blocks.add(cell.id);
            else if (cell.state === 'SWITCH_ON') GameState.grid.switches.add(cell.id);
            else if (cell.state === 'BOMB') GameState.grid.mustBombs.add(cell.id);
        });
    }
    setStarConditionsToUI(levelData.starConditions);
    
    refreshGridVisual();
    if (typeof updateCounts === 'function') updateCounts();
    
    // 5. تحديث الشروط (Stars) - يتطلب منطقاً معقداً، هنا نكتفي بالإشارة:
    // **ملاحظة:** ستحتاج إلى كتابة دالة `setStarConditionsToUI` منفصلة ومعقدة
    // لتحويل كائن `levelData.starConditions` إلى إعدادات الواجهة الرسومية (UI)
    // لأنه يجب أن تتفاعل مع `CONDITION_TEMPLATES` ودالة `handleConditionTypeChange`.
    
    // (للتنفيذ السريع، نفترض تحديث الاسم فقط)
    document.getElementById('exportFileName').value = levelData.remoteId || 'level_custom';
    
    showStatus('Level data imported successfully. Please verify all settings.');
}

// --- 6. EVENT LISTENERS & INITIAL BOOT ---

// Mode listeners
modeBlockBtn.addEventListener('click', () => setMode('block'));
modeSwitchBtn.addEventListener('click', () => setMode('switch'));
modeMustBombBtn.addEventListener('click', () => setMode('mustBomb'));
modeEraseBtn.addEventListener('click', () => setMode('erase'));

// Grid configuration listeners
document.getElementById('build').addEventListener('click', buildGrid);
document.getElementById('clear').addEventListener('click', () => {
    const { blocks, switches, mustBombs } = GameState.grid;
    blocks.clear(); mustBombs.clear(); switches.clear();
    refreshGridVisual(); 
    if (typeof updateCounts === 'function') updateCounts();
    if (typeof updateExportData === 'function') updateExportData();
    if (typeof updateDifficultyAnalysis === 'function') updateDifficultyAnalysis();
    showStatus('All special cells cleared');
});
document.getElementById('gridCols').addEventListener('change', buildGrid);
document.getElementById('gridRows').addEventListener('change', buildGrid);

// Solver Control
document.getElementById('solve').addEventListener('click', async () => {
    const solveBtn = document.getElementById('solve');
    const cancelBtn = document.getElementById('cancel');

    resetProgress();
    solveBtn.disabled = true;
    solveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Working...';
    cancelBtn.disabled = false;

    const startTime = performance.now();

    try {
        await solveHandler();
        if (typeof handlePostSolveAnalysis === 'function') handlePostSolveAnalysis(startTime);
    } catch (err) {
        console.error("Solver Error:", err);
    } finally {
        solveBtn.disabled = false;
        solveBtn.innerHTML = '<i class="fas fa-play"></i> SOLVE';
        cancelBtn.disabled = true;
    }
});

document.getElementById('cancel').addEventListener('click', () => {
    if (typeof cancelSolver === 'function') cancelSolver();
});

// Heatmap listeners
const toggleH = document.getElementById('toggleHeatmap');
if (toggleH) {
    toggleH.addEventListener('change', window.toggleHeatmapView);
}

// Symmetry counter listener
countSymCheckbox.addEventListener('change', () => {
    countSymStatus.textContent = countSymCheckbox.checked ? '✓ Counting symmetries' : '✗ Not counting symmetries';
});

// Export control
// Export control
const exportBtn = document.getElementById('exportBtn');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const importBtn = document.getElementById('importBtn'); // الزر الجديد

// 1. تنزيل JSON (Download)
exportBtn.addEventListener('click', async () => {
    // ... (منطق التنزيل الحالي، مع إزالة نافذة التأكيد)
    
    let currentFileName = document.getElementById('exportFileName').value.trim() || 'level_custom';
    const levelName = prompt("Enter Level ID (used for remoteId):", currentFileName);
    
    if (!levelName) {
        if (typeof showStatus === 'function') showStatus('Download cancelled.', true);
        return;
    }
    
    document.getElementById('exportFileName').value = levelName;
    if (typeof updateExportData !== 'function') {
        if (typeof showStatus === 'function') showStatus('Error: updateExportData function not found!', true);
        return;
    }
    updateExportData(); // تأكد من تحديث البيانات قبل التنزيل
    
    // ... (منطق التنسيق والتنزيل الحالي) ...
    
    let rawJson = document.getElementById('exportData').value;
    let jsonObj;
    try {
        jsonObj = JSON.parse(rawJson);
    } catch (e) {
        if (typeof showStatus === 'function') showStatus('Invalid JSON data!', true);
        return;
    }
    
    // Format JSON: Pretty print, then collapse cell objects and placementIds
    let formattedJson = JSON.stringify(jsonObj, null, 2);
    // ... (منطق الـ regex للتنسيق) ...
    
    // ... (إزالة جزء النسخ الاختياري، والبدء بمنطق التنزيل مباشرة) ...
    
    // Download logic
    let fileName = levelName;
    if (!fileName.endsWith('.json')) fileName += '.json';
    
    // (منطق تنزيل الملف باستخدام File System API أو Fallback Download كما هو في الكود الأصلي)
    
    // Fallback Download Logic (يجب أن يكون هنا)
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


// 2. نسخ JSON للحافظة (Copy)
copyJsonBtn.addEventListener('click', async () => {
    if (typeof updateExportData !== 'function') return;
    updateExportData(); // تأكد من تحديث البيانات قبل النسخ
    
    let rawJson = document.getElementById('exportData').value;
    
    try {
        const jsonObj = JSON.parse(rawJson);
        // Format JSON to be single-line or compact before copying (اختياري)
        const compactJson = JSON.stringify(jsonObj);
        await navigator.clipboard.writeText(compactJson);
        if (typeof showStatus === 'function') showStatus('JSON content copied to clipboard successfully!');
    } catch (err) {
        console.error('Copy to clipboard failed:', err);
        if (typeof showStatus === 'function') showStatus('Failed to copy to clipboard or invalid JSON.', true);
    }
});


// 3. استيراد JSON (Import)
importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const levelData = JSON.parse(e.target.result);
                setUIFromLevelData(levelData);
            } catch (err) {
                console.error('Error parsing JSON:', err);
                showStatus('Error: Invalid JSON file format.', true);
            }
        };
        reader.onerror = () => {
            showStatus('Error reading file.', true);
        };
        reader.readAsText(file);
    };
    input.click();
});

// 4. استيراد JSON كنص (Import Text) - الميزة الجديدة
const importTextBtn = document.getElementById('importTextBtn');
if (importTextBtn) {
    importTextBtn.addEventListener('click', async () => {
        // نطلب من المستخدم لصق الكود
        // ملاحظة: الـ prompt قد يكون محدوداً في عدد الحروف في بعض المتصفحات
        // لكنه أسرع حل حالياً للكود القصير والمتوسط.
        const jsonText = prompt("Please paste the Level JSON data here:");
        
        if (!jsonText) return; // المستخدم ضغط Cancel أو لم يكتب شيئاً

        try {
            const levelData = JSON.parse(jsonText);
            setUIFromLevelData(levelData); // استخدام نفس الدالة الموجودة سابقاً
            if (typeof showStatus === 'function') showStatus('Level loaded from text successfully!');
        } catch (err) {
            console.error('Error parsing JSON text:', err);
            if (typeof showStatus === 'function') showStatus('Error: Invalid JSON text format.', true);
        }
    });
}
// --- 7. TERMS & CONDITIONS MODAL LOGIC ---

function initTermsModal() {
    const overlay = document.getElementById('termsOverlay');
    const checkbox = document.getElementById('termsCheckbox');
    const btnAccept = document.getElementById('btnAcceptTerms');
    const btnDecline = document.getElementById('btnDeclineTerms');

    // 1. التحكم في زر الاستمرار بناءً على الـ Checkbox
    checkbox.addEventListener('change', () => {
        btnAccept.disabled = !checkbox.checked;
    });

    // 2. عند الموافقة (إخفاء الصندوق وإزالة البلور)
    btnAccept.addEventListener('click', () => {
        overlay.classList.add('hidden');
        // يمكن تخزين الموافقة في localStorage لو عاوز المستخدم ميشوفش الرسالة دي تاني
        // localStorage.setItem('termsAccepted', 'true'); 
    });

    // 3. عند الرفض (إغلاق الموقع أو الرجوع للخلف)
    btnDecline.addEventListener('click', () => {
        if (confirm("Are you sure you want to decline? You will be redirected.")) {
            // محاولة الرجوع للصفحة السابقة
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // إذا لم يكن هناك تاريخ تصفح، نذهب لصفحة فارغة أو جوجل
                window.location.href = "https://www.google.com";
            }
            // محاولة إغلاق النافذة (قد لا تعمل في بعض المتصفحات لأسباب أمنية)
            window.close();
        }
    });
    
    // (اختياري) لو عاوز تفحص لو المستخدم وافق قبل كده
    // if (localStorage.getItem('termsAccepted') === 'true') {
    //     overlay.classList.add('hidden'); // إخفاء مباشر
    //     overlay.style.display = 'none'; // لضمان عدم ظهوره لحظياً
    // }
}
/* --- ADD THIS TO THE END OF ui-core.js --- */



initTermsModal();
// Call initTheme inside the initialization block or at the end of file
// استدعاء الدالة عند بدء التشغيل

// Initial boot sequence
buildGrid();
resetProgress();
initStarEditor();