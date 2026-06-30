/* ============================================================
   agentReasoning.js  —  AGENT REASONING LAYER for PayResolve AI.
   build(inv) DERIVES, per agent, reasoning specific to THIS
   investigation: feature tiers, structural branches by decline type,
   secondary decline-code evidence, and explicit cross-agent references.
   ============================================================ */
(function () {
  function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
  function pick(arr, seed){ return arr[hash(String(seed)) % arr.length]; }
  const money = n => "$" + Math.round(n).toLocaleString("en-US");
  const M = '<span class="mention">';
  const CR = {
    "Insufficient Funds": ctx => ({
      kind: "soft",
      planFocus: "These are funding-side soft declines — the money isn't lost, it's a timing problem. Before we schedule anything I want Classification to rule out a gateway misconfig hiding behind code " + ctx.dom.code + ".",
      delegateClass: M + "@classification</span> confirm code " + ctx.dom.code + " is genuinely funding-driven, not a gateway fault.",
      classWhy: "Code " + ctx.dom.code + " carries " + ctx.dom.share + "% of the failures" + ctx.secClause + ". That's the issuer saying 'no funds at auth' — a soft decline, not a config or fraud event.",
      classRaised: "Retry-history correlation lines up with cardholder funding cycles. This is " + ctx.cls + " — confidence " + ctx.conf + "%.",
      rootLines: [
        "Classification's read holds up. Auth rate fell " + ctx.I.baselineAuthRate + "% → " + ctx.I.degradedAuthRate + "% only on the " + ctx.dom.code + " cohort — " + ctx.gateway + " and the rest of the stack are healthy.",
        "Root cause: cardholder accounts lacked available balance at authorization. Nothing merchant- or gateway-side to fix."
      ],
      recoveryLines: [
        "Given a funding root cause, retrying now just re-hits an empty balance and inflates our decline rate with the issuer.",
        "Best play: " + ctx.I.recommendation + " — wait out the ~48h funding cycle, back it with Account Updater, suppress sub-hour retries."
      ],
      revenueOpportunity: "Most of this is genuinely recoverable — these customers want to pay. I'd treat ~" + ctx.I.recoveryProbability + "% as a realistic, not optimistic, number.",
      execNext: "Enable the 48h smart-retry cohort with Account Updater and watch issuer decline rate; " + money(ctx.I.unrecoverable) + " stays at risk for cards that never re-fund."
    }),
    "Do Not Honor": ctx => ({
      kind: "soft",
      planFocus: "Do-Not-Honor is the ambiguous one — it can be issuer risk rules, card velocity, or our own descriptor. I don't want blind retries until Root Cause rules out a merchant-side trigger.",
      delegateClass: M + "@classification</span> is " + ctx.dom.code + " a true issuer refusal, or are we tripping a velocity / descriptor flag?",
      classWhy: "Code " + ctx.dom.code + " dominates at " + ctx.dom.share + "%" + ctx.secClause + ", clustered on a single descriptor and BIN range. Reads as a generic issuer refusal, not a clean decline reason.",
      classRaised: "No correlated fraud signal and the cohort is BIN-concentrated — that's " + ctx.cls + ", confidence " + ctx.conf + "%.",
      rootLines: [
        "Building on that: the refusals concentrate on one merchant descriptor and BIN cohort, with auth rate " + ctx.I.baselineAuthRate + "% → " + ctx.I.degradedAuthRate + "%. That points at issuer risk rules, not our checkout.",
        "Root cause: issuer-side Do-Not-Honor on a flagged descriptor/BIN — recoverable, but only if we change how we present the auth."
      ],
      recoveryLines: [
        "A blind retry on " + ctx.dom.code + " risks tripping issuer velocity limits and getting the BIN throttled — that would make it worse.",
        "Trade-off favours " + ctx.I.recommendation + ": network-token re-auth + updated descriptor + a BIN escalation, throttled to stay under velocity flags."
      ],
      revenueOpportunity: "Recovery is real but conditional on the issuer accepting the re-auth, so I'd read ~" + ctx.I.recoveryProbability + "% as a ceiling, not a floor.",
      execNext: "Re-auth with network tokens, fix the descriptor, open the BIN escalation; hold " + money(ctx.I.unrecoverable) + " as the issuer may still refuse a share."
    }),
    "Expired Card": ctx => ({
      kind: "hard",
      planFocus: "This is a HARD decline — we cannot retry our way out of it. The question for Recovery isn't timing, it's credential coverage and churn risk.",
      delegateClass: M + "@classification</span> confirm these are expired stored credentials and not a one-off auth glitch.",
      classWhy: "Code " + ctx.dom.code + " holds " + ctx.dom.share + "%" + ctx.secClause + ", concentrated in stored-card / subscription traffic. Expired credentials that aged out of the vault — a hard decline.",
      classRaised: "Pattern matches the billing run, not random failures. This is " + ctx.cls + " — confidence " + ctx.conf + "%.",
      rootLines: [
        "Classification is right that these are stored-credential failures. Auth rate " + ctx.I.baselineAuthRate + "% → " + ctx.I.degradedAuthRate + "% as expiries aged out without a refresh before the billing cycle.",
        "Root cause: the vault wasn't refreshed ahead of the run — so the same credential will fail on every attempt."
      ],
      recoveryLines: [
        "Important trade-off: retrying the same expired credential fails 100% of the time, so retry timing is irrelevant here.",
        ctx.I.recommendation + " is the only path — Account Updater refresh, re-bill the updated cards, and a customer update flow for the rest before they churn."
      ],
      revenueOpportunity: "This is our lowest-recovery class (~" + ctx.I.recoveryProbability + "%) — whatever Account Updater can't refresh is at genuine involuntary-churn risk, not just delayed.",
      execNext: "Run Account Updater, re-bill refreshed credentials, push a customer update flow; " + money(ctx.I.unrecoverable) + " is at churn risk if credentials can't be refreshed in time."
    }),
    "Issuer Unavailable": ctx => ({
      kind: "transient",
      planFocus: "This looks transient — issuer or switch timeouts inside a bounded window, not declines on the merits. The real decision is wait-it-out vs. fail over, so I want Revenue to size exposure quickly.",
      delegateClass: M + "@classification</span> confirm " + ctx.dom.code + " is timeouts in an outage window, not genuine refusals.",
      classWhy: "Code " + ctx.dom.code + " spikes to " + ctx.dom.share + "%" + ctx.secClause + " inside a tight time band, then normalises — the signature of an issuer/network outage, not a credential or funds problem.",
      classRaised: "Timeouts are isolated to the outage window and recover after it. That's " + ctx.cls + " — confidence " + ctx.conf + "%.",
      rootLines: [
        "Agreed — and it's external. Auth rate dipped " + ctx.I.baselineAuthRate + "% → " + ctx.I.degradedAuthRate + "% only during the window on " + ctx.netLabel + ", with nothing wrong on our side or the merchant's.",
        "Root cause: the issuer / network switch was temporarily unavailable. A recoverable, self-healing failure."
      ],
      recoveryLines: [
        "Trade-off: a short retry queue costs almost nothing if the issuer is already recovering; failover routing protects auth rate but adds cost, so it's only worth it if the window runs long.",
        "Recommended: " + ctx.I.recommendation + " — auto-retry once the endpoint recovers, with issuer failover armed as a backstop."
      ],
      revenueOpportunity: "This is the most recoverable class we see (~" + ctx.I.recoveryProbability + "%) — the revenue isn't lost, it's just delayed by the outage.",
      execNext: "Queue the 30-minute retry with failover routing and auto-resume; exposure is largely temporary, with only " + money(ctx.I.unrecoverable) + " unlikely to clear."
    }),
    "Authentication Failed": ctx => ({
      kind: "auth",
      planFocus: "If this is 3DS, it's almost certainly something WE changed, not the issuer. Before Recovery touches anything I want Root Cause on recent challenge-routing deploys.",
      delegateClass: M + "@classification</span> is this challenge abandonment from over-broad 3DS, or genuine auth fraud?",
      classWhy: "The failed cohort is dominated by 3DS authentication failures (" + ctx.dom.share + "%)" + ctx.secClause + " on low-risk traffic — the fingerprint of an over-broad step-up rule, not fraud.",
      classRaised: "Abandonment rose right where step-up was applied to low-risk auths. That's " + ctx.cls + " — confidence " + ctx.conf + "%.",
      rootLines: [
        "Confirming Classification: a routing change pushed 3DS onto the full CNP segment instead of the high-risk cohort. Auth rate fell " + ctx.I.baselineAuthRate + "% → " + ctx.I.degradedAuthRate + "% as challenge abandonment climbed.",
        "Root cause: a checkout deployment over-scoped the 3DS challenge rule — self-inflicted, and reversible."
      ],
      recoveryLines: [
        "Trade-off: rolling the rule back recovers auth rate immediately but reopens the segment we were trying to protect.",
        ctx.I.recommendation + " — revert to the risk-scored policy behind a 5% canary, with an auth-rate circuit breaker so a bad rule can't bleed us again."
      ],
      revenueOpportunity: "Most of this is self-inflicted abandonment, so recovery is high (~" + ctx.I.recoveryProbability + "%) once the rule is re-scoped — these were good customers we challenged away.",
      execNext: "Revert to risk-scored 3DS behind a canary and add an auth-rate breaker; recovery is fast, with " + money(ctx.I.unrecoverable) + " unlikely to return after abandonment."
    }),
    "Unclassified": ctx => ({
      kind: "review",
      planFocus: "Code " + ctx.dom.code + " has no mapping, so I'm not delegating remediation yet — this needs human triage before any automated action.",
      delegateClass: M + "@classification</span> attempt a best-effort read on the unmapped code " + ctx.dom.code + ".",
      classWhy: "Code " + ctx.dom.code + " (" + ctx.dom.share + "%)" + ctx.secClause + " isn't in the classification map — I can't responsibly auto-classify it.",
      classRaised: "Confidence stays capped at " + ctx.conf + "% — flagging for manual review rather than forcing a label.",
      rootLines: [ "Without a mapping I can only say auth rate moved " + ctx.I.baselineAuthRate + "% → " + ctx.I.degradedAuthRate + "% on this cohort.", "Root cause is undetermined — this should not be auto-remediated." ],
      recoveryLines: [ "Trade-off: automated retries on an unknown decline reason could do harm, so I'm holding them.", "Recommended: " + ctx.I.recommendation + " — route to an analyst for manual classification first." ],
      revenueOpportunity: "Recovery is uncertain (~" + ctx.I.recoveryProbability + "%) until the code is classified.",
      execNext: "Assign to a payments analyst, classify manually, hold automated retries until the reason is known."
    })
  };
  function build(I){
    const dom = I.breakdown && I.breakdown[0] ? I.breakdown[0] : { share: I.confidence, code: I.dominantCode, classification: I.classification };
    const sec = I.breakdown && I.breakdown[1] ? I.breakdown[1] : null;
    const secClause = sec ? ", with a " + sec.share + "% tail of code " + sec.code + " (" + sec.classification + ")" : "";
    const netLabel = I.networksLabel || (I.networks || []).join(" · ");
    const sev = I.revenueAtRisk > 400000 ? "severe" : I.revenueAtRisk > 150000 ? "high" : I.revenueAtRisk > 50000 ? "elevated" : "moderate";
    const decisive = I.confidence >= 90 ? "decisive" : I.confidence >= 80 ? "strong" : I.confidence >= 65 ? "moderate" : "tentative";
    const ctx = { I, dom, sec, secClause, netLabel, cls: I.classification, conf: I.confidence, gateway: I.gateway, sev, decisive };
    const c = (CR[I.classification] || CR["Unclassified"])(ctx);
    const pri = sev === "severe" ? "P1" : sev === "high" ? "P2" : sev === "elevated" ? "P3" : "P4";
    const shape = c.kind === "hard" ? "structural" : c.kind === "transient" ? "transient" : c.kind === "auth" ? "self-inflicted" : c.kind === "review" ? "needs triage" : "recoverable";
    const priority = pri + " · " + shape + " · " + money(I.revenueAtRisk) + " exposed";
    const seed = (I.caseId || "") + I.dominantCode + I.failedCount;
    const managerAfterClass = pick([ "Good — " + I.confidence + "% clears our bar. " + M + "@rootcause</span>, build on that.", "Confirmed at " + I.confidence + "%. " + M + "@rootcause</span> take Classification's finding and dig in.", "That's " + decisive + " at " + I.confidence + "%. " + M + "@rootcause</span> you're up." ], seed + "A");
    const managerLowConf = pick([ "That's under our 90% bar. Pull retry history before we commit.", "Too thin at " + I.firstPassConfidence + "%. Correlate the cohort and come back.", "Not enough to act on yet — get me corroborating evidence." ], seed + "B");
    const managerAfterRoot = "So root cause is " + I.rootCauseLabel + ". " + M + "@recovery</span> — given that, what's the right play, and what does it cost us?";
    const managerAfterRecovery = M + "@revenue</span> size " + I.recommendation + " across the " + I.failedCount.toLocaleString("en-US") + "-decline cohort.";
    const managerApprove = pick([ "Approved — " + I.recommendation + " at ~" + I.recoveryProbability + "% recovery. Writing the summary.", "That holds together. Approving " + I.recommendation + " and closing the loop.", I.recommendation + " it is — consensus across the team, no human escalation needed." ], seed + "C");
    const execSummary = "Executive summary — " + I.merchant + ": " + I.failedCount.toLocaleString("en-US") + " " + I.classification + " declines on " + I.gateway + " (" + netLabel + "), " + money(I.revenueAtRisk) + " exposed [" + priority + "]. Root cause " + I.rootCauseLabel + ", confirmed at " + I.confidence + "%.";
    return {
      priority, priorityShort: pri + " · " + shape,
      planFocus: c.planFocus, delegateClass: c.delegateClass, classWhy: c.classWhy, classRaised: c.classRaised,
      managerLowConf, managerAfterClass, rootLines: c.rootLines, managerAfterRoot,
      recoveryLines: c.recoveryLines, managerAfterRecovery,
      revenueLine: "Recovery's " + I.recommendation + " applied to " + I.failedCount.toLocaleString("en-US") + " declines worth " + money(I.revenueAtRisk) + ": at ~" + I.recoveryProbability + "% that's " + money(I.expectedRecovery) + " back, leaving " + money(I.unrecoverable) + " at risk.",
      revenueOpportunity: c.revenueOpportunity, managerApprove, execSummary, execNext: "Next steps — " + c.execNext
    };
  }
  if (typeof window !== "undefined") window.AgentReasoning = { build };
  if (typeof module !== "undefined" && module.exports) module.exports = { build };
})();
