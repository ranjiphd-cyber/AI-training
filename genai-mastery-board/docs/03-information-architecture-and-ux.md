# 03 — Information Architecture, UI/UX and Progress Dashboard

## 1. Navigation model

Left rail (desktop) / bottom sheet menu (phone), grouped so 18 sections stay scannable:

```
STUDY            LABS                      ASSESS & TRACK
 1 Home           4 Practice Lab            5 Quiz & Exam
 2 Course Map     7 Prompt Lab              15 My Progress
 3 Learn          8 Automation Lab          16 Revision Centre
 6 Build          (+ Dashboard Lab, CI Lab) 17 Knowledge Gaps
 14 Case Studies  9 RAG Lab                 18 Expert Mode
                  (+ Multi-Source Lab)
                  10 Assistant Lab
                  11 Agent Lab
                  12 Multi-Agent Lab
                  13 Governance Lab
```

Dashboard Lab, Competitive Intelligence Lab and Multi-Source Search Lab are
sub-labs (tabs) inside the Automation Lab and RAG Lab respectively, so the
primary navigation stays at the 18 items you specified.

**Global elements on every screen:** search (concepts, questions, projects) ·
"Ask the tutor" drawer · source-tag legend · current streak · breadcrumb.

**Universal drill-down rule:** every number is clickable and opens the list of
items behind it (e.g. "Quiz accuracy 74%" → attempts → individual question →
concept page).

## 2. Page-by-page specification

### 1. HOME
Purpose: answer "what should I do in the next 30 minutes?"

| Card | Content | Click → |
|------|---------|---------|
| Today's plan (top, full width) | 3 items: lesson, practice, quiz (+ project challenge on weekends), with minutes | starts the item |
| Overall Course Mastery % | weighted concept mastery | My Progress › Mastery |
| Exam Readiness % | see §5 formula; target line at 80% | Quiz & Exam › readiness breakdown |
| Practical Skills % | labs + projects | My Progress › Skills |
| Projects completed | n / 8 levels, current level | Build |
| Exercises completed | count this week / total | Practice Lab history |
| Quiz accuracy | last 30 days, trend sparkline | attempt list |
| Concepts mastered | n / total | Course Map filtered = Mastered |
| Concepts requiring revision | n due + n weak | Revision Centre |
| Learning streak | days, with "freeze" allowance of 1 day/week | — |
| Recent mistakes (3) | concept + one-line error | error replay |
| Competency level | L1–L10 badge and next requirement | Expert Mode › Roadmap |

Interaction: "Swap" on any recommended item gives the next-best option with the reason.

### 2. COURSE MAP
Purpose: whole-course view, IITM structure first.

- **View A — Pillar board:** 4 columns (pillars) × module cards.
- **View B — Spine graph:** the knowledge spine from `01` as a left-to-right flow, nodes coloured by status.
- **Module card:** title · concepts (chips with status) · key frameworks · tools · exercises · exam importance (H/M/L) · practical importance · my mastery % · status pill.
- **Missing content:** grey dashed card text "Course material not currently available" with "Upload deck" action.
- Filters: status, exam importance, source tag, pillar.

### 3. LEARN CONCEPTS
- Index: searchable list grouped by module; sort by "recommended", "weakest", "exam importance".
- **Concept page** (see §3).

### 4. PRACTICE LAB
- Entry box: **"Give me a business idea"** → runs the 22-step guided flow (`05-practice-and-project-labs.md` §2).
- Library of ready exercises filtered by concept/lab/difficulty.
- Session view: left = step list with progress ticks; centre = current question + your answer box; right = hint ladder (locked until you attempt) and tutor feedback.

### 5. QUIZ & EXAM
- Builders: 10-Q quiz · 25-Q quiz · 50-Q mock · full-course simulation · custom (pick types A–P, difficulty, modules).
- Modes: **Practice** (feedback after each question) · **Exam Mode** (no hints, no answers until submit, timer).
- Results: score, topic-wise breakdown table, error list, "revise these 3" recommendation, export.
- Night-before mode and rapid revision live here as shortcuts (also in Revision Centre).

