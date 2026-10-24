/* GenAI Mastery Board — interface.
   Content: content/*.js (GMB.*). Scoring: engine.js (GMBEngine). Design: docs/03-information-architecture-and-ux.md. */
(function () {
  "use strict";
  var G = window.GMB, E = window.GMBEngine, C = E.buildContent(G);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var now = function () { return Date.now(); };
  var MODS = {}; G.MODULES.forEach(function (m) { MODS[m.id] = m; });
  var LABS = {}; G.LABS.forEach(function (l) { LABS[l.id] = l; });
  var STN = E.STATUSES;
  var TYPE_NAMES = { A: "Multiple choice", B: "True / False", C: "Fill in the blank", D: "One word", E: "Short conceptual", F: "2-mark", G: "4-mark", H: "8-mark analytical", I: "Scenario", J: "Case study", K: "Choose the architecture", L: "Identify the error", M: "Prompt improvement", N: "Workflow design", O: "Agent architecture", P: "Governance & risk" };
  var LEVEL_NAMES = ["Beginner", "Intermediate", "Advanced", "Expert"];

  /* =============== state & persistence =============== */
  var LS = "gmb-state-v1";
  var S = E.emptyState();
  try { var raw = localStorage.getItem(LS); if (raw) S = Object.assign(E.emptyState(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
  var db = null, sample = null, saveTimer = null, pushing = false, lastSaved = {};
  var PARTS = {
    core: function (s) { return { concepts: s.concepts, quizzes: s.quizzes.slice(-80), days: s.days, teach: s.teach, updatedAt: s.updatedAt }; },
    attempts: function (s) { return { list: s.attempts.slice(-1500) }; },
    labs: function (s) { return { labs: s.labs }; },
    practice: function (s) { return { practice: s.practice.slice(-12) }; },
    projects: function (s) { return { projects: s.projects }; },
    cases: function (s) { return { cases: s.cases }; }
  };
  function setSync(t) { var el = $("#sync"); if (el) el.textContent = t; }
  function save(immediate) {
    S.updatedAt = now();
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { /* ignore */ }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushRemote, immediate ? 50 : 1500);
  }
  function pushRemote() {
    if (!db || pushing) return;
    pushing = true;
    var keys = Object.keys(PARTS), i = 0;
    (function next() {
      if (i >= keys.length) { pushing = false; setSync("Progress is saved to your Claude account."); return; }
      var k = keys[i++], data = PARTS[k](S), j = JSON.stringify(data);
      if (lastSaved[k] === j) return next();
      db.doc("progress/" + k).set(data).then(function () { lastSaved[k] = j; next(); }, function () {
        pushing = false; setSync("Couldn't reach your account just now. Progress is kept in this browser and will sync on your next change.");
      });
    })();
  }
  function initRuntime() {
    if (!window.claude || !window.claude.use) return;
    window.claude.use("db").then(function (d) {
      db = d; if (!db) return;
      var keys = Object.keys(PARTS), snaps = {};
      return Promise.all(keys.map(function (k) { return db.doc("progress/" + k).get().then(function (s) { if (s.exists) snaps[k] = s.data(); }); })).then(function () {
        keys.forEach(function (k) { if (snaps[k]) lastSaved[k] = JSON.stringify(snaps[k]); });
        var remoteTs = snaps.core && snaps.core.updatedAt || 0;
        if (remoteTs > (S.updatedAt || 0)) {
          var c = snaps.core;
          S.concepts = c.concepts || {}; S.quizzes = c.quizzes || []; S.days = c.days || []; S.teach = c.teach || {}; S.updatedAt = remoteTs;
          if (snaps.attempts) S.attempts = snaps.attempts.list || [];
          if (snaps.labs) S.labs = snaps.labs.labs || {};
          if (snaps.practice) S.practice = snaps.practice.practice || [];
          if (snaps.projects) S.projects = snaps.projects.projects || {};
          if (snaps.cases) S.cases = snaps.cases.cases || {};
          try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { /* ignore */ }
          render();
        } else if ((S.updatedAt || 0) > remoteTs) { pushRemote(); }
        setSync("Progress is saved to your Claude account.");
      });
    }).catch(function () { db = null; });
    window.claude.use("sample").then(function (s) { sample = s; if (s) render(); }).catch(function () { sample = null; });
  }

  function setPath(obj, path, val) {
    var p = path.split("."), o = obj;
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== "object") o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = val;
  }
  function getPath(obj, path) { return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
  function cstate(id) { if (!S.concepts[id]) S.concepts[id] = { viewed: 0, checks: [], practice: [], build: [], reviews: [], box: 0, due: 0 }; return S.concepts[id]; }

  /* =============== UI helpers =============== */
  var U = { learn: { q: "", m: "", sort: "course" }, ctab: "overview", clevel: {}, mapView: "pillars", labTab: { automation: "automation", rag: "rag" }, quiz: null, quizCfg: { n: 10, mode: "practice", level: 2, module: "", open: false }, psession: null, pstep: 0, project: null, caseId: null, rev: null, tutor: { open: false, turns: [], busy: false }, menu: false, evals: {} };
  var statusCache = null;
  function statuses() { if (!statusCache) statusCache = E.all(S, C, now()); return statusCache; }
  function changed() { statusCache = null; save(); }
  function st(id) { return statuses()[id] || { st: 0, m: 0 }; }
  function srcTag(src) {
    var cls = /^IITM/.test(src) ? "tag iitm" : (src === "EXT" ? "tag ext" : "tag");
    var title = { "IITM-B": "IITM course concept, confirmed in the brochure", "IITM-L": "IITM course concept named by you; class deck not uploaded", "IITM-B+L": "IITM course concept: brochure plus your class materials", "ALLIED": "Allied / expanded concept", "EXT": "Current external or industry practice", "INF": "Tutor's general explanation" }[src] || src;
    return '<span class="' + cls + '" title="' + esc(title) + '">' + esc(src) + "</span>";
  }
  function chip(id, label) {
    var s = st(id), k = C.byId[id];
    return '<a class="chip st' + s.st + '" href="#' + id + '" title="' + esc(k ? k.name : id) + " · " + STN[s.st] + " · mastery " + s.m + '">' + esc(label || id) + "</a>";
  }
  function conceptLink(id) { var k = C.byId[id]; return k ? '<a href="#' + id + '">' + esc(k.name) + "</a> " + chip(id) : esc(id); }
  function meter(v, marks, label) {
    v = Math.max(0, Math.min(100, v || 0));
    var m = (marks || []).map(function (x) { return '<span class="mark" style="left:' + x + '%" title="' + x + '%"></span>'; }).join("");
    return '<div class="meter" role="img" aria-label="' + esc(label || "") + " " + Math.round(v) + '%" title="' + Math.round(v) + '%"><i style="width:' + v + '%"></i>' + m + "</div>";
  }
  function stat(v, unit, label, extra) { return '<div class="card stat"><div class="v num">' + v + (unit ? "<small>" + unit + "</small>" : "") + '</div><div class="l">' + label + "</div>" + (extra || "") + "</div>"; }
  function toast(t) { var el = document.createElement("div"); el.className = "toast"; el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2400); }
  function copy(text, okMsg) {
    var done = function () { toast(okMsg || "Copied"); };
    try {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); });
    } catch (e) { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    U.copyText = text; renderOverlay();
    toast("Select the text and copy it");
  }
  function fmtDate(ts) { var d = new Date(ts); return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }); }
  function modName(m) { return MODS[m] ? "Module " + parseInt(m.slice(1), 10) + " · " + MODS[m].title : m; }
  function trim(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function cap(s) { return String(s || "").slice(0, 8000); }

  /* =============== navigation =============== */
  var NAV = [
    ["Study", [["home", "Home", 1], ["map", "Course Map", 2], ["learn", "Learn Concepts", 3], ["build", "Build a Project", 6], ["cases", "Case Studies", 14]]],
    ["Labs", [["practice", "Practice Lab", 4], ["prompt", "Prompt Lab", 7], ["automation", "Automation Lab", 8], ["rag", "RAG Lab", 9], ["assistant", "Assistant Lab", 10], ["agent", "Agent Lab", 11], ["multiagent", "Multi-Agent Lab", 12], ["governance", "AI Governance Lab", 13]]],
    ["Assess & track", [["quiz", "Quiz & Exam", 5], ["progress", "My Progress", 15], ["revision", "Revision Centre", 16], ["gaps", "Knowledge Gaps", 17], ["expert", "Expert Mode", 18]]]
  ];
  var TITLES = {}; NAV.forEach(function (g) { g[1].forEach(function (r) { TITLES[r[0]] = r[1]; }); });
  function route() { var h = decodeURIComponent(location.hash.slice(1)); return h || "home"; }
  function renderNav(cur) {
    var active = /^C\d\d\.\d+$/.test(cur) ? "learn" : cur;
    $("#rail").className = "rail" + (U.menu ? " open" : "");
    $("#rail").innerHTML = '<div class="brand"><b>GenAI Mastery Board</b><span>IITM Pravartak · GenAI & Agentic AI Tools for Business</span></div>' +
      NAV.map(function (g) {
        return '<div class="navgroup"><h4>' + g[0] + '</h4><div class="nav">' + g[1].map(function (r) {
          return '<a href="#' + r[0] + '"' + (r[0] === active ? ' aria-current="page"' : "") + '><span class="n">' + r[2] + "</span>" + r[1] + "</a>";
        }).join("") + "</div></div>";
      }).join("");
  }

  var lastRoute = null;
  function render() {
    statusCache = null;
    var r = route();
    renderNav(r);
    var view = /^C\d\d\.\d+$/.test(r) && C.byId[r] ? viewConcept(r) : (VIEWS[r] || VIEWS.home)();
    $("#view").innerHTML = view;
    var crumb = /^C\d\d\.\d+$/.test(r) && C.byId[r] ? '<a href="#learn">Learn Concepts</a> › <b>' + esc(r + " " + C.byId[r].name) + "</b>" : "<b>" + esc(TITLES[r] || "Home") + "</b>";
    $("#crumb").innerHTML = crumb;
    if (r !== lastRoute) { window.scrollTo(0, 0); lastRoute = r; }
    renderOverlay();
  }

  /* =============== HOME =============== */
  function viewHome() {
    var t = now(), sum = E.summary(S, C, t), rec = E.recommend(S, C, t);
    var L = sum.level ? G.ROADMAP[sum.level - 1] : null, NL = G.ROADMAP[sum.level] || null;
    var fresh = !S.attempts.length && !Object.keys(S.concepts).length;
    var plan = [];
    if (rec.lesson) plan.push(planItem("Lesson", C.byId[rec.lesson.id].name, rec.lesson.id + " · " + rec.lesson.why, "#" + rec.lesson.id, "Open lesson", "20 min"));
    if (rec.practice) plan.push(planItem("Practice", C.byId[rec.practice.id].name, rec.practice.id + " · " + rec.practice.why, "#" + rec.practice.id, "Practise", "25 min", "practice"));
    else plan.push(planItem("Practice", "Guided practice: business idea → AI design", "Turn a broad idea into a designed AI solution, step by step.", "#practice", "Start", "30 min"));
    plan.push('<div class="card fill stack tight"><div class="eyebrow">Quiz · 10 min</div><h3>10-question quiz</h3><p class="small muted">' + esc(rec.quiz.why) + '</p><div><button class="btn sm primary" data-act="quick-quiz" data-n="10">Start quiz</button></div></div>');
    if (rec.project) { var P = G.PROJECTS.filter(function (p) { return p.id === rec.project.id; })[0]; plan.push(planItem("Project challenge", P.id + " " + P.title, P.name + ". " + rec.project.why, "#build", "Open project", "60 min", "project", P.id)); }
    var mistakes = S.attempts.filter(function (a) { return a.score < 0.5 && a.q; }).slice(-3).reverse();
    var qById = {}; C.questions.forEach(function (q) { qById[q.id] = q; });
    return '<div class="head"><div class="eyebrow">' + (fresh ? "Welcome" : "Today") + '</div><h1>' + (fresh ? "Start where the course starts" : "What to do in the next 30 minutes") + '</h1>' +
      (fresh ? '<p class="muted">Each concept moves from Not Started to Mastered only with evidence: a concept check, practice, a test, spaced reviews and, at the top level, use in a project. Begin with the first lesson below.</p>' : "") + "</div>" +
      '<section class="grid g4">' + plan.join("") + "</section>" +
      '<section class="grid g4">' +
      stat(sum.mastery, "%", "Overall course mastery", meter(sum.mastery, [], "Mastery")) +
      stat(sum.readiness, "%", "Exam readiness · pass mark 70%, target 80%", meter(sum.readiness, [70, 80], "Exam readiness")) +
      stat(sum.practical, "%", "Practical skills", meter(sum.practical, [], "Practical skills")) +
      stat(sum.mastered, " / 76", "Concepts mastered · " + sum.competent + " competent or better") +
      stat(sum.needRevision, "", "Concepts needing revision") +
      stat(sum.accuracy30 == null ? "–" : sum.accuracy30, sum.accuracy30 == null ? "" : "%", "Quiz accuracy, last 30 days") +
      stat(sum.projectsDone, " / 8", "Projects completed") +
      stat(sum.exercises, "", "Exercises completed") +
      stat(sum.streak, sum.streak === 1 ? " day" : " days", "Learning streak (one rest day a week allowed)") +
      stat(L ? "L" + L.n : "L0", "", L ? L.title : "Not yet at Level 1 · AI Aware", NL ? '<span class="small muted">Next: ' + esc(NL.title) + "</span>" : "") +
      "</section>" +
      '<section class="grid g2"><div class="card"><h3>Recent mistakes</h3>' + (mistakes.length ? '<ul class="clean">' + mistakes.map(function (a) { var q = qById[a.q]; return q ? '<li class="row between"><span class="small">' + esc(trim(q.q, 110)) + "</span>" + q.c.map(function (id) { return chip(id); }).join(" ") + "</li>" : ""; }).join("") + '</ul><div><a class="btn sm" href="#revision">Replay mistakes</a></div>' : '<p class="small muted">None yet. Mistakes you make in quizzes appear here and come back in the Revision Centre in new wording.</p>') + "</div>" +
      '<div class="card"><h3>How this board labels sources</h3><p class="small">' + esc(G.SOURCES_NOTE) + '</p><div class="row">' + ["IITM-B", "IITM-L", "ALLIED", "EXT", "INF"].map(srcTag).join("") + '</div><p class="small muted">Upload your class decks to replace IITM-L items with the course\'s exact wording.</p></div></section>' +
      '<section class="card"><h3>The knowledge spine</h3><div class="spine">' + G.SPINE.map(function (s, i) { return "<span>" + esc(s) + "</span>" + (i < G.SPINE.length - 1 ? "→" : ""); }).join("") + "</div></section>";
  }
  function planItem(kind, title, why, href, cta, mins, act, arg) {
    var btn = act === "practice" ? '<button class="btn sm primary" data-act="open-concept-tab" data-id="' + href.slice(1) + '" data-tab="practice">' + cta + "</button>" :
      act === "project" ? '<button class="btn sm primary" data-act="open-project" data-id="' + arg + '">' + cta + "</button>" : '<a class="btn sm primary" href="' + href + '">' + cta + "</a>";
    return '<div class="card fill stack tight"><div class="eyebrow">' + kind + " · " + mins + "</div><h3>" + esc(title) + '</h3><p class="small muted">' + esc(why) + "</p><div>" + btn + "</div></div>";
  }

  /* =============== COURSE MAP =============== */
  function moduleStats(mid) {
    var ids = C.concepts.filter(function (k) { return k.m === mid; }).map(function (k) { return k.id; });
    var w = 0, tot = 0, sts = ids.map(function (id) { var s = st(id), ew = { H: 3, M: 2, L: 1 }[C.byId[id].exam]; w += ew; tot += ew * s.m; return s.st; });
    var minSt = Math.min.apply(null, sts), maxSt = Math.max.apply(null, sts);
    var label = maxSt === 0 ? 0 : (minSt >= 4 ? 4 : minSt >= 3 ? 3 : Math.max(1, Math.min(2, Math.round(sts.reduce(function (a, b) { return a + b; }, 0) / sts.length))));
    return { ids: ids, m: Math.round(tot / w), st: label };
  }
  function viewMap() {
    var body;
    if (U.mapView === "spine") {
      var groups = [["Prompt Engineering", ["M03"]], ["Context Engineering", ["M10"]], ["RAG", ["M11", "M12"]], ["Tools", ["M04", "M05"]], ["Agents", ["M13"]], ["Multi-Agent Orchestration", ["M13"]], ["Evaluation & Governance", ["M14"]]];
      body = '<div class="stack">' + groups.map(function (g, i) {
        return '<div class="card"><div class="row between"><h3>' + (i + 1) + ". " + esc(g[0]) + "</h3>" + g[1].map(function (m) { return '<span class="tag iitm">' + m + "</span>"; }).join("") + '</div><div class="row">' +
          C.concepts.filter(function (k) { return g[1].indexOf(k.m) >= 0 && (g[0] !== "Agents" || ["C13.1", "C13.5", "C13.6"].indexOf(k.id) >= 0) && (g[0] !== "Multi-Agent Orchestration" || ["C13.2", "C13.3", "C13.4", "C13.7", "C13.8"].indexOf(k.id) >= 0); }).map(function (k) { return chip(k.id, k.id + " " + trim(k.name, 34)); }).join("") + "</div></div>";
      }).join("") + '<p class="small muted">"Context engineering" is an allied term (current industry name for choosing what goes into the model\'s context). It extends Module 3\'s context, instructions, constraints and examples and Module 10\'s context injection.</p></div>';
    } else {
      body = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));align-items:start">' + G.PILLARS.map(function (p) {
        return '<div class="pillar"><div><div class="eyebrow">Pillar ' + p.n + "</div><h3>" + esc(p.title) + "</h3></div>" + G.MODULES.filter(function (m) { return m.p === p.n; }).map(function (m) {
          var ms = moduleStats(m.id);
          return '<div class="mod"><div class="row between"><span class="num">' + m.id + '</span><span class="pill st' + ms.st + '">' + STN[ms.st] + "</span></div><h3>" + esc(m.title) + "</h3>" + meter(ms.m, [], "Module mastery") +
            '<div class="small muted num">Mastery ' + ms.m + "% · Exam " + m.exam + " · Practical " + m.prac + " · Week: not in uploaded material</div>" +
            '<div class="small"><b>Frameworks:</b> ' + esc(m.frameworks.join("; ")) + '</div><div class="small"><b>Tools:</b> ' + esc(m.tools.join(", ")) + "</div>" +
            '<div class="row">' + ms.ids.map(function (id) { return chip(id); }).join("") + "</div>" +
            '<details><summary class="small">Brochure topics</summary><ul class="bul small">' + m.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + '</ul><p class="small muted">Class decks for this module: course material not currently available.</p></details></div>';
        }).join("") + "</div>";
      }).join("") + "</div>";
      body += '<div class="card"><h3>IBM certificate tracks</h3><div class="table-wrap"><table><thead><tr><th>Certificate</th><th>Topics</th><th>Links to</th></tr></thead><tbody>' + G.IBM.map(function (b) { return "<tr><td>" + esc(b.title) + "</td><td>" + esc(b.topics) + "</td><td>" + esc(b.links) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    }
    return '<div class="row between"><div class="head"><div class="eyebrow">15 modules · 4 pillars · 76 concepts</div><h1>Course Map</h1></div><div class="seg" role="group" aria-label="Map view"><button data-act="mapview" data-v="pillars" aria-pressed="' + (U.mapView === "pillars") + '">Pillars</button><button data-act="mapview" data-v="spine" aria-pressed="' + (U.mapView === "spine") + '">Knowledge spine</button></div></div>' +
      '<div class="row small">' + [0, 1, 2, 3, 4].map(function (i) { return '<span class="chip st' + i + '">' + STN[i] + "</span>"; }).join("") + "</div>" + body;
  }

  /* =============== LEARN index =============== */
  function viewLearn() {
    var f = U.learn, t = now();
    var pri = {}; E.priorities(S, C, t, statuses()).forEach(function (x) { pri[x.id] = x.p; });
    var list = C.concepts.filter(function (k) {
      if (f.m && k.m !== f.m) return false;
      if (f.q) { var q = f.q.toLowerCase(); if ((k.id + " " + k.name + " " + k.sub).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
    if (f.sort === "weak") list.sort(function (a, b) { return (st(a.id).st === 0) - (st(b.id).st === 0) || st(a.id).m - st(b.id).m; });
    if (f.sort === "rec") list.sort(function (a, b) { return pri[b.id] - pri[a.id]; });
    if (f.sort === "exam") list.sort(function (a, b) { return "HML".indexOf(a.exam) - "HML".indexOf(b.exam); });
    return '<div class="head"><div class="eyebrow">76 concepts</div><h1>Learn Concepts</h1><p class="muted">Every concept has four levels, from plain language to expert trade-offs. Full notes are written for the Module 1–5 essentials and the three sample journeys; the rest have core notes for now.</p></div>' +
      '<div class="grid g3"><label class="lbl small">Search<input type="search" id="lq" value="' + esc(f.q) + '" placeholder="e.g. COSTAR, handoff, KPI" data-act-input="learn-q"></label>' +
      '<label class="lbl small">Module<select data-act-change="learn-m"><option value="">All modules</option>' + G.MODULES.map(function (m) { return '<option value="' + m.id + '"' + (f.m === m.id ? " selected" : "") + ">" + m.id + " " + esc(m.title) + "</option>"; }).join("") + "</select></label>" +
      '<label class="lbl small">Order<select data-act-change="learn-sort">' + [["course", "Course order"], ["rec", "Recommended"], ["weak", "Weakest first"], ["exam", "Exam importance"]].map(function (o) { return '<option value="' + o[0] + '"' + (f.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="table-wrap" id="learnlist">' + list.map(function (k) {
        var s = st(k.id), full = !!k.d.l3;
        return '<a class="list-row" href="#' + k.id + '"><span class="mono">' + k.id + '</span><span style="min-width:0"><b style="color:var(--heading)">' + esc(k.name) + '</b><br><span class="small muted">' + esc(trim(k.sub, 110)) + '</span></span><span class="row" style="justify-content:flex-end">' + srcTag(k.src) + '<span class="tag">Exam ' + k.exam + "</span>" + (full ? '<span class="tag">Full notes</span>' : "") + '<span class="chip st' + s.st + '">' + STN[s.st] + " · " + s.m + "</span></span></a>";
      }).join("") + (list.length ? "" : '<p class="small muted" style="padding:14px">No concepts match. Clear the search or choose another module.</p>') + "</div>";
  }

  /* =============== CONCEPT page =============== */
  var CTABS = [["overview", "Overview"], ["deep", "Deep dive"], ["examples", "Examples"], ["business", "Business use"], ["practice", "Practice"], ["quiz", "Quiz"], ["related", "Related concepts"], ["exam", "Exam notes"], ["expert", "Expert extension"]];
  function pending(what) { return '<p class="small muted">' + esc(what) + " is not written yet for this concept. Course wording will be added when the class decks are uploaded.</p>"; }
  function viewConcept(id) {
    var k = C.byId[id], d = k.d, s = st(id);
    var c = cstate(id); if (!c.viewed) { E.recordView(S, id, now()); save(); }
    var lvl = U.clevel[id] || "L1";
    var tab = U.ctab;
    var hdr = '<div class="head"><div class="eyebrow">' + esc(modName(k.m)) + '</div><h1>' + esc(k.name) + '</h1><div class="row">' + '<span class="mono small">' + id + "</span>" + srcTag(k.src) + '<span class="tag">Exam importance ' + k.exam + '</span><span class="tag">Project relevance ' + k.proj + '</span><span class="chip st' + s.st + '">' + STN[s.st] + '</span><span class="small muted num">Mastery ' + s.m + '</span><span class="small muted">Week: not in uploaded material</span></div></div>';
    var tabs = '<div class="tabs" role="tablist">' + CTABS.map(function (t) { return '<button role="tab" aria-selected="' + (tab === t[0]) + '" data-act="ctab" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + "</div>";
    var body = "";
    if (tab === "overview") {
      var lvTxt = { L1: d.l1, L2: d.l2, L3: d.l3, L4: d.l4 }[lvl];
      var lvSrc = { L1: "INF", L2: k.src, L3: "ALLIED", L4: "ALLIED" }[lvl];
      var lvName = { L1: "Explain like I'm new to AI", L2: "Business practitioner", L3: "Solution design", L4: "Expert: trade-offs" }[lvl];
      body = '<div class="row between"><div class="seg" role="group" aria-label="Depth">' + ["L1", "L2", "L3", "L4"].map(function (l) { return '<button data-act="clevel" data-id="' + id + '" data-v="' + l + '" aria-pressed="' + (l === lvl) + '">Level ' + l.slice(1) + "</button>"; }).join("") + '</div><span class="small muted">' + lvName + "</span></div>" +
        '<div class="card lead"><div class="row">' + srcTag(lvSrc) + "</div>" + (lvTxt ? "<p>" + esc(lvTxt) + "</p>" : pending("Level " + lvl.slice(1)) + (d.l2 ? '<p class="small">Meanwhile, Level 2 reads: ' + esc(d.l2) + "</p>" : "")) + "</div>" +
        '<div class="grid g2">' + (d.why ? '<div class="card"><h4>Why it matters</h4><p>' + esc(d.why) + "</p></div>" : "") + '<div class="card"><h4>Memory aid</h4><p><b>' + esc(d.aid) + "</b></p>" + (d.analogy ? '<p class="small muted">Analogy: ' + esc(d.analogy) + "</p>" : "") + "</div></div>" +
        (d.predict ? predictBlock(id, d.predict) : "") +
        '<div class="row"><button class="btn" data-act="ctab" data-tab="quiz">Take the concept check</button><button class="btn quiet" data-act="ctab" data-tab="practice">Practise it</button></div>';
    } else if (tab === "deep") {
      body = (d.l3 ? '<div class="card"><div class="row"><h3>Solution-design view</h3>' + srcTag("ALLIED") + "</div><p>" + esc(d.l3) + "</p></div>" : "") +
        (d.l4 ? '<div class="card"><div class="row"><h3>Expert trade-offs</h3>' + srcTag("ALLIED") + "</div><p>" + esc(d.l4) + "</p></div>" : "") +
        (d.how ? '<div class="card"><h4>How it works</h4><p>' + esc(d.how) + "</p></div>" : "") +
        '<div class="grid g2"><div class="card"><h4>Risks and limitations</h4>' + (d.risks && d.risks.length ? '<ul class="bul">' + d.risks.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" : pending("A risk list")) + '</div><div class="card"><h4>When not to use it</h4>' + (d.notWhen && d.notWhen.length ? '<ul class="bul">' + d.notWhen.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>" : '<p class="small muted">No specific exclusions recorded.</p>') + "</div></div>" +
        (d.cvp ? '<div class="note"><b>Course view vs current practice.</b> ' + esc(d.cvp) + "</div>" : "") + (!d.l3 && !d.how ? pending("The deep dive") : "");
    } else if (tab === "examples") {
      body = '<div class="grid g3"><div class="card"><h4>Practical example</h4><p>' + esc(d.ex || d.hr) + '</p></div><div class="card"><h4>HR / Talent Acquisition</h4><p>' + esc(d.hr) + '</p></div><div class="card"><h4>Other business function</h4>' + (d.gen ? "<p>" + esc(d.gen) + "</p>" : pending("A non-HR example")) + "</div></div>" +
        '<div class="card fill"><h4>Transfer it</h4><p>Pick a function you advise as a consultant (Finance, Operations, Sales). Rewrite the HR example for that function in two sentences, then check it uses the same principle: <b>' + esc(d.take) + "</b></p></div>";
    } else if (tab === "business") {
      body = '<div class="grid g2"><div class="card"><h4>Business relevance</h4><p>' + esc(d.biz || d.l2) + '</p></div><div class="card"><h4>Practical skill to build</h4><p>' + esc(k.skill) + '</p><p class="small muted">Project relevance: ' + k.proj + "</p></div></div>" +
        '<div class="card"><h4>Tools where it applies</h4>' + (d.tools && d.tools.length ? '<div class="row">' + d.tools.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" : '<p class="small">' + esc(MODS[k.m].tools.join(", ")) + ' <span class="muted">(module tools)</span></p>') + '<p class="small muted">Tool features change often. Check the vendor\'s current documentation before you recommend one.</p></div>';
    } else if (tab === "practice") {
      body = conceptPractice(id);
    } else if (tab === "quiz") {
      var qs = C.questions.filter(function (q) { return q.auto && q.c.indexOf(id) >= 0; });
      var open = C.questions.filter(function (q) { return !q.auto && q.c.indexOf(id) >= 0; });
      var checks = c.checks || [];
      body = '<div class="card"><h3>Concept check</h3><p class="small">Three questions on this concept (topped up from the same module where needed). Passing at 2 out of 3 moves it to Practising once you also have practice evidence.</p>' +
        (checks.length ? '<p class="small muted">Last check: ' + Math.round(checks[checks.length - 1] * 100) + "%</p>" : "") + '<div class="row"><button class="btn primary" data-act="concept-check" data-id="' + id + '">Start the concept check</button><span class="small muted">' + qs.length + " auto-marked and " + open.length + " written questions in the bank for this concept</span></div></div>" +
        (open.length ? '<div class="card"><h3>Written questions to practise</h3><ul class="bul">' + open.map(function (q) { return "<li>" + esc(q.q) + ' <span class="muted small">(' + q.m + " marks)</span></li>"; }).join("") + '</ul><div><button class="btn sm" data-act="concept-quiz-open" data-id="' + id + '">Answer them now</button></div></div>' : "");
    } else if (tab === "related") {
      var pre = k.pre, nxt = C.concepts.filter(function (x) { return x.pre.indexOf(id) >= 0; }).map(function (x) { return x.id; });
      if (!nxt.length) { var i = C.concepts.indexOf(k); if (C.concepts[i + 1]) nxt = [C.concepts[i + 1].id]; }
      var allied = G.ALLIED.filter(function (a) { return a.ext === id; });
      body = '<div class="grid g3"><div class="card"><h4>You already learnt</h4>' + (pre.length ? '<ul class="clean">' + pre.map(function (p) { return "<li>" + conceptLink(p) + "</li>"; }).join("") + "</ul>" : '<p class="small muted">No prerequisites. This is a starting concept.</p>') +
        '</div><div class="card"><h4>This connects to</h4><ul class="clean">' + k.rel.map(function (p) { return "<li>" + conceptLink(p) + "</li>"; }).join("") + allied.map(function (a) { return '<li class="small">' + esc(a.t) + " " + srcTag(a.src) + "</li>"; }).join("") + '</ul></div><div class="card"><h4>Next you should learn</h4><ul class="clean">' + nxt.map(function (p) { return "<li>" + conceptLink(p) + "</li>"; }).join("") + "</ul></div></div>" +
        (d.confused && d.confused.length ? '<div class="card"><h3>Commonly confused with</h3><div class="table-wrap"><table><thead><tr><th>Concept</th><th>The difference</th></tr></thead><tbody>' + d.confused.map(function (x) { return "<tr><td>" + (C.byId[x[0]] ? conceptLink(x[0]) : esc(x[0])) + "</td><td>" + esc(x[1]) + "</td></tr>"; }).join("") + "</tbody></table></div></div>" : "");
    } else if (tab === "exam") {
      var stems = C.questions.filter(function (q) { return q.c.indexOf(id) >= 0; }).slice(0, 4);
      body = '<div class="card lead"><h4>Exam takeaway</h4><p><b>' + esc(d.take) + '</b></p><p class="small muted">One-sentence memory aid: ' + esc(d.aid) + "</p></div>" +
        '<div class="grid g2"><div class="card"><h4>Key definition (Level 2)</h4><p>' + esc(d.l2) + '</p></div><div class="card"><h4>Common mistakes</h4><ul class="bul">' + (d.mistakes || [d.mistake]).filter(Boolean).map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div></div>" +
        '<div class="card"><h4>Question stems from the bank</h4><ul class="bul small">' + stems.map(function (q) { return "<li>" + esc(trim(q.q, 160)) + ' <span class="muted">· ' + TYPE_NAMES[q.t] + "</span></li>"; }).join("") + "</ul></div>";
    } else if (tab === "expert") {
      var al = (d.allied || []).concat(G.ALLIED.filter(function (a) { return a.ext === id; }).map(function (a) { return { t: a.t, s: a.s, src: a.src, vol: a.vol }; }));
      var tt = c.teachText || "";
      body = '<div class="note">Beyond the IITM course. Each item extends <b>' + id + " " + esc(k.name) + "</b>; it does not replace the course view.</div>" +
        (al.length ? '<div class="grid g2">' + al.map(function (a) { return '<div class="card"><div class="row between"><h3>' + esc(a.t) + "</h3>" + srcTag(a.src) + "</div><p class=\"small\">" + esc(a.s) + "</p>" + (a.vol ? '<p class="small muted">Changes quickly; verify at source.</p>' : "") + "</div>"; }).join("") + "</div>" : '<p class="small muted">No allied extensions recorded for this concept yet. See Expert Mode for the full allied map.</p>') +
        (d.cvp ? '<div class="note"><b>Course view vs current practice.</b> ' + esc(d.cvp) + "</div>" : "") +
        '<div class="card"><h3>Teach-back</h3><p class="small">Explain this concept to a hiring manager in about 90 seconds (150–200 words): what it is, why it matters, a TA example, and one limitation. A teach-back scored 80% or more counts as "applied" evidence toward Mastered.</p>' +
        '<textarea id="teach-' + id + '" data-bind="concepts.' + id + '.teachText">' + esc(tt) + '</textarea><div class="row">' +
        (sample ? '<button class="btn primary" data-act="teach-tutor" data-id="' + id + '">Ask the tutor to score it</button>' : "") + '<button class="btn" data-act="teach-self" data-id="' + id + '">Score it myself</button>' + (S.teach[id] != null ? '<span class="small muted">Last teach-back score: ' + Math.round(S.teach[id] * 100) + "%</span>" : "") + "</div>" +
        (U.evals["teach-" + id] ? U.evals["teach-" + id] : "") + "</div>";
    }
    return hdr + tabs + '<div class="stack">' + body + "</div>";
  }
  function predictBlock(id, p) {
    var key = "pred-" + id, shown = U.evals[key];
    return '<div class="card fill"><div class="eyebrow">Your turn · predict before you read on</div><p><b>' + esc(p.q) + '</b></p><textarea id="predict-' + id + '" placeholder="Commit to an answer first, even a rough one.">' + esc(U[key] || "") + "</textarea>" +
      (shown ? '<div class="reveal"><b>Answer.</b> ' + esc(p.a) + "</div>" : '<div><button class="btn sm" data-act="predict" data-id="' + id + '">Reveal the answer</button></div>') + "</div>";
  }
  var GENERIC_PRACTICE = ["Uses the concept's terms correctly", "Applies it to a specific, real TA situation", "States at least one risk or limitation", "Gives a concrete next step you could act on"];
  function conceptPractice(id) {
    var k = C.byId[id], d = k.d, c = cstate(id), key = "cp-" + id;
    var ex = d.exercise || ("Apply it: " + k.skill + ". Write your answer for a real situation from your TA work.");
    var lab = G.LABS.filter(function (l) { return l.module === k.m; })[0];
    var last = c.practice && c.practice.length ? c.practice[c.practice.length - 1].s : null;
    return '<div class="card"><div class="eyebrow">Hands-on exercise</div><p><b>' + esc(ex) + '</b></p><textarea class="big" id="cp-' + id + '" data-bind="concepts.' + id + '.note" placeholder="Write your attempt here. Hints and feedback unlock after you attempt.">' + esc(c.note || "") + "</textarea>" +
      '<div class="row"><button class="btn primary" data-act="cp-check" data-id="' + id + '">Check my attempt</button>' + (sample ? '<button class="btn" data-act="cp-tutor" data-id="' + id + '">Ask the tutor to evaluate</button>' : '<button class="btn" data-act="copy-tutor-prompt" data-id="' + id + '">Copy a tutor prompt</button>') + (last != null ? '<span class="small muted">Last practice score: ' + Math.round(last * 100) + "%</span>" : "") + "</div>" +
      (U.evals[key] || "") + "</div>" + (lab ? '<div class="note">For a fuller workout, use the <a href="#' + labRoute(lab.id) + '">' + esc(lab.name) + "</a>.</div>" : "");
  }
  function labRoute(id) { return id === "dashboard" || id === "ci" ? "automation" : id === "multisource" ? "rag" : id; }

  /* checklist renderer used by concept practice, labs and practice steps */
  function checklist(key, items, saved) {
    saved = saved || [];
    return '<div class="stack tight" data-checklist="' + key + '"><h4>Tick what your answer genuinely includes</h4>' + items.map(function (it, i) {
      return '<label class="check"><input type="checkbox" data-ck="' + key + '" data-i="' + i + '"' + (saved[i] ? " checked" : "") + "><span>" + esc(it) + "</span></label>";
    }).join("") + "</div>";
  }
  function readChecks(key, n) { var out = []; for (var i = 0; i < n; i++) { var el = document.querySelector('[data-ck="' + key + '"][data-i="' + i + '"]'); out.push(!!(el && el.checked)); } return out; }

  /* =============== TUTOR (sample capability) =============== */
  function tutorPrompt(o) {
    return G.TUTOR_RULES + "\n\nTASK: Evaluate the learner's attempt.\nConcepts: " + o.concepts.map(function (id) { return id + " " + (C.byId[id] ? C.byId[id].name : ""); }).join("; ") +
      (o.brief ? "\nScenario / question: " + o.brief : "") + "\nCriteria to score 0–4 each (0 missing, 1 vague or wrong, 2 partial, 3 correct and specific, 4 specific and justified): " + o.criteria.join(" | ") +
      (o.expected ? "\nElements a strong answer includes: " + o.expected.join("; ") : "") + "\n\nLEARNER ANSWER:\n<<<\n" + o.answer + "\n>>>\n\n" +
      'Reply with only JSON: {"scores":[{"criterion":"<criterion>","score":0,"reason":"<one line>"}],"missing":["<element>"],"feedback":"<3-5 sentences: what is incorrect or missing, why it matters, a TA example>","next_question":"<one follow-up question>","misconceptions":["<short tag>"]}. Do not write a model answer.';
  }
  function runTutor(key, o, onScore) {
    if (!sample) return;
    U.evals[key] = '<div class="reveal small">Thinking…</div>'; render();
    sample.json(tutorPrompt(o), { modelTier: "default" }).then(function (r) {
      var sc = (r && r.scores) || [];
      var tot = sc.reduce(function (a, b) { return a + (Number(b.score) || 0); }, 0), max = sc.length * 4 || 1;
      var score = tot / max;
      U.evals[key] = evalHtml(r, score);
      if (onScore) onScore(score, r);
      changed(); render();
    }, function (e) {
      U.evals[key] = '<div class="note warn small">' + esc(tutorError(e)) + "</div>"; render();
    });
  }
  function tutorError(e) {
    var code = e && e.code;
    if (code === "not_granted") { sample = null; return "The tutor wasn't allowed to run. Score your answer with the checklist instead, or allow Claude for this page and reload."; }
    if (code === "rate_limited") return "The tutor is busy. Wait a minute, then try again.";
    if (code === "invalid_json") return "The tutor's reply couldn't be read. Try again.";
    return "The tutor couldn't respond (" + (code || "error") + "). Try again, or use the checklist.";
  }
  function evalHtml(r, score) {
    var sc = (r && r.scores) || [];
    return '<div class="reveal stack tight"><div class="row between"><b>Tutor evaluation</b><span class="verdict num">' + Math.round(score * 100) + '%</span></div>' +
      (sc.length ? '<div class="table-wrap"><table><tbody>' + sc.map(function (s) { return "<tr><td>" + esc(s.criterion) + '</td><td class="num">' + esc(s.score) + "/4</td><td>" + esc(s.reason) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "") +
      (r.missing && r.missing.length ? '<div class="small"><b>Missing:</b> ' + esc(r.missing.join("; ")) + "</div>" : "") +
      (r.feedback ? '<p class="small">' + esc(r.feedback) + "</p>" : "") + (r.next_question ? '<p class="small"><b>Next question:</b> ' + esc(r.next_question) + "</p>" : "") + "</div>";
  }
  function selfEvalHtml(score, missed, extra) {
    return '<div class="reveal stack tight"><div class="row between"><b>Your self-check</b><span class="verdict num">' + Math.round(score * 100) + "%</span></div>" +
      (missed.length ? '<div class="small"><b>What you missed:</b><ul class="bul">' + missed.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div><p class=\"small\">Revise your answer to cover these, then check again. The better attempt counts.</p>" : '<p class="small">You covered every element. Try the transfer: apply the same idea to a non-HR function.</p>') + (extra || "") + "</div>";
  }

  /* =============== QUIZ =============== */
  function startQuiz(items, cfg) {
    if (!items.length) { toast("No questions match those settings"); return; }
    U.quiz = { id: "S" + now(), items: items, i: 0, ans: {}, fb: {}, hints: {}, mode: cfg.mode || "practice", kind: cfg.kind || "quiz", concept: cfg.concept, start: now(), done: false, marking: false, back: cfg.back || null, recorded: {} };
    location.hash = "quiz"; render();
  }
  function buildQuiz(cfg) {
    var n = cfg.n === "full" ? 70 : cfg.n;
    var items = E.selectQuiz(S, C, { n: n, level: cfg.level === 5 ? "exam" : cfg.level, mode: cfg.mode, modules: cfg.module ? [cfg.module] : null, concepts: cfg.concepts || null, seed: now() }, now());
    if (!cfg.open) items = items.filter(function (q) { return q.auto; });
    if (cfg.open) {
      var opens = C.questions.filter(function (q) { return !q.auto && (!cfg.module || q.c.some(function (id) { return C.byId[id].m === cfg.module; })); });
      var k = Math.max(1, Math.round(items.length / 10));
      opens.sort(function () { return Math.random() - 0.5; }).slice(0, k).forEach(function (q) { items.push(q); });
    }
    return items;
  }
  function grade(q, a) {
    if (a == null || a === "") return 0;
    if (q.t === "C" || q.t === "D") {
      var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ""); };
      var v = norm(a);
      return q.a.some(function (x) { var t = norm(x); return v === t || (t.length > 3 && v.indexOf(t) >= 0 && v.length <= t.length + 6); }) ? 1 : 0;
    }
    return Number(a) === q.a ? 1 : 0;
  }
  function recordQ(Q, q, score) {
    if (Q.recorded[q.id]) return;
    Q.recorded[q.id] = 1;
    E.recordAttempt(S, { q: q.id, c: q.c, d: q.d, m: q.m || 1, score: score, hints: Q.hints[q.id] || 0, session: Q.kind === "check" ? null : Q.id, mode: Q.mode, revealed: !!Q.revealed }, now());
  }
  function viewQuiz() {
    var Q = U.quiz;
    if (!Q) return quizBuilder();
    if (Q.done) return quizResults();
    if (Q.marking) return quizMarking();
    var q = Q.items[Q.i], fb = Q.fb[q.id], a = Q.ans[q.id];
    var elapsed = Math.round((now() - Q.start) / 60000);
    var head = '<div class="row between"><div class="head"><div class="eyebrow">' + (Q.kind === "check" ? "Concept check · " + Q.concept : Q.mode === "exam" ? "Exam Mode · answers and hints hidden until you finish" : "Practice mode") + "</div><h2>Question " + (Q.i + 1) + " of " + Q.items.length + '</h2></div><div class="row"><span class="small muted num">' + elapsed + ' min</span><button class="btn sm" data-act="quiz-quit">End quiz</button></div></div>' + meter(100 * Q.i / Q.items.length, [], "Progress");
    var meta = '<div class="row small muted"><span>' + TYPE_NAMES[q.t] + "</span><span>·</span><span>" + LEVEL_NAMES[q.d - 1] + "</span><span>·</span>" + q.c.map(function (id) { return Q.mode === "exam" && !fb ? '<span class="mono">' + id + "</span>" : chip(id); }).join(" ") + (q.m > 1 ? "<span>· " + q.m + " marks</span>" : "") + (q.ext ? '<span class="tag ext">EXT</span>' : "") + "</div>";
    var input;
    if (q.auto && q.o) {
      input = '<div class="stack tight" role="radiogroup">' + q.o.map(function (o, i) {
        var cls = fb ? (i === q.a ? " right" : (String(a) === String(i) ? " wrong" : "")) : "";
        return '<label class="opt' + cls + '"><input type="radio" name="qa" value="' + i + '"' + (String(a) === String(i) ? " checked" : "") + (fb ? " disabled" : "") + ' data-act-change="qa"><span>' + esc(o) + "</span></label>";
      }).join("") + "</div>";
    } else if (q.auto) {
      input = '<input type="text" id="qa-text" value="' + esc(a || "") + '" placeholder="Type your answer"' + (fb ? " disabled" : "") + ">";
    } else {
      input = '<textarea class="big" id="qa-text" placeholder="Write your answer. Aim for one point per mark."' + (fb ? " disabled" : "") + ">" + esc(a || "") + "</textarea>";
    }
    var hints = Q.hints[q.id] || 0, hintHtml = "";
    if (Q.mode !== "exam" && !fb && hints) hintHtml = '<div class="note small">' + hintText(q, hints) + "</div>";
    var actions = !fb ? '<div class="row"><button class="btn primary" data-act="quiz-submit">' + (Q.mode === "exam" ? (Q.i === Q.items.length - 1 ? "Finish" : "Save and next") : "Submit") + "</button>" +
      (Q.mode !== "exam" && hints < 3 ? '<button class="btn" data-act="quiz-hint">Hint ' + (hints + 1) + " of 3</button>" : "") + (Q.mode !== "exam" && hints >= 3 ? '<button class="btn quiet" data-act="quiz-reveal">Show the answer (no credit)</button>' : "") +
      (Q.mode === "exam" && Q.i > 0 ? '<button class="btn quiet" data-act="quiz-prev">Previous</button>' : "") + "</div>" : "";
    return head + '<div class="card">' + meta + "<h3>" + esc(q.q) + "</h3>" + input + hintHtml + actions + (fb || "") + "</div>";
  }
  function hintText(q, n) {
    var k = C.byId[q.c[0]], out = ["<b>Hint 1 · direction.</b> This tests " + esc(k.name) + " (" + esc(modName(k.m)) + ")."];
    if (n >= 2) out.push("<b>Hint 2 · principle.</b> " + esc(k.d.take));
    if (n >= 3) {
      if (q.o) { var wrong = q.o.map(function (_, i) { return i; }).filter(function (i) { return i !== q.a; }); out.push("<b>Hint 3 · partial.</b> It is not: " + esc(q.o[wrong[0]]) + "."); }
      else if (q.a) out.push("<b>Hint 3 · partial.</b> The answer starts with “" + esc(String(q.a[0]).slice(0, 2)) + "”.");
      else out.push("<b>Hint 3 · partial.</b> Cover: " + esc(q.k.slice(0, 2).join("; ")) + ".");
    }
    return out.join("<br>");
  }
  function feedbackHtml(q, a, score) {
    var k = C.byId[q.c[0]];
    if (!q.auto) return "";
    if (score >= 1) return '<div class="reveal stack tight"><span class="verdict">Correct.</span><p class="small">' + esc(q.x) + '</p><div class="row"><button class="btn sm primary" data-act="quiz-next">Next question</button></div></div>';
    var yours = q.o ? (a === "" || a == null ? "No answer" : q.o[Number(a)]) : (a || "No answer");
    var right = q.o ? q.o[q.a] : q.a[0];
    return '<div class="reveal stack tight"><span class="verdict">Incorrect.</span>' +
      '<p class="small"><b>1 · What was incorrect:</b> you answered “' + esc(yours) + "”. The answer is “" + esc(right) + "”.</p>" +
      '<p class="small"><b>2 · Why:</b> ' + esc(q.x) + "</p>" +
      '<p class="small"><b>3 · Correct principle (' + k.id + "):</b> " + esc(k.d.take) + "</p>" +
      '<p class="small"><b>4 · Example:</b> ' + esc(k.d.hr) + "</p>" +
      '<div class="row"><button class="btn sm" data-act="quiz-confirm" data-id="' + k.id + '">5 · Try a confirmation question</button><button class="btn sm primary" data-act="quiz-next">Next question</button><a class="btn sm quiet" href="#' + k.id + '">Revise ' + k.id + "</a></div></div>";
  }
  function quizMarking() {
    var Q = U.quiz, opens = Q.items.filter(function (q) { return !q.auto; });
    return '<div class="head"><div class="eyebrow">Last step</div><h2>Mark your written answers</h2><p class="muted">Tick each key point your answer genuinely covers.' + (sample ? " Or let the tutor mark them." : "") + "</p></div>" +
      opens.map(function (q) {
        return '<div class="card"><h3>' + esc(q.q) + '</h3><pre class="out">' + esc(Q.ans[q.id] || "(no answer)") + "</pre>" + checklist("mk-" + q.id, q.k, Q.marks && Q.marks[q.id]) +
          (sample ? '<div><button class="btn sm" data-act="mark-tutor" data-q="' + q.id + '">Ask the tutor to mark this</button></div>' : "") + (U.evals["mk-" + q.id] || "") + "</div>";
      }).join("") + '<div><button class="btn primary" data-act="quiz-finish-marking">See results</button></div>';
  }
  function quizResults() {
    var Q = U.quiz, tot = 0, max = 0;
    var rows = Q.items.map(function (q) { var s = Q.scores[q.id] || 0; tot += s * (q.m || 1); max += (q.m || 1); return { q: q, s: s }; });
    var pct = max ? Math.round(100 * tot / max) : 0;
    var atts = rows.map(function (r) { return { c: r.q.c, score: r.s }; });
    var tb = E.topicBreakdown(S, C, now(), atts).filter(function (t) { return t.n; });
    var weak = {}; rows.forEach(function (r) { if (r.s < 0.7) r.q.c.forEach(function (id) { weak[id] = (weak[id] || 0) + 1; }); });
    var weakIds = Object.keys(weak).sort(function (a, b) { return weak[b] - weak[a] || st(a).m - st(b).m; }).slice(0, 3);
    var wrong = rows.filter(function (r) { return r.s < 0.7; });
    return '<div class="head"><div class="eyebrow">' + (Q.kind === "check" ? "Concept check complete" : "Quiz complete") + '</div><h1>' + pct + "%</h1><p class=\"muted\">" + rows.filter(function (r) { return r.s >= 0.7; }).length + " of " + rows.length + " correct · " + Math.max(1, Math.round((Q.end - Q.start) / 60000)) + " min · " + (Q.mode === "exam" ? "Exam Mode" : "Practice mode") + "</p></div>" +
      '<div class="card"><h3>Topic breakdown</h3><div class="table-wrap"><table><thead><tr><th>Topic</th><th class="num">Questions</th><th class="num">This quiz</th><th>Course mastery</th></tr></thead><tbody>' + tb.map(function (t) { return "<tr><td>" + esc(t.name) + '</td><td class="num">' + t.n + '</td><td class="num">' + t.acc + "%</td><td>" + meter(t.mastery, [], t.name) + "</td></tr>"; }).join("") + "</tbody></table></div></div>" +
      '<div class="card"><h3>Revise next</h3>' + (weakIds.length ? '<div class="row">' + weakIds.map(function (id) { return chip(id, id + " " + trim(C.byId[id].name, 40)); }).join("") + '</div><p class="small muted">These concepts are now first in your revision queue.</p>' : '<p class="small">No weak concepts in this quiz. Raise the difficulty next time.</p>') + "</div>" +
      (wrong.length ? '<div class="card"><h3>Explanations for what you missed</h3><ul class="clean">' + wrong.map(function (r) {
        var q = r.q, ans = Q.ans[q.id];
        return '<li class="box stack tight"><b>' + esc(q.q) + "</b>" + (q.o ? '<span class="small">Your answer: ' + esc(ans === undefined || ans === "" ? "none" : q.o[Number(ans)]) + " · Correct: " + esc(q.o[q.a]) + "</span>" : q.auto ? '<span class="small">Your answer: ' + esc(ans || "none") + " · Accepted: " + esc(q.a.join(", ")) + "</span>" : "") + '<span class="small">' + esc(q.x) + "</span><span>" + q.c.map(function (id) { return chip(id); }).join(" ") + "</span></li>";
      }).join("") + "</ul></div>" : "") +
      '<div class="row">' + (Q.back ? '<a class="btn primary" href="#' + Q.back + '">Back to ' + esc(Q.back) + "</a>" : "") + '<button class="btn' + (Q.back ? "" : " primary") + '" data-act="quiz-new">New quiz</button><a class="btn quiet" href="#progress">See my progress</a></div>';
  }
  function quizBuilder() {
    var c = U.quizCfg, last = S.quizzes.slice(-5).reverse();
    var seg = function (name, opts, cur) { return '<div class="seg" role="group">' + opts.map(function (o) { return '<button data-act="qcfg" data-k="' + name + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + "</button>"; }).join("") + "</div>"; };
    return '<div class="head"><div class="eyebrow">' + C.questions.filter(function (q) { return q.auto; }).length + " auto-marked and " + C.questions.filter(function (q) { return !q.auto; }).length + ' written questions</div><h1>Quiz & Exam</h1><p class="muted">Questions are picked for you: 40% from weak or due concepts, 40% from high-importance concepts you haven\'t been tested on, 20% to keep strong concepts fresh. Items you answered correctly in the last 14 days are skipped.</p></div>' +
      '<div class="card stack"><div class="grid g2"><div class="stack tight"><h4>Size</h4>' + seg("n", [[10, "10"], [25, "25"], [50, "50 · mock"], ["full", "Full course"]], c.n) + '</div><div class="stack tight"><h4>Mode</h4>' + seg("mode", [["practice", "Practice"], ["exam", "Exam Mode"]], c.mode) + "</div>" +
      '<div class="stack tight"><h4>Difficulty</h4>' + seg("level", [[1, "Beginner"], [2, "Intermediate"], [3, "Advanced"], [4, "Expert"], [5, "Exam simulation"]], c.level) + '</div><label class="lbl small">Module<select data-act-change="qcfg-module"><option value="">All modules</option>' + G.MODULES.map(function (m) { return '<option value="' + m.id + '"' + (c.module === m.id ? " selected" : "") + ">" + m.id + " " + esc(m.title) + "</option>"; }).join("") + "</select></label></div>" +
      '<label class="check"><input type="checkbox" data-act-change="qcfg-open"' + (c.open ? " checked" : "") + "><span>Include written questions (2-, 4- and 8-mark, scenario, design). You mark them against key points at the end" + (sample ? ", or the tutor does" : "") + ".</span></label>" +
      '<div class="row"><button class="btn primary" data-act="quiz-start">Start</button><span class="small muted">Exam Mode hides hints and answers until you finish. A 25+ question Exam Mode quiz counts as a mock exam for Exam Readiness.</span></div></div>' +
      '<div class="grid g3"><div class="card fill"><h3>Weak-topic 10</h3><p class="small muted">Ten questions on your highest-priority concepts.</p><div><button class="btn sm" data-act="quick-quiz" data-n="10">Start</button></div></div><div class="card fill"><h3>Mock exam</h3><p class="small muted">50 questions, exam mix, Exam Mode.</p><div><button class="btn sm" data-act="mock">Start mock</button></div></div><div class="card fill"><h3>Night before the exam</h3><p class="small muted">One-pagers for high-importance concepts, then 25 questions.</p><div><a class="btn sm" href="#revision" data-act="rev-mode" data-v="night">Open</a></div></div></div>' +
      (last.length ? '<div class="card"><h3>Recent results</h3><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th class="num">Questions</th><th class="num">Score</th></tr></thead><tbody>' + last.map(function (q) { return "<tr><td>" + fmtDate(q.ts) + "</td><td>" + esc(q.kind === "check" ? "Concept check" : q.mode === "exam" ? "Exam Mode" : "Practice") + '</td><td class="num">' + q.n + '</td><td class="num">' + Math.round(q.score * 100) + "%</td></tr>"; }).join("") + "</tbody></table></div></div>" : "");
  }
  function finishQuiz() {
    var Q = U.quiz;
    Q.scores = Q.scores || {};
    Q.items.forEach(function (q) {
      if (q.auto) { if (Q.scores[q.id] == null) Q.scores[q.id] = grade(q, Q.ans[q.id]); }
      else if (Q.scores[q.id] == null) { var m = Q.marks && Q.marks[q.id]; Q.scores[q.id] = m ? m.filter(Boolean).length / q.k.length : 0; }
      recordQ(Q, q, Q.scores[q.id]);
      if (!q.auto) q.c.forEach(function (id) { E.recordPractice(S, id, Q.scores[q.id], now()); });
    });
    var tot = 0, max = 0; Q.items.forEach(function (q) { tot += Q.scores[q.id] * (q.m || 1); max += q.m || 1; });
    Q.end = now(); Q.done = true;
    var score = max ? tot / max : 0;
    S.quizzes.push({ ts: now(), n: Q.items.length, score: score, mode: Q.mode, kind: Q.kind });
    if (Q.kind === "check") E.recordCheck(S, Q.concept, score, now());
    changed();
  }

  /* =============== PRACTICE LAB (22 steps) =============== */
  function viewPractice() {
    var sess = U.psession != null ? S.practice[U.psession] : null;
    if (!sess) {
      return '<div class="head"><div class="eyebrow">Guided practice · 22 steps in 5 phases</div><h1>Practice Lab</h1><p class="muted">Give a broad business idea. The board will not hand you a design. It asks one question at a time, you attempt it, then you see what you missed and why. You can\'t design the solution until you\'ve answered "Is AI actually required?".</p></div>' +
        '<div class="card stack"><label class="lbl">Your business idea<input type="text" id="idea" placeholder="e.g. Build an AI assistant to improve recruitment efficiency"></label><div class="row">' + G.SAMPLE_IDEAS.map(function (s) { return '<button class="chip" data-act="idea" data-v="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + '</div><div><button class="btn primary" data-act="practice-start">Start guided practice</button></div></div>' +
        (S.practice.length ? '<div class="card"><h3>Your sessions</h3><ul class="clean">' + S.practice.map(function (p, i) { var done = Object.keys(p.scores || {}).length; return '<li class="row between"><span>' + esc(p.idea) + ' <span class="small muted">· ' + done + "/22 steps · " + fmtDate(p.ts) + '</span></span><button class="btn sm" data-act="practice-open" data-i="' + i + '">' + (done >= 22 ? "Review" : "Resume") + "</button></li>"; }).reverse().join("") + "</ul></div>" : "");
    }
    var steps = G.PRACTICE_STEPS, i = U.pstep, s = steps[i];
    var phases = [];
    var list = steps.map(function (x, j) {
      var ph = phases.indexOf(x.phase) < 0 ? (phases.push(x.phase), '<div class="phase">' + x.phase + "</div>") : "";
      var sc = sess.scores && sess.scores[x.id];
      return ph + '<button data-act="pstep" data-i="' + j + '"' + (j === i ? ' aria-current="step"' : "") + '><span class="dot ' + (sc == null ? "st0" : sc >= 0.7 ? "st3" : "st1") + '"></span>' + (j + 1) + ". " + esc(x.label) + "</button>";
    }).join("");
    var gateBlocked = i >= 7 && !(sess.answers && sess.answers.s6);
    var att = (sess.attempts && sess.attempts[s.id]) || 0, sc = sess.scores && sess.scores[s.id];
    var key = "ps-" + U.psession + "-" + s.id;
    var main = gateBlocked ? '<div class="note warn"><b>Phase gate.</b> Answer step 6, "Is AI actually required?", before designing the solution. If the honest answer is "no", the design becomes a plain process improvement, which is a valid result and earns full credit.</div><div><button class="btn primary" data-act="pstep" data-i="5">Go to step 6</button></div>' :
      '<div class="eyebrow">' + esc(s.phase) + " · Step " + (i + 1) + " of 22</div><h2>" + esc(s.label) + "</h2><p><b>" + esc(s.q) + '</b></p><div class="row small muted">Practises ' + chip(s.c, s.c + " " + C.byId[s.c].name) + "</div>" +
      '<textarea class="big" data-bind="practice.' + U.psession + ".answers." + s.id + '" placeholder="Your attempt">' + esc((sess.answers || {})[s.id] || "") + "</textarea>" +
      (att ? checklist(key, s.exp, sess.checks && sess.checks[s.id]) : "") +
      '<div class="row"><button class="btn primary" data-act="pcheck">' + (att ? "Re-check my answer" : "Check my answer") + "</button>" + (att && sample ? '<button class="btn" data-act="ptutor">Ask the tutor to evaluate</button>' : "") +
      (att >= 2 && sample ? '<button class="btn quiet" data-act="pimprove">Show a stronger answer</button>' : "") + (i < 21 ? '<button class="btn quiet" data-act="pstep" data-i="' + (i + 1) + '">Next step →</button>' : '<button class="btn quiet" data-act="psummary">Finish and see summary</button>') + "</div>" +
      (sc != null ? '<p class="small muted">Step score: ' + Math.round(sc * 100) + "% after " + att + " attempt" + (att > 1 ? "s" : "") + "</p>" : "") + (U.evals[key] || "");
    if (U.psummary) main = practiceSummary(sess);
    return '<div class="row between"><div class="head"><div class="eyebrow">Practice Lab</div><h1>' + esc(sess.idea) + '</h1></div><button class="btn sm" data-act="practice-close">All sessions</button></div>' +
      '<div class="split"><nav class="card steps" aria-label="Steps">' + list + '</nav><div class="card stack">' + main + "</div></div>";
  }
  function practiceSummary(sess) {
    var rows = G.PRACTICE_STEPS.map(function (s, j) { var v = sess.scores && sess.scores[s.id]; return "<tr><td>" + (j + 1) + ". " + esc(s.label) + "</td><td>" + chip(s.c) + '</td><td class="num">' + (v == null ? "–" : Math.round(v * 100) + "%") + "</td></tr>"; }).join("");
    return '<h2>Session summary</h2><div class="table-wrap"><table><thead><tr><th>Step</th><th>Concept</th><th class="num">Score</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="row"><button class="btn" data-act="pcopy">Copy session as Markdown</button><button class="btn quiet" data-act="psummary-close">Back to steps</button></div>';
  }

  /* =============== LABS =============== */
  function viewLabGroup(group) {
    var ids = group === "automation" ? ["automation", "dashboard", "ci"] : group === "rag" ? ["rag", "multisource"] : [group];
    var cur = ids.length > 1 ? U.labTab[group] : group, lab = LABS[cur];
    var tabs = ids.length > 1 ? '<div class="tabs" role="tablist">' + ids.map(function (id) { return '<button role="tab" aria-selected="' + (id === cur) + '" data-act="labtab" data-g="' + group + '" data-v="' + id + '">' + esc(LABS[id].name) + "</button>"; }).join("") + "</div>" : "";
    var L = S.labs[cur] || {}, fields = L.fields || {}, rub = G.RUBRICS[lab.rubric];
    var out = '<div class="head"><div class="eyebrow">' + esc(modName(lab.module)) + " · scored with " + esc(rub.name) + " rubric</div><h1>" + esc(TITLES[group] || lab.name) + "</h1><p class=\"muted\">" + esc(lab.intro) + "</p></div>" + tabs;
    out += '<div class="card fill"><h4>Scenario</h4><p>' + esc(lab.brief) + '</p><details><summary class="small">Use my own scenario instead</summary><textarea data-bind="labs.' + cur + '.brief" placeholder="Describe a real situation from your work (no personal data).">' + esc(L.brief || "") + "</textarea></details></div>";
    if (lab.suitability) out += suitabilityCard(cur, L);
    if (lab.gate) out += '<div class="note warn"><b>Gate question.</b> ' + esc(lab.gate) + "</div>";
    if (cur === "prompt") out += '<div class="row"><button class="btn sm" data-act="costar">Insert COSTAR scaffold</button><span class="small muted">The scaffold adds headings only. You still write every line.</span></div>';
    out += lab.fields.map(function (f) {
      var key = "lab-" + cur + "-" + f.id, chk = L.checks && L.checks[f.id], fs = L.fscores && L.fscores[f.id];
      return '<div class="card"><div class="row between"><h3>' + esc(f.label) + "</h3>" + chip(f.c, f.c + " " + trim(C.byId[f.c].name, 30)) + '</div><p class="small muted">' + esc(f.q) + '</p><textarea class="' + (f.big ? "big " : "") + (cur === "prompt" ? "code" : "") + '" id="' + key + '" data-bind="labs.' + cur + ".fields." + f.id + '">' + esc(fields[f.id] || "") + "</textarea>" +
        (L.checked ? checklist(key, f.exp, chk) + (fs != null ? '<p class="small muted">Field score ' + Math.round(fs * 100) + "%</p>" : "") : "") + "</div>";
    }).join("");
    var verLast = (L.versions || []).slice(-2);
    out += '<div class="card stack"><div class="row"><button class="btn primary" data-act="lab-check" data-lab="' + cur + '">' + (L.checked ? "Re-score with my ticks" : "Check against the rubric") + "</button>" +
      (sample ? '<button class="btn" data-act="lab-tutor" data-lab="' + cur + '">Ask the tutor to score it</button>' : '<button class="btn" data-act="lab-copy" data-lab="' + cur + '">Copy a tutor prompt</button>') +
      '<button class="btn quiet" data-act="lab-version" data-lab="' + cur + '">Save as a version</button>' + (cur === "prompt" && sample && L.score != null ? '<button class="btn quiet" data-act="prompt-improve">Show an improved version</button>' : "") + "</div>" +
      (L.score != null ? '<p class="small">Current score <b class="num">' + Math.round(L.score * 100) + "%</b>" + (L.score < 0.7 ? " · revise the weakest fields, then re-score." : " · strong. Try the transfer: rewrite it for a non-HR function.") + "</p>" : "") +
      (L.checked ? '<p class="small muted">Rubric criteria: ' + esc(rub.criteria.join(" · ")) + "</p>" : "") + (U.evals["lab-" + cur] || "") + "</div>";
    if (verLast.length) {
      out += '<div class="card"><h3>Versions</h3><p class="small muted">' + (L.versions.length) + ' saved. Comparing the last two.</p><div class="grid g2">' + verLast.map(function (v, i) {
        return '<div class="stack tight"><b>Version ' + (L.versions.length - verLast.length + i + 1) + ' <span class="small muted">· ' + fmtDate(v.ts) + (v.score != null ? " · " + Math.round(v.score * 100) + "%" : "") + '</span></b><pre class="out">' + esc(lab.fields.map(function (f) { return "## " + f.label + "\n" + (v.fields[f.id] || ""); }).join("\n\n")) + "</pre></div>";
      }).join("") + "</div>" + (verLast.length === 2 && verLast[0].score != null && verLast[1].score != null ? '<p class="small">Score change: <b class="num">' + (verLast[1].score >= verLast[0].score ? "+" : "") + Math.round((verLast[1].score - verLast[0].score) * 100) + " points</b></p>" : "") + "</div>";
    }
    return out;
  }
  function suitabilityCard(cur, L) {
    var v = L.suit || {}, tot = 0;
    G.SUITABILITY.forEach(function (s) { var x = Number(v[s.id] || 0); tot += s.rev ? 3 - x : x; });
    var verdict = tot >= 14 ? "Good automation candidate." : tot >= 10 ? "Partial automation: automate the data-gathering, keep decisions human." : "Weak candidate. Standardise the process first, or keep it manual.";
    if (Number(v.judg || 0) >= 2) verdict += " Judgement is high, so keep a human in the loop.";
    return '<div class="card"><h3>Is it suitable for automation?</h3><p class="small muted">Score each criterion 0–3. Judgement and data sensitivity count against automation.</p><div class="grid g4">' + G.SUITABILITY.map(function (s) {
      return '<label class="lbl small">' + esc(s.label) + ' <span class="muted">' + esc(s.hint) + '</span><input type="range" min="0" max="3" step="1" value="' + (v[s.id] || 0) + '" data-act-input="suit" data-lab="' + cur + '" data-k="' + s.id + '" aria-valuetext="' + (v[s.id] || 0) + '"><span class="num small">' + (v[s.id] || 0) + "/3</span></label>";
    }).join("") + '</div><p><b class="num">' + tot + "/21</b> · " + esc(verdict) + "</p></div>";
  }

  /* =============== BUILD =============== */
  function viewBuild() {
    if (U.project) return projectView(U.project);
    return '<div class="head"><div class="eyebrow">Eight levels · each maps to the competency roadmap</div><h1>Build a Project</h1><p class="muted">Each level unlocks when the previous project scores 70% or more. Projects use a 28-section canvas; every section names the course concept it applies.</p></div>' +
      '<div class="card stack"><label class="lbl">I want to build…<input type="text" id="want" placeholder="e.g. an assistant that answers hiring managers\' status questions"></label><div><button class="btn" data-act="want">Find the right project level</button></div>' + (U.wantResult || "") + "</div>" +
      '<div class="grid g2">' + G.PROJECTS.map(function (p, i) {
        var s = S.projects[p.id] || {}, prev = i ? S.projects[G.PROJECTS[i - 1].id] : null, locked = i > 0 && !(prev && prev.score >= 0.7);
        return '<div class="card' + (locked ? "" : " lead") + '"><div class="row between"><span class="eyebrow">Level ' + p.level + " · " + esc(p.name) + "</span>" + (s.score != null ? '<span class="pill st' + (s.score >= 0.7 ? 3 : 1) + '">' + Math.round(s.score * 100) + "%</span>" : locked ? '<span class="pill st0">Locked</span>' : '<span class="pill st1">Open</span>') + "</div><h3>" + p.id + " " + esc(p.title) + '</h3><p class="small">' + esc(p.brief) + '</p><div class="row">' + p.concepts.map(function (id) { return chip(id); }).join("") + "</div>" + meter(100 * (s.progress || 0), [], "Sections filled") +
          '<div class="row"><button class="btn sm' + (locked ? "" : " primary") + '" data-act="open-project" data-id="' + p.id + '">' + (locked ? "Open anyway" : s.progress ? "Continue" : "Start") + '</button><span class="small muted">Consulting offer it rehearses: ' + esc(p.offer) + "</span></div></div>";
      }).join("") + "</div>";
  }
  function projectView(pid) {
    var p = G.PROJECTS.filter(function (x) { return x.id === pid; })[0], s = S.projects[pid] || {}, secs = s.sections || {}, self = s.self || {};
    var rub = G.RUBRICS[p.rubric];
    return '<div class="row between"><div class="head"><div class="eyebrow">Level ' + p.level + " · " + esc(p.name) + "</div><h1>" + p.id + " " + esc(p.title) + '</h1></div><button class="btn sm" data-act="close-project">All projects</button></div>' +
      '<div class="card fill"><p>' + esc(p.brief) + '</p><div class="row small">Transfer variant: ' + esc(p.transfer) + " · Consulting offer: " + esc(p.offer) + " · Scored with: " + esc(rub.name) + "</div>" + meter(100 * (s.progress || 0), [], "Sections filled") + '<p class="small muted num">' + Math.round(100 * (s.progress || 0)) + "% of sections filled" + (s.score != null ? " · project score " + Math.round(s.score * 100) + "%" : "") + "</p></div>" +
      (p.focus.length ? '<div class="note small">Focus sections for this level are open below. Mark the others "Not applicable" with a one-line reason if they don\'t apply; a justified N/A earns credit, a blank doesn\'t.</div>' : "") +
      '<div class="stack">' + G.PROJECT_SECTIONS.map(function (sec, i) {
        var k = C.byId[sec[2]], open = p.focus.indexOf(i) >= 0 || secs[i] || !p.focus.length;
        return '<details class="card"' + (open ? " open" : "") + '><summary><b>' + (i + 1) + ". " + esc(sec[0]) + "</b>" + (secs[i] ? ' <span class="pill st' + (self[i] >= 3 ? 3 : 1) + '">' + (self[i] != null ? self[i] + "/4" : "drafted") + "</span>" : "") + '</summary><div class="stack tight"><p class="small muted">' + esc(sec[1]) + '</p><p class="small">Concept map: this section uses ' + esc(modName(k.m).split(" · ")[0]) + " concept " + chip(k.id, k.id + " " + k.name) + '. Say <i>why</i> in your answer.</p><textarea data-bind="projects.' + pid + ".sections." + i + '">' + esc(secs[i] || "") + '</textarea><div class="row small"><span>Self-score:</span><div class="seg" role="group">' + [0, 1, 2, 3, 4].map(function (n) { return '<button data-act="psec-score" data-p="' + pid + '" data-i="' + i + '" data-v="' + n + '" aria-pressed="' + (self[i] === n) + '">' + n + "</button>"; }).join("") + '</div><span class="muted">0 missing · 2 partial · 4 specific and justified</span></div></div></details>';
      }).join("") + "</div>" +
      '<div class="card stack"><div class="row">' + (sample ? '<button class="btn primary" data-act="project-tutor" data-id="' + pid + '">Ask the tutor to review the project</button>' : '<button class="btn" data-act="project-copy-prompt" data-id="' + pid + '">Copy a tutor prompt</button>') + '<button class="btn" data-act="project-copy" data-id="' + pid + '">Copy project pack (Markdown)</button></div>' + (U.evals["proj-" + pid] || "") + "</div>";
  }
  function projectProgress(pid) {
    var s = S.projects[pid] || {}, secs = s.sections || {}, self = s.self || {};
    var filled = Object.keys(secs).filter(function (k) { return String(secs[k]).trim().length > 10; }).length;
    s.progress = filled / G.PROJECT_SECTIONS.length;
    var scored = Object.keys(self).filter(function (k) { return secs[k]; });
    if (scored.length) s.score = scored.reduce(function (t, k) { return t + self[k]; }, 0) / (4 * Math.max(scored.length, Math.round(G.PROJECT_SECTIONS.length * 0.6)));
    S.projects[pid] = s;
  }

  /* =============== CASES =============== */
  function viewCases() {
    if (U.caseId) {
      var K = G.CASES.filter(function (x) { return x.id === U.caseId; })[0], cs = S.cases[K.id] || {}, ans = cs.answers || {};
      var rub = G.RUBRICS.R8;
      return '<div class="row between"><div class="head"><div class="eyebrow">' + esc(K.fn) + '</div><h1>' + esc(K.title) + '</h1></div><button class="btn sm" data-act="case-close">All cases</button></div><div class="card fill"><p>' + esc(K.s) + "</p></div>" +
        G.CASE_QUESTIONS.map(function (q, i) { return '<label class="lbl">' + (i + 1) + ". " + esc(q) + '<textarea data-bind="cases.' + K.id + ".answers." + i + '">' + esc(ans[i] || "") + "</textarea></label>"; }).join("") +
        (cs.submitted ? '<div class="card"><h3>Model answer</h3><p>' + esc(K.model) + '</p><h4>Score your solution (business case rubric)</h4><div class="stack tight">' + rub.criteria.map(function (c, i) { var v = (cs.self || {})[i]; return '<div class="row between small"><span>' + esc(c) + '</span><div class="seg" role="group">' + [0, 1, 2, 3, 4].map(function (n) { return '<button data-act="case-score" data-i="' + i + '" data-v="' + n + '" aria-pressed="' + (v === n) + '">' + n + "</button>"; }).join("") + "</div></div>"; }).join("") + "</div>" + (cs.score != null ? '<p><b class="num">' + Math.round(cs.score * 100) + "%</b></p>" : "") + (sample ? '<div><button class="btn" data-act="case-tutor">Ask the tutor to score it</button></div>' : "") + (U.evals["case-" + K.id] || "") + "</div>" :
          '<div class="row"><button class="btn primary" data-act="case-submit">Submit and see the model answer</button><span class="small muted">The model answer stays hidden until you submit.</span></div>');
    }
    return '<div class="head"><div class="eyebrow">10 cases · 9 questions each</div><h1>Case Studies</h1><p class="muted">Realistic business cases across functions. Answer all nine questions, then compare with the model answer and score yourself on the business-case rubric.</p></div><div class="grid g3">' +
      G.CASES.map(function (K) { var cs = S.cases[K.id]; return '<div class="card"><div class="row between"><span class="eyebrow">' + esc(K.fn) + "</span>" + (cs && cs.score != null ? '<span class="pill st3">' + Math.round(cs.score * 100) + "%</span>" : "") + "</div><h3>" + esc(K.title) + '</h3><p class="small muted">' + esc(trim(K.s, 140)) + '</p><div><button class="btn sm" data-act="case-open" data-id="' + K.id + '">Open case</button></div></div>'; }).join("") + "</div>";
  }

  /* =============== PROGRESS =============== */
  function viewProgress() {
    var t = now(), sum = E.summary(S, C, t), tb = E.topicBreakdown(S, C, t), rec = E.recommend(S, C, t);
    var weak = E.priorities(S, C, t, statuses()).filter(function (x) { return x.st.st >= 1; }).slice(0, 5);
    var counts = [0, 0, 0, 0, 0]; C.concepts.forEach(function (k) { counts[st(k.id).st]++; });
    return '<div class="head"><div class="eyebrow">Evidence-based progress</div><h1>My Progress</h1></div>' +
      '<section class="grid g4">' + stat(sum.mastery, "%", "Mastery", meter(sum.mastery)) + stat(sum.readiness, "%", "Exam readiness", meter(sum.readiness, [70, 80])) + stat(sum.practical, "%", "Practical skills", meter(sum.practical)) + stat(sum.completion, "%", "Concept completion (Competent or better)", meter(sum.completion)) + stat(sum.accuracy30 == null ? "–" : sum.accuracy30, sum.accuracy30 == null ? "" : "%", "Quiz accuracy, 30 days · all-time " + (sum.accuracyAll == null ? "–" : sum.accuracyAll + "%")) + stat(sum.projectsDone, " / 8", "Projects at 70%+") + "</section>" +
      '<div class="card"><h3>Recommended next action</h3>' + (rec.top ? "<p>Revise " + conceptLink(rec.top.id) + ' <span class="small muted">(highest revision priority, ' + rec.top.p + ")</span></p>" : rec.lesson ? "<p>Start " + conceptLink(rec.lesson.id) + "</p>" : "<p>Take a quiz to generate evidence.</p>") + "</div>" +
      '<div class="card"><h3>Status of all 76 concepts</h3><div class="row">' + counts.map(function (n, i) { return '<span class="chip st' + i + '">' + STN[i] + ": " + n + "</span>"; }).join("") + "</div></div>" +
      '<div class="card"><h3>Topic breakdown</h3><div class="table-wrap"><table><thead><tr><th>Topic</th><th class="num">Attempts</th><th class="num">Accuracy</th><th>Mastery</th><th class="num">Mastery</th></tr></thead><tbody>' + tb.map(function (r) { return "<tr><td>" + esc(r.name) + '</td><td class="num">' + r.n + '</td><td class="num">' + (r.acc == null ? "–" : r.acc + "%") + "</td><td style=\"min-width:120px\">" + meter(r.mastery, [], r.name) + '</td><td class="num">' + r.mastery + "</td></tr>"; }).join("") + "</tbody></table></div></div>" +
      '<div class="card"><h3>Weakest studied concepts</h3>' + (weak.length ? '<ul class="clean">' + weak.map(function (x) { return '<li class="row between">' + conceptLink(x.id) + '<span class="small muted num">mastery ' + x.st.m + " · priority " + x.p + "</span></li>"; }).join("") + "</ul>" : '<p class="small muted">Nothing studied yet.</p>') + "</div>" +
      '<details class="card"><summary><b>How these numbers are calculated</b></summary><ul class="bul small"><li>Concept mastery = 20% concept check + 30% quiz (recency-weighted, harder questions count more) + 20% practice + 15% project use + 15% spaced-review retention, minus a penalty for repeated mistakes. No test → capped at 60; no practice → 55; no passed spaced review → 84.</li><li>Course mastery weights concepts by exam importance (H 3, M 2, L 1).</li><li>Exam readiness = 60% recent test accuracy + 25% share of high-importance concepts at Competent + 15% last mock exam.</li><li>Practical skills = 50% average lab score + 50% project-ladder progress.</li><li>Mastered requires mastery 85+, two passed reviews at least 7 days apart, and use in a project or a teach-back of 80%+.</li></ul></details>' +
      '<div class="card stack"><h3>Your data</h3><p class="small muted">' + (db ? "Progress is stored in your Claude account and in this browser." : "Progress is stored in this browser only. Copy it to keep a backup or move it to another device.") + '</p><div class="row"><button class="btn sm" data-act="export">Copy progress as JSON</button><button class="btn sm" data-act="import-open">Import progress</button><button class="btn sm quiet" data-act="reset">Reset all progress</button></div>' + (U.importOpen ? '<textarea id="import-text" class="code" placeholder="Paste a progress JSON copied from this board"></textarea><div><button class="btn sm primary" data-act="import">Load this progress</button></div>' : "") + (U.resetAsk ? '<div class="note warn small">This erases every attempt, lab and project on this board. <button class="btn sm" data-act="reset-yes">Erase everything</button> <button class="btn sm quiet" data-act="reset-no">Keep my progress</button></div>' : "") + "</div>";
  }

  /* =============== REVISION =============== */
  function viewRevision() {
    var t = now(), due = E.dueConcepts(S, C, t), pri = E.priorities(S, C, t, statuses()).filter(function (x) { return x.st.st >= 1; });
    var wrongQs = {}; S.attempts.forEach(function (a) { if (a.q) { if (a.score < 0.7) wrongQs[a.q] = 1; else delete wrongQs[a.q]; } });
    var nWrong = Object.keys(wrongQs).length;
    var mode = U.rev;
    var body = "";
    if (mode === "night") {
      var hs = C.concepts.filter(function (k) { return k.exam === "H"; });
      body = '<div class="card stack"><div class="row between"><h2>Night before the exam</h2><button class="btn primary" data-act="night-exam">Take the 25-question exam</button></div><p class="small muted">Read each takeaway aloud once. Stop when you reach the end; sleep matters more than one more page.</p>' +
        G.MODULES.map(function (m) { var ks = hs.filter(function (k) { return k.m === m.id; }); if (!ks.length) return ""; return "<h4>" + esc(m.id + " " + m.title) + '</h4><ul class="clean">' + ks.map(function (k) { return '<li class="small"><a href="#' + k.id + '"><b>' + esc(k.name) + "</b></a>: " + esc(k.d.take) + ' <span class="muted">· ' + esc(k.d.aid) + "</span></li>"; }).join("") + "</ul>"; }).join("") + "</div>";
    } else if (mode === "rapid") {
      var top = (pri.length ? pri : E.priorities(S, C, t, statuses())).slice(0, 10);
      body = '<div class="card stack"><div class="row between"><h2>Rapid revision · 15 minutes</h2><button class="btn primary" data-act="rapid-quiz">Quiz me on these 10</button></div><ul class="clean">' + top.map(function (x) { var k = C.byId[x.id]; return '<li class="box"><b><a href="#' + k.id + '">' + esc(k.id + " " + k.name) + "</a></b><br><span class=\"small\">" + esc(k.d.take) + '</span><br><span class="small muted">' + esc(k.d.aid) + "</span></li>"; }).join("") + "</ul></div>";
    } else if (mode === "pairs") {
      body = '<div class="card stack"><div class="row between"><h2>Confusion pairs</h2><button class="btn primary" data-act="pairs-quiz">Drill these pairs</button></div><div class="table-wrap"><table><thead><tr><th>Pair</th><th>The difference</th></tr></thead><tbody>' + G.CONFUSION_PAIRS.map(function (p) { return "<tr><td>" + chip(p[0], p[0] + " " + trim(C.byId[p[0]].name, 28)) + " " + (p[0] !== p[1] ? chip(p[1], p[1] + " " + trim(C.byId[p[1]].name, 28)) : "") + "</td><td>" + esc(p[2]) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    } else if (mode && mode.indexOf("mod-") === 0) {
      var mid = mode.slice(4), m = MODS[mid];
      body = '<div class="card stack"><h2>' + esc(mid + " · " + m.title) + ' — one-page summary</h2><p class="small"><b>Frameworks:</b> ' + esc(m.frameworks.join("; ")) + '</p><div class="table-wrap"><table><thead><tr><th>Concept</th><th>Exam takeaway</th><th>Memory aid</th><th>Common mistake</th></tr></thead><tbody>' + C.concepts.filter(function (k) { return k.m === mid; }).map(function (k) { return '<tr><td><a href="#' + k.id + '">' + esc(k.id + " " + k.name) + "</a></td><td>" + esc(k.d.take) + "</td><td>" + esc(k.d.aid) + "</td><td>" + esc(k.d.mistake || (k.d.mistakes || [])[0] || "") + "</td></tr>"; }).join("") + '</tbody></table></div><div><button class="btn sm" data-act="mod-quiz" data-m="' + mid + '">10-question quiz on this module</button></div></div>';
    }
    return '<div class="head"><div class="eyebrow">Spaced revision · Leitner boxes 1, 3, 7, 14, 30 days</div><h1>Revision Centre</h1><p class="muted">Concepts you get wrong come back sooner, in new wording. Mastered concepts that aren\'t due are left alone.</p></div>' +
      '<div class="grid g3"><div class="card fill"><h3>Due today</h3><div class="stat"><div class="v num">' + due.length + '</div></div><p class="small muted">' + (due.length ? due.slice(0, 6).join(", ") + (due.length > 6 ? "…" : "") : "Nothing due. Spaced reviews appear here as you study.") + '</p><div><button class="btn sm primary" data-act="due-quiz"' + (due.length ? "" : " disabled") + '>Review due concepts</button></div></div>' +
      '<div class="card fill"><h3>Error replay</h3><div class="stat"><div class="v num">' + nWrong + '</div></div><p class="small muted">Questions you got wrong and haven\'t yet answered correctly.</p><div><button class="btn sm" data-act="error-replay"' + (nWrong ? "" : " disabled") + '>Replay in new wording</button></div></div>' +
      '<div class="card fill"><h3>Quick routes</h3><div class="row"><button class="btn sm" data-act="rev-mode" data-v="rapid">Rapid revision · 15 min</button><button class="btn sm" data-act="rev-mode" data-v="night">Night before exam</button><button class="btn sm" data-act="rev-mode" data-v="pairs">Confusion pairs</button></div><label class="lbl small">Module one-pager<select data-act-change="rev-mod"><option value="">Choose a module</option>' + G.MODULES.map(function (m) { return '<option value="' + m.id + '"' + (mode === "mod-" + m.id ? " selected" : "") + ">" + m.id + " " + esc(m.title) + "</option>"; }).join("") + "</select></label></div></div>" + body;
  }

  /* =============== GAPS =============== */
  function viewGaps() {
    var t = now();
    var shade = function (v) { if (v == null) return '<span class="c st0" title="No evidence"></span>'; var cls = v < 50 ? "st1" : v < 70 ? "st2" : v < 85 ? "st3" : "st4"; return '<span class="c ' + cls + '" title="' + Math.round(v) + '"></span><span class="small num"> ' + Math.round(v) + "</span>"; };
    var errs = {}; S.attempts.forEach(function (a) { if (a.score < 0.5 && t - a.ts < 30 * E.DAY) (a.c || []).forEach(function (id) { errs[id] = (errs[id] || 0) + 1; }); });
    var repeat = Object.keys(errs).filter(function (id) { return errs[id] >= 2; }).sort(function (a, b) { return errs[b] - errs[a]; });
    var blocked = C.concepts.filter(function (k) { return st(k.id).st === 0 && !E.unlocked(C, statuses(), k.id); });
    return '<div class="head"><div class="eyebrow">Evidence heat map</div><h1>Knowledge Gaps</h1><p class="muted">Each row shows which kinds of evidence exist for a concept. Empty cells are gaps. Shading runs from light (weak) to navy (strong); the number is the score.</p></div>' +
      '<div class="grid g2"><div class="card"><h3>Repeated mistakes (last 30 days)</h3>' + (repeat.length ? '<ul class="clean">' + repeat.map(function (id) { return '<li class="row between">' + conceptLink(id) + '<span class="small muted">' + errs[id] + " wrong</span></li>"; }).join("") + "</ul>" : '<p class="small muted">No concept has been missed twice.</p>') + '</div><div class="card"><h3>Blocked by prerequisites</h3><p class="small muted">' + blocked.length + " concepts wait on a prerequisite you haven't started.</p>" + (blocked.length ? '<div class="row">' + blocked.slice(0, 16).map(function (k) { return chip(k.id); }).join("") + "</div>" : "") + "</div></div>" +
      '<div class="table-wrap"><table class="heat"><thead><tr><th style="text-align:left">Concept</th><th>Check</th><th>Practice</th><th>Test</th><th>Build</th><th>Retention</th><th>Status</th></tr></thead><tbody>' +
      C.concepts.map(function (k) { var s = E.status(S, C, k.id, t), sc = s.s || {}; return '<tr><td style="text-align:left"><a href="#' + k.id + '" class="mono small">' + k.id + "</a> " + esc(trim(k.name, 40)) + "</td><td>" + shade(sc.U) + "</td><td>" + shade(sc.P) + "</td><td>" + shade(sc.Q) + "</td><td>" + shade(sc.B) + "</td><td>" + shade(sc.R) + '</td><td><span class="chip st' + s.st + '">' + STN[s.st] + "</span></td></tr>"; }).join("") + "</tbody></table></div>";
  }

  /* =============== EXPERT =============== */
  function viewExpert() {
    var sum = E.summary(S, C, now());
    return '<div class="head"><div class="eyebrow">Beyond the IITM course</div><h1>Expert Mode</h1><p class="muted">The competency roadmap from AI Aware to AI Solution Architect, and the allied concepts that extend the course. Allied material supplements the course; it never replaces it.</p></div>' +
      '<div class="card"><h3>Competency roadmap · you are at Level ' + sum.level + '</h3><div>' + G.ROADMAP.map(function (L) {
        var on = L.n <= sum.level, nx = L.n === sum.level + 1, P = L.project ? G.PROJECTS.filter(function (p) { return p.id === L.project; })[0] : null;
        return '<div class="lvl"><span class="badge' + (on ? " on" : nx ? " next" : "") + '">' + L.n + '</span><div class="stack tight"><b style="color:var(--heading)">' + esc(L.title) + '</b><div class="row">' + L.concepts.map(function (id) { return chip(id); }).join("") + '</div><span class="small">Hands-on: ' + esc(L.task) + (P ? " · Project: " + P.id + " " + esc(P.title) : "") + '</span><span class="small muted">Evidence of competence: ' + esc(L.evidence) + "</span></div></div>";
      }).join("") + '</div><p class="small muted">A level counts when all its concepts are Competent or better and its project (if any) scores 70%+.</p></div>' +
      '<h2>Allied concepts</h2><div class="grid g2">' + G.ALLIED.map(function (a) { var k = C.byId[a.ext]; return '<div class="card"><div class="row between"><h3>' + esc(a.t) + "</h3>" + srcTag(a.src) + '</div><p class="small">' + esc(a.s) + '</p><p class="small muted">Extends ' + chip(k.id, k.id + " " + k.name) + "</p>" + (a.vol ? '<p class="small muted">Changes quickly; verify at source.</p>' : "") + "</div>"; }).join("") + "</div>" +
      '<div class="card"><h3>Teach-back challenge</h3><p class="small">Pick any concept and explain it as you would to a business leader. Open the concept\'s Expert extension tab to write and score it.</p><div class="row">' + ["C03.2", "C05.2", "C07.3", "C11.2", "C13.1", "C13.4", "C14.4"].map(function (id) { return '<button class="chip" data-act="open-concept-tab" data-id="' + id + '" data-tab="expert">' + id + " " + esc(trim(C.byId[id].name, 30)) + "</button>"; }).join("") + "</div></div>";
  }

  var VIEWS = { home: viewHome, map: viewMap, learn: viewLearn, practice: viewPractice, quiz: viewQuiz, build: viewBuild, cases: viewCases, progress: viewProgress, revision: viewRevision, gaps: viewGaps, expert: viewExpert,
    prompt: function () { return viewLabGroup("prompt"); }, automation: function () { return viewLabGroup("automation"); }, rag: function () { return viewLabGroup("rag"); }, assistant: function () { return viewLabGroup("assistant"); }, agent: function () { return viewLabGroup("agent"); }, multiagent: function () { return viewLabGroup("multiagent"); }, governance: function () { return viewLabGroup("governance"); } };

  /* =============== overlay: tutor drawer, copy fallback, menu scrim =============== */
  function renderOverlay() {
    var o = $("#overlay"), h = "";
    if (U.menu) h += '<div class="scrim" data-act="menu-close"></div>';
    if (U.tutor.open) {
      var r = route(), ctx = C.byId[r] ? r + " " + C.byId[r].name : (TITLES[r] || "Home");
      h += '<aside class="drawer" aria-label="Tutor"><header><b style="flex:1">Tutor</b><span class="small muted">Context: ' + esc(ctx) + '</span><button class="btn sm" data-act="tutor-close">Close</button></header><div class="msgs" id="msgs">' +
        (sample ? (U.tutor.turns.length ? "" : '<div class="msg tutor">Ask me to explain a concept at any level, quiz you, or challenge a design. I\'ll ask you to try first, and I\'ll mark anything beyond the course as allied or external.</div>') + U.tutor.turns.map(function (t) { return '<div class="msg ' + (t.role === "user" ? "me" : "tutor") + '">' + esc(t.content) + "</div>"; }).join("") + (U.tutor.busy ? '<div class="msg tutor muted">Thinking…</div>' : "") :
          '<div class="msg tutor">The live tutor runs when this board is opened in Claude. Opened as a local file, you can copy a ready-made tutor prompt into any Claude chat instead.</div><div><button class="btn sm" data-act="copy-tutor-rules">Copy the tutor instructions</button></div>') +
        "</div>" + (sample ? '<form data-act-submit="tutor"><textarea id="tutor-in" placeholder="e.g. Explain RAG at Level 3, then test me" style="min-height:70px"></textarea><div class="row"><button class="btn primary" type="submit"' + (U.tutor.busy ? " disabled" : "") + '>Send</button><button class="btn quiet" type="button" data-act="tutor-clear">New conversation</button></div></form>' : "") + "</aside>";
    }
    if (U.copyText) h += '<aside class="drawer" aria-label="Copy text"><header><b style="flex:1">Copy this text</b><button class="btn sm" data-act="copy-close">Close</button></header><div class="msgs"><p class="small muted">Your browser blocked automatic copying. Select all the text below and copy it.</p><textarea class="code" style="min-height:60vh" readonly>' + esc(U.copyText) + "</textarea></div></aside>";
    o.innerHTML = h;
    var m = $("#msgs"); if (m) m.scrollTop = m.scrollHeight;
  }

  /* =============== actions =============== */
  function labScore(labId) {
    var lab = LABS[labId], L = S.labs[labId] || (S.labs[labId] = {});
    L.checks = L.checks || {}; L.fscores = L.fscores || {};
    var tot = 0;
    lab.fields.forEach(function (f) {
      var key = "lab-" + labId + "-" + f.id;
      if (L.checked) L.checks[f.id] = readChecks(key, f.exp.length);
      var has = String((L.fields || {})[f.id] || "").trim().length > 5;
      var sc = has && L.checks[f.id] ? L.checks[f.id].filter(Boolean).length / f.exp.length : 0;
      L.fscores[f.id] = sc; tot += sc;
      if (L.checked && has) E.recordPractice(S, f.c, sc, now());
    });
    L.score = tot / lab.fields.length;
  }
  function labAnswerText(labId) {
    var lab = LABS[labId], L = S.labs[labId] || {};
    return lab.fields.map(function (f) { return "## " + f.label + "\n" + ((L.fields || {})[f.id] || "(blank)"); }).join("\n\n");
  }
  function labTutorOpts(labId) {
    var lab = LABS[labId], L = S.labs[labId] || {}, rub = G.RUBRICS[lab.rubric];
    return { concepts: lab.fields.map(function (f) { return f.c; }).filter(function (v, i, a) { return a.indexOf(v) === i; }), brief: (L.brief || lab.brief), criteria: rub.criteria, expected: [].concat.apply([], lab.fields.map(function (f) { return f.exp; })), answer: labAnswerText(labId) };
  }

  var ACT = {
    menu: function () { U.menu = true; renderNav(route()); renderOverlay(); },
    "menu-close": function () { U.menu = false; renderNav(route()); renderOverlay(); },
    tutor: function () { U.tutor.open = !U.tutor.open; renderOverlay(); var t = $("#tutor-in"); if (t) t.focus(); },
    "tutor-close": function () { U.tutor.open = false; renderOverlay(); },
    "tutor-clear": function () { U.tutor.turns = []; renderOverlay(); },
    "copy-close": function () { U.copyText = null; renderOverlay(); },
    "copy-tutor-rules": function () { copy(G.TUTOR_RULES, "Tutor instructions copied"); },
    mapview: function (el) { U.mapView = el.dataset.v; render(); },
    ctab: function (el) { U.ctab = el.dataset.tab; render(); },
    "open-concept-tab": function (el) { U.ctab = el.dataset.tab; if (location.hash === "#" + el.dataset.id) render(); else location.hash = el.dataset.id; },
    clevel: function (el) { U.clevel[el.dataset.id] = el.dataset.v; render(); },
    predict: function (el) { var id = el.dataset.id, ta = $("#predict-" + id); if (!ta.value.trim()) { toast("Write your prediction first"); ta.focus(); return; } U["pred-" + id] = ta.value; U.evals["pred-" + id] = 1; render(); },
    "cp-check": function (el) {
      var id = el.dataset.id, c = cstate(id), key = "cp-" + id;
      if (!String(c.note || "").trim()) { toast("Write your attempt first"); return; }
      var items = GENERIC_PRACTICE, prev = U["ck-" + key];
      var ticks = prev ? readChecks(key, items.length) : null;
      if (!ticks) { U["ck-" + key] = 1; U.evals[key] = '<div class="reveal">' + checklist(key, items) + '<div><button class="btn sm primary" data-act="cp-check" data-id="' + id + '">Score my ticks</button></div></div>'; render(); return; }
      var score = ticks.filter(Boolean).length / items.length, missed = items.filter(function (_, i) { return !ticks[i]; });
      E.recordPractice(S, id, score, now());
      U.evals[key] = '<div class="reveal">' + checklist(key, items, ticks) + '<div><button class="btn sm" data-act="cp-check" data-id="' + id + '">Re-score</button></div></div>' + selfEvalHtml(score, missed, '<p class="small">Principle to check against: <b>' + esc(C.byId[id].d.take) + "</b></p>");
      changed(); render();
    },
    "cp-tutor": function (el) {
      var id = el.dataset.id, c = cstate(id), k = C.byId[id];
      if (!String(c.note || "").trim()) { toast("Write your attempt first"); return; }
      runTutor("cp-" + id, { concepts: [id], brief: k.d.exercise || ("Apply: " + k.skill), criteria: GENERIC_PRACTICE, expected: [k.d.take], answer: c.note }, function (score) { E.recordPractice(S, id, score, now()); });
    },
    "copy-tutor-prompt": function (el) { var id = el.dataset.id, c = cstate(id), k = C.byId[id]; copy(tutorPrompt({ concepts: [id], brief: k.d.exercise || ("Apply: " + k.skill), criteria: GENERIC_PRACTICE, expected: [k.d.take], answer: c.note || "(paste your answer here)" }), "Tutor prompt copied. Paste it into a Claude chat."); },
    "teach-self": function (el) {
      var id = el.dataset.id, c = cstate(id), key = "teach-" + id, items = ["Says what it is in plain language", "Explains why it matters to the business", "Gives a TA example", "States one limitation or risk", "Uses the course's terms correctly"];
      if (!String(c.teachText || "").trim()) { toast("Write your explanation first"); return; }
      if (!U["ck-" + key]) { U["ck-" + key] = 1; U.evals[key] = '<div class="reveal">' + checklist(key, items) + '<div><button class="btn sm primary" data-act="teach-self" data-id="' + id + '">Score my ticks</button></div></div>'; render(); return; }
      var ticks = readChecks(key, items.length), score = ticks.filter(Boolean).length / items.length;
      S.teach[id] = score; U["ck-" + key] = 0; U.evals[key] = selfEvalHtml(score, items.filter(function (_, i) { return !ticks[i]; })); changed(); render();
    },
    "teach-tutor": function (el) {
      var id = el.dataset.id, c = cstate(id);
      if (!String(c.teachText || "").trim()) { toast("Write your explanation first"); return; }
      runTutor("teach-" + id, { concepts: [id], brief: "Teach-back to a hiring manager in about 90 seconds.", criteria: ["Plain-language definition", "Business relevance", "TA example", "Limitation or risk", "Correct course terminology"], expected: [C.byId[id].d.take], answer: c.teachText }, function (score) { S.teach[id] = score; });
    },
    "concept-check": function (el) {
      var id = el.dataset.id, k = C.byId[id];
      var qs = C.questions.filter(function (q) { return q.auto && q.c.indexOf(id) >= 0; });
      if (qs.length < 3) qs = qs.concat(C.questions.filter(function (q) { return q.auto && q.c.indexOf(id) < 0 && q.c.some(function (x) { return C.byId[x].m === k.m; }); }).sort(function () { return Math.random() - 0.5; }).slice(0, 3 - qs.length));
      qs = qs.sort(function () { return Math.random() - 0.5; }).slice(0, 3);
      startQuiz(qs, { mode: "practice", kind: "check", concept: id, back: id });
    },
    "concept-quiz-open": function (el) { var id = el.dataset.id; startQuiz(C.questions.filter(function (q) { return !q.auto && q.c.indexOf(id) >= 0; }), { mode: "practice", kind: "quiz", back: id }); },
    qcfg: function (el) { var k = el.dataset.k, v = el.dataset.v; U.quizCfg[k] = (k === "n" && v !== "full") || k === "level" ? Number(v) : v; render(); },
    "quiz-start": function () { startQuiz(buildQuiz(U.quizCfg), { mode: U.quizCfg.mode }); },
    "quick-quiz": function (el) { startQuiz(buildQuiz({ n: Number(el.dataset.n) || 10, level: 2, mode: "practice" }), { mode: "practice" }); },
    mock: function () { startQuiz(buildQuiz({ n: 50, level: 5, mode: "exam", open: true }), { mode: "exam" }); },
    "quiz-new": function () { U.quiz = null; render(); },
    "quiz-quit": function () { var Q = U.quiz; if (Q && Object.keys(Q.ans).length && !Q.done) { Q.items = Q.items.filter(function (q) { return Q.ans[q.id] != null || Q.fb[q.id]; }); if (Q.items.some(function (q) { return !q.auto; }) && Q.mode === "exam") { Q.marking = true; render(); return; } finishQuiz(); } else U.quiz = null; render(); },
    "quiz-hint": function () { var Q = U.quiz, q = Q.items[Q.i]; saveAnswer(); Q.hints[q.id] = (Q.hints[q.id] || 0) + 1; render(); },
    "quiz-reveal": function () { var Q = U.quiz, q = Q.items[Q.i]; Q.revealed = true; Q.scores = Q.scores || {}; Q.scores[q.id] = 0; recordQ(Q, q, 0); Q.revealed = false; Q.fb[q.id] = q.auto ? feedbackHtml(q, Q.ans[q.id], 0) : openFeedback(q); changed(); render(); },
    "quiz-prev": function () { saveAnswer(); U.quiz.i = Math.max(0, U.quiz.i - 1); render(); },
    "quiz-submit": function () {
      var Q = U.quiz, q = Q.items[Q.i]; saveAnswer();
      var a = Q.ans[q.id];
      if (Q.mode === "exam") {
        if (Q.i < Q.items.length - 1) { Q.i++; render(); return; }
        if (Q.items.some(function (x) { return !x.auto; })) { Q.marking = true; render(); return; }
        finishQuiz(); render(); return;
      }
      if (a == null || a === "") { toast("Answer first, even a guess"); return; }
      Q.scores = Q.scores || {};
      if (q.auto) { var s = grade(q, a); Q.scores[q.id] = s; recordQ(Q, q, s); Q.fb[q.id] = feedbackHtml(q, a, s); changed(); }
      else { Q.fb[q.id] = openFeedback(q); }
      render();
    },
    "open-score": function (el) {
      var Q = U.quiz, q = Q.items[Q.i], key = "op-" + q.id, ticks = readChecks(key, q.k.length), s = ticks.filter(Boolean).length / q.k.length;
      Q.scores = Q.scores || {}; Q.scores[q.id] = s; recordQ(Q, q, s); q.c.forEach(function (id) { E.recordPractice(S, id, s, now()); });
      Q.fb[q.id] = '<div class="reveal stack tight"><span class="verdict">' + Math.round(s * 100) + '% of key points covered.</span><div class="row"><button class="btn sm primary" data-act="quiz-next">Next question</button></div></div>';
      changed(); render();
    },
    "open-tutor": function () {
      var Q = U.quiz, q = Q.items[Q.i], key = "op-" + q.id;
      runTutor(key, { concepts: q.c, brief: q.q + " (" + q.m + " marks)", criteria: q.k, answer: Q.ans[q.id] || "" }, function (score) { Q.scores = Q.scores || {}; Q.scores[q.id] = score; recordQ(Q, q, score); q.c.forEach(function (id) { E.recordPractice(S, id, score, now()); }); Q.fb[q.id] = (U.evals[key] || "") + '<div class="row"><button class="btn sm primary" data-act="quiz-next">Next question</button></div>'; });
    },
    "quiz-next": function () { var Q = U.quiz; if (Q.i < Q.items.length - 1) { Q.i++; render(); } else { finishQuiz(); render(); } },
    "quiz-confirm": function (el) {
      var Q = U.quiz, id = el.dataset.id, cur = Q.items[Q.i];
      var cand = C.questions.filter(function (q) { return q.auto && q.c.indexOf(id) >= 0 && Q.items.indexOf(q) < 0 && (!cur.v || q.v !== cur.v || true); });
      if (!cand.length) cand = C.questions.filter(function (q) { return q.auto && Q.items.indexOf(q) < 0 && q.c.some(function (x) { return C.byId[x].m === C.byId[id].m; }); });
      if (!cand.length) { toast("No other question on this concept yet"); return; }
      Q.items.splice(Q.i + 1, 0, cand[Math.floor(Math.random() * cand.length)]); Q.i++; render();
    },
    "mark-tutor": function (el) { var Q = U.quiz, q = C.questions.filter(function (x) { return x.id === el.dataset.q; })[0]; runTutor("mk-" + q.id, { concepts: q.c, brief: q.q, criteria: q.k, answer: Q.ans[q.id] || "" }, function (score) { Q.scores = Q.scores || {}; Q.scores[q.id] = score; }); },
    "quiz-finish-marking": function () { var Q = U.quiz; Q.marks = Q.marks || {}; Q.items.filter(function (q) { return !q.auto; }).forEach(function (q) { if (!(Q.scores && Q.scores[q.id] != null)) Q.marks[q.id] = readChecks("mk-" + q.id, q.k.length); }); Q.marking = false; finishQuiz(); render(); },
    idea: function (el) { $("#idea").value = el.dataset.v; },
    "practice-start": function () {
      var v = $("#idea").value.trim(); if (!v) { toast("Type an idea or pick one"); return; }
      S.practice.push({ idea: v.slice(0, 200), ts: now(), answers: {}, checks: {}, attempts: {}, scores: {} });
      if (S.practice.length > 12) S.practice.shift();
      U.psession = S.practice.length - 1; U.pstep = 0; U.psummary = false; changed(); render();
    },
    "practice-open": function (el) { U.psession = Number(el.dataset.i); U.pstep = 0; U.psummary = false; render(); },
    "practice-close": function () { U.psession = null; render(); },
    pstep: function (el) { U.pstep = Number(el.dataset.i); U.psummary = false; render(); },
    pcheck: function () {
      var sess = S.practice[U.psession], s = G.PRACTICE_STEPS[U.pstep], key = "ps-" + U.psession + "-" + s.id;
      if (!String((sess.answers || {})[s.id] || "").trim()) { toast("Attempt the step first"); return; }
      sess.attempts[s.id] = (sess.attempts[s.id] || 0);
      if (!sess.attempts[s.id]) { sess.attempts[s.id] = 1; U.evals[key] = '<div class="note small">Now tick each element your answer genuinely includes, then press Re-check.</div>'; changed(); render(); return; }
      var ticks = readChecks(key, s.exp.length); sess.checks[s.id] = ticks;
      var score = ticks.filter(Boolean).length / s.exp.length;
      sess.scores[s.id] = Math.max(sess.scores[s.id] || 0, score); sess.attempts[s.id]++;
      E.recordPractice(S, s.c, sess.scores[s.id], now());
      var k = C.byId[s.c];
      U.evals[key] = selfEvalHtml(score, s.exp.filter(function (_, i) { return !ticks[i]; }), '<p class="small"><b>Why it matters:</b> ' + esc(k.d.take) + " " + esc(k.d.hr ? "TA example: " + k.d.hr : "") + "</p>");
      changed(); render();
    },
    ptutor: function () {
      var sess = S.practice[U.psession], s = G.PRACTICE_STEPS[U.pstep], key = "ps-" + U.psession + "-" + s.id;
      var prior = G.PRACTICE_STEPS.slice(0, U.pstep).map(function (x) { var a = sess.answers[x.id]; return a ? x.label + ": " + trim(a, 300) : ""; }).filter(Boolean).join("\n");
      runTutor(key, { concepts: [s.c], brief: "Business idea: " + sess.idea + "\nStep " + (U.pstep + 1) + " — " + s.label + ": " + s.q + (prior ? "\nEarlier answers:\n" + prior : ""), criteria: s.exp, answer: sess.answers[s.id] || "" }, function (score) { sess.scores[s.id] = Math.max(sess.scores[s.id] || 0, score); sess.attempts[s.id] = (sess.attempts[s.id] || 1) + 1; E.recordPractice(S, s.c, score, now()); });
    },
    pimprove: function () {
      var sess = S.practice[U.psession], s = G.PRACTICE_STEPS[U.pstep], key = "ps-" + U.psession + "-" + s.id;
      U.evals[key] = '<div class="reveal small">Thinking…</div>'; render();
      sample(G.TUTOR_RULES + "\n\nThe learner has attempted this step twice and now asks for a stronger answer. Business idea: " + sess.idea + "\nStep: " + s.label + " — " + s.q + "\nElements: " + s.exp.join("; ") + "\nLearner's answer:\n" + (sess.answers[s.id] || "") + "\n\nWrite an improved answer (under 180 words) that keeps the learner's ideas where sound, then one sentence on the biggest difference. Plain text.", { modelTier: "default" }).then(function (r) { U.evals[key] = '<div class="reveal"><b>A stronger answer</b><p class="small" style="white-space:pre-wrap">' + esc(r.text) + '</p><p class="small muted">Now revise your own answer in your words and re-check it.</p></div>'; render(); }, function (e) { U.evals[key] = '<div class="note warn small">' + esc(tutorError(e)) + "</div>"; render(); });
    },
    psummary: function () { U.psummary = true; render(); },
    "psummary-close": function () { U.psummary = false; render(); },
    pcopy: function () { var sess = S.practice[U.psession]; copy("# " + sess.idea + "\n\n" + G.PRACTICE_STEPS.map(function (s, j) { return "## " + (j + 1) + ". " + s.label + " (" + s.c + ")\n" + (sess.answers[s.id] || "_Not answered_"); }).join("\n\n"), "Session copied as Markdown"); },
    labtab: function (el) { U.labTab[el.dataset.g] = el.dataset.v; render(); },
    costar: function () {
      var L = S.labs.prompt || (S.labs.prompt = { fields: {} }); L.fields = L.fields || {};
      var cur = L.fields.prompt || "";
      if (/CONTEXT:/i.test(cur)) { toast("The scaffold is already in your prompt"); return; }
      L.fields.prompt = "CONTEXT:\n\nOBJECTIVE:\n\nSTYLE:\n\nTONE:\n\nAUDIENCE:\n\nRESPONSE (format):\n\nCONSTRAINTS (what not to do or invent):\n\nIF INFORMATION IS MISSING:\n" + (cur ? "\n---\n" + cur : "");
      changed(); render();
    },
    "lab-check": function (el) {
      var id = el.dataset.lab, L = S.labs[id] || (S.labs[id] = {});
      if (!L.fields || !Object.keys(L.fields).some(function (k) { return String(L.fields[k]).trim(); })) { toast("Write your answers first"); return; }
      if (!L.checked) { L.checked = true; changed(); render(); toast("Tick what each answer includes, then press Re-score"); return; }
      labScore(id); changed(); render();
    },
    "lab-tutor": function (el) { var id = el.dataset.lab; if (!S.labs[id] || !S.labs[id].fields) { toast("Write your answers first"); return; } runTutor("lab-" + id, labTutorOpts(id), function (score) { var L = S.labs[id]; L.score = score; LABS[id].fields.forEach(function (f) { if (String((L.fields || {})[f.id] || "").trim()) E.recordPractice(S, f.c, score, now()); }); }); },
    "lab-copy": function (el) { copy(tutorPrompt(labTutorOpts(el.dataset.lab)), "Tutor prompt copied. Paste it into a Claude chat."); },
    "lab-version": function (el) { var id = el.dataset.lab, L = S.labs[id] || (S.labs[id] = {}); L.versions = L.versions || []; L.versions.push({ ts: now(), fields: Object.assign({}, L.fields || {}), score: L.score }); if (L.versions.length > 8) L.versions.shift(); changed(); render(); toast("Version saved"); },
    "prompt-improve": function () {
      var L = S.labs.prompt || {}; U.evals["lab-prompt"] = '<div class="reveal small">Thinking…</div>'; render();
      sample(G.TUTOR_RULES + "\n\nThe learner asked to see an improved version of their prompt after scoring it. Scenario: " + (L.brief || LABS.prompt.brief) + "\nTheir prompt:\n<<<\n" + ((L.fields || {}).prompt || "") + "\n>>>\nWrite the improved prompt using COSTAR plus constraints and a failure rule. Then list the three changes that matter most, one line each. Plain text.", { modelTier: "default" }).then(function (r) { U.evals["lab-prompt"] = '<div class="reveal"><b>Improved version</b><pre class="out">' + esc(r.text) + '</pre><p class="small muted">Compare it with yours, revise in your own words, save a version and re-score.</p></div>'; render(); }, function (e) { U.evals["lab-prompt"] = '<div class="note warn small">' + esc(tutorError(e)) + "</div>"; render(); });
    },
    want: function () {
      var v = ($("#want").value || "").toLowerCase(); if (!v) { toast("Describe what you want to build"); return; }
      var map = [[/multi.?agent|team of agents|research system/, "P7"], [/agent|book|schedul|act on|take action/, "P6"], [/multi.?source|benchmark|several sources|market|compet/, "P5"], [/polic|document|knowledge|faq|sop/, "P4"], [/automat|follow.?up|remind|workflow|report/, "P3"], [/scorecard|structured|json|template/, "P2"], [/prompt|email|draft|write/, "P1"], [/govern|capstone|end.?to.?end|enterprise/, "P8"]];
      var hit = map.filter(function (m) { return m[0].test(v); })[0], P = G.PROJECTS.filter(function (p) { return p.id === (hit ? hit[1] : "P3"); })[0];
      U.wantResult = '<div class="reveal stack tight"><b>Closest level: ' + P.id + " · " + esc(P.name) + '</b><p class="small">Your idea resembles "' + esc(P.title) + '". Before building, answer: could a simpler level solve it? Work through the Practice Lab first if you haven\'t framed the problem.</p><div class="row"><button class="btn sm primary" data-act="open-project" data-id="' + P.id + '">Open ' + P.id + '</button><a class="btn sm" href="#practice">Frame it in the Practice Lab</a></div></div>';
      render();
    },
    "open-project": function (el) { U.project = el.dataset.id; if (route() !== "build") location.hash = "build"; else render(); },
    "close-project": function () { U.project = null; render(); },
    "psec-score": function (el) { var pid = el.dataset.p, i = Number(el.dataset.i), v = Number(el.dataset.v), s = S.projects[pid] || (S.projects[pid] = {}); s.self = s.self || {}; s.self[i] = v; projectProgress(pid); E.recordBuild(S, G.PROJECT_SECTIONS[i][2], v / 4, now()); changed(); render(); },
    "project-tutor": function (el) {
      var pid = el.dataset.id, p = G.PROJECTS.filter(function (x) { return x.id === pid; })[0], s = S.projects[pid] || {}, secs = s.sections || {};
      var ans = G.PROJECT_SECTIONS.map(function (sec, i) { return secs[i] ? "## " + (i + 1) + ". " + sec[0] + "\n" + secs[i] : ""; }).filter(Boolean).join("\n\n");
      if (!ans) { toast("Fill some sections first"); return; }
      runTutor("proj-" + pid, { concepts: p.concepts, brief: p.id + " " + p.title + ": " + p.brief, criteria: G.RUBRICS[p.rubric].criteria, answer: ans }, function (score) { s.score = score; S.projects[pid] = s; p.concepts.forEach(function (id) { E.recordBuild(S, id, score, now()); }); });
    },
    "project-copy-prompt": function (el) { var pid = el.dataset.id, p = G.PROJECTS.filter(function (x) { return x.id === pid; })[0], secs = (S.projects[pid] || {}).sections || {}; copy(tutorPrompt({ concepts: p.concepts, brief: p.title + ": " + p.brief, criteria: G.RUBRICS[p.rubric].criteria, answer: G.PROJECT_SECTIONS.map(function (sec, i) { return "## " + sec[0] + "\n" + (secs[i] || "(blank)"); }).join("\n\n") }), "Tutor prompt copied"); },
    "project-copy": function (el) { var pid = el.dataset.id, p = G.PROJECTS.filter(function (x) { return x.id === pid; })[0], secs = (S.projects[pid] || {}).sections || {}; copy("# " + p.id + " " + p.title + "\n\n" + p.brief + "\n\n" + G.PROJECT_SECTIONS.map(function (sec, i) { return "## " + (i + 1) + ". " + sec[0] + " (" + sec[2] + ")\n" + (secs[i] || "_Not yet written_"); }).join("\n\n"), "Project pack copied as Markdown"); },
    "case-open": function (el) { U.caseId = el.dataset.id; render(); },
    "case-close": function () { U.caseId = null; render(); },
    "case-submit": function () { var cs = S.cases[U.caseId] || (S.cases[U.caseId] = {}); var n = Object.keys(cs.answers || {}).filter(function (k) { return String(cs.answers[k]).trim(); }).length; if (n < 5) { toast("Answer at least five of the nine questions first"); return; } cs.submitted = true; changed(); render(); },
    "case-score": function (el) { var cs = S.cases[U.caseId]; cs.self = cs.self || {}; cs.self[el.dataset.i] = Number(el.dataset.v); var vals = Object.keys(cs.self).map(function (k) { return cs.self[k]; }); cs.score = vals.reduce(function (a, b) { return a + b; }, 0) / (4 * G.RUBRICS.R8.criteria.length); ["C01.3", "C05.1", "C13.1", "C14.4", "C07.3"].forEach(function (id) { E.recordPractice(S, id, cs.score, now()); }); changed(); render(); },
    "case-tutor": function () { var K = G.CASES.filter(function (x) { return x.id === U.caseId; })[0], cs = S.cases[K.id]; runTutor("case-" + K.id, { concepts: ["C01.3", "C05.1", "C13.1", "C14.4", "C07.3"], brief: K.s, criteria: G.RUBRICS.R8.criteria, answer: G.CASE_QUESTIONS.map(function (q, i) { return q + "\n" + ((cs.answers || {})[i] || "(blank)"); }).join("\n\n") }, function (score) { cs.score = score; }); },
    "rev-mode": function (el, ev) { if (ev) ev.preventDefault(); U.rev = U.rev === el.dataset.v ? null : el.dataset.v; if (route() !== "revision") location.hash = "revision"; else render(); },
    "due-quiz": function () { var due = E.dueConcepts(S, C, now()); startQuiz(buildQuiz({ n: Math.min(15, Math.max(5, due.length)), level: 2, mode: "practice", concepts: due }), { mode: "practice", back: "revision" }); },
    "error-replay": function () {
      var wrong = {}; S.attempts.forEach(function (a) { if (a.q) { if (a.score < 0.7) wrong[a.q] = a; else delete wrong[a.q]; } });
      var byId = {}; C.questions.forEach(function (q) { byId[q.id] = q; });
      var items = Object.keys(wrong).map(function (id) { var q = byId[id]; if (!q) return null; var alt = q.v ? C.questions.filter(function (x) { return x.v === q.v && x.id !== q.id; }) : C.questions.filter(function (x) { return x.auto && x.id !== q.id && x.c[0] === q.c[0]; }); return alt.length ? alt[Math.floor(Math.random() * alt.length)] : q; }).filter(Boolean);
      var seen = {}; items = items.filter(function (q) { if (seen[q.id]) return false; seen[q.id] = 1; return true; }).slice(0, 15);
      startQuiz(items, { mode: "practice", back: "revision" });
    },
    "rapid-quiz": function () { var top = E.priorities(S, C, now(), statuses()).filter(function (x) { return x.st.st >= 1; }).slice(0, 10).map(function (x) { return x.id; }); startQuiz(buildQuiz({ n: 10, level: 2, mode: "practice", concepts: top.length ? top : null }), { mode: "practice", back: "revision" }); },
    "night-exam": function () { startQuiz(buildQuiz({ n: 25, level: 5, mode: "exam" }), { mode: "exam", back: "revision" }); },
    "pairs-quiz": function () { var ids = []; G.CONFUSION_PAIRS.forEach(function (p) { ids.push(p[0], p[1]); }); startQuiz(buildQuiz({ n: 10, level: 2, mode: "practice", concepts: ids }), { mode: "practice", back: "revision" }); },
    "mod-quiz": function (el) { startQuiz(buildQuiz({ n: 10, level: 2, mode: "practice", module: el.dataset.m }), { mode: "practice", back: "revision" }); },
    export: function () { copy(JSON.stringify(S), "Progress copied. Paste it somewhere safe."); },
    "import-open": function () { U.importOpen = !U.importOpen; render(); },
    import: function () { try { var d = JSON.parse($("#import-text").value); if (!d || !d.concepts || !Array.isArray(d.attempts)) throw new Error("shape"); S = Object.assign(E.emptyState(), d); S.updatedAt = now(); U.importOpen = false; changed(); render(); toast("Progress loaded"); } catch (e) { toast("That text isn't a progress export from this board"); } },
    reset: function () { U.resetAsk = true; render(); },
    "reset-no": function () { U.resetAsk = false; render(); },
    "reset-yes": function () { S = E.emptyState(); S.updatedAt = now(); U.resetAsk = false; U.quiz = null; U.psession = null; changed(); save(true); render(); toast("All progress erased"); }
  };
  function openFeedback(q) {
    var key = "op-" + q.id;
    return '<div class="reveal stack tight"><b>Key points for full marks</b>' + checklist(key, q.k) + '<div class="row"><button class="btn sm primary" data-act="open-score">Score my ticks</button>' + (sample ? '<button class="btn sm" data-act="open-tutor">Ask the tutor to mark it</button>' : "") + "</div>" + (U.evals[key] || "") + "</div>";
  }
  function saveAnswer() {
    var Q = U.quiz; if (!Q) return; var q = Q.items[Q.i];
    if (q.o) { var r = document.querySelector('input[name="qa"]:checked'); if (r) Q.ans[q.id] = r.value; }
    else { var t = $("#qa-text"); if (t && !t.disabled) Q.ans[q.id] = t.value; }
  }

  /* =============== events =============== */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]"); if (!el) return;
    var fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === "A" && el.dataset.act !== "rev-mode") return;
    if (el.tagName !== "A") ev.preventDefault();
    fn(el, ev);
  });
  var bindTimer = null;
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.dataset.bind) {
      setPath(S, el.dataset.bind, cap(el.value));
      if (/^projects\./.test(el.dataset.bind)) projectProgress(el.dataset.bind.split(".")[1]);
      clearTimeout(bindTimer); bindTimer = setTimeout(function () { save(); }, 600);
      return;
    }
    var a = el.dataset.actInput;
    if (a === "learn-q") { U.learn.q = el.value; var pos = el.selectionStart; render(); var n = $("#lq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
    if (a === "suit") { var L = S.labs[el.dataset.lab] || (S.labs[el.dataset.lab] = {}); L.suit = L.suit || {}; L.suit[el.dataset.k] = Number(el.value); save(); render(); var r = document.querySelector('[data-act-input="suit"][data-k="' + el.dataset.k + '"]'); if (r) r.focus(); }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target, a = el.dataset.actChange;
    if (a === "learn-m") { U.learn.m = el.value; render(); }
    if (a === "learn-sort") { U.learn.sort = el.value; render(); }
    if (a === "qcfg-module") { U.quizCfg.module = el.value; }
    if (a === "qcfg-open") { U.quizCfg.open = el.checked; }
    if (a === "qa" && U.quiz) { U.quiz.ans[U.quiz.items[U.quiz.i].id] = el.value; }
    if (a === "rev-mod") { U.rev = el.value ? "mod-" + el.value : null; render(); }
  });
  document.addEventListener("submit", function (ev) {
    var f = ev.target; if (f.dataset.actSubmit !== "tutor") return;
    ev.preventDefault();
    var t = $("#tutor-in"), text = t.value.trim(); if (!text || !sample || U.tutor.busy) return;
    var r = route(), k = C.byId[r];
    var ctx = k ? "Current concept: " + k.id + " " + k.name + " (" + modName(k.m) + "). Exam takeaway: " + k.d.take : "Current page: " + (TITLES[r] || "Home");
    U.tutor.turns.push({ role: "user", content: text }); U.tutor.busy = true; renderOverlay();
    var turns = [{ role: "user", content: G.TUTOR_RULES + "\n" + ctx + "\nKeep answers under 220 words unless asked for more. Ask the learner to attempt before giving full answers." }, { role: "assistant", content: "Understood. I'll teach Socratically and label sources." }].concat(U.tutor.turns.slice(-12));
    sample(turns, { cache: false, modelTier: "default", onText: function (o) { var last = U.tutor.turns[U.tutor.turns.length - 1]; if (last.role !== "assistant" || !last.streaming) { U.tutor.turns.push({ role: "assistant", content: "", streaming: true }); last = U.tutor.turns[U.tutor.turns.length - 1]; } last.content = o.text; U.tutor.busy = false; renderOverlay(); } })
      .then(function (r2) { var last = U.tutor.turns[U.tutor.turns.length - 1]; if (last.streaming) { last.content = r2.text; delete last.streaming; } else U.tutor.turns.push({ role: "assistant", content: r2.text }); U.tutor.busy = false; renderOverlay(); },
        function (e) { U.tutor.busy = false; U.tutor.turns.push({ role: "assistant", content: tutorError(e) }); renderOverlay(); });
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.target.matches("input, textarea, select")) return;
    if (ev.key === "/") { var s = $("#lq"); if (s) { ev.preventDefault(); s.focus(); } else { location.hash = "learn"; } }
    if (ev.key === "Escape") { U.tutor.open = false; U.menu = false; U.copyText = null; renderNav(route()); renderOverlay(); }
  });
  window.addEventListener("hashchange", function () {
    U.menu = false;
    var r = route();
    if (/^C\d\d\.\d+$/.test(r) && U.ctabFor !== r) { if (!U.ctabSet) U.ctab = "overview"; U.ctabFor = r; }
    U.ctabSet = false;
    render();
  });
  ACT["open-concept-tab"] = (function (orig) { return function (el) { U.ctabSet = true; orig(el); }; })(ACT["open-concept-tab"]);

  render();
  initRuntime();
})();
