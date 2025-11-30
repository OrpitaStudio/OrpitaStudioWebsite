/**
 * analysis-viewer.js
 * Complete & Optimized for GameState V3.0
 * Restores all analysis features: Conditional Intersection, Heatmap, & Detailed Lists.
 */

// --- I. DOM Elements for Analysis & Display ---
const blocksCountEl = document.getElementById('blocksCount');
const switchesCountEl = document.getElementById('switchesCount');
const mustBombsCountEl = document.getElementById('mustBombsCount');
const cellCountEl = document.getElementById('cellCount');
const solutionsCountEl = document.getElementById('solutionsCount');
// [!] تم حذف: const maxStarSeenEl = document.getElementById('maxStarSeen');
const exportDataEl = document.getElementById('exportData');
const warningsContainer = document.getElementById('warningsContainer');

// --- II. Helper Functions for Export Data Structure ---

/**
 * Parses GameState.grid Sets into the array of objects required by the export format.
 * Format: { id: number, state: 'BLOCK' | 'SWITCH_ON' | 'BOMB' }
 * @returns {Array<{id: number, state: string}>} Sorted array of initial cells.
 */
function getInitialCells() {
    const initialCells = [];
    
    // Helper to register cell state, ensuring no duplicates.
    const registerCell = (id, state) => {
        if (!initialCells.find(c => c.id === id)) {
            initialCells.push({ id: id, state: state });
        }
    };

    // 1. Blocks
    GameState.grid.blocks.forEach(id => registerCell(id, 'BLOCK'));
    // [!] تم حذف منطق النجوم
    // 3. Switches (defaulting to ON state for export)
    GameState.grid.switches.forEach(id => registerCell(id, 'SWITCH_ON'));
    // 4. Must-Bombs
    GameState.grid.mustBombs.forEach(id => registerCell(id, 'BOMB'));
    
    // Sort by ID for canonical/clean output
    return initialCells.sort((a, b) => a.id - b.id);
}

/**
 * Reads star conditions from the UI, flattens them, and filters out invalid ones.
 * IMPORTANT FIX: Flattens the array of arrays and filters out invalid conditions correctly.
 * @returns {Array<Object>} Flat array of valid star condition objects.
 */
function getStarConditionsFromUI() {
    // بما أننا ألغينا مفهوم النجوم كشرط، يمكن تبسيط هذه الدالة لإرجاع مصفوفة فارغة 
    // إذا كنت لا تزال تستخدم شروط C1, C2, C3 لأغراض أخرى (كالتحليل الشرطي)، فاحتفظ بالمنطق
    // إذا كان مفهوم الـ "Stars" في الكود يشير إلى شروط C1، C2، C3، فسنترك المنطق كما هو
    // (بناءً على الكود المرفق، StarConditions هي شروط الحل C1, C2, C3، وليست نجوم اللعبة)
    // لذلك، سنحافظ على هذه الدالة كما هي.
    const allStarConditions = [];
    for (let starId = 1; starId <= 3; starId++) {
        const containerEl = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
        if (!containerEl) { allStarConditions.push([]); continue; }
        const row = containerEl.querySelector('.condition-row');
        if (!row) { allStarConditions.push([]); continue; }

        const typeSelect = row.querySelector('.condition-type-select');
        const type = typeSelect.value;
        if (!type) { allStarConditions.push([]); continue; }

        const template = CONDITION_TEMPLATES[type]; // Assumes CONDITION_TEMPLATES is global
        const valueArea = row.querySelector('.condition-value-area');
        const inputs = {};
        let valid = true;

        valueArea.querySelectorAll('[data-key]').forEach(inputEl => {
            const key = inputEl.getAttribute('data-key');
            const value = String(inputEl.value || '').trim();
            if (value === '') {
                // showStatus(`Error: condition input empty in Star ${starId}.`, true);
                valid = false;
                return;
            }
            inputs[key] = value;
        });

        if (!valid) {
             allStarConditions.push([]);
             continue;
        }

        const conditionObject = template.parser(inputs);
        if (!conditionObject) { 
             allStarConditions.push([]);
             continue;
        }
        allStarConditions.push([conditionObject]);
    }
    // Flatten the array of arrays and filter out empty/null conditions.
    return allStarConditions.flat().filter(c => c); 
}

