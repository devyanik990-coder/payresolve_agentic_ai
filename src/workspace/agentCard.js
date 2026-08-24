/**
 * =====================================================================
 * PayResolve AI — src/workspace/agentCard.js
 * Phase 7.1 — Multi-Agent Investigation Workspace (reusable AgentCard)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Multi-Agent Workspace (presentation)
 * Blueprint area (§2/§3): src/workspace/
 *
 * Purpose:
 *   The ONE reusable Agent Card component. Every agent in the workspace
 *   is rendered by this single function — there is no per-agent variant.
 *   It presents an agent's name, status, deterministic message, and
 *   (optionally) a last-updated timestamp when one is available. All values
 *   come from the engine-built agent descriptor (currentInvestigation.agents);
 *   this component hardcodes NO agent messages. The `agent-card__output`
 *   class is a stable style hook (unchanged) — styling is untouched.
 *
 * State discipline (read-only):
 *   The card owns no state and reads no application state directly. It is a
 *   pure function of the agent descriptor passed in by the workspace
 *   (which derives it from currentInvestigation.agents). It performs no
 *   analysis, no reasoning, no scoring — it only presents fixed values.
 *
 * Referenced documentation:
 *   FS-01 §3.3; FS-04 (Multi-Agent Workspace, MVP subset); Implementation
 *   Blueprint v1.1 §3.7.
 * =====================================================================
 */

/** Map an agent status to a status-pill modifier (visual tone only). */
function statusTone(status) {
  return status === "Completed" ? "completed" : "pending";
}

/**
 * Render one Agent Card. Reused for every agent (no per-agent variants).
 * @param {{ name: string, status: string, message: string, lastUpdated?: string,
 *           analysis?: {primary:string,confidence:string,evidence:string[],reasoning:string} }} agent
 * @returns {string} HTML for a single agent card
 */
export function AgentCard(agent) {
  const lastUpdated = agent.lastUpdated
    ? `<p class="agent-card__updated">Last updated: ${agent.lastUpdated}</p>`
    : "";
  return `
    <article class="agent-card" data-agent="${agent.name}">
      <header class="agent-card__header">
        <h4 class="agent-card__name">${agent.name}</h4>
        <span class="agent-card__status agent-card__status--${statusTone(agent.status)}">${agent.status}</span>
      </header>
      <p class="agent-card__output">${agent.message}</p>${analysisBlock(agent.analysis)}
      ${lastUpdated}
    </article>`;
}

/**
 * Render a generic agent analysis block, when present. This is agent-
 * agnostic: ANY agent that provides an `analysis` structure
 * ({ primary, confidence, evidence: string[], reasoning }) gets it
 * rendered the same way. Agents without `analysis` render nothing extra,
 * so their card is byte-identical to before.
 * @param {{primary?:string,confidence?:string,evidence?:string[],reasoning?:string}|null|undefined} analysis
 * @returns {string} HTML for the analysis block (empty string when absent)
 */
function analysisBlock(analysis) {
  if (analysis == null) return "";
  const evidence = Array.isArray(analysis.evidence) ? analysis.evidence : [];
  const evidenceItems = evidence
    .map((e) => `<li class="agent-analysis__evidence-item">${e}</li>`)
    .join("");
  const evidenceList = evidenceItems
    ? `<ul class="agent-analysis__evidence">${evidenceItems}</ul>`
    : "";
  const reasoning = analysis.reasoning
    ? `<p class="agent-analysis__reasoning">${analysis.reasoning}</p>`
    : "";
  return `
    <div class="agent-analysis">
      <dl class="agent-analysis__facts">
        <div class="agent-analysis__row">
          <dt class="agent-analysis__label">Primary</dt>
          <dd class="agent-analysis__value">${analysis.primary ?? "—"}</dd>
        </div>
        <div class="agent-analysis__row">
          <dt class="agent-analysis__label">Confidence</dt>
          <dd class="agent-analysis__value">
            <span class="agent-analysis__confidence agent-analysis__confidence--${String(analysis.confidence ?? "").toLowerCase()}">${analysis.confidence ?? "—"}</span>
          </dd>
        </div>
      </dl>
      ${evidenceList ? `<p class="agent-analysis__heading">Supporting evidence</p>${evidenceList}` : ""}
      ${reasoning}
    </div>`;
}
