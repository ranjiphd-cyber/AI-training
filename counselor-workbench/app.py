"""Personality Researcher — Counselor Workbench & Career Dossier Engine.

Run:  streamlit run app.py
"""

import copy
import json
import os

import plotly.graph_objects as go
import streamlit as st

from engine.dossier import OWNER, TIER_LABELS, render_dossier
from engine.knowledge import (
    APTITUDES, ARCHETYPES, ASPIRATIONS, BUDGETS, CAREER_CLUSTERS, EXAMS, FIELD_TAGS, GEOGRAPHY,
    LIFE_STAGES, MOTIVATORS, PATHWAY_BY_ID, PATHWAYS, RIASEC, RIASEC_ORDER, TRAITS, TRAIT_PAIRS,
)
from engine.parser import empty_profile, extract_text, parse_report, riasec_from_code, sample_profile
from engine.prompts import ADVISORY_SYSTEM_PROMPT, build_case_payload, build_user_message, run_synthesis
from engine.questions import SECTIONS, SIGNALS, answer_effects, build_questions, candidate_guidance
from engine.dossier import question_sheet_html
from engine.scoring import friction_points, further_careers, pick_tiers, rank_pathways

NAVY, GOLD, MUTED = "#1F3A5F", "#A8742A", "#B9C4D3"

st.set_page_config(page_title="Counselor Workbench · Personality Researcher", page_icon="🧭", layout="wide")
st.markdown(
    """<style>
    .block-container{padding-top:1.4rem}
    .pr-eyebrow{color:#A8742A;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:.8rem}
    .pr-card{border:1px solid rgba(128,128,128,.3);border-left:5px solid #1F3A5F;border-radius:8px;padding:.8rem 1rem;margin-bottom:.8rem}
    .pr-why{font-size:.85rem;opacity:.8}
    </style>""",
    unsafe_allow_html=True,
)


# ----------------------------------------------------------------------------- state
def empty_interview():
    return {
        "stage": LIFE_STAGES[1], "stream": "", "board": "", "marks": "", "ug_major": "", "current_role": "",
        "experience": "", "likes": [], "dislikes": [], "trait_notes": "", "geography": [], "budget": "",
        "aspirations": [], "parent_aspirations": [], "parent_notes": "", "constraints": "",
        "observations": "", "confirmed_direction": "",
    }


def init_state():
    ss = st.session_state
    ss.setdefault("profile", empty_profile())
    ss.setdefault("interview", empty_interview())
    ss.setdefault("answers", {})
    ss.setdefault("overrides", {})
    ss.setdefault("narrative", "")
    ss.setdefault("summary", "")
    ss.setdefault("ver", 0)
    ss.setdefault("raw_text", "")
    ss.setdefault("parse_report", None)


def load_case(profile=None, interview=None, answers=None, overrides=None, narrative="", summary=""):
    ss = st.session_state
    ss.profile = profile or empty_profile()
    ss.interview = {**empty_interview(), **(interview or {})}
    ss.answers = answers or {}
    ss.overrides = overrides or {}
    ss.narrative = narrative
    ss.summary = summary
    ss.ver += 1  # forces every widget to re-initialise from the new data


def k(name):
    return f"{name}__{st.session_state.ver}"


init_state()
ss = st.session_state
P, I = ss.profile, ss.interview

