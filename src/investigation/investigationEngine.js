/**
 * =====================================================================
 * PayResolve AI — src/investigation/investigationEngine.js
 * Phase 6.1 — Investigation Engine Foundation (ARC-01)
 * ---------------------------------------------------------------------
 * Module (TDD-01):        Investigation Engine
 * Blueprint area (§2/§3): src/investigation/
 *
 * Purpose (ARC-01 §1–§3, §11):
 *   The business-layer module that turns the currently selected payment
 *   case into the application's single active Investigation Object. It
 *   subscribes to the existing Application State Manager, and whenever a
 *   valid `selectedCase` becomes active it constructs a DETERMINISTIC
 *   Investigation Object and REQUESTS that the State Manager replace
 *   `currentInvestigation`. Exactly one active investigation ever exists.
 *
 * Architectural position (ARC-01 §2, §9 — one-directional flow):
 *   selectedCategory → selectedCase → Investigation Engine →
 *   currentInvestigation → (future) downstream consumers. No presentation
 *   module (Dashboard, Queue, Case Preview) calls this engine directly;
 *   activation happens once at the composition entry point, and the
 *   engine reacts to state changes through the existing subscription
 *   mechanism (ARC-01 §11). No event bus / DI / service locator /
 *   command pattern / extra orchestration is introduced.
 *
 * State ownership (ARC-01 §7):
 *   The Application State Manager remains the Single Source of Truth and
 *   the sole OWNER of `currentInvestigation`. This engine is the only
 *   module authorized to CONSTRUCT / REPLACE / DESTROY that object, and
 *   it does so exclusively via the manager's existing methods
 *   (replaceCurrentInvestigation / resetInvestigation). It owns no state
 *   and duplicates none.
 *
 * Lifecycle (ARC-01 §8) — reused from the approved architecture:
 *   - Create : a valid selectedCase with no matching investigation →
 *              replaceCurrentInvestigation(newObject).
 *   - Replace: selectedCase changes → the manager already destroys the
 *              prior investigation on setSelectedCase; the engine then
 *              builds the new one (replaceCurrentInvestigation also
 *              clears any prior scoped slots first — belt and braces).
 *   - Destroy: resetInvestigation() (existing destruction contract). No
 *              orphaned investigation survives; only one ever exists.
 *
 * Scope (Phase 6.1 — foundation only; ARC-01 §13):
 *   Minimal, deterministic Investigation Object. NO AI, LLM, evidence,
 *   timeline, agents, recommendations, root cause, report, workflow, or
 *   business reasoning — those are future phases.
 *
 * Referenced documentation:
 *   ARC-01 (Investigation Engine Architecture Contract); FS-01 §5.2
 *   (single source of truth), §7 (transitions), §8 (destruction),
 *   INV-1/INV-4 (one investigation); TDD-01 §4.6; Implementation
 *   Blueprint v1.1 §3.7.
 * =====================================================================
 */

import { applicationStateManager } from "../state/applicationStateManager.js";

/**
 * Construct the deterministic Investigation Object for a selected case.
 * Pure function of the case: the SAME case always yields the SAME object
 * (no random ids, no runtime timestamps, no generated values). Frozen so
 * downstream consumers cannot mutate it. Intentionally minimal (Phase
 * 6.1) — future phases extend the object without changing this contract.
 *
 * @param {Object} selectedCase the current selected case descriptor
 * @returns {Readonly<Object>} the canonical Investigation Object
 */
export function buildInvestigation(selectedCase) {
  return Object.freeze({
    id: `INV-${selectedCase.id}`, // deterministic identity derived from the case
    caseId: selectedCase.id, // link back to the source case
    category: selectedCase.category, // the case's failure category
    case: selectedCase, // the (already frozen) source case descriptor
    status: "Initialized", // minimal, fixed lifecycle marker (not AI/business state)
    timeline: buildInvestigationTimeline(selectedCase), // deterministic lifecycle events
    evidence: buildInvestigationEvidence(selectedCase), // deterministic supporting evidence
    agents: buildInvestigationAgents(selectedCase), // deterministic agent placeholders (workspace)
  });
}

/**
 * Construct the deterministic investigation-lifecycle timeline for a case
 * (Phase 6.3). This is the ONLY timeline data added to the Investigation
 * Object: a fixed, ordered sequence of lifecycle events whose details are
 * drawn EXCLUSIVELY from values that already exist on the deterministic
 * placeholder case (no fabricated events, no timestamps generated at
 * runtime, no AI/business reasoning). The SAME case always yields the SAME
 * events. Frozen so consumers cannot mutate it.
 *
 * Note: this is a field WITHIN the Investigation Object, distinct from the
 * top-level `timeline` state slot governed by the destruction contract
 * (that FS-04 slot is untouched here).
 *
 * @param {Object} selectedCase the current selected case descriptor
 * @returns {ReadonlyArray<Readonly<{title: string, detail: string}>>}
 */
function buildInvestigationTimeline(selectedCase) {
  return Object.freeze([
    Object.freeze({ title: "Investigation Created", detail: selectedCase.createdTimestamp }),
    Object.freeze({ title: "Case Assigned", detail: selectedCase.assignedQueue }),
    Object.freeze({ title: "Case Loaded", detail: selectedCase.id }),
    Object.freeze({ title: "Case Ready for Analysis", detail: selectedCase.lastUpdated }),
  ]);
}

/**
 * Construct the deterministic supporting evidence for a case (Phase 6.4).
 * This is the ONLY evidence data added to the Investigation Object: a
 * fixed, ordered set of label/value items whose values are drawn
 * EXCLUSIVELY from information already present on the deterministic
 * placeholder case (no fabricated evidence, no analysis, no scoring, no
 * ranking, no confidence/risk). The SAME case always yields the SAME
 * evidence. Frozen so consumers cannot mutate it.
 *
 * Note: this is a field WITHIN the Investigation Object, distinct from the
 * top-level `evidence` state slot governed by the destruction contract
 * (that FS-04 slot is untouched here).
 *
 * @param {Object} selectedCase the current selected case descriptor
 * @returns {ReadonlyArray<Readonly<{label: string, value: string}>>}
 */
