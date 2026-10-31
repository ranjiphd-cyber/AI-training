# Platform blueprint: person–organisation fit for Indian professionals

Version FC-2.0. This document covers:
1. Culture typology in plain language
2. Item recalibration for English-as-a-second-language users
3. The short form and why it keeps reliability and validity
4. The modular fit report
5. Workflows and data schemas for candidates, recruiters and consultants

The **Status** columns show what is live in the app now and what is planned.

---

## 1. Culture typology translation

The framework is unchanged: Cameron & Quinn's Competing Values Framework. Only the labels people see have changed. Data keys keep the original names (`clan`, `adhoc`, `market`, `hier`), so OCAI results still map directly.

| Original CVF term | New plain-English label | One-line workplace definition |
|---|---|---|
| Clan | **People-First** | A supportive, team-oriented workplace where leaders coach people and success comes from working well together. |
| Adhocracy | **Innovation-Led** | A fast, idea-driven workplace where leaders encourage new ideas and success comes from creating something new. |
| Market | **Results-Driven** | A target-focused, competitive workplace where leaders push for performance and success comes from hitting the numbers. |
| Hierarchy | **Process-Driven** | An orderly, rule-based workplace where leaders coordinate and success comes from being reliable and following procedure. |

**Where the labels appear:**
- **Participant reports:** a definition list sits under the culture chart.
- **OCAI entry tables:** the original term is shown in brackets, e.g. "People-First (OCAI: Clan)".
- **Assessor tool:** sliders show "OCAI term: …" as a hint.
- **Methodology sections:** both names are given once.

---

## 2. Item bank recalibration (ESL, Indian professional context)

### 2.1 Writing rules applied to every stem
1. **One idea per sentence.** No double-barrelled stems: "I am kind and caring" was split, or one part removed.
2. **Concrete settings.** Use situations an Indian professional recognises (meetings, colleagues, social gatherings), not party culture or idioms such as "feel blue" or "life of the party".
3. **Common words.** Use high-frequency words at about CEFR B1; no phrasal verbs with hidden meanings ("shirk", "keep in the background").
4. **No vocabulary-dependent items.** Items that reward English proficiency are removed, because they would measure language skill rather than the trait (construct contamination).
5. **Neutral wording for socially sensitive traits.** Low-agreeableness and low-conscientiousness stems describe behaviour, not character judgements, to reduce social-desirability bias.
6. **Key balance.** Each personality domain keeps 2 positively and 2 negatively keyed items, to control for acquiescence ("yes-saying").

### 2.2 Specified items

| Ref. | Original stem | Latent trait | Diagnosed issue | Calibrated stem | Decision |
|---|---|---|---|---|---|
| Q5 (P05) | "I know and I use many words." (IPIP: "Have a rich vocabulary") | Intellect, verbal facet | Measures English vocabulary, not intellect. ESL users score low for language reasons, which is a systematic bias against Indian ESL respondents. "Many words" is also vague. | *Reserve:* "I enjoy learning about new subjects, even outside my work." | **Removed** from the short form (not in the Mini-IPIP). The reserve stem is for any future long form. |
| Q26 (P26) | "I have little to say." | Extraversion (reverse-keyed) | Ambiguous: it can mean shy, uninformed or having no opinion. It reads as a negative self-judgement, so people avoid agreeing (social desirability). | *Reserve:* "In meetings, I usually listen more than I speak." | **Removed** from the short form. Extraversion keeps two clearer reverse items (P06, P16). |
| Q40 (P40) | "I speak difficult words." (IPIP: "Use difficult words") | Intellect, verbal display | Rewards English proficiency and can sound like showing off. "Speak words" is also an awkward form. Weak validity for ESL users. | *Reserve:* "I enjoy discussing complex topics with others." | **Removed** from the short form. |
| MV_aff_2 | "Being with colleagues often gives me energy." | Affiliation motive (need to work with others), not extraversion | "Gives me energy" is a metaphor that ESL readers interpret differently. It also overlaps with the Extraversion trait, which weakens the distinction between motives and personality. | "I prefer a job where I work closely with colleagues for most of the day." | **Rewritten** and kept. |

### 2.3 Personality items in the short form (Mini-IPIP, 20 items)

Key: + means agreeing raises the trait score; − means it lowers it. Emotional Stability is the reverse of the IPIP's Neuroticism scale.

