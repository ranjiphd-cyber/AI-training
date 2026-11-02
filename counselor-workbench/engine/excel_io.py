"""Excel intake workbook: export a fill-in form and import it back into the portal.

Every input row carries a stable Field ID in column A and the answer in
column D, so the same reader handles the blank template, a candidate-filled
copy and a pre-filled export from the portal.
"""

import io
import re

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

from .knowledge import (
    APTITUDES, ARCHETYPES, ASPIRATIONS, BUDGETS, CAREER_CLUSTERS, FIELD_TAGS, GEOGRAPHY,
    LIFE_STAGES, MOTIVATORS, RIASEC, RIASEC_ORDER, TRAIT_PAIRS,
)
from .parser import riasec_from_code
from .questions import SIGNALS

FONT = "Arial"
NAVY, GOLD, INPUT, EXAMPLE, LINE = "1F3A5F", "A8742A", "FFF2CC", "F2F2F2", "BFC8D6"
LIKE_OPTS = ["Enjoy", "Neutral", "Dislike"]
YES_NO = ["Yes", "No"]
FIRST_ROW = 5  # data starts here on every form sheet

SELF_FIELDS = {
    "self.subjects": "Favourite subjects",
    "self.hobbies": "Hobbies & activities",
    "self.careers": "Careers being considered",
    "self.strengths": "Self-described strengths",
}

SAMPLE = {
    "p.name": "Muhammed Saad", "p.phone": "+91 98XXX XXXXX", "p.email": "saad@example.com", "p.age": "17",
    "i.stage": LIFE_STAGES[1], "i.stream": "PCMB, CBSE", "i.marks": "Class 10: 92%; Class 11 mid-term: 84%",
    "i.ug_major": "—", "i.current_role": "—", "i.experience": "0",
    "self.subjects": "Biology and Computer Science — I like understanding how living things work",
    "self.hobbies": "Flying drones, robotics club, football",
    "self.careers": "Something combining technology and farming; maybe research",
    "self.strengths": "Quick learner, good at leading group projects",
    "i.budget": BUDGETS[1], "i.parent_notes": "We hope he takes over and modernises the family farm business",
    "i.constraints": "Prefer to stay in Karnataka for the first degree",
    "p.report_date": "12 Oct 2026", "p.career1": CAREER_CLUSTERS[0], "p.career2": "Information Technology",
    "p.career3": "Science & Research", "p.apt.acuteness": 10, "p.apt.verbal": 10, "p.apt.critical": 9,
    "p.apt.spatial": 9, "p.apt.numerical": 6, "p.mot1": "Interest", "p.mot2": "Challenge", "p.mot3": "Freedom",
    "p.riasec_code": "IRC", "p.archetype": "Commanding Implementer / Opportunist",
    "p.trait1": "Factual", "p.trait2": "Spontaneous", "p.trait3": "Assertive", "p.trait4": "Gregarious",
    "p.plus1": "Decisive and action-oriented", "p.blind1": "Impatient with detail and routine",
    "i.observations": "Confident, fast talker; lights up discussing drones and plant genetics",
    "i.nuances": "Prefers tech + biology over pure software; dislikes long calculations",
    "i.confirmed_direction": "Shortlist B.Tech Biotech / B.Sc Agri; sit KCET + COMEDK",
}

thin = Side(style="thin", color=LINE)
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)


def _font(**kw):
    return Font(name=FONT, **kw)


