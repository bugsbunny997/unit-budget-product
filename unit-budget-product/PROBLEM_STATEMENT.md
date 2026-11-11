# Unit Budget Product — Problem Statement and User Stories

| | |
|---|---|
| **Status** | Draft v0.1 — for validation with serving officers before any build |
| **Date** | 11 November 2026 |
| **Scope** | Revenue budget of an Indian Army unit: knowing what can be bought, how to buy it, whether funds exist, and what is worth buying |
| **Not yet decided** | Product name, hosting, security classification |
| **Decided** | Version 1 is rules-only (see Section 11A) |

> **Read this first.** Every rule reference in this document is a pointer, not an authority. Thresholds, schedule numbers and role names must be verified against the current official text and with serving officers before anything is built on them. Items needing verification are collected in Section 12.

---

## 1. The problem in one paragraph

A unit's officers are custodians of public money they cannot confidently spend. The answer to every spending question — *may I buy this, who sanctions it, how do I buy it, do I have the funds* — is spread across three rulebooks written for someone else, layered with amendments and local orders, and held in practice by one or two experienced clerks. The personal cost of spending wrongly (audit objection, recovery, adverse remark) is high; the personal cost of not spending is zero. So funds lapse while the unit goes without, lapsed funds are read upwards as "not needed", and the next allotment shrinks. Officers who could be improving their unit spend their energy on returned files instead — and most never learn what a well-used budget could have done for their troops.

**The problem is not scarcity of money. It is a knowledge and confidence gap that makes available money unusable.**

---

## 2. The three rulebooks

| Document | Issued by | Its job | Question it answers |
|---|---|---|---|
| **GFR** — General Financial Rules, 2017 (as amended) | Ministry of Finance, Dept of Expenditure | Parent rules for all government money: budgeting, expenditure control, propriety, procurement, contracts, inventory, audit | *What are the rules of the game?* |
| **DFPDS** — Delegation of Financial Powers to Defence Services | Ministry of Defence | Schedule-wise ladder of who may sanction how much, for which item, with or without IFA concurrence | *Who signs, and up to how much?* |
| **DPM** — Defence Procurement Manual | Ministry of Defence | Procedure for revenue procurement: tendering, committees, orders, inspection, payment | *How do I actually buy it?* |

**Version position (to be verified against official text):**

- **DPM:** DPM 2025 is reported in force from 1 November 2025, replacing DPM 2009. Cases with RFPs issued up to 31 October 2025 continue under DPM 2009.
- **DFPDS:** DFPDS 2021 is reported to have been revised in June 2026.
- **GFR:** Procurement value thresholds were revised by Dept of Expenditure orders in 2024 and again in 2025. Which revisions apply to defence units needs confirming.

All three moved inside two years. A unit working from a photocopy made in 2023 is wrong on all three. **This drift is itself part of the problem**, and it is why the product must treat rules as dated, versioned data.

Three things a unit officer needs are in *none* of the three documents: what the unit is authorised to hold (equipment tables and scales), the budget head structure (code heads), and formation-level orders that narrow delegated powers.

---

## 3. The four core problems

### P1. "I don't know what I can buy" — authorisation

One question is really four, and the officer cannot separate them:

1. Is the item authorised to my type of unit at all?
2. Is it centrally supplied (I raise a demand) or locally procurable (I buy it)?
3. Which budget head does it fall under?
4. Which DFPDS schedule item covers it, and at whose level?

DFPDS is indexed by *schedule item and sanctioning authority*. The officer thinks in *things he wants*. No reverse index exists from the thing to the head and schedule. That mapping lives in people's heads.

### P2. "I don't know how to buy it" — procedure

One purchase needs three documents held in mind at once: DFPDS (who sanctions, IFA concurrence or not), GFR (value threshold, GeM obligation), DPM (tender mode, committees, order, inspection, bill). Nobody hands the officer the composed answer. Errors surface late — at formation, at IFA, or months later when the bill is objected to by the paying authority.