/**
 * Updates the export text area with the current level configuration.
 * This function converts the list of star conditions into the required flat object structure 
 * and generates the JSON data for export.
 */
function updateExportData() {
    
    // 1. Get and flatten star conditions array
    const starConditionsArray = getStarConditionsFromUI().flat();
    
    // 2. Read remoteId
    const remoteId = document.getElementById('exportFileName').value.trim() || "level_custom";
    
    // 3. Extract best solution's placement IDs
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
    
    // 4. Convert conditions into final flat object
    const starConditionsObject = starConditionsArray.reduce((acc, cond) => {
        
        switch (cond.type) {
            case 'getScore':
                acc.getScore = cond.value;
                break;
                
            case 'placeBombAt':
                acc.placeBombAt = cond.cells || cond.requirements?.map(r => r.id);
                break;
                
            case 'anyCellValue':
                acc.anyCellValue = cond.value;
                break;
                
            case 'cellValues':
                acc.cellValues = cond.requirements;
                break;
                
            case 'emptyCellsCount':
                acc.emptyCellsCount = cond.value;
                break;
                
            case 'setSwitches':
                acc.setSwitches = cond.requirements;
                break;
        }
        
        return acc;
    }, {});
    
    // 5. Build final JSON
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
        // [!] Star Conditions ما زالت مطلوبة لتصدير شروط C1/C2/C3، لذا نتركها
        starConditions: starConditionsObject,
        solution: bestSolution ? { placementIds: solutionPlacementIds } : null
    };
    
    exportDataEl.value = JSON.stringify(data);
}


// --- III. Pre/Post-Solve Status Updates ---

function updateCounts() {
    const total = GameState.config.rows * GameState.config.cols;
    cellCountEl.textContent = total;
    blocksCountEl.textContent = GameState.grid.blocks.size;
    // [!] تم حذف: starsCountEl.textContent = GameState.grid.stars.size;
    switchesCountEl.textContent = GameState.grid.switches.size;
    mustBombsCountEl.textContent = GameState.grid.mustBombs.size;
}

// ... (Rest of the analysis-viewer.js file content, such as postSolveUpdates, setupConditionFilters, etc.)

function clearAnalysis() {
    document.getElementById('analysisTargets').innerHTML = '';
    // [!] تم حذف: document.getElementById('analysisStars').innerHTML = '';
    document.getElementById('analysisConditions').innerHTML = '';
    document.getElementById('solutionsList').innerHTML = '';
    solutionsCountEl.textContent = 0;
    // [!] تم حذف: maxStarSeenEl.textContent = 0;
    warningsContainer.innerHTML = '';
    warningsContainer.style.display = 'none';
    
    // Reset Heatmap Data
    GameState.results.bombProbabilityMap = {};
}

// --- III. Analysis Logic & Difficulty ---

function calculateDifficulty(solutions, totalCombinations) {
    if (!solutions || solutions.length === 0 || totalCombinations <= 0n) {
        return totalCombinations > 0n ? 100 : 0;
    }
    const solutionsBig = BigInt(solutions.length);
    const totalCombBig = BigInt(totalCombinations);
    const difficultyBig = ((totalCombBig - solutionsBig) * 100n) / totalCombBig;
    return Number(difficultyBig);
}

