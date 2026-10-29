"""SECTION 3 — Executive Report Dossier template (HTML/CSS, A4 print-ready).

Charts are inline SVG so the exported file prints and archives offline with no
JavaScript dependencies.
"""

import datetime as dt
import html
import math

import markdown as md

from .knowledge import APTITUDES, BUDGETS, EXAMS, MOTIVATORS, PATHWAY_BY_ID, RIASEC, RIASEC_ORDER, STAGE_ROADMAP, LIFE_STAGES
from .questions import mitigation_protocols
from .scoring import friction_points

OWNER = {
    "name": "Renuka Patil",
    "title": "Chief Mentor",
    "org": "Personality Researcher",
    "phone": "+91 9845051784",
    "city": "Bangalore, India",
}

TIER_LABELS = {
    "direct": ("Trajectory 1", "Direct High-Fit Pathway"),
    "hybrid": ("Trajectory 2", "Interdisciplinary Strategic Hybrid"),
    "frontier": ("Trajectory 3", "Emerging Growth Frontier"),
}

NAVY = "#1F3A5F"
GOLD = "#A8742A"
MUTED_BAR = "#B9C4D3"
GRID = "#DCE1E8"
INK = "#1D232B"
INK2 = "#5B6470"

e = html.escape


def band(v):
    return "Exceptional" if v >= 9 else "Strong" if v >= 7 else "Moderate" if v >= 5 else "Developing"


# --------------------------------------------------------------------------- charts
def radar_svg(aptitudes, size=320):
    keys = list(APTITUDES)
    cx = cy = size / 2
    r = size * 0.28
    n = len(keys)

    def pt(i, val):
        ang = -math.pi / 2 + 2 * math.pi * i / n
        return cx + r * val / 10 * math.cos(ang), cy + r * val / 10 * math.sin(ang)

    parts = [f'<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="Aptitude radar chart">']
    for ring in (2, 4, 6, 8, 10):
        pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, ring) for i in range(n)))
        parts.append(f'<polygon points="{pts}" fill="none" stroke="{GRID}" stroke-width="1"/>')
    for i in range(n):
        x, y = pt(i, 10)
        parts.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="{GRID}" stroke-width="1"/>')
    data = [pt(i, aptitudes.get(k, 0)) for i, k in enumerate(keys)]
    poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in data)
    parts.append(f'<polygon points="{poly}" fill="{NAVY}" fill-opacity="0.16" stroke="{NAVY}" stroke-width="2" stroke-linejoin="round"/>')
    for (x, y), k in zip(data, keys):
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{NAVY}" stroke="#fff" stroke-width="2"/>')
    for i, k in enumerate(keys):
        x, y = pt(i, 12.6)
        anchor = "middle" if abs(x - cx) < 10 else ("start" if x > cx else "end")
        parts.append(
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="11" fill="{INK2}">{e(APTITUDES[k]["short"])}'
            f'<tspan font-weight="700" fill="{INK}"> {aptitudes.get(k, 0)}</tspan></text>'
        )
    parts.append("</svg>")
    return "".join(parts)


def hbar_svg(rows, highlight, width=330, max_value=10, label_w=110):
    """rows: list of (label, value). Highlighted labels use the brand colour."""
    bar_h, gap = 16, 10
    height = len(rows) * (bar_h + gap) + 4
    plot_w = width - label_w - 34
    parts = [f'<svg viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="Bar chart">']
    for i, (label, value) in enumerate(rows):
        y = i * (bar_h + gap) + 2
        w = max(2, plot_w * value / max_value)
        color = NAVY if label in highlight else MUTED_BAR
        parts.append(f'<text x="{label_w - 8}" y="{y + bar_h - 4}" text-anchor="end" font-size="11" fill="{INK2}">{e(label)}</text>')
        parts.append(f'<rect x="{label_w}" y="{y}" width="{w:.1f}" height="{bar_h}" rx="4" fill="{color}"/>')
        parts.append(f'<text x="{label_w + w + 6:.1f}" y="{y + bar_h - 4}" font-size="11" font-weight="600" fill="{INK}">{value:g}</text>')
    parts.append("</svg>")
    return "".join(parts)


