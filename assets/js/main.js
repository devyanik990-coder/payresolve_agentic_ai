/**
 * =====================================================================
 * PayResolve AI — assets/js/main.js
 * Phase 4.2 — Application entry point
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Application Shell (entry)
 * Blueprint area (§2/§3): assets/js/ (host) → src/app/
 *
 * Purpose:
 *   The application entry point. On DOM ready it instantiates the
 *   AppShell and starts it against the host page's active-screen
 *   container (#screen-outlet). The AppShell then mounts the Operations
 *   Dashboard through the ScreenOutlet. It also activates the
 *   Investigation Engine, which subscribes to the Application State
 *   Manager and manages currentInvestigation (ARC-01). It also activates
 *   the deterministic Agent Execution controller (workspace status).
 *
 * Referenced documentation:
 *   FS-01 §3.2 (AppShell/ScreenOutlet); TDD-01 §4.1; Implementation
 *   Blueprint v1.1 §2, §5 Phase 2.
 *
 * NOTE: This module wires composition only — NO routing, NO history, NO
 * business logic. It must be served over http(s) to execute (ES modules
 * do not load over the file:// protocol).
 * =====================================================================
 */

import { AppShell } from "../../src/app/appShell.js";
import { activateInvestigationEngine } from "../../src/investigation/investigationEngine.js";
import { activateAgentExecution } from "../../src/workspace/agentExecutionController.js";

function bootstrap() {
  const outletElement = document.getElementById("screen-outlet");
  if (outletElement == null) return;
  const shell = new AppShell();
  shell.start(outletElement);

  // Activate the Investigation Engine (business layer). It subscribes to
  // the Application State Manager and, whenever a valid selectedCase is
  // active, constructs/replaces currentInvestigation. This is composition
  // wiring — no presentation component invokes the engine (ARC-01 §11).
  activateInvestigationEngine();

  // Activate the deterministic Agent Execution controller. It subscribes to
  // the Application State Manager and, whenever a new investigation becomes
  // active, resets the six agents to Pending and walks them through
  // Running -> Completed in a fixed order/timing. It only updates status
  // indicators — no application state, no Investigation Object changes.
  activateAgentExecution(outletElement);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
