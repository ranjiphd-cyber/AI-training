// Build the Time-to-Fill DMAIC deck. Run: NODE_PATH=<dir with pptxgenjs> node build_deck.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const ROOT = path.join(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "data/results.json"), "utf8"));
const rows = fs.readFileSync(path.join(ROOT, "data/illustrative_requisitions.csv"), "utf8").trim().split("\n");
const hdr = rows[0].split(",");
const data = rows.slice(1).map(l => { const v = l.split(","); const o = {}; hdr.forEach((h, i) => o[h] = v[i]); return o; });
const base = data.filter(d => d.phase === "Baseline"), imp = data.filter(d => d.phase === "Improve");
const f1 = x => x.toFixed(1), f0 = x => Math.round(x).toString(), pct = x => (x * 100).toFixed(1) + "%";
const pfmt = p => p < 0.001 ? "< 0.001" : p.toFixed(3);
const B = R.baseline, I = R.improve, USL = R.spec.USL;

const THEME = {
  name: "Signal Steel", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: "1B2830", lt1: "FFFFFF", dk2: "1F3A4D", lt2: "EEF2F4", accent1: "0F7C80", accent2: "E0A100",
    accent3: "B4232A", accent4: "6B8A99", accent5: "2E7D4F", accent6: "5A6B73", hlink: "0F7C80", folHlink: "5A6B73" },
};
const HX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Time-to-Fill DMAIC Black Belt Project"; pres.author = "Talent Acquisition · LSS MBB";
const C = pres.SchemeColor;
const W = 13.333;

// ---------- Layouts
pres.defineSlideMaster({
  title: "DARK", background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.2, w: 11.7, h: 1.6, fontFace: THEME.headFontFace, fontSize: 44, bold: true, color: C.background1, valign: "bottom", align: "left" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.95, w: 11.0, h: 1.2, fontSize: 18, color: "CADBE2", valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.9, h: 0.9, fontFace: THEME.headFontFace, fontSize: 28, bold: true, color: C.text2, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Time-to-Fill DMAIC  ·  Illustrative data: replace with ATS extract", options: { x: 0.5, y: 7.0, w: 8, h: 0.3, fontSize: 10, color: C.accent6, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.0, w: 0.55, h: 0.3, fontSize: 10, color: C.accent6, align: "right" },
});

// ---------- helpers
const PH = ["D", "M", "A", "I", "C"];
function chips(s, phase) {
  PH.forEach((p, i) => {
    const on = p === phase;
    s.addShape(pres.ShapeType.ellipse, { x: 10.85 + i * 0.42, y: 0.52, w: 0.34, h: 0.34, fill: { color: on ? C.accent1 : C.background2 }, line: { color: on ? C.accent1 : C.accent4, width: 0.75 }, objectName: "phase-" + p });
    s.addText(p, { x: 10.85 + i * 0.42, y: 0.52, w: 0.34, h: 0.34, fontSize: 11, bold: true, align: "center", valign: "middle", color: on ? C.background1 : C.accent6, margin: 0, isTextBox: true });
  });
}
function slide(title, phase, section, notes) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  if (phase) chips(s, phase);
  if (notes) s.addNotes(notes);
  return s;
}
function card(s, x, y, w, h, fill, name) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || C.background2 }, line: { color: fill || C.background2, width: 0 }, objectName: name || "card" });
}
function txt(s, t, o) { s.addText(t, Object.assign({ isTextBox: true, fontSize: 14, color: C.text1, valign: "top", margin: 0 }, o)); }
function stat(s, x, y, w, big, label, sub, color, size) {
  card(s, x, y, w, 1.85, C.background2, "stat");
  txt(s, big, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: 0.8, fontSize: size || 40, bold: true, fontFace: THEME.headFontFace, color: color || C.text2, valign: "middle" });
  txt(s, label, { x: x + 0.25, y: y + 1.02, w: w - 0.5, h: 0.35, fontSize: 14, bold: true, color: C.text1 });
  if (sub) txt(s, sub, { x: x + 0.25, y: y + 1.38, w: w - 0.5, h: 0.35, fontSize: 11, color: C.accent6 });
}
function bullets(s, items, o) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    Object.assign({ isTextBox: true, fontSize: 14, color: C.text1, valign: "top", margin: 0.05 }, o));
}
const HCELL = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 12 } });
function table(s, head, body, o) {
  const rowsT = [head.map(HCELL)].concat(body.map((r, i) => r.map(c => (typeof c === "object" && c !== null && c.text !== undefined) ? c :
    ({ text: String(c), options: { fontSize: 11, color: C.text1, fill: { color: i % 2 ? C.background2 : C.background1 } } }))));
  s.addTable(rowsT, Object.assign({ x: 0.5, y: 1.45, w: 12.33, border: { type: "solid", pt: 0.5, color: "C9D3D8" }, valign: "middle", margin: 0.06, autoPage: false }, o));
}
const axis = { catAxisLabelColor: HX.accent6, valAxisLabelColor: HX.accent6, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valGridLine: { color: "DDE4E7", size: 0.5 }, catGridLine: { style: "none" },
  titleFontFace: "+mn-lt", titleColor: HX.dk2, titleFontSize: 13, dataLabelFontFace: "+mn-lt", dataLabelFontSize: 10, dataLabelColor: HX.dk1, legendFontFace: "+mn-lt", legendFontSize: 10, legendColor: HX.accent6 };

// ======================= SLIDES
// 1 Title
pres.addSection({ title: "Opening" });
let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Opening" });
s.addText("Time-to-Fill DMAIC", { placeholder: "title" });
s.addText("Lean Six Sigma Black Belt project · Talent Acquisition\nDemonstrated end-to-end on an illustrative dataset; the data kit shows how to replace it with your ATS extract", { placeholder: "body" });
PH.forEach((p, i) => {
  s.addShape(pres.ShapeType.ellipse, { x: 0.8 + i * 0.75, y: 1.2, w: 0.55, h: 0.55, fill: { color: i === 0 ? C.accent2 : C.text2 }, line: { color: C.accent2, width: 1.25 }, objectName: "title-phase-" + p });
  s.addText(p, { x: 0.8 + i * 0.75, y: 1.2, w: 0.55, h: 0.55, fontSize: 16, bold: true, align: "center", valign: "middle", color: i === 0 ? C.text2 : C.accent2, margin: 0, isTextBox: true });
});
txt(s, "Prepared for: Executive Sponsor, TA Leadership, HRBPs, Finance BP   ·   November 2026", { x: 0.8, y: 6.5, w: 11, h: 0.4, fontSize: 12, color: "CADBE2" });
s.addNotes("Purpose: walk sponsors through the full DMAIC arc on Time-to-Fill. All numbers come from a synthetic, illustrative dataset of 270 requisitions built to behave like a typical TA process. The statistics are real calculations on that data. Swap in your ATS extract using the Data Collection Kit and the dashboard, and every number refreshes.");

// 2 Exec summary
pres.addSection({ title: "Executive summary" });
s = slide("Interview loops and approvals drive most of the delay", null, "Executive summary",
  "Lead with the answer. Baseline median TTF was about 53 days with two in three requisitions breaching the 45-day limit. Three statistically validated drivers: interview rounds, approval lag, recruiter load. The pilot cut the median to about 29 days. Cost-of-vacancy avoided is a notional figure until Finance confirms the daily rate.");
