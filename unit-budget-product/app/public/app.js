// Kosh POC frontend. Plain modules, no build step.

const ROLES = [
  { id: "CO", label: "Commanding Officer" },
  { id: "2IC", label: "Second-in-Command" },
  { id: "ADJT", label: "Adjutant" },
  { id: "QM", label: "Quartermaster" },
  { id: "COY", label: "Company Commander" },
  { id: "CLERK", label: "Accounts Clerk" },
  { id: "JCO", label: "JCO / Other Rank" },
  { id: "CUST", label: "Rule Custodian" },
];

const ICON = {
  today: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
  finder: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  notes: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  ideas: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  funds: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  handover: '<path d="M7 4h10v4H7z"/><path d="M5 8h14v12H5z"/><path d="M9 13h6M9 16h4"/>',
  rules: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  learn: '<path d="m3 9 9-5 9 5-9 5z"/><path d="M7 11.5V16c3 2 7 2 10 0v-4.5"/>',
  review: '<path d="M4 4h16v12H4z"/><path d="M4 16l4 4h8l4-4"/><path d="m9 10 2 2 4-4"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const NAV = [
  { group: null, items: [["today", "Today"], ["ask", "Ask"]] },
  { group: "Buy", items: [["finder", "Can I buy it?"], ["notes", "Purchase notes"]] },
  { group: "Unit", items: [["ideas", "Ideas"], ["funds", "Funds", "v2"], ["handover", "Handover", "v2"]] },
  { group: "Reference", items: [["rules", "Rule library"], ["learn", "Learn"], ["review", "Review queue"]] },
];
const TITLES = { today: "Today", ask: "Ask", finder: "Can I buy it?", notes: "Purchase notes", ideas: "Ideas", funds: "Funds", handover: "Handover", rules: "Rule library", learn: "Learn", review: "Review queue" };

const S = {
  boot: null,
  role: safeGet("kosh-role") || "QM",
  chat: [],
  notes: [],
  ideas: [],
  reviews: [],
  finder: { q: "", value: "", onGeM: false, proprietary: false, result: null },
  prefill: null,
  ideaFilter: "All",
  freshNote: null,
};

// ---------- utilities ----------
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => (n == null ? "No limit" : "₹" + new Intl.NumberFormat("en-IN").format(Math.round(n)));
function short(n) {
  if (n == null) return "No limit";
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} lakh`;
  return inr(n);
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;

// Static demo (GitHub Pages): no server. The same API module runs in the browser,
// and anything people enter is kept in this browser's storage only.
let staticApi = null;
async function apiStatic(path, opts) {
  staticApi ||= (async () => {
    const { createApi } = await import("./lib/api.js");
    const load = (f) => fetch(`./data/${f}`).then((r) => r.json());
    const [rules, items, sample] = await Promise.all([load("rules.json"), load("items.json"), load("sample.json")]);
    const store = {
      load(name, fallback) {
        try { const v = localStorage.getItem(`kosh-demo-${name}`); return v ? JSON.parse(v) : structuredClone(fallback); }
        catch { return structuredClone(fallback); }
      },
      save(name, data) { try { localStorage.setItem(`kosh-demo-${name}`, JSON.stringify(data)); } catch { /* storage unavailable */ } },
    };
    return createApi({ rules, items, sample, store });
  })();
  const { status, body } = (await staticApi).handle(opts.method || "GET", path, opts.body || {});
  if (status >= 400) throw new Error(body.error || `Request failed (${status})`);
  return structuredClone(body);
}

async function api(path, opts = {}) {
  if (window.KOSH_STATIC) return apiStatic(path, opts);
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function entry(id) { return S.boot.rules.entries.find((e) => e.id === id); }

const STATUS = {
  reported: ["warn", "Reported"],
  illustrative: ["", "Illustrative"],
  "to-verify": ["warn", "To verify"],
  verified: ["ok", "Verified"],
  local: ["accent", "Local order"],
};
function statusPill(s) {
  const [cls, label] = STATUS[s] || ["", s];
  return `<span class="pill ${cls}"><span class="dot"></span>${esc(label)}</span>`;
}

function citeChip(id) {
  const e = entry(id);
  if (!e) {
    const calc = id === "ROUTE-CALC" || id.startsWith("ITEM-");
    return `<span class="cite missing" title="${calc ? "Worked out by Kosh from the cited rules and the sample catalogue" : "Not in the library"}">${esc(calc ? (id === "ROUTE-CALC" ? "Route calculator" : "Catalogue") : id)}</span>`;
  }
  return `<button type="button" class="cite" data-cite="${esc(id)}" aria-label="Source: ${esc(e.doc)} ${esc(e.ref)}, ${esc(e.title)}">${esc(id)}</button>`;
}

// Minimal markdown: paragraphs, **bold**, "- " lists, "1. " lists, [CITE] chips.
function md(text) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n{2,}/);
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([A-Z][A-Z0-9-]*)\]/g, (_, id) => citeChip(id));
  return blocks
    .map((b) => {
      const lines = b.split("\n").filter((l) => l.trim() !== "");
      let html = "";
      let list = null;
      const flush = () => { if (list) { html += `<${list.tag}>${list.items.join("")}</${list.tag}>`; list = null; } };
      for (const l of lines) {
        const ul = l.match(/^\s*[-•]\s+(.*)$/);
        const ol = l.match(/^\s*\d+[.)]\s+(.*)$/);
        if (ul || ol) {
          const tag = ul ? "ul" : "ol";
          if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; }
          list.items.push(`<li>${inline((ul || ol)[1])}</li>`);
        } else {
          flush();
          html += `<p>${inline(l)}</p>`;
        }
      }
      flush();
      return html;
    })
    .join("");
}

// ---------- shell ----------
function renderNav() {
  const route = currentRoute().name;
  const openNotes = S.notes.filter((n) => !["Closed", "Cancelled"].includes(n.status)).length;
  const openIdeas = S.ideas.filter((i) => i.status === "Open").length;
  const openReviews = S.reviews.filter((r) => r.status === "Open").length;
  const badges = { notes: openNotes, ideas: openIdeas, review: openReviews };
  $("#nav").innerHTML = NAV.map(
    (g) => `<div class="nav-group">${g.group ? `<div class="nav-heading">${g.group}</div>` : ""}${g.items
      .map(([k, label, tag]) => `<a class="nav-link" href="#/${k}" ${route === k ? 'aria-current="page"' : ""}>${icon(k)}<span>${label}</span>${
        tag ? `<span class="nav-tag" title="Version 2 preview with sample figures">${tag}</span>` : badges[k] ? `<span class="nav-badge" aria-label="${badges[k]} open">${badges[k]}</span>` : ""
      }</a>`)
      .join("")}</div>`
  ).join("");
}

function renderShell() {
  $("#rolePicker").innerHTML = ROLES.map((r) => `<option value="${r.id}" ${r.id === S.role ? "selected" : ""}>${r.label}</option>`).join("");
  const pill = $("#modePill");
  pill.textContent = "Rulebook";
  pill.title = "Answers come from the rule library and item rulebook. No AI is used.";
}

function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { name: TITLES[parts[0]] ? parts[0] : "today", arg: parts[1] ? decodeURIComponent(parts[1]) : null };
}

function setSidebar(open) {
  $("#sidebar").classList.toggle("open", open);
  $("#scrim").hidden = !open;
  $("#menuBtn").setAttribute("aria-expanded", String(open));
}

async function render() {
  const { name, arg } = currentRoute();
  setSidebar(false);
  renderNav();
  $("#toolbarTitle").textContent = name === "notes" && arg ? (arg === "new" ? "New purchase note" : arg) : TITLES[name];
  document.title = `${TITLES[name]} · Kosh`;
  const view = $("#view");
  const fn = VIEWS[name];
  try {
    view.innerHTML = await fn(arg);
    WIRES[name]?.(arg);
  } catch (err) {
    view.innerHTML = `<div class="card"><h3>Couldn't load this page</h3><p class="muted">${esc(err.message)}</p><button class="btn" onclick="location.reload()">Reload</button></div>`;
  }
  if (!render.first) view.focus({ preventScroll: true });
  render.first = false;
  window.scrollTo(0, 0);
}
render.first = true;

// ---------- views ----------
const VIEWS = {};
const WIRES = {};

