/**
 * =====================================================================
 * PayResolve AI — src/dashboard/paymentHealthPanel.js
 * Phase 4.2 — Category Card Container (state-driven selection)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Dashboard Module
 * Blueprint area (§2/§3): src/dashboard/
 *
 * Purpose:
 *   Renders the Category Card Container — one Failure Category Card per
 *   the five MVP categories (FS-02 §5; PRD §13) — by composing
 *   CategoryHealthTile, passing each tile whether it is the currently
 *   selected category. Stateless, pure presentation.
 *
 * Selected state is DERIVED, never cached:
 *   `selectedCategory` is passed in from the current state snapshot on
 *   every render; exactly the matching card is marked selected.
 *
 * Referenced documentation:
 *   FS-01 §3.3 (PaymentHealthPanel -> CategoryHealthTile); FS-02 §2.4,
 *   §5 (exactly five Failure Category Cards); PRD §13/§14; Implementation
 *   Blueprint v1.1 §3.4.
 *
 * NOTE: No business logic, no metrics, no hardcoded investigation data.
 * =====================================================================
 */

import { CategoryHealthTile } from "./categoryHealthTile.js";

/**
 * The five MVP payment-decline categories, in canonical PRD §13 / FS-02
 * §5 order. Domain identities (labels), not case data; extensible later
 * without redesign (PRD §14).
 */
export const FAILURE_CATEGORIES = Object.freeze([
  "Authentication Failure (3DS)",
  "Insufficient Funds",
  "Expired Card",
  "Do Not Honor",
  "Issuer Unavailable",
]);

/**
 * Build the Category Card Container markup (five cards), marking the
 * selected one from the current snapshot.
 * @param {string|null} [selectedCategory=null] the currently selected category
 * @returns {string} static HTML for the category section
 */
export function PaymentHealthPanel(selectedCategory = null) {
  const cards = FAILURE_CATEGORIES.map((name) =>
    CategoryHealthTile(name, name === selectedCategory)
  ).join("");
  return `
    <section class="dashboard__section category-container" aria-label="Failure categories">
      <div class="dashboard__section-head">
        <h3 class="dashboard__section-title">Failure Categories</h3>
        <span class="dashboard__section-tag">Select a category</span>
      </div>
      <div class="category-grid" role="group" aria-label="Failure category selection">${cards}</div>
    </section>`;
}
