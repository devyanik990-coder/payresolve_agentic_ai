/**
 * =====================================================================
 * PayResolve AI — src/state/applicationStateManager.js
 * Phase 3 — Global State Manager (Single Source of Truth)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application State Manager
 * Blueprint area (§2/§3): src/state/
 *
 * Purpose:
 *   The ONE and ONLY owner and mutator of application state. It holds
 *   the eleven approved state objects, exposes a minimal read/update
 *   API, enforces single-object cardinality and level consistency,
 *   applies the destruction contract on investigation replace/reset,
 *   and drives the centralized notification (pub/sub) after every
 *   committed, internally consistent update. Every other module reads
 *   from this module and REQUESTS changes; no other module owns,
 *   duplicates, caches, or directly mutates application state.
 *
 * State objects owned (the only eleven; no others may be introduced):
 *   selectedCategory, selectedCase, currentInvestigation,
 *   investigationStatus, evidence, timeline, auditTrail,
 *   executiveReport, investigationOutcome, closureReason, archive.
 *
 * Referenced documentation:
 *   FS-01 §5 (global state), §5.2 (sole owner/mutator), §5.3 (legal
 *   combinations), §7 (state transitions: T1/T2/T3/T7/T8), §8
 *   (destruction), INV-1/INV-2/INV-4/INV-5/INV-9; TDD-01 §4, §6;
 *   TDD-02 §3 (state lifecycles), Data Ownership Matrix; DIG-01 §6,
 *   IR-01..IR-06, IR-16, IP-1/IP-8; Implementation Blueprint v1.1
 *   §3.2, §6, §5 Phase 3.
 *
 * NOTE (Phase 3 scope): STATE MANAGEMENT ONLY. No business logic, no
 * dashboard/queue/preview behaviour, no investigation/agent/report/
 * archive functionality, no navigation, no screen rendering, no DOM,
 * and no hardcoded investigation data. The value objects stored here
 * are provided by future modules; this module never fabricates them.
 * =====================================================================
 */

import { RefreshController } from "./refreshController.js";
import { InvestigationDestruction } from "./investigationDestruction.js";
import { StateSelectors } from "./stateSelectors.js";
import { DEFAULT_SELECTED_CATEGORY } from "../shared/domainConstants.js";

/** Developer-facing error for all state-related failures. */
export class StateError extends Error {
  constructor(message) {
    super(message);
    this.name = "StateError";
  }
}

/** The eleven approved state objects — the complete, closed set. */
export const STATE_KEYS = Object.freeze([
  "selectedCategory",
  "selectedCase",
  "currentInvestigation",
  "investigationStatus",
  "evidence",
  "timeline",
  "auditTrail",
  "executiveReport",
  "investigationOutcome",
  "closureReason",
  "archive",
]);

/** Selection slots — changed only through their dedicated setters. */
const SELECTION_KEYS = new Set(["selectedCategory", "selectedCase"]);

/** Slots that require a current investigation before they may be set. */
const REQUIRE_INVESTIGATION = new Set([
  "investigationStatus",
  "evidence",
  "timeline",
  "auditTrail",
  "executiveReport",
  "investigationOutcome",
  "closureReason",
]);

/** The initial (absent) value for every slot. */
function createInitialState() {
  const state = {};
  for (const key of STATE_KEYS) state[key] = null;
  return state;
}

class ApplicationStateManager {
  /** @type {Object} the single private state container */
  #state = createInitialState();

  /** @type {RefreshController} the single notification authority */
  #refresh = new RefreshController();

  // ---------------------------------------------------------------
  // Lifecycle / whole-state operations
  // ---------------------------------------------------------------