stat(s, 0.5, 1.45, 2.9, `${f1(B.median)} → ${f1(I.median)}`, "Median TTF (days)", `Baseline n=${B.n} · Pilot n=${I.n}`, null, 28);
stat(s, 3.6, 1.45, 2.9, `${f0(B.pct_over_usl * 100)}% → ${f0(I.pct_over_usl * 100)}%`, `Requisitions > ${USL} days`, "Defect rate vs USL", C.accent3, 28);
stat(s, 6.7, 1.45, 2.9, `${B.z_bench.toFixed(2)} → ${I.z_bench.toFixed(2)}`, "Z-bench (σ level)", "Long-term, from defect rate", null, 28);
stat(s, 9.8, 1.45, 3.03, `€${(R.financial.annual_cov_avoided / 1e6).toFixed(1)}M`, "Cost of vacancy avoided / yr", "Notional, €450/day × 1,200 hires", C.accent1, 28);
txt(s, "What the data says", { x: 0.5, y: 3.6, w: 6, h: 0.4, fontSize: 18, bold: true, color: C.text2, fontFace: THEME.headFontFace });
bullets(s, [
  `Interviewing is ${f0(R.stages.Baseline.interview_days.median / B.median * 100)}% of median lead time; each extra round adds ${f1(R.regression.terms[1].coef)} days (p < 0.001)`,
  `Approval lag adds ${f1(R.regression.terms[3].coef)} days per day of delay; recruiter load adds ${R.regression.terms[2].coef.toFixed(2)} days per open req`,
  `Top 3 Pareto causes explain ${f0(R.pareto[2].cum * 100)}% of delays; HM feedback alone is ${f0(R.pareto[0].pct * 100)}%`,
  `Slow requisitions lose candidates: offer acceptance falls when TTF > ${USL} days (χ² p = ${R.chi_accept.p.toFixed(3)})`,
], { x: 0.5, y: 4.05, w: 7.4, h: 2.7 });
card(s, 8.3, 3.6, 4.53, 3.15, C.text2, "ask-card");
txt(s, "Decisions requested", { x: 8.55, y: 3.78, w: 4.0, h: 0.4, fontSize: 18, bold: true, color: C.accent2, fontFace: THEME.headFontFace });
bullets(s, ["Sign off USL = 45 days and the TTF definition", "Mandate the 48h feedback SLA in HM objectives", "Pre-approve headcount against the annual plan", "Fund ATS reminder automation (≈ €18k)"], { x: 8.55, y: 4.25, w: 4.1, h: 2.4, color: C.background1 });

// ======================= DEFINE
pres.addSection({ title: "Define" });
s = slide("Project charter", "D", "Define", "Charter. Problem statement is about measured variation, not symptoms. Goal is SMART. Scope deliberately excludes bulk blue-collar drives and internal moves, which follow a different process.");
const ch = [
  ["Business case", `Slow hiring delays revenue-generating roles and loses finalists. At an assumed €450 per vacant day, the ${f1(B.mean - R.spec.target)}-day gap above target across 1,200 hires costs ≈ €${((B.mean - R.spec.target) * 1200 * 450 / 1e6).toFixed(1)}M a year.`],
  ["Problem statement", `Jan–Jun 2026: median TTF ${f1(B.median)} days (IQR ${f0(B.q1)}–${f0(B.q3)}); ${pct(B.pct_over_usl)} of ${B.n} filled requisitions exceeded the 45-day USL.`],
  ["Goal statement", `By Oct 2026: median TTF ≤ ${R.spec.target} days and ≥ 90% of requisitions ≤ ${USL} days, with no fall in offer acceptance or 90-day quality of hire.`],
  ["In scope", "Professional, manager and senior roles; all five business units; req approval → offer accepted."],
  ["Out of scope", "Bulk operator drives, internships, internal transfers, onboarding after offer accept."],
  ["Team", "Sponsor: TA Head · Black Belt · Process owner: TA Ops Lead · Green Belts: 2 Recruitment Leads · SMEs: HRBP, Finance BP, HRIS"],
  ["Milestones", "Define: Jun 2 · Measure: Jun 30 · Analyze: Jul 21 · Improve pilot: Jul 27–Oct 23 · Control hand-off: Nov 13"],
];
ch.forEach((r, i) => {
  const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4, x = col ? 6.8 : 0.5, y = 1.45 + row * 1.33, w = 6.03;
  if (i < 3) card(s, x, y, w, 1.2, C.background2, "charter-" + i);
  else s.addShape(pres.ShapeType.roundRect, { x, y, w, h: 1.2, rectRadius: 0.08, fill: { color: C.background1 }, line: { color: C.accent4, width: 0.75 } });
  txt(s, r[0], { x: x + 0.2, y: y + 0.1, w: w - 0.4, h: 0.3, fontSize: 13, bold: true, color: C.accent1 });
  txt(s, r[1], { x: x + 0.2, y: y + 0.4, w: w - 0.4, h: 0.75, fontSize: 12 });
});

s = slide("Voice of the customer becomes four CTQs", "D", "Define", "VOC to CTQ. Each customer phrase maps to a measurable characteristic with a specification. The 45-day USL is provisional until the sponsor signs it off; question 2 in the missing-information questionnaire.");
const ctq = [
  ["Hiring managers", "“I lose a quarter waiting for a hire.”", "Speed", "TTF days", `USL ${USL} d · target ${R.spec.target} d`],
  ["Candidates", "“I took another offer while waiting.”", "Responsiveness", "Feedback lag per round", "≤ 2 working days"],
  ["Business / Finance", "“Vacancies cost us output.”", "Cost", "Cost of vacancy €", "↓ 40% vs baseline"],
  ["TA team", "“Too many reqs, constant chasing.”", "Workload", "Open reqs per recruiter", "15–20 balanced"],
];
["Customer", "Voice (VOC/VOB)", "Driver", "CTQ metric", "Specification"].forEach((h, j) => {
  txt(s, h, { x: 0.5 + j * 2.5, y: 1.45, w: 2.3, h: 0.35, fontSize: 12, bold: true, color: C.accent6 });
});
ctq.forEach((r, i) => r.forEach((c, j) => {
  const x = 0.5 + j * 2.5, y = 1.9 + i * 1.22;
  card(s, x, y, 2.3, 1.05, j === 3 ? C.accent1 : (j === 4 ? C.text2 : C.background2), "ctq");
  txt(s, c, { x: x + 0.15, y: y + 0.1, w: 2.0, h: 0.85, fontSize: j === 1 ? 12 : 13, italic: j === 1, bold: j >= 3, valign: "middle", color: j >= 3 ? C.background1 : C.text1 });
  if (j < 4) s.addShape(pres.ShapeType.rightArrow, { x: x + 2.33, y: y + 0.42, w: 0.14, h: 0.22, fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 } });
}));
txt(s, "Defect = one filled requisition with TTF > 45 days.  Unit = filled requisition.  Opportunity = 1 per unit.", { x: 0.5, y: 6.55, w: 12.3, h: 0.35, fontSize: 13, bold: true, color: C.accent3 });

s = slide("SIPOC: approval to accepted offer", "D", "Define", "SIPOC sets the boundaries. Process starts when the requisition is raised and ends at offer acceptance. Onboarding is out of scope.");
const sip = [
  ["Suppliers", ["Hiring managers", "HRBPs / Finance", "Job boards, agencies", "ATS / HRIS vendor", "Interview panels"]],
  ["Inputs", ["Approved headcount", "Job description", "Salary band", "Candidate pool", "Panel calendars"]],
  ["Process", ["1 Requisition approval", "2 Sourcing", "3 Screening", "4 Interviewing", "5 Offer & accept"]],
  ["Outputs", ["Accepted offer", "Hire record in ATS", "Candidate feedback", "Stage timestamps"]],
  ["Customers", ["Hiring manager", "Candidate", "Business unit P&L", "Onboarding team"]],
];
sip.forEach((c, j) => {
  const x = 0.5 + j * 2.5;
  card(s, x, 1.45, 2.3, 0.6, j === 2 ? C.accent1 : C.text2, "sipoc-h");
  txt(s, c[0], { x, y: 1.45, w: 2.3, h: 0.6, fontSize: 16, bold: true, align: "center", valign: "middle", color: C.background1, fontFace: THEME.headFontFace });
  card(s, x, 2.2, 2.3, 4.5, C.background2, "sipoc-b");
  bullets(s, c[1], { x: x + 0.12, y: 2.35, w: 2.1, h: 4.2, fontSize: 13 });
});

