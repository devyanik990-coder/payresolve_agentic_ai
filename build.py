import zipfile, os, sys
OUT="/sessions/sweet-brave-fermat/mnt/outputs/payresolve_v1"
z=zipfile.ZipFile("/sessions/sweet-brave-fermat/mnt/uploads/agentic_ai_payfraud.zip")
P="agentic_ai_payfraud/"
# write data-layer files verbatim from the zip
for m in ["datasets.js","investigationEngine.js","gen_data.js","verify.js",
          "data/authentication-failure.json","data/do-not-honor.json","data/expired-card.json",
          "data/insufficient-funds.json","data/issuer-unavailable.json"]:
    b=z.read(P+m)
    p=os.path.join(OUT,m); os.makedirs(os.path.dirname(p),exist_ok=True)
    open(p,"wb").write(b)

s=z.read(P+"index.html").decode("utf-8"); orig=s; errs=[]
def rep(a,b,label,count=1):
    global s
    n=s.count(a)
    if n!=count: errs.append(f"[{label}] expected {count} found {n}"); return
    s=s.replace(a,b)

rep("    let started = false;",
    "    let runId = 0, pending = false, onOps = false;","state-vars")

rep(
'''    async function work(id, lines, interval){
      interval = interval || 950;
      setState(id, "working", lines[0]);
      $("ag-" + id).scrollIntoView({ block:"nearest", behavior:"smooth" });
      for(let i = 1; i < lines.length; i++){ await sleep(interval); $("st-" + id).textContent = lines[i]; }
      await sleep(interval);
    }''',
'''    async function work(id, lines, interval){
      interval = interval || 950;
      const myId = runId;
      setState(id, "working", lines[0]);
      $("ag-" + id).scrollIntoView({ block:"nearest", behavior:"smooth" });
      for(let i = 1; i < lines.length; i++){ await sleep(interval); if(myId !== runId) return; $("st-" + id).textContent = lines[i]; }
      await sleep(interval);
    }''',"work-guard")

rep('    if (name === "ops" && window.startInvestigation) window.startInvestigation();',
'    if (name === "ops") { if (window.onOpsEnter) window.onOpsEnter(); }\n    else if (window.onOpsLeave) window.onOpsLeave();',"go-trigger")

rep('''    renderCasesTable();
    bindInvestigation(inv);
  }''',
'''    renderCasesTable();
    bindInvestigation(inv);
    // Drive the animated half of the app from the SAME object.
    if (window.refreshWorkspace) window.refreshWorkspace();
  }''',"apply-refresh")

rep('<script src="investigationEngine.js"></script>\n<script>',
    '<script src="investigationEngine.js"></script>\n<script src="agentReasoning.js"></script>\n<script>',"script-tag")

RESET = r'''    // ---- Reset the workspace to its idle state (discard previous investigation) ----
    function resetWorkspace(){
      const cs = $("convStream"); if(cs) cs.innerHTML = "";
      const dl = $("decisionLog"); if(dl) dl.innerHTML = "";
      Object.keys(AGENTS).forEach(id => {
        const res = $("res-" + id); if(res) res.innerHTML = "";
        const card = $("ag-" + id);
        if(card){
          card.classList.remove("working","completed","show-result","expanded");
          card.classList.add("waiting");
          const stateEl = card.querySelector(".ag-state"); if(stateEl) stateEl.textContent = "Waiting";
        }
        const st = $("st-" + id); if(st) st.textContent = (id === "manager") ? "Planning Investigation" : "Waiting";
      });
      document.querySelectorAll("#investProgress .ip-step").forEach(el => el.classList.remove("active","done"));
      document.querySelectorAll("#investProgress .ip-line").forEach(el => el.classList.remove("filled"));
      document.querySelectorAll("#agentCanvas .agent-link").forEach(el => el.classList.remove("armed","flowing"));
      const rr = $("recReady"); if(rr) rr.classList.remove("show");
      const rp = $("recPending"); if(rp) rp.style.display = "";
    }
'''

