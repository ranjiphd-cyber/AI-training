# Executive Programme in GenAI and Agentic AI Tools for Business — Master Course Compendium

IITM Pravartak – Catalysing Innovation. Supplied by the learner on 24 Oct 2026 as the course's own summary.
This file is the **primary source** (tag `IITM-D`) for the Practice Board. Coverage: Weeks 1–7 and 9–13.
Weeks 8, 14 and 15 are not in the compendium; the board uses the brochure for them (tag `IITM-B`).

---

## Week 1: AI Fundamentals for Everyday Work Efficiency

**Overview & core mental model**
- Moving from ad-hoc, untracked "Shadow AI" to an enterprise-governed AI operating model.
- Generative AI is not a deterministic factual database or an autonomous decision-maker; it operates via probabilistic next-word prediction based on patterns in training data.
- Fluency does not equal accuracy. AI can generate plausible, authoritative-sounding text that is factually ungrounded (hallucination).

**The 3-Tier AI Risk Model**
- Tier 1 (Drafting & Ideation): low impact, easily reversible tasks (brainstorming, drafting notes, internal email copy). User accountability with light spot-checking.
- Tier 2 (Internal Analysis & Reporting): medium impact, cross-team visibility (internal dashboards, status updates, variance analyses). Mandatory peer or managerial review before use.
- Tier 3 (External & Decision-Critical): high impact, direct financial, legal, customer or regulatory risk. Mandatory multi-stage human approval and audit logging.

**Evaluation triangle & verification toolkit**
- The Cost–Latency–Accuracy Triangle: improving one dimension typically forces trade-offs in another (instant chat prioritises latency and cost over deep accuracy; legal review demands high accuracy, accepting higher latency and specialised cost).
- 60-Second Pre-Flight Checklist: (1) remove sensitive details / PII, (2) define explicit purpose, (3) set format and tone, (4) identify the designated human reviewer, (5) confirm downstream usage context.
- 5-Step Manual Verification Protocol: compare with trusted internal sources, spot-check numbers independently, request step-by-step reasoning, rephrase and compare outputs, validate compliance and tone.

**Opportunity discovery & prioritisation**
- Impact–Effort Matrix: prioritise high-impact, low-effort tasks for initial rollout.
- Hard ROI: Hours Saved per Task × Frequency × Labour Rate = Gross Savings.
- Soft ROI factors: output standardisation, reduced cognitive load / burnout, accelerated turnaround.
- 1-Page AI Business Proposal: Problem Statement, Proposed AI Solution, Expected Business Impact (ROI), Risk & Controls, Implementation Plan / Pilot Scope, Success Metrics.

## Week 2: Choosing, Controlling & Justifying AI Systems

**From opportunity to ownership**
- Managing AI systems across six decision pillars: Cost, Speed, Accuracy, Risk, Trust, Scalability.
- Designing governed systems where AI capabilities are bounded by business constraints, verification layers and clear accountability.

**The three failure modes**
- Incomplete Output: output prematurely cuts off or skips required steps.
- Drift: tone, format or instruction adherence unexpectedly degrades mid-response.
- Hallucination: confident generation of fabricated claims unsupported by data.

**Controlling outputs & prompt knobs**
- Key levers: context quality, instruction clarity, negative/positive constraints, concrete examples, temperature (low for reliable extraction, higher for creative ideation).

**The Business AI Stack & trade-off architecture**
- Five tool categories trading power for control: Chat Interfaces (fast, low control), Search & Knowledge (grounded, reliable), Automation Platforms (scalable, rule-driven), Analytics & Insights (pattern detection), Agent Frameworks (multi-step, high governance needed).
- Core architectural tensions: Accuracy vs Speed, Cost vs Scale, Flexibility vs Control, Power vs Risk.
- Hidden cost drivers: token consumption scaling with adoption, human review bottlenecks, integration maintenance.
- Executive Justification Framework: Problem → Choice → Value → Risk Control → Owner.

## Week 3: Design Effective Prompts for Reliable AI Outputs

**The hidden failure of AI deployments**
- AI initiatives rarely fail due to flawed models; they fail due to poor instructions, lack of standards, zero testing and absence of reuse.
- Prompt design is the primary behavioural control layer governing consistency, compliance and reliability.

**Prompts as behavioural control systems** — from conversational chatting to engineering behavioural constraints. Core components:
- Role: identity, domain perspective and expertise boundary.
- Context: operating domain, background facts and source material.
- Rules: explicit boundaries, negative constraints and fallback instructions.
- Output Format: exact structural deliverable (tables, bullets, JSON schema).

