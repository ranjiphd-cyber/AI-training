# 06 — Mastery Engine, Revision Engine, AI Tutor, Allied-Learning Engine

All thresholds here are the single source of truth; other documents refer to them.

## 1. Mastery engine

### 1.1 Five evidence scores per concept (0–100)

| Score | What feeds it | Calculation |
|-------|---------------|-------------|
| **U — Understanding** | LEARN concept checks, teach-back | best of last 2 concept checks; teach-back rubric overrides if higher |
| **Q — Quiz** | TEST items tagged to the concept | recency-weighted accuracy; half-life 21 days; difficulty weights Beginner 1.0, Intermediate 1.2, Advanced 1.4, Expert 1.6; marks-weighted for F–H |
| **P — Practice** | lab rubric scores on exercises tagged to the concept | mean of best attempt per exercise, last 3 exercises |
| **B — Build** | project sections mapped to the concept | rubric % of those sections; 0 if none yet |
| **R — Retention** | spaced reviews | share of last 4 due reviews passed, × 100 |

**Hint penalty:** each hint used on an item reduces that item's credit by 15%;
"Show answer" gives 0 credit (but the item enters the review queue).

### 1.2 Composite

```
mastery = 0.20·U + 0.30·Q + 0.20·P + 0.15·B + 0.15·R  − error_penalty

error_penalty = min(15, 5 × number of repeat misconceptions in last 30 days)
```

If B has no data yet, its weight is redistributed proportionally across the
others (so early learners are not capped artificially), **but** these evidence
caps apply:

| Missing evidence | Mastery capped at |
|------------------|-------------------|
| No TEST attempt | 60 |
| No PRACTICE attempt | 55 |
| No spaced review passed | 84 (cannot reach Mastered) |

### 1.3 Status thresholds

| Status | Rule |
|--------|------|
| Learning | any activity, mastery < 40 or concept check failed |
| Practising | concept check passed and ≥ 1 practice attempt |
| Competent | mastery ≥ 70 **and** ≥ 1 TEST session on it ≥ 70% |
| Mastered | mastery ≥ 85 **and** ≥ 2 passed reviews ≥ 7 days apart **and** used in a BUILD section or teach-back ≥ 80% |
| Decay | a failed review on a Mastered concept → Competent; two consecutive fails → Practising |

### 1.4 Roll-ups
- **Module mastery** = mean of its concepts' mastery, weighted by exam importance (H 3, M 2, L 1).
- **Course mastery, Exam readiness, Practical skills** — formulas in `03` §5.
- **Competency level** (L1–L10) = highest level whose knowledge concepts are all ≥ Competent **and** whose project/assessment evidence exists (`02` §6).

## 2. Revision engine

### 2.1 Spaced schedule (prototype: Leitner, upgrade path: FSRS)

| Box | Next review after | Move |
|-----|-------------------|------|
| 1 | 1 day | correct → box 2 |
| 2 | 3 days | correct → box 3 |
| 3 | 7 days | correct → box 4 |
| 4 | 14 days | correct → box 5 |
| 5 | 30 days | correct → stays (interval × 1.5, max 90 days) |

Wrong → box 1. Correct *with hint* → stays in the same box. Review items are
**new wordings** of the concept (different `variant_group` member) so you recall
the idea, not the sentence.

### 2.2 Priority score (decides what you see first)

```
priority = 0.35 × (1 − mastery/100)
         + 0.20 × overdue_factor          (0 if not due; 1 if ≥ 1 interval overdue)
         + 0.20 × recent_error_factor     (errors in last 14 days, capped at 1)
         + 0.15 × exam_weight             (H 1.0, M 0.6, L 0.3)
         + 0.10 × centrality              (share of concepts that depend on it)
```

A concept that is Mastered and not due scores ≈ 0.05 and is effectively skipped.

### 2.3 Time allocation in any review session
- 60% weakest / highest-priority concepts
- 30% concepts due today
- 10% maintenance of mastered concepts (one item each, rotating)

### 2.4 Special playlists
| Playlist | Length | Content |
|----------|--------|---------|
| Rapid revision | 15 min | top-10 priority concepts: memory aid + 1 question each |
| Night before exam | 60 min | one-page summaries for all H concepts, comparison tables, 25-Q mixed test in Exam Mode, then error replay only |
| Error replay | open | every question answered wrong in last 30 days, reworded |
| Confusion pairs | 10 min | side-by-side drills on `confused_with` pairs (assistant vs agent, context injection vs RAG, automation vs agent, accuracy vs reliability) |

## 3. AI tutor behaviour

### 3.1 Decision rules

| Situation | Tutor does | Tutor does **not** |
|-----------|-----------|--------------------|
| New concept | Explain at L1/L2 (your last level), then demonstrate one worked example | dump L1–L4 at once |
| After explaining | Ask a predict / diagnose question before moving on | continue lecturing |
| You ask "what's the answer?" before attempting | Ask for your best attempt, even a partial one; offer Hint 1 | give the answer |
| First wrong attempt | Name the incorrect part; give Hint 1 (direction) | say "wrong" without reason |
| Second wrong attempt | Hint 2 (framework or principle) | — |
| Third wrong attempt | Hint 3 (partial answer); then offer full answer | withhold indefinitely |
| You explicitly say "show me" after 1 attempt | Show answer, mark as assisted, schedule review | refuse |
| Correct but shallow | Ask "why?" or "what would change if…?" | accept and move on |
| Correct and justified | Escalate difficulty; ask for transfer to non-HR | repeat same level |
| Exam Mode | Silent until submit; then full explanations | give hints |
| Project / design work | Socratic: one or two questions per section | write the whole design |

