"""Project-specific data-collection workbooks and communication packs.

Both are generated FROM the project state (config, CTQs, data requests and the
selected department pack), so each engagement gets its own templates and no
other client's content is carried in. Unknown values render as "[TBC: field]".
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from .project import CONFIG_DIR
from .style import BODY, BOX, FILL_HEAD, HEAD, SUB, WRAP, body_rows, header_row, title_block

TEMPLATE_DIR = Path(__file__).resolve().parents[2] / "templates" / "communication"


def load_pack(pack_id: str) -> dict:
    return json.loads((CONFIG_DIR / "department_packs" / f"{pack_id}.json").read_text())


def _cfg(state, key):
    v = state["config"].get(key)
    return v if v not in (None, "") else f"[TBC: {key}]"


# --------------------------------------------------------------------------- data collection

PLAN_COLS = ["Question", "Required field", "Operational definition", "Source", "Collection method",
             "Sampling / precision rationale", "Owner", "Frequency", "Validation", "Completion evidence", "Status"]
OPDEF_COLS = ["ID", "Metric", "Definition", "Unit", "Numerator", "Denominator", "Population / exclusions",
              "Start event", "Stop event", "Direction", "Source", "Owner", "Baseline", "Approved requirement",
              "Target", "Target status"]


def build_data_collection_workbook(state: dict, out_path) -> Path:
    pack = load_pack(state["config"].get("department_pack") or "generic")
    pid = state["config"]["project_id"]
    wb = Workbook()

    # 1 README
    ws = wb.active
    ws.title = "README"
    title_block(ws, f"Data collection pack - {pid}", f"{_cfg(state, 'client')} | {_cfg(state, 'department')} | {_cfg(state, 'process')}")
    notes = [
        ("Purpose", "Collect the minimum data needed to answer the open project questions in 'Collection_Plan'."),
        ("Observation unit", pack["observation_unit_default"] + " - confirm before collection starts."),
        ("Blanks", "Leave a cell BLANK when a value is unknown. Never type 0 for unknown. Use the Notes column to explain."),
        ("Personal data", "Do not enter names, e-mails, phone numbers or national IDs. Use the pseudonymised reference agreed with the data owner."),
        ("Sensitivity", pack["sensitivity_notes"]),
        ("Sample size", "Set from the precision needed for the decision (see plan). There is no universal minimum."),
        ("Required columns", "Headers marked * and shaded peach are required."),
        ("Return to", "[TBC: project lead] by [TBC: date]. Do not e-mail raw files outside approved channels."),
        ("Document control", "Owner: [TBC] | Approver: [TBC] | Version 0.1 | Draft - pending approval"),
    ]
    for i, (k, v) in enumerate(notes, 5):
        ws.cell(row=i, column=1, value=k).font = HEAD
        c = ws.cell(row=i, column=2, value=v)
        c.font, c.alignment = BODY, WRAP
    ws.column_dimensions["A"].width, ws.column_dimensions["B"].width = 20, 100

    # 2 Collection plan
    ws = wb.create_sheet("Collection_Plan")
    title_block(ws, "Data collection plan", "One row per open question. Owner and completion evidence are mandatory.")
    header_row(ws, 5, PLAN_COLS, required={"Question", "Required field", "Operational definition", "Owner"})
    rows = [[r.get("question"), r.get("required_field"), r.get("operational_definition"), r.get("source"),
             r.get("collection_method"), r.get("sampling_rationale"), r.get("owner"), r.get("frequency"),
             r.get("validation"), r.get("completion_evidence"), r.get("status", "Open")]
            for r in state["registers"]["data_requests"]]
    body_rows(ws, 6, rows or [[None] * len(PLAN_COLS)] * 5, len(PLAN_COLS))
    dv = DataValidation(type="list", formula1='"Open,In progress,Complete,Blocked"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"K6:K{6 + max(len(rows), 5) + 50}")

    # 3 Operational definitions
    ws = wb.create_sheet("Operational_Definitions")
    title_block(ws, "Operational definitions", "Agreed definitions from the project CTQs, then the department metric library (proposed).")
    header_row(ws, 5, OPDEF_COLS)
    rows = [[c["id"], c.get("metric"), c.get("definition"), c.get("unit"), c.get("numerator"), c.get("denominator"),
             c.get("population"), c.get("start_event"), c.get("stop_event"), c.get("direction"), c.get("source"),
             c.get("owner"), c.get("baseline"), c.get("approved_requirement"), c.get("target"), c.get("target_status")]
            for c in state["registers"]["ctqs"]]
    rows += [[f"LIB-{m['metric_id']}", m["name"], m["definition"], m["unit"], m["numerator"], m["denominator"],
              None, m.get("start_event"), m.get("stop_event"), m["direction_of_improvement"], None, None,
              "Not assessed", None, None, "Library suggestion - not adopted"] for m in pack["metric_library"]]
    body_rows(ws, 6, rows, len(OPDEF_COLS))

    # 4 Collection log
    ws = wb.create_sheet("Collection_Log")
    fields = [f for f in pack["core_fields"] + pack["standard_fields"] if not f.get("pii")]
    heads = [f["field"] for f in fields] + ["collected_by_role", "collected_on", "notes"]
    title_block(ws, "Collection log", "Dates as YYYY-MM-DD HH:MM in the agreed time zone: " + _cfg(state, "time_zone"))
    header_row(ws, 5, heads, required={f["field"] for f in fields if f.get("required")})
    for i, f in enumerate(fields, 1):
        col = ws.cell(row=5, column=i).column_letter
        ws.cell(row=4, column=i, value=f["description"]).font = SUB
        if f.get("allowed_values"):
            dv = DataValidation(type="list", formula1='"' + ",".join(f["allowed_values"]) + '"', allow_blank=True)
        elif f["type"] == "boolean":
            dv = DataValidation(type="list", formula1='"1,0"', allow_blank=True)
        elif f["type"] == "number":
            dv = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="-1E+12", allow_blank=True)
        elif f["type"] == "datetime":
            dv = DataValidation(type="date", operator="greaterThan", formula1="36526", allow_blank=True)
            for r in range(6, 1006):
                ws.cell(row=r, column=i).number_format = "yyyy-mm-dd hh:mm"
        else:
            continue
        dv.error, dv.errorTitle = f"Invalid value for {f['field']}", "Validation"
        ws.add_data_validation(dv)
        dv.add(f"{col}6:{col}1005")

    # 5 Measurement check
    ws = wb.create_sheet("Measurement_Check")
    title_block(ws, "Measurement system check", "Part A: timestamp / system reconciliation. Part B: attribute agreement (for coded fields).")
    header_row(ws, 5, ["record_id", "field", "system_value", "source_document_value", "match (1/0)", "verifier_role", "verified_on", "notes"])
    ws.cell(row=40, column=1, value="Part B - Attribute agreement").font = HEAD
    hb = ["item_id", "reference_standard", "appraiser_A_trial1", "appraiser_A_trial2", "appraiser_B_trial1", "appraiser_B_trial2",
          "appraiser_C_trial1", "appraiser_C_trial2", "notes"]
    for i, h in enumerate(hb, 1):
        c = ws.cell(row=41, column=i, value=h)
        c.font, c.fill, c.border = HEAD, FILL_HEAD, BOX

    # 6 Gemba observation
    ws = wb.create_sheet("Gemba_Observation")
    title_block(ws, "Gemba / process observation", "Observe the process, not the person. No names.")
    header_row(ws, 5, ["date", "start_time", "location", "process_step", "activity_observed", "value_type (VA/NVA/BVA)",
                       "waiting_observed_min", "rework_observed (1/0)", "handoff_to", "observer_role", "notes"])
    dv = DataValidation(type="list", formula1='"VA,NVA,BVA"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add("F6:F500")

    # 7 Stakeholder input
    ws = wb.create_sheet("Stakeholder_Input")
    title_block(ws, "Stakeholder input capture", "Every entry is a Stakeholder opinion until validated with data.")
    header_row(ws, 5, ["input_id", "contributor_role", "group (process owner / frontline / customer / upstream / downstream / system / control)",
                       "issue_observed", "possible_cause (hypothesis)", "evidence_that_would_confirm", "method (silent ideation / interview / survey / workshop)",
                       "date", "label"])
    for r in range(6, 206):
        ws.cell(row=r, column=9, value=None)
    dv = DataValidation(type="list", formula1='"Stakeholder opinion,Hypothesis,Unresolved question"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add("I6:I500")

    # 8 Pilot tracking
    ws = wb.create_sheet("Pilot_Tracking")
    title_block(ws, "Pilot tracking", "Record pilot and comparison units with the same definitions as baseline.")
    header_row(ws, 5, ["date", "unit_id", "arm (pilot / comparison)", "primary_measure", "secondary_measure", "balancing_measure",
                       "guardrail_ok (1/0)", "stop_rule_triggered (1/0)", "deviation_from_protocol", "recorded_by_role"])

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
    return out_path


# --------------------------------------------------------------------------- communications

def comm_context(state: dict) -> dict:
    cfg = state["config"]
    ctqs = state["registers"]["ctqs"]
    ctx = {k: v for k, v in cfg.items() if v not in (None, "")}
    ctx["sender"] = cfg.get("project_lead")
    ctx["ctq_list"] = "\n".join(f"- {c['metric']} ({c['unit']}): {c['definition']} - target status: {c.get('target_status')}"
                                for c in ctqs) or None
    ctx["open_questions"] = "\n".join(f"- {q['id']}: {q['question']} (owner: {q['owner']})"
                                      for q in state["registers"]["questions"] if q.get("status", "Open") != "Closed") or None
    ctx["open_approvals"] = "\n".join(f"- {a['id']}: {a['item']} - {a['approver_role']} - {a.get('status')}"
                                      for a in state["registers"]["approvals"] if a.get("status") != "Approved") or None
    ctx["data_requests"] = "\n".join(f"- {d['required_field']}: {d['question']}" for d in state["registers"]["data_requests"]) or None
    return ctx


def render(text: str, ctx: dict) -> str:
    return re.sub(r"\{\{\s*([a-z_]+)\s*\}\}", lambda m: str(ctx.get(m.group(1)) or f"[TBC: {m.group(1)}]"), text)


def build_communication_pack(state: dict, out_dir) -> list[Path]:
    """Render every template to Markdown and compile one editable .docx."""
    from docx import Document
    from docx.shared import Pt, RGBColor

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ctx = comm_context(state)
    paths = []
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name, st.font.size = "Calibri", Pt(10.5)
    st.font.color.rgb = RGBColor(0x2B, 0x2B, 0x2B)
    doc.add_heading(f"Communication pack - {state['config']['project_id']}", 0)
    doc.add_paragraph("Draft - pending approval. Do not send any message until the named approver has signed off.")
    for tpl in sorted(TEMPLATE_DIR.glob("*.md")):
        text = render(tpl.read_text(encoding="utf-8"), ctx)
        p = out_dir / tpl.name
        p.write_text(text, encoding="utf-8")
        paths.append(p)
        doc.add_page_break()
        for line in text.splitlines():
            if line.startswith("# "):
                doc.add_heading(line[2:], 1)
            elif line.startswith("## "):
                doc.add_heading(line[3:], 2)
            elif line.startswith("- "):
                doc.add_paragraph(line[2:], style="List Bullet")
            elif line.startswith("|"):
                doc.add_paragraph(line).runs[0].font.size = Pt(9)
            elif line.strip():
                doc.add_paragraph(line.replace("**", ""))
    docx_path = out_dir / f"{state['config']['project_id']}_communication_pack.docx"
    doc.save(docx_path)
    return paths + [docx_path]
