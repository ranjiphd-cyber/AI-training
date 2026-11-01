import re
import csv, os, json
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

D = os.path.join(os.path.dirname(__file__), "..")
R = json.load(open(f"{D}/data/results.json"))
wb = Workbook()
NAVY = "1F3A4D"; TEAL = "0F7C80"; INPUT = "FFF4C2"; EX = "E8F1F2"; GREY = "F3F5F6"
F = lambda **k: Font(name="Arial", **k)
thin = Side(style="thin", color="C9D3D8"); B = Border(left=thin, right=thin, top=thin, bottom=thin)
H = PatternFill("solid", fgColor=NAVY); I = PatternFill("solid", fgColor=INPUT); E = PatternFill("solid", fgColor=EX); G = PatternFill("solid", fgColor=GREY)

def title(ws, t, sub):
    ws["A1"] = t; ws["A1"].font = F(bold=True, size=16, color=NAVY)
    ws["A2"] = sub; ws["A2"].font = F(italic=True, size=10, color="56656D")
    ws.sheet_view.showGridLines = False

def header(ws, row, cols, widths=None, notes=None):
    for j, c in enumerate(cols, 1):
        cell = ws.cell(row=row, column=j, value=c); cell.font = F(bold=True, color="FFFFFF", size=10); cell.fill = H
        cell.alignment = Alignment(wrap_text=True, vertical="center"); cell.border = B
        if notes and c in notes: cell.comment = Comment(notes[c], "LSS MBB")
        ws.column_dimensions[get_column_letter(j)].width = (widths[j-1] if widths else max(14, len(c) + 3))
    ws.row_dimensions[row].height = 32; ws.freeze_panes = ws.cell(row=row+1, column=1)

def body(ws, r0, rows, fill=None, wrap=True):
    for i, row in enumerate(rows):
        for j, v in enumerate(row, 1):
            c = ws.cell(row=r0+i, column=j, value=v); c.font = F(size=10); c.border = B
            c.alignment = Alignment(wrap_text=wrap, vertical="top")
            if fill: c.fill = fill

def input_block(ws, r0, r1, c0, c1):
    for r in range(r0, r1+1):
        for c in range(c0, c1+1):
            cell = ws.cell(row=r, column=c); cell.fill = I; cell.border = B; cell.font = F(size=10)

LISTS = {
 "phase": ["Baseline", "Improve", "Control"],
 "business_unit": ["Manufacturing", "Engineering & R&D", "Sales & Service", "Corporate Functions", "IT & Digital"],
 "job_level": ["Operator/Technician", "Professional", "Manager", "Senior Leader"],
 "source_channel": ["Employee Referral", "Job Board", "LinkedIn / Direct Sourcing", "Agency", "Internal Mobility"],
 "primary_delay_reason": ["Hiring-manager feedback delay", "Interview scheduling / panel availability", "Requisition approval delay",
     "Offer & compensation approval", "Low / poor-fit applicant pool", "Candidate decline or renege", "JD / requirement changed mid-search", "No delay"],
 "yn": ["Y", "N"],
 "stage": ["1 Requisition approval", "2 Sourcing", "3 Screening", "4 Interviewing", "5 Offer"],
 "va": ["Value-adding (work)", "Waiting (queue)", "Rework"],
 "status": ["Open", "In progress", "Answered", "Blocked"],
}