// Today
VIEWS.today = () => {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const open = S.notes.filter((n) => !["Closed", "Cancelled"].includes(n.status));
  const ideasOpen = S.ideas.filter((i) => i.status === "Open");
  const unverified = S.boot.rules.entries.filter((e) => e.status !== "verified").length;
  const roleHint = {
    CO: "Ideas from your unit are waiting for a decision, and every case shows the rule it relies on.",
    QM: "Check an item, work out its route and raise a purchase note.",
    CLERK: "Every note shows its route and steps, so cases go up complete.",
    JCO: "Put an idea in the box. You'll see what happens to it.",
    CUST: "Questions the rulebook couldn't answer are in the review queue.",
  }[S.role] || "Ask a question, check an item, or raise a purchase note.";

  return `
  <h1 class="large-title">${greet}</h1>
  <p class="subtitle">Viewing as ${esc(roleLabel(S.role))}. ${roleHint}</p>
  <form class="ask-hero" id="heroAsk" role="search">
    <input id="heroInput" type="text" placeholder="Ask about buying for the unit, e.g. who sanctions ₹8 lakh?" aria-label="Ask a question" autocomplete="off">
    <button class="btn primary" type="submit">Ask</button>
  </form>
  <div class="grid grid-3">
    <a class="card" href="#/finder" style="text-decoration:none;color:inherit">
      <div class="eyebrow">Plan a purchase</div>
      <h3 style="margin-top:6px">Can I buy it?</h3>
      <p class="muted small" style="margin:0">Type an item and a value. See if it's authorised, the route, who sanctions it and the steps.</p>
    </a>
    <a class="card" href="#/notes" style="text-decoration:none;color:inherit">
      <div class="eyebrow">Purchase notes in progress</div>
      <div class="stat" style="margin-top:6px">${open.length}</div>
      <p class="muted small" style="margin:0">${open.length ? esc(open.slice(0, 2).map((n) => `${n.id}: ${n.item}`).join(" · ")) : "None yet. Raise one from Can I buy it?"}</p>
    </a>
    <a class="card" href="#/ideas" style="text-decoration:none;color:inherit">
      <div class="eyebrow">Ideas waiting for a decision</div>
      <div class="stat" style="margin-top:6px">${ideasOpen.length}</div>
      <p class="muted small" style="margin:0">${ideasOpen.length ? esc(ideasOpen[0].title) : "No open ideas."}</p>
    </a>
  </div>
  <div class="grid grid-2" style="margin-top:16px">
    <section class="card" aria-labelledby="comingUp">
      <h3 id="comingUp">Coming up</h3>
      ${S.boot.obligations
        .map((o) => {
          const d = new Date(o.date);
          return `<div class="doc-row" style="justify-content:flex-start;gap:14px"><div class="date-chip"><b>${d.getDate()}</b><span>${d.toLocaleDateString("en-IN", { month: "short" })}</span></div><div><div>${esc(o.title)}</div><div class="small muted">${esc(o.note)}</div></div></div>`;
        })
        .join("")}
    </section>
    <section class="card" aria-labelledby="libState">
      <h3 id="libState">Rule library</h3>
      ${S.boot.rules.documents
        .map((d) => `<div class="doc-row"><div><div style="font-weight:600">${esc(d.id === "PRACTICE" ? "Unit practice" : d.id)}</div><div class="small muted">${esc(d.version)}</div></div>${statusPill(d.status)}</div>`)
        .join("")}
      <p class="small muted" style="margin:10px 0 0">${unverified} of ${S.boot.rules.entries.length} entries are not yet verified against the official text.</p>
    </section>
  </div>`;
};
WIRES.today = () => {
  $("#heroAsk").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#heroInput").value.trim();
    if (!q) return $("#heroInput").focus();
    S.pendingQuestion = q;
    location.hash = "#/ask";
  });
};

// Ask
const SUGGESTIONS = [
  "Can I buy a sofa set?",
  "Can I buy a projector for ₹3 lakh?",
  "Who sanctions a ₹30 lakh purchase?",
  "When do I need IFA concurrence?",
  "What counts as splitting a demand?",
  "Can we buy vehicle spares locally?",
  "Which manual applies to an RFP issued in October 2025?",
];

VIEWS.ask = () => {
  return `
  <div class="chat-wrap">
    <div class="chat-head">
      <span class="pill"><span class="dot"></span>Rulebook</span>
      <span>Answers come only from the rule library and item rulebook. No AI is used.</span>
      <span>Answers guide you; they are not a sanction.</span>
    </div>
    <div class="chat-log" id="chatLog" aria-live="polite"></div>
    <form class="composer" id="composer">
      <label for="chatInput" class="skip">Your question</label>
      <textarea id="chatInput" class="input" rows="1" placeholder="Ask about buying for the unit" autocomplete="off"></textarea>
      <button class="btn primary" type="submit" id="sendBtn">Ask</button>
    </form>
  </div>`;
};

function chatMessageHTML(m, i) {
  if (m.role === "user") return `<div class="msg user">${esc(m.content)}</div>`;
  if (m.pending) return `<div class="msg bot"><div class="bubble typing" aria-label="Looking it up"><i></i><i></i><i></i></div></div>`;
  const a = m.answer;
  const sources = a.citations?.length
    ? `<div class="sources"><span>Sources</span>${a.citations.map(citeChip).join("")}</div>`
    : "";
  const label = "From the rulebook";
  const actions = [];
  if (a.route) actions.push(`<button class="btn plain" data-act="note" data-i="${i}">Start a purchase note</button>`);
  if (a.kind !== "help") actions.push(`<button class="btn plain" data-act="flag" data-i="${i}" ${m.flagged ? "disabled" : ""}>${m.flagged ? "Flagged for review" : "Not right? Flag it"}</button>`);
  // Clarifying choices: only the latest answer's buttons are live.
  const live = i === S.chat.length - 1 && !S.asking;
  const opts = a.options?.length
    ? `<div class="answer-options" role="group" aria-label="Choose one">${a.options.map((o, k) => `<button class="suggestion" type="button" data-opt="${k}" data-i="${i}" ${live ? "" : "disabled"}>${esc(o.label)}</button>`).join("")}</div>`
    : "";
  return `<div class="msg bot">
    ${m.notice ? `<p class="msg-notice">${esc(m.notice)}</p>` : ""}
    <div class="bubble">${md(a.text)}${opts}${sources}</div>
    <div class="msg-meta"><span>${label}</span>${actions.join("")}</div>
  </div>`;
}

function renderChat() {
  const log = $("#chatLog");
  if (!log) return;
  if (!S.chat.length) {
    log.innerHTML = `<div class="chat-intro">
      <h2>Ask about buying for the unit</h2>
      <p>What you can buy, how to buy it, who sanctions it. Every answer shows its source, and if the library doesn't cover something, I'll say so rather than guess.</p>
      <div class="suggestions" style="justify-content:center">${SUGGESTIONS.map((s) => `<button class="suggestion" type="button" data-suggest="${esc(s)}">${esc(s)}</button>`).join("")}</div>
    </div>`;
  } else {
    log.innerHTML = S.chat.map(chatMessageHTML).join("");
  }
  log.scrollTop = log.scrollHeight;
}

async function sendQuestion(q, choice = null) {
  if (!q || S.asking) return;
  S.asking = true;
  S.chat.push({ role: "user", content: q });
  S.chat.push({ role: "assistant", pending: true });
  renderChat();
  const history = S.chat
    .filter((m) => !m.pending)
    .map((m) => (m.role === "user" ? { role: "user", content: m.content } : { role: "assistant", content: m.answer?.text || "" }));
  try {
    const r = await api("/api/ask", { method: "POST", body: { messages: history, role: S.role, choice, context: S.chatCtx || null } });
    const askedFor = choice ? S.chatCtx?.question || q : q;
    S.chat[S.chat.length - 1] = { role: "assistant", answer: r.answer, mode: r.mode, notice: r.notice, question: askedFor };
    if (r.answer.context) S.chatCtx = r.answer.context;
    if (r.answer.kind === "unknown" || r.answer.unmatched) refreshReviews();
  } catch (err) {
    S.chat[S.chat.length - 1] = { role: "assistant", answer: { kind: "help", text: `Couldn't get an answer: ${err.message}`, citations: [] }, mode: "rulebook" };
  }
  S.asking = false;
  renderChat();
  $("#chatInput")?.focus();
}

