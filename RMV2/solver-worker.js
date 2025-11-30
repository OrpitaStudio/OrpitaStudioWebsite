/**
 * solver-worker.js
 * Optimized worker for solving Minesetter levels using combinatorics and pruning.
 * Computes all valid bomb placements (normal, power, negative) that match target scores and star conditions.
 */

self.onmessage = function(e) {
    if (e.data.cmd === 'solve') {
        runSolver(e.data.config);
    }
};

/**
 * Calculates nCr (combinations) using BigInt for large numbers.
 * @param {bigint|number} nv - total items (n)
 * @param {bigint|number} kv - items to choose (r)
 * @returns {bigint} The number of combinations.
 */
function nCrBig(nv, kv) {
    nv = BigInt(nv); kv = BigInt(kv);
    if (kv < 0n || kv > nv) return 0n;
    if (kv === 0n || kv === nv) return 1n;
    if (kv > nv / 2n) kv = nv - kv;
    let res = 1n;
    for (let i = 1n; i <= kv; i++) res = (res * (nv - i + 1n)) / i;
    return res;
}

/**
 * Main solver function running in the worker thread.
 * @param {object} config - Configuration object containing grid, bomb counts, target, etc.
 */
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

    // --- I. Estimation and Setup ---

    // 1. Calculate Total Estimated Combinations (for progress bar)
    const initialAvailableCount = totalCells - blocks.length - mustBombs.length;
    let estimatedTotalCombos = 1n;
    if (initialAvailableCount >= (bombs1 + bombs2 + bombsNeg)) {
        const c1 = nCrBig(initialAvailableCount, bombs1);
        const c2 = nCrBig(initialAvailableCount - bombs1, bombs2);
        const c3 = nCrBig(initialAvailableCount - bombs1 - bombs2, bombsNeg);
        estimatedTotalCombos = c1 * c2 * c3 * BigInt(numSwitchStates);
    }

    // Send estimation to UI
    self.postMessage({ type: 'estUpdate', value: estimatedTotalCombos.toString() });

    let processedCount = 0n;
    let lastProgressTime = Date.now();

    // --- II. Helper Functions (Grid & Combinatorics) ---

    /**
     * Pre-computes the neighbors for every cell on the grid, excluding block cells.
     * @param {Set<number>} currentBlocksSet - Set of all blocked cells (fixed + switches).
     * @returns {Array<Array<number>>} Array where index i holds an array of cell indices neighboring i.
     */
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
    
    /**
     * Generator function to yield combinations of k items from an array.
     * @param {Array<number>} arr - The array to choose from.
     * @param {number} k - The number of items to choose.
     * @yields {Array<number>} A combination.
     */
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
    
    /**
     * Calculates the total score (sum) for a specific bomb configuration.
     * Note: Cells that are bombs themselves do not count as points.
     * @param {Array<number>} normal - Player-placed normal bombs (excluding mustBombs).
     * @param {Array<number>} power - Power bombs.
     * @param {Array<number>} neg - Negative bombs.
     * @param {Set<number>} allBombsSet - Set of ALL bombs (must + normal + power + neg).
     * @param {Array<Array<number>>} neighborsMap - Pre-computed neighbors map.
     * @returns {number} The calculated total score.
     */
    function calculateScoreImpact(normal, power, neg, allBombsSet, neighborsMap) {
        let s = 0;
        // mustBombs are combined with player-placed normal bombs here
        const allNormal = [...mustBombs, ...normal];
        
        // Positive Bomb Impact (Normal: +1, Power: +2)
        for (let b of allNormal) { for(let n of neighborsMap[b]) if (!allBombsSet.has(n)) s += 1; }
        for (let b of power) { for(let n of neighborsMap[b]) if (!allBombsSet.has(n)) s += 2; }
        
        // Negative Bomb Impact (Negative: -1)
        for (let b of neg) { for(let n of neighborsMap[b]) if (!allBombsSet.has(n)) s -= 1; }

        return s;
    }

    // --- III. Main Looping Logic ---

    // Loop through all possible switch states
    for (let i = 0; i < numSwitchStates; i++) {
        const blockedSwitches = new Set();
        for (let j = 0; j < switchArr.length; j++) {
            if ((i >> j) & 1) blockedSwitches.add(switchArr[j]);
        }

        const currentBlocksSet = new Set([...blocks, ...blockedSwitches]);
        const neighbors = computeNeighbors(currentBlocksSet);

        // Cells available for the player to place bombs
        const availableForPlayer = [];
        for (let k = 0; k < totalCells; k++) {
            if (!currentBlocksSet.has(k) && !mustBombs.includes(k)) {
                availableForPlayer.push(k);
            }
        }

        const totalPlayerBombs = bombs1 + bombs2 + bombsNeg;
        if (availableForPlayer.length < totalPlayerBombs) {
            continue; // Not enough space for the required bombs
        }

        // Loop through combinations for Normal Bombs
        for (const normalCombo of getCombinations(availableForPlayer, bombs1)) {
            const rem1 = availableForPlayer.filter(x => !normalCombo.includes(x));
            
            // Loop through combinations for Power Bombs
            for (const powerCombo of getCombinations(rem1, bombs2)) {
                const rem2 = rem1.filter(x => !powerCombo.includes(x));
                
                // -----------------------------------------------------
                // --- A. Early Pruning (تم إلغاؤها هنا) ---
                // تم حذف منطق الحساب والتحقق من (minPossibleScore) و (currentSumNoNeg)
                // -----------------------------------------------------

                // --- B. Progress Update & Inner Loop for Negative Bombs ---

                // Calculate the size of the inner loop and count it as processed work.
                const innerLoopSize = nCrBig(rem2.length, bombsNeg); 
                processedCount += innerLoopSize;

                // Send progress update to UI
                if (Date.now() - lastProgressTime > 100) {
                    let pct = 0;
                    if (estimatedTotalCombos > 0n) {
                        pct = Number((processedCount * 100n) / estimatedTotalCombos);
                    }
                    if (pct > 100) pct = 100;
                    
                    self.postMessage({ type: 'progress', value: pct });
                    lastProgressTime = Date.now();
                }

                // Loop through combinations for Negative Bombs
                for (const negCombo of getCombinations(rem2, bombsNeg)) {
                    
                    const finalNormal = [...mustBombs, ...normalCombo];
                    const allBombsSet = new Set([...finalNormal, ...powerCombo, ...negCombo]);
                    
                    // 💥 Final Score Calculation
                    const sum = calculateScoreImpact(normalCombo, powerCombo, negCombo, allBombsSet, neighbors);

                    // --- C. Final Score Filter & Star Condition Check ---
                    
                    // Final filter check: Ensure the calculated sum is within the exact range [tmin, tmax]
                    if (sum >= tmin && sum <= tmax) {
                        
                        // Star Conditions Logic: Calculate individual cell values
                        const cellValues = new Map();
                        for(let c=0; c<totalCells; c++) cellValues.set(c, 0);
                        
                        const addVal = (bombs, val) => {
                            for(let b of bombs) {
                                // Only count values for non-bomb cells (as per Minesetter rules)
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
                                        // SWITCH_ON means the switch is 'blocked' and thus the block is on the grid
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

                        // Store the found solution
                        solutions.push({
                            normalBombs: finalNormal, powerBombs: powerCombo, negativeBombs: negCombo,
                            sum: sum, starsCount: starsCount, conditionStatus: conditionStatus,
                            switchState: Array.from(blockedSwitches)
                        });

                        // Check if max solutions limit is reached
                        if (solutions.length >= maxSolutions) {
                            self.postMessage({ type: 'done', solutions: solutions });
                            return; 
                        }
                    }
                }
            }
        }
    }

    // All loops finished
    self.postMessage({ type: 'done', solutions: solutions });
}