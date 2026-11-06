# Volvo Group India TA MIS: design specification

An interactive, single-file design specification for the Talent Acquisition Management Information System. Open `index.html` in a browser.

**This file holds no Volvo data.** Every KPI, chart and table is a labelled placeholder that shows its date basis, counting entity, denominator and display state.

## What it contains

- **Dashboards:** Executive Overview, Business Performance, Recruitment Lifecycle, Efficiency & Ageing, Diversity & Sourcing, NATS & Campus, Management Attention and Administration, each laid out with a shared filter bar.
- **Governance and delivery:** workbook audit status, a proposed KPI catalogue, the access matrix and security design, technology options, the design system and the delivery register.

## Data view

`data-view.js` renders figures only when a restricted build injects a de-identified dataset (`window.TAMIS_DATA`). It holds code, not data. The published `index.html` never loads it, so it shows placeholders only.

## Confidentiality

This repository is public. Source workbooks, exports and any build that contains workbook findings must never be committed here. `.gitignore` blocks `*.xlsx`, `*.csv` and `*restricted*.html`. The workbook audit lives in a separate restricted copy, kept outside the repository.

## Status

Design concept, with a restricted data prototype built outside this repository. Figures in that prototype are provisional: counting rules are approved, but the data is not yet validated. Nothing is production-ready.
