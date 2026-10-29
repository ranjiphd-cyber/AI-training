"""Interview question bank, live answer effects and candidate guidance.

Questions are generated from the candidate's own scores, so every session is
tailored. Each recorded answer carries a counselor *signal* (Confirms / Partly
/ Contradicts). Signals feed back into scoring and surface follow-up probes.
"""

from .knowledge import APTITUDES, LIFE_STAGES, MOTIVATORS, PATHWAY_BY_ID, PATHWAYS, RIASEC, TRAITS
from .scoring import friction_points

SIGNALS = ["Not asked", "Confirms", "Partly", "Contradicts"]

SECTIONS = [
    "1 · Opening & context",
    "2 · Validate cognitive strengths",
    "3 · Probe friction points",
    "4 · Interest themes (Holland)",
    "5 · Motivators & values",
    "6 · Personality & work style",
    "7 · Pathway reality-testing",
    "8 · Family, constraints & alignment",
    "9 · Closing commitments",
]

STAGE_OPENERS = {
    LIFE_STAGES[0]: "Which subjects do you look forward to, and which do you dread? What makes the difference — the subject, the teacher or how you're tested?",
    LIFE_STAGES[1]: "Which entrance exams are you preparing for right now, and how are your mock scores trending?",
    LIFE_STAGES[2]: "Which course, project or internship so far felt most like 'you' — and which felt like a chore?",
    LIFE_STAGES[3]: "What roles or programs have you applied to, and what feedback or responses have you received?",
    LIFE_STAGES[4]: "If you could redesign your current job, what would you keep and what would you drop tomorrow?",
}

APTITUDE_PROBES = {
    "acuteness": "Do you notice errors others miss — in documents, code, measurements or people's arguments? Give me a recent example.",
    "verbal": "Do you enjoy reading, writing, debating or explaining ideas? What's the last thing you wrote or argued that you were proud of?",
    "critical": "When you face a messy problem, how do you break it down? Walk me through one you solved recently.",
    "spatial": "Do you enjoy sketching, assembling things, 3D games, building models or reading maps? What have you designed or built?",
    "numerical": "How comfortable are you estimating numbers, working with data or doing mental maths under time pressure?",
}

RIASEC_PROBES = {
    "R": "Do you prefer building, fixing or working outdoors over discussing ideas? What have you made or repaired with your hands?",
    "I": "When something puzzles you — a news story, a gadget, an illness — do you go and dig into *why*? Tell me about the last time.",
    "A": "What do you create when nobody asks you to — art, music, writing, videos, designs?",
    "S": "Do friends come to you for advice or help? Do you enjoy teaching or looking after others?",
    "E": "Have you ever sold something, led a team or convinced people to back your idea? How did it feel?",
    "C": "Do you enjoy organising — notes, spreadsheets, collections, schedules? Does a messy system bother you?",
}

MOTIVATOR_PROBES = {
    "Interest": "Think of a subject you stopped caring about. What killed the interest — and how fast did it happen?",
    "Challenge": "What is the hardest thing you have worked on voluntarily? What kept you going?",
    "Freedom": "How do you react when a teacher or boss tells you exactly *how* to do something?",
    "Money": "What does 'financially successful' look like for you at 30 — in actual numbers?",
    "Respect": "Whose respect matters most to you — family, peers, experts or society at large?",
    "Stability": "How would you feel about a career with high reward but uncertain income for the first five years?",
    "Service": "What problem in society would you most like your work to fix?",
    "Creativity": "When did you last make something original? How important is it that your work carries your stamp?",
    "Recognition": "What kind of recognition would feel meaningful — awards, a title, public visibility, or quiet respect?",
    "Power": "Do you want to be the one who makes the final call? In what situations?",
    "Security": "What would a 'safe' career look like to you and your family?",
    "Learning": "What have you taught yourself in the last six months, without being asked?",
}

