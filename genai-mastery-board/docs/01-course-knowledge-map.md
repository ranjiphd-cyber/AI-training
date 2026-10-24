# 01 — Course Knowledge Map

> Generated from `app/content/*.js` by `app/tests/gen-knowledge-map.js`. Edit the content files, then re-run the script.

**Primary source:** your course compendium (`course-material/iitm-master-course-compendium.md`), tag **IITM-D**, covering Weeks 1–7 and 9–13.
Weeks 8, 14 and 15 come from the brochure only (**IITM-B**): *course material not currently available*.
**IITM-L** marks items you named that the compendium doesn't contain (COSTAR; the chatbot/assistant/automation/agent distinction).

**Exam importance** is an estimate until the exam format is known. **Qs** = questions in the bank for that concept.

| Totals | |
|---|---|
| Weeks / modules | 15 |
| Concepts | 95 (70 from the compendium) |
| Auto-marked questions | 230 |
| Written questions | 24 |


## Pillar 1 — Foundations of AI, LLMs & Prompt Engineering

### Week 1 — AI Fundamentals for Everyday Work Efficiency

**Course frameworks:** 3-Tier AI Risk Model · Cost–Latency–Accuracy Triangle · 60-Second Pre-Flight Checklist · 5-Step Manual Verification Protocol · Impact–Effort Matrix · Hard & soft ROI · 1-Page AI Business Proposal  
**Tools:** Chat assistants (ChatGPT, Claude, Gemini) · **Exam importance:** H · **Practical importance:** M

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C01.1 | AI – ML – DL – GenAI hierarchy | Rules vs learning; predictive vs generative; where LLMs sit | IITM-B | C01.4, C02.1 | Explain to a leader which kind of AI a vendor is selling | H | L | 2 |
| C01.2 | Hard & soft ROI | Hours saved per task × frequency × labour rate = gross savings; soft ROI: standardisation, lower cognitive load, faster turnaround | IITM-B+D | C05.6, C01.9 | Build a Personal AI Time-Saver Plan with hard and soft ROI | H | H | 4 |
| C01.3 | Opportunity discovery & prioritisation | Impact–Effort Matrix (high impact, low effort first); Automate / Accelerate / Augment / Avoid AI | IITM-B+D | C01.2, C05.1 | Plot your team's tasks on an Impact–Effort Matrix | H | H | 4 |
| C01.4 | Core mental model: fluency ≠ accuracy | Probabilistic next-word prediction; not a factual database or an autonomous decision-maker | IITM-D | C02.1, C02.3 | Explain why a confident answer can still be wrong | H | M | 3 |
| C01.5 | The 3-Tier AI Risk Model | Tier 1 drafting & ideation; Tier 2 internal analysis & reporting; Tier 3 external & decision-critical | IITM-D | C01.8, C04.2, C14.4 | Assign a tier and the matching oversight to any use case | H | H | 8 |
| C01.6 | From Shadow AI to a governed AI operating model | Untracked personal use vs enterprise-governed use with policy, tools and logging | IITM-D | C04.4 | Describe the shift for your TA team | M | M | 1 |
| C01.7 | The Cost–Latency–Accuracy Triangle | Improving one dimension forces trade-offs in the others | IITM-D | C02.4, C02.7 | Place three TA use cases on the triangle | H | M | 2 |
| C01.8 | 60-Second Pre-Flight Checklist & 5-Step Verification Protocol | Pre-flight: remove PII, purpose, format & tone, human reviewer, downstream use. Verify: trusted sources, spot-check numbers, step-by-step reasoning, rephrase & compare, compliance & tone | IITM-D | C04.6, C14.4 | Run both checklists on a real output | H | H | 5 |
| C01.9 | 1-Page AI Business Proposal | Problem, proposed AI solution, expected impact (ROI), risk & controls, pilot scope, success metrics | IITM-D | C01.2, C02.5 | Write a one-page proposal for a TA use case | M | H | 2 |

### Week 2 — Choose the Right AI Model for Your Tasks

