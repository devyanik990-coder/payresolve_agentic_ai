/* Headless verification without jsdom: a tiny DOM stub that is just enough
   to execute datasets.js + investigationEngine.js + the page's inline script,
   then assert that every screen's bound values change per dataset. */
const fs = require("fs"), vm = require("vm");

function makeEl(id){
  const el = {
    _id:id, textContent:"", _html:"",
    style:new Proxy({},{set(){return true;}}),
    dataset:{}, value:"",
    classList:{ _s:new Set(), add(...a){a.forEach(x=>this._s.add(x));}, remove(...a){a.forEach(x=>this._s.delete(x));},
                toggle(x){this._s.has(x)?this._s.delete(x):this._s.add(x);}, contains(x){return this._s.has(x);} },
    appendChild(){}, addEventListener(){},
    querySelector(){ return makeEl("q"); }, querySelectorAll(){ return []; },
    scrollIntoView(){}, get parentElement(){ return parentStub; }
  };
  Object.defineProperty(el,"innerHTML",{get(){return this._html;},set(v){this._html=String(v);}});
  return el;
}
const parentStub = { scrollTop:0, scrollHeight:0 };
const reg = new Map();
function gid(id){ if(!reg.has(id)) reg.set(id, makeEl(id)); return reg.get(id); }

const listStub = []; listStub.forEach = Array.prototype.forEach;
const document = {
  getElementById: gid,
  querySelector: sel => makeEl(sel),
  querySelectorAll: () => [],
  createElement: () => makeEl("new"),
  body: makeEl("body")
};
// datasetSelect needs a default value
gid("datasetSelect").value = "insufficient-funds";

const sandbox = {
  window:{}, document, console,
  performance:{ now:()=>Date.now() },
  setTimeout:(fn)=>{ try{fn();}catch(e){} return 0; },
  clearTimeout(){}, requestAnimationFrame:(fn)=>{ fn(performance.now()); return 0; },
  Math, Date, JSON, Array, Object, String, Number, Set, parseInt, parseFloat, isNaN,
  fetch: async()=>{ throw new Error("no fetch in stub"); }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// Load the three scripts into the same context.
vm.runInContext(fs.readFileSync("datasets.js","utf8"), sandbox);
vm.runInContext(fs.readFileSync("investigationEngine.js","utf8"), sandbox);
const html = fs.readFileSync("index.html","utf8");
const inline = html.split('<script src="investigationEngine.js"></script>')[1].split("<script>")[1].split("</script>")[0];
vm.runInContext(inline, sandbox);

function snapshot(){
  const g = id => gid(id).textContent;
  return {
    dashLeadRow_hasMerchant: gid("casesBody").innerHTML.match(/merchant-name">([^<]+)</)[1],
    invMerchant: g("invMerchant"), invGateway: g("invGateway"), invNetwork: g("invNetwork"),
    invAffected: g("invAffected"), invRisk: g("invRisk"), invPriorityHTML: gid("invPriority").innerHTML,
    opsSubtitle: g("opsSubtitle"),
    recConfidence: g("recConfidence"), recCaseSub: g("recCaseSub"),
    rpTitle: g("rpTitle"), rpCaseId: g("rpCaseId"), rpClassMention: g("rpClassMention"),
    rpRisk1: g("rpRisk1"), rpRootCause: g("rpRootCause").slice(0,60)+"...",
    rpRecommendation: g("rpRecommendation").slice(0,50)+"...", rpRecommendedAction: g("rpRecommendedAction"),
    rpRecovered: g("rpRecovered"), rpTTR: g("rpTTR"), rpUnrecoverable: g("rpUnrecoverable"),
    evidenceCount: (gid("rpEvidence").innerHTML.match(/ev-item/g)||[]).length,
    evidence3: (gid("rpEvidence").innerHTML.match(/ev-t">([^<]+)</g)||[]).join(" | "),
    agd_failure_out: g("agd-failure-out"), agd_root_out: g("agd-root-out"),
    agd_recovery_out: g("agd-recovery-out"), agd_revenue_out: g("agd-revenue-out"),
    agd_manager_conf: g("agd-manager-conf"),
    win_currentInvestigation: !!sandbox.currentInvestigation
  };
}

(async ()=>{
  for (const key of ["insufficient-funds","do-not-honor","authentication-failure","issuer-unavailable","expired-card"]) {
    await sandbox.loadDataset(key);
    console.log("\n================  " + key + "  ================");
    console.log(JSON.stringify(snapshot(), null, 1));
  }
})();