function buildInvestigationEvidence(selectedCase) {
  return Object.freeze([
    Object.freeze({ label: "Payment Amount", value: selectedCase.amount }),
    Object.freeze({ label: "Currency", value: selectedCase.currency }),
    Object.freeze({ label: "Gateway", value: selectedCase.gateway }),
    Object.freeze({ label: "Network", value: selectedCase.network }),
    Object.freeze({ label: "Issuer", value: selectedCase.issuer }),
    Object.freeze({ label: "Acquirer", value: selectedCase.acquirer }),
    Object.freeze({ label: "Authorization Timestamp", value: selectedCase.authorizationTimestamp }),
    Object.freeze({ label: "Failure Reason", value: selectedCase.failureReason }),
    Object.freeze({ label: "Assigned Queue", value: selectedCase.assignedQueue }),
  ]);
}

/**
 * Construct the deterministic Multi-Agent Workspace agents for a case
 * (Phase 7.1; messages made investigation-specific in Phase 7.3). This is
 * the ONLY agent data on the Investigation Object: a fixed set of exactly
 * SIX agents, each with a fixed name, a fixed status ("Completed" for this
 * pre-execution phase), and a deterministic message ASSEMBLED from values
 * already present on the investigation/case (no analysis, no calculation,
 * no invented facts). `lastUpdated` reuses an existing deterministic
 * timestamp (no invented timestamps). The SAME case always yields the
 * SAME agents.
 *
 * This is placeholder UI data ONLY — there is NO AI, NO orchestration, NO
 * execution, NO findings, NO confidence/scores. Future phases will drive
 * status/output; here every value is a fixed, frozen placeholder.
 *
 * @param {Object} selectedCase the current selected case descriptor
 * @returns {ReadonlyArray<Readonly<{name,status,message,lastUpdated}>>}
 */
/**
 * Phase 10.1 (refined) — Deterministic Root-Cause reasoning.
 *
 * Applies fixed BUSINESS RULES to the investigation data to explain WHY the
 * transaction most likely failed. It examines signals (primarily the
 * failure reason, with gateway/issuer context) and produces a genuine
 * cause explanation — it does NOT merely restate the case's category. The
 * Supporting Evidence is assembled from this investigation's OWN data
 * (gateway, issuer, network, region, amount, currency, queue, timestamp),
 * so it varies naturally between investigations even within one category.
 * Returns a GENERIC `analysis` structure that any agent can reuse:
 *   { primary, confidence, evidence: string[], reasoning: string }
 *
 * Purely deterministic: a same case always yields the same analysis. There
 * is no model, service, network, randomness, or timestamp — only rule
 * evaluation over values already present on the investigation.
 *
 * @param {Object} c the selected case descriptor
 * @returns {Readonly<{primary:string,confidence:string,evidence:ReadonlyArray<string>,reasoning:string}>}
 */
/**
 * Phase 11.1 — data-driven reasoning core.
 *
 * Category selection is CANONICAL: the reasoning branch is chosen by the
 * investigation's category (`failureCategory`, falling back to `category`
 * for datasets that don't carry it) — NEVER inferred from failureReason
 * keywords. `failureReason` only refines the SCENARIO within the chosen
 * category. Adding categories or scenarios is a DATA change to the maps
 * below; the selection logic never needs to change. There is no
 * category-specific (e.g. Authentication-specific) branching in code.
 */

/** Canonical category for reasoning selection. */
function categoryOf(c) {
  return (c && (c.failureCategory || c.category)) || null;
}

/** Apply a scenario override (primary/reasoning only) onto a category base. */
function applyScenario(base, override) {
  if (!override) return base;
  return {
    primary: override.primary != null ? override.primary : base.primary,
    confidence: base.confidence,
    evidence: base.evidence,
    reasoning: override.reasoning != null ? override.reasoning : base.reasoning,
  };
}

/**
 * Root-Cause base reasoning per category (deterministic; each value is a
 * pure function of the case). Selecting/adding a category is a data edit.
 */
const ROOT_CAUSE_BY_CATEGORY = Object.freeze({
  "Authentication Failure (3DS)": (c) => ({
    primary:
      "3-D Secure authentication was not completed before issuer authorization.",
    confidence: "High",
    evidence: [
      `${c.gateway} accepted the authorization request over ${c.network}.`,
      `${c.issuer} did not receive a completed 3-D Secure authentication.`,
      `The ${c.region} authorization attempt failed at ${c.authorizationTimestamp}.`,
    ],
    reasoning:
      "Available evidence indicates the transaction failed during authentication rather than issuer authorization.",
  }),
  "Insufficient Funds": (c) => ({
    primary:
      "The issuer declined authorization due to insufficient available balance.",
    confidence: "High",
    evidence: [
      `Authorization reached ${c.issuer} via ${c.gateway} over ${c.network}.`,
      `${c.issuer} declined ${c.amount} ${c.currency} for insufficient funds.`,
      `The ${c.region} case was routed to ${c.assignedQueue}.`,
    ],
    reasoning:
      "The failure originated at the issuer's balance check rather than in processing or authentication.",
  }),
  "Expired Card": (c) => ({
    primary:
      "Authorization failed because the card was past its validity (expired).",
    confidence: "High",
    evidence: [
      `${c.gateway} forwarded the ${c.amount} ${c.currency} request to ${c.issuer}.`,
      `${c.issuer} reported the card past its validity; no authentication or funds error was present.`,
      `The ${c.region} case was queued to ${c.assignedQueue}.`,
    ],
    reasoning:
      "The decline is attributable to card expiry; a re-attempt requires updated card details.",
  }),
  "Do Not Honor": (c) => ({
    primary:
      "The issuer returned a generic decline (Do Not Honor) with no specific reason.",
    confidence: "Medium",
    evidence: [
      `Authentication completed successfully via ${c.gateway}.`,
      `${c.issuer} declined the ${c.amount} ${c.currency} authorization without a specific error.`,
      `The ${c.region} case (${c.network}) was routed to ${c.assignedQueue}.`,
    ],
    reasoning:
      "With no specific failure signal, the most likely cause is a generic issuer-side decline; confidence is moderate.",
  }),
  "Issuer Unavailable": (c) => ({
    primary:
      "Issuer-side unavailability prevented the authorization from completing.",
    confidence: "Medium",
    evidence: [
      `The request reached ${c.issuer} via ${c.gateway}.`,
      `${c.issuer} returned an availability error at ${c.authorizationTimestamp}.`,
      `The ${c.region} authorization for ${c.amount} ${c.currency} could not complete; ${c.assignedQueue} is investigating.`,
    ],
    reasoning:
      "A transient issuer availability issue is the most likely cause; a retry may succeed once the issuer recovers.",
  }),
});

