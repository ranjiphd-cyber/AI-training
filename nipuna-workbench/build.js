// Assembles dist/index.html (the artifact page) from src/: inlines engine.js, report.js and app.js.
const fs = require("fs"), path = require("path");
const src = (f) => fs.readFileSync(path.join(__dirname, "src", f), "utf8");
const scripts = ["engine.js", "report.js", "app.js"]
  .map((f) => "<script>\n/* " + f + " */\n" + src(f).replace(/<\/script/gi, "<\\/script") + "\n</script>")
  .join("\n");
const page = src("shell.html").replace("<!--INLINE_SCRIPTS-->", scripts + '\n<script>document.getElementById("root").dataset.started="1";</script>');
fs.mkdirSync(path.join(__dirname, "dist", "cases"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "index.html"), page);
// Optional prepared cases (kept in the git-ignored private/ folder). Published only with the private artifact.
// Every private/prepared*.case.json is copied and listed in dist/cases/index.json.
const priv = path.join(__dirname, "private");
const prepared = fs.existsSync(priv) ? fs.readdirSync(priv).filter((f) => /^prepared.*\.case\.json$/.test(f)).sort() : [];
const index = prepared.map((f, i) => {
  const obj = JSON.parse(fs.readFileSync(path.join(priv, f), "utf8"));
  const out = "prepared-" + (i + 1) + ".case.json";
  fs.copyFileSync(path.join(priv, f), path.join(__dirname, "dist", "cases", out));
  return { file: out, name: obj.meta.caseName, outcome: (obj.decision || {}).outcome || "" };
});
fs.writeFileSync(path.join(__dirname, "dist", "cases", "index.json"), JSON.stringify(index, null, 1));
console.log(index.length + " prepared case(s) listed.");
console.log("dist/index.html " + (page.length / 1024).toFixed(0) + " KB");
