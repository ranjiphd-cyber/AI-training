# Time-to-Fill DMAIC: Lean Six Sigma Black Belt project kit

Everything here runs on an **illustrative, synthetic dataset** of 270 requisitions (180 baseline, 90 pilot). The statistics are real calculations on that data. Replace the data with your ATS extract to get your own results.

| File | What it is | Who uses it |
|---|---|---|
| `TTF_DMAIC_Black_Belt_Project.pptx` | 25-slide DMAIC deck with speaker notes: charter, VOC→CTQ, SIPOC, data plan, MSA, capability, I-MR, fishbone, hypothesis tests, regression, Pareto, 5-Why, workshop output, impact/control matrix, cost-benefit, FMEA, to-be swimlane, before/after, staged I-chart, control plan, financial sign-off | Sponsor, TA leadership |
| `TTF_DMAIC_Data_Collection_Kit.xlsx` | 10 tabs: Read me, Requisition log (dropdowns, validation, checks), Stage timestamps, Interview feedback lag, HM VOC survey, Candidate survey, Attribute MSA, Missing-info questionnaire (18 questions), Data gaps and improvements, Specs and assumptions, plus the illustrative data | Recruiters, coordinators, TA Ops, HRIS, Finance |
| `data/dashboard_import_template.csv` | Blank CSV in the dashboard's column order | TA Ops |
| `dashboard/ttf_control_room.html` | Editable dashboard (published as a claude.ai artifact) | Whole team |

## Refresh with real data
1. Collect data in tab `1_Requisition_Log` of the kit.
2. In the dashboard: switch to **Team dataset**, then **Paste from Excel** or **Import CSV**. Every statistic recalculates.
3. To refresh the deck: save the log as `data/illustrative_requisitions.csv` (same columns), then run

```bash
pip install scipy numpy openpyxl
python3 scripts/gen_data.py      # NOTE: regenerates synthetic data; skip this line and run the stats part on your CSV
python3 scripts/build_xlsx.py
NODE_PATH=<folder with pptxgenjs> PPTX_SKILL=<pptx skill dir> node scripts/build_deck.js
python3 scripts/build_dashboard.py
```

## Assumptions to confirm (kit tab 7)
USL 45 days, target median 35 days, cost of vacancy €450/day, 1,200 in-scope hires/year. Cost-of-vacancy savings are notional until Finance validates the rate.
