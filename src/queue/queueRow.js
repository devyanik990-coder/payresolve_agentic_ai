/**
 * =====================================================================
 * PayResolve AI — src/queue/queueRow.js
 * Phase 5.1 — Investigation Queue Layout (presentation)
 * Phase 5.2 — Case data binding & selection state
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   A single Investigation Table row (FS-03 §6). It renders the case
 *   columns as a horizontal record so the user can scan one candidate
 *   case per line.
 *
 *   Phase 5.1 established the column structure with placeholder cells.
 *   Phase 5.2 BINDS a deterministic placeholder case into those same
 *   cells and marks the row selected/interactive when appropriate. The
 *   column layout is unchanged — only the cell values and the row's
 *   selection hooks differ. Calling QueueRow() with no case still yields
 *   the original unbound placeholder row (used by the layout fallback and
 *   the developer preview).
 *
 * Columns (FS-03 §6 + §3.3 descriptors):
 *   Case ID, Merchant, Gateway, Payment Network, Failure Category,
 *   Priority, Revenue at Risk (Amount), Failed Transactions, Status,
 *   Created Date. Amount / Failed Transactions / Created remain unbound
 *   ("—") in this phase — they are real payment/temporal figures that
 *   only arrive with the Investigation Engine (Phase 5.3+).
 *
 * State discipline:
 *   The row owns no state. Selection is DERIVED: `isSelected` is passed
 *   in by the caller from the current snapshot's selectedCase, so the
 *   visual/aria selected state always matches the State Manager. The row
 *   only exposes `data-case-id`; the Dashboard controller reads it to
 *   REQUEST a selectedCase change (queueController). The row itself wires
 *   no handler and mutates nothing.
 *
 * Referenced documentation:
 *   FS-03 §5.6, §6.1–§6.8 (columns), §6.6 (priority), §9 (selection);
 *   FS-01 §3.3; Implementation Blueprint v1.1 §3.5.
 * =====================================================================
 */

/** The single placeholder token used for every unbound cell (no data). */
const PLACEHOLDER = "—"; // em dash

/** Neutral placeholder pill (used when a value is unbound). */
const PLACEHOLDER_PILL = `<span class="queue-pill queue-pill--placeholder">${PLACEHOLDER}</span>`;

/** Map a priority label to its pill modifier (visual tone only). */
function priorityPill(priority) {
  if (priority == null) return PLACEHOLDER_PILL;
  const tone =
    priority === "Critical" ? "critical" : priority === "High" ? "high" : "normal";
  return `<span class="queue-pill queue-pill--${tone}">${priority}</span>`;
}

/** Map a status label to a neutral status pill. */
function statusPill(status) {
  if (status == null) return PLACEHOLDER_PILL;
  return `<span class="queue-pill queue-pill--status">${status}</span>`;
}

/** The original unbound placeholder row (Phase 5.1 layout fallback). */
function placeholderRow() {
  return `
    <div class="queue-row" role="row" data-queue-row data-case-id="" tabindex="-1" aria-disabled="true">
      <span class="queue-cell queue-cell--id"        role="cell" data-col="caseId">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--merchant"  role="cell" data-col="merchant">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--gateway"   role="cell" data-col="gateway">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--network"   role="cell" data-col="network">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--category"  role="cell" data-col="failureCategory">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--priority"  role="cell" data-col="priority">${PLACEHOLDER_PILL}</span>
      <span class="queue-cell queue-cell--amount"    role="cell" data-col="amount">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--txns"      role="cell" data-col="failedTransactions">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--status"    role="cell" data-col="status">${PLACEHOLDER_PILL}</span>
      <span class="queue-cell queue-cell--created"   role="cell" data-col="createdDate">${PLACEHOLDER}</span>
    </div>`;
}

/**
 * Render one Investigation Table row.
 * @param {Object|null} [caseData=null] the deterministic placeholder case
 *   to bind; when null, the unbound placeholder row is returned.
 * @param {boolean} [isSelected=false] whether this row is the selected case
 * @returns {string} HTML for a single queue row
 */
export function QueueRow(caseData = null, isSelected = false) {
  if (caseData == null) return placeholderRow();

  const selectedClass = isSelected ? " queue-row--selected" : "";
  return `
    <div class="queue-row queue-row--interactive${selectedClass}"
         role="row"
         data-queue-row
         data-case-id="${caseData.id}"
         tabindex="0"
         aria-selected="${isSelected}">
      <span class="queue-cell queue-cell--id"        role="cell" data-col="caseId">${caseData.id}</span>
      <span class="queue-cell queue-cell--merchant"  role="cell" data-col="merchant">${caseData.merchant}</span>
      <span class="queue-cell queue-cell--gateway"   role="cell" data-col="gateway">${caseData.gateway}</span>
      <span class="queue-cell queue-cell--network"   role="cell" data-col="network">${caseData.network}</span>
      <span class="queue-cell queue-cell--category"  role="cell" data-col="failureCategory">${caseData.category}</span>
      <span class="queue-cell queue-cell--priority"  role="cell" data-col="priority">${priorityPill(caseData.priority)}</span>
      <span class="queue-cell queue-cell--amount"    role="cell" data-col="amount">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--txns"      role="cell" data-col="failedTransactions">${PLACEHOLDER}</span>
      <span class="queue-cell queue-cell--status"    role="cell" data-col="status">${statusPill(caseData.status)}</span>
      <span class="queue-cell queue-cell--created"   role="cell" data-col="createdDate">${PLACEHOLDER}</span>
    </div>`;
}

/** The ordered column definitions shared by the header row and data rows. */
export const QUEUE_COLUMNS = Object.freeze([
  { key: "caseId", label: "Case ID" },
  { key: "merchant", label: "Merchant" },
  { key: "gateway", label: "Gateway" },
  { key: "network", label: "Network" },
  { key: "failureCategory", label: "Failure Category" },
  { key: "priority", label: "Priority" },
  { key: "amount", label: "Revenue at Risk" },
  { key: "failedTransactions", label: "Failed Txns" },
  { key: "status", label: "Status" },
  { key: "createdDate", label: "Created" },
]);
