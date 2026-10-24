# 09 — Implementation Plan

Principle from the brief: **validate the logic before writing code.** Each phase
ends in a gate; the next phase starts only when the gate passes.

Programme timing (IITM-B): started 23 Sep 2026, 4 months → finishes around late
January 2027. The plan front-loads exam-relevant pieces so they're useful
before the exams, and builds labs in the order the modules are taught.

## Phase 0 — Architecture review (this document set) — *now*

Deliverables: `00`–`08`.

**Internal-consistency checks (completed for v0.1):**

| Check | Result |
|-------|--------|
| Every concept ID used in `02`–`08` exists in `01` | Pass |
| Status thresholds (70 Competent / 85 Mastered) identical in `02`, `03`, `06` | Pass (`06` is the source of truth) |
| Every lab in `05` maps to a rubric in `08` | Pass (Dashboard & CI labs use R2 + R8; Multi-source uses R3) |
| Every project level P1–P8 maps to a competency level in `02` §6 | Pass |
| 20 concept fields in brief ↔ schema in `04` §3 ↔ tabs in `03` §3 | Pass |
| 16 question types A–P ↔ schema ↔ rubric for open types | Pass |
| No IITM content invented beyond brochure + learner list | Pass — gaps marked |

**Gate 0 — your review.** Decisions needed from you:
1. Upload class decks to close IITM-L gaps (see `00` §5)?
2. Exam format, if known (MCQ only, mixed, scenario-based)?
3. Where should the board run — plain browser file (private, offline), or a hosted page with AI tutor?
4. Which module is the programme on right now (so content authoring starts there)?

## Phase 1 — Course-material ingestion (≈ 1 week after decks arrive)

- Extract text from decks into `course-material/`; map each slide to concept IDs.
- Upgrade IITM-L → IITM-D where confirmed; add any concepts the decks contain that the map lacks; fill week numbers.
- Record every "course view vs current practice" difference found.

**Gate 1:** course map re-validated; no concept without a source tag; diff report reviewed by you.

## Phase 2 — Content authoring, exam-first (2–3 weeks, rolling)

Order: modules already taught → current module → upcoming modules.

| Asset | Target for v1 |
|-------|---------------|
| Concept records (all 20 fields, L1–L4) | 76 concepts (all of `01`) |
| Question bank | ~380 items: ~5 per concept, all types A–P represented, 4 difficulty levels |
| Exercises | 2 per lab (20) |
| Case studies | 10 (one per function listed in the brief) |
| Revision assets | 15 module one-pagers, key definitions list, 8 comparison tables, Night-before pack |

Quality rules: every question has per-option feedback, misconception tags and a
variant; every concept has an HR/TA example and a non-HR example; every allied
card has bridge sentence + citation + date.

**Gate 2:** a review sample of 10% of items checked against rubric and source rules; error rate < 5%.

## Phase 3 — Logic validation without UI (≈ 3 days)

- Run the mastery and revision formulas in a spreadsheet (or a small script) against three simulated learners: *strong-but-forgetful*, *weak-on-governance*, *steady*.
- Confirm: status changes happen when expected; revision priority surfaces the right concepts; mastered concepts recede; exam readiness doesn't exceed 80% without a mock exam.

**Gate 3:** simulated outputs match expectations in `06`; thresholds tuned if not.

## Phase 4 — Prototype v1: study & test core (≈ 2 weeks)

Single HTML file, no install (same pattern as `../hrm-decision-lab/`), content
loaded from JSON, progress saved in the browser with export/import of a progress file.

Pages: Home · Course Map · Learn (concept pages, all tabs) · Quiz & Exam (all
quiz sizes, Exam Mode) · Revision Centre · My Progress · Knowledge Gaps.
Auto-graded types A–D, I, K-choice; open types use self-scoring against the
model answer and rubric until Phase 6.

**Gate 4:** you complete one full module journey; usability notes captured;
phone and desktop both work.

## Phase 5 — Labs without live AI (≈ 2–3 weeks)

Practice Lab 22-step flow, Prompt / Automation (+ Dashboard, CI) / RAG (+
Multi-source) / Assistant / Agent / Multi-agent / Governance labs, Build canvas
with 28 sections, Case Studies. Feedback here is checklist-based (expected
elements present/absent) plus a **"copy for tutor"** button that packages your
answer, the rubric and the tutor instruction for pasting into Claude.

**Gate 5:** P1–P3 completable end to end; checklist feedback catches the gaps listed in `05`.

## Phase 6 — AI tutor integration (≈ 2 weeks)

- Tutor instruction from `06` §3.6 + rubric + concept record sent as context; structured JSON response updates mastery.
- Options: (a) Claude Project holding the docs and content files — zero code, manual progress update; (b) hosted page calling the Claude API through a small backend that keeps the API key off the page.
- Guardrails: no candidate or employee personal data in practice inputs; rubric-bound scoring; tutor must label sources.

**Gate 6:** tutor scoring agrees with your own/reference scoring on 20 sample answers within ±1 point per criterion on 80% of criteria.

## Phase 7 — Allied-learning engine & Expert Mode (≈ 1–2 weeks)

Allied cards with citations and review dates; volatility flags; conflict cards;
teach-back challenges; competency roadmap L1–L10 with evidence checklist.

**Gate 7:** every allied card passes the four rules in `06` §4.3.

## Phase 8 — Capstone & consulting kit (aligned with Module 15)

P8 canvas tuned to the IITM capstone brief (once available); export of project
packs as portfolio pieces and client-proposal drafts.

## Start practising today (before any code)

1. Create a Claude Project (or similar) named "IITM GenAI Tutor".
2. Add these docs as project knowledge; paste the tutor instruction from `06` §3.6 as project instructions.
3. Each session, say: *"Run Journey A, step A2, for me"* or *"Practice Lab: Automate candidate follow-up."*
4. Keep a simple progress sheet: concept ID, date, activity, score — the same fields the board will import later.
