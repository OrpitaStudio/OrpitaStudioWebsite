/**
 * solver-worker.js
 * Optimized for split limits: Retention vs. Analysis
 * This Web Worker handles the intensive combinatorial search and analysis.
 */

// --- 1. WORKER SETUP AND UTILITIES ---

self.onmessage = (e) => {
    if (e.data.cmd === 'solve') runSolver(e.data.config);
};

/**
 * Calculates combinations (nCr) using BigInt for large numbers.
 * @param {BigInt} nv - Total number of items (n).
 * @param {BigInt} kv - Number of items to choose (r).
 * @returns {BigInt} The number of combinations.
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
 * Generator function to yield all combinations of size k from array arr.
 * @param {Array<number>} arr - The array to choose from.
 * @param {number} k - The size of combinations to yield.
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


// --- 2. CORE LOGIC FUNCTIONS ---

/**
 * Checks if a specific star condition is met by the current solution configuration.
 * @param {object} cond - The condition object (from starConditions array).
 * @param {object} context - Current solution context (sum, bomb sets, cell values, switches).
 * @returns {boolean} True if the condition is met.
 */
function checkCondition(cond, context) {
    if (!cond) return false;
    const { sum, allBombsSet, cellValues, blockedSwitches } = context;

    switch (cond.type) {
        case 'getScore':
            return sum === cond.value;
        case 'placeBombAt':
            return cond.cells && cond.cells.every(id => allBombsSet.has(id));
        case 'anyCellValue':
            for (let val of cellValues.values()) if (val === cond.value) return true;
            return false;
        case 'cellValues':
            return cond.requirements && cond.requirements.every(req => cellValues.get(req.id) === req.value);
        case 'emptyCellsCount':
            let zeros = 0;
            for (let [id, val] of cellValues) if (val === 0 && !allBombsSet.has(id)) zeros++;
            return zeros === cond.value;
        case 'setSwitches':
            return cond.requirements && cond.requirements.every(req => {
                const isBlocked = blockedSwitches.has(req.id);
                if (req.state === 'SWITCH_OFF') return isBlocked;
                if (req.state === 'SWITCH_ON') return !isBlocked;
                return false;
            });
        default:
            return false;
    }
}

/**
 * Pre-computes the score impact (the sum) for a given bomb placement.
 * @param {Array<number>} normal - Player-placed Normal bombs (1).
 * @param {Array<number>} power - Player-placed Power bombs (2).
 * @param {Array<number>} neg - Player-placed Negative bombs (-1).
 * @param {Set<number>} allBombsSet - Set of all bombs (must + player placed).
 * @param {Array<Array<number>>} neighborsMap - Pre-computed neighbors for each cell.
 * @returns {number} The calculated score sum.
 */
function calculateScoreImpact(normal, power, neg, allBombsSet, neighborsMap, mustBombs) {
    let s = 0;
    const allNormal = [...mustBombs, ...normal];

    // Helper to calculate score for a bomb type
    const calculateTypeScore = (bombs, impact) => {
        for (let b of bombs) {
            for (let n of neighborsMap[b]) {
                if (!allBombsSet.has(n)) s += impact;
            }
        }
    };

    calculateTypeScore(allNormal, 1);
    calculateTypeScore(power, 2);
    calculateTypeScore(neg, -1);
    
    return s;
}

/**
 * Computes non-blocked neighbors for all cells.
 * @param {number} rows - Grid rows.
 * @param {number} cols - Grid columns.
 * @param {Set<number>} currentBlocksSet - Set of cells acting as blocks (static + blocked switches).
 * @returns {Array<Array<number>>} Array where index is cell ID and value is an array of non-blocked neighbor IDs.
 */
