/**
 * solver.js
 * Core combinatorial search + star-condition evaluation (solveHandler).
 *
 * Assumptions / external hooks:
 *  - Globals used: rows, cols, blocks, mustBombs, switches, solutions, abortFlag, lastTotalCombinations
 *  - External helpers used: computeNeighbors(currentBlocks), nCrBig(n,k), getStarConditionsFromUI()
 *  - UI inputs expected: #bombs1, #bombs2, #bombsNeg, #targetMin, #targetMax, #maxSolutions
 *
 * Notes on numeric settings:
 *  - Changing playerBomb counts (bombs1/bombs2/bombsNeg) changes combinatorial search space exponentially.
 *  - maxSolutions caps memory/time used by the solver (default 5000).
 *  - We support up to 3 stars in the UI checks (index >= 3 is ignored).
 */

/* ------------------------------------------------------------
   Helper: combinations generator (nCk)
   Produces arrays of indices drawn from `arr` with length `k`.
   ------------------------------------------------------------ */
function* getCombinations(arr, k) {
  if (k < 0 || k > arr.length) return;
  let indices = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield indices.map(i => arr[i]);
    let i = k - 1;
    while (i >= 0 && indices[i] === i + arr.length - k) { i--; }
    if (i < 0) break;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
  }
}

/* ------------------------------------------------------------
   Helper: compute sum result for a placement
   - normal: +1 per neighbor
   - power:  +2 per neighbor
   - neg:    -1 per neighbor
   Excludes neighbor cells that are bombs (they do not show numbers).
   ------------------------------------------------------------ */
function computeSum(normal, power, neg, neighbors) {
  const allBombs = new Set([...normal, ...power, ...neg]);
  let sum = 0;

  // Normal bombs contribute +1 per adjacent non-bomb cell
  for (let b of normal) {
    for (let nb of neighbors[b]) {
      if (!allBombs.has(nb)) sum += 1;
    }
  }

  // Power bombs contribute +2 per adjacent non-bomb cell
  for (let b of power) {
    for (let nb of neighbors[b]) {
      if (!allBombs.has(nb)) sum += 2;
    }
  }

  // Negative bombs subtract 1 per adjacent non-bomb cell
  for (let b of neg) {
    for (let nb of neighbors[b]) {
      if (!allBombs.has(nb)) sum -= 1;
    }
  }

  return sum;
}

/* ------------------------------------------------------------
   Helper: calculate a final numeric value for every cell
   Returns Map<cellId, value> for all cells (0 for blocked/bombed cells where appropriate).
   - rows/cols are read as globals; changing them alters totalCells and layout.
   ------------------------------------------------------------ */
function calculateCellValues(solutionBombs, neighbors) {
  const totalCells = rows * cols; // rows/cols: global - changing them changes size & neighbor map
  const numbers = new Map();
  for (let i = 0; i < totalCells; i++) numbers.set(i, 0);

  const allBombs = new Set([
    ...(solutionBombs.normalBombs || []),
    ...(solutionBombs.powerBombs || []),
    ...(solutionBombs.negativeBombs || [])
  ]);

  const addImpact = (bombs, impact) => {
    for (let b of (bombs || [])) {
      for (let nb of neighbors[b]) {
        if (!allBombs.has(nb)) {
          numbers.set(nb, numbers.get(nb) + impact);
        }
      }
    }
  };

  addImpact(solutionBombs.normalBombs, 1);
  addImpact(solutionBombs.powerBombs, 2);
  addImpact(solutionBombs.negativeBombs, -1);

  return numbers;
}

/* ------------------------------------------------------------
   Main solver function
   - Performs exhaustive search across switch states and player bomb placements.
   - Yields to event loop periodically to keep UI responsive (setTimeout(…,0)).
   ------------------------------------------------------------ */