MOTIVATOR_ADVICE = {
    "Interest": "Your engagement drops sharply when work stops being fascinating. Choose a field with deep, evolving problems and build in a new learning frontier every 12–18 months.",
    "Challenge": "You need stretch. Seek competitive programs, hard internships and roles with steep learning curves; boredom is your biggest career risk, not difficulty.",
    "Freedom": "You perform best with ownership. Favour research labs, start-ups, product teams or independent practice; avoid rigid hierarchies in your first role where you can.",
    "Money": "Financial outcomes matter to you — that is legitimate. Prioritise pathways with strong compounding pay and learn negotiation early.",
    "Respect": "Professional standing motivates you. Credentials from reputed institutions and visible expertise will matter; invest in them deliberately.",
    "Stability": "Predictability matters. Prefer pathways with structured ladders and employer depth; build a financial buffer before any risky pivot.",
    "Service": "Purpose fuels you. Choose organisations whose mission you can explain proudly; volunteer or intern in impact settings early.",
    "Creativity": "You need room to originate. Keep a portfolio of self-initiated work and pick roles where you shape outcomes, not just execute them.",
    "Recognition": "Visible acknowledgement energises you. Choose environments with clear milestones and showcase opportunities (competitions, publications, demo days).",
    "Power": "You want influence. Build leadership experience early (clubs, projects, teams) and target roles with decision rights.",
    "Security": "You value safety. Map the downside of each option explicitly and keep a 'Plan B' credential alongside your main pathway.",
    "Learning": "Growth is your fuel. Pick employers known for training and mentorship, and set a personal learning target every quarter.",
}

TRAIT_PROBES = {
    "Factual": "Have you ever been told you're too blunt or 'only logical'? When did that happen?",
    "Feeling": "How do you handle a decision that you know will upset someone close to you?",
    "Spontaneous": "How many things have you started in the last year — and how many did you finish?",
    "Planned": "What happens to your mood and output when plans change at the last minute?",
    "Assertive": "When your team disagrees with your plan, what do you usually do?",
    "Accommodating": "When did you last push hard for your own idea against the group?",
    "Gregarious": "How long can you work alone on something before you need people around?",
    "Reserved": "How comfortable are you presenting your work to a room of strangers?",
}


def _q(qid, section, question, why, listen, effect=None, followups=None):
    return {
        "id": qid, "section": section, "question": question, "why": why, "listen": listen,
        "effect": effect, "followups": followups or {},
    }