# ----------------------------------------------------------------------------- sidebar
with st.sidebar:
    st.markdown(f"### 🧭 {OWNER['org']}")
    st.markdown(f"**{OWNER['name']}**  \n{OWNER['title']}  \n📞 {OWNER['phone']}  \n📍 {OWNER['city']}")
    st.divider()

    st.markdown("**1 · Load assessment**")
    up = st.file_uploader("Candidate psychometric report (PDF)", type=["pdf"], key=k("upload"))
    if up is not None and st.button("Extract report data", type="primary", width="stretch"):
        text = extract_text(up.getvalue())
        if not text.strip():
            st.error("No text found in this PDF (it may be a scanned image). Enter scores manually in the Candidate Matrix.")
        else:
            prof, rep = parse_report(text)
            load_case(prof)
            ss.raw_text, ss.parse_report = text, rep
            st.rerun()
    c1, c2 = st.columns(2)
    if c1.button("Sample case", width="stretch", help="Load the reference candidate (Muhammed Saad)"):
        load_case(sample_profile())
        ss.parse_report = None
        st.rerun()
    if c2.button("New candidate", width="stretch"):
        load_case()
        ss.raw_text, ss.parse_report = "", None
        st.rerun()

    st.divider()
    st.markdown("**2 · Save / resume session**")
    case = {"profile": P, "interview": I, "answers": ss.answers, "overrides": ss.overrides,
            "narrative": ss.narrative, "summary": ss.summary}
    fname = (P.get("name") or "candidate").strip().replace(" ", "_")
    st.download_button("Download session file", json.dumps(case, indent=2, ensure_ascii=False),
                       file_name=f"{fname}_session.json", mime="application/json", width="stretch")
    restore = st.file_uploader("Resume a saved session (.json)", type=["json"], key=k("restore"))
    if restore is not None and st.button("Restore session", width="stretch"):
        try:
            data = json.loads(restore.getvalue())
            load_case(**{key: data.get(key) for key in ("profile", "interview", "answers", "overrides")},
                      narrative=data.get("narrative", ""), summary=data.get("summary", ""))
            st.rerun()
        except (ValueError, TypeError) as exc:
            st.error(f"Could not read that session file: {exc}")

    st.divider()
    st.markdown("**3 · AI synthesis (optional)**")
    default_key = os.environ.get("ANTHROPIC_API_KEY", "")
    try:
        default_key = default_key or st.secrets.get("ANTHROPIC_API_KEY", "")
    except Exception:
        pass
    api_key = st.text_input("Anthropic API key", value=default_key, type="password",
                            help="Stored only for this browser session. Leave blank to use copy-paste mode.")
    verify_online = st.toggle("Live web verification of exams & programs", value=True)

# ----------------------------------------------------------------------------- header
st.markdown(f"<div class='pr-eyebrow'>{OWNER['org']} · Counselor Workbench</div>", unsafe_allow_html=True)
st.title(P.get("name") or "New candidate")

tabs = st.tabs(["① Candidate Matrix", "② Diagnostics", "③ Interview Workbench", "④ Guidance for Candidate",
                "⑤ Career Avenues", "⑥ Dossier & Export"])

