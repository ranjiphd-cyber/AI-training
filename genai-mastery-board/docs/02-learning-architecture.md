# 02 — Learning Architecture

## 1. The loop

```
        ┌────────────────────────────────────────────────────────────────┐
        ▼                                                                │
   ┌─────────┐   ┌──────────┐   ┌────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐
   │  LEARN  │──►│ PRACTISE │──►│  TEST  │──►│ BUILD  │──►│  REVIEW  │──►│  MASTER  │
   └─────────┘   └──────────┘   └────────┘   └────────┘   └──────────┘   └──────────┘
   understand     apply with      retrieve      integrate     revisit what   extend beyond
   one concept    guidance        without help  several       is fading or   the course,
                                                concepts      weak           teach-back
```

Each stage has an **entry condition**, an **activity**, and an **exit evidence**.
The board will not mark a concept "Mastered" from reading alone.

| Stage | Entry | Activity | Exit evidence | Bloom level (revised) |
|-------|-------|----------|---------------|-----------------------|
| LEARN | concept unlocked (prerequisites ≥ Learning) | read L1→L4, predict-before-reveal prompts, 3-question check | 2/3 on concept check | Remember, Understand |
| PRACTISE | concept check passed | guided exercise with hints; tutor evaluates attempt | exercise rubric ≥ 60% | Apply |
| TEST | ≥1 practice done | mixed questions, no hints in Exam Mode | ≥ 70% on concept's items across ≥ 2 sessions | Apply, Analyse |
| BUILD | 3+ related concepts at Practising | project lab at level matching concepts | project rubric ≥ 70% | Analyse, Evaluate, Create |
| REVIEW | always on | spaced retrieval, error replay | recall maintained at due date | Remember → Evaluate |
| MASTER | concept ≥ Competent | allied extension, teach-back, critique a flawed design | teach-back scored ≥ 80%; expert question correct | Evaluate, Create |

**Why this order** (EXT, learning science): retrieval practice beats re-reading
(Roediger & Karpicke 2006); spaced review beats massed review; mastery learning
(Bloom 1968) means you move on when you can show it, not when time is up.

## 2. Concept status ladder (per concept)

| Status | Rule (computed by mastery engine, `06-engines-and-tutor.md`) |
|--------|-------------------------------------------------------------|
| Not Started | no activity |
| Learning | LEARN opened; concept check < 2/3 or not taken |
| Practising | concept check passed; ≥1 practice attempt |
| Competent | mastery score ≥ 70 and at least one TEST session ≥ 70% |
| Mastered | mastery score ≥ 85, retained at ≥ 2 spaced reviews ≥ 7 days apart, plus one BUILD or teach-back using it |

A Mastered concept **decays** back to Competent if a spaced review is failed.

## 3. Progressive depth inside LEARN

Every concept has four levels. You can jump between them; the board remembers
your last level per concept.

| Level | Audience | Style | Example (C11.2 RAG) |
|-------|----------|-------|---------------------|
| L1 — New to AI | anyone | plain language, analogy | "An open-book exam: the AI looks up your policy first, then answers." |
| L2 — Business practitioner | manager | what it does, when to use, cost/risk | "Use when answers must match *your* documents; cheaper and more current than retraining." |
| L3 — Solution design | designer | components, data flow, failure points | "Query → retriever over chunked, tagged documents → top-k passages → prompt with citation rule → answer." |
| L4 — Expert | architect | trade-offs | "Chunk size vs recall; hybrid search vs pure vector; reranking latency vs precision; when long-context beats RAG." |

## 4. The teaching cycle inside every stage

```
EXPLAIN → DEMONSTRATE → ASK → LET ME TRY → EVALUATE → CORRECT → PRACTISE AGAIN → APPLY
```

| Step | Board behaviour | You do |
|------|----------------|--------|
| Explain | short card at your chosen level | read |
| Demonstrate | worked example, with the reasoning shown | follow |
| Ask | a predict / compare / diagnose question **before** revealing more | commit an answer |
| Let me try | blank or partially filled template | attempt |
| Evaluate | rubric score with reasons | read feedback |
| Correct | *what* is wrong → *why* → correct principle → example | revise |
| Practise again | a short new problem on the same principle | attempt |
| Apply | transfer to TA, then to a non-HR function | attempt |

