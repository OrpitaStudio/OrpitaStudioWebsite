/**
 * analysis-viewer.js
 * Complete & Optimized for GameState V3.0.
 */

// --- I. DOM ELEMENTS AND GLOBAL REFERENCES ---

const blocksCountEl = document.getElementById('blocksCount');
const switchesCountEl = document.getElementById('switchesCount');
const mustBombsCountEl = document.getElementById('mustBombsCount');
const cellCountEl = document.getElementById('cellCount');
const solutionsCountEl = document.getElementById('solutionsCount');
const exportDataEl = document.getElementById('exportData');
const warningsContainer = document.getElementById('warningsContainer');

// Assumed global existence for analysis functions
// const GameState;
// const CONDITION_TEMPLATES;
// const showStatus;
// const humanNumberBig;
// const viewSolution;

// --- II. DATA PREPARATION AND EXPORT FUNCTIONS ---

/**
 * Converts GameState grid sets (blocks, switches, mustBombs) into a sorted array
 * of objects for level export.
 * @returns {Array<{id: number, state: string}>} Sorted array of initial cells.
 */
function getInitialCells() {
    const initialCells = [];
    const registerCell = (id, state) => {
        if (!initialCells.find(c => c.id === id)) initialCells.push({ id, state });
    };

    GameState.grid.blocks.forEach(id => registerCell(id, 'BLOCK'));
    GameState.grid.switches.forEach(id => registerCell(id, 'SWITCH_ON'));
    GameState.grid.mustBombs.forEach(id => registerCell(id, 'BOMB'));
    
    return initialCells.sort((a, b) => a.id - b.id);
}

/**
 * Reads C1, C2, C3 conditions from the UI, flattens them, and filters out invalid ones.
 * @returns {Array<Object>} Flat array of valid star (condition) objects.
 */
function getStarConditionsFromUI() {
    const allStarConditions = [];
    for (let starId = 1; starId <= 3; starId++) {
        const containerEl = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
        const row = containerEl?.querySelector('.condition-row');
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
            if (value === '') { valid = false; }
            inputs[key] = value;
        });

        if (!valid) {
            allStarConditions.push([]);
            continue;
        }

        const conditionObject = template.parser(inputs);
        allStarConditions.push(conditionObject ? [conditionObject] : []);
    }
    return allStarConditions.flat().filter(c => c);
}

/**
 * Updates the export text area with the current level configuration and best solution.
 */
function updateExportData() {
    const starConditionsArray = getStarConditionsFromUI();
    const remoteId = document.getElementById('exportFileName').value.trim() || "level_custom";
    const bestSolution = GameState.results.solutions[0] || null;
    
    let solutionPlacementIds = null;
    if (bestSolution) {
        const allBombs = [
            ...(bestSolution.normalBombs || []),
            ...(bestSolution.powerBombs || []),
            ...(bestSolution.negativeBombs || [])
        ];
        solutionPlacementIds = Array.from(new Set(allBombs));
    }

    // Convert conditions into final flat object structure (StarConditions)
    const starConditionsObject = starConditionsArray.reduce((acc, cond) => {
        switch (cond.type) {
            case 'getScore': acc.getScore = cond.value; break;
            case 'placeBombAt': acc.placeBombAt = cond.cells || cond.requirements?.map(r => r.id); break;
            case 'anyCellValue': acc.anyCellValue = cond.value; break;
            case 'cellValues': acc.cellValues = cond.requirements; break;
            case 'emptyCellsCount': acc.emptyCellsCount = cond.value; break;
            case 'setSwitches': acc.setSwitches = cond.requirements; break;
        }
        return acc;
    }, {});

    const data = {
        remoteId,
        gridColumns: GameState.config.cols,
        gridRows: GameState.config.rows,
        bombsCount: parseInt(document.getElementById('bombs1').value) || 0,
        bombsPlusCount: parseInt(document.getElementById('bombs2').value) || 0,
        bombsNegCount: parseInt(document.getElementById('bombsNeg').value) || 0,
        targetMin: parseInt(document.getElementById('targetMin').value) || -1,
        targetMax: parseInt(document.getElementById('targetMax').value) || -1,
        initialCells: getInitialCells(),
        starConditions: starConditionsObject,
        solution: bestSolution ? { placementIds: solutionPlacementIds } : null
    };
    
    exportDataEl.value = JSON.stringify(data);
}

