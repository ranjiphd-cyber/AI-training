"""Baseline and inferential analysis with built-in safeguards.

* Inference requires a documented analysis plan (see PLAN_FIELDS).
* p-values below 0.001 are reported as bounds ("p < 0.001"), never 0.
* Capability indices are only returned when their gating conditions are met;
  otherwise the result is "Not assessed" with reasons, plus empirical
  conformance with a confidence interval.
* Every run is recorded with a seed, package versions and dataset version.
"""
from __future__ import annotations

import math
import platform
import uuid

import numpy as np
import pandas as pd
import scipy
from scipy import stats

from .project import log, now

SEED = 20261101
PLAN_FIELDS = [
    "business_question", "outcome", "predictors", "observation_unit", "sample",
    "objective_or_hypothesis", "method", "rationale", "assumptions", "diagnostics",
    "confidence_level", "practical_importance", "bias_confounding_risks",
]


def fmt_p(p: float) -> str:
    if p is None or (isinstance(p, float) and math.isnan(p)):
        return "n/a"
    return "p < 0.001" if p < 0.001 else f"p = {p:.3f}"


def environment() -> dict:
    return {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
            "scipy": scipy.__version__, "seed": SEED}


# --------------------------------------------------------------------------- descriptive

def describe(x, ci: float = 0.95, n_boot: int = 2000) -> dict:
    s = pd.Series(x, dtype="float64")
    v = s.dropna().to_numpy()
    out = {"n": int(v.size), "n_missing": int(s.isna().sum())}
    if v.size == 0:
        return {**out, "status": "Insufficient evidence; additional data required"}
    rng = np.random.default_rng(SEED)
    med = float(np.median(v))
    if v.size >= 10:
        boots = np.median(rng.choice(v, size=(n_boot, v.size), replace=True), axis=1)
        lo, hi = np.quantile(boots, [(1 - ci) / 2, 1 - (1 - ci) / 2])
        med_ci = [round(float(lo), 2), round(float(hi), 2)]
    else:
        med_ci = None
    q = np.percentile(v, [10, 25, 75, 90])
    return {**out, "mean": round(float(v.mean()), 2), "sd": round(float(v.std(ddof=1)), 2) if v.size > 1 else None,
            "median": round(med, 2), "median_ci": med_ci, "ci_level": ci, "p10": round(q[0], 2), "p25": round(q[1], 2),
            "p75": round(q[2], 2), "p90": round(q[3], 2), "min": round(float(v.min()), 2), "max": round(float(v.max()), 2)}


def wilson(k: int, n: int, z: float = 1.96):
    if n == 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return [round(max(0, c - h) * 100, 1), round(min(1, c + h) * 100, 1)]


def rate(numerator: int, denominator: int) -> dict:
    if not denominator:
        return {"numerator": numerator, "denominator": denominator, "pct": None, "ci95": None, "status": "Not assessed"}
    return {"numerator": int(numerator), "denominator": int(denominator),
            "pct": round(numerator / denominator * 100, 1), "ci95": wilson(numerator, denominator)}


# --------------------------------------------------------------------------- control charts

def imr_chart(values, labels=None) -> dict:
    """Individuals / moving-range chart with documented signal rules.

    Rule 1: a point beyond 3-sigma limits.
    Rule 2: 8 consecutive points on one side of the centre line.
    Rule 3: 6 consecutive points steadily increasing or decreasing.
    Absence of signals does NOT by itself establish stability.
    """
    v = np.asarray(pd.Series(values, dtype="float64").dropna())
    labels = list(labels) if labels is not None else list(range(1, len(v) + 1))
    if v.size < 12:
        return {"status": "Insufficient evidence; additional data required", "n": int(v.size)}
    mr = np.abs(np.diff(v))
    cl, mrbar = float(v.mean()), float(mr.mean())
    ucl, lcl = cl + 2.66 * mrbar, cl - 2.66 * mrbar
    signals = []
    for i, x in enumerate(v):
        if x > ucl or x < lcl:
            signals.append({"rule": 1, "index": i, "label": str(labels[i]), "detail": "beyond 3-sigma limit"})
    side = np.sign(v - cl)
    run = 1
    for i in range(1, len(v)):
        run = run + 1 if side[i] == side[i - 1] and side[i] != 0 else 1
        if run == 8:
            signals.append({"rule": 2, "index": i, "label": str(labels[i]), "detail": "8 points one side of centre"})
    d = np.sign(np.diff(v))
    run = 1
    for i in range(1, len(d)):
        run = run + 1 if d[i] == d[i - 1] and d[i] != 0 else 1
        if run == 5:
            signals.append({"rule": 3, "index": i + 1, "label": str(labels[i + 1]), "detail": "6 points trending"})
    return {"n": int(v.size), "center": round(cl, 2), "ucl": round(ucl, 2), "lcl": round(lcl, 2), "mr_bar": round(mrbar, 2),
            "values": [round(float(x), 2) for x in v], "labels": [str(x) for x in labels[: v.size]], "signals": signals,
            "rules": "R1 beyond limits; R2 8 one side; R3 6 trending",
            "interpretation": ("Signals present - investigate special causes before using limits as a baseline"
                               if signals else "No signals under R1-R3; stability is not established by this alone - "
                               "confirm with process knowledge and rational subgrouping")}


