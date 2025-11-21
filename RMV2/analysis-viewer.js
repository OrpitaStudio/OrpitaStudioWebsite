/**
 * analysis-viewer.js
 * Complete & Optimized for GameState V3.0
 * Restores all analysis features: Conditional Intersection, Heatmap, & Detailed Lists.
 */

// --- I. DOM Elements for Analysis & Display ---
const blocksCountEl = document.getElementById('blocksCount');
const starsCountEl = document.getElementById('starsCount');
const switchesCountEl = document.getElementById('switchesCount');
const mustBombsCountEl = document.getElementById('mustBombsCount');
const cellCountEl = document.getElementById('cellCount');
const solutionsCountEl = document.getElementById('solutionsCount');
const maxStarSeenEl = document.getElementById('maxStarSeen');
const exportDataEl = document.getElementById('exportData');
const warningsContainer = document.getElementById('warningsContainer');

// --- II. Pre/Post-Solve Status Updates ---

function updateCounts() {
    const total = GameState.config.rows * GameState.config.cols;
    cellCountEl.textContent = total;
    blocksCountEl.textContent = GameState.grid.blocks.size;
    switchesCountEl.textContent = GameState.grid.switches.size;
    starsCountEl.textContent = GameState.grid.stars.size;
    mustBombsCountEl.textContent = GameState.grid.mustBombs.size;
}

/**
 * تحليل-viewer.js
 * دالة مساعدة جديدة لتحويل الـ Set إلى مصفوفة الكائنات المطلوبة
 */
function getInitialCells() {
    const initialCells = [];
    
    // 1. الخلايا المحظورة (BLOCKS)
    GameState.grid.blocks.forEach(id => {
        initialCells.push({ id: id, state: "BLOCK" });
    });

    // 2. النجوم (STARS)
    GameState.grid.stars.forEach(id => {
        initialCells.push({ id: id, state: "STAR" });
    });

    // 3. المفاتيح (SWITCHES)
    // لا يمكننا تحديد ما إذا كان "ON" أو "OFF" هنا، سنفترض أنها 'SWITCH' فقط
    // إذا كنت تحتاج إلى حالة أولية (ON/OFF)، يجب أن يكون هناك مكان لتخزينها في GameState.
    GameState.grid.switches.forEach(id => {
        // بما أن النظام لا يخزن حالة البداية، سنستخدم "SWITCH" كتصنيف عام. 
        // إذا أضفت حقل حالة في GameState، يمكن التمييز هنا.
        initialCells.push({ id: id, state: "SWITCH" }); 
    });

    // 4. القنابل المطلوبة (MUST_BOMBS)
    GameState.grid.mustBombs.forEach(id => {
        initialCells.push({ id: id, state: "BOMB" }); // بما أنها قنابل موضوعة مسبقًا
    });

    return initialCells;
}

function updateExportData() {
    // 🆕 نحتاج إلى دالة getStarConditionsFromUI() لسحب بيانات الشروط
    // هذه الدالة موجودة بالفعل في solver.js (سنتصل بها).
    const starConditionsUI = getStarConditionsFromUI(); // يُفترض أن تكون متاحة هنا

    // 🆕 نختار أفضل حل تم العثور عليه (أول حل في القائمة الحالية)
    const bestSolution = GameState.results.solutions[0] || null;
    let solutionPlacement = null;

    if (bestSolution) {
        // نجمع IDs القنابل من الأنواع الثلاثة (normalBombs, powerBombs, negativeBombs)
        const allBombs = [
            ...(bestSolution.normalBombs || []),
            ...(bestSolution.powerBombs || []),
            ...(bestSolution.negativeBombs || [])
        ];
        // يجب إزالة أي تكرارات قد تنتج عن الدمج
        solutionPlacement = Array.from(new Set(allBombs)); 
    }


    const data = {
        "remoteId": document.getElementById('exportFileName').value.trim() || "level_custom",
        "gridColumns": GameState.config.cols,
        "gridRows": GameState.config.rows,
        
        // 💣 Bomb Counts
        "bombsCount": parseInt(document.getElementById('bombs1').value) || 0,
        "bombsPlusCount": parseInt(document.getElementById('bombs2').value) || 0,
        "bombsNegCount": parseInt(document.getElementById('bombsNeg').value) || 0,
        
        // 🎯 Target Range
        "targetMin": parseInt(document.getElementById('targetMin').value) || -1,
        "targetMax": parseInt(document.getElementById('targetMax').value) || -1,

        // 🧱 Initial Grid Configuration
        "initialCells": getInitialCells(), // نستخدم الدالة المساعدة الجديدة

        // ⭐ Star Conditions
        "starConditions": starConditionsUI.reduce((acc, cond) => {
            // تحويل array من الشروط إلى كائن له خصائص (كما في المثال)
            switch(cond.type) {
                case 'getScore': acc.getScore = cond.value; break;
                case 'placeBombAt': acc.placeBombAt = cond.requirements.map(r => r.id); break;
                case 'anyCellValue': acc.anyCellValue = cond.value; break;
                case 'cellValues': acc.cellValues = cond.requirements; break;
                case 'emptyCellsCount': acc.emptyCellsCount = cond.value; break;
                case 'setSwitches': acc.setSwitches = cond.requirements; break;
            }
            return acc;
        }, {}),

        // 💡 Best Solution (إذا وجد)
        "solution": bestSolution ? {
            "placementIds": solutionPlacement
        } : null
    };

    // ... (بقية الدالة: تحويل data إلى JSON وعرضه)
    exportDataEl.value = JSON.stringify(data, null, 2);
}