function updateDifficultyAnalysis() {
    const solutions = GameState.results.solutions;
    const totalSpace = GameState.results.lastTotalCombinations > 0n ? GameState.results.lastTotalCombinations : 1n;

    if (solutions.length === 0) {
        document.getElementById('difficultyFill').style.width = '0%';
        document.getElementById('difficultyLabel').textContent = '—';
        document.getElementById('difficultyDetails').innerHTML = '';
        return;
    }
    
    const validCount = BigInt(solutions.length);
    const probabilityE4 = (validCount * 10000n) / totalSpace; 
    const probabilityPct = Number(probabilityE4) / 100; 
    
    let difficultyScore = 100 - probabilityPct;
    if (difficultyScore < 0) difficultyScore = 0; 
    
    const difficultyFill = document.getElementById('difficultyFill');
    const difficultyLabel = document.getElementById('difficultyLabel');
    
    let diffText = 'Easy';
    let diffClass = 'difficulty-easy';
    if(probabilityPct < 0.1) { diffText = 'Extreme'; diffClass = 'difficulty-hard'; }
    else if(probabilityPct < 10) { diffText = 'Hard'; diffClass = 'difficulty-hard'; }
    else if(probabilityPct < 30) { diffText = 'Medium'; diffClass = 'difficulty-medium'; }
    
    difficultyFill.style.width = `${difficultyScore}%`;
    difficultyFill.className = `difficulty-fill ${diffClass}`;
    difficultyLabel.textContent = `${difficultyScore.toFixed(2)}% (${diffText})`;
    
    const details = `
        <div style="display:flex; justify-content:space-between;">
            <span>Valid Solutions:</span> <span>${solutions.length}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span>Total Permutations:</span> <span>${humanNumberBig(totalSpace)}</span>
        </div>
        <div style="margin-top:5px; border-top:1px solid #333; padding-top:5px; color:var(--accent-gold)">
            Win Chance (Random): ${probabilityPct.toFixed(4)}%
        </div>
    `;
    document.getElementById('difficultyDetails').innerHTML = details;

    // استدعاء التحليلات الأخرى (يتم استدعاء تحليل التداخل لاحقاً في orchestrator لضمان الترتيب)
    updateExportData();
}

function calculateHeatmap() {
    const solutions = GameState.results.solutions;
    const totalCells = GameState.config.rows * GameState.config.cols;
    const heatmapData = new Array(totalCells).fill(0);
    let maxFrequency = 0;

    if (solutions.length === 0) {
        GameState.results.heatmapData = null;
        GameState.results.heatmapMax = 0;
        return;
    }

    solutions.forEach(sol => {
        // جمع كل أنواع القنابل
        const allBombs = new Set([
            ...(sol.normalBombs || []), 
            ...(sol.powerBombs || []), 
            ...(sol.negativeBombs || [])
        ]);
        allBombs.forEach(id => {
            if (id >= 0 && id < totalCells) {
                heatmapData[id]++;
                if (heatmapData[id] > maxFrequency) {
                    maxFrequency = heatmapData[id];
                }
            }
        });
    });

    GameState.results.heatmapData = heatmapData;
    GameState.results.heatmapMax = maxFrequency;
}

// دالة حساب الهيت ماب (تم استرجاعها)
function calculateBombProbability() {
    const solutions = GameState.results.solutions;
    const total = GameState.config.rows * GameState.config.cols;
    
    // تهيئة الخريطة
    GameState.results.bombProbabilityMap = {};
    for (let i = 0; i < total; i++) { GameState.results.bombProbabilityMap[i] = 0; }
    
    if (solutions.length === 0) return;

    const bombCounts = {}; 
    solutions.forEach(solution => {
        const allBombs = new Set([...solution.normalBombs, ...solution.powerBombs, ...solution.negativeBombs]);
        allBombs.forEach(bombIndex => {
            bombCounts[bombIndex] = (bombCounts[bombIndex] || 0) + 1;
        });
    });

    for (let i = 0; i < total; i++) {
        if (bombCounts[i]) {
            GameState.results.bombProbabilityMap[i] = bombCounts[i] / solutions.length;
        }
    }
}

// analysis-viewer.js: إضافة/تعديل منطق Heatmap

// ... (التعريفات في بداية الملف) ...

/**
 * دالة رئيسية لتحديث عرض الشبكة بالكامل
 * (يفترض وجودها أو يجب إنشاؤها لاستدعاء renderHeatmap)
 */
function updateGridDisplay() {
    // ... (منطق إنشاء الخلايا وتحديثها) ...
    
    // التأكد من استدعاء renderHeatmap في نهاية عملية تحديث الشبكة
    renderHeatmap();
}

