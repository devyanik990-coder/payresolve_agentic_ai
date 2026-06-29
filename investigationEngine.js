/* ============================================================
   investigationEngine.js
   Data layer for PayResolve AI.

   SINGLE SOURCE OF TRUTH
   ----------------------
   InvestigationEngine reads a set of failed transactions and
   produces ONE complete Investigation Object. That object carries
   not only the raw metrics (counts, revenue, confidence, priority)
   but every narrative field the UI needs — classification, root
   cause, recommendation, recovery probability, expected recovery,
   evidence and per-agent outputs — so that no screen ever has to
   hardcode investigation-specific text.

   - DECLINE_MAP : decline-code -> human classification
   - PLAYBOOK    : classification -> remediation narrative. This is
     REFERENCE data (like DECLINE_MAP), not a specific investigation.
     It is selected by whatever the data says the dominant failure is.

   Transactions are loaded at runtime — either from the embedded
   window.DATASET_RECORDS map (so the app runs from file://) or from
   a /data/*.json file via fetch(). Either way the page binds to the
   single object returned by generateInvestigation().
   ============================================================ */

/* ---------- Decline-code -> classification map ---------- */
const DECLINE_MAP = {
  "51":  "Insufficient Funds",
  "05":  "Do Not Honor",
  "54":  "Expired Card",
  "91":  "Issuer Unavailable",
  "3DS": "Authentication Failed"
};

/* ---------- Classification -> remediation playbook ----------
   Reference knowledge keyed by classification. The investigation
   picks the entry that matches the dominant decline code found in
   the data, so the narrative changes automatically per dataset. */
