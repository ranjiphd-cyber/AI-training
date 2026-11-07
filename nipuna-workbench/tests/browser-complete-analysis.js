// End-to-end: upload → "Complete the analysis" (rule-based, and with a simulated Claude) → completeness → Word download.
// The simulated Claude answer is read at run time from MOCK_CASE (a case file kept outside the repo); without it only the
// rule-based path is tested.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const root = path.join(__dirname, ".."), DIST = path.join(root, "dist");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "nwb-ca-"));
const MAP = { "react.production.min.js": "node_modules/react/umd/react.production.min.js", "react-dom.production.min.js": "node_modules/react-dom/umd/react-dom.production.min.js", "htm.umd.js": "node_modules/htm/dist/htm.umd.js", "pdf.worker.min.js": "node_modules/pdfjs-dist/build/pdf.worker.min.js", "pdf.min.js": "node_modules/pdfjs-dist/build/pdf.min.js", "mammoth.browser.min.js": "node_modules/mammoth/mammoth.browser.min.js", "index.umd.js": "node_modules/docx/build/index.umd.js" };
const PDF = process.env.PROPOSAL_PDF;
if (!PDF) { console.error("Set PROPOSAL_PDF."); process.exit(2); }
let mock = null;
if (process.env.MOCK_CASE) {
  const mc = JSON.parse(fs.readFileSync(process.env.MOCK_CASE, "utf8"));
  const docName = path.basename(PDF).replace(/^[0-9a-f]{8}-/i, "");
  const ev = (e) => ({ doc: docName, loc: e.loc, excerpt: e.excerpt });
  mock = {
    findings: mc.findings.map((f) => ({ kind: f.kind, area: f.area, title: f.title, detail: f.detail, label: f.label, severity: f.severity, evidence: (f.evidence || []).map(ev), impact: f.impact, action: f.action, party: f.party, actionStage: f.actionStage, basis: f.basis })),
    scores: Object.fromEntries(Object.entries(mc.scores).map(([k, v]) => [k, { score: v.ai.score, rationale: v.ai.rationale, insufficient: v.ai.insufficient, cites: (v.ai.cites || []).map(ev) }])),
    compliance: mc.compliance.map((r) => ({ requirement: r.requirement, category: r.category, clause: r.clause, status: r.status, evidence: r.evidence, action: r.action })),
    outcome: mc.decision.outcome, merit: mc.decision.merit, readiness: mc.decision.readinessNote, rationale: mc.decision.rationale, verificationChecklist: mc.verificationChecklist,
  };
}
(async () => {
  const server = http.createServer((req, res) => { const rel = decodeURIComponent(req.url.split("?")[0]); const p = path.join(DIST, rel === "/" ? "index.html" : rel); if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } let b = fs.readFileSync(p); if (p.endsWith("index.html")) b = "<!doctype html><html><head><meta charset=utf-8></head><body>" + b + "</body></html>"; res.writeHead(200, { "content-type": p.endsWith(".json") ? "application/json" : "text/html" }); res.end(b); }).listen(0);
  const browser = await chromium.launch();
  const errors = [];
  const step = (s) => console.log("✓ " + s);
  for (const withClaude of mock ? [false, true] : [false]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((m) => {
      window.__saved = [];
      const downloads = Object.freeze({ save: async ({ filename, data }) => { const buf = new Uint8Array(await new Blob([data]).arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]); window.__saved.push({ filename, b64: btoa(bin) }); return { status: "saved" }; } });
      const sample = m ? Object.assign(async () => ({ text: "" }), { json: async () => { await new Promise((r) => setTimeout(r, 300)); return m; } }) : null;
      window.claude = { use: async (n) => (n === "downloads" ? downloads : n === "sample" ? sample : null) };
    }, withClaude ? mock : null);
    await page.route(/cdnjs|jsdelivr/, (r) => { const f = Object.keys(MAP).find((k) => r.request().url().endsWith(k)); f ? r.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(root, MAP[f])) }) : r.abort(); });
    await page.route(/fonts\./, (r) => r.abort());
    await page.goto("http://127.0.0.1:" + server.address().port + "/");
    await page.setInputFiles("#proposal-file", PDF);
    await page.locator(".details").waitFor({ timeout: 60000 });
    const label = withClaude ? "[with simulated Claude]" : "[rule-based only]";
    if (withClaude) { await page.locator(".stages").getByRole("button", { name: /^A / }).click(); await page.locator("#case-ack").check(); await page.locator(".stages").getByRole("button", { name: /^C / }).click(); }
    else await page.locator(".complete input[type=checkbox]").uncheck().catch(() => {});
    await page.getByRole("button", { name: "Complete the analysis" }).click();
    await page.locator(".stages .stage.on", { hasText: "Findings" }).waitFor({ timeout: 30000 });
    const nFind = await page.locator("table.list tbody tr.clickable").count();
    const comp = await page.locator(".composite .num").innerText();
    step(label + " Complete the analysis → stage E: " + nFind + " findings listed (weaknesses), composite " + comp);
    await page.locator(".stages").getByRole("button", { name: /^G / }).click();
    const cmp = (await page.locator(".completeness").innerText()).replace(/\n/g, " | ");
    step(label + " completeness: " + cmp.slice(0, 260));
    await page.getByRole("button", { name: /Download report for KDEM/ }).click();
    await page.waitForFunction(() => window.__saved.length === 1);
    const saved = await page.evaluate(() => window.__saved[0]);
    const f = path.join(TMP, (withClaude ? "claude-" : "rule-") + saved.filename);
    fs.writeFileSync(f, Buffer.from(saved.b64, "base64"));
    execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", TMP, f], { stdio: "ignore" });
    const pages = /Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f.replace(/\.docx$/, ".pdf")]).toString())[1];
    const txt = execFileSync("pdftotext", [f.replace(/\.docx$/, ".pdf"), "-"]).toString();
    const has = (re) => (re.test(txt) ? "yes" : "NO");
    step(label + " downloaded Word report: " + pages + " pages; conditions table " + has(/Priority corrections and conditions/) + "; compliance rows " + has(/70% placement commitment/) + "; concerns " + has(/Areas of concern/) + "; scores " + has(/\d\.\d\d \/ 5/));
    if (process.env.KEEP) fs.copyFileSync(f, path.join(process.env.KEEP, path.basename(f)));
    await page.close();
  }
  await browser.close(); server.close();
  if (errors.length) { console.log("Page errors: " + errors.join("; ")); process.exit(1); }
  console.log("No page errors.");
})().catch((e) => { console.error("FAILED: " + e.message); process.exit(1); });
