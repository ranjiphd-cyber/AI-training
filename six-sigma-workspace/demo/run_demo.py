"""RUN PROJECT + REFRESH PROJECT walkthrough on SYNTHETIC data.

    python demo/run_demo.py

Creates demo/projects/DEMO-TA-SYNTH from scratch, then writes the dashboard,
deck inputs, data-collection workbook, communication pack and a refresh
comparison to demo/projects/DEMO-TA-SYNTH/outputs/.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "engine"))

from sixsigma import intake, project as P, templates, versions  # noqa: E402
from sixsigma.pipelines import build_baseline_bundle  # noqa: E402

BASE = HERE / "projects"
PID = "DEMO-TA-SYNTH"
LEAD = "lead.demo"

MAPPING = {  # standard field <- source column (edited in Module 5)
    "record_id": "Req ID", "segment": "Business Unit", "job_family": "Job Family", "source_channel": "Source",
    "owner_ref": "Recruiter Ref", "req_open_ts": "Req Opened", "first_shortlist_ts": "First Shortlist",
    "first_interview_ts": "First Interview", "offer_ts": "Offer Date", "offer_accept_ts": "Offer Accepted",
    "req_status": "Status",
}


def pipeline_config(extract_date):
    return {
        "id_field": "record_id", "start": "req_open_ts", "stop": "offer_ts", "outcome_label": "Time to offer",
        "unit": "days", "observation_unit": "Requisition", "extract_date": extract_date, "maturity_days": 56,
        "stages": [["Open to shortlist", "req_open_ts", "first_shortlist_ts"],
                   ["Shortlist to interview", "first_shortlist_ts", "first_interview_ts"],
                   ["Interview to offer", "first_interview_ts", "offer_ts"]],
        "funnel": [["Opened", "req_open_ts"], ["Shortlisted", "first_shortlist_ts"], ["Interviewed", "first_interview_ts"],
                   ["Offered", "offer_ts"], ["Accepted", "offer_accept_ts"]],
        "conversion": {"name": "Offer acceptance rate", "num": "offer_accept_ts", "den": "offer_ts", "maturity_days": 14},
        "segments": ["segment", "job_family"], "segment_labels": {"segment": "business unit", "job_family": "job family"}, "exclude": {"req_status": ["Cancelled"]}, "owner_field": "owner_ref",
        "ctq_ids": {"outcome": "CTQ-001", "conversion": "CTQ-002"},
        "balancing_not_available": [
            {"id": "B1", "name": "Hiring manager satisfaction", "definition": "Top-2-box share, post-offer pulse survey", "unit": "%"},
            {"id": "B2", "name": "90-day new-hire retention", "definition": "Hires retained at day 90 / hires", "unit": "%"}],
        "source_label": "SYNTHETIC ATS extract",
    }


def run():
    if (BASE / PID).exists():
        P.delete_project(BASE / PID)
    BASE.mkdir(exist_ok=True)
    pdir = P.create_project(
        BASE, PID, actor=LEAD, mode="RUN PROJECT", client="Synthetic Demo Co (fictitious)", industry="Manufacturing",
        department="Talent Acquisition", department_pack="talent_acquisition", process="Requisition-to-offer",
        dmaic_stage="Measure", sponsor="[Sponsor - TBC]", process_owner="[TA process owner - TBC]", project_lead="[Project lead]",
        time_zone="Europe/Stockholm", calendar_rule="Calendar days", currency="EUR",
        roles={LEAD: "project_lead", "analyst.demo": "analyst", "sponsor.demo": "sponsor"})
    s = P.load_state(pdir)
    c = s["config"]
    c["problem_statement"] = ("Between Jan and Jun 2026, requisitions in the requisition-to-offer process took a median of [baseline] "
                              "calendar days from approval to first offer, with 1 in 10 exceeding [P90] days, delaying start dates "
                              "for hiring managers and risking loss of preferred candidates.")
    c["goal_statement"] = "Reduce median and P90 time to offer to a level agreed with hiring managers by [date] - target pending approval."
    c["scope"] = "Approved external requisitions, all business units, opened Jan-Jun 2026"
    c["exclusions"] = "Cancelled requisitions (counted separately); internal transfers; executive search"

    P.add_record(s, "ctqs", LEAD, metric="Time to offer", definition="Calendar days from requisition approval to first offer extended",
                 unit="days", numerator="-", denominator="requisitions with an offer", population="Approved external requisitions; cancelled excluded",
                 start_event="req_open_ts", stop_event="offer_ts", direction="lower", source="ATS", owner="[TA process owner]",
                 approved_requirement="Not yet agreed with hiring managers", target=None, target_status="Not set - VOC pending")
    P.add_record(s, "ctqs", LEAD, metric="Offer acceptance rate", definition="Offers accepted / offers extended (offers >=14 days old)",
                 unit="%", numerator="offers accepted", denominator="offers extended", direction="higher", source="ATS",
                 owner="[TA process owner]", target_status="Not set")
    P.add_record(s, "ctqs", LEAD, metric="Hiring manager satisfaction", definition="Top-2-box share on 7-point post-offer pulse",
                 unit="%", numerator="top-2-box responses", denominator="responses", direction="higher", source="Not yet collected",
                 owner="[TA process owner]", target_status="Not set", baseline="Not assessed")
    for st, lab, own in [("Timestamps in the ATS reflect real events (pending sample verification)", "Assumption", "Data owner"),
                         ("Calendar days used; business-day rule not yet agreed", "Assumption", "Process owner"),
                         ("Practical-importance threshold of 5 days (proposed)", "Proposed target", "Sponsor")]:
        P.add_record(s, "assumptions", LEAD, statement=st, label=lab, owner=own, status="Open")
    for q, pr, own in [("What time-to-offer do hiring managers need for their critical roles? (VOC)", "High", "Process owner"),
                       ("Is 'First Interview' captured consistently in BU-B?", "High", "Data owner"),
                       ("Were there policy or system changes Jan-Jun 2026?", "Medium", "Process owner"),
                       ("Which dashboard platform is approved for client data?", "High", "Sponsor / IT"),
                       ("Is a business-day calendar required?", "Medium", "Sponsor")]:
        P.add_record(s, "questions", LEAD, question=q, priority=pr, owner=own, status="Open")
    P.add_record(s, "risks", LEAD, description="Personal data exposure in candidate-level extracts", severity="High", owner="Project lead",
                 mitigation="Pseudonymised IDs only; no names; approved storage", status="Open")
    P.add_record(s, "risks", LEAD, description="Findings misread as individual recruiter performance", severity="High", owner="Sponsor",
                 mitigation="Aggregate reporting; no owner-level visuals", status="Open")
    P.add_record(s, "risks", LEAD, description="Completion bias in recent cohorts", severity="Medium", owner="Analyst",
                 mitigation="Mature-cohort rule (56 days) and Kaplan-Meier", status="Mitigated in method")
    for item, role, link in [("Project charter", "Sponsor", None), ("CTQ definitions", "Process owner", "CTQ-001"),
                             ("Baseline results v001", "Sponsor", "v001"), ("Measure gate", "Sponsor", None)]:
        P.add_record(s, "approvals", LEAD, item=item, approver_role=role, linked_id=link)
    P.add_record(s, "causes", LEAD, issue="Long open-to-shortlist stage", hypothesized_cause="Role profile not finalised at requisition approval",
                 contributor_role="Analyst (pattern in data - not stakeholder input)", observation="Stage is longest in most cases",
                 evidence_required="Count of reqs with profile edits after approval; Gemba", validation_method="Data pull + observation",
                 owner="Process owner", status="Hypothesized")
    for a, own, due in [("Confirm VOC requirement with 8-10 hiring managers", "Process owner", "Week 2"),
                        ("Verify 30 random timestamps against source e-mails", "Data owner", "Week 2"),
                        ("Run root-cause workshop on open-to-shortlist stage", "Project lead", "Week 3")]:
        P.add_record(s, "actions", LEAD, action=a, owner=own, due=due, status="Not started")
    P.save_state(pdir, s)

    outputs = {}
    for label, fname, extract in [("baseline", "SYNTHETIC_requisitions_extract_2026-08-14.csv", "2026-08-14"),
                                  ("refresh", "SYNTHETIC_requisitions_extract_2026-09-11.csv", "2026-09-11")]:
        up = intake.register_upload(pdir, HERE / "data" / fname, LEAD, f"{label} extract (SYNTHETIC)")
        again = intake.register_upload(pdir, HERE / "data" / fname, LEAD)
        assert again["duplicate"], "duplicate upload must be detected"
        raw = intake.read_table(pdir / "raw" / up["file"])["csv"]
        pack = templates.load_pack("talent_acquisition")
        std, issues = intake.apply_mapping(raw, MAPPING, pack["core_fields"] + pack["standard_fields"])
        s = P.load_state(pdir)
        s["mappings"][up["upload_id"]] = {"mapping": MAPPING, "issues": issues}
        if label == "baseline":
            prof = intake.quality_profile(std, "record_id")
            intake.data_request_from_gaps(s, prof, threshold_pct=10, owner="Data owner")
        bundle = build_baseline_bundle(s, std, pipeline_config(extract), dataset_version=up["upload_id"], actor="analyst.demo")
        bundle["mapping_issues"] = issues
        bundle["mapping"] = MAPPING
        bundle["uploads"] = [{k: u[k] for k in ("upload_id", "original_name", "sha256", "uploaded_at", "description")} for u in s["uploads"]]
        bundle["pack"] = {k: pack[k] for k in ("pack_id", "label", "process_stages", "balancing_measures", "sensitivity_notes")}
        bundle["config"].update({k: s["config"][k] for k in ("problem_statement", "goal_statement", "scope", "exclusions",
                                                            "industry", "time_zone", "calendar_rule", "currency", "mode")})
        bundle["synthetic"] = True
        P.save_state(pdir, s)
        vid = versions.create_version(pdir, bundle, "analyst.demo", note=f"{label} - SYNTHETIC")
        outputs[label] = vid

    s = P.load_state(pdir)
    old, new = versions.load_version(pdir, outputs["baseline"]), versions.load_version(pdir, outputs["refresh"])
    versions.promote(pdir, outputs["baseline"], LEAD, approver_name="[Demo approver - synthetic]")
    s = P.load_state(pdir)  # demo only: record the synthetic baseline approval so revalidation can be shown
    P.update_record(s, "approvals", "APR-003", LEAD, status="Approved", approved_by="[Demo approver - synthetic]")
    P.save_state(pdir, s)
    cmp = versions.compare_versions(old, new)
    flagged = versions.flag_revalidation(pdir, cmp, LEAD)
    out = pdir / "outputs"
    (out / "refresh_comparison.json").write_text(json.dumps({**cmp, "approvals_flagged": flagged}, indent=2))
    lines = [f"# Version-to-version change summary: {cmp['from']} -> {cmp['to']} (SYNTHETIC)", "",
             f"Materiality rule: {cmp['threshold']}", "", "| KPI | Old | New | Change | Rel. % | Old n | New n | Material |", "|---|---|---|---|---|---|---|---|"]
    for r in cmp["kpis"]:
        lines.append(f"| {r['kpi_id']} | {r.get('old')} | {r.get('new')} | {r.get('abs_change', '')} | {r.get('rel_change_pct', '')} | "
                     f"{r.get('old_n', '')} | {r.get('new_n', '')} | {'Yes - review' if r['material'] else 'No'} |")
    lines += ["", f"Findings requiring review: {', '.join(cmp['findings_requiring_review']) or 'none'}",
              f"Approvals marked 'Requires revalidation': {', '.join(flagged) or 'none'}",
              "", "The refreshed version stays **Draft - pending review** until the sponsor promotes it."]
    (out / "refresh_change_summary.md").write_text("\n".join(lines))

    s = P.load_state(pdir)
    templates.build_data_collection_workbook(s, out / f"{PID}_data_collection_pack.xlsx")
    templates.build_communication_pack(s, out / "communications")
    approved = versions.load_version(pdir, s["approved_version"])
    approved["refresh_comparison"] = {**cmp, "approvals_flagged": flagged}
    approved["version_history"] = s["versions"]
    approved["registers"]["approvals"] = s["registers"]["approvals"]
    (out / "results_for_reporting.json").write_text(json.dumps(approved, indent=2, default=str))
    root = ROOT
    subprocess.run([sys.executable, str(root / "generators" / "build_dashboard.py"), str(out / "results_for_reporting.json"),
                    str(out / f"{PID}_dashboard.html")], check=True)
    subprocess.run(["node", str(root / "generators" / "build_deck.js"), str(out / "results_for_reporting.json"),
                    str(out / f"{PID}_executive_deck.pptx")], check=True,
                   env={**os.environ, "NODE_PATH": str(root / "node_modules")})
    print(json.dumps({"project": str(pdir), "versions": outputs, "approved": s["approved_version"],
                      "material_kpis": cmp["material_kpis"], "flagged": flagged}, indent=2))
    return pdir


if __name__ == "__main__":
    run()
