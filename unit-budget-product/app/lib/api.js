// The Kosh API as plain functions, shared by the Node server (file storage) and
// the static demo (browser localStorage). No Node or browser specifics in here.
import { createEngine, shortInr } from "./engine.js";

const LIFECYCLE = ["Registered", "Checked", "Sanctioned", "Ordered", "Received", "Closed"];
const BLOCKED = ["central", "restricted", "out-of-scope"];

const now = () => new Date().toISOString();
const str = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
const whereOf = (v) => (["public", "nonpublic"].includes(v) ? v : null);

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => { throw new ApiError(status, message); };

function nextNumber(prefix, list) {
  const year = new Date().getFullYear();
  const n = list.filter((x) => x.id.startsWith(`${prefix}-${year}`)).length + 1;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

// store: { load(name, fallback) -> data, save(name, data) }
export function createApi({ rules, items, sample, store }) {
  let notes = store.load("notes", []);
  let ideas = store.load("ideas", sample.seedIdeas);
  let reviews = store.load("reviews", []);
  let localOrders = store.load("local-orders", []);

  const engine = createEngine({ rules, items, learn: sample.learn, getLocalOrders: () => localOrders });

  const routes = [
    ["GET", /^\/api\/bootstrap$/, () => ({
      mode: { llm: false, model: null },
      rules: { ...rules, entries: engine.allEntries() },
      items,
      learn: sample.learn,
      obligations: sample.obligations,
      precedents: sample.precedents,
      funds: sample.funds,
      lifecycle: LIFECYCLE,
    })],

    // Can I buy it?
    ["POST", /^\/api\/finder$/, (b) => engine.check({
      text: str(b.q, 200),
      value: Number(b.value) || null,
      itemId: str(b.itemId, 60) || null,
      group: str(b.group, 40) || null,
      where: whereOf(b.where),
      onGeM: !!b.onGeM,
      proprietary: !!b.proprietary,
    })],

    // Ask
    ["POST", /^\/api\/ask$/, (b) => {
      const history = Array.isArray(b.messages) ? b.messages : [];
      const question = str(history[history.length - 1]?.content, 2000);
      const choice = b.choice && typeof b.choice === "object"
        ? { itemId: str(b.choice.itemId, 60) || null, group: str(b.choice.group, 40) || null, where: whereOf(b.choice.where) }
        : null;
      const context = b.context && typeof b.context === "object"
        ? {
            itemId: str(b.context.itemId, 60) || null,
            amount: Number(b.context.amount) > 0 ? Number(b.context.amount) : null,
            where: whereOf(b.context.where),
            question: str(b.context.question, 500) || null,
          }
        : null;
      if (!question && !choice) fail(400, "Type a question first.");
      const answer = engine.compose(question, { choice, context });

      // Questions the rulebook can't place go to the review queue for the rule custodian.
      if (answer.kind === "unknown" || (answer.kind === "clarify" && answer.unmatched)) {
        const unmatched = answer.kind === "clarify";
        reviews.unshift({
          id: nextNumber("RQ", reviews),
          kind: unmatched ? "unmatched-item" : "unanswered",
          question,
          answer: answer.text,
          reason: unmatched ? `Item not in the item rulebook: “${answer.unmatched}”` : "Not covered by the rule library",
          at: now(),
          status: "Open",
        });
        store.save("reviews", reviews);
      }
      return { answer, mode: "rulebook" };
    }],

    // Purchase readiness notes
    ["GET", /^\/api\/notes$/, () => notes],
    ["POST", /^\/api\/notes$/, (b) => {
      const itemText = str(b.item, 200);
      const value = Number(b.value);
      if (!itemText) fail(400, "Say what you want to buy.");
      if (!(value > 0)) fail(400, "Enter an indicative value in rupees.");
      const item = (b.itemId && engine.itemById.get(str(b.itemId, 60))) || engine.matchItem(itemText);
      if (item && BLOCKED.includes(item.source)) fail(422, `${item.name}: ${item.sourceText}. A purchase note can't be raised for it.`);
      const route = engine.computeRoute({ value, onGeM: !!b.onGeM, proprietary: !!b.proprietary });
      const role = str(b.role, 20) || "QM";
      const note = {
        id: nextNumber("PRN", notes),
        item: itemText,
        catalogue: item ? { id: item.id, name: item.name, head: item.head, schedule: item.schedule, authorised: item.authorised } : null,
        value,
        justification: str(b.justification, 1500),
        subunit: str(b.subunit, 120),
        onGeM: !!b.onGeM,
        proprietary: !!b.proprietary,
        route,
        rulesVersion: rules.libraryVersion,
        status: "Checked",
        steps: route.steps.map((s) => ({ ...s, done: false, by: null, at: null })),
        history: [
          { at: now(), by: role, action: "Registered", detail: `Indicative value ${shortInr(value)}` },
          { at: now(), by: "System", action: "Checked", detail: `Route: ${route.mode.label}. Sanction: ${route.sanction.level}. IFA concurrence ${route.ifa.needed ? "needed" : "not needed"}.` },
        ],
        references: {},
        createdBy: role,
        createdAt: now(),
        updatedAt: now(),
      };
      notes.unshift(note);
      store.save("notes", notes);
      return [201, note];
    }],
    ["PATCH", /^\/api\/notes\/([A-Z0-9-]+)$/, (b, [, id]) => {
      const note = notes.find((n) => n.id === id);
      if (!note) fail(404, "Note not found.");
      const role = str(b.role, 20) || "QM";
      if (note.status === "Closed" || note.status === "Cancelled") fail(409, `This note is ${note.status.toLowerCase()}.`);
      if (b.action === "tick") {
        const step = note.steps[Number(b.index)];
        if (!step) fail(400, "No such step.");
        step.done = !step.done;
        step.by = step.done ? role : null;
        step.at = step.done ? now() : null;
        note.history.push({ at: now(), by: role, action: step.done ? "Step done" : "Step reopened", detail: step.text });
      } else if (b.action === "advance") {
        const to = LIFECYCLE[LIFECYCLE.indexOf(note.status) + 1];
        if (!to) fail(409, "Nothing left to record.");
        const reference = str(b.reference, 200);
        if (to !== "Closed" && !reference) fail(400, "Enter the reference number for this stage.");
        if (to === "Sanctioned") {
          const authority = str(b.authority, 120);
          if (!authority) fail(400, "Enter who gave the sanction.");
          note.references.sanction = { reference, authority };
        } else if (to !== "Closed") {
          note.references[to.toLowerCase()] = { reference };
        }
        note.status = to;
        note.history.push({ at: now(), by: role, action: to, detail: to === "Sanctioned" ? `${str(b.authority, 120)}, ref ${reference}` : reference || "Closed" });
      } else if (b.action === "cancel") {
        const reason = str(b.reason, 500);
        if (!reason) fail(400, "Give a reason for cancelling.");
        note.status = "Cancelled";
        note.history.push({ at: now(), by: role, action: "Cancelled", detail: reason });
      } else {
        fail(400, "Unknown action.");
      }
      note.updatedAt = now();
      store.save("notes", notes);
      return note;
    }],

    // Ideas box
    ["GET", /^\/api\/ideas$/, () => ideas],
    ["POST", /^\/api\/ideas$/, (b) => {
      const title = str(b.title, 140);
      if (!title) fail(400, "Give the idea a short title.");
      const idea = {
        id: `IDEA-${String(ideas.length + 1).padStart(3, "0")}`,
        title,
        why: str(b.why, 1200),
        category: str(b.category, 40) || "Other",
        costBand: str(b.costBand, 40) || "Not sure",
        by: b.anonymous ? "Anonymous" : str(b.by, 80) || "Unit member",
        role: str(b.role, 20),
        status: "Open",
        createdAt: now(),
      };
      ideas.unshift(idea);
      store.save("ideas", ideas);
      return [201, idea];
    }],
    ["PATCH", /^\/api\/ideas\/([A-Z0-9-]+)$/, (b, [, id]) => {
      const idea = ideas.find((i) => i.id === id);
      if (!idea) fail(404, "Idea not found.");
      if (str(b.role, 20) !== "CO") fail(403, "Only the Commanding Officer decides on ideas.");
      if (!["Accepted", "Deferred", "Declined"].includes(b.decision)) fail(400, "Choose accept, defer or decline.");
      const reason = str(b.reason, 500);
      if (b.decision !== "Accepted" && !reason) fail(400, "Give a reason so the person who raised it knows why.");
      idea.status = b.decision;
      idea.decision = { by: "CO", reason: reason || "Accepted.", at: now() };
      store.save("ideas", ideas);
      return idea;
    }],

    // Review queue
    ["GET", /^\/api\/reviews$/, () => reviews],
    ["POST", /^\/api\/reviews$/, (b) => {
      const r = { id: nextNumber("RQ", reviews), kind: "flag", question: str(b.question, 2000), answer: str(b.answer, 4000), reason: str(b.reason, 500) || "Marked wrong by a user", at: now(), status: "Open" };
      reviews.unshift(r);
      store.save("reviews", reviews);
      return [201, r];
    }],
    ["PATCH", /^\/api\/reviews\/([A-Z0-9-]+)$/, (b, [, id]) => {
      const r = reviews.find((x) => x.id === id);
      if (!r) fail(404, "Not found.");
      r.status = "Resolved";
      r.resolution = str(b.resolution, 1000) || "Resolved";
      r.resolvedAt = now();
      store.save("reviews", reviews);
      return r;
    }],

    // Local (formation) orders
    ["POST", /^\/api\/local-orders$/, (b) => {
      const title = str(b.title, 160);
      const text = str(b.text, 2000);
      const effective = str(b.effective, 10) || now().slice(0, 10);
      if (!title || !text) fail(400, "A local order needs a title and its text.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effective)) fail(400, "Effective date must be a date.");
      const coCeiling = b.coCeiling === "" || b.coCeiling == null ? null : Number(b.coCeiling);
      if (coCeiling != null && !(coCeiling > 0)) fail(400, "The CO ceiling must be a positive amount.");
      const order = { id: `LO-${String(localOrders.length + 1).padStart(3, "0")}`, title, text, effective, ref: str(b.ref, 120) || null, coCeiling, addedAt: now() };
      localOrders.push(order);
      store.save("local-orders", localOrders);
      return [201, order];
    }],
  ];

  // Returns { status, body } and never throws.
  function handle(method, pathname, body = {}) {
    for (const [m, re, fn] of routes) {
      if (m !== method) continue;
      const match = pathname.match(re);
      if (!match) continue;
      try {
        const out = fn(body || {}, match);
        return Array.isArray(out) && typeof out[0] === "number" ? { status: out[0], body: out[1] } : { status: 200, body: out };
      } catch (err) {
        if (err instanceof ApiError) return { status: err.status, body: { error: err.message } };
        return { status: 500, body: { error: err?.message || "Something went wrong." } };
      }
    }
    return { status: 404, body: { error: "No such API route." } };
  }

  return { handle, engine };
}