### P3. "I don't know if I have the money" — visibility

Three different numbers are routinely confused:

| Number | Meaning | Who knows it today |
|---|---|---|
| **Allotment** | Funds placed at the unit's disposal under a head | The allotment letter |
| **Commitment** | Orders placed, bills not yet paid | Nobody, systematically |
| **Expenditure** | Booked by the accounts office | The accounts office, with a lag |

Because commitment is not tracked, the unit's view of its own balance is wrong all year and resolves only in February–March. The outcomes are over-commitment, a March rush, or lapse.

### P4. "I don't know what would improve my unit" — exposure

All three rulebooks are *permission* documents: they draw the outer boundary. Nothing tells an officer what is worth doing inside it. There is no circulation of precedent — what a comparable unit did with the same head, what cleared audit, what was rejected and why. Every unit starts from zero, and ideas from the troops who actually use the equipment rarely reach the person holding the budget.

---

## 4. Root causes

1. **Rotation destroys memory.** Officers move every two to three years; real knowledge sits with a clerk and leaves with him.
2. **Liability without training.** An officer becomes a sanctioning authority with little formal finance training.
3. **Risk asymmetry.** Not spending carries no penalty; spending wrongly does. Inaction is individually rational and collectively ruinous. *A product that only informs will fail — it must lower the personal risk of acting.*
4. **Amendment drift.** See Section 2.
5. **Local restriction.** Formation orders often narrow what DFPDS permits; the operative ceiling is not the published ceiling.
6. **No owner of the gap.** The failure is *between* documents. No document, office or system owns the composed answer.
7. **Late error discovery.** Mistakes made at the start of a case are found at the end, when there is no time left in the financial year to fix them.

---

## 5. Who is involved

### At the unit

| Role | Relationship to the problem |
|---|---|
| **Commanding Officer (CO)** | Sanctioning authority at unit level. Signs, carries liability, has least time to verify |
| **Second-in-Command (2IC)** | Runs boards and purchase committees; reviews cases before the CO |
| **Adjutant** | Moves the correspondence; absorbs the back-and-forth |
| **Quartermaster (QM)** | Stores, scales, local purchase. First stop for "can we even buy this" |
| **Sub-unit commanders / young officers** | Know what their men need; do not know how to turn a need into a case |
| **Unit accounts clerk / head clerk** | Holds the real knowledge; single point of failure; will be the heaviest user |
| **JCOs and other ranks** | Use the equipment; have the best ideas; have no channel |

### Above the unit

| Role | Relationship to the problem |
|---|---|
| **Formation staff** (Brigade / Division / Corps / Command) | Allot funds downward; process cases beyond unit powers; return files for correctable errors |
| **Higher sanctioning authorities** | Sanction what exceeds unit powers; see under-spend only at year end |
| **Integrated Financial Adviser (IFA)** | Gives concurrence where required; raises the same observations on the same mistakes across units |
| **Defence Accounts (CDA / PCDA and local audit)** | Pre-audits and pays bills; objects months after the error |
| **Auditors** | Review after the fact; need a clean trail |

### Behind the product

| Role | Relationship to the problem |
|---|---|
| **Rule custodian** | Keeps the rule library current and versioned |
| **System / security administrator** | Controls access, hosting, data handling |

---

## 6. Product concept

Seven capabilities, each answering a named problem. This section describes intent only; design comes later.

