"""Project lifecycle, registers, access control and portable state.

Every function takes an explicit project directory. There is no module-level
state, so one client's data, targets or conclusions cannot leak into another
project through the engine.
"""
from __future__ import annotations

import copy
import datetime as _dt
import json
import os
import re
import shutil
import zipfile
from pathlib import Path

ENGINE_VERSION = "0.1.0"
CONFIG_DIR = Path(__file__).resolve().parents[2] / "config"

EVIDENCE_LABELS = [
    "Verified fact", "Calculated result", "Stakeholder opinion", "Hypothesis",
    "Assumption", "Proposed target", "Approved decision", "Unresolved question",
]
CAUSE_STATUS = ["Hypothesized", "Supported", "Validated for stated context", "Rejected", "Unresolved"]
BENEFIT_STAGE = ["Forecast", "Pilot estimate", "Realized benefit", "Annualized projection"]
BENEFIT_TYPE = ["Hard savings", "Cost avoidance", "Released capacity", "Revenue opportunity", "Intangible benefit"]
DMAIC = ["Define", "Measure", "Analyze", "Improve", "Control"]
MODES = ["BUILD TEMPLATE", "RUN PROJECT", "REFRESH PROJECT"]
DEPARTMENTS = [
    "Talent Acquisition", "HR Operations", "Learning & Development", "Finance", "Procurement",
    "Supply Chain", "Manufacturing", "Sales", "Marketing", "Customer Service", "IT",
    "Healthcare Operations", "Other",
]

# Register name -> (id prefix, required fields)
REGISTERS = {
    "assumptions":        ("ASM", ["statement", "label", "owner"]),
    "questions":          ("Q",   ["question", "priority", "owner"]),
    "risks":              ("RSK", ["description", "severity", "owner"]),
    "decisions":          ("DEC", ["decision", "decided_by"]),
    "approvals":          ("APR", ["item", "approver_role"]),
    "artifacts":          ("ART", ["title", "version"]),
    "ctqs":               ("CTQ", ["metric", "definition", "unit", "direction"]),
    "stakeholder_inputs": ("SI",  ["contributor_role", "input", "method"]),
    "causes":             ("C",   ["issue", "hypothesized_cause", "evidence_required"]),
    "findings":           ("F",   ["finding", "evidence", "analysis_run_id"]),
    "improvements":       ("IMP", ["change", "ctq_id", "expected_mechanism"]),
    "pilots":             ("PIL", ["owner", "population", "intervention"]),
    "actions":            ("ACT", ["action", "owner", "due"]),
    "benefits":           ("BEN", ["description", "stage", "type", "formula"]),
    "controls":           ("CTL", ["ctq_id", "owner", "trigger", "response"]),
    "data_requests":      ("DR",  ["question", "required_field", "operational_definition", "owner"]),
}

ROLE_PERMISSIONS = {
    "sponsor":       {"read", "approve"},
    "process_owner": {"read", "edit", "approve"},
    "project_lead":  {"read", "edit", "upload", "analyze", "export", "promote"},
    "analyst":       {"read", "edit", "upload", "analyze"},
    "viewer":        {"read"},
}


class AccessDenied(PermissionError):
    pass


class IsolationError(RuntimeError):
    pass


def now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