**Verbs the board rotates through** so learning stays active: predict, design,
compare, diagnose, correct, build, explain, justify.

## 5. Knowledge connections (on every concept page)

Three panels:

- **YOU ALREADY LEARNT** — prerequisites, with your status on each.
- **THIS CONNECTS TO** — sibling concepts and the allied concepts it unlocks.
- **NEXT YOU SHOULD LEARN** — the next node on the spine, chosen by the recommendation engine.

Example for C03.2 COSTAR:

| Already learnt | Connects to | Next |
|----------------|-------------|------|
| C02.1 How LLMs generate | C03.3 four building blocks · C06.2 storylines · C10.1 assistant charter · ALLIED context engineering | C03.5 Structured outputs → C05.2 Workflow blocks |

## 6. Expertise roadmap (competency model)

| Level | Title | Knowledge required | Hands-on tasks | Project required | Assessment | Evidence of competence | Next step |
|-------|-------|--------------------|----------------|------------------|-----------|------------------------|-----------|
| 1 | AI Aware | C01.1, C01.4, C02.1 | classify 10 tools as AI/ML/GenAI | — | 10-Q beginner quiz ≥ 70% | explain to a peer why an LLM can be confidently wrong | L2 |
| 2 | AI User | C01.2, C01.3, C02.3, C03.7 | sort your own task list into Automate/Accelerate/Augment/Avoid | Personal AI Time-Saver Plan | ROI review rubric | 5–7 tasks with hours-saved estimate | L3 |
| 3 | Prompt Practitioner | all M3, C02.6 | 3-version refinement logs; safe rewrite | **P1** prompt-based solution | prompt rubric ≥ 75% on 3 prompts | prompt library of 10 tested TA prompts | L4 |
| 4 | Workflow Designer | C05.1, C05.2, C04.2, C07.1, C07.3 | decompose 3 processes; design a KPI chain | **P2** structured prompt system | workflow rubric ≥ 70% (design only) | workflow spec with governance block | L5 |
| 5 | AI Automation Practitioner | C05.3, C05.4, C06, C08 | build 2 working n8n/Make/Zapier flows with approval step | **P3** automated workflow | workflow rubric ≥ 75% (built + tested) | running flow + test log + SOP | L6 |
| 6 | AI Assistant Designer | M10 | assistant charter + 10-case test set | Personal Weekly Business Assistant | assistant rubric ≥ 75% | assistant with documented guardrails | L7 |
| 7 | RAG / Search System Designer | M11, M12 | mini KB of 5–10 docs; cited answers; conflict handling | **P4** document-grounded assistant, **P5** multi-source search | RAG rubric ≥ 75% | citation accuracy measured on test set | L8 |
| 8 | Agent Designer | C13.1, C13.5, C13.6, C13.8 | single agent with tools, permissions, approval | **P6** single agent | agent rubric ≥ 75% | trace of a run, with failure handled | L9 |
| 9 | Multi-Agent Solution Designer | C13.2–C13.4, C13.7 | 3-agent pipeline with handoff schemas | **P7** multi-agent system | multi-agent rubric ≥ 75% | handoff contracts + debug report | L10 |
| 10 | AI Solution Architect / Business AI Leader | M14, M15, all MASTER extensions | governance review of someone else's design; executive pitch | **P8** governed enterprise system (= capstone) | governance + business-case rubrics ≥ 80% | capstone demo, SOP, impact report, risk register | consulting offer |

**Consulting bridge (INF):** Levels 4–5 are your first sellable service
("automation diagnostic"); Level 7 adds "policy assistant implementation"; Level 10
is "AI-enabled process redesign with governance". The BUILD lab tags each
project with the consulting offer it rehearses.

## 7. Weekly rhythm (suggested, 8–10 h aligned with the programme)

| Day | Time | Activity |
|-----|------|----------|
| After live session | 45 min | LEARN this week's module concepts (L1→L3) |
| +1 day | 30 min | REVIEW queue (spaced items due) |
| +2 days | 60 min | PRACTISE lab for the module |
| +3 days | 20 min | 10-question quiz |
| Weekend | 90 min | BUILD — advance current project one level |
| Weekend | 15 min | MY PROGRESS check; accept next-week plan |