WIRES.ask = () => {
  renderChat();
  const input = $("#chatInput");
  const autosize = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; };
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#composer").requestSubmit(); }
  });
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return input.focus();
    input.value = "";
    autosize();
    sendQuestion(q);
  });
  $("#chatLog").addEventListener("click", async (e) => {
    const s = e.target.closest("[data-suggest]");
    if (s) return sendQuestion(s.dataset.suggest);
    const o = e.target.closest("[data-opt]");
    if (o && !o.disabled) {
      const opt = S.chat[Number(o.dataset.i)].answer.options[Number(o.dataset.opt)];
      return sendQuestion(opt.label, opt.choice);
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const m = S.chat[Number(b.dataset.i)];
    if (b.dataset.act === "note") {
      S.prefill = { item: m.answer.item?.name || m.question, itemId: m.answer.item?.id || null, value: m.answer.route.value, onGeM: m.answer.route.gem.listed };
      location.hash = "#/notes/new";
    } else if (b.dataset.act === "flag") {
      openFlagSheet(m);
    }
  });
  input.focus();
  if (S.pendingQuestion) {
    const q = S.pendingQuestion;
    S.pendingQuestion = null;
    sendQuestion(q);
  }
};

function openFlagSheet(m) {
  openSheet({
    title: "Flag this answer",
    body: `<p class="muted small" style="margin-top:0">The rule custodian sees flagged answers and fixes the library. Your name is not attached.</p>
      <div class="field"><label for="flagReason">What's wrong?</label><textarea id="flagReason" class="input" placeholder="For example: our formation's order sets a lower limit for the CO"></textarea></div>`,
    actions: [{ label: "Cancel" }, { label: "Send to review", primary: true, onClick: async () => {
      try {
        await api("/api/reviews", { method: "POST", body: { question: m.question, answer: m.answer.text, reason: $("#flagReason").value } });
        m.flagged = true;
        renderChat();
        refreshReviews();
        toast("Sent to the review queue");
        return true;
      } catch (err) { toast(err.message); return false; }
    } }],
  });
}

// Finder
VIEWS.finder = () => {
  const f = S.finder;
  return `
  <h1 class="large-title">Can I buy it?</h1>
  <p class="subtitle">Answers the four questions behind every purchase: is it authorised, how does it reach the unit, which budget head, who sanctions it. Then the route and the steps.</p>
  <div class="split">
    <form class="card" id="finderForm">
      <div class="field">
        <label for="fItem">What do you want to buy?</label>
        <input id="fItem" class="input" list="catalogue" value="${esc(f.q)}" placeholder="e.g. projector for the model room" autocomplete="off" required>
        <datalist id="catalogue">${S.boot.items.items.map((i) => `<option value="${esc(i.name)}">`).join("")}</datalist>
      </div>
      <div class="field">
        <label for="fValue">Indicative value</label>
        <div class="input-prefix"><span>₹</span><input id="fValue" class="input" inputmode="numeric" value="${esc(f.value)}" placeholder="350000"></div>
        <span class="hint" id="fValueHint">${f.value ? esc(short(Number(f.value))) : "An estimate is enough. Leave blank to check the item only."}</span>
      </div>
      <label class="check"><input type="checkbox" id="fGem" ${f.onGeM ? "checked" : ""}><span><span class="label">Listed on GeM</span><span class="hint">If it's on the Government e-Marketplace, buy there.</span></span></label>
      <label class="check"><input type="checkbox" id="fProp" ${f.proprietary ? "checked" : ""}><span><span class="label">Only one maker</span><span class="hint">A proprietary item, bought by single tender.</span></span></label>
      <div class="btn-row" style="margin-top:8px"><button class="btn primary" type="submit">Check</button></div>
    </form>
    <div id="finderResult">${f.result ? finderResultHTML(f.result) : `<div class="card empty"><strong>Nothing checked yet</strong>Type an item and a value, then choose Check.</div>`}</div>
  </div>`;
};

const SOURCE_PILL = { local: ["ok", "Bought locally"], "local-conditions": ["warn", "Local, with conditions"], central: ["", "Centrally supplied"], restricted: ["danger", "Restricted"], "out-of-scope": ["", "Outside this tool"] };

function itemCardHTML(item) {
  const srcPill = SOURCE_PILL[item.source];
  return `<section class="card">
    <div class="btn-row" style="justify-content:space-between"><h3 style="margin:0">${esc(item.name)}</h3><span class="pill ${srcPill[0]}"><span class="dot"></span>${srcPill[1]}</span></div>
    <p class="small muted" style="margin:2px 0 6px">Item rulebook · sample data</p>
    <dl style="margin:0">
      <div class="qa"><dt>Authorised?</dt><dd>${esc(item.authorised)} ${citeChip("PRAC-AUTH")}</dd></div>
      <div class="qa"><dt>How it reaches the unit</dt><dd>${esc(item.sourceText)} ${citeChip("PRAC-CENTRAL")}</dd></div>
      <div class="qa"><dt>Budget head</dt><dd>${esc(item.head)} ${citeChip("PRAC-HEADS")}</dd></div>
      <div class="qa"><dt>DFPDS schedule item</dt><dd>${esc(item.schedule)} ${citeChip("DFPDS-LADDER")}</dd></div>
    </dl>
    ${(item.cautions || []).map((c) => `<div class="callout">${esc(c)}</div>`).join("")}
  </section>`;
}

function routeCardHTML(r, { withButton = true } = {}) {
  return `<section class="card" style="margin-top:16px">
    <div class="eyebrow">Route for ${esc(short(r.value))}</div>
    <h3 style="margin-top:4px">${esc(r.mode.label)} ${citeChip(r.mode.ruleId)}</h3>
    <dl style="margin:0">
      <div class="qa"><dt>GeM</dt><dd>${esc(r.gem.text)} ${citeChip("GFR-149")}</dd></div>
      <div class="qa"><dt>Who sanctions</dt><dd><strong>${esc(r.sanction.level)}</strong>${r.sanction.ceiling ? ` <span class="muted small">(sample ceiling ${esc(short(r.sanction.ceiling))})</span>` : ""} ${citeChip("DFPDS-LADDER")} ${r.sanction.localOrderId ? citeChip(r.sanction.localOrderId) : ""}</dd></div>
      <div class="qa"><dt>IFA concurrence</dt><dd>${r.ifa.needed ? '<span class="pill warn"><span class="dot"></span>Needed</span>' : '<span class="pill ok"><span class="dot"></span>Not needed</span>'} <span class="muted small">sample threshold ${esc(short(r.ifa.threshold))}</span> ${citeChip("DFPDS-IFA")}</dd></div>
      <div class="qa"><dt>Splitting</dt><dd>Judge related needs at their combined value ${citeChip("GFR-157")}</dd></div>
    </dl>
    ${r.warnings.map((w) => `<div class="callout">${esc(w)}</div>`).join("")}
    <h4 style="margin:16px 0 0">Steps</h4>
    <ol class="steps">${r.steps.map((s) => `<li>${esc(s.text)} ${citeChip(s.cite)}</li>`).join("")}</ol>
    ${withButton ? `<div class="btn-row" style="margin-top:14px"><button class="btn primary" id="toNote">Raise a purchase note</button></div>` : ""}
  </section>`;
}

function choiceCardHTML(title, body, buttons) {
  return `<section class="card"><h3>${title}</h3><p class="muted small" style="margin:0 0 12px">${body}</p>
    <div class="answer-options" style="margin:0">${buttons.join("")}</div></section>`;
}

function finderResultHTML(r) {
  const f = S.finder;
  if (r.status === "ambiguous") {
    return choiceCardHTML("Which item do you mean?", "That could be more than one item type in the rulebook.",
      r.candidates.map((c) => `<button class="suggestion" type="button" data-fitem="${esc(c.id)}">${esc(c.name)}</button>`));
  }
  if (!r.item) {
    return choiceCardHTML(`“${esc(r.phrase || f.q)}” isn't in the item rulebook`, `So I won't guess which rules apply. Pick the group it's closest to. ${citeChip("PRAC-AUTH")}`,
      r.groups.map((g) => `<button class="suggestion" type="button" data-fgroup="${esc(g.id)}">${esc(g.label)}</button>`));
  }
  let html = f.group ? `<div class="callout info" style="margin:0 0 16px">Treating it as <strong>${esc(r.item.name)}</strong>, the closest item type in the rulebook.</div>` : "";
  html += itemCardHTML(r.item);
  if (r.blocked) {
    html += `<div class="callout danger" style="margin-top:16px">This isn't a normal local purchase, so no route is shown. ${citeChip("PRAC-CENTRAL")}</div>`;
  } else if (r.nonPublic) {
    html += `<div class="callout" style="margin-top:16px">For a mess, club or unit institute this is usually bought from that fund, under its own rules, not from public money. So there's no GFR route to work out. ${citeChip("PRAC-NONPUBLIC")}
      <div class="answer-options"><button class="suggestion" type="button" data-fwhere="public">It's for an office or barracks</button></div></div>`;
  } else if (r.needsWhere) {
    html += `<div class="callout info" style="margin-top:16px"><strong>Where is it for?</strong> That decides which money pays for it. ${citeChip("PRAC-NONPUBLIC")}
      <div class="answer-options"><button class="suggestion" type="button" data-fwhere="public">An office, barracks or training area</button><button class="suggestion" type="button" data-fwhere="nonpublic">Officers' or JCOs' mess, club or institute</button></div></div>`;
  } else if (r.route) {
    html += routeCardHTML(r.route);
  } else {
    html += `<div class="callout info" style="margin-top:16px">Add an indicative value to see the route, who sanctions it and the steps.</div>`;
  }
  return html;
}

