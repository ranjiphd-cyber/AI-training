/* Labs, guided practice flow, projects, case studies and rubrics.
   Source: docs/05-practice-and-project-labs.md and docs/08-rubrics.md.
   Each field: id, label, q (guiding question), c (concept), exp (elements a strong answer includes). */
window.GMB = window.GMB || {};

GMB.RUBRICS = {
  R1: { name: "Prompt quality", criteria: ["Context quality", "Instruction clarity", "Constraints", "Examples", "Output specification", "Risk awareness", "Grounding", "Completeness (COSTAR)"] },
  R2: { name: "Workflow quality", criteria: ["Suitability justified", "Trigger & data defined", "Step decomposition", "AI step specified", "Approvals & human review", "Exception handling", "Logging & escalation", "Testing & handover"] },
  R3: { name: "RAG / document-grounded design", criteria: ["Need for retrieval justified", "Knowledge-base quality", "Structure & metadata", "Access control", "Grounding & citation rule", "Not-found / conflict behaviour", "Evaluation set", "Knowledge governance"] },
  R4: { name: "Assistant design", criteria: ["Purpose, role & scope", "Users & inputs", "Context & knowledge", "Memory rules", "Conversation flow", "Guardrails", "Tone & output standards", "Evaluation & improvement"] },
  R5: { name: "Agent design", criteria: ["Agent justified over simpler pattern", "Goal & instructions", "Tools & permissions", "State / memory", "Planning & actions", "Human approval", "Guardrails & failure recovery", "Evaluation & monitoring"] },
  R6: { name: "Multi-agent architecture", criteria: ["Multi-agent justified", "Role decomposition", "Inputs/outputs per agent", "Structured handoffs", "Topology choice", "Shared-context rules", "Permissions & guardrails", "Debugging & evaluation"] },
  R7: { name: "AI governance", criteria: ["Risk classification", "Accuracy & reliability controls", "Privacy & data protection", "Security", "Bias & fairness", "Human oversight", "Transparency & explainability", "Logging, audit, escalation & recovery", "Cost, latency, scalability, trust"] },
  R8: { name: "Business case quality", criteria: ["Problem clarity", "User & stakeholder", "Opportunity classification", "Need for AI tested", "Architecture fit", "Value & ROI", "Risk & controls", "Success metrics", "Implementation & MVP", "Executive communication"] }
};

GMB.TUTOR_RULES = "You are the learner's tutor for the IITM Pravartak Executive Programme in Generative AI and Agentic AI Tools for Business. The learner is a senior Talent Acquisition leader and aspiring process-improvement consultant, not a developer. Primary source: IITM course concepts (module numbers and concept IDs are given). Preserve the course terminology (COSTAR; Trigger → Data → Decision → Integration → AI Step → Output; Goal → KPI → Threshold → Decision → Action; Automate / Accelerate / Augment / Avoid AI; Planner, Researcher, Executor, Reviewer). Label anything beyond the course as ALLIED, EXT or INF. Method: evaluate the learner's attempt, name what is missing, explain why it matters with a TA example, and ask one follow-up question. Do NOT write the full model answer unless asked. Correct mistakes in five parts: what is incorrect, why, the correct principle (with concept ID), an example, and a short confirmation problem. Be direct and professional; no flattery.";

