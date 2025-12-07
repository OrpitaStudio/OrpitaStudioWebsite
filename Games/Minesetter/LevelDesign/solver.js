/**
 * solver.js - Controller
 * Manages the Web Worker (solver-worker.js), handles UI communication, 
 * and processes solver configuration before execution.
 */

// --- 1. GLOBAL STATE AND HELPER ---

let activeWorker = null;

// NOTE: Assumes GameState is defined globally with config and results objects.
// NOTE: Assumes getStarConditionsFromUI and showStatus are defined in ui-core.js.
// NOTE: Assumes humanNumberBig is a utility function.


// --- 2. SOLVER LIFECYCLE MANAGEMENT ---

/**
 * Initiates the solving process by building the configuration and starting the worker.
 * @returns {Promise<void>} Resolves when the worker finishes successfully.
 */
async function solveHandler() {
  // A. Cleanup previous state
  if (activeWorker) activeWorker.terminate();
  activeWorker = null;
  
  // Reset results storage
  GameState.results.solutions = [];
  GameState.results.lastTotalCombinations = 0n;
  GameState.results.workerStats = null;
  GameState.results.validSolutionsCount = 0n;
  GameState.results.chanceWinPercentage = 0;
  
  // B. Read Inputs and Limits
  
  // Target Score Configuration
  const targetMode = document.getElementById('modeTarget')?.value || 'range';
  // Target Score Configuration

// نقوم بقراءة القيم أولاً
let parsedTMin = parseInt(document.getElementById('targetMin').value.trim());
let parsedTMax = parseInt(document.getElementById('targetMax').value.trim());

// نستخدم Number.isFinite لتحديد ما إذا كانت القيمة صالحة (بما في ذلك الصفر).
// إذا كانت القيمة غير صالحة (NaN)، نعطيها القيمة الافتراضية (-Infinity أو Infinity)
let tminVal = Number.isFinite(parsedTMin) ? parsedTMin : -Infinity;
let tmaxVal = Number.isFinite(parsedTMax) ? parsedTMax : Infinity;

  if (targetMode === 'exact') tmaxVal = tminVal !== -Infinity ? tminVal : tmaxVal;
  
  // Solver Limits
  const maxSolutions = parseInt(document.getElementById('maxSolutionsLimit')?.value) || 1000;
  const maxAnalysisLimit = parseInt(document.getElementById('maxAnalysisLimit')?.value) || 1000000;
  
  // C. Build Configuration Object for Worker
  const config = {
    rows: GameState.config.rows,
    cols: GameState.config.cols,
    
    // Grid elements
    blocks: Array.from(GameState.grid.blocks),
    mustBombs: Array.from(GameState.grid.mustBombs),
    switches: Array.from(GameState.grid.switches),
    
    // Bomb budget
    bombs1: parseInt(document.getElementById('bombs1').value) || 0,
    bombs2: parseInt(document.getElementById('bombs2').value) || 0,
    bombsNeg: parseInt(document.getElementById('bombsNeg').value) || 0,
    
    // Target and limits
    tmin: tminVal,
    tmax: tmaxVal,
    maxSolutions: maxSolutions,
    maxAnalysisSolutions: maxAnalysisLimit,
    starConditions: typeof getStarConditionsFromUI === 'function' ? getStarConditionsFromUI() : []
  };
  
  // D. Initialize and Start Worker
  activeWorker = new Worker('solver-worker.js');
  activeWorker.postMessage({ cmd: 'solve', config: config });
  
  // E. Setup Communication Listener
  return new Promise((resolve, reject) => {
    activeWorker.onmessage = (e) => {
      const msg = e.data;
      
      if (msg.type === 'estUpdate') {
        // Update estimated total combinations
        GameState.results.lastTotalCombinations = BigInt(msg.value);
        const combEl = document.getElementById('combCount');
        if (combEl) combEl.textContent = humanNumberBig(GameState.results.lastTotalCombinations);
        
      } else if (msg.type === 'progress') {
        // Update progress bar and percentage text
        const bar = document.getElementById('progressBar');
        const txt = document.getElementById('progressPct');
        if (bar) bar.style.width = `${msg.value}%`;
        if (txt) txt.textContent = `${Math.round(msg.value)}%`;
        
      } else if (msg.type === 'done') {
        // Store results
        GameState.results.solutions = msg.solutions;
        GameState.results.workerStats = msg.stats;
        GameState.results.targetStats = msg.targetStats;
        GameState.results.conditionStats = msg.conditionStats;
        
        const validSolutionsCountBig = BigInt(msg.validSolutionsCountBig || '0');
        GameState.results.validSolutionsCount = validSolutionsCountBig;
        
        // Calculate win chance percentage
        const totalCombos = GameState.results.lastTotalCombinations;
        let chanceWin = 0;
        if (totalCombos > 0n) {
          const percentageScaled = (validSolutionsCountBig * 10000n) / totalCombos;
          chanceWin = Number(percentageScaled) / 100;
        }
        GameState.results.chanceWinPercentage = chanceWin;
        
        // Cleanup and resolve
        const totalFound = msg.stats ? msg.stats.totalFound : msg.solutions.length;
        if (typeof showStatus === 'function') showStatus(`Found ${totalFound} solutions... rendering.`);
        
        activeWorker.terminate();
        activeWorker = null;
        resolve();
      }
    };
    
    activeWorker.onerror = (err) => {
      console.error('Worker Error:', err);
      if (typeof showStatus === 'function') showStatus('Solver Error: ' + err.message, true);
      if (activeWorker) activeWorker.terminate();
      activeWorker = null;
      reject(err);
    };
  });
}

/**
 * Stops the currently running solver worker (if any) and resets the UI state.
 */
function cancelSolver() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
    if (typeof showStatus === 'function') showStatus('Cancelled.');
    
    // Manual UI reset since the promise won't resolve
    const solveBtn = document.getElementById('solve');
    const cancelBtn = document.getElementById('cancel');
    if (solveBtn) {
      solveBtn.disabled = false;
      solveBtn.innerHTML = '<i class="fas fa-play"></i> SOLVE';
    }
    if (cancelBtn) cancelBtn.disabled = true;
  }
}