**Course frameworks:** Six decision pillars · Three failure modes · Prompt knobs · Business AI Stack (5 categories) · Executive Justification Framework  
**Tools:** Model playgrounds, Google AI Studio · **Exam importance:** H · **Practical importance:** M

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C02.1 | How LLMs generate responses | Tokens; next-token prediction; probability; context | IITM-B+D | C01.4, C03.6 | Predict how wording changes output | H | M | 1 |
| C02.2 | High-level LLM architecture | Pre-training; instruction tuning; context window; multimodal | IITM-B | C02.1 | Explain why a model doesn't know last week's news | M | L | 1 |
| C02.3 | The three failure modes | Incomplete output; drift; hallucination | IITM-D | C02.6, C10.6, C11.4 | Diagnose which failure mode a bad output shows | H | H | 6 |
| C02.4 | Six decision pillars | Cost, Speed, Accuracy, Risk, Trust, Scalability | IITM-D | C01.7, C02.7 | Compare two AI options on the six pillars | H | M | 2 |
| C02.5 | Executive Justification Framework | Problem → Choice → Value → Risk Control → Owner | IITM-D | C01.9, C02.4 | Justify an AI choice to your CHRO in five lines | H | H | 3 |
| C02.6 | Prompt knobs: controlling outputs | Context quality, instruction clarity, negative/positive constraints, concrete examples, temperature | IITM-D | C03.3, C03.4 | Fix a failing output by turning one knob at a time | H | M | 3 |
| C02.7 | The Business AI Stack & trade-off tensions | Chat, Search & Knowledge, Automation, Analytics & Insights, Agent Frameworks; Accuracy vs Speed, Cost vs Scale, Flexibility vs Control, Power vs Risk | IITM-D | C13.1, C04.1 | Pick the stack category for five TA problems | H | H | 7 |
| C02.8 | Hidden cost drivers | Token consumption scaling with adoption; human review bottlenecks; integration maintenance | IITM-D | C05.6 | List the hidden costs of a planned AI rollout | M | M | 2 |

### Week 3 — Design Effective Prompts for Reliable AI Outputs

**Course frameworks:** Role · Context · Rules · Output Format · Prompt Maturity Curve (L1–L5) · Zero-shot vs few-shot · Prompt failure taxonomy & debugging loop · Reusable Prompt Blueprint · Peer Review Rubric · COSTAR (your notes)  
**Tools:** Prompt playground, Claude, ChatGPT · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C03.1 | Zero-shot vs few-shot | Zero-shot for low-risk creative work; few-shot mandatory for medium/high-risk, compliance, brand voice and reusable templates; risks of poor examples | IITM-B+D | C03.3, C03.10 | Decide when examples are mandatory | H | H | 5 |
| C03.2 | COSTAR | Context, Objective, Style, Tone, Audience, Response (from your notes; not in the compendium) | IITM-L | C03.3, C06.2 | Write a COSTAR prompt for a recruiter email | M | M | 1 |
| C03.3 | Prompts as behavioural control: Role · Context · Rules · Output Format | Role = identity and expertise boundary; Context = domain, facts, sources; Rules = boundaries, negative constraints, fallbacks; Output Format = exact deliverable | IITM-D | C03.2, C03.10, C02.6 | Write a four-part prompt for a TA task | H | H | 6 |
| C03.4 | Prompt failure taxonomy & debugging loop | Missing context, ambiguous goals, absent constraints, unclear output format, task overloading; test → observe → identify → adjust one variable → retest | IITM-D | C02.6, C03.9 | Debug a failing prompt one variable at a time | H | H | 5 |
| C03.5 | Structured outputs | Tables, JSON schema, fixed headings, field lists | IITM-B+D | C03.3, C13.3 | Make output machine-readable for an automation | H | H | 2 |
| C03.6 | Generation controls (temperature) | Low temperature for reliable extraction; higher for creative ideation | IITM-B+D | C02.6 | Choose a temperature for three tasks | M | M | 1 |
| C03.7 | Safe workplace prompting | Removing personal or confidential data and risky phrasing | IITM-B | C04.6, C14.3 | Rewrite a real prompt to remove candidate personal data | H | H | 1 |
| C03.8 | The Prompt Maturity Curve | L1 Chatting, L2 Formatting, L3 Structuring, L4 Testing, L5 System Design | IITM-D | C03.10 | Place your team's prompts on the curve | H | M | 3 |
| C03.9 | Test-case bank & Before/After capture | Easy/standard, boundary/edge, high-risk/failure cases; baseline, refined prompt, failure type, risk reduction, business impact | IITM-D | C03.4, C05.7, C10.5 | Build a nine-case test bank for one prompt | H | H | 3 |
| C03.10 | The Reusable Prompt Blueprint | Fixed control logic (role, grounding rules, output schema, self-validation) + variable inputs + self-checking outputs | IITM-D | C03.3, C03.11 | Turn a one-off prompt into a blueprint with {variables} | H | H | 4 |
| C03.11 | Prompt Peer Review Rubric | Score 1–5: Role/Task Definition, Constraint Strength, Validation Logic, Reusability, Scalability Readiness → Approve / Revise / Escalate | IITM-D | C03.10 | Review a colleague's prompt with the rubric | H | M | 2 |

## Pillar 2 — Ecosystem, Tooling & Automation for Business

### Week 4 — Build Your Everyday AI Toolstack

