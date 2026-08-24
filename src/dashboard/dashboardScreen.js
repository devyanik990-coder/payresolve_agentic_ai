/**
 * =====================================================================
 * PayResolve AI — src/dashboard/dashboardScreen.js
 * Phase 4.2 — Operations Dashboard: state integration & category selection
 * Phase 5.2 — Investigation Queue integrated as a Dashboard region
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Dashboard Module
 * Blueprint area (§2/§3): src/dashboard/
 *
 * Purpose:
 *   The Operations Dashboard screen (FS-01 S1; FS-02). Two parts:
 *     1. DashboardScreen(snapshot) — a PURE render that returns the
 *        dashboard markup for a read-only snapshot. It now includes the
 *        Investigation Queue as a REGION (FS-01 S3 rendered inside the
 *        dashboard, per the approved architecture — the queue is not a
 *        separate screen/page/entry point). The queue region is a pure
 *        render of the same snapshot (InvestigationQueueScreen).
 *     2. mountDashboard(outlet) — the CONTROLLER: it renders the dashboard
 *        into the ScreenOutlet, subscribes to the single State Manager so
 *        the whole dashboard (including the queue) re-renders on any state
 *        change, wires the Category Cards to request a category selection,
 *        wires Queue Rows to request a case selection, and keeps the
 *        queue's selection consistent (auto-select the first case on
 *        startup and after each category change).
 *
 * State discipline (unchanged single-source-of-truth model):
 *   - The dashboard and the queue OWN NO state. selectedCategory and
 *     selectedCase are read only from the snapshot at render time.
 *   - Category cards REQUEST setSelectedCategory; queue rows REQUEST
 *     setSelectedCase (via queueController). The State Manager owns every
 *     mutation and drives the single refresh; nothing here mutates state
 *     directly or bypasses the manager.
 *   - Category selection and case selection are independent: changing the
 *     queue selection never changes selectedCategory, and the dashboard's
 *     category cards continue to reflect selectedCategory only.
 *
 * Referenced documentation:
 *   FS-01 S1/S3, §3.3, §5.2 (single source of truth), §7.2 (category
 *   switch clears case), §11 (single coherent refresh); FS-02 §4/§5;
 *   FS-03 §7.1 (initial selection), §9 (case selection); TDD-01 §4.3/§4.4;
 *   Implementation Blueprint v1.1 §3.4, §3.5, §7.
 *
 * NOTE: No business logic. KPI titles/descriptions are static labels
 * (FS-02 §4); queue cases are deterministic workflow placeholders
 * (queuePlaceholders), not computed metrics or real payment data.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";
import { PaymentHealthPanel } from "./paymentHealthPanel.js";
import { InvestigationQueueScreen } from "../queue/investigationQueueScreen.js";
import {
  ensureQueueSelection,
  requestCaseSelection,
} from "../queue/queueController.js";
import { showInvestigation } from "../navigation/screenNavigator.js";

const PLACEHOLDER_VALUE = "--";

/**
 * The nine KPIs defined by FS-02 §4, in document order. `title` is the
 * defined KPI name; `description` is a static label of the KPI's meaning
 * (FS-02 §4). No values or units are computed (DR-09).
 */
export const KPI_DEFINITIONS = Object.freeze([
  { title: "Authorization Rate", description: "Share of attempts authorized" },
  { title: "Approval Rate", description: "Share of attempts approved" },
  { title: "Decline Rate", description: "Share of attempts declined" },
  { title: "Revenue at Risk", description: "Exposed revenue in the window" },
  { title: "Open Investigations", description: "Investigations currently open" },
  { title: "Critical Investigations", description: "Open, highest-urgency investigations" },
  { title: "Average Resolution Time", description: "Mean time to a closed case" },
  { title: "Recovered Revenue", description: "Revenue recovered from actions" },
  { title: "Merchant Health Score", description: "Overall merchant health indicator" },
]);

/**
 * Read-only availability guard: confirms the single Application State
 * Manager is present and exposes its read API. Reads no state values.
 * @returns {boolean}
 */
export function isStateManagerAvailable() {
  return (
    applicationStateManager != null &&
    typeof applicationStateManager.getState === "function"
  );
}

/** Build one KPITile (title + placeholder value + placeholder description). */
function kpiTile(def) {
  return `
    <article class="kpi-tile" data-kpi-tile>
      <p class="kpi-tile__title">${def.title}</p>
      <p class="kpi-tile__value">${PLACEHOLDER_VALUE}</p>
      <p class="kpi-tile__desc">${def.description}</p>
    </article>`;
}