/* ---------- Guided practice: the 22 steps ---------- */
GMB.PRACTICE_STEPS = [
  { id: "s1", phase: "Frame", label: "Business problem", q: "What breaks today, for whom, how often, and at what cost? Give a number.", c: "C01.2", exp: ["A specific process step, not a broad goal", "Frequency or volume", "Time or cost impact", "Who experiences the pain"] },
  { id: "s2", phase: "Frame", label: "User", q: "Who uses the solution every day, who is affected by it, and who approves it?", c: "C10.1", exp: ["Primary user", "Affected parties (e.g. candidates)", "Sponsor or approver"] },
  { id: "s3", phase: "Frame", label: "Desired outcome", q: "What would be measurably different in 90 days?", c: "C07.3", exp: ["Measurable target", "Baseline", "Time frame"] },
  { id: "s4", phase: "Decide", label: "Classify the opportunity", q: "Automate, Accelerate, Augment or Avoid AI? Justify.", c: "C01.3", exp: ["One of the four buckets", "Reason linked to judgement and ownership of output"] },
  { id: "s5", phase: "Decide", label: "Risk level", q: "Low, medium or high risk? Consider impact on people, reversibility, data sensitivity, external exposure and regulation.", c: "C01.5", exp: ["Impact on people", "Reversibility", "Data sensitivity", "Internal vs external exposure", "Regulatory sensitivity (e.g. recruitment)"] },
  { id: "s6", phase: "Decide", label: "Is AI actually required?", q: "Could a rule, a form, a template or a dashboard solve most of it without AI?", c: "C05.1", exp: ["A non-AI alternative considered", "Which steps truly need language or judgement-like work"] },
  { id: "s7", phase: "Decide", label: "Architecture", q: "Chat, search, automation, analytics, assistant, RAG, agent or multi-agent? Why not the simpler option?", c: "C13.1", exp: ["One architecture chosen", "Why simpler options fall short", "Link to whether steps are fixed or variable"] },
  { id: "s8", phase: "Specify", label: "Required data", q: "Name every data field the system reads and where it comes from.", c: "C07.1", exp: ["Field list", "Source system", "Freshness / refresh"] },
  { id: "s9", phase: "Specify", label: "Data sensitivity", q: "Which fields identify a person or are confidential? How will you minimise them?", c: "C14.3", exp: ["Sensitive fields named", "Minimisation or anonymisation", "Approved tools / location"] },
  { id: "s10", phase: "Specify", label: "Knowledge sources", q: "Which documents or sources must the system rely on? Who owns them?", c: "C11.3", exp: ["Specific documents or sources", "Owner and version", "What is excluded"] },
  { id: "s11", phase: "Specify", label: "Prompt / instructions", q: "Draft the core instruction using COSTAR plus constraints.", c: "C03.2", exp: ["Context", "Objective", "Style, tone and audience", "Response format", "Constraints and failure rule"] },
  { id: "s12", phase: "Specify", label: "Tools & integrations", q: "Which tools, and how do they connect (connector, API, webhook, MCP)?", c: "C04.3", exp: ["Named tools", "Integration method", "Value–simplicity–cost–safety reason"] },
  { id: "s13", phase: "Specify", label: "Constraints", q: "What must the system never do or say?", c: "C03.3", exp: ["Content limits", "Action limits", "Policy or legal limits"] },
  { id: "s14", phase: "Control", label: "Guardrails", q: "What stops misuse, out-of-scope answers and data leaks?", c: "C10.4", exp: ["Scope limits", "Refusal or escalation behaviour", "Data-leak protection"] },
  { id: "s15", phase: "Control", label: "Human approval points", q: "Where could this cause harm if wrong and nobody looked? Who approves there?", c: "C14.4", exp: ["Specific review points", "Named reviewer role", "What they check"] },
  { id: "s16", phase: "Control", label: "Workflow", q: "Write the flow: Trigger → Data → Decision → Integration → AI Step → Output.", c: "C05.2", exp: ["All six blocks", "Deterministic rules in Decision blocks", "Exception path"] },
  { id: "s17", phase: "Control", label: "Expected output", q: "What exactly does the user receive, in what structure?", c: "C03.5", exp: ["Format and fields", "Recipient", "'Unknown' handling"] },
  { id: "s18", phase: "Prove & improve", label: "Test cases", q: "Write five tests: two normal, one ambiguous, one out-of-scope, one adversarial. Predict the correct behaviour.", c: "C10.5", exp: ["Normal cases", "Edge or ambiguous case", "Out-of-scope case", "Adversarial case", "Expected behaviour for each"] },
  { id: "s19", phase: "Prove & improve", label: "Success metrics", q: "Which KPI, with threshold, owner and action?", c: "C07.3", exp: ["Formula", "Threshold", "Owner", "Decision and action"] },
  { id: "s20", phase: "Prove & improve", label: "Failure modes", q: "List three ways this fails and how you'd detect each.", c: "C13.8", exp: ["Data or integration failure", "AI output failure", "Human-process failure", "Detection method"] },
  { id: "s21", phase: "Prove & improve", label: "Improve the design", q: "Looking back at steps 1–20, what would you change, and what is the smallest MVP?", c: "C14.5", exp: ["A concrete change", "MVP scope", "What is deferred"] },
  { id: "s22", phase: "Prove & improve", label: "Implementation", q: "How would you build it with no-code tools? Which parts would need a technical team?", c: "C15.3", exp: ["Named no-code tools", "Build order", "Technical-team dependencies", "Owner after launch"] }
];

