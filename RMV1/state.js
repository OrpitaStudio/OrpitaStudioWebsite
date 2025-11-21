// state.js — Global runtime state (short-style A)

// --- I. Grid & Mode State ---
let cols = 5; // board columns (updated by buildGrid)
let rows = 5; // board rows (updated by buildGrid)
let mode = 'block'; // editor mode: 'block' | 'star' | 'switch' | 'mustBomb' | 'erase'

// Sets of special cell indices (1D)
let blocks = new Set(); // blocked cells
let stars = new Set(); // star markers
let switches = new Set(); // switch cells
let mustBombs = new Set(); // must-bomb cells (treated as fixed in solver)

// --- II. Solver & Results State ---
let solutions = []; // collected valid solutions
let abortFlag = false; // set true to stop solver early
let bombProbabilityMap = {}; // cellId -> probability (for heatmap)
let showHeatmap = false; // toggle heatmap overlay
let lastTotalCombinations = 0n; // BigInt: estimated search space
let currentFilteredList = null; // derived filtered/sorted solutions (or null)