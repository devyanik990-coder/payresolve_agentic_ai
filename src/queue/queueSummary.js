/**
 * =====================================================================
 * PayResolve AI — src/queue/queueSummary.js
 * Phase 5.1 — Investigation Queue Layout (presentation only)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Queue Summary Area (FS-03 §5.2) — an at-a-glance strip that
 *   summarizes the category's workload before the user scans rows. It
 *   lays out the defined summary figures as labelled tiles with
 *   PLACEHOLDER values: total cases, counts by priority (critical / high
 *   / normal), and total Revenue at Risk across the queue.
 *
 * Referenced documentation:
 *   FS-03 §5.2 (Queue Summary), §8 (priority as the triage driver);
 *   FS-02 §4.4 (Revenue at Risk as exposure estimate); Implementation
 *   Blueprint v1.1 §3.5.
 *
 * NOTE: Presentation only. No counts are computed and no revenue is
 * summed; every figure is an unbound placeholder. No state reads.
 * =====================================================================
 */

const PLACEHOLDER = "—";

/** The defined summary figures (FS-03 §5.2), in display order. */
const SUMMARY_FIGURES = Object.freeze([
  { key: "total", label: "Total Cases" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "normal", label: "Normal" },
  { key: "revenueAtRisk", label: "Revenue at Risk" },
]);

/** Build one summary tile (label + placeholder figure). */
function summaryTile(figure) {
  return `
    <article class="queue-summary__tile" data-figure="${figure.key}">
      <p class="queue-summary__value">${PLACEHOLDER}</p>
      <p class="queue-summary__label">${figure.label}</p>
    </article>`;
}

/**
 * Render the Queue Summary Area.
 * @returns {string} HTML for the summary strip
 */
export function QueueSummary() {
  const tiles = SUMMARY_FIGURES.map(summaryTile).join("");
  return `
    <section class="queue-summary" aria-label="Queue summary">
      <div class="queue-summary__grid">${tiles}</div>
    </section>`;
}
