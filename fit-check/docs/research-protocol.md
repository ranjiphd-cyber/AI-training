# Research protocol: validating the C-Psych culture-fit assessment

**Instrument:** C-Psych Fit Check, version FC-1.2 (`src/instrument.json`). FC-1.1 reworded the culture items in original, behavioural language. FC-1.2 rewrote every item, answer label and instruction in plain English (short sentences, common words, no idioms; Flesch reading ease ≈ 72) so that non-native speakers can take part. Data from earlier versions is analysed separately.
**Status:** draft for ethics review. Adapt the sections marked *[complete]* before submission.

## 1. Background and aims

The C-Psych model predicts how well a person will fit a team and an organisation by comparing:
- the person's personality, work motives, working style and under-pressure tendencies, with
- the team's and organisation's culture: Competing Values profile, operating norms, psychological safety and leadership credibility.

It produces fit indices, a friction-risk index, a list of mismatches graded by severity, and advice.

The study establishes whether the instrument is **reliable** and **valid**, and builds **norms**, before the tool is used for real decisions.

## 2. Research questions and hypotheses

| # | Question | Hypothesis / criterion |
|---|---|---|
| H1 | Are the scales internally consistent? | α and ω ≥ .70 for multi-item scales; corrected item–total r ≥ .30 |
| H2 | Are scores stable over time? | Test–retest r ≥ .70 over 2–6 weeks |
| H3 | Do the questionnaire scales measure the intended constructs? | IPIP domains correlate r ≥ .50 with the matching domains of established instruments (participant-entered Hogan HPI or other Big Five); motive and pressure scales correlate r ≥ .30 with MVPI and HDS analogues |
| H4 | Do culture ratings reflect a shared organisational reality? | ICC(1) > .05 and ICC(k) ≥ .70 for organisations with ≥ 5 raters |
| H5 | Do fit indices predict experienced fit and outcomes? | Overall fit correlates r ≥ .20 with perceived P–O fit, satisfaction and intention to stay, and negatively with strain; friction index and number of major mismatches show the reverse |
| H6 | Does the model add value beyond asking people directly? | Model-derived fit explains variance in perceived fit beyond stated-preference fit (ΔR² > 0) |
| H7 | Do participants find the report accurate? | ≥ 70% agree (4–5) that each section describes them, their organisation and their fit accurately |
| H8 | Does the company research agree with insiders? | Mean absolute difference between the employee-lens profile and insider culture profiles < 10 share points per quadrant; leadership lens vs. insiders' espoused culture and function lens vs. team culture reported the same way; review-platform rating correlates r ≥ .30 with insiders' willingness to recommend; agreement improves with the lens's evidence strength |
| H8b | Is a match based on public research alone valid? | For current employees, fit computed from the research only (`m_pub_org`) correlates r ≥ .15 with perceived fit and satisfaction. This is the condition for relying on research when candidates know little |
| H9 | Do fit scores predict real outcomes later? | At 6–12 months, lower fit and more major mismatches predict voluntary exit and lower satisfaction (logistic / linear models) |
| H10 | Is the tool fair across groups? | Group differences on fit indices |d| < .30; no differential prediction by gender or age band |

## 3. Design

- **Phase 1 (cross-sectional):** current employees complete the full assessment, criterion measures and report-accuracy ratings in one session. A subsample retakes it after 2–6 weeks (H2).
- **Phase 2 (prospective):** participants who consent to follow-up are contacted 6–12 months later for status (stayed, left), satisfaction and perceived fit (H9). Candidate-mode participants are asked whether they joined and how it is going.
- **Multi-rater sampling:** aim for at least 15 organisations with 5 or more participants each, so organisation-level culture can be estimated from other raters (H4). It also lets H5 be retested with *other people's* ratings of the organisation (leave-one-out means), which removes common-method bias.

## 4. Participants *[complete]*

- **Inclusion:** aged 18+, currently employed (current mode) or actively considering an offer (candidate mode), able to read simple English. Record first language (or English fluency) if your committee allows, to test measurement invariance between native and non-native speakers.
- **Recruitment:** professional networks, HR associations, alumni groups and partner organisations. Participation is voluntary and unpaid; the incentive is the personal report.
- **Target sample:** n ≥ 300 current employees after exclusions. Detecting r = .20 with 80% power (two-tailed α = .05) needs n ≈ 194, and r = .15 needs n ≈ 346. Reliability estimates and provisional norms need n ≥ 200. Expect 10–15% exclusions for data quality, so recruit ~400.

## 5. Measures