# ----------------------------------------------------------------------------- ① matrix
with tabs[0]:
    if ss.parse_report:
        rep = ss.parse_report
        st.success(
            f"Extracted — aptitudes {rep['aptitudes']}, motivators {rep['motivators']}, Holland {rep['riasec']}, "
            f"clusters {rep['careers']}/3, archetype {'✓' if rep['archetype'] else '✗'}. Review every field below."
        )
        with st.expander("Raw report text (for checking the extraction)"):
            st.text(ss.raw_text[:12000])
    elif not P.get("name"):
        st.info("Upload a report in the sidebar, load the sample case, or type the candidate's data directly.")

    st.subheader("Identity")
    c = st.columns([2, 1.2, 1.6, .6, 1])
    P["name"] = c[0].text_input("Candidate name", P.get("name", ""), key=k("name"))
    P["phone"] = c[1].text_input("Phone", P.get("phone", ""), key=k("phone"))
    P["email"] = c[2].text_input("Email", P.get("email", ""), key=k("email"))
    P["age"] = c[3].text_input("Age", P.get("age", ""), key=k("age"))
    P["report_date"] = c[4].text_input("Report date", P.get("report_date", ""), key=k("rdate"))

    st.subheader("Top career clusters (from report)")
    P["careers"] = (list(P.get("careers") or []) + ["", "", ""])[:3]
    c = st.columns(3)
    for i in range(3):
        cur = P["careers"][i]
        opts = [""] + CAREER_CLUSTERS + ([cur] if cur and cur not in CAREER_CLUSTERS else [])
        P["careers"][i] = c[i].selectbox(f"Career #{i + 1}", opts, index=opts.index(cur), key=k(f"career{i}"))

    left, right = st.columns(2)
    with left:
        st.subheader("Cognitive aptitudes (1–10)")
        for key, meta in APTITUDES.items():
            P["aptitudes"][key] = st.slider(meta["label"], 1, 10, int(P["aptitudes"].get(key, 5)), key=k(f"apt_{key}"))
    with right:
        st.subheader("Motivators & interests")
        mot_opts = list(MOTIVATORS) + [m for m in P.get("motivators", []) if m not in MOTIVATORS]
        P["motivators"] = st.multiselect("Core motivators — select in priority order", mot_opts, P.get("motivators", []), key=k("mots"))
        c = st.columns([1, 1])
        code = c[0].text_input("Holland code (e.g. IRC)", P.get("riasec_code", ""), max_chars=3, key=k("code")).upper()
        code = "".join(ch for ch in code if ch in RIASEC)
        if code != P.get("riasec_code") and not P.get("riasec_scored"):
            P["riasec"] = riasec_from_code(code) if code else P["riasec"]
        P["riasec_code"] = code
        P["riasec_scored"] = c[1].checkbox("Theme scores come from the report", P.get("riasec_scored", False), key=k("scored"),
                                           help="Untick to approximate theme strengths from the code order.")
        if P["riasec_scored"]:
            cc = st.columns(3)
            for i, letter in enumerate(RIASEC_ORDER):
                P["riasec"][letter] = cc[i % 3].number_input(RIASEC[letter]["name"], 1, 10, int(P["riasec"].get(letter, 4)), key=k(f"r_{letter}"))
        else:
            st.caption("Theme strengths approximated: " + ", ".join(f"{RIASEC[l]['name']} {v}" for l, v in P["riasec"].items()))

    st.subheader("Behavioural archetype")
    c = st.columns([1.4, 2])
    arch_opts = [""] + list(ARCHETYPES) + ([P["archetype"]] if P.get("archetype") and P["archetype"] not in ARCHETYPES else [])
    P["archetype"] = c[0].selectbox("Archetype", arch_opts, index=arch_opts.index(P.get("archetype", "")), key=k("arch"))
    trait_opts = [t for pair in TRAIT_PAIRS for t in pair]
    P["traits"] = c[1].multiselect("Traits (one from each pair)", trait_opts, [t for t in P.get("traits", []) if t in trait_opts], key=k("traits"))
    if P["archetype"] in ARCHETYPES and not P["traits"]:
        st.caption("Tip: the archetype implies " + " + ".join(ARCHETYPES[P["archetype"]]))
    c = st.columns(2)
    P["plus_points"] = [x.strip() for x in c[0].text_area("Plus points (one per line)", "\n".join(P.get("plus_points", [])), height=130, key=k("plus")).splitlines() if x.strip()]
    P["blind_spots"] = [x.strip() for x in c[1].text_area("Improvement blind spots (one per line)", "\n".join(P.get("blind_spots", [])), height=130, key=k("blind")).splitlines() if x.strip()]
    if st.button("Fill plus points & blind spots from traits"):
        traits = P["traits"] or ARCHETYPES.get(P["archetype"], [])
        P["traits"] = traits
        P["plus_points"] = [TRAITS[t]["plus"] for t in traits]
        P["blind_spots"] = [TRAITS[t]["blind"] for t in traits]
        ss.ver += 1
        st.rerun()

# ----------------------------------------------------------------------------- shared computation
INTAKE_WIDGETS = {
    "stage": "stage", "stream": "stream", "marks": "marks", "ug_major": "ug", "current_role": "role", "experience": "exp",
    "likes": "likes", "dislikes": "dislikes", "trait_notes": "tnotes", "geography": "geo", "budget": "budget",
    "aspirations": "asp", "parent_aspirations": "pasp", "parent_notes": "pnotes", "constraints": "cons",
    "observations": "obs", "confirmed_direction": "dir",
}


def sync_interview_widgets():
    """Pull the latest Interview-tab widget values before scoring.

    Those widgets render after the recommendations are computed, so without this
    every edit would only show up one rerun later.
    """
    for field, name in INTAKE_WIDGETS.items():
        if k(name) in ss:
            I[field] = ss[k(name)]
    suffix = f"__{ss.ver}"
    for key in list(ss.keys()):
        if not (isinstance(key, str) and key.endswith(suffix)):
            continue
        base = key[: -len(suffix)]
        for prefix, field in (("resp_", "response"), ("sig_", "signal")):
            if base.startswith(prefix):
                ss.answers.setdefault(base[len(prefix):], {"response": "", "signal": "Not asked"})[field] = ss[key]


