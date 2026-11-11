# Kosh: proof of concept

Rules-first budget guidance for an Army unit, built from [PROBLEM_STATEMENT.md](../PROBLEM_STATEMENT.md). It covers version 1's scope (rules only) plus previews of version 2. No AI is used: every answer comes from the rule library and the item rulebook, with its source shown.

> **All rule data is sample data.** GFR thresholds are as reported in 2025 secondary sources. DFPDS ceilings and the IFA threshold are placeholders. The item rulebook is illustrative. Do not use on a real case.

## Run it

Needs Node 20 or later. There are no dependencies to install.

```bash
npm start
```

Then open http://localhost:4321.

```bash
npm test
```

Runs the engine and API tests.

```bash
npm run build:static
```

Rebuilds the static demo into `../docs` (the GitHub Pages site). The demo runs the same API code in the browser and keeps anything entered in that browser's storage.

## How Ask works

1. **Find the item type.** The item rulebook (`data/items.json`) has around 35 item types in 15 groups, each with the everyday words people use ("sofa set", "almira", "fridge", "AC"). Matching tolerates plurals and one-letter typos and prefers the more specific phrase ("3d printer" over "printer").
2. **Ask when unsure.** If two item types fit, Kosh asks which. If nothing fits, it asks which group the item is closest to and logs the item to the review queue so the rule custodian can add it. For items a mess or institute would normally buy itself, it asks where the item is for.
3. **Answer with sources.** It says whether the item is authorised, how it reaches the unit, the budget head and the DFPDS schedule item. With a value it works out the purchase mode, who sanctions it, whether IFA concurrence is needed, and the steps. Every line cites a rule entry.
4. **Follow-ups.** "About 80,000" or "it's for the office" carries on from the last item.

AI for the genuinely open-ended edge cases is a later step and is not part of this version.

## What's in it

| Screen | Problem-statement stories |
|---|---|
| Today | Entry point per role, dates to keep, rule library status |
| Ask | ASK-1, ASK-2, ASK-4, ASK-5, YO-2 |
| Can I buy it? | QM-1, QM-3, CO-2, CO-3 |
| Purchase notes (the "chit") | QM-2 (no earmark in v1), QM-4, 2IC-2, history and audit trail |
| Ideas | OR-1, OR-2, YO-1, CO-8, precedent library (FMN-5 preview) |
| Funds (v2 preview) | CO-1, CO-5, CLK-2, on sample figures |
| Handover (v2 preview) | CO-7 |
| Rule library | ADM-1, FMN-3, and the full item rulebook |
| Learn | YO-3 |
| Review queue | ADM-2 |

The **Viewing as** picker switches between roles. The CO decides on ideas; the Rule Custodian resolves review items; the CO, 2IC, Adjutant and Rule Custodian can add local orders.

## Layout

```
server.js               HTTP server: static files plus the API, data in store/*.json
lib/api.js              every API route, shared by the server and the static demo
lib/engine.js           item classifier, rule search, route calculator, answers
data/rules.json         versioned rule library and parameters (sample)
data/items.json         item rulebook (sample)
data/sample.json        explainers, dates, precedents, v2 fund figures, seed ideas
public/                 the frontend (plain HTML, CSS, JS; no build step)
scripts/build-static.mjs builds ../docs for GitHub Pages
test/engine.test.mjs    engine and API tests
store/                  runtime data (git-ignored)
```

To reset the local demo, stop the server and delete `store/`.
