/**
 * =====================================================================
 * PayResolve AI — src/investigation/investigationScreen.js
 * Phase 9.2 — Investigation Workspace screen (pure presentation)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Workspace (presentation)
 * Blueprint area (§2/§3): src/investigation/
 *
 * Purpose:
 *   The Investigation Workspace screen — the place operators investigate a
 *   selected case. It is a PURE presentation module: given a read-only
 *   snapshot it renders a Back-to-Queue affordance plus the investigation
 *   regions (Case Preview, Timeline, Evidence, Multi-Agent Workspace,
 *   Executive Report), each of which consumes only currentInvestigation.
 *
 * Separation of concerns (Phase 9.2):
 *   This module contains NO navigation logic and NO state subscription. It
 *   only emits the Back control's markup (a `data-nav="back"` hook); the
 *   screen navigator wires the click and decides screen transitions. This
 *   screen does not know how it — or the Dashboard — is mounted.
 *
 * Referenced documentation:
 *   FS-01 §3.2 (screens rendered through the ScreenOutlet), §5.2 (single
 *   source of truth); ARC-01 §6/§9 (consumers read currentInvestigation);
 *   Implementation Blueprint v1.1 §3.1.
 * =====================================================================
 */

import { CasePreviewScreen } from "../casepreview/casePreviewScreen.js";
import { InvestigationTimeline } from "../timeline/investigationTimeline.js";
import { InvestigationEvidence } from "../evidence/investigationEvidence.js";
import { MultiAgentWorkspace } from "../workspace/multiAgentWorkspace.js";
import { ExecutiveReportScreen } from "../reports/executiveReportScreen.js";

/**
 * Pure render of the Investigation Workspace screen for a read-only
 * snapshot. Each region reads only currentInvestigation.
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the Investigation screen HTML
 */
export function InvestigationScreen(snapshot = null) {
  return `
    <div class="investigation" data-screen="investigation-workspace">

      <header class="investigation__bar">
        <button type="button" class="investigation__back" data-nav="back">
          <span aria-hidden="true">←</span> Back to Queue
        </button>
      </header>

      <section class="dashboard__section case-preview-region" aria-label="Case Preview">
        ${CasePreviewScreen(snapshot)}
      </section>

      <section class="dashboard__section timeline-region" aria-label="Investigation Timeline">
        ${InvestigationTimeline(snapshot)}
      </section>

      <section class="dashboard__section evidence-region" aria-label="Investigation Evidence">
        ${InvestigationEvidence(snapshot)}
      </section>

      <section class="dashboard__section workspace-region" aria-label="Multi-Agent Investigation Workspace">
        ${MultiAgentWorkspace(snapshot)}
      </section>

      <section class="dashboard__section report-region" aria-label="Executive Investigation Report">
        ${ExecutiveReportScreen(snapshot)}
      </section>

    </div>`;
}
