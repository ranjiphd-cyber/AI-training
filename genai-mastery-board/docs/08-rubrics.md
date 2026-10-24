# 08 — Assessment Rubrics

Each criterion is scored **0–4**. Anchors: **0** missing · **1** mentioned but
wrong or vague · **2** partly right, key element missing · **3** correct and
specific · **4** correct, specific and justified (trade-off or test shown).
Score % = points ÷ (criteria × 4). Pass = 70%; strong = 85%.

The tutor reports every criterion with a one-line reason and the IITM concept it
relates to, then names the **single highest-value improvement**.

---

## R1 — Prompt quality (Module 3)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Context quality | C03.2, C03.3 | situation, organisation, data and constraints the model can't guess |
| Instruction clarity | C03.3 | one unambiguous task; steps if multi-part |
| Constraints | C03.3 | length, exclusions, "do not invent", policy limits |
| Examples | C03.1 | few-shot where format/judgement matters, or justified absence |
| Output specification | C03.5 | exact structure (headings / table / JSON fields) |
| Risk awareness | C03.7, C14.3 | no PII; sensitive topics handled; failure rule |
| Grounding | C11.4 | points to supplied facts/documents; asks for citations |
| Completeness (COSTAR) | C03.2 | Style, Tone, Audience explicit |

## R2 — Workflow quality (Module 5)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Suitability justified | C05.1 | 7-criteria score with reasons; judgement steps identified |
| Trigger & data defined | C05.2 | event, fields, source system, freshness |
| Step decomposition | C05.2 | Trigger → Data → Decision → Integration → AI Step → Output, no hidden steps |
| AI step specified | C03.5 | prompt template + structured output the next step can use |
| Approvals & HITL | C05.3, C14.4 | gate before any external/high-impact action, named approver |
| Exception handling | C05.4 | missing data, API failure, low-confidence AI each handled |
| Logging & escalation | C05.4 | what is logged, retention, who is alerted when |
| Testing & handover | C05.4, C15.3 | normal/edge/failure tests; SOP owner |

## R3 — RAG / document-grounded design (Modules 11–12)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Need for retrieval justified | C11.1 | explains why prompt/context injection is insufficient |
| Knowledge-base quality | C11.3 | selected docs, owners, versions, effective dates, cleaned |
| Structure & metadata | C11.3, ALLIED chunking | metadata enabling filters (country, grade, date); chunk approach noted |
| Access control | C11.5, C14.3 | restricted documents scoped by role |
| Grounding & citation rule | C11.4 | answer-only-from-sources, per-claim citation |
| Not-found / conflict behaviour | C11.4, C12.3 | explicit fallback and escalation; conflict rule for multi-source |
| Evaluation set | C10.5 | ≥10 Qs incl. unanswerable and adversarial; targets stated |
| Knowledge governance | C11.5 | review cadence, retirement of outdated docs |

## R4 — Assistant design (Module 10)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Purpose, role & scope | C10.1 | in-scope and out-of-scope lists |
| Users & inputs | C10.1 | who asks, what they provide |
| Context & knowledge | C10.2 | right documents, not all documents |
| Memory rules | C10.3 | what is remembered, for how long, what never is |
| Conversation flow | C10.4 | clarifying questions, escalation to human |
| Guardrails | C10.4 | refusals, sensitive topics, data limits |
| Tone & output standards | C10.3 | style guide, format |
| Evaluation & improvement | C10.5 | test cases, rubric, failure log, review cycle |

## R5 — Agent design (Module 13)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Agent justified over simpler pattern | C13.1 | names what varies run-to-run |
| Goal & instructions | C13.1 | clear success condition and stop condition |
| Tools & permissions | C13.5, C13.6 | least privilege; read vs write separated |
| State / memory | ALLIED | what is tracked between steps |
| Planning & actions | ALLIED | how it decides next step; max steps |
| Human approval | C14.4 | approval before irreversible actions |
| Guardrails & failure recovery | C13.6 | retries, timeouts, fallback to human |
| Evaluation & monitoring | C13.8 | traces, success metric, cost/latency |

## R6 — Multi-agent architecture (Module 13)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Multi-agent justified | C13.1 | passes gate question; simpler option considered |
| Role decomposition | C13.2 | one responsibility each, no overlap, no gaps |
| Inputs/outputs per agent | C13.2 | defined for each role |
| Structured handoffs | C13.4 | schema with fields; validation |
| Topology choice | C13.3 | sequential vs parallel justified |
| Shared-context rules | C13.4, C13.7 | what is shared vs private |
| Permissions & guardrails | C13.5, C13.6 | per-agent tool rights; human approval point |
| Debugging & evaluation | C13.8 | trace plan, failure handling, quality metrics |

## R7 — AI governance (Module 14)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Risk classification | C01.5, C14.1 | level with reasons; regulatory class noted (EXT) |
| Accuracy & reliability controls | C14.4, C14.5 | verification method, acceptance thresholds |
| Privacy & data protection | C14.3 | minimisation, consent, approved tools, retention |
| Security | C14.3, EXT OWASP | access control, injection and leakage addressed |
| Bias & fairness | C14.2 | sources of bias, monitoring by group, mitigation |
| Human oversight | C14.4 | where, who, with what authority |
| Transparency & explainability | C14.1 | users told AI is involved; reasons available |
| Logging, audit, escalation & recovery | C14.5 | audit trail, incident path, rollback |
| Cost, latency, scalability, trust | C02.4, C14.5 | stated and measured |

(9 criteria; 17 governance dimensions from the Governance Lab are grouped into them.)

## R8 — Business case quality (Modules 1, 15; used for Case Studies and capstone)

| Criterion | Concept | 4 looks like |
|-----------|---------|--------------|
| Problem clarity | C01.2 | specific, measured, owned |
| User & stakeholder | C10.1 | primary user, affected parties, sponsor |
| Opportunity classification | C01.3 | Automate / Accelerate / Augment / Avoid with reason |
| Need for AI tested | C05.1 | non-AI alternative considered |
| Architecture fit | C13.1 | simplest pattern that works |
| Value & ROI | C01.2 | baseline, target, hours/cost/quality, assumptions |
| Risk & controls | C14.* | top 3 risks with controls |
| Success metrics | C07.3 | KPI with threshold, owner, action |
| Implementation & MVP | C15.2, C15.3 | phased, realistic, handover |
| Executive communication | C06.2, C06.3 | clear storyline, claims supported |

---

## Case-study scoring template

Nine questions (What is the business problem? Should AI be used? Which
architecture? Which model/tool? What data? What risk? What controls? Where is
human oversight required? How would success be measured?) map to R8 criteria;
domain criteria from R2–R7 are added depending on the chosen architecture.

## Exam-answer rubric (for E–H questions)

| Marks | Expect |
|-------|--------|
| 2 | definition + one correct example or reason |
| 4 | definition + mechanism + business example + one limitation |
| 8 | structured answer across ≥ 4 dimensions (e.g. problem, design, risk, control, metric), each with a specific point, and a justified recommendation |
