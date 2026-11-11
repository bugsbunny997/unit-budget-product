// Rule engine: the item rulebook classifier, retrieval over the rule library,
// the purchase-route calculator and the answer composer. Everything is
// deterministic and offline. Every answer carries the IDs of the entries it rests on.

const STOP = new Set(
  ("a an the of to for and or in on at is are be can i we my our it this that with what how do does " +
   "which who when need want get under by as from me you your should would could will there their " +
   "about any some much many if so than then also just only into out up down please tell know")
    .split(" ")
);

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/₹/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

// Indian amounts: "₹3.5 lakh", "3 lakhs", "1.2 crore", "2 cr", "50k", "Rs 50,000", "75000"
export function parseAmount(text) {
  const s = String(text || "").toLowerCase().replace(/,/g, "");
  const unit = s.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|lakh|l\b|crores?|cr\b|k\b|thousand)/);
  if (unit) {
    const n = parseFloat(unit[1]);
    const u = unit[2];
    if (u.startsWith("cr")) return Math.round(n * 1e7);
    if (u.startsWith("l")) return Math.round(n * 1e5);
    return Math.round(n * 1e3);
  }
  const plain = s.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/) || s.match(/\b(\d{4,9})\b/);
  if (plain) {
    const n = parseFloat(plain[1]);
    if (!/₹|rs|inr/.test(plain[0]) && n >= 1900 && n <= 2100) return null; // a year, not an amount
    return Math.round(n);
  }
  return null;
}

export const inr = (n) =>
  n == null ? "no limit" : "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n));