class _Sheet:
    """Small helper that writes a titled form with consistent styling."""

    def __init__(self, wb, title, heading, subtitle, headers, widths):
        self.ws = wb.create_sheet(title)
        ws = self.ws
        ws["A1"] = heading
        ws["A1"].font = _font(size=15, bold=True, color=NAVY)
        ws["A2"] = subtitle
        ws["A2"].font = _font(size=10, italic=True, color="595959")
        for col, (h, w) in enumerate(zip(headers, widths), start=1):
            c = ws.cell(row=4, column=col, value=h)
            c.font = _font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor=NAVY)
            c.alignment = Alignment(vertical="center", wrap_text=True)
            c.border = BOX
            ws.column_dimensions[c.column_letter].width = w
        ws.row_dimensions[4].height = 22
        ws.freeze_panes = "D5"
        self.row = FIRST_ROW
        self.validations = {}

    def section(self, title):
        ws = self.ws
        if self.row > FIRST_ROW:
            self.row += 1
        c = ws.cell(row=self.row, column=2, value=title)
        c.font = _font(bold=True, size=11, color=GOLD)
        self.row += 1

    def _validation(self, formula, prompt=None, kind="list"):
        key = (kind, formula, prompt)
        if key not in self.validations:
            if kind == "list":
                dv = DataValidation(type="list", formula1=formula, allow_blank=True)
            else:
                dv = DataValidation(type="whole", operator="between", formula1="1", formula2="10", allow_blank=True)
                dv.error, dv.errorTitle = "Enter a whole number from 1 to 10.", "Score 1–10"
                dv.showErrorMessage = True
            if prompt:
                dv.prompt, dv.showInputMessage = prompt, True
            self.ws.add_data_validation(dv)
            self.validations[key] = dv
        return self.validations[key]

    def field(self, fid, label, value=None, hint="", example=None, options=None, score=False, filled_by="", long=False):
        ws, r = self.ws, self.row
        ws.cell(row=r, column=1, value=fid).font = _font(size=8, color="808080")
        ws.cell(row=r, column=1).alignment = Alignment(vertical="top")
        ws.cell(row=r, column=3, value=label).font = _font(size=10)
        ws.cell(row=r, column=3).alignment = Alignment(wrap_text=True, vertical="top")
        cell = ws.cell(row=r, column=4, value=value if value not in (None, "") else None)
        cell.fill = PatternFill("solid", fgColor=INPUT)
        cell.border = BOX
        cell.font = _font(size=10, color="0000FF")
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        ws.cell(row=r, column=5, value=hint).font = _font(size=9, color="595959")
        ws.cell(row=r, column=5).alignment = Alignment(wrap_text=True, vertical="top")
        ex = SAMPLE.get(fid) if example is None else example
        if ex not in (None, ""):
            e = ws.cell(row=r, column=6, value=ex)
            e.font = _font(size=9, italic=True, color="7F7F7F")
            e.fill = PatternFill("solid", fgColor=EXAMPLE)
            e.alignment = Alignment(wrap_text=True, vertical="top")
        if filled_by:
            ws.cell(row=r, column=7, value=filled_by).font = _font(size=9, color="595959")
            ws.cell(row=r, column=7).alignment = Alignment(vertical="top")
        if options:
            self._validation(options).add(cell)
        if score:
            self._validation(None, kind="whole").add(cell)
        if long:
            ws.row_dimensions[r].height = 48
        self.row += 1
        return r


def _lists_sheet(wb):
    ws = wb.create_sheet("Lists")
    columns = {
        "A": ("Life stage", LIFE_STAGES), "B": ("Career cluster", CAREER_CLUSTERS), "C": ("Motivator", list(MOTIVATORS)),
        "D": ("Archetype", list(ARCHETYPES)), "E": ("Budget", BUDGETS), "F": ("Signal", SIGNALS[1:]),
    }
    refs = {}
    for col, (title, values) in columns.items():
        ws[f"{col}1"] = title
        ws[f"{col}1"].font = _font(bold=True)
        for i, v in enumerate(values, start=2):
            ws[f"{col}{i}"] = v
        refs[title] = f"Lists!${col}$2:${col}${len(values) + 1}"
    ws.sheet_state = "hidden"
    return refs


def _inline(options):
    return '"' + ",".join(options) + '"'


