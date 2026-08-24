/**
 * =====================================================================
 * PayResolve AI — src/queue/queueFooter.js
 * Phase 5.1 — Investigation Queue Layout (presentation only)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Queue Footer (FS-03 §5.8). A foot-of-queue status strip that
 *   lays out the "displayed vs. total" count, the "last updated"
 *   indication, and a queue-level status slot. In this phase all figures
 *   are PLACEHOLDER values; the footer guards (in a later phase) against
 *   mistaking a filtered/paginated view for the whole queue.
 *
 * Referenced documentation:
 *   FS-03 §5.8 (Queue Footer), §5.7 (pagination context); Implementation
 *   Blueprint v1.1 §3.5.
 *
 * NOTE: Presentation only. No counts computed, no state read, no logic.
 * =====================================================================
 */

const PLACEHOLDER = "—";

/**
 * Render the Queue Footer.
 * @returns {string} HTML for the queue footer
 */
export function QueueFooter() {
  return `
    <footer class="queue-footer" data-region="queue-footer">
      <span class="queue-footer__counts">
        Showing <span data-field="displayedCount">${PLACEHOLDER}</span>
        of <span data-field="totalCount">${PLACEHOLDER}</span> cases
      </span>
      <span class="queue-footer__status" data-field="queueStatus">${PLACEHOLDER}</span>
    </footer>`;
}