export function shortInr(n) {
  if (n == null) return "no limit";
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} lakh`;
  return inr(n);
}

// ---- Item classifier helpers ------------------------------------------------
function singular(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (/(ss|us|is)$/.test(w)) return w;
  if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}
export const words = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/₹/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(singular);

function lev1(a, b) {
  // true when edit distance <= 1
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}
const wordEq = (q, k) => q === k || (k.length >= 5 && q.length >= 5 && lev1(q, k));

const NONPUBLIC_RE = /\b(officers?'?s? ?mess|jcos?'?s? ?mess|mess|club|institute|canteen|regimental fund|unit fund)\b/i;
const PUBLIC_RE = /\b(office|offices|orderly room|barrack|barracks|lines|cookhouse|langar|classroom|model room|training area|workshop|quarter guard|guard room|company|headquarters|hq|store room|troops)\b/i;
export function detectWhere(text) {
  if (NONPUBLIC_RE.test(text)) return "nonpublic";
  if (PUBLIC_RE.test(text)) return "public";
  return null;
}

const BUY_INTENT = /\b(can|may|could)\s+(i|we|the unit|my unit|our unit)\b|\b(buy|buying|purchase|purchasing|procure|procuring|get|order|acquire|need|want|allowed)\b/i;
const GREETING = /^\s*(hi|hello|hey|namaste|good (morning|afternoon|evening)|help|what can you do)\b/i;

function objectPhrase(q) {
  const m = String(q).match(/\b(?:buy|purchase|procure|get|order|acquire)\s+(?:a|an|the|some|new|few)?\s*([^?.,!]{2,60})/i);
  if (!m) return null;
  return m[1].replace(/(^|\s+)(for|from|worth|costing|at|of|in|on|under|with|around|about)\b.*$/i, "").trim() || null;
}

export function createEngine({ rules, items, learn, getLocalOrders }) {
  const entryById = new Map(rules.entries.map((e) => [e.id, e]));
  const itemById = new Map(items.items.map((i) => [i.id, i]));
  const groupById = new Map(items.groups.map((g) => [g.id, g]));

  // Pre-index every alias of every item type.
  const index = [];
  for (const it of items.items) {
    for (const a of new Set([it.name, ...it.aliases])) {
      const kw = words(a);
      if (kw.length) index.push({ item: it, kw, joined: kw.join("") });
    }
  }

  function allEntries() {
    const orders = (getLocalOrders() || []).map((o) => ({
      id: o.id,
      doc: "LOCAL",
      version: `Local order, effective ${o.effective}`,
      ref: o.ref || o.id,
      title: o.title,
      text: o.text,
      keywords: tokenize(o.title),
      status: "local",
      effective: o.effective,
      coCeiling: o.coCeiling ?? null,
    }));
    return [...rules.entries, ...orders];
  }

  function getEntry(id) {
    return entryById.get(id) || allEntries().find((e) => e.id === id) || null;
  }

  // ---- Classify free text into an item type --------------------------------
  // Returns { status: "match" | "ambiguous" | "none", item, candidates, phrase }
  function classify(text) {
    const qw = words(text);
    const found = [];
    for (const e of index) {
      const n = e.kw.length;
      for (let i = 0; i < qw.length; i++) {
        let ok = i + n <= qw.length;
        for (let k = 0; ok && k < n; k++) ok = wordEq(qw[i + k], e.kw[k]);
        if (ok) found.push({ item: e.item, start: i, end: i + n, len: e.joined.length });
        else if (n > 1 && wordEq(qw[i], e.joined)) found.push({ item: e.item, start: i, end: i + 1, len: e.joined.length });
      }
    }
    // Drop a match whose words sit inside a longer, more specific match ("printer" inside "3d printer").
    let kept = found.filter((m) =>
      !found.some((o) => o !== m && o.item !== m.item && o.start <= m.start && o.end >= m.end && (o.end - o.start > m.end - m.start || o.len > m.len))
    );
    // Words after "for" describe the purpose ("a bus for the sports meet"), not the item,
    // unless nothing was named before it ("for the gym, some weights").
    const forAt = qw.indexOf("for", 1);
    if (forAt > 0 && kept.some((m) => m.start < forAt)) kept = kept.filter((m) => m.start < forAt);
    const best = new Map();
    for (const m of kept) best.set(m.item.id, Math.max(best.get(m.item.id) || 0, m.len));
    const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ item: itemById.get(id), score }));
    if (!ranked.length) return { status: "none", item: null, candidates: [], phrase: objectPhrase(text) };
    // Two different item types named in one message ("a fridge and an AC") is a real question: ask which first.
    if (ranked.length === 1) return { status: "match", item: ranked[0].item, candidates: [] };
    return { status: "ambiguous", item: null, candidates: ranked.slice(0, 4).map((r) => r.item) };
  }

  // Kept for callers that only want the best item.
  function matchItem(text) {
    const c = classify(text);
    return c.status === "match" ? c.item : c.status === "ambiguous" ? c.candidates[0] : null;
  }

  // ---- BM25 retrieval over the rule library ----------------------------------
  function buildDocs() {
    const docs = allEntries().map((e) => ({
      kind: "rule",
      id: e.id,
      cites: [e.id],
      tokens: [...tokenize(e.title), ...tokenize(e.title), ...tokenize(e.text), ...tokenize((e.keywords || []).join(" ")), ...tokenize((e.keywords || []).join(" "))],
      ref: e,
    }));
    for (const l of learn) {
      docs.push({ kind: "learn", id: l.id, cites: l.cites, tokens: [...tokenize(l.title), ...tokenize(l.title), ...tokenize(l.text)], ref: l });
    }
    return docs;
  }

  function search(query, k = 5) {
    const q = [...new Set(tokenize(query))];
    if (!q.length) return [];
    const docs = buildDocs();
    const N = docs.length;
    const avg = docs.reduce((a, d) => a + d.tokens.length, 0) / N;
    const df = new Map();
    for (const d of docs) for (const t of new Set(d.tokens)) df.set(t, (df.get(t) || 0) + 1);
    const k1 = 1.4, b = 0.75;
    const scored = docs.map((d) => {
      const tf = new Map();
      for (const t of d.tokens) tf.set(t, (tf.get(t) || 0) + 1);
      let score = 0, matched = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        matched++;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.tokens.length) / avg)));
      }
      return { ...d, score, coverage: matched / q.length };
    });
    return scored.filter((d) => d.score > 0).sort((a, b2) => b2.score - a.score).slice(0, k);
  }

  // ---- Route calculation -------------------------------------------------------
  function effectiveLadder() {
    const ladder = rules.params.sanctionLadder.levels.map((l) => ({ ...l }));
    const today = new Date().toISOString().slice(0, 10);
    let localOrder = null;
    for (const o of (getLocalOrders() || []).filter((o) => o.coCeiling != null && o.effective <= today)) {
      if (o.coCeiling < ladder[0].ceiling) {
        ladder[0].ceiling = o.coCeiling;
        localOrder = o;
      }
    }
    return { ladder, localOrder };
  }

  function computeRoute({ value, onGeM = false, proprietary = false }) {
    const P = rules.params;
    const v = Math.max(0, Number(value) || 0);
    const bands = P.gfrBands;
    const cites = new Set();
    const warnings = [];

    let mode;
    if (proprietary) {
      mode = { key: "single", label: "Single tender (proprietary item)", ruleId: "GFR-166" };
      cites.add("GFR-166").add("DPM-CNC");
    } else if (v <= bands.noQuotationMax) {
      mode = { key: "noquote", label: "Purchase without quotation", ruleId: "GFR-154" };
    } else if (v <= bands.committeeMax) {
      mode = { key: "committee", label: "Local purchase committee (three members)", ruleId: "GFR-155" };
    } else if (v <= bands.lteMax) {
      mode = { key: "lte", label: "Limited Tender Enquiry", ruleId: "GFR-162" };
      cites.add("DPM-TPC");
    } else {
      mode = { key: "ate", label: "Advertised (open) Tender Enquiry", ruleId: "GFR-161" };
      cites.add("DPM-TPC");
    }
    cites.add(mode.ruleId);

    const gem = onGeM
      ? { listed: true, text: "Listed on GeM: buy through GeM. The GeM buying mode depends on the value." }
      : { listed: false, text: "Check GeM first. If the item is listed there, buy through GeM and record it; if not, record that it was not available." };
    cites.add("GFR-149");

    const { ladder, localOrder } = effectiveLadder();
    const level = ladder.find((l) => l.ceiling == null || v <= l.ceiling);
    const sanction = {
      level: level.level,
      ceiling: level.ceiling,
      ruleId: "DFPDS-LADDER",
      status: P.sanctionLadder.status,
      localOrderId: localOrder && level === ladder[0] ? localOrder.id : null,
      beyondUnit: level !== ladder[0],
    };
    cites.add("DFPDS-LADDER");
    if (localOrder) {
      cites.add(localOrder.id);
      warnings.push(`A local order (${localOrder.title}) limits the Commanding Officer to ${shortInr(localOrder.coCeiling)}.`);
    }
    if (sanction.beyondUnit) {
      warnings.push(`This is above the Commanding Officer's ceiling. Put the case up, complete, to the ${level.level}.`);
    }

    const ifa = { needed: v > P.ifa.threshold, threshold: P.ifa.threshold, ruleId: "DFPDS-IFA", status: P.ifa.status };
    cites.add("DFPDS-IFA");

    cites.add("GFR-157");
    if (v > bands.noQuotationMax * 0.8 && v <= bands.noQuotationMax) {
      warnings.push("You are close to the without-quotation limit. If this is part of a larger need, judge it at the combined value.");
    }
    if (v > bands.committeeMax * 0.85 && v <= bands.committeeMax) {
      warnings.push("You are close to the purchase-committee limit. Do not split related requirements to stay under it.");
    }

    const steps = buildSteps(mode.key, { onGeM, sanction, ifa });
    cites.add("DPM-FLOW").add("DPM-INSPECT").add("PRAC-CDA");

    return {
      value: v,
      mode,
      gem,
      sanction,
      ifa,
      warnings,
      steps,
      citations: [...cites],
      basis: {
        bands: `${bands.basis} (status: ${bands.status})`,
        ladder: `${P.sanctionLadder.basis} (status: ${P.sanctionLadder.status})`,
        ifa: `${P.ifa.basis} (status: ${P.ifa.status})`,
      },
    };
  }

  function buildSteps(key, { onGeM, sanction, ifa }) {
    const s = [];
    s.push({ text: "Confirm the item is authorised to the unit and locally procurable", cite: "PRAC-AUTH" });
    s.push({ text: onGeM ? "Select the item on GeM and save the listing" : "Check GeM and record whether the item is listed", cite: "GFR-149" });
    s.push({ text: "Write the statement of case: what, why, quantity, indicative cost, budget head", cite: "DPM-FLOW" });
    if (key === "committee") s.push({ text: "Get the purchase committee constituted by the competent authority", cite: "GFR-155" });
    if (key === "lte") s.push({ text: "Issue the enquiry to registered suppliers and receive bids", cite: "GFR-162" });
    if (key === "ate") s.push({ text: "Publish the tender on the procurement portal and receive bids", cite: "GFR-161" });
    if (key === "single") s.push({ text: "Record the proprietary article certificate and the reason for single tender", cite: "GFR-166" });
    if (key === "lte" || key === "ate") s.push({ text: "Tender Purchase Committee prepares the comparative statement", cite: "DPM-TPC" });
    if (key === "single") s.push({ text: "Contract Negotiation Committee negotiates and records the price basis", cite: "DPM-CNC" });
    if (key === "committee") s.push({ text: "Committee surveys the market and signs the joint certificate", cite: "GFR-155" });
    if (key === "noquote") s.push({ text: "Record the certificate of quality, reliable supplier and reasonable price", cite: "GFR-154" });
    if (ifa.needed) s.push({ text: "Obtain IFA concurrence before sanction", cite: "DFPDS-IFA" });
    s.push({ text: `Obtain sanction from the ${sanction.level}`, cite: "DFPDS-LADDER" });
    s.push({ text: "Place the supply order", cite: "DPM-FLOW" });
    s.push({ text: "Receive, inspect and take the stores on charge", cite: "DPM-INSPECT" });
    s.push({ text: "Send the bill with sanction, order, receipt and inspection papers", cite: "PRAC-CDA" });
    return s;
  }

  // ---- One structured check, shared by Ask and "Can I buy it?" -----------------
  // Input: { text, value, itemId, group, where, onGeM, proprietary }
  // Output: { status, item, candidates, groups, phrase, where, needsWhere, blocked, nonPublic, route }
  function check({ text = "", value = null, itemId = null, group = null, where = null, onGeM = false, proprietary = false }) {
    let item = itemId ? itemById.get(itemId) || null : null;
    if (!item && group && groupById.has(group)) item = itemById.get(groupById.get(group).generic);
    let status = item ? "match" : "none";
    let candidates = [];
    let phrase = null;
    if (!item && text) {
      const c = classify(text);
      status = c.status;
      item = c.item;
      candidates = c.candidates;
      phrase = c.phrase;
    }
    const w = where || detectWhere(text);
    const out = { status, item, candidates, phrase, where: w, groups: items.groups.map((g) => ({ id: g.id, label: g.label })) };
    if (!item) return out;
    out.blocked = ["central", "restricted", "out-of-scope"].includes(item.source);
    out.nonPublic = w === "nonpublic";
    out.needsWhere = Boolean(item.askWhere) && !w && !out.blocked;
    if (!out.blocked && !out.nonPublic && !out.needsWhere && value > 0) {
      out.route = computeRoute({ value, onGeM, proprietary });
    }
    return out;
  }

  // ---- Answer composer (Ask) -----------------------------------------------------
  function itemBlock(item) {
    const lines = [
      `**${item.name}** (item rulebook, sample data)`,
      `- **Authorised?** ${item.authorised} [PRAC-AUTH]`,
      `- **How it reaches the unit:** ${item.sourceText} [PRAC-CENTRAL]`,
      `- **Budget head:** ${item.head} [PRAC-HEADS]`,
      `- **DFPDS schedule item:** ${item.schedule} [DFPDS-LADDER]`,
    ];
    for (const c of item.cautions || []) lines.push(`- ${c}`);
    return lines.join("\n");
  }

  function routeBlock(r) {
    const lines = [
      `**Route for an indicative ${shortInr(r.value)}**`,
      `- **Mode:** ${r.mode.label} [${r.mode.ruleId}]`,
      `- **GeM:** ${r.gem.text} [GFR-149]`,
      `- **Who sanctions:** ${r.sanction.level}${r.sanction.ceiling ? ` (sample ceiling ${shortInr(r.sanction.ceiling)})` : ""} [DFPDS-LADDER]${r.sanction.localOrderId ? ` [${r.sanction.localOrderId}]` : ""}`,
      `- **IFA concurrence:** ${r.ifa.needed ? "Needed" : "Not needed"} at this value (sample threshold ${shortInr(r.ifa.threshold)}) [DFPDS-IFA]`,
      `- **Do not split** related requirements to stay under a limit [GFR-157]`,
    ];
    for (const w of r.warnings) lines.push(`- ${w}`);
    lines.push("", "**Steps**");
    r.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.text} [${s.cite}]`));
    return lines.join("\n");
  }

  const ITEM_CITES = ["PRAC-AUTH", "PRAC-CENTRAL", "PRAC-HEADS", "DFPDS-LADDER"];
  const uniq = (a) => [...new Set(a)];

  // compose(question, { choice, context })
  //   choice:  { itemId } | { group } | { itemId, where }   (a button the user picked)
  //   context: { itemId, amount, where, question }          (carried from the previous answer)
  function compose(question, { choice = null, context = null } = {}) {
    const q = String(question || "").trim();
    if (!q && !choice) return null;
    const ctx = context || {};

    if (!choice && GREETING.test(q) && q.length < 40) {
      return {
        kind: "help",
        text:
          "Tell me what you want to buy, in plain words. I'll find the item type in the rulebook, say whether it's authorised and how it's bought, and show the source for every line.\n\n" +
          "Try:\n- Can I buy a sofa set for the office?\n- Can I buy a projector for ₹3 lakh?\n- Who sanctions a ₹30 lakh purchase?\n- What counts as splitting a demand?",
        citations: [],
      };
    }

    // Which item are we talking about?
    let itemId = choice?.itemId || null;
    let group = choice?.group || null;
    let followUp = Boolean(choice);
    const ownClass = !itemId && !group ? classify(q) : null;

    if (ownClass?.status === "ambiguous") {
      return {
        kind: "clarify",
        text: "That could be more than one kind of item in the rulebook. Which one do you mean?",
        options: ownClass.candidates.map((c) => ({ label: c.name, choice: { itemId: c.id } })),
        citations: [],
        context: { question: q, amount: parseAmount(q), where: detectWhere(q) },
      };
    }
    if (ownClass?.status === "match") itemId = ownClass.item.id;

    // A follow-up with no item of its own ("about 80,000", "it's for the office") keeps the last item.
    const amountHere = parseAmount(q);
    const whereHere = detectWhere(q);
    const FILLER = new Set(["about", "around", "approx", "approximately", "roughly", "nearly", "maybe", "rs", "inr", "lakh", "lakhs", "lac", "crore", "cr", "thousand", "k", "only", "cost", "costs", "price", "value", "worth", "its", "it", "will", "be"]);
    const meaningful = tokenize(q).filter((t) => t.length > 1 && !/^\d/.test(t) && !FILLER.has(t));
    const looksLikeFollowUp = !BUY_INTENT.test(q) && !/\b(who|sanction|ifa|gem|split|tender|committee|rule|manual)\b/i.test(q) && meaningful.length <= 3;
    if (!itemId && !group && ctx.itemId && looksLikeFollowUp && (amountHere != null || whereHere)) {
      itemId = ctx.itemId;
      followUp = true;
    }

    const amount = amountHere ?? (followUp ? ctx.amount ?? null : null);
    const where = choice?.where || whereHere || (followUp ? ctx.where ?? null : null);
    const lower = q.toLowerCase();
    const onGeM = /\bgem\b/.test(lower) && !/not on gem|isn't on gem|not listed/.test(lower);
    const proprietary = /proprietary|only one (maker|firm|vendor)|single (vendor|source)/.test(lower);

    if (!itemId && !group) {
      // No item. A pure value question still gets a route; a rules question gets a passage;
      // a buying question we can't place gets the group picker.
      // A value with no item named ("who sanctions ₹30 lakh?") gets a route. A value with an
      // item we can't place ("a zorb ball for 60k") asks for the item's group first.
      if (amountHere != null && BUY_INTENT.test(q) && !ownClass?.phrase) {
        const route = computeRoute({ value: amountHere, onGeM, proprietary });
        return {
          kind: "route",
          route,
          text: routeBlock(route) + "\n\nTell me what the item is and I'll also check whether it's authorised and which head it falls under.",
          citations: uniq([...route.citations, "PRAC-AUTH"]),
          context: { amount: amountHere, where: whereHere, question: q },
        };
      }
      const hits = search(q, 3);
      const top = hits[0];
      if (top && top.score >= 2.2 && top.coverage >= 0.34) {
        const blocks = [];
        const cites = new Set();
        const used = [top];
        if (hits[1] && hits[1].score >= top.score * 0.8 && hits[1].coverage >= 0.34) used.push(hits[1]);
        for (const h of used) {
          if (h.kind === "rule") {
            blocks.push(`**${h.ref.title}**\n${h.ref.text} [${h.ref.id}]`);
            cites.add(h.ref.id);
          } else {
            blocks.push(`**${h.ref.title}**\n${h.ref.text} ${h.ref.cites.map((c) => `[${c}]`).join(" ")}`);
            h.ref.cites.forEach((c) => cites.add(c));
          }
        }
        return { kind: "passage", text: blocks.join("\n\n"), citations: [...cites] };
      }
      if (BUY_INTENT.test(q)) {
        const phrase = ownClass?.phrase;
        return {
          kind: "clarify",
          text: `I couldn't find ${phrase ? `“${phrase}”` : "that item"} in the item rulebook, so I won't guess what rules apply. Which group is it closest to?`,
          options: items.groups.map((g) => ({ label: g.label, choice: { group: g.id } })),
          citations: [],
          context: { question: q, amount: amountHere, where: whereHere },
          unmatched: phrase || q,
        };
      }
      return {
        kind: "unknown",
        text:
          "The rule library doesn't cover that, so I won't guess.\n\n" +
          "Ask your unit accounts clerk, the formation's finance staff or the IFA. " +
          "I've added the question to the review queue, without your name, so the rule custodian can fill the gap.",
        citations: [],
      };
    }

    const r = check({ itemId, group, value: amount, where, onGeM, proprietary });
    const item = r.item;
    const nextCtx = { itemId: item.id, amount, where: r.where, question: ctx.question && followUp ? ctx.question : q };
    const picked = group ? `Treating it as **${item.name}**, the closest item type in the rulebook.\n\n` : "";

    if (r.blocked) {
      return {
        kind: "item",
        item,
        text: picked + itemBlock(item) + "\n\nThis is not a normal local purchase, so there's no purchase route to work out.",
        citations: uniq([...item.cites, ...ITEM_CITES]),
        context: nextCtx,
      };
    }

    if (r.nonPublic) {
      return {
        kind: "item",
        item,
        text:
          picked +
          `**${item.name}** for a mess, club or unit institute\n` +
          "Messes, clubs and institutes usually buy these from their own regimental fund, under that fund's rules, not from public money. So there's no GFR purchase route to work out here. [PRAC-NONPUBLIC]\n\n" +
          "If it's actually for an office, barracks or training area, say so and I'll work out the public-fund route.",
        options: [{ label: "It's for an office or barracks", choice: { itemId: item.id, where: "public" } }],
        citations: ["PRAC-NONPUBLIC", "PRAC-SCOPE"],
        context: nextCtx,
      };
    }

    if (r.needsWhere) {
      return {
        kind: "clarify",
        item,
        text:
          picked + itemBlock(item) +
          "\n\n**One question first: where is it for?** That decides which money pays for it. [PRAC-NONPUBLIC]",
        options: [
          { label: "An office, barracks or training area", choice: { itemId: item.id, where: "public" } },
          { label: "Officers' or JCOs' mess, club or institute", choice: { itemId: item.id, where: "nonpublic" } },
        ],
        citations: uniq([...item.cites, ...ITEM_CITES, "PRAC-NONPUBLIC"]),
        context: nextCtx,
      };
    }

    if (r.route) {
      return {
        kind: "route",
        item,
        route: r.route,
        text: picked + itemBlock(item) + "\n\n" + routeBlock(r.route),
        citations: uniq([...item.cites, ...r.route.citations, ...ITEM_CITES]),
        context: nextCtx,
      };
    }

    return {
      kind: "item",
      item,
      text: picked + itemBlock(item) + "\n\n**What's the indicative value?** Tell me roughly what it will cost (for example, “about 80,000”) and I'll work out the purchase route and who sanctions it.",
      citations: uniq([...item.cites, ...ITEM_CITES]),
      context: nextCtx,
      askValue: true,
    };
  }

  return { search, classify, matchItem, check, computeRoute, compose, getEntry, allEntries, groups: items.groups, itemById };
}
