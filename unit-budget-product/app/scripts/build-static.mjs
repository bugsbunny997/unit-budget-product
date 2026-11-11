// Builds the static demo into ../docs for GitHub Pages: the same frontend and
// API code, running in the browser with no server. Run: npm run build:static
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(app, "..", "docs");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "lib"), { recursive: true });
fs.mkdirSync(path.join(out, "data"), { recursive: true });

for (const f of ["app.js", "styles.css", "icon.svg"]) fs.copyFileSync(path.join(app, "public", f), path.join(out, f));
for (const f of ["engine.js", "api.js"]) fs.copyFileSync(path.join(app, "lib", f), path.join(out, "lib", f));
for (const f of ["rules.json", "items.json", "sample.json"]) fs.copyFileSync(path.join(app, "data", f), path.join(out, "data", f));

// Project pages live under /<repo>/, so every asset path must be relative.
let html = fs.readFileSync(path.join(app, "public", "index.html"), "utf8");
html = html
  .replace('href="/icon.svg"', 'href="./icon.svg"')
  .replace('href="/styles.css"', 'href="./styles.css"')
  .replace('src="/app.js"', 'src="./app.js"')
  .replace("<title>Kosh</title>", "<title>Kosh · demo</title>\n  <script>window.KOSH_STATIC = true;</script>");
if (!html.includes("window.KOSH_STATIC = true")) throw new Error("Could not mark the page as static.");
fs.writeFileSync(path.join(out, "index.html"), html);
fs.writeFileSync(path.join(out, ".nojekyll"), ""); // serve files as-is

const count = fs.readdirSync(out, { recursive: true }).length;
console.log(`Static demo built: ${out} (${count} entries)`);