| Ref. | Trait (key) | FC-1.2 stem | FC-2.0 calibrated stem | Why changed |
|---|---|---|---|---|
| P01 | Extraversion (+) | I bring energy and fun to social events. | At social gatherings, I am usually the one who keeps the conversation lively. | "Bring energy" is a metaphor; now a concrete behaviour |
| P06 | Extraversion (−) | I do not talk much. | I speak very little, even when I am with people I know. | Separates quietness from talking little with strangers |
| P16 | Extraversion (−) | In a group, I prefer to stay unnoticed. | In a group, I prefer to stay quiet and let others take the lead. | Concrete behaviour |
| P31 | Extraversion (+) | At social events, I talk to many different people. | At social gatherings, I talk to many different people. | "Gatherings" fits Indian usage better than "events" |
| P17 | Agreeableness (+) | I understand and care about how others feel. | When someone is upset, I can understand how they feel. | Removes the double-barrelled "understand and care" |
| P22 | Agreeableness (−) | I am not interested in other people's problems. | Other people's problems do not interest me. | Simpler sentence structure |
| P32 | Agreeableness (−) | I am not really interested in others. | I am not very interested in the lives of other people. | Clearer object; reduces the harsh tone |
| P42 | Agreeableness (+) | I feel other people's emotions. | When people around me are happy or sad, I feel it too. | Concrete; "emotions" was abstract |
| P18 | Conscientiousness (−) | I often do things in a careless way. | My work is often careless or untidy. | Anchored to work |
| P23 | Conscientiousness (+) | I do my tasks immediately, without delay. | I finish my tasks at once, without delay. | Simpler |
| P28 | Conscientiousness (−) | I often forget to put things back in their place. | After using something, I often forget to put it back in its place. | Clearer sequence |
| P33 | Conscientiousness (+) | I like things to be tidy and organised. | I like to keep my things and my work well organised. | Personal and work context |
| P09 | Emotional stability (+) | I am relaxed most of the time. | Most of the time, I feel relaxed. | Simpler |
| P19 | Emotional stability (+) | I rarely feel sad. | I rarely feel low or sad. | Fuller meaning of "blue" |
| P29 | Emotional stability (−) | I get upset easily. | Small things can upset me easily. | Concrete threshold |
| P39 | Emotional stability (−) | My mood often goes up and down. | My mood changes many times in a day. | Concrete frequency; no idiom |
| P10 | Intellect (−) | I find it hard to understand theories and complex ideas. | I find it hard to understand ideas that are not practical or concrete. | Original meaning of "abstract", explained in plain words |
| P15 | Intellect (+) | I have a strong imagination. | I can easily picture new things in my mind. | Behavioural |
| P20 | Intellect (−) | I am not interested in theories and ideas. | I am not interested in discussing ideas and theories. | Behavioural |
| P30 | Intellect (−) | I do not have a good imagination. | I find it hard to imagine things I have not seen. | Avoids the self-judgement "not good" |

**Answer labels.**
- Personality: Very untrue of me, Untrue of me, In between, True of me, Very true of me.
- All other sections: Strongly disagree, Disagree, Neutral, Agree, Strongly agree.

---

## 3. Short form: 179 → 115 items, about 12–15 minutes (from 20–25)

| Section | FC-1.2 | FC-2.0 | How the items were chosen |
|---|---|---|---|
| Personality | 50 | **20** | The Mini-IPIP (Donnellan, Oswald, Baird & Lucas, 2006, *Psychological Assessment*, 18, 192–203). It is a published, validated 20-item short form of the IPIP-50 with 4 items per domain. The original study reports adequate internal consistency, test–retest stability, and validity comparable with the full scales. |
| Work motives | 30 + 1 check | **20** + 1 | The two positively worded, most central items per motive. The reversed item was dropped, because short reversed items behave worst in ESL samples. |
| Working style | 12 | **8** | Two items per norm (pace, risk, directness, autonomy) |
| Culture preference | 12 | **8** | Two items per culture type, with **the same content as the team and organisation items** |
| Under pressure | 21 + 1 check | **14** + 1 | Two items per tendency |
| Organisation | 30 | **24** | Lived culture 12 → 8 (same content as above); stated culture 4; norms 8; psychological safety 3 → 2 (one positive, one reversed); credibility 2 → 1; recommend 1 |
| Team | 12 | 12 | Unchanged |
| Outcomes (current employees only) | 10 | **7** | Two each for perceived fit and intention to stay; one each for team fit, satisfaction and strain |
| **Total** | **179** | **115** | About 7 seconds per item, plus the information pages |