// ======================= MEASURE
pres.addSection({ title: "Measure" });
s = slide("Data collection plan", "M", "Measure", "The data collection kit (Excel) implements this plan tab by tab. Stratification factors are chosen so every hypothesis in Analyze can be tested.");
table(s, ["Measure", "Type", "Operational definition", "Source", "Frequency · sample", "Owner"], [
  ["TTF days (Y)", "Continuous", "Offer-accepted date − req-approved date, calendar days", "ATS export", "All filled reqs, 6 months · n ≥ 150", "TA Ops"],
  ["Stage durations", "Continuous", "Days in each of 5 stages; touch vs queue time", "ATS audit log", "Per req × stage", "HRIS"],
  ["Feedback lag", "Continuous", "Interview date → scorecard submitted, working days", "ATS scorecards", "Every interview", "Coordinators"],
  ["Interview rounds", "Discrete count", "Distinct rounds for hired candidate", "ATS", "Per req", "Recruiters"],
  ["Recruiter load", "Discrete count", "Open reqs on recruiter at req open date", "ATS weekly snapshot", "Weekly", "TA Ops"],
  ["Primary delay reason", "Attribute (7 cats)", "Largest delay per operational definitions (kit tab 6)", "Recruiter log", "Per req, MSA-validated", "Recruitment Leads"],
  ["Offer accepted", "Binary", "Y = preferred candidate accepted first offer", "ATS", "Per req", "Recruiters"],
  ["Stratifiers", "Categorical", "Business unit, job level, source channel, recruiter, HM", "ATS / HRIS", "Per req", "TA Ops"],
], { colW: [1.8, 1.4, 3.6, 1.6, 2.2, 1.73], fontSize: 11, rowH: 0.6 });

s = slide("Measurement system check before trusting the data", "M", "Measure", "Two MSAs. Continuous: compare TTF from the ATS report vs manual recount on 30 reqs (bias and agreement). Attribute: three recruiters classify the same 20 reqs twice. Do not run the Pareto until agreement is at least 90%.");
card(s, 0.5, 1.45, 6.0, 5.3, C.background2, "msa-cont");
txt(s, "Continuous Y: TTF days", { x: 0.75, y: 1.65, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: C.text2, fontFace: THEME.headFontFace });
bullets(s, ["Re-derive TTF manually for 30 random reqs; compare to ATS report", "Bias: mean difference ≤ 1 day (paired t-test, p ≥ 0.05)", "Agreement: ≥ 95% of reqs within ± 1 day", "Check for on-hold time hidden in TTF (Gross vs Net TTF)", "Timestamps must be system-generated, not typed"], { x: 0.75, y: 2.15, w: 5.5, h: 3.2 });
txt(s, "Accept if %Study Var < 10%; conditional 10–30%", { x: 0.75, y: 5.9, w: 5.5, h: 0.6, fontSize: 13, bold: true, color: C.accent1 });
card(s, 6.83, 1.45, 6.0, 5.3, C.background2, "msa-attr");
txt(s, "Attribute X: primary delay reason", { x: 7.08, y: 1.65, w: 5.5, h: 0.4, fontSize: 18, bold: true, color: C.text2, fontFace: THEME.headFontFace });
const msaT = [["Check", "Target"], ["Within appraiser (repeatability)", "≥ 90%"], ["Between appraisers (reproducibility)", "≥ 90%"], ["Appraisers vs standard (accuracy)", "≥ 90%"], ["Fleiss' kappa", "≥ 0.75"]];
s.addTable(msaT.map((r, i) => r.map(c => i === 0 ? HCELL(c) : { text: c, options: { fontSize: 12, color: C.text1, fill: { color: C.background1 } } })), { x: 7.08, y: 2.2, w: 5.5, colW: [3.9, 1.6], border: { type: "solid", pt: 0.5, color: "C9D3D8" }, margin: 0.06 });
txt(s, "3 recruiters × 20 closed reqs × 2 trials, shuffled order, 1 week apart. Template: kit tab 6.", { x: 7.08, y: 4.6, w: 5.5, h: 0.8, fontSize: 13 });
txt(s, "If agreement < 90%: tighten definitions, retrain, repeat", { x: 7.08, y: 5.9, w: 5.5, h: 0.6, fontSize: 13, bold: true, color: C.accent3 });

// Histogram baseline
const bins = []; for (let b = 10; b < 175; b += 5) bins.push(b);
const histo = (arr) => bins.map(b => arr.filter(d => +d.ttf_days >= b && +d.ttf_days < b + 5).length);
const hb = histo(base);
s = slide("Baseline is right-skewed: two in three reqs breach 45 days", "M", "Measure", `Anderson-Darling on raw TTF: A² = ${B.ad_A2.toFixed(2)}, p ${pfmt(B.ad_p)}, so not normal. Log-transformed TTF passes (p = ${B.ad_log_p.toFixed(2)}), consistent with a lognormal lead-time process. We therefore report median and IQR, and use non-parametric tests or log-scale models.`);
s.addChart(pres.charts.BAR, [
  { name: `≤ ${USL} days`, labels: bins.map(b => String(b)), values: hb.map((v, i) => bins[i] + 5 <= USL ? v : 0) },
  { name: `> ${USL} days (defect)`, labels: bins.map(b => String(b)), values: hb.map((v, i) => bins[i] + 5 > USL ? v : 0) },
], Object.assign({}, axis, { x: 0.5, y: 1.4, w: 8.3, h: 5.4, barDir: "col", barGrouping: "stacked", barGapWidthPct: 15, chartColors: [HX.accent1, HX.accent3],
  showTitle: true, title: `Baseline TTF distribution, 5-day bins (n = ${B.n})`, showLegend: true, legendPos: "t", showCatAxisTitle: true, catAxisTitle: "TTF days (bin start)", catAxisTitleColor: HX.accent6, catAxisTitleFontSize: 11, showValAxisTitle: true, valAxisTitle: "Requisitions", valAxisTitleColor: HX.accent6, valAxisTitleFontSize: 11 }));
card(s, 9.1, 1.4, 3.73, 5.4, C.background2, "desc");
const desc = [["n", B.n], ["Median", f1(B.median) + " d"], ["IQR", `${f1(B.q1)} – ${f1(B.q3)} d`], ["Mean / SD", `${f1(B.mean)} / ${f1(B.sd)} d`], ["Range", `${f1(B.min)} – ${f1(B.max)} d`], ["A-D p (raw)", pfmt(B.ad_p)], ["A-D p (log)", B.ad_log_p.toFixed(2)]];
txt(s, "Descriptive statistics", { x: 9.35, y: 1.6, w: 3.3, h: 0.4, fontSize: 16, bold: true, color: C.text2, fontFace: THEME.headFontFace });
desc.forEach((d, i) => {
  txt(s, d[0], { x: 9.35, y: 2.15 + i * 0.52, w: 1.5, h: 0.4, fontSize: 13, color: C.accent6 });
  txt(s, String(d[1]), { x: 10.8, y: 2.15 + i * 0.52, w: 1.85, h: 0.4, fontSize: 13, bold: true, align: "right" });
});
txt(s, "Verdict: non-normal → use median, IQR and non-parametric tests", { x: 9.35, y: 5.85, w: 3.3, h: 0.8, fontSize: 12, bold: true, color: C.accent3 });

