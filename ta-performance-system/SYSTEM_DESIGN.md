# TA Performance & Development Management System — Solution and Dashboard Design

**Source:** *TA Performance & Development Management System — BRD & Functional Specification v1.0* (Talent Acquisition, India), plus the additional requirements in the design request (data import, employee input, team-member comparison, promotion recommendations, rating history, job level, Team Lead scorecards and the India TA team structure).

**Status of this document:** Solution design for stakeholder review. It is **not** approved scoring policy. Every rule the BRD leaves open or states inconsistently is listed in [Section 8](#8-open-questions-ambiguities-and-conflicting-brd-rules-requiring-confirmation) and must be confirmed before production use.

**Companion files**

| File | What it is |
|---|---|
| [`index.html`](index.html) | Working dashboard implementing this design: starts with fictional sample data, or an empty live workspace for your own team; role switching, paste/upload import with validation, employee requests, comparison, promotion view and PDF/Excel reports. |
| [`README.md`](README.md) | How to open and use the dashboard with your own data. |
| [`templates/`](templates) | CSV import templates: offers, employee profile (team, role, also-supports, status, job level, 3-year ratings), recruiter scorecard (YTD summary), learning, project updates and competency ratings. |

### How to read the labels

| Label | Meaning |
|---|---|
| **[BRD]** | Confirmed requirement stated in the BRD. |
| **[REQ]** | Confirmed requirement added by the business owner in the design request (not in the BRD). |
| **[REC]** | Recommendation from this design. Not policy until accepted. |
| **[ASM]** | Assumption made so the design can proceed. Must be checked. |
| **[DEC]** | Decision required from a stakeholder. Cross-referenced to the open-items log (e.g. **D-07**). |

---

## 1. Executive summary and recommended solution

### 1.1 What the system must do

The BRD asks for one governed place where each TA team member and the TA Head can see, through the year, **what was expected, what happened, what the evidence shows, and what action is required** [BRD §1]. It replaces separate scorecards, hiring trackers, project trackers and learning records [BRD §2.1].

| Business goal | How the design meets it |
|---|---|
| Continuous, transparent performance tracking [BRD] | Calculated KPIs refresh after each data import; every score shows its formula, inputs and rule version. |
| Fair recognition of hiring complexity and women hiring [BRD] | Transaction-level hiring points, women-hiring bonus and hiring mix, with the rule table that produced them. |
| Consistency, not just year-end totals [BRD] | Every closed 10-working-day cycle is stored and shown, so steady delivery is distinguishable from late catch-up. |
| Evidence-based development [BRD] | Learn → Apply → Evidence → Assess → Improve; attendance alone never changes a score. |
| Human-governed decisions [BRD] | System calculates and flags; the TA Head rates, validates, overrides (with reason) and finalises. AI is advisory only. |
| Less manual entry by employees [REQ] | Authorised users upload or paste operational data; employees confirm, comment or add evidence instead of keying it. |
| Team-member reports and comparison [REQ] | Individual and section reports, side-by-side comparison, bulk generation. |
| Promotion insight for the TA Head only [REQ] | A confidential, advisory readiness view with reasons, hidden from employees, Team Leads, peers and administrators. |
| Individual Contributor (IC) and Team Lead (TL) evaluation [REQ] | Two scorecard templates on one engine; TL template measures team goal achievement, leadership, competency development and own delivery at 50% of the team-member offer target. |

### 1.2 Recommended solution

**[REC]** Build one system with four layers, in the order the BRD prescribes (Data → Workflow → Rules → Controls → Roles → Decisions → UI) [BRD §16]:

| Layer | Contents | Preferred technology [BRD §16] | Tool-agnostic equivalent |
|---|---|---|---|
| Data | Employee master, targets, calendar, offer transactions, rules, assessments, projects, learning, IDP, imports, requests, exceptions, audit, report versions | Dataverse (SharePoint Lists as fallback) | Any governed relational store with row/column security |
| Rules engine | Versioned, effective-dated scoring rules; deterministic calculations | Dataverse calculated tables / Power Automate / Power BI measures | Stored procedures or service layer |
| Workflow | Imports, approvals, requests to employees, reminders, calibration, finalisation | Power Automate + Approvals | Any workflow engine |
| Experience | Data entry and review screens; analytics and reports | Power Apps (entry, review); Power BI (analytics, paginated reports) | Web app + BI tool |
| AI (optional) | Draft summaries, trend notes, IDP suggestions | Enterprise-approved Copilot / Azure OpenAI | Any approved LLM with grounding |

**[REC] Why SharePoint is only a fallback:** the design needs column-level security for confidential commentary and promotion notes, effective-dated rules and reliable audit. Dataverse provides these natively; SharePoint Lists would need workarounds (separate lists per confidentiality level, item-level permissions) that are fragile at scale.

### 1.3 Page structure at a glance

| # | Page | Primary user | Question it answers |
|---|---|---|---|
| 1 | My Performance (Employee dashboard) | Employee, TL | Am I on track, and what should I do next? |
| 2 | Team Overview (TA Head / team dashboard) | TA Head (TL: own team, operational only — **D-24**) | Who is on track, who needs support, and why? |
| 3 | Compare Members | TA Head | How do selected members compare on the same basis? |
| 4 | Exceptions | TA Head | What needs my action this week? |
| 5 | Capability Heatmap | TA Head | Where are team-wide capability gaps and internal experts? |
| 6 | Annual Review & Calibration | TA Head, Employee | Is the year-end record complete, fair and approved? |
| 7 | Development Plan (IDP) | Employee, TA Head | What will this person develop next year, and how will we know? |
| 8 | Data Import | TA Head, delegated importer | Is the data I'm loading correct and approved? |
| 9 | Requests & Inbox | Employee, TA Head | What input or confirmation is pending from whom? |
| 10 | Reports | All (scoped) | Can I download the record I need, in the right version? |
| 11 | Talent & Promotion (confidential) | TA Head only | Who may be ready for promotion, and on what evidence? |
| 12 | Administration | System Administrator | Are rules, calendar and master data correct and audited? |

### 1.4 Performance model (summary)

| Pillar | Points | Basis | Who decides |
|---|---|---|---|
| Business Deliverables | 70 | Offer Delivery & Complexity 40, Joining Ratio 15, Req-to-Offer Cycle Time 10, Vendor Usage 5 [BRD §5] | System calculates; TA Head may override with reason |
| Improvement Projects | 15 | DMAIC evidence and impact: discipline 5, impact 5, control 3, learning 2 [BRD §7.2] | TA Head validates and scores |
| Competency Development | 15 | Capability growth 7, application of learning 5, plan completion 3 [BRD §8] | TA Head scores with evidence |
| Behavioural assessment / Areas for improvement | **Not weighted** | 8 core competencies, 1–5 scale, self vs TA Head [BRD §4, §6] | Coaching and diagnostic layer only |

The Team Lead template is described in [Section 4.7](#47-team-lead-tl-scorecard--proposed-requires-approval). It is a **proposal** pending **D-20 to D-23**.

---

## 2. Users, permissions, and key workflows

### 2.1 Roles

| Role | Source | Who | Purpose |
|---|---|---|---|
| Employee — Individual Contributor | [BRD] | Recruiters in each TA team | Own performance and development record |
| Employee — Team Lead | [REQ] | One lead per TA team (assumed — **D-24**) | Own record (TL template) plus, if approved, operational view of own team |
| TA Head | [BRD] | Head of TA, India (business owner) | Rates, validates, calibrates, finalises, owns imports and promotion insight |
| System Administrator | [BRD] | IT / HRIS | Master data, rules, calendar, periods, technical settings. **No automatic access to confidential commentary** [BRD §3.3] |
| Delegated Data Importer | [REC] | TA Ops / MIS analyst nominated by TA Head | Prepares imports; cannot approve them or see confidential ratings (**D-26**) |
| HR Business Partner / Calibration reviewer | [REC] | Optional | Read-only access to the calibration pack during year-end (**D-25**) |

### 2.2 TA team structure [REQ]

The business owner confirmed four TA teams, each serving one or more business areas. This confirms that *TA team* (reporting line, team goal, Team Lead) and *business area* (cadence target) are separate fields.

| TA team | Business areas served | Offer cadence target (per 10 working days) | Status |
|---|---|---|---|
| TTI | GTP, GTO (assumed), GTT | GTP 5 · GTO 4 · GTT 4 [BRD §5.1] | Request listed "GTP, GTP, GTT" — second GTP assumed to be **GTO** (**D-44**) |
| DTO+ | DTO, FCA, Penta, VFS | DTO 5 · FCA 5 · VFS 4 [BRD §5.1] · **Penta: not in BRD** | **D-15** for Penta |
| University Relations & Early Career Hiring | PMIS, NATS, GET, PGET, ExcelHER programmes | **Not defined in BRD** | **D-15** (consider seasonal or programme-based targets) |
| VCE + Leadership Hiring | VCE, Leadership Hiring | VCE 4 [BRD §5.1] · **Leadership Hiring: not defined** | **D-15** (consider a points-based target given SG9+ complexity) |

**[ASM]** One Team Lead per TA team; the TL's own target is 50% of the target of the business area they personally serve (**D-20**). A TL's *team goal* is the combined expected vs actual offers of their team members, each measured against their own business-area target (**D-23**). The prototype uses placeholder targets (Penta 4, Early Careers 6, Leadership Hiring 1), labelled *Placeholder* wherever they appear.

**Editable structure [REQ].** Teams, their business areas, and roles are workspace settings rather than fixed lists. The TA Head (or the administrator, for master data) can add or rename teams, set each team's business areas, define roles, and reassign any person's team, business area or role. Each role uses one of three scorecard templates: *Recruiter*, *Team Lead* or *Support (no hiring targets)*. A person has one primary team, and may also be marked as supporting other teams; they then appear in those teams' views but count only in their primary team's goal (D-49). Former members keep their records and are evaluated to their leaving date (D-50). Every assignment change requires a reason and is audited.

### 2.3 Permission matrix

Key: **V** view · **E** enter/edit · **U** upload/paste · **Val** validate · **C** comment · **A** approve · **D** download · **Am** amend (with reason, audited) · — no access

| Data object | Employee (own) | Team Lead (own team) **D-24** | TA Head (team) | Delegated importer | System Admin | Peers |
|---|---|---|---|---|---|---|
| Offer transactions & calculated KPIs | V, C, D | V (team aggregates + member operational KPIs), D | V, U, Val, A, Am, D | U (prepare only) | V (technical, no names if masking adopted) | — |
| Requests for confirmation/evidence | V, E (response), C | — | E (create), V, A | — | — | — |
| Self-assessment | E, V, D | — (own only) | V | — | — | — |
| TA Head ratings and comments | V once released, C | — | E, V, Am, D | — | **— unless break-glass approved** | — |
| Improvement projects | E (progress, evidence), V, D | V (team projects) | V, Val, E (score), A, D | — | — | V only if project team member (title, stage; no scores) |
| Learning records | E, V, D | V (team completion status) | V, Val, D | U | — | — |
| Competency Development score | V once released | — | E, Am, D | — | — | — |
| IDP | E (draft input), V, C, D | V (team summary) | E, A, D | — | — | — |
| Overrides and exceptions | V (own, with reason) | — | E, A | — | V (audit only) | — |
| Job level, 3-year rating history [REQ] | V (own, if policy allows — **D-29**) | — | E, U, V, Am | — | — | — |
| Promotion readiness & notes [REQ] | **—** | **—** | E, V, D | **—** | **—** | **—** |
| Rules, targets, calendar | V (published rules) | V | V, propose | — | E (versioned, audited) | — |
| Audit log | V (own record events) | — | V (team) | V (own imports) | V (all, technical) | — |
| Reports | D (own, released versions) | D (own; team operational if **D-24**) | D (all, bulk) | — | — | — |

**Principles applied** [BRD §14]: employees see only their own data; the TA Head sees authorised team data; peers never see confidential evaluations; administrator access to confidential commentary requires a recorded, time-limited, approved break-glass request (**D-27**).

### 2.4 Key workflows

| Workflow | Cadence / trigger | Steps | Owner |
|---|---|---|---|
| W1. Data import | Weekly (recommended) or on demand | Upload/paste → map → validate → correct → preview → approve → publish → recalculate → (optional) share with employees | TA Head (approve); importer (prepare) |
| W2. Employee confirmation | After W1, or any time | TA Head sends request (confirm / comment / evidence / correct) → employee responds → TA Head accepts or rejects → audit | TA Head, Employee |
| W3. 10-working-day cadence | Each cycle close [BRD §12] | Close cycle → calculate offers and points vs target → notify employee and TA Head if below target → optional coaching note | System, TA Head |
| W4. Monthly updates | 1st working day of month [BRD §12] | Request project progress and learning-application updates → reminder at +5 working days → escalation at +10 | System, Employee |
| W5. Quarterly dual assessment | Quarter end [BRD §12] | Self-assessment with evidence → TA Head independent rating → gap calculated → coaching record → employee acknowledgement | Employee, TA Head |
| W6. Threshold breach | On recalculation [BRD §12] | Exception raised → owner notified → action or approved exception recorded → closed with audit | System, TA Head |
| W7. Override / exception | On demand | Request with original value, proposed value, reason, evidence → TA Head approves → recalculated; original kept [BRD §14] | TA Head |
| W8. Year-end review & calibration | Year end [BRD §12] | Freeze cut-off → validate metrics → complete self/manager assessments → validate projects & capability → AI draft summary (optional) → calibrate → finalise → employee comments → lock | TA Head |
| W9. Next-year IDP | After W8 | Draft from validated gaps → employee input → TA Head approves → targets set for next year | TA Head, Employee |
| W10. Rule change | On demand | Admin proposes new rule version with effective date → TA Head approves → applied prospectively; prior results unchanged unless a recorded recalculation is approved | Admin, TA Head |

---

## 3. Dashboard pages and proposed layouts

Design standard [BRD §17]: white canvas, Deep Navy `#18324A`, Muted Teal `#397A86`, Soft Blue-Grey `#EEF3F5`, Charcoal `#303A43`; no gradients, 3D or decorative gauges; line charts for trends, horizontal bars for comparison, progress bars for targets, heatmaps and DMAIC trackers.

**[REC] Common layout rules**

- One global filter row: Review period · Team · Business area · Role type (IC / TL) · Employee. Filters persist across pages.
- Each section has the same three actions: **View details · Download PDF · Download Excel** [BRD §11.8].
- Every number has a status shown by **text and icon**, never colour alone: `✓ On track`, `▲ Watch`, `✕ Below target`, `○ Not yet scored`, `⧗ Provisional (rule pending)`.
- Every score shows a small "How calculated" link that opens the formula, inputs, rule version and any override.
- Partial 10-day cycles display a pro-rata target labelled *Operational, not scored* [BRD §5.1].

### 3.1 My Performance (Employee dashboard) [BRD §10.1]

```
┌ Header ─────────────────────────────────────────────────────────────────────────┐
│ Name · Role (IC/TL) · Team · Business area · Manager · Period · Data cut-off     │
│ Self score | TA Head score | Gap | Status: Draft / In review / Final             │
├ Action strip ───────────────────────────────────────────────────────────────────┤
│ "2 requests need your response" · "Q3 self-assessment due 25 Oct" · "1 overdue"  │
├ Score cards (4) ────────────────────────────────────────────────────────────────┤
│ Deliverables xx/70 │ Projects xx/15 │ Development xx/15 │ Total xx/100 ⧗         │
├ Business delivery ──────────────────────────────────────────────────────────────┤
│ KPI cards: Expected vs actual offers (progress bar) · Weighted points · Joining  │
│ ratio · Avg cycle time (median in subtext) · Vendor usage                        │
│ Chart A: Offers per closed 10-day cycle vs target (bars + target line)           │
│ Chart B: YTD cumulative offers vs expected (two lines)                           │
│ Table: hiring mix by category and SG, with points                                │
├ Behaviours & areas for improvement ─────────────────────────────────────────────┤
│ Table: competency · self · TA Head · gap · target · evidence · action            │
├ Improvement projects ───────────────────────────────────────────────────────────┤
│ DMAIC tracker per project: D ● M ● A ◐ I ○ C ○ · plan vs actual · next milestone │
├ Competency development ─────────────────────────────────────────────────────────┤
│ Line chart: baseline → quarterly → current → target (self dashed, TA Head solid) │
│ Learning list with application evidence and validation status                    │
├ Next-year IDP ──────────────────────────────────────────────────────────────────┤
│ Priorities with training · certification · stretch assignment · application      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

| Element | Question it answers |
|---|---|
| Score cards | Where do I stand overall, and is any score still provisional? |
| Offers per 10-day cycle | Am I delivering consistently, or catching up late? |
| YTD cumulative vs expected | Am I ahead or behind for the year so far, and by how many offers? |
| Hiring mix | What complexity am I delivering, and where do my points come from? |
| Joining ratio card | Are my offers converting to joiners? |
| Cycle time card (avg + median) | Am I filling roles fast enough, and are outliers distorting the average? |
| Vendor usage card | Am I relying too much on vendors? |
| Self vs TA Head table | Where do we see my capability differently, and what should we discuss? |
| DMAIC tracker | Is my project progressing on evidence, and what is the next milestone? |
| Competency line chart | Am I growing towards my target level? |
| Action strip | What do I need to do now? |

### 3.2 Team Overview (TA Head) [BRD §10.2]

```
┌ Filters: Period · Team · Role type · Status ────────────────────────────────────┐
├ Team cards: Members · On track · Watch · Below · Open exceptions · Pending reqs ─┤
├ Team table [BRD §10.2] ─────────────────────────────────────────────────────────┤
│ Employee │ Team │ Type │ Deliv /70 │ Proj /15 │ Dev /15 │ Total │ Self │ Mgr │   │
│ Gap │ Status │ ▸ drill-down                                                       │
├ Chart: Volume attainment % by member (horizontal bars, 100% reference line) ────┤
├ Chart: Team offers per 10-day cycle vs team target ─────────────────────────────┤
└─────────────────────────────────────────────────────────────────────────────────┘
```

Questions answered: *Who is behind and by how much? Is the team on cadence? Whose self-view differs from mine?* Clicking a row opens that member's full My Performance view in TA Head mode, including manager-only fields.

**[REC]** ICs and TLs appear in separate groups by default, because TL scores use a different template and should not be ranked on one list (**D-23**).

### 3.3 Compare Members [REQ]

- Select 2–8 members, a period and a role type. Mixing IC and TL is allowed only on the shared measures (Projects, Competency Development, behaviours), with a visible note.
- Layout: side-by-side columns per member; rows for each KPI, pillar and competency; small horizontal bars on each row; "Difference from team median" column.
- Actions: Download PDF / Excel comparison.
- **Guardrail [REC]:** comparison is a TA Head view. Its purpose is calibration consistency, not forced ranking; the page shows a reminder to review context (business area difficulty, leave, role mix) before drawing conclusions.

### 3.4 Exceptions (Management exception view) [BRD §10.3]

A single prioritised action list, grouped by type, each row with *member · measure · value · threshold · since · suggested action · owner · status*:

| Exception | Trigger | Threshold status |
|---|---|---|
| Below cadence | Closed cycle offers < target | Confirmed concept; whether single cycle or YTD — **D-16** |
| Repeated 10-day misses | N consecutive missed cycles | N undefined — **D-16** (prototype uses 2, configurable) |
| Joining ratio below threshold | Matured joining ratio < 85% (where the 13-point band starts) | Threshold not stated — **D-05** |
| Cycle time > 55 days | Period average > 55 | [BRD] |
| Vendor usage > 20% | Period vendor % > 20 | [BRD] |
| Stalled DMAIC project | No validated stage change in X days, or past planned stage date | X undefined — **D-17** (prototype uses 45 days) |
| Competency materially below target | TA Head rating ≤ target − N | N undefined — **D-18** (prototype uses 1) |
| Self vs manager gap > 1 level | \|self − TA Head\| > 1 | Whether ">1" means ≥2 — **D-19** |
| Overdue development actions | IDP/AFI action past target date and not closed | [BRD] |
| Pending employee requests [REC] | Request past due date | [REC] |
| Unapproved import batches [REC] | Batch awaiting approval > 3 working days | [REC] |

### 3.5 Capability Heatmap [BRD §10.4]

- Rows: employees (grouped by team); columns: 8 core competencies; cells: **TA Head validated** rating 1–5, with the number printed in the cell (not colour alone) and a single-hue light-to-dark scale.
- Column footer: team average and count at ≥4 (internal experts); row footer: count of gaps vs target.
- Toggle: *Rating* / *Gap to target*.
- Questions: *Which capability needs a team-wide programme? Who can coach whom?* AI must not designate successors [BRD §10.4]; the page says so.

### 3.6 Annual Review & Calibration [BRD §12]

A checklist-style workflow per employee, with a team progress bar:

| Step | Gate to proceed |
|---|---|
| 1. Freeze data cut-off | Cut-off date set; imports after cut-off flagged |
| 2. Validate metrics | No open import errors; all overrides approved |
| 3. Self-assessment complete | Employee submitted |
| 4. TA Head assessment complete | All competencies rated with evidence |
| 5. Projects and capability validated | Contributing project(s) selected and scored; Competency Development scored |
| 6. Draft summary | Human-written or AI-drafted and edited (AI label retained in history) |
| 7. Calibrate | Team distribution reviewed; changes recorded with reason |
| 8. Finalise | Final version generated; prior versions retained |
| 9. Employee acknowledgement and comments | Employee comment captured (acknowledgement is not agreement) |
| 10. Next-year IDP created | IDP approved |

Calibration screen: team table sorted by total within IC and TL groups, distribution chart of totals, self vs TA Head gap list, and an "Adjust with reason" action. Mapping of the 100-point total to corporate rating categories is **not defined** (**D-13**), so the screen shows points only until confirmed.

### 3.7 Development Plan (IDP) [BRD §9]

Per priority: gap area · current level · target level · training · certification · stretch assignment · application project · evidence of success · target date · status · TA Head approval. Draft suggestions come from validated gaps using the BRD's recommendation library [BRD §9]; AI suggestions are labelled and must be approved, edited or rejected by the TA Head.

### 3.8 Data Import, 3.9 Requests & Inbox, 3.10 Reports

Described in [Section 5](#5-data-upload-copypaste-validation-and-employee-input-workflow) and [Section 6](#6-reporting-and-download-requirements).

### 3.11 Talent & Promotion (confidential, TA Head only) [REQ]

| Column | Source |
|---|---|
| Employee, team, role type | Master data |
| Current job level, time in level | TA Head maintained [REQ] |
| Last 3 years' performance ratings | TA Head maintained [REQ] |
| Current-year total (provisional / final) | System |
| Competency profile vs next-level expectation | Ratings + level framework (**D-30**) |
| Leadership evidence | Projects, coaching, knowledge sharing |
| Readiness indicator | **Advisory**: Ready now · Ready in 6–12 months · Develop in role · Insufficient evidence |
| Reasons (for and against) | Generated from the criteria that were met or not met, each citing data |
| TA Head decision and note | TA Head (the only binding field) |

The readiness criteria in the prototype are **illustrative** (e.g. last two ratings at or above "Exceeds", current total ≥ 80, ≥ 3 competencies at the next-level expectation, ≥ 2 years in level). Real criteria require HR policy approval (**D-30, D-31**). This page is excluded from employee, TL, administrator and bulk-employee reports by design.

### 3.12 Administration

Rule tables with version, effective date, status (**Approved / Pending approval**), and change history; working-day calendar; team and business-area targets; competency master and anchors; job level list; rating scale; reminder schedules. Every save creates an audit entry with old value, new value, user, time and reason [BRD §14].

---

## 4. KPI definitions, calculations, and visualisations

### 4.1 Working days and expected offers

| Item | Definition | Status |
|---|---|---|
| Working day | Weekday that is not a company holiday [BRD §5.2] | Confirmed |
| Eligible working days | Working days in the period, less approved adjustments (extended leave, parental leave, joining/leaving mid-year, non-recruiting assignments) | Adjustment policy **D-08**; holiday calendar by location **D-09** |
| 10-working-day cycle | Consecutive blocks of 10 eligible working days from the period start | Anchor (period start vs employee start) **D-10** |
| Expected offers | Eligible working days ÷ 10 × applicable offer target [BRD §5.1] | Confirmed formula |
| Partial cycle | Shows a pro-rata operational target; formally scored only after the cycle closes [BRD §5.1] | Year-end treatment of last partial cycle **D-10** |

**Worked example [BRD §18]:** DTO, 10 working days, target 5 → expected 5. Actual 5 → **100% cadence**. GTT, actual 4 vs target 4 → **target met**.

### 4.2 Offer Delivery & Complexity — 40 points

**Hiring points [BRD §5.3 and Appendix A3 — CONFLICTING].** Points per offer = base points + women bonus (where eligible). The two BRD tables disagree in six places:

| Category | §5.3 Base | §5.3 Women bonus | A3 Base | A3 Women bonus | Conflict? |
|---|---|---|---|---|---|
| GET / PGET | 1 | +0.5 | 1 | +0.5 | No |
| NATS Hiring | 1 | +0.5 | 1 | +0.5 | No |
| NATS Conversion | 1 | None | 1 | +0.5 | **Yes — bonus** |
| Contract Conversion | 1 | None | 1 | +0.5 | **Yes — bonus** |
| FTC | 1 | +0.5 | 1 | +0.5 | No |
| ExcelHER | **2** | +0.5 | **1** | +0.5 | **Yes — base** |
| PMIS | 1 | +0.5 | 1 | +0.5 | No |
| Lateral SG1–SG4 | 1 | +0.5 | 1 | +0.5 | No |
| Lateral SG5–SG8 | **2** | +0.5 | **1.5** | +0.5 | **Yes — base** |
| SG9 and above | 3 | +0.5 | 3 | +0.5 | No |
| PhD Internship | 2 | None | 2 | +0.5 | **Yes — bonus** |
| AICTE Professor | 2 | None (explicit exception) | 2 | None | No |

The BRD acceptance tests (SG10 woman = 3.5; NATS woman = 1.5; AICTE woman = 2.0) are consistent with **both** tables, so they cannot settle the conflict. **D-01** must choose the authoritative table. The prototype lets the administrator switch between them and labels every affected score *Provisional*.

**Score formula — NOT DEFINED in the BRD.** The BRD lists outputs (expected, actual, volume attainment %, weighted points, weighted contribution index, women bonus, hiring mix, trends) [BRD §5.4] and recommends a configurable volume gate [BRD §5.4, §20.2], but gives no formula. The options below are presented for decision (**D-02, D-03, D-04**); none is recommended as policy until tested on historical data in Phase 1.

| Option | Formula (illustrative) | Strength | Risk |
|---|---|---|---|
| O1. Points attainment | Score = 40 × min(Weighted points ÷ Expected offers, cap) | Simple; rewards complexity | Complexity can mask low volume unless gated |
| O2. Volume + complexity split | Volume part = V × min(Actual ÷ Expected, 1); Complexity part = (40 − V) × min(Avg points per offer − 1 ÷ k, 1) | Makes volume and complexity separately visible | Needs V and k agreed; more to explain |
| O3. Banded attainment | Points attainment % mapped to bands (like Joining Ratio) | Easy to explain; stable | Cliff effects at band edges |
| Volume gate (any option) | If Actual ÷ Expected < g, cap the 40-point score at c | Stops complexity fully compensating for under-delivery [BRD §5.4] | g and c must be calibrated before production [BRD §5.4] |

"Weighted contribution index" is named but not defined (**D-04**). **[ASM]** The prototype shows it as Weighted points ÷ Expected offers, labelled *definition pending*.

Visualisations: offers per closed cycle vs target (bar + reference line); YTD cumulative actual vs expected (two lines, gap annotated); hiring mix (table with category, SG, count, women count, points); women-bonus points card.

### 4.3 Joining Ratio — 15 points [BRD §5.5]

- Joining Ratio = Matured joiners ÷ Matured offers × 100.
- An offer is *matured* when its expected joining date is on or before the data cut-off. Offers not yet due are **excluded** from the denominator [BRD §18].
- Indicative bands (administrator-configurable [BRD §5.5]; final bands after historical calibration — **D-05**):

| Joining Ratio | Score |
|---|---|
| ≥ 90% | 15 |
| 85% to < 90% | 13 |
| 80% to < 85% | 11 |
| 75% to < 80% | 8 |
| < 75% | 5 |

**[REC]** Use half-open intervals (as written above) so values like 89.95% have a defined band; confirm with **D-05**. Open points: treatment of revoked offers, deferred joining dates and zero matured offers (**D-06**).

Visualisation: card (ratio, matured offers, joiners, declines, no-shows); monthly trend line; reason table for declines/no-shows.

### 4.4 Req-to-Offer Cycle Time — 10 points [BRD §5.6]

- Cycle time (days) = Offer release date − Requisition creation date (calendar days — **[ASM]**, **D-07**).
- Formal score uses the review-period **average**; **median** is shown for context [BRD §5.6].

| Average | Performance | Score |
|---|---|---|
| < 45 days | Strong | 10 |
| 45 – 55 days | Acceptable | 7 |
| > 55 days | Improvement Required | 4 |

Examples [BRD §18]: 44 → Strong/10; 50 → Acceptable/7; 60 → Improvement Required/4. Values between 55 and 56 (e.g. 55.4) need a rounding rule (**D-07**).

Approved exclusions (business hold, hiring-manager delay, approval delay, niche search, other) remove a transaction from the scored average; **the original cycle time stays visible**, and each exclusion has a reason, approver and audit record [BRD §5.6]. The approved reason list and approver are **D-12**.

Visualisation: card (average, median, count, excluded count); distribution by band (horizontal bar: <45 / 45–55 / >55); trend line; ageing open requisitions (if requisition data is imported).

### 4.5 Vendor Usage — 5 points [BRD §5.7]

- Vendor usage = Vendor hires ÷ Applicable external hires × 100.
- "Applicable external hires" is **not defined** (**D-11**): candidates for exclusion are conversions (NATS, contract), internal moves, campus/early-career programme hires and AICTE/PhD hiring.

| Vendor usage | Score |
|---|---|
| < 10% | 5 |
| 10% – 20% | 3 |
| > 20% | 1 |

Examples [BRD §18]: 9% → 5; 15% → 3; 25% → 1. **[ASM]** 10.0% and 20.0% score 3 (the 10–20% band is read as inclusive).

Visualisation: card (rate, vendor hires, applicable hires, approved exceptions); trend line; source-mix bar.

### 4.6 Improvement Projects — 15 points [BRD §7]

| Criterion | Points | Evidence expected [REC] |
|---|---|---|
| Project discipline and execution | 5 | DMAIC artefacts at each validated stage; milestones met or re-planned with reason |
| Demonstrated business impact | 5 | Baseline vs actual outcome on the agreed metric |
| Sustainability / Control | 3 | Control plan in use; metric sustained for an agreed period |
| Learning and knowledge sharing | 2 | Playbook, session or reusable asset shared |

Rules: employees update progress; only the TA Head validates stage completion; labelling all stages complete does not earn full marks without evidence and impact; where an employee has several projects, the TA Head selects which contribute (**D-32** on how multiple projects combine — e.g. best one, or average of selected). Scoring anchors within each criterion are not defined (**D-33**).

Visualisation: DMAIC stage tracker (5 steps with *validated / in progress / not started* text labels), plan vs actual stage dates, impact card (baseline → target → actual), portfolio table.

### 4.7 Team Lead (TL) scorecard — proposed, requires approval

**Confirmed [REQ]:** TL performance is based on (a) ability to lead and help the team achieve its goals, (b) competency development, and (c) an individual offer target equal to **50% of the team-member target**.

**[ASM]** "50% of the team members" is read as 50% of an individual team member's cadence target (e.g. DTO TL: 2.5 offers per 10 working days). The alternative reading — 50% of the team's combined output — is materially different (**D-20**).

Two options for the weighting (**D-21**):

| Component | Option TL-A (keeps BRD 70/15/15) | Option TL-B (leadership pillar) |
|---|---|---|
| Team goal achievement — team's combined expected vs actual offers, team joining ratio, cycle time, vendor usage | 35 (within Deliverables 70) | 40 |
| Own delivery — own four KPIs, offer target at 50% | 35 (within Deliverables 70) | 20 |
| Leadership effectiveness — coaching, team capability growth, team members' plan completion, escalation and stakeholder management | Assessed in Competency Development (Collaboration & Leadership weighted higher) | 20 |
| Improvement Projects | 15 | Not separately scored, or included in leadership (**D-22**) |
| Competency Development | 15 | 20 |
| Total | 100 | 100 |

**[REC]** Start with TL-A in Phase 1 because it reuses the same engine and keeps IC and TL totals on one 100-point scale; test TL-B in parallel on historical data before choosing. **[REC]** Calculate team goal achievement on the *team* (excluding the TL's own offers, to avoid double counting — **D-23**). The prototype implements TL-A, labelled *Proposed*.

### 4.8 Competency Development — 15 points [BRD §8]

| Dimension | Points | Evidence |
|---|---|---|
| Demonstrated capability growth | 7 | Change in TA Head rating from baseline, against target |
| Application of learning | 5 | Validated application examples linked to learning records |
| Completion of agreed development plan | 3 | Share of IDP actions completed with evidence |

Training attendance alone never increases a score [BRD §8]. The conversion from rating growth to the 7 points is **not defined** (**D-34**), so in this design the TA Head enters each dimension's points with evidence, and the system shows the supporting data beside the entry. Competency history is never overwritten: each assessment is a new dated record [BRD §8.2].

Visualisation: line chart per competency — baseline → quarterly assessments → current → target; self (dashed, circle markers) and TA Head (solid, square markers) for non-colour distinction; learning list with application and validation status; recommended trainings/certifications from the IDP library [BRD §8.2].

### 4.9 Behavioural assessment and Areas for Improvement (unweighted) [BRD §4, §6]

- Eight core competencies [BRD §6.1] rated 1–5 on behaviour anchors [BRD §6], by employee and TA Head independently, with evidence.
- Calibration gap = Self − TA Head. Shown as a discussion signal, not a negative judgement [BRD §4.1].
- Areas for improvement are derived from KPI gaps, competency gaps, repeated breaches, project delays and manager observations; each item has evidence, expected behaviour, current behaviour, action, support, target date and review status [BRD §6.3].
- **[REC]** For TLs, add one optional competency "People Leadership" only if **D-21** selects TL-B; otherwise use *Collaboration & Leadership* with a TL-specific anchor.

### 4.10 Overall score

Total = Deliverables (70) + Projects (15) + Competency Development (15). The employee header shows **Self score** and **TA Head score** [BRD §10.1]. **[ASM]** Self score = calculated Deliverables + employee's self-scored Projects and Competency Development; TA Head score = calculated Deliverables (after approved overrides) + TA Head scores. Confirm (**D-35**). Mapping to corporate rating categories: **D-13**.

### 4.11 Visualisation catalogue

| Visual | Type | Question it answers | Page |
|---|---|---|---|
| Score cards | KPI cards with status text | Where do I/they stand on each pillar? | 1, 2 |
| Offers per 10-day cycle | Bars + target line | Is delivery consistent each cycle? | 1, 2 |
| YTD cumulative | Two lines (actual vs expected) | Ahead or behind for the year, by how much? | 1 |
| Hiring mix | Table | Where do points come from? | 1 |
| Joining, cycle, vendor | Cards + trend lines | Are conversion, speed and sourcing healthy? | 1 |
| Volume attainment by member | Horizontal bars + 100% line | Who needs support on volume? | 2 |
| Comparison | Side-by-side table with in-row bars | How do selected members compare on the same basis? | 3 |
| Exception list | Prioritised table | What needs action now? | 4 |
| Heatmap | Rated cells with numbers | Team capability gaps and experts | 5 |
| Self vs TA Head | Paired table / dot pairs | Where do we disagree? | 1, 6 |
| Competency trend | Line chart with target | Is capability growing to target? | 1, 7 |
| DMAIC tracker | Stepper with text states | Is the project progressing on evidence? | 1 |
| Calibration distribution | Histogram of totals | Is the distribution reasonable and consistent? | 6 |
| Promotion readiness | Table with reasons | Who may be ready, and why/why not? | 11 |

---

## 5. Data upload, copy/paste, validation, and employee-input workflow

Responds to the request [REQ] and the BRD's system-of-record principle: where reliable source data exists, use it; manual input focuses on evidence, examples, project updates, learning application and comments [BRD §13.3].

### 5.1 Import flow

```
 1 Choose        2 Map           3 Validate       4 Review & fix     5 Approve        6 Publish         7 Share (optional)
 dataset  ──▶  columns   ──▶  rules & dupes ──▶  preview, edit  ──▶  TA Head    ──▶  recalculate  ──▶  request confirm/
 upload/paste   auto-match      errors/warnings   cells, exclude     maker-checker    KPIs, audit      evidence/comment
```

| Step | What the user sees | Rules |
|---|---|---|
| 1. Choose dataset and source | Dataset (Offers, Employee profile & ratings, Learning, Project updates, Competency ratings); **Upload file** (CSV/XLSX) or **Paste** (from Excel, tab- or comma-separated); period; data cut-off | [REC] Max 5,000 rows per batch; candidate PII limited to Candidate ID (no names, phone or email) |
| 2. Map columns | Detected headers matched to template fields (exact name, then known aliases); unmatched fields highlighted | Required fields must be mapped; mapping can be saved as a profile |
| 3. Validate | Row-level status: **Error** (blocks), **Warning** (allowed with acknowledgement), **OK** | See 5.3 |
| 4. Review and fix | Preview table, filter by status, edit a cell inline, exclude a row, download error report | Edits are logged as import corrections |
| 5. Approve | Summary: rows to add / update / exclude, affected employees, KPI impact preview | **[REC] Maker-checker:** the person who prepared a batch cannot approve it, except the TA Head for their own uploads if no delegate exists (**D-26**) |
| 6. Publish | Records written with batch ID; KPIs recalculated; audit entry | Batches are never deleted; a reversal batch undoes a published batch |
| 7. Share | Choose employees and the request type; each employee sees **only their own rows** | See 5.5 |

### 5.2 Offer import template and field mapping

Template file: [`templates/offers_import_template.csv`](templates/offers_import_template.csv)

| Template column | Required | Supplied or calculated | Notes / validation | BRD field [§13.2] |
|---|---|---|---|---|
| Recruiter Employee ID | Yes | Supplied | Must exist in Employee Master and be active on offer date | Recruiter |
| Candidate ID | Yes | Supplied | No candidate names. Duplicate check | Candidate ID |
| Requisition ID | Yes | Supplied | Duplicate check with Candidate ID | Requisition ID |
| Business Area | Yes | Supplied | Must be in business-area master | Business area/unit |
| Hiring Category | Yes | Supplied | Must be in Hiring Point Rules | Hiring category |
| SG Level | Conditional | Supplied | Required for Lateral and SG9+; valid SG list | SG level |
| Gender | Yes | Supplied | Used only for women-hiring bonus (**D-36** on values and privacy) | Gender |
| Requisition Created Date | Yes | Supplied | ≤ Offer Release Date | Requisition creation date |
| Offer Release Date | Yes | Supplied | Within period; ≤ cut-off | Offer date / Offer release date (**D-07**) |
| Expected Joining Date | Yes | Supplied | ≥ Offer Release Date | Expected joining date |
| Actual Joining Date | Conditional | Supplied | Required when status = Joined; ≥ Offer Release Date | Actual joining date |
| Joining Status | Yes | Supplied | Pending / Joined / Declined / No-show / Revoked / Deferred | Joining status |
| Source | Yes | Supplied | Direct / Referral / Vendor / Internal / Campus / Other | Vendor/source |
| Vendor Name | Conditional | Supplied | Required when Source = Vendor | Vendor/source |
| Exception Flag / Reason | No | Supplied, approval needed | Only proposes a cycle-time or vendor exception; approval is a separate step | Exceptions |
| Women-Bonus Eligible | — | **Calculated** | From category rule and gender; supplied value ignored, mismatch warned | Women-bonus eligibility |
| Base / Bonus / Total Points | — | **Calculated** | From the active rule version; supplied values ignored, mismatch warned | Base, bonus, total points |
| Cycle Time (days) | — | **Calculated** | Offer release − requisition created | Cycle time |
| Matured | — | **Calculated** | Expected joining ≤ cut-off | Mature-offer status |
| Review Period, Cycle No. | — | **Calculated** | From calendar | Review period |

Other templates (same flow):

| Template | Key fields | Who uploads |
|---|---|---|
| [`employee_profile_template.csv`](templates/employee_profile_template.csv) | Employee ID, name, team, business area, role type (IC/TL), team lead ID, job level, date in level, ratings Y-1, Y-2, Y-3 [REQ] | TA Head only (contains confidential ratings) |
| [`learning_import_template.csv`](templates/learning_import_template.csv) | Employee ID, programme, provider, type, start, completion, certification, skills, status | TA Head or delegate (e.g. LMS export) |
| [`project_update_template.csv`](templates/project_update_template.csv) | Project ID, owner ID, stage, stage evidence link, baseline, target, actual, next action, update date | TA Head or delegate; stage validation stays a TA Head action |
| [`competency_ratings_template.csv`](templates/competency_ratings_template.csv) | Employee ID, period, competency, TA Head rating, evidence, target | TA Head only |

### 5.3 Validation rules

| # | Rule | Severity | Source |
|---|---|---|---|
| V1 | Duplicate Candidate ID + Requisition ID within the file | Error | [BRD §13.3] |
| V2 | Same Candidate ID + Requisition ID already published | Warning → choose *Update existing* or *Skip* | [BRD §13.3] |
| V3 | Same Candidate ID under a different recruiter | Warning → TA Head decides credit (shared-credit rule **D-37**) | [REC] |
| V4 | Unknown recruiter, business area or hiring category | Error | [BRD §13.3] |
| V5 | Invalid or missing SG where required | Error | [BRD §13.3] |
| V6 | Missing or unparseable dates | Error | [BRD §13.3] |
| V7 | Joining date before offer date | Error | [BRD §13.3] |
| V8 | Offer release before requisition created (negative cycle time) | Error | [BRD §13.3] |
| V9 | Supplied bonus eligibility / points differ from calculated | Warning (calculated value used) | [BRD §13.3] |
| V10 | Missing joining status on a matured offer | Error | [BRD §13.3] |
| V11 | Values supplied for calculated fields | Warning (ignored) | [BRD §13.3] |
| V12 | Offer date after data cut-off or outside period | Warning | [REC] |
| V13 | Vendor source without vendor name | Warning | [REC] |
| V14 | Cycle time > 180 days | Warning (possible data error) | [REC] |
| V15 | Personal data columns detected (names, phone, email) | Error — remove before import | [REC] |

### 5.4 System-calculated vs manually supplied data

| Type | Examples | Can be edited? |
|---|---|---|
| Source data (imported) | Offer dates, category, SG, gender, source, joining status | Only via a new import, a correction request, or a TA Head amendment with reason |
| Calculated | Points, cycle time, maturity, KPI scores, expected offers, gaps | **Never directly.** Changed only by an approved override (original kept) or an approved rule version |
| Manual — employee | Self-ratings, evidence, examples, project progress, learning application, comments, responses | Editable until submitted; then versioned |
| Manual — TA Head | Ratings, comments, project and competency scores, overrides, exceptions, job level, rating history, promotion notes | Editable until finalised; then amended only with reason (new version) |

Each screen marks fields with a small tag: **Calculated**, **Imported**, **Your input**, **TA Head input**.

### 5.5 Sharing imported data and requesting employee input

| Request type | Employee can | Result |
|---|---|---|
| Confirm data | Confirm, or raise a dispute with a comment | Confirmed rows get a ✓ "Employee confirmed" tag |
| Request correction | Propose corrected values per field with reason | TA Head accepts (creates an amendment, audited) or rejects with reason |
| Request evidence | Attach a file/link and a description | Evidence linked to the record; TA Head validates |
| Request comment | Add a comment | Comment stored with the record |
| Request self-input | Complete a self-assessment, project update or learning-application entry | Normal workflow item |

**Privacy rules [BRD §14, REC]:**

- A request is created **per employee** and contains only that employee's rows; team totals, peer names and peer values are never included.
- Employees cannot edit imported records directly; they respond to requests.
- Each request has a due date, reminders at due − 2 and due + 1 working days, and a status: *Sent → Viewed → Responded → Accepted / Rejected → Closed*.
- An open dispute marks affected KPIs *Under review* but does not change them until the TA Head acts.

### 5.6 Audit and history

Every batch keeps: batch ID, dataset, source (file name or "pasted"), uploader, approver, timestamps, row counts (added, updated, excluded, errors), mapping used, rule version applied and a link to the error report. Every row keeps its originating batch ID. Every amendment keeps old value, new value, user, time and reason [BRD §14].

---

## 6. Reporting and download requirements

### 6.1 Report catalogue

| Report | Content | Formats | Who can download |
|---|---|---|---|
| Full Individual Performance Report [BRD §11.1] | All sections in Appendix B order | PDF, Excel | Employee (own, released), TA Head |
| **Final Annual Report** (2–4 pages) [BRD §11.2] | See 6.4 | PDF (Excel annex) | Employee (own, final), TA Head |
| Section reports (15 types) [BRD §11.2] | Business Deliverables, Offer Details Annexure, 10-Day Cadence, Joining & Conversion, Cycle Time, Vendor Usage, Behavioural Assessment, Areas for Improvement, Improvement Project, Project Portfolio, Competency Development, Training & Certification, IDP, Self vs Manager, Final Evaluation | PDF, Excel | Employee (own), TA Head |
| **Team-member comparison** [REQ] | Selected members side by side, by pillar, KPI and competency | PDF, Excel | TA Head |
| Team summary / calibration pack [BRD §11.6] | Team table, distribution, gaps, exceptions | PDF, Excel, optional PowerPoint [BRD §11.1] | TA Head (HRBP read-only — **D-25**) |
| **Team Lead report** [REQ] | TL template: team goal achievement, own delivery at 50% target, leadership evidence, competency development | PDF, Excel | TL (own), TA Head |
| **Talent & Promotion report** [REQ] | Readiness, reasons, ratings history, job level | PDF, Excel, marked *Strictly Confidential* | **TA Head only** |
| Import batch report [REC] | Batch summary and row errors | Excel | Uploader, TA Head |
| Audit extract [REC] | Filtered audit log | Excel | TA Head; Admin (technical events) |

### 6.2 Filters [BRD §11.3]

Employee (one, several, team, all) · Review period · Monthly / quarterly / annual · Section · Summary or detailed · Include/exclude transaction detail · Include/exclude employee comments · Include/exclude manager comments · Include/exclude graphs · **[REQ]** Role type (IC/TL) · **[REC]** Version (latest draft / reviewed / final).

### 6.3 Governance metadata, versions and naming

Every report carries [BRD §11.4]: title, employee, review period, generated date and user, data cut-off, report version, manager, status (Draft / Manager Reviewed / Calibration Final), rule versions used, confidentiality label, and "Provisional — scoring rules pending approval" while any **[DEC]** affecting scores is open.

Versioning [BRD §11.5]: regenerating after a change creates a new version; prior Final versions are retained, read-only, with a change summary.

File naming [BRD §11.7]: `{Year}_{Period}_{Report}_{Name}.{ext}`, e.g. `2026_Annual_Performance_<Name>.pdf`. **[REC]** Append employee ID and version (`..._E1023_v3.pdf`) to avoid collisions between people with the same first name (**D-38**).

Bulk generation [BRD §11.6]: TA Head selects employees, period and report types → one file per employee (zipped) plus an optional consolidated calibration summary. Bulk employee packs never include Talent & Promotion content.

### 6.4 Final Annual Report — 2 to 4 pages [BRD Appendix B]

| Page | Content |
|---|---|
| 1 | Employee information · Executive summary (5–7 lines) · Score table: three pillars, total, self vs TA Head · Status and version |
| 2 | Business Deliverables summary (key KPIs vs target, one cadence chart) · Improvement project summary · Competency Development summary |
| 3 | Self vs TA Head assessment (8 competencies) · Key strengths · Key improvement areas · Significant contributions |
| 4 | Next-year IDP priorities · Employee comments · TA Head comments · Calibration and approval record |
| Annexures | A. Calculation detail (working days, expected offers, points, bands, overrides, exclusions) · B. Offer transactions · C. 10-day cycles · D. Project evidence · E. Learning records · F. Audit/approval history |

TL variant: page 2 replaces *Business Deliverables* with *Team goal achievement + own delivery (50% target)* and adds a leadership-evidence block.

---

## 7. Security, audit, accessibility, and AI guardrails

### 7.1 Security

| Control | Design | Technology mapping |
|---|---|---|
| Row-level access | Employee → own rows; TL → own team operational rows (**D-24**); TA Head → team | Dataverse business units/teams, owner-based security; Power BI RLS |
| Column-level access | TA Head comments, overrides rationale, promotion fields, rating history → TA Head only | Dataverse column security profiles |
| Admin separation | Admin can manage rules and data structure, not read confidential columns | Admin not in confidential column profile; break-glass via approved, time-limited access (**D-27**) |
| Candidate data minimisation | Candidate ID only; no names/contacts in this system | Import rule V15 |
| Gender data | Used only for bonus calculation; not displayed in team views | Column security; aggregate only |
| Retention | Performance records and audit retained per HR policy (**D-39**) | Retention policies |
| Exports | Watermarked with user and time; confidential label | Report templates |

### 7.2 Audit

Logged events: data imports and reversals, amendments, overrides, exception approvals, rating submissions and changes, project stage validations, rule changes, report generation and finalisation, access grants, break-glass access, AI draft use. Each entry: who, when, object, field, old value, new value, reason, batch/request reference. Audit records are append-only.

Overrides [BRD §14] require: original value, revised value, justification, evidence link, identity, timestamp. Historical ratings and project states are preserved [BRD §14, §8.2].

### 7.3 Accessibility [BRD §14, REC]

- Target WCAG 2.2 AA.
- Status is never colour-only: every status has an icon and text; heatmap cells print the number; chart series differ by line style and marker shape as well as colour.
- All charts have a "View as table" alternative and descriptive titles.
- Keyboard-navigable, visible focus, logical heading order, form labels, 4.5:1 text contrast, 200% zoom without loss.
- Plain-language labels; avoid jargon such as "matured" in employee views without a tooltip ("offers whose expected joining date has passed").

### 7.4 AI guardrails [BRD §15]

| AI may (advisory) | AI must not |
|---|---|
| Draft evidence-based summaries | Determine the final rating or promotion decision |
| Identify trends and inconsistencies | Invent missing evidence |
| Suggest development actions and IDP items | Change system-calculated scores |
| Draft coaching notes | Make unsupported capability claims |
| Answer manager questions from authorised data | Expose data outside the user's permissions |

**[REC] Controls:** AI runs under the requesting user's permissions; prompts are grounded only on retrieved, authorised records; every output separates **FACT** (with source reference) from **AI SUGGESTION**; outputs are drafts that a human must edit or accept; AI use is recorded in the audit log; AI is excluded from the Talent & Promotion page in Phase 1 (**D-31**); AI is the last phase, after data quality is proven [BRD §19].

### 7.5 Fairness safeguards [REC]

- Show context beside comparisons (business area, eligible working days, role type, leave adjustments).
- Monitor score and promotion-readiness distributions by team and gender for unexplained differences at calibration (aggregate, TA Head/HR only).
- Promotion readiness reasons must cite evidence; criteria are published to the TA Head and HR.

---

## 8. Open questions, ambiguities, and conflicting BRD rules requiring confirmation

None of these is resolved in this design. Where the prototype needs a value to work, it uses a clearly labelled, configurable **placeholder** and marks results *Provisional*.

### 8.1 Scoring rule conflicts and gaps (block production scoring)

| ID | Topic | BRD reference | Issue | Alternatives for decision | Owner |
|---|---|---|---|---|---|
| D-01 | Hiring points table | §5.3 vs App. A3 | Six conflicts: NATS Conversion bonus; Contract Conversion bonus; ExcelHER base 2 vs 1; Lateral SG5–SG8 base 2 vs 1.5; PhD Internship bonus. (AICTE consistent.) | (a) §5.3 authoritative · (b) A3 authoritative · (c) row-by-row decision | TA Head |
| D-01a | Category precedence | §5.3 | An offer may fit two categories (e.g. ExcelHER at SG5; FTC at SG9; PhD intern) — which rule applies? | (a) Programme category wins · (b) higher points win · (c) SG band wins for all lateral-type offers | TA Head |
| D-01b | ExcelHER bonus | §5.3 / A3 | If ExcelHER is a women-only programme, the +0.5 always applies (2.5 or 1.5 per offer). Intended? | Confirm intended points per ExcelHER offer | TA Head |
| D-01c | "SG9 and above" scope | §5.3 | Applies to lateral only, or any category at SG9+? | Lateral only · Any category | TA Head |
| D-02 | Offer Delivery & Complexity formula (40) | §5.4, §20.2 | No formula given | O1 points attainment · O2 volume + complexity split · O3 banded (see §4.2) | TA Head |
| D-03 | Volume gate | §5.4, §20.2 | Gate threshold and cap undefined; over-achievement treatment (cap at 100% or allow above?) undefined | Gate g and cap c values; cap ≤ 40 always? | TA Head |
| D-04 | "Weighted contribution index" | §5.4 | Named, not defined | Points ÷ expected offers · points ÷ actual offers · other | TA Head |
| D-05 | Joining ratio bands and exception threshold | §5.5, §10.3, §20.2 | "Indicative", pending historical calibration; boundary handling (89.95%); exception threshold not stated | Half-open intervals; threshold 85% or 80% | TA Head |
| D-06 | Joining ratio edge cases | §5.5 | Revoked offers (company-initiated), deferred joining dates, zero matured offers | Exclude revoked · use latest expected date · show "N/A" and score…? | TA Head |
| D-07 | Cycle-time definition | §5.6, §13.2 | Calendar vs working days; "Offer date" and "Offer release date" both listed; rounding for 55.x; per-offer vs per-requisition for multi-position reqs | Calendar days, offer release date, round to 1 decimal, per offer | TA Head |
| D-08 | Working-day adjustments | §5.2, §20.2 | Leave, parental leave, mid-year join/exit, non-recruiting assignments | Thresholds (e.g. leave > 5 consecutive days) and evidence | TA Head + HR |
| D-09 | Holiday calendar | §5.2 | Single India calendar vs location-specific holidays | One calendar · per location | Admin |
| D-10 | Cycle anchoring and partial cycles | §5.1 | Cycles from period start or employee start; transfer between business areas mid-cycle; last partial cycle at year end | Specify anchor and year-end pro-rata scoring | TA Head |
| D-11 | Vendor usage denominator | §5.7, §20.2 | "Applicable external hires" undefined; zero denominator | Exclude conversions/internal/campus? | TA Head |
| D-12 | Cycle-time exclusions | §5.6, §20.2 | Approved reason list and approver | List and approver | TA Head |
| D-13 | Mapping to corporate rating | §20.2 | 100 points → year-end rating categories undefined | Bands to confirm with HR | HR |
| D-16 | Cadence exception definition | §10.3, §12 | "Below cadence": single closed cycle or YTD? "Repeated" = how many? | 1 cycle / YTD; N = 2 or 3 | TA Head |
| D-17 | Stalled project | §10.3 | Undefined | No validated stage change in X days | TA Head |
| D-18 | "Materially below target" | §10.3 | Undefined | ≥ 1 level below target | TA Head |
| D-19 | Self vs manager gap ">1 level" | §10.3 | > 1 (i.e. ≥ 2) or ≥ 1? | Choose | TA Head |
| D-32 | Multiple projects | §7.2, §20.2 | How selected projects combine into 15 | Best one · average · weighted by size | TA Head |
| D-33 | Project scoring anchors | §7.2 | No anchors for 5/5/3/2 | Define levels per criterion | TA Head |
| D-34 | Competency Development conversion | §8, §20.2 | How rating growth maps to 7 points; evidence per level; rating frequency (quarterly per §12 vs open in §20.2) | Define rubric; confirm quarterly | TA Head |
| D-35 | Self score meaning | §10.1 | "Self score" in header undefined | See §4.10 assumption | TA Head |

### 8.2 New requirements needing decisions [REQ]

| ID | Topic | Issue | Alternatives | Owner |
|---|---|---|---|---|
| D-14 | Teams vs business areas | Confirmed: 4 TA teams serve the BRD business areas (see §2.2). Remaining question: can a recruiter serve more than one area, and if so how is the target blended? | Single primary area (assumed) · weighted by working days per area | TA Head |
| D-15 | Targets for Penta, Early Careers, Leadership Hiring | No cadence target in BRD; campus is seasonal; leadership volumes are low and complex | Set per area; points-based target for Leadership Hiring; seasonal/programme targets for campus | TA Head |
| D-20 | TL 50% target meaning | "50% of the team members" | 50% of one member's target (assumed) · 50% of team combined | TA Head |
| D-21 | TL weighting | Not defined | TL-A · TL-B (see §4.7) | TA Head |
| D-22 | TL and improvement projects | Not mentioned for TLs | Keep 15 · fold into leadership | TA Head |
| D-23 | TL team goal measure | Which KPIs; include TL's own offers?; IC and TL ranking together? | Team KPIs excluding TL; separate ranking | TA Head |
| D-24 | TL data access | May a TL see team members' operational KPIs? Confidential ratings? | Operational only (recommended) · none · full | TA Head + HR |
| D-25 | HRBP / calibration participants | BRD names only TA Head | Include HRBP read-only at year end? | TA Head + HR |
| D-26 | Import approver | Who approves when TA Head uploads | Self-approve with audit · delegate prepares, TA Head approves | TA Head |
| D-27 | Admin break-glass | "Not automatic" access — how granted? | HR approval, time-limited, logged | HR + IT |
| D-28 | Rating scale for 3-year history | Scale not given | Corporate scale labels | HR |
| D-29 | Employee view of own job level/rating history | Not stated | Visible · hidden | TA Head + HR |
| D-30 | Promotion criteria and level framework | Not in BRD | Criteria, thresholds, next-level competency expectations | TA Head + HR |
| D-31 | Promotion and AI | Should AI draft promotion reasons? | Not in Phase 1 (recommended) | TA Head |

### 8.3 Data, privacy and operational questions

| ID | Topic | Issue | Owner |
|---|---|---|---|
| D-36 | Gender field | Allowed values; undisclosed/other; lawful basis and consent for use in scoring | HR + Legal |
| D-37 | Shared credit | Two recruiters on one offer — split points? | TA Head |
| D-38 | File naming | First-name-only names collide | TA Head |
| D-39 | Retention | How long performance records, evidence and audit are kept | HR + Legal |
| D-40 | Review period | Calendar year (file names show "2027") or Indian fiscal year (Apr–Mar)? | TA Head + HR |
| D-41 | Source systems | Which ATS/HRIS/LMS exports exist, and their field names (affects mapping and automation) | TA Ops + IT |
| D-42 | "TTI" | Expand acronym (scope now confirmed as GTP/GTO/GTT) | TA Head |
| D-44 | TTI business areas | Request lists "GTP, GTP, GTT"; GTO assumed for the duplicate | TA Head |
| D-45 | Summary-scorecard data | Where only YTD totals per recruiter exist (no offer-level data), the 40-point offer score cannot be calculated; joining ratio becomes joiners ÷ offers (not maturity-adjusted) | Load offer-level ATS data (recommended) · accept TA Head override with reason | TA Head |
| D-46 | Annual recruiter targets | Recruiter scorecards carry an annual target (e.g. 85, 114, 57) alongside the BRD's 10-day cadence; unclear whether it counts offers or joiners, and whether attainment is pro-rated | Joiners (as scorecard attainment) · offers · both; pro-rated to date vs full-year | TA Head |
| D-47 | Support / operations roles | BRD scorecard is recruiter-only; Global SF support and operations roles have no hiring deliverables | Projects + competency only (/30, current) · role-specific service KPIs | TA Head |
| D-48 | Target share by role | Sourcers and other roles: share of business-area target not defined | 100% (current placeholder) · role-specific | TA Head |
| D-49 | Members supporting several teams | Someone may serve more than one team (e.g. TTI and VCE) | Count in primary team goal only (current) · split by share of effort | TA Head |
| D-50 | Former team members | People who left mid-year | Evaluate on pro-rated target to leaving date; exclude from promotion readiness (current) | TA Head + HR |
| D-43 | Offer definition | Count offers released, or accepted? Re-issued offers to the same candidate? | TA Head |

---

## 9. Phased implementation roadmap

Aligned to the BRD's five phases [BRD §19], with a decision phase added first.

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Decisions (2–3 weeks)** | Resolve D-01 to D-04, D-07, D-11, D-14, D-15, D-20, D-21, D-24, D-40, D-41; confirm templates and source exports | Signed rule register; approved data dictionary |
| **1. Business logic prototype (4–6 weeks)** | Load last year + YTD data with the import templates; run scoring engine; compare offer-formula options and both hiring-point tables on real data; validate with 3–4 members across teams; use the clickable prototype for UX feedback | Scores reproduce manual calculations; no unexplained differences; TA Head approves formulas and bands |
| **2. Employee application (6–8 weeks)** | Dataverse model, security roles, Power Apps: My Performance, self-assessment, project and learning updates, TA Head assessment, import wizard, requests & inbox, audit | Permission tests pass; pilot team completes one quarterly cycle |
| **3. Automation (3–4 weeks)** | Power Automate: 10-day cadence, monthly and quarterly reminders, threshold alerts, request reminders, year-end workflow, report versioning | Alerts fire correctly in UAT; no duplicate reminders |
| **4. Analytics & reporting (4–6 weeks)** | Power BI: team overview, compare, exceptions, heatmap, calibration; paginated PDF/Excel reports; bulk generation; Talent & Promotion (confidential) | Report tests pass; TA Head generates full team pack |
| **5. AI (after one stable quarter)** | Grounded summaries, trend notes, IDP suggestions, manager assistant | Guardrail tests pass; zero unauthorised-data findings in red-team test |

**[REC] Change management:** short role-based guides; a "How is this calculated?" panel on every score; a 30-day dispute window after go-live during which corrections don't count against data-quality metrics.

---

## 10. Testable acceptance criteria

### 10.1 BRD calculation tests [BRD §18]

| # | Given | When | Then | Depends on |
|---|---|---|---|---|
| AT-01 | DTO recruiter, 10 eligible working days, target 5 | 5 standard offers released | Cadence = 100%, status "On track" | — |
| AT-02 | GTT recruiter, target 4 | 4 offers in 10 working days | Target met | — |
| AT-03 | SG10 offer, woman | Points calculated | 3.5 (3 + 0.5) | — |
| AT-04 | NATS hire, woman | Points calculated | 1.5 | — |
| AT-05 | AICTE Professor, woman | Points calculated | 2.0; no +0.5 | — |
| AT-06 | Average cycle time 44 days | Score calculated | Strong / 10 | — |
| AT-07 | Average cycle time 50 days | Score calculated | Acceptable / 7 | — |
| AT-08 | Average cycle time 60 days | Score calculated | Improvement Required / 4 | — |
| AT-09 | Vendor usage 9% | Score calculated | 5 | — |
| AT-10 | Vendor usage 15% | Score calculated | 3 | — |
| AT-11 | Vendor usage 25% | Score calculated | 1 | — |
| AT-12 | Offer with expected joining date after cut-off | Joining ratio calculated | Offer excluded from matured denominator | — |
| AT-13 | Employee competency changes 2 → 3 | New assessment saved | Prior rating 2 still stored and shown in history | — |
| AT-14 | TA Head rating differs from self | Both saved | Both visible; gap = self − TA Head | — |
| AT-15 | TA Head overrides a calculated score | Save without reason | Blocked; with reason → saved with original, revised, user, time | — |
| AT-16 | Download Business Deliverables section | PDF and Excel | Employee-specific; contains metrics, trends, score, evidence and metadata | — |
| AT-17 | Download full employee report | PDF | Contains all three pillars, ratings, IDP and governance metadata | — |
| AT-18 | Final report exists; data changes | Regenerate | New version created; prior Final retained and readable | — |

### 10.2 Tests that become valid only after decisions

| # | Test | Decision |
|---|---|---|
| AT-19 | ExcelHER offer (woman) scores 2.5 **or** 1.5 per approved table | D-01, D-01b |
| AT-20 | Lateral SG6 offer (man) scores 2 **or** 1.5 per approved table | D-01 |
| AT-21 | NATS Conversion (woman) scores 1.0 **or** 1.5 per approved table | D-01 |
| AT-22 | Volume attainment below gate → Offer score capped at approved cap | D-02, D-03 |
| AT-23 | Joining ratio 89.95% → band per approved boundary rule | D-05 |
| AT-24 | Average cycle time 55.4 days → band per approved rounding rule | D-07 |
| AT-25 | DTO TL target = 2.5 offers / 10 working days | D-20 |

### 10.3 Import, sharing and access tests [REQ, REC]

| # | Given | When | Then |
|---|---|---|---|
| AT-30 | A pasted block of offers with headers in a different order | Pasted | Columns auto-mapped; unmatched shown |
| AT-31 | File with a duplicate Candidate ID + Requisition ID | Validated | Row flagged Error V1; cannot approve until fixed or excluded |
| AT-32 | Row with joining date before offer date | Validated | Error V7 |
| AT-33 | Row supplies Total Points = 5 for a GET offer | Validated | Warning V9; calculated value used |
| AT-34 | Row includes a "Candidate Name" column | Validated | Error V15; import blocked |
| AT-35 | Batch prepared by delegate | Delegate tries to approve | Blocked (maker-checker) |
| AT-36 | Batch approved | Published | KPIs recalculated; audit entry with batch ID, counts and approver |
| AT-37 | Published batch found wrong | Reversed | Reversal batch created; original batch retained |
| AT-38 | TA Head shares rows with employee A | Employee A opens request | Sees only own rows; no peer names or values |
| AT-39 | Employee disputes a row | Dispute submitted | KPI marked "Under review"; value unchanged until TA Head acts |
| AT-40 | TA Head accepts correction | Accepted | Amendment recorded with old/new/reason; KPI recalculated |
| AT-41 | Employee user | Opens Team Overview, Compare or Talent & Promotion | Access denied |
| AT-42 | System Administrator | Opens TA Head comments or promotion notes | Hidden; break-glass request required |
| AT-43 | Team Lead | Opens a team member's ratings | Hidden (unless D-24 approves otherwise) |
| AT-44 | TA Head enters job level and three prior ratings | Saved | Stored with audit; visible only per D-29 |

### 10.4 Reporting and comparison tests

| # | Given | When | Then |
|---|---|---|---|
| AT-50 | TA Head selects 4 members | Compare | Side-by-side pillars, KPIs and competencies; PDF and Excel export |
| AT-51 | Compare includes an IC and a TL | Compare | Deliverables shown with "different templates" note |
| AT-52 | Bulk generate annual reports for a team | Run | One report per employee + optional calibration summary; no promotion content |
| AT-53 | Final annual report | Generated | 2–4 pages main body; calculations in annexures; metadata block complete |
| AT-54 | TL annual report | Generated | Shows team goal achievement, own delivery vs 50% target, leadership evidence, competency development |
| AT-55 | Any scoring rule pending approval | Report generated | "Provisional" watermark/label present |
| AT-56 | Talent & Promotion report | Downloaded by TA Head | Labelled "Strictly Confidential"; audit entry created |

### 10.5 Workflow and AI tests

| # | Given | When | Then |
|---|---|---|---|
| AT-60 | 10-day cycle closes below target | Calculation runs | Employee and TA Head notified once |
| AT-61 | Monthly update not submitted | +5 working days | Reminder sent; +10 → escalated to TA Head |
| AT-62 | Quarter end | Workflow runs | Self-assessment → TA Head assessment → gap → coaching record created in order |
| AT-63 | Year-end | Cut-off frozen | Imports after cut-off flagged; final requires all checklist gates |
| AT-64 | AI drafts a summary | Draft shown | FACT lines cite sources; SUGGESTION lines labelled; cannot be saved as final without human edit/accept |
| AT-65 | AI asked about another employee by an employee user | Query | Refuses; no data returned |
| AT-66 | AI asked to change a score | Request | Refuses; scores unchanged |