def _safe_id(project_id: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{1,63}", project_id or ""):
        raise ValueError("project_id must be 2-64 chars: letters, digits, '-' or '_'")
    return project_id


def blank_state(project_id: str, **config) -> dict:
    """A brand-new project state. Built from defaults only - never from another project."""
    cfg = {
        "project_id": project_id,
        "mode": config.get("mode", "RUN PROJECT"),
        "client": config.get("client"),
        "industry": config.get("industry"),
        "department": config.get("department"),
        "department_pack": config.get("department_pack", "generic"),
        "process": config.get("process"),
        "dmaic_stage": config.get("dmaic_stage", "Define"),
        "problem_statement": None,
        "goal_statement": None,
        "scope": None,
        "exclusions": None,
        "constraints": None,
        "platform": config.get("platform"),
        "currency": config.get("currency"),
        "calendar_rule": config.get("calendar_rule"),  # e.g. "calendar days" / "business days Mon-Fri"
        "time_zone": config.get("time_zone"),
        "sponsor": config.get("sponsor"),
        "process_owner": config.get("process_owner"),
        "project_lead": config.get("project_lead"),
        "deadline": config.get("deadline"),
    }
    return {
        "schema_version": 1,
        "engine_version": ENGINE_VERSION,
        "created_at": now(),
        "document_control": {
            "title": f"Six Sigma project workspace - {project_id}",
            "owner": config.get("owner"), "approver": None, "version": "0.1",
            "status": "Draft - pending approval", "effective_date": None, "review_cadence": None,
        },
        "config": cfg,
        "roles": config.get("roles", {}),  # user -> role
        "registers": {name: [] for name in REGISTERS},
        "uploads": [],
        "mappings": {},
        "analysis_runs": [],
        "versions": [],
        "approved_version": None,
        "gates": {stage: {"status": "Not started", "approved_by": None, "approved_at": None} for stage in DMAIC},
        "change_log": [],
    }


# --------------------------------------------------------------------------- lifecycle

def create_project(base_dir, project_id: str, actor: str = "project_lead", **config) -> Path:
    project_id = _safe_id(project_id)
    pdir = Path(base_dir) / project_id
    if pdir.exists():
        raise IsolationError(f"Project '{project_id}' already exists; refusing to overwrite or merge.")
    for sub in ("raw", "standardized", "versions", "outputs", "exports"):
        (pdir / sub).mkdir(parents=True)
    roles = config.pop("roles", None) or {actor: "project_lead"}
    state = blank_state(project_id, roles=roles, **config)
    log(state, actor, "create_project", f"Project created in mode {state['config']['mode']}")
    save_state(pdir, state)
    return pdir


def load_state(pdir) -> dict:
    with open(Path(pdir) / "project.json", encoding="utf-8") as fh:
        state = json.load(fh)
    if state["config"]["project_id"] != Path(pdir).name:
        raise IsolationError("project.json does not belong to this folder")
    return state


def save_state(pdir, state: dict) -> None:
    if state["config"]["project_id"] != Path(pdir).name:
        raise IsolationError("Refusing to save a state into another project's folder")
    tmp = Path(pdir) / "project.json.tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, default=str)
    os.replace(tmp, Path(pdir) / "project.json")


def log(state: dict, actor: str, action: str, detail: str) -> None:
    state["change_log"].append({"at": now(), "actor": actor, "action": action, "detail": detail})


# --------------------------------------------------------------------------- access

def require(state: dict, user: str, permission: str) -> None:
    """Prototype role check. Real enforcement must come from the hosting platform."""
    role = state.get("roles", {}).get(user)
    if role is None:
        raise AccessDenied(f"'{user}' has no role on project {state['config']['project_id']}")
    if permission not in ROLE_PERMISSIONS.get(role, set()):
        raise AccessDenied(f"Role '{role}' lacks '{permission}'")


# --------------------------------------------------------------------------- registers

def next_id(state: dict, register: str) -> str:
    prefix = REGISTERS[register][0]
    existing = [r["id"] for r in state["registers"][register]]
    n = 1 + max([int(i.split("-")[-1]) for i in existing] or [0])
    return f"{prefix}-{n:03d}"


def add_record(state: dict, register: str, actor: str = "system", **fields) -> dict:
    if register not in REGISTERS:
        raise KeyError(f"Unknown register '{register}'")
    missing = [f for f in REGISTERS[register][1] if fields.get(f) in (None, "")]
    if missing:
        raise ValueError(f"{register}: missing required field(s) {missing}")
    if "label" in fields and fields["label"] not in EVIDENCE_LABELS:
        raise ValueError(f"label must be one of {EVIDENCE_LABELS}")
    if register == "causes":
        fields.setdefault("status", "Hypothesized")
        if fields["status"] not in CAUSE_STATUS:
            raise ValueError(f"cause status must be one of {CAUSE_STATUS}")
        if re.fullmatch(r"\s*human error\s*\.?", str(fields["hypothesized_cause"]), re.I):
            raise ValueError("'Human error' is not a sufficient cause - state the system condition that allows it")
    if register == "benefits":
        if fields["stage"] not in BENEFIT_STAGE or fields["type"] not in BENEFIT_TYPE:
            raise ValueError("benefit stage/type not recognised")
        fields.setdefault("finance_approval", "Pending")
    if register == "ctqs":
        fields.setdefault("target_status", "Not set")
        fields.setdefault("baseline", "Not assessed")
    if register == "approvals":
        fields.setdefault("status", "Pending")
    rec = {"id": next_id(state, register), "created_at": now(), "created_by": actor, **fields}
    state["registers"][register].append(rec)
    log(state, actor, f"add:{register}", rec["id"])
    return rec


def update_record(state: dict, register: str, rec_id: str, actor: str, **changes) -> dict:
    rec = get_record(state, register, rec_id)
    before = copy.deepcopy(rec)
    rec.update(changes)
    rec["updated_at"] = now()
    log(state, actor, f"update:{register}", f"{rec_id}: " + json.dumps(
        {k: [before.get(k), v] for k, v in changes.items()}, default=str))
    return rec


def get_record(state: dict, register: str, rec_id: str) -> dict:
    for r in state["registers"][register]:
        if r["id"] == rec_id:
            return r
    raise KeyError(rec_id)


def edit_ctq(state: dict, ctq_id: str, actor: str, **changes) -> dict:
    """Edit a CTQ and return everything that depends on it (impact preview).

    Dependent analysis runs, findings, controls, improvements and approvals are
    flagged 'Requires recalculation / revalidation' rather than silently kept.
    """
    update_record(state, "ctqs", ctq_id, actor, **changes)
    impact = {"analysis_runs": [], "findings": [], "controls": [], "improvements": [], "approvals": []}
    run_ids = set()
    for run in state["analysis_runs"]:
        if ctq_id in run.get("ctq_ids", []):
            run["status"] = "Requires recalculation"
            impact["analysis_runs"].append(run["run_id"])
            run_ids.add(run["run_id"])
    for f in state["registers"]["findings"]:
        if f.get("analysis_run_id") in run_ids or f.get("ctq_id") == ctq_id:
            f["status"] = "Requires review"
            impact["findings"].append(f["id"])
    for reg in ("controls", "improvements"):
        for r in state["registers"][reg]:
            if r.get("ctq_id") == ctq_id:
                r["status"] = "Requires review"
                impact[reg].append(r["id"])
    linked = set(impact["findings"]) | {ctq_id}
    for a in state["registers"]["approvals"]:
        if a.get("linked_id") in linked and a.get("status") == "Approved":
            a["status"] = "Requires revalidation"
            impact["approvals"].append(a["id"])
    log(state, actor, "ctq_impact", json.dumps(impact))
    return impact


# --------------------------------------------------------------------------- portable state

def export_state(pdir, user: str, dest=None, include_raw: bool = True) -> Path:
    state = load_state(pdir)
    require(state, user, "export")
    pdir = Path(pdir)
    dest = Path(dest or pdir / "exports" / f"{pdir.name}_state_{_dt.datetime.now():%Y%m%d_%H%M%S}.zip")
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for path in pdir.rglob("*"):
            rel = path.relative_to(pdir)
            if path.is_dir() or rel.parts[0] == "exports":
                continue
            if rel.parts[0] == "raw" and not include_raw:
                continue
            z.write(path, Path(pdir.name) / rel)
    log(state, user, "export_state", str(dest.name))
    save_state(pdir, state)
    return dest


def import_state(zip_path, base_dir) -> Path:
    """Reload a portable state into its own folder. Never merges into an existing project."""
    with zipfile.ZipFile(zip_path) as z:
        roots = {Path(n).parts[0] for n in z.namelist()}
        if len(roots) != 1:
            raise IsolationError("Export must contain exactly one project")
        pid = _safe_id(roots.pop())
        target = Path(base_dir) / pid
        if target.exists():
            raise IsolationError(f"Project '{pid}' already exists at destination; import refused")
        for n in z.namelist():
            if ".." in Path(n).parts or Path(n).is_absolute():
                raise IsolationError("Unsafe path in archive")
        z.extractall(base_dir)
    load_state(target)  # validates folder/project match
    return target


def delete_project(pdir) -> None:
    for p in Path(pdir).rglob("*"):
        if p.is_file():
            os.chmod(p, 0o644)
    shutil.rmtree(pdir)