def build_questions(profile, interview, tier_ids):
    """Return the tailored question list for this candidate."""
    apt = profile["aptitudes"]
    qs = []
    s = SECTIONS

    qs.append(_q("open_agenda", s[0], "Before we look at any scores — what decision are you trying to make, and what would make today worth your time?",
                 "Sets the agenda and reveals urgency.", "Specific decision vs. general anxiety; whose agenda it really is (candidate or parent)."))
    qs.append(_q("open_flow", s[0], "Describe a moment in the last month when you completely lost track of time. What were you doing?",
                 "Flow states are the most reliable signal of genuine interest.", "Activity type (people / ideas / things / data) and whether it matches the Holland code."))
    stage = interview.get("stage") or LIFE_STAGES[1]
    qs.append(_q("open_stage", s[0], STAGE_OPENERS.get(stage, STAGE_OPENERS[LIFE_STAGES[1]]),
                 "Grounds the discussion in the candidate's actual situation.", "Concrete evidence: marks, mock scores, projects, feedback."))

    ranked_apts = sorted(apt.items(), key=lambda kv: kv[1], reverse=True)
    for key, value in ranked_apts[:2]:
        meta = APTITUDES[key]
        qs.append(_q(f"apt_{key}", s[1],
                     f"Your {meta['label']} is {value}/10 — one of your strongest. {APTITUDE_PROBES[key]}",
                     f"Checks that the measured strength is visible in real life. {meta['high']}",
                     "A specific, recent example (not a generic 'yes').",
                     followups={
                         "Confirms": f"Anchor the Direct pathway on {meta['short']}; record the example verbatim for the dossier.",
                         "Partly": "Strength is emerging — prescribe one project that will exercise it within 60 days.",
                         "Contradicts": "Latent strength: ask what has hidden it (exam pressure, medium of instruction, no opportunity). Plan one experience to surface it before ruling it out.",
                     }))

    for key, value, top in friction_points(profile)[:2]:
        meta = APTITUDES[key]
        effect = {"type": "numeracy"} if key == "numerical" else None
        qs.append(_q(f"fric_{key}", s[2],
                     f"Your {meta['label']} ({value}/10) sits well below your top score of {top}. How do you feel about {meta['short'].lower()} tasks — is it the subject itself, speed, confidence or how it was taught?",
                     f"Separates skill gap from anxiety or disinterest. {meta['low']}",
                     "Emotional tone (avoidance vs. indifference), school marks in related subjects, willingness to train.",
                     effect=effect,
                     followups={
                         "Confirms": f"Real friction. Prefer pathways where {meta['short'].lower()} is a tool, not the core. Share the mitigation protocol: {meta['builds']}",
                         "Partly": "Situational friction — set a 6-week practice target and re-check before excluding quant-heavy options.",
                         "Contradicts": "Possible test-day underperformance. Cross-check board marks; keep quant-heavy pathways open and consider re-assessment after practice.",
                     }))

    code = (profile.get("riasec_code") or "")[:3]
    for i, letter in enumerate(code):
        if letter not in RIASEC:
            continue
        qs.append(_q(f"riasec_{letter}", s[3],
                     f"[{RIASEC[letter]['name']}] {RIASEC_PROBES[letter]}",
                     f"Validates Holland theme #{i + 1}. {RIASEC[letter]['desc']}",
                     "Lived examples and energy in the voice; does it sound like *their* interest or a family script?",
                     effect={"type": "riasec", "key": letter, "Confirms": .5, "Partly": 0, "Contradicts": -2},
                     followups={
                         "Confirms": f"Keep {RIASEC[letter]['name']} as a design constraint for every shortlisted pathway.",
                         "Contradicts": f"De-weight {RIASEC[letter]['name']} (the score has been reduced) and ask which activity they would swap it for.",
                     }))
    low = min(profile["riasec"], key=profile["riasec"].get)
    if low not in code:
        qs.append(_q(f"riasec_low_{low}", s[3],
                     f"Your report shows {RIASEC[low]['name']} as a low interest ({RIASEC[low]['desc'].split(';')[0].lower()}). Does that sound right, or is there something here you actually enjoy?",
                     "Checks for hidden interests the instrument may have missed.",
                     "Surprise reactions are informative.",
                     effect={"type": "riasec", "key": low, "Confirms": 0, "Partly": 1, "Contradicts": 2},
                     followups={"Contradicts": f"Raise {RIASEC[low]['name']} (applied) and look for hybrid pathways that include it."}))

    mots = profile.get("motivators", [])
    for m in mots[:3]:
        qs.append(_q(f"mot_{m}", s[4], f"[{m}] {MOTIVATOR_PROBES.get(m, 'How important is ' + m.lower() + ' in your choices?')}",
                     MOTIVATORS.get(m, ""), "Is this motivator truly theirs? How strongly does it show up in past decisions?",
                     followups={"Contradicts": f"Report lists {m} but the candidate disowns it — ask what they would rank first instead and update the motivators list."}))
    if len(mots) >= 2:
        qs.append(_q("mot_tradeoff", s[4], f"If you had to give up one of {', '.join(mots[:3])} in your first job, which would it be — and why?",
                     "Forces a real priority order for the dossier.", "The sacrificed motivator and the reasoning."))

    traits = profile.get("traits", [])
    if profile.get("archetype") or traits:
        qs.append(_q("arch_check", s[5],
                     f"Your profile describes you as '{profile.get('archetype') or ' + '.join(traits)}' — {', '.join(traits) or 'see report'}. In a group project, does that describe you? What would your friends add?",
                     "Self-recognition makes the archetype usable in coaching.", "Agreement plus the nuance they add."))
    for t in traits[:4]:
        if t in TRAIT_PROBES:
            qs.append(_q(f"trait_{t}", s[5], f"[{t}] {TRAIT_PROBES[t]}",
                         f"Plus: {TRAITS[t]['plus']} Blind spot: {TRAITS[t]['blind']}",
                         "Is the blind spot already costing them? Concrete incidents.",
                         followups={"Confirms": f"Blind spot is active — coach: {TRAITS[t]['fix']}"}))

    for tier, pid in tier_ids.items():
        if not pid:
            continue
        p = PATHWAY_BY_ID[pid]
        qs.append(_q(f"path_{pid}", s[6],
                     f"Picture a typical week in {p['title']} (e.g. as {p['roles'][0]}): {p['workflow']} What excites you, and what worries you?",
                     f"Reality-tests the {tier.title()} pathway against the actual daily work.",
                     "Concrete excitement about the *work*, not just the title or salary.",
                     effect={"type": "pathway", "key": pid, "Confirms": 6, "Partly": 2, "Contradicts": -10},
                     followups={
                         "Confirms": f"Shadow or interview one {p['roles'][0]} within 30 days; shortlist the entrance route ({', '.join(p['exams'][:3])}).",
                         "Contradicts": "Fit score lowered. Ask what specifically put them off — the work, the environment or the study route — and check the next-ranked pathway.",
                     }))
    qs.append(_q("path_contact", s[6], "Have you spoken to anyone actually working in any of these fields? What did you learn?",
                 "Exposes second-hand assumptions.", "Names, roles and specifics; plan informational interviews if none."))

    qs.append(_q("fam_hopes", s[7], "What do your parents hope you will become — and what do *you* honestly think of that?",
                 "Surfaces alignment or hidden conflict early.", "Tone when describing parental expectations; agreement vs. compliance."))
    qs.append(_q("fam_free", s[7], "If cost and family opinion were not factors, what would you choose?",
                 "Reveals the unconstrained preference.", "Compare to the Direct pathway."))
    qs.append(_q("fam_constraints", s[7], "Is there any constraint I must design around — budget, location, health, language, family responsibilities?",
                 "Ensures recommendations are feasible.", "Hard constraints vs. preferences."))
    asp, par = set(interview.get("aspirations", [])), set(interview.get("parent_aspirations", []))
    if asp and par and not asp & par:
        qs.append(_q("fam_gap", s[7],
                     f"You lean towards {', '.join(sorted(asp))}, while your family leans towards {', '.join(sorted(par))}. What would a path that respects both look like?",
                     "Candidate and family aspirations don't overlap — needs a bridge before the dossier is shared.",
                     "Openness to sequencing (e.g. degree first, venture later) or a hybrid role."))
    if stage == LIFE_STAGES[4]:
        qs.append(_q("work_floor", s[7], "What is the minimum monthly income you need during a transition, and for how long can you sustain it?",
                     "Sets the risk envelope for a pivot.", "A number and a runway in months."))

    qs.append(_q("close_clarity", s[8], "On a scale of 1–10, how clear do you feel about your next step? What would move it up by two points?",
                 "Measures session impact and remaining uncertainty.", "The missing piece becomes the follow-up action."))
    qs.append(_q("close_action", s[8], "What is one action you will take in the next 7 days?",
                 "Converts discussion into commitment.", "Specific, owned, time-bound."))
    return qs


