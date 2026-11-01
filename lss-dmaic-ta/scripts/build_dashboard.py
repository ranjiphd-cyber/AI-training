import json, csv, os
D = os.path.join(os.path.dirname(__file__), "..")
page = open(f"{D}/dashboard/src/page.html").read()
stats = open(f"{D}/dashboard/src/stats.js").read()
rows = list(csv.DictReader(open(f"{D}/data/illustrative_requisitions.csv")))
cols = list(rows[0].keys())
num = {"recruiter_open_reqs","interview_rounds","approval_days","sourcing_days","screening_days","interview_days","offer_days","ttf_days"}
sample = json.dumps({"cols": cols, "rows": [[float(r[c]) if c in num else r[c] for c in cols] for r in rows]}, separators=(",", ":"))
out = page.replace("/*__STATS__*/", stats).replace("/*__SAMPLE__*/null", sample)
open(f"{D}/dashboard/ttf_control_room.html", "w").write(out); print(len(out))