function computeNeighbors(rows, cols, totalCells, currentBlocksSet) {
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

// --- 3. MAIN SOLVER EXECUTION ---

function runSolver(config) {
    const { rows, cols, blocks, mustBombs, switches, bombs1, bombs2, bombsNeg, tmin, tmax, maxSolutions, starConditions, maxAnalysisSolutions } = config;
    
    const totalCells = rows * cols;
    const switchArr = switches;
    const numSwitchStates = 1 << switchArr.length;
    
    // Results containers
    const solutions = []; // Solutions saved for display (Limited by maxSolutions)
    const targetStats = {}; // Total count of each score sum (e.g., { 10: 50, 11: 45 })
    
    // Heatmap analysis data (Limited by maxAnalysisSolutions)
    const heatmapStats = {
        normal: new Uint32Array(totalCells),
        power: new Uint32Array(totalCells),
        negative: new Uint32Array(totalCells),
        totalFound: 0 // Actual count of analyzed solutions (up to maxAnalysisSolutions)
    };
    
    // Condition intersection statistics
    const conditionStats = {
        'C1_Only': 0, 'C2_Only': 0, 'C3_Only': 0,
        'C1_C2': 0, 'C1_C3': 0, 'C2_C3': 0,
        'C1_C2_C3': 0, 'None': 0
    };
    
    let validSolutionsCountBig = 0n; // Total *exact* count of solutions found
    
    // Estimate total combinations for progress tracking
    const initialAvailableCount = totalCells - blocks.length - mustBombs.length;
    let estimatedTotalCombos = 0n;
    if (initialAvailableCount >= (bombs1 + bombs2 + bombsNeg)) {
        estimatedTotalCombos = nCrBig(initialAvailableCount, bombs1) *
                               nCrBig(initialAvailableCount - bombs1, bombs2) *
                               nCrBig(initialAvailableCount - bombs1 - bombs2, bombsNeg) *
                               BigInt(numSwitchStates);
    }
    self.postMessage({ type: 'estUpdate', value: estimatedTotalCombos.toString() });

    let processedCount = 0n;
    let lastProgressTime = Date.now();

    // --- Switch State Loop ---
    outerLoop:
    for (let i = 0; i < numSwitchStates; i++) {
        const blockedSwitches = new Set();
        for (let j = 0; j < switchArr.length; j++) {
            if ((i >> j) & 1) blockedSwitches.add(switchArr[j]); // State '1' means blocked (OFF)
        }

        const currentBlocksSet = new Set([...blocks, ...blockedSwitches]);
        const neighbors = computeNeighbors(rows, cols, totalCells, currentBlocksSet);

        // Cells available for player bomb placement
        const availableForPlayer = [];
        for (let k = 0; k < totalCells; k++) {
            if (!currentBlocksSet.has(k) && !mustBombs.includes(k)) availableForPlayer.push(k);
        }

        if (availableForPlayer.length < bombs1 + bombs2 + bombsNeg) continue;

        // --- Bomb Combinations Loop (Type 1: Normal) ---
        for (const normalCombo of getCombinations(availableForPlayer, bombs1)) {
            const rem1 = availableForPlayer.filter(x => !normalCombo.includes(x));
            
            // --- Bomb Combinations Loop (Type 2: Power) ---
            for (const powerCombo of getCombinations(rem1, bombs2)) {
                const rem2 = rem1.filter(x => !powerCombo.includes(x));
                
                // Estimate and update progress before the inner-most loop
                const innerLoopSize = nCrBig(rem2.length, bombsNeg);
                processedCount += innerLoopSize;

                if (Date.now() - lastProgressTime > 100) {
                    let pct = estimatedTotalCombos > 0n ? Number((processedCount * 100n) / estimatedTotalCombos) : 0;
                    if (pct > 100) pct = 100; // Cap percentage if estimate was too low
                    self.postMessage({ type: 'progress', value: pct });
                    lastProgressTime = Date.now();
                }

                // --- Bomb Combinations Loop (Type 3: Negative) ---
                for (const negCombo of getCombinations(rem2, bombsNeg)) {
                    
                    const finalNormal = [...mustBombs, ...normalCombo];
                    const allBombsSet = new Set([...finalNormal, ...powerCombo, ...negCombo]);
                    const sum = calculateScoreImpact(normalCombo, powerCombo, negCombo, allBombsSet, neighbors, mustBombs);

                    // 1. Check Target Score Range
                    if (sum >= tmin && sum <= tmax) {
                        
                        // Check if Analysis Limit is reached (Heatmap/Stats only)
                        const analyze = heatmapStats.totalFound < maxAnalysisSolutions;
                        if (analyze) {
                            heatmapStats.totalFound++;
                            validSolutionsCountBig += 1n; // Increment total count for final reporting
                            targetStats[sum] = (targetStats[sum] || 0) + 1;

                            // Update Heatmap
                            for (let x of finalNormal) heatmapStats.normal[x]++;
                            for (let x of powerCombo) heatmapStats.power[x]++;
                            for (let x of negCombo) heatmapStats.negative[x]++;

                            // Calculate Cell Values for Advanced Conditions
                            const cellValues = new Map();
                            for(let c=0; c<totalCells; c++) cellValues.set(c, 0);
                            const addVal = (bombs, val) => {
                                for(let b of bombs) for(let n of neighbors[b]) if(!allBombsSet.has(n)) cellValues.set(n, cellValues.get(n) + val);
                            };
                            addVal(finalNormal.filter(x => !mustBombs.includes(x)), 1); // Player Normal
                            addVal(mustBombs, 1); // Must Bombs
                            addVal(powerCombo, 2);
                            addVal(negCombo, -1);
                            
                            // Check Star Conditions
                            const context = { sum, allBombsSet, cellValues, blockedSwitches };
                            const cStatus = [false, false, false];
                            if (starConditions && starConditions.length > 0) {
                                if (starConditions[0] && starConditions[0].length > 0) cStatus[0] = checkCondition(starConditions[0][0], context);
                                if (starConditions[1] && starConditions[1].length > 0) cStatus[1] = checkCondition(starConditions[1][0], context);
                                if (starConditions[2] && starConditions[2].length > 0) cStatus[2] = checkCondition(starConditions[2][0], context);
                            }

                            // Log Condition Intersection Stats
                            const activeC = cStatus.filter(Boolean).length;
                            if (activeC === 0) conditionStats['None']++;
                            else if (cStatus[0] && cStatus[1] && cStatus[2]) conditionStats['C1_C2_C3']++;
                            else if (cStatus[0] && cStatus[1]) conditionStats['C1_C2']++;
                            else if (cStatus[0] && cStatus[2]) conditionStats['C1_C3']++;
                            else if (cStatus[1] && cStatus[2]) conditionStats['C2_C3']++;
                            else if (cStatus[0]) conditionStats['C1_Only']++;
                            else if (cStatus[1]) conditionStats['C2_Only']++;
                            else if (cStatus[2]) conditionStats['C3_Only']++;

                            // Save Solution for Display (Limited by maxSolutions)
                            if (solutions.length < maxSolutions) {
                                solutions.push({
                                    normalBombs: normalCombo,
                                    powerBombs: powerCombo,
                                    negativeBombs: negCombo,
                                    sum: sum,
                                    conditionStatus: cStatus,
                                    switchState: Array.from(blockedSwitches)
                                });
                            }
                        } else {
                            // Only count solutions if the analysis limit is reached but the display limit isn't
                            // Note: In this optimized version, we stop entirely once the *analysis* limit is hit.
                            break outerLoop; 
                        }
                        
                        // Stop if the Analysis Limit is reached
                        if (heatmapStats.totalFound >= maxAnalysisSolutions) {
                            break outerLoop;
                        }
                    }
                }
            }
        }
    } // End Switch Loop

    // --- 4. FINAL REPORTING ---
    self.postMessage({
        type: 'done',
        solutions: solutions,
        stats: heatmapStats,
        targetStats: targetStats,
        conditionStats: conditionStats,
        validSolutionsCountBig: validSolutionsCountBig.toString()
    });
}