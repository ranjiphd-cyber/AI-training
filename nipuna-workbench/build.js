// Assembles dist/index.html (the artifact page) from src/: inlines engine.js, report.js and app.js.
const fs = require("fs"), path = require("path");
const src = (f) => fs.readFileSync(path.join(__dirname, "src", f), "utf8");
const scripts = ["engine.js", "report.js", "app.js"]
  .map((f) => "<script>\n/* " + f + " */\n" + src(f).replace(/<\/script/gi, "<\\/script") + "\n</script>")
  .join("\n");
const page = src("shell.html").replace("<!--INLINE_SCRIPTS-->", scripts + '\n<script>document.getElementById("root").dataset.started="1";</script>');
fs.mkdirSync(path.join(__dirname, "dist", "cases"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "index.html"), page);
// Optional prepared case (kept in the git-ignored private/ folder). Published only with the private artifact.
const caseFile = process.env.PREPARED_CASE || path.join(__dirname, "private", "prepared.case.json");
if (fs.existsSync(caseFile)) fs.copyFileSync(caseFile, path.join(__dirname, "dist", "cases", "bundled.case.json"));
else console.log("Note: no prepared case file; the 'Open the prepared case' button will report it is unavailable.");
console.log("dist/index.html " + (page.length / 1024).toFixed(0) + " KB");
