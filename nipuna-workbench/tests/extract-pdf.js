// Extract a PDF exactly as the workbench does (pdf.js text items → reading-order lines per page).
const fs = require("fs");
const N = require("../src/engine.js");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
async function extract(path) {
  const data = new Uint8Array(fs.readFileSync(path));
  const pdf = await pdfjs.getDocument({ data, disableFontFace: true, verbosity: 0 }).promise;
  const units = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    units.push({ loc: "p." + p, text: N.pdfItemsToText(tc.items) });
  }
  return { units, extraction: N.assessExtraction(units, "pdf") };
}
module.exports = { extract };
if (require.main === module) extract(process.argv[2]).then((r) => { console.log(JSON.stringify(r.extraction, null, 1)); r.units.forEach((u) => console.log("\n##### " + u.loc + "\n" + u.text)); });