### 3.1 Why validity and reliability are protected
1. **Established short form for personality.** The Mini-IPIP has its own peer-reviewed validity evidence, so the study does not rely on an untested cut of the IPIP-50.
2. **Commensurate measurement.** You, your team and your organisation are now rated on the *same eight culture statements*. Comparing like with like is the best-supported method in person–organisation fit research (Kristof, 1996; Edwards, 1991), and it removes the error that different wording introduced.
3. **Two items per narrow scale.** Motives, styles and pressure tendencies are narrow constructs. Two well-chosen items capture most of the reliable variance; reliability is reported with the Spearman–Brown coefficient (Eisinga et al., 2013).
4. **Less fatigue, better data.** Long questionnaires increase careless responding and drop-out, which harm reliability more than a few fewer items do. The app now:
   - shows "about N min left" on every question page;
   - shows 6–10 questions per page;
   - autosaves, so people can stop and return.
5. **Pre-set decision rules.** `analysis/validate.py` applies these targets, and the study tests them:

| Check | Target | If missed |
|---|---|---|
| Mini-IPIP domains | α ≥ .60, test–retest ≥ .70, r ≥ .50 with Hogan or Big Five scores | Report; do not add items back unless retest also fails |
| 2-item scales | Spearman–Brown ≥ .60, inter-item r between .30 and .70 | Restore the third item from the FC-1.2 bank (all dropped IDs are listed in `instrument.json → form.dropped_from_FC_1_2`) |
| Culture profile | Agreement within organisations, ICC(k) ≥ .70 | Increase raters per organisation |
| Fit indices | r ≥ .20 with outcomes | Recalibrate the model weights |

---

## 4. Modular report architecture

Every report is assembled from the same modules. Each audience sees a different selection and depth.

| # | Module | Inputs | Output | Candidate | Recruiter / hiring manager | Consultant / enterprise | Status |
|---|---|---|---|---|---|---|---|
| M1 | Verdict and fit indices | Fit engine | Overall, team and organisation fit; friction risk; verdict | ✓ | ✓ (summary) | ✓ | Live |
| M2 | Culture map | Culture items, OCAI, research | Four culture types for you, team and organisation, with definitions | ✓ | ✓ | ✓ plus team-level aggregates | Live |
| M3 | Personality profile | Mini-IPIP or Hogan | Five traits in plain words | ✓ | Opt-in only | ✓ | Live |
| M4 | Motives versus rewards | Motive items, culture profile | Top motives and whether this culture rewards them | ✓ | ✓ | ✓ | Live |
| M5 | Under pressure | Pressure items, triggers in the environment | Likely tendencies and self-management tips | ✓ | Never shown | Aggregate only | Live |
| M6 | Mismatch cards | Engine gaps | Mild, significant and major mismatches, with meaning, action and question to ask | ✓ | ✓ (as interview probes) | ✓ | Live |
| M7 | Company research | Public sources (four lenses) | Evidence, source agreement, words vs experience, research-only fit | ✓ | ✓ | ✓ | Live |
| M8 | 90-day plan and questions | Mismatches | Actions, plus questions to ask before deciding | ✓ | Onboarding version | ✓ | Live (candidate view) |
| M9 | Methodology and caveats | Static | Instrument version, limits, fair-use statement | ✓ | ✓ | ✓ | Live |
| M10 | Cohort analytics | Many records | Fit distributions, culture heatmaps by team, adverse-impact checks | — | — | ✓ | Planned |

**Report payload** (what a renderer receives):