// Capability + I-MR
s = slide("Process is stable but not capable", "M", "Measure", `I-MR: one point above UCL ${f1(B.imr.ucl)}; otherwise common-cause variation, so capability is meaningful. Non-normal Ppk uses the percentile method: (USL − median) / (P99.865 − median). Negative Ppk means the median itself sits above the USL.`);
const bt = base.map(d => +d.ttf_days);
s.addChart(pres.charts.LINE, [
  { name: "TTF", labels: bt.map((_, i) => String(i + 1)), values: bt },
  { name: "UCL", labels: bt.map((_, i) => String(i + 1)), values: bt.map(() => +B.imr.ucl.toFixed(1)) },
  { name: "Mean", labels: bt.map((_, i) => String(i + 1)), values: bt.map(() => +B.imr.xbar.toFixed(1)) },
  { name: "USL", labels: bt.map((_, i) => String(i + 1)), values: bt.map(() => USL) },
], Object.assign({}, axis, { x: 0.5, y: 1.4, w: 8.3, h: 5.4, chartColors: [HX.accent4, HX.accent3, HX.dk2, HX.accent2], lineSize: 1.25, lineDataSymbol: "none",
  showTitle: true, title: "I chart, baseline TTF in requisition-open order", showLegend: true, legendPos: "t", catAxisLabelFrequency: 20, valAxisMinVal: 0 }));
stat(s, 9.1, 1.4, 1.78, B.ppk_percentile.toFixed(2), "Ppk", "percentile", C.accent3);
stat(s, 11.05, 1.4, 1.78, B.z_bench.toFixed(2), "Z-bench", "long term", C.accent3);
stat(s, 9.1, 3.4, 1.78, f0(B.dpmo / 1000) + "k", "DPMO", "vs USL 45 d", C.accent3);
stat(s, 11.05, 3.4, 1.78, String(B.imr.ooc), "Points > UCL", `UCL ${f0(B.imr.ucl)} d`);
txt(s, "Stable process, wrong place: shift the centre and shrink the spread", { x: 9.1, y: 5.5, w: 3.73, h: 1.2, fontSize: 14, bold: true, color: C.text2 });

// Stage funnel
s = slide(`Interviewing is ${f0(R.stages.Baseline.interview_days.median / B.median * 100)}% of median lead time`, "M", "Measure", "Median days per stage. Medians don't add to the median total, but the share is directionally clear. Stage timestamps (kit tab 2) will split each stage into touch time and queue time for a full value stream map.");
const stg = ["approval_days", "sourcing_days", "screening_days", "interview_days", "offer_days"], stgL = ["Approval", "Sourcing", "Screening", "Interviewing", "Offer"];
s.addChart(pres.charts.BAR, [{ name: "Median days", labels: stgL, values: stg.map(k => +R.stages.Baseline[k].median.toFixed(1)) }],
  Object.assign({}, axis, { x: 0.5, y: 1.4, w: 7.6, h: 5.4, barDir: "bar", chartColors: [HX.accent4, HX.accent4, HX.accent4, HX.accent3, HX.accent4], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0",
  showTitle: true, title: "Median days per stage, baseline", showLegend: false, catAxisOrientation: "maxMin", valGridLine: { style: "none" }, valAxisHidden: true }));
const tim = [["Waiting", "Feedback queues between rounds; approvals in inboxes"], ["Over-processing", "4–5 interview rounds for professional roles"], ["Motion", "Coordinators chase calendars by email"], ["Defects / rework", "JD changed mid-search; restarts after declines"], ["Inventory", "Shortlists aging while HMs are unavailable"]];
txt(s, "Wastes seen at the Gemba (TIMWOODS)", { x: 8.5, y: 1.45, w: 4.3, h: 0.4, fontSize: 16, bold: true, color: C.text2, fontFace: THEME.headFontFace });
tim.forEach((t, i) => {
  card(s, 8.5, 1.95 + i * 0.95, 4.33, 0.82, C.background2, "waste");
  txt(s, t[0], { x: 8.68, y: 2.02 + i * 0.95, w: 4.0, h: 0.3, fontSize: 13, bold: true, color: C.accent1 });
  txt(s, t[1], { x: 8.68, y: 2.32 + i * 0.95, w: 4.0, h: 0.45, fontSize: 12 });
});

// ======================= ANALYZE
pres.addSection({ title: "Analyze" });
s = slide("Cause-and-effect: 24 candidate Xs across the 6Ms", "A", "Analyze", "Fishbone built with recruiters, coordinators and two hiring managers. Items in bold teal were tested statistically on the next slides; others go to Gemba validation.");
// spine
s.addShape(pres.ShapeType.line, { x: 0.8, y: 4.1, w: 9.6, h: 0, line: { color: C.text2, width: 2.5 } });
card(s, 10.5, 3.5, 2.33, 1.2, C.accent3, "effect");
txt(s, "TTF > 45 days", { x: 10.5, y: 3.5, w: 2.33, h: 1.2, fontSize: 18, bold: true, align: "center", valign: "middle", color: C.background1, fontFace: THEME.headFontFace });
const bones = [
  ["People", ["HM feedback > 48h", "Panel availability", "Recruiter skill mix", "HM unclear on profile"], 0, true],
  ["Method", ["4–5 interview rounds", "Serial, not parallel, rounds", "No intake meeting standard", "Comp exceptions loop"], 1, true],
  ["Machine / Tech", ["No ATS reminders", "Manual calendar booking", "Feedback by email", "No live req tracker"], 2, true],
  ["Material", ["Thin talent pool", "Weak JD", "Salary band below market", "Low referral volume"], 0, false],
  ["Measurement", ["No TTF definition", "On-hold time not logged", "Delay reason free text", "No weekly review"], 1, false],
  ["Milieu", ["Approval chain 3–4 levels", "Recruiter load 25+ reqs", "Hiring freezes", "Holiday periods"], 2, false],
];
bones.forEach(([name, items, col, top]) => {
  const x = 0.9 + col * 3.2, yH = top ? 1.45 : 6.25;
  card(s, x, yH, 2.6, 0.45, C.text2, "bone");
  txt(s, name, { x, y: yH, w: 2.6, h: 0.45, fontSize: 14, bold: true, align: "center", valign: "middle", color: C.background1 });
  s.addShape(pres.ShapeType.line, { x: x + 2.0, y: top ? 1.9 : 4.1, w: 0.6, h: top ? 2.2 : 2.15, flipV: !top, line: { color: C.accent4, width: 1.25 } });
  const tested = ["HM feedback > 48h", "4–5 interview rounds", "Recruiter load 25+ reqs", "Approval chain 3–4 levels", "Thin talent pool"];
  items.forEach((it, k) => txt(s, it, { x: x, y: (top ? 1.98 : 4.25) + k * 0.47, w: 1.9, h: 0.42, fontSize: 11, bold: tested.includes(it), color: tested.includes(it) ? C.accent1 : C.text1, valign: "middle" }));
});

s = slide("Hypothesis tests: which Xs really move TTF", "A", "Analyze", "All tests on baseline data, alpha = 0.05. Non-parametric tests because TTF is non-normal. Business unit and source channel are NOT significant, which kills two popular conference-room theories.");
const kwRow = (lab, o, test) => [lab, test, o.H !== undefined ? `H = ${o.H.toFixed(2)}` : "", pfmt(o.p)];
const ver = p => p < 0.05 ? { text: "Significant: vital X", options: { bold: true, color: C.accent1, fontSize: 11 } } : { text: "Not significant", options: { color: C.accent6, fontSize: 11 } };
const sp = R.spearman;
const ht = [
  ["Job level (4 groups)", "Kruskal-Wallis", `H = ${R.kw_level.H.toFixed(2)}`, pfmt(R.kw_level.p), R.kw_level.p],
  ["Recruiter (8 groups)", "Kruskal-Wallis", `H = ${R.kw_recruiter.H.toFixed(2)}`, pfmt(R.kw_recruiter.p), R.kw_recruiter.p],
  ["Business unit (5 groups)", "Kruskal-Wallis", `H = ${R.kw_bu.H.toFixed(2)}`, pfmt(R.kw_bu.p), R.kw_bu.p],
  ["Referral/internal vs other channels", "Mood's median", `χ² = ${R.mood_channel.chi2.toFixed(2)}`, pfmt(R.mood_channel.p), R.mood_channel.p],
  ["Interview rounds", "Spearman ρ", `ρ = ${sp["Interview rounds"].rho.toFixed(2)}`, pfmt(sp["Interview rounds"].p), sp["Interview rounds"].p],
  ["Approval days", "Spearman ρ", `ρ = ${sp["Approval days"].rho.toFixed(2)}`, pfmt(sp["Approval days"].p), sp["Approval days"].p],
  ["Recruiter open reqs", "Spearman ρ", `ρ = ${sp["Recruiter open reqs"].rho.toFixed(2)}`, pfmt(sp["Recruiter open reqs"].p), sp["Recruiter open reqs"].p],
  ["Offer accepted × TTF ≤/> 45 d", "Chi-square (1 df)", `χ² = ${R.chi_accept.chi2.toFixed(2)}`, pfmt(R.chi_accept.p), R.chi_accept.p],
];
table(s, ["Y = TTF vs X", "Test", "Statistic", "p-value", "Verdict"], ht.map((r, i) => [...r.slice(0, 4).map(c => ({ text: c, options: { fontSize: 12, color: C.text1, fill: { color: i % 2 ? C.background2 : C.background1 } } })), Object.assign(ver(r[4]), {})]),
  { colW: [3.6, 2.2, 2.0, 1.6, 2.93], rowH: 0.5 });
