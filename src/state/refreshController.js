/**
 * =====================================================================
 * PayResolve AI — src/state/refreshController.js
 * Phase 3 — Global State Manager (publish/subscribe notification)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application State Manager
 * Blueprint area (§2/§3): src/state/
 *
 * Purpose:
 *   The single centralized notification authority behind the coherent
 *   global refresh. It owns the subscriber registry and notifies every
 *   subscriber AFTER a committed, internally consistent state change.
 *   It is the one and only refresh source (TDD-02 C-ref-1).
 *
 * Responsibilities:
 *   - Register / unregister subscribers (lightweight pub/sub).
 *   - Notify all subscribers exactly once per committed state change,
 *     passing them the current read-only state snapshot.
 *   - Never notify on a rejected update (the State Manager only calls
 *     notify() after a successful, consistent mutation).
 *
 * Referenced documentation:
 *   FS-01 §11 (refresh contract); TDD-02 §5 (C-ref-1..4); DIG-01 §7,
 *   IR-27..IR-30; Implementation Blueprint v1.1 §3.2.
 *
 * NOTE: No UI rendering and no DOM manipulation. This module only
 * notifies subscribers; each subscriber decides what to do with the
 * snapshot. No business logic, no navigation, no hardcoded data.
 * =====================================================================
 */

import { StateError } from "./applicationStateManager.js";

export class RefreshController {
  /** @type {Set<Function>} the one subscriber registry */
  #subscribers = new Set();

  /**
   * Register a subscriber. Subscribers are invoked after each committed
   * state change with the current read-only snapshot.
   * @param {Function} listener
   * @returns {Function} an unsubscribe function for this listener
   * @throws {StateError} on an invalid or duplicate subscriber
   */
  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new StateError("Invalid subscriber: a function is required.");
    }
    if (this.#subscribers.has(listener)) {
      throw new StateError("Duplicate subscription: listener already registered.");
    }
    this.#subscribers.add(listener);
    return () => this.unsubscribe(listener);
  }

  /**
   * Remove a subscriber. Returns true if one was removed, false if the
   * listener was not registered (idempotent; no throw on unknown).
   * @param {Function} listener
   * @returns {boolean}
   */
  unsubscribe(listener) {
    return this.#subscribers.delete(listener);
  }

  /**
   * Notify every subscriber with the given read-only snapshot. Called by
   * the State Manager ONLY after a successful, consistent update, so no
   * subscriber ever sees partial state (FS-01 §11; TDD-02 C-ref-4).
   * @param {Object} snapshot the current read-only state snapshot
   */
  notify(snapshot) {
    for (const listener of this.#subscribers) {
      listener(snapshot);
    }
  }

  /** @returns {number} current subscriber count (read-only introspection) */
  get subscriberCount() {
    return this.#subscribers.size;
  }
}
