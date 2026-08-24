/**
 * =====================================================================
 * PayResolve AI — src/app/screenOutlet.js
 * Phase 4.2 — ScreenOutlet (active-screen rendering)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application Shell
 * Blueprint area (§2/§3): src/app/
 *
 * Purpose:
 *   Owns the single active-screen container and renders exactly the one
 *   screen that is currently active into it (FS-01 §3.2, §4.6). In this
 *   phase the Operations Dashboard is the active screen; later phases
 *   render other screens through this same outlet.
 *
 * Responsibilities:
 *   - Own a reference to the active-screen container element.
 *   - Render active-screen markup into that container, replacing prior
 *     content (exactly one screen is shown at a time).
 *   - Expose the container so the active screen can attach its own event
 *     delegation (the outlet itself wires no screen behaviour).
 *
 * Explicitly NOT done here (out of scope, FS-01 separation of concerns):
 *   - NO routing, NO browser navigation, NO page reload, NO screen
 *     history. Which screen is active is decided elsewhere (the
 *     Navigation Controller, a later phase); the outlet only renders.
 *
 * Referenced documentation:
 *   FS-01 §3.2 (ScreenOutlet), §4.6 (single active screen); TDD-01 §4.1;
 *   Implementation Blueprint v1.1 §3.1, §7 (S1 rendered via the outlet).
 *
 * NOTE: Owns no application/investigation state and computes no business
 * logic; it is a pure rendering surface for the active screen.
 * =====================================================================
 */

export class ScreenOutlet {
  /** @type {Element} the single active-screen container */
  #container;

  /**
   * @param {Element} container the DOM element that hosts the active screen
   */
  constructor(container) {
    if (container == null) {
      throw new Error("ScreenOutlet requires an active-screen container element.");
    }
    this.#container = container;
  }

  /** @returns {Element} the active-screen container (for the screen's own event delegation) */
  get container() {
    return this.#container;
  }

  /**
   * Render the active screen's markup, replacing whatever was shown
   * before. Exactly one screen occupies the outlet at a time. No routing
   * or history is involved — this only swaps the rendered content.
   * @param {string} markup the active screen's HTML
   */
  render(markup) {
    this.#container.innerHTML = markup;
  }

  /** Clear the active-screen container (renders nothing). */
  clear() {
    this.#container.innerHTML = "";
  }
}
