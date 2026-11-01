# Lean Six Sigma Project Workspace (v0.2, tested prototype)

## Start here: Six Sigma Studio (`app/six_sigma_studio.html`)

An interactive, department-agnostic DMAIC tool in one HTML file. Open it in a browser, or use the published claude.ai version.

1. **Organisation and team:** choose any of 14 departments (or Other), the process, the phase and the people.
2. **Charter:** business case, VOC/VOB, a problem-statement builder that flags embedded causes or solutions, goal, scope and milestones.
3. **CTQs:** pick from the department's metric library or write your own. There are four measurement types: duration, proportion, continuous and rating (including eNPS).
4. **Data needs:** the tool lists the fields it needs, with operational definitions. It includes a precision calculator and downloadable collection templates.
5. **Upload and map:** CSV or Excel, with automatic column mapping, scope exclusions and a data-quality profile. Raw data stays in the browser tab.
6. **Analysis:** baseline with confidence intervals, open-case handling (Kaplan-Meier), control charts with signal rules, stage bottlenecks, Pareto, segment tests, and findings written as Finding → Evidence → Implication → Action → Limitation.
7. **Recommendations and next steps:** rule-based and traceable to the evidence, plus a DMAIC checklist. An optional AI coach in claude.ai sends a summary only, never raw data.
8. **Registers:** SIPOC, stakeholder input, cause evidence, improvement scoring, pilots, actions, benefits, control plan, approvals, risks, assumptions, decisions, questions, versions and change log.
9. **Exports:** PowerPoint deck in your palette, project file (.json), data-collection templates and communication templates.

Three synthetic examples are built in: HR query resolution (duration), onboarding eNPS (rating) and weld defect rate (proportion). On the same file, the Studio's figures match the tested Python engine.

A reusable workspace for running Lean Six Sigma (DMAIC) engagements across clients and departments. It covers the charter and CTQs, data intake and quality, baseline and analysis, root-cause evidence, improvement, benefits and control. One versioned results bundle feeds both the **dashboard** and the **executive deck**, so their figures always agree.

> **Status:** generated code + 16 passing acceptance tests (including a headless-browser test of the Studio) on **synthetic** data. Not deployed. The platform choice is pending your approval (see `docs/WORKSPACE_BLUEPRINT.md` §7).

## What's here

| Path | What it is |
|---|---|
| `app/six_sigma_studio.html` | **Interactive Studio** (see above) |
| `docs/WORKSPACE_BLUEPRINT.md` | Architecture, 13 module specifications, data model, workflow contracts, platform comparison, backlog, acceptance results |
| `engine/sixsigma/` | Python engine: project isolation and registers, upload/mapping/data quality, statistics with safeguards, versioning and refresh, templates |
| `config/department_packs/` | 14 optional department packs (now including Employee Experience) (fields, metric library, stages, balancing measures, sensitivity notes) |
| `config/palette.json` | Your palette: coral `#E5A094`, peach `#F5D6BC`, cream `#F8F4E8`, sage `#D7E6B7`, plus neutral ink tones |
| `outputs/Six_Sigma_Project_Workspace_TEMPLATE.xlsx` | Blank Excel workspace: 17 module sheets + 7 registers, dropdowns, prioritisation and FMEA formulas |
| `templates/communication/` | 12 communication templates, from launch to closure, all marked Draft – pending approval |
| `generators/` | Dashboard (HTML), deck (pptx) and workbook builders |
| `demo/` | Synthetic Talent Acquisition engagement that exercises RUN PROJECT and REFRESH PROJECT |
| `tests/` | Acceptance tests (Part 4G) and statistical safeguards |

## Demo outputs (synthetic: fictitious organisation and figures)

In `demo/projects/DEMO-TA-SYNTH/outputs/`:

- `DEMO-TA-SYNTH_dashboard.html`: 13-module dashboard with filters, I-MR chart, funnel, Pareto, governance and a reconciliation check
- `DEMO-TA-SYNTH_executive_deck.pptx`: 15-slide DMAIC deck. Colour appears only for status and for the one data point that matters on each slide.
- `DEMO-TA-SYNTH_data_collection_pack.xlsx`: collection plan, operational definitions, a validated collection log (no personal-data fields), measurement check, Gemba sheet, stakeholder input, pilot tracking
- `communications/`: the 12 templates filled from the project's configuration, plus one compiled `.docx`
- `refresh_change_summary.md`: v001 → v002 comparison, with material changes flagged and an approval marked for revalidation

## Run it

```bash
pip install pandas numpy scipy openpyxl python-docx python-pptx pytest
```

```bash
npm install
```

```bash
python demo/generate_synthetic.py && python demo/run_demo.py
```

```bash
python -m pytest -q tests
```

```bash
python generators/build_workbook.py
```

## Start a real engagement (RUN PROJECT)

```python
import sys; sys.path.insert(0, "engine")
from sixsigma import project as P, intake, templates
pdir = P.create_project("projects", "CLIENT-PROC-01", actor="you", department_pack="finance",
                        client="...", process="...", roles={"you": "project_lead"})
```

Then upload, map, profile, write the analysis plan and run the pipeline. `demo/run_demo.py` is the worked example. Client projects go under `projects/`, which git ignores, so client data stays out of version control.

## Rules the engine enforces

Blanks are never treated as zero. Rows are never silently deleted. Raw uploads are read-only and checked for duplicates by hash. No inference runs without a written plan. p-values are reported as bounds (`p < 0.001`). Capability indices are withheld unless the specification is approved, stability is shown and measurement is verified. Open cases are handled with Kaplan-Meier. A missing timestamp is not counted as a funnel drop-out. "Human error" is rejected as a root cause. Benefits carry a stage and a type and need Finance approval. A refresh never replaces approved results without a named approver.