// --- III. UI UPDATES AND ANALYSIS CALCULATION ---

/**
 * Updates the display counts for blocks, switches, mustBombs, and total cells.
 */
function updateCounts() {
    const total = GameState.config.rows * GameState.config.cols;
    cellCountEl.textContent = total;
    blocksCountEl.textContent = GameState.grid.blocks.size;
    switchesCountEl.textContent = GameState.grid.switches.size;
    mustBombsCountEl.textContent = GameState.grid.mustBombs.size;
}

/**
 * Clears analysis-related display elements and resets heatmap data.
 */
function clearAnalysis() {
    document.getElementById('analysisTargets').innerHTML = '';
    document.getElementById('analysisConditions').innerHTML = '';
    document.getElementById('solutionsList').innerHTML = '';
    solutionsCountEl.textContent = 0;
    warningsContainer.innerHTML = '';
    warningsContainer.style.display = 'none';
    GameState.results.bombProbabilityMap = {};
}

/**
 * Calculates and updates the difficulty analysis (Win Chance and Difficulty Score).
 */
function updateDifficultyAnalysis() {
    const totalSpace = GameState.results.lastTotalCombinations > 0n ? GameState.results.lastTotalCombinations : 1n;
    const validCountBig = GameState.results.validSolutionsCount;
    const difficultyFill = document.getElementById('difficultyFill');
    const difficultyLabel = document.getElementById('difficultyLabel');
    const difficultyDetails = document.getElementById('difficultyDetails');

    if (validCountBig === 0n) {
        difficultyFill.style.width = '0%';
        difficultyLabel.textContent = '—';
        difficultyDetails.innerHTML = '';
        return;
    }
    
    const probabilityE4 = (validCountBig * 10000n) / totalSpace;
    const probabilityPct = Number(probabilityE4) / 100; // Win Chance Percentage
    let difficultyScore = Math.max(0, 100 - probabilityPct);
    
    let diffText = 'Not even a puzzle';
    let diffClass = 'difficulty-easy';
    if(probabilityPct < 0.1) { diffText = 'Extreme'; diffClass = 'difficulty-hard'; }
    else if(probabilityPct < 0.5) { diffText = 'Hard'; diffClass = 'difficulty-hard'; }
    else if(probabilityPct < 2) { diffText = 'Medium'; diffClass = 'difficulty-medium'; }
    else if(probabilityPct < 5) { diffText = 'Easy'; diffClass = 'difficulty-medium'; }
    
    difficultyFill.style.width = `${difficultyScore}%`;
    difficultyFill.className = `difficulty-fill ${diffClass}`;
    difficultyLabel.textContent = `${difficultyScore.toFixed(2)}% (${diffText})`;
    
    const solutionsCountDisplay = typeof humanNumberBig === 'function' ? humanNumberBig(validCountBig) : validCountBig.toString();
    difficultyDetails.innerHTML = `
        <div style="display:flex; justify-content:space-between;"><span>Valid Solutions:</span> <span>${solutionsCountDisplay}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>Total Permutations:</span> <span>${humanNumberBig(totalSpace)}</span></div>
        <div style="margin-top:5px; border-top:1px solid #333; padding-top:5px; color:var(--accent-gold)">Win Chance (Random): ${probabilityPct.toFixed(4)}%</div>`;

    updateExportData();
}

/**
 * Renders the heatmap visualization on the grid cells based on selected bomb type.
 * Uses the comprehensive workerStats for accurate data.
 */
