# GenAI & Agentic AI Mastery Practice Board

**Status: Architecture phase (v0.1). No dashboard code yet — by design.**

This folder holds the design for a personal practice board that supports the
*IIT Madras Pravartak Executive Programme in Generative AI and Agentic AI Tools
for Business*. It is built for a senior Talent Acquisition (TA) leader who is
also starting a process-improvement consulting practice.

Guiding principle:

> I should not merely know what GenAI and Agentic AI are. I should progressively
> become capable of designing, testing, explaining, governing and building useful
> AI systems independently.

## Read in this order

| # | Document | Covers brief items |
|---|----------|--------------------|
| 0 | [`docs/00-source-register.md`](docs/00-source-register.md) | What was uploaded, what is missing, source labels |
| 1 | [`docs/01-course-knowledge-map.md`](docs/01-course-knowledge-map.md) | 1 — Course knowledge map (15 modules) |
| 2 | [`docs/02-learning-architecture.md`](docs/02-learning-architecture.md) | 2 — Learn → Practise → Test → Build → Review → Master loop; teaching cycle; expertise roadmap (L1–L10) |
| 3 | [`docs/03-information-architecture-and-ux.md`](docs/03-information-architecture-and-ux.md) | 3, 12, 13 — every page, card, drill-down; UI/UX spec; progress dashboard |
| 4 | [`docs/04-data-model.md`](docs/04-data-model.md) | 4, 5 — concept schema, question bank architecture, tagging |
| 5 | [`docs/05-practice-and-project-labs.md`](docs/05-practice-and-project-labs.md) | 6, 7 — 10 labs, 22-step practice flow, 8-level project ladder |
| 6 | [`docs/06-engines-and-tutor.md`](docs/06-engines-and-tutor.md) | 8, 9, 10, 11 — mastery engine, revision engine, AI tutor rules, allied-learning engine |
| 7 | [`docs/07-sample-journeys.md`](docs/07-sample-journeys.md) | 14, 15 — three full journeys + "recruitment efficiency" walkthrough |
| 8 | [`docs/08-rubrics.md`](docs/08-rubrics.md) | 16 — eight assessment rubrics |
| 9 | [`docs/09-implementation-plan.md`](docs/09-implementation-plan.md) | 17 — phased build plan with validation gates |

## The one thing to know first

Only **brochures** were uploaded (IITM Pravartak, plus IIM Ahmedabad, IIM Ranchi,
IIM Trichy and an MIT cover image). **No IITM class decks, presentations or
screenshots were attached.** So:

- Module titles and bullet points come straight from the IITM brochure.
- Frameworks you named in your brief (COSTAR, Trigger → Data → Decision →
  Integration → AI Step → Output, Goal → KPI → Threshold → Decision → Action, etc.)
  are recorded as **IITM concepts reported by you**. Their exact course wording,
  examples and week placement are marked *"Course material not currently
  available"* until you upload the decks.
- Week numbers are **not** stated in the brochure, so the map uses module numbers
  only. Nothing has been invented to fill the gaps.

See `docs/00-source-register.md` for the full list and how to add the decks.

## Related work in this repo

`../hrm-decision-lab/` is an earlier single-file HR practice dashboard. Its
pattern (single HTML file, no build, local progress) is the starting point for
the Phase 4 prototype in `docs/09-implementation-plan.md`.