/** Root-Cause fallback for an unknown/absent category. */
const ROOT_CAUSE_FALLBACK = (c) => ({
  primary:
    "Root cause could not be isolated from the available investigation data.",
  confidence: "Low",
  evidence: [
    `Investigation data for ${c.merchant} (${c.issuer}, ${c.region}) was insufficient to isolate a specific cause.`,
  ],
  reasoning:
    "The likely cause is inferred from category context only; confidence is low.",
});

/**
 * Operations base reasoning per category (next operational action).
 */
const OPERATIONS_BY_CATEGORY = Object.freeze({
  "Authentication Failure (3DS)": (c) => ({
    primary: "Verify 3-D Secure authentication and retry the authorization.",
    confidence: "High",
    evidence: [
      "The 3-D Secure authentication did not complete.",
      `Gateway ${c.gateway} accepted the merchant request.`,
      `${c.assignedQueue} currently owns the investigation.`,
    ],
    reasoning:
      "The failure occurred at authentication, so completing 3-D Secure and retrying is the appropriate next step.",
  }),
  "Insufficient Funds": (c) => ({
    primary:
      "Retry after sufficient balance is available, or request another payment method.",
    confidence: "High",
    evidence: [
      `${c.issuer} returned an insufficient-funds decline.`,
      `Revenue at risk is ${c.revenueAtRisk} ${c.currency}.`,
      `${c.assignedQueue} currently owns the investigation.`,
    ],
    reasoning:
      "The decline is balance-related, so a retry once funds are available — or an alternative method — is the correct next step.",
  }),
  "Expired Card": (c) => ({
    primary: "Request updated card details and retry the authorization.",
    confidence: "High",
    evidence: [
      "The card was reported past its validity (expired).",
      `Authorization reached ${c.issuer}.`,
      `${c.assignedQueue} currently owns the investigation.`,
    ],
    reasoning:
      "An expired card cannot be authorized, so updated card details are required before retrying.",
  }),
  "Do Not Honor": (c) => ({
    primary:
      "Contact the issuer for more information, or request another payment method.",
    confidence: "High",
    evidence: [
      `${c.issuer} returned a generic decline without a specific reason.`,
      "Authentication completed successfully.",
      `${c.assignedQueue} currently owns the investigation.`,
    ],
    reasoning:
      "The decline is generic with no specific error, so issuer clarification or an alternative method is the appropriate next step.",
  }),
  "Issuer Unavailable": (c) => ({
    primary: "Retry the authorization after the issuer service is available.",
    confidence: "High",
    evidence: [
      `${c.issuer} returned an availability error.`,
      `The request reached the issuer via ${c.gateway}.`,
      `${c.assignedQueue} currently owns the investigation.`,
    ],
    reasoning:
      "The failure appears to be a temporary issuer-side availability issue, so retrying once the issuer is available is appropriate.",
  }),
});

/** Operations fallback for an unknown/absent category. */
const OPERATIONS_FALLBACK = (c) => ({
  primary: "Review the case manually and assign the correct next action.",
  confidence: "Low",
  evidence: [
    "The available investigation data does not indicate a specific next action.",
    `${c.assignedQueue} currently owns the investigation.`,
  ],
  reasoning:
    "Without a specific failure signal, a manual review is the safest next operational step.",
});

/**
 * Scenario-specific refinement WITHIN a category, keyed by failureReason.
 * Only `primary` / `reasoning` are overridden; confidence and evidence come
 * from the category base. Adding scenarios (for ANY category / future
 * dataset) requires ONLY extending this map — no logic change.
 */
