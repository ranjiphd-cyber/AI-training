# Discovery Response — TA Performance Intelligence Platform

> **Update 3 Nov 2026:** The spec file in Drive ("TA Performance Scorecard App (Multi-Year).xlsx") contains only an empty sheet. Rules were therefore taken from the TA Head's latest scoring chats (18–26 Oct) and this request; see scoring-rules.md and decisions.md. The palette was supplied. Decisions D-20..D-26 supersede the open questions below.

*Prepared 2026-11-03. Version 0.1. Status: awaiting decisions.*

## 1. Business problem (as understood)

The Head of TA, India needs one trustworthy system that replaces spreadsheet-based recruiter
evaluation. It must:

- score recruiter **delivery** the same way every time, so the score is transparent and can be defended in calibration;
- keep **growth & behaviours** (projects, self-development, training, behaviours, stakeholder feedback) separate from delivery and show both on a 3×3 matrix;
- keep the **calculated band** separate from the **manager-calibrated final rating**, so a human stays accountable for the rating;
- freeze review snapshots so a past review gives the same result even after data or rules change;
- be reused each year by versioning the settings, without rewriting the engine;
- produce editable PPT/Excel/PDF review packs.

The main risk is not the UI. It is **unauthorised rule invention**. A score based on assumed formulas would look plausible and still be wrong. The design blocks that explicitly.

## 2. Attachment availability and review status

| Input | Status | Notes |
|---|---|---|
| "TA Performance Scorecard App (Multi-Year)" specification | **NOT AVAILABLE — not reviewed** | Not in repo; not found by searching the owner's Google Drive by title and full text. No scoring logic has been taken from it. |
| Approved colour palette | **NOT AVAILABLE** | A provisional white / navy / grey theme will be used and labelled *provisional*. It is not an official palette. No Volvo trademarks will be used without approved assets. |
| Approved import workbooks | **Partially found — unconfirmed** | Drive has a workbook titled *"TA & Employee Performance Tracker"* with these sheets: TA Metrics, Training & Certifications, Employee Master, Competency Assessment. Only its headers were seen. **Is this the approved import layout?** → D-IMP-01. A separate per-person TA Ops tracker was seen. It covers TA Ops SLAs, not recruiter scoring, and is out of scope unless you confirm otherwise. |
| Deployment, IdP, AI provider, residency/retention | Requires confirmation | See decision register. |

Candidate headers seen (pending D-IMP-01), recorded so mapping work can start once confirmed:

- **TA Metrics:** Employee ID*, As Of Date*, Annual Target, Weighted Points, Offers*, Joiners*, Offer Days (avg req-to-offer), Join Days, Declined %, Diversity %, Vendor %, Referral %, Offers/Joiners by Core-Campus / NATS / ExcelHER / Other, Source, Note
- **Employee Master:** Employee ID*, Employee Name*, TA Team*, Business Area*, Role*, Job Level, Also Supports, Status (Active/Former), Leaving Date, Date In Current Level, Start Date (if mid-year), Rating Year-1/2/3
- **Training & Certifications:** Employee ID*, Programme*, Provider, Training Type, Start/Completion Date, Certification Obtained, Skills Addressed, Status, Application Example
- **Competency Assessment:** Employee ID*, Assessment Period*, Competency*, Rated By (Self/TA Head)*, Rating (1-5)*, Target Rating, Evidence/Comment

> Note a possible conflict: this workbook uses **aggregated** metrics (avg offer days, Vendor %) and a **1–5** competency scale. The master prompt asks for **record-level** offer logs, reproducible cycle-time calculation and **1–10** growth ratings → D-CONF-01, D-CONF-02.

## 3. Proposed architecture (summary — see architecture.md)

React + TypeScript SPA · TypeScript API (Fastify or NestJS) · PostgreSQL · OIDC/SAML through the approved IdP · server-side role and record-scope authorization · **pure TypeScript scoring package with no I/O**, versioned rule sets as input · staged import pipeline · exports produced on the server (PptxGenJS, ExcelJS, PDF via headless Chromium) · Vitest + Playwright.

