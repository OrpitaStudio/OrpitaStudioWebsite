/**
 * utils.js - Core Mathematical and Grid Geometry Helpers
 * Provides utilities for combinatorics (BigInt) and grid indexing/neighbor calculation.
 * Assumes 'rows' and 'cols' are globally defined (e.g., in GameState or state.js).
 */

// --- 1. MATH & COMBINATORICS ---

/**
 * Calculates nCr (combinations) using BigInt to prevent overflow.
 * @param {bigint|number} nv - total items (n)
 * @param {bigint|number} kv - items to choose (r)
 * @returns {bigint} The number of combinations.
 */
function nCrBig(nv, kv) {
    nv = BigInt(nv);
    kv = BigInt(kv);
    if (kv < 0n || kv > nv) return 0n;
    if (kv === 0n || kv === nv) return 1n;
    if (kv > nv / 2n) kv = nv - kv; // Use symmetry for efficiency

    let res = 1n;
    for (let i = 1n; i <= kv; i++) {
        res = (res * (nv - i + 1n)) / i;
    }
    return res;
}

/**
 * Formats a BigInt into a human-friendly string (e.g., "1.2k", "2.34M").
 * NOTE: Very large BigInts might lose precision in the decimal part due to Number() conversion.
 * @param {bigint|number} bn - The number to format.
 * @returns {string} The human-readable string representation.
 */
function humanNumberBig(bn) {
    if (typeof bn !== 'bigint') bn = BigInt(bn);
    const [thousand, million, billion] = [1000n, 1000000n, 1000000000n];

    if (bn < thousand) return bn.toString();
    if (bn < million) return (Number(bn) / 1000).toFixed(1) + 'k';
    if (bn < billion) return (Number(bn) / 1000000).toFixed(2) + 'M';
    return (Number(bn) / Number(billion)).toFixed(2) + 'B';
}

// ----------------------------------------------------------------------

// --- 2. GRID GEOMETRY & INDEXING ---

/**
 * Converts a 1D index to { r, c } (row, column). Depends on global 'cols'.
 * @param {number} i - 1D cell index.
 * @returns {{r:number, c:number}} Row and column coordinates.
 */
function idxToRC(i) {
    return { r: Math.floor(i / cols), c: i % cols };
}

/**
 * Converts row/column to a 1D index. Depends on global 'cols'.
 * @param {number} r - Row index.
 * @param {number} c - Column index.
 * @returns {number} The 1D cell index.
 */
function rcToIdx(r, c) {
    return r * cols + c;
}

// ----------------------------------------------------------------------

// --- 3. NEIGHBOR MAP (Solver Core) ---

/**
 * Pre-calculates neighbor lists for every non-blocked cell (8-direction adjacency).
 * This map is essential for solver performance.
 * @param {Set<number>} currentBlocks - Set of 1D indices marked as blocks.
 * @returns {Array<Array<number>>} An array where neighbors[i] is a list of non-blocked adjacent indices.
 */
function computeNeighbors(currentBlocks) {
    const total = rows * cols;
    const neighbors = Array.from({ length: total }, () => []);

    for (let i = 0; i < total; i++) {
        if (currentBlocks.has(i)) continue;

        const rc = idxToRC(i);
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;

                const [rr, cc] = [rc.r + dr, rc.c + dc];
                if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
                
                const j = rcToIdx(rr, cc);
                if (!currentBlocks.has(j)) {
                    neighbors[i].push(j);
                }
            }
        }
    }

    return neighbors;
}

// ----------------------------------------------------------------------

// --- 4. SYMMETRY TRANSFORMS ---

/**
 * Transforms a set of indices based on grid symmetry (flipH, flipV, flipHV).
 * Useful for canonicalizing solutions or data for analysis/comparison.
 * @param {Set<number>} indices - The set of 1D indices to transform.
 * @param {string} kind - 'flipH' | 'flipV' | 'flipHV'.
 * @returns {Array<number>} Sorted transformed indices.
 */
function transformIndices(indices, kind) {
    const out = new Set();
    for (const idx of indices) {
        const rc = idxToRC(idx);
        let r = rc.r, c = rc.c;

        if (kind === 'flipH') {
            c = (cols - 1) - c;
        } else if (kind === 'flipV') {
            r = (rows - 1) - r;
        } else if (kind === 'flipHV') {
            r = (rows - 1) - r;
            c = (cols - 1) - c;
        }
        out.add(rcToIdx(r, c));
    }
    return Array.from(out).sort((a, b) => a - b);
}