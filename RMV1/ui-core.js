// ui-core.js
// Core UI logic (style B):
// - Grid building, cell interactions, modes, and star-condition editor (single condition per star).
// - Inline notes next to important numeric values explain the effect of changing them.

/* ------------------------------------------------------------------
   I. DOM Elements & Initialization
   ------------------------------------------------------------------ */
const gridEl = document.getElementById('grid');
const statusMessageEl = document.getElementById('statusMessage');
const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
const countSymCheckbox = document.getElementById('countSym');
const countSymStatus = document.getElementById('countSymStatus');

// Mode buttons
const modeBlockBtn = document.getElementById('modeBlock');
const modeStarBtn = document.getElementById('modeStar');
const modeSwitchBtn = document.getElementById('modeSwitch');
const modeMustBombBtn = document.getElementById('modeMustBomb');
const modeEraseBtn = document.getElementById('modeErase');

/* ------------------------------------------------------------------
   II. Basic UI / Status helpers
   ------------------------------------------------------------------ */

function showStatus(message, isError = false) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
  statusMessageEl.style.display = 'block';

  // Auto-hide delay: 3000ms -> increasing this keeps messages visible longer (useful for long notices)
  if (!isError) setTimeout(() => { statusMessageEl.style.display = 'none'; }, 3000);
}

function setMode(m) {
  // mode is global from state.js
  mode = m;
  [modeBlockBtn, modeStarBtn, modeSwitchBtn, modeMustBombBtn, modeEraseBtn].forEach(b => b.classList.remove('active'));
  if (m === 'block') modeBlockBtn.classList.add('active');
  if (m === 'star') modeStarBtn.classList.add('active');
  if (m === 'switch') modeSwitchBtn.classList.add('active');
  if (m === 'mustBomb') modeMustBombBtn.classList.add('active');
  if (m === 'erase') modeEraseBtn.classList.add('active');
}

function resetProgress() {
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('progressPct').textContent = '0%';
  // timeInfo text is UI-only; increasing format or adding ETA logic will change UX
  document.getElementById('timeInfo').textContent = '00:00 elapsed — ETA: —';
  document.getElementById('combCount').textContent = '—';
  // abortFlag is global
  abortFlag = false;
  document.getElementById('cancel').disabled = true;
  statusMessageEl.style.display = 'none';
}

/* ------------------------------------------------------------------
   III. Grid build & interaction
   ------------------------------------------------------------------ */

function buildGrid() {
  // enforce lower bound of 2 on dimensions: raising this minimum makes tiny boards invalid
  cols = Math.max(2, parseInt(document.getElementById('gridCols').value, 10) || 5); // default 5
  rows = Math.max(2, parseInt(document.getElementById('gridRows').value, 10) || 5); // default 5

  // Visual cell width used in template: 44px -> increasing this makes cells larger and board wider
  gridEl.style.gridTemplateColumns = `repeat(${cols},44px)`;

  // reset solver/UI state
  solutions = [];
  renderGrid();
  updateCounts();
  clearAnalysis();
  resetProgress();
  updateExportData();
  updateDifficultyAnalysis();
  showStatus('Grid rebuilt with new dimensions');
}

function renderGrid() {
  const total = rows * cols; // total cells: rows*cols — changing rows/cols changes this value directly
  gridEl.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'cell heatmap-cell';
    d.dataset.i = i; // store cell index as data attribute

    // index label (static)
    const idxSpan = document.createElement('span');
    idxSpan.className = 'cell-index';
    idxSpan.textContent = i;

    // heatmap overlay (hidden by default)
    const overlay = document.createElement('div');
    overlay.className = 'heatmap-overlay';
    overlay.id = `heatmap-${i}`;
    overlay.style.display = 'none';

    // content container (dynamic: bombs, stars, numbers)
    const content = document.createElement('div');
    content.className = 'cell-content';

    // append order matters: index always present, overlay then content (content cleared/replaced later)
    d.appendChild(idxSpan);
    d.appendChild(overlay);
    d.appendChild(content);

    // cell click listener
    d.addEventListener('click', () => cellClicked(i));

    gridEl.appendChild(d);
  }

  refreshGridVisual();
}