function clearAnalysis() {
    document.getElementById('analysisTargets').innerHTML = '';
    document.getElementById('analysisStars').innerHTML = '';
    document.getElementById('analysisConditions').innerHTML = '';
    document.getElementById('solutionsList').innerHTML = '';
    solutionsCountEl.textContent = 0;
    maxStarSeenEl.textContent = 0;
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
        const starBadge = `<span class="badge">★=${sol.starsCount}</span>`;
        
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
                <div><span class="badge">S=${sol.sum}</span> ${starBadge}</div>
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

window.filterByStars = function(k){
    const filtered = GameState.results.solutions.filter(s => s.starsCount === k);
    renderFilteredList(filtered);
}

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
        const starBadge = `<span class="badge">★=${sol.starsCount}</span>`;
        
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
                <div><span class="badge">S=${sol.sum}</span>${starBadge}</div>
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

    // 2. فرز الحلول
    solutions.sort((a,b)=> (b.starsCount - a.starsCount) || (a.sum - b.sum));
    solutionsCountEl.textContent = solutions.length;
    
    const countsByTarget = {}, countsByStars = {};
    let maxStar = 0;
    
    // حساب تداخل الشروط (المنطق الذي كان مفقوداً)
    const countsByConditionStatus = {
        'C1_Only': 0, 'C2_Only': 0, 'C3_Only': 0,
        'C1_C2': 0, 'C1_C3': 0, 'C2_C3': 0,
        'C1_C2_C3': 0,
        'None': 0 
    };

    for(let s of solutions){
        countsByTarget[s.sum] = (countsByTarget[s.sum] || 0) + 1;
        countsByStars[s.starsCount] = (countsByStars[s.starsCount] || 0) + 1;
        if(s.starsCount > maxStar) maxStar = s.starsCount;

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
    
    maxStarSeenEl.textContent = maxStar;
    
    // 3. عرض الملخصات
    let tHtml = '';
    Object.keys(countsByTarget).sort((a,b)=>a-b).forEach(t => {
        tHtml += `<div>Value ${t}: ${countsByTarget[t]||0} <button class="btnSmall" onclick="filterBySum(${t})">View</button></div>`;
    });
    document.getElementById('analysisTargets').innerHTML = tHtml;
    
    let sHtml = '';
    for(let k=0; k<=3; k++){
        const count = countsByStars[k] || 0;
        if (count > 0 || k === 0) { 
           sHtml += `<div>Stars = ${k}: ${count} <button class="btnSmall" onclick="filterByStars(${k})">View</button></div>`;
        }
    }
    document.getElementById('analysisStars').innerHTML = sHtml;

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
    const totalConstraints = GameState.grid.stars.size + GameState.grid.mustBombs.size; 
    if (totalBombs > 0 && totalConstraints / totalBombs >= 0.5) {
        warningsContainer.innerHTML += `<div>تحذير: قيود كثيرة. عدد النجوم والقنابل الإلزامية يمثل 50% أو أكثر من إجمالي القنابل.</div>`;
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
