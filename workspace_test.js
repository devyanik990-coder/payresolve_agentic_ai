/* Behavioral harness for the Multi-Agent Workspace lifecycle.
   Faithful-enough DOM stub that records appended children so we can assert:
   - every dataset regenerates conversation / decision log / metrics
   - switching datasets RESETS (no stale, no duplicate accumulation)
   - rapid switching cancels in-flight runs (only the last survives)
   - if not on Ops, the run is deferred until the workspace is opened
   Timers are collapsed to ~0ms while preserving ordering, so the ~8s
   scripted animation completes in milliseconds. */
const fs = require("fs"), vm = require("vm");

function ClassList(){ const s=new Set(); return {
  add:(...a)=>a.forEach(x=>s.add(x)), remove:(...a)=>a.forEach(x=>s.delete(x)),
  toggle:x=>s.has(x)?s.delete(x):s.add(x), contains:x=>s.has(x), _s:s }; }

const parentStub = () => ({ scrollTop:0, scrollHeight:0 });
function El(tag, id){
  const e = { tag, id, children:[], _html:"", _text:"", _sel:{}, dataset:{},
    style:new Proxy({},{set(){return true;}}), classList:ClassList(), value:"",
    _parent:parentStub() };
  e.appendChild = c => { e.children.push(c); c._parent = e; return c; };
  Object.defineProperty(e,"innerHTML",{ get:()=>e._html, set:v=>{ v=String(v); e._html=v; if(v==="") e.children=[]; } });
  Object.defineProperty(e,"textContent",{ get:()=>e._text, set:v=>{ e._text=String(v); } });
  Object.defineProperty(e,"parentElement",{ get:()=>e._parent, set:p=>{e._parent=p;} });
  e.querySelector = sel => (e._sel[sel] || (e._sel[sel]=El("q")));
  e.querySelectorAll = () => { const a=[]; a.forEach=Array.prototype.forEach; return a; };
  e.scrollIntoView = ()=>{};
  e.addEventListener = ()=>{};
  e.remove = ()=>{ if(e._parent&&e._parent.children){ const i=e._parent.children.indexOf(e); if(i>=0) e._parent.children.splice(i,1);} };
  return e;
}
const reg = new Map();
const gid = id => { if(!reg.has(id)) reg.set(id, El("div", id)); return reg.get(id); };

function coll(n, prefix){ const a=[]; for(let i=0;i<n;i++){ a.push(prefix?gid(prefix+i):El("c")); } a.forEach=Array.prototype.forEach; return a; }
const ipSteps = coll(6), ipLines = coll(5);
const document = {
  getElementById: gid,
  querySelector: sel => El("q", sel),
  querySelectorAll: sel => {
    if(sel.includes("ip-step")) return ipSteps;
    if(sel.includes("ip-line")) return ipLines;
    if(sel.includes("agent-link")) return coll(4,"lk-");
    const a=[]; a.forEach=Array.prototype.forEach; return a;
  },
  createElement: tag => El(tag, "new"),
  body: El("body")
};
gid("datasetSelect").value = "insufficient-funds";

let timers=[];
const sandbox = {
  window:{}, document, console,
  performance:{ now:()=>Date.now() },
  setTimeout:(fn)=>{ return setTimeout(()=>{try{fn();}catch(e){console.log("ERR",e.message);}},0); },
  clearTimeout, requestAnimationFrame:(fn)=>setTimeout(()=>fn(Date.now()),0),
  Math, Date, JSON, Array, Object, String, Number, Set, parseInt, parseFloat, isNaN, Promise,
  fetch: async()=>{ throw new Error("no fetch"); }
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("datasets.js","utf8"), sandbox);
vm.runInContext(fs.readFileSync("investigationEngine.js","utf8"), sandbox);
const html = fs.readFileSync("index.html","utf8");
const inline = html.split('<script src="investigationEngine.js"></script>')[1].split("<script>")[1].split("</script>")[0];
vm.runInContext(inline, sandbox);