function cellClicked(i) {
  // Uses global sets and mode from state.js
  if (mode === 'block') {
    if (blocks.has(i)) blocks.delete(i);
    else { blocks.add(i); stars.delete(i); mustBombs.delete(i); switches.delete(i); }
  } else if (mode === 'star') {
    if (blocks.has(i)) return;
    if (stars.has(i)) stars.delete(i);
    else { stars.add(i); mustBombs.delete(i); }
  } else if (mode === 'switch') {
    if (blocks.has(i)) return;
    if (switches.has(i)) switches.delete(i);
    else { switches.add(i); stars.delete(i); mustBombs.delete(i); }
  } else if (mode === 'mustBomb') {
    if (blocks.has(i) || switches.has(i)) return;
    if (mustBombs.has(i)) mustBombs.delete(i);
    else { mustBombs.add(i); stars.delete(i); }
  } else { // erase
    blocks.delete(i); stars.delete(i); mustBombs.delete(i); switches.delete(i);
  }

  refreshGridVisual();
  updateCounts();
  updateExportData();
  updateDifficultyAnalysis();
}

/* ------------------------------------------------------------------
   IV. Visual refresh: design mode or solution view
   - solution param: object { normalBombs, powerBombs, negativeBombs, switchState }
   ------------------------------------------------------------------ */
function refreshGridVisual(solution = null) {
  const total = rows * cols;

  let normalBombSet = new Set();
  let powerBombSet  = new Set();
  let negativeBombSet = new Set();
  let numbers = {};
  let currentBlocks;

  if (solution) {
    // solution view: bombs are provided by analysis
    normalBombSet = new Set(solution.normalBombs || []);
    powerBombSet  = new Set(solution.powerBombs || []);
    negativeBombSet = new Set(solution.negativeBombs || []);
    const blockedSwitches = new Set(solution.switchState || []);
    currentBlocks = new Set([...blocks, ...blockedSwitches]);

    // neighbor map depends on current blocked cells
    const neighbors = computeNeighbors(currentBlocks);

    for (let i = 0; i < total; i++) numbers[i] = 0;

    const allBombs = new Set([...normalBombSet, ...powerBombSet, ...negativeBombSet]);

    // compute visible numbers for non-bomb neighbors
    normalBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] += 1; });
    powerBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] += 2; });
    negativeBombSet.forEach(b => { for (let nb of neighbors[b] || []) if (!allBombs.has(nb)) numbers[nb] -= 1; });
  } else {
    // design mode: only original blocks count
    currentBlocks = blocks;
  }

  // update each cell element
  for (let i = 0; i < total; i++) {
    const el = gridEl.children[i];
    const content = el.querySelector('.cell-content');
    const heatmap = el.querySelector('.heatmap-overlay');

    // Reset classes and content
    el.className = 'cell heatmap-cell';
    content.className = 'cell-content';
    content.innerHTML = '';
    if (heatmap) heatmap.style.display = 'none';

    const isBomb = solution && (normalBombSet.has(i) || powerBombSet.has(i) || negativeBombSet.has(i));

    if (isBomb) {
      // Bomb variants rendering
      if (normalBombSet.has(i)) { el.classList.add('bomb'); content.textContent = 'B'; }
      else if (powerBombSet.has(i)) { el.classList.add('bomb2'); content.textContent = 'P'; }
      else if (negativeBombSet.has(i)) { el.classList.add('bomb-neg'); content.textContent = 'N'; }

      // Must-bomb visual override (designated bombs that are reserved)
      if (mustBombs.has(i)) {
        el.classList.add('is-must-bomb'); // CSS makes this red
        content.textContent = 'MB'; // more visible marker for must-bomb
      }

      // If the bomb sits on a switch cell, apply switch-bomb treatment
      if (switches.has(i)) el.classList.add('is-switch-bomb');

      // star overlay (if needed) could be invoked here
      // starOverlay();

    } else if (currentBlocks.has(i)) {
      // Blocked / switch-blocked state
      if (switches.has(i)) {
        el.classList.add('switch-blocked'); content.textContent = 'S';
      } else {
        el.classList.add('block'); content.textContent = 'X';
      }

    } else if (solution && numbers[i] !== 0) {
      // Show computed number for affected cells in solution view
      const num = document.createElement('span');
      num.className = 'number';
      num.textContent = numbers[i];
      content.appendChild(num);
      el.classList.add('affected');

    } else {
      // Design mode / empty cells
      if (switches.has(i)) {
        el.classList.add('switch-off'); content.textContent = 'S';
      } else if (stars.has(i)) {
        el.classList.add('star'); content.textContent = '★';
      } else if (mustBombs.has(i)) {
        el.classList.add('must-bomb'); content.textContent = 'MB';
      } else {
        content.textContent = '';
      }
    }
  }
}

