// Kosh POC server: the static frontend plus the JSON API from lib/api.js, with
// data kept in store/*.json. No framework and no dependencies.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "./lib/api.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4321;
const PUBLIC = path.join(here, "public");
const STORE = path.join(here, "store");
fs.mkdirSync(STORE, { recursive: true });

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// Tiny JSON file store.
const store = {
  load(name, fallback) {
    try {
      return readJSON(path.join(STORE, `${name}.json`));
    } catch {
      return structuredClone(fallback);
    }
  },
  save(name, data) {
    const file = path.join(STORE, `${name}.json`);
    fs.writeFileSync(file + ".tmp", JSON.stringify(data, null, 2));
    fs.renameSync(file + ".tmp", file);
  },
};

const api = createApi({
  rules: readJSON(path.join(here, "data", "rules.json")),
  items: readJSON(path.join(here, "data", "items.json")),
  sample: readJSON(path.join(here, "data", "sample.json")),
  store,
});

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Body is not valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function serveStatic(res, urlPath) {
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "Forbidden" });
  fs.readFile(file, (err, buf) => {
    if (err) {
      return fs.readFile(path.join(PUBLIC, "index.html"), (e2, html) => {
        if (e2) return send(res, 404, { error: "Not found" });
        res.writeHead(200, { "Content-Type": TYPES[".html"] });
        res.end(html);
      });
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const body = req.method === "GET" ? {} : await readBody(req);
      const { status, body: out } = api.handle(req.method, url.pathname, body);
      return send(res, status, out);
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });
    return serveStatic(res, decodeURIComponent(url.pathname));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 400, { error: err.message || "Something went wrong." });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Kosh POC running at http://localhost:${PORT}`);
  console.log("Answers come from the local rule library and item rulebook. No AI is used.");
});
