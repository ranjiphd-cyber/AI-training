# 01 — Course Knowledge Map

Built from the IITM Pravartak brochure (module titles and bullets, tag **IITM-B**)
and the concepts you listed from your class materials (tag **IITM-L**). See
`00-source-register.md` for the labels.

**Week numbers:** the brochure does not give weeks. Column "Module" uses the
brochure's module number. *Week: course material not currently available.*

**Exam importance** is an *estimate* (no exam blueprint was uploaded). It is based
on (a) how often the concept recurs across modules, (b) whether it is conceptual
enough to test in writing, (c) whether IBM certificate syllabi repeat it.
H = high, M = medium, L = low. Re-rate once the exam format is known.

**Project relevance** = how often the concept appears in the brochure's 20+
projects / 25+ use cases and the capstone.

Concept IDs (`C05.2` etc.) are stable keys used across all other documents.

---

## Programme structure (IITM-B)

```
PILLAR 1  Foundations of AI, LLMs & Prompt Engineering ........ M1  M2  M3
PILLAR 2  Ecosystem, Tooling & Automation for Business ........ M4  M5  M6  M7  M8  M9
PILLAR 3  Advanced Contextual AI Architectures (RAG & Agents) . M10 M11 M12 M13
PILLAR 4  AI Governance, Evaluation & Capstone ................ M14 M15
Parallel  IBM certificates: Responsible GenAI · GenAI for Leaders · Foundation Models
```

---

## PILLAR 1 — Foundations of AI, LLMs & Prompt Engineering

### Module 1 — AI Fundamentals for Everyday Work Efficiency

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C01.1 | AI – ML – DL – GenAI hierarchy | rules vs learning; predictive vs generative; where LLMs sit | IITM-B | C02.1, IBM-3 | Explain to a leader which kind of AI a vendor is selling | H | L |
| C01.2 | AI productivity & ROI | hours saved × cost; quality gain; cycle-time; adoption cost | IITM-B | C07.3, C15.4 | Build a "Personal AI Time-Saver Plan" ROI | H | H |
| C01.3 | Opportunity identification & prioritisation | **Automate / Accelerate / Augment / Avoid AI**; impact × feasibility; task inventory | IITM-B + IITM-L | C05.1, C04.2, IBM-2 | Sort a TA team's recurring tasks into the 4 buckets | H | H |
| C01.4 | What AI can vs cannot do | pattern completion, no ground truth, no live data unless connected, judgement limits | IITM-B | C02.3, C14.4 | Reject an unsuitable AI request with reasons | H | M |
| C01.5 | Accuracy, reliability, trust & responsible AI basics | accuracy vs reliability vs trust; human oversight; risk levels | IITM-B + IITM-L | C14.1–C14.5 | Set a risk level and oversight rule for a use case | H | H |

### Module 2 — Choose the Right AI Model for Your Tasks

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C02.1 | How LLMs generate responses | tokens, next-token prediction, probability, context | IITM-B | C03.6, ALLIED tokens | Predict how wording changes output | H | M |
| C02.2 | High-level LLM architecture | pre-training, instruction-tuning, context window, multimodal | IITM-B | IBM-3 | Explain "why it doesn't know last week's news" | M | L |
| C02.3 | Why LLMs hallucinate | plausible-not-true generation, missing context, ambiguous prompts, outdated training data | IITM-L | C11.1, C06.3, C14.4 | Diagnose a hallucinated answer and name the fix | H | H |
| C02.4 | Comparing models on business criteria | quality, speed, cost, context length, privacy/hosting, multimodality | IITM-B | C04.2 | Produce a model comparison table | H | M |
| C02.5 | Choosing, controlling & justifying AI systems | fit-to-task, control levers, justification to stakeholders | IITM-B + IITM-L | C02.4, C14.5 | Write a one-paragraph model choice justification | H | H |
| C02.6 | Fixing incomplete / incorrect responses | add context, split task, constrain format, ground in documents, verify | IITM-B | C03.4, C11.4 | Repair a bad output in ≤3 iterations | H | M |