| # | Capability | What it does | Solves |
|---|---|---|---|
| **C1** | **Ask** — cited assistant | Answers any finance question in plain language. Every answer cites document, version and reference. If it cannot cite, it says so and routes the question to a human | P1, P2 |
| **C2** | **Purchase Readiness Note** — "the chit" | Registers an intended purchase, runs the checks (head, balance, sanctioning authority, IFA concurrence, route), earmarks the funds, and issues a numbered note with the steps to follow | P1, P2, P3 |
| **C3** | **Step guide and document drafts** | A per-case checklist built from the rules for that value and route, with draft documents in the right format | P2 |
| **C4** | **Fund register and payment trace** | Tracks every rupee per head: allotted → earmarked → committed → billed → paid. Each movement linked to a case and a document | P3 |
| **C5** | **Ideas box and precedent library** | Anyone in the unit proposes a need or idea. The system also suggests: what comparable units bought under the same head, what is permissible with unspent balance | P4 |
| **C6** | **Rule library** | GFR, DFPDS, DPM and local orders as dated, versioned, searchable data. The single source every other capability reads from | Root causes 4, 5 |
| **C7** | **Handover and audit pack** | One-click state of the unit's finances and every open case, for an incoming officer or an auditor | Root cause 1 |

### A note on "the chit"

The note must never read as a sanction. It says *this purchase has been registered and checked, funds are earmarked, here is the route* — not *you are authorised to buy*. Sanction remains an act of the competent authority, recorded as one step on the note. Framed this way the note does two jobs at once: it guides the officer, and the act of issuing it is what creates the earmark that makes commitment tracking (P3) possible.

**Lifecycle of a note:** Registered → Checked → Sanctioned (by the competent authority, reference recorded) → Ordered → Received → Bill submitted → Paid → Closed. A note can also be Returned (with reason) or Cancelled (earmark released).

---

## 7. User stories

Format: *As a [role], I want [capability], so that [outcome].* Acceptance notes state what must be true for the story to count as done. Priority: **M** = must have for a credible first version, **S** = should, **L** = later.

### 7.1 Commanding Officer

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| CO-1 | As a CO, I want to see on one screen what I have been allotted, what is earmarked, committed and paid under each head, so that I know what I can still spend today | Balance per head = allotment − earmarked − committed − paid; figures show as-of date | M |
| CO-2 | As a CO, I want every case put up to me to show the rule it relies on and the checks it passed, so that I can sign with confidence | Each case shows head, schedule reference, ceiling, my power vs case value, IFA requirement, route — each with citation | M |
| CO-3 | As a CO, I want to be told plainly when a case exceeds my powers and who the right authority is, so that I do not sanction beyond my delegation | Case value above my ceiling is flagged before it reaches me; next authority named | M |
| CO-4 | As a CO, I want a warning when related purchases together would cross a threshold, so that I am never accused of splitting a demand | Similar items / same vendor / close dates are surfaced with combined value | M |
| CO-5 | As a CO, I want early warning of heads likely to lapse and heads running hot, so that I can re-prioritise or surrender in time | Projection against quarter and year end; alert thresholds configurable | S |
| CO-6 | As a CO, I want a shortlist of worthwhile ways to use unspent balance under a head, so that money goes to betterment rather than lapsing | Suggestions are tied to the head, show precedent source and permissibility citation | S |
| CO-7 | As a CO taking over command, I want a handover pack of fund position, open cases, pending bills and unresolved observations, so that I inherit no surprises | Pack generated on demand; lists every open note with stage and age | M |
| CO-8 | As a CO, I want to see and decide on ideas raised by my unit, so that good ideas from any rank can become cases | Ideas queue with accept / defer / decline and reason | S |

### 7.2 Second-in-Command

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| 2IC-1 | As 2IC, I want to know which committee or board a purchase needs and how it must be constituted, so that proceedings are valid | Committee type and composition shown per case with citation | M |
| 2IC-2 | As 2IC, I want a pre-submission check of every case file, so that nothing goes up or to the CO with a correctable error | Checklist of required documents and fields; missing items listed | M |
| 2IC-3 | As 2IC, I want one view of all open cases by stage and age, so that I can chase what is stuck | Filter by stage, head, owner; cases idle beyond N days highlighted | S |
| 2IC-4 | As 2IC, I want to plan the year's spending by quarter against the allotment, so that expenditure is phased and not bunched in March | Plan vs actual per head per quarter | S |

