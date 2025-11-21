/**
 * utils.js
 * Math and grid helpers (style B).
 *
 * Assumptions:
 *  - `rows` and `cols` are globals (from state.js).
 *  - Consumer modules rely on computeNeighbors() for solver performance.
 *
 * Notes:
 *  - nCrBig uses BigInt to avoid overflow for large combinatorics.
 *  - humanNumberBig uses Number() for display formatting — very large BigInt may lose precision when converted.
 */

/* ------------------------------------------------------------
   I. Math / Combinatorics
   ------------------------------------------------------------ */

/**
 * Calculate nCr (combinations) using BigInt.
 * @param {bigint|number} nv - total items (n)
 * @param {bigint|number} kv - items to choose (r)
 * @returns {bigint}
 * 
 * Changing inputs:
 *  - larger nv/kv → result grows factorially; use BigInt to avoid overflow.
 */
function nCrBig(nv, kv) {
  nv = BigInt(nv);
  kv = BigInt(kv);
  if (kv < 0n || kv > nv) return 0n;
  if (kv === 0n || kv === nv) return 1n;
  // symmetry: choose the smaller k for fewer multiplications
  if (kv > nv / 2n) kv = nv - kv;
  let res = 1n;
  for (let i = 1n; i <= kv; i++) {
    res = (res * (nv - i + 1n)) / i;
  }
  return res;
}

/**
 * Format a BigInt into a human-friendly string.
 * @param {bigint|number} bn
 * @returns {string} e.g. "1.2k", "2.34M"
 *
 * Notes:
 *  - thresholds: 1000, 1_000_000, 1_000_000_000 (billion).
 *  - conversion uses Number(), so very big BigInt (>2^53) may lose precision in the decimal fraction.
 */
function humanNumberBig(bn) {
  if (typeof bn !== 'bigint') bn = BigInt(bn);
  const thousand = 1000n;                 // 1k threshold
  const million = 1000000n;               // 1M threshold
  const billion = 1000000000n;            // 1B threshold

  if (bn < thousand) return bn.toString();
  if (bn < million) return (Number(bn) / 1000).toFixed(1) + 'k'; // e.g., 1.2k
  if (bn < billion) return (Number(bn) / 1000000).toFixed(2) + 'M'; // e.g., 2.34M
  return (Number(bn) / Number(billion)).toFixed(2) + 'B'; // e.g., 1.23B
}

/* ------------------------------------------------------------
   II. Grid Geometry & Indexing
   ------------------------------------------------------------ */

/**
 * Convert 1D index -> { r, c } (row, column).
 * Depends on global `cols`. Changing cols changes mapping/layout.
 * @param {number} i
 * @returns {{r:number, c:number}}
 */
function idxToRC(i) {
  return { r: Math.floor(i / cols), c: i % cols };
}

/**
 * Convert row/column -> 1D index.
 * Depends on global `cols`.
 * @param {number} r
 * @param {number} c
 * @returns {number}
 */
function rcToIdx(r, c) {
  return r * cols + c;
}

/* ------------------------------------------------------------
   III. Neighbor Map (core for solver performance)
   ------------------------------------------------------------ */

/**
 * Pre-calculate neighbor lists for every non-blocked cell.
 * - Uses 8-direction adjacency (diagonals included).
 * - Skips cells present in currentBlocks (treated as blocked).
 *
 * Complexity: O(totalCells * neighbors) — usually totalCells * 8 checks.
 * Effect of parameters:
 *  - More blocked cells → fewer neighbors → smaller search cost for solver.
 *  - Larger rows/cols → more entries in neighbors array.
 *
 * @param {Set<number>} currentBlocks
 * @returns {Array<Array<number>>} neighbors[i] = [adjacent indices...]
 */
function computeNeighbors(currentBlocks) {
  const total = rows * cols; // rows/cols globals — changing them changes `total`
  const neighbors = Array.from({ length: total }, () => []);

  for (let i = 0; i < total; i++) {
    if (currentBlocks && currentBlocks.has(i)) continue; // blocked cell => no neighbors tracked

    const rc = idxToRC(i);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = rc.r + dr, cc = rc.c + dc;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue; // bounds check
        const j = rcToIdx(rr, cc);
        if (currentBlocks && currentBlocks.has(j)) continue; // neighbor blocked => ignore
        neighbors[i].push(j);
      }
    }
  }

  return neighbors;
}

/* ------------------------------------------------------------
   IV. Symmetry transforms (optional helper)
   ------------------------------------------------------------ */

/**
 * Transform a set of indices by symmetry (flipH, flipV, flipHV).
 * Useful for symmetry-based pruning / canonicalization.
 *
 * Notes:
 *  - Not used by default solver but safe to call from analysis routines.
 *  - Changing rows/cols changes how flips map indices.
 *
 * @param {Set<number>} indices
 * @param {string} kind - 'flipH' | 'flipV' | 'flipHV'
 * @returns {Array<number>} sorted transformed indices
 */
function transformIndices(indices, kind) {
  const out = new Set();
  for (const idx of indices) {
    const rc = idxToRC(idx);
    let r = rc.r, c = rc.c;
    if (kind === 'flipH') {
      c = (cols - 1) - c; // horizontal flip across vertical axis
    } else if (kind === 'flipV') {
      r = (rows - 1) - r; // vertical flip across horizontal axis
    } else if (kind === 'flipHV') {
      r = (rows - 1) - r;
      c = (cols - 1) - c;
    }
    out.add(rcToIdx(r, c));
  }
  return Array.from(out).sort((a, b) => a - b);
}