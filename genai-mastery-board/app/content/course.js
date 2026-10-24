/* Course structure. Source: docs/01-course-knowledge-map.md.
   src tags: IITM-B (brochure), IITM-L (learner-reported), ALLIED, EXT, INF. */
window.GMB = window.GMB || {};

GMB.PILLARS = [
  { n: 1, title: "Foundations of AI, LLMs & Prompt Engineering" },
  { n: 2, title: "Ecosystem, Tooling & Automation for Business" },
  { n: 3, title: "Advanced Contextual AI Architectures (RAG & Agents)" },
  { n: 4, title: "AI Governance, Evaluation & Capstone" }
];

GMB.MODULES = [
  { id: "M01", p: 1, title: "AI Fundamentals for Everyday Work Efficiency", frameworks: ["Automate / Accelerate / Augment / Avoid AI", "AI–ML–DL–GenAI"], tools: ["ChatGPT / Claude / Gemini"], exam: "H", prac: "M",
    bullets: ["Understand AI–ML–DL and how GenAI differs", "AI-driven productivity and ROI", "High-impact business use cases", "What AI can vs cannot do, and how to evaluate accuracy, reliability, and responsible AI basics"] },
  { id: "M02", p: 1, title: "Choose the Right AI Model for Your Tasks", frameworks: ["Business criteria for model comparison"], tools: ["Model playgrounds", "Google AI Studio"], exam: "H", prac: "M",
    bullets: ["Learn how LLMs generate responses", "Understand high-level architecture", "Compare models using business criteria", "Match LLM strengths to real use cases, and improve output quality by fixing causes of incomplete or incorrect responses"] },
  { id: "M03", p: 1, title: "Design Effective Prompts for Reliable AI Outputs", frameworks: ["COSTAR", "Zero-shot / few-shot / role-based", "Context · Instructions · Constraints · Examples"], tools: ["Prompt playground", "Claude", "ChatGPT"], exam: "H", prac: "H",
    bullets: ["Design clear prompts using zero-shot, few-shot, and role-based methods", "Improve reliability with anchors and iterative refinement", "Generate structured outputs, and fine-tune style and depth using generation controls"] },
  { id: "M04", p: 2, title: "Build Your Everyday AI Toolstack", frameworks: ["Value – Simplicity – Cost – Safety"], tools: ["Notion AI", "Fathom", "Gamma"], exam: "M", prac: "H",
    bullets: ["Categories of AI tools for business, selecting tools by value–simplicity–cost–safety", "Understanding simple integrations", "Mapping tools to daily workflows, and staying updated on emerging tools and trends"] },
  { id: "M05", p: 2, title: "Build No-Code Automated Workflows that 2× Your Productivity", frameworks: ["Trigger → Data → Decision → Integration → AI Step → Output", "Automation suitability criteria"], tools: ["n8n", "Zapier", "Make"], exam: "H", prac: "H",
    bullets: ["Identify parts of a workflow to automate", "Break them into clear steps", "Build multi-step no-code automations with alerts and approvals, and apply them across HR, Ops, Sales, Product, Finance, and Marketing"] },
  { id: "M06", p: 2, title: "Auto-Create Content & Presentations with AI", frameworks: ["Storyline architecture", "Claims validation"], tools: ["Gamma", "Claude"], exam: "M", prac: "H",
    bullets: ["Turn one long document into multiple usable assets", "Create cross-functional communication outputs", "Build automated presentations, and generate auto-updating decks with new data and insights"] },
  { id: "M07", p: 2, title: "Build Automated Dashboards", frameworks: ["Goal → KPI → Threshold → Decision → Action", "Dataset discipline"], tools: ["Google Sheets", "Excel", "Looker Studio"], exam: "H", prac: "H",
    bullets: ["Structure and prepare data for dashboards", "Connect multiple data sources", "Build automated dashboards with KPI views"] },
  { id: "M08", p: 2, title: "Generate Automated Insights from Dashboards", frameworks: ["Patterns – trends – anomalies", "What changed · why it matters · what to do"], tools: ["Sheets + AI", "n8n"], exam: "M", prac: "H",
    bullets: ["Connect dashboards to AI for insights", "Identify patterns–trends–anomalies", "Auto-generate weekly leadership summaries", "Turn data into decisions and clear next steps"] },
  { id: "M09", p: 2, title: "Automate Market Research & Competitive Intelligence", frameworks: ["Intelligence chain: question → signals → sources → validation → decision"], tools: ["Perplexity", "n8n", "Claude"], exam: "M", prac: "H",
    bullets: ["Pull and summarise market signals, auto-compare competitors and track weekly changes, turn multi-source data into trends–opportunities–risk alerts, and generate decision-ready summaries, scorecards, and opportunity maps"] },
  { id: "M10", p: 3, title: "Create Smart Work Assistants", frameworks: ["Assistant charter: role, scope, guardrails, memory, flow, evaluation"], tools: ["Custom GPTs", "Claude Projects", "Gemini Gems"], exam: "H", prac: "H",
    bullets: ["Create assistants that understand your role", "Inject context using documents (PRDs, policies, SOPs, reports)", "Set tone–style–memory for consistent responses", "Explore how assistants support HR, Sales, Ops, and Customer Success"] },
  { id: "M11", p: 3, title: "Build Custom GPTs From Your Documents", frameworks: ["RAG", "Retrieve-first thinking", "Citation-based verification"], tools: ["Custom GPTs", "NotebookLM", "Flowise"], exam: "H", prac: "H",
    bullets: ["Turn policies, reports, and SOPs into a searchable knowledge base", "Make AI give answers backed by documents", "Organise documents for fast and accurate retrieval", "Explore RAG use cases across HR, Ops, Sales, and Support"] },
  { id: "M12", p: 3, title: "Build Multi-Source Search Assistants", frameworks: ["Scope · sources · dedup · conflicts · cited synthesis"], tools: ["Flowise", "Perplexity", "n8n"], exam: "H", prac: "H",
    bullets: ["Connect AI to multiple sources (PDFs, Sheets, websites, dashboards)", "Make AI read from all locations and produce one combined answer", "Improve accuracy when information is split across multiple sources"] },
  { id: "M13", p: 3, title: "Create No-Code Multi-Agents", frameworks: ["Planner · Researcher · Executor · Reviewer", "Sequential vs parallel", "Structured handoffs", "MCP"], tools: ["n8n", "Flowise", "Claude + MCP"], exam: "H", prac: "H",
    bullets: ["Create multiple agents that work together on end-to-end workflows", "Use MCP for safe file access and data fetching", "Define clear agent roles", "Set consistent tone and memory", "Add guardrails for accuracy and permissions", "Enable smooth handoffs between agents"] },
  { id: "M14", p: 4, title: "AI Governance, Safety & Evaluation Standards", frameworks: ["Responsible AI principles", "Human-in-the-loop", "Production readiness"], tools: ["Risk register", "Evaluation sets"], exam: "H", prac: "H",
    bullets: ["Responsible AI principles & ethical risk identification", "Bias–fairness–privacy safeguards", "Data protection in practical AI usage", "Output verification with human-in-the-loop controls", "Building trustworthy and compliant AI workflows"] },
  { id: "M15", p: 4, title: "Capstone", frameworks: ["Assistant + knowledge base + automations"], tools: ["All programme tools"], exam: "M", prac: "H",
    bullets: ["Combine your AI assistant, knowledge base, and automations into one workflow", "Solve a complete real-world business problem end-to-end", "Create clear handover guides and SOPs", "Present a final demo with a simple impact report"] }
];