const SCENARIOS_BY_CATEGORY = Object.freeze({
  "Authentication Failure (3DS)": Object.freeze({
    "Customer abandoned 3DS challenge": {
      rootCause: {
        primary:
          "The cardholder abandoned the 3-D Secure challenge before completing authentication.",
        reasoning:
          "The challenge was presented but not completed by the cardholder, so authentication never finished.",
      },
      operations: {
        primary:
          "Prompt the customer to complete the 3-D Secure challenge and retry the authorization.",
        reasoning:
          "The challenge was abandoned rather than failed, so re-presenting it and retrying is the appropriate next step.",
      },
    },
    "Incorrect OTP entered": {
      rootCause: {
        primary:
          "Authentication failed because the cardholder entered an incorrect one-time password.",
        reasoning:
          "The OTP submitted during the challenge did not match, so the issuer could not authenticate the cardholder.",
      },
      operations: {
        primary:
          "Ask the customer to re-enter the correct one-time password and retry authentication.",
        reasoning:
          "The failure is an incorrect OTP entry, so a corrected retry is the appropriate next step.",
      },
    },
    "Issuer ACS timeout": {
      rootCause: {
        primary:
          "The issuer's Access Control Server (ACS) timed out during 3-D Secure authentication.",
        reasoning:
          "The ACS did not respond within the allowed window, so authentication could not complete.",
      },
      operations: {
        primary:
          "Retry the authorization; the issuer ACS timeout is typically transient.",
        reasoning:
          "An ACS timeout is usually temporary, so retrying authentication is the appropriate next step.",
      },
    },
    "Directory Server unavailable": {
      rootCause: {
        primary:
          "The 3-D Secure Directory Server was unavailable, preventing authentication routing.",
        reasoning:
          "Without the Directory Server, the authentication request could not be routed to the issuer's ACS.",
      },
      operations: {
        primary:
          "Retry the authorization once the 3-D Secure Directory Server is reachable.",
        reasoning:
          "A Directory Server outage is an infrastructure issue, so retrying once it is available is appropriate.",
      },
    },
    "Unsupported 3DS version": {
      rootCause: {
        primary:
          "Authentication failed because the requested 3-D Secure version is not supported.",
        reasoning:
          "The negotiated 3DS version was not supported across the parties, so the challenge could not proceed.",
      },
      operations: {
        primary:
          "Retry using a supported 3-D Secure version and review the merchant's 3DS configuration.",
        reasoning:
          "A version mismatch prevents authentication, so aligning on a supported version is the next step.",
      },
    },
    "Missing CAVV after challenge": {
      rootCause: {
        primary:
          "The challenge completed but the CAVV authentication value was missing from the result.",
        reasoning:
          "Without a CAVV, the authentication result could not be validated for authorization.",
      },
      operations: {
        primary:
          "Re-authenticate to obtain a valid CAVV before authorization.",
        reasoning:
          "A missing CAVV invalidates the authentication result, so re-authenticating is the appropriate next step.",
      },
    },
    "Fraud engine rejected authentication": {
      rootCause: {
        primary: "The fraud engine rejected the authentication attempt.",
        reasoning:
          "Authentication was blocked by fraud controls rather than by the issuer's authentication result.",
      },
      operations: {
        primary: "Refer the case for fraud review before any retry.",
        reasoning:
          "The rejection came from fraud controls, so a fraud review is the appropriate next step rather than an immediate retry.",
      },
    },
    "Device fingerprint mismatch": {
      rootCause: {
        primary:
          "Authentication failed due to a device fingerprint mismatch during 3-D Secure.",
        reasoning:
          "The device presented did not match the expected fingerprint, so the authentication was not trusted.",
      },
      operations: {
        primary: "Verify the customer's device and retry authentication.",
        reasoning:
          "A device mismatch requires device verification before retrying authentication.",
      },
    },
    "Maximum authentication attempts exceeded": {
      rootCause: {
        primary:
          "Authentication failed because the maximum number of attempts was exceeded.",
        reasoning:
          "Repeated attempts exhausted the allowed limit, so further authentication was blocked.",
      },
      operations: {
        primary:
          "Advise the customer to retry later, or to use another payment method.",
        reasoning:
          "The attempt limit was reached, so a later retry or an alternative method is the appropriate next step.",
      },
    },
    "Merchant authentication configuration error": {
      rootCause: {
        primary:
          "Authentication failed due to a merchant 3-D Secure configuration error.",
        reasoning:
          "A misconfiguration on the merchant side prevented authentication from being initiated correctly.",
      },
      operations: {
        primary:
          "Review and correct the merchant's 3-D Secure configuration, then retry.",
        reasoning:
          "The failure is a merchant configuration issue, so correcting the setup is the appropriate next step.",
      },
    },
  }),
  "Insufficient Funds": Object.freeze({
    "Checking account balance below purchase amount.": {
      rootCause: {
        primary:
          "The checking account balance was below the purchase amount at authorization.",
        reasoning:
          "The issuer's balance check found the checking account short of the amount, so authorization was declined.",
      },
      operations: {
        primary:
          "Advise the customer to fund the checking account and retry, or use another payment method.",
        reasoning:
          "The shortfall is on the checking account, so funding it or choosing another method is the appropriate next step.",
      },
    },
    "Savings account available balance insufficient.": {
      rootCause: {
        primary:
          "The savings account's available balance was insufficient for the authorization.",
        reasoning:
          "The available balance on the savings account did not cover the amount, so the issuer declined.",
      },
      operations: {
        primary:
          "Advise the customer to transfer funds into the savings account and retry, or use another method.",
        reasoning:
          "The savings balance is short, so topping it up or selecting another method is the appropriate next step.",
      },
    },
    "Daily card spending limit reached.": {
      rootCause: {
        primary:
          "The card's daily spending limit had already been reached.",
        reasoning:
          "Prior spend consumed the daily limit, so the issuer declined despite funds being present.",
      },
      operations: {
        primary:
          "Advise the customer to retry after the daily limit resets, or use another payment method.",
        reasoning:
          "The block is a daily-limit cap rather than a balance shortfall, so retrying after reset or another method applies.",
      },
    },
    "Recent purchases exhausted available balance.": {
      rootCause: {
        primary:
          "Recent purchases had exhausted the available balance before this authorization.",
        reasoning:
          "Earlier settled purchases reduced the available balance below the amount, so the issuer declined.",
      },
      operations: {
        primary:
          "Advise the customer to add funds or wait for balance to free up, then retry; otherwise use another method.",
        reasoning:
          "The available balance was consumed by recent spend, so funding or another method is the appropriate next step.",
      },
    },
    "Temporary authorization holds reduced available balance.": {
      rootCause: {
        primary:
          "Temporary authorization holds had reduced the available balance below the amount.",
        reasoning:
          "Open holds lowered the available (not ledger) balance, so the issuer declined this authorization.",
      },
      operations: {
        primary:
          "Advise the customer to retry once pending holds clear, or use another payment method.",
        reasoning:
          "The shortfall is caused by temporary holds, so retrying after they release is the appropriate next step.",
      },
    },
    "FX conversion increased required authorization amount.": {
      rootCause: {
        primary:
          "Foreign-currency conversion increased the required authorization amount beyond the available balance.",
        reasoning:
          "The converted amount (plus FX) exceeded the available balance, so the issuer declined.",
      },
      operations: {
        primary:
          "Inform the customer of the converted amount and retry, or use another payment method.",
        reasoning:
          "The shortfall stems from FX conversion raising the amount, so confirming the total or another method applies.",
      },
    },
    "Installment plan reduced available credit.": {
      rootCause: {
        primary:
          "An active installment plan had reduced the available credit below the amount.",
        reasoning:
          "Committed installment credit lowered the available line, so the authorization exceeded remaining credit.",
      },
      operations: {
        primary:
          "Advise the customer to free up credit or use another payment method, then retry.",
        reasoning:
          "The available credit is committed to installments, so freeing credit or another method is the next step.",
      },
    },
    "ATM withdrawals consumed available balance.": {
      rootCause: {
        primary:
          "Recent ATM withdrawals had consumed the available account balance.",
        reasoning:
          "Cash withdrawals drew down the balance below the amount, so the issuer declined this authorization.",
      },
      operations: {
        primary:
          "Advise the customer to add funds and retry, or use another payment method.",
        reasoning:
          "The balance was consumed by ATM withdrawals, so funding the account or another method is the next step.",
      },
    },
    "Joint account funds transferred before authorization.": {
      rootCause: {
        primary:
          "Funds on the joint account were transferred out before this authorization.",
        reasoning:
          "A transfer reduced the joint-account balance below the amount just before authorization, so it declined.",
      },
      operations: {
        primary:
          "Advise the account holders to confirm available funds and retry, or use another payment method.",
        reasoning:
          "The shortfall follows a joint-account transfer, so confirming funds or another method is the next step.",
      },
    },
    "Business account exceeded approved spending budget.": {
      rootCause: {
        primary:
          "The business account had exceeded its approved spending budget.",
        reasoning:
          "The transaction breached the account's approved budget control, so the issuer declined it.",
      },
      operations: {
        primary:
          "Advise the business to raise or reallocate the spending budget, then retry.",
        reasoning:
          "The decline is a budget-control limit, so adjusting the approved budget is the appropriate next step.",
      },
    },
  }),
  "Expired Card": Object.freeze({
    "Customer used recently expired card.": {
      rootCause: {
        primary:
          "The card had expired very recently and was used just past its validity date.",
        reasoning:
          "The card passed its expiry only recently, so the issuer declined an otherwise valid-looking transaction.",
      },
      operations: {
        primary:
          "Ask the customer for their reissued card details and retry the authorization.",
        reasoning:
          "The card expired only recently, so obtaining the renewed card and retrying is the appropriate next step.",
      },
    },
    "Long-expired card presented.": {
      rootCause: {
        primary:
          "A card that expired a long time ago was presented for authorization.",
        reasoning:
          "The card has been invalid for an extended period, so the issuer declined it as expired.",
      },
      operations: {
        primary:
          "Request the customer's current card and retry; the presented card is long expired.",
        reasoning:
          "The card has been expired for a long time, so a current card is required before retrying.",
      },
    },
    "Replacement card already active.": {
      rootCause: {
        primary:
          "An old physical card was used even though its replacement is already active.",
        reasoning:
          "A newer card has already replaced this one, so the issuer declined the superseded card.",
      },
      operations: {
        primary:
          "Ask the customer to use their active replacement card and retry.",
        reasoning:
          "A replacement card is already active, so switching to it and retrying is the appropriate next step.",
      },
    },
    "Virtual card validity ended.": {
      rootCause: {
        primary:
          "The virtual card's validity period had ended before authorization.",
        reasoning:
          "The virtual card reached the end of its validity window, so the issuer declined it as expired.",
      },
      operations: {
        primary:
          "Ask the customer to generate a new virtual card and retry the authorization.",
        reasoning:
          "The virtual card has expired, so issuing a fresh virtual card and retrying is the appropriate next step.",
      },
    },
    "Renewal not completed.": {
      rootCause: {
        primary:
          "A corporate card renewal was still pending, so the card remained expired.",
        reasoning:
          "The renewal had not been completed, so the card stayed past its validity and was declined.",
      },
      operations: {
        primary:
          "Ask the cardholder's program administrator to complete the corporate card renewal, then retry.",
        reasoning:
          "The renewal is incomplete, so completing it before retrying is the appropriate next step.",
      },
    },
    "Merchant retained expired credential.": {
      rootCause: {
        primary:
          "The merchant charged a stored card credential that had since expired.",
        reasoning:
          "The card-on-file was not refreshed after expiry, so the stored credential was declined.",
      },
      operations: {
        primary:
          "Prompt the customer to update the stored card on file, then retry the authorization.",
        reasoning:
          "The stored credential is expired, so refreshing the card on file is the appropriate next step.",
      },
    },
    "Recurring payment used expired credential.": {
      rootCause: {
        primary:
          "A recurring (subscription) payment was billed to an expired card credential.",
        reasoning:
          "The subscription's saved card expired before this billing, so the issuer declined the recurring charge.",
      },
      operations: {
        primary:
          "Request an updated card for the subscription and retry the recurring authorization.",
        reasoning:
          "The subscription credential is expired, so updating it before retrying is the appropriate next step.",
      },
    },
    "Token refresh missing.": {
      rootCause: {
        primary:
          "The network token was still mapped to a PAN that had since expired.",
        reasoning:
          "The token was not refreshed to the reissued PAN, so it resolved to an expired card and was declined.",
      },
      operations: {
        primary:
          "Refresh the network token to the current PAN and retry the authorization.",
        reasoning:
          "The token points to an expired PAN, so refreshing the token mapping is the appropriate next step.",
      },
    },
    "Digital wallet retained old card.": {
      rootCause: {
        primary:
          "The digital wallet retained an old card whose wallet token was not refreshed.",
        reasoning:
          "The wallet still held the expired card, so authorization used an out-of-date credential and was declined.",
      },
      operations: {
        primary:
          "Ask the customer to update the card in their digital wallet and retry.",
        reasoning:
          "The wallet holds an expired card, so refreshing it in the wallet is the appropriate next step.",
      },
    },
    "Customer typed old expiry date.": {
      rootCause: {
        primary:
          "The customer manually entered an old (incorrect) expiry date for the card.",
        reasoning:
          "The keyed expiry date did not match the valid card, so the issuer declined it as expired.",
      },
      operations: {
        primary:
          "Ask the customer to re-enter the correct expiry date and retry the authorization.",
        reasoning:
          "The failure is an incorrectly entered expiry date, so a corrected retry is the appropriate next step.",
      },
    },
  }),
  "Do Not Honor": Object.freeze({
    "Issuer real-time risk model blocked authorization.": {
      rootCause: {
        primary:
          "The issuer's real-time risk model blocked the authorization.",
        reasoning:
          "The decline came from the issuer's automated risk scoring rather than funds or authentication.",
      },
      operations: {
        primary:
          "Contact the issuer to understand the risk decline, or advise the customer to use another payment method.",
        reasoning:
          "The block is issuer risk-model driven, so issuer clarification or an alternative method is the appropriate next step.",
      },
    },
    "Issuer detected abnormal spending behaviour.": {
      rootCause: {
        primary:
          "The issuer declined after detecting abnormal spending behaviour on the account.",
        reasoning:
          "The transaction diverged from the cardholder's usual pattern, so the issuer flagged and declined it.",
      },
      operations: {
        primary:
          "Advise the customer to confirm the purchase with their issuer, then retry.",
        reasoning:
          "The decline is a spending-pattern flag, so cardholder confirmation with the issuer is the appropriate next step.",
      },
    },
    "Authorization held for issuer fraud review.": {
      rootCause: {
        primary:
          "The authorization was held for a temporary issuer fraud review.",
        reasoning:
          "The issuer placed the transaction under manual fraud review rather than approving or hard-declining it.",
      },
      operations: {
        primary:
          "Advise the customer to contact their issuer to clear the fraud review, then retry.",
        reasoning:
          "The transaction is under issuer fraud review, so clearing it with the issuer is the appropriate next step.",
      },
    },
    "Issuer policy blocked international purchase.": {
      rootCause: {
        primary:
          "The issuer's policy blocked this cross-border (international) purchase.",
        reasoning:
          "The issuer's geographic policy declined the international transaction independent of funds or authentication.",
      },
      operations: {
        primary:
          "Advise the customer to enable international use with their issuer, or use another payment method, then retry.",
        reasoning:
          "The decline is an international-use policy, so enabling cross-border use or another method is the appropriate next step.",
      },
    },
    "Merchant category blocked by issuer.": {
      rootCause: {
        primary:
          "The issuer blocked the transaction because the merchant category is restricted.",
        reasoning:
          "The merchant's category is disallowed under the issuer's controls, so the authorization was declined.",
      },
      operations: {
        primary:
          "Advise the customer to use a card that permits this merchant category, or contact their issuer.",
        reasoning:
          "The decline is a merchant-category restriction, so an eligible card or issuer change is the appropriate next step.",
      },
    },
    "Issuer requires cardholder verification.": {
      rootCause: {
        primary:
          "The issuer requires additional cardholder verification for this high-value purchase.",
        reasoning:
          "The amount triggered an issuer verification requirement that was not satisfied, so authorization was declined.",
      },
      operations: {
        primary:
          "Ask the customer to complete cardholder verification with their issuer, then retry.",
        reasoning:
          "The issuer requires verification for the amount, so completing it before retrying is the appropriate next step.",
      },
    },
    "Too many authorizations in short period.": {
      rootCause: {
        primary:
          "The issuer declined after too many authorizations in a short period (velocity limit).",
        reasoning:
          "Authorization frequency exceeded the issuer's velocity threshold, so this attempt was declined.",
      },
      operations: {
        primary:
          "Advise the customer to wait before retrying, or to use another payment method.",
        reasoning:
          "The decline is a velocity limit, so spacing out the retry or using another method is the appropriate next step.",
      },
    },
    "Wallet authorization declined by issuer.": {
      rootCause: {
        primary:
          "The issuer declined the digital wallet authorization.",
        reasoning:
          "The wallet-initiated transaction was declined by the issuer rather than the wallet or gateway.",
      },
      operations: {
        primary:
          "Advise the customer to verify the card in their wallet with the issuer, or use another payment method.",
        reasoning:
          "The decline came from the issuer on a wallet transaction, so issuer verification or another method is the next step.",
      },
    },
    "Customer temporarily blocked transactions.": {
      rootCause: {
        primary:
          "The cardholder had temporarily blocked transactions on the card.",
        reasoning:
          "A customer-enabled temporary block was active, so the issuer declined the authorization.",
      },
      operations: {
        primary:
          "Ask the customer to remove the temporary card block with their issuer, then retry.",
        reasoning:
          "A customer-enabled block is active, so lifting it before retrying is the appropriate next step.",
      },
    },
    "Issuer internal policy rejected authorization.": {
      rootCause: {
        primary:
          "An internal issuer policy rejected the authorization.",
        reasoning:
          "The decline resulted from an issuer-internal policy control with no specific cardholder-facing error.",
      },
      operations: {
        primary:
          "Contact the issuer to clarify the policy decline, or advise the customer to use another payment method.",
        reasoning:
          "The decline is an issuer-internal policy, so issuer clarification or an alternative method is the appropriate next step.",
      },
    },
  }),
  "Issuer Unavailable": Object.freeze({
    "Issuer host unavailable.": {
      rootCause: {
        primary:
          "The issuer's authorization host was offline and could not process the request.",
        reasoning:
          "The authorization host was unreachable, so the transaction could not be authorized by the issuer.",
      },
      operations: {
        primary:
          "Retry the authorization once the issuer's authorization host is back online.",
        reasoning:
          "The host outage is an issuer-side availability issue, so retrying once it recovers is the appropriate next step.",
      },
    },
    "Issuer maintenance.": {
      rootCause: {
        primary:
          "The issuer was in a scheduled maintenance window and unavailable for authorization.",
        reasoning:
          "Planned maintenance took the issuer offline, so the authorization could not complete.",
      },
      operations: {
        primary:
          "Retry the authorization after the issuer's scheduled maintenance window ends.",
        reasoning:
          "The outage is planned maintenance, so retrying after the window closes is the appropriate next step.",
      },
    },
    "Network connectivity lost.": {
      rootCause: {
        primary:
          "Network connectivity to the issuer was lost during authorization.",
        reasoning:
          "The connection to the issuer dropped, so the authorization request could not reach the issuer.",
      },
      operations: {
        primary:
          "Retry the authorization once issuer network connectivity is restored.",
        reasoning:
          "The failure is a connectivity loss, so retrying once the link is restored is the appropriate next step.",
      },
    },
    "Core banking unavailable.": {
      rootCause: {
        primary:
          "The issuer's core banking system was unavailable during a service outage.",
        reasoning:
          "With core banking down, the issuer could not evaluate or authorize the transaction.",
      },
      operations: {
        primary:
          "Retry the authorization after the issuer's core banking service is restored.",
        reasoning:
          "A core banking outage is an issuer-side availability issue, so retrying once it recovers is the appropriate next step.",
      },
    },
    "Issuer timed out.": {
      rootCause: {
        primary:
          "The authorization request timed out waiting for the issuer to respond.",
        reasoning:
          "The issuer did not respond within the allowed window, so the authorization could not complete.",
      },
      operations: {
        primary:
          "Retry the authorization; the issuer timeout is typically transient.",
        reasoning:
          "An authorization timeout is usually temporary, so retrying is the appropriate next step.",
      },
    },
    "Issuer API unreachable.": {
      rootCause: {
        primary:
          "The issuer's authorization API was unreachable during the request.",
        reasoning:
          "The issuer API endpoint could not be reached, so the transaction could not be authorized.",
      },
      operations: {
        primary:
          "Retry the authorization once the issuer's authorization API is reachable.",
        reasoning:
          "An unreachable issuer API is an availability issue, so retrying once it recovers is the appropriate next step.",
      },
    },
    "Gateway DNS resolution failed.": {
      rootCause: {
        primary:
          "DNS resolution between the gateway and the issuer failed, blocking the request.",
        reasoning:
          "The gateway could not resolve the issuer endpoint, so the authorization request never reached the issuer.",
      },
      operations: {
        primary:
          "Retry the authorization once gateway-to-issuer DNS resolution is restored.",
        reasoning:
          "The failure is a DNS resolution issue, so retrying once routing is restored is the appropriate next step.",
      },
    },
    "Issuer failover active.": {
      rootCause: {
        primary:
          "The issuer was mid disaster-recovery failover and could not authorize the request.",
        reasoning:
          "An active failover left the issuer temporarily unable to process authorizations.",
      },
      operations: {
        primary:
          "Retry the authorization after the issuer's disaster-recovery failover completes.",
        reasoning:
          "The outage is a failover in progress, so retrying once it completes is the appropriate next step.",
      },
    },
    "Regional infrastructure outage.": {
      rootCause: {
        primary:
          "A regional issuer infrastructure outage prevented the authorization from completing.",
        reasoning:
          "The issuer's infrastructure in this region was down, so the transaction could not be authorized.",
      },
      operations: {
        primary:
          "Retry the authorization once the issuer's regional infrastructure is restored.",
        reasoning:
          "A regional outage is an issuer-side availability issue, so retrying once it recovers is the appropriate next step.",
      },
    },
    "Authorization service overloaded.": {
      rootCause: {
        primary:
          "The issuer's authorization service was overloaded and could not handle the request.",
        reasoning:
          "The service was saturated with load, so this authorization could not be processed.",
      },
      operations: {
        primary:
          "Retry the authorization once the issuer's authorization service load subsides.",
        reasoning:
          "An overloaded service is a transient availability issue, so retrying once load eases is the appropriate next step.",
      },
    },
  }),
});

