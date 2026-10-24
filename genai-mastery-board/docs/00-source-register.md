# 00 — Source Register

Every piece of content on the Practice Board carries a source label. This file
defines the labels and records what the design rests on.

## 1. Source labels

| Tag | Meaning | Trust rule |
|-----|---------|-----------|
| **IITM-D** | IITM course concept from your **course compendium** (`course-material/iitm-master-course-compendium.md`) | Primary. Never overridden. Exam wording comes from here. |
| **IITM-B** | IITM course concept from the brochure only (Weeks 8, 14, 15 and brochure bullets) | Primary for naming and sequence; detail pending class material. |
| **IITM-B+D** | In both the brochure and the compendium | Primary. |
| **IITM-L** | Named by you in your brief but **not in the compendium** (e.g. COSTAR) | Shown with the course's own framework alongside. |
| **ALLIED** | Allied / expanded concept that deepens a course concept (e.g. embeddings behind semantic search) | Supplements. Always names the course concept it extends. |
| **EXT** | Current external / industry practice: standards, official docs, research | Supplements. Cited, flagged if fast-changing. |
| **INF** | Tutor's general explanation, analogy or HR adaptation | Lowest. |
| **PEER** | Other uploaded programmes (IIMA, IIM Ranchi, IIM Trichy, MIT) | Reference only. |

**Conflict rule:** where your brief or current practice differs from the course,
the concept page shows a **"Course view vs current practice"** note, says which
to use in the exam (the course view) and which to use at work.

## 2. Material received

| Material | Date | Coverage | Used for |
|----------|------|----------|----------|
| IITM Pravartak programme brochure (PDF) | 24 Oct 2026 | 15 modules, 4 pillars, use cases, projects, IBM certificates, completion rules | Module titles, bullets, tools, assessment rules |
| **Master Course Compendium** (pasted text) | 24 Oct 2026 | **Weeks 1–7 and 9–13** | **Primary source** for concepts, frameworks, questions, labs, rubrics and tutor rules |
| IIM Ahmedabad, IIM Ranchi, IIM Trichy brochures; MIT cover image | 24 Oct 2026 | Peer programmes | HR examples and tool references only |

Week N in the compendium is Module N in the brochure, so the board uses week numbers throughout.

## 3. Facts from the brochure (IITM-B)

- 4 months, 8–10 h/week, live online; start date 23 September 2026.
- **Completion:** minimum **70%** in exams, capstone completed, **50%** attendance. The board's Exam Readiness target is 80% to clear 70% with margin.
- Tools named: Flowise, Notion AI, n8n, Gamma, Claude, Fathom, Zapier, Make, Sheets/Excel, JIRA, Slack/Teams.
- Brochure framework not in the compendium: *Automate / Accelerate / Augment / Avoid AI* (kept alongside the compendium's Impact–Effort Matrix).

## 4. Where the course differs from your original brief

| Topic | Your brief | Course compendium (used in the exam) |
|-------|-----------|--------------------------------------|
| Prompt structure | COSTAR | **Role · Context · Rules · Output Format**, plus the Prompt Maturity Curve, Reusable Prompt Blueprint and Peer Review Rubric. COSTAR kept as IITM-L. |
| Automation structure | Trigger → Data → Decision → Integration → AI Step → Output | **Trigger → Data Inputs/Validation → Processing Steps → Conditions/Approvals → Outputs/Notifications → Audit Log** |
| Automation suitability | Seven criteria | **Quick test:** (Frequency + Friction + Impact) ≥ 10 and Judgement ≤ 2, on a 1–5 scale |
| Dashboard chain | Goal → KPI → Threshold → Decision → Action | **Goal → KPI → Decision → Action** (threshold inside the KPI) and the **5 tests of a true KPI** |
| Risk levels | Low / medium / high | **3-Tier AI Risk Model** (drafting · internal reporting · external & decision-critical) |
| Agent roles | Planner, Researcher, Analyst, Executor, Reviewer, Writer, Validator | **Planner, Researcher, Executor, Reviewer/Validator**; one agent = one responsibility |
| Chatbot vs assistant vs automation vs agent | Five-way distinction | Not stated as such; the compendium uses the **Business AI Stack** (5 categories). Kept as IITM-L. |

## 5. Gaps — "Course material not currently available"

- **Week 8** (Generate Automated Insights from Dashboards): brochure only.
- **Week 14** (AI Governance, Safety & Evaluation Standards): brochure only; the compendium cites NIST AI RMF as a course reference.
- **Week 15** (Capstone): brochure only.
- Exam format, weighting and time limits.
- Class examples, assignment briefs and grading rubrics beyond what the compendium states.

To close a gap, add material to `course-material/` and update `app/content/`; re-run `app/tests/simulate.js` and `app/tests/gen-knowledge-map.js`.

## 6. External sources (EXT)

Course references from the compendium are marked †.

| Area | Source |
|------|--------|
| AI risk | † NIST AI RMF 1.0 (2023); NIST AI 600-1 Generative AI Profile (2024) |
| AI management system | ISO/IEC 42001:2023 |
| Regulation (EU) | EU AI Act, Regulation (EU) 2024/1689 — recruitment AI is high-risk (Annex III). Application dates were under review in 2025–26; verify. |
| Regulation (India) | DPDP Act 2023 and DPDP Rules 2025 (phased commencement); verify which provisions are in force. |
| LLM security | OWASP Top 10 for LLM Applications (2025) |
| Prompting & structured outputs | † OpenAI prompt engineering & structured outputs (2024); † Anthropic multi-shot prompting, context engineering, evals for agents (2024) |
| Agents & orchestration | † OpenAI, A Practical Guide to Building AI Agents (2024); † Microsoft Azure LLMOps maturity model & agent orchestration patterns (2024); Anthropic, Building effective agents (2024) |
| RAG governance | † Databricks RAG governance & LLMOps (2024); Lewis et al., RAG (NeurIPS 2020) |
| Presentations | † Penrose & Alley (2018), assertion–evidence approach |
| Competitive intelligence | † SCIP (2022) standards |
| Workflow testing | † n8n & LogicWorkflow (2026) |
| Tool integration | Model Context Protocol specification (evolving) |
| Learning science | Bloom (1968); Anderson & Krathwohl (2001); Roediger & Karpicke (2006); Leitner / SM-2 / FSRS |
