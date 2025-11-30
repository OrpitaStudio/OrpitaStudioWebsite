/**
 * solver.js - Controller
 * Manages the Web Worker (solver-worker.js), handles UI communication, 
 * and processes solver configuration before execution.
 */
let activeWorker = null;

/**
 * Initiates the solving process by building the configuration and starting the worker.
 * @returns {Promise<void>} Resolves when the worker finishes successfully.
 */
async function solveHandler() {
  // 1. Cleanup and State Reset (Must be the first step)
  if (activeWorker) activeWorker.terminate();
  
  GameState.results.solutions = [];
  GameState.results.lastTotalCombinations = 0n;
  
  // 2. Read Target Mode and Values
  // Read the selected mode from the dropdown ('range' or 'exact').
  const targetMode = document.getElementById('modeTarget')?.value || 'range';
  
  const targetMinInput = document.getElementById('targetMin').value.trim();
  const targetMaxInput = document.getElementById('targetMax').value.trim();
  
  let tminVal = -Infinity;
  let tmaxVal = Infinity;
  
  // Convert raw inputs to numerical values
  if (targetMinInput !== '') {
    tminVal = parseInt(targetMinInput);
  }
  if (targetMaxInput !== '') {
    tmaxVal = parseInt(targetMaxInput);
  }
  
  // 3. Apply Mode-Specific Logic (The Exact Target Fix)
  if (targetMode === 'exact') {
    // Exact Target Mode: tmax MUST equal tmin.
    if (tminVal !== -Infinity) {
      // Case 1: MIN is provided. Force tmax to equal tmin.
      tmaxVal = tminVal;
    } else if (tmaxVal !== Infinity) {
      // Case 2: Only MAX is provided, but EXACT mode selected. Treat MAX as the exact target.
      tminVal = tmaxVal;
    } else {
      // Case 3: Nothing entered, exact mode is meaningless. Allow defaults (-Inf, +Inf).
      // However, typically in a UI, at least one value should be required for 'exact'.
      showStatus("Warning: Exact Target mode requires a Min or Max value.", false);
    }
  } else {
    // Range Mode: tminVal and tmaxVal are already set based on raw inputs.
  }
  
  // Note: It's assumed the logic in solver-worker.js correctly handles tmin > tmax 
  // (by returning 0 solutions or by an initial check).
  
  // 4. Build the Configuration Object for the Worker
  const config = {
    rows: GameState.config.rows,
    cols: GameState.config.cols,
    blocks: Array.from(GameState.grid.blocks),
    mustBombs: Array.from(GameState.grid.mustBombs),
    switches: Array.from(GameState.grid.switches),
    
    bombs1: parseInt(document.getElementById('bombs1').value) || 0,
    bombs2: parseInt(document.getElementById('bombs2').value) || 0,
    bombsNeg: parseInt(document.getElementById('bombsNeg').value) || 0,
    
    // Target score range (now correctly handled by mode logic)
    tmin: tminVal,
    tmax: tmaxVal,
    
    maxSolutions: parseInt(document.getElementById('maxSolutions').value) || 5000,
    starConditions: getStarConditionsFromUI()
  };
  
  // 5. Initialize and Start the Web Worker
  activeWorker = new Worker('solver-worker.js');
  activeWorker.postMessage({ cmd: 'solve', config: config });
  
  // 6. Setup Promise to handle Worker communication
  return new Promise((resolve, reject) => {
    activeWorker.onmessage = function(e) {
      const msg = e.data;
      
      if (msg.type === 'estUpdate') {
        // Total combinations update
        GameState.results.lastTotalCombinations = BigInt(msg.value);
        document.getElementById('combCount').textContent = humanNumberBig(GameState.results.lastTotalCombinations);
        
      } else if (msg.type === 'progress') {
        // Progress bar update (0 to 100)
        const pct = msg.value;
        document.getElementById('progressBar').style.width = `${pct}%`;
        document.getElementById('progressPct').textContent = `${Math.round(pct)}%`;
        
      } else if (msg.type === 'done') {
        // Solver finished
        GameState.results.solutions = msg.solutions;
        activeWorker.terminate();
        activeWorker = null;
        resolve();
      }
    };
    
    activeWorker.onerror = function(err) {
      console.error('Worker Error:', err);
      showStatus('Solver Error', true);
      activeWorker.terminate();
      activeWorker = null; // Ensure worker state is reset on error
      reject(err);
    };
  });
}

/**
 * Stops the currently running solver worker (if any).
 */
function cancelSolver() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
    showStatus('Cancelled.');
    // Reset UI manually since Promise won't resolve
    document.getElementById('solve').disabled = false;
    document.getElementById('solve').innerHTML = '<i class="fas fa-play"></i> SOLVE';
    document.getElementById('cancel').disabled = true;
  }
}

// NOTE: The helper function getStarConditionsFromUI is assumed to be defined globally 
// (or in ui-core.js) and accessible here.