# ---------- 0 Read Me
ws = wb.active; ws.title = "0_Read_Me"
title(ws, "Time-to-Fill DMAIC: Data Collection Kit", "Lean Six Sigma Black Belt project · Talent Acquisition · v1.0 · Nov 2026")
ws.column_dimensions["A"].width = 30; ws.column_dimensions["B"].width = 95
rows = [
 ("Purpose", "Collect the data needed to baseline, analyse and control Time-to-Fill (TTF). Every tab maps to a DMAIC phase and to a dashboard field."),
 ("Primary metric (Y)", "TTF days = Offer-accept date minus Requisition-approved-to-open date (calendar days)."),
 ("Defect", f"A requisition whose TTF is greater than the USL ({R['spec']['USL']:.0f} days). Unit = one filled requisition. Opportunity = 1 per unit."),
 ("Target", f"{R['spec']['target']:.0f} days median TTF; ≥ 90% of requisitions at or under {R['spec']['USL']:.0f} days."),
 ("How to fill", "Type ONLY in yellow cells. Blue-tinted row 5 on each log is a worked example: overwrite or delete it. Grey cells are formulas: do not overwrite."),
 ("Dropdowns", "Fields with fixed categories use dropdowns (list source: tab 10_Lists). Add new categories in 10_Lists first, then use them."),
 ("Dates", "Enter as real dates (YYYY-MM-DD). Never type text like 'mid-March'. Blank = not yet happened."),
 ("Privacy", "Do NOT enter candidate names, emails or personal data. Use the ATS requisition ID and an anonymised candidate code."),
 ("Who fills what", "1 Requisition Log: TA Ops / Recruiters · 2 Stage Timestamps: ATS extract (TA Ops) · 3 Interview Feedback: Coordinators · 4 HM VOC: Hiring managers · 5 Candidate survey: Candidates · 6 MSA: 3 recruiters · 7 Questionnaire: Sponsor, HRBP, TA Ops, Finance, HRIS · 8 Data plan: Black Belt + HRIS"),
 ("Dashboard import", "Tab 1 columns A–T match the dashboard exactly. Save tab 1 as CSV (File > Save As > CSV) and use 'Import CSV' in the dashboard, or paste the rows."),
 ("Data collection window", "Baseline: last 6 complete months of filled requisitions (min. n = 100; ideal n ≥ 150 for stratified tests). Control: every new filled requisition, weekly cut."),
 ("Sample size logic", "To detect a 5-day median shift with σ ≈ 20 days, α = 0.05, power = 0.80 → n ≈ 126 per group (2-sample, normal approx.). Use ≥ 30 per stratum for Kruskal-Wallis."),
]
body(ws, 4, rows)
for r in range(4, 4+len(rows)): ws.cell(row=r, column=1).font = F(bold=True, size=10, color=NAVY)
r = 4 + len(rows) + 1
ws.cell(row=r, column=1, value="Colour legend").font = F(bold=True, size=11, color=NAVY)
for k, (lab, fill) in enumerate([("Input: type here", I), ("Worked example row", E), ("Formula: do not edit", G)]):
    c = ws.cell(row=r+1+k, column=1, value=lab); c.fill = fill; c.font = F(size=10); c.border = B

# ---------- 1 Requisition Log
ws = wb.create_sheet("1_Requisition_Log")
title(ws, "1 · Requisition Log (one row per FILLED requisition)", "Feeds the dashboard. Columns A–T = dashboard schema. U–W are checks.")
cols = ["req_id","phase","req_open_date","offer_accept_date","business_unit","job_level","source_channel","recruiter_id",
        "recruiter_open_reqs","interview_rounds","approval_days","sourcing_days","screening_days","interview_days","offer_days",
        "ttf_days","primary_delay_reason","offer_accepted","hiring_manager_id","notes",
        "CHECK ttf from dates","CHECK stage sum vs ttf","DEFECT (ttf > USL)"]
notes = {"req_id":"ATS requisition number. Unique.", "req_open_date":"Date requisition was approved AND opened for sourcing.",
 "offer_accept_date":"Date candidate verbally/written accepted.", "recruiter_open_reqs":"Recruiter's open requisition count on req_open_date (workload driver).",
 "interview_rounds":"Number of distinct interview rounds for the hired candidate.", "approval_days":"Days from req raised to req approved.",
 "ttf_days":"Leave blank to use dates; or type if dates unavailable.", "primary_delay_reason":"Single biggest cause of delay as judged by recruiter (operational definition in tab 6).",
 "hiring_manager_id":"Anonymised HM code, enables HM-level stratification."}