async function runFinder() {
  const f = S.finder;
  $("#finderResult").innerHTML = `<div class="card empty">Checking…</div>`;
  try {
    f.result = await api("/api/finder", { method: "POST", body: { q: f.q, value: f.value, itemId: f.itemId, group: f.group, where: f.where, onGeM: f.onGeM, proprietary: f.proprietary } });
    $("#finderResult").innerHTML = finderResultHTML(f.result);
    wireFinderResult();
  } catch (err) {
    $("#finderResult").innerHTML = `<div class="card"><h3>Couldn't check that</h3><p class="muted">${esc(err.message)}</p></div>`;
  }
}

WIRES.finder = () => {
  const form = $("#finderForm");
  $("#fValue").addEventListener("input", (e) => {
    const n = Number(e.target.value.replace(/[^\d]/g, ""));
    $("#fValueHint").textContent = n ? short(n) : "An estimate is enough. Leave blank to check the item only.";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = S.finder;
    const q = $("#fItem").value.trim();
    if (!q) return $("#fItem").focus();
    if (q !== f.q) Object.assign(f, { itemId: null, group: null, where: null }); // a new item: forget earlier picks
    f.q = q;
    f.value = $("#fValue").value.replace(/[^\d]/g, "");
    f.onGeM = $("#fGem").checked;
    f.proprietary = $("#fProp").checked;
    runFinder();
  });
  wireFinderResult();
};
function wireFinderResult() {
  const f = S.finder;
  document.querySelectorAll("[data-fitem]").forEach((b) => b.addEventListener("click", () => { f.itemId = b.dataset.fitem; f.group = null; runFinder(); }));
  document.querySelectorAll("[data-fgroup]").forEach((b) => b.addEventListener("click", () => { f.group = b.dataset.fgroup; f.itemId = null; runFinder(); }));
  document.querySelectorAll("[data-fwhere]").forEach((b) => b.addEventListener("click", () => { f.where = b.dataset.fwhere; runFinder(); }));
  $("#toNote")?.addEventListener("click", () => {
    S.prefill = { item: f.result.item?.name || f.q, itemId: f.result.item?.id || null, value: f.value, onGeM: f.onGeM, proprietary: f.proprietary };
    location.hash = "#/notes/new";
  });
}

// Notes
const STATUS_PILL = { Checked: "accent", Sanctioned: "ok", Ordered: "ok", Received: "ok", Closed: "", Cancelled: "danger", Registered: "" };

VIEWS.notes = async (arg) => {
  if (arg === "new") return newNoteHTML();
  if (arg) return noteDetailHTML(arg);
  S.notes = await api("/api/notes");
  renderNav();
  return `
  <div class="btn-row" style="justify-content:space-between;align-items:flex-end">
    <div><h1 class="large-title">Purchase notes</h1><p class="subtitle" style="margin-bottom:0">A note registers an intended purchase, runs the checks and lists the steps. It is not a sanction.</p></div>
    <a class="btn primary" href="#/notes/new">New note</a>
  </div>
  <div class="list" style="margin-top:20px">
    ${S.notes.length
      ? S.notes.map((n) => `<a class="row" href="#/notes/${n.id}">
          <div class="row-main"><div class="row-title"><span class="mono">${n.id}</span> · ${esc(n.item)}</div><div class="row-sub">${esc(n.route.mode.label)} · sanction by ${esc(n.route.sanction.level)} · ${fmtDate(n.updatedAt)}</div></div>
          <div class="row-end"><div class="mono" style="font-weight:600">${esc(short(n.value))}</div><span class="pill ${STATUS_PILL[n.status] || ""}"><span class="dot"></span>${n.status}</span></div>
          <svg class="chev" width="10" height="16" viewBox="0 0 10 16" aria-hidden="true"><path d="m2 2 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </a>`).join("")
      : `<div class="empty"><strong>No purchase notes yet</strong>Start from <a href="#/finder">Can I buy it?</a> or choose New note.</div>`}
  </div>`;
};

function newNoteHTML() {
  const p = S.prefill || {};
  return `
  <h1 class="large-title">New purchase note</h1>
  <p class="subtitle">The note checks the route against the rule library and numbers the case. In version 1 it does not check or earmark funds.</p>
  <form class="card" id="noteForm" style="max-width:720px">
    <div class="field"><label for="nItem">Item</label><input id="nItem" class="input" list="catalogue2" required value="${esc(p.item || "")}" placeholder="e.g. Training aids" autocomplete="off">
      <datalist id="catalogue2">${S.boot.items.items.map((i) => `<option value="${esc(i.name)}">`).join("")}</datalist></div>
    <div class="field-row">
      <div class="field"><label for="nValue">Indicative value</label><div class="input-prefix"><span>₹</span><input id="nValue" class="input" inputmode="numeric" required value="${esc(p.value || "")}" placeholder="350000"></div><span class="hint" id="nValueHint">${p.value ? esc(short(Number(p.value))) : "Use an estimate, not a live case figure."}</span></div>
      <div class="field"><label for="nSub">For</label><input id="nSub" class="input" placeholder="e.g. B Company, model room" value=""></div>
    </div>
    <div class="field"><label for="nWhy">Why the unit needs it</label><textarea id="nWhy" class="input" placeholder="What it is for, who uses it, what happens without it"></textarea><span class="hint">This becomes the start of the statement of case.</span></div>
    <label class="check"><input type="checkbox" id="nGem" ${p.onGeM ? "checked" : ""}><span><span class="label">Listed on GeM</span></span></label>
    <label class="check"><input type="checkbox" id="nProp" ${p.proprietary ? "checked" : ""}><span><span class="label">Only one maker (proprietary)</span></span></label>
    <p class="small muted">Raised by ${esc(roleLabel(S.role))}. Rule library ${esc(S.boot.rules.libraryVersion)}.</p>
    <div class="btn-row"><button class="btn primary" type="submit">Check and issue note</button><a class="btn" href="#/notes">Cancel</a></div>
  </form>`;
}
WIRES.notes = (arg) => {
  if (arg === "new") {
    const pre = S.prefill || {};
    S.prefill = null;
    $("#nValue").addEventListener("input", (e) => {
      const n = Number(e.target.value.replace(/[^\d]/g, ""));
      $("#nValueHint").textContent = n ? short(n) : "Use an estimate, not a live case figure.";
    });
    $("#noteForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.submitter || e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const note = await api("/api/notes", { method: "POST", body: {
          item: $("#nItem").value, itemId: pre.itemId && $("#nItem").value === pre.item ? pre.itemId : null,
          value: $("#nValue").value.replace(/[^\d]/g, ""), subunit: $("#nSub").value,
          justification: $("#nWhy").value, onGeM: $("#nGem").checked, proprietary: $("#nProp").checked, role: S.role,
        } });
        S.freshNote = note.id;
        location.hash = `#/notes/${note.id}`;
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
      }
    });
    return;
  }
  if (arg) wireNoteDetail(arg);
};