def build_workbook(profile, interview, answers, questions):
    """Return the intake workbook as bytes, pre-filled with whatever is known."""
    wb = Workbook()
    start = wb.active
    start.title = "Start Here"
    refs = _lists_sheet(wb)
    P, I, A = profile or {}, interview or {}, answers or {}
    widths = [16, 4, 52, 34, 34, 34, 14]
    headers = ["Field ID (do not edit)", "", "Question / field", "YOUR ANSWER", "How to answer", "Example", "Filled by"]

    # ---------------------------------------------------------------- Candidate Form
    cf = _Sheet(wb, "Candidate Form", "Candidate Information Form",
                "To be filled by the student (Section F by a parent). Type only in the yellow cells.", headers, widths)
    cf.section("A. Personal & academic details")
    cf.field("p.name", "Full name", P.get("name"), filled_by="Candidate")
    cf.field("p.phone", "Mobile number", P.get("phone"), filled_by="Candidate")
    cf.field("p.email", "Email address", P.get("email"), filled_by="Candidate")
    cf.field("p.age", "Age", P.get("age"), filled_by="Candidate")
    cf.field("i.stage", "Current stage of education / career", I.get("stage"), "Choose from the list", options=refs["Life stage"], filled_by="Candidate")
    cf.field("i.stream", "Class 10/12 stream and board", I.get("stream"), "e.g. PCMB, CBSE / Commerce, State board", filled_by="Candidate")
    cf.field("i.marks", "Latest marks / CGPA / mock-test scores", I.get("marks"), filled_by="Candidate")
    cf.field("i.ug_major", "Undergraduate degree & major (if any)", I.get("ug_major"), "Leave blank if still in school", filled_by="Candidate")
    cf.field("i.current_role", "Current job role & organisation (if working)", I.get("current_role"), "Leave blank if not working", filled_by="Candidate")
    cf.field("i.experience", "Work experience (years)", I.get("experience"), filled_by="Candidate")

    cf.section("B. Subjects & activities — how do you feel about each?")
    likes, dislikes = set(I.get("likes", [])), set(I.get("dislikes", []))
    for tag in FIELD_TAGS:
        val = "Enjoy" if tag in likes else "Dislike" if tag in dislikes else None
        cf.field(f"i.field::{tag}", tag, val, "Enjoy / Neutral / Dislike", example="Enjoy" if tag in ("Biology & life sciences", "Coding & software") else "",
                 options=_inline(LIKE_OPTS), filled_by="Candidate")

    cf.section("C. About you — answer in your own words")
    notes = _split_self_notes(I.get("trait_notes", ""))
    cf.field("self.subjects", "Which subjects do you enjoy most, and why?", notes.get("self.subjects"), filled_by="Candidate", long=True)
    cf.field("self.hobbies", "What hobbies or activities do you do outside class?", notes.get("self.hobbies"), filled_by="Candidate", long=True)
    cf.field("self.careers", "Which careers are you currently considering?", notes.get("self.careers"), filled_by="Candidate", long=True)
    cf.field("self.strengths", "What are you good at, according to you and your friends?", notes.get("self.strengths"), filled_by="Candidate", long=True)
    for qid, text, ex in (
        ("open_flow", "Describe a moment in the last month when you completely lost track of time. What were you doing?", "Spent a whole Sunday programming a drone to map our farm"),
        ("open_agenda", "What decision are you trying to make right now about your studies or career?", "Choosing between engineering and agriculture after Class 12"),
        ("fam_free", "If cost and family opinion were not factors, what would you choose to do?", "Start an agri-tech company"),
        ("path_contact", "Have you spoken to anyone working in a career you like? What did you learn?", "My uncle, an agronomist — he said fieldwork is tough but rewarding"),
    ):
        cf.field(f"q.{qid}", text, A.get(qid, {}).get("response"), example=ex, filled_by="Candidate", long=True)

    cf.section("D. Where would you like to study / work, and the budget")
    geo = set(I.get("geography", []))
    for g in GEOGRAPHY:
        cf.field(f"i.geo::{g}", g, "Yes" if g in geo else None, "Yes if acceptable", example="Yes" if "Bangalore" in g or "Karnataka" in g else "",
                 options=_inline(YES_NO), filled_by="Candidate / Parent")
    cf.field("i.budget", "Annual education budget", I.get("budget"), "Choose from the list", options=refs["Budget"], filled_by="Parent")

    cf.section("E. Your aspirations — what do you want your career to give you?")
    asp = set(I.get("aspirations", []))
    for a in ASPIRATIONS:
        cf.field(f"i.asp::{a}", a, "Yes" if a in asp else None, "Yes if it applies (choose up to 3)", example="Yes" if a == "R&D / academia" else "",
                 options=_inline(YES_NO), filled_by="Candidate")

    cf.section("F. For parents")
    pasp = set(I.get("parent_aspirations", []))
    for a in ASPIRATIONS:
        cf.field(f"i.pasp::{a}", f"Parents hope for: {a}", "Yes" if a in pasp else None, "Yes if it applies", example="Yes" if a == "Family business" else "",
                 options=_inline(YES_NO), filled_by="Parent")
    cf.field("i.parent_notes", "What do you hope for your child's career? Any concerns?", I.get("parent_notes"), filled_by="Parent", long=True)
    cf.field("i.constraints", "Any constraints we must plan around (finance, location, health, family)?", I.get("constraints"), filled_by="Parent", long=True)

    # ---------------------------------------------------------------- Psychometric Report
    pr = _Sheet(wb, "Psychometric Report", "Psychometric Report Scores",
                "To be filled by the counsellor from the candidate's assessment report.", headers, widths)
    pr.section("A. Report details & top career clusters")
    pr.field("p.report_date", "Date of assessment report", P.get("report_date"), filled_by="Counsellor")
    careers = (list(P.get("careers") or []) + ["", "", ""])[:3]
    for i in range(3):
        pr.field(f"p.career{i + 1}", f"Top career cluster #{i + 1}", careers[i], "Choose from the list", options=refs["Career cluster"], filled_by="Counsellor")
    pr.section("B. Cognitive aptitudes (score 1–10)")
    for key, meta in APTITUDES.items():
        val = P.get("aptitudes", {}).get(key) if P.get("name") else None
        pr.field(f"p.apt.{key}", meta["label"], val, "Whole number 1–10", score=True, filled_by="Counsellor")
    pr.section("C. Core motivators (in priority order)")
    mots = (list(P.get("motivators") or []) + [""] * 5)[:5]
    for i in range(5):
        pr.field(f"p.mot{i + 1}", f"Motivator #{i + 1}", mots[i], "Choose from the list", options=refs["Motivator"], filled_by="Counsellor")
    pr.section("D. Holland RIASEC interests")
    pr.field("p.riasec_code", "Holland code (2–3 letters)", P.get("riasec_code"), "Letters from R, I, A, S, E, C — e.g. IRC", filled_by="Counsellor")
    scored = P.get("riasec_scored")
    for letter in RIASEC_ORDER:
        pr.field(f"p.riasec.{letter}", f"{RIASEC[letter]['name']} score (optional)", P.get("riasec", {}).get(letter) if scored else None,
                 "1–10, only if the report gives theme scores", example="", score=True, filled_by="Counsellor")
    pr.section("E. Behavioural archetype")
    pr.field("p.archetype", "Archetype / personality type", P.get("archetype"), "Choose from the list or type the report's name", options=refs["Archetype"], filled_by="Counsellor")
    traits = P.get("traits", [])
    for i, pair in enumerate(TRAIT_PAIRS, start=1):
        val = next((t for t in traits if t in pair), None)
        pr.field(f"p.trait{i}", f"Trait {i}: {pair[0]} or {pair[1]}", val, "Choose one", options=_inline(pair), filled_by="Counsellor")
    plus = (list(P.get("plus_points") or []) + [""] * 5)[:5]
    blind = (list(P.get("blind_spots") or []) + [""] * 5)[:5]
    pr.section("F. Plus points (strengths listed in the report)")
    for i in range(5):
        pr.field(f"p.plus{i + 1}", f"Plus point {i + 1}", plus[i], filled_by="Counsellor")
    pr.section("G. Improvement blind spots (listed in the report)")
    for i in range(5):
        pr.field(f"p.blind{i + 1}", f"Blind spot {i + 1}", blind[i], filled_by="Counsellor")

    # ---------------------------------------------------------------- Interview Questions
    iq = _Sheet(wb, "Interview Questions", "Counselling Interview — Questions to Ask",
                "Counsellor: record the candidate's response and mark the signal. Questions are tailored to the report when this file is downloaded from the portal.",
                ["Field ID (do not edit)", "", "Question to ask", "CANDIDATE'S RESPONSE", "Signal", "Listen for", "Section"],
                [16, 4, 60, 44, 14, 40, 22])
    current = None
    for q in questions:
        if q["section"] != current:
            current = q["section"]
            iq.section(current)
        r = iq.field(f"q.{q['id']}", q["question"].replace("*", ""), A.get(q["id"], {}).get("response"), example="", long=True)
        sig = A.get(q["id"], {}).get("signal")
        sc = iq.ws.cell(row=r, column=5, value=sig if sig and sig != "Not asked" else None)
        sc.fill = PatternFill("solid", fgColor=INPUT)
        sc.border = BOX
        sc.font = _font(size=10, color="0000FF")
        iq._validation(refs["Signal"], "Confirms / Partly / Contradicts").add(sc)
        iq.ws.cell(row=r, column=6, value=q["listen"]).font = _font(size=9, color="595959")
        iq.ws.cell(row=r, column=6).alignment = Alignment(wrap_text=True, vertical="top")
        iq.ws.cell(row=r, column=7, value=q["section"].split("·")[-1].strip()).font = _font(size=9, color="595959")
    iq.section("Counsellor's summary")
    notes_c = _split_self_notes(I.get("trait_notes", "")).get("i.nuances")
    iq.field("i.nuances", "Expressed nuances (e.g. prefers tech + biology over pure software)", notes_c, filled_by="Counsellor", long=True)
    iq.field("i.observations", "Clinical observations (confidence, decision style, consistency with report)", I.get("observations"), filled_by="Counsellor", long=True)
    iq.field("i.confirmed_direction", "Direction / decisions agreed in the session", I.get("confirmed_direction"), filled_by="Counsellor", long=True)
    for r in range(FIRST_ROW, iq.row):
        if iq.ws.cell(row=r, column=1).value and str(iq.ws.cell(row=r, column=1).value).startswith("i."):
            for col in (6, 7):
                iq.ws.cell(row=r, column=col).value = None
            ex = SAMPLE.get(iq.ws.cell(row=r, column=1).value)
            if ex:
                c = iq.ws.cell(row=r, column=6, value=f"Example: {ex}")
                c.font = _font(size=9, italic=True, color="7F7F7F")
                c.alignment = Alignment(wrap_text=True, vertical="top")

    _start_sheet(start, [cf, pr, iq], P)
    for ws in wb.worksheets:
        ws.sheet_view.showGridLines = ws.title == "Lists"
        ws.page_setup.orientation = "portrait" if ws.title == "Start Here" else "landscape"
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        if ws.title != "Start Here":
            ws.print_title_rows = "4:4"
            ws.column_dimensions["A"].hidden = False
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _start_sheet(ws, sheets, P):
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 16
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 16
    ws.column_dimensions["F"].width = 50
    ws["B2"] = "Personality Researcher"
    ws["B2"].font = _font(size=18, bold=True, color=NAVY)
    ws["B3"] = "Career Guidance Intake Workbook"
    ws["B3"].font = _font(size=12, bold=True, color=GOLD)
    ws["B4"] = "Renuka Patil, Chief Mentor · +91 9845051784 · Bangalore, India"
    ws["B4"].font = _font(size=10, color="595959")
    ws["B5"] = f"Candidate: {P.get('name') or '________________________'}"
    ws["B5"].font = _font(size=11, bold=True)

    steps = [
        "HOW TO USE THIS WORKBOOK",
        "1. Student (and parent for Section F) fills the 'Candidate Form' sheet before the session.",
        "2. Counsellor fills the 'Psychometric Report' sheet from the assessment report (or uploads the PDF in the portal).",
        "3. During the session, counsellor records answers on the 'Interview Questions' sheet and marks each signal.",
        "4. In the portal sidebar, use 'Import Excel workbook' to load everything, then review and export the dossier.",
        "Tip: for questions tailored to the report, enter the scores in the portal first and download the pre-filled workbook from there.",
    ]
    for i, text in enumerate(steps, start=7):
        c = ws.cell(row=i, column=2, value=text)
        c.font = _font(bold=(i == 7), size=10, color=NAVY if i == 7 else "000000")

    ws["B14"] = "COLOUR GUIDE"
    ws["B14"].font = _font(bold=True, color=NAVY)
    legend = [
        (INPUT, "0000FF", "Yellow cell, blue text", "Type or choose your answer here"),
        (EXAMPLE, "7F7F7F", "Grey italic text", "Example of a good answer — do not type here"),
        ("FFFFFF", "808080", "Small grey Field ID", "Used by the portal to import — do not edit"),
    ]
    for i, (fill, color, label, meaning) in enumerate(legend, start=15):
        c = ws.cell(row=i, column=2, value=label)
        c.fill = PatternFill("solid", fgColor=fill)
        c.font = _font(size=10, color=color, italic=(fill == EXAMPLE))
        c.border = BOX
        ws.cell(row=i, column=3, value=meaning).font = _font(size=10)

    ws["B19"] = "COMPLETION TRACKER"
    ws["B19"].font = _font(bold=True, color=NAVY)
    for col, h in zip("BCDE", ["Sheet", "Fields", "Completed", "% done"]):
        c = ws[f"{col}20"]
        c.value = h
        c.font = _font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=NAVY)
        c.border = BOX
    for i, sheet in enumerate(sheets, start=21):
        name, last = sheet.ws.title, sheet.row - 1
        ref = f"'{name}'"
        ws[f"B{i}"] = name
        ws[f"C{i}"] = f'=COUNTIF({ref}!A{FIRST_ROW}:A{last},"?*")'
        ws[f"D{i}"] = f'=SUMPRODUCT(({ref}!A{FIRST_ROW}:A{last}<>"")*({ref}!D{FIRST_ROW}:D{last}<>""))'
        ws[f"E{i}"] = f'=IF(C{i}=0,0,D{i}/C{i})'
        ws[f"E{i}"].number_format = "0%"
        for col in "BCDE":
            ws[f"{col}{i}"].border = BOX
            ws[f"{col}{i}"].font = _font(size=10)
    ws["B25"] = "Note: Section B and D/E/F rows count as complete only when an option is chosen; leave non-applicable rows blank."
    ws["B25"].font = _font(size=9, italic=True, color="595959")
    ws["B26"] = "Salary bands and exam details in the final dossier are indicative and verified by the counsellor."
    ws["B26"].font = _font(size=9, italic=True, color="595959")