def answer_effects(questions, answers):
    """Translate counselor signals into score adjustments and live insights."""
    effects = {"riasec": {}, "pathway": {}, "text": ""}
    insights = []
    texts = []
    for q in questions:
        a = answers.get(q["id"]) or {}
        signal = a.get("signal", "Not asked")
        response = a.get("response", "").strip()
        if response:
            texts.append(response)
        if signal == "Not asked" and not response:
            continue
        eff = q.get("effect") if signal != "Not asked" else None
        if eff and eff["type"] == "riasec":
            effects["riasec"][eff["key"]] = effects["riasec"].get(eff["key"], 0) + eff.get(signal, 0)
        elif eff and eff["type"] == "pathway":
            effects["pathway"][eff["key"]] = effects["pathway"].get(eff["key"], 0) + eff.get(signal, 0)
        elif eff and eff["type"] == "numeracy":
            delta = {"Confirms": -4, "Partly": -1, "Contradicts": 3}.get(signal, 0)
            for p in PATHWAYS:
                if p["numeracy"] == 3:
                    effects["pathway"][p["id"]] = effects["pathway"].get(p["id"], 0) + delta
        follow = q["followups"].get(signal)
        insights.append({
            "section": q["section"], "question": q["question"], "signal": signal,
            "response": response, "followup": follow,
        })
    effects["text"] = "\n".join(texts)
    return effects, insights