/**
 * Deterministic Root-Cause reasoning: category-selected base, refined by the
 * scenario (failureReason) when one is defined. Same case → same analysis.
 * @param {Object} c the selected case descriptor
 * @returns {Readonly<{primary:string,confidence:string,evidence:ReadonlyArray<string>,reasoning:string}>}
 */
function buildRootCauseReasoning(c) {
  const category = categoryOf(c);
  const base = (ROOT_CAUSE_BY_CATEGORY[category] || ROOT_CAUSE_FALLBACK)(c);
  const scenario =
    (SCENARIOS_BY_CATEGORY[category] &&
      SCENARIOS_BY_CATEGORY[category][c.failureReason] &&
      SCENARIOS_BY_CATEGORY[category][c.failureReason].rootCause) ||
    null;
  const r = applyScenario(base, scenario);
  return Object.freeze({
    primary: r.primary,
    confidence: r.confidence,
    evidence: Object.freeze(r.evidence),
    reasoning: r.reasoning,
  });
}

/**
 * Phase 10.2 — Deterministic Business-Impact reasoning.
 *
 * Explains the BUSINESS impact of the investigation (what business is
 * impacted, how severe, why it matters operationally) by interpreting
 * existing investigation data — it does not merely repeat the raw fields
 * shown in Case Preview / Evidence / Executive Report. Returns the same
 * GENERIC `analysis` structure used by the Root Cause Agent:
 *   { primary, confidence, evidence: string[], reasoning: string }
 *
 * Confidence reflects the CERTAINTY of the assessment, not severity: it is
 * "High" because the assessment is derived entirely from deterministic
 * investigation data. The business SEVERITY (derived from priority) is
 * expressed in the Primary and Reasoning text instead.
 *
 * Purely deterministic: same case → same analysis. No model, service,
 * network, randomness, or timestamp — only interpretation of existing data.
 *
 * @param {Object} c the selected case descriptor
 * @returns {Readonly<{primary:string,confidence:string,evidence:ReadonlyArray<string>,reasoning:string}>}
 */
