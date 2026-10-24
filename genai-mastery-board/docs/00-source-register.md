# 00 — Source Register

Every piece of content on the Practice Board carries a source label. This file
defines the labels and lists exactly what material the design rests on today.

## 1. Source labels (shown as a small tag on every card)

| Tag | Meaning | Trust rule |
|-----|---------|-----------|
| **IITM-B** | IITM Course Concept — confirmed in the uploaded IITM Pravartak brochure | Primary. Never overridden. |
| **IITM-L** | IITM Course Concept — named by the learner from class materials that are **not yet uploaded** | Primary for *naming and sequence*. Wording/detail shown as "pending course material". |
| **IITM-D** | IITM Course Concept — confirmed in uploaded class decks (*none yet*) | Primary. Replaces IITM-L once decks arrive. |
| **ALLIED** | Allied / Expanded Concept — needed to understand the IITM concept more deeply (e.g. embeddings behind RAG) | Supplements. Always says which IITM concept it extends. |
| **EXT** | Current External / Industry Practice — standards, official docs, research | Supplements. Cited, dated, flagged if fast-changing. |
| **INF** | General explanation / inference by the tutor | Lowest. Used for analogies, worked examples, HR adaptations. |
| **PEER** | Other uploaded programmes (IIMA, IIM Ranchi, IIM Trichy, MIT) | Reference only, for HR examples and cross-checks. Never presented as IITM teaching. |

**Conflict rule:** if EXT practice differs from IITM teaching, the card shows
both, side by side, under a heading **"Course view vs current practice"**, and
says which to use in the exam (course view) and which to use at work (usually
both, with the reason).

## 2. What was uploaded

| File | Type | Used for |
|------|------|----------|
| `IITMadras-EGAIBA_Brochure_B2C.pdf` | IITM Pravartak programme brochure (24 pp.) | **Primary.** 4 pillars, 15 modules, module bullets, 10 sample use cases, 10 sample projects, 3 IBM certificate syllabi, tools, assessment rules |
| `Executive_Programme_in_AI_for_Business_-_IIMA.pdf` | IIM Ahmedabad brochure | PEER — technology/business module list (ML, NLP, LLMs, AI agents, security/ethics) |
| `IIM_Ranchi_HRM.pdf` | IIM Ranchi AI-Driven HRM brochure | PEER — HR examples: AI in sourcing, resume screening, JD generation, bias in hiring, people analytics, HR chatbots, HR ethics |
| `IIM-TRICHY-SHRM_Brochure...pdf` | IIM Trichy Strategic HRM brochure | PEER — general HR context only (no AI curriculum extracted) |
| MIT Professional Education cover image | "No Code and Agentic AI" | PEER — tool list: KNIME, n8n, Google AI Studio, Gemini Notebook (NotebookLM), Claude |

## 3. Facts taken from the IITM brochure (IITM-B)

- **Programme:** Executive Programme in Generative AI and Agentic AI Tools for Business, IITM Pravartak with Emeritus. 4 months, 8–10 h/week, live online. Start date stated as 23 September 2026.
- **Completion rule:** minimum **70%** in exams, capstone project completed, **50%** attendance. → The board's *Exam Readiness* target is set at 80% so you clear 70% with margin.
- **4 pillars, 15 modules** (full map in `01-course-knowledge-map.md`).
- **Tools named:** Flowise, Notion AI, n8n, Gamma, Claude, Fathom, Zapier, Make, Sheets/Excel, JIRA, Slack/Teams; "15+ tools", list not final.
- **Signature framework in the brochure:** *Automate / Accelerate / Augment / Avoid AI* — sort recurring tasks into these four buckets ("Map Your Work for AI Opportunities").
- **Tool-selection criteria:** value – simplicity – cost – safety (Module 4).
- **IBM certificates:** Responsible & Ethical GenAI; GenAI for Execs & Business Leaders (use-case formulation, prompts, risk, evaluating output); Foundation Models & GenAI Platforms (text-to-text/image/code, watsonx.ai, Hugging Face).