function chitHTML(n) {
  const r = n.route;
  return `<div class="chit-wrap"><article class="chit" aria-label="Purchase readiness note ${n.id}">
    <div class="chit-head">
      <div><div class="chit-kind">Purchase readiness note</div><div class="chit-no">${n.id}</div></div>
      <div class="chit-value"><div class="chit-kind">Indicative value</div><b>${esc(inr(n.value))}</b></div>
    </div>
    <div class="stamp ${S.freshNote === n.id ? "fresh" : ""}">Not a sanction<small>Guidance only</small></div>
    <div class="chit-item">${esc(n.item)}</div>
    <div class="small" style="color:var(--ink-2)">${esc(n.subunit || "Unit")} · raised by ${esc(roleLabel(n.createdBy))} · ${fmtDate(n.createdAt)}</div>
    <dl class="chit-grid">
      <div><dt>Mode</dt><dd>${esc(r.mode.label)} ${citeChip(r.mode.ruleId)}</dd></div>
      <div><dt>Sanctioned by</dt><dd>${esc(r.sanction.level)} ${citeChip("DFPDS-LADDER")}</dd></div>
      <div><dt>IFA concurrence</dt><dd>${r.ifa.needed ? "Needed" : "Not needed"} ${citeChip("DFPDS-IFA")}</dd></div>
      <div><dt>GeM</dt><dd>${n.onGeM ? "Listed: buy on GeM" : "Check and record"} ${citeChip("GFR-149")}</dd></div>
      <div><dt>Budget head</dt><dd>${esc(n.catalogue?.head || "To confirm")}</dd></div>
      <div><dt>Funds</dt><dd>Not checked in version 1</dd></div>
    </dl>
    ${n.justification ? `<p style="margin:4px 0 0;font-size:14px"><span class="chit-kind">Need</span><br>${esc(n.justification)}</p>` : ""}
    <div class="chit-foot"><span>This note records that the purchase was registered and checked against rule library ${esc(n.rulesVersion)}. Sanction is given only by the competent financial authority.</span></div>
  </article></div>`;
}

async function noteDetailHTML(id) {
  if (!S.notes.length) S.notes = await api("/api/notes");
  const n = S.notes.find((x) => x.id === id);
  if (!n) return `<div class="card empty"><strong>Note not found</strong><a href="#/notes">Back to purchase notes</a></div>`;
  const L = S.boot.lifecycle;
  const idx = L.indexOf(n.status);
  const next = L[idx + 1];
  const closed = n.status === "Closed" || n.status === "Cancelled";
  const nextLabel = { Sanctioned: "Record sanction", Ordered: "Record supply order", Received: "Record receipt and inspection", Closed: "Close note" }[next];
  return `
  <div class="btn-row no-print" style="margin-bottom:14px"><a class="btn plain" href="#/notes">‹ Purchase notes</a></div>
  <div class="split">
    <div>${chitHTML(n)}
      <div class="btn-row no-print" style="margin-top:16px"><button class="btn" id="printBtn">Print note</button></div>
    </div>
    <div class="no-print">
      <section class="card">
        <div class="btn-row" style="justify-content:space-between"><h3 style="margin:0">Where it stands</h3><span class="pill ${STATUS_PILL[n.status] || ""}"><span class="dot"></span>${n.status}</span></div>
        <ol class="lifecycle" style="margin-top:14px">${L.map((s, i) => `<li class="${n.status === "Cancelled" ? "" : i < idx ? "done" : i === idx ? "now" : ""}">${s}</li>`).join("")}</ol>
        ${closed ? `<p class="muted small" style="margin:0">This note is ${n.status.toLowerCase()}.</p>` : `<div class="btn-row">${nextLabel ? `<button class="btn primary" id="advanceBtn" data-to="${next}">${nextLabel}</button>` : ""}<button class="btn danger" id="cancelBtn">Cancel note</button></div>`}
      </section>
      <section class="card" style="margin-top:16px">
        <h3>Steps</h3>
        <p class="small muted" style="margin:0 0 4px">Tick each step as it is done. Your role and the time are recorded.</p>
        <ul class="checklist">${n.steps.map((s, i) => `<li><input type="checkbox" id="st${i}" data-step="${i}" ${s.done ? "checked" : ""} ${closed ? "disabled" : ""}><label for="st${i}"><span class="${s.done ? "done-text" : ""}">${esc(s.text)}</span> ${citeChip(s.cite)}${s.done ? `<span class="who">${esc(roleLabel(s.by))} · ${fmtTime(s.at)}</span>` : ""}</label></li>`).join("")}</ul>
      </section>
      ${n.route.warnings.length ? `<section class="card" style="margin-top:16px"><h3>Watch for</h3>${n.route.warnings.map((w) => `<div class="callout">${esc(w)}</div>`).join("")}</section>` : ""}
      <section class="card" style="margin-top:16px">
        <h3>History</h3>
        <ul class="history">${[...n.history].reverse().map((h) => `<li><span class="muted">${fmtTime(h.at)}</span><span><strong>${esc(h.action)}</strong> · ${esc(h.by === "System" ? "System" : roleLabel(h.by))}${h.detail ? `<br><span class="muted">${esc(h.detail)}</span>` : ""}</span></li>`).join("")}</ul>
      </section>
    </div>
  </div>`;
}

function wireNoteDetail(id) {
  const n = S.notes.find((x) => x.id === id);
  if (!n) return;
  setTimeout(() => { if (S.freshNote === id) S.freshNote = null; }, 600);
  const patch = async (body) => {
    const updated = await api(`/api/notes/${id}`, { method: "PATCH", body: { ...body, role: S.role } });
    S.notes = S.notes.map((x) => (x.id === id ? updated : x));
    return updated;
  };
  $("#printBtn")?.addEventListener("click", () => window.print());
  document.querySelectorAll("[data-step]").forEach((cb) =>
    cb.addEventListener("change", async () => {
      try { await patch({ action: "tick", index: Number(cb.dataset.step) }); render(); }
      catch (err) { toast(err.message); cb.checked = !cb.checked; }
    })
  );
  $("#advanceBtn")?.addEventListener("click", (e) => {
    const to = e.currentTarget.dataset.to;
    const fields = to === "Closed"
      ? `<p style="margin-top:0">Close ${esc(id)}? Close it once the bill has gone to the paying office.</p>`
      : `${to === "Sanctioned" ? `<div class="field"><label for="advAuth">Sanctioned by</label><input id="advAuth" class="input" value="${esc(n.route.sanction.level)}"><span class="hint">The note's check says ${esc(n.route.sanction.level)}.</span></div>` : ""}
         <div class="field"><label for="advRef">${to === "Sanctioned" ? "Sanction letter number" : to === "Ordered" ? "Supply order number" : "Receipt / inspection reference"}</label><input id="advRef" class="input" autocomplete="off"></div>`;
    openSheet({
      title: { Sanctioned: "Record sanction", Ordered: "Record supply order", Received: "Record receipt and inspection", Closed: "Close note" }[to],
      body: fields,
      actions: [{ label: "Cancel" }, { label: to === "Closed" ? "Close note" : "Save", primary: true, onClick: async () => {
        try {
          await patch({ action: "advance", reference: $("#advRef")?.value || "", authority: $("#advAuth")?.value || "" });
          toast(`${id}: ${to.toLowerCase()}`);
          render();
          return true;
        } catch (err) { toast(err.message); return false; }
      } }],
    });
  });
  $("#cancelBtn")?.addEventListener("click", () => {
    openSheet({
      title: `Cancel ${id}?`,
      body: `<p style="margin-top:0">The note stays on record as cancelled. This can't be undone.</p><div class="field"><label for="cReason">Reason</label><input id="cReason" class="input" placeholder="e.g. Requirement met from depot stock"></div>`,
      actions: [{ label: "Keep note" }, { label: "Cancel note", danger: true, onClick: async () => {
        try { await patch({ action: "cancel", reason: $("#cReason").value }); toast(`${id} cancelled`); render(); return true; }
        catch (err) { toast(err.message); return false; }
      } }],
    });
  });
}

