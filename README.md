# Kosh: unit budget guide (proof of concept)

Kosh tells an Army unit's officers what they can buy, how to buy it and who sanctions it, citing the GFR, DFPDS or DPM rule behind every line. No AI is used: answers come from a rule library and an item rulebook, and when Kosh isn't sure what an item is, it asks.

- **Live demo:** https://bugsbunny997.github.io/unit-budget-product/
- **Explainer video (2 minutes):** [kosh-explainer.mp4](kosh-explainer.mp4)
- **Problem statement and user stories:** [PROBLEM_STATEMENT.md](PROBLEM_STATEMENT.md)

> **Sample data only.** Rule thresholds, sanction ceilings and the item rulebook are illustrative. Do not use on a real case.

## What's here

| Folder | What it is |
|---|---|
| [unit-budget-product/app](unit-budget-product/app) | The app: Node server with no dependencies, rule engine, item rulebook, tests. See its README to run it. |
| [unit-budget-product/docs](unit-budget-product/docs) | The static demo published to GitHub Pages. Same code, running entirely in the browser. |
| [unit-budget-product/explainer](unit-budget-product/explainer) | The explainer video's source (HyperFrames composition), storyboard and share copy. |
| [.github/workflows/static.yml](.github/workflows/static.yml) | Publishes the demo folder to GitHub Pages on every push. |

## Run it locally

Needs Node 20 or later.

```bash
cd unit-budget-product/app
npm start
```

Open http://localhost:4321. Run the tests with `npm test`; rebuild the demo with `npm run build:static`.

Music in the video: Sascha Ende, ende.app (CC BY 4.0).