**The Prompt Maturity Curve**
- Level 1 Chatting: informal queries, unpredictable outcomes.
- Level 2 Formatting: basic headings and simple templates.
- Level 3 Structuring: explicit roles, detailed deliverables, defined audiences.
- Level 4 Testing: stress-testing with edge cases, ambiguity checks, error analysis.
- Level 5 System Design: reusable prompt blueprints with automated self-checking and governance ownership.

**Steering with examples**
- Zero-shot: suitable for low-risk, creative brainstorming and open-ended exploration where format flexibility is acceptable.
- Few-shot: mandatory for medium-to-high risk, compliance-critical, brand-voice-sensitive or multi-user reusable templates. Few-shot examples act as micro-training data, demonstrating tone, structure and boundaries.
- Risks of poor examples: overfitting to a single format, ignoring edge cases, replicating outdated policy rules.

**Engineering reliability & debugging discipline**
- Prompt failure taxonomy: missing context, ambiguous goals, absent constraints, unclear output format, task overloading.
- Systematic debugging loop: (1) test, (2) observe output, (3) identify exact failure point, (4) adjust one variable at a time, (5) retest to verify improvement.
- Starter test-case bank: Easy/Standard cases, Boundary/Edge cases, High-Risk/Failure cases.
- Before/After Capture Template: baseline output, refined prompt, failure type, risk reduction, business impact.

**The Reusable Prompt Blueprint**
- Fixed control logic: Role, Grounding Rules, Output Schema, built-in self-validation steps.
- Variable inputs: parameterised fields (e.g. {Project Name}, {Date}, {Progress}).
- Self-checking outputs: the model audits its own output for completeness, visible assumptions and low-confidence flags before the final answer.
- Peer Review Rubric: score 1–5 on Role/Task Definition, Constraint Strength, Validation Logic, Reusability, Scalability Readiness → Approve, Revise or Escalate.

## Week 4: Build Your Everyday AI Toolstack

**Governance & orientation for daily work** — turning ad-hoc personal productivity into a governed enterprise capability. Real workflows involve sensitive client, financial and strategic data needing upfront classification and policy clearance.

**30-Second Safe Input Checklist**: No PII · Redacted numbers · Policy compliant · Approved tool.

**Minimum Viable Toolstack Operating Model**
- Data sensitivity tiers: Public (direct use permitted); Internal operational (allowed only after redaction); Confidential/Regulated (prohibited from external public models).
- Mandatory human verification: spot-check numbers, validate missing information, confirm tone, audit compliance language.
- Shared logging: archive prompts, outputs and human adjustments centrally.

**Business-first tool decisions** — Value, Simplicity, Cost, Safety. A tool scoring < 4 on Safety is barred from Tier-2 and Tier-3 workflows.
- Tool Change Radar: log triggers (feature releases, policy shifts, cost updates), evaluate workflow impact, assign owner and review timeline. Switch only for proven cost/time savings, quality leaps or compliance requirements.

**Reliable, professional outputs** — unstructured output is a draft. Four elements: Structure, Completeness, Accuracy Check, Clarity for Action.
- The Everyday Practical AI Toolkit: Core Tools + Prompt Packs + Output Templates + Quality Checklists.

## Week 5: Build No-Code Automated Workflows

**Automation thinking & opportunity discovery**
- Value: eliminating coordination bottlenecks, reducing transcription errors, accelerating delivery.
- Sweet spot: high-frequency, repetitive, rule-based, data-driven tasks needing minimal judgement (status consolidation, order notifications, lead routing).
- Avoid: high-ambiguity decisions, complex contract interpretation, sensitive customer escalations, unowned processes.
- Use-case quick test (1–5 scale): automate only if (Frequency + Friction + Impact) ≥ 10 and Judgement Required ≤ 2.

**Universal automation structure** (tool-agnostic):
Trigger → Data Inputs / Validation → Processing Steps → Conditions / Approvals → Outputs / Notifications → Audit Log.
Governed layers include owner assignment, conditional decision rules, approval checkpoints, execution logging and emergency rollback paths.

**Net automation ROI**
- Annual Hours Saved × Hourly Labour Rate = Gross Productivity Value.
- Net ROI = Gross Value − Operational Effort (maintenance, monitoring, API costs).
- Go / No-Go Feasibility Gate: measurable ROI, acceptable risk tier, designated owner, rollback feasibility, data classification clearance.

**Reliability, conditional logic & fallback design**
- Conditional logic routes on thresholds (e.g. invoice > $10,000), completeness checks or SLAs.
- Approval gates prevent unverified execution of high-impact actions.
- Fallback Ladder: Retry (exponential backoff, e.g. 3× over 5 minutes) → Notify Owner → Route to Manual → Safe Stop & Log.
- Human-in-the-Loop Control Matrix: owners, response SLAs and action protocols for missing data, approval timeouts and integration errors.

