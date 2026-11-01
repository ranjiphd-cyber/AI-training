// Executive DMAIC deck generated from ONE results bundle (same source as the dashboard).
//   node generators/build_deck.js <results.json> <out.pptx>
// Colour is used only for status and for the one data point that matters on a slide.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const SKILL = process.env.PPTX_SKILL_DIR;
let applyTheme = null;
try { applyTheme = require(path.join(SKILL || "", "scripts/apply_theme.js")).applyTheme; } catch (e) { applyTheme = null; }

const [, , bundlePath, outPath] = process.argv;
const B = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const P = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config", "palette.json"), "utf8"));
const hx = (h) => h.replace("#", "").toUpperCase();

const INK = hx(P.neutral.ink), SOFT = hx(P.neutral.ink_soft), RULE = hx(P.neutral.rule);
const CORAL = hx(P.brand.coral), PEACH = hx(P.brand.peach), CREAM = hx(P.brand.cream), SAGE = hx(P.brand.sage);
const CORAL_D = hx(P.derived_for_contrast.coral_deep), GREY = "8A8378", LIGHTGREY = "B9B1A3";
const THEME = {
  name: "Six Sigma Workspace", headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: { dk1: INK, lt1: "FFFFFF", dk2: SOFT, lt2: CREAM, accent1: CORAL_D, accent2: CORAL, accent3: PEACH,
            accent4: SAGE, accent5: hx(P.derived_for_contrast.sage_deep), accent6: hx(P.derived_for_contrast.peach_deep),
            hlink: CORAL_D, folHlink: SOFT },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = `${B.config.project_id} executive update`;
pres.company = "Six Sigma Workspace";


const K = Object.fromEntries(B.kpis.map((k) => [k.kpi_id, k]));
const f1 = (v) => (v === null || v === undefined ? "–" : Number(v).toFixed(1));
const footer = `${B.config.project_id}  ·  results ${B.version} (${B.status})  ·  document: Draft – pending approval${B.synthetic ? "  ·  SYNTHETIC DEMONSTRATION DATA" : ""}`;
const STAGES = ["Define", "Measure", "Analyze", "Improve", "Control"];

// ---------- layouts
pres.defineSlideMaster({
  title: "TITLE", background: { color: CREAM },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.5, w: 8.8, h: 1.3, fontSize: 32, bold: true, color: INK, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.95, w: 8.8, h: 0.8, fontSize: 16, color: SOFT, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: "FFFFFF" },
  margin: [0.5, 0.5, 0.6, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.42, w: 9.0, h: 0.75, fontSize: 22, bold: true, color: INK, valign: "top", align: "left", margin: 0 }, text: "" } },
    { text: { text: footer, options: { x: 0.5, y: 5.2, w: 7.6, h: 0.25, fontSize: 8, color: SOFT, margin: 0 } } },
  ],
  slideNumber: { x: 9.1, y: 5.2, w: 0.4, h: 0.25, fontSize: 8, color: SOFT, align: "right" },
});

