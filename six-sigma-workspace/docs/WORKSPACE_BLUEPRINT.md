# Lean Six Sigma Project Workspace: Blueprint v0.1

| Document control | |
|---|---|
| Title | Lean Six Sigma Project Workspace: Blueprint |
| Owner | [Black Belt / workspace owner] |
| Approver | [Practice lead or sponsor] |
| Version | 0.2 |
| Status | **Draft – pending approval** |
| Effective date | On approval |
| Review cadence | Each release, or quarterly |
| Mode | BUILD TEMPLATE |

**Build status key.** *Specification* = written, no code. *Generated code* = code exists, not tested. *Tested prototype* = code with passing automated tests. *Deployed application* = hosted for users. **Nothing in this repository is deployed.**

---

## 1. COSTAR framing

| | |
|---|---|
| **Context** | A multi-client, multi-department improvement practice. Projects are at different maturity levels. Data arrives as files with different structures. |
| **Objective** | One reusable workspace. A project moves through it from charter to control without rebuilding the analysis, dashboard or deck. |
| **Style** | Plain language. Each finding is written as *Finding → Evidence → Business implication → Action → Limitation*. Executive summary first, technical appendix last. |
| **Tone** | Rigorous and consultative. Every statement carries a label: Verified fact, Calculated result, Stakeholder opinion, Hypothesis, Assumption, Proposed target, Approved decision or Unresolved question. |
| **Audience** | Sponsors (Home, deck slides 1–2). Process owners (actions, control). Analysts (Modules 5–7, appendix). Finance, IT, Legal and Compliance (benefits, security, approvals). |
| **Response** | Outputs match project maturity. Phases not yet started are shown as *Pending*. They are never shown empty and never filled with invented content. |

## 2. Architecture

```
               ┌───────────────────── config/ ─────────────────────┐
               │ palette.json · department_packs/*.json (13 packs) │
               └──────────────────────────┬────────────────────────┘
                                          │
 upload (csv/xlsx) ──► engine/sixsigma ───┼─► projects/<PROJECT_ID>/            (one folder per client engagement)
                       project.py         │     project.json   config, registers, roles, gates, change log
                       intake.py          │     raw/           immutable, hash-named uploads (read-only)
                       analysis.py        │     versions/vNNN/results.json   ◄── SINGLE SOURCE for reporting
                       pipelines.py       │     outputs/       dashboard · deck · data-collection pack · comms
                       versions.py        │     exports/       portable state (.zip)
                       templates.py       │
                                          ▼
          generators/build_dashboard.py ──► HTML dashboard (13 modules, filters, reconciliation check)
          generators/build_deck.js      ──► executive .pptx (DMAIC storyline)
          generators/build_workbook.py  ──► blank Excel workspace (editable registers and forms)
```

**Design decisions**

1. **No shared state across projects.** Every engine call takes a project folder. A new project is built only from `blank_state()`. Creating a project ID that already exists, saving one project's state into another project's folder, and importing over an existing project are all refused.
2. **The core is department-neutral.** Recruitment terms appear only in `department_packs/talent_acquisition.json` and the demo. The baseline pipeline reads its fields, stages, segments and conversions from a pipeline config.
3. **One results bundle feeds every output.** The dashboard and the deck both read `versions/vNNN/results.json`. The dashboard recomputes the unfiltered median and P90 and checks them against the bundle (Module 13).
4. **Raw data is never changed.** Each transformation and exclusion is logged and appears in the bundle and the appendix.

## 3. Modules (dashboard and workbook)

