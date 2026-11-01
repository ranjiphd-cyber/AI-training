"""Generate the ILLUSTRATIVE requisition dataset and run the DMAIC statistics.
Replace data/illustrative_requisitions.csv with real data and re-run to refresh results.json."""
import csv, json, math, random, sys, os
import numpy as np
from scipy import stats

OUT = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(42); random.seed(42)

BUS = ["Manufacturing", "Engineering & R&D", "Sales & Service", "Corporate Functions", "IT & Digital"]
BU_W = [0.30, 0.26, 0.18, 0.14, 0.12]
BU_SRC = {"Manufacturing": 0, "Engineering & R&D": 6, "Sales & Service": 2, "Corporate Functions": 1, "IT & Digital": 5}
LEVELS = ["Operator/Technician", "Professional", "Manager", "Senior Leader"]
LV_W = [0.32, 0.44, 0.18, 0.06]
LV_ADD = {"Operator/Technician": -3, "Professional": 0, "Manager": 5, "Senior Leader": 14}
CH = ["Employee Referral", "Job Board", "LinkedIn / Direct Sourcing", "Agency", "Internal Mobility"]
CH_W = [0.18, 0.30, 0.27, 0.13, 0.12]
CH_ADD = {"Employee Referral": -4, "Job Board": 2, "LinkedIn / Direct Sourcing": 0, "Agency": -1, "Internal Mobility": -6}
RECR = [f"R{i:02d}" for i in range(1, 9)]
REASONS = ["Hiring-manager feedback delay", "Interview scheduling / panel availability",
           "Requisition approval delay", "Offer & compensation approval", "Low / poor-fit applicant pool",
           "Candidate decline or renege", "JD / requirement changed mid-search"]

def gen(phase, n, start, months):
    rows = []
    for i in range(n):
        bu = rng.choice(BUS, p=BU_W); lv = rng.choice(LEVELS, p=LV_W); ch = rng.choice(CH, p=CH_W)
        rec = rng.choice(RECR)
        base_load = {"R01":14,"R02":22,"R03":17,"R04":27,"R05":15,"R06":20,"R07":25,"R08":16}[rec]
        if phase == "Baseline":
            load = int(max(8, rng.normal(base_load, 3)))
            rounds = int(np.clip(rng.choice([2,3,4,5], p=[.15,.35,.32,.18]) + (1 if lv in ("Manager","Senior Leader") else 0), 2, 6))
            appr = max(1, rng.gamma(2.2, 3.2))
            fb = max(0.5, rng.gamma(2.0, 2.4))            # avg HM feedback lag per round
        else:
            load = int(max(8, rng.normal(17, 2.2)))       # Heijunka: balanced workload
            rounds = int(np.clip(rng.choice([2,3], p=[.45,.55]) + (1 if lv == "Senior Leader" else 0), 2, 4))
            appr = max(0.5, rng.gamma(1.6, 1.4))           # pre-approved headcount plan
            fb = max(0.3, rng.gamma(1.6, 0.9))             # 48h feedback SLA + auto-nudge
        sourcing = max(2, rng.gamma(3.0, 2.6) + BU_SRC[bu] + CH_ADD[ch] * 0.6 + (0 if phase == "Baseline" else -1.5))
        screening = max(1, 1.5 + 0.28 * load + rng.normal(0, 1.6))
        interview = max(2, rounds * (2.2 + fb) + rng.normal(0, 1.5))
        offer = max(1, rng.gamma(2.0, 2.0 if phase == "Baseline" else 1.2) + max(0, LV_ADD[lv]) * 0.35)
        stage = dict(approval_days=appr, sourcing_days=sourcing, screening_days=screening, interview_days=interview, offer_days=offer)
        stage = {k: round(float(v), 1) for k, v in stage.items()}
        ttf = round(sum(stage.values()) + max(0, LV_ADD[lv]) * 0.5 + CH_ADD[ch] * 0.4, 1)
        ttf = max(12.0, ttf)
        # primary delay reason = biggest controllable excess
        w = np.array([fb*rounds*1.4, rounds*1.3, appr*1.1, offer*0.9, sourcing*0.55, 2.0, 1.4])
        reason = REASONS[int(rng.choice(len(REASONS), p=w/w.sum()))]
        accepted = "Y" if rng.random() < (0.80 - 0.004*max(0, ttf-40) if phase == "Baseline" else 0.88) else "N"
        day = int(rng.integers(0, months*30))
        d = np.datetime64(start) + np.timedelta64(day, "D")
        oa = d + np.timedelta64(int(round(ttf)), "D")
        rows.append(dict(req_id=f"{'B' if phase=='Baseline' else 'I'}-{i+1:04d}", phase=phase, req_open_date=str(d),
                         offer_accept_date=str(oa), business_unit=bu, job_level=lv, source_channel=ch, recruiter_id=rec,
                         recruiter_open_reqs=load, interview_rounds=rounds, **stage, ttf_days=ttf,
                         primary_delay_reason=reason, offer_accepted=accepted))
    rows.sort(key=lambda r: r["req_open_date"])
    return rows