function renderHeatmap() {
    const { rows, cols } = GameState.config;
    const stats = GameState.results.workerStats;
    const showHeatmap = GameState.results.showHeatmap;
    const totalCells = rows * cols;

    // 1. Clear previous heatmap display
    for (let i = 0; i < totalCells; i++) {
        const cellEl = document.getElementById(`c${i}`);
        if (!cellEl) continue;
        cellEl.style.backgroundColor = '';
        const percentEl = cellEl.querySelector('.heatmap-percent');
        if (percentEl) percentEl.textContent = '';
    }
    
    if (!showHeatmap || !stats || stats.totalFound === 0) return;
    
    const heatmapType = GameState.results.heatmapType || 'all';
    let counts;
    
    if (heatmapType === 'normal') counts = stats.normal;
    else if (heatmapType === 'power') counts = stats.power;
    else if (heatmapType === 'negative') counts = stats.negative;
    else {
        // Aggregate all bomb types
        counts = new Uint32Array(totalCells);
        for (let i = 0; i < totalCells; i++)
            counts[i] = stats.normal[i] + stats.power[i] + stats.negative[i];
    }
    
    // 2. Apply heatmap visualization
    for (let i = 0; i < totalCells; i++) {
        const cellEl = document.getElementById(`c${i}`);
        // Skip blocks and must-bombs
        if (!cellEl || GameState.grid.blocks.has(i) || GameState.grid.mustBombs.has(i)) continue;
        
        const count = counts[i];
        if (count === 0) continue;
        
        // Percentage of total solutions found
        let percent = Math.round((count / stats.totalFound) * 100);
        
        const percentEl = cellEl.querySelector('.heatmap-percent');
        if (percentEl) percentEl.textContent = `${percent}%`;
        
        // Optional: Background color (commented out in original, kept for reference)
        // const opacity = (percent / 100) * 0.5;
        // cellEl.style.backgroundColor = `rgba(255, 50, 50, ${opacity})`;
    }
}

/**
 * Renders the aggregated conditional analysis tables (C1, C2, C3) using comprehensive worker statistics.
 * @param {Object} stats - The condition statistics from the worker.
 * @param {number} totalFound - The total number of solutions found.
 */