// ---------- helpers
let sectionName = null;
function slide(title, section, phase) {
  if (section !== sectionName) { pres.addSection({ title: section }); sectionName = section; }
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  phaseMarker(s, phase);
  return s;
}
function phaseMarker(s, phase) {
  const cur = STAGES.indexOf(B.config.dmaic_stage);
  STAGES.forEach((st, i) => {
    const isPhase = st === phase;
    s.addText(st[0], {
      x: 7.95 + i * 0.31, y: 0.12, w: 0.27, h: 0.22, fontSize: 8, bold: isPhase, align: "center", valign: "middle", margin: 0,
      color: i <= cur ? INK : LIGHTGREY, fill: { color: isPhase ? PEACH : "FFFFFF" }, line: { color: i <= cur ? GREY : RULE, width: 0.5 },
      isTextBox: true, objectName: `phase-${st}`,
    });
  });
}
function source(s, text) {
  s.addText(text, { x: 0.5, y: 4.92, w: 9, h: 0.25, fontSize: 8, italic: true, color: SOFT, margin: 0, isTextBox: true, objectName: "source" });
}
function chip(s, text, kind, x, y, w = 1.9) {
  const fill = { ok: SAGE, warn: PEACH, bad: CORAL, na: CREAM }[kind] || CREAM;
  s.addText(text, { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.08, x, y, w, h: 0.26, fontSize: 9, bold: true, color: INK,
    fill: { color: fill }, line: { color: kind === "na" ? RULE : fill, width: 0.5 }, align: "center", valign: "middle", margin: 0, objectName: "status" });
}
function stat(s, value, unit, label, x, y, w, emphasis = false) {
  s.addText([{ text: value, options: { fontSize: 34, bold: true, color: emphasis ? CORAL_D : INK } },
             { text: " " + unit, options: { fontSize: 14, color: SOFT } }],
    { x, y, w, h: 0.62, margin: 0, valign: "bottom", isTextBox: true, objectName: "stat" });
  s.addText(label, { x, y: y + 0.66, w, h: 0.5, fontSize: 10.5, color: SOFT, margin: 0, valign: "top", isTextBox: true });
}
const th = (t) => ({ text: t, options: { bold: true, color: INK, fill: { color: CREAM }, fontSize: 10 } });
const td = (t, o = {}) => ({ text: t === null || t === undefined || t === "" ? "Not assessed" : String(t), options: { fontSize: 10, color: INK, ...o } });
function table(s, rows, opts) {
  s.addTable(rows, { x: 0.5, y: 1.35, w: 9, border: { type: "solid", pt: 0.5, color: RULE }, valign: "middle", margin: 0.05, autoPage: false, ...opts });
}
const chartBase = {
  catAxisLabelColor: SOFT, valAxisLabelColor: SOFT, catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, dataLabelFontSize: 9,
  dataLabelColor: INK, valGridLine: { color: "EDE8DE", size: 0.5 }, catGridLine: { style: "none" },
  catAxisLineShow: false, valAxisLineShow: false, showLegend: false,
};

// ---------- 1 Title + document control
{
  pres.addSection({ title: "Opening" }); sectionName = "Opening";
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Opening" });
  s.addText(`${B.config.process}: ${B.config.dmaic_stage} phase review`, { placeholder: "title" });
  s.addText(`${B.config.client}  ·  ${B.config.department}  ·  data to ${B.extract_date}`, { placeholder: "body" });
  const dc = [["Document", `${B.config.project_id} executive update`], ["Owner", B.config.project_lead], ["Approver", B.config.sponsor],
    ["Version", `Results ${B.version} (dataset ${B.dataset_version})`], ["Status", "Draft – pending approval"], ["Review cadence", "At each phase gate"]];
  s.addTable(dc.map(([a, b]) => [td(a, { color: SOFT, fontSize: 9 }), td(b, { fontSize: 9 })]),
    { x: 0.6, y: 3.9, w: 5.6, colW: [1.4, 4.2], border: { type: "none" }, margin: 0.02, rowH: 0.2 });
  if (B.synthetic) chip(s, "SYNTHETIC DEMONSTRATION DATA", "warn", 6.9, 3.95, 2.5);
}

