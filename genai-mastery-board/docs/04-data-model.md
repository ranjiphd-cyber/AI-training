# 04 — Data Model (Concept Database & Question Bank)

Storage format for the prototype: JSON files in `content/` (authored content) and
browser storage / a small database for learner state. Authored content and
learner state are kept **separate** so content can be updated without wiping progress.

```
content/            (authored, versioned in git)
  concepts.json      modules.json      questions.json
  exercises.json     projects.json     cases.json      sources.json
learner/            (personal state, never committed)
  progress.json     attempts.json     reviews.json    projects-state.json
```

## 1. Entities and relationships

```
Module 1─* Concept *─* Concept (related / confused_with / prerequisite)
Concept 1─* Explanation (one per level L1–L4)
Concept *─* Question      Concept *─* Exercise      Concept *─* ProjectSection
Concept *─* Source        Question 1─* Attempt     Concept 1─1 MasteryState
Concept 1─* ReviewItem    Project 1─* ProjectSection
```

## 2. `modules.json`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `M01` … `M15`, `IBM-1..3` |
| `pillar` | int 1–4 | |
| `title` | string | verbatim from brochure |
| `week` | int \| null | null = "Course material not currently available" |
| `brochure_bullets` | string[] | verbatim |
| `frameworks` | string[] | e.g. "COSTAR" |
| `tools` | string[] | |
| `exam_importance` | `H\|M\|L` | estimate until blueprint known |
| `practical_importance` | `H\|M\|L` | |
| `material_status` | `brochure_only\|learner_reported\|deck_available` | |

## 3. `concepts.json` — concept schema

| Field | Type | Required field from brief |
|-------|------|---------------------------|
| `id` | string `Cmm.n` | — |
| `name` | string | 1 |
| `module_id`, `week` | string, int\|null | 2 |
| `source_tag` | enum IITM-B / IITM-L / IITM-D / ALLIED / EXT / INF | source management |
| `explanations` | `{L1, L2, L3, L4}` each `{text, source_tag}` | 3, 4, progressive depth |
| `why_it_matters` | string | 5 |
| `how_it_works` | string (may include steps[]) | 6 |
| `business_relevance` | string | 7 |
| `analogy` | string | 8 |
| `example_practical` | string | 9 |
| `example_hr_ta` | string \| null | 10 |
| `example_general` | string | 11 |
| `common_mistakes` | string[] | 12 |
| `risks_limitations` | string[] | 13 |
| `related` | concept_id[] | 14 |
| `confused_with` | `[{concept_id, difference}]` | 15 |
| `tools` | string[] | 16 |
| `when_not_to_use` | string[] | 17 |
| `exam_takeaway` | string | 18 |
| `memory_aid` | string (one sentence) | 19 |
| `exercise_ids` | string[] | 20 |
| `prerequisites` | concept_id[] | knowledge connections |
| `next` | concept_id[] | "next you should learn" |
| `allied_extensions` | `[{title, summary, source_id, source_tag, volatile:bool}]` | MASTER mode |
| `course_vs_practice` | string \| null | conflict rule |
| `exam_importance`, `project_relevance` | `H\|M\|L` | map |
| `version`, `last_reviewed` | string, date | content governance |

### Example record (abridged)

```json
{
  "id": "C11.1",
  "name": "Retrieve-first thinking",
  "module_id": "M11",
  "week": null,
  "source_tag": "IITM-L",
  "explanations": {
    "L1": {"text": "Before answering, the AI looks up the right page in your documents — like an open-book exam.", "source_tag": "INF"},
    "L2": {"text": "Use when the answer must match your organisation's own, current documents. The model's general training does not know your leave policy.", "source_tag": "IITM-L"},
    "L3": {"text": "Query is converted to a search, top-k passages are retrieved from a prepared knowledge base, and the model is instructed to answer only from them and cite.", "source_tag": "ALLIED"},
    "L4": {"text": "Trade-offs: retrieval recall vs prompt length; stale index risk; long-context models reduce but do not remove the need for retrieval on large or permissioned corpora.", "source_tag": "EXT"}
  },
  "example_hr_ta": "A recruiter asks 'Can we pay a joining bonus for an L5 role in Pune?' The assistant retrieves the Compensation Guidelines v3.2 §4 and answers with that citation, or says 'not covered — escalate to Comp team'.",
  "common_mistakes": ["Uploading every document 'just in case'", "No 'not found' instruction, so the model fills gaps"],
  "confused_with": [{"concept_id": "C10.2", "difference": "Context injection pastes chosen documents into every conversation; RAG retrieves only the relevant passages per question."}],
  "when_not_to_use": ["Creative drafting with no factual source", "Questions needing live transactional data — use an integration/tool instead"],
  "exam_takeaway": "RAG = retrieve relevant passages first, then generate an answer grounded in and citing them.",
  "memory_aid": "Look it up, then speak up.",
  "exam_importance": "H"
}
```

## 4. `questions.json` — question bank architecture

### 4.1 Question types (brief items A–P)

| Code | Type | Answer format | Auto-gradable? |
|------|------|---------------|----------------|
| A | MCQ | single/multi select | yes |
| B | True/False | boolean + optional "why" | yes (why → tutor) |
| C | Fill in the blank | text, accepted variants list | yes (normalised match) |
| D | One-word | text, variants | yes |
| E | Short conceptual | 2–4 sentences | rubric (tutor) |
| F | 2-mark | key points list (2) | rubric |
| G | 4-mark | key points (4) | rubric |
| H | 8-mark analytical | structured answer, 8 points across dimensions | rubric |
| I | Scenario | free text / choice | mixed |
| J | Case study | multi-part | rubric |
| K | Choose the architecture | choice + justification | choice auto, justification rubric |
| L | Identify the error | point to step + explain | mixed |
| M | Prompt improvement | revised prompt | prompt rubric R1 |
| N | Workflow design | block spec | workflow rubric R2 |
| O | Agent architecture | role/handoff spec | rubric R5/R6 |
| P | Governance & risk | risk register entries | rubric R7 |