function buildBusinessImpactReasoning(c) {
  // Business severity is derived deterministically from the case priority
  // and expressed in the text (not encoded in the confidence pill).
  const SEVERITY_BY_PRIORITY = {
    Critical: "high",
    High: "moderate",
    Normal: "low",
  };
  const severity = SEVERITY_BY_PRIORITY[c.priority] || "moderate";

  return Object.freeze({
    primary: `Business impact is ${severity}: merchant ${c.merchant}'s authorization in ${c.region} remains unresolved.`,
    // Certainty of the assessment (deterministic data), not severity.
    confidence: "High",
    evidence: Object.freeze([
      `Revenue at risk is ${c.revenueAtRisk} ${c.currency}.`,
      `${c.priority} priority; assigned to ${c.assignedQueue}.`,
      `Merchant ${c.merchant} authorization in ${c.region} is not yet resolved.`,
    ]),
    reasoning: `With ${c.priority.toLowerCase()} priority, delayed authorization may affect ${c.merchant}'s payment completion and customer experience; ${c.assignedQueue} should prioritize resolution to limit exposure.`,
  });
}

/**
 * Phase 10.3 — Deterministic Operations reasoning.
 *
 * Recommends the next OPERATIONAL action for a Payment Operations analyst
 * (what to do next, and why), derived from the investigation's failure
 * signal and existing data. Returns the same GENERIC `analysis` structure
 * used by the other reasoning agents:
 *   { primary, confidence, evidence: string[], reasoning: string }
 *
 * Scope: recommendations use ONLY the current investigation data. The
 * dataset has no retry history, repeated-failure counts, or monitoring
 * telemetry, so guidance never infers escalation, persistence, or
 * monitoring — only actions justified by the present investigation.
 *
 * Purely deterministic: same case → same guidance. No model, service,
 * network, randomness, or timestamp — only rule evaluation over existing
 * data.
 *
 * @param {Object} c the selected case descriptor
 * @returns {Readonly<{primary:string,confidence:string,evidence:ReadonlyArray<string>,reasoning:string}>}
 */
