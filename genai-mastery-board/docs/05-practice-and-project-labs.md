# 05 — Practice Lab and Project Lab Architecture

## 1. Common lab mechanics

Every lab session follows the same skeleton so you learn one interaction pattern:

```
Brief ─► Your attempt (blank template) ─► Rubric check ─► Gap explanation
      ─► Revise ─► Compare v1 vs v2 ─► Transfer task (non-HR) ─► Log to mastery
```

- The tutor **never fills the template first**. Hints unlock only after a first attempt.
- Every field is tagged with the IITM concept it practises, so lab work updates mastery.
- Each lab has three difficulty tiers: *Guided* (template + hints), *Independent* (template only), *Open* (blank page, you choose the structure).

## 2. PRACTICE LAB — the 22-step guided flow

Triggered when you type a broad idea, e.g. *"Automate candidate follow-up."*

### Stage 0 — Convert idea into a use case (tutor asks, you answer)
Tutor: "Before we design anything — who is frustrated today, by what, and how
often?" Then it drafts a one-line use-case statement **from your answers**, not
from its own assumptions.

### The steps, grouped into five phases

| Phase | Steps | IITM concepts | Tutor question style |
|-------|-------|---------------|----------------------|
| **A. Frame** | 1 Business problem · 2 User · 3 Desired outcome | C01.2, C01.3 | "What would be measurably different in 90 days?" |
| **B. Decide** | 4 Classify opportunity (Automate / Accelerate / Augment / Avoid) · 5 Risk level · 6 Is AI actually required? · 7 Architecture (Chat / Search / Automation / Analytics / Assistant / RAG / Agent / Multi-agent) | C01.3, C01.5, C05.1, C13.1 | "Which steps need judgement and which are rules? Could a plain rule or a form do it?" |
| **C. Specify** | 8 Required data · 9 Data sensitivity · 10 Knowledge sources · 11 Prompt / instructions · 12 Tools & integrations · 13 Constraints | C07.1, C14.3, C11.3, C03.2, C04.2, C04.3 | "Name each field the system reads. Which of them identifies a person?" |
| **D. Control** | 14 Guardrails · 15 Human approval points · 16 Workflow · 17 Expected output | C10.4, C14.4, C05.2, C03.5 | "Where could this cause harm if it were wrong and nobody looked?" |
| **E. Prove & improve** | 18 Test cases · 19 Success metrics · 20 Failure modes · 21 Improve design · 22 Implementation (no-code / code) | C10.5, C07.3, C13.8, C14.5, C04 | "Write one test that you expect your design to *fail*." |

### Per-step interaction protocol

1. **Ask** — one focused question (never more than two at once).
2. **You attempt.**
3. **Evaluate** against the step's expected elements (e.g. Step 5 expects: impact on people, reversibility, data sensitivity, external exposure, regulatory class).
4. **Show what you missed** — named elements only, not the full answer.
5. **Explain why** each missing element matters, with a TA example.
6. **Improved answer** — shown only after your second attempt, or on request.
7. **Retry** optional; the better of the two attempts counts.

Phase gates: you cannot reach Phase C until Step 6 ("Is AI actually required?")
has a justified answer. If you answer "no AI needed", the flow switches to a
plain process-improvement design — a valid outcome that earns full credit.

### Architecture decision aid (Step 7)

| If the need is… | Start with | Escalate only if… |
|-----------------|-----------|-------------------|
| One-off drafting / thinking | Chat (structured prompt) | it repeats weekly → Automation |
| Find facts in your documents | RAG / document-grounded assistant | sources are many and mixed → Multi-source search |
| Same steps every time, triggered by an event | Automation (with AI step) | steps vary by situation → Agent |
| Numbers → decisions | Analytics / dashboard + AI insight | — |
| Ongoing role support with memory | Assistant | it must take actions in systems → Agent with approval |
| Open-ended goal, variable steps, tool use | Single agent | distinct expertise or parallel work clearly helps → Multi-agent |

Source: IITM-L (architecture list) + EXT (Anthropic, *Building effective agents*:
"start with the simplest solution; use agents when flexibility is needed").

## 3. Lab specifications

### 3.1 Prompt Lab (M3)
- **Template:** COSTAR (Context, Objective, Style, Tone, Audience, Response) + Constraints + Examples + Grounding source + Risk note.
- **Scoring:** rubric R1 — Context quality, Instruction clarity, Constraints, Examples, Output specification, Risk awareness, Grounding, Completeness (each 0–4).
- **Flow:** write → score with *explanations only* → you revise → side-by-side v1/v2 with score delta → optional "show expert version" → stress test with an ambiguous input (brochure use case "Stress-Test AI With Ambiguous Prompts").
- **Starter exercises:** campus-drive invitation email; interview-feedback summariser; JD rewrite for inclusive language; safe rewrite removing candidate PII.

