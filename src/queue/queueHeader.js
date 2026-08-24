/**
 * =====================================================================
 * PayResolve AI — src/queue/queueHeader.js
 * Phase 5.1 — Investigation Queue Layout (presentation)
 * Phase 5.2 — Selected-category context binding
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Queue Header (FS-03 §5.1). It establishes the queue's context —
 *   which category is being worked — plus a return affordance and the
 *   entry points for Search, Filters, Sort, and Manual Refresh.
 *
 *   Phase 5.1 laid out the header with a placeholder category. Phase 5.2
 *   BINDS the current selectedCategory (passed in from the snapshot) into
 *   the category slot so the header always names the category whose queue
 *   is shown. The Search/Filters/Sort/Refresh controls remain inert:
 *   those behaviours are out of scope for this phase (refresh is
 *   automatic via the State Manager subscription, not a manual control).
 *
 * State discipline:
 *   The category is DERIVED — passed in by the screen from the current
 *   snapshot; the header reads nothing from the State Manager directly and
 *   mutates nothing.
 *
 * Referenced documentation:
 *   FS-03 §5.1 (Queue Header), §7.2 (category context); FS-01 §3.3;
 *   Implementation Blueprint v1.1 §3.5.
 *
 * NOTE: Presentation only. Controls are visually present but non-functional.
 * =====================================================================
 */

const PLACEHOLDER = "—";

/** One inert placeholder control (present for structure, does nothing). */
function inertControl(label) {
  return `<button type="button" class="queue-control" disabled aria-disabled="true" tabindex="-1">${label}</button>`;
}

/**
 * Render the Queue Header.
 * @param {string|null} [selectedCategory=null] the category whose queue is shown
 * @returns {string} HTML for the queue header
 */
export function QueueHeader(selectedCategory = null) {
  const category = selectedCategory || PLACEHOLDER;
  return `
    <header class="queue-header" data-region="queue-header">
      <div class="queue-header__context">
        <button type="button" class="queue-back" disabled aria-disabled="true" tabindex="-1"
                aria-label="Return to Dashboard">←</button>
        <div class="queue-header__titles">
          <p class="queue-header__eyebrow">Investigation Queue</p>
          <h3 class="queue-header__category" data-field="selectedCategory">${category}</h3>
          <p class="queue-header__window">
            Selection window: <span data-field="window">${PLACEHOLDER}</span>
            &nbsp;·&nbsp; Last updated: <span data-field="lastUpdated">${PLACEHOLDER}</span>
          </p>
        </div>
      </div>

      <div class="queue-header__controls" role="group" aria-label="Queue controls (inactive in this phase)">
        <div class="queue-search">
          <input type="search" class="queue-search__input" placeholder="Search cases"
                 disabled aria-disabled="true" tabindex="-1" aria-label="Search cases" />
        </div>
        ${inertControl("Filters")}
        ${inertControl("Sort")}
        ${inertControl("Refresh")}
      </div>
    </header>`;
}