### 4.2 Question schema

| Field | Type | Notes |
|-------|------|------|
| `id` | string | `Q-C11.1-007` |
| `type` | A–P | |
| `concept_ids` | string[] | primary first; drives mastery update |
| `module_id` | string | |
| `difficulty` | 1–4 | Beginner, Intermediate, Advanced, Expert |
| `bloom` | enum | remember / understand / apply / analyse / evaluate / create |
| `marks` | int | 1, 2, 4, 8 |
| `stem` | string | |
| `options` | `[{key, text, is_correct, feedback}]` | per-option feedback explains *why* each distractor is wrong |
| `accepted_answers` | string[] | for C/D |
| `key_points` | `[{point, marks}]` | for E–H, J |
| `model_answer` | string | shown after attempt |
| `explanation` | string | principle + example |
| `misconception_tags` | string[] | e.g. `rag_equals_finetuning`, `agent_equals_chatbot` |
| `hints` | string[3] | hint ladder |
| `source_tag`, `source_ids` | | |
| `context_hr` | bool | TA-flavoured |
| `variant_group` | string | rewordings of the same item; anti-repetition |
| `exam_eligible` | bool | false for ALLIED/EXT-only items in exam simulation |
| `status` | draft / reviewed / retired | |

### 4.3 Example items

**A — MCQ (Intermediate, C11.1)**
> A recruiter assistant gives a confident but wrong answer about the notice-period
> buy-out policy. The policy PDF exists on the intranet. What is the most
> appropriate first fix?
> a) Raise temperature so it explores more answers
> b) Ground the assistant in the policy via retrieval and require citations ✔
> c) Fine-tune a model on all HR emails
> d) Add "be accurate" to the prompt
> *Feedback (d):* instructions cannot supply facts the model does not have.

**L — Identify the error (Advanced, C05.4)**
> Workflow: New offer approved (trigger) → AI drafts offer letter → letter emailed
> to candidate → logged in sheet. Identify the governance error.
> *Key point:* no human approval between AI draft and external send; offer letters
> are high-impact, legally binding communications (C05.3, C14.4).

**K — Choose the architecture (Expert, C13.1)**
> Weekly: collect 12 competitors' job postings, classify by skill, compare to last
> week, write a 1-page brief for the TA head. Chat / Automation / RAG / Single agent /
> Multi-agent — choose and justify.
> *Model answer:* scheduled **automation** with an AI classification step and an AI
> summary step is sufficient — steps are fixed and known; an agent adds
> unpredictability without benefit. Multi-agent only if sources and analysis
> paths vary run to run.

**H — 8-mark analytical (C14.2)**
> "Evaluate the risks of using an LLM to shortlist candidates for a graduate
> programme and propose controls." Key points (1 mark each): bias from historical
> data; proxy variables (college, gaps); explainability to candidates; regulatory
> high-risk classification (EXT EU AI Act); privacy/consent; HITL on every reject;
> adverse-impact monitoring by group; audit log and appeal route.

### 4.4 Selection algorithm for a test

1. Pick concept pool: by mode (module, weak topics, full course).
2. Allocate items: 40% weak/due concepts, 40% coverage of unseen H concepts, 20% maintenance of strong concepts.
3. Difficulty mix by level: Beginner (60/30/10/0), Intermediate (20/50/25/5), Advanced (10/30/45/15), Expert (0/20/40/40), Exam Simulation = blueprint mix (until known: 30% A–D, 30% E–G, 25% I–K, 15% H/L–P).
4. Anti-repetition: exclude items seen in last 14 days unless answered wrong; prefer an unseen `variant_group` member.
5. Balance types so no type exceeds 40% of a test ≥ 25 items.

## 5. `exercises.json`

| Field | Notes |
|-------|------|
| `id`, `lab` | lab = prompt / automation / dashboard / ci / rag / multisource / assistant / agent / multiagent / governance |
| `concept_ids`, `difficulty` | |
| `brief` | scenario |
| `steps` | `[{prompt_to_learner, expected_elements[], hints[3], rubric_id}]` |
| `model_solution` | locked until attempt |
| `transfer_task` | same principle, non-HR function |

## 6. `projects.json` / `cases.json`

Projects: `id (P1–P8)`, `level`, `title`, `concept_ids`, `sections[28]` each with
`{name, guiding_questions[], required:bool, concept_map:[{concept_id, why}]}`,
`rubric_ids`, `consulting_offer`.

Cases: `id`, `function`, `scenario`, `data_exhibits`, `questions[9]`,
`rubric_id: R8 + domain rubric`, `model_answer`, `difficulty`.

## 7. Learner state

**`MasteryState`** (one per concept)

| Field | Notes |
|-------|------|
| `concept_id` | |
| `status` | Not Started … Mastered |
| `scores` | `{understanding, quiz, practice, project, retention}` 0–100 each |
| `mastery` | 0–100 composite (see `06` §1) |
| `error_count_30d`, `misconceptions` | repeated-error tracking |
| `last_seen`, `level_viewed` | |

**`Attempt`**: `id, question_id|exercise_id, timestamp, mode (practice/exam), answer,
score, max, hints_used, time_sec, misconception_tags_hit[]`.

**`ReviewItem`** (spaced repetition): `concept_id | question_id, box (1–5),
stability_days, due_date, last_result, lapses`.

**`ProjectState`**: `project_id, section_status{}, drafts{}, rubric_scores{}, completed_at`.