### 3.2 Automation Lab (M5)
- **Suitability scorer (0–3 each):** Repetition, Frequency, Friction, Impact, Judgement required (reverse-scored), Data sensitivity (reverse), Process stability. ≥ 14/21 → good candidate; judgement ≥ 2 → keep human in loop.
- **Canvas blocks:** Trigger · Inputs/Data · Actions · Decision/Approval · Integration/API/Webhook · AI Step · Output/Notification.
- **Governance panel (mandatory before "done"):** logging (what, where, retention), escalation (who, when), exception handling (missing data, API failure, AI low confidence), testing (3 normal + 2 edge + 1 failure case), handover (SOP owner).
- **Exercise:** interview scheduling reminders → AI-drafted reminder → recruiter approval for exceptions → Teams notification.

### 3.3 Dashboard Lab (M7, M8)
- **Builder:** Goal → KPI → Threshold → Decision → Action. Each KPI must have formula, owner, refresh frequency, threshold, decision trigger, action.
- **Vanity-metric challenge:** the tutor rejects KPIs with no decision attached ("Number of LinkedIn posts" → "So what would you do differently at 40 vs 60?").
- **Dataset discipline checker:** grain stated (one row = one requisition / one candidate-stage event), data types, ISO dates (YYYY-MM-DD), flat table (no merged cells), missing-value rule, snake_case names, validation lists.
- **Exercise:** TA dashboard — time-to-fill, offer-acceptance rate, source-of-hire quality, interview-to-offer ratio, hiring-manager satisfaction.

### 3.4 Competitive Intelligence Lab (M9)
- **12-field chain:** Strategic question · Intelligence dimensions · Signals · Sources · Credibility · Validation · Analysis · Business relevance · Decision supported · Owner · Action · Update cadence.
- **Rule:** no signal is accepted without a credibility rating and a validation method.
- **Exercises:** competitor hiring surges, campus compensation benchmarking, AI-skills demand, university relations positioning.

### 3.5 RAG Lab (M11)
- **Sequence:** "Why will a prompt alone fail here?" → KB design (documents, owner, version, review date, access) → chunking & metadata notes → query test bench (10 questions incl. 2 unanswerable) → citation check → failure diagnosis (retrieval miss vs generation error vs outdated doc).
- **Exercise:** HR policy assistant over leave, travel, referral-bonus and relocation policies.

### 3.6 Multi-Source Search Lab (M12, tab in RAG Lab)
- **Source policy:** scope, allowed questions, permitted sources, excluded sources, ranking, recency window.
- **Processing rules:** deduplication, normalisation (currency, dates, job titles), conflict resolution (prefer primary > recent > official), citation per claim, synthesis format, monitoring cadence.
- **Exercise:** "What is the market median offer for a data-science graduate in Bengaluru?" from salary survey PDF, internal offers sheet and two websites that disagree.

### 3.7 Assistant Lab (M10)
- **Charter (16 fields):** purpose, role, scope, inputs, context, memory, knowledge, behaviour, conversation flow, guardrails, tone, output standards, test cases, failure modes, evaluation rubric, continuous improvement.
- **Exercise:** hiring-manager intake assistant that turns a conversation into a structured requisition brief.

### 3.8 Agent Lab (M13)
- **Classifier drill** first (chatbot / assistant / automation / agent / multi-agent).
- **Spec (11 fields):** goal, instructions, context, tools, state/memory, planning, actions, guardrails, human approval, evaluation, monitoring.
- **Rule:** every write-action tool (send email, update ATS) needs an approval setting and a rollback note.

### 3.9 Multi-Agent Lab (M13)
- **Gate question:** "Why can't one agent, or a fixed workflow, do this?" Acceptable reasons: distinct expertise/instructions, parallel independent work, independent review. "It looks more advanced" is rejected.
- **Per role:** one responsibility, input, output, handoff schema (fields + format), shared vs private context, tool permissions, failure handling.
- **Topologies:** sequential (pipeline), parallel (fan-out/fan-in), planner–workers, reviewer loop (max N iterations).
- **Exercise:** the brochure's 3-agent insight engine — Fetcher → Analyst → Writer — then add a Reviewer and explain what it catches.

### 3.10 AI Governance Lab (M14)
- **17 dimensions:** accuracy, reliability, privacy, security, compliance, bias, explainability, human oversight, access controls, logging, auditability, escalation, failure recovery, cost, latency, trust, scalability.
- **Output:** risk register (risk, likelihood, impact, control, owner, test).
- **Practical cases:** biased screening; chatbot leaking salary bands; agent emailing rejected candidates by mistake; prompt injection via a CV containing hidden instructions (EXT, OWASP LLM01).