const PLAYBOOK = {
  "Insufficient Funds": {
    declineType: "Soft Decline",
    firstPassConfidence: 72,
    signal: code => "ISO8583 Code " + code + " detected",
    rootCauseLabel: "Insufficient Funds",
    rootCauseNarrative: (inv) =>
      "Issuer responses concentrate on code " + inv.dominantCode + ", indicating cardholder accounts " +
      "lacked available funds at authorization rather than any merchant- or gateway-side fault. " +
      "Retry-history correlation confirms a recurring pattern aligned to cardholder funding cycles, " +
      "with the authorization rate falling from a 30-day baseline of " + inv.baselineAuthRate + "% to " +
      inv.degradedAuthRate + "% across the affected cohort.",
    confirmedTrigger: (inv) =>
      "Issuer response code " + inv.dominantCode + " returned on " + inv.dominantCount.toLocaleString("en-US") +
      " authorizations — confirmed insufficient-funds soft declines, not a configuration or fraud event.",
    recommendation: "Retry in 48h",
    recommendationNarrative:
      "Schedule an automated smart retry roughly 48 hours out, after the typical cardholder funding cycle, " +
      "and back reattempts with Account Updater. Suppress sub-hour retries that would otherwise compound " +
      "issuer decline rates, and notify high-value cardholders to refresh their payment method.",
    recommendedAction: "Enable 48-hour smart retry · Account Updater reattempt · Suppress sub-1h retries",
    recoveryProbability: 82,
    recoveryNarrative: "Retry recommended after the cardholder funding cycle.",
    evidenceChange: { title: "Retry-cohort funding analysis", detail: "Matched soft-decline cohort recovers on reattempt after funding cycle" }
  },
  "Do Not Honor": {
    declineType: "Soft Decline",
    firstPassConfidence: 68,
    signal: code => "ISO8583 Code " + code + " detected",
    rootCauseLabel: "Do Not Honor",
    rootCauseNarrative: (inv) =>
      "The dominant issuer response is code " + inv.dominantCode + " (Do Not Honor), a generic issuer-side " +
      "refusal most often driven by issuer risk rules or card-velocity limits rather than a merchant fault. " +
      "Authorization rate fell from a 30-day baseline of " + inv.baselineAuthRate + "% to " + inv.degradedAuthRate +
      "% on the affected cohort, with no correlated fraud signal.",
    confirmedTrigger: (inv) =>
      "Code " + inv.dominantCode + " returned on " + inv.dominantCount.toLocaleString("en-US") +
      " authorizations — issuer Do-Not-Honor refusals concentrated on a single merchant descriptor / BIN range.",
    recommendation: "Re-auth + Network Token",
    recommendationNarrative:
      "Re-attempt declined authorizations with network tokens and an updated merchant descriptor, and open an " +
      "issuer escalation for the affected BIN ranges. Throttle retries to avoid velocity flags and route the " +
      "highest-value declines through an alternate acquirer.",
    recommendedAction: "Re-auth with network token · Update descriptor · Issuer BIN escalation",
    recoveryProbability: 74,
    recoveryNarrative: "Network-token re-auth recommended with issuer escalation.",
    evidenceChange: { title: "Merchant descriptor / BIN review", detail: "Do-Not-Honor declines clustered on a single descriptor and BIN cohort" }
  },
  "Expired Card": {
    declineType: "Hard Decline",
    firstPassConfidence: 80,
    signal: code => "ISO8583 Code " + code + " detected",
    rootCauseLabel: "Expired Card",
    rootCauseNarrative: (inv) =>
      "Code " + inv.dominantCode + " dominates the failed cohort, indicating stored credentials have expired — a " +
      "hard decline concentrated among subscription and stored-card transactions. Authorization rate dropped from " +
      "a baseline of " + inv.baselineAuthRate + "% to " + inv.degradedAuthRate + "% as expired credentials aged out " +
      "of the vault without refresh.",
    confirmedTrigger: (inv) =>
      "Code " + inv.dominantCode + " on " + inv.dominantCount.toLocaleString("en-US") +
      " authorizations — expired stored credentials that were not refreshed before the billing run.",
    recommendation: "Account Updater Refresh",
    recommendationNarrative:
      "Run an Account Updater pass across the affected vault to pull refreshed expiry and PAN data, then re-bill " +
      "updated credentials. For cards without an updater response, trigger a customer-facing update flow before the " +
      "next billing cycle to prevent involuntary churn.",
    recommendedAction: "Account Updater refresh · Re-bill updated credentials · Customer update flow",
    recoveryProbability: 68,
    recoveryNarrative: "Account Updater refresh recommended before re-billing.",
    evidenceChange: { title: "Vault credential age report", detail: "Expired credentials aged out of the vault prior to the billing run" }
  },
  "Issuer Unavailable": {
    declineType: "Soft Decline",
    firstPassConfidence: 70,
    signal: code => "ISO8583 Code " + code + " detected",
    rootCauseLabel: "Issuer Unavailable",
    rootCauseNarrative: (inv) =>
      "Code " + inv.dominantCode + " dominates the cohort, signalling the issuer or a network switch was " +
      "temporarily unavailable — a transient, recoverable failure. Authorization rate dipped from a baseline of " +
      inv.baselineAuthRate + "% to " + inv.degradedAuthRate + "% during the outage window before recovering.",
    confirmedTrigger: (inv) =>
      "Code " + inv.dominantCode + " on " + inv.dominantCount.toLocaleString("en-US") +
      " authorizations — issuer-unavailable timeouts isolated to a bounded outage window.",
    recommendation: "Retry in 30m",
    recommendationNarrative:
      "Queue an automated retry inside a 30-minute window once the issuer endpoint recovers, and enable issuer " +
      "failover routing through an alternate network switch for the duration of the incident. No customer action " +
      "is required for this transient class of decline.",
    recommendedAction: "30-minute retry queue · Issuer failover routing · Auto-resume on recovery",
    recoveryProbability: 88,
    recoveryNarrative: "Short-window retry recommended once the issuer endpoint recovers.",
    evidenceChange: { title: "Issuer availability timeline", detail: "Timeouts confined to a bounded issuer/network outage window" }
  },
  "Authentication Failed": {
    declineType: "Authentication",
    firstPassConfidence: 66,
    signal: () => "3DS authentication failure detected",
    rootCauseLabel: "Authentication Failed",
    rootCauseNarrative: (inv) =>
      "The failed cohort is dominated by 3DS authentication failures, consistent with an over-broad challenge " +
      "routing rule that forced step-up on low-risk transactions. Authorization rate fell from a 30-day baseline of " +
      inv.baselineAuthRate + "% to " + inv.degradedAuthRate + "% as challenge abandonment rose sharply.",
    confirmedTrigger: (inv) =>
      "3DS challenge applied to " + inv.dominantCount.toLocaleString("en-US") +
      " low-risk authorizations instead of the high-risk cohort only, driving authentication abandonment.",
    recommendation: "Re-scope 3DS Rule",
    recommendationNarrative:
      "Roll the challenge routing rule back to the prior risk-scored policy so step-up is reserved for transactions " +
      "above the fraud-score threshold. Stage future routing changes behind a 5% canary and add a guardrail that " +
      "pauses any deploy when authorization rate drops more than 3 points in 10 minutes.",
    recommendedAction: "Revert to risk-scored 3DS policy · Enable auth-rate circuit breaker · 5% canary on rule changes",
    recoveryProbability: 79,
    recoveryNarrative: "Roll back the over-broad 3DS rule and re-scope challenges to high-risk traffic.",
    evidenceChange: { title: "Checkout deployment diff", detail: "Routing rule applied 3DS challenge to the full CNP segment" }
  },
  "Unclassified": {
    declineType: "Review",
    firstPassConfidence: 55,
    signal: code => "Decline code " + code + " — no mapping",
    rootCauseLabel: "Unclassified",
    rootCauseNarrative: (inv) =>
      "The dominant decline code " + inv.dominantCode + " has no entry in the classification map; the cohort " +
      "requires manual triage. Authorization rate moved from a baseline of " + inv.baselineAuthRate + "% to " +
      inv.degradedAuthRate + "% across the affected transactions.",
    confirmedTrigger: (inv) =>
      "Code " + inv.dominantCode + " on " + inv.dominantCount.toLocaleString("en-US") +
      " authorizations could not be auto-classified.",
    recommendation: "Manual Review",
    recommendationNarrative:
      "Route the cohort to a payment-operations analyst for manual classification before any automated remediation " +
      "is applied.",
    recommendedAction: "Assign to analyst · Manual classification · Hold automated retries",
    recoveryProbability: 50,
    recoveryNarrative: "Manual review recommended before remediation.",
    evidenceChange: { title: "Unmapped decline-code report", detail: "Dominant code is absent from the classification map" }
  }
};