function renderAggregatedConditionAnalysis(stats, totalFound) {
    const container = document.getElementById('analysisConditions');
    if (!container || totalFound === 0) {
        if (container) container.innerHTML = '<div class="small">No solutions to analyze.</div>';
        return;
    }
    
    // Calculate total count for each condition (C1, C2, C3) by summing intersections
    const c1_total = stats['C1_Only'] + stats['C1_C2'] + stats['C1_C3'] + stats['C1_C2_C3'];
    const c2_total = stats['C2_Only'] + stats['C1_C2'] + stats['C2_C3'] + stats['C1_C2_C3'];
    const c3_total = stats['C3_Only'] + stats['C1_C3'] + stats['C2_C3'] + stats['C1_C2_C3'];
    
    const getRow = (label, count) => {
        const pct = ((count / totalFound) * 100).toFixed(1);
        let color = 'var(--text-muted)';
        if (pct < 10) color = 'var(--accent-danger)';
        else if (pct > 80) color = 'var(--accent-success)';
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:4px;">${label}</td>
            <td style="color:${color}"><b>${count}</b> <span style="font-size:0.8em">(${pct}%)</span></td>
        </tr>`;
    };
    
    // 1. Single Condition Analysis Table
    let html = `<h4 style="margin:10px 0 5px 0; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Conditional Analysis (Total Space)</h4>`;
    html += `<table style="width:100%; font-size:0.85em; text-align:left; border-collapse: collapse;">`;
    html += `<tr style="color:#888;"><th>Condition</th><th>Valid Sols</th></tr>`;
    html += getRow('C1', c1_total);
    html += getRow('C2', c2_total);
    html += getRow('C3', c3_total);
    html += `</table>`;
    
    // 2. Intersection Breakdown Grid
    html += `
        <h4 style="margin: 10px 0 5px 0; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Intersection Breakdown</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.9em;">
            <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">Individual:</div>
            <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">Intersection:</div>
            
            <div>C1 Only: <b>${stats['C1_Only']}</b></div>
            <div>C1 & C2: <b>${stats['C1_C2']}</b></div>
            
            <div>C2 Only: <b>${stats['C2_Only']}</b></div>
            <div>C1 & C3: <b>${stats['C1_C3']}</b></div>
            
            <div>C3 Only: <b>${stats['C3_Only']}</b></div>
            <div>C2 & C3: <b>${stats['C2_C3']}</b></div>

            <div style="grid-column: 1 / span 2; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">
                All 3 (C1 & C2 & C3): <b style="color:var(--accent-gold)">${stats['C1_C2_C3']}</b>
            </div>
            <div style="grid-column: 1 / span 2;">
                None (0 Stars): <b>${stats['None']}</b>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// --- IV. SOLUTION LIST RENDERING AND FILTERING ---

/**
 * Renders the solutions list to the DOM, limiting the display count for performance.
 * @param {number} limit - The maximum number of solutions to display.
 */
function renderSolutionsList(limit) {
    const cont = document.getElementById('solutionsList');
    cont.innerHTML = '';
    
    const list = GameState.results.solutions;
    const show = Math.min(limit, list.length);
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < show; i++) {
        const sol = list[i];
        const row = document.createElement('div');
        row.className = 'solRow';
        
        const condStatus = sol.conditionStatus || [false, false, false];
        const statusHtml = `
            <span style="font-size: 0.em; margin-left: 10px;">
                C1:<b style="color:${condStatus[0]?'var(--accent-success)':'var(--accent-danger)'}">✓</b> 
                C2:<b style="color:${condStatus[1]?'var(--accent-success)':'var(--accent-danger)'}">✓</b> 
                C3:<b style="color:${condStatus[2]?'var(--accent-success)':'var(--accent-danger)'}">✓</b>
            </span>`;
        
        row.innerHTML = `
            <div class="solMeta" style="display:flex; justify-content: space-between;">
                <div>#${i+1} ${statusHtml}</div>
                <div><span class="badge">S=${sol.sum}</span></div> 
            </div>`;
        
        row.addEventListener('click', () => viewSolution(sol));
        fragment.appendChild(row);
    }
    
    cont.appendChild(fragment);
    
    if (list.length > show) {
        const more = document.createElement('div');
        more.className = 'small';
        more.textContent = `Showing ${show} of ${list.length}.`;
        cont.appendChild(more);
    }
}

/**
 * Renders a filtered list of solutions.
 * @param {Array<Object>} list - The array of solutions to render.
 */
function renderFilteredList(list){
    const cont = document.getElementById('solutionsList');
    cont.innerHTML = '';
    if(list.length === 0){ cont.innerHTML = '<div class="small">No matching solutions.</div>'; return; }
    
    const fragment = document.createDocumentFragment();
    // Cap rendered items for performance
    for(let i=0; i<list.length && i<1000; i++){
        const sol = list[i];
        const row = document.createElement('div');
        row.className = 'solRow';
        
        
        const condStatus = sol.conditionStatus || [false, false, false];
        const statusHtml = `
            <span style="font-size: em; margin-left: 10px;">
                C1:<b style="color:${condStatus[0]?'var(--accent-success)':'var(--accent-danger)'}">✓</b> 
                C2:<b style="color:${condStatus[1]?'var(--accent-success)':'var(--accent-danger)'}">✓</b> 
                C3:<b style="color:${condStatus[2]?'var(--accent-success)':'var(--accent-danger)'}">✓</b>
            </span>`;
        
        row.innerHTML = `
            <div class="solMeta" style="display:flex; justify-content: space-between;">
                <div>#${i+1} ${statusHtml}</div>
                <div><span class="badge">S=${sol.sum}</span></div>
            </div>`;
        
        row.addEventListener('click', ()=> viewSolution(sol));
        fragment.appendChild(row);
    }
    cont.appendChild(fragment);
}

/**
 * Filters the solutions list based on the state of C1, C2, and C3 checkboxes.
 */
function filterByConditionStatus() {
    const filterC1 = document.getElementById('filterC1')?.checked;
    const filterC2 = document.getElementById('filterC2')?.checked;
    const filterC3 = document.getElementById('filterC3')?.checked;
    const solutions = GameState.results.solutions;

    if (solutions.length === 0) return;

    const filteredList = solutions.filter(sol => {
        const [c1_met, c2_met, c3_met] = sol.conditionStatus || [false, false, false];
        // Only include solutions that satisfy the checked filters
        return !(filterC1 && !c1_met) && !(filterC2 && !c2_met) && !(filterC3 && !c3_met);
    });

    renderFilteredList(filteredList);
}

// Global functions for list filtering (exposed to window)
window.filterBySum = function(sum){
    const filtered = GameState.results.solutions.filter(s => s.sum === sum);
    renderFilteredList(filtered);
}

// --- V. EVENT LISTENERS SETUP ---

/**
 * Sets up the click listeners for condition filter buttons (Apply and Reset).
 */
function setupConditionFilters() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');
    
    if (applyBtn) {
        applyBtn.onclick = filterByConditionStatus;
    }
    
    if (resetBtn) {
        resetBtn.onclick = function() {
            ['filterC1', 'filterC2', 'filterC3'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.checked = true;
            });
            renderSolutionsList(parseInt(document.getElementById('maxShow')?.value) || 200);
        };
    }
}

// --- VI. POST-SOLVE ORCHESTRATOR ---

/**
 * Handles all post-solve UI updates, data display, and analysis rendering.
 * @param {number} startTime - The time the solve operation started (for duration calculation).
 */
function handlePostSolveAnalysis(startTime) {
    const totalTime = performance.now() - startTime;
    
    // 1. Retrieve data from State
    const solutions = GameState.results.solutions;
    const workerStats = GameState.results.workerStats;
    const targetStats = GameState.results.targetStats || {};
    const conditionStats = GameState.results.conditionStats || {};
    const totalFound = workerStats ? workerStats.totalFound : solutions.length;
    
    // 2. Update Progress UI
    document.getElementById('combCount').textContent = humanNumberBig(GameState.results.lastTotalCombinations);
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressPct').textContent = '100%';
    document.getElementById('timeInfo').textContent = `${Math.round(totalTime)}ms - Done`;
    document.getElementById('cancel').disabled = true;
    
    // 3. Render Heatmap
    if (typeof renderHeatmap === 'function') renderHeatmap();
    
    // 4. Sort display list (prioritize solutions meeting more conditions)
    solutions.sort((a, b) => {
        const a_met = (a.conditionStatus || []).filter(v => v).length;
        const b_met = (b.conditionStatus || []).filter(v => v).length;
        if (a_met !== b_met) return b_met - a_met; // Higher met count first
        return a.sum - b.sum; // Then by sum (assuming lower sum is better)
    });
    solutionsCountEl.textContent = totalFound;
    
    // 5. Render Target Summary
    const sortedTargets = Object.keys(targetStats).map(Number).sort((a, b) => a - b);
    let tHtml = sortedTargets.map(t => {
        const count = targetStats[t];
        // Filter button only views solutions loaded in memory
        return `<div>Value ${t}: <b>${count}</b> <button class="btnSmall" onclick="filterBySum(${t})">View List</button></div>`;
    }).join('');
    
    if (solutions.length < totalFound) {
        tHtml += `<div style="width:100%; border-top:1px solid #333; margin-top:5px; padding-top:5px; font-size:0.8em; color:var(--accent-gold);">
            * List shows ${solutions.length} of ${totalFound} total solutions found.
        </div>`;
    }
    document.getElementById('analysisTargets').innerHTML = tHtml;
    
    // 6. Render Conditional Analysis
    renderAggregatedConditionAnalysis(conditionStats, totalFound);
    
// 7. Render Warnings (Custom Rule Set)
    warningsContainer.innerHTML = '';
    let warningsList = [];

    // --- Data Preparation ---
    const { rows, cols } = GameState.config;
    const totalCells = rows * cols;
    const blocksCount = GameState.grid.blocks.size;
    const mustBombsCount = GameState.grid.mustBombs.size;
    const switchesCount = GameState.grid.switches.size;
    
    // Bomb Counts
    const b1 = parseInt(document.getElementById('bombs1').value) || 0;
    const b2 = parseInt(document.getElementById('bombs2').value) || 0;
    const bn = parseInt(document.getElementById('bombsNeg').value) || 0;
    const playerBombsCount = b1 + b2 + bn; // Bombs in player inventory
    const totalEffectiveBombs = playerBombsCount + mustBombsCount; // All bombs on board

    // Cells available for player to place bombs
    const availableCells = totalCells - blocksCount - mustBombsCount;
    
    // Limits
    const maxAnalysisVal = parseInt(document.getElementById('maxAnalysisLimit')?.value) || 1000000;
    const maxShowVal = parseInt(document.getElementById('maxShow')?.value) || 200;
    const lastTotalCombos = GameState.results.lastTotalCombinations;
    const winChance = GameState.results.chanceWinPercentage || 0;

    // --- Rule 1: Too Easy (Random Chance > 5%) ---
    if (totalFound > 0 && winChance > 5.0) {
        warningsList.push({
            type: 'warning',
            text: `Too Easy: Random guessing success rate is very high (${winChance.toFixed(2)}% > 5%).`
        });
    }

    // --- Rule 2: Wide Areas (Available Cells > 3x Player Bombs) ---
    if (playerBombsCount > 0 && availableCells > (playerBombsCount * 3)) {
        warningsList.push({
            type: 'info',
            text: `Wide Area: Available cells (${availableCells}) are more than three times the player bombs (${playerBombsCount}). Consider reducing map size.`
        });
    }

    // --- Rule 3: Useless Borders (Full wall on edge) ---
    let borderWallFound = false;
    // Check Top Row (0)
    let topBlocked = true;
    for(let c=0; c<cols; c++) if(!GameState.grid.blocks.has(c)) { topBlocked = false; break; }
    
    // Check Bottom Row (rows-1)
    let botBlocked = true;
    for(let c=0; c<cols; c++) if(!GameState.grid.blocks.has((rows-1)*cols + c)) { botBlocked = false; break; }

    // Check Left Col (0)
    let leftBlocked = true;
    for(let r=0; r<rows; r++) if(!GameState.grid.blocks.has(r*cols)) { leftBlocked = false; break; }

    // Check Right Col (cols-1)
    let rightBlocked = true;
    for(let r=0; r<rows; r++) if(!GameState.grid.blocks.has(r*cols + (cols-1))) { rightBlocked = false; break; }

    if (topBlocked || botBlocked || leftBlocked || rightBlocked) {
        warningsList.push({
            type: 'warning',
            text: `Redundant Border: A full row/column of blocks exists at the edge. Best practice is to resize the grid dimensions.`
        });
    }

    // --- Rule 4: Analysis Accuracy (Analysis Limit < Total Permutations) ---
    // Note: lastTotalCombos is BigInt, maxAnalysisVal is Number
    if (lastTotalCombos > BigInt(maxAnalysisVal)) {
        warningsList.push({
            type: 'info',
            text: `Partial Analysis: Total permutations exceed the analysis limit. Heatmap and stats are not 100% accurate.`
        });
    }

    // --- Rule 5: Too Many Blocks (> 40% of grid) ---
    if (totalCells > 0 && (blocksCount / totalCells) > 0.40) {
        warningsList.push({
            type: 'warning',
            text: `Crowded Grid: Blocks cover >40% of the map size.`
        });
    }

    // --- Rule 6: Over-constrained (MustBombs > 50% of Total Bombs) ---
    if (totalEffectiveBombs > 0 && (mustBombsCount / playerBombsCount) > 0.50) {
        warningsList.push({
            type: 'warning',
            text: `Hand-Holding: Must-Bombs represent >50% of total bombs. Try to rely more on player deduction.`
        });
    }

    // --- Rule 7: High Complexity (Switches > 5) ---
    if (switchesCount > 5) {
        warningsList.push({
            type: 'warning',
            text: `High Complexity: Using >5 switches creates a massive probability web.`
        });
    }

    // --- Rule 8: Limited Visibility (Display Limit < 10% of Found) ---
    if (totalFound > 0 && maxShowVal < (totalFound * 0.10)) {
        warningsList.push({
            type: 'info',
            text: `Limited Visibility: Display limit is showing less than 10% of valid solutions found.`
        });
    }

    // --- Render Warnings ---
    if (warningsList.length > 0) {
        warningsContainer.style.display = 'block';
        warningsList.forEach(w => {
            // Colors: warning = Orange/Amber, info = Blue/Light
            const color = w.type === 'warning' ? '#f59e0b' : '#60a5fa'; 
            const icon = w.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
            
            warningsContainer.innerHTML += `
                <div style="margin-bottom: 6px; color: ${color}; display: flex; align-items: flex-start; gap: 8px; font-size: 0.9em; line-height: 1.4;">
                    <i class="fas ${icon}" style="margin-top: 3px;"></i>
                    <span>${w.text}</span>
                </div>
            `;
        });
    } else {
        warningsContainer.style.display = 'none';
    }
    
    // 8. Final Updates
    updateDifficultyAnalysis();
    setupConditionFilters();
    renderSolutionsList(parseInt(document.getElementById('maxShow')?.value) || 200);
    
    // Final Status Message
    const maxAnalysis = parseInt(document.getElementById('maxAnalysisLimit')?.value) || 10000;
    
    if (GameState.results.abortFlag) {
        showStatus('Cancelled.');
    } else if (totalFound >= maxAnalysis) {
        showStatus(`Analysis Cap Reached: Found ${totalFound} solutions.`);
    } else if (totalFound === 0) {
        showStatus('No solutions found.', true);
    } else {
        showStatus(`Analysis Complete: Found ${totalFound} solutions.`);
    }
}