RUN = r'''
    // ---- Main sequence (cancellable via the runId generation token) ----
    // The conversation is GENERATED from the Investigation Object by
    // AgentReasoning.build(); run() only animates whatever it produced,
    // so every dataset yields a different collaborative reasoning process.
    async function run(myId){
      const alive = () => myId === runId;
      const t0 = performance.now();

      const I = currentInvestigation;
      if(!I) return;
      const R = (window.AgentReasoning && window.AgentReasoning.build)
                ? window.AgentReasoning.build(I) : null;
      if(!R) return;

      const fp = I.firstPassConfidence, conf = I.confidence;
      const lo = Math.max(1, fp - 11), lo2 = Math.max(1, fp - 4);
      const mid = Math.round(fp + (conf - fp) / 2);

      // ===== Stage 0 - Planning : Manager scopes & delegates =====
      setStage(0);
      await work("manager", ["Opening investigation...", I.failedCount.toLocaleString("en-US") + " failures on " + I.gateway + " (" + (I.networksLabel || I.networks.join(" · ")) + ").", "Setting priority and a plan..."], 820);
      if(!alive()) return;
      metric("manager", "Priority", R.priorityShort);
      addLog(clock(0), "Investigation Created", "Case " + I.caseId + " · " + I.merchant + " · " + R.priority);
      await say("manager", R.planFocus, clock(0));
      if(!alive()) return;
      await say("manager", R.delegateClass, clock(0));
      if(!alive()) return;
      setState("manager", "completed", "Plan set · delegated Classification");
      await flow(0); if(!alive()) return;

      // ===== Stage 1 - Classification (first pass low, then evidence) =====
      setStage(1);
      await work("failure", ["Reading decline code " + I.dominantCode + "...", "Checking " + I.gateway + " response...", "Inspecting issuer message..."], 800);
      if(!alive()) return;
      const cf = metric("failure", "Confidence", fp + "%");
      await steppedConfidence(cf, [lo, lo2, fp], "%", 300);
      if(!alive()) return;
      cf.style.color = "#f0c462";
      await say("failure", R.classWhy + " Confidence only " + fp + "% so far.", clock(1));
      if(!alive()) return;

      setState("manager", "working", "Reviewing classification...");
      await sleep(640); if(!alive()) return;
      await say("manager", R.managerLowConf, clock(1));
      if(!alive()) return;
      addLog(clock(1), "Confidence Below Threshold", fp + "% — under 90% threshold");
      addLog(clock(1), "Additional Evidence Requested", "Manager → Classification Agent");
      setState("manager", "completed", "Requested more evidence");

      await work("failure", ["Correlating retry history...", "Mapping the " + I.dominantCount.toLocaleString("en-US") + "-decline cohort on code " + I.dominantCode + "..."], 760);
      if(!alive()) return;
      await steppedConfidence(cf, [fp, mid, conf], "%", 350);
      if(!alive()) return;
      cf.style.color = "#4dd699";
      setState("failure", "completed", "Classification Complete");
      await say("failure", R.classRaised, clock(1));
      if(!alive()) return;

      setState("manager", "working", "Confidence improved...");
      await sleep(580); if(!alive()) return;
      await say("manager", R.managerAfterClass, clock(1));
      if(!alive()) return;
      addLog(clock(1), "Confidence Accepted", I.classification + " confirmed at " + conf + "%");
      setState("manager", "completed", "Delegated Root Cause");
      await flow(1); if(!alive()) return;

      // ===== Stage 2 - Root Cause (builds on Classification) =====
      setStage(2);
      await work("root", ["Reviewing Classification's finding...", "Checking " + I.gateway + " behaviour & auth-rate drop...", "Isolating the cause..."], 800);
      if(!alive()) return;
      metric("root", "Root Cause", I.rootCauseLabel).style.color = "#f0c462";
      setState("root", "completed", "Root Cause Found");
      for(const line of R.rootLines){ await say("root", line, clock(2)); if(!alive()) return; }

      setState("manager", "working", "Recovery analysis required...");
      await sleep(540); if(!alive()) return;
      await say("manager", R.managerAfterRoot, clock(2));
      if(!alive()) return;
      setState("manager", "completed", "Delegated Recovery");
      await flow(2); if(!alive()) return;

      // ===== Stage 3 - Recovery (builds on Root Cause; trade-offs) =====
      setStage(3);
      await work("recovery", ["Reviewing root cause " + I.rootCauseLabel + "...", "Weighing recovery options & trade-offs..."], 800);
      if(!alive()) return;
      metric("recovery", "Recommendation", I.recommendation);
      setState("recovery", "completed", "Recommendation Ready");
      for(const line of R.recoveryLines){ await say("recovery", line, clock(3)); if(!alive()) return; }

      setState("manager", "working", "Revenue impact required...");
      await sleep(540); if(!alive()) return;
      await say("manager", R.managerAfterRecovery, clock(3));
      if(!alive()) return;
      setState("manager", "completed", "Delegated Revenue");
      await flow(3); if(!alive()) return;

      // ===== Stage 4 - Revenue (builds on Recovery; sizes impact) =====
      setStage(4);
      await work("revenue", ["Modeling recoverable revenue from " + ("$" + Math.round(I.revenueAtRisk).toLocaleString("en-US")) + "...", "Estimating retry success on the cohort..."], 800);
      if(!alive()) return;
      const rp = metric("revenue", "Recovery Probability", "0%");
      const er = metric("revenue", "Expected Recovery", "$0");
      countUp(rp, I.recoveryProbability, "%", 950);
      moneyUp(er, I.expectedRecovery, 1050);
      await sleep(1150); if(!alive()) return;
      setState("revenue", "completed", "Business Impact Calculated");
      await say("revenue", R.revenueLine, clock(3));
      if(!alive()) return;
      await say("revenue", R.revenueOpportunity, clock(3));
      if(!alive()) return;

      setState("manager", "working", "Approving recovery plan...");
      await sleep(580); if(!alive()) return;
      await say("manager", R.managerApprove, clock(3));
      if(!alive()) return;
      addLog(clock(3), "Recovery Approved", I.recommendation + " · " + I.recoveryProbability + "% expected recovery");
      setState("manager", "completed", "Recovery approved");

      // ===== Stage 5 - Executive Summary (synthesises the chain) =====
      setStage(5);
      await work("manager", ["Synthesising the team's findings...", "Drafting executive summary..."], 800);
      if(!alive()) return;
      setState("manager", "completed", "Investigation Complete");
      await say("manager", R.execSummary, clock(3));
      if(!alive()) return;
      await say("manager", R.execNext, clock(3));
      if(!alive()) return;
      addLog(clock(3), "Executive Summary Generated", R.priorityShort + " · " + I.recommendation);

      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));
      revealRecommendation(secs);
    }
'''

