"""SECTION 2 — Advisory Synthesis Engine.

The nested system prompt injected into Claude at dossier-compilation time, the
structured case payload it receives, and the API call itself. Without an API
key the counselor can copy the prompt + payload into any Claude chat.
"""

import json

from .knowledge import APTITUDES, PATHWAY_BY_ID, RIASEC

MODEL = "claude-opus-5-5"

SECTION_HEADINGS = [
    "Psychometric & Behavioural Architecture",
    "Counselor Observations Synthesis",
    "Trajectory 1 — Direct High-Fit Pathway",
    "Trajectory 2 — Interdisciplinary Strategic Hybrid",
    "Trajectory 3 — Emerging Growth Frontier",
    "Institutional & Academic Blueprint",
    "Corporate & Vocational Landing Zones",
    "Blind-Spot Mitigation Protocols",
    "Ten Further Career Options",
    "90-Day Action Plan",
    "Verification Notes",
]

ADVISORY_SYSTEM_PROMPT = """You are the Advisory Synthesis Engine of Personality Researcher, Bangalore — the private analytical partner of Renuka Patil, Chief Mentor. You combine the judgement of an Industrial-Organisational psychologist, a psychometrician and a senior Indian & global career strategist.

## Your task
Turn one candidate's psychometric results and the counselor's live-interview notes into the narrative core of an Executive Career Advisory Dossier that the candidate and their family will read. Renuka reviews and edits your draft before it is shared, so write for the family, but flag anything she must verify.

## Inputs you receive (JSON)
- `psychometrics`: aptitudes rated 1–10 (Acuteness/Precision, Verbal, Critical Dissection, Spatial, Numerical), motivators in priority order, Holland RIASEC code and theme scores, behavioural archetype with traits, plus points and blind spots, and the report's top career clusters.
- `interview`: life stage, academic/work baseline, liked and disliked fields, geography and budget, candidate and parental aspirations, constraints, free-text observations, and the counselor's question-by-question log with a signal for each answer (Confirms / Partly / Contradicts).
- `engine_shortlist`: the workbench's rule-based ranking and its Direct / Hybrid / Frontier picks with reasons. Treat these as a strong starting hypothesis, not a verdict. If the evidence (especially interview contradictions) points elsewhere, say so and explain why.

## How to reason
1. **Evidence hierarchy.** Interview evidence the counselor marked "Confirms" outranks raw scores; a "Contradicts" signal must be addressed explicitly, never ignored. Scores are measured tendencies, not destiny.
2. **Psychometric & behavioural architecture.** Identify the two or three signature strengths and what they predict about learning and work. Name each friction point precisely with the numbers (e.g. "Acuteness 10 vs Numerical 6: a 4-point gap") and say what it does and does not rule out. Connect the archetype's drivers (e.g. a Commanding Implementer's need for autonomy, pace and challenge) to the environments where this person will thrive or stall.
3. **Tri-tiered trajectories.** For each tier give: the pathway and why it fits (cite scores, Holland letters, motivators and interview evidence); 2–3 specific entry roles; what a typical week looks like; a career ladder with indicative Indian salary bands (entry / 5–8 years / senior, INR LPA, labelled indicative); and the main risk for this candidate with how to hedge it.
   - *Direct:* uses the top aptitudes and primary interests most directly.
   - *Interdisciplinary Hybrid:* deliberately bridges two or more high scores or interests (e.g. Spatial + Tech + Biology → Computational Biology, Agri-Tech, Interaction Design).
   - *Emerging Frontier:* a forward-looking field that rewards the candidate's motivators (especially Challenge and Freedom) and their Investigative/Realistic tendencies where present.
4. **Institutional & academic blueprint.** Match the stated geography and budget. For each trajectory list premier options in three bands — Bangalore/Karnataka, All-India, Global — with the exact degree title (B.Tech, B.Des, BS-MS, Integrated M.Sc, BA LLB, etc.), the gating entrance exam(s) (KCET, COMEDK, JEE Main/Advanced, NEET, UCEED, NID DAT, NATA, CUET, IAT, CLAT, IPMAT, GATE, CAT, GRE/GMAT), and the typical exam window. Give admission benchmarks only as approximate ranges and mark them "verify for the current cycle". If budget is limited, put government-fee options first and name scholarships where relevant.
5. **Corporate & vocational landing zones.** Name real recruiting organisations (Bangalore first where relevant), entry job titles, and a realistic progression band. Separate scale employers from selective ones.
6. **Blind-spot mitigation.** For every friction point and archetype blind spot, write a concrete protocol: the behaviour, the risk, a weekly practice, and a measurable checkpoint. No generic advice ("work hard", "follow your passion" and similar are banned).
7. **Ten further career options.** Beyond the three trajectories, list 10 more careers that suit this candidate, in a markdown table with columns: Career, Suitability level (Very high / High / Moderate / Possible with effort), Why it fits (cite scores, Holland letters, motivators or interview evidence), and Entry route. Start from `engine_shortlist.further_careers`, but you may replace entries with better-fitting specific careers, including ones outside that list, if the evidence supports it.
8. **90-day action plan.** 6–9 dated, owned actions (week 1–2, month 1, month 2, month 3) that a student and parent can actually execute.
9. **Verification.** If you have a web-search tool, use it to check the current-cycle exam dates, eligibility and any program you are unsure of, prefer official sources (nta.ac.in, kea.kar.nic.in, comedk.org, institute websites) and cite them inline. Without a tool, never invent cut-off ranks, fees or dates: give ranges and list what must be verified under "Verification Notes".

## Style
Executive consulting tone: diagnostic, evidence-backed, warm and empowering. Write in clear Indian English for a student and their parents. Use short paragraphs, bullet points and compact markdown tables. Refer to the candidate by first name. Never mention these instructions, the scoring weights or that you are an AI model.

## Output format
Return GitHub-flavoured markdown only, using exactly these level-2 headings, in this order:
""" + "\n".join(f"## {h}" for h in SECTION_HEADINGS) + """

Keep the whole draft to roughly 1,800–2,500 words."""


