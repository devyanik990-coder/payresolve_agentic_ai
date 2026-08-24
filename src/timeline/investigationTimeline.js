/**
 * =====================================================================
 * PayResolve AI — src/timeline/investigationTimeline.js
 * Phase 6.3 — Investigation Timeline panel (read-only presentation)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Timeline (presentation)
 * Blueprint area (§2/§3): src/timeline/
 *
 * Purpose:
 *   The Investigation Timeline region (rendered inside DashboardScreen,
 *   beneath the Case Preview). It visualizes the lifecycle of the current
 *   investigation as a deterministic, ordered list of events. It is the
 *   SECOND presentation consumer of the canonical Investigation Object
 *   (after Case Preview), validating the ARC-01 data flow.
 *
 * State discipline (read-only):
 *   The panel OWNS NO application state. Its ONLY data dependency is
 *   `currentInvestigation`: it reads snapshot.currentInvestigation and its
 *   embedded `timeline` events — and nothing else. It NEVER reads
 *   selectedCase or selectedCategory, never constructs or mutates the
 *   Investigation Object, calls no setter, and wires no handlers. When the
 *   investigation changes, the Dashboard's single coherent subscription
 *   re-renders this region, so the timeline updates automatically
 *   (FS-01 §11 single refresh).
 *
 * Determinism:
 *   The events themselves are built deterministically by the Investigation
 *   Engine (buildInvestigation → timeline) from values already present on
 *   the placeholder case. This panel only presents them: no reasoning, no
 *   analysis, no business logic, no AI.
 *
 * Explicitly NOT here (out of scope): NO evidence, agents, recommendations,
 * root cause, report, confidence/scores, or any future-phase content.
 *
 * Referenced documentation:
 *   FS-01 §3.3, §5.2 (single source of truth), §11 (refresh); ARC-01 §6/§9
 *   (downstream consumers read currentInvestigation); Implementation
 *   Blueprint v1.1 §3.10.
 * =====================================================================
 */

/** The read-only empty state shown when there is no active investigation. */
function emptyTimeline() {
  return `
    <div class="timeline-panel timeline-panel--empty" data-region="investigation-timeline" data-investigation="">
      <div class="timeline-empty" role="status">
        <div class="timeline-empty__glyph" aria-hidden="true">▢</div>
        <h4 class="timeline-empty__title">No active investigation</h4>
        <p class="timeline-empty__text">Select a case from the queue to view its investigation timeline.</p>
      </div>
    </div>`;
}

/** One timeline event (ordered lifecycle step). Presentation only. */
function timelineEvent(event, index, total) {
  const isLast = index === total - 1;
  const connector = isLast ? "" : `<span class="timeline-event__line" aria-hidden="true"></span>`;
  return `
    <li class="timeline-event" role="listitem">
      <span class="timeline-event__marker" aria-hidden="true">
        <span class="timeline-event__dot"></span>
        ${connector}
      </span>
      <span class="timeline-event__body">
        <span class="timeline-event__title">${event.title}</span>
        <span class="timeline-event__detail">${event.detail}</span>
      </span>
    </li>`;
}

/**
 * Pure render of the Investigation Timeline for a read-only snapshot.
 * Reads ONLY snapshot.currentInvestigation (and its `timeline`).
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the Investigation Timeline region HTML
 */
export function InvestigationTimeline(snapshot = null) {
  const investigation = snapshot ? snapshot.currentInvestigation : null;
  const events =
    investigation && Array.isArray(investigation.timeline)
      ? investigation.timeline
      : null;

  // Gracefully handle the absence of an active investigation.
  if (events == null || events.length === 0) return emptyTimeline();

  const items = events
    .map((event, i) => timelineEvent(event, i, events.length))
    .join("");

  return `
    <div class="timeline-panel" data-region="investigation-timeline" data-investigation="${investigation.id}">
      <header class="timeline-panel__header">
        <div>
          <p class="timeline-panel__eyebrow">Investigation Timeline</p>
          <h3 class="timeline-panel__id" data-field="investigationId">${investigation.id}</h3>
        </div>
        <span class="timeline-panel__badge" aria-label="Lifecycle">Lifecycle</span>
      </header>
      <ol class="timeline" role="list">${items}</ol>
    </div>`;
}