// ---------- 2 Executive summary
{
  const s = slide(`${B.outcome_label} is ${f1(K.K1.current)} ${B.unit} at the median, and one case in ten takes over ${f1(K.K3.current)} ${B.unit}`, "Executive summary", B.config.dmaic_stage);
  stat(s, f1(K.K1.current), B.unit, `Median ${B.outcome_label.toLowerCase()}\n95% CI ${K.K1.ci95.join("–")} · n = ${K.K1.n}`, 0.5, 1.35, 2.1);
  stat(s, f1(K.K3.current), B.unit, `90th percentile\nn = ${K.K3.n}`, 2.75, 1.35, 2.0, true);
  const third = K.K4 || B.kpis.find((k) => k.kind === "Process");
  if (third) stat(s, f1(third.current), third.unit, `${third.name}\nn = ${third.n}`, 4.9, 1.35, 2.2);
  s.addText("What this means", { x: 7.3, y: 1.35, w: 2.2, h: 0.3, fontSize: 11, bold: true, color: INK, margin: 0, isTextBox: true });
  s.addText([
    { text: "The baseline is measured. No target has been approved yet.", options: { bullet: true, breakLine: true } },
    { text: B.charts.pareto_longest_stage[0] ? `Most delay sits in '${B.charts.pareto_longest_stage[0].category}'.` : "Stage-level delay not yet measured.", options: { bullet: true, breakLine: true } },
    { text: "Causes are still hypotheses.", options: { bullet: true } }],
    { x: 7.3, y: 1.68, w: 2.2, h: 1.3, fontSize: 10.5, color: INK, margin: 0, paraSpaceAfter: 4, valign: "top", isTextBox: true });
  const dec = (B.registers.approvals || []).filter((a) => a.status !== "Approved");
  s.addText("Decisions requested", { x: 0.5, y: 3.0, w: 9, h: 0.3, fontSize: 12, bold: true, color: INK, margin: 0, isTextBox: true });
  table(s, [[th("ID"), th("Decision / approval"), th("Approver"), th("Status")],
    ...dec.slice(0, 4).map((a) => [td(a.id), td(a.item), td(a.approver_role), td(a.status, { fill: { color: a.status.startsWith("Requires") ? CORAL : PEACH }, bold: true })])],
    { y: 3.32, colW: [0.8, 4.6, 1.6, 2.0], rowH: 0.3 });
  source(s, `Source: ${K.K1.source}, ${K.K1.period}; completed cases only for median and P90. ${B.data_quality.exclusions.filter((e) => /scope/.test(e.rule)).map((e) => e.rule + " (" + e.rows + ")").join("; ")}`);
  s.addNotes("Open with the decision. The baseline is solid enough to agree the CTQ requirement. It is not yet solid enough for a savings case.");
}

// ---------- 3 Business case, problem, goal, scope
{
  const s = slide("The problem is defined by its measured gap; the cause and the solution are left open", "Define", "Define");
  const box = (title, body, x, y, w, h, status, kind) => {
    s.addText(title, { x, y, w: w - 2.0, h: 0.3, fontSize: 12, bold: true, color: INK, margin: 0, isTextBox: true });
    chip(s, status, kind, x + w - 1.9, y + 0.02);
    s.addText(body || "Not yet defined", { x, y: y + 0.38, w, h: h - 0.4, fontSize: 11, color: INK, margin: 0, valign: "top", isTextBox: true, fit: "shrink" });
  };
  box("Problem statement", B.config.problem_statement, 0.5, 1.35, 4.3, 1.85, "Draft – pending approval", "warn");
  box("Goal statement", B.config.goal_statement, 5.2, 1.35, 4.3, 1.85, "Target not approved", "warn");
  s.addShape(pres.shapes.LINE, { x: 0.5, y: 3.35, w: 9, h: 0, line: { color: RULE, width: 0.75 } });
  s.addText([{ text: "In scope  ", options: { bold: true } }, { text: B.config.scope || "TBC" }], { x: 0.5, y: 3.5, w: 4.3, h: 0.9, fontSize: 10.5, color: INK, margin: 0, valign: "top", isTextBox: true });
  s.addText([{ text: "Out of scope  ", options: { bold: true } }, { text: B.config.exclusions || "TBC" }], { x: 5.2, y: 3.5, w: 4.3, h: 0.9, fontSize: 10.5, color: INK, margin: 0, valign: "top", isTextBox: true });
  source(s, "VOC and VOB not yet captured. The requirement must come from customers, not from the baseline.");
}

