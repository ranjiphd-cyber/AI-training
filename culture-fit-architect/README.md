# C-Psych Architect: Culture & Psychometric Fit Diagnostics

A single-file, interactive dashboard that compares an **individual** with the **hiring team's subculture** and the **organization's culture**. It produces a consultant-grade fitment audit you can download.

Open `index.html` in any browser. No install or build is needed. Every input recalculates the model live.

## Workspace

| Tab | What you do |
|---|---|
| **Dashboard** | Recommendation, KPI tiles, comparative radar, alignment heatmap, ASCII comparative matrix, CVF profile bars, derailer chart, culture add vs. fit, friction drivers, values, interview probes, 90-day preview |
| **G1 · Organization** | CVF/OCAI (lived and espoused), Denison, Barrett entropy, Groysberg 8-style profile (current vs. target), internal engagement pulse (e.g., Glint), analyst data caveats, review sentiment (Glassdoor / AmbitionBox / Indeed / Kununu counts plus pasted text), leadership discourse, news signals, enterprise operating norms |
| **G2 · Team subculture** | Load a unit from the case file's team library (business-unit diagnostics), team CVF, local norms (pace, risk, conflict, autonomy), manager style, interview transcripts, variance from the enterprise |
| **G3 · Individual** | Hogan HPI / HDS / MVPI percentiles. Big Five, SHL OPQ32 or Korn Ferry KF4D can also be entered as Big Five domains and are mapped to HPI-equivalents. |
| **G5 · Data audit & clarification** | Sources catalog, evidence confidence (High / Moderate / Low), contradiction flags, targeted clarifying questions |
| **Report & export** | Live report preview, plus downloads: report `.html` (prints to PDF), report `.md`, scores `.csv`, and case `.json` save/load |

The text-analysis helpers infer CVF profiles from leadership text and interview transcripts, and extract sentiment polarity and turnover themes from reviews.

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
