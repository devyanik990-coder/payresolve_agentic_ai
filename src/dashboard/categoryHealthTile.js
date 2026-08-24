/**
 * =====================================================================
 * PayResolve AI — src/dashboard/categoryHealthTile.js
 * Phase 4.2 — Failure Category Card (interactive, state-driven active state)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Dashboard Module
 * Blueprint area (§2/§3): src/dashboard/
 *
 * Purpose:
 *   Renders ONE Failure Category Card (FS-02 §2.4/§5). Stateless, pure
 *   presentation: given a category name and whether it is the selected
 *   one, it returns the card markup — including the interactive hooks
 *   (data-category, role/tabindex) and the accessible/visual selected
 *   state. Selection handling and the state request live in the Dashboard
 *   controller (dashboardScreen.js); this tile owns no state and reads
 *   nothing directly.
 *
 * Selected state is DERIVED, never cached:
 *   `isSelected` is passed in by the caller from the current state
 *   snapshot (selectedCategory) on every render, so the visual/aria state
 *   always matches ApplicationStateManager.selectedCategory (Part 6).
 *
 * Referenced documentation:
 *   FS-01 §3.3 (CategoryHealthTile); FS-02 §2.4, §5, DR-03 (selecting a
 *   category sets selectedCategory); PRD §13 (the five categories);
 *   Implementation Blueprint v1.1 §3.4.
 *
 * NOTE: No business logic, no state ownership, no hardcoded investigation
 * data. The category name is a domain label (PRD §13), not case data.
 * =====================================================================
 */

const PLACEHOLDER_METRIC = "--";

/**
 * Build the markup for one failure-category card.
 * @param {string} categoryName the category's display label (domain, PRD §13)
 * @param {boolean} [isSelected=false] whether this category is the selected one
 * @returns {string} static HTML for the card (interactive hooks only; no handlers here)
 */
export function CategoryHealthTile(categoryName, isSelected = false) {
  const activeClass = isSelected ? " category-card--active" : "";
  const indicator = isSelected
    ? `<span class="category-card__selected">Selected</span>`
    : "";
  return `
    <article class="category-card${activeClass}"
             data-category="${categoryName}"
             role="button"
             tabindex="0"
             aria-pressed="${isSelected}">
      <span class="category-card__icon" aria-hidden="true"></span>
      <h4 class="category-card__title">${categoryName}</h4>
      <p class="category-card__metric">${PLACEHOLDER_METRIC}</p>
      ${indicator}
    </article>`;
}