def pareto(series, top: int | None = None) -> list[dict]:
    s = pd.Series(series).dropna()
    counts = s.value_counts()
    total = int(counts.sum())
    out, cum = [], 0
    for k, n in counts.items():
        cum += n
        out.append({"category": str(k), "n": int(n), "pct": round(n / total * 100, 1), "cum_pct": round(cum / total * 100, 1)})
    return out[:top] if top else out


# --------------------------------------------------------------------------- conformance / capability

def conformance(values, usl=None, lsl=None) -> dict:
    v = pd.Series(values, dtype="float64").dropna()
    if usl is None and lsl is None:
        return {"status": "Not assessed", "reason": "No approved specification limit"}
    ok = pd.Series(True, index=v.index)
    if usl is not None:
        ok &= v <= usl
    if lsl is not None:
        ok &= v >= lsl
    return {**rate(int(ok.sum()), int(v.size)), "usl": usl, "lsl": lsl, "basis": "empirical conformance"}


def capability(values, usl=None, lsl=None, spec_approved=False, stable=False, measurement_ok=False) -> dict:
    reasons = []
    if not spec_approved:
        reasons.append("specification not approved")
    if not stable:
        reasons.append("stability not demonstrated")
    if not measurement_ok:
        reasons.append("measurement system not verified")
    v = pd.Series(values, dtype="float64").dropna()
    if v.size >= 8:
        sk = float(stats.skew(v))
        if abs(sk) > 1:
            reasons.append(f"distribution strongly skewed (skew {sk:.2f}); normal-theory indices misleading")
    else:
        reasons.append("too few observations")
    if reasons:
        return {"status": "Not assessed", "reasons": reasons, "alternative": conformance(v, usl, lsl)}
    mu, sd = v.mean(), v.std(ddof=1)
    sides = []
    if usl is not None:
        sides.append((usl - mu) / (3 * sd))
    if lsl is not None:
        sides.append((mu - lsl) / (3 * sd))
    if not sides:
        return {"status": "Not assessed", "reasons": ["no specification limit"]}
    ppk = min(sides)
    return {"status": "Assessed", "ppk": round(float(ppk), 2), "note": "Overall (long-term) index; no 1.5-sigma shift applied"}


# --------------------------------------------------------------------------- comparisons

def compare_two(a, b, label_a="A", label_b="B", n_boot: int = 4000) -> dict:
    """Difference in medians with bootstrap CI + Mann-Whitney U. No causal claim implied."""
    a = pd.Series(a, dtype="float64").dropna().to_numpy()
    b = pd.Series(b, dtype="float64").dropna().to_numpy()
    if min(a.size, b.size) < 10:
        return {"status": "Insufficient evidence; additional data required", "n": [int(a.size), int(b.size)]}
    rng = np.random.default_rng(SEED)
    diffs = np.median(rng.choice(b, (n_boot, b.size)), 1) - np.median(rng.choice(a, (n_boot, a.size)), 1)
    lo, hi = np.quantile(diffs, [0.025, 0.975])
    u = stats.mannwhitneyu(a, b, alternative="two-sided")
    return {"groups": [label_a, label_b], "n": [int(a.size), int(b.size)],
            "median": [round(float(np.median(a)), 2), round(float(np.median(b)), 2)],
            "median_diff_b_minus_a": round(float(np.median(b) - np.median(a)), 2),
            "median_diff_ci95": [round(float(lo), 2), round(float(hi), 2)],
            "mann_whitney_u": float(u.statistic), "p": float(u.pvalue), "p_text": fmt_p(float(u.pvalue)),
            "caveat": "Association only. Non-significance does not prove equality; significance does not prove business importance."}