## 4. PROJECT LAB

### 4.1 Project ladder

| Level | Project (TA default) | Core IITM concepts | Transfer variant | Consulting offer rehearsed |
|-------|---------------------|--------------------|------------------|----------------------------|
| P1 Prompt-based solution | Recruiter prompt library (JD, outreach, interview kit, feedback summary) | C03.1–C03.7 | Sales outreach library | "Prompt playbook" workshop |
| P2 Structured prompt system | Interview-feedback → standard scorecard with JSON output and rubric | C03.5, C02.6, C10.1 | Supplier evaluation summariser | Standard work templates |
| P3 Automated workflow | Candidate follow-up automation with approval gate and logging | C05.1–C05.4, C14.4 | Invoice follow-up | Automation diagnostic & build |
| P4 Document-grounded assistant | HR policy assistant with citations and "not found" escalation | C11.1–C11.5, C10.4 | IT-helpdesk SOP assistant | Policy assistant implementation |
| P5 Multi-source search system | Campus compensation intelligence (surveys + offers + web) | C12.1–C12.5, C09.1 | Pricing intelligence | Market intelligence setup |
| P6 Single intelligent agent | Interview-scheduling agent with calendar tools and approval on conflicts | C13.1, C13.5, C13.6 | Procurement quote-chaser | Agent pilot |
| P7 Multi-agent system | Talent-market research system: Planner, Researcher, Analyst, Writer, Reviewer | C13.2–C13.4, C13.8 | Competitor strategy research | Research automation |
| P8 Governed enterprise AI system (capstone) | End-to-end recruitment operations assistant: intake → KB → automations → dashboard → governance | C15.1–C15.4, C14.1–C14.5 | Any function | AI process redesign programme |

Unlock rule: P(n+1) unlocks when P(n) scores ≥ 70% on its rubric, or when you
pass a "skip test" for that level.

### 4.2 Project canvas — 28 sections

Each section shows guiding questions, your draft, tutor review, and a
**concept-map chip**: *"This project uses Module X concept ___ because ___."*

| # | Section | Guiding question (sample) | Concept map |
|---|---------|---------------------------|-------------|
| 1 | Business problem statement | What breaks, for whom, how often, at what cost? | C01.2 |
| 2 | Users | Who uses it daily, who is affected, who approves? | C10.1 |
| 3 | Use case | One sentence: "When __, __ wants to __ so that __." | C01.3 |
| 4 | Current process | Steps, time, hand-offs, pain points | C05.1 |
| 5 | Future AI-enabled process | Which steps change, which stay human? | C05.2 |
| 6 | Expected business value | Hours, quality, speed, experience; ROI | C01.2 |
| 7 | Risk classification | Low / Medium / High with reasons | C01.5, C14.1 |
| 8 | Architecture | Which of the 8 patterns and why not the simpler one? | C13.1 |
| 9 | Workflow diagram (in words) | Trigger → … → Output | C05.2 |
| 10 | Input data | Fields, source, grain, sensitivity | C07.1, C14.3 |
| 11 | Output | Format, recipient, structure | C03.5 |
| 12 | Models | Which model class and why (quality, cost, privacy) | C02.4, C02.5 |
| 13 | Tools | Value–simplicity–cost–safety scoring | C04.2 |
| 14 | Integrations | Connectors, APIs, webhooks, MCP | C04.3, C13.5 |
| 15 | Prompt / system instructions | COSTAR + constraints + examples | C03.2, C03.3 |
| 16 | RAG requirements | Documents, owners, chunking, citations | C11.* |
| 17 | Agent roles | Responsibility per role | C13.2 |
| 18 | Multi-agent handoffs | Schema per handoff | C13.4 |
| 19 | Human-in-the-loop controls | Where, who, what they check | C14.4 |
| 20 | Security considerations | Access, PII, injection, leakage | C14.3, EXT OWASP |
| 21 | Evaluation criteria | Accuracy, groundedness, tone, latency, cost | C14.5 |
| 22 | Test cases | Normal, edge, adversarial, unanswerable | C10.5 |
| 23 | Failure scenarios | What fails, detection, recovery | C13.8 |
| 24 | Monitoring | What is logged and reviewed, how often | C09.4, C14.5 |
| 25 | Business KPIs | Goal → KPI → Threshold → Decision → Action | C07.3 |
| 26 | Implementation steps | Build order, owners, timeline | C15.3 |
| 27 | MVP | Smallest version that proves value in 2 weeks | C15.2 |
| 28 | Future enhancements | What you will add once MVP is trusted | — |

Sections 16–18 are marked "Not applicable — justify" when the architecture does
not need them. Justifying N/A correctly earns credit; leaving them blank does not.