# --------------------------------------------------------------------------- content helpers
def rule_based_synthesis(profile, interview, tiers, ranked):
    name = (profile.get("name") or "The candidate").split()[0]
    apt = profile["aptitudes"]
    top = sorted(apt.items(), key=lambda kv: kv[1], reverse=True)
    strengths = ", ".join(f"{APTITUDES[k]['label']} ({v})" for k, v in top[:3])
    lines = [f"{name}'s cognitive profile is anchored by **{strengths}**."]
    fr = friction_points(profile)
    if fr:
        k, v, peak = fr[0]
        lines.append(
            f"The main friction point is **{APTITUDES[k]['label']} at {v}/10**, a {peak - v}-point gap from the peak. "
            f"This does not close any door; it means {APTITUDES[k]['short'].lower()} should be a supporting tool rather than the core of the chosen work, while it is deliberately trained.")
    code = profile.get("riasec_code")
    if code:
        lines.append("The Holland code **" + e(code) + "** (" + ", ".join(RIASEC[l]["name"] for l in code if l in RIASEC) +
                     ") points to environments that are " + "; ".join(RIASEC[l]["desc"].split(";")[0].rstrip(".").lower() for l in code[:2] if l in RIASEC) + ".")
    mots = profile.get("motivators", [])
    if mots:
        lines.append(f"Motivation is driven by **{', '.join(mots[:3])}**, so the right setting matters as much as the right subject.")
    if profile.get("archetype"):
        lines.append(f"Behaviourally, the **{e(profile['archetype'])}** style brings pace and initiative; the plan below builds in structure to protect follow-through.")
    picks = [PATHWAY_BY_ID[pid]["title"] for pid in tiers.values() if pid]
    if picks:
        lines.append("Taken together, the evidence converges on three avenues: **" + "**, **".join(picks) + "**.")
    return " ".join(lines)


def _short(text, limit=150):
    text = text.replace("*", "")
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def _list(items):
    return "<ul>" + "".join(f"<li>{e(str(i))}</li>" for i in items if i) + "</ul>" if items else "<p class='muted'>—</p>"


def _trajectory_card(tier, pid, ranked_by_id):
    p = PATHWAY_BY_ID[pid]
    r = ranked_by_id.get(pid, {})
    num, label = TIER_LABELS[tier]
    salary = "".join(
        f"<tr><td>{e(stage)}</td><td>{e(title)}</td><td class='num'>{e(sal)}</td></tr>"
        for stage, title, sal in zip(("Entry", "5–8 years", "Senior"), p["ladder"], p["salary"])
    )
    return f"""
<section class="traj avoid-break">
  <div class="traj-head"><span class="eyebrow">{num} · {label}</span><h3>{e(p['title'])}</h3>
  <span class="fit">Fit {r.get('score', '–')}/100</span></div>
  <div class="two">
    <div><h4>Why it fits</h4>{_list(r.get('reasons', []))}
      {('<h4>Watch-outs</h4>' + _list(r.get('cautions', []))) if r.get('cautions') else ''}
      <h4>Entry roles</h4><p>{e(', '.join(p['roles']))}</p>
      <h4>A typical week</h4><p>{e(p['workflow'])}</p></div>
    <div><h4>Career ladder &amp; indicative pay (INR / yr)</h4>
      <table class="data"><thead><tr><th>Stage</th><th>Role</th><th>Band</th></tr></thead><tbody>{salary}</tbody></table>
      <h4>Degrees</h4>{_list(p['degrees'])}
      <h4>Entrance exams</h4><p>{e(', '.join(p['exams']))}</p>
      <h4>Certifications &amp; proof-of-skill</h4><p>{e('; '.join(p['certs']))}</p></div>
  </div>
</section>"""