header(ws, 4, cols, [11,10,13,13,20,18,22,11,12,11,11,11,11,11,11,10,32,10,12,24,13,14,13], notes)
ex = ["REQ-10234","Baseline","2026-03-02","2026-04-20","Engineering & R&D","Professional","LinkedIn / Direct Sourcing","R04",22,4,6,10,7,24,4,None,"Hiring-manager feedback delay","Y","HM-118","Example row: overwrite"]
body(ws, 5, [ex], fill=E)
NROW = 600
input_block(ws, 6, NROW, 1, 20)
for r in range(5, NROW+1):
    ws.cell(row=r, column=16).value = f'=IF(AND(C{r}<>"",D{r}<>""),D{r}-C{r},"")' if r == 5 else ws.cell(row=r, column=16).value
    ws.cell(row=r, column=21, value=f'=IF(AND(C{r}<>"",D{r}<>""),D{r}-C{r},"")')
    ws.cell(row=r, column=22, value=f'=IF(COUNT(K{r}:O{r})=5,IF(ABS(SUM(K{r}:O{r})-IF(P{r}<>"",P{r},U{r}))>3,"GAP >3d","OK"),"")')
    ws.cell(row=r, column=23, value=f'=IF(IF(P{r}<>"",P{r},U{r})="","",IF(IF(P{r}<>"",P{r},U{r})>\'9_Spec_Assumptions\'!$C$5,1,0))')
    for c in (21, 22, 23):
        cell = ws.cell(row=r, column=c); cell.fill = G; cell.font = F(size=10); cell.border = B
for r in range(5, NROW+1):
    for c in (3, 4): ws.cell(row=r, column=c).number_format = "yyyy-mm-dd"
def dv(ws, listname, rng_):
    n = len(LISTS[listname]); col = list(LISTS).index(listname) + 1; L = get_column_letter(col)
    d = DataValidation(type="list", formula1=f"='10_Lists'!${L}$2:${L}${n+1}", allow_blank=True, showErrorMessage=True,
                       errorTitle="Pick from list", error="Use the dropdown. Add new values in tab 10_Lists first.")
    ws.add_data_validation(d); d.add(rng_)
dv(ws, "phase", f"B5:B{NROW}"); dv(ws, "business_unit", f"E5:E{NROW}"); dv(ws, "job_level", f"F5:F{NROW}")
dv(ws, "source_channel", f"G5:G{NROW}"); dv(ws, "primary_delay_reason", f"Q5:Q{NROW}"); dv(ws, "yn", f"R5:R{NROW}")
num = DataValidation(type="decimal", operator="between", formula1="0", formula2="400", showErrorMessage=True, error="Days must be 0–400")
ws.add_data_validation(num); num.add(f"I5:P{NROW}")
dte = DataValidation(type="date", operator="greaterThan", formula1="DATE(2020,1,1)", showErrorMessage=True, error="Enter a real date (YYYY-MM-DD)")
ws.add_data_validation(dte); dte.add(f"C5:D{NROW}")

# ---------- 2 Stage timestamps
ws = wb.create_sheet("2_Stage_Timestamps")
title(ws, "2 · Stage Timestamp Log (one row per requisition × stage)", "For Value Stream Map: separates touch time from queue time. Extract from ATS audit trail.")
cols = ["req_id","stage","stage_start","stage_end","elapsed_days (formula)","owner_role","touch_time_hours","time_type","waiting_for (who/what)","system_of_record","comment"]
header(ws, 4, cols, [12,22,13,13,14,18,13,20,28,16,30])
body(ws, 5, [["REQ-10234","4 Interviewing","2026-03-23","2026-04-16",None,"Hiring Manager",6,"Waiting (queue)","Round-2 feedback from HM","ATS","Example row"]], fill=E)
input_block(ws, 6, 1500, 1, 4); input_block(ws, 6, 1500, 6, 11)
for r in range(5, 1501):
    c = ws.cell(row=r, column=5, value=f'=IF(AND(C{r}<>"",D{r}<>""),D{r}-C{r},"")'); c.fill = G; c.border = B; c.font = F(size=10)
    for cc in (3, 4): ws.cell(row=r, column=cc).number_format = "yyyy-mm-dd"
dv(ws, "stage", "B5:B1500"); dv(ws, "va", "H5:H1500")