sync_interview_widgets()
tiers_guess = pick_tiers(rank_pathways(P, I), ss.overrides)
questions = build_questions(P, I, tiers_guess)
effects, insights = answer_effects(questions, ss.answers)
ranked = rank_pathways(P, I, effects)
tiers = pick_tiers(ranked, ss.overrides)
ranked_by_id = {r["id"]: r for r in ranked}
further = further_careers(ranked, tiers, 10)
LEVEL_ICON = {"Very high": "🟢", "High": "🟢", "Moderate": "🟡", "Possible with effort": "🟠", "Low": "🔴"}


def render_top_three(tiers):
    cols = st.columns(3)
    for col, (tier, pid) in zip(cols, tiers.items()):
        r = ranked_by_id[pid]
        col.metric(TIER_LABELS[tier][1], PATHWAY_BY_ID[pid]["title"].split(",")[0][:30], help=PATHWAY_BY_ID[pid]["title"])
        col.caption(f"{LEVEL_ICON[r['level']]} Suitability: **{r['level']}** · {r['score']:.0f}/100")


def render_further(items):
    st.dataframe(
        [{"#": i + 1, "Career": PATHWAY_BY_ID[r["id"]]["title"], "Example roles": ", ".join(PATHWAY_BY_ID[r["id"]]["roles"][:2]),
          "Suitability": f"{LEVEL_ICON[r['level']]} {r['level']}", "Fit score": r["score"],
          "Why": "; ".join(r["reasons"][:3]), "Watch-outs": "; ".join(r["cautions"][:2]) or "—"} for i, r in enumerate(items)],
        width="stretch", hide_index=True,
        column_config={"Fit score": st.column_config.ProgressColumn("Fit score", min_value=0, max_value=100, format="%.0f")},
    )
    for i, r in enumerate(items):
        p = PATHWAY_BY_ID[r["id"]]
        with st.expander(f"{i + 1}. {p['title']} — {r['level']} ({r['score']:.0f}/100)"):
            c = st.columns(2)
            c[0].markdown("**Why it suits**\n" + "\n".join(f"- {x}" for x in r["reasons"]) +
                          ("\n\n**Watch-outs**\n" + "\n".join(f"- {x}" for x in r["cautions"]) if r["cautions"] else ""))
            c[1].markdown(f"**Roles:** {', '.join(p['roles'])}  \n**Degrees:** {'; '.join(p['degrees'][:3])}  \n"
                          f"**Entrance exams:** {', '.join(p['exams'][:4])}  \n**Top institutes (Karnataka):** {', '.join(p['inst_local'][:3])}  \n"
                          f"**Pay (indicative):** {' → '.join(p['salary'])}")


def plot_layout(fig, height):
    fig.update_layout(height=height, margin=dict(l=10, r=10, t=30, b=10), paper_bgcolor="rgba(0,0,0,0)",
                      plot_bgcolor="rgba(0,0,0,0)", font=dict(size=13), showlegend=False)
    return fig