**Testing, debugging & handover**
- Test Normal, Edge and Failure cases; minimum pack 2 Normal, 2 Edge, 1 Failure.
- Debugging: Reproduce → Isolate failing step → Verify logic/conditions → Implement fallback safeguard → Retest all scenarios.
- Evidence Handover Package: workflow logic diagram, working build/configuration, 5 documented test cases, governance SOP (owners, SLAs, fallbacks), formal deployment sign-off.

## Week 6: Auto-Create Content & Presentations with AI

- AI decks fail through generic titles, paragraph overload, missing "so what?", unsupported assertions and audience misalignment. Governed content automation needs architectural constraints, not just prompting.
- **7-Step Business Brief**: Context, Objective, Audience, Decision Required, Constraints, Evidence Available, Sensitivity Level.
- **7-Stage storyline**: Current Situation → Problem/Gap → Impact (Cost of Inaction) → Proposed Action → Evidence → Risk & Controls → Decision Ask.
- 10-Second Test; Action Headlines (conclusions, not topics); maximum 3 levels of visual hierarchy with an explicit "So What?".
- **Claims Table**: a presentation is incomplete without auditing at least 5 key claims — Claim, Data Source, Confidence (High/Medium/Low), Verification Step. Low-confidence claims without data are removed or rewritten as "To be validated in pilot phase".
- **Single source → multi-output**: one structured master document, transformed with numbers and risk statements locked into: 5-slide executive deck, 1-page memo, 150-word email, 3-bullet board brief, meeting talking points.

## Week 7: Build Automated Dashboards

- Dashboards fail through information overload, vanity metrics, missing data owners, undocumented assumptions and silent pipeline failures.
- **Goal → KPI → Decision → Action**: every metric links a strategic goal to a quantifiable threshold that triggers an action.
- **5 Tests of a True KPI**: Measurable, Decision-Linked, Formula Transparency, Assigned Owner, Defined Refresh Cadence.
- **Grain**: the real-world entity one row represents; joining mismatched grains multiplies duplicates. Hygiene: flat schemas, YYYY-MM-DD dates, uniform labels, explicit null rules.
- Integration: Append (stack identical schemas) vs Join (merge on unique keys). Post-integration sanity checks: row counts, totals not inflated, unmatched records explained, 5 sample rows audited.
- **10-Second Decision Test**; layout: 3–6 KPI cards top-left/centre, trends in the middle, breakdowns at the bottom; traffic-light discipline (Green on track, Amber caution, Red breach).
- Handover package: production file, KPI dictionary, refresh pipeline architecture, documented assumptions, data lineage registry, named owner and audit cadence.

## Week 9: Automate Market Research & Competitive Intelligence

- Process: Strategic Questions → Analysis Dimensions → Signal Sources → Collection & Validation.
- **5 signal categories**: Competitor Moves; Market Shifts; Technology Disruptions; Customer Behaviour; Regulatory & Policy Updates.
- **Triangulation**: Primary (interviews, conferences, frontline sales), Secondary (audited filings, annual reports, industry research), Digital (job boards, code repos, patent databases).
- **Signal Log**: Description, Source URL, Date, Category, Credibility (H/M/L), Validation Status, Business Relevance, Next Action (Use Now / Monitor / Discard).
- Compare competitors on fixed dimensions: Products, Pricing Models, Market Verticals, Technology Architecture, Partnerships, Distribution Channels. Infer intent only when multiple independent signals converge.
- **8-Part Executive Brief**: Strategic Question, Key Signals, Context Analysis, Strategic Insights, Business Implications, Evidence Confidence Level, Decision Ask, Next Steps/Owner.
- Automated alert triggers for high-impact events (e.g. confirmed competitor price change ≥ 10%).

## Week 10: Create Smart Work Assistants