**Course frameworks:** 30-Second Safe Input Checklist · Minimum Viable Toolstack Operating Model · Value · Simplicity · Cost · Safety · Tool Change Radar · Reliable outputs: Structure · Completeness · Accuracy · Clarity  
**Tools:** Notion AI, Fathom, Gamma · **Exam importance:** M · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C04.1 | Categories of AI tools for business | Chat, writing, research, meeting, presentation, automation, analytics, assistant builders | IITM-B | C02.7 | Map a stack across categories | M | M | 1 |
| C04.2 | Business-first tool decisions: Value · Simplicity · Cost · Safety | Score each criterion; Safety below 4 bars a tool from Tier-2 and Tier-3 workflows | IITM-B+D | C01.5, C04.4 | Score three tools for a TA use case | H | H | 4 |
| C04.3 | Simple integrations | Connectors, APIs, webhooks (concept level) | IITM-B | C05.2 | Explain how two tools pass data | M | H | 1 |
| C04.4 | Minimum Viable Toolstack Operating Model | Data sensitivity tiers (Public · Internal after redaction · Confidential/Regulated prohibited); mandatory human verification; shared logging | IITM-D | C04.6, C01.6, C14.3 | Classify your team's data into the three tiers | H | H | 4 |
| C04.5 | Tool Change Radar | Log triggers, evaluate workflow impact, assign owner and review; switch only for proven savings, quality leaps or compliance | IITM-D | C04.2 | Run one tool change through the radar | M | M | 1 |
| C04.6 | 30-Second Safe Input Checklist | No PII · Redacted numbers · Policy compliant · Approved tool | IITM-D | C03.7, C01.8 | Apply it before every prompt for a week | H | H | 3 |
| C04.7 | Reliable professional outputs & the Everyday AI Toolkit | Structure, Completeness, Accuracy Check, Clarity for Action; Core Tools + Prompt Packs + Output Templates + Quality Checklists | IITM-D | C03.10, C06.3 | Assemble your personal toolkit | M | H | 2 |

### Week 5 — Build No-Code Automated Workflows that 2× Your Productivity

**Course frameworks:** Use-case quick test · Universal automation structure · Net automation ROI & Go/No-Go gate · Fallback Ladder · HITL Control Matrix · 2-2-1 test pack · Evidence Handover Package  
**Tools:** n8n, Zapier, Make · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C05.1 | Automation sweet spot & use-case quick test | Automate only if (Frequency + Friction + Impact) ≥ 10 and Judgement Required ≤ 2 (1–5 scale); tasks to avoid | IITM-B+D | C01.3, C05.6 | Run the quick test on five TA processes | H | H | 8 |
| C05.2 | The universal automation structure | Trigger → Data Inputs/Validation → Processing Steps → Conditions/Approvals → Outputs/Notifications → Audit Log | IITM-D | C03.5, C04.3, C05.3 | Map a manual routine onto the six layers | H | H | 7 |
| C05.3 | Conditional logic & approval gates | Route on thresholds, completeness checks or SLAs; approval before high-impact actions | IITM-B+D | C14.4, C05.4 | Add a threshold rule and an approval gate | H | H | 1 |
| C05.4 | The Fallback Ladder & HITL Control Matrix | Retry (backoff) → Notify Owner → Route to Manual → Safe Stop & Log; owners, SLAs and protocols per exception | IITM-D | C05.3, C13.8 | Design the fallback for an integration failure | H | H | 5 |
| C05.5 | Cross-functional automation | HR, Ops, Sales, Product, Finance, Marketing | IITM-B | C05.2 | Transfer a TA flow to Finance | M | M | 1 |
| C05.6 | Net automation ROI & the Go/No-Go gate | Gross value − operational effort; gate: measurable ROI, acceptable risk tier, owner, rollback feasibility, data clearance | IITM-D | C01.2, C02.8 | Run the Go/No-Go gate on one automation | H | H | 4 |
| C05.7 | Testing, debugging & the Evidence Handover Package | 2 Normal, 2 Edge, 1 Failure; reproduce → isolate → verify → safeguard → retest; logic diagram, build, 5 tests, SOP, sign-off | IITM-D | C03.9, C15.3 | Write the 2-2-1 test pack for a flow | H | H | 4 |

### Week 6 — Auto-Create Content & Presentations with AI

**Course frameworks:** 7-Step Business Brief · 7-Stage Executive Storyline · 10-Second Test & action headlines · Claims Table · Single source → multi-output  
**Tools:** Gamma, Claude · **Exam importance:** M · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C06.1 | Single source → multi-output transformation | Master document → 5-slide deck, 1-page memo, 150-word email, 3-bullet board brief, talking points; numbers and risk statements locked | IITM-B+D | C06.2, C06.3 | Turn one TA update into five formats | M | H | 2 |
| C06.2 | The 7-Step Business Brief | Context, Objective, Audience, Decision Required, Constraints, Evidence Available, Sensitivity Level | IITM-D | C03.3, C06.5 | Write a brief before generating a deck | H | H | 3 |
| C06.3 | Claims Table discipline | Audit at least 5 claims: claim, data source, confidence (H/M/L), verification step; unsupported → remove or 'To be validated in pilot phase' | IITM-D | C02.3, C11.4 | Build a claims table for an AI-made deck | H | H | 4 |
| C06.4 | Automated, auto-updating decks | Data → template → refreshed slides with review | IITM-B | C07.4 | Design a monthly TA review deck that refreshes | M | M | 1 |
| C06.5 | Executive storyline & readability standard | Current Situation → Problem/Gap → Impact → Proposed Action → Evidence → Risk & Controls → Decision Ask; 10-second test; action headlines; ≤ 3 levels; 'So what?' | IITM-D | C06.2 | Rewrite five slide titles as action headlines | H | H | 6 |

