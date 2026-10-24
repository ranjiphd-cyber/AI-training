/* Regenerates docs/01-course-knowledge-map.md from the content files, so the map and the app never drift.
   Run: node genai-mastery-board/app/tests/gen-knowledge-map.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const E = require("../engine.js");

const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["course.js", "concepts.js", "questions.js", "labs.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "content", f), "utf8"), ctx, { filename: f });
}
const G = ctx.GMB, C = E.buildContent(G);
const qCount = {}; C.questions.forEach(q => q.c.forEach(id => { qCount[id] = (qCount[id] || 0) + 1; }));
const cell = s => String(s || "").replace(/\|/g, "\\|");

let out = `# 01 — Course Knowledge Map

> Generated from \`app/content/*.js\` by \`app/tests/gen-knowledge-map.js\`. Edit the content files, then re-run the script.

**Primary source:** your course compendium (\`course-material/iitm-master-course-compendium.md\`), tag **IITM-D**, covering Weeks 1–7 and 9–13.
Weeks 8, 14 and 15 come from the brochure only (**IITM-B**): *course material not currently available*.
**IITM-L** marks items you named that the compendium doesn't contain (COSTAR; the chatbot/assistant/automation/agent distinction).

**Exam importance** is an estimate until the exam format is known. **Qs** = questions in the bank for that concept.

| Totals | |
|---|---|
| Weeks / modules | ${G.MODULES.length} |
| Concepts | ${C.concepts.length} (${C.concepts.filter(k => /D/.test(k.src)).length} from the compendium) |
| Auto-marked questions | ${C.questions.filter(q => q.auto).length} |
| Written questions | ${C.questions.filter(q => !q.auto).length} |

`;

G.PILLARS.forEach(p => {
  out += `\n## Pillar ${p.n} — ${p.title}\n`;
  G.MODULES.filter(m => m.p === p.n).forEach(m => {
    out += `\n### Week ${m.week} — ${m.title}${m.material === "compendium" ? "" : " *(brochure only)*"}\n\n`;
    out += `**Course frameworks:** ${m.frameworks.join(" · ")}  \n**Tools:** ${m.tools.join(", ")} · **Exam importance:** ${m.exam} · **Practical importance:** ${m.prac}\n\n`;
    out += `| ID | Concept | Sub-concepts | Src | Related | Practical skill | Exam | Project | Qs |\n|---|---|---|---|---|---|---|---|---|\n`;
    C.concepts.filter(k => k.m === m.id).forEach(k => {
      out += `| ${k.id} | ${cell(k.name)} | ${cell(k.sub)} | ${k.src} | ${k.rel.join(", ")} | ${cell(k.skill)} | ${k.exam} | ${k.proj} | ${qCount[k.id] || 0} |\n`;
    });
  });
});

out += `\n## IBM certificate tracks (IITM-B)\n\n| ID | Certificate | Topics | Links to |\n|---|---|---|---|\n`;
G.IBM.forEach(b => { out += `| ${b.id} | ${b.title} | ${cell(b.topics)} | ${b.links} |\n`; });

out += `\n## Where the course differs from your original brief\n\n| Topic | Your brief | Course compendium | Board uses |\n|---|---|---|---|\n`;
C.concepts.filter(k => k.d.cvp).forEach(k => { out += `| ${k.id} ${cell(k.name)} | see right | see right | ${cell(k.d.cvp)} |\n`; });

out += `\n## Prerequisite graph\n\n| Concept | Must be started first |\n|---|---|\n`;
C.concepts.filter(k => k.pre.length).forEach(k => { out += `| ${k.id} ${cell(k.name)} | ${k.pre.join(", ")} |\n`; });

out += `\n## Allied concepts and where they attach (Expert Mode)\n\n| Allied concept | Src | Extends |\n|---|---|---|\n`;
G.ALLIED.forEach(a => { out += `| ${cell(a.t)}${a.vol ? " (fast-changing)" : ""} | ${a.src} | ${a.ext} ${cell(C.byId[a.ext].name)} |\n`; });

fs.writeFileSync(path.join(__dirname, "..", "..", "docs", "01-course-knowledge-map.md"), out);
console.log("Wrote docs/01-course-knowledge-map.md (" + out.length + " chars)");
