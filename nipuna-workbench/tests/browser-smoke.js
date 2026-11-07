// Drives the built page in Chromium. CDN scripts are served from local node_modules (this container cannot reach the CDNs).
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const DIST = path.join(root, "dist");
const PROPOSAL = process.env.PROPOSAL_PDF; // a real or synthetic PDF to upload; required
if (!PROPOSAL) { console.error("Set PROPOSAL_PDF to a PDF to upload."); process.exit(2); }
const SHOTS = process.argv[2] || path.join(root, "tests");
const MAP = {
  "react.production.min.js": "node_modules/react/umd/react.production.min.js",
  "react-dom.production.min.js": "node_modules/react-dom/umd/react-dom.production.min.js",
  "htm.umd.js": "node_modules/htm/dist/htm.umd.js",
  "pdf.worker.min.js": "node_modules/pdfjs-dist/build/pdf.worker.min.js",
  "pdf.min.js": "node_modules/pdfjs-dist/build/pdf.min.js",
  "mammoth.browser.min.js": "node_modules/mammoth/mammoth.browser.min.js",
  "index.umd.js": "node_modules/docx/build/index.umd.js",
};
(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(DIST, decodeURIComponent(req.url.split("?")[0]) === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(p);
    if (p.endsWith("index.html")) body = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + body + "</body></html>";
    res.writeHead(200, { "content-type": p.endsWith(".json") ? "application/json" : "text/html; charset=utf-8" }); res.end(body);
  }).listen(0);
  const url = "http://127.0.0.1:" + server.address().port + "/";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  const failed = [];
  page.on("requestfailed", (r) => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) failed.push(r.url()); });
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (route) => {
    const f = Object.keys(MAP).find((k) => route.request().url().endsWith(k));
    if (!f) return route.abort();
    route.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(root, MAP[f])) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const log = [];
  const step = (s) => { log.push(s); console.log("✓ " + s); };
  await page.goto(url);
  await page.getByRole("heading", { name: "Proposal Review Workbench" }).waitFor();
  step("Home renders; storage: " + (await page.locator(".privacy li").nth(1).innerText()));
  await page.screenshot({ path: path.join(SHOTS, "shot-home.png") });

  // New case → upload the real proposal PDF
  await page.getByRole("button", { name: "Empty case" }).click();
  await page.locator(".stages").getByRole("button", { name: new RegExp("^B ") }).click();
  await page.setInputFiles("#doc-files", PROPOSAL);
  await page.locator(".doc").first().waitFor({ timeout: 60000 });
  const docText = await page.locator(".doc").first().innerText();
  if (!/Partly extracted/.test(docText) || !/p\.1: no usable text layer/.test(docText)) throw new Error("PDF warnings missing:\n" + docText);
  step("PDF uploaded in-browser: 'Partly extracted', p.1 OCR warning shown" + (/embedded images/.test(docText) ? ", image pages flagged" : ""));
  await page.getByRole("button", { name: "View text" }).click();
  await page.locator(".viewer .unit").nth(10).waitFor();
  step("Evidence viewer lists " + (await page.locator(".viewer .unit").count()) + " page units");
  await page.getByRole("button", { name: "Close viewer" }).click();
  await page.locator(".stages").getByRole("button", { name: new RegExp("^C ") }).click();
  const ai = await page.locator(".ai").first().innerText();
  if (!/Claude not available in this view/.test(ai)) throw new Error("AI availability message missing");
  step("Facts stage: Claude unavailable outside claude.ai → manual copy/paste route offered");
  await page.locator(".stages").getByRole("button", { name: new RegExp("^G ") }).click();
  await page.getByRole("button", { name: "Download report for KDEM (Word .docx)" }).click();
  await page.locator(".toast", { hasText: "File saving is not available" }).waitFor();
  step("Export outside claude.ai → 'File saving is not available in this view…' (no fake download)");
  await page.getByRole("button", { name: "Preview report" }).click();
  await page.locator(".doc-preview").waitFor({ timeout: 30000 });
  step("Report preview built from a real in-browser .docx: " + (await page.locator(".doc-preview p").first().innerText()));
  const size = await page.evaluate(async () => (await docx.Packer.toBlob(NWBReport.buildReport(docx, NWB, NWB.makeSyntheticDemo()))).size);
  step("docx.Packer.toBlob in browser produced " + size + " bytes");

  // Prepared case (needs private/prepared.case.json at build time)
  await page.getByRole("button", { name: "All cases" }).click();
  await page.getByRole("button", { name: "Open the prepared case" }).click();
  await page.getByText("Readiness warning").first().waitFor();
  step("Prepared case loaded; readiness warning visible");
  await page.locator(".stages").getByRole("button", { name: new RegExp("^E ") }).click();
  await page.locator(".scorecard").first().waitFor();
  const comp = await page.locator(".composite .num").innerText();
  step("Composite shown: " + comp);
  await page.screenshot({ path: path.join(SHOTS, "shot-review.png"), fullPage: false });
  // Override test through the UI
  const card = page.locator(".scorecard").first();
  await card.getByLabel(/Advisor score for/).fill("3.5");
  await card.getByRole("button", { name: "Apply score" }).click();
  await page.locator(".toast").waitFor();
  const t1 = await page.locator(".toast").innerText();
  await card.getByLabel("Reason for change").fill("Reviewed curriculum annex");
  await card.getByRole("button", { name: "Apply score" }).click();
  const expected = (Number(comp) + 0.25).toFixed(2); // first criterion moves from its draft to 3.50 — only valid when the draft is 2.50
  await page.waitForFunction((v) => document.querySelector(".composite .num").textContent.trim() === v, expected);
  step("UI override: without reason → '" + t1.replace("×", "").trim().slice(0, 60) + "…'; with reason → composite " + expected);
  await page.locator(".stages").getByRole("button", { name: new RegExp("^D ") }).click();
  await page.screenshot({ path: path.join(SHOTS, "shot-analyse.png"), fullPage: false });
  await page.locator(".stages").getByRole("button", { name: new RegExp("^F ") }).click();
  await page.locator("fieldset.outcomes").waitFor();
  step("Decision stage: outcome '" + (await page.locator("fieldset.outcomes input:checked").evaluate((e) => e.value)) + "'");
  await page.locator(".stages").getByRole("button", { name: new RegExp("^G ") }).click();
  await page.getByRole("button", { name: "Preview report" }).click();
  await page.locator(".doc-preview").waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(SHOTS, "shot-report.png"), fullPage: false });
  step("Prepared-case report preview rendered");
  // Phone width
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  step("Phone width 390px: horizontal overflow " + overflow + "px");
  await page.screenshot({ path: path.join(SHOTS, "shot-phone.png") });
  await browser.close(); server.close();
  failed.forEach((u) => errors.push("request failed: " + u));
  if (errors.length) { console.log("Console errors:\n" + errors.join("\n")); process.exit(1); }
  console.log("No console errors.");
})().catch((e) => { console.error("SMOKE FAILED: " + e.message); process.exit(1); });
