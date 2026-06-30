/* Behavioral + reasoning-uniqueness harness for the Multi-Agent Workspace.
   DOM stub records appended children so we can assert reset / re-run /
   cancellation, AND we exercise AgentReasoning.build() directly to prove
   each investigation produces genuinely different collaborative reasoning. */
const fs = require("fs"), vm = require("vm");
function ClassList(){ const s=new Set(); return { add:(...a)=>a.forEach(x=>s.add(x)), remove:(...a)=>a.forEach(x=>s.delete(x)), toggle:x=>s.has(x)?s.delete(x):s.add(x), contains:x=>s.has(x), _s:s }; }
const parentStub = () => ({ scrollTop:0, scrollHeight:0 });
function El(tag,id){ const e={tag,id,children:[],_html:"",_text:"",_sel:{},dataset:{},style:new Proxy({},{set(){return true;}}),classList:ClassList(),value:"",_parent:parentStub()};
  e.appendChild=c=>{e.children.push(c);c._parent=e;return c;};
  Object.defineProperty(e,"innerHTML",{get:()=>e._html,set:v=>{v=String(v);e._html=v;if(v==="")e.children=[];}});
  Object.defineProperty(e,"textContent",{get:()=>e._text,set:v=>{e._text=String(v);}});
  Object.defineProperty(e,"parentElement",{get:()=>e._parent,set:p=>{e._parent=p;}});
  e.querySelector=sel=>(e._sel[sel]||(e._sel[sel]=El("q")));
  e.querySelectorAll=()=>{const a=[];a.forEach=Array.prototype.forEach;return a;};
  e.scrollIntoView=()=>{};e.addEventListener=()=>{};
  e.remove=()=>{if(e._parent&&e._parent.children){const i=e._parent.children.indexOf(e);if(i>=0)e._parent.children.splice(i,1);}};
  return e; }
const reg=new Map(); const gid=id=>{if(!reg.has(id))reg.set(id,El("div",id));return reg.get(id);};
function coll(n,p){const a=[];for(let i=0;i<n;i++)a.push(p?gid(p+i):El("c"));a.forEach=Array.prototype.forEach;return a;}
const ipS=coll(6),ipL=coll(5);
const document={getElementById:gid,querySelector:s=>El("q",s),
  querySelectorAll:sel=>{if(sel.includes("ip-step"))return ipS;if(sel.includes("ip-line"))return ipL;if(sel.includes("agent-link"))return coll(4,"lk-");const a=[];a.forEach=Array.prototype.forEach;return a;},
  createElement:t=>El(t,"new"),body:El("body")};
gid("datasetSelect").value="insufficient-funds";
const sandbox={window:{},document,console,performance:{now:()=>Date.now()},
  setTimeout:fn=>setTimeout(()=>{try{fn();}catch(e){console.log("ERR",e.message);}},0),
  clearTimeout,requestAnimationFrame:fn=>setTimeout(()=>fn(Date.now()),0),
  Math,Date,JSON,Array,Object,String,Number,Set,parseInt,parseFloat,isNaN,Promise,fetch:async()=>{throw new Error("no fetch");}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("datasets.js","utf8"),sandbox);
vm.runInContext(fs.readFileSync("investigationEngine.js","utf8"),sandbox);
vm.runInContext(fs.readFileSync("agentReasoning.js","utf8"),sandbox);
const html=fs.readFileSync("index.html","utf8");
const inline=html.split('<script src="agentReasoning.js"></script>')[1].split("<script>")[1].split("</script>")[0];
vm.runInContext(inline,sandbox);

const delay=ms=>new Promise(r=>setTimeout(r,ms));
const convMsgs=()=>gid("convStream").children.map(c=>(c._sel[".conv-body"]||{})._html||"");
const logItems=()=>gid("decisionLog").children.map(c=>c._html||"");
const cardState=id=>{const c=gid("ag-"+id);return c.classList.contains("completed")?"completed":c.classList.contains("working")?"working":"waiting";};
let pass=0,fail=0;
const ok=(n,c,x)=>{(c?pass++:fail++);console.log((c?"PASS":"FAIL")+" — "+n+(c?"":"   >> "+(x||"")));};