// ---------- 4 CTQs
{
  const s = slide("Three CTQs are defined; none has an approved requirement or target yet", "Define", "Define");
  const base = { "CTQ-001": `${f1(K.K1.current)} ${B.unit} (median)`, "CTQ-002": K.K4 ? `${f1(K.K4.current)}%` : null };
  table(s, [[th("CTQ"), th("Definition"), th("Unit"), th("Direction"), th("Baseline"), th("Requirement"), th("Target status")],
    ...B.registers.ctqs.map((c) => [td(c.metric, { bold: true }), td(c.definition), td(c.unit), td(c.direction), td(base[c.id]),
      td(c.approved_requirement || "Not agreed"), td(c.target_status, { fill: { color: CREAM } })])],
    { colW: [1.35, 2.85, 0.6, 0.8, 1.2, 1.2, 1.0], fontSize: 10 });
  source(s, "Target, specification limit, control limit and historical average are kept separate. Only an approved requirement can become a specification.");
}

// ---------- 5 Process map
{
  const st = B.charts.stage_stats, names = B.process_stages, worst = B.charts.pareto_longest_stage[0];
  const s = slide(`'${worst.category}' is the longest stage in ${f1(worst.pct)}% of cases`, "Measure", "Measure");
  const w = 2.75, gap = 0.37;
  names.forEach((n, i) => {
    const x = 0.5 + i * (w + gap), hot = n === worst.category;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.45, w, h: 1.5, rectRadius: 0.06, fill: { color: hot ? PEACH : "FFFFFF" }, line: { color: hot ? PEACH : RULE, width: 1 } });
    s.addText(n, { x: x + 0.15, y: 1.55, w: w - 0.3, h: 0.3, fontSize: 12, bold: true, color: INK, margin: 0, isTextBox: true });
    s.addText([{ text: f1(st[n].median), options: { fontSize: 28, bold: true } }, { text: ` ${B.unit} median`, options: { fontSize: 11, color: SOFT } }],
      { x: x + 0.15, y: 1.9, w: w - 0.3, h: 0.55, margin: 0, color: INK, valign: "bottom", isTextBox: true });
    s.addText(`P90 ${f1(st[n].p90)}  ·  n = ${st[n].n}`, { x: x + 0.15, y: 2.5, w: w - 0.3, h: 0.3, fontSize: 10, color: SOFT, margin: 0, isTextBox: true });
    if (i < names.length - 1) s.addShape(pres.shapes.LINE, { x: x + w + 0.05, y: 2.2, w: gap - 0.1, h: 0, line: { color: GREY, width: 1.25, endArrowType: "triangle" } });
  });
  s.addChart(pres.charts.BAR, [{ name: "Share of cases", labels: B.charts.pareto_longest_stage.map((p) => p.category), values: B.charts.pareto_longest_stage.map((p) => p.pct) }],
    { ...chartBase, x: 0.5, y: 3.1, w: 5.6, h: 1.75, barDir: "bar", chartColors: [CORAL_D, GREY, GREY], showValue: true, dataLabelPosition: "outEnd",
      dataLabelFormatCode: '0"%"', valAxisHidden: true, valGridLine: { style: "none" }, catAxisOrientation: "maxMin", barGapWidthPct: 60,
      showTitle: true, title: "Longest stage per case (% of fully-timestamped cases)", titleFontSize: 10, titleColor: INK });
  s.addText("Stages without timestamps, such as approvals and interview scheduling, need a Gemba walk before the AS-IS map is complete. The SIPOC is still to be built in a workshop.",
    { x: 6.4, y: 3.25, w: 3.1, h: 1.4, fontSize: 10.5, color: INK, margin: 0, valign: "top", isTextBox: true });
  source(s, `Source: ${K.K1.source}; stage medians from cases with both timestamps; ${B.period}.`);
}