### Module 3 — Design Effective Prompts for Reliable AI Outputs

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C03.1 | Zero-shot, few-shot, role-based prompting | when examples help; persona effect | IITM-B | C03.3 | Choose the right method for a task | H | H |
| C03.2 | **COSTAR** | Context, Objective, Style, Tone, Audience, Response | IITM-L | C03.3, C06.2 | Write a COSTAR prompt for a recruiter email | H | H |
| C03.3 | Context, instructions, constraints, examples | the four building blocks; ordering; delimiters | IITM-L | C03.2, ALLIED context engineering | Diagnose which block a weak prompt lacks | H | H |
| C03.4 | Anchors & iterative refinement | reference anchors, test–observe–revise loop; stress-testing with ambiguous prompts | IITM-B | C02.6 | Run a 3-version refinement log | H | M |
| C03.5 | Structured outputs | tables, JSON, fixed headings, field lists | IITM-B | C05.2, C13.4 | Make output machine-readable for an automation | H | H |
| C03.6 | Generation controls | temperature, length, depth, style settings; playground experiments | IITM-B | C02.1 | Explain when to lower temperature | M | M |
| C03.7 | Safe workplace prompting | removing personal/confidential data, risky phrasing | IITM-B (use case) | C14.3 | Rewrite a real prompt to remove candidate PII | H | H |

---

## PILLAR 2 — Ecosystem, Tooling & Automation for Business

### Module 4 — Build Your Everyday AI Toolstack

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C04.1 | Categories of AI tools for business | chat, writing, research, meeting, presentation, automation, analytics, assistant-builders | IITM-B | C04.4 | Map a stack across categories | M | M |
| C04.2 | Business-first tool selection | **value – simplicity – cost – safety** | IITM-B + IITM-L | C01.3, C02.4 | Score 3 tools for a TA use case | H | H |
| C04.3 | Simple integrations | connectors, APIs, webhooks (concept level) | IITM-B | C05.2, ALLIED APIs | Explain how two tools pass data | M | H |
| C04.4 | Mapping tools to daily workflows | one tool per step; avoid tool sprawl | IITM-B | C05.1 | Draw "my week + my tools" | M | H |
| C04.5 | Staying updated on tools & trends | evaluation cadence, pilot rules | IITM-B | C09.4 | Set a quarterly tool-review routine | L | L |

### Module 5 — Build No-Code Automated Workflows that 2× Your Productivity

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C05.1 | Identifying what to automate | repetition, frequency, friction, impact, judgement required, data sensitivity, process stability | IITM-B + IITM-L | C01.3 | Score a process for automation suitability | H | H |
| C05.2 | **Trigger → Data → Decision → Integration → AI Step → Output** | breaking a workflow into clear steps | IITM-L | C03.5, C04.3 | Decompose a manual routine into the 6 blocks | H | H |
| C05.3 | Multi-step automations with alerts & approvals | branching, approvals, notifications | IITM-B | C14.4 | Add an approval gate before a candidate email | H | H |
| C05.4 | Workflow governance | approvals, logging, escalation, exception handling, testing, handover | IITM-L | C14.5, C15.3 | Write the governance block of a workflow | H | H |
| C05.5 | Cross-functional automation | HR, Ops, Sales, Product, Finance, Marketing | IITM-B | C05.2 | Transfer a TA flow to Finance | M | M |

### Module 6 — Auto-Create Content & Presentations with AI

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C06.1 | One document → many assets | summaries, SOPs, FAQs, action lists, stakeholder updates | IITM-B | C03.2 | Repurpose a hiring-policy doc into 5 assets | M | H |
| C06.2 | Business briefs & storyline architecture | situation–complication–resolution style flow; audience-first structure | IITM-L | C03.2 | Build a 10–12 slide storyline | M | H |
| C06.3 | Claims validation & executive communication | every claim traced to a source/number; no unsupported figures | IITM-L | C02.3, C11.4 | Audit an AI-made deck for unsupported claims | H | H |
| C06.4 | Automated / auto-updating decks | data → template → refreshed slides | IITM-B | C07, C08 | Design a monthly TA review deck that refreshes | M | M |

