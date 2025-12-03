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
        normalBombSet = new Set(solution.normalBombs || []);
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
document.getElementById('exportBtn').addEventListener('click', async () => {
    let currentFileName = document.getElementById('exportFileName').value.trim() || 'level_custom';
    const levelName = prompt("Enter Level ID (used for remoteId):", currentFileName);
    
    if (!levelName) {
        if (typeof showStatus === 'function') showStatus('Export cancelled.', true);
        return;
    }
    
    document.getElementById('exportFileName').value = levelName;
    if (typeof updateExportData !== 'function') {
        if (typeof showStatus === 'function') showStatus('Error: updateExportData function not found!', true);
        return;
    }
    updateExportData();

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
    const initialCellsRegex = /\{\n\s*"id": (\d+),\n\s*"state": "(.*?)"\n\s*\}/g;
    formattedJson = formattedJson.replace(initialCellsRegex, (match, id, state) => `{ "id": ${id}, "state": "${state}" }`);
    
    if (jsonObj.solution && Array.isArray(jsonObj.solution.placementIds)) {
        const singleLinePlacement = JSON.stringify(jsonObj.solution.placementIds);
        formattedJson = formattedJson.replace(
            /"placementIds": \[\s*[^\]]*\s*\]/s,
            `"placementIds": ${singleLinePlacement}`
        );
    }
    
    if (!formattedJson) {
        if (typeof showStatus === 'function') showStatus('No data to export after generation!', true);
        return;
    }
    
    const shouldCopy = confirm("Do you want to copy the JSON content to the clipboard? (Click 'Cancel' to download the file instead.)");
    
    if (shouldCopy) {
        try {
            await navigator.clipboard.writeText(formattedJson);
            if (typeof showStatus === 'function') showStatus('JSON content copied to clipboard successfully!');
            return;
        } catch (err) {
            console.error('Copy to clipboard failed:', err);
            if (typeof showStatus === 'function') showStatus('Failed to copy to clipboard. Proceeding to download...', true);
        }
    }
    
    // Download logic
    let fileName = levelName;
    if (!fileName.endsWith('.json')) fileName += '.json';
    
    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: fileName,
                types: [{ description: 'Minesweeper Level JSON', accept: { 'application/json': ['.json'] } }],
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