# ----------------------------------------------------------------------------- ② diagnostics
with tabs[1]:
    apt = P["aptitudes"]
    peak_k = max(apt, key=apt.get)
    fr = friction_points(P)
    m = st.columns(4)
    m[0].metric("Peak aptitude", f"{APTITUDES[peak_k]['short']} {apt[peak_k]}")
    m[1].metric(f"Largest gap ({APTITUDES[fr[0][0]]['short']} {fr[0][1]})" if fr else "Largest gap", f"{fr[0][2] - fr[0][1]} pts" if fr else "None")
    m[2].metric("Holland code", P.get("riasec_code") or "—")
    m[3].metric(f"Top fit ({ranked[0]['score']:.0f}/100)", ranked[0]["title"].split(",")[0][:22], help=ranked[0]["title"])

    c1, c2 = st.columns(2)
    with c1:
        labels = [APTITUDES[x]["short"] for x in APTITUDES]
        vals = [apt[x] for x in APTITUDES]
        fig = go.Figure(go.Scatterpolar(
            r=vals + vals[:1], theta=labels + labels[:1], fill="toself", fillcolor="rgba(31,58,95,.18)",
            line=dict(color=NAVY, width=2), marker=dict(size=8, color=NAVY),
            hovertemplate="%{theta}: <b>%{r}</b>/10<extra></extra>"))
        fig.update_layout(title="Aptitude breakdown", polar=dict(radialaxis=dict(range=[0, 10], tickvals=[2, 4, 6, 8, 10], gridcolor="rgba(128,128,128,.25)"),
                                                                angularaxis=dict(gridcolor="rgba(128,128,128,.25)"), bgcolor="rgba(0,0,0,0)"))
        st.plotly_chart(plot_layout(fig, 380), width="stretch")
    with c2:
        order = sorted(RIASEC_ORDER, key=lambda l: P["riasec"].get(l, 0))
        code = P.get("riasec_code", "")
        fig = go.Figure(go.Bar(
            x=[P["riasec"][l] for l in order], y=[RIASEC[l]["name"] for l in order], orientation="h",
            marker=dict(color=[NAVY if l in code else MUTED for l in order], cornerradius=4),
            text=[P["riasec"][l] for l in order], textposition="outside",
            hovertemplate="%{y}: <b>%{x}</b>/10<extra></extra>"))
        fig.update_layout(title="Holland RIASEC themes" + ("" if P.get("riasec_scored") else " (approximated from code)"),
                          xaxis=dict(range=[0, 11], showgrid=True, gridcolor="rgba(128,128,128,.2)"), bargap=.35)
        st.plotly_chart(plot_layout(fig, 380), width="stretch")

    st.markdown("#### Friction points to discuss")
    if fr:
        for key, v, top in fr[:3]:
            st.warning(f"**{APTITUDES[key]['label']} {v}/10** vs peak {top}/10 — {APTITUDES[key]['low']}  \n*Build with:* {APTITUDES[key]['builds']}")
    else:
        st.success("Balanced profile — no aptitude sits 3+ points below the peak.")

    st.markdown("#### Pathway fit ranking (live — updates with interview evidence)")
    top = ranked[:10][::-1]
    chosen = set(tiers.values())
    fig = go.Figure(go.Bar(
        x=[r["score"] for r in top], y=[r["title"] for r in top], orientation="h",
        marker=dict(color=[NAVY if r["id"] in chosen else MUTED for r in top], cornerradius=4),
        text=[f"{r['score']:.0f}" for r in top], textposition="outside",
        customdata=[" · ".join(r["reasons"][:3]) for r in top],
        hovertemplate="<b>%{y}</b><br>Fit %{x}/100<br>%{customdata}<extra></extra>"))
    fig.update_layout(xaxis=dict(range=[0, 105], gridcolor="rgba(128,128,128,.2)"), bargap=.3)
    st.plotly_chart(plot_layout(fig, 430), width="stretch")
    st.caption("Dark bars = the three recommended trajectories. Hover for the reasons behind each score.")

