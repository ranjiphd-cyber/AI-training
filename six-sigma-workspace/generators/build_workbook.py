"""Build the blank, reusable Excel project workbook (portable / consultant-managed option).

    python generators/build_workbook.py [out.xlsx]

Every sheet is empty of client data. Dropdowns enforce the evidence labels,
cause statuses, benefit classes and approval states used by the engine.
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "engine"))
from sixsigma.project import (BENEFIT_STAGE, BENEFIT_TYPE, CAUSE_STATUS, DEPARTMENTS, DMAIC,  # noqa: E402
                              EVIDENCE_LABELS, MODES)
from sixsigma.style import (BODY, BOX, FILL_BAD, FILL_HEAD, FILL_OK, FILL_REQ, HEAD, SUB, WRAP,  # noqa: E402
                            header_row, title_block)

APPROVAL = ["Pending", "Approved", "Approved with conditions", "Rejected", "Requires revalidation"]
STATUS = ["Not started", "In progress", "Complete", "Blocked", "Not assessed"]
ROWS = 60

wb = Workbook()
lists = wb.create_sheet("Lists")
LISTS = {"labels": EVIDENCE_LABELS, "cause": CAUSE_STATUS, "bstage": BENEFIT_STAGE, "btype": BENEFIT_TYPE,
         "dmaic": DMAIC, "modes": MODES, "dept": DEPARTMENTS, "approval": APPROVAL, "status": STATUS,
         "yesno": ["Yes", "No"], "sev": ["Low", "Medium", "High", "Critical"],
         "kind": ["Outcome", "Process", "Balancing", "Data quality"], "dir": ["lower", "higher", "nominal"],
         "ftype": ["id", "text", "category", "number", "datetime", "boolean"]}
ref = {}
for col, (name, vals) in enumerate(LISTS.items(), 1):
    lists.cell(row=1, column=col, value=name)
    for r, v in enumerate(vals, 2):
        lists.cell(row=r, column=col, value=v)
    letter = lists.cell(row=1, column=col).column_letter
    ref[name] = f"Lists!${letter}$2:${letter}${len(vals) + 1}"
lists.sheet_state = "hidden"


def dv(ws, list_name, rng):
    d = DataValidation(type="list", formula1=ref[list_name], allow_blank=True)
    ws.add_data_validation(d)
    d.add(rng)


def sheet(name, title, subtitle, headers, required=(), widths=None, validations=None, rows=ROWS):
    ws = wb.create_sheet(name)
    title_block(ws, title, subtitle)
    header_row(ws, 5, headers, required=required, widths=widths)
    for r in range(6, 6 + rows):
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=r, column=c)
            cell.border, cell.font, cell.alignment = BOX, BODY, WRAP
    for col_name, list_name in (validations or {}).items():
        i = headers.index(col_name) + 1
        letter = ws.cell(row=5, column=i).column_letter
        dv(ws, list_name, f"{letter}6:{letter}{5 + rows}")
    return ws


def status_colours(ws, col_letter, last):
    rng = f"{col_letter}6:{col_letter}{last}"
    ws.conditional_formatting.add(rng, FormulaRule(formula=[f'ISNUMBER(SEARCH("Approved",{col_letter}6))*NOT(ISNUMBER(SEARCH("revalidation",{col_letter}6)))'], fill=FILL_OK))
    ws.conditional_formatting.add(rng, FormulaRule(formula=[f'OR(ISNUMBER(SEARCH("revalidation",{col_letter}6)),ISNUMBER(SEARCH("Rejected",{col_letter}6)),ISNUMBER(SEARCH("Blocked",{col_letter}6)))'], fill=FILL_BAD))
    ws.conditional_formatting.add(rng, FormulaRule(formula=[f'OR(ISNUMBER(SEARCH("Pending",{col_letter}6)),ISNUMBER(SEARCH("progress",{col_letter}6)))'], fill=FILL_REQ))


# ---------------------------------------------------------------- cover
ws = wb.active
ws.title = "Cover"
title_block(ws, "Lean Six Sigma Project Workspace", "Reusable template. Make one copy per client engagement and never carry data between clients.")
info = [
    ("Document control", "Title: [project] workspace | Owner: [ ] | Approver: [ ] | Version 0.1 | Status: Draft - pending approval | Effective: [ ] | Review: each phase gate"),
    ("Modes", "BUILD TEMPLATE (this file, blank). RUN PROJECT (copy, then configure 01_Config). REFRESH PROJECT (add a new dataset version and compare before replacing approved results)."),
    ("Evidence labels", ", ".join(EVIDENCE_LABELS)),
    ("Cause status", ", ".join(CAUSE_STATUS)),
    ("Benefit stage", ", ".join(BENEFIT_STAGE)),
    ("Benefit type", ", ".join(BENEFIT_TYPE)),
    ("Status colours", "Colour is a second signal only: every status is also written as text. Sage = approved or complete; peach = pending or in progress; coral = needs revalidation, rejected or blocked."),
    ("Blanks", "Blank means unknown. Never type 0 for unknown. Write 'Not assessed' where a measure has no data or no approved threshold."),
    ("Sensitive data", "Keep personal data out of this workbook. Use pseudonymised references. Send fairness, legal and regulatory questions for qualified review."),
    ("Analysis engine", "Statistics and versioned results come from the Python engine (engine/sixsigma). This workbook holds the editable project records."),
]
for i, (k, v) in enumerate(info, 5):
    ws.cell(row=i, column=1, value=k).font = HEAD
    c = ws.cell(row=i, column=2, value=v)
    c.font, c.alignment = BODY, WRAP
ws.column_dimensions["A"].width, ws.column_dimensions["B"].width = 22, 110
ws.cell(row=17, column=1, value="Sheet").font = HEAD
ws.cell(row=17, column=2, value="Module / purpose").font = HEAD

# ---------------------------------------------------------------- 01 config
ws = sheet("01_Config", "Project configuration", "Collect only what the next decision needs. Unknown = leave blank.",
           ["Field", "Value", "Options / notes", "Label", "Owner", "Last updated"], widths={"Field": 28, "Value": 40, "Options / notes": 50},
           rows=0)
cfg = [("Mode", "BUILD TEMPLATE / RUN PROJECT / REFRESH PROJECT"), ("Project ID", "Letters, digits, - or _"), ("Client", ""),
       ("Industry", ""), ("Department", "; ".join(DEPARTMENTS)), ("Department pack", "config/department_packs/*.json"), ("Process", ""),
       ("Observation unit", "e.g. requisition, invoice, ticket"), ("DMAIC stage", " / ".join(DMAIC)),
       ("Customer outcome", ""), ("Business outcome", ""), ("Sponsor", ""), ("Process owner", ""), ("Project lead", ""),
       ("Stakeholders", ""), ("Scope", ""), ("Exclusions", ""), ("Constraints", ""), ("Time zone", ""), ("Calendar rule", "Calendar days / business days (define)"),
       ("Currency", ""), ("Platform", "Excel / Power BI / Tableau / Streamlit / Other"), ("Users and hosting", ""), ("Security / privacy / retention", ""),
       ("Deliverables and audiences", ""), ("Deadline", "")]
for r, (f, note) in enumerate(cfg, 6):
    for c, v in enumerate([f, None, note, None, None, None], 1):
        cell = ws.cell(row=r, column=c, value=v)
        cell.border, cell.font, cell.alignment = BOX, BODY, WRAP
    ws.cell(row=r, column=1).font = HEAD
dv(ws, "modes", "B6")
dv(ws, "dept", "B10")
dv(ws, "dmaic", "B14")
dv(ws, "labels", f"D6:D{5 + len(cfg)}")

# ---------------------------------------------------------------- 02 charter
ws = sheet("02_Charter", "Project charter", "Problem = process + population + observed gap + period + impact. No cause, no solution.",
           ["Section", "Content", "Label", "Approval status", "Approver", "Date"], widths={"Section": 26, "Content": 80},
           rows=0)
for r, sec in enumerate(["Business case", "Voice of the Customer", "Voice of the Business", "Problem statement", "Goal statement",
                         "Scope", "Out of scope", "Team and roles (RACI)", "Milestones", "Define gate criteria", "Measure gate criteria",
                         "Analyze gate criteria", "Improve gate criteria", "Control gate criteria", "Risks and dependencies"], 6):
    for c in range(1, 7):
        cell = ws.cell(row=r, column=c, value=sec if c == 1 else ("Pending" if c == 4 else None))
        cell.border, cell.font, cell.alignment = BOX, BODY if c > 1 else HEAD, WRAP
    ws.row_dimensions[r].height = 45
dv(ws, "labels", "C6:C20")
dv(ws, "approval", "D6:D20")
status_colours(ws, "D", 20)

# ---------------------------------------------------------------- 03 CTQ
ws = sheet("03_CTQ", "Critical-to-Quality requirements", "Target and specification stay separate. A target is only Approved after sign-off.",
           ["CTQ ID", "Metric", "Kind", "Definition", "Unit", "Numerator", "Denominator", "Population / exclusions", "Start event",
            "Stop event", "Direction", "Source", "Owner", "Baseline", "Approved requirement", "Target", "Target status"],
           required={"CTQ ID", "Metric", "Definition", "Unit", "Direction"},
           validations={"Kind": "kind", "Direction": "dir", "Target status": "approval"})
status_colours(ws, "Q", 5 + ROWS)

# ---------------------------------------------------------------- 04 SIPOC
ws = sheet("04_SIPOC", "SIPOC and AS-IS process", "Fill in during the workshop. The AS-IS steps come from Gemba observation and timestamps.",
           ["Suppliers", "Inputs", "Process step", "Outputs", "Customers", "Step owner", "Timestamp field (if any)", "Value type (VA/NVA/BVA)", "Notes"], rows=15)

# ---------------------------------------------------------------- 05 data
sheet("05_Data_Dictionary", "Source-to-standard field map and data dictionary", "Keep source schemas as they are. Map only the fields you need.",
      ["Upload ID", "File / sheet", "Source column", "Standard field", "Type", "Unit", "Allowed values", "Personal data?",
       "Transformation", "Notes"], required={"Source column", "Standard field", "Type"},
      validations={"Type": "ftype", "Personal data?": "yesno"})
sheet("06_DQ_Checks", "Data quality and measurement checks", "Report what you find. Never repair silently.",
      ["Check", "Dataset version", "Field(s)", "Method", "Result", "Records affected", "Decision (exclude / correct / accept)",
       "Decided by", "Evidence location", "Status"], validations={"Status": "status"})
sheet("07_Data_Collection", "Data collection plan", "No universal minimum sample size. Base the sampling on the precision the decision needs.",
      ["Question", "Required field", "Operational definition", "Source", "Collection method", "Sampling / precision rationale",
       "Owner", "Frequency", "Validation", "Completion evidence", "Status"],
      required={"Question", "Required field", "Operational definition", "Owner"}, validations={"Status": "status"})

# ---------------------------------------------------------------- analysis
sheet("08_Analysis_Plan", "Analysis plan (complete before any inference)", "The method follows the question and the data, not a normality test on its own.",
      ["Run ID", "Business question", "Outcome", "Predictors", "Observation unit", "Sample", "Objective / hypothesis", "Method",
       "Rationale", "Assumptions", "Diagnostics", "Confidence level", "Practical importance criterion", "Bias / confounding risks",
       "Dataset version", "Status"], required={"Business question", "Method", "Practical importance criterion"},
      validations={"Status": "status"})
ws = sheet("09_Findings", "Findings", "Finding -> Evidence -> Business implication -> Action -> Limitation.",
           ["Finding ID", "Finding", "Evidence", "Business implication", "Action", "Limitation", "Label", "Analysis run ID",
            "CTQ ID", "Dataset version", "Review status"], validations={"Label": "labels", "Review status": "approval"})
status_colours(ws, "K", 5 + ROWS)

# ---------------------------------------------------------------- causes
sheet("10_Stakeholder_Input", "Stakeholder input", "Record what was said. Never invent responses. Every entry starts as Stakeholder opinion.",
      ["Input ID", "Contributor role", "Group", "Method", "Issue", "Idea / possible cause", "Evidence they would expect", "Date", "Label"],
      validations={"Label": "labels"})
ws = sheet("11_Cause_Evidence", "Root-cause evidence register", "'Human error' is not a root cause. Name the system condition that allows it.",
           ["Cause ID", "Issue", "Hypothesized cause", "Contributor role", "Observation", "Evidence required", "Validation method",
            "Result", "Owner", "Status"], required={"Issue", "Hypothesized cause", "Evidence required"}, validations={"Status": "cause"})

# ---------------------------------------------------------------- prioritisation
ws = sheet("12_Prioritisation", "Improvement prioritisation (weights PROPOSED until approved)",
           "Score 1-5. Higher always means better: low cost, low effort and low risk score high.",
           ["Option ID", "Change", "CTQ ID", "Finding / cause ID", "Expected mechanism", "Customer impact", "Evidence strength",
            "Cost (5=low)", "Effort (5=low)", "Control", "Time to benefit (5=fast)", "Dependencies (5=few)", "Risk (5=low)",
            "Weighted score", "Rank", "Decision"], validations={"Decision": "approval"}, rows=30)
ws.cell(row=4, column=5, value="Weights:").font = HEAD
weights = [0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
for i, w in enumerate(weights):
    c = ws.cell(row=4, column=6 + i, value=w)
    c.fill, c.font, c.number_format = FILL_REQ, HEAD, "0%"
ws.cell(row=3, column=6, value="Weights are proposed. Sponsor approval needed. They must sum to 100%:").font = SUB
ws.cell(row=3, column=12, value="=SUM(F4:M4)").number_format = "0%"
for r in range(6, 36):
    ws.cell(row=r, column=14, value=f'=IF(COUNT(F{r}:M{r})<8,"Incomplete",SUMPRODUCT($F$4:$M$4,F{r}:M{r}))')
    ws.cell(row=r, column=15, value=f'=IF(ISNUMBER(N{r}),RANK(N{r},$N$6:$N$35),"")')

ws = sheet("13_FMEA", "Failure mode and effects analysis", "RPN is not the only priority rule. Any severity of 9 or 10 needs a response, whatever its RPN.",
           ["Process step", "Failure mode", "Effect", "Severity (1-10)", "Cause", "Occurrence (1-10)", "Current control",
            "Detection (1-10)", "RPN", "High-severity flag", "Action", "Owner", "Due", "Status"], validations={"Status": "status"}, rows=40)
for r in range(6, 46):
    ws.cell(row=r, column=9, value=f'=IF(COUNT(D{r},F{r},H{r})=3,D{r}*F{r}*H{r},"")')
    ws.cell(row=r, column=10, value=f'=IF(AND(ISNUMBER(D{r}),D{r}>=9),"SEVERITY >= 9 - ACTION REQUIRED","")')
ws.conditional_formatting.add("J6:J45", FormulaRule(formula=['LEN(J6)>0'], fill=FILL_BAD))

# ---------------------------------------------------------------- pilot / implementation
sheet("14_Pilot_Plan", "Pilot plan", "No pilot starts without approval, guardrails and a stop rule.",
      ["Pilot ID", "Owner", "Population", "Intervention", "Comparison approach", "Duration rationale", "Measures", "Success criteria",
       "Guardrails", "Stop rules", "Rollback plan", "Approval", "Completion evidence"],
      required={"Owner", "Population", "Intervention", "Comparison approach", "Stop rules"}, validations={"Approval": "approval"}, rows=15)
sheet("15_Implementation", "Implementation, training and communication tracker", "Link each action to a finding, a CTQ, an owner and an approval.",
      ["Action ID", "Action", "Linked finding", "Linked CTQ", "Owner", "Start", "Due", "Dependency", "Training / comms needed",
       "Approval ref", "Completion evidence", "Status"], validations={"Status": "status"})

# ---------------------------------------------------------------- benefits
ws = sheet("16_Benefits", "Benefits (Finance validation required)", "Time saved is not cash saved. Keep forecast, pilot and realized benefits separate. Avoid double counting.",
           ["Benefit ID", "Description", "Stage", "Type", "Formula (text)", "Volume", "Unit value", "Gross value", "Costs", "Net value",
            "Currency", "Time horizon", "Assumptions", "Overlap check", "Finance approval"],
           validations={"Stage": "bstage", "Type": "btype", "Finance approval": "approval"}, rows=30)
for r in range(6, 36):
    ws.cell(row=r, column=8, value=f'=IF(COUNT(F{r},G{r})=2,F{r}*G{r},"")')
    ws.cell(row=r, column=10, value=f'=IF(ISNUMBER(H{r}),H{r}-N(I{r}),"")')
status_colours(ws, "O", 35)

# ---------------------------------------------------------------- control
sheet("17_Control_Plan", "Control plan and handover", "Every trigger needs a response, a response time and an escalation path.",
      ["Metric / CTQ", "Definition", "Source", "Owner", "Review frequency", "Approved requirement", "Monitoring method",
       "Trigger", "Response", "Response timing", "Escalation", "Evidence location", "Status"], validations={"Status": "status"}, rows=20)

# ---------------------------------------------------------------- registers
sheet("R_Assumptions", "Assumptions register", "", ["ID", "Statement", "Label", "Owner", "Impact if wrong", "Validation plan", "Status"],
      validations={"Label": "labels", "Status": "status"})
sheet("R_Questions", "Question backlog (work no more than five at a time)", "", ["ID", "Question", "Priority", "Owner", "Needed for decision", "Due", "Answer", "Status"],
      validations={"Status": "status"})
sheet("R_Risks_Issues", "Risk and issue register", "", ["ID", "Type (risk/issue)", "Description", "Severity", "Likelihood", "Owner", "Mitigation", "Status"],
      validations={"Severity": "sev", "Status": "status"})
sheet("R_Decisions", "Decision log", "", ["ID", "Decision", "Options considered", "Rationale", "Decided by", "Date", "Label"],
      validations={"Label": "labels"})
ws = sheet("R_Approvals", "Approval log", "Unsigned approvals stay Pending. Changes to linked results set them back to Requires revalidation.",
           ["ID", "Item", "Linked record", "Approver role", "Approver name", "Status", "Date", "Conditions"], validations={"Status": "approval"})
status_colours(ws, "F", 5 + ROWS)
sheet("R_Artifacts", "Artifact and version register", "", ["ID", "Title", "Type", "Version", "Results version", "Owner", "Status", "Location", "Date"],
      validations={"Status": "approval"})
sheet("R_Change_Log", "Change log", "", ["Date-time", "Actor", "Record", "Field", "Old value", "New value", "Reason"])

wb.move_sheet("Lists", offset=len(wb.sheetnames))
cover = wb["Cover"]
for i, name in enumerate([s for s in wb.sheetnames if s not in ("Cover", "Lists")], 18):
    cover.cell(row=i, column=1, value=name).font = BODY
    cover.cell(row=i, column=2, value=wb[name]["A1"].value).font = BODY

out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "outputs" / "Six_Sigma_Project_Workspace_TEMPLATE.xlsx")
out.parent.mkdir(parents=True, exist_ok=True)
wb.save(out)
print(out)