// Ideas
VIEWS.ideas = async () => {
  S.ideas = await api("/api/ideas");
  renderNav();
  const isCO = S.role === "CO";
  const filters = ["All", "Open", "Accepted", "Deferred", "Declined"];
  const list = S.ideas.filter((i) => S.ideaFilter === "All" || i.status === S.ideaFilter);
  const pill = { Open: "accent", Accepted: "ok", Deferred: "warn", Declined: "danger" };
  return `
  <h1 class="large-title">Ideas</h1>
  <p class="subtitle">Anyone in the unit can raise a need or an idea. ${isCO ? "You decide on each one, with a reason the person can see." : "The CO decides, and you'll see the outcome and the reason."}</p>
  <div class="split">
    <div>
      <div class="btn-row" style="justify-content:space-between;margin-bottom:12px">
        <div class="segmented" role="group" aria-label="Filter ideas">${filters.map((f) => `<button type="button" data-filter="${f}" aria-pressed="${S.ideaFilter === f}">${f}</button>`).join("")}</div>
      </div>
      <div class="list">${list.length ? list.map((i) => `
        <div class="row" style="align-items:flex-start;flex-direction:column;gap:6px">
          <div class="btn-row" style="justify-content:space-between;width:100%"><span class="row-title">${esc(i.title)}</span><span class="pill ${pill[i.status] || ""}"><span class="dot"></span>${i.status}</span></div>
          ${i.why ? `<div class="small">${esc(i.why)}</div>` : ""}
          <div class="row-sub">${esc(i.category)} · ${esc(i.costBand)} · ${esc(i.by)} · ${fmtDate(i.createdAt)}</div>
          ${i.decision ? `<div class="callout info" style="margin:0;width:100%"><strong>CO:</strong> ${esc(i.decision.reason)}</div>` : ""}
          <div class="btn-row">
            ${isCO && i.status === "Open" ? `<button class="btn" data-decide="Accepted" data-id="${i.id}">Accept</button><button class="btn" data-decide="Deferred" data-id="${i.id}">Defer</button><button class="btn danger" data-decide="Declined" data-id="${i.id}">Decline</button>` : ""}
            ${i.status === "Accepted" ? `<button class="btn plain" data-plan="${i.id}">Plan the purchase</button>` : ""}
          </div>
        </div>`).join("") : `<div class="empty"><strong>No ideas here</strong>Nothing matches this filter.</div>`}
      </div>
      <h2 class="section-title">What other units did</h2>
      <p class="small muted" style="margin-top:-4px">Illustrative precedents. In the full product these come from formations sharing purchases that cleared audit.</p>
      <div class="list">${S.boot.precedents.map((p) => `<div class="row" style="align-items:flex-start"><div class="row-main"><div class="row-title">${esc(p.what)}</div><div class="row-sub">${esc(p.unit)} · ${esc(p.head)} · ${esc(p.route)}</div><div class="small" style="margin-top:4px">${esc(p.lesson)}</div></div><div class="row-end"><div class="mono" style="font-weight:600">${esc(short(p.value))}</div><span class="pill ${p.outcome === "Returned once" ? "warn" : "ok"}"><span class="dot"></span>${esc(p.outcome)}</span></div></div>`).join("")}</div>
    </div>
    <form class="card" id="ideaForm">
      <h3>Raise an idea</h3>
      <div class="field"><label for="iTitle">Idea or need</label><input id="iTitle" class="input" required placeholder="e.g. Shade at the firing range"></div>
      <div class="field"><label for="iWhy">Why it matters</label><textarea id="iWhy" class="input" placeholder="Who it helps and what changes"></textarea></div>
      <div class="field-row">
        <div class="field"><label for="iCat">Area</label><select id="iCat" class="input">${["Training", "Welfare", "Office", "Equipment", "Safety", "Other"].map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div class="field"><label for="iCost">Rough cost</label><select id="iCost" class="input">${["Not sure", "Under ₹1 lakh", "₹1–2 lakh", "₹2–5 lakh", "₹5–25 lakh", "Above ₹25 lakh"].map((c) => `<option>${c}</option>`).join("")}</select></div>
      </div>
      <label class="check"><input type="checkbox" id="iAnon" checked><span><span class="label">Submit without my name</span><span class="hint">The CO sees the idea, not who raised it.</span></span></label>
      <div class="btn-row" style="margin-top:8px"><button class="btn primary" type="submit">Submit idea</button></div>
    </form>
  </div>`;
};
WIRES.ideas = () => {
  document.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => { S.ideaFilter = b.dataset.filter; render(); }));
  $("#ideaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/ideas", { method: "POST", body: { title: $("#iTitle").value, why: $("#iWhy").value, category: $("#iCat").value, costBand: $("#iCost").value, anonymous: $("#iAnon").checked, by: roleLabel(S.role), role: S.role } });
      toast("Idea submitted");
      S.ideaFilter = "All";
      render();
    } catch (err) { toast(err.message); }
  });
  document.querySelectorAll("[data-decide]").forEach((b) =>
    b.addEventListener("click", () => {
      const decision = b.dataset.decide;
      const idea = S.ideas.find((i) => i.id === b.dataset.id);
      openSheet({
        title: `${{ Accepted: "Accept", Deferred: "Defer", Declined: "Decline" }[decision]} this idea`,
        body: `<p style="margin-top:0"><strong>${esc(idea.title)}</strong></p><div class="field"><label for="dReason">Reason the person will see${decision === "Accepted" ? " (optional)" : ""}</label><textarea id="dReason" class="input"></textarea></div>`,
        actions: [{ label: "Cancel" }, { label: { Accepted: "Accept", Deferred: "Defer", Declined: "Decline" }[decision], primary: decision !== "Declined", danger: decision === "Declined", onClick: async () => {
          try { await api(`/api/ideas/${idea.id}`, { method: "PATCH", body: { decision, reason: $("#dReason").value, role: S.role } }); toast(`Idea ${decision.toLowerCase()}`); render(); return true; }
          catch (err) { toast(err.message); return false; }
        } }],
      });
    })
  );
  document.querySelectorAll("[data-plan]").forEach((b) =>
    b.addEventListener("click", () => {
      const idea = S.ideas.find((i) => i.id === b.dataset.plan);
      S.finder = { q: idea.title, value: "", onGeM: false, proprietary: false, result: null };
      location.hash = "#/finder";
    })
  );
};

// Funds (v2 preview)
VIEWS.funds = () => {
  const F = S.boot.funds;
  const total = F.heads.reduce((a, h) => ({ allotted: a.allotted + h.allotted, used: a.used + h.paid + h.committed + h.earmarked }), { allotted: 0, used: 0 });
  return `
  <h1 class="large-title">Funds</h1>
  <p class="subtitle">What the unit can still spend under each head: allotment minus earmarked, committed and paid. ${citeChip("PRAC-THREE-NUMBERS")}</p>
  <div class="callout" style="margin:0 0 18px"><strong>Version 2 preview.</strong> ${esc(F.notice)} As of ${fmtDate(F.asOf)}.</div>
  <div class="grid grid-3" style="margin-bottom:18px">
    <div class="card"><div class="eyebrow">Allotted this year</div><div class="stat" style="margin-top:6px">${short(total.allotted)}</div></div>
    <div class="card"><div class="eyebrow">Spoken for</div><div class="stat" style="margin-top:6px">${short(total.used)}</div><div class="small muted">Earmarked, committed or paid</div></div>
    <div class="card"><div class="eyebrow">Still available</div><div class="stat" style="margin-top:6px">${short(total.allotted - total.used)}</div></div>
  </div>
  <div class="legend" style="margin-bottom:10px"><span><i class="m-paid"></i>Paid</span><span><i class="m-committed"></i>Committed</span><span><i class="m-earmarked" style="border:1px solid var(--accent)"></i>Earmarked</span><span><i style="background:var(--neutral-tint)"></i>Available</span></div>
  <div class="list">${F.heads.map((h) => {
    const avail = h.allotted - h.paid - h.committed - h.earmarked;
    const pct = (x) => `${(100 * x) / h.allotted}%`;
    const usedShare = (h.allotted - avail) / h.allotted;
    const risk = usedShare < 0.4 ? ["warn", "Lapse risk: less than 40% used"] : usedShare > 0.9 ? ["danger", "Running hot"] : ["ok", "On track"];
    return `<div class="row" style="flex-direction:column;align-items:stretch;gap:2px">
      <div class="btn-row" style="justify-content:space-between"><span class="row-title">${esc(h.head)}</span><span class="pill ${risk[0]}"><span class="dot"></span>${risk[1]}</span></div>
      <div class="meter" role="img" aria-label="${esc(h.head)}: paid ${short(h.paid)}, committed ${short(h.committed)}, earmarked ${short(h.earmarked)}, available ${short(avail)} of ${short(h.allotted)}"><span class="m-paid" style="width:${pct(h.paid)}"></span><span class="m-committed" style="width:${pct(h.committed)}"></span><span class="m-earmarked" style="width:${pct(h.earmarked)}"></span></div>
      <div class="figs"><div><span class="muted">Allotted</span><b>${short(h.allotted)}</b></div><div><span class="muted">Paid</span><b>${short(h.paid)}</b></div><div><span class="muted">Committed</span><b>${short(h.committed)}</b></div><div><span class="muted">Earmarked</span><b>${short(h.earmarked)}</b></div><div><span class="muted">Available</span><b>${short(avail)}</b></div></div>
    </div>`;
  }).join("")}</div>
  <h2 class="section-title">Payment trace</h2>
  <div class="list">${F.trace.map((t) => `<div class="row"><div class="row-main"><div class="row-title">${esc(t.what)}</div><div class="row-sub">${esc(t.head)} · ${esc(t.ref)} · ${fmtDate(t.date)}</div></div><div class="row-end"><div class="mono" style="font-weight:600">${short(t.amount)}</div><span class="pill ${t.stage === "Paid" ? "" : t.stage === "Committed" ? "accent" : "warn"}"><span class="dot"></span>${t.stage}</span></div></div>`).join("")}</div>`;
};