### Module 7 — Build Automated Dashboards

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C07.1 | Dataset design & data discipline | grain, data type, date format, flat structure, missing values, naming, validation | IITM-B + IITM-L | C08.1 | Clean a requisition tracker to one-row-per-requisition | H | H |
| C07.2 | Connecting multiple data sources | joins/keys, refresh, single source of truth | IITM-B | C12.1 | Join ATS export with offer tracker | M | H |
| C07.3 | **Goal → KPI → Threshold → Decision → Action** | formula, owner, refresh frequency, threshold, trigger, action; vanity metrics | IITM-L | C08.4 | Turn "improve hiring" into 3 actionable KPIs | H | H |
| C07.4 | KPI views & automated refresh | anomaly rules, self-refreshing tracker | IITM-B | C08.2 | Build an automated KPI tracker in Sheets | M | H |

### Module 8 — Generate Automated Insights from Dashboards

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C08.1 | Connecting dashboards to AI | export → prompt → insight; data in context | IITM-B | C07.1 | Feed a KPI table to an AI step safely | M | H |
| C08.2 | Patterns, trends, anomalies | baseline, variance, seasonality, outliers | IITM-B | C07.4 | Write anomaly rules for time-to-fill | H | H |
| C08.3 | Weekly leadership summaries | what changed – why it matters – what to do | IITM-B | C06.2 | Auto-generate a weekly TA brief | M | H |
| C08.4 | Data → decisions → next steps | decision rights, recommended action, owner | IITM-B | C07.3 | Attach an owner and action to each insight | H | H |

### Module 9 — Automate Market Research & Competitive Intelligence

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C09.1 | Intelligence chain | strategic question → dimensions → signals → sources → credibility → validation → analysis → business relevance → decision supported → owner → action → cadence | IITM-L | C12.2 | Design a competitor-hiring intelligence brief | H | H |
| C09.2 | Signal collection & competitor comparison | pull & summarise market signals; weekly change tracking | IITM-B | C12.1 | Track 5 competitors' job postings weekly | M | H |
| C09.3 | Trend / opportunity / risk alerts | scorecards, opportunity maps, decision-ready summaries | IITM-B | C08.3 | Produce a campus-compensation scorecard | M | H |
| C09.4 | Monitoring & recurring intelligence | cadence, change detection, alert thresholds | IITM-L | C12, C07.3 | Set a weekly skills-demand monitor | M | H |

---

## PILLAR 3 — Advanced Contextual AI Architectures (RAG & Agents)

### Module 10 — Create Smart Work Assistants

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C10.1 | Role-aware assistant definition | purpose, role, scope, users, inputs | IITM-B + IITM-L | C03.2 | Write an assistant charter | H | H |
| C10.2 | Context injection with documents | PRDs, policies, SOPs, reports as context | IITM-B | C11 | Attach the right 3 documents, not 30 | H | H |
| C10.3 | Tone, style & memory | consistent persona; what to remember, what not to | IITM-B | C13.7 | Define memory rules for a recruiter assistant | M | H |
| C10.4 | Guardrails & conversation flow | refusals, escalation, clarifying questions, hand-off to human | IITM-L | C14.4 | Script the flow for "salary question" | H | H |
| C10.5 | Assistant evaluation | test set, rubric, failure log, continuous improvement | IITM-L | C14.5 | Write 10 test prompts with expected behaviour | H | H |

### Module 11 — Build Custom GPTs From Your Documents (RAG)

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C11.1 | Why prompts alone fail; **retrieve-first thinking** | model doesn't know your policies; retrieve, then generate | IITM-L | C02.3 | Decide prompt vs RAG for a use case | H | H |
| C11.2 | RAG pipeline | query → retrieval → augmented prompt → generation | IITM-B (RAG use cases) + IITM-L | ALLIED embeddings, chunking | Draw the pipeline and name each failure point | H | H |
| C11.3 | Knowledge-base preparation | document selection, versioning, structure, naming, chunk-friendly formatting, metadata | IITM-B + IITM-L | C07.1 | Prepare 5–10 HR documents as a mini KB | H | H |
| C11.4 | Document-backed answers & citation verification | cite source/section; "not found" behaviour | IITM-B + IITM-L | C06.3 | Configure "answer only from this document" | H | H |
| C11.5 | Knowledge governance | owners, review dates, retire outdated docs, access rights | IITM-L | C14.3 | Write a KB maintenance policy | M | H |