const delay = ms => new Promise(r=>setTimeout(r,ms));
const convMsgs = () => gid("convStream").children.map(c => (c._sel[".conv-body"]||{})._html || "");
const logItems = () => gid("decisionLog").children.map(c => c._html || "");
const metricCount = id => ((gid("res-"+id)._html||"").match(/ag-metric/g)||[]).length;
const cardState = id => { const c=gid("ag-"+id); return c.classList.contains("completed")?"completed":c.classList.contains("working")?"working":"waiting"; };

let pass=0, fail=0;
function ok(name, cond, extra){ (cond?pass++:fail++); console.log((cond?"PASS":"FAIL")+" — "+name+(cond?"":"   >> "+(extra||""))); }

(async () => {
  // ---- 1. Full run on a dataset while on Ops ----
  sandbox.onOpsEnter();                 // user is viewing the workspace
  await sandbox.loadDataset("insufficient-funds");
  await delay(400);
  const m1 = convMsgs(), l1 = logItems();
  ok("dataset A produced conversation", m1.length >= 8, "msgs="+m1.length);
  ok("dataset A produced decision log", l1.length >= 5, "log="+l1.length);
  ok("A conversation mentions its merchant", m1.join(" ").includes("Northwind Apparel"));
  ok("A conversation mentions its code 51", m1.join(" ").includes("51"));
  ok("A revenue metric rendered", metricCount("revenue") === 2, "metrics="+metricCount("revenue"));
  ok("A reached Executive Summary (manager completed)", cardState("manager")==="completed");

  // ---- 2. Switch to a different dataset: must reset + re-run, no stale/dup ----
  await sandbox.loadDataset("expired-card");
  await delay(400);
  const m2 = convMsgs(), l2 = logItems();
  ok("B conversation count == A (no accumulation)", m2.length === m1.length, "A="+m1.length+" B="+m2.length);
  ok("B decision log count == A (no accumulation)", l2.length === l1.length, "A="+l1.length+" B="+l2.length);
  ok("B mentions Blue Lagoon Travel", m2.join(" ").includes("Blue Lagoon Travel"));
  ok("B has NO stale Northwind", !m2.join(" ").includes("Northwind"));
  ok("B mentions code 54 (Expired)", m2.join(" ").includes("54"));
  ok("B revenue metric count == 2 (boxes cleared)", metricCount("revenue")===2, "metrics="+metricCount("revenue"));

  // ---- 3. Rapid switching while on Ops: only the LAST survives ----
  sandbox.loadDataset("do-not-honor");
  sandbox.loadDataset("issuer-unavailable");
  await sandbox.loadDataset("authentication-failure");
  await delay(600);
  const m3 = convMsgs();
  ok("rapid-switch settles on last (Verde)", m3.join(" ").includes("Verde Subscriptions"));
  ok("rapid-switch no stale Forkright", !m3.join(" ").includes("Forkright"));
  ok("rapid-switch no stale Atlas", !m3.join(" ").includes("Atlas"));
  ok("rapid-switch conversation count single-run", m3.length === m1.length, "count="+m3.length);

  // ---- 4. Off-Ops load defers animation; opening Ops runs it once ----
  sandbox.onOpsLeave();
  await sandbox.loadDataset("issuer-unavailable");
  await delay(200);
  ok("off-Ops load clears workspace (no stale)", convMsgs().length === 0, "count="+convMsgs().length);
  sandbox.onOpsEnter();
  await delay(500);
  const m4 = convMsgs();
  ok("opening Ops runs the deferred investigation", m4.length >= 8, "count="+m4.length);
  ok("deferred run shows Atlas Mobility", m4.join(" ").includes("Atlas Mobility"));

  console.log("\n==== "+pass+" passed, "+fail+" failed ====");
  process.exit(fail?1:0);
})();
