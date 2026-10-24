# GenAI & Agentic AI Mastery Practice Board

A personal practice board for the *IIT Madras Pravartak Executive Programme in
Generative AI and Agentic AI Tools for Business*, built for a senior Talent
Acquisition leader who is also starting a process-improvement consulting practice.

> I should not merely know what GenAI and Agentic AI are. I should progressively
> become capable of designing, testing, explaining, governing and building useful
> AI systems independently.

## Open the board

Open `app/index.html` in a browser. No install or build step.

- Progress is saved in your browser. Use **My Progress → Copy progress as JSON** to back it up or move it.
- When the board is opened inside Claude (as a published artifact), it also saves progress to your Claude account and turns on the **live tutor**, which scores your answers against the course rubrics. Opened as a plain file, the tutor buttons become "Copy a tutor prompt" for pasting into any Claude chat.

## What's inside

| Area | Contents |
|------|----------|
| Course content | 15 weeks, 95 concepts (70 from your course compendium), each with four depth levels |
| Question bank | 230 auto-marked questions (types A–D, I, K, L) and 24 written questions (2-, 4-, 8-mark, scenario, design) |
| Quiz & Exam | 10 / 25 / 50 / full-course quizzes; Practice and Exam Mode; topic breakdown; mock exams |
| Practice Lab | 22-step guided design flow for any business idea |
| Labs | Prompt, Automation (+ Dashboard, Competitive Intelligence), RAG (+ Multi-Source), Assistant, Agent, Multi-Agent, Governance |
| Projects | P1–P8 ladder on a 28-section canvas, each section mapped to a course concept |
| Revision | Leitner spaced review, error replay, rapid revision, night-before-exam pack, confusion pairs, weekly one-pagers |
| Tracking | Mastery, exam readiness, practical skills, knowledge-gap heat map, competency levels L1–L10 |

## Sources

Your **course compendium** (`course-material/iitm-master-course-compendium.md`) is
the primary source for Weeks 1–7 and 9–13. Weeks 8, 14 and 15 use the brochure
until their material is available. Every item carries a source tag; see
`docs/00-source-register.md`, including where the course differs from the
original brief (for example, the course teaches Role · Context · Rules · Output
Format rather than COSTAR).

## Folder map

| Path | What |
|------|------|
| `app/index.html`, `app/app.js` | The board |
| `app/engine.js` | Mastery, spaced revision, priorities, quiz selection |
| `app/content/` | Course structure, concept notes, questions, labs, projects, cases, rubrics |
| `app/tests/simulate.js` | Validation run: content integrity + three simulated learners (`node app/tests/simulate.js`) |
| `app/tests/gen-knowledge-map.js` | Regenerates `docs/01-course-knowledge-map.md` from the content |
| `course-material/` | Course source material |
| `docs/00`–`09` | Architecture: source register, knowledge map, learning loop, IA/UX, data model, labs, engines & tutor, sample journeys, rubrics, implementation plan |

## Related

`../hrm-decision-lab/` is an earlier single-file HR practice dashboard.