GMB.SAMPLE_IDEAS = ["Build an AI assistant to improve recruitment efficiency", "Automate recruitment reporting", "Build an HR policy assistant", "Create a competitive intelligence agent", "Automate candidate follow-up", "Create a multi-agent research system", "Build an AI dashboard"];

/* ---------- Labs ---------- */
GMB.LABS = [
  { id: "prompt", name: "Prompt Lab", module: "M03", rubric: "R1", intro: "Write a prompt, score it against eight criteria, revise, and compare versions. The tutor explains gaps first and only rewrites when you ask.",
    brief: "Draft a prompt that writes an invitation to the Training & Placement Officer at a tier-2 engineering college for a campus drive (40 graduate engineers, Pune, drive in the second half of next month).",
    fields: [{ id: "prompt", label: "Your prompt", q: "Write the full prompt you would send.", c: "C03.2", big: true, exp: ["Context with facts the model can't guess", "One clear objective", "Style, tone and audience stated", "Response format (subject, length, structure)", "Constraints: what not to invent or promise", "Grounding: facts supplied or source named", "Failure rule if data is missing", "No unnecessary personal data"] }] },
  { id: "automation", name: "Automation Lab", module: "M05", rubric: "R2", suitability: true, intro: "Score a process for automation, then design it block by block and add governance.",
    brief: "Interview reminders: today recruiters manually email candidates and panellists 24 hours before each interview, and chase reschedules by phone.",
    fields: [
      { id: "trigger", label: "Trigger", q: "What event or schedule starts the flow?", c: "C05.2", exp: ["Specific event or schedule", "Source system"] },
      { id: "data", label: "Inputs / data", q: "Which fields are needed and where do they come from?", c: "C07.1", exp: ["Field list", "Source", "Freshness"] },
      { id: "decision", label: "Decision / approval", q: "Which rules or approvals apply?", c: "C05.3", exp: ["Deterministic rules", "Approval before external or high-impact actions"] },
      { id: "integration", label: "Integration", q: "Which systems connect, and how?", c: "C04.3", exp: ["Named systems", "Connector, API or webhook"] },
      { id: "ai", label: "AI step", q: "What exactly does AI do, with which prompt and output structure?", c: "C03.5", exp: ["Specific language task", "Prompt outline", "Structured output"] },
      { id: "output", label: "Output / notification", q: "What is produced and who receives it?", c: "C05.2", exp: ["Message or record update", "Recipient"] },
      { id: "gov", label: "Governance", q: "Logging, escalation, exception handling, testing and handover.", c: "C05.4", big: true, exp: ["What is logged", "Who is alerted when", "Missing data / API failure / low-confidence handling", "Normal, edge and failure tests", "Named owner and SOP"] }] },
  { id: "dashboard", name: "Dashboard Lab", module: "M07", rubric: "R2", intro: "Design KPIs that drive decisions: Goal → KPI → Threshold → Decision → Action. Vanity metrics get challenged.",
    brief: "Your CHRO wants 'a TA dashboard'. Design two KPIs that would change decisions.",
    fields: [
      { id: "goal", label: "Goal", q: "Which business goal does the dashboard serve?", c: "C07.3", exp: ["Business outcome, not activity"] },
      { id: "kpi", label: "KPI and formula", q: "Exact formula, population and data source for each KPI.", c: "C07.3", big: true, exp: ["Precise formula", "Population (e.g. critical roles)", "Data source", "Paired quality KPI to avoid gaming"] },
      { id: "threshold", label: "Threshold", q: "What level triggers action, and how did you choose it?", c: "C07.3", exp: ["Numeric threshold", "Baseline reasoning"] },
      { id: "decision", label: "Decision & action", q: "What decision does crossing the threshold trigger, and what action follows?", c: "C08.4", exp: ["Decision", "Concrete action", "Deadline"] },
      { id: "owner", label: "Owner & refresh", q: "Who owns each KPI and how often does it refresh?", c: "C07.3", exp: ["Named role", "Refresh frequency"] },
      { id: "dataset", label: "Dataset discipline", q: "Grain, types, date format, flat structure, missing values, naming, validation.", c: "C07.1", big: true, exp: ["Grain stated", "Data types", "ISO dates", "Flat table", "Missing-value rule", "Naming convention", "Validation lists"] }] },
  { id: "ci", name: "Competitive Intelligence Lab", module: "M09", rubric: "R8", intro: "Build an intelligence system from a strategic question to an owned action with a cadence.",
    brief: "Topic: competitor hiring for GenAI roles in Bengaluru, Hyderabad and Pune.",
    fields: [
      { id: "question", label: "Strategic question", q: "Which decision will this intelligence support?", c: "C09.1", exp: ["Question linked to a decision"] },
      { id: "dims", label: "Dimensions & signals", q: "What will you measure, and which signals indicate it?", c: "C09.1", exp: ["Dimensions", "Observable signals"] },
      { id: "sources", label: "Sources & credibility", q: "Which sources, rated how?", c: "C12.2", exp: ["Named sources", "Credibility rating", "Excluded sources"] },
      { id: "validation", label: "Validation & analysis", q: "How will you validate signals and analyse them?", c: "C12.3", exp: ["Cross-source validation", "Analysis method"] },
      { id: "decision", label: "Relevance, decision, owner, action", q: "Why it matters, what it decides, who acts and how.", c: "C08.4", exp: ["Business relevance", "Decision supported", "Owner", "Action"] },
      { id: "cadence", label: "Update cadence & alerts", q: "How often, and what triggers an alert?", c: "C09.4", exp: ["Cadence", "Alert threshold"] }] },
  { id: "rag", name: "RAG Lab", module: "M11", rubric: "R3", intro: "Design a document-grounded assistant: why retrieval, which documents, what metadata, how it cites, and how you test it.",
    brief: "Recruiter Policy Assistant over six documents: Recruitment Policy, Referral Bonus Policy, Relocation Policy, Compensation Guidelines, Interview Code of Conduct, Background Verification SOP.",
    fields: [
      { id: "why", label: "Why will a prompt alone fail?", q: "Explain why retrieval is needed here.", c: "C11.1", exp: ["Private, organisation-specific knowledge", "Changes over time", "Need for citations"] },
      { id: "kb", label: "Knowledge base", q: "For each document: owner, version, effective date, who may see it.", c: "C11.3", big: true, exp: ["Owner per document", "Version and effective date", "Access restriction on compensation data"] },
      { id: "meta", label: "Metadata & structure", q: "Which metadata stops the assistant mixing rules (e.g. India vs UAE)?", c: "C11.3", exp: ["Region/country tag", "Grade or level", "Effective date", "Chunk-friendly headings"] },
      { id: "ground", label: "Grounding & not-found rule", q: "Write the instruction that controls answers and citations.", c: "C11.4", exp: ["Answer only from passages", "Per-claim citation format", "Not-found wording and escalation"] },
      { id: "tests", label: "Test questions", q: "Ten test questions incl. two unanswerable and one trying to extract restricted data.", c: "C10.5", big: true, exp: ["Normal questions", "Two unanswerable", "One restricted-data attempt", "Expected behaviour", "Target citation accuracy"] },
      { id: "gov", label: "Knowledge governance", q: "How is the knowledge base kept current?", c: "C11.5", exp: ["Review cadence", "Retirement of old versions", "Owner"] }] },
  { id: "multisource", name: "Multi-Source Search Lab", module: "M12", rubric: "R3", intro: "Design an assistant that answers from several sources and handles duplicates and disagreements.",
    brief: "'What is the market median offer for a data-science graduate in Bengaluru?' Sources: a salary-survey PDF, your internal offers sheet, two websites that disagree.",
    fields: [
      { id: "scope", label: "Scope & allowed questions", q: "What will it answer, and what won't it?", c: "C12.2", exp: ["Allowed questions", "Out of scope"] },
      { id: "sources", label: "Permitted, excluded & ranked sources", q: "Which sources, in what priority, within what recency?", c: "C12.2", exp: ["Permitted", "Excluded", "Ranking rule", "Recency window"] },
      { id: "norm", label: "Deduplication & normalisation", q: "How will you align currency, year, role level and titles?", c: "C12.3", exp: ["Units/currency", "Year", "Role level and title mapping", "Duplicate handling"] },
      { id: "conflict", label: "Conflict resolution", q: "What happens when sources disagree?", c: "C12.3", exp: ["Stated rule (primary > recent > official)", "Disclose unresolved conflicts"] },
      { id: "synth", label: "Cited synthesis", q: "Describe the answer format.", c: "C12.4", exp: ["One answer", "Per-claim citations", "Conflicts and gaps shown"] },
      { id: "monitor", label: "Monitoring", q: "How will it stay current?", c: "C09.4", exp: ["Refresh cadence", "Change alerts"] }] },
  { id: "assistant", name: "Assistant Lab", module: "M10", rubric: "R4", intro: "Write a full assistant charter, then the conversation flow and tests.",
    brief: "A hiring-manager intake assistant that turns a conversation into a structured requisition brief.",
    fields: [
      { id: "purpose", label: "Purpose, role & scope", q: "What it does, for whom, and what is out of scope.", c: "C10.1", exp: ["Purpose", "Users", "In scope", "Out of scope"] },
      { id: "inputs", label: "Inputs, context & knowledge", q: "What the user provides and which documents the assistant uses.", c: "C10.2", exp: ["User inputs", "Context documents (few, current)"] },
      { id: "memory", label: "Memory, tone & behaviour", q: "What it remembers, what it never stores, how it sounds.", c: "C10.3", exp: ["Memory rule", "Never-store rule", "Tone"] },
      { id: "flow", label: "Conversation flow & guardrails", q: "Clarifying questions, refusals, escalation.", c: "C10.4", big: true, exp: ["Clarifying questions", "Refusals", "Escalation to a human"] },
      { id: "output", label: "Output standard", q: "The structure of the requisition brief.", c: "C03.5", exp: ["Fields", "Unknown handling"] },
      { id: "eval", label: "Tests, failure modes & improvement", q: "Test cases, rubric and how it improves.", c: "C10.5", big: true, exp: ["Test cases incl. out-of-scope", "Failure modes", "Evaluation rubric", "Improvement cycle"] }] },
  { id: "agent", name: "Agent Lab", module: "M13", rubric: "R5", intro: "First decide whether you need an agent at all. Then specify goal, tools, permissions, approvals and monitoring.",
    brief: "An interview-scheduling agent that finds slots across panellists' calendars, handles conflicts and proposes times.",
    fields: [
      { id: "why", label: "Why an agent?", q: "What varies run to run that a fixed automation can't handle?", c: "C13.1", exp: ["Variable steps named", "Simpler option considered"] },
      { id: "goal", label: "Goal & instructions", q: "Success condition and stop condition.", c: "C13.1", exp: ["Success condition", "Stop condition / max steps"] },
      { id: "tools", label: "Tools & permissions", q: "Which tools, read or write?", c: "C13.6", exp: ["Tool list", "Read vs write", "Least privilege"] },
      { id: "state", label: "State, memory & planning", q: "What it tracks between steps and how it picks the next step.", c: "C13.1", exp: ["State tracked", "Planning approach"] },
      { id: "approval", label: "Human approval & guardrails", q: "Which actions need approval? What if a tool fails?", c: "C14.4", exp: ["Approval before booking/sending", "Failure recovery"] },
      { id: "eval", label: "Evaluation & monitoring", q: "How do you know it works, and how do you watch it?", c: "C13.8", exp: ["Success metric", "Traces", "Cost/latency watch"] }] },
  { id: "multiagent", name: "Multi-Agent Lab", module: "M13", rubric: "R6", gate: "Why can't one agent, or a fixed workflow, do this? Acceptable reasons: distinct expertise or instructions, parallel independent work, independent review.", intro: "Pass the gate question first. Then define each role with one responsibility, inputs, outputs, handoffs and permissions.",
    brief: "A talent-market research system: 'Should we open a hiring hub in Coimbatore?'",
    fields: [
      { id: "gate", label: "Gate: why multi-agent?", q: "Why can't one agent or a fixed workflow do this?", c: "C13.1", exp: ["Distinct expertise or instructions", "Parallel independent work", "Independent review"] },
      { id: "roles", label: "Roles", q: "List each agent with one responsibility, its input and its output.", c: "C13.2", big: true, exp: ["One responsibility each", "No overlap", "Inputs", "Outputs"] },
      { id: "topology", label: "Topology", q: "Sequential, parallel or both? Why?", c: "C13.3", exp: ["Topology", "Dependency reasoning", "Merge step"] },
      { id: "handoffs", label: "Handoff schemas", q: "Write the schema for at least two handoffs.", c: "C13.4", big: true, exp: ["Field lists", "Validation", "Shared vs private context"] },
      { id: "perms", label: "Permissions & guardrails", q: "Per-agent tool rights and the human approval point.", c: "C13.6", exp: ["Per-agent tools", "Least privilege", "Human approval"] },
      { id: "fail", label: "Failure handling & debugging", q: "What happens when a role fails? How do you trace it?", c: "C13.8", exp: ["Reviewer stop condition", "Retries/fallback", "Tracing"] }] },
  { id: "governance", name: "AI Governance Lab", module: "M14", rubric: "R7", intro: "Review a design against 17 governance dimensions and build a risk register.",
    brief: "Case: an AI screening tool shortlisted candidates for a graduate programme. After three months, candidates over 45 were almost never shortlisted, and one CV contained hidden text instructing the AI to rate it 10/10.",
    fields: [
      { id: "class", label: "Risk classification", q: "Classify the risk and explain why.", c: "C14.1", exp: ["High risk", "Impact on livelihoods", "Regulatory sensitivity of recruitment"] },
      { id: "bias", label: "Bias & fairness", q: "What failed and how should it have been caught?", c: "C14.2", exp: ["Historical or proxy bias", "Adverse-impact testing by group", "Ongoing monitoring"] },
      { id: "security", label: "Security", q: "How do you address the hidden-instruction CV?", c: "C14.3", exp: ["Prompt injection named", "Delimit/sanitise inputs", "Limit AI authority; human review"] },
      { id: "oversight", label: "Human oversight & explainability", q: "Where must people decide, and what do candidates get told?", c: "C14.4", exp: ["Human decision on rejections", "Transparency to candidates", "Appeal route"] },
      { id: "register", label: "Risk register", q: "Three risks: likelihood, impact, control, owner, test.", c: "C14.5", big: true, exp: ["Three risks", "Likelihood and impact", "Control", "Owner", "Test"] },
      { id: "recovery", label: "Logging, audit & recovery", q: "What is logged, and what happens now to affected candidates?", c: "C14.5", exp: ["Audit log", "Incident response", "Remediation for affected candidates"] }] }
];