// ---------- 6 Data quality
{
  const dq = B.data_quality, rp = dq.raw_profile;
  const chron = Object.values(rp.chronology_violations).reduce((a, b) => a + b, 0);
  const s = slide("The data supports a baseline, but defects must be corrected and accuracy verified first", "Measure", "Measure");
  stat(s, String(rp.rows), "rows", "Raw extract (immutable copy kept)", 0.5, 1.35, 2.0);
  stat(s, String(rp.exact_duplicate_rows), "duplicates", "Removed and logged", 2.65, 1.35, 2.0);
  stat(s, String(chron), "chronology errors", "Excluded from durations, kept in counts", 4.8, 1.35, 2.3, true);
  stat(s, f1(K.D1.current), "%", `Cases with every stage timestamp\n(n = ${K.D1.n})`, 7.2, 1.35, 2.3);
  table(s, [[th("Measurement-quality check"), th("Method"), th("Status")],
    [td("Timestamps reflect real events"), td("Verify a random sample against source records (template 04)"), td("Not started", { fill: { color: PEACH } })],
    [td("Interview date captured consistently"), td("Missingness by business unit; ask the data owner"), td("Open question", { fill: { color: PEACH } })],
    [td("No duplicate counting"), td("Hash duplicate-upload check; de-duplicate on record ID"), td("Done – logged", { fill: { color: SAGE } })]],
    { y: 2.95, colW: [3.0, 4.4, 1.6], rowH: 0.3 });
  source(s, "Blanks are kept as missing and never treated as zero. Every transformation and exclusion is logged in the technical appendix.");
}

// ---------- 7 Baseline distribution
{
  const s = slide(`Median ${B.outcome_label.toLowerCase()} is ${f1(K.K1.current)} ${B.unit}, but the right tail is what customers notice`, "Measure", "Measure");
  const vals = B.records.filter((r) => r.outcome_days !== null).map((r) => r.outcome_days);
  const bw = 5, nb = Math.ceil(Math.max(...vals) / bw), bins = Array(nb).fill(0);
  vals.forEach((v) => bins[Math.min(nb - 1, Math.floor(v / bw))]++);
  const labels = bins.map((_, i) => `${i * bw}–${(i + 1) * bw}`);
  const colors = bins.map((_, i) => (i * bw >= K.K3.current ? CORAL_D : GREY));
  s.addChart(pres.charts.BAR, [{ name: "Cases", labels, values: bins }],
    { ...chartBase, x: 0.5, y: 1.3, w: 6.2, h: 3.5, barDir: "col", chartColors: colors, invertedColors: colors, barGapWidthPct: 25,
      showValue: false, showTitle: true, title: `Completed cases by ${B.unit} band (n = ${vals.length})`, titleFontSize: 10, titleColor: INK,
      catAxisTitle: B.unit, showCatAxisTitle: true, catAxisTitleFontSize: 9, catAxisTitleColor: SOFT });
  stat(s, f1(K.K1.current), B.unit, `Median · 95% CI ${K.K1.ci95.join("–")}`, 7.0, 1.4, 2.5);
  stat(s, f1(K.K3.current), B.unit, "90th percentile (shaded bands)", 7.0, 2.55, 2.5, true);
  stat(s, f1(K.K2.current), B.unit, `Kaplan-Meier median including ${K.K2.note ? K.K2.note.split(" ")[0] : ""} open cases`, 7.0, 3.7, 2.5);
  source(s, `Source: ${K.K1.source}, ${K.K1.period}. Mean not used as the headline because the distribution is right-skewed.`);
}