# ---------- 3 Interview feedback
ws = wb.create_sheet("3_Interview_Feedback")
title(ws, "3 · Interview Feedback Lag Log (one row per interview)", "Validates the #1 Pareto driver. SLA = feedback within 2 working days (48h).")
cols = ["req_id","candidate_code","round_no","interviewer_role","interview_date","feedback_submitted_date","lag_days (formula)","SLA_met (formula)","reminders_sent","scheduling_attempts","panel_size","comment"]
header(ws, 4, cols, [12,14,9,18,14,16,13,12,12,13,10,28])
body(ws, 5, [["REQ-10234","C-0091",2,"Hiring Manager","2026-04-01","2026-04-08",None,None,3,4,3,"Example row"]], fill=E)
input_block(ws, 6, 2000, 1, 6); input_block(ws, 6, 2000, 9, 12)
for r in range(5, 2001):
    a = ws.cell(row=r, column=7, value=f'=IF(AND(E{r}<>"",F{r}<>""),NETWORKDAYS(E{r},F{r})-1,"")')
    b = ws.cell(row=r, column=8, value=f'=IF(G{r}="","",IF(G{r}<=2,"Y","N"))')
    for c in (a, b): c.fill = G; c.border = B; c.font = F(size=10)
    for cc in (5, 6): ws.cell(row=r, column=cc).number_format = "yyyy-mm-dd"

# ---------- 4 HM VOC
ws = wb.create_sheet("4_HM_VOC_Survey")
title(ws, "4 · Hiring Manager Voice of Customer", "Scale 1 = strongly disagree … 5 = strongly agree. One column per respondent. Anonymous.")
qs = [("Speed","The time from requisition approval to accepted offer meets my business need."),
 ("Speed","I know at every point where my requisition stands."),
 ("Quality","Shortlisted candidates match the role requirements."),
 ("Quality","New hires from TA are performing well at 90 days."),
 ("Process","The number of interview rounds for my roles is appropriate."),
 ("Process","Scheduling interviews with my panel is easy."),
 ("Process","Approval of requisitions and offers is fast and predictable."),
 ("Self","I give interview feedback within 48 hours."),
 ("Self","My panel members give feedback within 48 hours."),
 ("Open","What is the single biggest cause of delay in your hiring? (free text)"),
 ("Open","If you could change one thing in the hiring process, what would it be? (free text)"),
 ("Open","What does 'fast enough' mean for your roles, in days? (number → informs USL)")]
header(ws, 4, ["#","Theme","Statement"] + [f"Resp {i}" for i in range(1, 21)] + ["Mean (formula)"], [4,10,62] + [8]*20 + [12])
for i, (t, q) in enumerate(qs, 1):
    body(ws, 4+i, [[i, t, q]])
    input_block(ws, 4+i, 4+i, 4, 23)
    if t != "Open":
        c = ws.cell(row=4+i, column=24, value=f'=IFERROR(AVERAGE(D{4+i}:W{4+i}),"")'); c.fill = G; c.border = B; c.number_format = "0.0"; c.font = F(size=10)

# ---------- 5 Candidate experience
ws = wb.create_sheet("5_Candidate_Survey")
title(ws, "5 · Candidate Experience Pulse", "Send at offer stage and to declined finalists. 1–5 scale unless stated.")
qs = [("Overall, how satisfied are you with the hiring process?","1–5"),("How likely are you to recommend us as an employer? (0–10)","0–10 → eNPS"),
 ("The process moved at a reasonable pace.","1–5"),("I was kept informed after each stage.","1–5"),("Number of interviews was reasonable.","1–5"),
 ("Did you receive or accept another offer during our process?","Y/N"),("If you declined: main reason","List: speed / compensation / role / location / other"),
 ("How many calendar days felt acceptable from application to offer?","number")]
header(ws, 4, ["#","Question","Scale"] + [f"Cand {i}" for i in range(1, 31)], [4,60,24] + [8]*30)
for i, (q, s) in enumerate(qs, 1):
    body(ws, 4+i, [[i, q, s]]); input_block(ws, 4+i, 4+i, 4, 33)

# ---------- 6 MSA
ws = wb.create_sheet("6_MSA_Attribute_Agree")
title(ws, "6 · Measurement System Analysis: Attribute Agreement on 'Primary Delay Reason'",
      "3 recruiters independently classify the same 20 closed requisitions twice (1 week apart, order shuffled). Target: within- and between-appraiser agreement ≥ 90%.")
