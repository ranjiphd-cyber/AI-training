#!/usr/bin/env python3
"""Validation analysis for the C-Psych Fit Check study.

Input : CSV export of the "responses" sheet (File > Download > CSV), one or more files.
Output: validation_report.md plus item_stats.csv, scale_stats.csv and norms.csv in --out.

Covers the evidence a technical manual needs:
  1. Sample and data quality (withdrawals, attention checks, straight-lining, speeding)
  2. Reliability: Cronbach's alpha, McDonald's omega (one-factor), corrected item-total r, alpha-if-deleted
  3. Test-retest reliability (participants who entered a previous code)
  4. Convergent validity: questionnaire scales vs. Hogan / other Big Five scores entered by participants
  5. Agreement among raters of the same organisation: ICC(1), ICC(k)
  6. Criterion validity: fit indices vs. perceived fit, satisfaction, intention to stay, strain
  7. Incremental validity: model-derived fit vs. stated-preference fit
  8. Report accuracy as judged by participants, and public-scan vs. insider agreement
  9. Group differences (fairness screening) and provisional norms

Only numpy and pandas are required.
Usage: python3 validate.py responses.csv [more.csv ...] --out results/ [--min-minutes 8]
"""
import argparse
import json
import math
import pathlib

import numpy as np
import pandas as pd

HERE = pathlib.Path(__file__).resolve().parent
INSTRUMENT = json.loads((HERE.parent / "src" / "instrument.json").read_text(encoding="utf-8"))
ITEMS = [i for i in INSTRUMENT["items"] if i["scale"] != "CHECK"]
SCALES = {}
for it in ITEMS:
    SCALES.setdefault(it["scale"], []).append(it)
LABEL = {k: v["label"] for k, v in INSTRUMENT["scales"].items()}
QUADS = ["clan", "adhoc", "market", "hier"]


# ---------------------------------------------------------------- statistics helpers
def norm_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def corr_ci(r, n):
    """Pearson r with Fisher-z 95% CI and two-sided p (normal approximation)."""
    if n is None or n < 4 or r is None or not np.isfinite(r) or abs(r) >= 1:
        return r, None, None, None
    z, se = np.arctanh(r), 1 / math.sqrt(n - 3)
    lo, hi = np.tanh(z - 1.96 * se), np.tanh(z + 1.96 * se)
    t = r * math.sqrt((n - 2) / max(1e-12, 1 - r * r))
    p = 2 * (1 - norm_cdf(abs(t)))  # adequate for n >= 30
    return r, lo, hi, p


def pair_r(a, b):
    d = pd.concat([pd.to_numeric(a, errors="coerce"), pd.to_numeric(b, errors="coerce")], axis=1).dropna()
    if len(d) < 4 or d.iloc[:, 0].std() == 0 or d.iloc[:, 1].std() == 0:
        return None, len(d)
    return float(np.corrcoef(d.iloc[:, 0], d.iloc[:, 1])[0, 1]), len(d)


def cronbach_alpha(m):
    m = m.dropna()
    k = m.shape[1]
    if k < 2 or len(m) < 3:
        return np.nan
    var_items, var_total = m.var(ddof=1).sum(), m.sum(axis=1).var(ddof=1)
    return float(k / (k - 1) * (1 - var_items / var_total)) if var_total > 0 else np.nan


def omega_total(m, iters=200):
    """McDonald's omega from a one-factor principal-axis solution (needs k >= 3)."""
    m = m.dropna()
    if m.shape[1] < 3 or len(m) < 10:
        return np.nan
    R = np.corrcoef(m.values, rowvar=False)
    if not np.all(np.isfinite(R)):
        return np.nan
    h2 = 1 - 1 / np.diag(np.linalg.pinv(R))  # squared multiple correlations as starting communalities
    for _ in range(iters):
        Rr = R.copy()
        np.fill_diagonal(Rr, h2)
        vals, vecs = np.linalg.eigh(Rr)
        lam = vecs[:, -1] * math.sqrt(max(vals[-1], 1e-9))
        new = np.clip(lam ** 2, 0.001, 0.999)
        if np.max(np.abs(new - h2)) < 1e-6:
            break
        h2 = new
    lam = np.abs(lam)
    return float(lam.sum() ** 2 / (lam.sum() ** 2 + (1 - lam ** 2).sum()))