txt(s, `Medians by level: Operator ${f0(R.kw_level.groups["Operator/Technician"].median)} · Professional ${f0(R.kw_level.groups["Professional"].median)} · Manager ${f0(R.kw_level.groups["Manager"].median)} · Senior Leader ${f0(R.kw_level.groups["Senior Leader"].median)} days. Level is a stratifier for specs, not a lever.`,
  { x: 0.5, y: 6.25, w: 12.3, h: 0.6, fontSize: 13, color: C.text2, bold: true });

s = slide("Regression: rounds, approvals and load explain 41% of variation", "A", "Analyze", `Multiple regression TTF = ${R.regression.terms[0].coef.toFixed(1)} + ${R.regression.terms[1].coef.toFixed(2)}·Rounds + ${R.regression.terms[2].coef.toFixed(2)}·Load + ${R.regression.terms[3].coef.toFixed(2)}·Approval. R-sq ${pct(R.regression.r2)}, R-sq(adj) ${pct(R.regression.r2_adj)}, S = ${f1(R.regression.s)}. All VIF ≈ 1.0, so no multicollinearity. Residuals are not normal (A-D p = ${R.regression.resid_ad_p.toFixed(3)}); refit on log(TTF) for the final model. Coefficients are directionally robust.`);
const terms = R.regression.terms.slice(1);
s.addChart(pres.charts.BAR, [{ name: "Days added per unit of X", labels: terms.map(t => t.term), values: terms.map(t => +t.coef.toFixed(2)) }],
  Object.assign({}, axis, { x: 0.5, y: 1.4, w: 6.6, h: 4.2, barDir: "bar", chartColors: [HX.accent1, HX.accent1, HX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00",
  showTitle: true, title: "Coefficient: days of TTF added per one-unit increase", showLegend: false, catAxisOrientation: "maxMin", valAxisHidden: true, valGridLine: { style: "none" } }));
table(s, ["Term", "Coef", "SE", "T", "p", "VIF"], R.regression.terms.map(t => [t.term, t.coef.toFixed(2), t.se.toFixed(2), t.t.toFixed(2), pfmt(t.p), t.vif ? t.vif.toFixed(2) : "–"]),
  { x: 7.4, y: 1.45, w: 5.43, colW: [1.85, 0.7, 0.7, 0.7, 0.78, 0.7], fontSize: 11, rowH: 0.42 });
const sumM = [["R-sq", pct(R.regression.r2)], ["R-sq (adj)", pct(R.regression.r2_adj)], ["S", f1(R.regression.s) + " d"], ["Residual A-D p", R.regression.resid_ad_p.toFixed(3)]];
sumM.forEach((m, i) => { card(s, 7.4 + i * 1.38, 3.85, 1.25, 1.1, C.background2, "rs"); txt(s, m[1], { x: 7.45 + i * 1.38, y: 3.92, w: 1.15, h: 0.5, fontSize: 18, bold: true, align: "center", color: C.text2, fontFace: THEME.headFontFace }); txt(s, m[0], { x: 7.45 + i * 1.38, y: 4.45, w: 1.15, h: 0.4, fontSize: 10, align: "center", color: C.accent6 }); });
card(s, 0.5, 5.85, 12.33, 0.95, C.text2, "reg-take");
txt(s, `Cutting one interview round saves ≈ ${f1(R.regression.terms[1].coef)} days; five fewer approval days save ≈ ${f1(5 * R.regression.terms[3].coef)} days; moving a recruiter from 25 to 17 reqs saves ≈ ${f1(8 * R.regression.terms[2].coef)} days.`,
  { x: 0.75, y: 5.85, w: 11.9, h: 0.95, fontSize: 14, bold: true, valign: "middle", color: C.background1 });

// Pareto
s = slide(`Three causes account for ${f0(R.pareto[2].cum * 100)}% of delays`, "A", "Analyze", "Pareto on recruiter-logged primary delay reason, baseline n = 180. Trust this only after the attribute MSA passes. HM feedback delay and approval delay are both inside the organisation's control.");
const par = R.pareto;
const parLab = par.map(p => p.reason.replace("Interview scheduling / panel availability", "Interview scheduling").replace("Low / poor-fit applicant pool", "Low applicant pool").replace("Offer & compensation approval", "Offer/comp approval").replace("JD / requirement changed mid-search", "JD changed").replace("Hiring-manager feedback delay", "HM feedback delay").replace("Requisition approval delay", "Req approval delay").replace("Candidate decline or renege", "Candidate decline"));
s.addChart([
  { type: pres.charts.BAR, data: [{ name: "Requisitions", labels: parLab, values: par.map(p => p.count) }], options: { chartColors: [HX.accent1], barGapWidthPct: 30, showValue: true, dataLabelPosition: "outEnd" } },
  { type: pres.charts.LINE, data: [{ name: "Cumulative %", labels: parLab, values: par.map(p => +(p.cum * 100).toFixed(1)) }], options: { chartColors: [HX.accent2], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 7, secondaryValAxis: true, secondaryCatAxis: true } },
], Object.assign({}, axis, { x: 0.5, y: 1.4, w: 8.6, h: 5.4, showTitle: true, title: "Primary delay reason, baseline", showLegend: true, legendPos: "t",
  valAxes: [{ showValAxisTitle: true, valAxisTitle: "Requisitions", valAxisMinVal: 0, valAxisLabelColor: HX.accent6, valGridLine: { color: "DDE4E7", size: 0.5 } }, { showValAxisTitle: true, valAxisTitle: "Cumulative %", valAxisMinVal: 0, valAxisMaxVal: 100, valAxisLabelColor: HX.accent6, valGridLine: { style: "none" } }],
  catAxes: [{ catAxisTitle: "" }, { catAxisHidden: true }], catAxisLabelFontSize: 9 }));
par.slice(0, 3).forEach((p, i) => {
  card(s, 9.4, 1.45 + i * 1.75, 3.43, 1.55, i === 0 ? C.text2 : C.background2, "vital");
  txt(s, pct(p.pct), { x: 9.6, y: 1.55 + i * 1.75, w: 3.0, h: 0.7, fontSize: 32, bold: true, fontFace: THEME.headFontFace, color: i === 0 ? C.accent2 : C.text2 });
  txt(s, p.reason, { x: 9.6, y: 2.25 + i * 1.75, w: 3.1, h: 0.65, fontSize: 13, color: i === 0 ? C.background1 : C.text1 });
});

s = slide("5-Why: both top causes end in governance gaps", "A", "Analyze", "5-Why run at the Gemba with recruiters and two HMs, verified against ATS logs. Both chains end in governance, not individual behaviour: no standard, no measure, no consequence.");
const why = [
  ["HM feedback delay (36.7%)", ["Feedback arrives 4–7 days after interviews", "HMs batch feedback around other priorities", "No visible deadline or reminder in the ATS", "Feedback timeliness is not measured or reported", "No interview-process standard owned by BU leadership"]],
  ["Requisition approval delay (22.8%)", ["Reqs wait 5–12 days for sign-off", "3–4 sequential approvers per req", "Each req re-justified despite annual headcount plan", "Plan and req approval live in separate systems", "No delegated authority for in-plan, in-budget roles"]],
];
why.forEach(([h, ws_], c) => {
  const x = 0.5 + c * 6.3;
  card(s, x, 1.45, 6.03, 0.6, C.accent3, "why-h");
  txt(s, h, { x: x + 0.2, y: 1.45, w: 5.6, h: 0.6, fontSize: 16, bold: true, valign: "middle", color: C.background1 });
  ws_.forEach((w_, k) => {
    const y = 2.2 + k * 0.92, last = k === 4;
    card(s, x, y, 6.03, 0.8, last ? C.text2 : C.background2, "why");
    txt(s, `Why ${k + 1}`, { x: x + 0.2, y, w: 0.9, h: 0.8, fontSize: 12, bold: true, valign: "middle", color: last ? C.accent2 : C.accent1 });
    txt(s, w_, { x: x + 1.15, y, w: 4.7, h: 0.8, fontSize: 13, valign: "middle", bold: last, color: last ? C.background1 : C.text1 });
  });
});

// ======================= IMPROVE
pres.addSection({ title: "Improve" });
s = slide("Workshop ideas, grouped by Lean intervention type", "I", "Improve", "Two-hour cross-functional workshop: 4 recruiters, 2 sourcers, 2 coordinators, 3 hiring managers, 1 HRBP, Finance BP. Silent brainstorm, affinity grouping, then dot-voting on impact and control. 31 ideas came in; these 10 survived.");
const ideas = [
  ["Poka-yoke", "Error-proofing", ["ATS blocks next round until scorecard submitted", "Auto-reminder at 24h, escalate to HM's manager at 48h"]],
  ["Jidoka", "Stop & fix at source", ["Mandatory 30-min intake meeting with signed role profile", "Auto-flag reqs > 30 days for weekly triage"]],
  ["Heijunka", "Level the load", ["Cap recruiter load at 18 open reqs; weekly rebalancing", "Pooled coordinator team for scheduling"]],
  ["Standard work", "One best way", ["Max 3 rounds (4 for senior leaders); parallel panels", "Delegated approval for in-plan, in-budget roles"]],
  ["Digitisation", "Automate the routine", ["Self-scheduling links for candidates", "Live req tracker for HMs; pre-approved offer bands"]],
];
ideas.forEach(([t, sub, its], i) => {
  const x = 0.5 + i * 2.5;
  card(s, x, 1.45, 2.3, 1.0, C.text2, "idea-h");
  txt(s, t, { x: x + 0.15, y: 1.52, w: 2.0, h: 0.45, fontSize: 17, bold: true, color: C.accent2, fontFace: THEME.headFontFace });
  txt(s, sub, { x: x + 0.15, y: 1.97, w: 2.0, h: 0.4, fontSize: 11, color: C.background1 });
  its.forEach((it, k) => { card(s, x, 2.6 + k * 2.05, 2.3, 1.9, C.background2, "idea"); txt(s, it, { x: x + 0.15, y: 2.72 + k * 2.05, w: 2.0, h: 1.7, fontSize: 13 }); });
});

s = slide("Impact vs ability to control: five quick wins", "I", "Improve", "Each idea scored 1 to 5 on impact (expected TTF days saved) and control (within TA/HR authority, cost, time). Q1 goes first in the pilot; Q2 needs sponsor support.");
const qx = 0.9, qy = 1.45, qw = 5.6, qh = 2.6;
const quads = [["Q2 · Optimise", "High impact · low control", C.background2, 0, 0], ["Q1 · Focus: quick wins", "High impact · high control", C.accent1, 1, 0], ["Q4 · Drop", "Low impact · low control", C.background2, 0, 1], ["Q3 · Secondary", "Low impact · high control", C.background2, 1, 1]];
quads.forEach(([t, sub, fill, cx, cy]) => {
  const x = qx + cx * (qw + 0.15), y = qy + cy * (qh + 0.15);
  card(s, x, y, qw, qh, fill, "quad");
  txt(s, t, { x: x + 0.2, y: y + 0.12, w: qw - 0.4, h: 0.35, fontSize: 15, bold: true, color: fill === C.accent1 ? C.background1 : C.text2 });
  txt(s, sub, { x: x + 0.2, y: y + 0.45, w: qw - 0.4, h: 0.3, fontSize: 11, color: fill === C.accent1 ? "D7F0F0" : C.accent6 });
});
const qItems = { "1,0": ["Scorecard gate + 24/48h reminders", "Max 3 rounds, parallel panels", "Recruiter load cap + rebalancing", "Self-scheduling links", "Intake meeting standard"],
  "0,0": ["Delegated approval for in-plan roles", "Pre-approved offer bands", "48h SLA in HM objectives"], "1,1": ["Weekly >30-day triage", "Live req tracker for HMs"], "0,1": ["New ATS platform", "Hire more coordinators"] };
Object.entries(qItems).forEach(([k, its]) => {
  const [cx, cy] = k.split(",").map(Number), x = qx + cx * (qw + 0.15), y = qy + cy * (qh + 0.15);
  bullets(s, its, { x: x + 0.2, y: y + 0.82, w: qw - 0.4, h: qh - 0.9, fontSize: 13, color: cx === 1 && cy === 0 ? C.background1 : C.text1 });
});
txt(s, "Impact ↑", { x: 0.2, y: 2.4, w: 0.6, h: 0.6, fontSize: 11, color: C.accent6, rotate: 270 });
txt(s, "Ability to control →", { x: 5.5, y: 6.85, w: 3, h: 0.25, fontSize: 11, color: C.accent6, align: "center" });

s = slide("Cost-benefit: €84k in year one, payback in weeks", "I", "Improve", "Costs are first-year estimates. Benefits are TTF days saved (regression and pilot) times €450 per day times affected hires. Treat benefits as notional cost avoidance until Finance validates the cost of vacancy.");
table(s, ["Solution", "One-off cost", "Run cost / yr", "Difficulty", "Days saved / req", "Annual benefit", "Intangibles"], [
  ["Scorecard gate + reminders (ATS config)", "€18k", "€2k", "Low", "6–9", "€3.2–4.9M", "Candidate experience"],
  ["Max 3 rounds, parallel panels", "€4k (training)", "–", "Medium (culture)", "8–10", "€4.3–5.4M", "HM time freed"],
  ["Delegated approval, in-plan roles", "€6k (policy)", "–", "Medium (Finance)", "4–6", "€2.2–3.2M", "Fewer escalations"],
  ["Recruiter load cap + rebalancing", "€0", "€38k (0.5 FTE flex)", "Low", "3–5", "€1.6–2.7M", "Recruiter wellbeing"],
  ["Self-scheduling links", "€10k", "€6k", "Low", "2–3", "€1.1–1.6M", "Coordinator capacity"],
  ["Pre-approved offer bands", "€0", "–", "Medium", "1–2", "€0.5–1.1M", "Offer acceptance ↑"],
  [{ text: "Total (overlap-adjusted)", options: { bold: true, fontSize: 12, color: C.background1, fill: { color: C.accent1 } } }, ...["€38k", "€46k", "", "≈ 26", `€${(R.financial.annual_cov_avoided / 1e6).toFixed(1)}M`, ""].map(t => ({ text: t, options: { bold: true, fontSize: 12, color: C.background1, fill: { color: C.accent1 } } }))],
], { colW: [3.4, 1.4, 1.6, 1.6, 1.4, 1.4, 1.53], rowH: 0.55, fontSize: 12 });
txt(s, "Days saved overlap: savings are not additive; the total uses the pilot's observed mean reduction.", { x: 0.5, y: 6.2, w: 12.3, h: 0.5, fontSize: 12, italic: true, color: C.accent6 });

s = slide("FMEA on the to-be process: top risks now controlled", "I", "Improve", "RPN = Severity × Occurrence × Detection, each 1–10. Action threshold: RPN ≥ 120 or Severity ≥ 9. Revised RPN after controls installed.");
const fm = [
  ["Scorecard gate", "HMs submit low-quality 'tick-box' feedback", "Poor hiring decisions", 8, 5, 6, "Mandatory competency ratings + comment; quarterly calibration", 8, 2, 3],
  ["3-round cap", "Senior roles under-assessed", "Mis-hire at leadership level", 9, 3, 5, "Exception path: 4th round with HRBP approval", 9, 2, 3],
  ["Delegated approval", "Out-of-plan roles slip through", "Budget overrun", 7, 4, 5, "System check vs headcount plan; monthly Finance audit", 7, 2, 2],
  ["Load cap", "Overflow reqs queue unassigned", "TTF rises for overflow", 6, 5, 4, "Weekly rebalance; flex sourcer pool trigger at 90% capacity", 6, 2, 3],
  ["Reminders", "Alert fatigue; HMs ignore emails", "SLA breaches return", 6, 6, 5, "Escalate to HM's manager at 48h; Teams nudge; weekly SLA board", 6, 3, 2],
  ["Self-scheduling", "Candidates book wrong slot/panel", "Rescheduling rework", 4, 4, 3, "Panel-linked calendars; confirmation step", 4, 2, 2],
];
const rpnCell = (v) => ({ text: String(v), options: { bold: true, fontSize: 11, align: "center", color: v >= 120 ? C.background1 : C.text1, fill: { color: v >= 120 ? C.accent3 : (v >= 60 ? "F6E3A8" : "DDEFE5") } } });
table(s, ["Step", "Failure mode", "Effect", "S", "O", "D", "RPN", "Control installed", "S", "O", "D", "RPN"],
  fm.map((r, i) => { const z = i % 2 ? C.background2 : C.background1; const c = t => ({ text: String(t), options: { fontSize: 11, color: C.text1, fill: { color: z } } });
    return [c(r[0]), c(r[1]), c(r[2]), c(r[3]), c(r[4]), c(r[5]), rpnCell(r[3] * r[4] * r[5]), c(r[6]), c(r[7]), c(r[8]), c(r[9]), rpnCell(r[7] * r[8] * r[9])]; }),
  { colW: [1.3, 2.25, 1.8, 0.4, 0.4, 0.4, 0.6, 3.38, 0.4, 0.4, 0.4, 0.6], rowH: 0.7 });

s = slide("To-be process: parallel, gated, measured", "I", "Improve", "Swimlane of the to-be process. Gates (amber) are the poka-yoke points where the ATS stops the flow until the standard is met. Target lead time 30 to 35 days.");
const lanes = ["Hiring manager", "Recruiter", "Coordinator / ATS", "Finance / HRBP"];
lanes.forEach((l, i) => {
  s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 1.45 + i * 1.33, w: 12.33, h: 1.2, rectRadius: 0.08, fill: { color: i % 2 ? C.background1 : C.background2 }, line: { color: "DDE4E7", width: 0.75 } });
  txt(s, l, { x: 0.65, y: 1.45 + i * 1.33, w: 1.5, h: 1.2, fontSize: 12, bold: true, valign: "middle", color: C.text2 });
});
const BW = 1.35, X = [2.15, 3.7, 5.25, 6.8, 8.35, 9.9, 11.45, 11.45];
const steps = [[0, "Raise req from plan", false], [3, "Auto-approve if in plan & budget", true], [1, "Intake meeting, signed profile", true],
  [1, "Source & screen (load ≤ 18)", false], [2, "Self-scheduled parallel panels", false], [0, "Scorecard ≤ 48h (gate)", true],
  [3, "Offer within pre-approved band", true], [1, "Offer & accept", false]];