base = gen("Baseline", 180, "2026-01-05", 6)
imp = gen("Improve", 90, "2026-07-27", 3)
rows = base + imp
cols = list(rows[0].keys())
with open(os.path.join(OUT, "illustrative_requisitions.csv"), "w", newline="") as f:
    wr = csv.DictWriter(f, fieldnames=cols); wr.writeheader(); wr.writerows(rows)

USL, TARGET, COV = 45.0, 35.0, 450.0   # days, days, EUR cost of vacancy per open day (assumption)
R = {"spec": {"USL": USL, "target": TARGET, "cost_of_vacancy_eur_day": COV}}

def ad(x):
    r = stats.anderson(x, "norm"); A2 = r.statistic; n = len(x)
    a = A2 * (1 + 0.75/n + 2.25/n**2)
    if a >= .6: p = math.exp(1.2937 - 5.709*a + 0.0186*a*a)
    elif a >= .34: p = math.exp(0.9177 - 4.279*a - 1.38*a*a)
    elif a >= .2: p = 1 - math.exp(-8.318 + 42.796*a - 59.938*a*a)
    else: p = 1 - math.exp(-13.436 + 101.14*a - 223.73*a*a)
    return A2, p

def capability(x):
    x = np.array(x); A2, p = ad(x); pd_ = float((x > USL).mean())
    med = float(np.median(x)); p99865 = float(np.percentile(x, 99.865)); p50 = med
    out = dict(n=len(x), mean=float(x.mean()), sd=float(x.std(ddof=1)), median=med,
               q1=float(np.percentile(x, 25)), q3=float(np.percentile(x, 75)), min=float(x.min()), max=float(x.max()),
               ad_A2=float(A2), ad_p=float(p), pct_over_usl=pd_, dpmo=pd_*1e6,
               z_bench=float(stats.norm.ppf(1 - pd_)) if 0 < pd_ < 1 else None,
               ppk_normal=float((USL - x.mean()) / (3 * x.std(ddof=1))),
               ppk_percentile=float((USL - p50) / (p99865 - p50)))
    # log-transform normality check
    A2l, pl = ad(np.log(x)); out["ad_log_p"] = float(pl)
    mr = np.abs(np.diff(x)); out["imr"] = dict(xbar=float(x.mean()), mrbar=float(mr.mean()),
        ucl=float(x.mean() + 2.66*mr.mean()), lcl=float(max(0, x.mean() - 2.66*mr.mean())), mr_ucl=float(3.267*mr.mean()),
        ooc=int(((x > x.mean()+2.66*mr.mean()) | (x < x.mean()-2.66*mr.mean())).sum()))
    return out

bt = np.array([r["ttf_days"] for r in base]); it = np.array([r["ttf_days"] for r in imp])
R["baseline"] = capability(bt); R["improve"] = capability(it)

# Stage funnel (median days per stage)
stg = ["approval_days","sourcing_days","screening_days","interview_days","offer_days"]
R["stages"] = {ph: {s: dict(median=float(np.median([r[s] for r in rs])), mean=float(np.mean([r[s] for r in rs]))) for s in stg}
               for ph, rs in (("Baseline", base), ("Improve", imp))}

def kw(field, rs):
    groups = {}
    for r in rs: groups.setdefault(r[field], []).append(r["ttf_days"])
    H, p = stats.kruskal(*groups.values())
    return dict(H=float(H), p=float(p), groups={k: dict(n=len(v), median=float(np.median(v))) for k, v in groups.items()})
R["kw_bu"] = kw("business_unit", base); R["kw_level"] = kw("job_level", base); R["kw_channel"] = kw("source_channel", base)
R["kw_recruiter"] = kw("recruiter_id", base)
# Mood's median: referral+internal vs others
g1 = [r["ttf_days"] for r in base if r["source_channel"] in ("Employee Referral","Internal Mobility")]
g2 = [r["ttf_days"] for r in base if r["source_channel"] not in ("Employee Referral","Internal Mobility")]
stat, p, med, tbl = stats.median_test(g1, g2); R["mood_channel"] = dict(chi2=float(stat), p=float(p), med1=float(np.median(g1)), med2=float(np.median(g2)), n1=len(g1), n2=len(g2))