| Domain | Scales | Items | Source |
|---|---|---|---|
| Personality | Extraversion, Agreeableness, Conscientiousness, Emotional Stability, Intellect/Imagination | 50 | IPIP Big-Five Factor Markers (Goldberg, 1992), public domain; plain-English adaptation with the same content and keying. Because the wording differs, H1 and H3 are tested on this version before published IPIP norms are used |
| Work motives | Recognition, Influence, Enjoyment, Contribution, Belonging, Tradition, Security, Financial reward, Quality & design, Analysis & learning | 30 | New, provisional (MVPI-type constructs) |
| Working style | Decision pace, risk appetite, directness, autonomy need | 12 | New, provisional |
| Culture preference | Clan, Adhocracy, Market, Hierarchy | 12 | New, provisional (Competing Values Framework constructs) |
| Under pressure | Volatility, mistrust, over-caution, over-confidence, limit-testing, perfectionism, over-dependence | 21 | New, provisional (Horney's moving away / against / toward clusters) |
| Organisation | Lived CVF (12), espoused CVF (4), operating norms (8), psychological safety (3), leadership credibility (2), recommend (1) | 30 | New, provisional |
| Team | CVF (8), norms (4) | 12 | New, provisional |
| Criteria | Perceived P–O fit (3), P–T fit (2), satisfaction (1), intention to stay (3), strain (1) | 10 | New, provisional |
| Data quality | Instructed-response attention checks | 2 | — |
| Feedback | Report accuracy ratings and comments | 5–7 | — |
| Optional | Participant-entered Hogan HPI/HDS/MVPI or other Big Five percentiles; organisation OCAI/Denison results | — | Used for H3 |
| Company research | Four lenses: employee reviews, leadership statements, news, function level. Each lens gives a culture profile, norms, evidence strength and sources | — | Claude with web search; used for H8 and H8b and, for candidates, weighted into the match |
| Familiarity | How well the candidate knows the organisation (4 levels) | 1 | Sets the research's weight in candidate reports |

The full item text and scoring keys are in [`item-bank.md`](item-bank.md).

## 6. Procedure

1. Participant information and consent (age 18+, informed, research use). Optional previous participant code (retest).
2. Demographics, questionnaire blocks, optional external scores, organisation and team information and ratings, criteria (current mode only, collected **before** the report is shown, to avoid contamination).
3. Personal report.
4. Report-accuracy ratings, comments, optional follow-up email.
5. Submission. The participant receives a code for withdrawal and retest.

## 7. Data quality rules (applied in `validate.py`)

Exclude records that are withdrawn, fail an attention check, take less than 8 minutes, or show identical answers across a whole block (straight-lining). Report exclusion counts.

## 8. Analysis plan

`analysis/validate.py` produces sections 1–9 of the validation report (reliability, retest, convergent validity, ICC, criterion and incremental validity, report accuracy, scan agreement, group differences, provisional norms). After Phase 1:

- **Structure:** confirmatory factor analysis of the IPIP domains and the new scales (for example with lavaan in R), and measurement invariance across gender and age bands.
- **Item revision:** drop or rewrite items with item–total r < .30 or poor loadings, then release FC-1.2.
- **Calibration:** re-estimate the model weights (team / organisation / derailer contributions) against the criteria using cross-validation. Publish the old and new weights and their validities.
- **Norms:** convert scale scores to percentiles from `norms.csv`, by population (country, level) where n ≥ 300.

## 9. Ethics and data protection *[complete with your institution]*

- **Approval:** obtain institutional ethics committee (IEC/IRB) approval before collecting data, and enter the reference in `config.json`.
- **Consent:** obtained in the app. It covers voluntary participation, the right to withdraw using the participant code, and anonymous research use.
- **Anonymity and data minimisation:** no names are collected. The organisation name is optional and analysed only in aggregate; no organisation or person is ever reported individually. Follow-up emails are stored in a separate sheet keyed only by the participant code.
- **Storage and security:** a private Google Sheet accessible only to the research team, retained for the period stated in `config.json`, then deleted. Withdrawals are deleted monthly (`purgeWithdrawn`).
- **Legal basis:** consent under India's Digital Personal Data Protection Act 2023; GDPR also applies if EU residents take part. Participants can request deletion at any time.
- **Risk and support:** some participants may find a mismatch report uncomfortable. The report uses non-judgemental language and says it is not a hiring decision or a measure of worth. Add a signpost to support resources in the participant information if your committee requires it.
- **Public sources:** the company research uses a web-search tool to read publicly available pages (review platforms, news, company pages) and summarise patterns. It does not scrape review sites, reproduce individual reviews or name individuals. Its output is shown with its sources and evidence strength, as a picture for participants to compare with their own experience.
- **Use of results:** during the study, reports are for participants' own reflection only and are never shared with employers.

## 10. Limitations

- **Common-method variance:** predictors and criteria are both self-reported in Phase 1. Mitigations: leave-one-out organisation means, Phase 2 outcomes.
- **Unvalidated scales:** the new scales start provisional, and the model weights are theory-based until recalibrated.
- **Sampling bias:** self-selected participants may differ from the general workforce. Report the sample composition alongside all results.