### 7.3 Adjutant

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| ADJ-1 | As Adjutant, I want draft letters and statements of case in the accepted format, so that files are not returned on format | Drafts generated from case data; editable; format source noted | S |
| ADJ-2 | As Adjutant, I want every returned case logged with the reason, so that the same mistake is not repeated | Return reason captured; shown as a caution on similar future cases | S |
| ADJ-3 | As Adjutant, I want reminders for dated obligations (quarterly returns, surrender dates, year-end cut-offs), so that nothing is missed | Calendar seeded from rules and local orders | S |

### 7.4 Quartermaster

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| QM-1 | As QM, I want to type an item in plain words and learn whether it is authorised, centrally supplied or locally procurable, and under which head, so that I start on the right path | Answer covers all four P1 questions; each part cited or marked "not known — ask" | M |
| QM-2 | As QM, I want to register an intended purchase and receive a Purchase Readiness Note, so that the purchase is noted, funds are earmarked and I have the steps | Note carries unique number, item, value, head, authority, IFA requirement, route, steps, and the statement that it is not a sanction | M |
| QM-3 | As QM, I want to be told the correct purchase route for the value and item (GeM, quotation, committee, limited or open tender, proprietary), so that I use the right mode | Route chosen from current thresholds in the rule library, with citation and version date | M |
| QM-4 | As QM, I want a step-by-step checklist for the chosen route, so that I do each step in order and can show I did | Steps tick off; each completion is time-stamped with who did it | M |
| QM-5 | As QM, I want to record the order, receipt and inspection against the note, so that the trail from intent to stores is complete | Each stage accepts document reference and date | M |
| QM-6 | As QM, I want to record past vendors and prices paid, so that I can show price reasonableness next time | Last-purchase price retrievable by item | S |
| QM-7 | As QM, I want to cancel a note when a purchase is dropped, so that the earmarked funds return to the balance | Cancellation needs a reason; balance updates at once | M |

### 7.5 Sub-unit commanders and young officers

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| YO-1 | As a company commander, I want to raise a need in plain language without knowing the rules, so that my men's requirements enter the system | Need captured with what, why, rough cost; routed to QM / 2IC | M |
| YO-2 | As a young officer, I want to ask basic questions privately and get a cited answer, so that I learn without embarrassment | Questions are not shown to superiors by default | M |
| YO-3 | As a young officer, I want short explainers of the concepts (sanctioning authority, concurrence, heads, commitment), so that I build real understanding over time | Explainers link to the source rule | S |
| YO-4 | As an officer who raised a need, I want to see where it stands, so that I can tell my men | Status visible to the originator | S |

### 7.6 Unit accounts clerk / head clerk

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| CLK-1 | As the accounts clerk, I want to enter each allotment letter once and have balances update, so that I stop maintaining parallel registers | Allotment entry by head, amount, date, letter reference; additional allotments and withdrawals supported | M |
| CLK-2 | As the accounts clerk, I want every payment traced to its case, bill and head, so that any figure can be explained in seconds | Each payment links note → order → bill → payment reference | M |
| CLK-3 | As the accounts clerk, I want to record bill submission and the paying office's response, so that pending and objected bills are visible | Bill states: submitted, under audit, objected (with reason), paid | M |
| CLK-4 | As the accounts clerk, I want to reconcile my register against the accounts office's booked figures, so that differences are found monthly, not in March | Side-by-side by head; unmatched entries listed | S |
| CLK-5 | As the accounts clerk, I want the periodic returns produced from the data already entered, so that I do not retype them | Return formats configurable; export to print | S |
| CLK-6 | As the accounts clerk, I want to work in simple screens, in Hindi or English, and on a slow connection, so that the tool is faster than my register | Core entry tasks need no training beyond a short demo | M |
| CLK-7 | As a clerk about to be posted out, I want my working knowledge captured in the system, so that my successor is not starting from nothing | Notes and cautions can be attached to heads, vendors and case types | S |