API = r'''
    // ---- Start a fresh run, cancelling any in-flight one ----
    function startRun(){
      runId++;                     // invalidate any in-flight run
      const myId = runId;
      resetWorkspace();            // never carry stale data into a new run
      setTimeout(() => { if(myId === runId) run(myId); }, 350);
    }

    /* PUBLIC API - the workspace is driven entirely by the Investigation Object.
       applyInvestigation() -> refreshWorkspace() on every dataset load. */
    window.refreshWorkspace = function(){
      if(onOps){
        pending = false;
        startRun();                // already viewing the workspace -> replay now
      } else {
        runId++;                   // cancel any in-flight run
        resetWorkspace();          // clear to idle so nothing stale lingers
        pending = true;            // animate the next time the workspace opens
      }
    };
    window.onOpsEnter = function(){
      onOps = true;
      if(pending){ pending = false; startRun(); }
    };
    window.onOpsLeave = function(){ onOps = false; };
  })();'''

START="    // ---- Main sequence ----"
END="  })();"
i=s.find(START); j=s.find(END,i)
if i==-1 or j==-1:
    errs.append("main-block markers not found")
else:
    j+=len(END)
    s = s[:i] + RESET + RUN + API + s[j:]

if errs:
    print("BUILD FAILED:\n"+"\n".join(errs)); sys.exit(1)

open(os.path.join(OUT,"index.html"),"w",encoding="utf-8").write(s)
print("index.html built:",len(s),"bytes (orig",len(orig),")")
print("started latch gone:", "let started = false;" not in s)
print("startInvestigation gone:", "window.startInvestigation" not in s)
print("agentReasoning tag:", '<script src="agentReasoning.js"></script>' in s)