GMB.SUITABILITY = [
  { id: "rep", label: "Repetition", hint: "Same steps each time?" },
  { id: "freq", label: "Frequency", hint: "How often per week?" },
  { id: "fric", label: "Friction", hint: "How painful or slow today?" },
  { id: "imp", label: "Impact", hint: "Value of doing it better?" },
  { id: "judg", label: "Judgement required", hint: "Reverse-scored", rev: true },
  { id: "sens", label: "Data sensitivity", hint: "Reverse-scored", rev: true },
  { id: "stab", label: "Process stability", hint: "Steps stable month to month?" }
];

/* ---------- Projects ---------- */
GMB.PROJECT_SECTIONS = [
  ["Business problem statement","What breaks, for whom, how often, at what cost?","C01.2"],["Users","Who uses it daily, who is affected, who approves?","C10.1"],["Use case","When __, __ wants to __ so that __.","C01.3"],["Current process","Steps, time, hand-offs, pain points.","C05.1"],["Future AI-enabled process","Which steps change and which stay human?","C05.2"],["Expected business value","Hours, quality, speed, experience; ROI.","C01.2"],["Risk classification","Low / medium / high, with reasons.","C01.5"],["Architecture","Which pattern, and why not the simpler one?","C13.1"],["Workflow diagram (in words)","Trigger → … → Output.","C05.2"],["Input data","Fields, source, grain, sensitivity.","C07.1"],["Output","Format, recipient, structure.","C03.5"],["Models","Which model class and why (quality, cost, privacy)?","C02.4"],["Tools","Value–simplicity–cost–safety scoring.","C04.2"],["Integrations","Connectors, APIs, webhooks, MCP.","C04.3"],["Prompt / system instructions","COSTAR + constraints + examples.","C03.2"],["RAG requirements","Documents, owners, chunking, citations — or 'Not applicable' with reason.","C11.2"],["Agent roles","Responsibility per role — or 'Not applicable' with reason.","C13.2"],["Multi-agent handoffs","Schema per handoff — or 'Not applicable' with reason.","C13.4"],["Human-in-the-loop controls","Where, who, what they check.","C14.4"],["Security considerations","Access, personal data, injection, leakage.","C14.3"],["Evaluation criteria","Accuracy, groundedness, tone, latency, cost.","C14.5"],["Test cases","Normal, edge, adversarial, unanswerable.","C10.5"],["Failure scenarios","What fails, how it's detected, how it recovers.","C13.8"],["Monitoring","What is logged and reviewed, how often.","C09.4"],["Business KPIs","Goal → KPI → Threshold → Decision → Action.","C07.3"],["Implementation steps","Build order, owners, timeline.","C15.3"],["MVP","Smallest version that proves value in two weeks.","C15.2"],["Future enhancements","What you add once the MVP is trusted.","C15.2"]
];