### Week 7 — Build Automated Dashboards

**Course frameworks:** Goal → KPI → Decision → Action · 5 Tests of a True KPI · Grain & dataset hygiene · Append vs Join & sanity checks · 10-Second Decision Test · Dashboard Handover Package  
**Tools:** Google Sheets, Excel, Looker Studio · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C07.1 | Dataset discipline & grain | Grain = what one row represents; flat schemas, YYYY-MM-DD dates, uniform labels, explicit null rules | IITM-B+D | C07.2 | Clean a requisition tracker to one row per requisition | H | H | 4 |
| C07.2 | Integration patterns & sanity checks | Append (stack identical schemas) vs Join (merge on unique keys); check row counts, totals, unmatched records, 5 sample rows | IITM-B+D | C07.1, C12.3 | Join an ATS export with an offer tracker and run the checks | H | H | 3 |
| C07.3 | Goal → KPI → Decision → Action & the 5 tests of a true KPI | Measurable, Decision-Linked, Formula Transparency, Assigned Owner, Defined Refresh Cadence; a threshold triggers the action | IITM-D | C07.4, C08.4 | Turn 'improve hiring' into three true KPIs | H | H | 5 |
| C07.4 | Dashboard usability: the 10-Second Decision Test | 3–6 KPI cards top, trends middle, breakdowns bottom; Green / Amber / Red discipline | IITM-D | C07.3, C06.5 | Redesign a cluttered TA dashboard | H | H | 2 |
| C07.5 | Dashboard failure modes & handover package | Overload, vanity metrics, missing owners, undocumented assumptions, silent pipeline failures; KPI dictionary, refresh pipeline, assumptions, lineage, owner & audit cadence | IITM-D | C07.3, C05.7 | Write the KPI dictionary for your dashboard | M | H | 2 |

### Week 8 — Generate Automated Insights from Dashboards *(brochure only)*

**Course frameworks:** Patterns – trends – anomalies · What changed · why it matters · what to do  
**Tools:** Sheets + AI, n8n · **Exam importance:** M · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C08.1 | Connecting dashboards to AI | Export → prompt → insight; data in context | IITM-B | C07.1 | Feed a KPI table to an AI step safely | M | H | 1 |
| C08.2 | Patterns, trends & anomalies | Baseline, variance, seasonality, outliers | IITM-B | C07.4 | Write anomaly rules for time-to-fill | H | H | 1 |
| C08.3 | Weekly leadership summaries | What changed – why it matters – what to do | IITM-B | C06.5 | Auto-generate a weekly TA brief | M | H | 1 |
| C08.4 | Data → decisions → next steps | Decision rights; recommended action; owner | IITM-B | C07.3 | Attach an owner and action to each insight | H | H | 1 |

### Week 9 — Automate Market Research & Competitive Intelligence

**Course frameworks:** CI framework · 5 signal categories · Source triangulation · Signal Log · Converging-signals rule · 8-Part Executive Brief · Alert triggers  
**Tools:** Perplexity, n8n, Claude · **Exam importance:** M · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C09.1 | The competitive intelligence framework | Strategic Questions → Analysis Dimensions → Signal Sources → Collection & Validation | IITM-D | C09.2, C12.1 | Frame a CI question for competitor hiring | H | H | 3 |
| C09.2 | The five signal categories | Competitor moves; market shifts; technology disruptions; customer behaviour; regulatory & policy updates | IITM-D | C09.1, C09.3 | Classify ten signals into the five categories | H | H | 5 |
| C09.3 | Source triangulation & the Signal Log | Primary, secondary and digital sources; log: description, URL, date, category, credibility, validation status, relevance, next action (Use Now / Monitor / Discard) | IITM-D | C12.4 | Log five real signals | H | H | 4 |
| C09.4 | Competitor comparison & converging signals | Fixed dimensions: products, pricing, verticals, technology, partnerships, distribution; infer intent only when independent signals converge | IITM-D | C09.3 | Compare three competitors on fixed dimensions | H | H | 2 |
| C09.5 | The 8-Part Executive Brief & alert triggers | Strategic question, key signals, context, insights, implications, evidence confidence, decision ask, next steps/owner; predefined high-impact triggers | IITM-D | C06.5, C07.3 | Write a brief and two alert triggers | M | H | 3 |

## Pillar 3 — Advanced Contextual AI Architectures (RAG & Agents)

### Week 10 — Create Smart Work Assistants

