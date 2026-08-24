/**
 * =====================================================================
 * PayResolve AI — src/state/stateSelectors.js
 * Phase 3 — Global State Manager (derived read-only selectors)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application State Manager
 * Blueprint area (§2/§3): src/state/
 *
 * Purpose:
 *   Pure, read-only derivations computed from the owned state slots.
 *   Selectors never author, cache, or mutate state; they only answer
 *   questions about the current snapshot (e.g. level consistency,
 *   presence of an investigation). They exist so consumers and the
 *   State Manager can reason about state without duplicating it.
 *
 * Referenced documentation:
 *   FS-01 §5.2 (derived state), §5.3 (legal state combinations),
 *   INV-5 (state-level consistency), INV-1/INV-4 (single investigation);
 *   TDD-02 §3; Implementation Blueprint v1.1 §3.2, §6.
 *
 * NOTE: No business logic (no classification, priority, or eligibility
 * computation beyond structural state presence), no UI, no navigation,
 * no hardcoded data. Selectors are total functions of the snapshot.
 * =====================================================================
 */

export const StateSelectors = {
  /** @returns {boolean} whether a category is selected */
  hasSelectedCategory(state) {
    return state.selectedCategory != null;
  },

  /** @returns {boolean} whether a case is selected */
  hasSelectedCase(state) {
    return state.selectedCase != null;
  },

  /** @returns {boolean} whether the single investigation currently exists */
  hasCurrentInvestigation(state) {
    return state.currentInvestigation != null;
  },

  /**
   * Structural level consistency (FS-01 INV-5, §5.3):
   *   - selectedCase may not exist without selectedCategory
   *   - currentInvestigation may not exist without selectedCase
   * @returns {boolean} true when the selection chain is legal
   */
  isLevelConsistent(state) {
    const hasCategory = state.selectedCategory != null;
    const hasCase = state.selectedCase != null;
    const hasInvestigation = state.currentInvestigation != null;
    if (hasCase && !hasCategory) return false;
    if (hasInvestigation && !hasCase) return false;
    return true;
  },

  /**
   * Investigation object count as observed in state — always 0 or 1
   * (FS-01 INV-1/INV-4). Provided for verification/introspection.
   * @returns {0|1}
   */
  investigationCount(state) {
    return state.currentInvestigation != null ? 1 : 0;
  },
};