const LY = l => 1.6 + l * 1.33;
steps.forEach(([lane, t, gate], k) => {
  const x = X[k], y = LY(lane);
  s.addShape(pres.ShapeType.roundRect, { x, y, w: BW, h: 0.9, rectRadius: 0.08, fill: { color: gate ? C.accent2 : C.accent1 }, line: { color: gate ? C.accent2 : C.accent1, width: 0 }, objectName: "step-" + k });
  txt(s, t, { x: x + 0.06, y, w: BW - 0.12, h: 0.9, fontSize: 11, bold: true, align: "center", valign: "middle", color: gate ? C.text1 : C.background1 });
});
for (let k = 0; k < 6; k++) {
  const x1 = X[k] + BW, x2 = X[k + 1], y1 = LY(steps[k][0]) + 0.45, y2 = LY(steps[k + 1][0]) + 0.45;
  s.addShape(pres.ShapeType.line, { x: x1, y: Math.min(y1, y2), w: x2 - x1, h: Math.max(0.001, Math.abs(y2 - y1)), flipV: y2 < y1, line: { color: C.accent6, width: 1.25, endArrowType: "triangle" } });
}
s.addShape(pres.ShapeType.line, { x: X[6] + BW / 2, y: LY(1) + 0.9, w: 0, h: LY(3) - LY(1) - 0.9, flipV: true, line: { color: C.accent6, width: 1.25, endArrowType: "triangle" } });
txt(s, "Amber = ATS gate / poka-yoke    Teal = process step", { x: 0.5, y: 6.75, w: 8, h: 0.25, fontSize: 11, color: C.accent6 });