cols = ["req_id","Standard (Black Belt)","A · trial 1","A · trial 2","B · trial 1","B · trial 2","C · trial 1","C · trial 2","A repeat?","B repeat?","C repeat?","All agree?","All = standard?"]
header(ws, 4, cols, [12,30,22,22,22,22,22,22,10,10,10,11,13])
for k in range(20):
    r = 5 + k; ws.cell(row=r, column=1, value=f"REQ-{k+1:03d}")
    input_block(ws, r, r, 2, 8)
    f = [f'=IF(C{r}="","",IF(C{r}=D{r},1,0))', f'=IF(E{r}="","",IF(E{r}=F{r},1,0))', f'=IF(G{r}="","",IF(G{r}=H{r},1,0))',
         f'=IF(C{r}="","",IF(AND(C{r}=D{r},D{r}=E{r},E{r}=F{r},F{r}=G{r},G{r}=H{r}),1,0))',
         f'=IF(C{r}="","",IF(AND(C{r}=B{r},D{r}=B{r},E{r}=B{r},F{r}=B{r},G{r}=B{r},H{r}=B{r}),1,0))']
    for j, ff in enumerate(f):
        c = ws.cell(row=r, column=9+j, value=ff); c.fill = G; c.border = B; c.font = F(size=10)
ws.cell(row=26, column=8, value="Agreement %").font = F(bold=True)
for j in range(5):
    L = get_column_letter(9+j); c = ws.cell(row=26, column=9+j, value=f'=IFERROR(AVERAGE({L}5:{L}24),"")'); c.number_format = "0%"; c.fill = G; c.font = F(bold=True)
dv(ws, "primary_delay_reason", "B5:H24")
ws.cell(row=28, column=1, value="Operational definitions (read before classifying)").font = F(bold=True, color=NAVY)
defs = [("Hiring-manager feedback delay","Any interview round where HM/panel feedback took > 2 working days."),
 ("Interview scheduling / panel availability","> 5 working days from shortlist to first interview slot, or ≥ 3 reschedules."),
 ("Requisition approval delay","> 5 working days from req raised to approved."),
 ("Offer & compensation approval","> 3 working days from verbal 'yes' to approved written offer; or comp exception loop."),
 ("Low / poor-fit applicant pool","< 5 qualified applicants after 10 days of sourcing."),
 ("Candidate decline or renege","Preferred candidate declined/reneged forcing restart."),
 ("JD / requirement changed mid-search","Role profile, level or location changed after sourcing began.")]
body(ws, 29, defs)

# ---------- 7 Missing info questionnaire
ws = wb.create_sheet("7_Missing_Info_Qs")
title(ws, "7 · Missing Information Questionnaire", "Questions the Black Belt needs answered to finalise baseline, scope and business case. Assign owner and due date.")
cols = ["#","DMAIC phase","Question","Why we need it","Suggested owner","Due date","Response","Status"]
header(ws, 4, cols, [4,11,58,48,18,12,40,12])
Q = [
 ("Define","What TTF start and stop points does the business accept (req raised, req approved, or posting live → offer accepted or start date)?","Unambiguous unit and operational definition; avoids 2 teams counting differently.","Sponsor / TA Head"),
 ("Define","What is the business-required maximum TTF per job level (USL)? Is 45 days right for all levels?","Specification limits drive defect rate, DPMO, Ppk and Z-bench.","Sponsor + BU Heads"),
 ("Define","What is the agreed cost of vacancy per day by level (lost output, overtime, contractor cover)?","Business case and COPQ in EUR; currently assumed €450/day.","Finance BP"),
 ("Define","How many hires per year by BU and level are in scope? Which are excluded (interns, bulk/blue-collar drives, internal moves)?","Scope boundary and annualised benefit.","TA Ops"),
 ("Define","Who are the team members and their time allocation (Green Belts, TA Ops analyst, HRIS)?","Charter resourcing.","Sponsor"),
 ("Measure","Which ATS/HRIS fields hold each stage timestamp? Are status changes audit-logged with dates?","Feasibility of automated stage-level data (tab 2).","HRIS / ATS admin"),
 ("Measure","Can we export the last 6–12 months of filled requisitions with all fields in tab 1?","Baseline sample size ≥ 100.","HRIS"),
 ("Measure","Are on-hold periods recorded (budget freeze, re-org)? How should they be treated?","Prevents inflated TTF; MSA bias check.","TA Ops"),
 ("Measure","How is 'primary delay reason' captured today, if at all?","Need attribute MSA before Pareto is trusted.","Recruitment Leads"),
 ("Measure","Do interviewers submit feedback in the ATS with a timestamp, or by email/Teams?","Determines if feedback lag can be measured objectively.","Coordinators"),
 ("Analyze","Which roles had offers declined, and what reasons were given?","Tests TTF → offer-acceptance link (chi-square).","Recruiters"),
 ("Analyze","What is each recruiter's open-req load by week?","Workload driver (regression X).","TA Ops"),
 ("Analyze","Is there an interview-round policy per level? Who can add rounds?","Validates interview-rounds root cause.","Recruitment Leads / HRBPs"),
 ("Improve","Which approvals could be pre-authorised against the annual headcount plan?","Feasibility of approval-delay solution.","Finance + HRBP"),
 ("Improve","Can the ATS send automated feedback reminders/escalations at 24h and 48h?","Poka-yoke feasibility and cost.","HRIS / Vendor"),
 ("Improve","Are hiring managers willing to commit to a 48h feedback SLA in their objectives?","Cultural enforceability (people side of change).","BU Heads"),
 ("Control","Who owns the weekly TTF control chart and reaction plan after project close?","Sustain ownership.","TA Ops Lead"),
 ("Control","Where will the dashboard be reviewed (TA staff meeting, HR LT, BU ops review) and how often?","Governance cadence.","Sponsor"),
]
body(ws, 5, [[i+1, *q[:2], q[2], q[3]] for i, q in enumerate(Q)])
input_block(ws, 5, 4+len(Q), 6, 8); dv(ws, "status", f"H5:H{4+len(Q)}")
for r in range(5, 5+len(Q)): ws.cell(row=r, column=8, value="Open"); ws.cell(row=r, column=6).number_format = "yyyy-mm-dd"