### 6. BUILD A PROJECT
- Entry: **"I want to build ____."**
- Project ladder P1–P8 with lock state.
- Project workspace: 28-section project canvas (`05` §3), each section with "Map to IITM concept" chip, status, tutor review button.
- Export: project pack (Markdown) for portfolio or a client proposal.

### 7. PROMPT LAB
- Editor with COSTAR scaffold toggle (on/off).
- "Score my prompt" → 8-criterion scorecard (`08-rubrics.md` R1) with explanations, **no rewrite** unless "Show improved version" is pressed.
- Version history with side-by-side diff and score delta.
- Optional "Run it" panel if an API key is configured (Phase 6); otherwise you paste the model output back for evaluation.

### 8. AUTOMATION LAB (tabs: Workflow · Dashboard Lab · Competitive Intelligence Lab)
- Workflow tab: suitability scorer (7 criteria) → block canvas (Trigger, Inputs/Data, Actions, Decision/Approval, Integration, AI Step, Output) → governance panel (logging, escalation, exceptions, testing, handover).
- Dashboard Lab: Goal → KPI → Threshold → Decision → Action builder with mandatory fields; dataset discipline checker.
- CI Lab: 12-field intelligence chain builder.

### 9. RAG LAB (tabs: Document-grounded · Multi-Source Search)
- Document-grounded: KB designer (documents, owners, versions, chunking notes, metadata) → query test bench → citation checker → failure diagnosis.
- Multi-source: source policy (permitted / excluded, ranking, recency) → conflict-resolution rules → cited-synthesis template.

### 10. ASSISTANT LAB
- 16-field assistant charter → conversation-flow designer → test-case table → evaluation rubric.

### 11. AGENT LAB
- Classifier drill: chatbot / assistant / automation / agent / multi-agent.
- Agent spec: goal, instructions, context, tools, state/memory, planning, actions, guardrails, approval, evaluation, monitoring.

### 12. MULTI-AGENT LAB
- Role cards (Planner, Researcher, Analyst, Executor, Reviewer, Writer, Validator) dragged onto a sequential or parallel lane.
- Each role requires: responsibility, input, output, handoff schema, tool permissions, failure handling.
- "Should this even be multi-agent?" gate before the canvas opens.

### 13. AI GOVERNANCE LAB
- 17-dimension governance review applied to any saved project.
- Practical cases (e.g. "AI screening rejected all candidates over 45 — what failed?").

### 14. CASE STUDIES
- Case library by function (HR, TA, Finance, Ops, Sales, CS, Supply Chain, Manufacturing, University Relations, CI).
- 9 fixed questions per case; rubric scoring; model answer unlocked after submission.

### 15. MY PROGRESS (see §5)

### 16. REVISION CENTRE
- Today's due queue (spaced items).
- Error replay (questions you got wrong, re-asked in new wording).
- Module one-page summaries, key definitions, comparison tables, diagrams-in-words.
- Rapid revision (15 min) and Night Before Exam (60 min) playlists.

### 17. KNOWLEDGE GAPS
- Heat map: concepts × evidence type (concept check, practice, test, build, retention). Empty cells = gaps.
- "Repeated error patterns" list (e.g. "you confuse assistant vs agent 4 times").
- Unlocked-but-not-started list; prerequisites blocking progress.

### 18. EXPERT MODE
- Expertise roadmap L1–L10 with evidence checklist.
- "Beyond the IITM course" extensions per topic.
- Teach-back challenges, design critiques, architecture debates.

## 3. Concept page — tabs

| Tab | Contents (maps to the 20 required fields) |
|-----|-------------------------------------------|
| OVERVIEW | name, module, source tag, level switcher L1–L4, simple explanation, why it matters, memory aid, analogy |
| DEEP DIVE | detailed expert explanation, how it works, risks & limitations, when NOT to use, trade-offs (L4) |
| EXAMPLES | practical example, HR/TA example, general business example |
| BUSINESS USE | business relevance, tools where it applies, consulting angle |
| PRACTICE | hands-on exercise, opens in Practice Lab |
| QUIZ | 3–5 questions on this concept only |
| RELATED CONCEPTS | related, commonly confused (with a comparison table), Already learnt / Connects to / Next |
| EXAM NOTES | exam takeaway, key definition, common mistakes, likely question stems |
| EXPERT EXTENSION | allied / external concepts with source tags and links; "course view vs current practice" if they differ |