async function solveHandler() {
  // reset state
  solutions.length = 0;
  abortFlag = false;
  lastTotalCombinations = 0n;

  // --- Read inputs from UI ---
  const playerBombs1 = parseInt(document.getElementById('bombs1').value, 10) || 0;     // normal bombs
  const playerBombs2 = parseInt(document.getElementById('bombs2').value, 10) || 0;     // power bombs
  const playerNegBombs = parseInt(document.getElementById('bombsNeg').value, 10) || 0;  // negative bombs

  const tmin = parseInt(document.getElementById('targetMin').value, 10) || -Infinity; // target range min
  const tmax = parseInt(document.getElementById('targetMax').value, 10) || Infinity;  // target range max
  const maxSolutions = parseInt(document.getElementById('maxSolutions').value, 10) || 5000; // cap (default 5000) => reduce to limit memory/time

  // star conditions gathered from UI (array of arrays: one array per star)
  const allStarConditions = getStarConditionsFromUI();
  if (abortFlag) return;

  // switches is a global Set/Array of switch cellIds — each switch doubles state space
  const switchArr = Array.from(switches || []);
  const numSwitchStates = 1 << switchArr.length; // 2^n possible switch combinations (exponential)

  // iterate over every switch configuration
  for (let i = 0; i < numSwitchStates; i++) {
    if (abortFlag) break;

    // build set of blocked switches for this bitmask (blocked = SWITCH_ON for this solver)
    const blockedSwitches = new Set();
    for (let j = 0; j < switchArr.length; j++) {
      if ((i >> j) & 1) blockedSwitches.add(switchArr[j]);
    }

    // current block set = original blocks + blocked switches
    const currentBlocks = new Set([...(blocks || []), ...blockedSwitches]);
    const neighbors = computeNeighbors(currentBlocks); // neighbor map depends on blocked cells

    // available cells for player's bomb placement (exclude blocks and must-bombs)
    const availableForPlayer = [];
    for (let k = 0; k < rows * cols; k++) {
      if (!currentBlocks.has(k) && !(mustBombs && mustBombs.has && mustBombs.has(k))) {
        availableForPlayer.push(k);
      }
    }

    // if not enough free cells for player's bombs, skip this switch state
    const totalPlayerBombs = playerBombs1 + playerBombs2 + playerNegBombs;
    if (availableForPlayer.length < totalPlayerBombs) continue;

    // --- Combination count estimate (used for difficulty/progress)
    // We compute nCr for each bomb type sequentially (rough upper bound).
    const b1 = playerBombs1, b2 = playerBombs2, b3 = playerNegBombs;
    const c1 = nCrBig(availableForPlayer.length, b1); // choose positions for normal bombs
    const c2 = nCrBig(Math.max(0, availableForPlayer.length - b1), b2); // remaining choices for power bombs
    const c3 = nCrBig(Math.max(0, availableForPlayer.length - b1 - b2), b3); // remaining choices for neg bombs
    lastTotalCombinations += c1 * c2 * c3;

    // -----------------------
    // store() merges player's bombs with must-bombs, evaluates sum and star conditions
    // returns true if maxSolutions reached (so caller can abort).
    // -----------------------
    function store(pNormal, pPower, pNeg) {
      // Treat mustBombs as fixed normal bombs in final layout
      const finalNormal = [...(mustBombs || []), ...(pNormal || [])];
      const finalPower = pPower || [];
      const finalNeg = pNeg || [];

      const sum = computeSum(finalNormal, finalPower, finalNeg, neighbors);

      // enforce target range
      if (sum < tmin || sum > tmax) return false;

      // collect solution metadata
      const solutionBombs = {
        normalBombs: finalNormal,
        powerBombs: finalPower,
        negativeBombs: finalNeg
      };

      const cellValuesMap = calculateCellValues(solutionBombs, neighbors);
      const allBombsSet = new Set([...finalNormal, ...finalPower, ...finalNeg]);

      let starsCount = 0;
      const conditionStatus = [false, false, false]; // support up to 3 stars (index 0..2)

      // Evaluate star conditions (each star can have multiple conditions; here we check primary condition at [0])
      allStarConditions.forEach((starConditionArr, index) => {
        if (index >= 3 || !Array.isArray(starConditionArr) || starConditionArr.length === 0) return;
        const condition = starConditionArr[0];
        let isStarMet = false;

        switch (condition.type) {
          case 'placeBombAt':
            // satisfied if any listed cell contains a bomb
            isStarMet = condition.cells.some(cellId => allBombsSet.has(cellId));
            break;

          case 'setSwitches':
            // every requirement must match the current blockedSwitches set
            isStarMet = condition.requirements.every(req => {
              const isBlocked = blockedSwitches.has(req.id);
              return (req.state === 'SWITCH_ON' && isBlocked) || (req.state === 'SWITCH_OFF' && !isBlocked);
            });
            break;

          case 'getScore':
            // exact sum match (use strict equality)
            isStarMet = sum === condition.value;
            break;

          case 'anyCellValue':
            // any non-bomb cell has the requested value
            for (let val of cellValuesMap.values()) {
              if (val === condition.value) { isStarMet = true; break; }
            }
            break;

          case 'cellValues':
            // each specified cell must be non-bomb and match requested value
            isStarMet = condition.requirements.every(req =>
              cellValuesMap.get(req.id) !== undefined &&
              !allBombsSet.has(req.id) &&
              cellValuesMap.get(req.id) === req.value
            );
            break;

          case 'emptyCellsCount':
            // count zero-valued (0) cells that are not blocks and not bombs
            let zeroCount = 0;
            for (let k = 0; k < rows * cols; k++) {
              if (!currentBlocks.has(k) && !allBombsSet.has(k) && cellValuesMap.get(k) === 0) zeroCount++;
            }
            isStarMet = zeroCount === condition.value; // exact count match
            break;

          default:
            // unknown condition type — ignore
            isStarMet = false;
        }

        if (isStarMet) {
          starsCount++;
          conditionStatus[index] = true;
        }
      });

      // push solution object
      solutions.push({
        normalBombs: finalNormal,
        powerBombs: finalPower,
        negativeBombs: finalNeg,
        sum: sum,
        starsCount: starsCount,
        conditionStatus: conditionStatus,
        switchState: Array.from(blockedSwitches)
      });

      return solutions.length >= maxSolutions; // stop if reached cap
    }

    // -----------------------
    // Brute-force iterate all placements for player's bombs
    // - nested loops: normal -> power -> negative
    // - note: this is combinatorial and will be slow for large bomb counts or available cells
    // -----------------------
    for (const normalCombo of getCombinations(availableForPlayer, playerBombs1)) {
      if (abortFlag) break;

      const availableForPower = availableForPlayer.filter(c => !normalCombo.includes(c));
      for (const powerCombo of getCombinations(availableForPower, playerBombs2)) {
        if (abortFlag) break;

        const availableForNeg = availableForPower.filter(c => !powerCombo.includes(c));
        for (const negCombo of getCombinations(availableForNeg, playerNegBombs)) {
          if (abortFlag) break;

          // store returns true if solution cap reached
          if (store(normalCombo, powerCombo, negCombo)) { abortFlag = true; break; }
        }
      }
    }

    // yield to event loop so UI can update / abortFlag can be handled
    await new Promise(r => setTimeout(r, 0));
  } // end switch states loop
}