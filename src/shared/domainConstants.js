/**
 * =====================================================================
 * PayResolve AI — src/shared/domainConstants.js
 * Phase 4 refinement — domain constants (category identities + default)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Shared (cross-cutting)
 * Blueprint area (§2/§3): src/shared/
 *
 * Purpose:
 *   The single home for architectural DOMAIN constants — category
 *   identities and the default startup category. These are domain labels
 *   (PRD §13), NOT case/investigation data. Owning them here keeps a
 *   single source for the category identities that the state layer needs
 *   at startup, without the state layer depending on any presentation
 *   module.
 *
 * Referenced documentation:
 *   PRD §13 (the five MVP categories, canonical order; extensible per
 *   PRD §14); FS-06 §4; Implementation Blueprint v1.1 §3.14.
 *
 * NOTE: No logic, no state, no case/investigation data. Constants only.
 * =====================================================================
 */

/**
 * The five MVP payment-decline categories in canonical PRD §13 order.
 * Domain identities (labels), not case data; extensible later (PRD §14).
 */
export const FAILURE_CATEGORIES = Object.freeze([
  "Authentication Failure (3DS)",
  "Insufficient Funds",
  "Expired Card",
  "Do Not Honor",
  "Issuer Unavailable",
]);

/**
 * The deterministic default selected category applied at application
 * startup by the Application State Manager — the first MVP category in
 * canonical order (PRD §13). The Dashboard never sets this; it only
 * renders whatever selectedCategory the State Manager holds.
 */
export const DEFAULT_SELECTED_CATEGORY = FAILURE_CATEGORIES[0]; // "Authentication Failure (3DS)"
