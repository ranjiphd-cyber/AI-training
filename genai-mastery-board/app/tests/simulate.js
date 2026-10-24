/* Phase 3 gate: run the mastery and revision engine against three simulated learners
   and check the behaviour described in docs/06-engines-and-tutor.md.
   Run: node genai-mastery-board/app/tests/simulate.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const E = require("../engine.js");

const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["course.js", "concepts.js", "questions.js", "labs.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "content", f), "utf8"), ctx, { filename: f });
}
const C = E.buildContent(ctx.GMB);
const DAY = E.DAY;
let failures = 0;
function check(name, ok, detail) { console.log((ok ? "PASS " : "FAIL ") + name + (detail ? "  — " + detail : "")); if (!ok) failures++; }

/* ---- content integrity ---- */
const ids = new Set(C.concepts.map(k => k.id));
check("76 concepts loaded", C.concepts.length === 76, C.concepts.length + " concepts");
const badRefs = [];
C.concepts.forEach(k => k.pre.concat(k.rel).forEach(r => { if (!ids.has(r)) badRefs.push(k.id + "→" + r); }));
C.questions.forEach(q => q.c.forEach(r => { if (!ids.has(r)) badRefs.push(q.id + "→" + r); }));
ctx.GMB.LABS.forEach(l => l.fields.forEach(f => { if (!ids.has(f.c)) badRefs.push(l.id + "→" + f.c); }));
ctx.GMB.PRACTICE_STEPS.forEach(s => { if (!ids.has(s.c)) badRefs.push(s.id + "→" + s.c); });
ctx.GMB.PROJECT_SECTIONS.forEach(s => { if (!ids.has(s[2])) badRefs.push("section→" + s[2]); });
check("All concept references resolve", badRefs.length === 0, badRefs.join(", "));
check("Every concept has core explanations", C.concepts.every(k => k.d.l1 && k.d.l2 && k.d.take && k.d.aid));
const autoBad = C.questions.filter(q => q.auto && (q.t === "C" || q.t === "D" ? !Array.isArray(q.a) : !(q.o && q.a >= 0 && q.a < q.o.length)));
check("Auto-graded answers are well formed", autoBad.length === 0, autoBad.map(q => q.id).join(","));
const covered = new Set(); C.questions.forEach(q => q.c.forEach(id => covered.add(id)));
const uncoveredH = C.concepts.filter(k => k.exam === "H" && !covered.has(k.id)).map(k => k.id);
check("Every high-importance concept has at least one question", uncoveredH.length === 0, uncoveredH.join(","));
console.log("     " + C.questions.filter(q => q.auto).length + " auto-graded, " + C.questions.filter(q => !q.auto).length + " open questions; " + covered.size + "/76 concepts covered");

/* ---- simulated learners ---- */
function qsFor(id) { return C.questions.filter(q => q.auto && q.c.includes(id)); }
function study(s, id, t, quality) {
  E.recordView(s, id, t);
  E.recordCheck(s, id, quality, t);
  E.recordPractice(s, id, quality, t);
  qsFor(id).forEach((q, i) => E.recordAttempt(s, { q: q.id, c: q.c, d: q.d, m: 1, score: (i % 10) / 10 < quality ? 1 : 0, session: "S" + t }, t));
}
function review(s, id, t, pass) {
  const q = qsFor(id)[0] || { id: "x", c: [id], d: 2 };
  E.recordAttempt(s, { q: q.id, c: [id], d: q.d, m: 1, score: pass ? 1 : 0, session: "R" + t }, t);
}

const T0 = Date.UTC(2026, 9, 1);
const focus = ["C03.2", "C03.3", "C11.2", "C14.4", "C14.2", "C13.1"];

// A: strong but forgetful — studies well, then fails reviews.
const A = E.emptyState();
focus.forEach(id => study(A, id, T0, 0.95));
focus.forEach(id => E.recordBuild(A, id, 0.9, T0 + DAY));
focus.forEach(id => review(A, id, T0 + 3 * DAY, true));
focus.forEach(id => review(A, id, T0 + 12 * DAY, true));
let stA = E.status(A, C, "C03.2", T0 + 12 * DAY);
check("Strong learner reaches Mastered after spaced reviews + build", stA.st === 4, "status " + E.STATUSES[stA.st] + ", mastery " + stA.m);
const pA = E.priorities(A, C, T0 + 13 * DAY).find(x => x.id === "C03.2");
check("Mastered concept that isn't due gets priority ≤ 0.05", pA.p <= 0.05, "p=" + pA.p);
focus.forEach(id => review(A, id, T0 + 40 * DAY, false));
stA = E.status(A, C, "C03.2", T0 + 40 * DAY);
check("Failed review decays Mastered → Competent", stA.st === 3, E.STATUSES[stA.st]);
focus.forEach(id => review(A, id, T0 + 42 * DAY, false));
stA = E.status(A, C, "C03.2", T0 + 42 * DAY);
check("Two failed reviews decay to Practising", stA.st === 2, E.STATUSES[stA.st]);

// B: weak on governance, fine elsewhere.
const B = E.emptyState();
["C03.2", "C03.3", "C11.2", "C13.1"].forEach(id => study(B, id, T0, 0.9));
["C14.2", "C14.4", "C14.1"].forEach(id => study(B, id, T0, 0.3));
const pri = E.priorities(B, C, T0 + 2 * DAY);
const topStudied = pri.filter(x => x.st.st >= 1).slice(0, 3).map(x => x.id);
check("Revision priority surfaces weak governance concepts first", topStudied.every(id => id.startsWith("C14")), topStudied.join(", "));
const quiz = E.selectQuiz(B, C, { n: 10, level: 2, seed: 7 }, T0 + 2 * DAY);
const govShare = quiz.filter(q => q.c.some(id => id.startsWith("C14"))).length;
check("Quiz for weak learner over-weights governance", govShare >= 3, govShare + "/10 governance items");
check("Quiz has no duplicate variants", new Set(quiz.filter(q => q.v).map(q => q.v)).size === quiz.filter(q => q.v).length);

// C: steady learner — every concept at 75%, no mock exam.
const S = E.emptyState();
C.concepts.forEach(k => study(S, k.id, T0, 0.75));
const sumS = E.summary(S, C, T0 + DAY);
check("Exam readiness stays ≤ 85% without a mock exam", sumS.readiness <= 85, "readiness " + sumS.readiness + "%");
const masteredS = C.concepts.filter(k => E.status(S, C, k.id, T0 + DAY).st === 4).length;
check("Nobody is Mastered without spaced reviews", masteredS === 0, masteredS + " mastered");
check("Mastery capped at 84 without a passed review", C.concepts.every(k => E.status(S, C, k.id, T0 + DAY).m <= 84));

// Reading only: no practice or test evidence.
const R = E.emptyState();
E.recordView(R, "C03.2", T0); E.recordCheck(R, "C03.2", 1, T0);
const stR = E.status(R, C, "C03.2", T0);
check("Reading + concept check alone cannot exceed Learning-level mastery cap", stR.m <= 55 && stR.st === 1, "mastery " + stR.m + ", " + E.STATUSES[stR.st]);

const rec = E.recommend(E.emptyState(), C, T0);
check("A new learner is recommended the first unlocked concept", rec.lesson && rec.lesson.id === "C01.1", rec.lesson && rec.lesson.id);

console.log(failures ? "\n" + failures + " check(s) failed" : "\nAll checks passed");
process.exit(failures ? 1 : 0);