DOSSIER_CSS = """
:root{--navy:#1F3A5F;--gold:#A8742A;--ink:#1D232B;--ink2:#5B6470;--line:#DCE1E8;--wash:#F4F6F9;--paper:#fff}
*{box-sizing:border-box}
body{margin:0;background:#E9EDF2;color:var(--ink);font:10.5pt/1.5 "Inter","Segoe UI",system-ui,sans-serif}
.page{max-width:210mm;margin:0 auto;background:var(--paper);padding:14mm 14mm 16mm}
h1,h2,h3{font-family:"Source Serif 4",Georgia,serif;color:var(--navy);margin:0}
h2{font-size:15pt;border-bottom:2px solid var(--navy);padding-bottom:4px;margin:22px 0 10px}
h3{font-size:13pt}
h4{font-size:9pt;text-transform:uppercase;letter-spacing:.06em;color:var(--ink2);margin:10px 0 3px}
p{margin:4px 0 8px} ul{margin:4px 0 8px;padding-left:18px} li{margin:2px 0}
.masthead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid var(--navy);padding-bottom:10px}
.brand{font-family:"Source Serif 4",Georgia,serif;font-size:20pt;color:var(--navy);font-weight:700;line-height:1.1}
.brand small{display:block;font-family:Inter,sans-serif;font-size:9.5pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-top:4px}
.meta{text-align:right;font-size:9pt;color:var(--ink2)}
.conf{display:inline-block;border:1px solid var(--gold);color:var(--gold);font-size:8pt;letter-spacing:.1em;padding:1px 6px;border-radius:3px;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.cell{background:var(--wash);border-radius:6px;padding:8px 10px}
.cell .k{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:var(--ink2)}
.cell .v{font-weight:600;font-size:10.5pt}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.chart{display:flex;justify-content:center;align-items:flex-start;padding-top:8px}
.chart svg{max-width:100%;height:auto;overflow:visible}
table.data{width:100%;border-collapse:collapse;font-size:9.5pt;margin:4px 0 8px}
table.data th{background:var(--navy);color:#fff;text-align:left;padding:5px 7px;font-weight:600}
table.data td{border-bottom:1px solid var(--line);padding:5px 7px;vertical-align:top}
table.data td.num{white-space:nowrap;font-variant-numeric:tabular-nums}
.muted{color:var(--ink2)}
.pill{display:inline-block;background:var(--wash);border:1px solid var(--line);border-radius:999px;padding:1px 9px;margin:2px 4px 2px 0;font-size:9pt}
.traj{border:1px solid var(--line);border-left:5px solid var(--navy);border-radius:6px;padding:10px 14px;margin:12px 0}
.traj-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;margin-bottom:6px}
.eyebrow{font-size:8.5pt;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);font-weight:700;width:100%}
.fit{margin-left:auto;font-weight:700;color:var(--navy);font-size:10pt}
.narrative h2{font-size:12.5pt;border-bottom:1px solid var(--line);margin:16px 0 6px}
.narrative table{width:100%;border-collapse:collapse;font-size:9.5pt}
.narrative th,.narrative td{border:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.narrative th{background:var(--wash)}
.callout{background:var(--wash);border-left:4px solid var(--gold);padding:8px 12px;border-radius:4px}
.signoff{margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid var(--navy);padding-top:12px}
.signoff .sig{font-family:"Source Serif 4",Georgia,serif;font-size:14pt;color:var(--navy);font-weight:700}
.disclaimer{font-size:8pt;color:var(--ink2);margin-top:14px}
.avoid-break{break-inside:avoid;page-break-inside:avoid}
@page{size:A4;margin:12mm 10mm}
@media print{body{background:#fff}.page{padding:0;max-width:none}.no-print{display:none}
 *{-webkit-print-color-adjust:exact;print-color-adjust:exact} h2{break-after:avoid}}
@media (max-width:700px){.grid{grid-template-columns:1fr 1fr}.two{grid-template-columns:1fr}.page{padding:16px}}
.printbar{position:sticky;top:0;background:var(--navy);color:#fff;padding:8px 16px;text-align:right;font-size:10pt}
.printbar button{background:var(--gold);color:#fff;border:0;border-radius:4px;padding:6px 14px;font-weight:600;cursor:pointer}
"""