  /**
   * Initialize the deterministic application startup state and notify
   * subscribers. Every slot is absent EXCEPT `selectedCategory`, which is
   * set to the default startup category (DEFAULT_SELECTED_CATEGORY =
   * "Authentication Failure (3DS)", PRD §13). This is the single, minimal
   * startup initialization hook: it is the ONLY place the default is
   * established, and it is called once by the composition root at startup
   * (never by the Dashboard). The selection chain stays consistent
   * (selectedCategory present; selectedCase / currentInvestigation absent
   * — FS-01 INV-5). Called once at startup.
   * @returns {Object} the read-only initialized snapshot
   */
  initialize() {
    const startupState = createInitialState();
    startupState.selectedCategory = DEFAULT_SELECTED_CATEGORY;
    this.#commit(startupState);
    return this.getState();
  }

  /**
   * Clear the entire application state back to its initial baseline
   * (all eleven slots absent) and notify subscribers.
   * @returns {Object} the read-only snapshot after clearing
   */
  clear() {
    this.#commit(createInitialState());
    return this.getState();
  }

  // ---------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------

  /**
   * Get the current application state as a read-only (frozen) snapshot.
   * Consumers render from this snapshot; they must not retain or mutate
   * it (Single Source of Truth — FS-01 §5.2; PRD Principle 6).
   * @returns {Object} frozen shallow snapshot of all slots
   */
  getState() {
    return Object.freeze({ ...this.#state });
  }

  /**
   * Read a single named state object.
   * @param {string} key one of STATE_KEYS
   * @returns {*} the current value of that slot
   * @throws {StateError} when the key is not a known state object
   */
  getStateObject(key) {
    this.#assertKnownKey(key);
    return this.#state[key];
  }

  // ---------------------------------------------------------------
  // Updates (centralized; every path ends in a single commit+notify)
  // ---------------------------------------------------------------

  /**
   * Update a single state object. This path handles the investigation-
   * scoped and durable slots (evidence, timeline, auditTrail,
   * executiveReport, investigationStatus, investigationOutcome,
   * closureReason, archive). Selection slots and currentInvestigation
   * have dedicated methods so their cascades/destruction are enforced.
   * @param {string} key one of STATE_KEYS
   * @param {*} value the value provided by the requesting module
   * @throws {StateError} on unknown key, wrong method, or missing investigation
   */
  updateStateObject(key, value) {
    this.#assertKnownKey(key);

    if (SELECTION_KEYS.has(key)) {
      throw new StateError(
        `Use setSelectedCategory()/setSelectedCase() to change '${key}'.`
      );
    }
    if (key === "currentInvestigation") {
      throw new StateError(
        "Use replaceCurrentInvestigation()/resetInvestigation() to change 'currentInvestigation'."
      );
    }
    if (REQUIRE_INVESTIGATION.has(key) && this.#state.currentInvestigation == null) {
      // Attaching investigation-scoped state with no investigation present
      // (e.g. "replacing a non-existent investigation") is rejected.
      throw new StateError(
        `Cannot set '${key}' because no current investigation exists.`
      );
    }

    this.#commit({ ...this.#state, [key]: value });
  }

  /**
   * Set (or clear) the selected category. Changing it first destroys any
   * current investigation and clears the selected case, keeping the
   * selection chain consistent (FS-01 §7.1). Clearing it (null) clears
   * everything downstream too.
   * @param {*} category the category value, or null to clear
   */
  setSelectedCategory(category) {
    const isDifferent = category !== this.#state.selectedCategory;
    let next = { ...this.#state };

    if (isDifferent || category == null) {
      // Destroy any investigation and clear the case before re-anchoring.
      next = { ...next, ...InvestigationDestruction.clearedSlots(), selectedCase: null };
    }
    next.selectedCategory = category;
    this.#commit(next);
  }

  /**
   * Set (or clear) the selected case. Requires a selected category.
   * Changing it first destroys any current investigation; the case is a
   * preview only (no investigation is created here) (FS-01 §7.8, T2).
   * @param {*} caseRef the case value, or null to clear
   * @throws {StateError} when setting a case with no category selected
   */
  setSelectedCase(caseRef) {
    if (caseRef != null && this.#state.selectedCategory == null) {
      throw new StateError(
        "Cannot select a case without a selected category (INV-5)."
      );
    }
    // Any case change destroys the prior investigation first (T8/T2).
    const next = {
      ...this.#state,
      ...InvestigationDestruction.clearedSlots(),
      selectedCase: caseRef,
    };
    this.#commit(next);
  }

  /**
   * Replace the current investigation with a newly provided one. The
   * previous investigation (and all its scoped constituents) is destroyed
   * first, then the new one is set — so exactly one ever exists
   * (FS-01 §7.3/§7.8, §8; INV-1/INV-4). Requires a selected case.
   * @param {Object} investigation the investigation object built elsewhere
   * @throws {StateError} when no case is selected, or investigation is null
   */
  replaceCurrentInvestigation(investigation) {
    if (investigation == null) {
      throw new StateError(
        "replaceCurrentInvestigation() requires an investigation; use resetInvestigation() to destroy."
      );
    }
    if (this.#state.selectedCase == null) {
      throw new StateError(
        "Cannot create a current investigation without a selected case (INV-5)."
      );
    }
    const next = {
      ...this.#state,
      ...InvestigationDestruction.clearedSlots(),
      currentInvestigation: investigation,
    };
    this.#commit(next);
  }

  /**
   * Destroy the current investigation in full (all scoped slots) without
   * creating a replacement (explicit-launch-only creation — FS-01 §8.4).
   * Idempotent: safe to call when none exists.
   */
  resetInvestigation() {
    this.#commit({ ...this.#state, ...InvestigationDestruction.clearedSlots() });
  }

  // ---------------------------------------------------------------
  // Subscription (delegated to the single RefreshController)
  // ---------------------------------------------------------------

  /**
   * Subscribe to state changes. The listener is invoked after every
   * committed, consistent update with the current read-only snapshot.
   * @param {Function} listener
   * @returns {Function} an unsubscribe function
   * @throws {StateError} on invalid or duplicate subscriber
   */
  subscribe(listener) {
    return this.#refresh.subscribe(listener);
  }

  /**
   * Unsubscribe a previously registered listener.
   * @param {Function} listener
   * @returns {boolean} whether a listener was removed
   */
  unsubscribe(listener) {
    return this.#refresh.unsubscribe(listener);
  }

  // ---------------------------------------------------------------
  // Read-only introspection (for consumers / verification)
  // ---------------------------------------------------------------

  /** @returns {0|1} the current investigation count (never 2) */
  get investigationCount() {
    return StateSelectors.investigationCount(this.#state);
  }

  /** @returns {number} the current subscriber count */
  get subscriberCount() {
    return this.#refresh.subscriberCount;
  }

  // ---------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------

  /**
   * Commit a fully-formed next state atomically, then notify. Rejects
   * (throws, without mutating or notifying) any next state that would be
   * internally inconsistent — never a partial update (FS-01 §7 atomicity,
   * INV-5/INV-1).
   * @param {Object} next the complete next state container
   */
  #commit(next) {
    if (!StateSelectors.isLevelConsistent(next)) {
      throw new StateError(
        "Rejected update: would leave the selection chain inconsistent (INV-5)."
      );
    }
    if (StateSelectors.investigationCount(next) > 1) {
      throw new StateError("Rejected update: more than one investigation (INV-1).");
    }
    this.#state = next;
    this.#refresh.notify(this.getState());
  }

  /**
   * @param {string} key
   * @throws {StateError} when the key is not one of the eleven state objects
   */
  #assertKnownKey(key) {
    if (!STATE_KEYS.includes(key)) {
      throw new StateError(`Unknown state object: '${key}'.`);
    }
  }
}

/**
 * The single Application State Manager instance — the one Single Source
 * of Truth for the whole application. The class is intentionally not
 * exported so no second manager can be constructed (FS-01 INV-1; DIG-01
 * IR-01/IR-16).
 */
export const applicationStateManager = new ApplicationStateManager();
