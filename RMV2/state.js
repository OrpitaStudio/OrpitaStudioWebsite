/**
 * state.js - Centralized State Management
 * Defines and initializes the single source of truth for the application state.
 */

// --- 1. CORE GAME STATE OBJECT ---

const GameState = {
  // Configuration settings for the grid and interaction mode.
  config: {
    cols: 5,
    rows: 5,
    // Current interaction mode: 'block', 'star', 'switch', 'mustBomb', or 'erase'
    mode: 'block'
  },
  
  // Grid content elements stored as Sets of cell IDs for fast lookup.
  grid: {
    blocks: new Set(), // Cells permanently blocked (Walls/Obstacles)
    switches: new Set(), // Cells designated as toggle switches
    mustBombs: new Set() // Cells where a bomb MUST be placed (part of the level structure)
  },
  
  // Results and analysis data from the solver worker.
  results: {
    solutions: [], // Array of valid bomb placements found (for visualization)
    workerStats: null, // Heatmap/bomb frequency data for analysis
    targetStats: {}, // Distribution count for each target sum
    conditionStats: {}, // Intersection statistics for star conditions (C1, C2, C3)
    
    // Solver status and configuration flags
    abortFlag: false,
    lastTotalCombinations: 0n,
    showHeatmap: false,
    heatmapType: 'all', // 'all' | 'normal' | 'power' | 'negative'
    validSolutionsCount: 0n, // Total number of solutions found (BigInt)
    chanceWinPercentage: 0 // Win chance calculated (as a percentage)
  }
};

// --- 2. LEGACY/COMPATIBILITY DECLARATIONS ---
// These declarations are kept minimal to ensure compatibility 
// with modules that might expect direct global variables (though using GameState.* is preferred).

// No direct variables are created here, as the previous code indicated a preference 
// for using `GameState.config.rows` directly in other files.