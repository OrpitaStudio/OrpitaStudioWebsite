/**
 * analysis-viewer.js
 * * يتعامل مع جميع عمليات حساب ما بعد الحل، تحليل البيانات المرئي، وعرض قائمة الحلول.
 * * تم التحديث لدعم: تحليل تداخل الشروط (C1 & C2)، وفلترة الحلول حسب الشروط الفردية.
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

function updateCounts(){
    cellCountEl.textContent = (rows*cols);
    blocksCountEl.textContent = blocks.size;
    switchesCountEl.textContent = switches.size;
    starsCountEl.textContent = stars.size;
    mustBombsCountEl.textContent = mustBombs.size;
}

function updateExportData() {
    let data = {
        rows: rows,
        cols: cols,
        blocks: Array.from(blocks),
        switches: Array.from(switches),
        stars: Array.from(stars),
        mustBombs: Array.from(mustBombs),
        bombCount1: parseInt(document.getElementById('bombs1').value),
        bombCount2: parseInt(document.getElementById('bombs2').value),
        bombCountNeg: parseInt(document.getElementById('bombsNeg').value),
        targetMin: parseInt(document.getElementById('targetMin').value),
        targetMax: parseInt(document.getElementById('targetMax').value),
        targetMode: document.getElementById('modeTarget').value,
        starConditions: typeof getStarConditionsFromUI === 'function' ? getStarConditionsFromUI() : [] 
    };

    if (solutions.length > 0) {
        data.solutionsCount = solutions.length;
        data.difficultyScore = calculateDifficulty(solutions, lastTotalCombinations); 
        data.maxCustomStarsAchieved = Math.max(...solutions.map(s => s.starsCount));
    }

    exportDataEl.value = JSON.stringify(data, null, 2);
}

function clearAnalysis(){
    document.getElementById('analysisTargets').innerHTML = '';
    document.getElementById('analysisStars').innerHTML = '';
    // ⭐️ NEW: Clear the new conditions analysis container ⭐️
    document.getElementById('analysisConditions').innerHTML = '';
    document.getElementById('solutionsList').innerHTML = '';
    solutionsCountEl.textContent = 0;
    maxStarSeenEl.textContent = 0;
    bombProbabilityMap = {}; 
    warningsContainer.innerHTML = '';
    warningsContainer.style.display = 'none';
}


// --- III. Post-Solve Calculations and Display (Unchanged) ---

function calculateDifficulty(solutions, totalCombinations) {
    if (solutions.length === 0 || totalCombinations <= 0n) {
        return totalCombinations > 0n ? 100 : 0;
    }
    const solutionsBig = BigInt(solutions.length);
    const totalCombBig = BigInt(totalCombinations);
    const difficultyBig = ((totalCombBig - solutionsBig) * 100n) / totalCombBig;
    return Number(difficultyBig);
}

// --- في analysis-viewer.js ---

// 1. تعديل دالة الصعوبة الأساسية
function updateDifficultyAnalysis() {
    if (solutions.length === 0) {
        // ... (الكود القديم لحالة الصفر كما هو) ...
        return;
    }
    
    // Difficulty = 100% - (Winning Probability)
    // Winning Probability = Valid Solutions / Total Random Permutations
    
    const totalSpace = lastTotalCombinations > 0n ? lastTotalCombinations : 1n;
    const validCount = BigInt(solutions.length);
    
    // حساب النسبة المئوية للاحتمال (بدقة عالية)
    // نضرب في 10000 للحفاظ على الفواصل العشرية مع BigInt
    const probabilityE4 = (validCount * 10000n) / totalSpace; 
    const probabilityPct = Number(probabilityE4) / 100; // e.g. 1.25%
    
    // الصعوبة هي عكس الاحتمالية
    let difficultyScore = 100 - probabilityPct;
    if (difficultyScore < 0) difficultyScore = 0; // في حال كان الحل أكيداً
    
    // تحديث الـ UI
    const difficultyFill = document.getElementById('difficultyFill');
    const difficultyLabel = document.getElementById('difficultyLabel');
    
    // تصنيف النص
    let diffText = 'is that even a puzzle ?';
    let diffClass = 'difficulty-Easy';
    if(probabilityPct < 0.1) { diffText = 'Extreme'; diffClass = 'difficulty-hard'; }
    else if(probabilityPct < 10) { diffText = 'Hard'; diffClass = 'difficulty-hard'; }
    else if(probabilityPct < 30) { diffText = 'Medium'; diffClass = 'difficulty-medium'; }
    else if(probabilityPct < 70) { diffText = 'Easy'; diffClass = 'difficulty-Easy'; }
    
    
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

    // استدعاء التحليل الشرطي الجديد
    updateConditionalAnalysis();
    updateExportData();
}


// 2. إضافة دالة التحليل الشرطي (Conditional Analysis)
function updateConditionalAnalysis() {
    const container = document.getElementById('analysisConditions');
    if(!container) return;

    // سنحسب: إذا حقق اللاعب الشرط الأول، كم يتبقى من حلول؟ وما هي نسبة الحلول بالنسبة للمجموعة الكلية؟
    // P(Win | Star1) = Solutions(Star1) / Total(Star1)
    // *ملاحظة:* حساب Total(Star1) رياضياً معقد جداً بدون إعادة تشغيل السولفر.
    // لذا، سنستخدم مقاربة: "مدى تضييق نطاق البحث" (Filtration Rate).

    let html = `<h4 style="margin:10px 0 5px 0; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">Conditional Analysis (If Solved First)</h4>`;
    html += `<table style="width:100%; font-size:0.85em; text-align:left; border-collapse: collapse;">`;
    html += `<tr style="color:#888;"><th>Condition</th><th>Valid Sols</th><th>Reduces Search By</th></tr>`;

    const totalSols = solutions.length;

    ['C1', 'C2', 'C3'].forEach((cLabel, idx) => {
        // عدد الحلول التي تحقق هذا الشرط
        const matchingSols = solutions.filter(s => s.conditionStatus[idx]).length;
        
        if (matchingSols > 0) {
            // النسبة المئوية من الحلول الصالحة التي تحتوي على هذا الشرط
            const coverage = (100(matchingSols / totalSols) * 100).toFixed(1);
            
            // التفسير: إذا ركز اللاعب على تحقيق الشرط 1، فإن 20% فقط من الحلول الكلية ستبقى صالحة.
            // هذا يعطي مؤشراً على أن هذا الشرط "يقود" اللاعب نحو حل معين.
            
            let rowColor = 'var(--text-muted)';
            if(coverage < 10) rowColor = 'var(--accent-danger)'; // شرط نادر جداً (صعب)
            else if(coverage > 80) rowColor = 'var(--accent-success)'; // شرط شائع (سهل)

            html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:4px;">${cLabel}</td>
                <td style="color:${rowColor}"><b>${matchingSols}</b> <span style="font-size:0.8em">(${coverage}%)</span></td>
                <td style="padding:4px;">TBD*</td> 
            </tr>`;
        } else {
            html += `<tr><td colspan="3" style="color:var(--text-muted); padding:4px;">${cLabel}: No solutions</td></tr>`;
        }
    });
    html += `</table>`;
    html += `<div class="small" style="margin-top:5px; color:#666;">* High % means this condition is flexible. Low % means it forces a specific path.</div>`;

    // نضيف هذا إلى المحتوى الحالي بدلاً من استبداله
    const existing = container.innerHTML;
    // نتأكد من عدم التكرار إذا تم الاستدعاء مرتين
    if(!existing.includes('Conditional Analysis')) {
        container.innerHTML = existing + html;
    } else {
        // تحديث الجزء الخاص بالتحليل الشرطي فقط (يتطلب هيكلة DOM أفضل، لكن للإيجاز سنقوم بدمج بسيط)
        // في التطبيق الفعلي يفضل فصل الحاويات
         container.innerHTML = container.innerHTML.split('<h4 style="margin:10px')[0] + html;
    }
}

function calculateBombProbability() {
    bombProbabilityMap = {};
    const total = rows * cols;
    for (let i = 0; i < total; i++) { bombProbabilityMap[i] = 0; }
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
            bombProbabilityMap[i] = bombCounts[i] / solutions.length;
        }
    }
}


// --- IV. Solution List Rendering & Filtering (MODIFIED to show C1, C2, C3 status) ---

function renderSolutionsList(limit){
    let cont = document.getElementById('solutionsList');
    cont.innerHTML = '';
    let show = Math.min(limit, solutions.length);
    for(let i=0;i<show;i++){
        let sol = solutions[i];
        let row = document.createElement('div');
        row.className = 'solRow';
        // ⭐️ استخدام sol.switchState لعرض السويتشات المفعلة ⭐️
        let switchInfo = sol.switchState.length > 0 ? `SW_ON: [${sol.switchState.join(',')}]` : 'SW_ON: []';
        
        const starBadge = `<span class="badge" title="Custom Star Count">★=${sol.starsCount}</span>`; 
        
        // ⭐️ NEW: Show individual condition status ⭐️
        const condStatus = sol.conditionStatus || [false, false, false];
        const statusHtml = `
            <span style="font-size: 0.8em; margin-left: 10px; flex-shrink: 0;">
                C1:<b style="color:${condStatus[0]?'var(--easy)':'var(--danger)'}">•</b> 
                C2:<b style="color:${condStatus[1]?'var(--easy)':'var(--danger)'}">•</b> 
                C3:<b style="color:${condStatus[2]?'var(--easy)':'var(--danger)'}">•</b>
            </span>
        `;
        
        row.innerHTML = `<div class="solMeta" style="justify-content: space-between;"><div>#${i+1} ${switchInfo} ${statusHtml}</div><div><span class="badge">S=${sol.sum}</span> ${starBadge}</div></div>`;
        
        row.addEventListener('click', ()=> viewSolution(sol));
        cont.appendChild(row);
    }
    if(solutions.length > show){
        cont.innerHTML += `<div class="small">Showing ${show} of ${solutions.length}.</div>`;
    }
}

// الدوال العامة للـ 'onclick' في HTML 
window.filterBySum = function(sum){
    renderFilteredList(solutions.filter(s => s.sum === sum));
}

window.filterByStars = function(k){
    renderFilteredList(solutions.filter(s => s.starsCount === k));
}

function renderFilteredList(list){
    let cont = document.getElementById('solutionsList');
    cont.innerHTML = '';
    if(list.length===0){ cont.innerHTML = '<div class="small">No solutions match the criteria.</div>'; return; }
    for(let i=0;i<list.length && i<1000;i++){
        let sol = list[i];
        let div = document.createElement('div'); div.className='solRow';
        // ⭐️ استخدام sol.switchState لعرض السويتشات المفعلة ⭐️
        let switchInfo = sol.switchState.length > 0 ? `SW_ON: [${sol.switchState.join(',')}]` : 'SW_ON: []';
        
        const starBadge = `<span class="badge" title="Custom Star Count">★=${sol.starsCount}</span>`;
        
        // ⭐️ NEW: Show individual condition status ⭐️
        const condStatus = sol.conditionStatus || [false, false, false];
        const statusHtml = `
            <span style="font-size: 0.8em; margin-left: 10px; flex-shrink: 0;">
                C1:<b style="color:${condStatus[0]?'var(--easy)':'var(--danger)'}">•</b> 
                C2:<b style="color:${condStatus[1]?'var(--easy)':'var(--danger)'}">•</b> 
                C3:<b style="color:${condStatus[2]?'var(--easy)':'var(--danger)'}">•</b>
            </span>
        `;
        
        div.innerHTML = `<div class="solMeta" style="justify-content: space-between;"><div>#${i+1} ${switchInfo} ${statusHtml}</div><div><span class="badge">S=${sol.sum}</span>${starBadge}</div></div>`;
        
        div.addEventListener('click', ()=> viewSolution(sol));
        cont.appendChild(div);
    }
}

// ⭐️ NEW: Logic for filtering by individual condition status ⭐️
function filterByConditionStatus() {
    const filterC1 = document.getElementById('filterC1')?.checked;
    const filterC2 = document.getElementById('filterC2')?.checked;
    const filterC3 = document.getElementById('filterC3')?.checked;
    
    if (solutions.length === 0) return;

    let filteredList = solutions.filter(sol => {
        const [c1_met, c2_met, c3_met] = sol.conditionStatus || [false, false, false];
        
        // Logic: Solution must meet the condition if the filter is checked.
        if (filterC1 && !c1_met) return false;
        if (filterC2 && !c2_met) return false;
        if (filterC3 && !c3_met) return false;
        
        return true; // Passes all checked filters
    });

    renderFilteredList(filteredList);
}

// ⭐️ NEW: Setup filter button listeners ⭐️
function setupConditionFilters() {
    // التحقق من وجود العناصر قبل إضافة مستمعي الأحداث
    const applyBtn = document.getElementById('applyFiltersBtn');
    const resetBtn = document.getElementById('resetFiltersBtn');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', filterByConditionStatus);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset checkboxes to default (checked)
            const filterC1 = document.getElementById('filterC1');
            const filterC2 = document.getElementById('filterC2');
            const filterC3 = document.getElementById('filterC3');
            
            if (filterC1) filterC1.checked = true;
            if (filterC2) filterC2.checked = true;
            if (filterC3) filterC3.checked = true;
            
            // Reset list to main list
            renderSolutionsList(parseInt(document.getElementById('maxShow')?.value)||200); 
        });
    }
}


// --- V. The Post-Solve Orchestrator (MODIFIED - Detailed Condition Breakdown) ---

function handlePostSolveAnalysis(startTime) {
    const totalTime = performance.now() - startTime;
    
    // 1. تحديث حالة التقدم
    document.getElementById('combCount').textContent = humanNumberBig(lastTotalCombinations);
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressPct').textContent = '100%';
    document.getElementById('timeInfo').textContent = `${Math.round(totalTime/1000)}s - Done`;
    document.getElementById('cancel').disabled = true;

    // 2. فرز وإحصاء الحلول
    solutions.sort((a,b)=> (b.starsCount - a.starsCount) || (a.sum - b.sum));
    solutionsCountEl.textContent = solutions.length;
    
    const countsByTarget = {}, countsByStars = {};
    let maxStar = 0;
    
    // ⭐️ NEW: Calculate Condition Intersection Counts ⭐️
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
        
        // This is the logic for calculating individual/intersection counts
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
    
    // 3. عرض ملخصات التحليل
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

    // ⭐️ NEW: Render Condition Intersection Breakdown ⭐️
    let condHtml = `
        <h4 style="margin-bottom: 5px;">Solutions by Condition Intersection</h4>
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
    document.getElementById('analysisConditions').innerHTML = condHtml;


    // 4. منطق التحذيرات (Unchanged)
    warningsContainer.innerHTML = '';
    let warningsFound = false;
    const bombs1Count = parseInt(document.getElementById('bombs1').value);
    const bombs2Count = parseInt(document.getElementById('bombs2').value);
    const bombsNegCount = parseInt(document.getElementById('bombsNeg').value);

    // التحذير 1: اللغز سهل جداً
    if (lastTotalCombinations > 0n && BigInt(solutions.length) * 100n / lastTotalCombinations >= 90n) {
        warningsContainer.innerHTML += `<div>تحذير: اللغز سهل للغاية. أكثر من 90% من التوافيق الممكنة هي حلول صالحة.</div>`;
        warningsFound = true;
    }

    // التحذير 2: قيود كثيرة جداً
    const totalBombs = bombs1Count + bombs2Count + bombsNegCount;
    // Assuming stars.size refers to the old star cells; keeping this for now.
    const totalConstraints = stars.size + mustBombs.size; 
    if (totalBombs > 0 && totalConstraints / totalBombs >= 0.5) {
        warningsContainer.innerHTML += `<div>تحذير: قيود كثيرة. عدد النجوم والقنابل الإلزامية يمثل 50% أو أكثر من إجمالي القنابل.</div>`;
        warningsFound = true;
    }
    
    if(warningsFound) { warningsContainer.style.display = 'block'; } 
    else { warningsContainer.style.display = 'none'; }
    
    // 5. التحديثات النهائية
    calculateBombProbability();
    updateDifficultyAnalysis();
    setupConditionFilters(); // ⭐️ NEW: Setup filter listeners ⭐️
    renderSolutionsList(parseInt(document.getElementById('maxShow')?.value)||200);
    
    const maxSolutions = parseInt(document.getElementById('maxSolutions').value) || 5000;
    if(abortFlag && solutions.length >= maxSolutions) showStatus(`Stopped: max solutions cap (${maxSolutions}) reached.`);
    else if(abortFlag) showStatus('Cancelled.');
    else if(solutions.length === 0) showStatus('No solutions found.', true);
    else showStatus(`Found ${solutions.length} solutions!`);
}


// --- VI. Event Listeners for Analysis/Data (Unchanged) ---

document.getElementById('estimateBtn').addEventListener('click', ()=>{
    // ... estimation logic (unchanged) ...
});

document.getElementById('sortStars').addEventListener('click', ()=>{
    if(solutions.length===0) return;
    solutions.sort((a,b)=> b.starsCount - a.starsCount || a.sum - b.sum);
    renderSolutionsList(parseInt(document.getElementById('maxShow')?.value)||200);
});

document.getElementById('filterTopStars').addEventListener('click', ()=>{
    if(solutions.length===0) return;
    let maxStar = Math.max(...solutions.map(s=>s.starsCount));
    filterByStars(maxStar);
});

// --- في ui-core.js ---

document.getElementById('exportBtn').addEventListener('click', async () => {
    // 1. التحقق من وجود بيانات
    const jsonString = exportDataEl.value;
    if (!jsonString) { showStatus('No data to export!', true); return; }

    // 2. تجهيز اسم الملف
    let fileName = document.getElementById('exportFileName').value.trim();
    if (!fileName) fileName = 'level_custom';
    if (!fileName.endsWith('.json')) fileName += '.json';

    // 3. محاولة استخدام نافذة "Save As" الحديثة (تعمل على Chrome/Edge/Opera)
    if ('showSaveFilePicker' in window) {
        try {
            const options = {
                suggestedName: fileName,
                types: [
                    {
                        description: 'Minesweeper Level JSON',
                        accept: {
                            'application/json': ['.json'],
                        },
                    },
                ],
            };
            
            // فتح النافذة وانتظار اختيار المستخدم
            const handle = await window.showSaveFilePicker(options);
            
            // الكتابة في الملف
            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            
            showStatus(`File saved successfully!`);
            return; // نخرج من الدالة لأن الحفظ تم بنجاح
            
        } catch (err) {
            // إذا ضغط المستخدم على Cancel لا نفعل شيئاً
            if (err.name === 'AbortError') {
                return; 
            }
            // إذا حدث خطأ تقني، نكمل للكود القديم كخطة بديلة (Fallback)
            console.error('File System API failed, switching to download fallback:', err);
        }
    }

    // 4. الطريقة التقليدية (احتياطية للمتصفحات التي لا تدعم النافذة)
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus(`File downloaded to default folder.`);
});