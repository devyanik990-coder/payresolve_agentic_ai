/**
 * =====================================================================
 * PayResolve AI — src/navigation/screenNavigator.js
 * Phase 9.2 — Screen Navigator (lightweight active-screen coordinator)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Navigation
 * Blueprint area (§2/§3): src/navigation/
 *
 * Purpose:
 *   A very small navigation coordinator. It owns which screen is active
 *   and switches between the Dashboard and the Investigation Workspace by
 *   mounting/unmounting them into the EXISTING ScreenOutlet. It introduces
 *   NO routing framework, NO URL routing, NO browser history — just an
 *   in-memory active-screen flag and two show* transitions.
 *
 * Separation of concerns:
 *   - It owns navigation only: the active screen and the transitions
 *     (showDashboard / showInvestigation). It owns no application/domain
 *     state and performs no business behaviour.
 *   - The Dashboard is mounted by its own controller (mountDashboard),
 *     which owns Dashboard rendering and interactions. On a queue-row
 *     click the Dashboard asks this module to showInvestigation(); the
 *     Dashboard does not know how the switch happens.
 *   - The Investigation screen is a PURE presentation render
 *     (InvestigationScreen). This module renders it once into the outlet
 *     and wires its Back control to showDashboard() — keeping the
 *     navigation decision out of the presentation module.
 *
 * Execution independence:
 *   Agent execution belongs to the investigation lifecycle and runs
 *   independently of navigation (it is driven by the state subscription in
 *   the execution controller). When the Investigation screen is shown,
 *   this module only asks the execution controller to REFLECT its current
 *   state onto the freshly mounted workspace (syncWorkspaceStatuses) — it
 *   never restarts or retriggers execution.
 *
 * Referenced documentation:
 *   FS-01 §3.2 (ScreenOutlet renders exactly one active screen; a
 *   Navigation Controller decides which), §4.6; TDD-01 §4.1; Implementation
 *   Blueprint v1.1 §3.1.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";
import { mountDashboard } from "../dashboard/dashboardScreen.js";
import { InvestigationScreen } from "../investigation/investigationScreen.js";
import { syncWorkspaceStatuses } from "../workspace/agentExecutionController.js";

/** @type {{ container: Element, render: (m: string) => void } | null} */
let outletRef = null;
/** @type {"dashboard"|"investigation"|null} */
let activeScreen = null;
/** @type {(() => void)|null} teardown for whichever screen is mounted */
let unmountActive = null;

/** @returns {"dashboard"|"investigation"|null} the current active screen */
export function getActiveScreen() {
  return activeScreen;
}

/**
 * Mount the Investigation Workspace screen: render it once (it is a pure
 * presentation of the current snapshot; selection cannot change from this
 * screen, so no subscription is needed), reflect the current agent
 * execution state onto its workspace, and wire the Back control.
 * @returns {() => void} an unmount function
 */
function mountInvestigation() {
  outletRef.render(InvestigationScreen(applicationStateManager.getState()));

  // Reflect (do NOT restart) the current execution state onto the freshly
  // mounted workspace.
  syncWorkspaceStatuses();

  const onClick = (event) => {
    const back = event.target.closest('[data-nav="back"]');
    if (back && outletRef.container.contains(back)) showDashboard();
  };
  outletRef.container.addEventListener("click", onClick);

  return () => outletRef.container.removeEventListener("click", onClick);
}

/** Switch to the Dashboard screen (idempotent). */
export function showDashboard() {
  if (activeScreen === "dashboard") return;
  if (unmountActive) unmountActive();
  activeScreen = "dashboard";
  unmountActive = mountDashboard(outletRef);
}

/** Switch to the Investigation Workspace screen (idempotent). */
export function showInvestigation() {
  if (activeScreen === "investigation") return;
  if (unmountActive) unmountActive();
  activeScreen = "investigation";
  unmountActive = mountInvestigation();
}

/**
 * Initialize the navigator over the shell's ScreenOutlet and show the
 * Dashboard as the startup screen. Returns a teardown for the shell.
 * @param {{ container: Element, render: (m: string) => void }} outlet
 * @returns {() => void} teardown (unmounts the active screen)
 */
export function initScreenNavigator(outlet) {
  outletRef = outlet;
  activeScreen = null;
  showDashboard();
  return () => {
    if (unmountActive) unmountActive();
    unmountActive = null;
    activeScreen = null;
  };
}