| # | Module | Purpose | Inputs | Editable fields (workbook sheet) | Calculations | Visuals | Filters | Validation | Permissions | Exports |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Home & executive summary | Status, decisions, headline KPIs, findings | Bundle, approvals, actions | – | – | KPI cards, findings, phase rail | – | Status shown as text and colour | All read | Deck slides 1–2 |
| 2 | Configuration | Client, department, process, roles | Config form | `01_Config` | – | Table | – | Dropdowns; ID format | Lead edits | Project state |
| 3 | Define | Problem, goal, VOC/VOB, CTQs | Charter, CTQ register | `02_Charter`, `03_CTQ` | Baseline joined to each CTQ | CTQ table | – | Required CTQ fields; target approval state | Lead/owner edit; sponsor approves | Slides 3–4 |
| 4 | SIPOC & AS-IS | Process scope and measured flow | Pack stages, stage timestamps | `04_SIPOC` | Stage medians and P90 | Flow, longest-stage highlight | – | – | Lead edits | Slide 5 |
| 5 | Upload, mapping & quality | Inventory, map and qualify data | Uploads | `05_Data_Dictionary`, `06_DQ_Checks`, `07_Data_Collection` | Hash check, schema check, missingness, duplicates, chronology, personal-data scan | Missingness bars, tables | – | Type coercion; allowed values; required fields | Analyst uploads | Slide 6, collection pack |
| 6 | Baseline & segmentation | Current performance and stability | Analysis records | – | Median (bootstrap CI), P90, Kaplan-Meier, I-MR (R1–R3), cohort funnel, Pareto | Histogram, stage bars, I-MR, funnel, Pareto | Business unit, job family, cohort dates | Denominator shown on every card | All read | Slides 7–8 |
| 7 | Statistical workbench | Planned, reproducible inference | Analysis plan | `08_Analysis_Plan`, `09_Findings` | Kruskal-Wallis + ε², Mann-Whitney + bootstrap median difference, χ²/Fisher, Wilson CI, gated capability | Run cards, group tables | – | Run refused without a complete plan | Analyst runs | Slides 9–10, appendix |
| 8 | Root causes | Stakeholder input and cause evidence | Workshop outputs | `10_Stakeholder_Input`, `11_Cause_Evidence` | – | Cause register | Status | "Human error" rejected; status list enforced | Lead edits | Slide 11 |
| 9 | Improve & pilot | Prioritise, pilot, implement | Supported causes | `12_Prioritisation`, `13_FMEA`, `14_Pilot_Plan`, `15_Implementation` | Weighted score (proposed weights), RPN, severity ≥ 9 flag | Matrix, tracker | Owner, status | Weights must sum to 100%; pilot needs a stop rule | Lead edits; sponsor approves | Slide 12 |
| 10 | Results & benefits | Before/after and benefits | Pilot data, Finance inputs | `16_Benefits` | Gross, net, by stage and type | – | Period | Finance approval state; stage and type lists | Finance approves | Slide 12 |
| 11 | Control | Sustain the gains | Control plan | `17_Control_Plan` | Signal rules on new data | Control charts | Owner | Trigger, response and escalation required | Owner accepts | Handover pack |
| 12 | Governance | Approvals, risks, decisions, versions | Registers | `R_*` sheets | Version comparison, revalidation flags | Tables, refresh preview | – | Approvals linked to records | Sponsor approves; lead promotes | Slide 13 |
| 13 | Export | Deck, packs, state, reconciliation | Bundle | – | Dashboard figures checked against the bundle | Reconciliation table | – | Mismatch flagged | Lead exports | .pptx, .xlsx, .docx, .zip |

Every KPI card shows its definition, unit, numerator and denominator, n, period, baseline, current value, 95% CI, target and target status, source and refresh date. Without data the card shows **Not assessed**. Status is always written as text; colour (sage, peach or coral) is a second signal, never the only one.

## 4. Data model (linked records)

| Entity | Key | Main links |
|---|---|---|
| Project | `project_id` | owns everything below |
| Role assignment | user → role | `ROLE_PERMISSIONS` |
| Configuration / charter | in `config` | – |
| CTQ | `CTQ-nnn` | ← KPIs, findings, improvements, controls, approvals |
| Upload (dataset version) | `UP-nnn` + SHA-256 | → mapping, analysis runs |
| Mapping + issues | by upload | → standard fields (department pack) |
| Analysis run | `RUN-xxxxxxxx` | → plan, dataset version, CTQs, environment and seed |
| Finding | `F-nnn` | → analysis run, KPIs, CTQ |
| Stakeholder input | `SI-nnn` | → cause |
| Cause | `C-nnn` | → evidence, status |
| Improvement / pilot / action | `IMP` / `PIL` / `ACT` | → finding, CTQ, owner, approval |
| Benefit | `BEN-nnn` | → improvement, Finance approval |
| Control | `CTL-nnn` | → CTQ, owner |
| Approval | `APR-nnn` | → any record or results version (`linked_id`) |
| Results version | `vNNN` + content hash | → upload, runs; status Draft, Approved or Superseded |
| Change log | time-stamped | every add, update, promote, rollback and export |