/**
 * Deterministic Operations reasoning: category-selected base, refined by the
 * scenario (failureReason) when one is defined. Same case → same guidance.
 * @param {Object} c the selected case descriptor
 * @returns {Readonly<{primary:string,confidence:string,evidence:ReadonlyArray<string>,reasoning:string}>}
 */
function buildOperationsReasoning(c) {
  const category = categoryOf(c);
  const base = (OPERATIONS_BY_CATEGORY[category] || OPERATIONS_FALLBACK)(c);
  const scenario =
    (SCENARIOS_BY_CATEGORY[category] &&
      SCENARIOS_BY_CATEGORY[category][c.failureReason] &&
      SCENARIOS_BY_CATEGORY[category][c.failureReason].operations) ||
    null;
  const r = applyScenario(base, scenario);
  return Object.freeze({
    primary: r.primary,
    confidence: r.confidence,
    evidence: Object.freeze(r.evidence),
    reasoning: r.reasoning,
  });
}

function buildInvestigationAgents(selectedCase) {
  const c = selectedCase;

  // Phase 10.1 (refined) — four agents: manage → diagnose → assess → operate.
  // Each message is ASSEMBLED (string concatenation only) from values that
  // already exist on the investigation/case — no invented facts. Every
  // message includes at least one per-case value so outputs change with the
  // selected case/category. Deterministic: same case → same messages.
  const AGENTS = [
    [
      "Investigation Manager",
      `Investigation initialized · Case ${c.id} assigned · Investigation ready`,
    ],
    [
      "Root Cause Agent",
      `Failure reason: ${c.failureReason} · Auth ${c.authorizationTimestamp}`,
    ],
    [
      "Business Impact Agent",
      `Revenue at risk: ${c.revenueAtRisk} ${c.currency} · Amount: ${c.amount} ${c.currency} · Case ${c.id}`,
    ],
    [
      // Operations Agent (Phase 10.3): the message surfaces the operational
      // context; a generic deterministic `analysis` (below) recommends the
      // next operational action for a Payment Operations analyst.
      "Operations Agent",
      `Queue: ${c.assignedQueue} · Status: ${c.status} · Priority: ${c.priority} · Case ${c.id}`,
    ],
  ];

  // Agents that reason carry a generic, deterministic `analysis` structure
  // (rendered by the generic AgentCard). This name→analysis map keeps the
  // attachment clean and extensible (e.g. the Operations Agent later). Other
  // agents omit `analysis` and therefore render exactly as before.
  const analyses = {
    "Root Cause Agent": buildRootCauseReasoning(c),
    "Business Impact Agent": buildBusinessImpactReasoning(c),
    "Operations Agent": buildOperationsReasoning(c),
  };
  return Object.freeze(
    AGENTS.map(([name, message]) =>
      Object.freeze({
        name,
        status: "Completed", // fixed placeholder status (no execution in this phase)
        message, // deterministic message assembled from existing investigation values
        lastUpdated: c.lastUpdated, // reuse an existing deterministic timestamp
        ...(analyses[name] ? { analysis: analyses[name] } : {}),
      })
    )
  );
}

