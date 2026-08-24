/**
 * =====================================================================
 * PayResolve AI — src/evidence/investigationEvidence.js
 * Phase 6.4 — Investigation Evidence panel (read-only presentation)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Evidence (presentation)
 * Blueprint area (§2/§3): src/evidence/
 *
 * Purpose:
 *   The Investigation Evidence region (rendered inside DashboardScreen,
 *   beneath the Investigation Timeline). It presents the raw supporting
 *   information available for the active investigation — the evidence an
 *   investigator would have BEFORE any reasoning begins. It is the THIRD
 *   presentation consumer of the canonical Investigation Object (after
 *   Case Preview and Timeline), validating the ARC-01 data flow.
 *
 * State discipline (read-only):
 *   The panel OWNS NO application state. Its ONLY data dependency is
 *   `currentInvestigation`: it reads snapshot.currentInvestigation and its
 *   embedded `evidence` items — and nothing else. It NEVER reads
 *   selectedCase or selectedCategory, never constructs or mutates the
 *   Investigation Object, calls no setter, and wires no handlers. When the
 *   investigation changes, the Dashboard's single coherent subscription
 *   re-renders this region, so the evidence updates automatically
 *   (FS-01 §11 single refresh).
 *
 * No intelligence here:
 *   Evidence is raw information only. This panel performs NO analysis, NO
 *   scoring, NO ranking, NO classification, NO confidence/risk, and NO
 *   reasoning. The items are built deterministically by the Investigation
 *   Engine from values already present on the placeholder case; this panel
 *   only presents them.
 *
 * Explicitly NOT here (out of scope): NO agents, recommendations, root
 * cause, report, confidence/scores, or any future-phase content.
 *
 * Referenced documentation:
 *   FS-01 §3.3, §5.2 (single source of truth), §11 (refresh); ARC-01 §6/§9
 *   (downstream consumers read currentInvestigation); Implementation
 *   Blueprint v1.1 §3.9.
 * =====================================================================
 */

/** The read-only empty state shown when there is no active investigation. */
function emptyEvidence() {
  return `
    <div class="evidence-panel evidence-panel--empty" data-region="investigation-evidence" data-investigation="">
      <div class="evidence-empty" role="status">
        <div class="evidence-empty__glyph" aria-hidden="true">▢</div>
        <h4 class="evidence-empty__title">No active investigation</h4>
        <p class="evidence-empty__text">Select a case from the queue to view its supporting evidence.</p>
      </div>
    </div>`;
}

/** One evidence item (label + raw value). Presentation only. */
function evidenceItem(item) {
  return `
    <div class="evidence-item">
      <dt class="evidence-item__label">${item.label}</dt>
      <dd class="evidence-item__value">${item.value}</dd>
    </div>`;
}

/**
 * Pure render of the Investigation Evidence for a read-only snapshot.
 * Reads ONLY snapshot.currentInvestigation (and its `evidence`).
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the Investigation Evidence region HTML
 */
export function InvestigationEvidence(snapshot = null) {
  const investigation = snapshot ? snapshot.currentInvestigation : null;
  const items =
    investigation && Array.isArray(investigation.evidence)
      ? investigation.evidence
      : null;

  // Gracefully handle the absence of an active investigation.
  if (items == null || items.length === 0) return emptyEvidence();

  const rows = items.map(evidenceItem).join("");

  return `
    <div class="evidence-panel" data-region="investigation-evidence" data-investigation="${investigation.id}">
      <header class="evidence-panel__header">
        <div>
          <p class="evidence-panel__eyebrow">Investigation Evidence</p>
          <h3 class="evidence-panel__id" data-field="investigationId">${investigation.id}</h3>
        </div>
        <span class="evidence-panel__badge" aria-label="Supporting information">Evidence</span>
      </header>
      <dl class="evidence-grid">${rows}</dl>
    </div>`;
}
