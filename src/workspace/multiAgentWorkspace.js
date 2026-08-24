/**
 * =====================================================================
 * PayResolve AI — src/workspace/multiAgentWorkspace.js
 * Phase 7.1 — Multi-Agent Investigation Workspace (read-only panel)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Multi-Agent Workspace (presentation)
 * Blueprint area (§2/§3): src/workspace/
 *
 * Purpose:
 *   The Multi-Agent Investigation Workspace region (rendered inside
 *   DashboardScreen, beneath the Investigation Evidence). It presents the
 *   six investigation agents as a grid of Agent Cards. This phase is the
 *   workspace UI ONLY — no AI, no orchestration, no execution.
 *
 * State discipline (read-only):
 *   The panel OWNS NO application state. Its ONLY data dependency is
 *   `currentInvestigation`: it reads snapshot.currentInvestigation and its
 *   embedded `agents` — and nothing else. It NEVER reads selectedCase or
 *   selectedCategory, never constructs or mutates the Investigation
 *   Object, calls no setter, and wires no handlers. When the investigation
 *   changes, the Dashboard's single coherent subscription re-renders this
 *   region, so the workspace updates automatically (FS-01 §11).
 *
 * Reuse:
 *   Every agent is rendered by the SINGLE reusable AgentCard component
 *   (agentCard.js) — there is no per-agent implementation. The six agents
 *   themselves are the deterministic placeholders built by the
 *   Investigation Engine (buildInvestigation → agents).
 *
 * Explicitly NOT here (out of scope): NO agent execution, orchestration,
 * communication, findings, recommendations, confidence/scores, report, or
 * any future-phase content.
 *
 * Referenced documentation:
 *   FS-01 §3.3, §5.2 (single source of truth), §11 (refresh); ARC-01 §6/§9
 *   (downstream consumers read currentInvestigation); FS-04 (workspace,
 *   MVP subset); Implementation Blueprint v1.1 §3.7.
 * =====================================================================
 */

import { AgentCard } from "./agentCard.js";

/** The read-only empty state shown when there is no active investigation. */
function emptyWorkspace() {
  return `
    <div class="workspace-panel workspace-panel--empty" data-region="multi-agent-workspace" data-investigation="">
      <div class="workspace-empty" role="status">
        <div class="workspace-empty__glyph" aria-hidden="true">▢</div>
        <h4 class="workspace-empty__title">No active investigation</h4>
        <p class="workspace-empty__text">Select a case from the queue to open the investigation workspace.</p>
      </div>
    </div>`;
}

/**
 * Pure render of the Multi-Agent Workspace for a read-only snapshot.
 * Reads ONLY snapshot.currentInvestigation (and its `agents`).
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the Multi-Agent Workspace region HTML
 */
export function MultiAgentWorkspace(snapshot = null) {
  const investigation = snapshot ? snapshot.currentInvestigation : null;
  const agents =
    investigation && Array.isArray(investigation.agents)
      ? investigation.agents
      : null;

  // Gracefully handle the absence of an active investigation.
  if (agents == null || agents.length === 0) return emptyWorkspace();

  const cards = agents.map(AgentCard).join("");

  return `
    <div class="workspace-panel" data-region="multi-agent-workspace" data-investigation="${investigation.id}">
      <header class="workspace-panel__header">
        <div>
          <p class="workspace-panel__eyebrow">Multi-Agent Investigation Workspace</p>
          <h3 class="workspace-panel__id" data-field="investigationId">${investigation.id}</h3>
        </div>
        <span class="workspace-panel__badge" aria-label="Agents">${agents.length} Agents</span>
      </header>
      <div class="agent-grid">${cards}</div>
    </div>`;
}