// ---------- 8 Stability
{
  const c = B.charts.imr;
  const sig = c.signals || [];
  const s = slide(sig.length ? `One week shows a special-cause signal; explain it before treating the baseline as stable` : "No special-cause signals; stability still needs process confirmation", "Measure", "Measure");
  const n = c.values.length;
  s.addChart([
    { type: pres.charts.LINE, data: [{ name: "Weekly cohort median", labels: c.labels, values: c.values }],
      options: { chartColors: [INK], lineDataSymbol: "circle", lineDataSymbolSize: 6, lineSize: 2 } },
    { type: pres.charts.LINE, data: [{ name: "UCL", labels: c.labels, values: Array(n).fill(c.ucl) }, { name: "CL", labels: c.labels, values: Array(n).fill(c.center) }, { name: "LCL", labels: c.labels, values: Array(n).fill(c.lcl) }],
      options: { chartColors: [LIGHTGREY, GREY, LIGHTGREY], lineDataSymbol: "none", lineSize: 1 } },
  ], { ...chartBase, x: 0.5, y: 1.3, w: 6.6, h: 3.5, showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: SOFT, legendFontFace: "+mn-lt",
       valAxisMinVal: Math.floor(Math.min(c.lcl, ...c.values) - 2), valAxisMaxVal: Math.ceil(Math.max(c.ucl, ...c.values) + 2),
       showTitle: true, title: `Individuals chart, ${B.unit} (mature weekly cohorts, n = ${n})`, titleFontSize: 10, titleColor: INK });
  s.addText([
    { text: `Limits: ${f1(c.lcl)} – ${f1(c.ucl)} ${B.unit}`, options: { bold: true, breakLine: true } },
    { text: "These are control limits. They are not targets or specification limits.", options: { breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: sig.length ? `Signal: ${sig.map((x) => `rule ${x.rule}, week of ${x.label}`).join("; ")}` : "No signals under rules 1–3.", options: { bold: true, color: sig.length ? CORAL_D : INK, breakLine: true } },
    { text: "Process owner to check the calendar, volume and system events for that week.", options: {} }],
    { x: 7.35, y: 1.4, w: 2.15, h: 3.2, fontSize: 10.5, color: INK, margin: 0, valign: "top", isTextBox: true });
  source(s, "Rules: R1 beyond limits; R2 eight points on one side; R3 six points trending. Having no signals does not prove the process is stable.");
}

// ---------- 9 Segmentation
{
  const lbl = (k) => (B.segment_labels || {})[k] || k.replace(/_/g, " ");
  const segs = Object.entries(B.charts.segments).filter(([, v]) => v.groups);
  if (segs.length) {
    const [key, seg] = segs.reduce((a, b) => (a[1].p <= b[1].p ? a : b));
    const groups = Object.entries(seg.groups).sort((a, b) => b[1].median - a[1].median);
    const det = seg.p < 0.05;
    const s = slide(det ? `${groups[0][0]} takes longest by ${lbl(key)}: ${f1(groups[0][1].median)} vs ${f1(groups[groups.length - 1][1].median)} ${B.unit}` : `No detectable difference by ${lbl(key)}`, "Analyze", "Analyze");
    const colors = groups.map((_, i) => (i === 0 && det ? CORAL_D : GREY));
    s.addChart(pres.charts.BAR, [{ name: "Median", labels: groups.map((g) => `${g[0]} (n=${g[1].n})`), values: groups.map((g) => g[1].median) }],
      { ...chartBase, x: 0.5, y: 1.3, w: 5.4, h: 3.0, barDir: "bar", chartColors: colors, invertedColors: colors, catAxisOrientation: "maxMin",
        showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", valAxisHidden: true, valGridLine: { style: "none" }, barGapWidthPct: 55,
        showTitle: true, title: `Median ${B.outcome_label.toLowerCase()} by ${lbl(key)} (${B.unit})`, titleFontSize: 10, titleColor: INK });
    const lines = [];
    segs.forEach(([k, v], i) => {
      const f = B.findings.find((x) => x.finding.includes(lbl(k)));
      lines.push({ text: lbl(k).replace(/^./, (c) => c.toUpperCase()), options: { bold: true, breakLine: true } });
      lines.push({ text: `${v.p_text}; effect size ε² = ${v.epsilon_squared}`, options: { breakLine: true } });
      lines.push({ text: f ? f.implication : "", options: { breakLine: i < segs.length - 1 } });
      if (i < segs.length - 1) lines.push({ text: " ", options: { breakLine: true } });
    });
    s.addText(lines, { x: 6.2, y: 1.4, w: 3.3, h: 3.2, fontSize: 10.5, color: INK, margin: 0, valign: "top", isTextBox: true, paraSpaceAfter: 2, fit: "shrink" });
    source(s, "Kruskal-Wallis test on completed cases. These are associations only, with no adjustment for case mix. Results are not attributed to teams or individuals.");
  }
}

// ---------- 10 Findings table
{
  const s = slide("Each finding carries its evidence, an owner-ready action and its limitation", "Analyze", "Analyze");
  const rows = B.findings.slice(0, 4).map((f) => [td(f.finding, { bold: true, fontSize: 9 }), td(f.implication, { fontSize: 9 }), td(f.action, { fontSize: 9 }), td(f.limitation, { fontSize: 9, color: SOFT })]);
  table(s, [[th("Finding (calculated result)"), th("Business implication"), th("Proposed action"), th("Limitation")], ...rows], { colW: [2.8, 2.2, 2.2, 1.8] });
  source(s, "Full evidence and analysis-run IDs are in the technical appendix and the dashboard, Module 7.");
}

// ---------- 11 Causal evidence
{
  const s = slide("Root causes are not yet established; the data points to where to look", "Analyze", "Analyze");
  table(s, [[th("Issue"), th("Hypothesized cause"), th("Raised by"), th("Evidence required"), th("Status")],
    ...B.registers.causes.map((c) => [td(c.issue), td(c.hypothesized_cause), td(c.contributor_role), td(c.evidence_required), td(c.status, { fill: { color: PEACH }, bold: true })])],
    { colW: [1.6, 2.2, 1.9, 2.1, 1.2] });
  s.addText([{ text: "Next: ", options: { bold: true } },
    { text: `a cross-functional workshop (silent idea generation, fishbone, Five Whys) and a Gemba walk on the '${B.charts.pareto_longest_stage[0] ? B.charts.pareto_longest_stage[0].category : "slowest"}' stage. Ideas stay as hypotheses until they are tested against data. “Human error” is not accepted as a root cause.` }],
    { x: 0.5, y: 2.55, w: 9, h: 0.8, fontSize: 11, color: INK, margin: 0, valign: "top", isTextBox: true });
  source(s, "No stakeholder input has been collected yet. Nothing on this slide reflects stakeholder views.");
}

// ---------- 12 Phases not started
{
  const s = slide("Improve, benefits and control stay pending until causes are validated", "Improve and control", B.config.dmaic_stage);
  const cards = [["Improve and pilot", "Options will be scored on impact, evidence, cost, effort, control, time to benefit and risk. Weights need approval. Every pilot needs guardrails and stop rules."],
    ["Benefits", "Will be split into forecast, pilot estimate and realized benefit, and validated by Finance. Released time is not counted as cash."],
    ["Control plan", "For each CTQ: owner, review frequency, trigger, response and escalation. The receiving process owner signs the handover."]];
  cards.forEach(([t, b], i) => {
    const x = 0.5 + i * 3.08;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 2.84, h: 2.3, rectRadius: 0.06, fill: { color: CREAM }, line: { color: CREAM } });
    s.addText(t, { x: x + 0.18, y: 1.55, w: 2.5, h: 0.3, fontSize: 13, bold: true, color: INK, margin: 0, isTextBox: true });
    chip(s, "Not started", "na", x + 0.18, 1.92, 1.2);
    s.addText(b, { x: x + 0.18, y: 2.35, w: 2.5, h: 1.8, fontSize: 10.5, color: INK, margin: 0, valign: "top", isTextBox: true });
  });
  source(s, "No before/after results or benefits are reported because no change has been made.");
}

