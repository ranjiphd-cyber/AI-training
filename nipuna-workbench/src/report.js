/*
 * report.js — builds the editable Word report from a case using the `docx` library.
 * buildReport(docx, NWB, caseObj) and buildAnnex(docx, NWB, caseObj) return docx.Document objects.
 */
(function (root) {
  "use strict";

  const FONT = "Times New Roman";
  const BODY = 20; // 10 pt
  const SMALL = 18; // 9 pt (tables)
  const BLUE = "1F3864";
  const HEAD_FILL = "DCE3EE";
  const GROUP_FILL = "F1F4F8";

  function make(docx, N) {
    const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, BorderStyle, ExternalHyperlink, Footer, PageNumber, HeadingLevel } = docx;
    const border = { style: BorderStyle.SINGLE, size: 4, color: "8A94A6" };
    const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

    function runs(text, o) {
      o = o || {};
      const parts = String(text === undefined || text === null ? "" : text).split("\n");
      const out = [];
      parts.forEach((p, i) => {
        out.push(new TextRun({ text: p, bold: o.bold, italics: o.italics, size: o.size || BODY, font: FONT, color: o.color, break: i > 0 ? 1 : undefined }));
      });
      return out;
    }
    function P(text, o) {
      o = o || {};
      return new Paragraph({
        children: o.children || runs(text, o),
        alignment: o.align,
        spacing: { before: o.before || 0, after: o.after === undefined ? 80 : o.after, line: 252 },
        heading: o.heading,
        keepNext: o.keepNext,
        numbering: o.numbering,
        bullet: o.bullet ? { level: 0 } : undefined,
      });
    }
    function H1(text) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 } },
        children: [new TextRun({ text, bold: true, size: 24, font: FONT, color: BLUE })],
      });
    }
    function H2(text) {
      return new Paragraph({ keepNext: true, spacing: { before: 120, after: 60 }, children: [new TextRun({ text, bold: true, size: 21, font: FONT, color: BLUE })] });
    }
    function cell(content, o) {
      o = o || {};
      const children = Array.isArray(content) ? content : [new Paragraph({ children: content instanceof TextRun || content instanceof ExternalHyperlink ? [content] : runs(content, { size: SMALL, bold: o.bold, italics: o.italics }), alignment: o.align, spacing: { after: 0, line: 240 } })];
      return new TableCell({
        children,
        width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
        columnSpan: o.span,
        shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
      });
    }
    function table(widths, header, rows) {
      const trs = [];
      if (header)
        trs.push(new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, { bold: true, fill: HEAD_FILL, w: widths[i] })) }));
      rows.forEach((r) => {
        if (!Array.isArray(r) && r.group) trs.push(new TableRow({ cantSplit: true, children: [cell(r.group, { bold: true, fill: GROUP_FILL, span: widths.length, w: widths.reduce((a, b) => a + b, 0) })] }));
        else trs.push(new TableRow({ cantSplit: true, children: r.map((v, i) => (v instanceof TableCell ? v : cell(v, { w: widths[i], align: typeof v === "string" && /^(₹|-?₹|\d)/.test(v) && v.length < 18 ? AlignmentType.RIGHT : undefined }))) }));
      });
      return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, borders, rows: trs });
    }
    function link(text, url) {
      return new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: "Hyperlink", size: SMALL, font: FONT, color: "1F4E9A", underline: {} })] });
    }
    function cite(e) {
      if (!e) return "";
      const d = e.docName || e.doc;
      return (d ? d + ", " : "") + (e.loc || "");
    }
    function spacer() {
      return new Paragraph({ children: [], spacing: { after: 60 } });
    }
    function footer(label) {
      return new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: label + "  ·  Page ", size: 16, font: FONT, color: "555555" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: "555555" }),
              new TextRun({ text: " of ", size: 16, font: FONT, color: "555555" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: FONT, color: "555555" }),
            ],
          }),
        ],
      });
    }
    const page = { size: { width: 11906, height: 16838 }, margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } }; // A4
    const FULL = 9906;
    const styles = {
      default: { document: { run: { font: FONT, size: BODY } } },
      characterStyles: [{ id: "Hyperlink", name: "Hyperlink", run: { color: "1F4E9A", underline: {} } }],
    };
    return { P, H1, H2, cell, table, link, cite, spacer, footer, page, FULL, styles, runs, TextRun, Paragraph, AlignmentType };
  }

  function docName(c, id) {
    const d = (c.documents || []).find((x) => x.id === id);
    return d ? d.shortName || d.name : id;
  }

  function cites(c, list, max) {
    return (list || [])
      .slice(0, max || 3)
      .map((e) => docName(c, e.doc) + " " + e.loc + (e.verified === false ? " [unverified]" : ""))
      .join("; ");
  }

  // full=true lists every calculation (annex); otherwise only material results for the main report.
  function arithmeticRows(N, c, full) {
    const rows = [];
    const b = N.analyseBudget(c.budget);
    const f = N.analyseFunding(c.funding);
    b.issues.forEach((i) => rows.push([i.label, N.fmtINR(i.stated), i.type === "Line arithmetic" ? "Qty × unit × frequency" : "Sum of components", N.fmtINR(i.computed), "Arithmetic error: " + N.fmtINR(i.diff)]));
    if (c.budget && c.budget.lines && c.budget.lines.length && !b.issues.length) {
      const total = b.subtotals.length ? b.subtotals[b.subtotals.length - 1] : null;
      rows.push(["Itemised budget (" + c.budget.lines.length + " lines, " + b.subtotals.length + " totals)", total ? N.fmtINR(total.statedN) : "—", "Qty × unit × frequency; each total = sum of components", total ? N.fmtINR(total.computed) : "—", "Consistent"]);
    }
    const pctRows = f.sources.filter((s) => s.statedPct !== "" && s.statedPct !== undefined && s.statedPct !== null);
    const pctBad = pctRows.filter((s) => s.status !== "Consistent");
    if (full) pctRows.forEach((s) => rows.push([s.name + " share", s.statedPct + "% / " + N.fmtINR(s.amountN), "Amount ÷ total project cost", s.calcPct === null ? "—" : s.calcPct.toFixed(2) + "%", s.status]));
    else pctBad.forEach((s) => rows.push([s.name + " share", s.statedPct + "% / " + N.fmtINR(s.amountN), "Amount ÷ total project cost", s.calcPct === null ? "—" : s.calcPct.toFixed(2) + "%", s.status]));
    if (f.reconDiff !== null && f.reconDiff !== undefined) {
      const ok = Math.abs(f.reconDiff) <= 0.5;
      if (full || !ok || pctRows.length)
        rows.push(["Funding sources" + (pctRows.length && !pctBad.length && !full ? " and stated shares" : ""), N.fmtINR(f.total), "Sum of sources" + (pctRows.length && !full ? "; each share ÷ total" : ""), N.fmtINR(f.sourceSum), ok ? "Consistent" : "Gap " + N.fmtINR(f.reconDiff)]);
    }
    f.tranches.filter((t) => t.summary).forEach((t) => {
      const bad = t.diff !== null && Math.abs(t.diff) > 0.5;
      let basis = "";
      if (bad && f.total !== null) {
        const firsts = f.tranches.filter((x) => !x.summary && x.funder === t.funder && x.amountN !== null && x.statedPct);
        if (firsts.length && firsts.every((x) => Math.abs((f.total * x.statedPct) / 100 - x.amountN) <= 0.5)) basis = " Tranche percentages were applied to the total project cost, not to this funder's share.";
      }
      rows.push(["Release schedule — " + t.funder, N.fmtINR(t.sum) + " (sum of tranches)", "Σ tranches vs funder's stated contribution", N.fmtINR(t.commitment), bad ? "Discrepancy: exceeds share by " + N.fmtINR(t.diff) + "." + basis : "Consistent"]);
    });
    const pt = N.perTrainee(N.factNumber(c, "totalCost"), N.factNumber(c, "publicFunding"), N.factNumber(c, "trainees"));
    if (pt.total !== null) {
      const stated = N.factNumber(c, "statedCostPerTrainee");
      rows.push(["Cost per trainee (total / public)", stated === null ? "Not stated" : N.fmtINR(stated) + " (total)", "Total cost ÷ trainees; public funding ÷ trainees", N.fmtINR(pt.total) + " / " + (pt.public === null ? "—" : N.fmtINR(pt.public)), stated === null ? "Evaluator calculation" : Math.abs(stated - pt.total) <= 0.5 ? "Consistent; public share is an evaluator calculation" : "Differs by " + N.fmtINR(N.round2(stated - pt.total))]);
    }
    (c.checks || []).forEach((ch) => {
      const r = N.runCheck(ch);
      const material = r.verdict === "Arithmetic discrepancy" || r.verdict === "Contradictory statements" || r.verdict === "Cannot compute";
      if (!full && !material && !ch.showInReport) return;
      rows.push([ch.label, r.applicant === null ? "—" : N.fmtNum(r.applicant), ch.formula.replace(/\*/g, "×"), r.computed === null ? "Cannot compute" : N.fmtNum(r.computed), r.verdict + (r.discrepancy ? " (" + N.fmtNum(r.discrepancy) + ")" : "") + (r.error ? ": " + r.error : "")]);
    });
    N.factConflicts(c).forEach((fc) => {
      const seen = [];
      fc.values.forEach((v) => {
        const key = String(v.value).trim().toLowerCase();
        const loc = (v.cite && v.cite.loc) || "";
        const ex = seen.find((x) => x.key === key);
        if (ex) { if (loc && !ex.locs.includes(loc)) ex.locs.push(loc); } else seen.push({ key, value: v.value, locs: loc ? [loc] : [] });
      });
      rows.push([fc.label, seen.map((s) => s.value + (s.locs.length ? " (" + s.locs.join(", ") + ")" : "")).join(" vs "), "Cross-check of statements", "—", "Contradictory statements — both retained"]);
    });
    return rows;
  }

  // Blank template — used whenever no usable proposal document is on file (no scores, no outcome).
  function buildTemplate(docx, N, c) {
    const K = make(docx, N);
    const ch = [];
    ch.push(K.P("NIPUNA KARNATAKA — PROPOSAL EVALUATION", { bold: true, size: 30, align: K.AlignmentType.CENTER, after: 20, color: "1F3864" }));
    ch.push(K.P("Karnataka Digital Economy Mission (KDEM)", { size: 22, align: K.AlignmentType.CENTER, after: 40 }));
    ch.push(K.P("BLANK TEMPLATE — no proposal has been evaluated. This document contains no scores, findings or recommendation.", { bold: true, color: "9C2A00", align: K.AlignmentType.CENTER, after: 120 }));
    const blank = "[to be completed]";
    ch.push(K.table([2600, K.FULL - 2600], null, ["Proposal title", "Submitting organisation", "Date submitted", "Evaluator", "Evaluation date", "Policy basis"].map((l) => [K.cell(l, { bold: true, fill: "F1F4F8", w: 2600 }), l === "Evaluator" ? N.ADVISOR + ", Independent Advisor / Evaluator" : l === "Evaluation date" ? N.fmtDate(c.meta.evalDate) : l === "Policy basis" ? N.complianceBasisStatement(c) : blank])));
    ch.push(K.H1("Section A: Quantitative Scoring"));
    ch.push(K.table([3000, 1000, K.FULL - 4000], ["Criterion", "Score", "Rationale and evidence"], N.CRITERIA.map((cr, i) => [(i + 1) + ". " + cr.name, "—", blank]).concat([["Composite (sum of four scores ÷ 4)", "—", "Not computed"]])));
    ch.push(K.H1("Section B: Qualitative / Conditional Compliance Checklist"));
    ch.push(K.P("Policy basis: " + N.complianceBasisStatement(c), { bold: true }));
    ch.push(K.table([2400, 1000, 1150, 2900, K.FULL - 7450], ["Requirement", "Basis", "Status", "Proposal evidence", "Required action"], [[blank, "—", "—", "—", "—"]]));
    ch.push(K.H1("Independent Verification Notes (Web/Reputation Check)"));
    ch.push(K.P(N.NO_VERIFICATION));
    N.VERIFY_AREAS.forEach((a) => { ch.push(K.H2(a)); ch.push(K.P(blank, { italics: true })); });
    ch.push(K.H1("Section C: Shortlisting Recommendation and Sign-off"));
    ch.push(K.P("Advisory outcome: [not available — no proposal evaluated]", { bold: true }));
    ch.push(K.P(N.ADVISOR + " — Advisor / Evaluator", { before: 160, after: 20 }));
    ch.push(K.P("Evaluation date: " + N.fmtDate(c.meta.evalDate), { after: 20 }));
    ch.push(K.P("Document status: " + c.meta.status, { italics: true }));
    return new docx.Document({ creator: N.ADVISOR, title: "NIPUNA Karnataka — Proposal Evaluation (blank template)", styles: K.styles, sections: [{ properties: { page: K.page }, footers: { default: K.footer("Blank template") }, children: ch }] });
  }

  function buildReport(docx, N, c) {
    if (!c.synthetic && !N.hasUsableProposal(c)) return buildTemplate(docx, N, c);
    const K = make(docx, N);
    const comp = N.composite(c.scores, c.policy.compositeOverride);
    const ch = [];

    ch.push(K.P("NIPUNA KARNATAKA — PROPOSAL EVALUATION", { bold: true, size: 30, align: K.AlignmentType.CENTER, after: 20, color: "1F3864" }));
    ch.push(K.P("Karnataka Digital Economy Mission (KDEM)", { size: 22, align: K.AlignmentType.CENTER, after: 40 }));
    const O = N.reportOptions ? N.reportOptions(c) : {};
    ch.push(K.P("Independent advisory evaluation" + (O.statusLine ? " · Document status: " + c.meta.status : ""), { italics: true, size: 18, align: K.AlignmentType.CENTER, after: 120, color: "444444" }));
    if (c.synthetic) ch.push(K.P("SYNTHETIC DEMONSTRATION — NOT A REAL APPLICANT", { bold: true, color: "B00020", align: K.AlignmentType.CENTER }));

    const tc = N.factNumber(c, "totalCost"), pf = N.factNumber(c, "publicFunding"), tr = N.factNumber(c, "trainees");
    const pt = N.perTrainee(tc, pf, tr);
    const meta = [
      ["Proposal title", N.factDisplay(c, "title")],
      ["Submitting organisation", N.factDisplay(c, "legalEntity")],
      ["Programme and roles", N.factDisplay(c, "programmeType") + (N.factDisplay(c, "jobRoles") !== "Not stated" ? " — " + N.factDisplay(c, "jobRoles") : "")],
      ["Proposal stage / version", c.meta.stage + (N.factDisplay(c, "versionStage") !== "Not stated" ? " — " + N.factDisplay(c, "versionStage") : "")],
      ["Date submitted", N.factDisplay(c, "submissionDate")],
      ["Project cost and funding", "Total " + N.fmtINR(tc) + "; public funding requested " + N.fmtINR(pf) + (N.factDisplay(c, "otherFunding") !== "Not stated" ? "; other: " + N.factDisplay(c, "otherFunding") : "")],
      ["Trainees and unit cost", (tr === null ? N.factDisplay(c, "trainees") : N.fmtNum(tr)) + " trainees; " + (N.factDisplay(c, "statedCostPerTrainee") === "Not stated" ? "cost per trainee not stated by applicant" : "stated " + N.factDisplay(c, "statedCostPerTrainee") + " per trainee") + "; recalculated " + N.fmtINR(pt.total) + " total and " + N.fmtINR(pt.public) + " public per trainee"],
      ["Evaluator", N.ADVISOR],
      ["Evaluation date", N.fmtDate(c.meta.evalDate)],
      ["Policy basis", N.policyConfirmed(c) ? "Current approved policy supplied and confirmed" : N.PROVISIONAL_BANNER],
    ];
    ch.push(K.table([2600, K.FULL - 2600], null, meta.map(([a, b]) => [K.cell(a, { bold: true, fill: "F1F4F8", w: 2600 }), b])));

    // Section A
    ch.push(K.H1("Section A: Quantitative Scoring"));
    ch.push(K.P("Each criterion is scored from 1.00 to 5.00 against fixed anchors (1 = fundamental gap or almost no evidence; 3 = adequate with material clarifications required; 5 = comprehensive, consistent and well-substantiated). Scores rate programme design and evidence; they do not by themselves determine the recommendation.", { size: 18 }));
    const scoreRows = N.CRITERIA.map((cr, i) => {
      const e = c.scores[cr.id] || {};
      const s = N.effectiveScore(e);
      let rationale = (e.human && e.human.rationale) || (e.ai && e.ai.rationale) || "";
      const flags = [];
      if (e.notScored) flags.push("Not scored — insufficient evidence for a defensible score.");
      else if (e.ai && e.ai.insufficient) flags.push("Insufficient evidence — provisional score.");
      if (e.human && e.ai && e.ai.score !== null && Number(e.human.score) !== Number(e.ai.score)) flags.push("Advisor-adjusted from draft " + Number(e.ai.score).toFixed(2) + (e.human.reason ? ": " + e.human.reason : "") + ".");
      const src = cites(c, e.ai && e.ai.cites, 3);
      return [(i + 1) + ". " + cr.name, s === null ? "Not scored" : s.toFixed(2), [rationale, flags.join(" "), src ? "Sources: " + src : ""].filter(Boolean).join("\n")];
    });
    scoreRows.push([K.cell("Composite (sum of four scores ÷ 4)", { bold: true, fill: "F1F4F8", w: 3000 }), K.cell(comp.withheld ? "Withheld" : comp.value.toFixed(2) + " / 5", { bold: true, fill: "F1F4F8", w: 1000 }), K.cell(comp.withheld ? comp.display + ": " + comp.missing.join(", ") + ". A full composite is not shown while any criterion is unscored." : "Unweighted mean. Composite is one input to the recommendation, not an approval threshold.", { fill: "F1F4F8", w: K.FULL - 4000 })]);
    ch.push(K.table([3000, 1000, K.FULL - 4000], ["Criterion", "Score", "Rationale and evidence"], scoreRows));

    const ar = O.arithmetic ? arithmeticRows(N, c, false) : [];
    if (ar.length) {
      ch.push(K.H2(O.arithmetic ? "Arithmetic and consistency checks" : "Discrepancies and conflicting statements"));
      ch.push(K.P("Calculated by the workbench from figures stated in the proposal. No tax, calendar or utilisation assumptions were added. Amounts rounded to the nearest paisa.", { size: 17, italics: true }));
      ch.push(K.table([2300, 1700, 2500, 1500, K.FULL - 8000], ["Item", "Applicant figure", "Formula / basis", "Calculated", "Result"], ar));
    }

    // Section B
    ch.push(K.H1("Section B: Qualitative / Conditional Compliance Checklist"));
    ch.push(K.P("Policy basis: " + N.complianceBasisStatement(c), { bold: !N.policyConfirmed(c), size: 19 }));
    const rows = [];
    for (const cat of O.safeguards ? ["A", "B", "C"] : ["A", "B"]) {
      rows.push({ group: cat + ". " + N.COMPLIANCE_CATS[cat] + (cat === "B" ? (O.explanatoryNotes ? "s (from earlier review practice; not current rules until confirmed by KDEM)" : "s") : "s") });
      const items = (c.compliance || []).filter((r) => r.category === cat);
      if (!items.length) rows.push([cat === "A" ? "No current approved policy requirement can be listed: no confirmed policy pack is on file." : "None recorded.", "—", "—", "—", "—"]);
      items.forEach((r) => rows.push([r.requirement + (r.clause ? " (" + r.clause + ")" : ""), cat === "A" ? "Policy" : cat === "B" ? "Benchmark" : "Safeguard", r.status, r.evidence, r.action]));
    }
    ch.push(K.table([2400, 1000, 1150, 2900, K.FULL - 7450], ["Requirement", "Basis", "Status", "Proposal evidence", "Required action"], rows));

    const weak = (c.findings || []).filter((f) => f.kind !== "strength" && f.status !== "Closed");
    const cond = weak.filter((f) => f.actionStage === "Before shortlisting/approval" || f.actionStage === "Before disbursement");
    cond.sort((a, b) => N.ACTION_STAGES.indexOf(a.actionStage) - N.ACTION_STAGES.indexOf(b.actionStage) || N.SEVERITIES.indexOf(a.severity) - N.SEVERITIES.indexOf(b.severity));
    if (cond.length) {
      ch.push(K.H2("Priority corrections and conditions"));
      ch.push(
        K.table(
          [380, 3600, 4126, K.FULL - 8106],
          ["#", "Finding and evidence", "Required submission / correction", "Responsible · stage"],
          cond.map((f, i) => [String(i + 1), f.title + " [" + f.severity + (f.basis && f.basis !== "Advisory safeguard" ? "; " + f.basis : "") + "]" + (f.evidence && f.evidence.length ? " — " + cites(c, f.evidence, 2) : ""), f.action + (f.closureEvidence ? "\nClosure evidence: " + f.closureEvidence : ""), f.party + " · " + (f.actionStage === "Before shortlisting/approval" ? "before shortlisting" : "before disbursement")])
        )
      );
    }
    const missing = weak.filter((f) => f.actionStage === "Missing information");
    if (missing.length) {
      ch.push(K.H2("Missing information (to be supplied by the applicant)"));
      missing.forEach((f, i) => ch.push(K.P((i + 1) + ". " + f.title + (f.action ? " — " + f.action : ""), { size: 19, after: 30 })));
    }
    const safe = weak.filter((f) => f.actionStage === "Implementation safeguard");
    if (safe.length) {
      ch.push(K.H2("Non-blocking improvements and implementation safeguards"));
      safe.forEach((f, i) => ch.push(K.P((i + 1) + ". " + f.title + (f.action ? " — " + f.action : ""), { size: 19, after: 30 })));
    }

    // Verification
    ch.push(K.H1("Independent Verification Notes (Web/Reputation Check)"));
    const ver = c.verification || [];
    if (!ver.length) {
      ch.push(K.P(N.NO_VERIFICATION, { bold: true }));
      ch.push(K.P("Checks required before a funding decision:", { size: 19 }));
      (c.verificationChecklist || []).forEach((v, i) => ch.push(K.P((i + 1) + ". [" + v.area + "] " + v.claim + (v.howToCheck ? " — " + v.howToCheck : ""), { size: 19, after: 30 })));
    } else {
      ch.push(K.P("Each note states the claim checked, the result, the source and its type, and the limitations. Search-result summaries and applicant-controlled sources are not treated as independent confirmation. Absence of public information is not treated as an adverse finding.", { size: 17, italics: true }));
      for (const area of N.VERIFY_AREAS) {
        const recs = ver.filter((v) => v.area === area);
        if (!O.allVerificationAreas && !/Entity|Track/.test(area)) continue;
        ch.push(K.H2(area));
        if (!recs.length) {
          ch.push(K.P("Not checked. " + ((c.verificationChecklist || []).filter((v) => v.area === area).map((v) => v.claim).join("; ") || ""), { size: 19, italics: true }));
          continue;
        }
        recs.forEach((v) => {
          const kids = K.runs("Claim checked: ", { bold: true, size: 19 })
            .concat(K.runs(v.claim + " ", { size: 19 }))
            .concat(K.runs("Result: ", { bold: true, size: 19 }))
            .concat(K.runs(v.result + " ", { size: 19 }))
            .concat(K.runs("Source: ", { bold: true, size: 19 }));
          if (v.url && /^https?:\/\//.test(v.url)) kids.push(K.link(v.sourceName || v.url, v.url));
          else kids.push(...K.runs(v.sourceName || "Supplied document", { size: 19 }));
          kids.push(...K.runs(" (" + v.sourceType + "; accessed " + N.fmtDate(v.date) + (O.verificationDetail ? "; " + v.enteredBy : "") + "). ", { size: 19 }));
          if (v.limitations && O.verificationDetail) kids.push(...K.runs("Limitations: " + v.limitations, { size: 19, italics: true }));
          ch.push(K.P("", { children: kids, after: 70 }));
        });
      }
    }

    // Section C
    ch.push(K.H1("Section C: Shortlisting Recommendation and Sign-off"));
    const d = c.decision || {};
    ch.push(K.P("", { children: K.runs("Advisory outcome: ", { bold: true }).concat(K.runs(d.outcome ? d.outcome.toUpperCase() : "NOT YET SELECTED", { bold: true, color: "1F3864" })) }));
    if (d.merit) ch.push(K.P("", { children: K.runs("Programme merit: ", { bold: true }).concat(K.runs(d.merit)) }));
    if (d.readinessNote) ch.push(K.P("", { children: K.runs("Current readiness: ", { bold: true }).concat(K.runs(d.readinessNote)) }));
    const rd = N.readiness(c);
    if (O.readinessWarning) rd.warnings.forEach((w) => ch.push(K.P(w, { bold: true, color: "9C2A00", size: 19 })));
    if (d.rationale) ch.push(K.P(d.rationale));
    const concernLines = String(d.concerns || "").split("\n").map((x) => x.trim()).filter(Boolean);
    if (concernLines.length) {
      ch.push(K.P("Areas of concern and points for the decision-maker:", { bold: true, after: 30 }));
      const main = concernLines.filter((x) => !/^\[(Minor|Observation)/.test(x));
      const rest = concernLines.length - main.length;
      main.slice(0, 12).forEach((x, i) => {
        const m = /^\[([^\]]+)\]\s*(.*)$/.exec(x);
        const kids = m ? K.runs((i + 1) + ". " + m[1].replace(", blocking", " (blocking)") + ": ", { bold: true, size: 18 }).concat(K.runs(m[2].split(" — ")[0].replace(/\.?$/, "."), { size: 18 })) : K.runs((i + 1) + ". " + x, { size: 18 });
        ch.push(K.P("", { children: kids, after: 25 }));
      });
      if (O.explanatoryNotes && (rest || main.length > 12)) ch.push(K.P((rest + Math.max(0, main.length - 12)) + " further minor point(s) and observations are listed in the internal annex.", { italics: true, size: 17 }));
    }
    if (d.principalConditions) {
      ch.push(K.P("Principal conditions:", { bold: true, after: 30 }));
      d.principalConditions.split("\n").filter((x) => x.trim()).forEach((x, i) => ch.push(K.P((i + 1) + ". " + x.replace(/^\s*\d+[.)]\s*/, ""), { after: 30, size: 19 })));
    }
    if (O.authority) ch.push(K.P("Decision authority: This is an independent advisory evaluation prepared for KDEM under the NIPUNA Karnataka initiative. It is not an approval, sanction or funding commitment by the Government of Karnataka or KDEM. The final decision rests with the competent authority, which may weigh considerations outside this review.", { italics: true, size: 18, before: 80 }));
    ch.push(K.P("Sign-off", { bold: true, before: 160, after: 20 }));
    ch.push(K.P(N.ADVISOR + " — Advisor / Evaluator", { after: 20 }));
    ch.push(K.P("Evaluation date: " + N.fmtDate(c.meta.evalDate), { after: 20 }));
    if (O.statusLine) ch.push(K.P("Document status: " + c.meta.status, { italics: true, after: 20 }));

    return new docx.Document({
      creator: N.ADVISOR,
      title: "NIPUNA Karnataka — Proposal Evaluation",
      description: "Advisory evaluation draft generated by the NIPUNA Karnataka Independent Proposal Review Workbench",
      styles: K.styles,
      sections: [{ properties: { page: K.page }, footers: { default: K.footer("NIPUNA Karnataka — Proposal Evaluation · Confidential advisory draft") }, children: ch }],
    });
  }

  function buildAnnex(docx, N, c) {
    const K = make(docx, N);
    const ch = [];
    ch.push(K.P("Evidence & verification notes", { bold: true, size: 28, color: "1F3864", after: 20 }));
    ch.push(K.P("Internal annex to the NIPUNA Karnataka proposal evaluation — " + N.factDisplay(c, "title") + ". Not for circulation to the applicant. Evaluation date " + N.fmtDate(c.meta.evalDate) + ".", { italics: true, size: 18 }));

    ch.push(K.H1("1. Source documents"));
    ch.push(K.table([2600, 1800, 1300, 1100, K.FULL - 6800], ["Document", "Role", "Version / date", "Extraction", "Warnings"],
      (c.documents || []).map((d) => [d.name, d.role, d.version || "—", d.extraction ? d.extraction.status + " (" + N.fmtNum(d.extraction.chars) + " chars)" : "—", ((d.extraction && d.extraction.warnings) || []).concat((d.injection || []).map((h) => "Embedded instruction at " + h.loc + " — treated as data")).join(" ") || "None"])));

    ch.push(K.H1("2. Extracted facts with citations"));
    const fr = [];
    N.FACT_FIELDS.forEach(([k, l]) => {
      const f = c.facts[k] || { values: [] };
      if (!f.values.length) fr.push([l, "Not stated", "—", f.note || ""]);
      f.values.forEach((v, i) => fr.push([i ? "" : l, String(v.value), (v.cite ? docName(c, v.cite.doc) + " " + v.cite.loc + (v.cite.verified === false ? " [excerpt not found]" : "") : "—"), (v.cite && v.cite.excerpt ? "“" + N.trunc(v.cite.excerpt, 160) + "”" : "") + (i === 0 && f.note ? " " + f.note : "")]));
    });
    (c.factsExtra || []).forEach((x) => x.values.forEach((v, i) => fr.push([i ? "" : x.label, String(v.value), v.cite ? docName(c, v.cite.doc) + " " + v.cite.loc : "—", v.cite && v.cite.excerpt ? "“" + N.trunc(v.cite.excerpt, 160) + "”" : ""])));
    ch.push(K.table([2300, 2300, 1500, K.FULL - 6100], ["Field", "Value", "Location", "Excerpt / note"], fr));

    const b = N.analyseBudget(c.budget);
    if (b.lines.length) {
      ch.push(K.H1("3. Budget recomputation"));
      const br = b.lines.map((l) => [l.label, String(l.qty), N.fmtNum(N.parseINR(l.unit)), String(l.freq || 1), N.fmtNum(l.statedN), N.fmtNum(l.computed), l.status]);
      b.subtotals.forEach((s) => br.push([K.cell(s.label, { bold: true, fill: "F1F4F8", w: 3000 }), "", "", "", N.fmtNum(s.statedN), N.fmtNum(s.computed), s.status]));
      ch.push(K.table([3000, 700, 1100, 700, 1350, 1350, K.FULL - 8200], ["Line", "Qty", "Unit (₹)", "Freq.", "Stated (₹)", "Computed (₹)", "Result"], br));
    }

    const allCalc = arithmeticRows(N, c, true);
    if (allCalc.length) {
      ch.push(K.H2("All calculations (applicant figure → formula → result)"));
      ch.push(K.table([2300, 1700, 2500, 1500, K.FULL - 8000], ["Item", "Applicant figure", "Formula / basis", "Calculated", "Result"], allCalc));
    }
    ch.push(K.H1("4. Findings register"));
    ch.push(K.table([400, 2700, 1300, 900, 3000, K.FULL - 8300], ["#", "Finding", "Evidence label", "Severity · status", "Evidence (location and excerpt)", "Origin"],
      (c.findings || []).map((f, i) => [String(i + 1), (f.kind === "strength" ? "[Strength] " : "") + f.title + ". " + f.detail, f.label, f.severity + " · " + f.status, (f.evidence || []).map((e) => docName(c, e.doc) + " " + e.loc + (e.verified === false ? " [excerpt not found]" : "") + ": “" + N.trunc(e.excerpt, 140) + "”").join("\n") || (f.verificationId ? "Verification record " + f.verificationId : "—"), f.origin === "ai" ? "AI draft" : f.origin === "rule" ? "Rule-based draft" : f.origin === "session" ? "Claude session draft" : f.origin === "prior" ? "Earlier review" : "Advisor"])));

    ch.push(K.H1("5. Verification records"));
    if (!(c.verification || []).length) ch.push(K.P(N.NO_VERIFICATION));
    (c.verification || []).forEach((v, i) => {
      const kids = K.runs((i + 1) + ". [" + v.area + "] " + v.claim + " — Result: " + v.result + ". Source: ", { size: 18 });
      if (v.url && /^https?:\/\//.test(v.url)) kids.push(K.link(v.url, v.url));
      else kids.push(...K.runs(v.sourceName || "—", { size: 18 }));
      kids.push(...K.runs(" · " + v.sourceType + " · " + N.fmtDate(v.date) + " · " + v.enteredBy + (v.excerpt ? " · Excerpt: “" + v.excerpt + "”" : "") + (v.limitations ? " · Limitations: " + v.limitations : ""), { size: 18 }));
      ch.push(K.P("", { children: kids, after: 60 }));
    });

    const allConcerns = String((c.decision || {}).concerns || "").split("\n").map((x) => x.trim()).filter(Boolean);
    if (allConcerns.length) {
      ch.push(K.H1("5a. Areas of concern (full list)"));
      allConcerns.forEach((x, i) => ch.push(K.P((i + 1) + ". " + x, { size: 18, after: 30 })));
    }
    ch.push(K.H1("6. Score history"));
    ch.push(K.table([3000, 1200, 1200, K.FULL - 5400], ["Criterion", "AI draft", "Advisor", "Reason for change"],
      N.CRITERIA.map((cr) => {
        const e = c.scores[cr.id] || {};
        return [cr.name, e.ai && e.ai.score !== null && e.ai.score !== undefined ? Number(e.ai.score).toFixed(2) : "—", e.human ? Number(e.human.score).toFixed(2) : e.notScored ? "Not scored" : "—", (e.human && e.human.reason) || ""];
      })));

    ch.push(K.H1("7. Audit trail"));
    ch.push(K.table([2100, 2200, 2000, K.FULL - 6300], ["When (UTC)", "Actor", "Action", "Detail"], (c.audit || []).slice(-60).map((a) => [a.at.replace("T", " ").slice(0, 16), a.actor, a.action, N.trunc(a.detail, 220)])));

    return new docx.Document({
      creator: N.ADVISOR,
      title: "Evidence & verification notes",
      styles: K.styles,
      sections: [{ properties: { page: K.page }, footers: { default: K.footer("Internal annex — Evidence & verification notes") }, children: ch }],
    });
  }

  const api = { buildReport, buildAnnex, arithmeticRows };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NWBReport = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
