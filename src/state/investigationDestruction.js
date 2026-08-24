/**
 * =====================================================================
 * PayResolve AI — src/state/investigationDestruction.js
 * Phase 3 — Global State Manager (state destruction contract)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application State Manager
 * Blueprint area (§2/§3): src/state/
 *
 * Purpose:
 *   The single authoritative investigation-destruction contract. Given
 *   the current state container, it returns the reset values for every
 *   investigation-scoped slot so the Application State Manager can clear
 *   them atomically. It NEVER creates a replacement (explicit-launch-only
 *   creation is the State Manager's concern, not this module's).
 *
 * Scope (state-only):
 *   Destruction here means clearing the in-memory investigation-scoped
 *   STATE SLOTS. It performs no business logic, no agent teardown, and
 *   no rendering. The eight logical constituents of FS-01 §8.3 (the
 *   investigation object, agent reasoning, agent conversation, evidence
 *   cache, timeline, recommendations, executive report, confidence) are
 *   carried within these top-level slots and are cleared together.
 *
 * Retained (NOT cleared by investigation destruction):
 *   - auditTrail : retained after closure (FS-04 WR-30; TDD-02 §3.7)
 *   - archive    : durable, immutable record (FS-05 §7; TDD-02 §3.11)
 *   - selectedCategory / selectedCase : selection slots, cleared by the
 *     State Manager's selection cascades, not by this contract.
 *
 * Referenced documentation:
 *   FS-01 §8 (destruction contract), §8.3 (what is destroyed), INV-13;
 *   TDD-02 §3.8/§3.9/§3.10 (in-memory report/outcome/closure-reason
 *   destroyed on close-exit, retained into archive); DIG-01 IR-04, IR-06;
 *   Implementation Blueprint v1.1 §3.2, §6, §8.
 *
 * NOTE: No business logic, no UI, no navigation, no hardcoded data.
 * =====================================================================
 */

/**
 * The investigation-scoped state slots destroyed together on every
 * destruction trigger (FS-01 §8.2). Order is irrelevant because the
 * State Manager applies the reset as a single atomic assignment.
 */
export const INVESTIGATION_SCOPED_KEYS = Object.freeze([
  "currentInvestigation",
  "investigationStatus",
  "evidence",
  "timeline",
  "executiveReport",
  "investigationOutcome",
  "closureReason",
]);

export class InvestigationDestruction {
  /**
   * Returns an object mapping every investigation-scoped slot to its
   * empty value (null). The caller merges this into the state container
   * as one atomic update. No fragment is left behind; a replacement is
   * created only by an explicit launch elsewhere (FS-01 §8.4).
   * @returns {Object} reset values for the scoped slots
   */
  static clearedSlots() {
    const cleared = {};
    for (const key of INVESTIGATION_SCOPED_KEYS) {
      cleared[key] = null;
    }
    return cleared;
  }

  /**
   * True when none of the investigation-scoped slots hold a value —
   * i.e. no fragment of a destroyed investigation survives.
   * @param {Object} state the state container to inspect (read-only)
   * @returns {boolean}
   */
  static isFullyDestroyed(state) {
    return INVESTIGATION_SCOPED_KEYS.every((key) => state[key] == null);
  }
}
