/* Mastery, revision and recommendation engine.
   Pure functions over (content, state, now). Thresholds follow docs/06-engines-and-tutor.md.
   Works in the browser (window.GMBEngine) and in Node (module.exports) for tests. */
(function (root) {
  "use strict";
  var DAY = 86400000;
  var BOXES = [1, 3, 7, 14, 30];
  var DIFF_W = { 1: 1.0, 2: 1.2, 3: 1.4, 4: 1.6 };
  var EXAM_W = { H: 3, M: 2, L: 1 };
  var EXAM_P = { H: 1.0, M: 0.6, L: 0.3 };
  var STATUSES = ["Not Started", "Learning", "Practising", "Competent", "Mastered"];

  function emptyState() {
    return { v: 1, updatedAt: 0, concepts: {}, attempts: [], quizzes: [], labs: {}, practice: [], projects: {}, cases: {}, days: [], teach: {} };
  }

  function cs(state, id) {
    var c = state.concepts[id];
    if (!c) c = state.concepts[id] = { viewed: 0, checks: [], practice: [], build: [], reviews: [], box: 0, due: 0 };
    return c;
  }

  /* ---------- recording ---------- */
  function dayKey(now) { var d = new Date(now); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function touch(state, now) {
    var k = dayKey(now);
    if (state.days[state.days.length - 1] !== k) state.days.push(k);
    if (state.days.length > 400) state.days = state.days.slice(-400);
    state.updatedAt = now;
  }
  function recordView(state, id, now) { var c = cs(state, id); c.viewed = c.viewed || now; touch(state, now); }

  /* score: 0..1. Spaced review: an attempt on a concept whose review is due counts as that review. */
  function recordAttempt(state, a, now) {
    a.ts = now;
    state.attempts.push(a);
    if (state.attempts.length > 1500) state.attempts = state.attempts.slice(-1500);
    (a.c || []).forEach(function (id) {
      var c = cs(state, id);
      var pass = a.score >= 0.7 && !(a.hints >= 2);
      if (!c.box) { c.box = pass ? 2 : 1; c.due = now + BOXES[c.box - 1] * DAY; return; }
      if (now >= c.due - DAY / 2) {
        c.reviews.push({ ts: now, pass: pass });
        if (c.reviews.length > 12) c.reviews = c.reviews.slice(-12);
        if (pass && !a.hints) c.box = Math.min(5, c.box + 1);
        else if (!pass) c.box = 1;
        var interval = c.box === 5 && pass ? Math.min(90, (c.lastInterval || 30) * 1.5) : BOXES[c.box - 1];
        c.lastInterval = interval;
        c.due = now + interval * DAY;
      }
    });
    touch(state, now);
  }
  function recordCheck(state, id, score, now) { var c = cs(state, id); c.checks.push(score); if (c.checks.length > 6) c.checks.shift(); touch(state, now); }
  function recordPractice(state, id, score, now) { var c = cs(state, id); c.practice.push({ ts: now, s: score }); if (c.practice.length > 6) c.practice.shift(); touch(state, now); }
  function recordBuild(state, id, score, now) { var c = cs(state, id); c.build.push({ ts: now, s: score }); if (c.build.length > 6) c.build.shift(); touch(state, now); }

  /* ---------- per-concept scores ---------- */
  function scores(state, content, id, now) {
    var c = state.concepts[id] || { checks: [], practice: [], build: [], reviews: [] };
    var out = { U: null, Q: null, P: null, B: null, R: null, testSessions: 0, bestTest: 0, wrong30: 0 };
    if (c.checks.length) out.U = Math.max.apply(null, c.checks.slice(-2)) * 100;
    if (state.teach[id] != null) out.U = Math.max(out.U || 0, state.teach[id] * 100);
    var num = 0, den = 0, sessions = {};
    state.attempts.forEach(function (a) {
      if (!a.c || a.c.indexOf(id) < 0) return;
      var age = (now - a.ts) / DAY;
      var w = Math.pow(0.5, age / 21) * (DIFF_W[a.d] || 1) * (a.m || 1) * (1 - 0.15 * Math.min(a.hints || 0, 3));
      if (a.revealed) w *= 0.0001;
      num += w * a.score; den += w;
      if (age <= 30 && a.score < 0.5) out.wrong30++;
      if (a.session) { var s = sessions[a.session] || (sessions[a.session] = { n: 0, s: 0 }); s.n++; s.s += a.score; }
    });
    if (den > 0) out.Q = (num / den) * 100;
    Object.keys(sessions).forEach(function (k) { out.testSessions++; out.bestTest = Math.max(out.bestTest, sessions[k].s / sessions[k].n); });
    if (c.practice.length) { var p = c.practice.slice(-3); out.P = p.reduce(function (t, x) { return t + x.s; }, 0) / p.length * 100; }
    if (c.build.length) out.B = Math.max.apply(null, c.build.map(function (x) { return x.s; })) * 100;
    if (c.reviews.length) { var r = c.reviews.slice(-4); out.R = r.filter(function (x) { return x.pass; }).length / r.length * 100; }
    return out;
  }

  function mastery(state, content, id, now) {
    var s = scores(state, content, id, now);
    var parts = [["U", 0.20], ["Q", 0.30], ["P", 0.20], ["B", 0.15], ["R", 0.15]];
    var tot = 0, wsum = 0;
    parts.forEach(function (p) { if (s[p[0]] != null) { tot += s[p[0]] * p[1]; wsum += p[1]; } });
    if (!wsum) return { m: 0, s: s };
    var m = tot / wsum - Math.min(15, 5 * Math.max(0, s.wrong30 - 1));
    if (s.Q == null) m = Math.min(m, 60);
    if (s.P == null) m = Math.min(m, 55);
    var c = state.concepts[id];
    var passed = c ? c.reviews.filter(function (r) { return r.pass; }).length : 0;
    if (!passed) m = Math.min(m, 84);
    return { m: Math.max(0, Math.round(m)), s: s };
  }

  function status(state, content, id, now) {
    var c = state.concepts[id];
    var hasAttempt = state.attempts.some(function (a) { return a.c && a.c.indexOf(id) >= 0; });
    if (!c || (!c.viewed && !c.checks.length && !c.practice.length && !hasAttempt)) return { st: 0, m: 0 };
    var r = mastery(state, content, id, now), s = r.s, m = r.m;
    var st = 1;
    var checkPassed = (s.U != null && s.U >= 66) || (s.Q != null && s.Q >= 66);
    if (checkPassed && s.P != null) st = 2;
    if (st === 2 && m >= 70 && s.bestTest >= 0.7) st = 3;
    if (st === 3 && m >= 85) {
      var passes = c.reviews.filter(function (x) { return x.pass; });
      var spaced = passes.length >= 2 && (passes[passes.length - 1].ts - passes[0].ts) >= 7 * DAY;
      var applied = (s.B != null && s.B >= 70) || (state.teach[id] != null && state.teach[id] >= 0.8);
      if (spaced && applied) st = 4;
    }
    var rv = c.reviews;
    if (rv.length && !rv[rv.length - 1].pass && st === 4) st = 3;
    if (rv.length >= 2 && !rv[rv.length - 1].pass && !rv[rv.length - 2].pass && st >= 3) st = 2;
    return { st: st, m: m, s: s };
  }

  /* ---------- course-level ---------- */
  function all(state, content, now) {
    var res = {};
    content.concepts.forEach(function (k) { res[k.id] = status(state, content, k.id, now); });
    return res;
  }

  function dependants(content) {
    var d = {};
    content.concepts.forEach(function (k) { (k.pre || []).forEach(function (p) { d[p] = (d[p] || 0) + 1; }); });
    return d;
  }

  function priority(state, content, id, now, st, dep, maxDep) {
    var k = content.byId[id], c = state.concepts[id];
    var overdue = 0;
    if (c && c.box && now >= c.due) overdue = Math.min(1, (now - c.due) / (BOXES[c.box - 1] * DAY) + 0.5);
    var errs = state.attempts.filter(function (a) { return a.c && a.c.indexOf(id) >= 0 && a.score < 0.5 && now - a.ts < 14 * DAY; }).length;
    var p = 0.35 * (1 - st.m / 100) + 0.20 * overdue + 0.20 * Math.min(1, errs / 2) + 0.15 * EXAM_P[k.exam] + 0.10 * ((dep[id] || 0) / maxDep);
    if (st.st === 4 && !overdue) p = Math.min(p, 0.05);
    return Math.round(p * 1000) / 1000;
  }

  function priorities(state, content, now, statuses) {
    var dep = dependants(content), maxDep = Math.max.apply(null, Object.keys(dep).map(function (k) { return dep[k]; }).concat([1]));
    statuses = statuses || all(state, content, now);
    return content.concepts.map(function (k) { return { id: k.id, p: priority(state, content, k.id, now, statuses[k.id], dep, maxDep), st: statuses[k.id] }; })
      .sort(function (a, b) { return b.p - a.p; });
  }

  function unlocked(content, statuses, id) {
    return (content.byId[id].pre || []).every(function (p) { return statuses[p] && statuses[p].st >= 1; });
  }

  function summary(state, content, now) {
    var st = all(state, content, now);
    var wsum = 0, msum = 0, comp = 0, mastered = 0, needRev = 0, H = 0, Hc = 0;
    content.concepts.forEach(function (k) {
      var w = EXAM_W[k.exam]; wsum += w; msum += w * st[k.id].m;
      if (st[k.id].st >= 3) comp++;
      if (st[k.id].st === 4) mastered++;
      if (k.exam === "H") { H++; if (st[k.id].st >= 3) Hc++; }
      var c = state.concepts[k.id];
      if (st[k.id].st >= 1 && ((c && c.box && now >= c.due) || st[k.id].m < 50)) needRev++;
    });
    // test accuracy: exam-weighted, last 60 days, recency-decayed
    var num = 0, den = 0, total = 0, correct = 0, total30 = 0, correct30 = 0;
    state.attempts.forEach(function (a) {
      var age = (now - a.ts) / DAY;
      total++; correct += a.score;
      if (age <= 30) { total30++; correct30 += a.score; }
      if (age > 60 || !a.session) return;
      var ew = Math.max.apply(null, (a.c || []).map(function (id) { return content.byId[id] ? EXAM_W[content.byId[id].exam] : 1; }).concat([1]));
      var w = ew * Math.pow(0.5, age / 21);
      num += w * a.score; den += w;
    });
    var testAcc = den ? num / den : 0;
    var mocks = state.quizzes.filter(function (q) { return q.n >= 25 && q.mode === "exam"; });
    var lastMock = mocks.length ? mocks[mocks.length - 1].score : 0;
    var readiness = 100 * (0.6 * testAcc + 0.25 * (H ? Hc / H : 0) + 0.15 * lastMock);
    // practical skills
    var labScores = Object.keys(state.labs).map(function (k) { return state.labs[k].score; }).filter(function (x) { return x != null; });
    var labMean = labScores.length ? labScores.reduce(function (a, b) { return a + b; }, 0) / labScores.length : 0;
    var projProg = content.projects.reduce(function (t, p) { var s = state.projects[p.id]; return t + (s ? Math.min(1, s.progress || 0) : 0); }, 0) / content.projects.length;
    var practical = 100 * (0.5 * labMean + 0.5 * projProg);
    var projectsDone = content.projects.filter(function (p) { var s = state.projects[p.id]; return s && s.score >= 0.7; }).length;
    var exercises = state.practice.length + Object.keys(state.labs).length + Object.keys(state.cases).length;
    return {
      statuses: st, mastery: Math.round(msum / wsum), readiness: Math.round(readiness), practical: Math.round(practical),
      completion: Math.round(100 * comp / content.concepts.length), competent: comp, mastered: mastered, needRevision: needRev,
      accuracy30: total30 ? Math.round(100 * correct30 / total30) : null, accuracyAll: total ? Math.round(100 * correct / total) : null,
      attempts: total, projectsDone: projectsDone, exercises: exercises, streak: streak(state, now), level: level(state, content, st)
    };
  }

  function streak(state, now) {
    var set = {}; state.days.forEach(function (d) { set[d] = 1; });
    var n = 0, gaps = 0, lastGap = -99;
    for (var i = 0; i < 400; i++) {
      var k = dayKey(now - i * DAY);
      if (set[k]) { n++; continue; }
      if (i === 0) continue; // today not yet active
      if (i - lastGap >= 7 && gaps < 60) { gaps++; lastGap = i; continue; } // one freeze per 7 days
      break;
    }
    return n;
  }

  function level(state, content, st) {
    var lv = 0;
    for (var i = 0; i < content.roadmap.length; i++) {
      var L = content.roadmap[i];
      var ok = L.concepts.every(function (id) { return st[id] && st[id].st >= 3; });
      if (ok && L.project) { var p = state.projects[L.project]; ok = !!(p && p.score >= 0.7); }
      if (!ok) break;
      lv = L.n;
    }
    return lv;
  }

  function topicBreakdown(state, content, now, attempts) {
    attempts = attempts || state.attempts;
    return content.topics.map(function (g) {
      var ids = content.concepts.filter(function (k) { return g.modules.indexOf(k.m) >= 0; }).map(function (k) { return k.id; });
      var n = 0, s = 0;
      attempts.forEach(function (a) { if (a.c && a.c.some(function (id) { return ids.indexOf(id) >= 0; })) { n++; s += a.score; } });
      var st = ids.map(function (id) { return status(state, content, id, now).m; });
      return { name: g.name, ids: ids, n: n, acc: n ? Math.round(100 * s / n) : null, mastery: Math.round(st.reduce(function (a, b) { return a + b; }, 0) / ids.length) };
    });
  }

  /* ---------- quiz selection ---------- */
  var MIX = { 1: [60, 30, 10, 0], 2: [20, 50, 25, 5], 3: [10, 30, 45, 15], 4: [0, 20, 40, 40], exam: [25, 35, 30, 10] };

  function seeded(seed) { var x = seed % 2147483647 || 1; return function () { x = x * 16807 % 2147483647; return (x - 1) / 2147483646; }; }

  function selectQuiz(state, content, opts, now) {
    var rnd = seeded(opts.seed || now);
    var n = opts.n || 10;
    var pool = content.questions.filter(function (q) {
      if (opts.modules && opts.modules.length && !q.c.some(function (id) { return opts.modules.indexOf(content.byId[id].m) >= 0; })) return false;
      if (opts.concepts && opts.concepts.length && !q.c.some(function (id) { return opts.concepts.indexOf(id) >= 0; })) return false;
      if (opts.mode === "exam" && q.ext) return false;
      if (opts.autoOnly && !q.auto) return false;
      return true;
    });
    var last = {};
    state.attempts.forEach(function (a) { if (a.q) last[a.q] = a; });
    var recentWrongOrUnseen = function (q) { var a = last[q.id]; return !a || now - a.ts > 14 * DAY || a.score < 0.7; };
    var fresh = pool.filter(recentWrongOrUnseen);
    if (fresh.length >= n) pool = fresh;
    var st = all(state, content, now);
    var pri = {}; priorities(state, content, now, st).forEach(function (x) { pri[x.id] = x.p; });
    var mix = MIX[opts.level || 2] || MIX[2];
    var wantD = mix.map(function (p) { return p / 100 * n; });
    var gotD = [0, 0, 0, 0];
    // Buckets (docs/04 §4.4): 40% weak or due, 40% coverage of unseen high-importance concepts, 20% maintenance.
    function bucket(q) {
      var best = Math.max.apply(null, q.c.map(function (id) { return st[id].st; }));
      var weak = q.c.some(function (id) { var c = state.concepts[id]; return st[id].st >= 1 && (st[id].m < 70 || (c && c.box && now >= c.due)); });
      if (weak) return 0;
      if (best === 0) return 1;
      return 2;
    }
    function score(q) {
      var a = last[q.id];
      var p = Math.max.apply(null, q.c.map(function (id) { return pri[id] || 0; }));
      var unseenH = !a && q.c.some(function (id) { return content.byId[id].exam === "H"; }) ? 0.2 : 0;
      return p + unseenH + rnd() * 0.25;
    }
    var buckets = [[], [], []];
    pool.forEach(function (q) { buckets[bucket(q)].push({ q: q, s: score(q) }); });
    buckets.forEach(function (b) { b.sort(function (x, y) { return y.s - x.s; }); });
    var quota = [Math.round(n * 0.4), Math.round(n * 0.4), 0]; quota[2] = n - quota[0] - quota[1];
    var picked = [], usedVariant = {}, typeCount = {};
    var maxType = n >= 25 ? Math.ceil(n * 0.4) : n;
    function tryPick(list, limit, strictD) {
      var took = 0;
      for (var i = 0; i < list.length && picked.length < n && took < limit; i++) {
        var q = list[i].q; if (picked.indexOf(q) >= 0) continue;
        if (q.v && usedVariant[q.v]) continue;
        if ((typeCount[q.t] || 0) >= maxType) continue;
        var di = q.d - 1;
        if (strictD && gotD[di] >= Math.ceil(wantD[di])) continue;
        picked.push(q); took++; gotD[di]++; typeCount[q.t] = (typeCount[q.t] || 0) + 1; if (q.v) usedVariant[q.v] = 1;
      }
      return took;
    }
    var short = 0;
    for (var b = 0; b < 3; b++) { var t1 = tryPick(buckets[b], quota[b], true); t1 += tryPick(buckets[b], quota[b] - t1, false); short += quota[b] - t1; }
    var rest = buckets[0].concat(buckets[1], buckets[2]).sort(function (x, y) { return y.s - x.s; });
    tryPick(rest, n, true); tryPick(rest, n, false);
    for (var i = picked.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = picked[i]; picked[i] = picked[j]; picked[j] = t; }
    return picked;
  }

  function dueConcepts(state, content, now) {
    return content.concepts.filter(function (k) { var c = state.concepts[k.id]; return c && c.box && now >= c.due; }).map(function (k) { return k.id; });
  }

  /* ---------- recommendations ---------- */
  function recommend(state, content, now) {
    var st = all(state, content, now);
    var pri = priorities(state, content, now, st);
    var order = content.concepts.map(function (k) { return k.id; });
    var lesson = null;
    var learning = pri.filter(function (x) { return x.st.st === 1; });
    if (learning.length) lesson = { id: learning[0].id, why: "You started this concept but haven't passed its check yet." };
    else {
      var next = order.find(function (id) { return st[id].st === 0 && unlocked(content, st, id); });
      if (next) lesson = { id: next, why: "Next unlocked concept in course order." };
    }
    var practiceTarget = pri.find(function (x) { return (!lesson || x.id !== lesson.id) && x.st.st >= 1 && x.st.st < 3 && (!x.st.s || x.st.s.P == null || x.st.s.P < 70); });
    var practice = practiceTarget ? { id: practiceTarget.id, why: "Highest-priority concept that still needs practice evidence." } : null;
    var due = dueConcepts(state, content, now);
    var quiz = { n: 10, why: due.length ? due.length + " concepts are due for spaced review." : "Mixed quiz weighted to your weakest concepts." };
    var proj = content.projects.find(function (p) { var s = state.projects[p.id]; return !(s && s.score >= 0.7); });
    var top = pri.find(function (x) { return x.st.st >= 1; });
    return { lesson: lesson, practice: practice, quiz: quiz, project: proj ? { id: proj.id, why: "Next level on the project ladder." } : null, top: top ? { id: top.id, p: top.p } : null, due: due };
  }

  /* Turn the authored content files (GMB.*) into the indexed shape the engine uses. */
  function buildContent(G) {
    var modOf = {};
    var concepts = G.CONCEPT_ROWS.map(function (r) {
      var id = r[0];
      return { id: id, m: "M" + id.slice(1, 3), name: r[1], sub: r[2], src: r[3], rel: r[4] ? r[4].split(" ") : [], skill: r[5], exam: r[6], proj: r[7], pre: r[8] ? r[8].split(" ") : [], d: G.DETAIL[id] || {} };
    });
    var byId = {}; concepts.forEach(function (k) { byId[k.id] = k; modOf[k.id] = k.m; });
    var questions = G.QUESTION_ROWS.map(function (r, i) {
      var c = r[0].split(" ");
      return { id: "Q" + (i + 1), c: c, t: r[1], d: r[2], q: r[3], o: r[4], a: r[5], x: r[6], v: r[7] || null, ext: !!r[8], m: 1, auto: true };
    });
    G.OPEN_QUESTIONS.forEach(function (o, i) {
      questions.push({ id: "O" + (i + 1), c: o.c, t: o.t, d: o.d, q: o.q, k: o.k, m: o.m, x: "Key points: " + o.k.join("; ") + ".", auto: false });
    });
    return { concepts: concepts, byId: byId, questions: questions, modules: G.MODULES, projects: G.PROJECTS, roadmap: G.ROADMAP, topics: G.TOPIC_GROUPS };
  }

  var api = { buildContent: buildContent, emptyState: emptyState, recordView: recordView, recordAttempt: recordAttempt, recordCheck: recordCheck, recordPractice: recordPractice, recordBuild: recordBuild,
    scores: scores, mastery: mastery, status: status, all: all, priorities: priorities, summary: summary, topicBreakdown: topicBreakdown,
    selectQuiz: selectQuiz, dueConcepts: dueConcepts, recommend: recommend, unlocked: unlocked, STATUSES: STATUSES, DAY: DAY, dayKey: dayKey };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GMBEngine = api;
})(this);