### 7.7 JCOs and other ranks

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| OR-1 | As a JCO or jawan, I want to put an idea or a need in the ideas box, so that people who use the equipment are heard | Simple submission; optional anonymity; category and short description | S |
| OR-2 | As a contributor, I want to know what happened to my idea, so that I keep contributing | Outcome and reason visible to the submitter | S |
| OR-3 | As the Subedar Major, I want to see ideas from the ranks grouped by theme, so that I can bring the strongest to the CO | Grouping and count per theme | L |

### 7.8 Formation staff and higher sanctioning authorities

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| FMN-1 | As formation staff, I want cases from units to arrive complete and correctly routed, so that I stop returning files | Case reaching formation has passed the pre-submission check | S |
| FMN-2 | As formation staff, I want to see spend against allotment for all my units during the year, so that I can move funds from where they will lapse to where they are needed | Per-unit, per-head position; drill-down | L |
| FMN-3 | As formation staff, I want to publish formation orders that restrict or clarify powers, so that every unit's checks use the operative rule, not just the published one | Local order entered once applies to all units under the formation, with effective date | S |
| FMN-4 | As a higher sanctioning authority, I want a one-page brief for each case put up to me, so that I can decide quickly | Brief shows requirement, value, head, power, checks, precedent | L |
| FMN-5 | As formation staff, I want to share a good purchase by one unit with the rest, so that useful practice spreads | Entry added to the precedent library with permissibility reference | S |

### 7.9 Integrated Financial Adviser

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| IFA-1 | As IFA, I want cases that need my concurrence to arrive with the standard points already addressed, so that my examination is about substance | Case shows necessity, head, fund availability, power, route, price basis | S |
| IFA-2 | As IFA, I want my recurring observations turned into checks units see before they submit, so that I stop writing the same note | Observation can be saved as a reusable caution against a case type | L |
| IFA-3 | As IFA, I want to see that funds were earmarked before the case reached me, so that availability is not in doubt | Earmark reference and balance at time of earmark visible | S |

### 7.10 Defence Accounts and audit

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| ACC-1 | As the paying office, I want bills to arrive with the sanction, order, receipt and inspection references complete, so that fewer bills are objected to | Bill pack checklist enforced before submission | S |
| ACC-2 | As an auditor, I want the full trail for any purchase — need, checks, sanction, order, receipt, payment — in one place, so that audit is quick and fair | Read-only case history with time-stamps and who acted | M |
| ACC-3 | As an auditor, I want to see which version of a rule a decision relied on, so that I judge it by the rule in force at the time | Each case stores the rule version and date it was checked against | M |

### 7.11 Rule custodian and administrator

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| ADM-1 | As rule custodian, I want to load an amendment with its effective date and source reference, so that answers change from that date and old cases keep their old basis | Rules are versioned; nothing is overwritten | M |
| ADM-2 | As rule custodian, I want every assistant answer that could not be cited or was marked wrong by a user to be queued for my review, so that gaps in the library get closed | Review queue; correction feeds the library | M |
| ADM-3 | As administrator, I want role-based access, so that each person sees only what their appointment requires | Roles map to Section 5; access changes are logged | M |
| ADM-4 | As administrator, I want every action logged and nothing silently deletable, so that the system itself is audit-proof | Append-only log; corrections are new entries | M |
| ADM-5 | As security administrator, I want the system to run within approved hosting and hold no data above its approved classification, so that it can be cleared for use | Depends on decisions in Section 12 | M |

### 7.12 The assistant ("Ask") — behaviour stories

These apply to every user of C1.

| ID | Story | Acceptance | Pri |
|---|---|---|---|
| ASK-1 | As any user, I want every answer to cite the document, version and reference it rests on, so that I can verify and defend it | No citation → no assertion | M |
| ASK-2 | As any user, I want the assistant to say "I do not know" when the library does not cover my question, and tell me whom to ask, so that I am never misled | Uncited guesses are not shown | M |
| ASK-3 | As any user, I want the assistant to use my unit's context (head balances, my role's powers, local orders), so that the answer is about my situation, not the general rule | Answer distinguishes general rule from local position | S |
| ASK-4 | As any user, I want to move from an answer straight to "register this purchase", so that advice turns into action | Answer offers to start a note pre-filled from the conversation | S |
| ASK-5 | As any user, I want to flag an answer as wrong, so that the library improves | Flag goes to ADM-2 queue | M |