# ---------- 8 Data improvement plan
ws = wb.create_sheet("8_Data_Improvement")
title(ws, "8 · Data Gaps & Improvement Suggestions", "How to get the data we need, reliably and with less manual effort.")
cols = ["#","Data gap","Risk if not fixed","Improvement suggestion","Type","Owner","Effort (L/M/H)","Priority","Target date"]
header(ws, 4, cols, [4,32,34,58,16,16,10,9,12])
P = [
 ("No single TTF definition across BUs","Non-comparable baselines; MSA bias","Publish one operational definition (req approved → offer accepted); configure ATS report to compute it","Standardisation","TA Ops","L","1"),
 ("Stage timestamps missing or overwritten","Cannot build value stream map; cannot locate the bottleneck","Turn on ATS status-change audit log; make stage change mandatory to move candidate forward","Poka-yoke / system","HRIS","M","1"),
 ("Feedback given outside ATS (email/Teams)","Feedback lag unmeasurable; top Pareto cause unproven","Mandatory scorecard in ATS before next round can be booked; mobile feedback link","Poka-yoke","HRIS + HM","M","1"),
 ("Delay reason is free text or absent","Pareto unreliable; low attribute agreement","Dropdown with 7 operationally defined reasons; run attribute MSA (tab 6) and retrain until ≥ 90%","Standardisation + MSA","Recruitment Leads","L","1"),
 ("On-hold periods not logged","TTF inflated by business pauses","Add 'On hold' status with start/stop dates; report Net TTF alongside Gross TTF","System","HRIS","L","2"),
 ("Recruiter workload not tracked over time","Cannot test load → TTF; cannot balance work","Weekly snapshot of open reqs per recruiter from ATS (scheduled report)","Automation","TA Ops","L","2"),
 ("Cost of vacancy unknown","Weak business case","Finance to agree CoV per level (lost contribution, overtime, contractor premium)","Governance","Finance BP","M","2"),
 ("HM and candidate voice not captured","Solutions miss customer needs","Quarterly HM pulse (tab 4) and automated candidate survey at offer/decline (tab 5)","VOC","TA Ops","L","3"),
 ("Manual Excel consolidation each month","Errors, lag, recruiter time lost","Scheduled ATS export → dashboard import; data owner signs off monthly","Automation","TA Ops","M","3"),
 ("Candidate personal data in trackers","GDPR exposure","Use req ID + anonymised candidate code only; restrict tracker access","Compliance","TA Ops + DPO","L","1"),
]
body(ws, 5, [[i+1, *p] for i, p in enumerate(P)])
input_block(ws, 5, 4+len(P), 9, 9)