GMB.IBM = [
  { id: "IBM-1", title: "Responsible & Ethical Generative AI", topics: "Limitations and ethical issues of GenAI; social and economic impact; responsible GenAI", links: "M01, M14" },
  { id: "IBM-2", title: "GenAI for Execs & Business Leaders", topics: "Develop a use case; effective prompts and strategic use cases; risk awareness and mitigation; formulating a business goal; evaluating AI output", links: "M01, M03, M14" },
  { id: "IBM-3", title: "Foundation Models & GenAI Platforms", topics: "Models for GenAI; text-to-text, text-to-image, text-to-code; IBM watsonx.ai; Hugging Face", links: "M02" }
];

/* Concepts: [id, name, sub-concepts, src, related, practical skill, exam, project, prerequisites] */
GMB.CONCEPT_ROWS = [
  ["C01.1","AI – ML – DL – GenAI hierarchy","Rules vs learning; predictive vs generative; where LLMs sit","IITM-B","C02.1","Explain to a leader which kind of AI a vendor is selling","H","L",""],
  ["C01.2","AI productivity & ROI","Hours saved × cost; quality gain; cycle time; adoption cost","IITM-B","C07.3 C15.4","Build a Personal AI Time-Saver Plan with ROI","H","H",""],
  ["C01.3","Opportunity identification & prioritisation","Automate / Accelerate / Augment / Avoid AI; impact × feasibility; task inventory","IITM-B+L","C05.1 C04.2","Sort a TA team's recurring tasks into the four buckets","H","H",""],
  ["C01.4","What AI can vs cannot do","Pattern completion; no ground truth; no live data unless connected; judgement limits","IITM-B","C02.3 C14.4","Reject an unsuitable AI request with reasons","H","M",""],
  ["C01.5","Accuracy, reliability, trust & responsible AI basics","Accuracy vs reliability vs trust; human oversight; risk levels","IITM-B+L","C14.1 C14.4","Set a risk level and oversight rule for a use case","H","H",""],
  ["C02.1","How LLMs generate responses","Tokens; next-token prediction; probability; context","IITM-B","C03.6","Predict how wording changes output","H","M",""],
  ["C02.2","High-level LLM architecture","Pre-training; instruction tuning; context window; multimodal","IITM-B","C02.1","Explain why a model doesn't know last week's news","M","L","C02.1"],
  ["C02.3","Why LLMs hallucinate","Plausible-not-true generation; missing context; ambiguous prompts; outdated training data","IITM-L","C11.1 C06.3 C14.4","Diagnose a hallucinated answer and name the fix","H","H","C02.1"],
  ["C02.4","Comparing models on business criteria","Quality, speed, cost, context length, privacy/hosting, multimodality","IITM-B","C04.2","Produce a model comparison table","H","M","C02.1"],
  ["C02.5","Choosing, controlling & justifying AI systems","Fit to task; control levers; justification to stakeholders","IITM-B+L","C02.4 C14.5","Write a one-paragraph model choice justification","H","H","C02.4"],
  ["C02.6","Fixing incomplete or incorrect responses","Add context; split task; constrain format; ground in documents; verify","IITM-B","C03.4 C11.4","Repair a bad output in three iterations or fewer","H","M","C02.3"],
  ["C03.1","Zero-shot, few-shot & role-based prompting","When examples help; persona effect","IITM-B","C03.3","Choose the right method for a task","H","H","C02.1"],
  ["C03.2","COSTAR","Context, Objective, Style, Tone, Audience, Response","IITM-L","C03.3 C06.2 C10.1","Write a COSTAR prompt for a recruiter email","H","H","C02.1"],
  ["C03.3","Context, instructions, constraints, examples","The four building blocks; ordering; delimiters","IITM-L","C03.2","Diagnose which block a weak prompt lacks","H","H","C02.1"],
  ["C03.4","Anchors & iterative refinement","Reference anchors; test–observe–revise loop; stress tests with ambiguous prompts","IITM-B","C02.6","Run a three-version refinement log","H","M","C03.3"],
  ["C03.5","Structured outputs","Tables, JSON, fixed headings, field lists","IITM-B","C05.2 C13.4","Make output machine-readable for an automation","H","H","C03.3"],
  ["C03.6","Generation controls","Temperature, length, depth and style settings; playground experiments","IITM-B","C02.1","Explain when to lower temperature","M","M","C02.1"],
  ["C03.7","Safe workplace prompting","Removing personal or confidential data and risky phrasing","IITM-B","C14.3","Rewrite a real prompt to remove candidate personal data","H","H","C03.3"],
  ["C04.1","Categories of AI tools for business","Chat, writing, research, meeting, presentation, automation, analytics, assistant builders","IITM-B","C04.4","Map a stack across categories","M","M",""],
  ["C04.2","Business-first tool selection","Value – simplicity – cost – safety","IITM-B+L","C01.3 C02.4","Score three tools for a TA use case","H","H","C04.1"],
  ["C04.3","Simple integrations","Connectors, APIs, webhooks (concept level)","IITM-B","C05.2","Explain how two tools pass data","M","H",""],
  ["C04.4","Mapping tools to daily workflows","One tool per step; avoid tool sprawl","IITM-B","C05.1","Draw 'my week and my tools'","M","H","C04.1"],
  ["C04.5","Staying updated on tools & trends","Evaluation cadence; pilot rules","IITM-B","C09.4","Set a quarterly tool-review routine","L","L",""],
  ["C05.1","Identifying what to automate","Repetition, frequency, friction, impact, judgement required, data sensitivity, process stability","IITM-B+L","C01.3","Score a process for automation suitability","H","H","C01.3"],
  ["C05.2","Trigger → Data → Decision → Integration → AI Step → Output","Breaking a workflow into clear steps","IITM-L","C03.5 C04.3","Decompose a manual routine into the six blocks","H","H","C03.5 C05.1"],
  ["C05.3","Multi-step automations with alerts & approvals","Branching, approvals, notifications","IITM-B","C14.4","Add an approval gate before a candidate email","H","H","C05.2"],
  ["C05.4","Workflow governance","Approvals, logging, escalation, exception handling, testing, handover","IITM-L","C14.5 C15.3","Write the governance block of a workflow","H","H","C05.2"],
  ["C05.5","Cross-functional automation","HR, Ops, Sales, Product, Finance, Marketing","IITM-B","C05.2","Transfer a TA flow to Finance","M","M","C05.2"],
  ["C06.1","One document → many assets","Summaries, SOPs, FAQs, action lists, stakeholder updates","IITM-B","C03.2","Repurpose a hiring-policy document into five assets","M","H","C03.2"],
  ["C06.2","Business briefs & storyline architecture","Situation – complication – resolution flow; audience-first structure","IITM-L","C03.2","Build a 10–12 slide storyline","M","H","C03.2"],
  ["C06.3","Claims validation & executive communication","Every claim traced to a source or number; no unsupported figures","IITM-L","C02.3 C11.4","Audit an AI-made deck for unsupported claims","H","H","C02.3"],
  ["C06.4","Automated, auto-updating decks","Data → template → refreshed slides","IITM-B","C07.4 C08.3","Design a monthly TA review deck that refreshes","M","M","C06.2"],
  ["C07.1","Dataset design & data discipline","Grain, data type, date format, flat structure, missing values, naming, validation","IITM-B+L","C08.1","Clean a requisition tracker to one row per requisition","H","H",""],
  ["C07.2","Connecting multiple data sources","Keys and joins; refresh; single source of truth","IITM-B","C12.1","Join an ATS export with an offer tracker","M","H","C07.1"],
  ["C07.3","Goal → KPI → Threshold → Decision → Action","Formula, owner, refresh frequency, threshold, trigger, action; vanity metrics","IITM-L","C08.4","Turn 'improve hiring' into three actionable KPIs","H","H","C07.1"],
  ["C07.4","KPI views & automated refresh","Anomaly rules; self-refreshing tracker","IITM-B","C08.2","Build an automated KPI tracker in Sheets","M","H","C07.3"],
  ["C08.1","Connecting dashboards to AI","Export → prompt → insight; data in context","IITM-B","C07.1","Feed a KPI table to an AI step safely","M","H","C07.1"],
  ["C08.2","Patterns, trends & anomalies","Baseline, variance, seasonality, outliers","IITM-B","C07.4","Write anomaly rules for time-to-fill","H","H","C07.3"],
  ["C08.3","Weekly leadership summaries","What changed – why it matters – what to do","IITM-B","C06.2","Auto-generate a weekly TA brief","M","H","C08.2"],
  ["C08.4","Data → decisions → next steps","Decision rights; recommended action; owner","IITM-B","C07.3","Attach an owner and action to each insight","H","H","C07.3"],
  ["C09.1","The intelligence chain","Strategic question → dimensions → signals → sources → credibility → validation → analysis → relevance → decision → owner → action → cadence","IITM-L","C12.2","Design a competitor-hiring intelligence brief","H","H","C03.3"],
  ["C09.2","Signal collection & competitor comparison","Pull and summarise signals; weekly change tracking","IITM-B","C12.1","Track five competitors' job postings weekly","M","H","C09.1"],
  ["C09.3","Trend, opportunity & risk alerts","Scorecards; opportunity maps; decision-ready summaries","IITM-B","C08.3","Produce a campus-compensation scorecard","M","H","C09.1"],
  ["C09.4","Monitoring & recurring intelligence","Cadence; change detection; alert thresholds","IITM-L","C07.3","Set a weekly skills-demand monitor","M","H","C09.1"],
  ["C10.1","Role-aware assistant definition","Purpose, role, scope, users, inputs","IITM-B+L","C03.2","Write an assistant charter","H","H","C03.2"],
  ["C10.2","Context injection with documents","PRDs, policies, SOPs and reports as context","IITM-B","C11.1","Attach the right three documents, not thirty","H","H","C10.1"],
  ["C10.3","Tone, style & memory","Consistent persona; what to remember and what not to","IITM-B","C13.7","Define memory rules for a recruiter assistant","M","H","C10.1"],
  ["C10.4","Guardrails & conversation flow","Refusals, escalation, clarifying questions, hand-off to a human","IITM-L","C14.4","Script the flow for a salary question","H","H","C10.1"],
  ["C10.5","Assistant evaluation","Test set, rubric, failure log, continuous improvement","IITM-L","C14.5","Write ten test prompts with expected behaviour","H","H","C10.1"],
  ["C11.1","Why prompts alone fail; retrieve-first thinking","The model doesn't know your policies; retrieve, then generate","IITM-L","C02.3","Decide prompt vs RAG for a use case","H","H","C02.3"],
  ["C11.2","The RAG pipeline","Query → retrieval → augmented prompt → generation","IITM-B+L","C11.3","Draw the pipeline and name each failure point","H","H","C02.3 C10.2"],
  ["C11.3","Knowledge-base preparation","Document selection, versioning, structure, naming, metadata","IITM-B+L","C07.1","Prepare 5–10 HR documents as a mini knowledge base","H","H","C11.1"],
  ["C11.4","Document-backed answers & citation verification","Cite source and section; 'not found' behaviour","IITM-B+L","C06.3","Configure 'answer only from this document'","H","H","C11.2"],
  ["C11.5","Knowledge governance","Owners, review dates, retiring outdated documents, access rights","IITM-L","C14.3","Write a knowledge-base maintenance policy","M","H","C11.3"],
  ["C12.1","Connecting multiple sources","PDFs, Sheets, websites, dashboards","IITM-B","C07.2","Map sources to question types","M","H","C11.2"],
  ["C12.2","Search scope & source selection","Allowed questions; permitted and excluded sources; ranking; recency","IITM-L","C09.1","Write a source policy","H","H","C12.1"],
  ["C12.3","Deduplication, normalisation & conflicting evidence","Same fact from three places; unit and date normalisation; conflict rules","IITM-L","C06.3","Resolve two conflicting salary figures","H","H","C11.4"],
  ["C12.4","Cited synthesis","One combined answer with per-claim citations","IITM-B+L","C11.4","Produce a cited synthesis","H","H","C12.3"],
  ["C12.5","Accuracy across split information","Coverage checks; partial-answer behaviour","IITM-B","C12.3","Flag when a source is missing","M","M","C12.1"],
  ["C13.1","Chatbot vs assistant vs automation vs agent vs multi-agent","Autonomy; tools; goal pursuit; the loop","IITM-L","C05.2 C10.1","Classify six systems correctly","H","H","C05.2 C10.1"],
  ["C13.2","Agent decomposition & clear roles","Planner, Researcher, Executor, Reviewer (+ Analyst, Writer, Validator); one responsibility each","IITM-B+L","C13.4","Decompose a research task into roles","H","H","C05.2 C10.1"],
  ["C13.3","Sequential vs parallel workflows","Dependency, speed, merge step","IITM-L","C13.2","Choose a topology for a given task","H","H","C13.2"],
  ["C13.4","Context sharing & structured handoffs","Handoff schema; shared vs private context","IITM-B+L","C03.5","Write a handoff contract between two agents","H","H","C03.5 C13.2"],
  ["C13.5","MCP for safe file access & data fetching","Standard connector to tools and data; scoped access","IITM-B","C04.3","Explain what MCP gives an agent and what it must not","M","M","C13.1"],
  ["C13.6","Guardrails for accuracy & permissions","Tool permissions; read vs write; approval before action","IITM-B","C14.4","Set least-privilege permissions per agent","H","H","C13.1"],
  ["C13.7","Consistent tone & memory across agents","Shared style guide; state","IITM-B","C10.3","Define shared context rules","M","M","C13.2"],
  ["C13.8","Debugging & evaluating agent workflows","Trace each step; find the failing handoff; regression tests","IITM-L","C14.5","Locate the failing agent in a broken run","H","H","C13.4"],
  ["C14.1","Responsible AI principles & ethical risk identification","Fairness, accountability, transparency, safety, privacy","IITM-B","C01.5","Run a risk identification on a use case","H","H","C01.5"],
  ["C14.2","Bias, fairness & privacy safeguards","Biased data, proxy variables, disparate impact, consent","IITM-B","C14.1","Spot bias risks in AI resume screening","H","H","C14.1"],
  ["C14.3","Data protection in practical AI usage","Personal-data minimisation; approved tools; retention","IITM-B","C03.7","Classify data sensitivity for a workflow","H","H","C01.5"],
  ["C14.4","Output verification with human-in-the-loop","Review points; approve or reject; sampling","IITM-B","C05.3 C13.6","Place human review gates on a workflow","H","H","C01.5 C05.3"],
  ["C14.5","Trustworthy, compliant workflows & production readiness","Test sets, acceptance criteria, logging, monitoring, audit, incident response","IITM-B+L","C10.5 C13.8","Write a go-live checklist","H","H","C14.4"],
  ["C15.1","Integrated solution","Assistant + knowledge base + automations in one workflow","IITM-B","C05.4 C11.4","Assemble a working end-to-end flow","M","H","C05.4 C11.4 C14.5"],
  ["C15.2","End-to-end business problem solving","Problem → design → build → test","IITM-B","C01.3","Choose a capstone with real impact","M","H","C01.3"],
  ["C15.3","Handover guides & SOPs","Run-book, owners, failure handling","IITM-B","C05.4","Write an SOP a colleague can follow","M","H","C05.4"],
  ["C15.4","Demo & impact report","Before/after metrics; ROI","IITM-B","C01.2","Present a five-minute demo","M","H","C01.2"]
];