---

## 8. One purchase, end to end

How the capabilities connect, using a single example. A company commander wants better training aids.

1. **Need raised** — the company commander describes it in plain words (YO-1), or a jawan drops it in the ideas box (OR-1) and the CO accepts it (CO-8).
2. **Can we buy it?** — the QM asks; the assistant answers authorisation, source of supply, head and schedule, with citations (QM-1, ASK-1).
3. **Do we have the money?** — the fund register shows the uncommitted balance under that head (CO-1).
4. **Note issued** — the QM registers the purchase; checks run; funds are earmarked; a numbered Purchase Readiness Note is issued with the route and steps (QM-2, QM-3). Splitting check runs (CO-4).
5. **Sanction** — the case goes to the CO with its checks and citations (CO-2). If beyond the CO's powers, or needing IFA concurrence, it is routed upward complete (CO-3, FMN-1, IFA-1).
6. **Purchase** — the QM follows the checklist for the route; committee constituted correctly (QM-4, 2IC-1).
7. **Order, receipt, inspection** — recorded against the note; earmark becomes commitment (QM-5).
8. **Bill** — bill pack checked and submitted; status tracked (CLK-3, ACC-1).
9. **Paid and closed** — payment recorded; commitment becomes expenditure; note closes (CLK-2).
10. **Shared** — the purchase enters the precedent library for other units (FMN-5).
11. **Later** — an auditor or the next CO opens the trail and sees everything, including the rule version relied on (ACC-2, ACC-3, CO-7).

---

## 9. Guardrails

Hard limits on anything built. These are not preferences.

1. **Cite or stay silent.** An uncited answer is worthless to an officer who must defend it; a wrong one can end a career.
2. **The product advises; the competent authority sanctions.** No screen, note or message may read as a sanction or approval.
3. **Rules are versioned data.** No threshold or ceiling is hard-coded. Every case stores the rule version it was checked against.
4. **Local orders override.** The system must hold formation-level restrictions and apply the operative rule.
5. **Nothing is silently deleted.** Corrections are new entries. The log is append-only.
6. **Built for the clerk.** If the accounts clerk does not find it faster than the register, it will not be used.
7. **Security is decided first.** Hosting, classification and what data the system may hold are settled before design, not after.
8. **The product does not move money.** It records and guides. Payment remains with the existing accounts machinery.

---

## 10. Out of scope for now

- Capital acquisition (governed separately from revenue procurement)
- Non-public / regimental funds
- Pay and allowances
- Works executed through engineer services
- Making or initiating payments
- Integration with existing government systems (GeM, defence accounts systems) — desirable later, not assumed
- Any classified information

---

## 11. What success looks like

| Outcome | Measure |
|---|---|
| Officers know what they can buy and how | Share of questions answered with a citation; share of users who act on the answer |
| Cases clear first time | Share of cases returned by formation, IFA or paying office, before vs after |
| The unit knows its balance all year | Difference between unit register and booked figures at each month end |
| Money is used, and used evenly | Year-end lapse per head; share of annual spend falling in the last quarter and in March |
| Knowledge survives rotation | Time for a new officer or clerk to raise a first clean case |
| Ideas reach the budget | Ideas submitted, accepted, and converted to closed purchases |
| Trust | Zero instances of an answer or note later contradicted by audit on a point the library covered |

---

## 11A. Decision: version 1 is rules-only (decided 11 November 2026)

Version 1 holds **no real unit figures**: no allotments, balances, payments or bills. It solves P1, P2 and P4 and removes most of the security approval burden. P3 (visibility of money) waits for version 2, once the rules product has earned trust and a hosting route is agreed.

**In version 1** (stories that need rules and procedure, not unit money):

