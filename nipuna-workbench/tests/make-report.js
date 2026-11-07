// Generate report + annex .docx for a case file using the same report.js the browser uses.
const fs = require("fs"), path = require("path");
const docx = require("docx");
const N = require("../src/engine.js");
const R = require("../src/report.js");
async function main(casePath, outDir) {
  const c = JSON.parse(fs.readFileSync(casePath, "utf8"));
  const base = path.basename(casePath).replace(/\.case\.json$/, "");
  fs.mkdirSync(outDir, { recursive: true });
  const rep = path.join(outDir, base + "-evaluation.docx");
  const ann = path.join(outDir, base + "-evidence-annex.docx");
  fs.writeFileSync(rep, await docx.Packer.toBuffer(R.buildReport(docx, N, c)));
  fs.writeFileSync(ann, await docx.Packer.toBuffer(R.buildAnnex(docx, N, c)));
  fs.writeFileSync(path.join(outDir, base + "-summary.txt"), N.summaryText(c));
  console.log(rep + "\n" + ann);
}
module.exports = { main };
if (require.main === module) main(process.argv[2], process.argv[3] || "reports");