## 4. Concepts named by you (IITM-L), awaiting decks

AI fundamentals for everyday work · how LLMs generate outputs and why they
hallucinate · choosing, controlling and justifying AI systems · risk,
reliability, trust and human oversight · AI opportunity identification and
prioritisation · business-first tool selection · **COSTAR** and other
structured prompting · context, instructions, constraints, examples · AI
toolstack · **Trigger → Data → Decision → Integration → AI Step → Output** ·
workflow governance, approvals, logging, escalation · business briefs and
storyline architecture · claims validation and executive communication ·
**Goal → KPI → Threshold → Decision → Action** · dataset design and data
discipline · intelligence questions → signals → sources → validation →
decision relevance · smart work assistants: scope, role, guardrails, memory,
conversation flow, evaluation · RAG and **retrieve-first thinking** ·
knowledge-base preparation · citation-based verification · multi-source search:
scope, source selection, deduplication, conflicting evidence, cited synthesis ·
monitoring and recurring intelligence · agent decomposition · **Planner,
Researcher, Executor, Reviewer** roles · sequential and parallel workflows ·
context sharing, structured handoffs, permissions, guardrails · debugging and
evaluating agent workflows · responsible AI and governance · human-in-the-loop ·
evaluation, testing and production readiness.

## 5. Gaps — marked "Course material not currently available"

- Week-by-week schedule (brochure gives modules, not weeks).
- Exact IITM wording of COSTAR and other frameworks, and any variants taught.
- Class examples, tool walkthroughs, assignment briefs and grading rubrics.
- Exam format (MCQ vs scenario vs mixed), question weighting, time limits.
- Module 15 capstone brief beyond the brochure bullets.

**How to close the gaps:** drop decks/PDFs into `genai-mastery-board/course-material/<module-number>/`.
Phase 1 of the implementation plan re-runs extraction, upgrades IITM-L items to
IITM-D, and fills week numbers.

## 6. External sources the design relies on (EXT)

Checked against the assistant's knowledge (cut-off mid-2026). Items marked ⚠ are
fast-changing — the board shows a "verify at source" note on them.

| Area | Source |
|------|--------|
| AI risk management | NIST AI Risk Management Framework 1.0 (Jan 2023) and its Generative AI Profile, NIST AI 600-1 (Jul 2024) — functions Govern, Map, Measure, Manage |
| AI management system | ISO/IEC 42001:2023 |
| Regulation (EU) | EU AI Act, Regulation (EU) 2024/1689 — AI used for recruitment/selection is listed as **high-risk** (Annex III, employment). ⚠ Application dates for high-risk duties were under review in 2025–26; verify current timeline |
| Regulation (India) | Digital Personal Data Protection Act 2023 and DPDP Rules 2025 (phased commencement) ⚠ verify which provisions are in force |
| LLM security | OWASP Top 10 for LLM Applications (2025 edition) — prompt injection, sensitive information disclosure, excessive agency, etc. |
| Agent design patterns | Anthropic, "Building effective agents" (Dec 2024) — workflows vs agents; prompt chaining, routing, parallelisation, orchestrator–workers, evaluator–optimiser |
| Tool integration | Model Context Protocol specification, modelcontextprotocol.io ⚠ evolving spec |
| RAG origin | Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", NeurIPS 2020 |
| Prompting | Official prompt-engineering guides from Anthropic, OpenAI and Google ⚠ model-specific; COSTAR's public origin is GovTech Singapore's 2023 prompt-engineering competition write-up |
| Learning science | Bloom (1968) mastery learning; Anderson & Krathwohl (2001) revised Bloom's taxonomy; Roediger & Karpicke (2006) retrieval practice; Leitner boxes / SM-2 / FSRS spaced-repetition schedulers |