// Handover (v2 preview, open cases are live)
VIEWS.handover = async () => {
  S.notes = await api("/api/notes");
  S.ideas = await api("/api/ideas");
  const open = S.notes.filter((n) => !["Closed", "Cancelled"].includes(n.status));
  const F = S.boot.funds;
  return `
  <div class="btn-row" style="justify-content:space-between;align-items:flex-end">
    <div><h1 class="large-title">Handover pack</h1><p class="subtitle" style="margin-bottom:0">Everything an incoming officer or clerk needs on day one. Open cases and ideas are live; fund figures are a version 2 preview.</p></div>
    <button class="btn no-print" onclick="window.print()">Print pack</button>
  </div>
  <h2 class="section-title">Open purchase notes (${open.length})</h2>
  <div class="list">${open.length ? open.map((n) => `<a class="row" href="#/notes/${n.id}"><div class="row-main"><div class="row-title"><span class="mono">${n.id}</span> · ${esc(n.item)}</div><div class="row-sub">${n.status} · ${n.steps.filter((s) => s.done).length} of ${n.steps.length} steps done · last change ${fmtDate(n.updatedAt)}</div></div><div class="row-end mono" style="font-weight:600">${esc(short(n.value))}</div></a>`).join("") : `<div class="empty">No open notes.</div>`}</div>
  <h2 class="section-title">Ideas waiting or accepted</h2>
  <div class="list">${S.ideas.filter((i) => ["Open", "Accepted"].includes(i.status)).map((i) => `<div class="row"><div class="row-main"><div class="row-title">${esc(i.title)}</div><div class="row-sub">${esc(i.category)} · ${esc(i.costBand)}</div></div><span class="pill ${i.status === "Accepted" ? "ok" : "accent"}"><span class="dot"></span>${i.status}</span></div>`).join("") || `<div class="empty">None.</div>`}</div>
  <h2 class="section-title">Fund position <span class="nav-tag" style="vertical-align:3px">v2 preview</span></h2>
  <div class="list">${F.heads.map((h) => `<div class="row"><div class="row-main"><div class="row-title">${esc(h.head)}</div></div><div class="row-end small">available <b class="mono">${short(h.allotted - h.paid - h.committed - h.earmarked)}</b> of ${short(h.allotted)}</div></div>`).join("")}</div>
  <h2 class="section-title">Dates to keep</h2>
  <div class="list">${S.boot.obligations.map((o) => `<div class="row"><div class="row-main"><div class="row-title">${esc(o.title)}</div><div class="row-sub">${esc(o.note)}</div></div><div class="row-end">${fmtDate(o.date)}</div></div>`).join("")}</div>`;
};

// Rule library
VIEWS.rules = () => {
  const docs = [...S.boot.rules.documents, { id: "LOCAL", name: "Local orders", version: "Formation orders that narrow the published rules", status: "local" }];
  const byDoc = (id) => S.boot.rules.entries.filter((e) => e.doc === id);
  const canEdit = ["CUST", "2IC", "CO", "ADJT"].includes(S.role);
  return `
  <h1 class="large-title">Rule library</h1>
  <p class="subtitle">${esc(S.boot.rules.notice)}</p>
  <div class="field" style="max-width:520px"><label for="ruleSearch" class="skip">Search the library</label><input id="ruleSearch" class="input" type="search" placeholder="Search rules, e.g. committee, GeM, IFA"></div>
  ${docs.map((d) => `
    <h2 class="section-title" data-doc-head="${d.id}">${esc(d.name)} <span style="font-weight:400;font-size:14px" class="muted">· ${esc(d.version)}</span></h2>
    <div class="list" data-doc-list="${d.id}">${byDoc(d.id).length ? byDoc(d.id).map(entryHTML).join("") : `<div class="empty small">No local orders yet.</div>`}</div>`).join("")}
  <h2 class="section-title" id="item-rulebook">Item rulebook <span style="font-weight:400;font-size:14px" class="muted">· ${S.boot.items.items.length} item types in ${S.boot.items.groups.length} groups</span></h2>
  <p class="small muted" style="margin-top:-4px">How Ask and Can I buy it? recognise what you want to buy. ${esc(S.boot.items.notice)}</p>
  ${S.boot.items.groups.map((g) => `
    <h3 style="font-size:15px;margin:18px 0 8px">${esc(g.label)}</h3>
    <div class="list">${S.boot.items.items.filter((i) => i.group === g.id).map(itemEntryHTML).join("")}</div>`).join("")}
  <h2 class="section-title">Sample parameters in use</h2>
  <div class="list">
    <div class="row"><div class="row-main"><div class="row-title">GFR purchase bands</div><div class="row-sub">${esc(S.boot.rules.params.gfrBands.basis)}</div></div>${statusPill(S.boot.rules.params.gfrBands.status)}</div>
    <div class="row"><div class="row-main"><div class="row-title">Sanction ladder</div><div class="row-sub">${S.boot.rules.params.sanctionLadder.levels.map((l) => `${esc(l.level)} ${esc(short(l.ceiling))}`).join(" · ")}</div></div>${statusPill(S.boot.rules.params.sanctionLadder.status)}</div>
    <div class="row"><div class="row-main"><div class="row-title">IFA concurrence threshold</div><div class="row-sub">${esc(short(S.boot.rules.params.ifa.threshold))}. ${esc(S.boot.rules.params.ifa.basis)}</div></div>${statusPill(S.boot.rules.params.ifa.status)}</div>
  </div>
  ${canEdit ? `
  <h2 class="section-title">Add a local order</h2>
  <form class="card" id="loForm" style="max-width:720px">
    <p class="small muted" style="margin-top:0">A formation order that restricts or clarifies a published rule. It applies from its effective date, and answers cite it.</p>
    <div class="field"><label for="loTitle">Title</label><input id="loTitle" class="input" required placeholder="e.g. Bde order: CO local purchase limit"></div>
    <div class="field"><label for="loText">What it says</label><textarea id="loText" class="input" required></textarea></div>
    <div class="field-row">
      <div class="field"><label for="loDate">Effective from</label><input id="loDate" type="date" class="input" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="field"><label for="loCeil">Lowers the CO's ceiling to (optional)</label><div class="input-prefix"><span>₹</span><input id="loCeil" class="input" inputmode="numeric" placeholder="300000"></div></div>
    </div>
    <div class="btn-row"><button class="btn primary" type="submit">Add to library</button></div>
  </form>` : `<p class="small muted">Switch to Rule Custodian to add a local order.</p>`}`;
};
function itemEntryHTML(i) {
  const p = SOURCE_PILL[i.source];
  return `<details class="entry" data-search="${esc((i.name + " " + i.aliases.join(" ") + " " + i.sourceText).toLowerCase())}">
    <summary><span class="row-main"><span class="row-title">${esc(i.name)}</span><br><span class="row-sub">${esc(i.aliases.slice(0, 8).join(", "))}${i.aliases.length > 8 ? "…" : ""}</span></span><span class="pill ${p[0]}"><span class="dot"></span>${p[1]}</span></summary>
    <div class="entry-body">
      <dl style="margin:0">
        <div class="qa"><dt>Authorised?</dt><dd>${esc(i.authorised)}</dd></div>
        <div class="qa"><dt>How it reaches the unit</dt><dd>${esc(i.sourceText)}</dd></div>
        <div class="qa"><dt>Budget head</dt><dd>${esc(i.head)}</dd></div>
        <div class="qa"><dt>DFPDS schedule item</dt><dd>${esc(i.schedule)}</dd></div>
        ${i.askWhere ? `<div class="qa"><dt>Asks</dt><dd>Whether it's for an office or barracks, or a mess or institute</dd></div>` : ""}
        <div class="qa"><dt>Recognised words</dt><dd class="small">${esc(i.aliases.join(", "))}</dd></div>
      </dl>
      ${(i.cautions || []).map((c) => `<div class="callout">${esc(c)}</div>`).join("")}
      <div class="sources"><span>Based on</span>${i.cites.map(citeChip).join("")}</div>
    </div>
  </details>`;
}
function entryHTML(e) {
  return `<details class="entry" id="entry-${esc(e.id)}" data-search="${esc((e.id + " " + e.title + " " + e.text + " " + (e.keywords || []).join(" ")).toLowerCase())}">
    <summary><span class="mono small muted" style="min-width:120px">${esc(e.id)}</span><span class="row-main"><span class="row-title">${esc(e.title)}</span><br><span class="row-sub">${esc(e.ref)}</span></span>${statusPill(e.status)}</summary>
    <div class="entry-body">${esc(e.text)}
      <div class="entry-meta"><span>${esc(e.version)}</span><span>Effective ${esc(e.effective || "—")}</span>${e.source ? `<a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</div>
    </div>
  </details>`;
}
WIRES.rules = (arg) => {
  $("#ruleSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll("details.entry").forEach((d) => { d.hidden = q && !d.dataset.search.includes(q); });
  });
  $("#loForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/local-orders", { method: "POST", body: { title: $("#loTitle").value, text: $("#loText").value, effective: $("#loDate").value, coCeiling: $("#loCeil").value.replace(/[^\d]/g, "") } });
      S.boot = await api("/api/bootstrap");
      toast("Local order added");
      render();
    } catch (err) { toast(err.message); }
  });
  if (S.focusEntry) {
    const d = document.getElementById(`entry-${S.focusEntry}`);
    S.focusEntry = null;
    if (d) { d.open = true; d.scrollIntoView({ block: "center" }); d.querySelector("summary").focus(); }
  }
};