// ======================= CONTROL
pres.addSection({ title: "Control" });
const hi = histo(imp);
s = slide("Pilot result: median down 24 days, spread down 62%", "C", "Control", `Before vs after: Mann-Whitney one-sided p ${pfmt(R.before_after.mw_p)}; Mood's median p ${pfmt(R.before_after.mood_p)}; Levene p ${pfmt(R.before_after.levene_p)} so variance also fell (SD ${f1(B.sd)} → ${f1(I.sd)}). Caveat: pilot ran in a different season; keep monitoring through Q1 for seasonality.`);
const binsCut = bins.filter(b => b < 120);
s.addChart(pres.charts.BAR, [
  { name: `Baseline (n=${B.n})`, labels: binsCut.map(String), values: binsCut.map(b => +(hb[bins.indexOf(b)] / B.n * 100).toFixed(1)) },
  { name: `Pilot (n=${I.n})`, labels: binsCut.map(String), values: binsCut.map(b => +(hi[bins.indexOf(b)] / I.n * 100).toFixed(1)) },
], Object.assign({}, axis, { x: 0.5, y: 1.4, w: 7.8, h: 5.4, barDir: "col", barGrouping: "clustered", barGapWidthPct: 30, chartColors: [HX.accent4, HX.accent1],
  showTitle: true, title: "TTF distribution, % of requisitions per 5-day bin", showLegend: true, legendPos: "t", showCatAxisTitle: true, catAxisTitle: "TTF days (bin start)", catAxisTitleColor: HX.accent6, catAxisTitleFontSize: 11 }));