# ----------------------------------------------------------------------------- ③ interview
with tabs[2]:
    sub = st.tabs(["❓ Questions to ask", "Intake & baseline", "Live insights", "🎯 Career suggestions"])
    with sub[1]:
        c = st.columns(3)
        I["stage"] = c[0].selectbox("Life stage", LIFE_STAGES, index=LIFE_STAGES.index(I.get("stage") or LIFE_STAGES[1]), key=k("stage"))
        I["stream"] = c[1].text_input("Class 10/12 stream & board", I.get("stream", ""), placeholder="e.g. PCMB, CBSE", key=k("stream"))
        I["marks"] = c[2].text_input("Latest marks / CGPA / mock scores", I.get("marks", ""), key=k("marks"))
        c = st.columns(3)
        I["ug_major"] = c[0].text_input("Undergraduate major (if any)", I.get("ug_major", ""), key=k("ug"))
        I["current_role"] = c[1].text_input("Current role / organisation", I.get("current_role", ""), key=k("role"))
        I["experience"] = c[2].text_input("Work experience (years)", I.get("experience", ""), key=k("exp"))

        st.markdown("##### Expressed trait nuances")
        c = st.columns(2)
        I["likes"] = c[0].multiselect("Fields / activities the candidate is drawn to", FIELD_TAGS, I.get("likes", []), key=k("likes"))
        I["dislikes"] = c[1].multiselect("Fields / activities the candidate resists", FIELD_TAGS, I.get("dislikes", []), key=k("dislikes"))
        I["trait_notes"] = st.text_area("Nuances in their own words", I.get("trait_notes", ""), height=80,
                                        placeholder="e.g. prefers Tech + Biology over pure software; dislikes heavy arithmetic; lights up talking about drones", key=k("tnotes"))

        st.markdown("##### Geography & budget")
        c = st.columns([2, 1])
        I["geography"] = c[0].multiselect("Study / work geography", GEOGRAPHY, I.get("geography", []), key=k("geo"))
        bopts = [""] + BUDGETS
        I["budget"] = c[1].selectbox("Annual education budget", bopts, index=bopts.index(I.get("budget", "")), key=k("budget"))

        st.markdown("##### Aspirations & family expectations")
        c = st.columns(2)
        I["aspirations"] = c[0].multiselect("Candidate's aspirations", ASPIRATIONS, I.get("aspirations", []), key=k("asp"))
        I["parent_aspirations"] = c[1].multiselect("Parents' expectations", ASPIRATIONS, I.get("parent_aspirations", []), key=k("pasp"))
        if I["aspirations"] and I["parent_aspirations"] and not set(I["aspirations"]) & set(I["parent_aspirations"]):
            st.warning("Candidate and family aspirations do not overlap — a bridging question has been added to the question bank.")
        I["parent_notes"] = st.text_area("Parental perspective (notes)", I.get("parent_notes", ""), height=70, key=k("pnotes"))
        I["constraints"] = st.text_area("Constraints (health, finance, relocation, timelines…)", I.get("constraints", ""), height=70, key=k("cons"))
        I["observations"] = st.text_area("Counselor's clinical observations", I.get("observations", ""), height=100,
                                         placeholder="Body language, confidence, decision style, consistency with the report…", key=k("obs"))
        I["confirmed_direction"] = st.text_area("Confirmed direction / decisions agreed in session", I.get("confirmed_direction", ""), height=70, key=k("dir"))

    with sub[0]:
        asked = sum(1 for q in questions if ss.answers.get(q["id"], {}).get("signal", "Not asked") != "Not asked")
        st.progress(asked / max(1, len(questions)), text=f"{asked} of {len(questions)} questions covered")
        st.caption("Questions are generated from this candidate's psychometric report, intake and current top pathways. "
                   "Type what the candidate says and mark the signal — the career suggestions, follow-ups and dossier update instantly. "
                   "Words they use (e.g. 'drones', 'hate coding', 'want to teach') are also read and factored into the suggestions.")
        st.download_button("⬇ Printable question sheet", question_sheet_html(P, questions), file_name=f"{fname}_Question_Sheet.html",
                           mime="text/html")
        for section in SECTIONS:
            qs = [q for q in questions if q["section"] == section]
            if not qs:
                continue
            done = sum(1 for q in qs if ss.answers.get(q["id"], {}).get("signal", "Not asked") != "Not asked")
            with st.expander(f"{section}  ·  {done}/{len(qs)}", expanded=(section == SECTIONS[0])):
                for q in qs:
                    a = ss.answers.setdefault(q["id"], {"response": "", "signal": "Not asked"})
                    st.markdown(f"**{q['question']}**")
                    st.markdown(f"<div class='pr-why'>🎯 <b>Why:</b> {q['why']}<br>👂 <b>Listen for:</b> {q['listen']}</div>", unsafe_allow_html=True)
                    c = st.columns([3, 2])
                    a["response"] = c[0].text_area("Candidate's response", a.get("response", ""), height=68, key=k(f"resp_{q['id']}"), label_visibility="collapsed",
                                                   placeholder="Candidate's response / key quote")
                    a["signal"] = c[1].radio("Signal", SIGNALS, index=SIGNALS.index(a.get("signal", "Not asked")), horizontal=True, key=k(f"sig_{q['id']}"),
                                             label_visibility="collapsed")
                    follow = q["followups"].get(a["signal"])
                    if follow:
                        (st.error if a["signal"] == "Contradicts" else st.info)(f"↳ {follow}")
                    st.divider()

    with sub[3]:
        st.caption("Live recommendations from the psychometric report plus everything entered in this interview.")
        render_top_three(tiers)
        st.markdown("#### 10 more careers to consider")
        render_further(further)

    with sub[2]:
        conf = [i for i in insights if i["signal"] == "Confirms"]
        contra = [i for i in insights if i["signal"] == "Contradicts"]
        part = [i for i in insights if i["signal"] == "Partly"]
        m = st.columns(4)
        m[0].metric("Answered", len(insights))
        m[1].metric("Confirms", len(conf))
        m[2].metric("Partly", len(part))
        m[3].metric("Contradicts", len(contra))
        if contra:
            st.markdown("#### ⚠️ Contradictions — resolve before finalising")
            for i in contra:
                st.error(f"**{i['question']}**  \n“{i['response'] or '—'}”  \n↳ {i['followup'] or 'Probe further.'}")
        if effects["riasec"] or effects["pathway"]:
            st.markdown("#### Score impact of interview evidence")
            rows = [f"- **{RIASEC[l]['name']}** theme {'+' if d > 0 else ''}{d:g}" for l, d in effects["riasec"].items() if d]
            rows += [f"- **{PATHWAY_BY_ID[p]['title']}** {'+' if d > 0 else ''}{d:g} fit points" for p, d in effects["pathway"].items() if d]
            st.markdown("\n".join(rows) or "No net change yet.")
        if conf:
            st.markdown("#### ✅ Confirmed evidence")
            for i in conf:
                st.success(f"**{i['question'][:160]}**  \n“{i['response'] or '—'}”" + (f"  \n↳ {i['followup']}" if i["followup"] else ""))
        if not insights:
            st.info("No answers recorded yet. Use the Question bank during the session.")