def render_dossier(profile, interview, ranked, tiers, insights, narrative_md="", counselor_summary="", further=None):
    name = profile.get("name") or "Candidate"
    today = dt.date.today().strftime("%d %B %Y")
    ranked_by_id = {r["id"]: r for r in ranked}
    apt = profile["aptitudes"]
    code = profile.get("riasec_code") or ""

    def cell(k, v):
        return f'<div class="cell"><div class="k">{e(k)}</div><div class="v">{e(v or "—")}</div></div>'

    baseline = " · ".join(x for x in [interview.get("stream"), interview.get("ug_major"), interview.get("current_role")] if x)
    grid = "".join([
        cell("Candidate", name), cell("Life stage", interview.get("stage", "")),
        cell("Holland code", code), cell("Archetype", profile.get("archetype", "")),
        cell("Motivators", ", ".join(profile.get("motivators", []))),
        cell("Report clusters", ", ".join(c for c in profile.get("careers", []) if c)),
        cell("Academic / work baseline", baseline), cell("Contact", " · ".join(x for x in [profile.get("phone"), profile.get("email")] if x)),
    ])

    apt_rows = "".join(
        f"<tr><td>{e(APTITUDES[k]['label'])}</td><td class='num'><b>{v}</b>/10</td><td>{band(v)}</td><td>{e(APTITUDES[k]['high'] if v >= 7 else APTITUDES[k]['low'])}</td></tr>"
        for k, v in sorted(apt.items(), key=lambda kv: kv[1], reverse=True)
    )
    riasec_rows = [(RIASEC[l]["name"], profile["riasec"].get(l, 0)) for l in sorted(RIASEC_ORDER, key=lambda l: -profile["riasec"].get(l, 0))]
    riasec_note = "" if profile.get("riasec_scored") else "<p class='muted' style='font-size:8.5pt'>Theme strengths approximated from the Holland code order.</p>"
    mot_html = "".join(f"<li><b>{e(m)}</b> — {e(MOTIVATORS.get(m, ''))}</li>" for m in profile.get("motivators", []))

    # Counselor observations
    obs = []
    if interview.get("likes"):
        obs.append(f"<p><b>Drawn towards:</b> " + "".join(f"<span class='pill'>{e(t)}</span>" for t in interview["likes"]) + "</p>")
    if interview.get("dislikes"):
        obs.append(f"<p><b>Resists:</b> " + "".join(f"<span class='pill'>{e(t)}</span>" for t in interview["dislikes"]) + "</p>")
    for label, key in (("Expressed nuances", "trait_notes"), ("Geography", "geography"), ("Budget", "budget"),
                       ("Candidate aspirations", "aspirations"), ("Family expectations", "parent_aspirations"),
                       ("Parental perspective", "parent_notes"), ("Constraints", "constraints"),
                       ("Clinical observations", "observations"), ("Confirmed direction", "confirmed_direction")):
        val = interview.get(key)
        if isinstance(val, list):
            val = ", ".join(val)
        if val:
            obs.append(f"<p><b>{label}:</b> {e(val)}</p>")
    discoveries = [i for i in insights if i["response"]]
    disc_rows = "".join(
        f"<tr><td>{e(_short(i['question']))}</td><td>{e(i['response'])}</td><td>{e(i['signal'])}</td></tr>" for i in discoveries
    )
    disc_html = (f"<h4>Key discoveries from the interview</h4><table class='data'><thead><tr><th style='width:38%'>Question</th><th>Candidate's response</th><th>Signal</th></tr></thead><tbody>{disc_rows}</tbody></table>"
                 if discoveries else "")

    # Raw HTML in the narrative is neutralised: it may come from an LLM or a paste.
    synthesis = md.markdown(narrative_md.replace("<", "&lt;"), extensions=["tables", "sane_lists"]) if narrative_md.strip() else \
        md.markdown(rule_based_synthesis(profile, interview, tiers, ranked))
    summary_html = f"<div class='callout'><b>Mentor's note.</b> {e(counselor_summary)}</div>" if counselor_summary else ""

    cards = "".join(_trajectory_card(t, pid, ranked_by_id) for t, pid in tiers.items() if pid)

    stage = interview.get("stage") or LIFE_STAGES[1]
    road_rows = "".join(f"<tr><td class='num'><b>{e(w)}</b></td><td>{e(t)}</td></tr>" for w, t in STAGE_ROADMAP.get(stage, []))

    geo = interview.get("geography", [])
    overseas = any("Overseas" in g for g in geo)
    inst_rows = ""
    exams_used = []
    for tier, pid in tiers.items():
        if not pid:
            continue
        p = PATHWAY_BY_ID[pid]
        inst_rows += (f"<tr><td><b>{e(p['title'])}</b></td><td>{_list(p['inst_local'][:4])}</td>"
                      f"<td>{_list(p['inst_india'][:4])}</td><td>{_list(p['inst_global'][:3])}</td></tr>")
        exams_used += [x for x in p["exams"] if x not in exams_used]
    exam_rows = "".join(
        f"<tr><td><b>{e(x)}</b></td><td>{e(EXAMS[x]['for'])}</td><td class='num'>{e(EXAMS[x]['window'])}</td><td>{e(EXAMS[x]['url'].replace('https://', ''))}</td></tr>"
        for x in exams_used if x in EXAMS
    )
    budget_note = ""
    if interview.get("budget") == BUDGETS[0]:
        budget_note = "<p class='callout'><b>Budget priority:</b> government-fee seats first — KCET government quota, IITs/NITs/IIITs (with fee waivers for eligible family incomes), IISc/IISERs (with INSPIRE-type scholarships), state agricultural universities and central universities via CUET.</p>"

    land_rows = "".join(
        f"<tr><td><b>{e(PATHWAY_BY_ID[pid]['title'])}</b></td><td>{e(', '.join(PATHWAY_BY_ID[pid]['roles'][:3]))}</td><td>{e(', '.join(PATHWAY_BY_ID[pid]['employers'][:6]))}</td></tr>"
        for pid in tiers.values() if pid
    )
    mit_rows = "".join(
        f"<tr><td><b>{e(m['issue'])}</b></td><td>{e(m['risk'])}</td><td>{e(m['protocol'])}</td><td>{e(m['measure'])}</td></tr>"
        for m in mitigation_protocols(profile)
    )
    further_rows = "".join(
        f"<tr><td class='num'>{i + 1}</td><td><b>{e(PATHWAY_BY_ID[r['id']]['title'])}</b><br><span class='muted'>{e(', '.join(PATHWAY_BY_ID[r['id']]['roles'][:2]))}</span></td>"
        f"<td><b>{e(r['level'])}</b><br><span class='muted'>{r['score']:.0f}/100</span></td><td>{e('; '.join(r['reasons'][:3]))}</td>"
        f"<td>{e(', '.join(PATHWAY_BY_ID[r['id']]['exams'][:3]))}</td></tr>"
        for i, r in enumerate(further or [])
    )
    plus = profile.get("plus_points") or []
    blind = profile.get("blind_spots") or []

    clip = lambda t: t if len(t) <= 36 else t[:35].rstrip() + "…"
    fit_rows = [(clip(r["title"]), r["score"]) for r in ranked[:8]]
    tier_titles = {clip(PATHWAY_BY_ID[pid]["title"]) for pid in tiers.values() if pid}

    llm_sections = bool(narrative_md.strip())
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Career Advisory Dossier — {e(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Source+Serif+4:wght@600;700&display=swap" rel="stylesheet">
<style>{DOSSIER_CSS}</style></head>
<body>
<div class="printbar no-print">Executive Career Advisory Dossier &nbsp; <button onclick="window.print()">Print / Save as PDF</button></div>
<div class="page">
<header class="masthead">
  <div class="brand">Personality Researcher<small>Executive Career Advisory Dossier</small></div>
  <div class="meta"><span class="conf">Confidential</span><br>Prepared for <b>{e(name)}</b><br>{today}</div>
</header>

<div class="grid">{grid}</div>

<h2>1. Candidate Diagnostic &amp; Aptitude Summary</h2>
<div class="two avoid-break">
  <div class="chart">{radar_svg(apt)}</div>
  <div><table class="data"><thead><tr><th>Aptitude</th><th>Score</th><th>Band</th><th>What it means</th></tr></thead><tbody>{apt_rows}</tbody></table></div>
</div>
<div class="two avoid-break">
  <div><h4>Holland RIASEC interest themes</h4>{hbar_svg(riasec_rows, {RIASEC[l]['name'] for l in code if l in RIASEC})}{riasec_note}</div>
  <div><h4>Core motivators (priority order)</h4><ol>{mot_html}</ol></div>
</div>
<div class="two avoid-break">
  <div><h4>Behavioural plus points</h4>{_list(plus)}</div>
  <div><h4>Development blind spots</h4>{_list(blind)}</div>
</div>

<h2>2. Counselor Clinical Observations</h2>
{''.join(obs) or "<p class='muted'>No interview notes recorded.</p>"}
{disc_html}

<h2>3. Strategic Synthesis</h2>
{summary_html}
<div class="narrative">{synthesis}</div>

<h2>4. Career Trajectories{' — Reference Cards' if llm_sections else ''}</h2>
{cards}

<h2>5. Educational Roadmap</h2>
<table class="data avoid-break"><thead><tr><th style="width:24%">When</th><th>Milestone</th></tr></thead><tbody>{road_rows}</tbody></table>

<h2>6. Institutional Matrix</h2>
{budget_note}
<table class="data"><thead><tr><th style="width:20%">Pathway</th><th>Bangalore / Karnataka</th><th>All-India</th><th>Global{'' if overseas else ' (benchmark)'}</th></tr></thead><tbody>{inst_rows}</tbody></table>
<h4>Entrance examinations to track</h4>
<table class="data"><thead><tr><th>Exam</th><th>Leads to</th><th>Typical window</th><th>Verify at</th></tr></thead><tbody>{exam_rows}</tbody></table>

<h2>7. Corporate &amp; Vocational Landing Zones</h2>
<table class="data"><thead><tr><th style="width:24%">Pathway</th><th>Entry job titles</th><th>Representative employers</th></tr></thead><tbody>{land_rows}</tbody></table>

<h2>8. Blind-Spot Mitigation Protocols</h2>
<table class="data"><thead><tr><th>Area</th><th>Risk</th><th>Protocol</th><th>Checkpoint</th></tr></thead><tbody>{mit_rows}</tbody></table>

<h2>9. Ten Further Career Options</h2>
<p class="muted">Beyond the three headline trajectories, these careers also suit the profile, in order of fit.</p>
<table class="data"><thead><tr><th>#</th><th style="width:30%">Career</th><th>Suitability</th><th>Why it suits</th><th>Entry route</th></tr></thead><tbody>{further_rows}</tbody></table>

<div class="avoid-break"><h2>Appendix · Pathway Fit Ranking</h2>
<p class="muted">Composite of aptitude, interest, motivator, cluster and behavioural fit, adjusted for interview evidence. Highlighted bars are the recommended trajectories.</p>
{hbar_svg(fit_rows, tier_titles, width=640, max_value=100, label_w=250)}</div>

<div class="signoff avoid-break">
  <div><div class="sig">{OWNER['name']}</div>{OWNER['title']}, <i>{OWNER['org']}</i><br>Phone: {OWNER['phone']} | {OWNER['city']}</div>
  <div class="meta">Signature<br><br>__________________________</div>
</div>
<p class="disclaimer">This dossier interprets psychometric results together with a structured counselling interview. Scores describe present tendencies, not fixed limits. Salary bands are indicative Indian-market ranges; entrance-exam windows, eligibility, cut-offs and fees change every cycle and must be confirmed on the official websites listed above before any application decision.</p>
</div></body></html>"""


def question_sheet_html(profile, questions):
    """Printable interview guide with space to write answers."""
    from .questions import SECTIONS
    name = profile.get("name") or "Candidate"
    blocks = []
    n = 0
    for section in SECTIONS:
        qs = [q for q in questions if q["section"] == section]
        if not qs:
            continue
        items = ""
        for q in qs:
            n += 1
            items += (f"<div class='q avoid-break'><p><b>{n}. {e(q['question'].replace('*', ''))}</b></p>"
                      f"<p class='muted'>Listen for: {e(q['listen'])}</p>"
                      "<div class='ans'></div><p class='sig'>☐ Confirms &nbsp; ☐ Partly &nbsp; ☐ Contradicts</p></div>")
        blocks.append(f"<h2>{e(section)}</h2>{items}")
    apt = ", ".join(f"{APTITUDES[k]['short']} {v}" for k, v in profile["aptitudes"].items())
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Interview Guide — {e(name)}</title><style>{DOSSIER_CSS}
.q{{border-bottom:1px solid var(--line);padding:6px 0 8px}} .ans{{height:52px;border:1px dashed var(--line);border-radius:4px;margin:4px 0}}
.sig{{font-size:9pt;color:var(--ink2)}}</style></head><body>
<div class="printbar no-print">Interview Guide &nbsp; <button onclick="window.print()">Print / Save as PDF</button></div>
<div class="page"><header class="masthead"><div class="brand">Personality Researcher<small>Counselling Interview Guide</small></div>
<div class="meta">Candidate <b>{e(name)}</b><br>Holland {e(profile.get('riasec_code') or '—')} · {e(apt)}</div></header>
{''.join(blocks)}
<p class="disclaimer">Prepared by {OWNER['name']}, {OWNER['title']}, {OWNER['org']} · {OWNER['phone']}</p></div></body></html>"""