/**
 * Reconcile `currentInvestigation` with the current snapshot. This is the
 * engine's single reaction to state changes:
 *   - no selectedCase → nothing to do (the manager already destroys the
 *     investigation whenever the case is cleared, so none is orphaned);
 *   - selectedCase present but no matching investigation → build it and
 *     request a replace (Create / Replace);
 *   - investigation already matches the selected case → no-op (idempotent,
 *     so the resulting refresh cannot loop).
 *
 * @param {Object} snapshot the current read-only state snapshot
 * @returns {boolean} true if an investigation replace was REQUESTED
 */
export function reconcileInvestigation(snapshot) {
  const selectedCase = snapshot ? snapshot.selectedCase : null;
  if (selectedCase == null) return false;

  const current = snapshot.currentInvestigation;
  if (current && current.caseId === selectedCase.id) return false; // up to date

  applicationStateManager.replaceCurrentInvestigation(
    buildInvestigation(selectedCase)
  ); // request only — the State Manager owns the mutation + refresh
  return true;
}

/**
 * Destroy the active investigation via the existing destruction contract.
 * Provided so the engine (the authorized owner of investigation
 * construction) can clear the object when application workflow requires
 * it (ARC-01 §8). Not auto-invoked in Phase 6.1.
 */
export function destroyCurrentInvestigation() {
  applicationStateManager.resetInvestigation();
}

/** @type {(() => void)|null} the active subscription's unsubscribe handle */
let unsubscribe = null;

/**
 * Activate the Investigation Engine: subscribe it to the existing state
 * management mechanism and reconcile the current snapshot once (so an
 * already-selected case immediately gets its investigation at startup).
 * Idempotent — activating an already-active engine does nothing.
 *
 * @returns {() => void} a deactivation function
 */
export function activateInvestigationEngine() {
  if (unsubscribe != null) return deactivateInvestigationEngine; // already active
  unsubscribe = applicationStateManager.subscribe(reconcileInvestigation);
  // Reconcile the current state so a case selected before activation
  // (e.g. the default startup case) gets an investigation immediately.
  reconcileInvestigation(applicationStateManager.getState());
  return deactivateInvestigationEngine;
}

/** Deactivate the engine (unsubscribe). Idempotent. */
export function deactivateInvestigationEngine() {
  if (unsubscribe == null) return;
  unsubscribe();
  unsubscribe = null;
}
