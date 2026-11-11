// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine, parseAmount } from "../lib/engine.js";
import { createApi } from "../lib/api.js";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const rules = load("rules.json");
const items = load("items.json");
const sample = load("sample.json");
const engine = createEngine({ rules, items, learn: sample.learn, getLocalOrders: () => [] });
const ask = (q, opts) => engine.compose(q, opts);

test("every item cites rule entries that exist, and every group has a valid generic item", () => {
  const ids = new Set(rules.entries.map((e) => e.id));
  for (const it of items.items) for (const c of it.cites) assert.ok(ids.has(c), `${it.id} cites missing ${c}`);
  const itemIds = new Set(items.items.map((i) => i.id));
  for (const g of items.groups) assert.ok(itemIds.has(g.generic), `group ${g.id} generic missing`);
  for (const it of items.items) assert.ok(items.groups.some((g) => g.id === it.group), `${it.id} has unknown group`);
});

test("a sofa set is recognised, and Kosh asks where it is for", () => {
  const a = ask("Can I buy a sofa set?");
  assert.equal(a.kind, "clarify");
  assert.equal(a.item.id, "furniture-living");
  assert.equal(a.options.length, 2);
});

test("choosing office, then giving a value, produces a route", () => {
  const first = ask("Can I buy a sofa set?");
  const office = ask("An office, barracks or training area", { choice: first.options[0].choice, context: first.context });
  assert.equal(office.kind, "item");
  assert.ok(office.askValue);
  const priced = ask("about 80,000", { context: office.context });
  assert.equal(priced.kind, "route");
  assert.equal(priced.item.id, "furniture-living");
  assert.equal(priced.route.mode.ruleId, "GFR-154");
  assert.equal(priced.route.sanction.level, "Commanding Officer");
});

test("a sofa for the officers' mess is pointed at mess funds", () => {
  const a = ask("Can I buy a sofa set for the officers mess?");
  assert.equal(a.kind, "item");
  assert.ok(a.citations.includes("PRAC-NONPUBLIC"));
  assert.equal(a.route, undefined);
});

test("typos and joined words still match", () => {
  assert.equal(engine.classify("can i buy a sofaset").item.id, "furniture-living");
  assert.equal(engine.classify("new almira for the office").item.id, "furniture-office");
  assert.equal(engine.classify("two refrigerators").item.id, "appliance-home");
});

test("the more specific phrase wins", () => {
  assert.equal(engine.classify("a 3d printer").item.id, "3d-printer");
  assert.equal(engine.classify("printer paper").item.id, "stationery");
  assert.equal(engine.classify("hire a bus for the sports meet").item.id, "hired-transport");
});

test("two different items in one message asks which one", () => {
  const a = ask("can we buy a fridge and an ac");
  assert.equal(a.kind, "clarify");
  assert.ok(a.options.length >= 2);
});

test("an unknown item gets the group picker, and a group choice gives a route", () => {
  const a = ask("Can I buy a zorb ball for 60k?");
  assert.equal(a.kind, "clarify");
  assert.equal(a.options.length, items.groups.length);
  assert.ok(a.unmatched);
  const b = ask("Sports & PT", { choice: { group: "sports" }, context: a.context });
  assert.equal(b.kind, "route");
  assert.equal(b.route.value, 60000);
});

test("restricted and central items get no route", () => {
  assert.equal(ask("Can we buy vehicle spares locally?").kind, "item");
  assert.equal(ask("Can I buy CCTV cameras for 4 lakh").route, undefined);
  assert.equal(ask("can we buy a jeep").item.id, "vehicles");
});

test("a new question does not inherit the last item", () => {
  const a = ask("Who sanctions a 30 lakh purchase?", { context: { itemId: "furniture-living" } });
  assert.equal(a.kind, "route");
  assert.equal(a.item, undefined);
  assert.equal(a.route.sanction.level, "GOC Division");
});

test("rule questions get passages; off-topic questions get an honest no", () => {
  assert.equal(ask("When do I need IFA concurrence?").kind, "passage");
  assert.equal(ask("Which manual applies to an RFP issued in October 2025?").kind, "passage");
  assert.equal(ask("what is the weather in delhi").kind, "unknown");
});

test("amounts parse in Indian formats", () => {
  assert.equal(parseAmount("₹3.5 lakh"), 350000);
  assert.equal(parseAmount("Rs 50,000"), 50000);
  assert.equal(parseAmount("1.2 crore"), 12000000);
  assert.equal(parseAmount("80k"), 80000);
  assert.equal(parseAmount("in 2025"), null);
});

test("the shared API works with an in-memory store, as the static demo does", () => {
  const mem = new Map();
  const api = createApi({ rules, items, sample, store: { load: (n, f) => mem.get(n) ?? structuredClone(f), save: (n, d) => mem.set(n, d) } });
  const boot = api.handle("GET", "/api/bootstrap");
  assert.equal(boot.status, 200);
  const r = api.handle("POST", "/api/ask", { messages: [{ role: "user", content: "Can I buy a zorb ball?" }] });
  assert.equal(r.body.answer.kind, "clarify");
  assert.equal(mem.get("reviews").length, 1, "unmatched item logged for review");
  const note = api.handle("POST", "/api/notes", { item: "Training aids", value: 300000, role: "QM" });
  assert.equal(note.status, 201);
  assert.equal(note.body.id.startsWith("PRN-"), true);
  const blocked = api.handle("POST", "/api/notes", { item: "vehicle spares", value: 5000 });
  assert.equal(blocked.status, 422);
  assert.equal(api.handle("GET", "/api/nothing").status, 404);
});