# Regression TTF ~ rounds + load + approval_days (+ sourcing)
X = np.array([[r["interview_rounds"], r["recruiter_open_reqs"], r["approval_days"]] for r in base], float)
y = bt; Xd = np.column_stack([np.ones(len(X)), X]); beta, *_ = np.linalg.lstsq(Xd, y, rcond=None)
res = y - Xd @ beta; n, k = Xd.shape; sse = float(res @ res); sst = float(((y - y.mean())**2).sum())
r2 = 1 - sse/sst; r2a = 1 - (1-r2)*(n-1)/(n-k); s2 = sse/(n-k)
cov = s2 * np.linalg.inv(Xd.T @ Xd); se = np.sqrt(np.diag(cov)); t = beta/se; pv = 2*(1-stats.t.cdf(np.abs(t), n-k))
vifs = []
for j in range(X.shape[1]):
    o = np.delete(X, j, 1); od = np.column_stack([np.ones(len(o)), o]); b, *_ = np.linalg.lstsq(od, X[:, j], rcond=None)
    rr = X[:, j] - od @ b; r2j = 1 - (rr@rr)/(((X[:, j]-X[:, j].mean())**2).sum()); vifs.append(1/(1-r2j))
names = ["Interview rounds", "Recruiter open reqs", "Approval days"]
A2r, pr = ad(res)
R["regression"] = dict(r2=r2, r2_adj=r2a, s=math.sqrt(s2), resid_ad_p=pr, n=n,
    terms=[dict(term="Constant", coef=float(beta[0]), se=float(se[0]), t=float(t[0]), p=float(pv[0]), vif=None)] +
          [dict(term=names[j], coef=float(beta[j+1]), se=float(se[j+1]), t=float(t[j+1]), p=float(pv[j+1]), vif=float(vifs[j])) for j in range(3)])
R["spearman"] = {nm: dict(rho=float(stats.spearmanr(X[:, j], y)[0]), p=float(stats.spearmanr(X[:, j], y)[1])) for j, nm in enumerate(names)}

# Chi-square: offer accepted vs TTF band (<=45 / >45)
a = [[sum(1 for r in base if (r["ttf_days"] <= USL) == b and r["offer_accepted"] == o) for o in ("Y","N")] for b in (True, False)]
chi2, pchi, dof, _ = stats.chi2_contingency(a); R["chi_accept"] = dict(table=a, chi2=float(chi2), p=float(pchi), dof=int(dof))

# Pareto
from collections import Counter
c = Counter(r["primary_delay_reason"] for r in base); tot = sum(c.values()); cum = 0; par = []
for k_, v in c.most_common(): cum += v; par.append(dict(reason=k_, count=v, pct=v/tot, cum=cum/tot))
R["pareto"] = par

# Before/after
U, pmw = stats.mannwhitneyu(bt, it, alternative="greater"); st, pm, _, _ = stats.median_test(bt, it)
R["before_after"] = dict(mw_U=float(U), mw_p=float(pmw), mood_chi2=float(st), mood_p=float(pm),
    median_shift=float(np.median(bt) - np.median(it)))
# Levene for variance reduction
W, pl = stats.levene(bt, it); R["before_after"]["levene_W"] = float(W); R["before_after"]["levene_p"] = float(pl)
# Financials (annualised on 1,200 hires/yr assumption)
HIRES = 1200; days_saved = float(np.mean(bt) - np.mean(it))
R["financial"] = dict(annual_hires=HIRES, mean_days_saved=days_saved, cov=COV, annual_cov_avoided=days_saved*HIRES*COV)
R["accept_rate"] = dict(baseline=float(np.mean([r["offer_accepted"]=="Y" for r in base])), improve=float(np.mean([r["offer_accepted"]=="Y" for r in imp])))
json.dump(R, open(os.path.join(OUT, "results.json"), "w"), indent=1)
print(json.dumps({k: R[k] for k in ("baseline","improve","before_after","financial","accept_rate")}, indent=1, default=str)[:3500])
print(json.dumps({k: R[k] for k in ("kw_bu","kw_level","kw_recruiter","mood_channel","regression","chi_accept","pareto","stages")}, indent=0)[:6000])
