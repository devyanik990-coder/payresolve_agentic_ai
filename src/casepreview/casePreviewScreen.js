/**
 * =====================================================================
 * PayResolve AI — src/casepreview/casePreviewScreen.js
 * Phase 5.3 — Case Preview Panel (read-only presentation)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Case Preview Module
 * Blueprint area (§2/§3): src/casepreview/
 *
 * Purpose:
 *   The Case Preview region (FS-01 S4; FS-03 §10). It presents the details
 *   of the currently selected Investigation Case, READ-ONLY, so the user
 *   can see exactly which case is in focus. It is a pure presentation
 *   component rendered inside DashboardScreen (a region — not a separate
 *   screen or entry point).
 *
 * State discipline (read-only) — Phase 6.2:
 *   The panel OWNS NO application state. Its ONLY data dependency is now
 *   `currentInvestigation`: it reads snapshot.currentInvestigation and
 *   nothing else (it no longer reads selectedCase, selectedCategory, or
 *   any other slot). Case Preview is the FIRST presentation consumer of
 *   the Investigation Engine's canonical Investigation Object (ARC-01 §6,
 *   §9). It never writes state, never constructs or mutates the
 *   Investigation Object, calls no setter, and wires no handlers. When
 *   the investigation changes the Dashboard's single coherent
 *   subscription re-renders this region, so the displayed values update
 *   immediately (FS-01 §11 single refresh).
 *
 * Presentation:
 *   The Investigation Object carries the canonical case descriptor at
 *   `currentInvestigation.case`; the panel reads the same displayed fields
 *   from there, so the rendered output is unchanged from Phase 5.3 — only
 *   the SOURCE of the data changed (selectedCase → currentInvestigation).
 *   The case is organized into professional sections built from the same
 *   reusable helpers (previewSection + field): General, Payment, Failure,
 *   Processing, and Operational information. Values are the deterministic
 *   placeholder descriptors owned by the case (queuePlaceholders); no real
 *   payment data, no calculations, no investigation logic.
 *
 * Explicitly NOT here (out of scope — later phases):
 *   NO Launch Investigation control, NO investigation creation, NO root
 *   cause / evidence / timeline / recommendations / report, NO AI.
 *
 * Referenced documentation:
 *   FS-01 S4, §3.3, §5.2 (single source of truth), §11 (refresh);
 *   FS-03 §10 (Case Preview sections, read-only); ARC-01 §6/§9
 *   (downstream consumers read currentInvestigation, not selectedCase);
 *   TDD-01 §4.5; Implementation Blueprint v1.1 §3.6.
 * =====================================================================
 */

const PLACEHOLDER = "—";

/** Escape nothing — values are our own deterministic placeholders — but
 *  coalesce absent values to the placeholder token for a clean layout. */
function val(v) {
  return v == null || v === "" ? PLACEHOLDER : v;
}

/**
 * One labelled field (definition-list row). Reusable across every section.
 * @param {string} label the field label
 * @param {*} value the field value (coalesced to "—" when absent)
 * @returns {string} field HTML
 */
export function field(label, value) {
  return `
    <div class="case-field">
      <dt class="case-field__label">${label}</dt>
      <dd class="case-field__value">${val(value)}</dd>
    </div>`;
}

/**
 * One professional section (title + a grid of fields). Reusable.
 * @param {string} title the section title
 * @param {string} fieldsHtml concatenated field() markup
 * @returns {string} section HTML
 */
export function previewSection(title, fieldsHtml) {
  return `
    <section class="case-section" aria-label="${title}">
      <h4 class="case-section__title">${title}</h4>
      <dl class="case-field-grid">${fieldsHtml}</dl>
    </section>`;
}

/** The read-only empty state shown when no case is selected. */
function emptyPreview() {
  return `
    <div class="case-preview case-preview--empty" data-region="case-preview" data-selected-case="">
      <div class="case-empty" role="status">
        <div class="case-empty__glyph" aria-hidden="true">▢</div>
        <h4 class="case-empty__title">No case selected</h4>
        <p class="case-empty__text">Select a case from the queue to preview its details.</p>
      </div>
    </div>`;
}

/**
 * Pure render of the Case Preview for a read-only snapshot. Reads ONLY
 * snapshot.currentInvestigation (the canonical Investigation Object built
 * by the Investigation Engine) and displays its embedded case descriptor.
 * When no active investigation exists it renders the empty state.
 * @param {Object|null} [snapshot=null] the current read-only state snapshot
 * @returns {string} the Case Preview region HTML
 */
export function CasePreviewScreen(snapshot = null) {
  const investigation = snapshot ? snapshot.currentInvestigation : null;
  // Gracefully handle the absence of an active investigation.
  if (investigation == null || investigation.case == null) return emptyPreview();

  // The Investigation Object is the canonical source; its embedded case
  // descriptor carries the displayed fields (Case Preview never reads
  // selectedCase and never constructs/mutates the Investigation Object).
  const c = investigation.case;

  const general = previewSection(
    "General Information",
    field("Case ID", c.id) +
      field("Merchant", c.merchant) +
      field("Failure Category", c.category) +
      field("Priority", c.priority) +
      field("Status", c.status)
  );

  const payment = previewSection(
    "Payment Information",
    field("Amount", c.amount) +
      field("Currency", c.currency) +
      field("Revenue at Risk", c.revenueAtRisk)
  );

  const failure = previewSection(
    "Failure Information",
    field("Failure Reason", c.failureReason) +
      field("Authorization Timestamp", c.authorizationTimestamp)
  );

  const processing = previewSection(
    "Processing Information",
    field("Gateway", c.gateway) +
      field("Network", c.network) +
      field("Issuer", c.issuer) +
      field("Acquirer", c.acquirer)
  );

  const operational = previewSection(
    "Operational Information",
    field("Assigned Queue", c.assignedQueue) +
      field("Region", c.region) +
      field("Created Timestamp", c.createdTimestamp) +
      field("Last Updated", c.lastUpdated)
  );

  return `
    <div class="case-preview" data-region="case-preview" data-selected-case="${c.id}">
      <header class="case-preview__header">
        <div>
          <p class="case-preview__eyebrow">Case Preview</p>
          <h3 class="case-preview__id" data-field="caseId">${c.id}</h3>
          <p class="case-preview__sub">${val(c.merchant)} &nbsp;·&nbsp; ${val(c.category)}</p>
        </div>
        <span class="case-preview__badge" aria-label="Selected case">Selected</span>
      </header>

      <div class="case-preview__body">
        ${general}
        ${payment}
        ${failure}
        ${processing}
        ${operational}
      </div>
    </div>`;
}