**Course frameworks:** Allowed vs prohibited boundaries · Four guardrail layers · Context layers · Grounded prompt pattern · 5-case test pack · Failure escalation matrix · Version maturation V1–V4  
**Tools:** Custom GPTs, Claude Projects, Gemini Gems · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C10.1 | Assistant scope: allowed vs prohibited & success criteria | Explicit boundaries; success = accuracy, format compliance, < 30 s, satisfaction ≥ 4/5 | IITM-D | C10.4 | Write the boundary list for an HR assistant | H | H | 4 |
| C10.2 | Context layers & the grounded prompt pattern | Static, dynamic and system context; Role + Source of Truth + Task + Evidence Rule + Missing Context Rule + Output Schema | IITM-D | C03.3, C11.1 | Write a grounded prompt for a policy assistant | H | H | 4 |
| C10.3 | Tone, style & memory | Consistent persona; what to remember and what never to store | IITM-B | C13.4 | Define memory rules for a recruiter assistant | M | H | 0 |
| C10.4 | Four guardrail layers & the assistant workflow | Input validation, output constraints, content safety filters, escalation triggers; input → draft → safety validation → human handoff → final execution | IITM-D | C14.4, C10.6 | Place the four guardrail layers on a candidate FAQ assistant | H | H | 6 |
| C10.5 | 5-case test pack & the production gate | 3 normal, 1 boundary, 1 adversarial; score 1–5 on accuracy, clarity, relevance, format, safety; any case < 3 or a safety fail blocks production | IITM-D | C03.9, C05.7 | Write and score a 5-case test pack | H | H | 4 |
| C10.6 | Failure escalation matrix & version maturation | Hallucination → stop and audit; drift → correct and re-run under review; missing context → ask, don't guess; V1 Baseline → V2 Grounded → V3 Structured → V4 Validated | IITM-D | C02.3, C10.5 | Match failures to escalation actions | H | H | 4 |

### Week 11 — Build Custom GPTs From Your Documents

**Course frameworks:** Retrieve first, then answer · Semantic chunking (200–500 words) · Chunk metadata · Citation & rejection of unknowns · KB lifecycle governance  
**Tools:** Custom GPTs, NotebookLM, Flowise · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C11.1 | Retrieve first, then answer | Anchor answers in verified company records, not pre-trained memory | IITM-D | C02.3, C10.2 | Decide prompt vs RAG for a use case | H | H | 3 |
| C11.2 | RAG architecture | Semantic-search retrieval precision + LLM synthesis fluency; query → retrieve → augment → generate | IITM-B+D | C11.3, C11.4 | Draw the pipeline and name each failure point | H | H | 1 |
| C11.3 | Knowledge-base preparation & semantic chunking | Clean (dedupe, retire drafts, standardise, canonical sources); 200–500-word self-contained chunks; metadata: title, department, version date, owner, access clearance | IITM-D | C07.1, C11.5 | Prepare 5–10 HR documents as a mini knowledge base | H | H | 5 |
| C11.4 | Citation-based verification & rejection of unknowns | Granular citations [Doc vX, Section]; answer only from retrieved excerpts; 'Information not available in knowledge base'; Answer + Source schema | IITM-D | C06.3, C12.4 | Configure 'answer only from these documents' | H | H | 4 |
| C11.5 | Knowledge-base governance & lifecycle | Version control (Draft → Reviewed → Approved); index refresh triggers; role-based access control | IITM-D | C14.3, C12.5 | Write a KB maintenance policy | H | H | 4 |

### Week 12 — Build Multi-Source Search Assistants

**Course frameworks:** Query routing vs parallel retrieval · Composite ranking score · Evidence hierarchy · Conflict resolution rules · Sensitivity classes  
**Tools:** Flowise, Perplexity, n8n · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C12.1 | Scoped multi-source search | Unstructured text, structured data, live APIs, external feeds; permitted questions, authorised sources, exclusions | IITM-B+D | C09.1 | Write the scope for a compensation search assistant | H | H | 1 |
| C12.2 | Query routing vs parallel retrieval | Routing: one optimal repository, fast and cheap; parallel: many systems at once, coverage at the cost of latency | IITM-D | C01.7, C13.3 | Choose routing or parallel for three questions | H | H | 4 |
| C12.3 | Deduplication, normalisation & composite ranking | Exact and near duplicates; schemas, currency, dates, metric definitions; Score = w1·Relevance + w2·Recency + w3·Credibility + w4·Completeness | IITM-D | C07.2 | Set ranking weights for a salary benchmark | H | H | 4 |
| C12.4 | Evidence hierarchy & conflict resolution | Internal authoritative > external official filings > recent secondary reports > unverified web; select, disclose both, ask, or reject | IITM-D | C09.3, C11.4 | Resolve two conflicting salary figures | H | H | 4 |
| C12.5 | Search monitoring & governance | Log queries, retrievals, outputs, failure rates; threshold alerts; source access control; Public / Internal / Confidential / Restricted; PII masking | IITM-D | C11.5, C14.3 | Write the monitoring plan | M | H | 3 |

### Week 13 — Create No-Code Multi-Agents