/**
 * تحسب وتصوّر خريطة الكثافة (Heatmap) بناءً على نوع القنبلة المختار وحالة الحلول.
 * اللوجيك المحدث:
 * 1. إذا كان هناك حلول: تعرض الأرقام فقط.
 * 2. إذا لم يكن هناك حلول: تعرض الأرقام + تدرج اللون الأحمر.
 */
// analysis-viewer.js



// 2. الدالة الجديدة للـ Heatmap بالمنطق المطلوب
// analysis-viewer.js

function renderHeatmap() {
    const { rows, cols } = GameState.config;
    const solutions = GameState.results.solutions;
    const showHeatmap = GameState.results.showHeatmap;
    const heatmapType = GameState.results.heatmapType;
    
    const totalSolutions = solutions.length;
    const hasSolutions = totalSolutions > 0;
    
    // تنظيف العرض القديم
    for (let i = 0; i < rows * cols; i++) {
        const cellEl = document.getElementById(`c${i}`);
        if (!cellEl) continue;
        
        cellEl.style.backgroundColor = '';
        const percentEl = cellEl.querySelector('.heatmap-percent');
        if (percentEl) percentEl.textContent = '';
    }
    
    if (!showHeatmap) return;
    
    // حساب التكرارات
    const counts = new Array(rows * cols).fill(0);
    
    solutions.forEach(sol => {
        let bombIndices = [];
        if (heatmapType === 'all') {
            bombIndices = [...sol.normalBombs, ...sol.powerBombs, ...sol.negativeBombs];
        } else if (heatmapType === 'normal') {
            bombIndices = sol.normalBombs;
        } else if (heatmapType === 'power') {
            bombIndices = sol.powerBombs;
        } else if (heatmapType === 'negative') {
            bombIndices = sol.negativeBombs;
        }
        
        bombIndices.forEach(id => {
            // [تم التعديل] نسمح بحساب السويتشات، نستثني فقط البلوكات والـ MustBombs
            if (!GameState.grid.blocks.has(id) && !GameState.grid.mustBombs.has(id)) {
                counts[id]++;
            }
        });
    });
    
    // الرسم
    for (let i = 0; i < rows * cols; i++) {
        const cellEl = document.getElementById(`c${i}`);
        // [تم التعديل] السماح بالرسم داخل السويتشات
        if (!cellEl || GameState.grid.blocks.has(i) || GameState.grid.mustBombs.has(i)) continue;
        
        const count = counts[i];
        
        // إذا كان هناك حلول، والخلية صفرية، لا نرسم شيئاً
        if (count === 0 && hasSolutions) continue;
        
        let maxCount = Math.max(...counts, 1);
        let percent = 0;
        
        if (hasSolutions) {
            percent = Math.round((count / totalSolutions) * 100);
        } else {
            percent = Math.round((count / maxCount) * 100);
        }
        
        let percentEl = cellEl.querySelector('.heatmap-percent');
        if (percentEl && (percent > 0 || !hasSolutions)) {
            percentEl.textContent = `${percent}%`;
        }
        
        // تطبيق الألوان
        if (hasSolutions) {
            cellEl.style.backgroundColor = '';
        } else {
            // اللون الأحمر عند عدم وجود حلول
            const opacity = (percent / 100) * 0.8;
            if (opacity > 0) {
                cellEl.style.backgroundColor = `rgba(239, 68, 68, ${opacity})`;
            }
        }
    }
}

