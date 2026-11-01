"""SYNTHETIC demonstration data - fictitious organisation, no real people or records.

Creates a requisition-level extract with deliberate data-quality defects
(duplicates, chronology errors, missing timestamps, open cases) so the
workspace's controls can be demonstrated.
"""
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 7


def make(n=480, start="2026-01-05", weeks=26, extract_date="2026-08-14", seed=SEED, id_offset=0, shortlist_shift=0.0):
    rng = np.random.default_rng(seed)
    t0 = pd.Timestamp(start)
    bu = rng.choice(["BU-A", "BU-B", "BU-C", "BU-D"], n, p=[0.3, 0.3, 0.25, 0.15])
    jf = rng.choice(["Engineering", "Operations", "Corporate", "Sales"], n, p=[0.35, 0.3, 0.2, 0.15])
    src = rng.choice(["Referral", "Job board", "Agency", "Internal", "Direct sourcing"], n)
    opened = t0 + pd.to_timedelta(rng.uniform(0, weeks * 7, n), unit="D")
    sl_med = np.where(jf == "Engineering", 14, np.where(jf == "Sales", 8, 9))
    shortlist = rng.lognormal(np.log(sl_med), 0.45) + shortlist_shift
    stalled = rng.random(n) < 0.08  # hiring manager has not progressed the shortlist
    interview = rng.lognormal(np.log(8), 0.5, n) + np.where(bu == "BU-C", 4, 0)
    offer = rng.lognormal(np.log(6), 0.55, n)
    rows = []
    extract = pd.Timestamp(extract_date)
    for i in range(n):
        o = opened[i]
        s = o + pd.Timedelta(days=float(shortlist[i]))
        iv = s + pd.Timedelta(days=float(interview[i]))
        of = iv + pd.Timedelta(days=float(offer[i]))
        acc = of + pd.Timedelta(days=float(rng.uniform(1, 6))) if rng.random() < 0.82 else pd.NaT
        status = "Filled" if pd.notna(acc) and acc <= extract else "Open"
        if rng.random() < 0.05:
            status, iv, of, acc = "Cancelled", pd.NaT, pd.NaT, pd.NaT
        if stalled[i]:
            iv, of, acc = pd.NaT, pd.NaT, pd.NaT
        ts = {"s": s, "iv": iv, "of": of, "acc": acc}
        for k in list(ts):
            if pd.notna(ts[k]) and ts[k] > extract:
                ts[k] = pd.NaT
        if status == "Open" and pd.notna(ts["acc"]):
            status = "Filled"
        if bu[i] == "BU-B" and rng.random() < 0.25:
            ts["iv"] = pd.NaT  # interview date not recorded in one unit (data-quality defect)
        rows.append({
            "Req ID": f"R{10000 + id_offset + i}", "Business Unit": bu[i], "Job Family": jf[i], "Source": src[i],
            "Recruiter Ref": f"REC-{rng.integers(1, 13):02d}", "Req Opened": o.round("min"),
            "First Shortlist": ts["s"], "First Interview": ts["iv"], "Offer Date": ts["of"],
            "Offer Accepted": ts["acc"], "Status": status,
        })
    df = pd.DataFrame(rows)
    for c in ["First Shortlist", "First Interview", "Offer Date", "Offer Accepted"]:
        df[c] = pd.to_datetime(df[c]).dt.round("min")
    # Deliberate defects
    dup = df.sample(6, random_state=seed)
    df = pd.concat([df, dup], ignore_index=True)
    bad = df[df["Offer Date"].notna()].sample(4, random_state=seed).index
    df.loc[bad, "Offer Date"] = df.loc[bad, "Req Opened"] - pd.Timedelta(days=3)
    return df


if __name__ == "__main__":
    out = Path(__file__).parent / "data"
    out.mkdir(exist_ok=True)
    make().to_csv(out / "SYNTHETIC_requisitions_extract_2026-08-14.csv", index=False)
    # Refresh extract: same history re-extracted 4 weeks later, plus 4 more weeks of requisitions
    # (summer cohort with a slower shortlist stage - to demonstrate a material change)
    a = make(extract_date="2026-09-11")
    b = make(n=70, start="2026-07-06", weeks=4, extract_date="2026-09-11", seed=99, id_offset=5000, shortlist_shift=12.0)
    pd.concat([a, b], ignore_index=True).to_csv(out / "SYNTHETIC_requisitions_extract_2026-09-11.csv", index=False)
    print("written to", out)