**Course frameworks:** Planner · Researcher · Executor · Reviewer/Validator · One agent = one responsibility · Sequential vs parallel + aggregator · Least-privilege tool access · Failure-mode matrix · Trace-driven debugging · Quality–Cost–Time triangle  
**Tools:** n8n, Flowise, Claude + MCP · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C13.1 | Chatbot vs assistant vs automation vs agent vs multi-agent | Autonomy, tools, goal pursuit, the loop | IITM-L | C02.7, C05.2, C10.1 | Classify six systems correctly | H | H | 5 |
| C13.2 | Agent role decomposition | Planner, Researcher, Executor, Reviewer/Validator; one agent = one clear responsibility; why monolithic prompts degrade | IITM-B+D | C13.3, C13.4 | Decompose a research task into roles | H | H | 6 |
| C13.3 | Sequential & parallel multi-agent workflows | Sequential: A's structured output is B's input; parallel: independent agents merged by an aggregator | IITM-D | C12.2 | Choose a topology for a given task | H | H | 3 |
| C13.4 | Shared context management & structured handoffs | Pass task state, citations and constraints; exclude irrelevant history; JSON/Markdown schemas | IITM-B+D | C03.5 | Write a handoff schema between two agents | H | H | 2 |
| C13.5 | MCP for safe file access & data fetching | Standard connector to tools and data; scoped access | IITM-B | C04.3 | Explain what MCP gives an agent and what it must not | M | M | 1 |
| C13.6 | Least-privilege tool access & guardrails | Permissions by role: Researcher read-only, Executor scoped write; approval before consequential actions | IITM-B+D | C14.4, C04.4 | Set least-privilege permissions per agent | H | H | 3 |
| C13.7 | Consistent tone & memory across agents | Shared style guide; state | IITM-B | C10.3 | Define shared context rules | M | M | 0 |
| C13.8 | Multi-agent failure modes & safeguards | Infinite loops (N ≤ 5, circuit breakers); task misrouting; contradictory outputs (synthesis agent); missing outputs (timeouts, manual fallback) | IITM-D | C05.4, C13.9 | Match each failure mode to its safeguard | H | H | 7 |
| C13.9 | Trace-driven debugging, optimisation & runbook | Trace ID, agent, tool, input, output schema, latency, error; prune agents, sharpen prompts, cache, batch; handover runbook | IITM-D | C13.8, C05.7 | Find the failing agent from a trace | H | H | 3 |

## Pillar 4 — AI Governance, Evaluation & Capstone

### Week 14 — AI Governance, Safety & Evaluation Standards *(brochure only)*

**Course frameworks:** Responsible AI principles · Human-in-the-loop · NIST AI RMF (course reference)  
**Tools:** Risk register, Evaluation sets · **Exam importance:** H · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C14.1 | Responsible AI principles & ethical risk identification | Fairness, accountability, transparency, safety, privacy | IITM-B | C01.5 | Run a risk identification on a use case | H | H | 2 |
| C14.2 | Bias, fairness & privacy safeguards | Biased data, proxy variables, disparate impact, consent | IITM-B | C14.1 | Spot bias risks in AI resume screening | H | H | 4 |
| C14.3 | Data protection in practical AI usage | Personal-data minimisation; approved tools; retention | IITM-B | C04.4, C04.6 | Classify data sensitivity for a workflow | H | H | 1 |
| C14.4 | Output verification with human-in-the-loop | Review points; approve or reject; sampling | IITM-B | C01.5, C05.3, C13.6 | Place human review gates on a workflow | H | H | 5 |
| C14.5 | Trustworthy, compliant workflows & production readiness | Test sets, acceptance criteria, logging, monitoring, audit, incident response | IITM-B | C10.5, C13.9 | Write a go-live checklist | H | H | 1 |

### Week 15 — Capstone *(brochure only)*

**Course frameworks:** Assistant + knowledge base + automations  
**Tools:** All programme tools · **Exam importance:** M · **Practical importance:** H

| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |
|---|---|---|---|---|---|---|---|---|
| C15.1 | Integrated solution | Assistant + knowledge base + automations in one workflow | IITM-B | C05.2, C11.4 | Assemble a working end-to-end flow | M | H | 1 |
| C15.2 | End-to-end business problem solving | Problem → design → build → test | IITM-B | C01.3 | Choose a capstone with real impact | M | H | 0 |
| C15.3 | Handover guides & SOPs | Run-book, owners, failure handling | IITM-B | C05.7, C13.9 | Write an SOP a colleague can follow | M | H | 1 |
| C15.4 | Demo & impact report | Before/after metrics; ROI | IITM-B | C01.2 | Present a five-minute demo | M | H | 1 |

## IBM certificate tracks (IITM-B)

| ID | Certificate | Topics | Links to |
|---|---|---|---|
| IBM-1 | Responsible & Ethical Generative AI | Limitations and ethical issues of GenAI; social and economic impact; responsible GenAI | M01, M14 |
| IBM-2 | GenAI for Execs & Business Leaders | Develop a use case; effective prompts and strategic use cases; risk awareness and mitigation; formulating a business goal; evaluating AI output | M01, M03, M14 |
| IBM-3 | Foundation Models & GenAI Platforms | Models for GenAI; text-to-text, text-to-image, text-to-code; IBM watsonx.ai; Hugging Face | M02 |