/**
 * Pure render of the Operations Dashboard for a given read-only snapshot.
 * The selected category is derived from the snapshot (never cached). The
 * Investigation Queue, Case Preview, Investigation Timeline,
 * Investigation Evidence, the Multi-Agent Workspace, and the Executive
 * Investigation Report are rendered as regions from the same snapshot.
 * @param {Object|null} [snapshot] the current read-only state snapshot
 * @returns {string} dashboard HTML
 */
export function DashboardScreen(snapshot = null) {
  const selectedCategory = snapshot ? snapshot.selectedCategory : null;
  const managerState = isStateManagerAvailable() ? "available" : "unavailable";
  const tiles = KPI_DEFINITIONS.map(kpiTile).join("");

  return `
    <div class="dashboard"
         data-screen="operations-dashboard"
         data-state-manager="${managerState}"
         data-selected-category="${selectedCategory ?? ""}">

      <header class="dashboard__header">
        <div>
          <h3 class="dashboard__title">Operations Dashboard</h3>
          <p class="dashboard__subtitle">Payment authorization health &amp; triage</p>
        </div>
        <span class="dashboard__phase-tag">Live</span>
      </header>

      <section class="dashboard__section kpi-summary" aria-label="Operational KPIs">
        <div class="dashboard__section-head">
          <h3 class="dashboard__section-title">Operational KPIs</h3>
          <span class="dashboard__section-tag">Placeholder</span>
        </div>
        <div class="kpi-board">${tiles}</div>
      </section>

      ${PaymentHealthPanel(selectedCategory)}

      <section class="dashboard__section queue-region" aria-label="Investigation Queue">
        ${InvestigationQueueScreen(snapshot)}
      </section>

    </div>`;
}

/**
 * Request that a category become the selected one. Reads the current
 * selection from the State Manager (never a cached copy); if the category
 * is already selected, does nothing. Otherwise it REQUESTS the change —
 * the State Manager owns the mutation (and clears selectedCase per §7.2).
 * @param {string} category the category identity from the clicked card
 */
export function requestCategorySelection(category) {
  if (category == null) return;
  const current = applicationStateManager.getState().selectedCategory;
  if (category === current) return; // already selected -> no effect
  applicationStateManager.setSelectedCategory(category); // request only
}

/**
 * Mount the dashboard into the ScreenOutlet: render it, subscribe to the
 * State Manager so it re-renders on state change, keep the queue's
 * selection consistent with the category, and wire category-card and
 * queue-row activation. Returns an unmount function.
 * @param {{ container: Element, render: (markup: string) => void }} outlet
 * @returns {() => void} unmount (unsubscribe + detach listeners)
 */
export function mountDashboard(outlet) {
  const renderFromSnapshot = (snapshot) =>
    outlet.render(DashboardScreen(snapshot));

  // Single reaction to every committed state change. First keep the
  // queue's selection consistent with the current category (auto-select
  // the first case on startup and after a category change). If that
  // REQUESTS a selectedCase change, the resulting notification will
  // re-render — so we skip rendering the transient (unselected) snapshot
  // here to avoid a flash and redundant work.
  const onState = (snapshot) => {
    if (ensureQueueSelection(snapshot)) return;
    renderFromSnapshot(snapshot);
  };

  // Activation via event delegation on the stable outlet container
  // (survives re-renders that replace innerHTML). A queue row takes
  // precedence; otherwise a category card. Both only REQUEST changes.
  const activate = (target) => {
    const row = target.closest("[data-queue-row]");
    if (row && outlet.container.contains(row)) {
      // Business: update the selected case (starts a new investigation).
      requestCaseSelection(row.getAttribute("data-case-id"));
      // Navigation: ask the navigator to open the Investigation screen.
      // (The Dashboard triggers navigation; it does not perform the switch.)
      showInvestigation();
      return;
    }
    const card = target.closest("[data-category]");
    if (card && outlet.container.contains(card)) {
      requestCategorySelection(card.getAttribute("data-category"));
    }
  };

  const onClick = (event) => activate(event.target);
  const onKey = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const interactive = event.target.closest("[data-queue-row], [data-category]");
    if (!interactive || !outlet.container.contains(interactive)) return;
    event.preventDefault();
    activate(event.target);
  };

  outlet.container.addEventListener("click", onClick);
  outlet.container.addEventListener("keydown", onKey);

  // Re-render (and keep queue selection consistent) on every state change.
  const unsubscribe = applicationStateManager.subscribe(onState);

  // Initial reaction from the current snapshot (startup auto-selection +
  // first render). Startup default category is already set by the shell.
  onState(applicationStateManager.getState());

  return () => {
    unsubscribe();
    outlet.container.removeEventListener("click", onClick);
    outlet.container.removeEventListener("keydown", onKey);
  };
}
