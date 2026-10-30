# C-Psych Fit Check: participant tool for the validation study

A self-service web app that professionals complete to get a personal culture-fit report. The anonymised answers flow into your own Google Sheet, where the analysis script turns them into reliability and validity evidence.

It uses **the same fit engine** as the assessor tool in [`../culture-fit-architect`](../culture-fit-architect): the build script copies the engine in, so both tools always score identically.

## What participants do (20–25 minutes)

1. **Consent:** choose a mode. *Current employee* rates their own organisation and team, and their answers validate the tool. *Candidate* describes an organisation they are considering.
2. **Questionnaire:** IPIP Big Five personality (public domain), work motives, working style and culture preferences, and behaviour under pressure, with two attention checks.
3. **Optional existing results:** Hogan or other Big Five scores, typed in or read from their report. These give convergent-validity evidence and are used in the report when complete.
4. **Organisation and team:**
   - Ratings of lived and espoused culture, operating norms, psychological safety and leadership credibility.
   - Optional OCAI or Denison results.
   - **Company research**, which runs automatically in the background once the organisation is named. The organisation can be any company, and an optional business unit narrows the search. Four kinds of public source are read separately:
     - **Employees:** review platforms such as Glassdoor, AmbitionBox, Indeed and Kununu, giving the lived culture, ratings and recurring themes.
     - **Leadership:** stated values, leadership statements and careers pages, giving the espoused culture.
     - **News** from the last 24 months: layoffs, restructuring, leadership changes, growth and M&A.
     - **Function or unit:** the participant's own area, giving the team subculture.

     Each kind gets its own evidence strength. It uses Claude with live web search through your backend; without a backend it falls back to Claude's general knowledge in the preview.
5. **Outcomes** (current mode, before the report): perceived fit, satisfaction, intention to stay, strain.
6. **Instant report:**
   - Overall, team and organisation fit, and friction risk.
   - Where they fit, and where they may clash (mild, significant or **major**, with an alert).
   - What each mismatch means, what to do, and what to ask.
   - Profile, motives versus rewards, and under-pressure tendencies with their triggers in this environment.
   - **What the company research says:**
     - each kind of source;
     - where the sources agree, and the gap between words and experience;
     - the culture profile from each view;
     - fit on *your view*, on *public research* and *combined*;
     - where the person's impression differs from public sources;
     - risks that only the public picture shows;
     - all sources, grouped by type.
   - A 90-day plan, and questions to ask before deciding (candidate mode).

   They can download it as HTML.
7. **Feedback:** how accurate each part of the report is, comments, and optional follow-up consent. Then submit.

## How the research changes the match

- **Candidates:** the match combines the candidate's impressions with the research.
  - The research's weight on the organisation picture is 0.8 × the employee lens's evidence strength, then adjusted by how well the candidate knows the organisation: +0.15 for "very little" down to −0.30 for "very well". It is capped at 80%.
  - The stated culture and the team picture are mixed in the same way, from the leadership and function lenses.
  - An entered OCAI survey halves the research's weight.
  - The report states the weights.
- **Current employees:** the match uses their own experience. The research appears alongside it for comparison, and their accuracy rating tests how far public sources can be trusted (protocol H8).

## What you get

- One row per participant in Google Sheets, with one column per item and per score, plus model outputs and feedback.
- `analysis/validate.py`:
  - **Data quality:** exclusions for inattention, speeding and straight-lining.
  - **Reliability and stability:** Cronbach's α, McDonald's ω, item–total statistics, and test–retest.
  - **Validity:** convergent validity against Hogan and Big Five scores, criterion validity, and incremental validity.
  - **Agreement:**
    - among raters of the same organisation (ICC);
    - between each research lens and insiders;
    - by evidence strength;
    - whether fit computed from public research alone predicts insiders' outcomes;
    - participants' report-accuracy ratings.
  - **Fairness and norms:** group differences, plus provisional norms.

## Files

| Path | Purpose |
|---|---|
| `src/instrument.json` | **Single source of truth** for every item, key, scale and block. The app, the analysis and the item-bank doc all read it |
| `src/template.html` | Participant app (UI, scoring, report, submission) |
| `config.json` | Study name, contact, ethics reference, backend URL |
| `build.py` | Builds `index.html` (template + instrument + shared engine + config) and `docs/item-bank.md` |
| `index.html` | The deployable app (generated; do not edit) |
| `backend/Code.gs` | Google Apps Script backend: submissions, withdrawals, multi-source company research |
| `analysis/validate.py` | Validation report from the exported sheet |
| `analysis/simulate.py` | Synthetic data for testing the pipeline |
| `docs/setup-guide.md` | Step-by-step deployment |
| `docs/research-protocol.md` | Hypotheses, design, sample size, measures, analysis plan, ethics |
| `docs/item-bank.md` | All items with keys and sources (generated) |

## Quick start

```bash
python3 fit-check/build.py
```

Then open `fit-check/index.html` in a browser. Without a backend URL, submissions are saved as a downloaded JSON file, which is handy for piloting. Follow [`docs/setup-guide.md`](docs/setup-guide.md) to connect Google Sheets and publish the app.

## Intellectual property and trademarks

- **Personality items:** the IPIP Big-Five markers (Goldberg, 1992), which are in the public domain.
- **All other items and descriptions** are original to this project. They build on published frameworks (the Competing Values Framework, the Big Five, Horney's interpersonal orientations, Groysberg's culture styles), but use their own wording. They do not reproduce the items, scale descriptions or report text of any commercial instrument.
- **Third-party names:** Hogan, HPI, HDS, MVPI, OCAI, Denison, Barrett CVA, Cultural Entropy, OPQ32, KF4D, NEO-PI-R, Glassdoor, AmbitionBox, Indeed and Kununu are trademarks of their respective owners. They are named only so that users can enter scores they already hold, or so the tool can cite sources.
- **No affiliation:** this project is independent and is not affiliated with or endorsed by any of these owners.
- **Licences:** administering any of those questionnaires to clients requires a licence from its publisher.

## Important caveats

- **Provisional scales:** only the IPIP personality items are an established measure. All other scales are new and provisional until the study data confirms them, so reports show 0–100 scale scores, not normed percentiles.
- **Not for decisions yet:** do not use the tool for hiring decisions until the protocol's validity criteria are met.
- **Ethics approval:** obtain it before recruiting, and complete the bracketed sections of the protocol.