### 3.2 Correcting a mistake — always five parts

1. **What part is incorrect** — quote it.
2. **Why** — the reasoning error.
3. **Correct principle** — one sentence, linked to the IITM concept ID.
4. **Example** — preferably TA, then one other function.
5. **Confirmation problem** — a short new question on the same principle.

*Example:* You said "an HR chatbot that answers from the policy PDF is an agent."
(1) "is an agent". (2) It does not pursue a goal with tools or take actions; it
retrieves and answers. (3) An agent plans and acts with tools toward a goal
(C13.1); a document-grounded assistant retrieves and responds (C11.4).
(4) Agent: books interview slots in calendars. Assistant: explains the
interview policy. Finance: agent chases quotes; assistant explains expense rules.
(5) "A bot reads new CVs and moves strong ones to the next ATS stage. Which is it?"

### 3.3 Difficulty escalation

- 3 correct in a row at a level → next difficulty.
- 2 wrong in a row → drop one level and show a worked example.
- Within-session ceiling: no more than 2 level-ups per session (consolidation).

### 3.4 Tone rules
Professional and encouraging; no flattery, no "Great question!". Challenge
incomplete reasoning directly ("You chose an agent. What does it need to do that
a fixed workflow cannot?"). Require justification on any architecture, risk or
tool choice. Business language first, technical term second, in brackets on
first use.

### 3.5 Source-labelling rules for the tutor
- Every explanation starts with or carries its source tag.
- Never present ALLIED/EXT material as IITM teaching.
- When the IITM deck for a concept is not available, say "Course wording not yet available; this is a general explanation (INF)."
- For volatile topics (tool features, model names, regulation dates) add "verify at source — changes frequently".

### 3.6 Tutor system instruction (draft for Phase 6)

```
ROLE: You are the learner's tutor for the IITM Pravartak Executive Programme in
Generative AI and Agentic AI Tools for Business. The learner is a senior Talent
Acquisition leader and aspiring process-improvement consultant, not a developer.

PRIMARY SOURCE: IITM course content supplied in CONTEXT, tagged IITM-B/IITM-L/IITM-D.
Preserve its terminology, frameworks and sequence. Label anything else ALLIED, EXT or INF.

METHOD: Explain → Demonstrate → Ask → Let the learner try → Evaluate → Correct
→ Practise again → Apply. Never give a full solution before the learner attempts,
unless they explicitly ask after one attempt. Use the hint ladder.

FEEDBACK: Use the five-part correction. Score against the rubric supplied in CONTEXT.
Report score per criterion with one-line reasons.

CONSTRAINTS: One or two questions per turn. TA example first, then a transfer
example from another function. No invented course facts; if unknown, say so.
OUTPUT: Return JSON {feedback, rubric_scores, missing_elements, next_question,
concepts_touched, misconceptions} so the board can update mastery.
```

## 4. Internet / allied-learning engine

### 4.1 When it is triggered
- MASTER mode / Expert Extension tab is opened.
- A concept has an `allied_extensions` entry marked `volatile` and `last_reviewed` > 90 days.
- You ask a question the IITM material does not cover.
- A conflict between course view and current practice is suspected.

### 4.2 Source hierarchy

| Rank | Source type | Examples | Used for |
|------|-------------|----------|---------|
| 1 | Standards & regulators | NIST AI RMF / AI 600-1, ISO/IEC 42001, EU AI Act text, India DPDP Act & Rules | governance, risk, compliance |
| 2 | Official technical documentation | model providers' docs, MCP specification, n8n / Make / Zapier docs | features, tool calling, structured outputs |
| 3 | Peer-reviewed / university research | RAG (Lewis et al. 2020), evaluation research | concepts and evidence |
| 4 | Recognised security bodies | OWASP Top 10 for LLM Applications | security |
| 5 | Credible industry practice | engineering blogs from model providers, analyst reports with methodology | patterns, adoption |
| ✗ | Excluded | anonymous listicles, vendor marketing without evidence, unsourced social posts | — |

### 4.3 Rules
1. **Supplement, never replace.** Allied content appears in its own panel under the IITM content, never inside it.
2. **Bridge sentence required:** every allied card begins "This extends IITM concept Cxx.x (…) by …".
3. **Cite and date:** source title, publisher, date, link, date retrieved.
4. **Volatility flag:** model capabilities, prices, tool features and regulatory timelines are flagged "fast-changing; verified on <date>".
5. **Conflict display:** "Course view vs current practice" table — what the course says, what current practice says, why they differ (simplification for no-code audience, newer development, different context), which to use in the exam (course view) and at work.
6. **Depth control:** allied content defaults to L2; L3/L4 behind "go deeper".
7. **Review cadence:** volatile cards re-checked every 90 days; stable cards yearly.

### 4.4 Example conflict card

| | |
|---|---|
| Concept | C13.2 Agent roles (Planner, Researcher, Executor, Reviewer) |
| Course view (IITM-L) | Decompose work into multiple role-based agents with clear handoffs |
| Current practice (EXT, Anthropic 2024) | Start with the simplest design; many tasks are better served by a single agent or a fixed workflow; add agents only when it measurably helps |
| Why they differ | The course teaches the multi-agent *pattern*; practice adds the *selection discipline* |
| Exam | Use the role vocabulary and handoff principles as taught |
| Work | Apply the Multi-Agent Lab gate question first |