def icc1(values, groups):
    """ICC(1) and ICC(k) from a one-way random-effects ANOVA."""
    d = pd.DataFrame({"v": values, "g": groups}).dropna()
    d = d[d.groupby("g")["v"].transform("count") >= 2]
    if d["g"].nunique() < 2:
        return np.nan, np.nan, 0
    gm, grand = d.groupby("g")["v"], d["v"].mean()
    n_g, k = gm.count(), d["g"].nunique()
    msb = (n_g * (gm.mean() - grand) ** 2).sum() / (k - 1)
    msw = ((d["v"] - gm.transform("mean")) ** 2).sum() / (len(d) - k)
    k0 = (len(d) - (n_g ** 2).sum() / len(d)) / (k - 1)  # average group size, adjusted for unequal n
    icc_1 = (msb - msw) / (msb + (k0 - 1) * msw) if (msb + (k0 - 1) * msw) > 0 else np.nan
    icc_k = (msb - msw) / msb if msb > 0 else np.nan
    return float(icc_1), float(icc_k), int(k)


def cohens_d(a, b):
    a, b = a.dropna(), b.dropna()
    if len(a) < 10 or len(b) < 10:
        return np.nan
    sp = math.sqrt(((len(a) - 1) * a.var() + (len(b) - 1) * b.var()) / (len(a) + len(b) - 2))
    return float((a.mean() - b.mean()) / sp) if sp > 0 else np.nan


def fmt(x, d=2):
    return "–" if x is None or (isinstance(x, float) and not np.isfinite(x)) else f"{x:.{d}f}"


def r_cell(r, lo, hi, p, n):
    if r is None:
        return f"– (n={n})"
    star = "**" if p is not None and p < .01 else "*" if p is not None and p < .05 else ""
    ci = f" [{fmt(lo)}, {fmt(hi)}]" if lo is not None else ""
    return f"{fmt(r)}{star}{ci} (n={n})"


# ---------------------------------------------------------------- scoring
def keyed(df):
    cols = {}
    for it in ITEMS:
        v = pd.to_numeric(df[it["id"]], errors="coerce") if it["id"] in df else pd.Series(np.nan, index=df.index)
        cols[it["id"]] = 6 - v if it["key"] == -1 else v
    return pd.DataFrame(cols, index=df.index)