| Area | Stories |
|---|---|
| Ask (assistant) | ASK-1, ASK-2, ASK-5 |
| Can I buy it, and how | QM-1, QM-3, QM-4 (checklist only, no money fields), 2IC-1, 2IC-2, CO-2 (rule and route part), CO-3 |
| Learning | YO-2, YO-3 |
| Drafting | ADJ-1 |
| Ideas | OR-1, OR-2, YO-1, CO-8 (ideas carry no figures beyond a rough cost band) |
| Rule library | ADM-1, ADM-2, ADM-3, ADM-4, FMN-3 (formation orders as rules) |

**Deferred to version 2** (need real money data): CO-1, CO-4, CO-5, CO-6, CO-7, 2IC-3, 2IC-4, QM-2 (earmark part), QM-5, QM-7, all CLK stories, ACC-1 to ACC-3, IFA-3, FMN-2, FMN-4.

**What the Purchase Readiness Note becomes in version 1:** a route-and-checklist note. It states the item category, the right purchase route for a value the user types in, the sanctioning level, whether concurrence is likely needed, and the steps, all cited. It performs no fund check and earmarks nothing. Users should be told to enter an indicative value, not a live case figure.

**Still to settle even for rules-only:** whether typed queries and ideas are stored, where, and for how long. Treat them as sensitive by default until the security question in Section 12 is answered.

---

## 12. Open questions and things to verify

**Decisions needed**

1. **Security and hosting.** May the system hold real unit figures? On what network and hosting? This decides the architecture.
2. **Who is the first customer?** A single unit, a formation, or a higher headquarters? Who can approve a pilot?
3. **First version cut.** *Decided: rules-only (see Section 11A).* The full version (adds C4, C7) solves P3 but needs real data, and follows later.
4. **Does adoption depend on anyone above the unit?** Stories in 7.8–7.10 make the product better but must not be required for a unit to get value on day one.
5. **Who is the rule custodian in practice**, and who is accountable when a rule entry is wrong?

**Facts to verify with source documents and serving officers**

6. Current official text of DPM 2025, the latest DFPDS and its Army schedules, and GFR 2017 with all amendments. Obtain authoritative copies.
7. Which GFR threshold revisions apply to defence units, and how DPM 2025 treats GeM.
8. Exact unit-level sanctioning powers and where IFA concurrence begins.
9. The unit-level budget heads and grants actually handled by a unit, and how allotment reaches it.
10. Correct names and duties of unit and formation appointments in Section 5 — these vary by arm and type of unit.
11. The existing registers, returns and formats the product would replace or produce.
12. What systems units already use, so the product complements rather than duplicates them.
13. Whether a numbered note issued by a non-official tool is acceptable on a case file, and what wording it must carry.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Allotment** | Funds placed at an authority's disposal under a budget head for the year |
| **CDA / PCDA** | Controller / Principal Controller of Defence Accounts — audits and pays bills |
| **CFA** | Competent Financial Authority — the person empowered to sanction a given expenditure |
| **Commitment** | A liability created by placing an order, before the bill is paid |
| **DFPDS** | Delegation of Financial Powers to Defence Services |
| **DPM** | Defence Procurement Manual — revenue procurement procedure |
| **Earmark** | Funds set aside against an intended purchase before an order is placed (a term used by this product) |
| **GeM** | Government e-Marketplace |
| **GFR** | General Financial Rules |
| **Head** | A budget classification under which funds are allotted and expenditure booked |
| **IFA** | Integrated Financial Adviser |
| **Lapse** | Funds unspent at year end, which do not carry forward |
| **Purchase Readiness Note** | This product's numbered record that a purchase is registered, checked and earmarked. Not a sanction |
| **Revenue procurement** | Day-to-day purchases of stores and services, as distinct from capital acquisition |
| **Splitting** | Dividing one requirement into smaller purchases to stay within a lower authority's powers. Not permitted |
| **Surrender** | Formally returning funds that will not be spent, so they can be used elsewhere |