## Where the course differs from your original brief

| Topic | Your brief | Course compendium | Board uses |
|---|---|---|---|
| C03.2 COSTAR | see right | see right | Course compendium: Role · Context · Rules · Output Format. Your notes: COSTAR. They overlap on Context and Output; COSTAR adds Style, Tone and Audience, while the course adds Role and Rules (constraints and fallbacks). Use the course structure in the exam and combine both at work. |
| C05.1 Automation sweet spot & use-case quick test | see right | see right | Your brief listed seven criteria (repetition, frequency, friction, impact, judgement, sensitivity, stability). The course formalises four into the quick test; sensitivity is handled by the risk tier and data clearance in the Go/No-Go gate. |
| C05.2 The universal automation structure | see right | see right | Your brief used Trigger → Data → Decision → Integration → AI Step → Output. The course structure is Trigger → Data Inputs/Validation → Processing Steps → Conditions/Approvals → Outputs/Notifications → Audit Log. Integration happens inside the layers; the course adds validation and an audit log. Use the course order in the exam. |
| C07.3 Goal → KPI → Decision → Action & the 5 tests of a true KPI | see right | see right | Your brief used Goal → KPI → Threshold → Decision → Action. The course writes Goal → KPI → Decision → Action and places the threshold inside the KPI ('a quantifiable threshold that triggers action'). Same logic; use the course wording in the exam. |
| C13.1 Chatbot vs assistant vs automation vs agent vs multi-agent | see right | see right | This five-way distinction comes from your brief (IITM-L). The compendium frames the same idea through the Business AI Stack and the statement that monolithic models degrade on multi-step work. |

## Prerequisite graph

| Concept | Must be started first |
|---|---|
| C01.5 The 3-Tier AI Risk Model | C01.4 |
| C01.7 The Cost–Latency–Accuracy Triangle | C01.4 |
| C01.8 60-Second Pre-Flight Checklist & 5-Step Verification Protocol | C01.5 |
| C01.9 1-Page AI Business Proposal | C01.2, C01.5 |
| C02.2 High-level LLM architecture | C02.1 |
| C02.3 The three failure modes | C01.4 |
| C02.4 Six decision pillars | C01.7 |
| C02.5 Executive Justification Framework | C02.4 |
| C02.6 Prompt knobs: controlling outputs | C02.3 |
| C02.7 The Business AI Stack & trade-off tensions | C02.4 |
| C02.8 Hidden cost drivers | C02.4 |
| C03.1 Zero-shot vs few-shot | C02.1 |
| C03.2 COSTAR | C02.1 |
| C03.3 Prompts as behavioural control: Role · Context · Rules · Output Format | C02.1 |
| C03.4 Prompt failure taxonomy & debugging loop | C03.3 |
| C03.5 Structured outputs | C03.3 |
| C03.6 Generation controls (temperature) | C02.1 |
| C03.7 Safe workplace prompting | C03.3 |
| C03.8 The Prompt Maturity Curve | C03.3 |
| C03.9 Test-case bank & Before/After capture | C03.4 |
| C03.10 The Reusable Prompt Blueprint | C03.3, C03.5 |
| C03.11 Prompt Peer Review Rubric | C03.10 |
| C04.2 Business-first tool decisions: Value · Simplicity · Cost · Safety | C04.1, C01.5 |
| C04.4 Minimum Viable Toolstack Operating Model | C04.6 |
| C04.5 Tool Change Radar | C04.2 |
| C04.7 Reliable professional outputs & the Everyday AI Toolkit | C04.2 |
| C05.1 Automation sweet spot & use-case quick test | C01.3 |
| C05.2 The universal automation structure | C05.1 |
| C05.3 Conditional logic & approval gates | C05.2 |
| C05.4 The Fallback Ladder & HITL Control Matrix | C05.2 |
| C05.5 Cross-functional automation | C05.2 |
| C05.6 Net automation ROI & the Go/No-Go gate | C01.2, C05.1 |
| C05.7 Testing, debugging & the Evidence Handover Package | C05.2 |
| C06.1 Single source → multi-output transformation | C06.2 |
| C06.2 The 7-Step Business Brief | C03.3 |
| C06.3 Claims Table discipline | C02.3 |
| C06.4 Automated, auto-updating decks | C06.1 |
| C06.5 Executive storyline & readability standard | C06.2 |
| C07.2 Integration patterns & sanity checks | C07.1 |
| C07.3 Goal → KPI → Decision → Action & the 5 tests of a true KPI | C07.1 |
| C07.4 Dashboard usability: the 10-Second Decision Test | C07.3 |
| C07.5 Dashboard failure modes & handover package | C07.3 |
| C08.1 Connecting dashboards to AI | C07.1 |
| C08.2 Patterns, trends & anomalies | C07.3 |
| C08.3 Weekly leadership summaries | C08.2 |
| C08.4 Data → decisions → next steps | C07.3 |
| C09.1 The competitive intelligence framework | C03.3 |
| C09.2 The five signal categories | C09.1 |
| C09.3 Source triangulation & the Signal Log | C09.2 |
| C09.4 Competitor comparison & converging signals | C09.3 |
| C09.5 The 8-Part Executive Brief & alert triggers | C09.4 |
| C10.1 Assistant scope: allowed vs prohibited & success criteria | C03.3 |
| C10.2 Context layers & the grounded prompt pattern | C10.1 |
| C10.3 Tone, style & memory | C10.1 |
| C10.4 Four guardrail layers & the assistant workflow | C10.1 |
| C10.5 5-case test pack & the production gate | C10.1 |
| C10.6 Failure escalation matrix & version maturation | C02.3, C10.5 |
| C11.1 Retrieve first, then answer | C02.3 |
| C11.2 RAG architecture | C11.1 |
| C11.3 Knowledge-base preparation & semantic chunking | C11.1 |
| C11.4 Citation-based verification & rejection of unknowns | C11.2 |
| C11.5 Knowledge-base governance & lifecycle | C11.3 |
| C12.1 Scoped multi-source search | C11.2 |
| C12.2 Query routing vs parallel retrieval | C12.1 |
| C12.3 Deduplication, normalisation & composite ranking | C12.1 |
| C12.4 Evidence hierarchy & conflict resolution | C12.3 |
| C12.5 Search monitoring & governance | C12.1 |
| C13.1 Chatbot vs assistant vs automation vs agent vs multi-agent | C05.2, C10.1 |
| C13.2 Agent role decomposition | C13.1 |
| C13.3 Sequential & parallel multi-agent workflows | C13.2 |
| C13.4 Shared context management & structured handoffs | C03.5, C13.2 |
| C13.5 MCP for safe file access & data fetching | C13.1 |
| C13.6 Least-privilege tool access & guardrails | C13.2 |
| C13.7 Consistent tone & memory across agents | C13.2 |
| C13.8 Multi-agent failure modes & safeguards | C13.3 |
| C13.9 Trace-driven debugging, optimisation & runbook | C13.8 |
| C14.1 Responsible AI principles & ethical risk identification | C01.5 |
| C14.2 Bias, fairness & privacy safeguards | C14.1 |
| C14.3 Data protection in practical AI usage | C04.6 |
| C14.4 Output verification with human-in-the-loop | C01.5, C05.3 |
| C14.5 Trustworthy, compliant workflows & production readiness | C14.4 |
| C15.1 Integrated solution | C05.7, C11.4, C14.5 |
| C15.2 End-to-end business problem solving | C01.3 |
| C15.3 Handover guides & SOPs | C05.7 |
| C15.4 Demo & impact report | C01.2 |