def score_scales(k):
    return pd.DataFrame({sc: (k[[i["id"] for i in its]].mean(axis=1) - 1) / 4 * 100 for sc, its in SCALES.items()}, index=k.index)


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="+")
    ap.add_argument("--out", default="results")
    ap.add_argument("--min-minutes", type=float, default=8.0, help="exclude completions faster than this (speeding)")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    raw = pd.concat([pd.read_csv(f) for f in a.csv], ignore_index=True)
    L = [f"# Validation report: {INSTRUMENT['name']} ({INSTRUMENT['version']})", ""]

    # 1. sample & data quality -------------------------------------------------
    n0 = len(raw)
    col = lambda name, default: raw[name] if name in raw else pd.Series(default, index=raw.index)
    df = raw[pd.to_numeric(col("withdrawn", 0), errors="coerce").fillna(0) != 1].copy()
    n_w = n0 - len(df)
    df = df.drop_duplicates(subset="pid", keep="last")
    ac_fail = pd.to_numeric(df.get("ac_pass"), errors="coerce") < pd.to_numeric(df.get("ac_total"), errors="coerce")
    speed = pd.to_numeric(df.get("duration_sec"), errors="coerce") < a.min_minutes * 60
    sl = df.get("straightline_blocks", pd.Series("", index=df.index)).fillna("").astype(str).str.len() > 0
    keep = ~(ac_fail | speed | sl)
    L += ["## 1. Sample and data quality", "",
          "| | n |", "|---|---|",
          f"| Records received | {n0} |", f"| Withdrawn | {n_w} |", f"| Failed attention checks | {int(ac_fail.sum())} |",
          f"| Faster than {a.min_minutes:g} minutes | {int(speed.sum())} |", f"| Straight-lining | {int(sl.sum())} |",
          f"| **Analysed** | **{int(keep.sum())}** |", ""]
    df = df[keep].copy()
    if "mode" in df:
        L += ["Mode: " + ", ".join(f"{k} {v}" for k, v in df["mode"].value_counts().items()), ""]
    if len(df) < 30:
        L += ["> **Caution:** fewer than 30 usable responses. Treat all statistics below as a pipeline check, not evidence. Aim for n ≥ 200 for reliability and n ≥ 300 for criterion validity.", ""]

    k = keyed(df)
    S = score_scales(k)
    # criteria scored from items (higher stay = more intention to stay)
    crit = {c: S[c] for c in ["CR_pofit", "CR_teamfit", "CR_sat", "CR_stay", "CR_strain"] if c in S}

    # 2. reliability -----------------------------------------------------------
    item_rows, scale_rows = [], []
    for sc, its in SCALES.items():
        m = k[[i["id"] for i in its]]
        mm = m.dropna()
        alpha, omega = cronbach_alpha(m), omega_total(m)
        r_ii = float(mm.corr().values[np.triu_indices(len(its), 1)].mean()) if len(its) > 1 and len(mm) > 3 else np.nan
        scale_rows.append({"scale": sc, "label": LABEL.get(sc, sc), "items": len(its), "n": len(mm), "mean": S[sc].mean(), "sd": S[sc].std(),
                           "alpha": alpha, "omega": omega, "mean_inter_item_r": r_ii})
        if len(its) > 1:
            for it in its:
                rest = m.drop(columns=it["id"]).sum(axis=1)
                r_it, _ = pair_r(m[it["id"]], rest)
                a_del = cronbach_alpha(m.drop(columns=it["id"])) if len(its) > 2 else np.nan
                item_rows.append({"item": it["id"], "scale": sc, "key": it["key"], "text": it["text"], "mean_raw": pd.to_numeric(df[it["id"]], errors="coerce").mean(),
                                  "sd": m[it["id"]].std(), "r_item_total": r_it, "alpha_if_deleted": a_del})
    sst, ist = pd.DataFrame(scale_rows), pd.DataFrame(item_rows)
    sst.to_csv(out / "scale_stats.csv", index=False)
    ist.to_csv(out / "item_stats.csv", index=False)
    L += ["## 2. Internal consistency", "", "Targets: α and ω ≥ .70 (≥ .80 for scales used in decisions); corrected item–total r ≥ .30. Two-item and single-item scales are reported for information only.", "",
          "| Scale | Items | n | Mean | SD | α | ω | Mean inter-item r | Status |", "|---|---|---|---|---|---|---|---|---|"]
    for r in scale_rows:
        status = "single item" if r["items"] == 1 else "✓" if (r["alpha"] or 0) >= .70 else "review" if (r["alpha"] or 0) >= .60 else "revise"
        L.append(f"| {r['label']} (`{r['scale']}`) | {r['items']} | {r['n']} | {fmt(r['mean'], 1)} | {fmt(r['sd'], 1)} | {fmt(r['alpha'])} | {fmt(r['omega'])} | {fmt(r['mean_inter_item_r'])} | {status} |")
    weak = ist[ist["r_item_total"] < .30] if len(ist) else ist
    L += ["", f"Items with corrected item–total r < .30: **{len(weak)}**" + (" (see item_stats.csv): " + ", ".join(f"`{i}`" for i in weak["item"].head(20)) if len(weak) else "."), ""]

    # 3. test-retest -----------------------------------------------------------
    L += ["## 3. Test–retest reliability", ""]
    if "retest_of" in df and df["retest_of"].fillna("").astype(str).str.len().gt(0).any():
        pairs = df[df["retest_of"].fillna("").astype(str).str.len() > 0]
        S_all = score_scales(keyed(raw.drop_duplicates(subset="pid", keep="first").set_index("pid")))
        rows = []
        for sc in SCALES:
            a1 = S_all.reindex(pairs["retest_of"].values)[sc].values
            a2 = S.loc[pairs.index, sc].values
            r, n = pair_r(pd.Series(a1), pd.Series(a2))
            rows.append((sc, r, n))
        L += ["| Scale | r (time 1, time 2) | n pairs |", "|---|---|---|"] + [f"| {LABEL.get(s, s)} | {fmt(r)} | {n} |" for s, r, n in rows] + ["", "Target r ≥ .70 over 2–6 weeks.", ""]
    else:
        L += ["No retest pairs yet. Invite a subsample to retake the questionnaire after 2–6 weeks, entering their previous code.", ""]

    # 4. convergent validity ---------------------------------------------------
    conv = [("P_ES", "ext_hpi_adj", "HPI Adjustment"), ("P_E", "ext_hpi_soc", "HPI Sociability"), ("P_E", "ext_hpi_amb", "HPI Ambition"), ("P_A", "ext_hpi_ips", "HPI Interpersonal Sensitivity"),
            ("P_C", "ext_hpi_pru", "HPI Prudence"), ("P_O", "ext_hpi_inq", "HPI Inquisitive"), ("P_O", "ext_hpi_lrn", "HPI Learning Approach"),
            ("P_O", "ext_big5_O", "Other Big Five O"), ("P_C", "ext_big5_C", "Other Big Five C"), ("P_E", "ext_big5_E", "Other Big Five E"), ("P_A", "ext_big5_A", "Other Big Five A")]
    conv += [(f"MV_{m}", f"ext_mvpi_{m}", f"MVPI {m}") for m in ["rec", "pow", "hed", "alt", "aff", "tra", "sec", "com", "aes", "sci"]]
    conv += [(f"UP_{u}", f"ext_hds_{h}", f"HDS {h}") for u, h in [("vol", "excitable"), ("cyn", "skeptical"), ("cau", "cautious"), ("bol", "bold"), ("lim", "mischievous"), ("per", "diligent"), ("dep", "dutiful")]]
    L += ["## 4. Convergent validity (participants who entered other assessment scores)", "", "Expected: r ≥ .50 for the same construct (Big Five domains); r ≥ .30 for related constructs (HPI, MVPI, HDS analogues).", "",
          "| Questionnaire scale | Established measure | r [95% CI] |", "|---|---|---|"]
    any_conv = False
    for sc, col, lab in conv:
        if col in df:
            r, n = pair_r(S[sc], df[col])
            if n >= 4:
                any_conv = True
                L.append(f"| {LABEL.get(sc, sc)} | {lab} | {r_cell(*corr_ci(r, n), n)} |")
    if "ext_big5_N" in df:
        r, n = pair_r(-S["P_ES"], df["ext_big5_N"])
        if n >= 4:
            any_conv = True
            L.append(f"| Emotional Stability (reversed) | Other Big Five N | {r_cell(*corr_ci(r, n), n)} |")
    if not any_conv:
        L.append("| – | No participant has entered external scores yet | – |")
    L.append("")

    # 5. rater agreement within organisations -----------------------------------
    L += ["## 5. Agreement among raters of the same organisation", "", "ICC(1) > .05 indicates that culture ratings reflect a shared organisational property; ICC(k) ≥ .70 means the organisation mean is reliable.", ""]
    if "org_name" in df:
        org = df["org_name"].fillna("").astype(str).str.strip().str.lower()
        rows = []
        for sc in [s for s in SCALES if s.startswith(("OR_", "ON_", "OX_", "OE_"))]:
            i1, ik, g = icc1(S[sc].values, org.replace("", np.nan).values)
            rows.append((sc, i1, ik, g))
        if any(g >= 2 for *_, g in rows):
            L += ["| Scale | ICC(1) | ICC(k) | Organisations (≥2 raters) |", "|---|---|---|---|"] + [f"| {LABEL.get(s, s)} | {fmt(i1)} | {fmt(ik)} | {g} |" for s, i1, ik, g in rows]
        else:
            L.append("Not enough organisations with two or more raters yet.")
    L.append("")

    # 6. criterion validity ----------------------------------------------------
    preds = [("m_overall", "Overall fit"), ("m_team", "Team fit"), ("m_org", "Organisation fit"), ("m_vc_org", "Values congruence (org)"), ("m_friction", "Friction index"), ("m_majors", "Number of major mismatches")]
    expect = {"CR_strain": -1}
    L += ["## 6. Criterion validity (current-employee mode)", "", "Expected: fit indices correlate positively with perceived fit, satisfaction and intention to stay, and negatively with strain; friction and major mismatches show the reverse. Typical person–organisation fit validities are r ≈ .20–.45.", ""]
    cur = df["mode"].eq("current") if "mode" in df else pd.Series(True, index=df.index)
    if crit and cur.sum() >= 4:
        L += ["| Predictor | " + " | ".join(LABEL.get(c, c).replace(" (criterion)", "") for c in crit) + " |", "|---|" + "---|" * len(crit)]
        for col, lab in preds:
            if col in df:
                cells = [r_cell(*corr_ci(*pair_r(df.loc[cur, col], crit[c][cur])), pair_r(df.loc[cur, col], crit[c][cur])[1]) for c in crit]
                L.append(f"| {lab} | " + " | ".join(cells) + " |")
        # 7. incremental validity: model-derived vs. stated-preference fit
        pref = S[[f"CP_{q}" for q in QUADS]].clip(lower=1)
        lived = S[[f"OR_{q}" for q in QUADS]].clip(lower=1)
        pref_s, lived_s = pref.div(pref.sum(axis=1), axis=0) * 100, lived.div(lived.sum(axis=1), axis=0) * 100
        stated_fit = 100 - (pref_s.values - lived_s.values).__abs__().sum(axis=1)
        y = crit.get("CR_pofit")
        if y is not None and "m_org" in df:
            d = pd.DataFrame({"y": y, "model": pd.to_numeric(df["m_org"], errors="coerce"), "stated": stated_fit}, index=df.index)[cur].dropna()
            if len(d) >= 20:
                def r2(cols):
                    X = np.column_stack([np.ones(len(d))] + [d[c] for c in cols])
                    beta, *_ = np.linalg.lstsq(X, d["y"], rcond=None)
                    res = d["y"] - X @ beta
                    return 1 - res.var() / d["y"].var()
                L += ["", "### 7. Incremental validity for perceived person–organisation fit", "",
                      f"R² model-derived organisation fit = {fmt(r2(['model']))}; stated-preference fit = {fmt(r2(['stated']))}; both = {fmt(r2(['model', 'stated']))} (n={len(d)}).",
                      "If the stated-preference fit adds substantially, consider blending it into the engine."]
    else:
        L.append("No current-employee responses with criteria yet.")
    L.append("")

    # 8. report accuracy & public scan ----------------------------------------
    fb = [c for c in ["FB_self", "FB_org", "FB_team", "FB_fit", "FB_advice", "FB_public", "FB_decide"] if c in df]
    L += ["## 8. Report accuracy judged by participants", "", "Target: ≥ 70% agree (4–5) for each statement.", "", "| Statement | n | Mean (1–5) | % agree |", "|---|---|---|---|"]
    for c in fb:
        v = pd.to_numeric(df[c], errors="coerce").dropna()
        if len(v):
            L.append(f"| `{c}` | {len(v)} | {fmt(v.mean())} | {fmt((v >= 4).mean() * 100, 0)}% |")
    if all(f"scan_cvf_{q}" in df for q in QUADS):
        sc_ = df[[f"scan_cvf_{q}" for q in QUADS]].apply(pd.to_numeric, errors="coerce")
        lv = S[[f"OR_{q}" for q in QUADS]].clip(lower=1)
        lv = lv.div(lv.sum(axis=1), axis=0) * 100
        both = sc_.notna().all(axis=1) & cur
        if both.sum() >= 3:
            mad = (sc_[both].values - lv[both].values).__abs__().mean()
            L += ["", f"Public-scan vs. insider culture profile (current employees, n={int(both.sum())}): mean absolute difference **{fmt(mad, 1)} share points** per quadrant."]
            for q in QUADS:
                r, n = pair_r(sc_.loc[both, f"scan_cvf_{q}"], lv.loc[both, f"OR_{q}"])
                L.append(f"- {q}: r = {fmt(r)} (n={n})")
        # the other research lenses against what insiders rate
        def lens_mad(pre, items, label):
            if not all(f"{pre}_{q}" in df for q in QUADS) or not all(f"{items}_{q}" in S for q in QUADS):
                return
            a_ = df[[f"{pre}_{q}" for q in QUADS]].apply(pd.to_numeric, errors="coerce")
            b_ = S[[f"{items}_{q}" for q in QUADS]].clip(lower=1)
            b_ = b_.div(b_.sum(axis=1), axis=0) * 100
            ok = a_.notna().all(axis=1) & cur
            if ok.sum() >= 3:
                L.append(f"- {label} (n={int(ok.sum())}): mean absolute difference {fmt((a_[ok].values - b_[ok].values).__abs__().mean(), 1)} share points")
        L += ["", "Other research lenses vs. insiders:"]
        lens_mad("scan_esp_cvf", "OE", "Leadership statements vs. insiders' espoused culture")
        lens_mad("scan_team_cvf", "TC", "Function-level research vs. insiders' team culture")
        if "scan_review_rating" in df and "OX_rec" in S:
            r, n = pair_r(pd.to_numeric(df.loc[cur, "scan_review_rating"], errors="coerce"), S.loc[cur, "OX_rec"])
            L.append(f"- Review-platform rating vs. insiders' willingness to recommend: r = {fmt(r)} (n={n})")
        if "scan_str_employees" in df:
            L += ["", "Agreement by evidence strength of the employee lens (current employees):", "", "| Strength | n | MAD (share points) |", "|---|---|---|"]
            for lev in ["high", "moderate", "low"]:
                ok = both & (df["scan_str_employees"] == lev)
                if ok.sum() >= 3:
                    L.append(f"| {lev} | {int(ok.sum())} | {fmt((sc_[ok].values - lv[ok].values).__abs__().mean(), 1)} |")
            L.append("Strength ratings are useful if agreement improves from low to high.")
    if "m_pub_org" in df:
        crit_ = {c: S[c] for c in ["CR_pofit", "CR_sat", "CR_stay", "CR_strain"] if c in S}
        L += ["", "Does fit based on public research alone predict insiders' outcomes? (validity of the research for candidates who know little)", "", "| Predictor | " + " | ".join(LABEL.get(c, c) for c in crit_) + " |", "|---" * (len(crit_) + 1) + "|"]
        for m in ["m_pub_org", "m_pub_overall", "m_own_org"]:
            if m in df:
                L.append(f"| `{m}` | " + " | ".join(f"{fmt(pair_r(pd.to_numeric(df.loc[cur, m], errors='coerce'), v[cur])[0])} (n={pair_r(pd.to_numeric(df.loc[cur, m], errors='coerce'), v[cur])[1]})" for v in crit_.values()) + " |")
    L.append("")

    # 9. fairness screening & provisional norms --------------------------------
    L += ["## 9. Group differences (fairness screening)", "", "Cohen's d between groups; |d| ≥ .30 on a fit index warrants investigation of measurement bias before operational use.", ""]
    for col, a_lab, b_lab in [("demo_gender", "Woman", "Man")]:
        if col in df:
            g = df[col]
            rows = [(sc, cohens_d(S.loc[g == a_lab, sc], S.loc[g == b_lab, sc])) for sc in ["P_E", "P_A", "P_C", "P_ES", "P_O"]]
            rows += [(m, cohens_d(pd.to_numeric(df.loc[g == a_lab, m], errors="coerce"), pd.to_numeric(df.loc[g == b_lab, m], errors="coerce"))) for m in ["m_overall", "m_team", "m_org"] if m in df]
            L += [f"{a_lab} vs. {b_lab}: " + ", ".join(f"{LABEL.get(s, s)} d={fmt(d)}" for s, d in rows), ""]
    norms = S.quantile([.05, .10, .25, .50, .75, .90, .95]).T.round(1)
    norms.insert(0, "n", S.count())
    norms.to_csv(out / "norms.csv")
    L += ["## Provisional norms", "", f"Percentile points for each scale are in `norms.csv` (n = {len(S)}). Use them to convert scale scores to percentiles once n ≥ 300 in the relevant population; report norm group composition alongside them.", ""]

    (out / "validation_report.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"Wrote {out / 'validation_report.md'} ({int(keep.sum())} analysed of {n0})")


if __name__ == "__main__":
    main()