Main trade-off: a full stack with its own DB gives auditability and reproducibility, but it needs hosting approval. A spreadsheet or low-code tool would be faster to stand up, but it cannot guarantee frozen snapshots or server-side authorization.

## 4. Sitemap

```
Executive Overview
├─ Delivery Scorecard ─→ Recruiter Profile ─→ Calculation trace
├─ Growth & Behaviours
├─ Performance Matrix (3×3)            [blocked: thresholds]
├─ Recruiter Profiles
│   └─ Record Review · Development Plan · History
├─ Evidence
│   ├─ Offer Log · Open Requisitions · Extra Points
│   ├─ Projects & Improvements · Training & Development · Stakeholder Feedback
├─ Reviews & Appraisals (10-day / monthly / quarterly / annual, calibration)
├─ Data Imports (batches, staging, reconciliation, undo)
├─ Reports & Exports
├─ Multi-Year Analysis
├─ Settings (rule versions, years, holidays, mappings) & Audit Log
└─ How Scoring Works (generated from the active rule version)
Global: Year · Period · Team/Recruiter (scoped) · Show/Hide Names
```

## 5. Phased plan

| Phase | Scope | Gate |
|---|---|---|
| 0 | Discovery, RTM, decision register (this doc) | Decisions D-ARCH-*, D-SEC-* answered |
| 1 | Repo scaffold, app shell, navigation, provisional theme, empty states, IdP stub, RBAC framework | Shell renders; authz tests pass |
| 2 | DB schema + migrations, rule-version model, **scoring engine skeleton that returns `BLOCKED` with reasons** | Spec received → rules encoded → acceptance tests pass |
| 3 | Import pipeline (staging → validate → reconcile → approve → commit → undo) | Reconciliation tests on approved layouts |
| 4 | Dashboard, scorecard, profiles, matrix | Dashboard values = engine values |
| 5 | Growth, projects, training, feedback, development plans | |
| 6 | Reviews, calibration, snapshots, year lifecycle | Frozen-review reproducibility test |
| 7 | PPT/Excel/PDF exports | Export = dashboard consistency test |
| 8 | Optional AI (disabled by default) | Provider + DPIA approved |
| 9 | Security, accessibility, performance, release validation | Release gate |

## 6. Essential clarifications (grouped, prioritised)

**A — Blocking everything that involves scoring**
1. Please attach the spec *"TA Performance Scorecard App (Multi-Year)"*. Or tell me where it is: a Drive file name, or upload it into the repo.
2. Please attach the approved colour palette and any brand assets you are allowed to use.

**B — Architecture & governance (blocks Phase 1 deployment, not local build)**
3. Hosting target: Volvo internal Azure / AWS / on-prem / a local prototype only?
4. Identity provider: is it Entra ID (Azure AD)? Should the prototype use local test accounts until SSO is approved?
5. Data residency and retention period for employee performance records.
6. Who may see what? (Head of TA, TA leads, recruiters seeing their own data, HRBP, admin) → permissions.md.
7. AI assistance: should it stay disabled for now? If not, which provider is approved?

**C — Data (can be answered after the spec, if the spec is silent)**
8. Is the *"TA & Employee Performance Tracker"* workbook the approved import layout?
9. Will imports be **record-level** (one row per offer/requisition) or **aggregated** per recruiter?
10. Growth rating scale: 1–10 (master prompt) or 1–5 (workbook)?

I won't ask again about anything the spec already answers once I have it.

## 7. Planned acceptance tests — see test-plan.md
All business-rule tests stay **pending business confirmation** until the spec gives exact expected values.

## 8. Work that can start now, independent of the open decisions
- Monorepo scaffold, CI, lint and test harness.
- App shell with the 17 navigation items, filters, Show/Hide Names toggle, and loading, empty, error and blocked states.
- RBAC *framework* (roles get configured later; deny by default).
- Audit-event model; rule-version tables (structure only, no values).
- Scoring engine **interface** plus the `BLOCKED` result type and trace format.
- Import pipeline framework, with no column mappings committed yet.
- Infrastructure-neutral Docker Compose for local development.