### Module 12 — Build Multi-Source Search Assistants

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C12.1 | Connecting multiple sources | PDFs, Sheets, websites, dashboards | IITM-B | C07.2 | Map sources to question types | M | H |
| C12.2 | Search scope & source selection | allowed questions, permitted / excluded sources, ranking, recency | IITM-L | C09.1 | Write a source policy | H | H |
| C12.3 | Deduplication, normalisation, conflicting evidence | same fact from 3 places; unit/date normalisation; conflict rules | IITM-L | C06.3 | Resolve two conflicting salary figures | H | H |
| C12.4 | Cited synthesis | one combined answer with per-claim citations | IITM-B + IITM-L | C11.4 | Produce a cited synthesis | H | H |
| C12.5 | Accuracy across split information | coverage checks, "partial answer" behaviour | IITM-B | C12.3 | Flag when a source is missing | M | M |

### Module 13 — Create No-Code Multi-Agents

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C13.1 | Chatbot vs assistant vs automation vs agent vs multi-agent | autonomy, tools, goal-pursuit, loop | IITM-L + INF | C05, C10 | Classify 6 systems correctly | H | H |
| C13.2 | Agent decomposition & clear roles | **Planner, Researcher, Executor, Reviewer** (+ Analyst, Writer, Validator); one responsibility each | IITM-B + IITM-L | C13.4 | Decompose a research task into roles | H | H |
| C13.3 | Sequential vs parallel workflows | dependency, speed, merge step | IITM-L | EXT agent patterns | Choose topology for a given task | H | H |
| C13.4 | Context sharing & structured handoffs | handoff schema, shared vs private context | IITM-B + IITM-L | C03.5 | Write a handoff contract between two agents | H | H |
| C13.5 | MCP for safe file access & data fetching | standard connector to tools/data; scoped access | IITM-B | ALLIED tool calling | Explain what MCP gives an agent and what it must not | M | M |
| C13.6 | Guardrails for accuracy & permissions | tool permissions, read vs write, approval before action | IITM-B | C14.4 | Set least-privilege permissions per agent | H | H |
| C13.7 | Consistent tone & memory across agents | shared style guide, state | IITM-B | C10.3 | Define shared context rules | M | M |
| C13.8 | Debugging & evaluating agent workflows | trace each step, find failing handoff, regression tests | IITM-L | C14.5 | Locate the failing agent in a broken run | H | H |

---

## PILLAR 4 — AI Governance, Evaluation & Capstone

### Module 14 — AI Governance, Safety & Evaluation Standards

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C14.1 | Responsible AI principles & ethical risk identification | fairness, accountability, transparency, safety, privacy | IITM-B | IBM-1, EXT NIST | Run a risk identification on a use case | H | H |
| C14.2 | Bias, fairness & privacy safeguards | biased data, proxy variables, disparate impact, consent | IITM-B | PEER IIM Ranchi M2/M8 | Spot bias risks in AI resume screening | H | H |
| C14.3 | Data protection in practical AI usage | PII minimisation, approved tools, retention | IITM-B | C03.7, EXT DPDP | Classify data sensitivity for a workflow | H | H |
| C14.4 | Output verification with human-in-the-loop | review points, approve/reject, sampling | IITM-B | C05.3, C13.6 | Place HITL gates on a workflow | H | H |
| C14.5 | Trustworthy, compliant workflows; evaluation, testing & production readiness | test sets, acceptance criteria, logging, monitoring, audit, incident response | IITM-B + IITM-L | C10.5, C13.8 | Write a go-live checklist | H | H |