- Assistants combine context awareness, structured reasoning, consistent persona and systematic failure handling across HR, Sales, Ops and Customer Success.
- **Allowed vs Prohibited boundaries** (e.g. may summarise HR policies; must not give binding legal counsel).
- **Four guardrail layers**: Input Validation, Output Constraints, Content Safety Filters, Escalation Triggers.
- **Success criteria**: Accuracy (grounded in source), Format Compliance, Time Efficiency (< 30 s), User Satisfaction (≥ 4/5).
- **Context layers**: Static (SOPs, specs), Dynamic (runtime input, live session data), System (persona, tone, rules).
- **Grounded prompt pattern**: Role + Source of Truth + Task + Evidence Rule + Missing Context Rule + Output Schema.
- Workflow: Input Collection → Draft Generation → Safety Validation → Human Handoff/Review → Final Execution.
- **5-case test pack**: 3 Normal, 1 Boundary/Edge, 1 Adversarial/Failure. Score each 1–5 on Functional Accuracy, Clarity, Relevance, Format Adherence, Safety. Any case < 3 or any safety failure blocks production.
- **Failure escalation matrix**: Hallucination → stop, audit grounding, disallow continuation; Instruction Drift → correct constraints, re-run under review; Missing Context → ask for documents, don't guess.
- Version maturation: V1 Baseline → V2 Grounded Context → V3 Structured Workflows → V4 Validated Production.

## Week 11: Build Custom GPTs From Your Documents

- **Retrieve First, Then Answer**: anchor responses in verified records rather than pre-trained memory; semantic-search precision plus LLM synthesis.
- **Knowledge-base preparation**: remove duplicates, retire superseded drafts, standardise formatting/headings, establish canonical sources. Semantic chunking: self-contained chunks of one concept each (200–500 words). Metadata per chunk: Document Title, Department, Version Date, Owner, Access Clearance — filter before semantic ranking.
- **Citation-based verification**: granular citations (e.g. [Travel Policy v3.2, Section 4.2]); strict retrieval constraints; mandatory rejection: "Information not available in knowledge base"; fixed Answer + Source Citation schema.
- **Governance**: version control (Draft → Reviewed → Approved); index refresh triggers on modification or archiving; role-based access control (least privilege).

## Week 12: Build Multi-Source Search Assistants

- Unify unstructured text (PDFs, SOPs), structured data (warehouses, sheets), live APIs and external feeds. Define scope: permitted question types, authorised sources, out-of-scope exclusions.
- **Query Routing** (intent classification to one optimal repository; fast, less compute) vs **Parallel Retrieval** (query many systems at once; coverage at the cost of latency).
- **Deduplication** (exact and near-identical), **Normalisation** (schemas, currencies, dates, metric definitions such as Gross vs Net Revenue), **Composite ranking**: Score = w1·Relevance + w2·Recency + w3·Source Credibility + w4·Completeness.
- **Evidence hierarchy**: Internal Authoritative > External Official Filings > Recent Secondary Reports > Unverified Web.
- **Resolution rules**: (1) select highest-ranked authoritative source, (2) present both transparently if ambiguity persists, (3) ask the user to clarify, (4) reject if uncertain.
- **Monitoring & governance**: log queries, retrievals, outputs and failure rates; threshold alerts; source-level access control; sensitivity classes (Public, Internal, Confidential, Restricted); PII masking.

## Week 13: Create No-Code Multi-Agents

- Monolithic models degrade when researching, analysing, formatting and reviewing in one prompt context.
- **Roles**: Planner (deconstructs goals, sets priorities), Researcher (retrieves from approved sources), Executor (transformations, drafts, API actions), Reviewer/Validator (audits against schema, grounding and safety). **Golden rule: one agent = one clear responsibility.**
- **Sequential** workflows pass structured output (JSON/Markdown) from A to B; **Parallel** workflows run independent agents concurrently, merged by an aggregator agent.
- **Shared context management**: pass task state, citations and constraints; exclude irrelevant history to avoid overflow. **Least-privilege tool access** by role.
- **Failure modes**: Infinite loops (hard iteration limit N ≤ 5, circuit breakers); Task misrouting (explicit classification tags, fallback routing); Contradictory outputs (synthesis agent with evidence ranking); Missing outputs/dead ends (step-level timeouts, manual fallback).
- **Trace-driven debugging**: Trace ID, Agent Name, Tool Invoked, Input Payload, Output Schema, Latency, Error Status.
- **Quality–Cost–Time optimisation**: prune agents, sharpen prompts, cache static retrievals, batch API calls.
- **Handover runbook**: agent roles & scope, I/O schemas, execution sequence diagram, tool permissions, governance fallbacks, HITL review gates.

## Course references
NIST AI RMF 1.0 (2023) · OpenAI prompt engineering & structured outputs; A Practical Guide to Building AI Agents (2024) · Microsoft Azure LLMOps maturity model & agent orchestration patterns (2024) · Anthropic multi-shot prompting, context engineering & evals for agents (2024) · Databricks RAG governance & LLMOps (2024) · Penrose & Alley (2018), the assertion–evidence approach · SCIP (2022) competitive intelligence standards · n8n & LogicWorkflow (2026) workflow testing beyond happy paths.
