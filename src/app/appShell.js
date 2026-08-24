/**
 * =====================================================================
 * PayResolve AI — src/app/appShell.js
 * Phase 4.2 — Application Shell (composition root)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application Shell
 * Blueprint area (§2/§3): src/app/
 *
 * Purpose:
 *   The composition root. It locates the active-screen container in the
 *   host page, constructs the ScreenOutlet over it, confirms the single
 *   Application State Manager is available, and mounts the currently
 *   active screen (the Operations Dashboard) through the outlet. It owns
 *   nothing case-specific and holds no application state.
 *
 * Scope note (Phase 4.2):
 *   The Navigation Controller (which decides WHICH screen is active) is a
 *   later phase. Here the Dashboard is the single active screen mounted
 *   into the outlet. The shell performs NO routing, NO browser
 *   navigation, NO history, and NO business logic.
 *
 * Referenced documentation:
 *   FS-01 §3.2 (AppShell composes the outlet + state provider), §4.6;
 *   TDD-01 §4.1; DIG-01 §5; Implementation Blueprint v1.1 §3.1, §5 Phase 2.
 *
 * NOTE: Owns no state; renders nothing itself beyond composing the outlet.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";
import { ScreenOutlet } from "./screenOutlet.js";
import { initScreenNavigator } from "../navigation/screenNavigator.js";

export class AppShell {
  /** @type {ScreenOutlet|null} */
  #outlet = null;
  /** @type {(() => void)|null} teardown for the active screen */
  #unmountActiveScreen = null;

  /**
   * Compose the shell around the given active-screen container element
   * and mount the active screen (the Operations Dashboard).
   * @param {Element} outletElement the #screen-outlet container in the shell
   */
  start(outletElement) {
    if (
      applicationStateManager == null ||
      typeof applicationStateManager.getState !== "function"
    ) {
      throw new Error("AppShell: Application State Manager is unavailable.");
    }

    // Deterministic startup: the Application State Manager initializes the
    // default application state (selectedCategory = the default category)
    // exactly once and publishes it, BEFORE the Dashboard is mounted — so
    // the Dashboard's first render already reflects the initialized
    // selection. The Dashboard never initializes state; the State Manager
    // is the sole owner and source of truth (FS-01 §5.2; DIG-01 IR-16).
    applicationStateManager.initialize();

    this.#outlet = new ScreenOutlet(outletElement);

    // The Screen Navigator owns the active screen and renders it through
    // the outlet. It shows the Operations Dashboard on startup and
    // switches to the Investigation Workspace on case selection (Phase
    // 9.2). The shell composes it; it decides which screen is active.
    this.#unmountActiveScreen = initScreenNavigator(this.#outlet);
  }

  /** Tear down the active screen (unsubscribe + detach listeners). */
  stop() {
    if (this.#unmountActiveScreen) {
      this.#unmountActiveScreen();
      this.#unmountActiveScreen = null;
    }
    if (this.#outlet) {
      this.#outlet.clear();
    }
  }
}