// Learn
VIEWS.learn = () => `
  <h1 class="large-title">Learn</h1>
  <p class="subtitle">Short explainers of the ideas behind every purchase. Each one links to the rules it rests on.</p>
  <div class="grid grid-2">${S.boot.learn.map((l) => `<article class="card"><h3>${esc(l.title)}</h3><p class="muted small" style="margin:0 0 8px">${esc(l.summary)}</p><p style="margin:0 0 10px">${esc(l.text)}</p><div class="sources" style="margin-top:0;border-top:0;padding-top:0"><span>Based on</span>${l.cites.map(citeChip).join("")}</div></article>`).join("")}</div>`;

// Review queue
VIEWS.review = async () => {
  S.reviews = await api("/api/reviews");
  renderNav();
  const isCust = S.role === "CUST";
  return `
  <h1 class="large-title">Review queue</h1>
  <p class="subtitle">Questions the rulebook couldn't answer and answers people flagged as wrong. The rule custodian closes each gap in the library. ${isCust ? "" : "Switch to Rule Custodian to resolve items."}</p>
  <div class="list">${S.reviews.length ? S.reviews.map((r) => `
    <div class="row" style="flex-direction:column;align-items:stretch;gap:6px">
      <div class="btn-row" style="justify-content:space-between"><span class="row-title">${esc(r.question || "(no question)")}</span><span class="pill ${r.status === "Open" ? "warn" : "ok"}"><span class="dot"></span>${r.status}</span></div>
      <div class="row-sub">${r.kind === "flag" ? "Flagged answer" : "Not covered"} · ${esc(r.reason)} · ${fmtTime(r.at)}</div>
      ${r.resolution ? `<div class="callout info" style="margin:0">${esc(r.resolution)}</div>` : ""}
      ${isCust && r.status === "Open" ? `<div><button class="btn" data-resolve="${r.id}">Resolve</button></div>` : ""}
    </div>`).join("") : `<div class="empty"><strong>Nothing to review</strong>Unanswered and flagged questions will appear here.</div>`}</div>`;
};
WIRES.review = () => {
  document.querySelectorAll("[data-resolve]").forEach((b) =>
    b.addEventListener("click", () =>
      openSheet({
        title: "Resolve",
        body: `<div class="field"><label for="resText">What was done</label><textarea id="resText" class="input" placeholder="e.g. Added Bde order 14/2026 as local order LO-002"></textarea></div>`,
        actions: [{ label: "Cancel" }, { label: "Mark resolved", primary: true, onClick: async () => {
          try { await api(`/api/reviews/${b.dataset.resolve}`, { method: "PATCH", body: { resolution: $("#resText").value } }); toast("Resolved"); render(); return true; }
          catch (err) { toast(err.message); return false; }
        } }],
      })
    )
  );
};
async function refreshReviews() {
  try { S.reviews = await api("/api/reviews"); renderNav(); } catch { /* non-critical */ }
}

// ---------- sheet ----------
function openSheet({ title, body, actions = [] }) {
  const d = $("#sheet");
  d.innerHTML = `<div class="sheet-head"><h2 id="sheetTitle">${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
    <div class="sheet-body">${body}</div>
    ${actions.length ? `<div class="sheet-foot">${actions.map((a, i) => `<button class="btn ${a.primary ? "primary" : ""} ${a.danger ? "danger" : ""}" data-action="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}`;
  d.querySelector("[data-close]").onclick = () => d.close();
  d.querySelectorAll("[data-action]").forEach((b) => {
    b.onclick = async () => {
      const a = actions[Number(b.dataset.action)];
      if (!a.onClick) return d.close();
      b.disabled = true;
      const ok = await a.onClick();
      b.disabled = false;
      if (ok !== false) d.close();
    };
  });
  d.showModal();
  const fields = [...d.querySelectorAll(".sheet-body input, .sheet-body textarea")];
  (fields.find((f) => !f.value) || fields[0] || d.querySelector("[data-action]:last-child") || d.querySelector("[data-close]")).focus();
}

function openCitation(id) {
  const e = entry(id);
  if (!e) return;
  openSheet({
    title: `${e.id}`,
    body: `<div class="btn-row" style="justify-content:space-between;margin-bottom:8px"><strong>${esc(e.title)}</strong>${statusPill(e.status)}</div>
      <p style="margin:0 0 12px">${esc(e.text)}</p>
      <dl class="small" style="margin:0">
        <div class="qa"><dt>Document</dt><dd>${esc(e.doc === "PRACTICE" ? "Unit practice (sample)" : e.doc === "LOCAL" ? "Local order" : e.doc)}</dd></div>
        <div class="qa"><dt>Version</dt><dd>${esc(e.version)}</dd></div>
        <div class="qa"><dt>Reference</dt><dd>${esc(e.ref)}</dd></div>
        <div class="qa"><dt>Effective</dt><dd>${esc(e.effective || "—")}</dd></div>
        ${e.source ? `<div class="qa"><dt>Source</dt><dd><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Open source</a></dd></div>` : ""}
      </dl>`,
    actions: [{ label: "Open in rule library", onClick: () => { S.focusEntry = id; location.hash = "#/rules"; if (currentRoute().name === "rules") render(); return true; } }, { label: "Done", primary: true }],
  });
}

// ---------- boot ----------
async function boot() {
  try {
    S.boot = await api("/api/bootstrap");
    [S.notes, S.ideas, S.reviews] = await Promise.all([api("/api/notes"), api("/api/ideas"), api("/api/reviews")]);
  } catch (err) {
    $("#view").innerHTML = `<div class="card"><h3>Kosh can't reach its server</h3><p class="muted">${esc(err.message)}. Start it with <span class="mono">npm start</span> and reload.</p></div>`;
    return;
  }
  renderShell();
  if (window.KOSH_STATIC) {
    $(".sample-banner").innerHTML = "<strong>Demo.</strong> Rule figures and the item rulebook are sample data. Everything runs in your browser, and anything you enter stays in this browser only.";
  }
  $("#rolePicker").addEventListener("change", (e) => {
    S.role = e.target.value;
    safeSet("kosh-role", S.role);
    toast(`Viewing as ${roleLabel(S.role)}`);
    render();
  });
  $("#menuBtn").addEventListener("click", () => setSidebar(!$("#sidebar").classList.contains("open")));
  $("#scrim").addEventListener("click", () => setSidebar(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#sidebar").classList.contains("open")) setSidebar(false); });
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cite]");
    if (c) { e.preventDefault(); openCitation(c.dataset.cite); }
  });
  window.addEventListener("hashchange", render);
  render();
}
boot();
