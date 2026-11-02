"""Report-completeness checklist.

Works out what the final dossier still needs and turns each gap into either an
exact interview question (with where to record the answer) or a data-entry
task. The counsellor works down the list until the report is complete.
"""

from .knowledge import ASPIRATIONS, BUDGETS, FIELD_TAGS, GEOGRAPHY, LIFE_STAGES

# Report sections the items feed, in dossier order.
AREAS = [
    "Diagnostic summary",
    "Academic baseline",
    "Interests & preferences",
    "Study location & budget",
    "Aspirations & family alignment",
    "Validated strengths & friction points",
    "Career trajectories",
    "Counsellor observations & action plan",
]

# Questions whose answers the dossier needs, by id prefix or exact id.
MUST_ASK_PREFIXES = ("apt_", "fric_", "riasec_", "path_", "ready_", "kw_", "fu_", "cv_")
MUST_ASK_IDS = {"open_flow", "mot_tradeoff", "arch_check", "fam_hopes", "fam_free", "fam_gap", "close_choice", "close_action"}
QUESTION_AREA = {
    "cv_education": AREAS[1], "cv_": AREAS[5], "apt_": AREAS[5], "fric_": AREAS[5], "riasec_": AREAS[2], "path_": AREAS[6], "ready_": AREAS[6], "kw_": AREAS[6],
    "open_": AREAS[2], "mot_": AREAS[4], "arch_": AREAS[5], "fam_": AREAS[4], "close_": AREAS[7],
}


def _area_for(qid):
    base = qid[3:] if qid.startswith("fu_") else qid
    for prefix, area in QUESTION_AREA.items():
        if base.startswith(prefix):
            return area
    return AREAS[7]


def is_must_ask(qid):
    if qid in ("path_contact",) or qid.startswith("riasec_low_"):
        return False
    return qid in MUST_ASK_IDS or qid.startswith(MUST_ASK_PREFIXES)


def checklist(profile, interview, answers, questions):
    """Return a list of checklist items; each has ``done``."""
    P, I = profile, interview
    stage = I.get("stage") or LIFE_STAGES[1]
    school = stage in LIFE_STAGES[:2]
    items = []

    def data(key, label, done, where="① Candidate Matrix"):
        items.append({"id": f"data_{key}", "area": AREAS[0], "kind": "data", "label": label, "where": where, "done": bool(done)})

    def field(key, area, question, done, widget, options=None, who="Candidate"):
        items.append({"id": f"field_{key}", "area": area, "kind": "field", "field": key, "question": question,
                      "who": who, "widget": widget, "options": options, "done": bool(done)})

    data("name", "Candidate name", P.get("name"))
    data("aptitudes", "Aptitude scores from the report", any(v != 5 for v in P.get("aptitudes", {}).values()))
    data("riasec", "Holland (RIASEC) code", P.get("riasec_code"))
    data("motivators", "Core motivators", P.get("motivators"))
    data("archetype", "Behavioural archetype and traits", P.get("archetype") or P.get("traits"))
    data("careers", "Top career clusters from the report", any(P.get("careers", [])))
    data("contact", "Candidate phone or email", P.get("phone") or P.get("email"))

    if school:
        field("stream", AREAS[1], "Which stream and board are you in — for example PCMB under CBSE, or Commerce under the State board?",
              I.get("stream"), "text")
        field("marks", AREAS[1], "What were your Class 10 marks, and what are your latest school or mock-test scores in each main subject?",
              I.get("marks"), "text")
    else:
        field("ug_major", AREAS[1], "What did you study (or are you studying) at college — degree, major and institution?",
              I.get("ug_major"), "text")
        field("marks", AREAS[1], "What is your CGPA or final percentage, and which subjects did you score best in?", I.get("marks"), "text")
        if stage == LIFE_STAGES[4]:
            field("current_role", AREAS[1], "What is your current role and organisation, and how many years have you worked?",
                  I.get("current_role"), "text")

    field("likes", AREAS[2], "Looking at this list of subjects and activities, which do you genuinely enjoy — and which do you avoid?",
          I.get("likes") or I.get("dislikes"), "likes", FIELD_TAGS)
    field("geography", AREAS[3], "Where are you willing to study — stay in Bangalore, anywhere in Karnataka, anywhere in India, or abroad?",
          I.get("geography"), "multi", GEOGRAPHY)
    field("budget", AREAS[3], "(To parents) What annual education budget can the family plan for — government-fee seats only, up to ₹4 lakh, up to ₹10 lakh, or more with loans or scholarships?",
          I.get("budget"), "select", BUDGETS, who="Parent")
    field("aspirations", AREAS[4], "Ten years from now, what do you want your career to give you — research, your own business, a top corporate role, public service, creative freedom?",
          I.get("aspirations"), "multi", ASPIRATIONS)
    field("parent_aspirations", AREAS[4], "(To parents) What future do you picture for your child, and what worries you most about their career choice?",
          I.get("parent_aspirations"), "multi", ASPIRATIONS, who="Parent")
    field("constraints", AREAS[3], "Is there anything we must plan around — finances, health, relocation, family responsibilities, timelines?",
          I.get("constraints"), "text", who="Candidate / Parent")

    for q in questions:
        if not is_must_ask(q["id"]):
            continue
        a = answers.get(q["id"]) or {}
        items.append({"id": q["id"], "area": _area_for(q["id"]), "kind": "question", "question": q["question"], "q": q,
                      "who": "Candidate", "done": a.get("signal", "Not asked") != "Not asked"})

    field("observations", AREAS[7], "Counsellor: note your clinical observations — confidence, decision style, consistency with the report.",
          I.get("observations"), "area", who="Counsellor")
    field("confirmed_direction", AREAS[7], "Counsellor: record the direction and next steps agreed with the candidate and family.",
          I.get("confirmed_direction"), "area", who="Counsellor")
    return items


def score(items):
    done = sum(1 for i in items if i["done"])
    return done, len(items), round(100 * done / max(1, len(items)))