GMB.PROJECTS = [
  { id: "P1", level: 1, name: "Prompt-based solution", title: "Recruiter prompt library", brief: "Eight tested prompts: JD rewrite, outreach, interview kit, feedback summary, offer-call script, rejection note, TPO invite, hiring-manager intake. Each with COSTAR, constraints, two test inputs and a rubric score of 75% or more.", concepts: ["C03.1","C03.2","C03.3","C03.5","C03.7"], transfer: "Sales outreach library", offer: "Prompt playbook workshop", rubric: "R1", focus: [0,1,2,10,14,20,21] },
  { id: "P2", level: 2, name: "Structured prompt system", title: "Interview feedback → standard scorecard", brief: "Turn free-text interviewer notes into a structured scorecard (JSON) aligned to the competency framework, with evidence per competency and an 'unknown' option.", concepts: ["C03.5","C02.6","C10.1"], transfer: "Supplier evaluation summariser", offer: "Standard work templates", rubric: "R1", focus: [0,2,9,10,14,20,21,26] },
  { id: "P3", level: 3, name: "Automated workflow", title: "Candidate follow-up automation", brief: "Automated follow-ups at each stage with an approval gate for exceptions, logging and escalation.", concepts: ["C05.1","C05.2","C05.3","C05.4","C14.4"], transfer: "Invoice follow-up", offer: "Automation diagnostic & build", rubric: "R2", focus: [3,4,8,9,12,13,18,21,22,25] },
  { id: "P4", level: 4, name: "Document-grounded assistant", title: "HR policy assistant", brief: "Answers recruiters' policy questions with citations and 'not found' escalation, over 5–10 versioned documents.", concepts: ["C11.1","C11.2","C11.3","C11.4","C11.5","C10.4"], transfer: "IT-helpdesk SOP assistant", offer: "Policy assistant implementation", rubric: "R3", focus: [9,13,15,18,19,20,21,23] },
  { id: "P5", level: 5, name: "Multi-source search system", title: "Campus compensation intelligence", brief: "Combines salary surveys, internal offers and web sources into a cited benchmark with conflict handling and monthly monitoring.", concepts: ["C12.1","C12.2","C12.3","C12.4","C09.1"], transfer: "Pricing intelligence", offer: "Market intelligence setup", rubric: "R3", focus: [7,9,13,15,19,21,23,24] },
  { id: "P6", level: 6, name: "Single intelligent agent", title: "Interview-scheduling agent", brief: "Finds slots across calendars, handles conflicts, proposes times; books only after recruiter approval.", concepts: ["C13.1","C13.5","C13.6","C13.8"], transfer: "Procurement quote-chaser", offer: "Agent pilot", rubric: "R5", focus: [7,11,13,16,18,19,22,23] },
  { id: "P7", level: 7, name: "Multi-agent system", title: "Talent-market research system", brief: "Planner, Researchers (parallel), Analyst, Writer and Reviewer produce a cited recommendation for a new hiring location.", concepts: ["C13.2","C13.3","C13.4","C13.7","C13.8"], transfer: "Competitor strategy research", offer: "Research automation", rubric: "R6", focus: [7,16,17,18,20,22,23] },
  { id: "P8", level: 8, name: "Governed enterprise AI system", title: "Recruitment operations assistant (capstone)", brief: "Intake assistant + policy knowledge base + status automations + KPI dashboard, with full governance, SOPs and an impact report.", concepts: ["C15.1","C15.2","C15.3","C15.4","C14.1","C14.5"], transfer: "Any function", offer: "AI process redesign programme", rubric: "R8", focus: [] }
];