// ---------- 13 Refresh
if (B.refresh_comparison) {
  const rc = B.refresh_comparison;
  const s = slide(`Refreshed data (${rc.to}) changes ${rc.material_kpis.length} measures materially; it is held for review, not yet promoted`, "Governance", B.config.dmaic_stage);
  const rows = rc.kpis.filter((r) => r.old !== null && r.old !== undefined).map((r) => [td((K[r.kpi_id] || {}).name || r.kpi_id), td(f1(r.old), { align: "right" }), td(f1(r.new), { align: "right" }),
    td(r.rel_change_pct !== undefined ? `${r.rel_change_pct}%` : "", { align: "right" }), td(`${r.old_n ?? ""} → ${r.new_n ?? ""}`, { align: "right" }),
    td(r.material ? "Requires review" : "No material change", { fill: { color: r.material ? CORAL : "FFFFFF" }, bold: r.material })]);
  table(s, [[th("Measure"), th("Approved"), th("Refreshed"), th("Rel. change"), th("n"), th("Assessment")], ...rows],
    { colW: [3.3, 0.95, 0.95, 1.0, 1.1, 1.7], rowH: 0.24, fontSize: 9 });
  source(s, `${rc.threshold}. Approvals flagged for revalidation: ${rc.approvals_flagged.join(", ") || "none"}. Findings needing review: ${rc.findings_requiring_review.join(", ") || "none"}.`);
}

