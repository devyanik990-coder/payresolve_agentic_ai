const fs = require("fs");
let s = fs.readFileSync("index.html", "utf8");
const marker = '      setState("recovery", "completed", "Recommendation Read';
const idx = s.indexOf(marker);
if (idx === -1) { console.log("marker not found — aborting"); process.exit(1); }
s = s.slice(0, idx);

const tail = [
'      setState("recovery", "completed", "Recommendation Ready");',
'      await say("recovery", I.recoveryNarrative, clock(3));',
'',
'      setState("manager", "working", "Revenue impact required...");',
'      await sleep(550);',
'      await say("manager", "Need revenue impact.", clock(3));',
'      setState("manager", "completed", "Delegated Revenue");',
'      await flow(3);',
'',
'      // ===== Stage 4 — Business Impact =====',
'      setStage(4);',
'      await work("revenue", ["Modeling recoverable revenue...", "Estimating retry success..."], 800);',
'      const rp = metric("revenue", "Recovery Probability", "0%");',
'      const er = metric("revenue", "Expected Recovery", "$0");',
'      countUp(rp, I.recoveryProbability, "%", 950);',
'      moneyUp(er, I.expectedRecovery, 1050);',
'      await sleep(1150);',
'      setState("revenue", "completed", "Business Impact Calculated");',
'      await say("revenue", "Expected recovery " + I.recoveryProbability + "%.", clock(3));',
'',
'      // ----- Manager approves recovery -----',
'      setState("manager", "working", "Approving recovery plan...");',
'      await sleep(600);',
'      await say("manager", "Recovery approved.", clock(3));',
'      addLog(clock(3), "Recovery Approved", I.recommendation + " · " + I.recoveryProbability + "% expected recovery");',
'      setState("manager", "completed", "Recovery approved");',
'',
'      // ===== Stage 5 — Executive Summary =====',
'      setStage(5);',
'      await work("manager", ["Generating executive summary...", "Investigation complete."], 800);',
'      setState("manager", "completed", "Investigation Complete");',
'      await say("manager", "Executive summary ready.", clock(3));',
'      addLog(clock(3), "Executive Summary Generated", "Ready for operator review");',
'',
'      const secs = Math.max(1, Math.round((performance.now() - t0) / 1000));',
'      revealRecommendation(secs);',
'    }',
'',
'    window.startInvestigation = function(){',
'      if(started) return; started = true;',
'      setTimeout(run, 500);',
'    };',
'  })();',
'',
'</script>',
'</body>',
'</html>',
''
].join("\n");

fs.writeFileSync("index.html", s + tail);
console.log("repaired. new line count:", (s + tail).split("\n").length);