## Allied concepts and where they attach (Expert Mode)

| Allied concept | Src | Extends |
|---|---|---|
| Tokens & context windows | ALLIED | C02.1 How LLMs generate responses |
| Embeddings & vector databases | ALLIED | C11.2 RAG architecture |
| Reranking & retrieval evaluation | ALLIED | C11.4 Citation-based verification & rejection of unknowns |
| Structured outputs & tool calling (fast-changing) | EXT | C03.5 Structured outputs |
| Prompt chaining | ALLIED | C03.4 Prompt failure taxonomy & debugging loop |
| Context engineering | EXT | C03.3 Prompts as behavioural control: Role · Context · Rules · Output Format |
| Agent loop: plan → act → check | ALLIED | C13.1 Chatbot vs assistant vs automation vs agent vs multi-agent |
| Orchestration patterns | EXT | C13.3 Sequential & parallel multi-agent workflows |
| Model Context Protocol (MCP) (fast-changing) | EXT | C13.5 MCP for safe file access & data fetching |
| Observability & LLMOps | EXT | C13.9 Trace-driven debugging, optimisation & runbook |
| Evals & LLM-as-judge | EXT | C10.5 5-case test pack & the production gate |
| Prompt injection & data leakage | EXT | C10.4 Four guardrail layers & the assistant workflow |
| Excessive agency | EXT | C13.6 Least-privilege tool access & guardrails |
| Latency & cost optimisation (fast-changing) | ALLIED | C01.7 The Cost–Latency–Accuracy Triangle |
| NIST AI RMF & Generative AI Profile | EXT | C14.1 Responsible AI principles & ethical risk identification |
| ISO/IEC 42001 | EXT | C14.5 Trustworthy, compliant workflows & production readiness |
| EU AI Act: recruitment as high-risk (fast-changing) | EXT | C14.2 Bias, fairness & privacy safeguards |
| India DPDP Act 2023 & Rules 2025 (fast-changing) | EXT | C14.3 Data protection in practical AI usage |
| Assertion–evidence slides | EXT | C06.5 Executive storyline & readability standard |
| SCIP competitive intelligence standards | EXT | C09.1 The competitive intelligence framework |
