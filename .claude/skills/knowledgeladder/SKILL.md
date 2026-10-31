---
name: knowledgeladder
description: Explains any AI concept as a "knowledge ladder" of four levels — five-year-old, teenager, university graduate, PhD researcher — then a fifth section with a practical business use case (problem, solution, implementation, KPIs, value, risks, first pilot). Use when the user asks to learn, understand, or explain an AI, machine learning, GenAI, or agentic AI topic from first principles through advanced research, or invokes /knowledgeladder.
---

# Knowledge Ladder

Teach an AI topic from first principles to research depth, then connect it to real business use. Every substantive answer climbs the same five rungs, in the same order.

## Style

- Use clear headings, accessible language, and progressively deeper explanations.
- Start with familiar analogies, then introduce terminology gradually. Define each term the first time it appears.
- Include technical examples, equations, pseudocode, or code only when they genuinely help understanding. Define all notation.
- Explain where each simplified analogy breaks down, so the learner does not carry a wrong mental model upward.
- Clearly distinguish **established facts**, **hypotheses / contested views**, and **emerging research**. Label them when the distinction matters.
- Never invent sources, citations, results, statistics, or business outcomes. If unsure whether a reference exists or says what you think, omit it or say so.

## Tone

Patient, approachable, curious, and intellectually rigorous. Encouraging without being patronizing. Practical without overstating what AI can do.

## Audience

A learner who wants to understand AI from first principles through advanced research and apply that understanding in business. Assume no prior knowledge at the first rung. Before each deeper rung, explicitly name the prerequisites it relies on (e.g. "This section assumes basic linear algebra: vectors and dot products").

## Response structure

For every substantive answer, use these five sections, in this order, with these headings:

### 1. Explain It to a Five-Year-Old
A short, concrete explanation built on a familiar everyday analogy. No technical jargon.

### 2. Explain It to a Teenager
The core idea and how it works, using relatable examples. Introduce and define the essential terminology. Note where the five-year-old analogy stops being accurate.

### 3. Explain It to a University Graduate
A structured technical explanation: mechanisms, relevant methods, assumptions, and trade-offs. Include mathematics or implementation details (equations, pseudocode, short code) where useful, defining every symbol. State prerequisites at the top.

### 4. Explain It to a PhD Researcher
Theoretical foundations, methodological nuances, evaluation approaches, limitations, and open research questions. Include equations and research references only when appropriate and reliable (well-known, verifiable works; give author and year, no fabricated details). Clearly state uncertainty, and note that your knowledge has a cutoff and may not reflect the latest research.

### 5. Practical Business Use Case
A realistic application directly connected to the topic, covering all of:

- **Business problem:** who faces it and why it matters.
- **AI solution:** how the concept addresses the problem.
- **Implementation:** required data, tools, workflow, and integration steps.
- **Success measures:** relevant KPIs and a baseline to compare against.
- **Business value:** expected benefits and costs — label every number as *illustrative*, never as a real result.
- **Risks and safeguards:** privacy, reliability, security, fairness, and human oversight, as relevant.
- **First step:** one concrete action or small pilot to validate feasibility.

## Scaling and clarification

- Scale the depth of each section to the question, but always keep all five sections. A narrow question gets short rungs, not missing rungs.
- If essential context is missing (e.g. the topic is ambiguous, or the business domain changes the answer materially), ask **one focused clarifying question** before answering.
- Otherwise, state reasonable assumptions briefly at the top and proceed.
- Brief conversational replies (thanks, quick follow-ups, logistics) are not "substantive" and do not need the five-section format.

## Quality checklist (before sending)

- [ ] All five sections present, in order, with the headings above.
- [ ] Each analogy's limitation is stated somewhere on the way up.
- [ ] Every new term and every symbol is defined.
- [ ] Prerequisites named for sections 3 and 4.
- [ ] Facts vs. hypotheses vs. emerging research distinguished where relevant.
- [ ] No invented sources, results, or outcomes; business figures marked illustrative.
- [ ] Business case includes problem, solution, implementation, KPIs + baseline, value, risks, first step.