def kruskal_by_group(df, value_col, group_col, min_n=10) -> dict:
    groups = {k: g[value_col].dropna().to_numpy() for k, g in df.groupby(group_col)}
    kept = {k: v for k, v in groups.items() if v.size >= min_n}
    if len(kept) < 2:
        return {"status": "Insufficient evidence; additional data required"}
    h = stats.kruskal(*kept.values())
    n = sum(v.size for v in kept.values())
    eps2 = max(0.0, (h.statistic - len(kept) + 1) / (n - len(kept)))
    return {"groups": {str(k): {"n": int(v.size), "median": round(float(np.median(v)), 2)} for k, v in kept.items()},
            "excluded_small_groups": [str(k) for k in groups if k not in kept],
            "H": round(float(h.statistic), 2), "p": float(h.pvalue), "p_text": fmt_p(float(h.pvalue)),
            "epsilon_squared": round(eps2, 3), "method": "Kruskal-Wallis (rank-based; skewed time data)",
            "multiple_comparisons": "Pairwise follow-up requires Holm or similar adjustment"}


def two_proportions(k1, n1, k2, n2) -> dict:
    table = [[k1, n1 - k1], [k2, n2 - k2]]
    expected_ok = min(stats.contingency.expected_freq(table).ravel()) >= 5
    if expected_ok:
        chi2, p, _, _ = stats.chi2_contingency(table, correction=False)
        method = "Chi-square (expected counts >= 5)"
    else:
        _, p = stats.fisher_exact(table)
        method = "Fisher's exact (small expected counts)"
    p1, p2 = k1 / n1, k2 / n2
    return {"rate_1": round(p1 * 100, 1), "rate_2": round(p2 * 100, 1),
            "difference_pp": round((p2 - p1) * 100, 1),
            "relative_change_pct": round((p2 - p1) / p1 * 100, 1) if p1 else None,
            "method": method, "p": float(p), "p_text": fmt_p(float(p))}


def kaplan_meier(durations, observed) -> dict:
    """Median time-to-event allowing for still-open (censored) cases."""
    d = pd.DataFrame({"t": pd.Series(durations, dtype="float64"), "e": pd.Series(observed).astype(bool)}).dropna()
    d = d.sort_values("t")
    at_risk, surv, curve, median = len(d), 1.0, [], None
    for t, grp in d.groupby("t"):
        events = int(grp["e"].sum())
        if events:
            surv *= 1 - events / at_risk
            curve.append([float(t), round(surv, 4)])
            if median is None and surv <= 0.5:
                median = float(t)
        at_risk -= len(grp)
    return {"n": int(len(d)), "events": int(d["e"].sum()), "censored": int((~d["e"]).sum()),
            "km_median": median, "curve": curve,
            "note": "Kaplan-Meier: open cases contribute until censoring instead of being dropped"}


def funnel(df: pd.DataFrame, stage_cols: list[str], stage_names: list[str] | None = None) -> list[dict]:
    """Stage conversion within ONE cohort.

    An entity has 'reached' a stage if that stage's timestamp OR any later
    stage's timestamp exists (a missing timestamp is not a drop-out). Missing
    timestamps implied by later stages are reported separately.
    """
    names = stage_names or stage_cols
    out, prev, first = [], None, None
    for i, (name, col) in enumerate(zip(names, stage_cols)):
        reached = df[stage_cols[i:]].notna().any(axis=1)
        n = int(reached.sum())
        first = first if first is not None else n
        out.append({"stage": name, "n": n, "pct_of_cohort": round(n / first * 100, 1) if first else None,
                    "conversion_from_prev": round(n / prev * 100, 1) if prev else None,
                    "timestamp_missing_but_reached": int((reached & df[col].isna()).sum())})
        prev = n
    return out


def filtered_rate(df: pd.DataFrame, numerator_mask, denominator_mask, filters: dict | None = None) -> dict:
    """KPI under filters: numerator is always a subset of the filtered denominator."""
    sel = pd.Series(True, index=df.index)
    for col, val in (filters or {}).items():
        sel &= df[col].isin(val if isinstance(val, (list, tuple, set)) else [val])
    den = denominator_mask & sel
    num = numerator_mask & den
    return {**rate(int(num.sum()), int(den.sum())), "filters": filters or {}, "excluded_by_filter": int((denominator_mask & ~sel).sum())}


# --------------------------------------------------------------------------- run registry

def record_run(state: dict, plan: dict, result: dict, dataset_version: str, ctq_ids: list[str], actor: str) -> dict:
    missing = [f for f in PLAN_FIELDS if not plan.get(f)]
    if missing:
        raise ValueError(f"Analysis plan incomplete - document before inference: {missing}")
    run = {"run_id": f"RUN-{uuid.uuid4().hex[:8]}", "at": now(), "actor": actor, "plan": plan, "result": result,
           "dataset_version": dataset_version, "ctq_ids": ctq_ids, "environment": environment(), "status": "Current"}
    state["analysis_runs"].append(run)
    log(state, actor, "analysis_run", run["run_id"])
    return run
