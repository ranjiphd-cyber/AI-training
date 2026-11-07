// End-to-end: upload a proposal as Word (.docx) and as PDF from the home screen, reject legacy .doc,
// then download the report as Word through a simulated claude.ai `downloads` capability and validate the file.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const docx = require("docx");
const root = path.join(__dirname, ".."), DIST = path.join(root, "dist");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "nwb-ud-"));
const MAP = { "react.production.min.js": "node_modules/react/umd/react.production.min.js", "react-dom.production.min.js": "node_modules/react-dom/umd/react-dom.production.min.js", "htm.umd.js": "node_modules/htm/dist/htm.umd.js", "pdf.worker.min.js": "node_modules/pdfjs-dist/build/pdf.worker.min.js", "pdf.min.js": "node_modules/pdfjs-dist/build/pdf.min.js", "mammoth.browser.min.js": "node_modules/mammoth/mammoth.browser.min.js", "index.umd.js": "node_modules/docx/build/index.umd.js" };

async function syntheticDocx(file) {
  const P = (t) => new docx.Paragraph(t);
  const H = (t) => new docx.Paragraph({ text: t, heading: docx.HeadingLevel.HEADING_1 });
  const cell = (t) => new docx.TableCell({ children: [P(t)] });
  const d = new docx.Document({ sections: [{ children: [
    H("Proposal: Synthetic Coastal Digital Skills Programme"),
    P("SYNTHETIC TEST DOCUMENT — fictional applicant Example Learning Foundation."),
    H("Budget"),
    P("The total project cost is ₹60,00,000 for 300 trainees. Public funding requested is ₹24,00,000."),
    new docx.Table({ rows: [["Item", "Amount"], ["Trainers", "30,00,000"], ["Labs", "30,00,000"]].map((r) => new docx.TableRow({ children: r.map(cell) })) }),
    H("Training"),
    P("Training runs for 4 months per batch in Udupi and Mangaluru."),
  ] }] });
  fs.writeFileSync(file, await docx.Packer.toBuffer(d));
}

(async () => {
  const PDF = process.env.PROPOSAL_PDF;
  const docxFile = path.join(TMP, "Synthetic-Proposal.docx");
  await syntheticDocx(docxFile);
  const legacy = path.join(TMP, "Old-Format-Proposal.doc");
  fs.writeFileSync(legacy, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));

  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]);
    const p = path.join(DIST, rel === "/" ? "index.html" : rel);
    if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(p);
    if (p.endsWith("index.html")) body = "<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>" + body + "</body></html>";
    res.writeHead(200, { "content-type": p.endsWith(".json") ? "application/json" : "text/html; charset=utf-8" }); res.end(body);
  }).listen(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Simulated claude.ai runtime: only `downloads` is provided; it records what the page asked to save.
  await page.addInitScript(() => {
    window.__saved = [];
    window.claude = { use: async (name) => name !== "downloads" ? null : Object.freeze({
      save: async ({ filename, data }) => {
        const buf = new Uint8Array(await new Blob([data]).arrayBuffer());
        let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        window.__saved.push({ filename, b64: btoa(bin) });
        return { status: "saved" };
      } }) };
  });
  await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (route) => {
    const f = Object.keys(MAP).find((k) => route.request().url().endsWith(k));
    if (!f) return route.abort();
    route.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(root, MAP[f])) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const step = (s) => console.log("✓ " + s);
  const url = "http://127.0.0.1:" + server.address().port + "/";
  await page.goto(url);
  const upload = page.getByRole("button", { name: /Upload a proposal — PDF or Word/ });
  await upload.waitFor();

  // 1. legacy .doc → clear instruction, no case created
  await page.setInputFiles("#proposal-file", legacy);
  await page.locator(".toast", { hasText: "old Word format (.doc)" }).waitFor();
  step(".doc rejected with Save-As-.docx instruction; no case created: " + ((await page.locator(".stages").count()) === 0));

  // 2. Word proposal from the home screen
  await page.setInputFiles("#proposal-file", docxFile);
  await page.locator(".stages").waitFor();
  await page.locator(".toast", { hasText: "(Word)" }).waitFor();
  await page.locator(".stages").getByRole("button", { name: /^B / }).click();
  const docCard = await page.locator(".doc").first().innerText();
  if (!/DOCX/.test(docCard) || !/Text extracted/.test(docCard)) throw new Error("DOCX card:\n" + docCard);
  await page.getByRole("button", { name: "View text" }).click();
  const units = await page.locator(".viewer .loc").allInnerTexts();
  if (!units.some((u) => /Table 1/.test(u)) || !units.some((u) => /'Budget' ¶1/.test(u))) throw new Error("DOCX locations: " + units.join(" | "));
  step("Word proposal uploaded from home: " + units.length + " located units, e.g. " + units.filter((u) => /Table 1|Budget/.test(u)).slice(0, 2).join(" ; ") + " (no invented page numbers)");
  await page.getByRole("button", { name: "Close viewer" }).click();

  // 3. Download Word report from the top bar
  await page.getByRole("button", { name: "Download Word report" }).click();
  await page.waitForFunction(() => window.__saved.length === 1);
  let saved = await page.evaluate(() => window.__saved[0]);
  const f1 = path.join(TMP, saved.filename); fs.writeFileSync(f1, Buffer.from(saved.b64, "base64"));
  step("Top-bar download → " + saved.filename);

  // 4. PDF proposal as a second new case (if provided), then Download report for KDEM in stage G
  if (PDF) {
    await page.getByRole("button", { name: "All cases" }).click();
    await page.setInputFiles("#proposal-file", PDF);
    await page.locator(".toast", { hasText: "(PDF)" }).waitFor({ timeout: 60000 });
    step("PDF proposal uploaded from home; opened at stage C");
  }
  await page.locator(".stages").getByRole("button", { name: /^G / }).click();
  await page.getByRole("button", { name: /Download report for KDEM \(Word \.docx\)/ }).click();
  await page.waitForFunction(() => window.__saved.length === 2);
  saved = await page.evaluate(() => window.__saved[1]);
  const f2 = path.join(TMP, saved.filename); fs.writeFileSync(f2, Buffer.from(saved.b64, "base64"));
  step("Stage G 'Download report for KDEM' → " + saved.filename);

  for (const f of [f1, f2]) {
    const info = execFileSync("python3", ["-I", "-c", "import sys,docx\nd=docx.Document(sys.argv[1])\nt=[p.text for p in d.paragraphs]\nprint(len(t), len(d.tables), t[0])", f]).toString().trim();
    execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", TMP, f], { stdio: "ignore" });
    const pages = /Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f.replace(/\.docx$/, ".pdf")]).toString())[1];
    step("Valid Word file " + path.basename(f) + ": paragraphs/tables/first line = " + info + "; opens in LibreOffice (" + pages + " page(s))");
  }
  await browser.close(); server.close();
  if (errors.length) { console.log("Page errors: " + errors.join("; ")); process.exit(1); }
  console.log("No page errors.");
})().catch((e) => { console.error("FAILED: " + e.message); process.exit(1); });