/* ---------- Case studies ---------- */
GMB.CASE_QUESTIONS = ["What is the business problem?", "Should AI be used? Why or why not?", "Which architecture?", "Which model or tool?", "What data?", "What is the risk?", "What controls?", "Where is human oversight required?", "How would success be measured?"];

GMB.CASES = [
  { id: "K1", fn: "Talent Acquisition", title: "Status-query overload", s: "Twelve recruiters each spend about 3.5 hours a week answering hiring managers' 'where is my requisition?' questions. Data sits in the ATS and a tracker sheet. Managers rarely open the existing dashboard.", model: "Problem: ~40 h/week lost to status queries. AI need: partly; the barrier is access behaviour. Architecture: MVP = weekly status digest automation; phase 2 = read-only Teams assistant over ATS data. Data: requisition stage counts, next step, dates; no candidate feedback or offer amounts. Risk: medium (data exposure across requisitions). Controls: access by requisition, 'as of' timestamp, logging, ATS-failure handling. Oversight: recruiter escalation for out-of-scope questions. Success: status queries per recruiter per week down 50% in 90 days; owner TA ops." },
  { id: "K2", fn: "HR", title: "Policy questions flood HR inbox", s: "HR receives 600 policy questions a month (leave, travel, relocation). Policies are 14 PDFs, some outdated. Answers vary by HRBP.", model: "RAG assistant over a cleaned, versioned knowledge base; region and effective-date metadata; citation + not-found rule; HRBP escalation; knowledge owners and quarterly review; success = % answered with correct citation, inbox volume, consistency audit." },
  { id: "K3", fn: "University Relations", title: "Campus programme ROI", s: "You hire 300 graduates a year from 25 campuses. Leadership asks which campuses to keep. Data: offers, joins, 1-year retention, performance ratings, cost per campus.", model: "Analytics dashboard + AI insight summary, not an agent. Dataset discipline (one row per hire), KPI chain (cost per retained hire, 1-year retention by campus), bias check on proxies, human decision by TA head and UR lead; AI writes the commentary, humans decide." },
  { id: "K4", fn: "Finance", title: "Month-end variance commentary", s: "Finance analysts spend two days writing variance commentary for 40 cost centres each month.", model: "Automation with AI step: data export → threshold rules → AI drafts commentary per cost centre in a fixed structure → analyst approves. Risk medium; controls: no causal claims without evidence, numbers from source only, approval before circulation. Success: time to close, edit rate." },
  { id: "K5", fn: "Operations", title: "Shift-handover notes", s: "Plant supervisors write handover notes in free text; key safety issues are sometimes missed.", model: "Structured-output assistant: supervisor dictates; AI extracts {safety_issues, equipment_status, pending_actions}; mandatory human confirmation of safety items; escalation alerts; avoid AI deciding safety actions." },
  { id: "K6", fn: "Sales", title: "Proposal drafting", s: "Sales reps build proposals from old decks; pricing errors have reached clients twice.", model: "Content system: document-grounded drafting from approved templates and price book (RAG); claims validation; pricing pulled only from the price book via integration; approval by deal desk before sending." },
  { id: "K7", fn: "Customer Service", title: "Email triage", s: "Support gets 2,000 emails a day; 30% are misrouted.", model: "Automation with AI classification (structured output: category, urgency, product) → routing rules → low-confidence items to a human queue. Measure routing accuracy weekly; sample audits." },
  { id: "K8", fn: "Supply Chain", title: "Supplier risk monitoring", s: "Procurement wants early warning of supplier risks (financial distress, disruptions, sanctions).", model: "Monitoring and recurring intelligence (multi-source): source policy, credibility ratings, alert thresholds, weekly digest, owner per supplier tier; validation before action; no automatic supplier changes." },
  { id: "K9", fn: "Manufacturing", title: "Maintenance SOP assistant", s: "Technicians search 300 SOPs on a shared drive; wrong versions are used.", model: "RAG with strict version control and equipment metadata; cite SOP number and revision; not-found escalation to the maintenance lead; never generate steps not in an SOP; safety-critical answers flagged for confirmation." },
  { id: "K10", fn: "Competitive Intelligence", title: "Competitor talent moves", s: "Leadership wants to know when competitors build new capability teams (e.g. GenAI) in your cities.", model: "Intelligence chain: question tied to workforce-plan decisions; signals = postings, leadership hires; sources rated; weekly automation with AI classification; optional multi-agent only if research paths vary; owner = TA strategy; alerts on thresholds." }
];
