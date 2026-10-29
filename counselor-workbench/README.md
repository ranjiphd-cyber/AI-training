# Counselor Workbench — Personality Researcher

A Streamlit dashboard for **Renuka Patil, Chief Mentor, Personality Researcher (Bangalore)**. It turns a candidate's psychometric report into a live counselling session and a client-ready Executive Career Advisory Dossier.

## Run it

```bash
pip install -r requirements.txt
streamlit run app.py
```

You can set `ANTHROPIC_API_KEY` in the environment or in `.streamlit/secrets.toml` to use AI synthesis. Without a key, every other feature works and the synthesis runs in copy-paste mode.

## Workflow (six tabs)

| Tab | What you do |
|---|---|
| **① Candidate Matrix** | Upload the report PDF in the sidebar. The app extracts the name, contact details, top 3 career clusters, the five aptitudes (1–10), motivators, the Holland code and scores, and the archetype, traits, plus points and blind spots. Check and correct every field. **Sample case** loads Muhammed Saad. |
| **② Diagnostics** | Aptitude radar chart, Holland RIASEC bars, friction points (gaps of 3 or more points from the peak score), and a live ranking of 24 career pathways by fit. |
| **③ Interview Workbench** | *Questions to ask:* about 25–30 questions built from this candidate's psychometric report, with why to ask each one and what to listen for. Type the candidate's response and mark a signal (Confirms / Partly / Contradicts). A printable question sheet can be downloaded. *Intake:* academic and work baseline, fields the candidate likes and resists, geography and budget, the candidate's and the parents' aspirations, constraints, and your clinical notes. *Live insights:* contradictions to resolve, confirmed evidence, and how the answers changed the scores. *Career suggestions:* the three main avenues plus **10 more suitable careers**, each with a suitability level, updated as you type. |
| **④ Guidance for Candidate** | Talking points to share during the session: strengths to affirm, how to reframe the stretch areas, advice for each motivator, work-style habits, the three avenues, and next-7-day actions. Also a personal mentor's note for the dossier. |
| **⑤ Career Avenues** | The 10 further careers in detail, plus the Direct, Interdisciplinary Hybrid and Emerging Frontier trajectories, each with reasons, roles, a typical week, institutions in three bands (Bangalore/Karnataka, All-India, Global), entrance exams with official links, employers and indicative pay. You can override any pick. |
| **⑥ Dossier & Export** | AI or pasted synthesis narrative (editable), a print-ready A4 HTML dossier (open it, then Print → Save as PDF), and the case data as JSON. |

Use **Download session file** in the sidebar to save the whole session, and upload it later to resume.

## How the answers change the recommendations

Fit score = 38% aptitude + 24% Holland + 14% motivators + 14% report-cluster match + 10% behavioural traits, plus adjustments from the interview:

- Liked fields add points; disliked fields subtract points.
- Aspirations shared by the candidate and family add points.
- **Pathway reality-test answers:** Confirms adds 6, Contradicts subtracts 10.
- **Holland-theme answers:** Confirms adds 0.5 to the theme; Contradicts subtracts 2.
- **Numerical-friction answer:** Confirms lowers the score of every quantitative-heavy pathway.
- **Words the candidate uses** in responses and notes count too: "I love drones" lifts Agri-Tech and Aerospace; "I hate coding" lowers Software.

Suitability levels: Very high (85+), High (75+), Moderate (65+), Possible with effort (55+), Low (below 55).

The three trajectories are re-chosen after every answer.

## Project layout

| Path | Contents |
|---|---|
| `app.py` | The Streamlit dashboard (Section 1) |
| `engine/prompts.py` | **Section 2.** The Advisory Synthesis system prompt, the case payload and the Claude call (with optional live web verification) |
| `engine/dossier.py` | **Section 3.** The executive dossier HTML/CSS template, with inline SVG charts so it prints offline |
| `engine/knowledge.py` | Aptitudes, motivators, RIASEC themes, traits and archetypes, entrance exams, and the 24-pathway library (institutions, exams, employers, salary bands) |
| `engine/questions.py` | Question generator, how answers affect scores, candidate guidance, mitigation protocols |
| `engine/scoring.py` | Transparent pathway scoring and tier selection |
| `engine/parser.py` | PDF text extraction and best-effort field parsing |

## Notes

- **PDF parsing:** report layouts vary, so parsing is heuristic. Always check the extracted values; the raw text is shown so you can compare. Scanned (image-only) PDFs need the values typed in by hand.
- **AI synthesis:** uses the Anthropic API (`claude-opus-5-5`) with adaptive thinking, the web-search tool for checking exam dates and programs, and server-side refusal fallback.
- **Reference data:** salary bands are indicative. Exam windows, cut-offs and fees change every cycle. Verify them on the official sites listed in the dossier before sharing it.