GMB.SPINE = ["Prompt Engineering", "Context Engineering", "RAG", "Tools", "Agents", "Multi-Agent Orchestration", "Evaluation & Governance"];

GMB.TOPIC_GROUPS = [
  { name: "AI Foundations", modules: ["M01", "M02"] },
  { name: "Prompt Engineering", modules: ["M03"] },
  { name: "Tools & Automation", modules: ["M04", "M05"] },
  { name: "Content & Dashboards", modules: ["M06", "M07", "M08"] },
  { name: "Competitive Intelligence", modules: ["M09"] },
  { name: "Assistants", modules: ["M10"] },
  { name: "RAG & Search", modules: ["M11", "M12"] },
  { name: "Agents & Multi-Agents", modules: ["M13"] },
  { name: "Governance & Capstone", modules: ["M14", "M15"] }
];

GMB.ROADMAP = [
  { n: 1, title: "AI Aware", concepts: ["C01.1", "C01.4", "C02.1"], task: "Classify ten tools as rules, ML or GenAI", project: null, evidence: "Explain to a peer why an LLM can be confidently wrong" },
  { n: 2, title: "AI User", concepts: ["C01.2", "C01.3", "C02.3", "C03.7"], task: "Sort your own task list into Automate / Accelerate / Augment / Avoid", project: null, evidence: "Personal AI Time-Saver Plan: 5–7 tasks with hours saved" },
  { n: 3, title: "Prompt Practitioner", concepts: ["C03.1", "C03.2", "C03.3", "C03.4", "C03.5", "C02.6"], task: "Three-version refinement logs; a safe rewrite", project: "P1", evidence: "Ten tested TA prompts" },
  { n: 4, title: "Workflow Designer", concepts: ["C05.1", "C05.2", "C04.2", "C07.1", "C07.3"], task: "Decompose three processes; design a KPI chain", project: "P2", evidence: "Workflow spec with governance block" },
  { n: 5, title: "AI Automation Practitioner", concepts: ["C05.3", "C05.4", "C06.1", "C08.2"], task: "Build two working flows with an approval step", project: "P3", evidence: "Running flow, test log and SOP" },
  { n: 6, title: "AI Assistant Designer", concepts: ["C10.1", "C10.2", "C10.3", "C10.4", "C10.5"], task: "Assistant charter and ten-case test set", project: null, evidence: "Assistant with documented guardrails" },
  { n: 7, title: "RAG / Search System Designer", concepts: ["C11.1", "C11.2", "C11.3", "C11.4", "C12.2", "C12.3", "C12.4"], task: "Mini knowledge base; cited answers; conflict handling", project: "P5", evidence: "Citation accuracy measured on a test set" },
  { n: 8, title: "Agent Designer", concepts: ["C13.1", "C13.5", "C13.6", "C13.8"], task: "Single agent with tools, permissions and approval", project: "P6", evidence: "Trace of a run with a handled failure" },
  { n: 9, title: "Multi-Agent Solution Designer", concepts: ["C13.2", "C13.3", "C13.4", "C13.7"], task: "Three-agent pipeline with handoff schemas", project: "P7", evidence: "Handoff contracts and a debug report" },
  { n: 10, title: "AI Solution Architect / Business AI Leader", concepts: ["C14.1", "C14.2", "C14.3", "C14.4", "C14.5", "C15.1"], task: "Governance review of someone else's design; executive pitch", project: "P8", evidence: "Capstone demo, SOP, impact report, risk register" }
];

GMB.SOURCES_NOTE = "Only the IITM brochure was available. Concepts tagged IITM-L were named by you from class materials not yet uploaded; their exact course wording is pending.";