# ---------- 9 Spec & assumptions
ws = wb.create_sheet("9_Spec_Assumptions")
title(ws, "9 · Specification Limits & Assumptions", "Yellow cells drive the defect formula in tab 1. Confirm with Sponsor and Finance (tab 7 Q2–Q4).")
header(ws, 4, ["Parameter","Unit","Value","Source / status"], [36,14,12,60])
A = [("USL: maximum acceptable TTF","days",R["spec"]["USL"],"Assumption pending Sponsor sign-off (tab 7 Q2)"),
     ("Target median TTF","days",R["spec"]["target"],"Assumption pending Sponsor sign-off"),
     ("LSL","days",None,"None: faster is always better (one-sided spec)"),
     ("Cost of vacancy per open day","EUR",R["spec"]["cost_of_vacancy_eur_day"],"Assumption pending Finance (tab 7 Q3)"),
     ("Annual in-scope hires","hires",R["financial"]["annual_hires"],"Assumption pending TA Ops (tab 7 Q4)"),
     ("Feedback SLA","working days",2,"Proposed standard (Improve phase)"),
     ("Max interview rounds (non-exec)","rounds",3,"Proposed standard (Improve phase)")]
body(ws, 5, A)
for r in range(5, 12): ws.cell(row=r, column=3).fill = I

# ---------- 10 Lists
ws = wb.create_sheet("10_Lists")
title(ws, "10 · Dropdown lists", "Edit these to add categories. Keep spelling identical to the dashboard.")
for j, (k, vals) in enumerate(LISTS.items(), 1):
    ws.cell(row=1, column=j, value=k).font = F(bold=True, color="FFFFFF"); ws.cell(row=1, column=j).fill = H
    for i, v in enumerate(vals, 2): ws.cell(row=i, column=j, value=v).font = F(size=10)
    ws.column_dimensions[get_column_letter(j)].width = 34
ws["A1"].value = "phase"  # (title overwritten by header row intentionally)

# ---------- Illustrative data
ws = wb.create_sheet("Illustrative_Data")
rows = list(csv.DictReader(open(f"{D}/data/illustrative_requisitions.csv")))
ws["A1"] = "ILLUSTRATIVE DATA: synthetic, for training and to demonstrate the analysis. Not real requisitions."; ws["A1"].font = F(bold=True, color="B4232A")
hdr = list(rows[0].keys()); header(ws, 2, hdr)
for i, rr in enumerate(rows, 3):
    for j, k in enumerate(hdr, 1):
        v = rr[k]
        try: v = float(v) if k not in ("req_id",) and v.replace(".", "", 1).isdigit() else v
        except: pass
        ws.cell(row=i, column=j, value=v).font = F(size=9)

for s in wb.worksheets:
    s.sheet_properties.tabColor = TEAL if s.title[0].isdigit() and int(s.title.split("_")[0]) <= 3 else ("8A9BA3" if s.title != "Illustrative_Data" else "B4232A")
import datetime as _dt
for s_ in wb.worksheets:
    for row in s_.iter_rows():
        for c in row:
            if isinstance(c.value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", c.value):
                c.value = _dt.date.fromisoformat(c.value); c.number_format = "yyyy-mm-dd"
out = f"{D}/TTF_DMAIC_Data_Collection_Kit.xlsx"; wb.save(out); print(out)

# CSV import template for the dashboard
with open(f"{D}/data/dashboard_import_template.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(cols_dash := ["req_id","phase","req_open_date","offer_accept_date","business_unit","job_level","source_channel","recruiter_id","recruiter_open_reqs","interview_rounds","approval_days","sourcing_days","screening_days","interview_days","offer_days","ttf_days","primary_delay_reason","offer_accepted"])
    w.writerow(["REQ-10234","Baseline","2026-03-02","2026-04-20","Engineering & R&D","Professional","LinkedIn / Direct Sourcing","R04",22,4,6,10,7,24,4,49,"Hiring-manager feedback delay","Y"])