(async()=>{
  // ============ A. Lifecycle: reset / no-stale / cancellation ============
  sandbox.onOpsEnter();
  await sandbox.loadDataset("insufficient-funds"); await delay(500);
  const m1=convMsgs(),l1=logItems();
  ok("A produced conversation",m1.length>=10,"msgs="+m1.length);
  ok("A produced decision log",l1.length>=5,"log="+l1.length);
  ok("A reached Executive Summary",cardState("manager")==="completed");
  ok("A mentions its merchant",m1.join(" ").includes("Northwind Apparel"));

  await sandbox.loadDataset("expired-card"); await delay(500);
  const m2=convMsgs();
  ok("switch: conv count == A (no accumulation)",m2.length===m1.length,"A="+m1.length+" B="+m2.length);
  ok("switch: no stale Northwind",!m2.join(" ").includes("Northwind"));
  ok("switch: shows Blue Lagoon",m2.join(" ").includes("Blue Lagoon"));

  sandbox.loadDataset("do-not-honor");
  sandbox.loadDataset("issuer-unavailable");
  await sandbox.loadDataset("authentication-failure"); await delay(700);
  const m3=convMsgs();
  ok("rapid-switch settles on last (Verde)",m3.join(" ").includes("Verde"));
  ok("rapid-switch no stale Forkright/Atlas",!/Forkright|Atlas/.test(m3.join(" ")));
  ok("rapid-switch single-run count",m3.length===m1.length,"count="+m3.length);

  sandbox.onOpsLeave();
  await sandbox.loadDataset("issuer-unavailable"); await delay(200);
  ok("off-Ops load clears workspace",convMsgs().length===0,"count="+convMsgs().length);
  sandbox.onOpsEnter(); await delay(600);
  ok("opening Ops runs deferred investigation",convMsgs().length>=10);

  // ============ B. Reasoning is generated & cross-referential ============
  const R={};
  for(const k of ["insufficient-funds","do-not-honor","expired-card","issuer-unavailable","authentication-failure"]){
    await sandbox.loadDataset(k); R[k]=sandbox.AgentReasoning.build(sandbox.currentInvestigation);
  }
  // cross-agent evidence passing
  ok("Root Cause references Classification",/Classification/.test(R["insufficient-funds"].rootLines.join(" ")+R["do-not-honor"].rootLines.join(" ")));
  ok("Recovery references the root cause",R["expired-card"].recoveryLines.join(" ").toLowerCase().includes("retry")||R["expired-card"].recoveryLines.join(" ").includes("expired"));
  ok("Revenue line references Recovery's recommendation",R["insufficient-funds"].revenueLine.includes("Retry in 48h"));
  ok("Executive summary synthesises chain",/Root cause/.test(R["authentication-failure"].execSummary)&&R["authentication-failure"].execSummary.includes("confirmed at"));

  // structurally DIFFERENT reasoning, not value-substitution
  ok("Expired = HARD decline framing (retry pointless)",/fail(s)? (every time|100%)/i.test(R["expired-card"].recoveryLines.join(" ")));
  ok("Expired discusses churn",/churn/i.test(R["expired-card"].execNext+R["expired-card"].revenueOpportunity));
  ok("Issuer-unavailable discusses outage/failover",/outage|failover/i.test(R["issuer-unavailable"].planFocus+R["issuer-unavailable"].recoveryLines.join(" ")));
  ok("Authentication discusses 3DS rollback/canary",/3DS|canary|circuit breaker/i.test(R["authentication-failure"].recoveryLines.join(" ")+R["authentication-failure"].planFocus));
  ok("Do-Not-Honor discusses velocity/descriptor/BIN",/velocity|descriptor|BIN/i.test(R["do-not-honor"].planFocus+R["do-not-honor"].rootLines.join(" ")+R["do-not-honor"].recoveryLines.join(" ")));
  ok("Insufficient-funds discusses funding cycle",/funding/i.test(R["insufficient-funds"].planFocus+R["insufficient-funds"].recoveryLines.join(" ")));

  // priority assessment differs across investigations
  const pris=new Set(Object.values(R).map(r=>r.priorityShort));
  ok("Manager priority assessment varies",pris.size>=2,"priorities="+[...pris].join(" | "));

  // two soft declines must NOT read identically (different plan + recovery text)
  ok("Soft-decline datasets differ in plan",R["insufficient-funds"].planFocus!==R["do-not-honor"].planFocus);
  ok("Soft-decline datasets differ in recovery",R["insufficient-funds"].recoveryLines.join("")!==R["issuer-unavailable"].recoveryLines.join(""));
  ok("Classification cites secondary decline code (per-dataset evidence)",/tail of code/.test(R["expired-card"].classWhy));

  console.log("\n==== "+pass+" passed, "+fail+" failed ====");
  process.exit(fail?1:0);
})();
