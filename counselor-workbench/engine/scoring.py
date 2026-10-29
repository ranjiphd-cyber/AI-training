"""Transparent fit scoring of every career pathway against the candidate.

Score (0–100) = 38% aptitude fit + 24% Holland fit + 14% motivator fit
              + 14% report-cluster match + 10% behavioural-trait fit
              + interview adjustments (likes, dislikes, aspirations, live answers).
Every component is returned so the counselor can explain *why* a pathway ranks.
"""

from .knowledge import APTITUDES, PATHWAYS, PATHWAY_BY_ID, RIASEC

WEIGHTS = {"aptitude": .38, "riasec": .24, "motivator": .14, "cluster": .14, "traits": .10}

ASPIRATION_MAP = {
    "Corporate leadership": ["consulting", "product_mgmt", "supply_chain", "finance"],
    "Entrepreneurship / own venture": ["entrepreneur", "product_mgmt", "agritech"],
    "Family business": ["entrepreneur", "consulting", "finance", "supply_chain"],
    "R&D / academia": ["life_research", "comp_bio", "aerospace", "climate", "geospatial"],
    "Government / public service / defence": ["civil_services", "law_policy"],
    "Creative / independent practice": ["ux_design", "architecture", "media"],
    "Social impact / non-profit": ["climate", "education", "psychology", "agritech"],
    "High-income specialist": ["software_ai", "finance", "consulting", "medicine", "law_policy"],
    "Global career / settle abroad": ["software_ai", "comp_bio", "data_science", "ux_design"],
}


def _cluster_match(pathway, careers):
    """1.0 when the pathway's home cluster is the report's #1 cluster; secondary links count less."""
    best = 0.0
    for weight, career in zip((1.0, .8, .6), careers):
        if not career:
            continue
        c = career.lower()
        for rank, cluster in enumerate(pathway["clusters"]):
            head = cluster.lower().split(",")[0].split("&")[0].strip()
            if head and (head in c or c in cluster.lower()):
                best = max(best, weight * (1.0 if rank == 0 else .45))
    return best


def effective_riasec(profile, effects):
    scores = dict(profile["riasec"])
    for letter, delta in effects.get("riasec", {}).items():
        scores[letter] = max(1, min(10, scores.get(letter, 4) + delta))
    return scores


def score_pathway(p, profile, interview, effects):
    apt = profile["aptitudes"]
    reasons, cautions = [], []

    apt_fit = sum(w * (apt.get(k, 5) - 1) / 9 for k, w in p["apt"].items())
    key_apts = sorted(p["apt"], key=p["apt"].get, reverse=True)[:2]
    reasons.append("Draws on " + " and ".join(f"{APTITUDES[k]['short']} {apt.get(k, 5)}" for k in key_apts))
    for k, w in p["apt"].items():
        if w >= .25 and apt.get(k, 5) <= 5:
            apt_fit -= .08
            cautions.append(f"Relies on {APTITUDES[k]['short']} (scored {apt.get(k, 5)})")

    rs = effective_riasec(profile, effects)
    riasec_fit = sum(w * (rs.get(l, 4) - 1) / 9 for w, l in zip((.5, .3, .2), p["riasec"]))
    code = profile.get("riasec_code", "")
    shared = [l for l in p["riasec"] if l in code]
    if shared:
        reasons.append("Holland match: " + ", ".join(RIASEC[l]["name"] for l in shared))

    mots = profile.get("motivators", [])
    if mots:
        hit = [m for m in mots if m in p["motivators"]]
        mot_fit = len(hit) / min(len(mots), 3)
        if hit:
            reasons.append("Feeds motivators: " + ", ".join(hit))
    else:
        mot_fit = .5

    cl_fit = _cluster_match(p, profile.get("careers", []))
    if cl_fit:
        reasons.append("Sits in a report career cluster")

    traits = profile.get("traits", [])
    tr_fit = (len([t for t in p["traits"] if t in traits]) / len(p["traits"])) if traits else .5

    components = {
        "aptitude": max(0, min(1, apt_fit)), "riasec": min(1, riasec_fit),
        "motivator": min(1, mot_fit), "cluster": cl_fit, "traits": tr_fit,
    }
    base = 100 * sum(WEIGHTS[k] * v for k, v in components.items())

    adj = 0.0
    likes = [t for t in interview.get("likes", []) if t in p["tags"]]
    dislikes = [t for t in interview.get("dislikes", []) if t in p["tags"]]
    if likes:
        adj += min(9, 3 * len(likes))
        reasons.append("Candidate enjoys: " + ", ".join(likes))
    if dislikes:
        adj -= min(18, 6 * len(dislikes))
        cautions.append("Candidate dislikes: " + ", ".join(dislikes))
    if p["numeracy"] == 3:
        if "Heavy mathematics" in interview.get("dislikes", []) and "Heavy mathematics" not in dislikes:
            adj -= 6
            cautions.append("Quant-heavy pathway vs stated dislike of heavy maths")
        if apt.get("numerical", 5) <= 5:
            adj -= 4
    for asp in interview.get("aspirations", []):
        if p["id"] in ASPIRATION_MAP.get(asp, []):
            adj += 4
            reasons.append(f"Fits aspiration: {asp}")
    for asp in interview.get("parent_aspirations", []):
        if p["id"] in ASPIRATION_MAP.get(asp, []):
            adj += 2
    live = effects.get("pathway", {}).get(p["id"], 0)
    if live:
        adj += live
        (reasons if live > 0 else cautions).append("Live interview signal " + ("confirmed interest" if live > 0 else "raised doubts"))

    return {
        "id": p["id"], "title": p["title"], "score": round(max(0, min(100, base + adj)), 1),
        "base": round(base, 1), "adjustment": round(adj, 1), "components": components,
        "reasons": reasons, "cautions": cautions,
    }


def rank_pathways(profile, interview, effects=None):
    effects = effects or {}
    results = [score_pathway(p, profile, interview, effects) for p in PATHWAYS]
    return sorted(results, key=lambda r: r["score"], reverse=True)


def pick_tiers(ranked, overrides=None):
    """Choose Direct / Hybrid / Frontier pathways; counselor overrides win."""
    overrides = overrides or {}
    chosen = {}
    used = set()

    def first(pred, fallback=True):
        for r in ranked:
            if r["id"] not in used and pred(r):
                return r["id"]
        return next((r["id"] for r in ranked if r["id"] not in used), None) if fallback else None

    kind = lambda r, t: t in PATHWAY_BY_ID[r["id"]]["kind"]
    for tier, preds in (
        ("direct", [lambda r: kind(r, "direct") and r["components"]["cluster"] > 0, lambda r: kind(r, "direct")]),
        ("hybrid", [lambda r: kind(r, "hybrid")]),
        ("frontier", [lambda r: kind(r, "frontier")]),
    ):
        pid = overrides.get(tier)
        for pred in preds:
            if not pid:
                pid = first(pred, fallback=False)
        pid = pid or first(lambda r: True)
        chosen[tier] = pid
        used.add(pid)
    return chosen


def friction_points(profile):
    """Gaps of 3+ points between the candidate's best and weaker aptitudes."""
    apt = profile["aptitudes"]
    top = max(apt.values())
    return [
        (k, v, top) for k, v in sorted(apt.items(), key=lambda kv: kv[1])
        if top - v >= 3 or v <= 5
    ]