// Utility to view a specific solution (used by analysis viewer)
function viewSolution(sol) { refreshGridVisual(sol); }

/* ------------------------------------------------------------------
   V. Star Condition Editor (single condition per star)
   - CONDITION_TEMPLATES include parser + input markup.
   ------------------------------------------------------------------ */

const CONDITION_TEMPLATES = {
  // 1) Exact sum required
  getScore: {
    label: 'Required Sum:',
    input: id => `<input type="number" data-key="value" id="${id}-value" placeholder="e.g., 23" style="width:100px;"/>`,
    parser: inputs => ({ type: 'getScore', value: Number(inputs.value) })
  },

  // 2) Zero-value cell count
  emptyCellsCount: {
    label: 'Required Zero-Value Cell Count:',
    input: id => `<input type="number" data-key="value" id="${id}-value" min="0" placeholder="e.g., 5" style="width:100px;"/>`,
    parser: inputs => ({ type: 'emptyCellsCount', value: Number(inputs.value) })
  },

  // 3) Specific value in any cell
  anyCellValue: {
    label: 'Specific Value Required:',
    input: id => `<input type="number" data-key="value" id="${id}-value" placeholder="e.g., 10" style="width:100px;"/>`,
    parser: inputs => ({ type: 'anyCellValue', value: Number(inputs.value) })
  },

  // 4) Place a bomb at listed cell IDs
  placeBombAt: {
    label: 'Cell IDs (comma separated):',
    input: id => `<input type="text" data-key="cells" id="${id}-cells" placeholder="e.g., 6, 13, 22" style="flex-grow:1;"/>`,
    parser: inputs => {
      const cells = String(inputs.cells).split(',').map(s => s.trim()).filter(Boolean).map(Number);
      if (cells.some(isNaN)) { showStatus("Error: Place Bomb At IDs must be numbers.", true); return null; }
      return { type: 'placeBombAt', cells };
    }
  },

  // 5) Specific value(s) in specific cell(s)
  cellValues: {
    label: 'Cell ID & Value Pairs (ID1, Val1, ...):',
    input: id => `<input type="text" data-key="requirements" id="${id}-req" placeholder="e.g., 9, 10, 6, 10" style="flex-grow:1;"/>`,
    parser: inputs => {
      const parts = String(inputs.requirements).split(',').map(s => s.trim()).filter(Boolean).map(Number);
      if (parts.some(isNaN) || parts.length % 2 !== 0) {
        showStatus("Error: Cell Values must be ID, Value pairs.", true); return null;
      }
      const reqs = [];
      for (let i = 0; i < parts.length; i += 2) reqs.push({ id: parts[i], value: parts[i + 1] });
      return { type: 'cellValues', requirements: reqs };
    }
  },

  // 6) Switch state requirements
  setSwitches: {
    label: 'Switch ID & State Pairs (ID1, ON/OFF, ...):',
    input: id => `<input type="text" data-key="requirements" id="${id}-req" placeholder="e.g., 5, ON, 6, OFF" style="flex-grow:1;"/>`,
    parser: inputs => {
      const parts = String(inputs.requirements).split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length % 2 !== 0) { showStatus("Error: Switch States format invalid.", true); return null; }
      const reqs = [];
      for (let i = 0; i < parts.length; i += 2) {
        const id = Number(parts[i]); const state = String(parts[i + 1]).toUpperCase();
        if (isNaN(id) || (state !== 'ON' && state !== 'OFF')) {
          showStatus(`Error: Switch data invalid (${parts[i]}, ${parts[i+1]}).`, true); return null;
        }
        reqs.push({ id, state: `SWITCH_${state}` });
      }
      return { type: 'setSwitches', requirements: reqs };
    }
  }
};

let conditionIdCounter = 0; // unique id counter for injected inputs

function handleConditionTypeChange(event) {
  const selectEl = event.target;
  const conditionRow = selectEl.closest('.condition-row');
  const valueArea = conditionRow.querySelector('.condition-value-area');
  const type = selectEl.value;

  valueArea.innerHTML = '';
  if (type && CONDITION_TEMPLATES[type]) {
    const template = CONDITION_TEMPLATES[type];
    const uniqueId = `cond-${conditionIdCounter++}`;
    valueArea.innerHTML = `
      <div style="display:flex;flex-direction:column;width:100%">
        <label class="small" style="font-weight:bold">${template.label}</label>
        ${template.input(uniqueId)}
      </div>
    `;
  } else {
    valueArea.innerHTML = '<span class="small" style="color:var(--muted)">Select a type to configure.</span>';
  }
}

