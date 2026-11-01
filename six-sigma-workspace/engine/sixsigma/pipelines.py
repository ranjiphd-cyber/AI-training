"""Configurable baseline pipeline for staged time-to-event processes.

Works for any process described as timestamped stages: requisition-to-offer,
invoice-to-payment, ticket-to-resolution, order-to-ship, arrival-to-discharge.
All field names come from the pipeline config; nothing is department-specific.

Output: a result bundle (dict) that feeds the dashboard and the presentation.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import analysis as A
from .intake import quality_profile

DAY = pd.Timedelta(days=1)


def _days(a, b):
    return (b - a) / DAY


def build_baseline_bundle(state: dict, df: pd.DataFrame, pc: dict, dataset_version: str, actor: str = "analyst") -> dict:
    idf, start, stop = pc["id_field"], pc["start"], pc["stop"]
    extract = pd.Timestamp(pc["extract_date"])
    transformations, exclusions = [], []

    # ---- data quality (before any change)
    chron_pairs = [(s[1], s[2]) for s in pc["stages"]] + [(start, stop)]
    dq_raw = quality_profile(df, id_col=idf, chronology=chron_pairs)

    # ---- explicit, logged transformations
    n0 = len(df)
    df = df.drop_duplicates()
    transformations.append({"step": "drop exact duplicate rows", "rows_removed": n0 - len(df)})
    n1 = len(df)
    df = df.drop_duplicates(subset=[idf], keep="last")
    transformations.append({"step": f"keep last record per {idf}", "rows_removed": n1 - len(df)})

    bad = pd.Series(False, index=df.index)
    for a, b in chron_pairs:
        both = df[a].notna() & df[b].notna()
        bad |= both & (df[b] < df[a])
    exclusions.append({"rule": "chronology violation (end before start) - excluded from durations, kept in counts; sent for correction",
                       "rows": int(bad.sum()), "ids": df.loc[bad, idf].astype(str).tolist()})
    df = df.assign(_chron_bad=bad)

    excl_mask = pd.Series(False, index=df.index)
    for col, vals in pc.get("exclude", {}).items():
        excl_mask |= df[col].isin(vals)
    exclusions.append({"rule": "excluded by scope: " + "; ".join(f"{k} in {', '.join(map(str, v))}" for k, v in pc.get("exclude", {}).items()),
                       "rows": int(excl_mask.sum())})
    pop = df.loc[~excl_mask].copy()

    # ---- outcome durations
    valid = ~pop["_chron_bad"]
    pop["outcome_days"] = np.where(valid & pop[stop].notna(), _days(pop[start], pop[stop]), np.nan)
    for name, a, b in pc["stages"]:
        pop[name] = np.where(valid & pop[a].notna() & pop[b].notna(), _days(pop[a], pop[b]), np.nan)
    pop["event"] = pop[stop].notna() & valid
    pop["km_days"] = np.where(pop["event"], pop["outcome_days"], _days(pop[start], extract))
    pop.loc[pop["_chron_bad"], "km_days"] = np.nan

    completed = pop["outcome_days"].dropna()
    desc = A.describe(completed)
    km = A.kaplan_meier(pop["km_days"], pop["event"])

    # ---- run chart on mature weekly cohorts
    mature_cut = extract - pd.Timedelta(days=pc.get("maturity_days", 56))
    pop["cohort_week"] = pop[start].dt.to_period("W-SUN").dt.start_time
    mature = pop[pop[start] <= mature_cut]
    wk = mature.groupby("cohort_week").agg(median=("outcome_days", "median"), n=("outcome_days", "count"),
                                            opened=(idf, "count")).reset_index()
    wk["pct_complete"] = (wk["n"] / wk["opened"] * 100).round(1)
    imr = A.imr_chart(wk["median"], wk["cohort_week"].dt.strftime("%d %b"))
    imr["n_per_point"] = wk["n"].tolist()
    imr["pct_complete"] = wk["pct_complete"].tolist()

    # ---- stage decomposition and Pareto of the longest stage
    stage_names = [s[0] for s in pc["stages"]]
    stage_stats = {s: A.describe(pop[s]) for s in stage_names}
    full = pop.dropna(subset=stage_names)
    longest = full[stage_names].idxmax(axis=1)
    par = A.pareto(longest)

    # ---- segmentation (documented plan required)
    seg_results = {}
    for seg in pc.get("segments", []):
        seg_results[seg] = A.kruskal_by_group(pop.dropna(subset=["outcome_days"]), "outcome_days", seg)

    # ---- funnel on one mature cohort
    cohort = mature.copy()
    fun = A.funnel(cohort, [c for _, c in pc["funnel"]], [n for n, _ in pc["funnel"]])

    # ---- conversion
    cv = pc.get("conversion")
    conv = None
    if cv:
        m = pop[cv["den"]].notna() & (pop[cv["den"]] <= extract - pd.Timedelta(days=cv.get("maturity_days", 14))) & valid
        conv = A.filtered_rate(pop, pop[cv["num"]].notna(), m)

    # ---- workload (aggregate only - no individual exposure)
    wl = None
    if pc.get("owner_field"):
        open_now = pop[pop[stop].isna() & ~pop["_chron_bad"]]
        per = open_now.groupby(pc["owner_field"]).size()
        wl = {"owners": int(per.size), "median_open_per_owner": float(per.median()) if per.size else None,
              "p90_open_per_owner": float(per.quantile(0.9)) if per.size else None,
              "note": "Aggregate only; individual owner figures are not displayed"}

    # ---- analysis runs (each with a documented plan)
    ctq_out = pc["ctq_ids"]["outcome"]
    base_plan = {
        "observation_unit": pc["observation_unit"], "confidence_level": "95%",
        "bias_confounding_risks": "Completion bias for recent cohorts; case mix (job family, unit) differs; observational data",
        "diagnostics": "Distribution inspected (right-skewed); outliers retained", "predictors": "none",
        "practical_importance": f"Difference >= {pc.get('practical_days', 5)} {pc['unit']} in median (proposed - confirm with sponsor)",
    }
    runs = {}
    runs["baseline"] = A.record_run(state, {**base_plan, "business_question": f"What is current {pc['outcome_label'].lower()}?",
                                            "outcome": pc["outcome_label"], "sample": f"{desc['n']} completed + {km['censored']} open",
                                            "objective_or_hypothesis": "Estimate median with 95% CI; account for open cases",
                                            "method": "Median + bootstrap CI; Kaplan-Meier", "rationale": "Skewed time data with censoring",
                                            "assumptions": "Timestamps accurate (pending verification)"},
                                    {"describe": desc, "km": km}, dataset_version, [ctq_out], actor)
    runs["stability"] = A.record_run(state, {**base_plan, "business_question": "Is the process stable over time?",
                                             "outcome": "Weekly cohort median", "sample": f"{imr.get('n')} mature weekly cohorts",
                                             "objective_or_hypothesis": "Detect special-cause signals", "method": "I-MR chart, rules R1-R3",
                                             "rationale": "Time-ordered individual values", "assumptions": "Cohorts comparable week to week"},
                                     imr, dataset_version, [ctq_out], actor)
    for seg, res in seg_results.items():
        runs[f"seg_{seg}"] = A.record_run(state, {**base_plan, "business_question": f"Does {pc['outcome_label'].lower()} differ by {seg}?",
                                                  "outcome": pc["outcome_label"], "predictors": seg, "sample": "completed cases",
                                                  "objective_or_hypothesis": f"H0: same distribution across {seg}",
                                                  "method": "Kruskal-Wallis + epsilon-squared", "rationale": "Skewed, independent groups",
                                                  "assumptions": "Independent observations; similar shapes"},
                                          res, dataset_version, [ctq_out], actor)

    # ---- KPIs (single source for dashboard + deck)
    period = f"{pop[start].min():%d %b %Y} - {pop[start].max():%d %b %Y}"
    src = pc.get("source_label", "Uploaded extract")
    refresh = f"{extract:%d %b %Y}"
    k_ctq = {c["id"]: c for c in state["registers"]["ctqs"]}

    def kpi(kid, name, definition, unit, current, n, kind, ctq=None, denominator=None, ci=None, note=None):
        c = k_ctq.get(ctq, {})
        return {"kpi_id": kid, "name": name, "definition": definition, "unit": unit, "denominator": denominator,
                "period": period, "n": n, "baseline": current, "current": current, "ci95": ci, "kind": kind,
                "target": c.get("target"), "target_status": c.get("target_status", "Not set"),
                "status_label": "Baseline - no approved target" if current is not None else "Not assessed",
                "source": src, "refresh_date": refresh, "ctq_id": ctq, "note": note}

    kpis = [
        kpi("K1", f"Median {pc['outcome_label'].lower()}", f"{pc['outcome_label']}: {start} to {stop}, completed cases",
            pc["unit"], desc.get("median"), desc["n"], "Outcome", ctq_out, "completed cases", desc.get("median_ci")),
        kpi("K2", f"{pc['outcome_label']} incl. open cases (KM median)", "Kaplan-Meier median allowing for open cases",
            pc["unit"], km["km_median"] and round(km["km_median"], 1), km["n"], "Outcome", ctq_out, "completed + open cases",
            note=f"{km['censored']} open cases censored at extract date"),
        kpi("K3", f"90th percentile {pc['outcome_label'].lower()}", "Value 90% of completed cases fall below",
            pc["unit"], desc.get("p90"), desc["n"], "Outcome", ctq_out, "completed cases"),
    ]
    for name in stage_names:
        sd = stage_stats[name]
        kpis.append(kpi(f"S{stage_names.index(name) + 1}", f"Median {name.lower()}", f"Stage time: {name}", pc["unit"],
                        sd.get("median"), sd["n"], "Process", ctq_out, "cases with both stage timestamps", sd.get("median_ci")))
    if conv:
        kpis.append(kpi("K4", cv["name"], f"{cv['num']} present / {cv['den']} present (offers at least {cv.get('maturity_days', 14)} days old)",
                        "%", conv["pct"], conv["denominator"], "Outcome", pc["ctq_ids"].get("conversion"), "mature offers", conv["ci95"]))
    for b in pc.get("balancing_not_available", []):
        kpis.append({**kpi(b["id"], b["name"], b["definition"], b["unit"], None, 0, "Balancing"), "status_label": "Not assessed",
                     "note": "No data yet - see data collection plan"})
    if wl:
        kpis.append(kpi("B9", "Open cases per owner (median)", "Open cases at extract date / owner (aggregate)", "cases",
                        wl["median_open_per_owner"], wl["owners"], "Balancing", denominator="owners with open cases"))
    complete_share = A.rate(int(pop.dropna(subset=[s[2] for s in pc["stages"]]).shape[0]), int(pop[stop].notna().sum()))
    kpis.append(kpi("D1", "Stage timestamp completeness", "Cases with every stage timestamp / cases reaching final stage", "%",
                    complete_share["pct"], complete_share["denominator"], "Data quality", denominator="cases reaching final stage",
                    ci=complete_share["ci95"]))

    # ---- findings (calculated results; causes remain hypotheses)
    top_stage = par[0] if par else None
    findings = []
    findings.append({"id": "F-001", "label": "Calculated result", "kpi_ids": ["K1", "K2", "K3"], "analysis_run_id": runs["baseline"]["run_id"],
        "finding": f"Median {pc['outcome_label'].lower()} is {desc.get('median'):.1f} {pc['unit']} (95% CI {desc['median_ci'][0]:.1f}-{desc['median_ci'][1]:.1f}); 1 in 10 cases takes more than {desc.get('p90'):.1f} {pc['unit']}.",
        "evidence": f"{desc['n']} completed cases, {period}. Kaplan-Meier median including {km['censored']} open cases: {km['km_median'] and round(km['km_median'], 1)} {pc['unit']}.",
        "implication": "The long tail, not the typical case, drives customer dissatisfaction and backlog. Mean-based reporting would overstate the typical case.",
        "action": "Agree the CTQ requirement with customers before setting a target; report median and P90 together.",
        "limitation": "Timestamps not yet verified against source; target not approved."})
    if top_stage:
        findings.append({"id": "F-002", "label": "Calculated result", "kpi_ids": [f"S{i + 1}" for i in range(len(stage_names))],
            "analysis_run_id": runs["baseline"]["run_id"],
            "finding": f"'{top_stage['category']}' is the longest stage in {top_stage['pct']}% of fully-timestamped cases.",
            "evidence": f"Pareto of longest stage across {len(full)} cases with all stage timestamps.",
            "implication": "Improvement effort is likely to pay back most in this stage - subject to cause validation.",
            "action": "Run root-cause workshop and Gemba focused on this stage; collect delay reasons.",
            "limitation": f"Excludes {len(pop) - len(full)} cases with missing stage timestamps; missingness is not random by unit."})
    thr = pc.get("practical_days", 5)
    res_run_ids = {pc.get("segment_labels", {}).get(k, k): runs[f"seg_{k}"]["run_id"] for k in seg_results}
    for seg, res in seg_results.items():
        if "groups" not in res:
            continue
        g = res["groups"]
        seg = pc.get("segment_labels", {}).get(seg, seg)
        hi = max(g, key=lambda k: g[k]["median"])
        lo = min(g, key=lambda k: g[k]["median"])
        gap = round(g[hi]["median"] - g[lo]["median"], 1)
        detectable = res["p"] < 0.05
        important = gap >= thr
        if detectable:
            text = (f"{pc['outcome_label']} differs by {seg}: median {g[hi]['median']:.1f} ({hi}) vs {g[lo]['median']:.1f} ({lo}) "
                    f"{pc['unit']}, a gap of {gap} {pc['unit']} ({res['p_text']}).")
            impl = ("Gap exceeds the proposed practical threshold - segment-specific standard work may be needed."
                    if important else "Statistically detectable but below the proposed practical threshold - low priority on its own.")
        else:
            text = (f"No statistically detectable difference in {pc['outcome_label'].lower()} by {seg} "
                    f"(largest median gap {gap} {pc['unit']}, {res['p_text']}).")
            impl = "This does not prove the segments are equal; it means this data cannot distinguish them."
        findings.append({"id": f"F-{len(findings) + 1:03d}", "label": "Calculated result", "kpi_ids": ["K1"],
            "analysis_run_id": res_run_ids[seg], "finding": text,
            "evidence": f"Kruskal-Wallis across {len(g)} groups, epsilon-squared {res['epsilon_squared']}; proposed practical threshold {thr} {pc['unit']}.",
            "implication": impl,
            "action": f"Stratify cause analysis by {seg}; do not attribute differences to teams or individuals.",
            "limitation": "Observational association only; case mix not adjusted; pairwise comparisons need multiplicity adjustment."})
    if imr.get("signals") is not None:
        sig = imr["signals"]
        findings.append({"id": f"F-{len(findings) + 1:03d}", "label": "Calculated result", "kpi_ids": ["K1"],
            "analysis_run_id": runs["stability"]["run_id"],
            "finding": (f"{len(sig)} special-cause signal(s) in weekly cohort medians: " + "; ".join(f"R{x['rule']} at week of {x['label']}" for x in sig))
                       if sig else "No special-cause signals in weekly cohort medians under rules R1-R3.",
            "evidence": f"I-MR chart, {imr['n']} mature weekly cohorts; centre {imr['center']}, limits {imr['lcl']} to {imr['ucl']} {pc['unit']}.",
            "implication": ("Investigate what was different in the flagged weeks before treating the baseline as stable."
                            if sig else "Supports, but does not by itself establish, a stable baseline."),
            "action": "Process owner to review flagged weeks against calendar, volume and system events." if sig else "Confirm with process knowledge.",
            "limitation": "Weekly medians of completed cases; small weekly n widens natural variation."})
    findings.append({"id": f"F-{len(findings) + 1:03d}", "label": "Verified fact", "kpi_ids": ["D1"], "analysis_run_id": runs["baseline"]["run_id"],
        "finding": f"{dq_raw['exact_duplicate_rows']} duplicate rows and {sum(dq_raw['chronology_violations'].values())} chronology errors found in the extract.",
        "evidence": "Automated data-quality profile of the immutable raw upload.",
        "implication": "Unless corrected, these defects would distort the baseline. They also point to weaknesses in data entry controls.",
        "action": "Data owner to correct the source records and confirm the business rules for entering dates.",
        "limitation": "Profile detects structural errors only; accuracy needs sample verification."})

    records = pop.loc[:, [start, *pc.get("segments", []), "outcome_days", "event", "km_days", *stage_names]].copy()
    records["week"] = pop[start].dt.strftime("%Y-%m-%d")
    records = records.drop(columns=[start])
    records = records.replace({np.nan: None})

    return {
        "dataset_version": dataset_version,
        "config": {k: state["config"].get(k) for k in ("client", "department", "process", "dmaic_stage", "project_id", "sponsor", "process_owner", "project_lead")},
        "period": period, "extract_date": refresh, "unit": pc["unit"], "outcome_label": pc["outcome_label"],
        "kpis": kpis, "findings": findings,
        "charts": {"imr": imr, "pareto_longest_stage": par, "funnel": fun, "segments": seg_results,
                   "km_curve": km["curve"], "stage_stats": stage_stats},
        "data_quality": {"raw_profile": dq_raw, "transformations": transformations, "exclusions": exclusions,
                         "population_after_scope": int(len(pop))},
        "workload": wl,
        "analysis_run_ids": {k: v["run_id"] for k, v in runs.items()},
        "analysis_runs": [{"run_id": v["run_id"], "name": k, "plan": v["plan"], "environment": v["environment"],
                           "dataset_version": v["dataset_version"], "at": v["at"]} for k, v in runs.items()],
        "process_stages": stage_names,
        "registers": {k: state["registers"][k] for k in ("ctqs", "assumptions", "questions", "risks", "decisions",
                                                          "approvals", "causes", "actions", "data_requests", "improvements",
                                                          "benefits", "controls")},
        "gates": state["gates"],
        "records": records.to_dict(orient="records"),
        "record_fields_note": "Pseudonymised analysis records; owner references removed",
    }