## 4. UI/UX specification

### Palette (four principal colours, plus white canvas)

| Token | Hex | Use |
|-------|-----|-----|
| `--navy` | `#18324A` | headings, primary buttons, nav rail, selected states |
| `--teal` | `#397A86` | accents, links, progress fills, focus ring |
| `--mist` | `#EEF3F5` | panels, card backgrounds on white, table stripes |
| `--charcoal` | `#303A43` | body text |
| `--white` | `#FFFFFF` | canvas |

Status is shown by **fill level and label**, not new colours: Not Started (outline),
Learning (25% teal tint), Practising (50%), Competent (teal solid), Mastered (navy
solid). Errors use charcoal text with a navy left border and an explicit word
("Incorrect"), so no red is needed. All text pairs meet WCAG AA contrast
(charcoal on white ≈ 11:1; white on navy ≈ 12:1; teal on white ≈ 4.9:1 — use teal
for text only at ≥ 16px or bold).

**Dark mode:** navy becomes the canvas, mist becomes text, teal stays as accent.

### Typography & layout
- One sans-serif family (e.g. Inter or IBM Plex Sans), 16px base, 1.5 line height; monospace only for prompts and JSON.
- 12-column grid, max width 1200px; cards with 8px radius, 1px mist border, no shadows beyond a 1px hairline.
- Phone: single column, 16px gutters, nav becomes a bottom "Menu" sheet; tables scroll inside their card.

### Avoid
Gradients, 3D, decorative illustration, more than one icon per card, animated
confetti. Motion limited to 150ms state transitions; respects reduced-motion.

### Interaction patterns
- **Predict-before-reveal:** content blocks marked "Your turn" stay collapsed until you type an answer.
- **Hint ladder:** Hint 1 (direction) → Hint 2 (framework) → Hint 3 (partial answer) → Show answer. Each step costs mastery credit (see `06` §1).
- **Rubric chips:** each criterion shows score + one-line reason; click for detail.
- Keyboard: `/` search, `n` next, `h` hint, `Enter` submit.

## 5. Progress dashboard (MY PROGRESS)

| Metric | Definition | Display |
|--------|-----------|---------|
| Mastery % | Σ(concept mastery × exam weight) / Σ(exam weight); weights H=3, M=2, L=1 | big number + per-pillar bars |
| Exam Readiness % | 0.6 × rolling TEST accuracy (exam-weighted, last 60 days, recency-decayed) + 0.25 × coverage (share of H concepts tested ≥ Competent) + 0.15 × last mock score | gauge with 70% (pass) and 80% (target) markers |
| Practical Skills % | 0.5 × mean lab rubric score + 0.5 × project ladder progress (levels passed / 8, partial credit per section) | bar |
| Concept Completion % | concepts ≥ Competent / total | bar |
| Quiz Accuracy | correct / attempted, last 30 days and all-time | number + 8-week trend |
| Project Progress | P1–P8 ladder with section completion | stepper |
| Weak Topics | 5 lowest mastery among unlocked concepts, plus repeated-error concepts | ranked list with "Revise" buttons |
| Recommended Next Action | single highest-priority item from the recommendation engine, with the reason in one line | button |

Topic-wise breakdown table (also shown after every quiz):

| Topic group | Concepts | Accuracy | Mastery | Trend | Priority |
|-------------|----------|----------|---------|-------|----------|
| Prompt Engineering | C03.* | 82% | 76 | ↑ | Low |
| Automation | C05.* | 65% | 58 | → | High |
| RAG | C11.* | 91% | 84 | ↑ | Low |
| Agents | C13.* | 72% | 66 | ↑ | Medium |
| Governance | C14.* | 60% | 52 | ↓ | Highest |

*(Illustrative values.)*
