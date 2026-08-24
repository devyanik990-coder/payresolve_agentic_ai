/**
 * =====================================================================
 * PayResolve AI — src/workspace/agentExecutionController.js
 * Phase 8.1 — Deterministic Agent Execution (MVP)
 * Phase 9.2 — Execution-state reflection across navigation
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Multi-Agent Workspace (execution)
 * Blueprint area (§2/§3): src/workspace/
 *
 * Purpose:
 *   A small, lightweight execution controller that makes the workspace
 *   feel alive. Whenever a NEW investigation becomes active, it resets the
 *   six agents to "Pending" and then walks them through
 *   Pending → Running → Completed, one-by-one, in a fixed deterministic
 *   order, using fixed deterministic delays. There is NO AI, NO reasoning,
 *   NO orchestration framework — only status transitions.
 *
 * Execution belongs to the INVESTIGATION lifecycle (not the UI):
 *   Execution begins when a new investigation is CREATED (the state
 *   subscription below) — regardless of which screen is showing — and is
 *   never restarted or retriggered by navigation. The trigger, the ordered
 *   sequence, and the timing are unchanged from Phase 8.1.
 *
 *   Because the workspace now lives on the Investigation screen (Phase
 *   9.2), the controller keeps the CURRENT per-agent execution status in
 *   memory and re-queries the workspace pills at paint time. This lets the
 *   UI REFLECT the current execution state whenever the workspace is
 *   (re)mounted — the navigator calls syncWorkspaceStatuses() to paint the
 *   current state onto a freshly rendered workspace. Reflecting is NOT
 *   replaying: no timers are reset or rescheduled, execution simply
 *   continues and the DOM shows wherever it currently is.
 *
 * Architectural position:
 *   - REUSES the existing state subscription mechanism (like the
 *     Investigation Engine); no event bus / DI / scheduler / queue / retry
 *     / command pattern is introduced.
 *   - Execution/presentation side-effect only: updates the status
 *     indicator on each agent card. Writes NO application state,
 *     creates/mutates NO Investigation Object, and never touches messages,
 *     layout, or styling. The Investigation Engine remains the sole
 *     creator of the Investigation Object.
 *   - Execution status is transient runtime state owned here (not domain
 *     state); it is derived from currentInvestigation and duplicated
 *     nowhere in application state.
 *
 * Referenced documentation:
 *   FS-01 §5.2 (single source of truth), §11 (refresh); FS-04 (workspace,
 *   MVP subset); Implementation Blueprint v1.1 §3.7.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";

/** Fixed deterministic delay between status transitions (ms). */
export const AGENT_EXECUTION_STEP_MS = 150;

/** The DOM selector for the agent status pills, in execution order. */
const STATUS_SELECTOR =
  '[data-region="multi-agent-workspace"] .agent-card .agent-card__status';

const STATUS_TONE = Object.freeze({
  Pending: "pending",
  Running: "running",
  Completed: "completed",
});

/**
 * The deterministic execution plan: for each agent (in order) a Running
 * step then a Completed step, at fixed times. Pure and deterministic —
 * every execution is identical. Only one agent is Running at any instant
 * (each agent's [Running, Completed) interval is disjoint from the next
 * agent's).
 * @param {number} [count=6] number of agents
 * @param {number} [stepMs=AGENT_EXECUTION_STEP_MS] delay per transition
 * @returns {Array<{index:number,status:"Running"|"Completed",at:number}>}
 */
export function executionPlan(count = 6, stepMs = AGENT_EXECUTION_STEP_MS) {
  const steps = [];
  for (let i = 0; i < count; i += 1) {
    steps.push({ index: i, status: "Running", at: (2 * i + 1) * stepMs });
    steps.push({ index: i, status: "Completed", at: (2 * i + 2) * stepMs });
  }
  return steps;
}

let containerEl = null;
let unsubscribe = null;
let activeInvestigationId = null;
let timers = [];
let runToken = 0;
/** The current per-agent execution status (source of truth for the UI). */
let currentStatuses = [];