// ... (باقي محتوى الملف) ...
// 2. دالة التحليل الشرطي (الجدول الأول: If Solved First)
function updateConditionalAnalysis() {
    const container = document.getElementById('analysisConditions');
    if(!container) return;

    const solutions = GameState.results.solutions;
    const totalSols = solutions.length;

    let html = `<h4 style="margin:10px 0 5px 0; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Conditional Analysis (If Solved First)</h4>`;
    html += `<table style="width:100%; font-size:0.85em; text-align:left; border-collapse: collapse;">`;
    html += `<tr style="color:#888;"><th>Condition</th><th>Valid Sols</th><th>Reduction</th></tr>`;

    ['C1', 'C2', 'C3'].forEach((cLabel, idx) => {
        const matchingSols = solutions.filter(s => s.conditionStatus && s.conditionStatus[idx]).length;
        
        if (matchingSols > 0) {
            const coverage = ((matchingSols / totalSols) * 100).toFixed(1);
            let rowColor = 'var(--text-muted)';
            if(coverage < 10) rowColor = 'var(--accent-danger)';
            else if(coverage > 80) rowColor = 'var(--accent-success)';

            html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:4px;">${cLabel}</td>
                <td style="color:${rowColor}"><b>${matchingSols}</b> <span style="font-size:0.8em">(${coverage}%)</span></td>
                <td style="padding:4px;">TBD</td> 
            </tr>`;
        } else {
            html += `<tr><td colspan="3" style="color:var(--text-muted); padding:4px;">${cLabel}: No solutions</td></tr>`;
        }
    });
    html += `</table>`;
    html += `<div class="small" style="margin-top:5px; color:#666;">* High % means this condition is flexible.</div>`;

    container.innerHTML = html; // نضع الجدول الأول
}

// --- IV. Solution List Rendering ---

function renderSolutionsList(limit) {
    const cont = document.getElementById('solutionsList');
    cont.innerHTML = ''; 
    
    const list = GameState.results.solutions;
    const show = Math.min(limit, list.length);
    
    // استخدام DocumentFragment لتحسين الأداء
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < show; i++) {
        let sol = list[i];
        let row = document.createElement('div');
        row.className = 'solRow';
        
        let switchInfo = sol.switchState.length > 0 ? `SW_ON: [${sol.switchState.join(',')}]` : 'SW_ON: []';
        // [!] تم حذف: const starBadge = `<span class="badge">★=${sol.starsCount}</span>`;
        
        // استرجاع عرض نقاط الشروط (C1, C2, C3)
        const condStatus = sol.conditionStatus || [false, false, false];
        const statusHtml = `
            <span style="font-size: 0.8em; margin-left: 10px;">
                C1:<b style="color:${condStatus[0]?'var(--accent-success)':'var(--accent-danger)'}">•</b> 
                C2:<b style="color:${condStatus[1]?'var(--accent-success)':'var(--accent-danger)'}">•</b> 
                C3:<b style="color:${condStatus[2]?'var(--accent-success)':'var(--accent-danger)'}">•</b>
            </span>
        `;
        
        row.innerHTML = `
            <div class="solMeta" style="display:flex; justify-content: space-between;">
                <div>#${i+1} ${switchInfo} ${statusHtml}</div>
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

// دوال الفلترة (Window Exposed)
window.filterBySum = function(sum){
    const filtered = GameState.results.solutions.filter(s => s.sum === sum);
    renderFilteredList(filtered);
}

// [!] تم حذف دالة filterByStars بالكامل

function renderFilteredList(list){
    const cont = document.getElementById('solutionsList');
    cont.innerHTML = '';
    if(list.length === 0){ cont.innerHTML = '<div class="small">No matching solutions.</div>'; return; }
    
    const fragment = document.createDocumentFragment();
    // Cap rendered items for performance
    for(let i=0; i<list.length && i<1000; i++){
        let sol = list[i];
        let row = document.createElement('div');
        row.className = 'solRow';
        
        let switchInfo = sol.switchState.length > 0 ? `SW_ON: [${sol.switchState.join(',')}]` : 'SW_ON: []';
        // [!] تم حذف: const starBadge = `<span class="badge">★=${sol.starsCount}</span>`;
        
        const condStatus = sol.conditionStatus || [false, false, false];
        const statusHtml = `
            <span style="font-size: 0.8em; margin-left: 10px;">
                C1:<b style="color:${condStatus[0]?'var(--accent-success)':'var(--accent-danger)'}">•</b> 
                C2:<b style="color:${condStatus[1]?'var(--accent-success)':'var(--accent-danger)'}">•</b> 
                C3:<b style="color:${condStatus[2]?'var(--accent-success)':'var(--accent-danger)'}">•</b>
            </span>
        `;
        
        row.innerHTML = `
            <div class="solMeta" style="display:flex; justify-content: space-between;">
                <div>#${i+1} ${switchInfo} ${statusHtml}</div>
                <div><span class="badge">S=${sol.sum}</span></div>
                </div>`;
        
        row.addEventListener('click', ()=> viewSolution(sol));
        fragment.appendChild(row);
    }
    cont.appendChild(fragment);
}

// --- V. Post-Solve Orchestrator ---

function handlePostSolveAnalysis(startTime) {
    const totalTime = performance.now() - startTime;
    const solutions = GameState.results.solutions;
    
    // 1. تحديث حالة التقدم
    document.getElementById('combCount').textContent = humanNumberBig(GameState.results.lastTotalCombinations);
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressPct').textContent = '100%';
    document.getElementById('timeInfo').textContent = `${Math.round(totalTime)}ms - Done`;
    document.getElementById('cancel').disabled = true;
    calculateHeatmap(); 
    // 2. فرز الحلول
    // [!] تم تعديل الفرز ليعتمد فقط على المجموع (Sum) بدلاً من النجوم
    solutions.sort((a,b)=> (a.sum - b.sum)); // فرز تصاعدي حسب المجموع
    solutionsCountEl.textContent = solutions.length;
    
    const countsByTarget = {}, countsByStars = {};
    // [!] تم حذف: let maxStar = 0;
    
    // حساب تداخل الشروط (المنطق الذي كان مفقوداً)
    const countsByConditionStatus = {
        'C1_Only': 0, 'C2_Only': 0, 'C3_Only': 0,
        'C1_C2': 0, 'C1_C3': 0, 'C2_C3': 0,
        'C1_C2_C3': 0,
        'None': 0 
    };

    for(let s of solutions){
        countsByTarget[s.sum] = (countsByTarget[s.sum] || 0) + 1;
        // [!] تم حذف: countsByStars[s.starsCount] = (countsByStars[s.starsCount] || 0) + 1;
        // [!] تم حذف: if(s.starsCount > maxStar) maxStar = s.starsCount;

        const [c1, c2, c3] = s.conditionStatus || [false, false, false];
        const count = [c1, c2, c3].filter(v => v).length;
        
        if (count === 0) countsByConditionStatus['None']++;
        else if (c1 && c2 && c3) countsByConditionStatus['C1_C2_C3']++;
        else if (c1 && c2) countsByConditionStatus['C1_C2']++;
        else if (c1 && c3) countsByConditionStatus['C1_C3']++;
        else if (c2 && c3) countsByConditionStatus['C2_C3']++;
        else if (c1) countsByConditionStatus['C1_Only']++;
        else if (c2) countsByConditionStatus['C2_Only']++;
        else if (c3) countsByConditionStatus['C3_Only']++;
    }
    
    // [!] تم حذف: maxStarSeenEl.textContent = maxStar;
    
    // 3. عرض الملخصات
    let tHtml = '';
    Object.keys(countsByTarget).sort((a,b)=>a-b).forEach(t => {
        tHtml += `<div>Value ${t}: ${countsByTarget[t]||0} <button class="btnSmall" onclick="filterBySum(${t})">View</button></div>`;
    });
    document.getElementById('analysisTargets').innerHTML = tHtml;
    
    // [!] تم حذف عرض ملخص النجوم
    document.getElementById('analysisStars').innerHTML = ''; // للتأكد من مسح أي محتوى قديم

    // بناء الجدول الأول (Conditional Analysis)
    updateConditionalAnalysis();

    // ⭐️ إضافة شبكة التداخل (Intersection Grid) ⭐️
    // نقوم بإضافتها إلى الحاوية الموجودة بدلاً من استبدالها
    let condHtml = `
        <h4 style="margin: 10px 0 5px 0; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Intersection Breakdown</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.9em;">
            <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">Individual:</div>
            <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1);">Intersection:</div>
            
            <div>C1 Only: <b>${countsByConditionStatus['C1_Only']}</b></div>
            <div>C1 & C2: <b>${countsByConditionStatus['C1_C2']}</b></div>
            
            <div>C2 Only: <b>${countsByConditionStatus['C2_Only']}</b></div>
            <div>C1 & C3: <b>${countsByConditionStatus['C1_C3']}</b></div>
            
            <div>C3 Only: <b>${countsByConditionStatus['C3_Only']}</b></div>
            <div>C2 & C3: <b>${countsByConditionStatus['C2_C3']}</b></div>

            <div style="grid-column: 1 / span 2; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 5px;">
                All 3 (C1 & C2 & C3): <b>${countsByConditionStatus['C1_C2_C3']}</b>
            </div>
            <div style="grid-column: 1 / span 2;">
                None (0 Stars): <b>${countsByConditionStatus['None']}</b>
            </div>
        </div>
    `;
    
    // نضيف الشبكة أسفل الجدول الذي أنشأته updateConditionalAnalysis
    document.getElementById('analysisConditions').innerHTML += condHtml;


    // 4. التحذيرات
    warningsContainer.innerHTML = '';
    let warningsFound = false;
    const bombs1Count = parseInt(document.getElementById('bombs1').value);
    const bombs2Count = parseInt(document.getElementById('bombs2').value);
    const bombsNegCount = parseInt(document.getElementById('bombsNeg').value);
    const lastTotalCombinations = GameState.results.lastTotalCombinations;

    if (lastTotalCombinations > 0n && BigInt(solutions.length) * 100n / lastTotalCombinations >= 90n) {
        warningsContainer.innerHTML += `<div>تحذير: اللغز سهل للغاية. أكثر من 90% من التوافيق الممكنة هي حلول صالحة.</div>`;
        warningsFound = true;
    }

    const totalBombs = bombs1Count + bombs2Count + bombsNegCount;
    // [!] تم تعديل حساب totalConstraints لإزالة النجوم
    const totalConstraints = GameState.grid.mustBombs.size; 
    if (totalBombs > 0 && totalConstraints / totalBombs >= 0.5) {
        warningsContainer.innerHTML += `<div>تحذير: قيود كثيرة. عدد القنابل الإلزامية يمثل 50% أو أكثر من إجمالي القنابل.</div>`;
        warningsFound = true;
    }
    
    if(warningsFound) { warningsContainer.style.display = 'block'; } 
    else { warningsContainer.style.display = 'none'; }
    
    // 5. التحديثات النهائية
    calculateBombProbability(); // تم استرجاعها
    updateDifficultyAnalysis();
    setupConditionFilters();
    renderSolutionsList(parseInt(document.getElementById('maxShow')?.value)||200);
    
    const maxSolutions = parseInt(document.getElementById('maxSolutions').value) || 5000;
    if(GameState.results.abortFlag && solutions.length >= maxSolutions) showStatus(`Stopped: max solutions cap (${maxSolutions}) reached.`);
    else if(GameState.results.abortFlag) showStatus('Cancelled.');
    else if(solutions.length === 0) showStatus('No solutions found.', true);
    else showStatus(`Found ${solutions.length} solutions!`);
}

// --- VI. Filters Listeners ---
function setupConditionFilters() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');
    
    if (applyBtn) {
        applyBtn.onclick = function() { // Use onclick to prevent multiple listeners
            filterByConditionStatus();
        };
    }
    
    if (resetBtn) {
        resetBtn.onclick = function() {
            const ids = ['filterC1', 'filterC2', 'filterC3'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.checked = true;
            });
            renderSolutionsList(parseInt(document.getElementById('maxShow')?.value)||200); 
        };
    }
}

function filterByConditionStatus() {
    const filterC1 = document.getElementById('filterC1')?.checked;
    const filterC2 = document.getElementById('filterC2')?.checked;
    const filterC3 = document.getElementById('filterC3')?.checked;
    
    const solutions = GameState.results.solutions;
    if (solutions.length === 0) return;

    let filteredList = solutions.filter(sol => {
        const [c1_met, c2_met, c3_met] = sol.conditionStatus || [false, false, false];
        if (filterC1 && !c1_met) return false;
        if (filterC2 && !c2_met) return false;
        if (filterC3 && !c3_met) return false;
        return true;
    });

    renderFilteredList(filteredList);
}