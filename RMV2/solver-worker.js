/**
 * solver-worker.js
 * Updated to send progress updates.
 */

self.onmessage = function(e) {
    if (e.data.cmd === 'solve') {
        runSolver(e.data.config);
    }
};

// دالة التوافيق (مضمنة للسرعة)
function nCrBig(nv, kv) {
    nv = BigInt(nv); kv = BigInt(kv);
    if (kv < 0n || kv > nv) return 0n;
    if (kv === 0n || kv === nv) return 1n;
    if (kv > nv / 2n) kv = nv - kv;
    let res = 1n;
    for (let i = 1n; i <= kv; i++) res = (res * (nv - i + 1n)) / i;
    return res;
}

function runSolver(config) {
    const { 
        rows, cols, blocks, mustBombs, switches, 
        bombs1, bombs2, bombsNeg, 
        tmin, tmax, maxSolutions, starConditions 
    } = config;

    const solutions = [];
    const totalCells = rows * cols;
    const switchArr = switches; 
    const numSwitchStates = 1 << switchArr.length;

    // 1. حساب التقدير الكلي للعملية (لأجل شريط التقدم)
    // سنقوم بتقدير تقريبي بناءً على عدد السويتشات والتوافيق المتاحة في أول حالة
    // (التقدير الدقيق صعب لأن عدد الخلايا المتاحة يتغير مع كل سويتش، لكن هذا يكفي للـ Progress)
    const initialAvailableCount = totalCells - blocks.length - mustBombs.length; // تقريبي
    let estimatedTotalCombos = 1n;
    if (initialAvailableCount >= (bombs1 + bombs2 + bombsNeg)) {
        const c1 = nCrBig(initialAvailableCount, bombs1);
        const c2 = nCrBig(initialAvailableCount - bombs1, bombs2);
        const c3 = nCrBig(initialAvailableCount - bombs1 - bombs2, bombsNeg);
        estimatedTotalCombos = c1 * c2 * c3 * BigInt(numSwitchStates);
    }

    // إرسال التقدير للواجهة
    self.postMessage({ type: 'estUpdate', value: estimatedTotalCombos.toString() });

    let processedCount = 0n;
    let lastProgressTime = Date.now();

    // --- Helper Functions ---
    function computeNeighbors(currentBlocksSet) {
        const neighbors = Array.from({ length: totalCells }, () => []);
        for (let i = 0; i < totalCells; i++) {
            if (currentBlocksSet.has(i)) continue;
            const r = Math.floor(i / cols), c = i % cols;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rr = r + dr, cc = c + dc;
                    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                        const ni = rr * cols + cc;
                        if (!currentBlocksSet.has(ni)) neighbors[i].push(ni);
                    }
                }
            }
        }
        return neighbors;
    }

    function* getCombinations(arr, k) {
        if (k === 0) { yield []; return; }
        if (k > arr.length) return;
        let indices = Array.from({ length: k }, (_, x) => x);
        while (true) {
            yield indices.map(x => arr[x]);
            let idx = k - 1;
            while (idx >= 0 && indices[idx] === idx + arr.length - k) idx--;
            if (idx < 0) break;
            indices[idx]++;
            for (let j = idx + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
        }
    }

    // --- Main Loop ---
    for (let i = 0; i < numSwitchStates; i++) {
        const blockedSwitches = new Set();
        for (let j = 0; j < switchArr.length; j++) {
            if ((i >> j) & 1) blockedSwitches.add(switchArr[j]);
        }

        const currentBlocksSet = new Set([...blocks, ...blockedSwitches]);
        const neighbors = computeNeighbors(currentBlocksSet);

        const availableForPlayer = [];
        for (let k = 0; k < totalCells; k++) {
            if (!currentBlocksSet.has(k) && !mustBombs.includes(k)) {
                availableForPlayer.push(k);
            }
        }

        const totalPlayerBombs = bombs1 + bombs2 + bombsNeg;
        if (availableForPlayer.length < totalPlayerBombs) {
             // حتى لو تجاوزنا، يجب حساب ما تم تخطيه لتحديث البروجرس بدقة
             // لكن للتبسيط سنتجاوز التحديث هنا
             continue; 
        }

        // Pre-calc combinations count for this branch to add to progress
        // (We update progress inside the loops, but knowing the branch size helps)

        for (const normalCombo of getCombinations(availableForPlayer, bombs1)) {
            const rem1 = availableForPlayer.filter(x => !normalCombo.includes(x));
            
            for (const powerCombo of getCombinations(rem1, bombs2)) {
                const rem2 = rem1.filter(x => !powerCombo.includes(x));
                
                // تحسين: حساب عدد الاحتمالات في الحلقة الأخيرة دفعة واحدة لتحديث العداد
                // لأن الحلقة الأخيرة سريعة جداً
                const innerLoopSize = nCrBig(rem2.length, bombsNeg); 
                processedCount += innerLoopSize;

                // تحديث البروجرس كل 100ms لتجنب إغراق الواجهة بالرسائل
                if (Date.now() - lastProgressTime > 100) {
                    // حساب النسبة المئوية (integer 0-100)
                    // نستخدم BigInt للحساب لتجنب الدقة المفقودة
                    let pct = 0;
                    if (estimatedTotalCombos > 0n) {
                        pct = Number((processedCount * 100n) / estimatedTotalCombos);
                    }
                    if (pct > 100) pct = 100;
                    
                    self.postMessage({ type: 'progress', value: pct });
                    lastProgressTime = Date.now();
                }

                for (const negCombo of getCombinations(rem2, bombsNeg)) {
                    
                    const finalNormal = [...mustBombs, ...normalCombo];
                    const allBombsSet = new Set([...finalNormal, ...powerCombo, ...negCombo]);
                    
                    let sum = 0;
                    // حساب المجموع (Optimized)
                    for (let b of finalNormal) { for(let n of neighbors[b]) if (!allBombsSet.has(n)) sum += 1; }
                    for (let b of powerCombo) { for(let n of neighbors[b]) if (!allBombsSet.has(n)) sum += 2; }
                    for (let b of negCombo) { for(let n of neighbors[b]) if (!allBombsSet.has(n)) sum -= 1; }

                    if (sum >= tmin && sum <= tmax) {
                        // تحقق الشروط (Stars Logic)
                        const cellValues = new Map();
                        for(let c=0; c<totalCells; c++) cellValues.set(c, 0);
                        
                        const addVal = (bombs, val) => {
                            for(let b of bombs) {
                                for(let n of neighbors[b]) if(!allBombsSet.has(n)) cellValues.set(n, cellValues.get(n) + val);
                            }
                        };
                        addVal(finalNormal, 1); addVal(powerCombo, 2); addVal(negCombo, -1);

                        let starsCount = 0;
                        const conditionStatus = [false, false, false];

                        starConditions.forEach((group, idx) => {
                            if (!group || group.length === 0 || idx >= 3) return;
                            const cond = group[0];
                            let met = false;

                            switch(cond.type) {
                                case 'placeBombAt': met = cond.cells.some(id => allBombsSet.has(id)); break;
                                case 'setSwitches':
                                    met = cond.requirements.every(req => {
                                        const isBlocked = blockedSwitches.has(req.id);
                                        return (req.state === 'SWITCH_ON' && isBlocked) || (req.state === 'SWITCH_OFF' && !isBlocked);
                                    }); break;
                                case 'getScore': met = (sum === cond.value); break;
                                case 'anyCellValue':
                                    for(let v of cellValues.values()) if(v === cond.value) { met = true; break; } break;
                                case 'cellValues':
                                    met = cond.requirements.every(r => !allBombsSet.has(r.id) && cellValues.get(r.id) === r.value); break;
                                case 'emptyCellsCount':
                                    let z = 0;
                                    for(let c=0; c<totalCells; c++) if(!currentBlocksSet.has(c) && !allBombsSet.has(c) && cellValues.get(c) === 0) z++;
                                    met = (z === cond.value); break;
                            }
                            if(met) { starsCount++; conditionStatus[idx] = true; }
                        });

                        solutions.push({
                            normalBombs: finalNormal, powerBombs: powerCombo, negativeBombs: negCombo,
                            sum: sum, starsCount: starsCount, conditionStatus: conditionStatus,
                            switchState: Array.from(blockedSwitches)
                        });

                        if (solutions.length >= maxSolutions) {
                            self.postMessage({ type: 'done', solutions: solutions });
                            return; 
                        }
                    }
                }
            }
        }
    }

    self.postMessage({ type: 'done', solutions: solutions });
}