def _split_self_notes(text):
    """Recover the labelled parts of trait_notes written by ``read_workbook``."""
    out = {}
    labels = {v: k for k, v in SELF_FIELDS.items()}
    labels["Counsellor notes"] = "i.nuances"
    rest = []
    for line in (text or "").splitlines():
        m = re.match(r"^([^:]{3,40}):\s*(.*)$", line)
        if m and m.group(1) in labels:
            out[labels[m.group(1)]] = m.group(2)
        elif line.strip():
            rest.append(line)
    if rest and "i.nuances" not in out:
        out["i.nuances"] = " ".join(rest)
    return out


def read_workbook(data):
    """Parse an intake workbook. Returns (profile_updates, interview_updates, answers, n_fields)."""
    wb = load_workbook(io.BytesIO(data), data_only=True)
    values, signals = {}, {}
    for ws in wb.worksheets:
        if ws.title in ("Lists", "Start Here"):
            continue
        for row in ws.iter_rows(min_row=FIRST_ROW, max_col=5, values_only=True):
            fid = row[0]
            if not isinstance(fid, str) or not re.match(r"^(p|i|q|self)\.", fid):
                continue
            val = row[3]
            if isinstance(val, str):
                val = val.strip()
            if val not in (None, ""):
                # Interview-sheet answers override the same question on the candidate form.
                values[fid] = val if fid not in values or ws.title == "Interview Questions" else values[fid]
            if fid.startswith("q.") and ws.title == "Interview Questions" and row[4] in SIGNALS:
                signals[fid] = row[4]

    prof, intv, answers = {}, {}, {}
    for f in ("name", "phone", "email", "age", "report_date"):
        if f"p.{f}" in values:
            prof[f] = str(values[f"p.{f}"])
    careers = [str(values.get(f"p.career{i}", "")) for i in (1, 2, 3)]
    if any(careers):
        prof["careers"] = careers
    apt = {}
    for key in APTITUDES:
        v = values.get(f"p.apt.{key}")
        try:
            apt[key] = max(1, min(10, int(round(float(v)))))
        except (TypeError, ValueError):
            pass
    if apt:
        prof["aptitudes"] = apt
    mots = [str(values[f"p.mot{i}"]) for i in range(1, 6) if f"p.mot{i}" in values]
    if mots:
        prof["motivators"] = list(dict.fromkeys(mots))
    code = "".join(ch for ch in str(values.get("p.riasec_code", "")).upper() if ch in RIASEC)[:3]
    theme = {}
    for letter in RIASEC_ORDER:
        try:
            theme[letter] = max(1, min(10, int(round(float(values[f"p.riasec.{letter}"])))))
        except (KeyError, TypeError, ValueError):
            pass
    if code:
        prof["riasec_code"] = code
    if theme:
        base = riasec_from_code(code) if code else {l: 4 for l in RIASEC}
        base.update(theme)
        prof["riasec"], prof["riasec_scored"] = base, True
    elif code:
        prof["riasec"], prof["riasec_scored"] = riasec_from_code(code), False
    if "p.archetype" in values:
        prof["archetype"] = str(values["p.archetype"])
    traits = [str(values[f"p.trait{i}"]) for i in range(1, 5) if f"p.trait{i}" in values]
    if traits:
        prof["traits"] = traits
    for key, prefix in (("plus_points", "p.plus"), ("blind_spots", "p.blind")):
        items = [str(values[f"{prefix}{i}"]) for i in range(1, 6) if f"{prefix}{i}" in values]
        if items:
            prof[key] = items

    for f in ("stage", "stream", "marks", "ug_major", "current_role", "experience", "budget",
              "parent_notes", "constraints", "observations", "confirmed_direction"):
        if f"i.{f}" in values:
            intv[f] = str(values[f"i.{f}"])
    if intv.get("stage") not in LIFE_STAGES:
        intv.pop("stage", None)
    if intv.get("budget") not in BUDGETS:
        intv.pop("budget", None)
    likes = [t for t in FIELD_TAGS if values.get(f"i.field::{t}") == "Enjoy"]
    dislikes = [t for t in FIELD_TAGS if values.get(f"i.field::{t}") == "Dislike"]
    if likes or dislikes:
        intv["likes"], intv["dislikes"] = likes, dislikes
    for key, prefix, opts in (("geography", "i.geo::", GEOGRAPHY), ("aspirations", "i.asp::", ASPIRATIONS),
                              ("parent_aspirations", "i.pasp::", ASPIRATIONS)):
        chosen = [o for o in opts if str(values.get(prefix + o, "")).lower() == "yes"]
        if chosen:
            intv[key] = chosen
    note_lines = [f"{label}: {values[fid]}" for fid, label in SELF_FIELDS.items() if fid in values]
    if "i.nuances" in values:
        note_lines.append(f"Counsellor notes: {values['i.nuances']}")
    if note_lines:
        intv["trait_notes"] = "\n".join(note_lines)

    for fid, val in values.items():
        if fid.startswith("q."):
            answers[fid[2:]] = {"response": str(val), "signal": signals.get(fid, "Not asked")}
    for fid, sig in signals.items():
        answers.setdefault(fid[2:], {"response": "", "signal": sig})
    return prof, intv, answers, len(values)
