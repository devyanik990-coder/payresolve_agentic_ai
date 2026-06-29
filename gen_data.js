/* Generates realistic failed-transaction datasets for PayResolve AI.
   Writes one JSON file per dataset into ./data and an embedded
   ./datasets.js (window.DATASET_RECORDS) so the app runs from file://. */
const fs = require("fs");
const path = require("path");

// Deterministic PRNG so regenerating gives stable numbers.
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

const SPECS = {
  "insufficient-funds": {
    merchant:"Northwind Apparel", gateway:"Adyen",
    networks:[["Visa",0.62],["Mastercard",0.38]],
    dominant:"51", dominantShare:0.89,
    others:[["3DS",0.05],["05",0.04],["91",0.02]],
    count:2147, ticket:[95,420], seed:101
  },
  "expired-card": {
    merchant:"Blue Lagoon Travel", gateway:"Stripe",
    networks:[["Visa",0.5],["Mastercard",0.34],["Amex",0.16]],
    dominant:"54", dominantShare:0.85,
    others:[["05",0.08],["51",0.05],["91",0.02]],
    count:1320, ticket:[210,1450], seed:202
  },
  "do-not-honor": {
    merchant:"Forkright Foods", gateway:"Braintree",
    networks:[["Amex",0.55],["Visa",0.45]],
    dominant:"05", dominantShare:0.83,
    others:[["51",0.09],["3DS",0.05],["54",0.03]],
    count:1806, ticket:[60,330], seed:303
  },
  "issuer-unavailable": {
    merchant:"Atlas Mobility", gateway:"dLocal",
    networks:[["Visa",1.0]],
    dominant:"91", dominantShare:0.91,
    others:[["05",0.05],["51",0.04]],
    count:980, ticket:[40,260], seed:404
  },
  "authentication-failure": {
    merchant:"Verde Subscriptions", gateway:"Checkout.com",
    networks:[["Visa",0.58],["Mastercard",0.42]],
    dominant:"3DS", dominantShare:0.87,
    others:[["05",0.07],["51",0.04],["91",0.02]],
    count:1530, ticket:[19,180], seed:505
  }
};

function pick(rand, weighted){
  const r = rand(); let acc = 0;
  for(const [val, w] of weighted){ acc += w; if(r <= acc) return val; }
  return weighted[weighted.length-1][0];
}

function buildCodes(spec){
  // Compose a weighted code distribution from dominant + others.
  const list = [[spec.dominant, spec.dominantShare]];
  let rest = 1 - spec.dominantShare;
  const totalOther = spec.others.reduce((s,[,w])=>s+w,0);
  for(const [code,w] of spec.others) list.push([code, rest*(w/totalOther)]);
  return list;
}

function gen(spec){
  const rand = mulberry32(spec.seed);
  const codes = buildCodes(spec);
  const recs = [];
  for(let i=0;i<spec.count;i++){
    const amount = Math.round((spec.ticket[0] + rand()*(spec.ticket[1]-spec.ticket[0])) * 100)/100;
    recs.push({
      merchant: spec.merchant,
      gateway: spec.gateway,
      network: pick(rand, spec.networks),
      declineCode: pick(rand, codes),
      amount,
      status: "failed"
    });
  }
  return recs;
}

const dataDir = path.join(__dirname, "data");
const embedded = {};
const summary = {};
for(const key of Object.keys(SPECS)){
  const recs = gen(SPECS[key]);
  embedded[key] = recs;
  fs.writeFileSync(path.join(dataDir, key + ".json"), JSON.stringify(recs));
  // quick summary
  const groups = {};
  let revenue = 0;
  for(const r of recs){ groups[r.declineCode]=(groups[r.declineCode]||0)+1; revenue += r.amount; }
  const dom = Object.entries(groups).sort((a,b)=>b[1]-a[1])[0];
  summary[key] = { count: recs.length, revenue: Math.round(revenue), dominant: dom[0], dominantShare: Math.round(dom[1]/recs.length*100) };
}

const js = "/* Auto-generated embedded datasets so PayResolve runs from file://.\n" +
  "   Each value is an array of failed-transaction records consumed by\n" +
  "   InvestigationEngine. Edit gen_data.js and re-run to regenerate. */\n" +
  "window.DATASET_RECORDS = " + JSON.stringify(embedded) + ";\n";
fs.writeFileSync(path.join(__dirname, "datasets.js"), js);

console.log(JSON.stringify(summary, null, 2));
