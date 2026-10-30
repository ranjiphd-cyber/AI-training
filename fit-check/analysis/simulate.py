#!/usr/bin/env python3
"""Generate a synthetic responses CSV with the same columns as the study sheet.

Used to test validate.py end to end before real data exists. The data has known structure:
latent Big Five and motive traits drive item responses; organisations have a shared culture that
raters perceive with error; perceived fit, satisfaction and intention to stay depend on the true
person-culture distance; some participants entered Hogan scores; some are inattentive or retest.
Nothing here is evidence about the real instrument.

Usage: python3 simulate.py --n 400 --out sim_responses.csv
"""
import argparse
import json
import pathlib

import numpy as np
import pandas as pd

HERE = pathlib.Path(__file__).resolve().parent
INST = json.loads((HERE.parent / "src" / "instrument.json").read_text(encoding="utf-8"))
QUADS = ["clan", "adhoc", "market", "hier"]


def likert(z, rng, noise=0.85):
    return np.clip(np.rint(3 + 1.1 * z + rng.normal(0, noise, np.shape(z))), 1, 5).astype(int)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=400)
    ap.add_argument("--orgs", type=int, default=25)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="sim_responses.csv")
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    scales = sorted({i["scale"] for i in INST["items"] if i["scale"] != "CHECK"})
    org_lat = {o: {s: rng.normal(0, 0.9) for s in scales if s.startswith(("OR_", "ON_", "OX_", "OE_", "TC_", "TN_"))} for o in range(a.orgs)}
    rows = []
    for p in range(a.n):
        o = int(rng.integers(0, a.orgs))
        lat = {s: rng.normal() for s in scales if s.startswith(("P_", "MV_", "WS_", "CP_", "UP_"))}
        # true misfit: distance between preferred and lived culture (person's CP vs. organisation's OR)
        misfit = float(np.mean([abs(lat[f"CP_{q}"] - org_lat[o][f"OR_{q}"]) for q in QUADS]))
        lat.update({s: v + rng.normal(0, 0.5) for s, v in org_lat[o].items()})  # each rater perceives the shared culture with error
        fit_z = -(misfit - 1.0) / 0.5
        lat.update({"CR_pofit": 0.6 * fit_z + rng.normal(0, .8), "CR_teamfit": 0.4 * fit_z + rng.normal(0, .9), "CR_sat": 0.45 * fit_z + rng.normal(0, .9),
                    "CR_stay": 0.4 * fit_z + rng.normal(0, .9), "CR_strain": -0.35 * fit_z + rng.normal(0, .9)})
        r = {"pid": f"FC-{p:04d}-SIM{p % 10}", "instrument_version": INST["version"], "mode": "current" if rng.random() < .8 else "candidate",
             "duration_sec": int(rng.normal(1250, 300)), "consent_research": 1, "ac_total": 2, "ac_pass": 2, "straightline_blocks": "", "withdrawn": 0,
             "demo_gender": rng.choice(["Woman", "Man", "Prefer not to say"], p=[.45, .5, .05]), "org_name": f"Org {o:02d}"}
        careless = rng.random() < .05
        for it in INST["items"]:
            if it["scale"] == "CHECK":
                r[it["id"]] = 4 if not careless else int(rng.integers(1, 6))
                continue
            if it["scale"].startswith("CR_") and r["mode"] != "current":
                r[it["id"]] = ""
                continue
            z = lat.get(it["scale"], 0) * (it["key"] or 1)
            r[it["id"]] = int(rng.integers(1, 6)) if careless else int(likert(z, rng))
        r["ac_pass"] = sum(r[c] == 4 for c in ("AC1", "AC2"))
        if rng.random() < .03:
            r["duration_sec"] = int(rng.integers(150, 420))
        # model outputs: driven by the true misfit, with model error
        r["m_org"] = round(float(np.clip(70 + 9 * fit_z + rng.normal(0, 7), 0, 100)), 1)
        r["m_team"] = round(float(np.clip(72 + 6 * fit_z + rng.normal(0, 8), 0, 100)), 1)
        r["m_overall"] = round(0.5 * r["m_team"] + 0.4 * r["m_org"] + 0.1 * 60, 1)
        r["m_vc_org"] = round(float(np.clip(60 + 8 * fit_z + rng.normal(0, 10), 0, 100)), 1)
        r["m_friction"] = round(float(np.clip(40 - 6 * fit_z + rng.normal(0, 6), 0, 100)), 1)
        r["m_majors"] = int(max(0, round(1.2 - 0.8 * fit_z + rng.normal(0, .7))))
        for k in ("FB_self", "FB_org", "FB_team", "FB_fit", "FB_advice"):
            r[k] = int(np.clip(round(rng.normal(3.9, .8)), 1, 5))
        if rng.random() < .3:  # entered Hogan scores
            pct = lambda z: int(np.clip(round(50 + 28 * z + rng.normal(0, 12)), 1, 99))
            r.update({"ext_type": "hogan", "ext_hpi_adj": pct(lat["P_ES"]), "ext_hpi_soc": pct(lat["P_E"]), "ext_hpi_amb": pct(0.6 * lat["P_E"] + .4 * lat["P_C"]),
                      "ext_hpi_ips": pct(lat["P_A"]), "ext_hpi_pru": pct(lat["P_C"]), "ext_hpi_inq": pct(lat["P_O"]), "ext_hpi_lrn": pct(lat["P_O"])})
            for m in ("rec", "pow", "hed", "alt", "aff", "tra", "sec", "com", "aes", "sci"):
                r[f"ext_mvpi_{m}"] = pct(lat[f"MV_{m}"])
        if rng.random() < .5:  # public scan: noisy estimate of the shared culture
            raw = np.array([np.exp(0.5 * org_lat[o][f"OR_{q}"] + rng.normal(0, .25)) for q in QUADS])
            for q, v in zip(QUADS, raw / raw.sum() * 100):
                r[f"scan_cvf_{q}"] = round(float(v), 1)
        rows.append(r)
    df = pd.DataFrame(rows)
    # retest pairs: 40 participants retake with small change
    re = df.sample(40, random_state=a.seed).copy()
    item_cols = [i["id"] for i in INST["items"]]
    for c in item_cols:
        v = pd.to_numeric(re[c], errors="coerce")
        re[c] = np.where(v.notna(), np.clip(v + rng.choice([-1, 0, 0, 0, 1], len(v)), 1, 5), "")
    re["retest_of"], re["pid"] = re["pid"], [f"FC-R{i:03d}-SIMR" for i in range(len(re))]
    df = pd.concat([df, re], ignore_index=True)
    df.loc[df.sample(3, random_state=1).index, "withdrawn"] = 1
    df.to_csv(a.out, index=False)
    print(f"Wrote {a.out}: {len(df)} rows, {df.shape[1]} columns")


if __name__ == "__main__":
    main()
