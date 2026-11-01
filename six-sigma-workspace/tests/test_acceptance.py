"""Build acceptance tests (Part 4G) plus statistical safeguards.

    python -m pytest -q tests
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
sys.path.insert(0, str(ROOT / "demo"))

from sixsigma import analysis as A  # noqa: E402
from sixsigma import intake, project as P, templates, versions  # noqa: E402

FIELDS = [{"field": "record_id", "type": "id", "required": True}, {"field": "segment", "type": "category"},
          {"field": "start_ts", "type": "datetime", "required": True}, {"field": "end_ts", "type": "datetime"},
          {"field": "amount", "type": "number"}, {"field": "status", "type": "category", "allowed_values": ["Open", "Closed"]}]


@pytest.fixture
def base(tmp_path):
    return tmp_path


def _csv(path, rows):
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def _project(base, pid, **kw):
    return P.create_project(base, pid, actor="lead", roles={"lead": "project_lead", "ana": "analyst", "view": "viewer"}, **kw)


# 1 ----------------------------------------------------------------------------
def test_new_project_does_not_inherit_other_client(base):
    a = _project(base, "CLIENT-A", client="Alpha", department="Finance", department_pack="finance")
    s = P.load_state(a)
    P.add_record(s, "ctqs", "lead", metric="IPT", definition="d", unit="days", direction="lower", target="10", target_status="Approved")
    P.add_record(s, "assumptions", "lead", statement="Alpha-only assumption", label="Assumption", owner="x")
    P.save_state(a, s)
    f = _csv(base / "a.csv", [{"id": 1, "start": "2026-01-01"}])
    intake.register_upload(a, f, "lead")
    b = _project(base, "CLIENT-B", client="Beta", department="IT", department_pack="it")
    sb = P.load_state(b)
    assert all(len(v) == 0 for v in sb["registers"].values())
    assert sb["uploads"] == [] and sb["versions"] == [] and sb["config"]["client"] == "Beta"
    assert "Alpha" not in (b / "project.json").read_text()
    assert list((b / "raw").iterdir()) == []
    with pytest.raises(P.IsolationError):
        _project(base, "CLIENT-A")


# 2 ----------------------------------------------------------------------------
def test_valid_and_invalid_uploads(base):
    p = _project(base, "P2")
    bad = base / "x.pdf"
    bad.write_text("not a table")
    with pytest.raises(ValueError):
        intake.register_upload(p, bad, "lead")
    f = _csv(base / "d.csv", [{"ID": 1, "Start": "2026-01-01", "Amt": "12", "St": "Open"},
                              {"ID": 2, "Start": "not a date", "Amt": "abc", "St": "Archived"}])
    up = intake.register_upload(p, f, "lead")
    raw = intake.read_table(p / "raw" / up["file"])["csv"]
    std, issues = intake.apply_mapping(raw, {"record_id": "ID", "start_ts": "Start", "amount": "Amt", "status": "St"}, FIELDS)
    assert len(std) == 2, "rows with bad values must be kept, not dropped"
    kinds = {(i["field"], i["issue"].split(" ")[0]) for i in issues}
    assert ("start_ts", "unparseable") in kinds and ("amount", "unparseable") in kinds
    assert any(i["field"] == "status" and "allowed" in i["issue"] for i in issues)
    raw_file = p / "raw" / up["file"]
    assert not os.access(raw_file, os.W_OK) or os.geteuid() == 0
    assert oct(raw_file.stat().st_mode)[-3:] == "444", "raw upload must be read-only"


# 3 ----------------------------------------------------------------------------
def test_duplicate_upload_and_schema_change(base):
    p = _project(base, "P3")
    f = _csv(base / "d.csv", [{"ID": 1, "Start": "2026-01-01"}])
    first = intake.register_upload(p, f, "lead")
    copy = base / "renamed_copy.csv"
    shutil.copy(f, copy)
    second = intake.register_upload(p, copy, "lead")
    assert second["duplicate"] and second["upload_id"] == first["upload_id"]
    assert len(list((p / "raw").iterdir())) == 1
    chk = intake.schema_check(["ID", "Begin"], ["ID", "Start"])
    assert not chk["compatible"] and chk["missing_columns"] == ["Start"] and chk["new_columns"] == ["Begin"]


# 4 ----------------------------------------------------------------------------
def test_missing_is_not_zero():
    df = pd.DataFrame({"record_id": [1, 2, 3, 4], "amount": [10, None, "", 30]})
    std, _ = intake.apply_mapping(df, {"record_id": "record_id", "amount": "amount"}, FIELDS)
    assert std["amount"].isna().sum() == 2 and (std["amount"] == 0).sum() == 0
    d = A.describe(std["amount"])
    assert d["n"] == 2 and d["n_missing"] == 2 and d["median"] == 20.0
    prof = intake.quality_profile(std)
    assert prof["missing"]["amount"]["n"] == 2


# 5 ----------------------------------------------------------------------------
def test_edit_ctq_identifies_affected_outputs(base):
    p = _project(base, "P5")
    s = P.load_state(p)
    ctq = P.add_record(s, "ctqs", "lead", metric="Cycle", definition="start to end", unit="days", direction="lower")
    plan = {k: "x" for k in A.PLAN_FIELDS}
    run = A.record_run(s, plan, {"r": 1}, "UP-001", [ctq["id"]], "ana")
    f = P.add_record(s, "findings", "ana", finding="f", evidence="e", analysis_run_id=run["run_id"])
    ctl = P.add_record(s, "controls", "lead", ctq_id=ctq["id"], owner="o", trigger="t", response="r")
    apr = P.add_record(s, "approvals", "lead", item="CTQ def", approver_role="Sponsor", linked_id=ctq["id"])
    P.update_record(s, "approvals", apr["id"], "lead", status="Approved")
    impact = P.edit_ctq(s, ctq["id"], "lead", definition="start to end, business days")
    assert run["run_id"] in impact["analysis_runs"] and f["id"] in impact["findings"]
    assert ctl["id"] in impact["controls"] and apr["id"] in impact["approvals"]
    assert P.get_record(s, "approvals", apr["id"])["status"] == "Requires revalidation"
    assert s["analysis_runs"][0]["status"] == "Requires recalculation"


# 6 ----------------------------------------------------------------------------
def test_filters_keep_denominators_consistent():
    rng = np.random.default_rng(1)
    df = pd.DataFrame({"seg": rng.choice(["A", "B", "C"], 300), "offered": rng.random(300) < 0.7})
    df["accepted"] = df["offered"] & (rng.random(300) < 0.8)
    total = A.filtered_rate(df, df["accepted"], df["offered"])
    parts = [A.filtered_rate(df, df["accepted"], df["offered"], {"seg": g}) for g in "ABC"]
    assert sum(p["numerator"] for p in parts) == total["numerator"]
    assert sum(p["denominator"] for p in parts) == total["denominator"]
    for prt in parts:
        assert prt["numerator"] <= prt["denominator"]
        assert prt["excluded_by_filter"] + prt["denominator"] == total["denominator"]


# 7 ----------------------------------------------------------------------------
def test_refresh_retains_versions_and_flags_changes(base):
    p = _project(base, "P7")
    k = lambda v, n: {"kpi_id": "K1", "name": "m", "definition": "d", "unit": "days", "current": v, "n": n}  # noqa: E731
    v1 = versions.create_version(p, {"kpis": [k(20.0, 100)], "findings": [{"id": "F-001", "kpi_ids": ["K1"]}]}, "ana")
    h1 = hashlib.sha256((p / "versions" / v1 / "results.json").read_bytes()).hexdigest()
    with pytest.raises(ValueError):
        versions.promote(p, v1, "lead", approver_name="")
    with pytest.raises(P.AccessDenied):
        versions.promote(p, v1, "ana", approver_name="Someone")
    versions.promote(p, v1, "lead", approver_name="Sponsor X")
    s = P.load_state(p)
    P.add_record(s, "approvals", "lead", item="Results", approver_role="Sponsor", linked_id=v1)
    P.update_record(s, "approvals", "APR-001", "lead", status="Approved")
    P.save_state(p, s)
    h1 = hashlib.sha256((p / "versions" / v1 / "results.json").read_bytes()).hexdigest()
    v2 = versions.create_version(p, {"kpis": [k(24.0, 120)], "findings": [{"id": "F-001", "kpi_ids": ["K1"]}]}, "ana")
    assert hashlib.sha256((p / "versions" / v1 / "results.json").read_bytes()).hexdigest() == h1
    s = P.load_state(p)
    assert s["approved_version"] == v1, "a refresh must not replace approved results automatically"
    cmp = versions.compare_versions(versions.load_version(p, v1), versions.load_version(p, v2))
    assert cmp["material_kpis"] == ["K1"] and cmp["findings_requiring_review"] == ["F-001"]
    assert versions.flag_revalidation(p, cmp, "lead") == ["APR-001"]
    versions.promote(p, v2, "lead", approver_name="Sponsor X")
    versions.rollback(p, v1, "lead", reason="test")
    assert P.load_state(p)["approved_version"] == v1


# 8 ----------------------------------------------------------------------------
def test_access_boundaries(base):
    a = _project(base, "PA")
    b = P.create_project(base, "PB", actor="other", roles={"other": "project_lead"})
    f = _csv(base / "d.csv", [{"ID": 1}])
    with pytest.raises(P.AccessDenied):
        intake.register_upload(b, f, "lead")  # lead of A has no role on B
    with pytest.raises(P.AccessDenied):
        intake.register_upload(a, f, "view")  # viewer cannot upload
    with pytest.raises(P.AccessDenied):
        P.export_state(a, "ana")  # analyst cannot export
    s = P.load_state(a)
    with pytest.raises(P.IsolationError):
        P.save_state(b, s)


# 9 ----------------------------------------------------------------------------
def test_export_and_reload(base, tmp_path_factory):
    p = _project(base, "P9", client="Gamma")
    s = P.load_state(p)
    P.add_record(s, "ctqs", "lead", metric="m", definition="d", unit="u", direction="lower")
    P.save_state(p, s)
    intake.register_upload(p, _csv(base / "d.csv", [{"ID": 1}]), "lead")
    z = P.export_state(p, "lead")
    other = tmp_path_factory.mktemp("elsewhere")
    q = P.import_state(z, other)
    a, b = P.load_state(p), P.load_state(q)
    assert a["registers"] == b["registers"] and a["uploads"] == b["uploads"]
    assert len(list((q / "raw").iterdir())) == 1
    with pytest.raises(P.IsolationError):
        P.import_state(z, other)


# 10 ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def demo_outputs():
    import run_demo
    pdir = run_demo.run()
    return pdir / "outputs"


def test_dashboard_and_deck_reconcile(demo_outputs):
    bundle = json.loads((demo_outputs / "results_for_reporting.json").read_text())
    k1 = next(k for k in bundle["kpis"] if k["kpi_id"] == "K1")
    from pptx import Presentation
    deck = Presentation(demo_outputs / "DEMO-TA-SYNTH_executive_deck.pptx")
    text = " ".join(sh.text_frame.text for sl in deck.slides for sh in sl.shapes if sh.has_text_frame)
    assert f"{k1['current']:.1f}" in text and f"n = {k1['n']}" in text
    js = f"""
    const {{chromium}} = require('playwright');
    (async () => {{ const b = await chromium.launch(); const p = await b.newPage();
      const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto('file://{demo_outputs / 'DEMO-TA-SYNTH_dashboard.html'}#export');
      await p.waitForTimeout(500);
      const ok = await p.evaluate(() => window.__RECON__);
      await p.goto('file://{demo_outputs / 'DEMO-TA-SYNTH_dashboard.html'}#baseline'); await p.waitForTimeout(300);
      await p.selectOption('#f-s1', 'Engineering'); await p.waitForTimeout(200);
      const filtered = await p.textContent('#fk');
      console.log(JSON.stringify({{ok, errs, filtered}})); await b.close(); }})();"""
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, timeout=120)
    res = json.loads(out.stdout.strip().splitlines()[-1])
    assert res["ok"] is True and res["errs"] == []
    eng = bundle["charts"]["segments"]["job_family"]["groups"]["Engineering"]
    assert f"{eng['median']:.1f}" in res["filtered"], "filtered dashboard median must match engine segment median"


def test_project_templates_are_project_specific(demo_outputs):
    from openpyxl import load_workbook
    wb = load_workbook(demo_outputs / "DEMO-TA-SYNTH_data_collection_pack.xlsx")
    assert {"Collection_Plan", "Operational_Definitions", "Collection_Log", "Measurement_Check", "Gemba_Observation",
            "Stakeholder_Input", "Pilot_Tracking"} <= set(wb.sheetnames)
    log_headers = [c.value for c in wb["Collection_Log"][5]]
    assert not any("candidate_name" in str(h) for h in log_headers), "PII fields must not be in collection templates"
    launch = (demo_outputs / "communications" / "01_project_launch.md").read_text()
    assert "Requisition-to-offer" in launch and "{{" not in launch


# Safeguards -------------------------------------------------------------------
def test_statistical_safeguards():
    assert A.fmt_p(1e-12) == "p < 0.001" and A.fmt_p(0.0234) == "p = 0.023"
    skewed = np.random.default_rng(0).lognormal(3, 0.8, 200)
    cap = A.capability(skewed, usl=60, spec_approved=False)
    assert cap["status"] == "Not assessed" and cap["alternative"]["basis"] == "empirical conformance"
    assert A.conformance(skewed)["status"] == "Not assessed"
    with pytest.raises(ValueError):
        A.record_run(P.blank_state("X"), {"business_question": "q"}, {}, "v", [], "a")
    assert A.describe([1, 2, 3])["median_ci"] is None  # too few for a bootstrap CI
    assert "Insufficient evidence" in A.imr_chart([1, 2, 3])["status"]
    tp = A.two_proportions(40, 100, 50, 100)
    assert tp["difference_pp"] == 10.0 and tp["relative_change_pct"] == 25.0


def test_human_error_is_not_a_root_cause():
    s = P.blank_state("X")
    with pytest.raises(ValueError):
        P.add_record(s, "causes", issue="late", hypothesized_cause="Human error", evidence_required="x")


def test_funnel_missing_timestamp_is_not_dropout():
    df = pd.DataFrame({"a": [1, 1, 1], "b": [1, None, None], "c": [1, 1, None]})
    f = A.funnel(df, ["a", "b", "c"])
    assert [x["n"] for x in f] == [3, 2, 2] and f[1]["timestamp_missing_but_reached"] == 1


def test_censored_cases_are_kept():
    km = A.kaplan_meier([5, 10, 15, 20, 25], [1, 1, 0, 1, 0])
    assert km["n"] == 5 and km["censored"] == 2 and km["km_median"] == 20.0


# Studio (browser app) -----------------------------------------------------------
def test_studio_end_to_end_reconciles_with_engine():
    env = {**os.environ, "NODE_PATH": os.pathsep.join(filter(None, [str(ROOT / "node_modules"), "/opt/node22/lib/node_modules", os.environ.get("NODE_PATH", "")]))}
    try:
        out = subprocess.run(["node", str(ROOT / "tests" / "studio_e2e.js")], capture_output=True, text=True, timeout=300, env=env)
    except FileNotFoundError:
        pytest.skip("node not available")
    if "Cannot find module 'playwright'" in out.stderr:
        pytest.skip("playwright not available")
    res = json.loads(out.stdout.strip().splitlines()[-1])
    assert res["errors"] == [] and not res["overflow"]
    assert len(res["examples"]) == 3 and all(e["deckBytes"] > 50_000 and e["findings"] >= 3 for e in res["examples"])
    from pptx import Presentation
    for e in res["examples"]:
        assert len(Presentation(e["deck"]).slides) >= 12
    # same file, same scope rule -> same figures as the Python engine
    k = {kid: (v, n) for kid, v, n in res["upload"]["kpis"]}
    assert res["upload"]["mapping"]["start"] == "Req Opened" and res["upload"]["mapping"]["end"] == "Offer Date"
    assert k["K1"][1] == 417 and abs(k["K1"][0] - 27.0) < 0.01
    assert abs(k["K2"][0] - 41.52) < 0.01
    assert k["K3"][1] == 452 and abs(k["K3"][0] - 27.94) < 0.05
