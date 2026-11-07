// Acceptance tests — run with: node tests/acceptance.test.js
// Uses synthetic fixtures only (no applicant data). Writes tests/RESULTS.md.
const fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const docx = require("docx");
const mammoth = require("mammoth");
const N = require("../src/engine.js");
const R = require("../src/report.js");
const { extract } = require("./extract-pdf.js");

const results = [];
async function test(id, name, fn) {
  try {
    const note = await fn();
    results.push({ id, name, ok: true, note: note || "" });
  } catch (e) {
    results.push({ id, name, ok: false, note: e.message });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function docText(document) {
  const buf = await docx.Packer.toBuffer(document);
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return { buf, text: value };
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "nwb-"));
// Synthetic fixtures only. A reference report can be supplied via REFERENCE_DOCX; otherwise a synthetic one is built.
const REFERENCE = process.env.REFERENCE_DOCX || "";

(async () => {
  await test(1, "No proposal → no completed evaluation", async () => {
    const c = N.newCase("Empty");
    assert(!N.hasUsableProposal(c), "empty case reported as usable");
    assert(N.composite(c.scores).withheld, "composite not withheld");
    const { text } = await docText(R.buildReport(docx, N, c));
    assert(text.includes("BLANK TEMPLATE"), "report is not the blank template");
    assert(!/Advisory outcome: (RECOMMEND|CONDITIONALLY|RETURN|DO NOT|DEFER)/i.test(text), "template contains an outcome");
    // a reference report alone is not a proposal
    c.documents.push({ id: "R", name: "ref.docx", role: "Reference report (format only)", kind: "docx", units: [{ loc: "¶1", text: "x".repeat(500) }], extraction: { status: "ok", chars: 500, warnings: [] } });
    assert(!N.hasUsableProposal(c), "reference report treated as a proposal");
    return "Blank template exported; reference-only case still blocked.";
  });

  await test(2, "No current policy → provisional compliance label", async () => {
    const c = N.makeSyntheticDemo();
    assert(N.complianceBasisStatement(c) === N.PROVISIONAL_BANNER, "banner mismatch");
    const { text } = await docText(R.buildReport(docx, N, c));
    assert(text.includes(N.PROVISIONAL_BANNER), "report lacks banner");
    c.meta.policySupplied = "Yes";
    assert(!N.policyConfirmed(c) && N.complianceBasisStatement(c).startsWith(N.PROVISIONAL_BANNER), "'Yes' without document+confirmation should stay provisional");
    c.documents.push({ id: "P", name: "policy.pdf", role: "Current approved policy", units: [], extraction: { status: "ok" } });
    c.policy.confirmations.push({ name: "Test Officer", role: "Synthetic", date: "2026-11-07", scope: "test" });
    assert(N.policyConfirmed(c), "confirmed policy not recognised");
    return "Provisional until a policy document AND an officer confirmation are recorded.";
  });

  await test(3, "No browsing → no invented web results", async () => {
    const c = N.makeSyntheticDemo();
    N.applyAnalysisResult(c, { findings: [], scores: {}, compliance: [], outcome: "", verificationChecklist: [{ area: "Entity and Registration", claim: "Check registration", howToCheck: "MCA" }] }, "t3");
    assert(c.verification.length === 0, "analysis created verification records");
    const { text } = await docText(R.buildReport(docx, N, c));
    assert(text.includes("Independent verification not performed."), "missing 'not performed' statement");
    assert(text.includes("Check registration"), "checklist not shown");
    assert(N.buildAnalysisPrompt(c).prompt.includes("You cannot browse"), "prompt lacks no-browsing rule");
    return "AI output can only add a checklist; report states verification not performed.";
  });

  await test(4, "Scores 4, 3, 4, 2 → composite 3.25", async () => {
    const c = N.newCase("t4");
    [4, 3, 4, 2].forEach((s, i) => (c.scores["c" + (i + 1)].ai = { score: s, rationale: "", cites: [] }));
    const comp = N.composite(c.scores);
    assert(comp.value === 3.25 && comp.display === "3.25 / 5.00", "got " + comp.display);
    return comp.display;
  });

  await test(5, "One criterion unscored → full composite withheld", async () => {
    const c = N.makeSyntheticDemo();
    [4, 3, 4, 2].forEach((s, i) => (c.scores["c" + (i + 1)].ai = { score: s, rationale: "", cites: [] }));
    c.scores.c3.notScored = true;
    const comp = N.composite(c.scores);
    assert(comp.withheld && comp.value === null, "composite shown");
    const { text } = await docText(R.buildReport(docx, N, c));
    assert(text.includes("Withheld") && !text.includes("3.25"), "report shows composite: " + JSON.stringify(text.slice(Math.max(0, text.indexOf("3.25") - 120), text.indexOf("3.25") + 20)));
    return comp.display;
  });

  await test(6, "₹1,20,00,000 stated subtotal vs ₹1,50,00,000 item sum → ₹30,00,000 discrepancy", async () => {
    const c = N.makeSyntheticDemo();
    const b = N.analyseBudget(c.budget);
    const s = b.subtotals[0];
    assert(s.computed === 15000000 && s.statedN === 12000000, "sums wrong");
    assert(s.diff === -3000000 && N.fmtINR(Math.abs(s.diff)) === "₹30,00,000", "diff " + s.diff);
    assert(s.status === "Arithmetic discrepancy", s.status);
    return "Stated " + N.fmtINR(s.statedN) + " vs computed " + N.fmtINR(s.computed) + " → " + N.fmtINR(Math.abs(s.diff));
  });

  await test(7, "13 × 2 × 50 → exactly 1,300", async () => {
    const r = N.runCheck({ kind: "consistency", applicant: "1000", formula: "13 × 2 × 50", inputs: {} });
    assert(r.computed === 1300, "computed " + r.computed);
    assert(r.discrepancy === -300 && r.verdict === "Contradictory statements", r.verdict);
    return "1,300 vs applicant 1,000 → contradictory statements (−300)";
  });

  await test(8, "Conflicting durations → both retained with citations", async () => {
    const c = N.makeSyntheticDemo();
    const fc = N.factConflicts(c).find((x) => x.key === "trainingDuration");
    assert(fc && fc.values.length === 2, "conflict not detected");
    assert(fc.values.every((v) => v.cite && v.cite.verified), "citations not verified");
    assert(N.factDisplay(c, "trainingDuration").includes("6 months") && N.factDisplay(c, "trainingDuration").includes("8 months"), "display drops a value");
    c.meta.reportOptions = { arithmetic: true };
    const { text } = await docText(R.buildReport(docx, N, c));
    const annex = (await docText(R.buildAnnex(docx, N, c))).text;
    assert(/6 months/.test(annex) && /8 months/.test(annex), "annex does not retain both values");
    assert(/6 months \(p\.2\) vs 8 months \(p\.4\)/.test(text), "report does not retain both with locations: " + JSON.stringify(text.slice(text.indexOf("months") - 60, text.indexOf("months") + 80)));
    return "6 months (p.2) vs 8 months (p.4) retained";
  });

  await test(9, "High composite + unresolved funding → readiness warning", async () => {
    const c = N.makeSyntheticDemo();
    [4.5, 4.5, 4.5, 4.5].forEach((s, i) => (c.scores["c" + (i + 1)].ai = { score: s, rationale: "", cites: [] }));
    c.findings.push({ id: "fund", kind: "weakness", title: "Co-funding not committed", severity: "Critical", status: "Open", actionStage: "Before shortlisting/approval", label: "Missing/unverifiable evidence", evidence: [] });
    c.decision.outcome = "Recommend for approval";
    const r = N.readiness(c);
    assert(r.blocked, "not blocked");
    assert(r.warnings.some((w) => w.includes("Readiness warning") && w.includes("4.50")), "no merit/readiness warning");
    assert(r.warnings.some((w) => w.startsWith("Outcome conflict")), "no outcome conflict");
    return r.warnings.length + " warnings";
  });

  await test(10, "Reference date differs from today → actual case date used", async () => {
    const now = new Date();
    const c = N.newCase("t10", now);
    assert(c.meta.evalDate === N.todayISO(now), "evalDate not today");
    let raw;
    if (REFERENCE) raw = await mammoth.extractRawText({ path: REFERENCE });
    else {
      const ref = new docx.Document({ sections: [{ children: ["NIPUNA KARNATAKA — PROPOSAL EVALUATION", "Synthetic reference report", "Evaluation Date", "27 August 2026", "Composite Score 3.25 / 5"].map((t) => new docx.Paragraph(t)) }] });
      raw = await mammoth.extractRawText({ buffer: await docx.Packer.toBuffer(ref) });
    }
    assert(raw.value.includes("27 August 2026"), "reference fixture changed");
    const units = raw.value.split(/\n+/).filter((t) => t.trim()).map((t, i) => ({ loc: "¶" + (i + 1), text: t }));
    c.documents.push({ id: "REF", name: "reference.docx", role: "Reference report (format only)", kind: "docx", units, extraction: N.assessExtraction(units, "docx") });
    assert(c.meta.evalDate === N.todayISO(now), "reference changed the date");
    assert(!N.buildAnalysisPrompt(c).prompt.includes("27 August 2026"), "reference text sent as evidence");
    const { text } = await docText(R.buildReport(docx, N, c));
    assert(text.includes(N.fmtDate(N.todayISO(now))) && !text.includes("27 August 2026"), "report date wrong");
    return "Case date " + N.fmtDate(c.meta.evalDate) + "; reference excluded from prompt";
  });

  await test(11, "Scanned PDF without OCR → extraction warning, not empty success", async () => {
    const scanned = path.join(TMP, "scanned.pdf");
    // synthetic image-only PDF: rendered text in a bitmap, no text layer
    execFileSync("python3", ["-I", "-c", "import sys\nfrom PIL import Image, ImageDraw\nims=[]\nfor i in range(2):\n im=Image.new('RGB',(1240,1754),'white'); d=ImageDraw.Draw(im); d.text((100,100+40*i),'SYNTHETIC SCANNED PROPOSAL PAGE %d - total cost 1,00,00,000' % (i+1),fill='black'); ims.append(im)\nims[0].save(sys.argv[1],save_all=True,append_images=ims[1:])", scanned]);
    const r = await extract(scanned);
    assert(r.extraction.status === "failed", "status " + r.extraction.status);
    assert(r.extraction.warnings.some((w) => /OCR/.test(w)), "no OCR warning");
    const c = N.newCase("t11");
    c.documents.push({ id: "S", name: "scanned.pdf", role: "Proposal (initial)", kind: "pdf", units: r.units, extraction: r.extraction });
    assert(!N.hasUsableProposal(c), "scanned doc treated as usable");
    return "Image-only synthetic PDF → status 'failed' with OCR warning; scoring stays disabled";
  });

  await test(12, "Embedded applicant instruction to approve → ignored", async () => {
    const c = N.makeSyntheticDemo();
    const hits = c.documents[0].injection;
    assert(hits.length === 1 && hits[0].loc === "p.4", "instruction not flagged");
    const p = N.buildAnalysisPrompt(c).prompt;
    assert(p.includes("SECURITY RULES") && p.indexOf("SECURITY RULES") < p.indexOf("<sources>"), "guard missing or after sources");
    assert(N.composite(c.scores).withheld && !c.decision.outcome, "document text changed scores or outcome");
    // an AI answer that tries to set an invalid outcome / out-of-range scores is sanitised
    N.applyAnalysisResult(c, { findings: [], scores: { c1: { score: 9, rationale: "" } }, compliance: [{ requirement: "x", category: "A", status: "Met" }], outcome: "APPROVED BY GOVERNMENT" }, "t12");
    assert(c.scores.c1.ai.score === null, "out-of-range score accepted");
    assert(c.aiDraftDecision.outcome === "", "invalid outcome accepted");
    assert(c.compliance.find((r) => r.requirement === "x").category === "B", "category A accepted without confirmed policy");
    return "Flagged at p.4; guard precedes sources; deterministic state unchanged. Live model behaviour NOT tested.";
  });

  await test(13, "DOCX export → valid editable document", async () => {
    const out = [];
    for (const [name, c] of [["synthetic", N.makeSyntheticDemo()], ["blank", N.newCase("blank")]]) {
      const rep = path.join(TMP, name + ".docx");
      fs.writeFileSync(rep, await docx.Packer.toBuffer(R.buildReport(docx, N, c)));
      const ann = path.join(TMP, name + "-annex.docx");
      fs.writeFileSync(ann, await docx.Packer.toBuffer(R.buildAnnex(docx, N, c)));
      const info = execFileSync("python3", ["-I", "-c", "import sys,docx\nfor p in sys.argv[1:]:\n d=docx.Document(p); print(len(d.paragraphs), len(d.tables), sum(1 for t in d.tables for r in t.rows))", rep, ann]).toString().trim().split("\n");
      execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", TMP, rep], { stdio: "ignore" });
      const pages = /Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [path.join(TMP, name + ".pdf")]).toString())[1];
      out.push(name + ": report " + info[0] + " (paras tables rows), " + pages + " A4 page(s); annex " + info[1]);
    }
    const head = fs.readFileSync(path.join(TMP, "synthetic.docx")).slice(0, 2).toString();
    assert(head === "PK", "not a zip/OOXML file");
    return out.join("; ");
  });

  await test(14, "Human score override → composite recalculated and change recorded", async () => {
    const c = N.makeSyntheticDemo();
    [2.5, 3, 2.5, 3].forEach((v, i) => (c.scores["c" + (i + 1)].ai = { score: v, rationale: "draft", cites: [] }));
    const before = N.composite(c.scores).value;
    const bad = N.setHumanScore(c, "c1", 3.5, "", "", N.ADVISOR);
    assert(!bad.ok, "override without reason accepted");
    const ok = N.setHumanScore(c, "c1", 3.5, "Curriculum annex reviewed", "Advisor reviewed curriculum annex", N.ADVISOR);
    assert(ok.ok, ok.error);
    const after = N.composite(c.scores).value;
    assert(before === 2.75 && after === 3.0, before + " → " + after);
    const last = c.audit[c.audit.length - 1];
    assert(last.action === "Score override" && last.detail.includes("2.50 → 3.50"), "audit missing");
    assert(c.scores.c1.ai.score === 2.5 && c.scores.c1.human.score === 3.5, "AI and human values not kept separately");
    return "2.75 → 3.00; audit: " + last.detail;
  });

  // ───── additional regression checks ─────
  await test("X5", "Automatic extraction on upload finds stated details with citations and never invents", async () => {
    const units = [
      { loc: "p.1", text: "Proposal for Synthetic Skills for Coastal Youth\nOrganization Name: Example Learning Foundation\nThe programme will train 300 youth in Udupi and Mangaluru, with a minimum of 40% women participation." },
      { loc: "p.2", text: "Training will be delivered over a\n4-month period at partner colleges, followed by a 1-month OJT.\nAll trainees will undergo third-party assessment and certification aligned to NSQF.\nBatches will be formed with 30-40 candidates." },
      { loc: "p.3", text: "Total project cost: ₹60,00,000\nFunding Requested from Government: ₹24,00,000\nSynthetic CSR Partner 60% ₹36,00,000\nKDEM – NIPUNA 40% ₹24,00,000\n1st Tranche (25%) ₹9,00,000 On placement of first 35% of trained batch\nWe commit to 70% placement of trained candidates.\nThe project targets 45% women participation." },
      { loc: "p.4", text: "Detailed Budget\n1 Trainer 4 50,000 6 12,00,000\n2 Content and Kit 300 2,000 1 6,00,000\n3 Assessment 300 1,000 1 3,00,000\nTotal Expense - A 20,00,000\nAdmin Cost 1,00,000\nTotal Project Cost 22,00,000" },
    ];
    const c = N.newCase("x5");
    c.documents.push({ id: "SX", name: "synthetic.pdf", role: "Proposal (initial)", kind: "pdf", units, extraction: N.assessExtraction(units, "pdf") });
    const r = N.applyAutoExtract(c, "SX");
    const val = (k) => (c.facts[k].values || []).map((v) => v.value);
    assert(val("totalCost").includes("₹60,00,000"), "total cost " + val("totalCost"));
    assert(val("publicFunding").some((v) => v.startsWith("₹24,00,000")), "public " + val("publicFunding"));
    assert(val("trainees").includes("300"), "trainees " + val("trainees"));
    assert(val("placement").length === 1 && val("placement")[0].startsWith("70%"), "placement must ignore the tranche milestone: " + val("placement"));
    assert(val("trainingDuration").some((v) => v.startsWith("4 months")) && val("trainingDuration").some((v) => /1 month \(OJT/.test(v)), "durations " + val("trainingDuration"));
    assert(val("batches")[0].startsWith("30–40"), "batches " + val("batches"));
    assert(val("legalEntity")[0] === "Example Learning Foundation", "entity " + val("legalEntity"));
    assert(val("locations").some((v) => v.startsWith("Udupi")) && val("locations").some((v) => v.startsWith("Mangaluru")), "places");
    assert(val("submissionDate").length === 0 && val("statedCostPerTrainee").length === 0, "invented a value that is not stated");
    const women = c.factsExtra.find((x) => x.label === "Women participation");
    assert(women && new Set(women.values.map((v) => v.value)).size === 2, "40% vs 45% conflict not retained");
    const all = Object.values(c.facts).flatMap((f) => f.values).concat(women.values);
    assert(all.every((v) => v.cite && N.verifyExcerpt(c, v.cite).verified), "a citation does not match the source");
    const b = N.analyseBudget(c.budget);
    assert(b.lines.length === 4, "budget lines " + b.lines.length);
    const tA = b.subtotals.find((x) => /Expense - A/.test(x.label));
    assert(tA.computed === 2100000 && tA.status === "Arithmetic discrepancy", "seeded ₹1,00,000 subtotal error not caught: " + tA.computed);
    assert(N.analyseFunding(c.funding).sources.length === 2, "funding sources");
    return r.added + " values, " + b.lines.length + " budget lines; seeded subtotal error caught (stated ₹20,00,000 vs ₹21,00,000); tranche % ignored";
  });

  await test("X6", "Recommendation draft: concerns, outcome, merit, readiness, conditions — and the advisor stays in control", async () => {
    const units = [
      { loc: "p.1", text: "Organization Name: Example Learning Foundation\nThe programme will train 300 youth in Udupi and Mangaluru, with a minimum of 40% women participation." },
      { loc: "p.2", text: "Total project cost: ₹60,00,000\nSynthetic CSR Partner 60% ₹36,00,000\nKDEM – NIPUNA 40% ₹24,00,000\nRelease Schedule - Synthetic CSR Partner Contribution\n1st Tranche (50%) ₹30,00,000 On signing\n2nd Tranche (50%) ₹30,00,000 On placement\nWe commit to 70% placement of trained candidates.\nThe project targets 45% women participation." },
    ];
    const c = N.newCase("x6");
    c.documents.push({ id: "SX", name: "synthetic.pdf", shortName: "Synthetic", role: "Proposal (initial)", kind: "pdf", units, extraction: N.assessExtraction(units, "pdf") });
    N.applyAutoExtract(c, "SX");
    const d = N.buildAdvisoryDraft(c);
    const txt = N.concernsText(d);
    assert(d.outcome === "Return for revision/resubmission", "outcome " + d.outcome);
    assert(/\[Critical, blocking\] Release schedule: Tranches total ₹60,00,000 but Synthetic CSR Partner's stated contribution is ₹36,00,000/.test(txt), "tranche error not raised:\n" + txt);
    assert(/\[Critical, blocking\] Synthetic CSR Partner is to contribute ₹36,00,000/.test(txt), "co-funder commitment not raised");
    assert(/women participation: 40% vs 45%/i.test(txt), "conflict not raised");
    assert(/does not state the training hours/.test(txt) && /Independent verification has not been performed/.test(txt), "missing-information or verification concern absent");
    assert(d.conditions.length >= 3 && /merit provisional/i.test(d.merit) && /^Not ready for shortlisting/.test(d.readiness), "merit/readiness/conditions");
    assert(d.outcomeWhy.some((w) => /critical/.test(w)), "outcome reasons missing");
    c.decision.merit = "Advisor's own merit text";
    N.applyAdvisoryDraft(c, d, "fill");
    assert(c.decision.merit === "Advisor's own merit text" && c.decision.outcome === d.outcome && c.decision.concerns.length > 0, "fill mode overwrote advisor text or did not fill");
    N.applyAdvisoryDraft(c, d, "replace");
    assert(c.decision.merit === d.merit, "replace mode did not replace");
    const { text } = await docText(R.buildReport(docx, N, c));
    assert(/Areas of concern and points for the decision-maker/.test(text) && /Critical \(blocking\): Release schedule/.test(text), "concerns not in report");
    const bad = N.sanitiseAdvisoryDraft({ outcome: "APPROVED", concerns: [{ severity: "Fatal", text: "x" }], conditions: [] });
    assert(bad.outcome === "" && bad.concerns[0].severity === "Minor", "Claude draft not sanitised");
    return d.concerns.length + " concerns; outcome " + d.outcome + "; fill keeps advisor text; report prints concerns";
  });

  await test("X3", "Indian rupee formatting and parsing", async () => {
    const cases = [["₹84,12,250", 8412250], ["21,03,062.5", 2103062.5], ["1.2 crore", 12000000], ["33.6 lakh", 3360000], ["Not stated", null]];
    cases.forEach(([s, v]) => assert(N.parseINR(s) === v, s + " → " + N.parseINR(s)));
    assert(N.fmtINR(2103062.5) === "₹21,03,062.50" && N.fmtINR(30000000) === "₹3,00,00,000", "format");
    assert(N.safeDiv(10, 0) === null && N.evalFormula("a/b", { a: 1, b: 0 }).ok === false, "zero denominator");
    return "ok";
  });
  await test("X4", "Closed status requires closure evidence", async () => {
    const f = { label: "Evaluator judgment", status: "Closed", closureEvidence: "", evidence: [] };
    assert(N.validateFinding(f).some((e) => /closure evidence/i.test(e)), "closed without evidence accepted");
    return "ok";
  });

  const pass = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const lines = ["# Acceptance test results", "", "Run: " + new Date().toISOString() + " · Node " + process.version, "", "| # | Test | Result | Evidence |", "|---|---|---|---|"]
    .concat(results.map((r) => "| " + r.id + " | " + r.name + " | " + (r.skipped ? "SKIPPED" : r.ok ? "PASS" : "**FAIL**") + " | " + String(r.note).replace(/\|/g, "/") + " |"))
    .concat(["", pass + " of " + results.length + " passed" + (skipped ? ", " + skipped + " skipped" : "") + ".", "", "Not covered here: live Claude calls from the artifact (needs the claude.ai viewer), the claude.ai download prompt and the claude.ai data store. See README → Test results."]);
  fs.writeFileSync(path.join(__dirname, "RESULTS.md"), lines.join("\n") + "\n");
  results.forEach((r) => console.log((r.skipped ? "SKIP " : r.ok ? "PASS " : "FAIL ") + r.id + " " + r.name + (r.note ? " — " + r.note : "")));
  console.log(pass + "/" + results.length + " passed" + (skipped ? ", " + skipped + " skipped" : ""));
  process.exit(pass + skipped === results.length ? 0 : 1);
})();
