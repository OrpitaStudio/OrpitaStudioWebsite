/**
 * solver.js - Controller
 */
let activeWorker = null;

async function solveHandler() {
  if (activeWorker) activeWorker.terminate();
  
  GameState.results.solutions = [];
  GameState.results.lastTotalCombinations = 0n;
  
  // تحويل Sets إلى Arrays
  const config = {
    rows: GameState.config.rows,
    cols: GameState.config.cols,
    blocks: Array.from(GameState.grid.blocks),
    mustBombs: Array.from(GameState.grid.mustBombs),
    switches: Array.from(GameState.grid.switches),
    
    bombs1: parseInt(document.getElementById('bombs1').value) || 0,
    bombs2: parseInt(document.getElementById('bombs2').value) || 0,
    bombsNeg: parseInt(document.getElementById('bombsNeg').value) || 0,
    tmin: parseInt(document.getElementById('targetMin').value) || -Infinity,
    tmax: parseInt(document.getElementById('targetMax').value) || Infinity,
    maxSolutions: parseInt(document.getElementById('maxSolutions').value) || 5000,
    starConditions: getStarConditionsFromUI()
  };
  
  activeWorker = new Worker('solver-worker.js');
  activeWorker.postMessage({ cmd: 'solve', config: config });
  
  return new Promise((resolve, reject) => {
    activeWorker.onmessage = function(e) {
      const msg = e.data;
      
      if (msg.type === 'estUpdate') {
        GameState.results.lastTotalCombinations = BigInt(msg.value);
        document.getElementById('combCount').textContent = humanNumberBig(GameState.results.lastTotalCombinations);
        
      } else if (msg.type === 'progress') {
        // 🔥 تحديث شريط التقدم هنا 🔥
        const pct = msg.value; // 0 to 100
        document.getElementById('progressBar').style.width = `${pct}%`;
        document.getElementById('progressPct').textContent = `${Math.round(pct)}%`;
        
      } else if (msg.type === 'done') {
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
      reject(err);
    };
  });
}

function cancelSolver() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
    showStatus('Cancelled.');
    // Reset UI manually since Promise won't resolve
    document.getElementById('solve').disabled = false;
    document.getElementById('solve').innerHTML = '<i class="fas fa-play"></i> SOLVE';
  }
}