```json
{
  "report_id": "string",
  "instrument_version": "FC-2.0",
  "audience": "candidate | recruiter | consultant",
  "subject": { "pid": "FC-XXXX-XXXX", "mode": "candidate | current", "role_level": "string", "function": "string" },
  "organisation": { "name": "string", "unit": "string", "research": { "strength": "low|moderate|high", "sources": 0 } },
  "indices": { "overall": 0, "team": 0, "organisation": 0, "friction": "Low|Moderate|High|Critical", "verdict": "string" },
  "culture": { "self": {"clan":0,"adhoc":0,"market":0,"hier":0}, "team": {}, "organisation": {}, "stated": {}, "public": {} },
  "personality": { "E":0, "A":0, "C":0, "ES":0, "O":0, "source": "mini-ipip | hogan | big5" },
  "motives": [{ "key": "rec", "score": 0, "rewarded": "strongly|partly|weakly" }],
  "pressure": [{ "key": "excitable", "score": 0, "activation": 0 }],
  "mismatches": [{ "dimension": "string", "severity": "mild|significant|major", "gap": 0, "context": "team|organisation", "meaning": "string", "action": "string", "question": "string" }],
  "plan_90_day": ["string"],
  "modules": ["M1","M2","M4","M6","M7","M9"]
}
```

---

## 5. Multi-stakeholder workflows

### 5.1 Candidate self-assessment
1. Open the public link, choose "I am considering joining an organisation", and consent.
2. Answer the questionnaire (about 12–15 minutes).
3. Name the organisation. Company research runs in the background.
4. Get the instant report with all modules, then download it.
5. Rate the report's accuracy, and optionally agree to a 6-month follow-up.

**Status:** live.

### 5.2 Recruiter-initiated invite
1. The recruiter creates a link (format below) and sends it to the candidate.
2. The candidate sees who invited them. The company and unit are pre-filled, and candidate mode is pre-selected.
3. The candidate completes the questionnaire and sees their full report.
4. **Sharing is the candidate's choice.** A separate consent screen will ask whether to share a recruiter summary (M1, M2, M4, M6 as interview probes, M7). M5 is never shared.
5. The recruiter receives the summary for interview planning, never as a hiring decision.

**Status:**
- Steps 1–3 are **live**. The invite code and inviter are saved with the response.
- Step 4 is **disabled during the research study**: the participant notice says nothing is shared.
- Step 5 needs authenticated recruiter accounts (planned).

**Invite link format:**
```
https://ranjiphd-cyber.github.io/AI-training/fit-check/?invite=REC-0042&by=Priya%20Sharma%2C%20TalentCo&org=Acme%20Robotics&unit=R%26D%20Pune&mode=candidate
```

| Parameter | Meaning | Limits |
|---|---|---|
| `invite` | Code for grouping responses | Letters, numbers, `-` and `_`; up to 40 characters |
| `by` | Inviter shown to the candidate | Up to 80 characters; `<` and `>` removed |
| `org`, `unit` | Pre-fill the company research | Up to 120 characters each |
| `mode` | `candidate` or `current` | Optional |

### 5.3 Consultant / enterprise bulk analytics
1. The consultant creates one invite code per client team, for example `ACME-RND-2026Q4`.
2. Employees take part in "current employee" mode.
3. Responses arrive in the study sheet, tagged with `invite_code`.
4. The consultant exports the CSV and runs the analytics: team culture profiles, agreement within teams, fit distributions, mismatch hot spots, and adverse-impact checks.
5. The consultant delivers an aggregate report. Teams with fewer than 10 respondents are suppressed so no one can be identified.

**Status:** steps 1–3 are live. Step 4 works today with `analysis/validate.py`; a dedicated cohort report (M10) is planned.

**Bulk export row** (one per participant; the full list is in `docs/item-bank.md` plus the model columns):

```json
{
  "pid": "FC-XXXX-XXXX", "instrument_version": "FC-2.0", "mode": "current", "submitted_at": "ISO-8601",
  "invite_code": "ACME-RND-2026Q4", "invite_by": "string", "org_unit": "string",
  "demo_level": "string", "demo_func": "string",
  "sc_P_E": 0, "sc_MV_rec": 0, "sc_OR_clan": 0,
  "m_overall": 0, "m_team": 0, "m_org": 0, "m_friction_band": "Low", "m_majors": 0,
  "scan_strength": "moderate", "m_pub_org": 0,
  "FB_self": 4, "FB_org": 4
}
```

### 5.4 Data protection and fair use (DPDP Act 2023 / GDPR)
- **The candidate owns the report.** Sharing needs separate, explicit, revocable consent, which is not bundled with research consent.
- **No sharing during the research phase.** Nothing is shared with employers until the protocol's validity criteria are met.
- **Never the only basis for a decision.** Recruiter outputs say so on every page.
- **Adverse impact** is monitored by gender, age band and language background before any operational use.
- **Minimum group size for aggregates:** 10 respondents.
