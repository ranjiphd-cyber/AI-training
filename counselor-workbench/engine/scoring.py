"""Transparent fit scoring of every career pathway against the candidate.

Score (0–100) = 38% aptitude fit + 24% Holland fit + 14% motivator fit
              + 14% report-cluster match + 10% behavioural-trait fit
              + interview adjustments (likes, dislikes, aspirations, live answers).
Every component is returned so the counselor can explain *why* a pathway ranks.
"""

import re

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


# Words a candidate might say that point towards a pathway. Matched against
# everything typed in the interview (responses, nuances, observations).
KEYWORDS = {
    "software_ai": ["coding", "programming", "software", "app", "apps", "python", "java", "ai", "machine learning", "computer", "website", "algorithm"],
    "data_science": ["data", "statistics", "analytics", "excel", "patterns", "numbers", "dashboard", "prediction"],
    "comp_bio": ["genetics", "dna", "genome", "bioinformatics", "protein", "biology", "drug discovery", "biotech"],
    "agritech": ["farm", "farming", "agriculture", "crops", "soil", "plants", "drone", "drones", "irrigation", "village", "food"],
    "ux_design": ["design", "designing", "ui", "ux", "figma", "user experience", "interface", "drawing", "sketch"],
    "architecture": ["architecture", "buildings", "building design", "interiors", "city", "cities", "construction", "spaces"],
    "robotics": ["robot", "robots", "robotics", "arduino", "machines", "electronics", "mechanical", "automation", "cars", "ev", "engines"],
    "aerospace": ["space", "rocket", "rockets", "satellite", "aircraft", "planes", "isro", "astronomy", "flying", "aviation"],
    "life_research": ["research", "lab", "laboratory", "experiment", "experiments", "science", "biology", "chemistry", "scientist"],
    "medicine": ["doctor", "medicine", "medical", "hospital", "patients", "surgery", "neet", "mbbs", "health", "nursing"],
    "biomed": ["medical devices", "healthcare technology", "prosthetic", "biomedical", "health tech", "wearable"],
    "psychology": ["psychology", "counselling", "counseling", "mind", "behaviour", "behavior", "mental health", "listening", "therapy"],
    "consulting": ["strategy", "consulting", "consultant", "business problems", "case study", "mba", "corporate"],
    "product_mgmt": ["product", "startup idea", "user needs", "launch", "product manager", "roadmap"],
    "entrepreneur": ["business", "startup", "own company", "entrepreneur", "selling", "sell", "venture", "family business", "shop"],
    "finance": ["finance", "stocks", "investing", "money", "accounts", "ca", "banking", "trading", "economics"],
    "law_policy": ["law", "lawyer", "legal", "justice", "policy", "debate", "debating", "rights", "constitution", "mun"],
    "media": ["writing", "journalism", "news", "content", "youtube", "videos", "blog", "podcast", "storytelling", "film", "social media"],
    "climate": ["climate", "environment", "sustainability", "pollution", "nature", "wildlife", "forest", "renewable", "solar", "recycling"],
    "geospatial": ["maps", "mapping", "gis", "geography", "satellite images", "navigation", "terrain"],
    "cyber": ["hacking", "security", "cybersecurity", "ethical hacking", "privacy", "networks", "ctf"],
    "supply_chain": ["logistics", "operations", "supply chain", "warehouse", "planning", "delivery", "organising"],
    "education": ["teaching", "teach", "teacher", "tutoring", "explaining", "students", "children", "kids", "education"],
    "civil_services": ["ias", "ips", "upsc", "civil services", "army", "navy", "air force", "defence", "nda", "government", "public service"],
}
NEGATIONS = r"(?:hate|hates|don'?t like|do not like|dislike|dislikes|not interested|boring|bored|never want|avoid|scared of|not good at)"


def text_signals(text):
    """Return {pathway_id: (positive_hits, negative_hits)} from free-text interview notes."""
    low = " " + (text or "").lower() + " "
    found = {}
    for pid, words in KEYWORDS.items():
        pos, neg = [], []
        for w in words:
            for m in re.finditer(rf"(?<![a-z]){re.escape(w)}(?![a-z])", low):
                before = re.split(r"[.;!?,]|\bbut\b|\band\b", low[max(0, m.start() - 30): m.start()])[-1]
                (neg if re.search(NEGATIONS, before) else pos).append(w)
        if pos or neg:
            found[pid] = (sorted(set(pos)), sorted(set(neg)))
    return found


def suitability(score):
    """Map a 0–100 fit score to a counselling-friendly suitability level."""
    if score >= 85:
        return "Very high"
    if score >= 75:
        return "High"
    if score >= 65:
        return "Moderate"
    if score >= 55:
        return "Possible with effort"
    return "Low"


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
    pos, neg = effects.get("keywords", {}).get(p["id"], ([], []))
    if pos:
        adj += min(6, 2 * len(pos))
        reasons.append("Mentioned in interview: " + ", ".join(pos[:4]))
    if neg:
        adj -= min(9, 3 * len(neg))
        cautions.append("Spoke negatively about: " + ", ".join(neg[:4]))
    live = effects.get("pathway", {}).get(p["id"], 0)
    if live:
        adj += live
        (reasons if live > 0 else cautions).append("Live interview signal " + ("confirmed interest" if live > 0 else "raised doubts"))

    return {
        "id": p["id"], "title": p["title"], "score": round(max(0, min(100, base + adj)), 1),
        "base": round(base, 1), "adjustment": round(adj, 1), "components": components,
        "reasons": reasons, "cautions": cautions, "level": suitability(max(0, min(100, base + adj))),
    }


def rank_pathways(profile, interview, effects=None):
    effects = dict(effects or {})
    notes = " ".join(str(interview.get(k, "")) for k in ("trait_notes", "observations", "confirmed_direction", "parent_notes", "constraints"))
    effects["keywords"] = text_signals(notes + "\n" + effects.get("text", ""))
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


def further_careers(ranked, tiers, n=10):
    """The next-best careers after the three headline trajectories."""
    chosen = set(tiers.values())
    return [r for r in ranked if r["id"] not in chosen][:n]
