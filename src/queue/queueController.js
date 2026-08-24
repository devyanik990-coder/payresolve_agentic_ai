/**
 * =====================================================================
 * PayResolve AI — src/queue/queueController.js
 * Phase 5.2 — Investigation Queue State Integration (behaviour)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Queue Module
 * Blueprint area (§2/§3): src/queue/
 *
 * Purpose:
 *   The queue's thin behaviour layer over the single Application State
 *   Manager. It is the ONLY place that REQUESTS a `selectedCase` change,
 *   and it never owns or caches state — it reads the read-only snapshot
 *   and calls the State Manager's dedicated setter (FS-01 §5.2, §7).
 *
 *   Two responsibilities:
 *     1. ensureQueueSelection(snapshot) — the automatic first-row rule:
 *        whenever a category is selected but no case belonging to that
 *        category is selected (startup, or right after a category change
 *        which clears `selectedCase`), select that category's FIRST
 *        placeholder case. A case already belonging to the current
 *        category is left untouched (user picks are preserved).
 *     2. requestCaseSelection(caseId) — a row click: select that case if
 *        it differs from the current one; do nothing if it is already the
 *        selected case (re-selecting has no effect).
 *
 * State discipline:
 *   - selectedCategory is READ only (never written here).
 *   - selectedCase is the ONLY slot written, and only via
 *     applicationStateManager.setSelectedCase (a request; the manager
 *     owns the mutation and the resulting notification/refresh).
 *   - No investigation is created; no other slot is touched.
 *
 * Referenced documentation:
 *   FS-01 §5.2 (sole owner/mutator), §7.2 (category switch clears case),
 *   §7.8/T2 (selectedCase set on selection); FS-03 §7.1 (initial load →
 *   default selection), §9 (case selection); Implementation Blueprint
 *   v1.1 §3.5.
 *
 * NOTE: No business logic, no calculations, no investigation loading.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";
import {
  placeholderCasesForCategory,
  findPlaceholderCase,
} from "./queuePlaceholders.js";

/**
 * Automatic first-row selection rule. Given the current snapshot, ensure
 * the selected case is consistent with the selected category:
 *   - no category selected → nothing to do;
 *   - category selected but selectedCase is absent OR belongs to a
 *     different category → select this category's FIRST placeholder case;
 *   - selectedCase already belongs to the current category → leave it.
 *
 * This is idempotent: once the first (or any same-category) case is
 * selected it returns false, so it cannot loop when invoked again by the
 * resulting refresh.
 *
 * @param {Object} snapshot the current read-only state snapshot
 * @returns {boolean} true if a selectedCase change was REQUESTED
 */
export function ensureQueueSelection(snapshot) {
  const category = snapshot ? snapshot.selectedCategory : null;
  if (category == null) return false;

  const cases = placeholderCasesForCategory(category);
  if (cases.length === 0) return false;

  const current = snapshot.selectedCase;
  if (current && current.category === category) return false; // keep valid pick

  applicationStateManager.setSelectedCase(cases[0]); // request first-row selection
  return true;
}

/**
 * Handle a queue row activation (click/keyboard). Selects the identified
 * case unless it is already the selected one (in which case: no effect).
 * The case is resolved from the CURRENT category's deterministic queue,
 * so a stale/foreign id can never select a case from another category.
 *
 * @param {string} caseId the Case ID from the activated row
 * @returns {boolean} true if a selectedCase change was REQUESTED
 */
export function requestCaseSelection(caseId) {
  if (caseId == null || caseId === "") return false;

  const snapshot = applicationStateManager.getState();
  const category = snapshot.selectedCategory;
  if (category == null) return false;

  const target = findPlaceholderCase(category, caseId);
  if (target == null) return false; // not a case in the current queue

  const current = snapshot.selectedCase;
  if (current && current.id === target.id) return false; // already selected

  applicationStateManager.setSelectedCase(target); // request only
  return true;
}
