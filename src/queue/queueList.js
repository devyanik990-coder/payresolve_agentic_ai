/**
 * =====================================================================
 * PayResolve AI — src/queue/queueList.js
 * Phase 5.1 — Investigation Queue Layout (presentation)
 * Phase 5.2 — Case list binding & selection
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Queue List Container — the scrollable body of the Investigation
 *   Table (FS-03 §5.6). It renders the sticky column header and a body
 *   region. The body shows exactly ONE of:
 *     - the bound case rows for the current category (Phase 5.2), with the
 *       selected case highlighted;
 *     - the Empty State (FS-03 §7.8) when the category has no cases;
 *     - the Loading placeholder (FS-03 §5.8) when requested;
 *     - the original unbound placeholder rows (Phase 5.1 layout fallback).
 *   The container is vertically scrollable so long queues stay navigable
 *   without losing the header (FS-03 §5.7).
 *
 * State discipline:
 *   The cases and the selected id are passed IN (derived from the snapshot
 *   by the screen). The list reads no application state, owns nothing, and
 *   loads no data. Which single row is selected is DERIVED from
 *   selectedCaseId, so exactly one row is ever marked selected.
 *
 * Referenced documentation:
 *   FS-03 §5.6 (table), §5.7 (scroll), §7.8 (empty), §9 (selection);
 *   FS-01 §3.3/§3.4 (QueueList → rows); Implementation Blueprint v1.1 §3.5.
 *
 * NOTE: Presentation only. No subscriptions, no sorting, no filtering,
 * no pagination logic, no data loading.
 * =====================================================================
 */

import { QueueRow, QUEUE_COLUMNS } from "./queueRow.js";
import { QueueEmptyState } from "./queueEmptyState.js";
import { QueueLoadingState } from "./queueLoadingState.js";

/** Placeholder row count for the Phase 5.1 unbound layout fallback. */
const PLACEHOLDER_ROW_COUNT = 6;

/** Build the sticky column-header row from the shared column definitions. */
function headerRow() {
  const cells = QUEUE_COLUMNS.map(
    (col) =>
      `<span class="queue-cell queue-head-cell" role="columnheader" data-col="${col.key}">${col.label}</span>`
  ).join("");
  return `<div class="queue-row queue-row--head" role="row">${cells}</div>`;
}

/** Unbound placeholder body (Phase 5.1 fallback / preview). */
function placeholderBody() {
  let rows = "";
  for (let i = 0; i < PLACEHOLDER_ROW_COUNT; i += 1) rows += QueueRow();
  return rows;
}

/** Bound body: one row per case, marking the selected case. */
function boundBody(cases, selectedCaseId) {
  return cases
    .map((c) => QueueRow(c, c.id === selectedCaseId))
    .join("");
}

/**
 * Render the Queue List Container.
 * @param {{
 *   cases?: ReadonlyArray<Object>|null,
 *   selectedCaseId?: string|null,
 *   presentation?: "ready"|"empty"|"loading"
 * }} [options]
 *   - `cases` present (array): bind those rows (empty array → Empty State);
 *   - `presentation: "loading"`: show the loading placeholder;
 *   - otherwise: the Phase 5.1 unbound placeholder body.
 * @returns {string} HTML for the scrollable list container
 */
export function QueueList(options = {}) {
  const { cases = null, selectedCaseId = null, presentation = null } = options;

  let body;
  let resolved;
  if (presentation === "loading") {
    body = QueueLoadingState();
    resolved = "loading";
  } else if (Array.isArray(cases)) {
    if (cases.length === 0) {
      body = QueueEmptyState();
      resolved = "empty";
    } else {
      body = boundBody(cases, selectedCaseId);
      resolved = "ready";
    }
  } else if (presentation === "empty") {
    body = QueueEmptyState();
    resolved = "empty";
  } else {
    body = placeholderBody();
    resolved = "ready";
  }

  return `
    <section class="queue-list" aria-label="Investigation cases" data-presentation="${resolved}">
      <div class="queue-table" role="table" aria-label="Investigation Table">
        <div class="queue-thead" role="rowgroup">${headerRow()}</div>
        <div class="queue-scroll" role="rowgroup" tabindex="0" aria-label="Scrollable case list">
          ${body}
        </div>
      </div>
    </section>`;
}
