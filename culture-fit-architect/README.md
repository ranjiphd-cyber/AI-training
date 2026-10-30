# C-Psych Architect: Culture & Psychometric Fit Diagnostics

A single-file, interactive dashboard that compares an **individual** with the **hiring team's subculture** and the **organization's culture**. It produces a consultant-grade fitment audit you can download.

Open `index.html` in any browser. No install or build is needed. Every input recalculates the model live.

## Workspace

| Tab | What you do |
|---|---|
| **Dashboard** | Recommendation, KPI tiles, comparative radar, alignment heatmap, ASCII comparative matrix, CVF profile bars, derailer chart, culture add vs. fit, friction drivers, values, interview probes, 90-day preview |
| **G1 · Organization** | CVF/OCAI (lived and espoused), Denison, Barrett entropy, Groysberg 8-style profile (current vs. target), internal engagement pulse (e.g., Glint), analyst data caveats, review sentiment (Glassdoor / AmbitionBox / Indeed / Kununu counts plus pasted text), leadership discourse, news signals, enterprise operating norms |
| **G2 · Team subculture** | Load a unit from the case file's team library (business-unit diagnostics), team CVF, local norms (pace, risk, conflict, autonomy), manager style, interview transcripts, variance from the enterprise |
| **G3 · Individual** | Candidate roster; Hogan HPI / HDS / MVPI percentiles (Big Five, SHL OPQ32 or Korn Ferry KF4D can be entered as Big Five domains and are mapped to HPI-equivalents); **interview guide & feedback**, with questions generated from the candidate's analysis, 1–5 ratings, evidence notes, interview notes/transcript, and an overall impression. |
| **⤒ Evidence & uploads** | Upload PDF / Word / PowerPoint / Excel / text files or paste text: psychometric reports (Hogan, Big Five/NEO, OPQ32, Korn Ferry), culture assessments (OCAI/CVF, Denison, Groysberg, Barrett, engagement pulses), reviews, leadership statements, interview transcripts. Each upload becomes a review card of proposed values that you can edit or untick before applying. Includes an evidence register and interview records, each with add / edit / delete. |
| **G5 · Data audit & clarification** | Sources catalog, evidence confidence (High / Moderate / Low), contradiction flags, targeted clarifying questions |
| **Report & export** | Live report preview, plus downloads: report `.html` (prints to PDF), report `.md`, scores `.csv`, and case `.json` save/load |

The text-analysis helpers infer CVF profiles from leadership text and interview transcripts, and extract sentiment polarity and turnover themes from reviews.

## Reading uploaded documents

- **On claude.ai (hosted)**, Claude reads each document and proposes values. This uses the viewer's Claude usage and asks for consent on first use. Unknown fields and non-numeric values are discarded.
- **Opened as a local file**, a built-in parser reads standard score layouts: Hogan HPI/HDS/MVPI, Big Five, OPQ32 stens rolled up to Big Five, CVF now/preferred, Denison, Groysberg current/target, Barrett entropy, review ratings. Everything else is kept as evidence text.
- PDFs are read with pdf.js and Office files with JSZip, both loaded from cdnjs on first use. Scanned (image-only) PDFs have no text layer, so paste their text instead.
- Interview records count toward team evidence (hiring manager, peers, direct reports, cross-functional). Their notes feed the team-culture cue analysis. Senior-leader interviews feed the leadership-discourse analysis.

## Editing, roster and saving

- Every score and text field is editable. **Reset** buttons clear an instrument or culture block and its evidence flag. Deletes ask for a second click to confirm.
- The **candidate roster** (Individual tab) holds several candidates. Each keeps its own scores, and the dashboard and report compare them against the same team and organization.
- The **team library** can save, load and delete units.
- **Autosave:** to the viewer's own private storage on claude.ai, or to browser storage when opened locally. Choose a case in **Load case** to start over.

## Interview guide & feedback

- **Generate / refresh questions** builds a structured behavioural guide from the live analysis: motivation, the largest culture gaps, derailers likely to show up in this context, values and motivator mismatches, culture-add potential, manager fit, and culture contribution. Each question shows why it is asked and what to listen for (positive indicators and red flags). Questions can be edited, added or deleted. Refreshing keeps existing answers.
- Rate each answer from 1 (significant concern) to 5 (strong positive evidence). Confirmed ratings adjust the model: gap penalties (×0.65–1.25), derailer activation (×0.7–1.2), values congruence, manager fit and culture-add evidence. They also produce an interview evidence index that appears in the decision brief, the candidate comparison and report section 4.4.
- On claude.ai, Claude can tailor extra questions to the context, or suggest ratings from pasted or uploaded interview notes. Suggestions are flagged and don't count until the assessor confirms them. They never overwrite a rating the assessor has already given.

## Report design

The HTML/PDF report is deliberately monochrome and decision-first. A decision brief opens it: the recommendation, a seven-line scorecard, what supports the hire, risks to manage, conditions if proceeding, and what to resolve before deciding. The supporting analysis follows (phases 1–5, then appendices).

## Case files & team library

**Save case** / **Load case** exchange a JSON file holding every input. A case file may also include a `teamLibrary` array of business-unit subcultures (`name`, `cvf`, `ops`, `evidence`). When one is loaded, the Team tab offers a picker. Keep organization-specific or confidential culture data in case files rather than in this repository, because the repository is public.

## Report structure (5-phase schema)

0. **Decision brief:** recommendation, executive summary, key findings
1. **Data ingestion & diagnostic audit:** detected sources with sample sizes and rigor, confidence rating, clarification check (hold or pass)
2. **Executive culture & alignment dashboard:** Overall Match Index, Team Synergy, Org Alignment, Friction Risk Level (Low / Moderate / High / Critical), Culture Archetype (Culture Stabilizer / Accretive Culture Add / Disruptive Misfit), ASCII comparative matrix, radar, CVF bars, variance heatmap
3. **Triangulated qualitative diagnosis:** corporate reality check (declared vs. lived, culture debt, psychological safety, pace), team-to-enterprise divergence, MVPI motives vs. reward and promotion mechanics
4. **Stress dynamics & derailment:** HPI day-to-day dynamics vs. team norms, HDS derailers × organizational triggers, productive vs. destructive friction
5. **30-60-90 blueprint:** acculturation & psychological safety (with enterprise landmines), behavioral calibration (boundaries and self-monitoring per derailer), impact & value realization (manager levers per top motive), manager do/avoid, milestones

Appendices: verification interview probes; methodology & limitations.

## Diagnostic inquiry hold

If any vector (organization, team, individual) falls below **60% evidence confidence**, scores are withheld. The tool then lists targeted questions, for example a missing norm group, too few peer interviews, or safety scores that contradict review sentiment. You can release scores as **provisional**, and they are labeled that way throughout.

## Model summary

All three entities are projected onto eight axes: Clan, Adhocracy, Market and Hierarchy, plus decision velocity, risk tolerance, conflict directness and autonomy.

- **Team synergy** = 70% axis alignment + 15% manager-style fit + 15% value congruency
- **Org alignment** = 50% axis alignment + 35% value congruency + 15% career-velocity fit
- **Overall** = 50% team + 40% org + 10% derailer resilience
- With a Groysberg profile, org alignment becomes 45% axes + 30% values + 10% velocity + 15% style-shape match, and growth toward target styles counts as culture add
- **Derailer activation** = HDS percentile × context multiplier (0.6–1.4)

These are decision-support indices, not validated predictive scores. Never use them as the sole basis for a hiring decision. All example cases are fictional.