function injectSingleConditionRow(starId) {
  const containerEl = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
  if (!containerEl) return;
  const template = document.getElementById('conditionRowTemplate');
  const clone = document.importNode(template.content, true);
  const row = clone.querySelector('.condition-row');
  const selectEl = row.querySelector('.condition-type-select');
  selectEl.addEventListener('change', handleConditionTypeChange);
  const removeBtn = row.querySelector('.remove-condition-btn');
  if (removeBtn) removeBtn.style.display = 'none'; // single mandatory slot
  containerEl.appendChild(row);
}

// Exposed for solver.js: returns array-of-arrays (one array per star)
// If a star is empty, its entry is [].
function getStarConditionsFromUI() {
  const allStarConditions = [];
  for (let starId = 1; starId <= 3; starId++) {
    const containerEl = document.querySelector(`.single-condition-container[data-star-id="${starId}"]`);
    if (!containerEl) { allStarConditions.push([]); continue; }
    const row = containerEl.querySelector('.condition-row');
    if (!row) { allStarConditions.push([]); continue; }

    const typeSelect = row.querySelector('.condition-type-select');
    const type = typeSelect.value;
    if (!type) { allStarConditions.push([]); continue; }

    const template = CONDITION_TEMPLATES[type];
    const valueArea = row.querySelector('.condition-value-area');
    const inputs = {};
    let valid = true;

    // collect inputs (any input element must have data-key)
    valueArea.querySelectorAll('[data-key]').forEach(inputEl => {
      const key = inputEl.getAttribute('data-key');
      const value = String(inputEl.value || '').trim();
      if (value === '') {
        showStatus(`Error: condition input empty in Star ${starId}.`, true);
        abortFlag = true; // global abort flag
        valid = false;
        return;
      }
      inputs[key] = value;
    });

    if (!valid) return []; // abort on invalid input

    const conditionObject = template.parser(inputs);
    if (!conditionObject) { abortFlag = true; return []; } // parser handles error messages
    allStarConditions.push([conditionObject]);
  }
  return allStarConditions;
}

function initStarEditor() {
  for (let starId = 1; starId <= 3; starId++) injectSingleConditionRow(starId);
}

/* ------------------------------------------------------------------
   VI. Event listeners & initial boot
   ------------------------------------------------------------------ */

// Mode buttons
modeBlockBtn.addEventListener('click', () => setMode('block'));
modeStarBtn.addEventListener('click', () => setMode('star'));
modeSwitchBtn.addEventListener('click', () => setMode('switch'));
modeMustBombBtn.addEventListener('click', () => setMode('mustBomb'));
modeEraseBtn.addEventListener('click', () => setMode('erase'));

// Grid control
document.getElementById('build').addEventListener('click', buildGrid);
document.getElementById('clear').addEventListener('click', () => {
  blocks.clear(); stars.clear(); mustBombs.clear(); switches.clear();
  refreshGridVisual(); updateCounts(); updateExportData(); updateDifficultyAnalysis();
  showStatus('All special cells cleared');
});
document.getElementById('gridCols').addEventListener('change', buildGrid);
document.getElementById('gridRows').addEventListener('change', buildGrid);

// Solver control
document.getElementById('solve').addEventListener('click', async () => {
  resetProgress();
  const startTime = performance.now();
  await solveHandler(); // solver.js (external)
  handlePostSolveAnalysis(startTime);
});
document.getElementById('cancel').addEventListener('click', () => { abortFlag = true; });

// Heatmap toggle (simple inline toggle)
toggleHeatmapBtn.addEventListener('click', () => {
  showHeatmap = !showHeatmap;
  toggleHeatmapBtn.textContent = showHeatmap ? 'Hide Heatmap' : 'Show Heatmap';
  refreshGridVisual();
});

// Symmetry checkbox status text (small UX hint)
countSymCheckbox.addEventListener('change', () => {
  countSymStatus.textContent = countSymCheckbox.checked ? '✓ Counting symmetries' : '✗ Not counting symmetries';
});

// Initial boot sequence
buildGrid();
resetProgress();
initStarEditor();