### Module 15 — Capstone

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project |
|----|---------|--------------|-----|---------|-----------------|------|---------|
| C15.1 | Integrated solution | assistant + knowledge base + automations in one workflow | IITM-B | all of Pillar 3 | Assemble a working end-to-end flow | M | H |
| C15.2 | End-to-end business problem solving | problem → design → build → test | IITM-B | C01.3 | Choose a capstone with real impact | M | H |
| C15.3 | Handover guides & SOPs | run-book, owners, failure handling | IITM-B | C05.4 | Write an SOP a colleague can follow | M | H |
| C15.4 | Demo & impact report | before/after metrics, ROI | IITM-B | C01.2 | Present a 5-minute demo | M | H |

*Capstone brief details: course material not currently available.*

---

## IBM certificate tracks (IITM-B, part of the programme)

| ID | Certificate | Topics | Links to |
|----|-------------|--------|---------|
| IBM-1 | Responsible & Ethical GenAI | limitations and ethical issues; social & economic impact; responsible GenAI | M1, M14 |
| IBM-2 | GenAI for Execs & Business Leaders | develop a use case; effective prompts & strategic use cases; risk awareness & mitigation; formulating a business goal; evaluating AI output | M1, M3, M14 |
| IBM-3 | Foundation Models & GenAI Platforms | models for GenAI; text-to-text / image / code; IBM watsonx.ai; Hugging Face | M2 |

---

## Knowledge spine (how the modules build on each other)

```
M1 What AI is / where it fits
   └─► M2 How LLMs work, why they fail
         └─► M3 Prompting (control the model)
               ├─► M4 Toolstack (pick the right tool)
               ├─► M5 Automation (put the prompt inside a workflow)
               │     ├─► M6 Content   ├─► M7 Dashboards ─► M8 Insights
               │     └─► M9 Market & competitive intelligence
               └─► M10 Assistants (prompt + context + memory)
                     └─► M11 RAG (context from your documents)
                           └─► M12 Multi-source search (context from many places)
                                 └─► M13 Multi-agents (several roles + tools + handoffs)
M14 Governance & evaluation wraps every module ──► M15 Capstone integrates them
```

The same spine in the terms you used:

**Prompt Engineering → Context Engineering → RAG → Tools → Agents → Multi-Agent Orchestration → Evaluation & Governance**

("Context engineering" is an ALLIED term — current industry name for deliberately
choosing what goes into the model's context. It extends IITM's *context,
instructions, constraints, examples*.)

## Prerequisite graph (used by the revision and recommendation engines)

| Concept | Must be ≥ Competent first |
|---------|---------------------------|
| C03.2 COSTAR | C02.1 |
| C05.2 Workflow blocks | C03.5, C05.1 |
| C07.3 KPI chain | C07.1 |
| C08.2 Anomalies | C07.3 |
| C09.1 Intelligence chain | C03.3 |
| C10.1 Assistant charter | C03.2 |
| C11.2 RAG pipeline | C02.3, C10.2 |
| C12.3 Conflicts | C11.4 |
| C13.2 Decomposition | C05.2, C10.1 |
| C13.4 Handoffs | C03.5, C13.2 |
| C14.4 HITL | C01.5, C05.3 |
| C15.1 Capstone | C05.4, C11.4, C14.5 |

## Allied concepts and where they attach (MASTER mode)

| Allied concept (ALLIED / EXT) | Extends IITM concept |
|-------------------------------|----------------------|
| Foundation models, tokens, context windows | C02.1, C02.2, IBM-3 |
| Embeddings, vector databases, semantic search | C11.2 |
| Chunking, metadata, retrieval quality, reranking | C11.3, C11.4 |
| Grounding, hallucination reduction | C02.3, C11.4 |
| Structured outputs, function/tool calling, API concepts | C03.5, C04.3, C13.5 |
| Prompt chaining, context engineering | C03.3, C05.2 |
| Agent loops, planning, tool use, state, memory | C13.1, C13.2 |
| Orchestration, handoffs, single- vs multi-agent, sequential vs parallel | C13.2–C13.4 |
| MCP and integration patterns | C13.5 |
| Observability, tracing, evaluation | C13.8, C14.5 |
| Guardrails, prompt injection, data leakage, failure recovery | C13.6, C14.3, C14.5 |
| Latency, token/cost optimisation, model selection | C02.4 |
| Privacy, security, responsible AI, AI governance, production monitoring | C14.1–C14.5 |