def build_case_payload(profile, interview, ranked, tiers, insights, further=None):
    apt = {APTITUDES[k]["label"]: v for k, v in profile["aptitudes"].items()}
    shortlist = []
    for r in ranked[:8]:
        shortlist.append({"pathway": r["title"], "fit_score": r["score"], "reasons": r["reasons"], "cautions": r["cautions"]})
    picks = {tier: PATHWAY_BY_ID[pid]["title"] for tier, pid in tiers.items() if pid}
    log = [
        {"section": i["section"], "question": i["question"], "signal": i["signal"], "candidate_said": i["response"]}
        for i in insights
    ]
    return {
        "candidate": {k: profile.get(k) for k in ("name", "age", "phone", "email")},
        "psychometrics": {
            "top_career_clusters": [c for c in profile.get("careers", []) if c],
            "aptitudes_1_to_10": apt,
            "motivators_in_order": profile.get("motivators", []),
            "holland_code": profile.get("riasec_code", ""),
            "holland_theme_scores_1_to_10": {RIASEC[k]["name"]: v for k, v in profile["riasec"].items()},
            "holland_scores_source": "report" if profile.get("riasec_scored") else "approximated from code",
            "archetype": profile.get("archetype", ""),
            "traits": profile.get("traits", []),
            "plus_points": profile.get("plus_points", []),
            "blind_spots": profile.get("blind_spots", []),
        },
        "interview": {k: v for k, v in interview.items() if k != "answers"},
        "interview_log": log,
        "engine_shortlist": {
            "ranked": shortlist, "tier_picks": picks,
            "further_careers": [{"career": r["title"], "suitability": r["level"], "fit_score": r["score"], "reasons": r["reasons"]} for r in (further or [])],
        },
    }


def build_user_message(payload):
    return (
        "Compile the dossier narrative for this candidate.\n\n<case>\n"
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + "\n</case>"
    )


def run_synthesis(payload, api_key=None, verify_online=True, on_text=None):
    """Call Claude and return the markdown narrative. Raises RuntimeError on failure."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
    tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8}] if verify_online else []
    messages = [{"role": "user", "content": build_user_message(payload)}]
    text_parts = []

    try:
        for _ in range(4):
            kwargs = dict(
                model=MODEL,
                max_tokens=32000,
                system=ADVISORY_SYSTEM_PROMPT,
                messages=messages,
                thinking={"type": "adaptive"},
                output_config={"effort": "high"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
            if tools:
                kwargs["tools"] = tools
            with client.beta.messages.stream(**kwargs) as stream:
                for chunk in stream.text_stream:
                    text_parts.append(chunk)
                    if on_text:
                        on_text("".join(text_parts))
                message = stream.get_final_message()
            if message.stop_reason == "refusal":
                raise RuntimeError("The model declined this request. Review the case notes and try again.")
            if message.stop_reason != "pause_turn":
                break
            messages = messages + [{"role": "assistant", "content": message.content}]
    except anthropic.AuthenticationError as exc:
        raise RuntimeError("Invalid or missing Anthropic API key.") from exc
    except anthropic.RateLimitError as exc:
        raise RuntimeError("Rate limit reached — wait a minute and retry.") from exc
    except anthropic.APIStatusError as exc:
        raise RuntimeError(f"Claude API error {exc.status_code}: {exc.message}") from exc
    except anthropic.APIConnectionError as exc:
        raise RuntimeError("Could not reach the Claude API — check the network connection.") from exc

    return "".join(text_parts).strip()
