/**
 * =====================================================================
 * PayResolve AI — src/queue/queueEmptyState.js
 * Phase 5.1 — Investigation Queue Layout (presentation only)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Queue Empty State (FS-03 §7.8). A professional, reusable panel
 *   shown in the list body when the queue has no cases to present. It
 *   clearly communicates that no investigation cases are currently
 *   available, without fabricating rows or referencing another category.
 *
 * Referenced documentation:
 *   FS-03 §7.8 (empty queue must be clear and must not fabricate rows),
 *   §5.8 (queue-level status); Implementation Blueprint v1.1 §3.5.
 *
 * NOTE: Presentation only. It renders no data, computes nothing, wires
 * no actions, and reads no state. It is a static message panel.
 * =====================================================================
 */

/**
 * Render the Empty State panel.
 * @returns {string} HTML for the empty state
 */
export function QueueEmptyState() {
  return `
    <div class="queue-empty" role="status" data-state="empty">
      <div class="queue-empty__glyph" aria-hidden="true">▢</div>
      <h4 class="queue-empty__title">No investigation cases available</h4>
      <p class="queue-empty__text">
        There are currently no cases in this queue to display.
      </p>
    </div>`;
}