Source schemas are kept as they are. Only the fields a project needs are mapped to the standard fields in its department pack.

## 5. Editing and refresh behaviour

| Required behaviour | Implemented in | Status |
|---|---|---|
| Store uploads without overwriting | `intake.register_upload` (hash-named, chmod 444) | Tested |
| Detect duplicate uploads | SHA-256 match, even after a rename | Tested |
| Validate schema, mapping and rules | `schema_check`, `apply_mapping` | Tested |
| Controlled edits | `update_record` / `edit_ctq` with logged before and after values | Tested |
| Preview before replacing approved results | New versions stay Draft; `approved_version` is unchanged | Tested |
| Recompute affected outputs | `edit_ctq` impact list; pipeline re-run per version | Tested |
| Compare old and new | `compare_versions` (proposed 5% materiality rule) | Tested |
| Flag changed findings | `findings_requiring_review` | Tested |
| Mark approvals for revalidation | `flag_revalidation`, `edit_ctq` | Tested |
| Rollback and version history | `rollback`, `versions[]` | Tested |
| Portable state | `export_state` / `import_state` | Tested |

## 6. Workflow contracts

| Workflow | Objective | Trigger / prerequisites | Accountable | Inputs | Steps | Decisions / exceptions | Timing | Outputs / system of record | Completion evidence | Escalation |
|---|---|---|---|---|---|---|---|---|---|---|
| Create project | Isolated workspace | Signed engagement | Project lead | Config answers | 1 `create_project` 2 assign roles 3 add charter and CTQs | ID already exists → refused | Day 1 | `project.json` | Change-log entry | Sponsor |
| Upload & qualify | A usable dataset | Data-sharing approval | Analyst | File | 1 upload 2 map 3 profile 4 log transformations 5 raise data requests | Duplicate → reuse; personal data → stop and review | ≤ 2 days per extract | `raw/`, mapping, DQ profile | DQ table reviewed | Data owner |
| Baseline run | Versioned results | Mapping approved | Analyst | Standardised data, plan | 1 complete the plan 2 run the pipeline 3 create a Draft version 4 review | Insufficient data → stop and record it | ≤ 3 days | `versions/vNNN` | Plan and run IDs | Project lead |
| Refresh | Updated results without losing the approved version | New extract | Analyst | New file | 1 upload 2 run 3 compare 4 flag revalidation 5 sponsor review 6 promote or hold | Material change → review before use | Per refresh | Comparison file | Signed promotion | Sponsor |
| Phase gate | Move to the next phase | Gate criteria evidenced | Sponsor | Gate pack (template 07) | 1 compile evidence 2 request approval 3 record decision | Conditional approval → actions | Per gate | Approval log | Approval entry | Steering group |
| Communicate | Approved messages only | Approved draft | Project lead | Comms pack | 1 render 2 review 3 approve 4 send through the approved channel | No approval → do not send | As planned | Artifact register | Approval reference | Sponsor |

## 7. Platform comparison (recommendation needs your approval)

| Criterion | Excel workbook | Power BI / Tableau | Streamlit (or another approved Python app) |
|---|---|---|---|
| Interactive uploads and mapping | Manual | Limited (Power Query, done by an author) | **Native** |
| Editable forms and write-back | Native, single user | Needs Power Apps or extensions | Native (needs a database) |
| Arbitrary statistics | Weak | Limited (R/Python visuals; licence and gateway dependent) | **Full engine** |
| Governed enterprise reporting | Weak | **Strong** (RLS, workspaces) | Moderate (you build it) |
| Licensing | Office | Pro / Premium per user | Open source; hosting cost |
| Hosting and security | File share | Microsoft / Tableau cloud | Needs approved hosting, SSO and secure storage |
| Maintenance | Low | Moderate | Higher (code owner needed) |
| Best fit | Small, consultant-run projects | Sponsor portfolio view | Analyst workflow and editing |

**Proposed:** use the **Python engine** as the analytical core (already built and tested). Front ends: the **Excel workbook** for portable, consultant-run projects; the **static HTML dashboard** for review packs; **Streamlit** (Phase 2) for interactive upload and editing **if IT approves hosting**; and **Power BI** later as a portfolio layer reading the result bundles. Before choosing, confirm the user count, hosting, SSO, data residency and licensing.