// ---------- 14 Next actions
{
  const s = slide(`${B.registers.actions.length} actions to close the ${B.config.dmaic_stage} gate`, "Governance", B.config.dmaic_stage);
  table(s, [[th("Action"), th("Owner"), th("Proposed timing"), th("Completion evidence"), th("Status")],
    ...B.registers.actions.map((a, i) => [td(a.action, { bold: true }), td(a.owner), td(a.due),
      td(a.evidence || "TBC"), td(a.status, { fill: { color: CREAM } })])],
    { colW: [3.1, 1.4, 1.2, 2.1, 1.2], rowH: 0.36 });
  s.addText("Open questions", { x: 0.5, y: 3.25, w: 9, h: 0.3, fontSize: 12, bold: true, color: INK, margin: 0, isTextBox: true });
  s.addText(B.registers.questions.slice(0, 4).map((q, i, a) => ({ text: `${q.question} (${q.owner})`, options: { bullet: true, breakLine: i < a.length - 1 } })),
    { x: 0.5, y: 3.58, w: 9, h: 1.25, fontSize: 10.5, color: INK, margin: 0, valign: "top", paraSpaceAfter: 3, isTextBox: true });
  source(s, "Owners are roles until named people are confirmed. Timing is proposed.");
}

// ---------- 15 Technical appendix
{
  const s = slide("Technical appendix: methods, transformations and reproducibility", "Appendix", B.config.dmaic_stage);
  const env = B.analysis_runs[0].environment;
  const dq = B.data_quality;
  table(s, [[th("Item"), th("Detail")],
    [td("Observation unit"), td(B.analysis_runs[0].plan.observation_unit)],
    [td("Population"), td(`${dq.population_after_scope} in scope after exclusions; ${dq.exclusions.map((e) => `${e.rule}: ${e.rows}`).join("; ")}`)],
    [td("Transformations"), td(dq.transformations.map((t) => `${t.step} (${t.rows_removed})`).join("; "))],
    [td("Methods"), td("Median with bootstrap 95% CI; Kaplan-Meier for open cases; I-MR chart (R1–R3); Kruskal-Wallis with ε²; Wilson CI for proportions")],
    [td("Not used, and why"), td("Capability indices: no approved specification, stability not shown, distribution skewed. Mean as headline: skewed data.")],
    [td("Reproducibility"), td(`Python ${env.python}, numpy ${env.numpy}, pandas ${env.pandas}, scipy ${env.scipy}; seed ${env.seed}; results ${B.version}, hash ${B.content_hash}`)],
    [td("Analysis runs"), td(B.analysis_runs.map((r) => r.run_id).join(", "))]],
    { colW: [1.8, 7.2], fontSize: 9 });
  source(s, "Dashboard and deck are generated from the same results bundle. The reconciliation check is in dashboard Module 13.");
}

(async () => {
  await pres.writeFile({ fileName: outPath });
  let themed = false;
  if (applyTheme) { try { await applyTheme(outPath, THEME); themed = true; } catch (e) { console.warn("Theme step skipped: " + e.message.split(".")[0]); } }
  console.log(outPath + (themed ? " (theme applied)" : " (slide colours are explicit; theme name/colours not embedded)"));
})();