const ba = [["Median", f1(B.median), f1(I.median), "d"], ["IQR", `${f0(B.q1)}–${f0(B.q3)}`, `${f0(I.q1)}–${f0(I.q3)}`, "d"], ["% > 45 d", pct(B.pct_over_usl), pct(I.pct_over_usl), ""], ["Ppk (pct.)", B.ppk_percentile.toFixed(2), I.ppk_percentile.toFixed(2), ""], ["Z-bench", B.z_bench.toFixed(2), I.z_bench.toFixed(2), ""], ["Offer accept", pct(R.accept_rate.baseline), pct(R.accept_rate.improve), ""]];
table(s, ["Metric", "Before", "After"], ba.map(r => [r[0], r[1], r[2]]), { x: 8.6, y: 1.45, w: 4.23, colW: [1.6, 1.3, 1.33], rowH: 0.45, fontSize: 12 });
card(s, 8.6, 4.85, 4.23, 1.95, C.background2, "tests");
txt(s, "Significance", { x: 8.8, y: 4.95, w: 3.9, h: 0.35, fontSize: 14, bold: true, color: C.text2 });
bullets(s, [`Mann-Whitney p ${pfmt(R.before_after.mw_p)}`, `Mood's median p ${pfmt(R.before_after.mood_p)}`, `Levene (variance) p ${pfmt(R.before_after.levene_p)}`], { x: 8.8, y: 5.32, w: 3.9, h: 1.4, fontSize: 13 });

// Staged I-chart
s = slide("Staged I-chart: new limits lock in the gain", "C", "Control", `Limits recalculated at the phase change. Baseline: mean ${f1(B.imr.xbar)}, UCL ${f1(B.imr.ucl)}. Pilot: mean ${f1(I.imr.xbar)}, UCL ${f1(I.imr.ucl)}, LCL ${f1(I.imr.lcl)}. Out-of-control rules: 1 point beyond 3σ; 8 in a row above CL; 6 rising in a row; 2 of 3 beyond 2σ.`);
const all = base.concat(imp), lab = all.map((_, i) => String(i + 1));
const stage = (fb, fi) => all.map((d, i) => +(i < B.n ? fb : fi).toFixed(1));
s.addChart(pres.charts.LINE, [
  { name: "TTF", labels: lab, values: all.map(d => +d.ttf_days) },
  { name: "UCL", labels: lab, values: stage(B.imr.ucl, I.imr.ucl) },
  { name: "Mean", labels: lab, values: stage(B.imr.xbar, I.imr.xbar) },
  { name: "LCL", labels: lab, values: stage(B.imr.lcl, I.imr.lcl) },
], Object.assign({}, axis, { x: 0.5, y: 1.4, w: 12.33, h: 4.3, chartColors: [HX.accent4, HX.accent3, HX.dk2, HX.accent3], lineSize: 1.25, lineDataSymbol: "none",
  showTitle: true, title: "Individuals chart, TTF days, staged at pilot start (req #181)", showLegend: true, legendPos: "t", catAxisLabelFrequency: 30, valAxisMinVal: 0 }));
const rules = [["Rule 1", "1 point beyond UCL/LCL", "Recruiter lead investigates within 48h"], ["Rule 2", "8 consecutive points above mean", "TA Ops lead runs root cause in weekly review"], ["Rule 3", "% > 45 days exceeds 10% in a month", "Escalate to sponsor; re-open FMEA"]];
rules.forEach((r, i) => { card(s, 0.5 + i * 4.18, 5.85, 3.97, 0.95, C.background2, "rule"); txt(s, r[0] + " · " + r[1], { x: 0.7 + i * 4.18, y: 5.92, w: 3.6, h: 0.35, fontSize: 12, bold: true, color: C.accent3 }); txt(s, r[2], { x: 0.7 + i * 4.18, y: 6.28, w: 3.6, h: 0.45, fontSize: 12 }); });

s = slide("Process control plan", "C", "Control", "The control plan is the hand-off document. Each metric has an owner, a frequency and a reaction plan. The dashboard provides the I-chart and the weekly defect rate.");
table(s, ["Metric", "Spec / target", "Method", "Frequency · sample", "Owner", "Reaction plan"], [
  ["TTF days", `USL ${USL} d · median ≤ ${R.spec.target} d`, "Staged I-MR chart (dashboard)", "Weekly, all filled reqs", "TA Ops Lead", "Rules 1–3 → root cause, escalate to sponsor"],
  ["% reqs > 45 d", "≤ 10% / month", "p-chart", "Monthly", "TA Ops Lead", "> 10%: re-open FMEA, BU deep dive"],
  ["Feedback lag", "≤ 2 working days", "ATS SLA report", "Daily alerts; weekly %", "Coordinators / HMs", "Auto-escalate at 48h; weekly HM league table"],
  ["Interview rounds", "≤ 3 (4 senior)", "ATS rule + exception log", "Per req", "Recruitment Leads", "Exception needs HRBP approval"],
  ["Approval days", "≤ 2 days", "Workflow timestamp", "Weekly", "Finance BP / HRBP", "> 5 days: sponsor escalation"],
  ["Recruiter load", "15–18 open reqs", "ATS snapshot", "Weekly", "TA Ops Lead", "Rebalance; trigger flex sourcer"],
  ["Offer acceptance", "≥ 85%", "ATS", "Monthly", "Recruitment Leads", "< 85%: decline-reason Pareto"],
  ["Delay-reason MSA", "≥ 90% agreement", "Attribute agreement (kit tab 6)", "Every 6 months", "Black Belt / TA Ops", "Retrain, refine definitions"],
], { colW: [1.7, 2.1, 2.3, 2.0, 1.8, 2.43], rowH: 0.52, fontSize: 11 });

s = slide("Financial realisation and sign-off", "C", "Control", "Separate hard savings from cost avoidance. Agency fee reduction and overtime are P&L savings that Finance can see; cost of vacancy is notional. Sponsor signs only when Finance has validated the method.");
stat(s, 0.5, 1.45, 3.0, `€${(R.financial.annual_cov_avoided / 1e6).toFixed(1)}M`, "Cost of vacancy avoided", "Notional · €450/day assumed", C.accent1);
stat(s, 3.7, 1.45, 3.0, "€0.4M", "Hard savings (est.)", "Agency fees + overtime cover");
stat(s, 6.9, 1.45, 3.0, "€84k", "Year-1 cost", "€38k one-off + €46k run");
stat(s, 10.1, 1.45, 2.73, "< 1 mo", "Payback", "On hard savings alone");
table(s, ["Sign-off item", "Owner", "Status"], [
  ["Statistical proof of improvement (p < 0.05)", "Black Belt", "Ready"],
  ["Control plan accepted by process owner", "TA Ops Lead", "Pending"],
  ["Finance validation of savings method", "Finance BP", "Pending: needs CoV rate"],
  ["SOPs published and teams trained", "Recruitment Leads", "In progress"],
  ["Sponsor sign-off and project close", "TA Head", "Target Nov 13"],
], { x: 0.5, y: 3.6, w: 12.33, colW: [6.0, 3.0, 3.33], rowH: 0.5, fontSize: 12 });

// Closing
pres.addSection({ title: "Next steps" });
s = pres.addSlide({ masterName: "DARK", sectionTitle: "Next steps" });
s.addText("Replace the illustrative data with yours", { placeholder: "title" });
s.addText("Three files make this repeatable for your team", { placeholder: "body" });
const nx = [["1 · Data Collection Kit (.xlsx)", "Requisition log with dropdowns, stage timestamps, feedback lag, VOC surveys, MSA, missing-info questionnaire, data-gap plan"],
  ["2 · Live dashboard", "Paste or import the requisition log; every statistic on these slides recalculates. Edit specs, rows and phases in place"],
  ["3 · This deck", "Re-run the build script on your results to refresh every chart and number"]];
nx.forEach((n, i) => { card(s, 0.8 + i * 4.0, 5.0, 3.75, 1.75, "2A4C61", "next"); txt(s, n[0], { x: 1.0 + i * 4.0, y: 5.12, w: 3.4, h: 0.4, fontSize: 15, bold: true, color: C.accent2 }); txt(s, n[1], { x: 1.0 + i * 4.0, y: 5.55, w: 3.4, h: 1.1, fontSize: 12, color: C.background1 }); });
s.addNotes("Close by asking the sponsor to assign owners for the 18 questions in the Missing Information Questionnaire, with due dates within two weeks.");

(async () => {
  const out = path.join(ROOT, "TTF_DMAIC_Black_Belt_Project.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("wrote", out);
})();
