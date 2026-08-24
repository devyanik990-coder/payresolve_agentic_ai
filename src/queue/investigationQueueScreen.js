/**
 * =====================================================================
 * PayResolve AI — src/queue/investigationQueueScreen.js
 * Phase 5.1 — Investigation Queue Layout (presentation)
 * Phase 5.2 — Queue state integration (pure render from snapshot)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The Investigation Queue region (FS-01 S3; FS-03), rendered INSIDE the
 *   Operations Dashboard (it is a region of DashboardScreen, not a
 *   separate application screen). It composes the queue sections in the
 *   FS-03 §5 order: Queue Header → Summary → List (scrollable) → Footer.
 *
 *   Phase 5.2: this is a PURE render of the current read-only snapshot.
 *   From the snapshot it derives:
 *     - selectedCategory  → the queue's context (header) and which
 *       deterministic placeholder queue to show;
 *     - selectedCase.id   → which single row is highlighted as selected.
 *   The placeholder cases are a deterministic function of the category
 *   (queuePlaceholders): the same category always yields the same queue,
 *   and every category yields its own unique queue.
 *
 * State discipline:
 *   The region OWNS NO state. It READS selectedCategory and selectedCase
 *   from the snapshot handed to it by the Dashboard (which is the single
 *   subscriber). It never subscribes directly, never writes state, and
 *   loads no data. Selection is REQUESTED by the Dashboard controller via
 *   queueController; this render only reflects the resulting state.
 *
 * Referenced documentation:
 *   FS-01 S3, §3.3, §5.2 (single source of truth), §11 (refresh);
 *   FS-03 §5 (layout), §6 (table), §7.1 (initial load), §7.8 (empty);
 *   TDD-01 §4.4; Implementation Blueprint v1.1 §3.5, §7.
 *
 * NOTE: Pure presentation. No business logic, no calculations, no
 * navigation, no investigation loading.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";
import { placeholderCasesForCategory } from "./queuePlaceholders.js";
import { QueueHeader } from "./queueHeader.js";
import { QueueSummary } from "./queueSummary.js";
import { QueueList } from "./queueList.js";
import { QueueFooter } from "./queueFooter.js";

/**
 * Read-only availability guard: confirms the single Application State
 * Manager is present and exposes its read API (presence check only).
 * @returns {boolean}
 */
export function isStateManagerAvailable() {
  return (
    applicationStateManager != null &&
    typeof applicationStateManager.getState === "function"
  );
}

/**
 * Pure render of the Investigation Queue region for a read-only snapshot.
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the queue region HTML
 */
export function InvestigationQueueScreen(snapshot = null) {
  const selectedCategory = snapshot ? snapshot.selectedCategory : null;
  const selectedCase = snapshot ? snapshot.selectedCase : null;
  const selectedCaseId = selectedCase ? selectedCase.id : null;

  const cases = selectedCategory
    ? placeholderCasesForCategory(selectedCategory)
    : [];
  const presentation = cases.length > 0 ? "ready" : "empty";
  const managerState = isStateManagerAvailable() ? "available" : "unavailable";

  return `
    <div class="queue"
         data-screen="investigation-queue"
         data-state-manager="${managerState}"
         data-selected-category="${selectedCategory ?? ""}"
         data-selected-case="${selectedCaseId ?? ""}"
         data-presentation="${presentation}">

      ${QueueHeader(selectedCategory)}
      ${QueueSummary()}
      ${QueueList({ cases, selectedCaseId })}
      ${QueueFooter()}

    </div>`;
}