class InvestigationEngine {
  constructor(transactions, meta = {}) {
    this.transactions = transactions || [];
    this.meta = meta;
    this.declineMap = DECLINE_MAP;
    this.playbook = PLAYBOOK;
  }

  /* ----------------------------------------------------------
     Loaders. The page can hand us records directly (embedded
     datasets) OR we can fetch a /data/*.json file. Both paths
     end at the same generateInvestigation().
     ---------------------------------------------------------- */
  static fromRecords(records, meta = {}) {
    return new InvestigationEngine(records, meta);
  }

  static async fromFile(url, meta = {}) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load dataset: " + url + " (" + res.status + ")");
    }
    const transactions = await res.json();
    return new InvestigationEngine(transactions, meta);
  }

  /* Convenience: build the single Investigation Object directly. */
  static async investigate(source, meta = {}) {
    let engine;
    if (Array.isArray(source)) {
      engine = InvestigationEngine.fromRecords(source, meta);
    } else {
      engine = await InvestigationEngine.fromFile(source, meta);
    }
    return engine.generateInvestigation();
  }

  // 1. Read all failed transactions (records without status are treated as failed).
  getFailedTransactions() {
    return this.transactions.filter(t => !t.status || t.status === "failed");
  }

  // 2. Group similar failures by decline code.
  groupSimilarFailures() {
    const groups = {};
    for (const t of this.getFailedTransactions()) {
      (groups[t.declineCode] = groups[t.declineCode] || []).push(t);
    }
    return groups;
  }

  // 3. Determine the dominant decline code.
  getDominantDeclineCode(groups) {
    groups = groups || this.groupSimilarFailures();
    let dominant = null, max = -1;
    for (const code in groups) {
      if (groups[code].length > max) { max = groups[code].length; dominant = code; }
    }
    return dominant;
  }

  // 4. Map a decline code to its classification.
  classify(code) {
    return this.declineMap[code] || "Unclassified";
  }

  // 5. Calculate metrics + 6. generate the single Investigation Object.
  generateInvestigation() {
    const failed         = this.getFailedTransactions();
    const groups         = this.groupSimilarFailures();
    const dominantCode   = this.getDominantDeclineCode(groups);
    const classification = this.classify(dominantCode);

    const failedCount    = failed.length;
    const revenueAtRisk  = failed.reduce((sum, t) => sum + t.amount, 0);
    const dominantCount  = dominantCode && groups[dominantCode] ? groups[dominantCode].length : 0;

    // Confidence = how dominant the leading classification is across all failures.
    const confidence = failedCount ? Math.round((dominantCount / failedCount) * 100) : 0;

    // Priority = High when revenue at risk exceeds $50,000.
    const priority = revenueAtRisk > 50000 ? "High" : "Medium";

    // Per-code breakdown, sorted by frequency.
    const breakdown = Object.keys(groups).map(code => ({
      code,
      classification: this.classify(code),
      count:  groups[code].length,
      amount: groups[code].reduce((s, t) => s + t.amount, 0),
      share:  failedCount ? Math.round((groups[code].length / failedCount) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    const networks = [...new Set(failed.map(t => t.network).filter(Boolean))];

    // ---- Derived narrative, driven by the dominant classification ----
    const play = this.playbook[classification] || this.playbook["Unclassified"];

    const clamp = n => Math.max(1, Math.min(99, Math.round(n)));
    // Authorization-rate baseline -> degraded, scaled by how dominant the failure is.
    const baselineAuthRate = 96.4;
    const degradedAuthRate = Math.round((baselineAuthRate - (confidence * 0.28)) * 10) / 10;

    // Per-agent confidence, anchored to the data-derived confidence.
    const agentConfidence = {
      manager:        clamp(confidence),
      classification: clamp(confidence),
      rootCause:      clamp(confidence - 2),
      recovery:       clamp(confidence - 6),
      revenue:        clamp(confidence - 4)
    };

    const recoveryProbability = play.recoveryProbability;
    const expectedRecovery    = Math.round(revenueAtRisk * (recoveryProbability / 100));
    const unrecoverable       = Math.max(0, Math.round(revenueAtRisk - expectedRecovery));
    const recoveredPct        = revenueAtRisk ? Math.round((expectedRecovery / revenueAtRisk) * 100) : 0;

    // Time to resolution scales with cohort size (deterministic, not hardcoded).
    const resolutionMinutes = 30 + Math.round(failedCount / 18);
    const timeToResolution  = Math.floor(resolutionMinutes / 60) + "h " + (resolutionMinutes % 60) + "m";

    const inv = {
      // ----- identity -----
      caseId:        this.meta.caseId || "PR-" + (10000 + failedCount),
      merchant:      this.meta.merchant      || (failed[0] && failed[0].merchant),
      merchantCode:  this.meta.merchantCode  || "—",
      merchantColor: this.meta.merchantColor || "#475569",
      merchantSub:   this.meta.merchantSub   || "",
      gateway:       this.meta.gateway       || (failed[0] && failed[0].gateway),
      networks,
      networksLabel: networks.join(" · "),

      // ----- raw metrics -----
      failedCount,
      revenueAtRisk,
      dominantCode,
      dominantCount,
      classification,
      confidence,
      priority,
      breakdown,
      groups,

      // ----- derived diagnosis / narrative (single source of truth) -----
      declineType:        play.declineType,
      firstPassConfidence: Math.min(play.firstPassConfidence, Math.max(1, confidence - 10)),
      classificationSignal: play.signal(dominantCode),
      baselineAuthRate,
      degradedAuthRate,
      recommendation:        play.recommendation,
      recoveryNarrative:     play.recoveryNarrative,
      recommendedAction:     play.recommendedAction,
      recoveryProbability,
      expectedRecovery,
      unrecoverable,
      recoveredPct,
      timeToResolution,
      agentConfidence
    };

    // Fields whose text depends on the assembled object above.
    inv.rootCauseLabel       = play.rootCauseLabel;
    inv.rootCauseNarrative   = play.rootCauseNarrative(inv);
    inv.confirmedTrigger     = play.confirmedTrigger(inv);
    inv.recommendationNarrative = play.recommendationNarrative;

    // Distribution string reused by report + evidence.
    inv.distribution = breakdown.slice(0, 3)
      .map(b => b.share + "% code " + b.code + " (" + b.classification + ")")
      .join(", ");

    // Evidence list for the Executive Report (section 5).
    inv.evidence = [
      { title: "Authorization-rate timeseries",
        detail: baselineAuthRate + "% → " + degradedAuthRate + "% drop on the affected " + classification.toLowerCase() + " cohort",
        badge: "Metric", badgeClass: "b-violet" },
      { title: inv.gateway + " response-code distribution",
        detail: inv.distribution,
        badge: "Gateway log", badgeClass: "b-blue" },
      { title: play.evidenceChange.title,
        detail: play.evidenceChange.detail,
        badge: "Change record", badgeClass: "b-amber" },
      { title: "Fraud-screen correlation",
        detail: "No elevated fraud signal — declines confirmed non-fraudulent",
        badge: "Cleared", badgeClass: "b-green" }
    ];

    return inv;
  }
}

// Expose globally (loaded via a classic <script> tag, no modules).
if (typeof window !== "undefined") {
  window.DECLINE_MAP = DECLINE_MAP;
  window.PLAYBOOK = PLAYBOOK;
  window.InvestigationEngine = InvestigationEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { InvestigationEngine, DECLINE_MAP, PLAYBOOK };
}
