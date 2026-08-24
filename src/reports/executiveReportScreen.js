/**
 * =====================================================================
 * PayResolve AI — src/reports/executiveReportScreen.js
 * Phase 9.1 — Executive Investigation Report (read-only presentation)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Executive Report (presentation)
 * Blueprint area (§2/§3): src/reports/
 *
 * Purpose:
 *   The Executive Investigation Report region (rendered inside
 *   DashboardScreen, beneath the Multi-Agent Workspace). It is a CONCISE
 *   executive SUMMARY for operations leadership — answering "what does an
 *   Operations Manager need to know within 20 seconds?" — rather than a
 *   copy of the other panels. It deliberately does NOT repeat information
 *   already shown prominently in Case Preview / Timeline / Evidence /
 *   Workspace (e.g. gateway/issuer/acquirer in Case Info, the full
 *   timeline with details, every evidence item, or the agent messages).
 *   It is a presentation consumer of the canonical Investigation Object.
 *
 * State discipline (read-only):
 *   The report OWNS NO application state. Its ONLY data dependency is
 *   `currentInvestigation`: it reads snapshot.currentInvestigation (and its
 *   embedded case/timeline/evidence/agents) — and nothing else. It NEVER
 *   reads selectedCase or selectedCategory, never constructs or mutates an
 *   Investigation Object, never calls the Investigation Engine, calls no
 *   setter, wires no handlers, and duplicates no state. When the
 *   investigation changes, the Dashboard's single coherent subscription
 *   re-renders this region, so the report updates automatically
 *   (FS-01 §11 single refresh).
 *
 * No intelligence here:
 *   The report performs NO analysis, NO reasoning, NO inference, NO
 *   conclusions, NO recommendations, NO AI. Every value is surfaced or
 *   assembled (string concatenation only) from data already present on the
 *   investigation. This phase intentionally excludes report generation,
 *   human review, close-case, export, print, and PDF (FS-05, later phases).
 *
 * Referenced documentation:
 *   FS-01 S6, §3.3, §5.2 (single source of truth), §11 (refresh); ARC-01
 *   §6/§9 (downstream consumers read currentInvestigation); FS-05 §3 (report
 *   sections, MVP read-only subset); Implementation Blueprint v1.1 §3.12.
 * =====================================================================
 */

const PLACEHOLDER = "—";

/** Coalesce an absent value to the placeholder token. */
function val(v) {
  return v == null || v === "" ? PLACEHOLDER : v;
}

/** One compact labelled field (definition-list row). */
function field(label, value) {
  return `
    <div class="report-field">
      <dt class="report-field__label">${label}</dt>
      <dd class="report-field__value">${val(value)}</dd>
    </div>`;
}

/** A compact report section (title + body). Reusable across the report. */
function section(title, bodyHtml, extraClass = "") {
  return `
    <section class="report-section${extraClass ? " " + extraClass : ""}" aria-label="${title}">
      <h4 class="report-section__title">${title}</h4>
      ${bodyHtml}
    </section>`;
}

/** The read-only empty state shown when there is no active investigation. */
function emptyReport() {
  return `
    <div class="report-panel report-panel--empty" data-region="executive-report" data-investigation="">
      <div class="report-empty" role="status">
        <div class="report-empty__glyph" aria-hidden="true">▢</div>
        <h4 class="report-empty__title">No active investigation</h4>
        <p class="report-empty__text">Select a case from the queue to generate its executive report.</p>
      </div>
    </div>`;
}

/**
 * Pure render of the Executive Investigation Report for a read-only
 * snapshot. Reads ONLY snapshot.currentInvestigation.
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the Executive Report region HTML
 */
export function ExecutiveReportScreen(snapshot = null) {
  const investigation = snapshot ? snapshot.currentInvestigation : null;
  if (investigation == null || investigation.case == null) return emptyReport();

  const inv = investigation;
  const c = inv.case;

  // Investigation Overview — the "who/what/where" at a glance.
  const overview = section(
    "Investigation Overview",
    `<dl class="report-grid">
       ${field("Investigation ID", inv.id)}
       ${field("Status", inv.status)}
       ${field("Failure Category", inv.category)}
     </dl>`
  );

  // Investigation Summary — 2 short sentences ASSEMBLED from existing
  // values (no analysis, no inference, no conclusions).
  const summaryText =
    `Investigation ${inv.id} is ${inv.status} for case ${c.id} (${val(c.merchant)}). ` +
    `Failure category ${inv.category}; priority ${c.priority}; status ${c.status}.`;
  const summary = section(
    "Investigation Summary",
    `<p class="report-summary">${summaryText}</p>`
  );

  // Business Impact — existing values only (no calculation).
  const impact = section(
    "Business Impact",
    `<dl class="report-grid">
       ${field("Revenue at Risk", c.revenueAtRisk)}
       ${field("Priority", c.priority)}
       ${field("Assigned Queue", c.assignedQueue)}
     </dl>`
  );

  // Case Information — only the most important identifiers (Gateway /
  // Issuer / Acquirer live prominently in Case Preview and are not
  // repeated here).
  const caseInfo = section(
    "Case Information",
    `<dl class="report-grid">
       ${field("Case ID", c.id)}
       ${field("Merchant", c.merchant)}
       ${field("Amount", c.amount)}
       ${field("Currency", c.currency)}
     </dl>`
  );

  // Agent Activity Summary — executive-level status only (name + status).
  // The detailed agent messages already live in the Multi-Agent Workspace.
  const agentRows = inv.agents
    .map(
      (a) => field(a.name, `<span class="report-agent__status">${a.status}</span>`)
    )
    .join("");
  const agents = section(
    "Agent Activity Summary",
    `<dl class="report-grid">${agentRows}</dl>`
  );

  // Timeline Summary — a compact one-line lifecycle summary (event titles
  // only). The full timeline (with details) lives in the Timeline panel.
  const timelineText =
    `Lifecycle completed · ${inv.timeline.length} events: ` +
    inv.timeline.map((e) => e.title).join(" → ");
  const timeline = section(
    "Timeline Summary",
    `<p class="report-summary">${timelineText}</p>`
  );

  // Evidence Summary — a concise snapshot, NOT the full evidence panel.
  const evidence = section(
    "Evidence Summary",
    `<dl class="report-grid">
       ${field("Failure Reason", c.failureReason)}
       ${field("Gateway", c.gateway)}
       ${field("Issuer", c.issuer)}
     </dl>`
  );

  return `
    <div class="report-panel" data-region="executive-report" data-investigation="${inv.id}">
      <header class="report-panel__header">
        <div>
          <p class="report-panel__eyebrow">Executive Investigation Report</p>
          <h3 class="report-panel__id" data-field="investigationId">${inv.id}</h3>
          <p class="report-panel__sub">${val(c.merchant)} &nbsp;·&nbsp; ${val(inv.category)}</p>
        </div>
        <span class="report-panel__badge" aria-label="Report">Report</span>
      </header>

      <div class="report-panel__body">
        ${overview}
        ${summary}
        ${impact}
        ${caseInfo}
        ${agents}
        ${timeline}
        ${evidence}
      </div>
    </div>`;
}