# ----------------------------------------------------------------------------- ④ guidance
with tabs[3]:
    st.caption("Talking points to share with the candidate during the session — evidence-based, specific and encouraging.")
    guide = candidate_guidance(P, I, tiers)
    c = st.columns(2)
    for idx, (title, items) in enumerate(guide.items()):
        with c[idx % 2]:
            st.markdown(f"#### {title}")
            st.markdown("\n".join(f"- {x}" for x in items) if items else "_Complete the candidate matrix to generate points._")
    st.divider()
    ss.summary = st.text_area("Mentor's personal note for the dossier (appears as a highlighted callout)", ss.summary, height=110, key=k("summary"),
                              placeholder="e.g. Saad, your curiosity and command presence are rare together. The next 90 days are about channelling them…")

# ----------------------------------------------------------------------------- ⑤ avenues
with tabs[4]:
    st.caption("The engine proposes three trajectories; override any of them with your professional judgement.")
    options = [p["id"] for p in PATHWAYS]
    fmt = lambda pid: f"{PATHWAY_BY_ID[pid]['title']}  ({ranked_by_id[pid]['score']:.0f})"
    c = st.columns(3)
    for col, tier in zip(c, ("direct", "hybrid", "frontier")):
        choice = col.selectbox(f"{TIER_LABELS[tier][0]} · {TIER_LABELS[tier][1]}", options, index=options.index(tiers[tier]), format_func=fmt, key=k(f"tier_{tier}"))
        if choice != tiers[tier]:
            ss.overrides[tier] = choice
            st.rerun()
    if ss.overrides and st.button("Reset to engine recommendations"):
        ss.overrides = {}
        ss.ver += 1
        st.rerun()

    for tier, pid in tiers.items():
        p, r = PATHWAY_BY_ID[pid], ranked_by_id[pid]
        st.markdown(f"<div class='pr-card'><span style='color:{GOLD};font-weight:700;font-size:.8rem;letter-spacing:.08em'>"
                    f"{TIER_LABELS[tier][0].upper()} · {TIER_LABELS[tier][1].upper()}</span><h3 style='margin:.1rem 0'>{p['title']} — {r['score']:.0f}/100</h3></div>",
                    unsafe_allow_html=True)
        c = st.columns([1.2, 1, 1])
        with c[0]:
            st.markdown("**Why it fits**\n" + "\n".join(f"- {x}" for x in r["reasons"]))
            if r["cautions"]:
                st.markdown("**Watch-outs**\n" + "\n".join(f"- {x}" for x in r["cautions"]))
            st.markdown(f"**Entry roles:** {', '.join(p['roles'])}")
            st.markdown(f"**Typical week:** {p['workflow']}")
        with c[1]:
            st.markdown("**Bangalore / Karnataka**\n" + "\n".join(f"- {x}" for x in p["inst_local"]))
            st.markdown("**All-India**\n" + "\n".join(f"- {x}" for x in p["inst_india"]))
            st.markdown("**Global**\n" + "\n".join(f"- {x}" for x in p["inst_global"]))
        with c[2]:
            st.markdown("**Degrees**\n" + "\n".join(f"- {x}" for x in p["degrees"]))
            st.markdown("**Entrance exams**\n" + "\n".join(f"- [{x}]({EXAMS[x]['url']}) · {EXAMS[x]['window']}" if x in EXAMS else f"- {x}" for x in p["exams"]))
            st.markdown("**Employers:** " + ", ".join(p["employers"]))
            st.markdown("**Pay (indicative):** " + " → ".join(p["salary"]))

    st.markdown("### 10 more careers suitable for this candidate")
    st.caption("Ranked by fit to the psychometric report and the interview input. Suitability: 🟢 Very high ≥85 · 🟢 High ≥75 · 🟡 Moderate ≥65 · 🟠 Possible with effort ≥55 · 🔴 Low.")
    render_further(further)

    with st.expander("Full ranking with score components"):
        st.dataframe(
            [{"Pathway": r["title"], "Fit": r["score"], "Aptitude": round(r["components"]["aptitude"] * 100),
              "Holland": round(r["components"]["riasec"] * 100), "Motivators": round(r["components"]["motivator"] * 100),
              "Cluster": round(r["components"]["cluster"] * 100), "Traits": round(r["components"]["traits"] * 100),
              "Interview adj.": r["adjustment"]} for r in ranked],
            width="stretch", hide_index=True)

