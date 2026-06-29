/* One-off: blank out hardcoded investigation placeholders in bound elements.
   Every one of these is overwritten at runtime by bindInvestigation(); we set
   them to a neutral dash so no investigation-specific value is hardcoded. */
const fs = require("fs");
const f = "index.html";
let s = fs.readFileSync(f, "utf8");

const repl = [
  // ----- Ops Center · Investigation Summary -----
  ['id="invCaseSub">Case PR-48217<', 'id="invCaseSub">—<'],
  ['id="invMerchantLogo" style="background:#c2410c">NW</span>', 'id="invMerchantLogo" style="background:#475569">—</span>'],
  ['id="invMerchant">Northwind Apparel<', 'id="invMerchant">—<'],
  ['id="invGateway">Adyen — Live<', 'id="invGateway">—<'],
  ['id="invNetwork">Visa · Mastercard<', 'id="invNetwork">—<'],
  ['id="invAffected">2,147 declines<', 'id="invAffected">—<'],
  ['id="invRisk">$486,200<', 'id="invRisk">—<'],
  ['id="invPriority"><span class="badge b-red"><span class="dot"></span>Critical</span>', 'id="invPriority">—'],

  // ----- Ops Center subtitle -----
  ['id="opsSubtitle">Case PR-48217 · Northwind Apparel · 3xx soft-decline spike on Adyen<', 'id="opsSubtitle">—<'],

  // ----- Recommendation Console -----
  ['id="recCaseSub">Case PR-48217 · resolved by 5 agents<', 'id="recCaseSub">—<'],
  ['id="recConfidence">94%<', 'id="recConfidence">—<'],

  // ----- Executive Report header -----
  ['id="rpPageDesc">Case PR-48217 · Generated for executive review · Confidential<', 'id="rpPageDesc">—<'],
  ['id="rpTitle">Adyen Soft-Decline Spike — Northwind Apparel<', 'id="rpTitle">—<'],
  ['id="rpCaseId">PR-48217<', 'id="rpCaseId">—<'],
  ['id="rpMerchant">Northwind Apparel<', 'id="rpMerchant">—<'],
  ['id="rpGateway">Adyen (Live)<', 'id="rpGateway">—<'],
  ['id="rpPriority"><span class="badge b-red"><span class="dot"></span>Critical</span>', 'id="rpPriority">—'],
  ['id="rpGenerated">Jun 26, 2026<', 'id="rpGenerated">—<'],

  // ----- Executive Report · Section 1 summary spans -----
  ['id="rpMerchant2">Northwind Apparel<', 'id="rpMerchant2">—<'],
  ['id="rpDeclineCount">2,147<', 'id="rpDeclineCount">—<'],
  ['id="rpGateway2">Adyen<', 'id="rpGateway2">—<'],
  ['id="rpNetwork2">Visa and Mastercard<', 'id="rpNetwork2">—<'],
  ['id="rpClassMention">05 — Do Not Honor<', 'id="rpClassMention">—<'],
  ['id="rpRisk1">$486,200<', 'id="rpRisk1">—<'],

  // ----- Executive Report · Section 4 impact -----
  ['id="rpImpactRisk">$486,200<', 'id="rpImpactRisk">—<'],
  ['id="rpImpactRiskSub">2,147 declined auths<', 'id="rpImpactRiskSub">—<'],

  // ----- comment cleanup -----
  ['Executive Report all read from INV instead of hardcoded text.',
   'Executive Report all read from currentInvestigation instead of hardcoded text.']
];

let missing = [];
for (const [a, b] of repl) {
  if (s.indexOf(a) === -1) { missing.push(a); continue; }
  s = s.split(a).join(b);
}
fs.writeFileSync(f, s);
console.log(missing.length ? "UNMATCHED:\n" + missing.join("\n") : "all " + repl.length + " placeholders neutralized");