/** Cancel every scheduled transition from the current/previous run. */
function clearTimers() {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

/** The agent status pill elements in the CURRENT DOM (execution order). */
function statusPills() {
  const root =
    containerEl || (typeof document !== "undefined" ? document : null);
  if (root == null || typeof root.querySelectorAll !== "function") return [];
  return Array.from(root.querySelectorAll(STATUS_SELECTOR));
}

/** Set one pill to a status (text + tone class), leaving layout untouched. */
function setPill(pill, status) {
  if (pill == null || status == null) return;
  pill.textContent = status;
  if (pill.classList) {
    pill.classList.remove(
      "agent-card__status--pending",
      "agent-card__status--running",
      "agent-card__status--completed"
    );
    pill.classList.add(`agent-card__status--${STATUS_TONE[status]}`);
  }
}

/** Paint the CURRENT known statuses onto the current workspace pills. */
function paintCurrentStatuses() {
  const pills = statusPills();
  for (let i = 0; i < pills.length && i < currentStatuses.length; i += 1) {
    setPill(pills[i], currentStatuses[i]);
  }
}

/**
 * Reflect the current execution state onto the currently mounted
 * workspace. Called after the workspace is (re)rendered — e.g. when the
 * Investigation screen opens. This ONLY paints the current status; it does
 * NOT reset, restart, or reschedule execution (no replay).
 */
export function syncWorkspaceStatuses() {
  paintCurrentStatuses();
}

/**
 * React to the current application state. Reads the live snapshot (robust
 * to re-entrant notifications). When the active investigation CHANGES, it
 * discards the previous run, resets the statuses to "Pending", and
 * schedules the deterministic Running/Completed sequence. Same
 * investigation → no-op (execution continues; never restarted here).
 */
function reconcileExecution() {
  const investigation = applicationStateManager.getState().currentInvestigation;
  const id = investigation ? investigation.id : null;

  if (id === activeInvestigationId) return; // already executing this one
  activeInvestigationId = id;

  clearTimers();
  runToken += 1;
  const token = runToken;

  if (id == null) {
    currentStatuses = [];
    return;
  }

  // Number of agents comes from the investigation itself (deterministic).
  const count = Array.isArray(investigation.agents)
    ? investigation.agents.length
    : 6;

  // Reset the in-memory statuses to Pending and reflect onto the DOM if the
  // workspace happens to be mounted right now (else it is reflected later
  // via syncWorkspaceStatuses when the workspace is shown).
  currentStatuses = new Array(count).fill("Pending");
  paintCurrentStatuses();

  // Schedule the deterministic sequence. Each step updates the in-memory
  // status AND paints the CURRENT DOM pill (re-queried), so it reflects on
  // whichever workspace is mounted at that moment. A stale run is ignored.
  for (const step of executionPlan(count)) {
    timers.push(
      setTimeout(() => {
        if (token !== runToken) return; // superseded by a newer investigation
        currentStatuses[step.index] = step.status;
        const pills = statusPills();
        setPill(pills[step.index], step.status);
      }, step.at)
    );
  }
}

/**
 * Activate the execution controller: subscribe to the existing state
 * mechanism and run once for the current investigation. Idempotent.
 * @param {Element} [container] the workspace's host container (the outlet)
 * @returns {() => void} a deactivation function
 */
export function activateAgentExecution(container) {
  if (container != null) containerEl = container;
  if (unsubscribe != null) return deactivateAgentExecution; // already active
  unsubscribe = applicationStateManager.subscribe(reconcileExecution);
  reconcileExecution();
  return deactivateAgentExecution;
}

/** Deactivate the controller (cancel timers + unsubscribe). Idempotent. */
export function deactivateAgentExecution() {
  clearTimers();
  if (unsubscribe != null) {
    unsubscribe();
    unsubscribe = null;
  }
  activeInvestigationId = null;
  currentStatuses = [];
}