def candidate_guidance(profile, interview, tiers):
    """Talking points the counselor can give directly to the candidate."""
    apt = profile["aptitudes"]
    ranked = sorted(apt.items(), key=lambda kv: kv[1], reverse=True)
    out = {"Affirm your strengths": [], "Reframe the stretch areas": [], "Use your motivators": [],
           "Work-style coaching": [], "Your three avenues": [], "Next 7 days": []}

    for k, v in ranked[:3]:
        if v >= 7:
            out["Affirm your strengths"].append(f"**{APTITUDES[k]['label']} {v}/10** — {APTITUDES[k]['high']}")
    for k, v, top in friction_points(profile)[:2]:
        out["Reframe the stretch areas"].append(
            f"**{APTITUDES[k]['label']} {v}/10** is a skill to train, not a ceiling. Choose paths where it supports rather than defines the job. Build it with: {APTITUDES[k]['builds']}")
    for m in profile.get("motivators", [])[:3]:
        if m in MOTIVATOR_ADVICE:
            out["Use your motivators"].append(f"**{m}** — {MOTIVATOR_ADVICE[m]}")
    for t in profile.get("traits", [])[:4]:
        if t in TRAITS:
            out["Work-style coaching"].append(f"**{t}** — Strength: {TRAITS[t]['plus']} Watch-out: {TRAITS[t]['blind']} Habit: {TRAITS[t]['fix']}")
    labels = {"direct": "Direct high-fit match", "hybrid": "Interdisciplinary hybrid", "frontier": "Emerging growth frontier"}
    for tier, pid in tiers.items():
        if pid:
            p = PATHWAY_BY_ID[pid]
            out["Your three avenues"].append(f"**{labels[tier]}: {p['title']}** — e.g. {', '.join(p['roles'][:2])}. Entry routes: {', '.join(p['exams'][:3])}.")
    direct = PATHWAY_BY_ID.get(tiers.get("direct") or "")
    if direct:
        out["Next 7 days"] += [
            f"Watch two 'day in the life' videos of a {direct['roles'][0]} and note three things you liked and one you didn't.",
            f"Open the official page for {direct['exams'][0]} and write down eligibility, dates and syllabus.",
            "Message one person working in your top avenue (alumni, LinkedIn, family network) for a 15-minute chat.",
        ]
    return out


def mitigation_protocols(profile):
    """Structured blind-spot mitigation plan for the dossier."""
    rows = []
    for k, v, top in friction_points(profile)[:2]:
        meta = APTITUDES[k]
        rows.append({
            "issue": f"{meta['label']} {v}/10 vs peak {top}/10",
            "risk": meta["low"],
            "protocol": meta["builds"],
            "measure": f"Re-test {meta['short'].lower()} practice sets every 6 weeks; target +1 band in 6 months.",
        })
    for t in profile.get("traits", [])[:4]:
        if t in TRAITS:
            rows.append({
                "issue": f"{t} style",
                "risk": TRAITS[t]["blind"],
                "protocol": TRAITS[t]["fix"],
                "measure": "Self-review every Sunday; mentor check-in monthly.",
            })
    return rows
