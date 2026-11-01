// End-to-end test of app/six_sigma_studio.html in headless Chromium.
// CDN libraries are served from local node_modules so the test runs offline.
// Prints one JSON line: {errors, examples:[{name,kpis,findings,deckBytes}], upload:{kpis}}
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const lib = (p) => fs.readFileSync(path.join(ROOT, "node_modules", p), "utf8");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  await ctx.route(/cdnjs.*xlsx/, (r) => r.fulfill({ contentType: "application/javascript", body: lib("xlsx/dist/xlsx.full.min.js") }));
  await ctx.route(/jsdelivr.*pptxgen/, (r) => r.fulfill({ contentType: "application/javascript", body: lib("pptxgenjs/dist/pptxgen.bundle.js") }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.fulfill({ contentType: "text/css", body: "" }));
  const p = await ctx.newPage(); const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("file://" + path.join(ROOT, "app", "six_sigma_studio.html")); await p.waitForTimeout(1200);
  const mods = ["home", "setup", "charter", "ctq", "needs", "data", "analyze", "recs", "causes", "improve", "control", "governance", "export"];
  const out = { errors, examples: [] };
  const names = await p.evaluate(() => Object.keys(examples()));
  for (const ex of names) {
    await p.click("#btn-example"); await p.waitForTimeout(150);
    await p.click(`button[data-ex="${ex}"]`); await p.waitForTimeout(400);
    for (const m of mods) { await p.evaluate((h) => (location.hash = h), "#" + m); await p.waitForTimeout(80); }
    const info = await p.evaluate(() => ({ kpis: S.cur.results.kpis.map((k) => [k.id, k.value, k.n]), findings: S.cur.results.findings.length, recs: S.cur.results.recs.length }));
    await p.evaluate(() => (location.hash = "#export")); await p.waitForTimeout(150);
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 30000 }), p.click('button[data-act="ppt"]')]);
    const f = path.join(require("os").tmpdir(), `studio_${out.examples.length}.pptx`); await dl.saveAs(f);
    out.examples.push({ name: ex, ...info, deck: f, deckBytes: fs.statSync(f).size });
  }
  // blank project -> library CTQ -> upload CSV -> scope exclusion -> run
  await p.click("#btn-new"); await p.waitForTimeout(200);
  await p.selectOption('[data-path="org.department"]', "Talent Acquisition"); await p.waitForTimeout(150);
  await p.evaluate(() => (location.hash = "#ctq")); await p.waitForTimeout(150); await p.click('button[data-lib="0"]');
  await p.evaluate(() => (location.hash = "#data")); await p.waitForTimeout(150);
  await p.setInputFiles("#file-in", path.join(ROOT, "demo", "data", "SYNTHETIC_requisitions_extract_2026-08-14.csv")); await p.waitForTimeout(1200);
  await p.selectOption('[data-path="mapping.excludeCol"]', "Status"); await p.fill('[data-path="mapping.excludeVals"]', "Cancelled"); await p.waitForTimeout(200);
  await p.click('button[data-act="run"]'); await p.waitForTimeout(1200);
  out.upload = await p.evaluate(() => ({ mapping: S.cur.mapping, kpis: S.cur.results.kpis.map((k) => [k.id, k.value, k.n]) }));
  out.overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(JSON.stringify(out));
  await b.close();
})();