# ----------------------------------------------------------------------------- ⑥ dossier
with tabs[5]:
    payload = build_case_payload(P, I, ranked, tiers, insights, further)
    st.markdown("#### Strategic synthesis")
    st.caption("Generate a narrative with Claude (with live verification of exams and programs), or paste one from any Claude chat. "
               "Edit it freely — your edits are what goes into the dossier.")
    c = st.columns([1, 1, 2])
    if c[0].button("Generate AI synthesis", type="primary", disabled=not api_key, width="stretch"):
        box = st.empty()
        try:
            with st.spinner("Synthesising dossier narrative… this can take a few minutes with live verification."):
                ss.narrative = run_synthesis(payload, api_key=api_key, verify_online=verify_online,
                                             on_text=lambda t: box.markdown(t[-3000:]))
            box.empty()
            ss.ver += 1
            st.rerun()
        except RuntimeError as exc:
            st.error(str(exc))
    if not api_key:
        c[1].caption("No API key — use copy-paste mode below.")
    with st.expander("Copy-paste mode: system prompt + case data"):
        st.markdown("Paste the **system prompt** as the project instructions (or first message) in Claude, then paste the **case message**. Copy the reply into the box below.")
        st.code(ADVISORY_SYSTEM_PROMPT, language="markdown")
        st.code(build_user_message(payload), language="markdown")
    ss.narrative = st.text_area("Synthesis narrative (markdown, editable)", ss.narrative, height=260, key=k("narr"),
                                placeholder="Leave empty to use the built-in rule-based synthesis.")

    html_doc = render_dossier(P, I, ranked, tiers, insights, ss.narrative, ss.summary, further)
    c = st.columns(3)
    c[0].download_button("⬇ Download dossier (HTML · print to PDF)", html_doc, file_name=f"{fname}_Career_Dossier.html",
                         mime="text/html", type="primary", width="stretch")
    c[1].download_button("⬇ Case data (JSON)", json.dumps(payload, indent=2, ensure_ascii=False),
                         file_name=f"{fname}_case.json", mime="application/json", width="stretch")
    c[2].caption("Open the HTML file and use **Print → Save as PDF** (A4) for the client copy.")
    st.markdown("#### Preview")
    st.iframe(html_doc, height=1300)
