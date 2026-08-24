/**
 * =====================================================================
 * PayResolve AI — src/queue/queueLoadingState.js
 * Phase 5.1 — Investigation Queue Layout (presentation only)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Queue Loading placeholder (FS-03 §5.8 / §7.1). A reusable static
 *   skeleton shown in the list body to reserve the queue's shape while,
 *   in a later phase, cases would be prepared. It renders a few neutral
 *   skeleton rows so the layout does not jump when real rows arrive.
 *
 * Referenced documentation:
 *   FS-03 §7.1 (a loading state is shown until data is available),
 *   §5.8 (queue-level status indication); Implementation Blueprint v1.1
 *   §3.5.
 *
 * NOTE: Presentation only. This does NOT load data and does NOT simulate
 * progress — it is a static placeholder. No timers, no state, no fetch,
 * no derivation. Phase 5.2 decides when (if ever) this is shown.
 * =====================================================================
 */

/** How many skeleton lines to reserve (purely visual). */
const SKELETON_ROWS = 5;

/** One static skeleton row (no content, no animation of progress). */
function skeletonRow() {
  return `
    <div class="queue-skeleton__row" aria-hidden="true">
      <span class="queue-skeleton__bar"></span>
    </div>`;
}

/**
 * Render the Loading placeholder.
 * @returns {string} HTML for the loading state
 */
export function QueueLoadingState() {
  let rows = "";
  for (let i = 0; i < SKELETON_ROWS; i += 1) rows += skeletonRow();
  return `
    <div class="queue-loading" role="status" aria-live="polite" data-state="loading">
      <p class="queue-loading__label">Preparing the investigation queue…</p>
      <div class="queue-skeleton">${rows}</div>
    </div>`;
}