## 7a. Platform decision taken in v0.2

At your request, the interactive front end is now **Six Sigma Studio**. It is a single HTML file that runs in the browser, so there is no server to host.
- **Storage:** private per-user storage when published on claude.ai, browser storage when opened locally, plus export and import of a project file (.json).
- **Raw data:** never stored. Only project records and result summaries are saved.
- **Python engine:** remains the reference for reproducible and batch runs. An automated test checks that both give the same figures on the same file.

**Not provided:** multi-user editing of one project, organisation-wide access control, and an audit trail stronger than the change log. Those still need Phase 2 hosting (Streamlit or an approved app on a database).

## 8. MVP and phased backlog

| Phase | Scope | Status |
|---|---|---|
| **v0.2** | Six Sigma Studio: department-agnostic charter, CTQ, data-needs, mapping, analysis, recommendations, registers and PowerPoint; Employee Experience pack; generic deck and dashboard generators | Tested prototype |
| **MVP (v0.1)** | Engine, 13 department packs, demo pipeline, dashboard, deck, data-collection pack, 12 communication templates, Excel workspace, acceptance tests | Tested prototype (synthetic data only) |
| Phase 2 | Streamlit app on the same engine: upload wizard, mapping editor, register forms, approval buttons, database storage | Specification |
| Phase 3 | Analyze extensions: regression with diagnostics (residuals, influence, VIF, validation), attribute agreement and Gauge R&R, interrupted time series and pilot comparison | Specification |
| Phase 4 | Control: automated control-chart refresh, trigger alerts to owners (after approval), benefits tracking with Finance sign-off | Specification |
| Phase 5 | Portfolio view in Power BI across projects with row-level security | Specification |

## 9. Acceptance tests (Part 4G)

`python -m pytest -q tests` gives **16 passed** on the synthetic data. Test 16 drives the Studio in headless Chromium: all three examples, every module, deck export, and an upload-to-analysis run that reconciles with the engine.

| Test | Result |
|---|---|
| New project has no other client's data | Passed |
| Valid and invalid uploads | Passed |
| Duplicate upload and incompatible schema detection | Passed |
| Missing values are not converted to zero | Passed |
| CTQ edit identifies affected calculations and approvals | Passed |
| Filters keep denominators consistent | Passed |
| Refresh retains prior versions; promotion needs a named approver | Passed |
| Project access boundaries | Passed (prototype role check only; real enforcement must come from the hosting platform) |
| Export and reload of project state | Passed |
| Dashboard and presentation reconcile (headless browser + pptx text) | Passed |
| Statistical safeguards (p-value bounds, gated capability, plan required, "human error" rejected, censoring, funnel) | Passed |

**Not tested:** multi-user concurrency, real SSO or row-level security, very large files (>1M rows), Excel-specific timestamp quirks, and workbook formulas in Excel desktop (tested only by opening in LibreOffice).

## 10. Reflection checklist (release gate)

| # | Check | Status |
|---|---|---|
| 1 | A business leader can understand the finding and the next action | Met (deck slides 2 and 14) |
| 2 | Actions have owners, timing and completion evidence | Met for the demo; owners are roles until people are named |
| 3 | Outcome, process and balancing measures are all included | Partly: balancing measures defined but "Not assessed" (no data) |
| 4 | Assumptions and proposed targets are visible | Met |
| 5 | Methods fit the scales and design | Met (rank-based methods for skewed times; censoring handled) |
| 6 | Findings are traceable and reproducible | Met (run IDs, seed, versions, content hash) |
| 7 | Counts, denominators and units reconcile | Met (automated check) |
| 8 | No causal or financial claims beyond the evidence | Met: causes Hypothesized, no benefits shown |
| 9 | Data, edits, versions and approvals are controlled | Met at prototype level |
| 10 | Sensitive information is protected | Partly: personal-data scan, pack exclusions and aggregate-only workload. **Storage, access control and retention depend on the platform you choose.** |
| 11 | Presentation and dashboard agree | Met |
| 12 | No unavailable capability or approval is implied | Met: the demo approver is labelled synthetic |
| 13 | Incomplete DMAIC phases remain pending | Met |
