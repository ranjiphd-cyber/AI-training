/* TA MIS data view. Contains no data: it renders window.TAMIS_DATA when a restricted build injects it.
   Counting rules approved 6 Nov 2026: status decides outcome; internal joiners separate; campus from Campus sheet. */
window.TAMIS_VIEW_FACTORY = function (T) {
  "use strict";
  var D = window.TAMIS_DATA; if (!D) return null;
  var esc = T.esc, pill = T.pill;
  var nf = function (n) { return n == null ? "—" : Number(n).toLocaleString("en-IN"); };
  var pct = function (a, b) { return b ? Math.round(1000 * a / b) / 10 + "%" : "—"; };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MIN_N = 5;

  /* ---------- filters ---------- */
  function uniq(arr) { var o = {}; arr.forEach(function (x) { if (x != null) o[x] = 1; }); return Object.keys(o).sort(function (a, b) { return a.localeCompare(b, "en", { numeric: true }); }); }
  var PERIODS = [["All available data", null, null], ["Calendar 2026", "2026-01-01", "2026-12-31"], ["Calendar 2025", "2025-01-01", "2025-12-31"],
    ["Q1 2026", "2026-01-01", "2026-03-31"], ["Q2 2026", "2026-04-01", "2026-06-30"], ["Q3 2026", "2026-07-01", "2026-09-30"], ["Q4 2026", "2026-10-01", "2026-12-31"]];
  var BUS = uniq(D.recs.map(function (r) { return r.b; }).concat(D.nats.map(function (r) { return r.b; }), D.ai.map(function (r) { return r.b; }), D.internal.map(function (r) { return r.b; })));
  var DEPTS = uniq(D.recs.map(function (r) { return r.d; }));
  var STREAMS = ["Lateral", "Fresher (non-campus)", "Campus GET", "Campus PGET", "NATS"];
  var ETS = uniq(D.recs.map(function (r) { return r.et; }));
  var JLS = uniq(D.recs.map(function (r) { return r.jl; }));
  var filters = [
    { id: "f-period", label: "Reporting period", opts: PERIODS.map(function (p) { return p[0]; }) },
    { id: "f-business", label: "Business area", opts: ["All business areas"].concat(BUS) },
    { id: "f-dept", label: "Department", opts: ["All departments"].concat(DEPTS) },
    { id: "f-stream", label: "Hiring stream", opts: ["All streams"].concat(STREAMS) },
    { id: "f-emp", label: "Employment type", opts: ["All"].concat(ETS) },
    { id: "f-level", label: "Job level", opts: ["All"].concat(JLS) }
  ];
  function fv(id) { var f = filters.filter(function (x) { return x.id === id; })[0]; var i = +T.getFilter(id) || 0; return i ? f.opts[i] : null; }
  function period() { return PERIODS[+T.getFilter("f-period") || 0]; }
  function inP(d) { if (!d) return false; var p = period(); return !p[1] || (d >= p[1] && d <= p[2]); }
  function scoped(R) {
    var b = fv("f-business"), d = fv("f-dept"), s = fv("f-stream"), e = fv("f-emp"), j = fv("f-level");
    return R.filter(function (r) { return (!b || r.b === b) && (!d || r.d === d) && (!s || r.st === s) && (!e || r.et === e) && (!j || r.jl === j); });
  }
  function bizOnly(R) { var b = fv("f-business"); return R.filter(function (r) { return !b || r.b === b; }); }
  function otherFiltersSet() { return fv("f-dept") || fv("f-stream") || fv("f-emp") || fv("f-level"); }

  /* ---------- measures ---------- */
  function days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }
  function quant(s, p) { if (!s.length) return null; var i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(s[lo] + (s[hi] - s[lo]) * (i - lo)); }
  function stats(vals) { var v = vals.filter(function (x) { return x != null && x >= 0; }).sort(function (a, b) { return a - b; }); return { n: v.length, med: quant(v, 0.5), q1: quant(v, 0.25), q3: quant(v, 0.75), neg: vals.filter(function (x) { return x != null && x < 0; }).length, vals: v }; }
  function M(R) {
    var offers = R.filter(function (r) { return inP(r.od); });
    var joiners = R.filter(function (r) { return r.o === "Joined" && inP(r.dj); });
    var declines = R.filter(function (r) { return r.o === "Declined" && inP(r.od); });
    var ytj = R.filter(function (r) { return r.o === "Yet to join"; });
    var known = offers.filter(function (r) { return r.o === "Joined" || r.o === "Declined"; });
    return {
      offers: offers, joiners: joiners, declines: declines, ytj: ytj,
      drate: { num: known.filter(function (r) { return r.o === "Declined"; }).length, den: known.length },
      a2o: stats(offers.map(function (r) { return r.rd && r.od ? days(r.rd, r.od) : null; })),
      o2j: stats(joiners.map(function (r) { return r.od && r.dj ? days(r.od, r.dj) : null; })),
      a2j: stats(joiners.map(function (r) { return r.rd && r.dj ? days(r.rd, r.dj) : null; }))
    };
  }
  function count(R, key) { var o = {}; R.forEach(function (r) { var k = r[key] == null ? "Not recorded" : r[key]; o[k] = (o[k] || 0) + 1; }); return Object.keys(o).map(function (k) { return { label: k, value: o[k] }; }).sort(function (a, b) { return (a.label === "Not recorded") - (b.label === "Not recorded") || b.value - a.value; }); }

  /* ---------- components ---------- */
  var PROV = "provisional";
  function card(id, value, unit, sub, opts) {
    opts = opts || {}; var k = T.kpi(id), did = "dv-" + id + "-" + Math.random().toString(36).slice(2, 7);
    return '<article class="kpi" aria-label="' + esc(k.name) + '"><div class="kpi-top"><span class="kpi-name">' + esc(k.name) + '</span><button class="info-btn" aria-expanded="false" aria-controls="' + did + '" data-def="' + did + '" title="Show definition">i</button></div>' +
      '<div class="kpi-value num live">' + esc(value) + "<span>" + esc(unit) + "</span></div>" +
      '<div class="kpi-basis">' + sub + "</div><div>" + pill(opts.state || PROV) + "</div>" +
      '<dl class="defn" id="' + did + '" hidden><dt>Counts</dt><dd>' + esc(k.num) + "</dd><dt>Date basis</dt><dd>" + esc(k.basis) + "</dd><dt>Denominator</dt><dd>" + esc(k.den) + "</dd><dt>Rule</dt><dd>" + esc(k.open) + "</dd></dl></article>";
  }
  function medTxt(s) { return s.n < MIN_N ? "n<" + MIN_N : nf(s.med); }
  function panel(title, sub, body, state, foot) {
    return '<section class="panel"><div class="panel-head"><div><h2>' + esc(title) + '</h2><div class="sub">' + sub + "</div></div>" + pill(state || PROV) + "</div>" + body + (foot ? '<p class="foot">' + foot + "</p>" : "") + "</section>";
  }
  function empty(msg) { return '<div class="nodata">' + pill("norecords") + "<p>" + esc(msg || "No records match these filters inside your scope.") + "</p></div>"; }
  function hbars(items, total, opts) {
    opts = opts || {}; if (!items.length) return empty();
    var unk = items.filter(function (i) { return i.label === "Not recorded"; }), known = items.filter(function (i) { return i.label !== "Not recorded"; });
    var lim = opts.limit || 14, shown = known.slice(0, lim), rest = known.slice(lim);
    if (rest.length === 1) shown.push(rest[0]);
    else if (rest.length) shown.push({ label: "Other " + rest.length + " values", value: rest.reduce(function (a, b) { return a + b.value; }, 0), other: true });
    shown = shown.concat(unk);
    var max = Math.max.apply(null, shown.map(function (i) { return i.value; }));
    return '<div class="hbars">' + shown.map(function (i) {
      var w = max ? Math.max(1, 100 * i.value / max) : 0, unk = i.label === "Not recorded";
      var drill = opts.drill && !i.other && !unk ? ' data-setfilter="' + opts.drill + '" data-value="' + esc(i.label) + '" tabindex="0" role="button" title="Filter to ' + esc(i.label) + '"' : "";
      return '<div class="hb' + (drill ? " drill" : "") + '"' + drill + '><span class="hb-l">' + esc(i.label) + '</span><span class="hb-t"><i class="' + (unk ? "unk" : "") + '" style="width:' + w + '%"></i></span><span class="hb-v num">' + nf(i.value) + (total ? ' <em>' + pct(i.value, total) + "</em>" : "") + "</span></div>";
    }).join("") + "</div>";
  }
  function monthsBetween(a, b) { var out = [], y = +a.slice(0, 4), m = +a.slice(5, 7); var ey = +b.slice(0, 4), em = +b.slice(5, 7); while (y < ey || (y === ey && m <= em)) { out.push(y + "-" + (m < 10 ? "0" : "") + m); m++; if (m > 12) { m = 1; y++; } } return out; }
  function mlabel(k) { return MON[+k.slice(5, 7) - 1] + " " + k.slice(2, 4); }
  function cols(cats, series, opts) {
    opts = opts || {}; var W = 640, H = 230, L = 34, B = 34, top = 18, cw = (W - L - 8) / cats.length;
    var max = 0; series.forEach(function (s) { s.values.forEach(function (v) { if (v > max) max = v; }); });
    if (!max) return empty();
    var step = Math.pow(10, Math.floor(Math.log10(max))), nice = Math.ceil(max / step) * step; if (nice / step < 3) { step /= 2; } var ticks = []; for (var t = 0; t <= nice + 1e-9; t += step) ticks.push(t);
    var y = function (v) { return H - B - (H - B - top) * v / nice; };
    var g = '<svg class="cols" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.label || "Column chart") + '">';
    ticks.forEach(function (t) { g += '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="grid"/><text x="' + (L - 6) + '" y="' + (y(t) + 3) + '" class="ax" text-anchor="end">' + nf(t) + "</text>"; });
    var bw = Math.min(26, (cw - 6) / series.length);
    cats.forEach(function (c, i) {
      var x0 = L + i * cw + (cw - bw * series.length) / 2;
      series.forEach(function (s, j) { var v = s.values[i], x = x0 + j * bw, yy = y(v);
        g += '<rect x="' + x + '" y="' + yy + '" width="' + (bw - 1) + '" height="' + Math.max(0, H - B - yy) + '" class="s' + j + '"><title>' + esc(s.name + ", " + c.label + ": " + nf(v)) + "</title></rect>";
        if (v && bw >= 11) g += '<text x="' + (x + bw / 2 - 0.5) + '" y="' + (yy - 4) + '" class="vl" text-anchor="middle">' + nf(v) + "</text>"; });
      if (cats.length <= 16 || i % 2 === 0) g += '<text x="' + (L + i * cw + cw / 2) + '" y="' + (H - B + 16) + '" class="ax" text-anchor="middle">' + esc(c.label) + "</text>";
    });
    g += '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" class="base"/></svg>';
    var leg = series.length > 1 ? '<div class="legend">' + series.map(function (s, j) { return '<span><i class="s' + j + '"></i>' + esc(s.name) + "</span>"; }).join("") + "</div>" : "";
    return leg + '<div class="chart-wrap">' + g + "</div>";
  }
  function dots(rows) {
    rows = rows.filter(function (r) { return r.s.n > 0; }); if (!rows.length) return empty("No completed intervals in this selection.");
    var max = Math.max.apply(null, rows.map(function (r) { return r.s.n >= MIN_N ? r.s.q3 : 0; }).concat([1]));
    return '<div class="dots">' + rows.map(function (r) {
      var s = r.s, ok = s.n >= MIN_N;
      return '<div class="dt"><span class="hb-l">' + esc(r.label) + '</span><span class="dt-t">' + (ok ? '<i class="iqr" style="left:' + 100 * s.q1 / max + "%;width:" + Math.max(0.6, 100 * (s.q3 - s.q1) / max) + '%"></i><b style="left:' + 100 * s.med / max + '%"></b>' : '<span class="muted sup">Suppressed: n&lt;' + MIN_N + "</span>") + '</span><span class="hb-v num">' + (ok ? nf(s.med) + " d <em>IQR " + nf(s.q1) + "–" + nf(s.q3) + "</em>" : "—") + " <em>n " + s.n + "</em></span></div>";
    }).join("") + '<div class="dt-scale"><span></span><span class="sc"><span>0</span><span>' + nf(max) + " days</span></span><span></span></div></div>";
  }
  function stack(rows, keys, names) {
    if (!rows.length) return empty();
    return '<div class="legend">' + names.map(function (n, j) { return '<span><i class="s' + j + '"></i>' + esc(n) + "</span>"; }).join("") + '</div><div class="hbars">' + rows.map(function (r) {
      var tot = keys.reduce(function (a, k) { return a + (r[k] || 0); }, 0);
      return '<div class="hb"><span class="hb-l">' + esc(r.label) + '</span><span class="hb-t stk">' + keys.map(function (k, j) { return r[k] ? '<i class="s' + j + '" style="width:' + 100 * r[k] / tot + '%" title="' + esc(names[j] + ": " + r[k]) + '"></i>' : ""; }).join("") + '</span><span class="hb-v num">' + keys.map(function (k) { return nf(r[k] || 0); }).join(" · ") + "</span></div>";
    }).join("") + "</div>";
  }
  function table(head, rows, opts) {
    opts = opts || {};
    return '<div class="tbl-wrap"><table><thead><tr>' + head.map(function (h, i) { return '<th scope="col"' + (opts.num && opts.num.indexOf(i) >= 0 ? ' class="r"' : "") + ">" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
      (rows.length ? rows.map(function (r) { return "<tr" + (r.attrs || "") + ">" + r.cells.map(function (c, i) { return "<td" + (opts.num && opts.num.indexOf(i) >= 0 ? ' class="num r"' : "") + ">" + c + "</td>"; }).join("") + "</tr>"; }).join("") : '<tr class="empty-row"><td colspan="' + head.length + '">No records match these filters.</td></tr>') + "</tbody></table></div>";
  }
  function head(title, purpose) {
    var p = period(), chips = '<span class="tag">' + esc(p[0]) + '</span><span class="tag">' + esc(fv("f-business") || "All business areas") + '</span><span class="tag">Report date ' + esc(D.asof) + " (not verified)</span>";
    return T.head(title, purpose, chips);
  }
  var POP = "MT external candidates (Source ≠ Campus), the Campus sheet and NATS trainees. Internal joiners are reported separately. NATS has no offer or requisition dates, so it appears in joiner figures only.";

  /* ---------- pages ---------- */
  function executive() {
    var R = scoped(D.recs), m = M(R), h = head("Executive Overview", "Hiring delivery across " + POP) + T.renderFilters();
    h += '<div class="kpis">' +
      card("offers", nf(m.offers.length), "offers", "By offer date in period") +
      card("joiners", nf(m.joiners.length), "people", "By joining date · " + ["MT", "Campus", "NATS"].map(function (x) { return x + " " + nf(m.joiners.filter(function (r) { return r.s === x; }).length); }).join(" · ")) +
      card("yettojoin", nf(m.ytj.length), "people", "Status Offered at report date; not period-filtered") +
      card("declines", nf(m.declines.length), "offers", "By offer date · decline rate " + pct(m.drate.num, m.drate.den) + " of " + nf(m.drate.den) + " offers with an outcome") +
      card("a2o", medTxt(m.a2o), "days median", "Calendar days · n " + m.a2o.n + (m.a2o.n >= MIN_N ? " · IQR " + m.a2o.q1 + "–" + m.a2o.q3 : "")) +
      card("o2j", medTxt(m.o2j), "days median", "Calendar days · n " + m.o2j.n + (m.o2j.n >= MIN_N ? " · IQR " + m.o2j.q1 + "–" + m.o2j.q3 : "")) + "</div>";
    var I = bizOnly(D.internal), ij = I.filter(function (r) { return r.o === "Joined"; }).length, io = I.filter(function (r) { return r.o === "Offered"; }).length;
    h += '<section class="separate" aria-label="Reported separately"><div><h2>Reported separately</h2><p>Internal-posting fills, counted with or without a joining date and excluded from every other figure on this site. Business filter applies; other filters do not.</p></div><div class="kpis">' +
      card("internal", nf(ij), "people", "Cumulative at report date · joining date not recorded") +
      '<article class="kpi"><div class="kpi-top"><span class="kpi-name">Internal offered</span></div><div class="kpi-value num live">' + nf(io) + '<span>positions</span></div><div class="kpi-basis">Internal-posting rows with status Offered and no candidate</div><div>' + pill("pending", "Treatment awaiting decision") + "</div></article></div></section>";
    var p = period(), ms = monthsBetween(p[1] || "2025-10-01", p[2] && p[2] < D.asof ? p[2] : D.asof.slice(0, 7) + "-01");
    var cats = ms.map(function (k) { return { key: k, label: mlabel(k) }; });
    var off = ms.map(function (k) { return m.offers.filter(function (r) { return r.od.slice(0, 7) === k; }).length; });
    var joi = ms.map(function (k) { return m.joiners.filter(function (r) { return r.dj.slice(0, 7) === k; }).length; });
    var J = m.joiners;
    h += '<div class="grid2">' +
      panel("Monthly hiring activity", "Offers by offer month and joiners by joining month. Joiners in a month are not conversions of that month's offers.", cols(cats, [{ name: "Offers", values: off }, { name: "Joiners", values: joi }], { label: "Offers and joiners by month" }), PROV, "Offer dates start in Oct 2025, so earlier months are not comparable.") +
      panel("Joiners by business area", "Share of " + nf(J.length) + " joiners in period · select a bar to filter", hbars(count(J, "b"), J.length, { drill: "f-business" })) +
      panel("Joiners by hiring stream", "Each stream shown separately; share of " + nf(J.length) + " joiners · select a bar to filter", hbars(count(J, "st"), J.length, { drill: "f-stream" }) + '<h3 class="mini">By source sheet</h3>' + hbars(count(J, "s"), J.length)) +
      panel("Joiners by job level and employment type", "Share of " + nf(J.length) + " joiners", hbars(count(J, "jl"), J.length, { limit: 8 }) + '<h3 class="mini">Employment type</h3>' + hbars(count(J, "et"), J.length)) +
      panel("Joiners by recorded gender", "Share of " + nf(J.length) + " joiners; Not recorded shown when present", hbars(count(J, "g"), J.length)) +
      panel("Joiners by recorded source", "Source labels exactly as recorded (approved); share of " + nf(J.length) + " joiners", hbars(count(J, "src"), J.length)) +
      panel("Observations", "Factual statements from the figures above. No causes or forecasts.", observations(m), PROV) +
      panel("Management attention", "Open data-quality exceptions in the source", attentionTop(), "validation", '<a class="btn" href="#attention">Open Management Attention</a>') + "</div>";
    h += T.notes(["Population: " + POP, "Outcome follows the recorded status. Report date is the file save date (approved) until a source reporting date is supplied.", "No targets are shown: no approved target data exists.", "No prior-period comparison: offer history before Oct 2025 is not in the source.", "Intervals use calendar days. Medians and percentages are suppressed below n=" + MIN_N + "."]);
    return h;
  }
  function observations(m) {
    var J = m.joiners, out = [];
    if (J.length) { var top = count(J, "b")[0]; out.push(["Largest business area by joiners: " + top.label + ", " + nf(top.value) + " of " + nf(J.length) + " (" + pct(top.value, J.length) + ").", "Joiners KPI, current filters", "Is this share in line with the approved hiring plan for " + top.label + "?"]); }
    if (m.a2o.n >= MIN_N) out.push(["Median approval-to-offer is " + m.a2o.med + " calendar days; a quarter of offers took longer than " + m.a2o.q3 + " days (n " + m.a2o.n + ").", "Approval-to-offer, IQR", "Which requisitions sit beyond " + m.a2o.q3 + " days, and what is the approved service level?"]);
    var dec = m.declines, rec = dec.filter(function (r) { return r.dr; }).length;
    if (dec.length) out.push(["A decline reason is recorded for " + rec + " of " + dec.length + " declines.", "Reason for Decline column", "Should a decline reason be mandatory before status is set to Declined?"]);
    if (m.ytj.length) { var late = m.ytj.filter(function (r) { return r.dj && r.dj > "2026-12-31"; }).length; out.push([nf(m.ytj.length) + " candidates are yet to join; " + late + " have expected joining dates in 2027.", "Yet to join, expected joining date", "Which of these need a pre-joining engagement plan?"]); }
    if (!out.length) return empty();
    return '<ol class="obs">' + out.map(function (o) { return "<li><b>" + esc(o[0]) + '</b><span>Evidence: ' + esc(o[1]) + ' · Threshold: rule pending approval</span><span class="q">Question: ' + esc(o[2]) + "</span></li>"; }).join("") + "</ol>";
  }
  function attentionTop() {
    var top = D.dq.slice().sort(function (a, b) { return b[2] - a[2]; }).slice(0, 5);
    return '<ul class="tight">' + top.map(function (d) { return "<li>" + esc(d[0]) + ' <span class="muted">(' + esc(d[1]) + ", " + nf(d[2]) + " rows)</span></li>"; }).join("") + "</ul>";
  }
  function business() {
    var R = scoped(D.recs), h = head("Business Performance", "Outcomes and cycle times by business area. Select a business to drill into its departments.") + T.renderFilters();
    var bs = uniq(R.map(function (r) { return r.b; })), rows = bs.map(function (b) { var m = M(R.filter(function (r) { return r.b === b; })); return { b: b, m: m }; }).sort(function (a, b) { return b.m.joiners.length - a.m.joiners.length; });
    var tot = M(R);
    h += '<div class="kpis">' + card("offers", nf(tot.offers.length), "offers", "By offer date") + card("joiners", nf(tot.joiners.length), "people", "By joining date") + card("declines", nf(tot.declines.length), "offers", "Decline rate " + pct(tot.drate.num, tot.drate.den)) + card("a2j", medTxt(tot.a2j), "days median", "Approval to joining · n " + tot.a2j.n) + "</div>";
    h += panel("Outcomes by business area", "Each measure on its own date basis · select a row to filter", table(["Business area", "Offers", "Joiners", "of which MT", "Campus", "NATS", "Yet to join", "Declines", "Decline rate", "Median approval→joining (n)"],
      rows.map(function (x) { var js = function (k) { return nf(x.m.joiners.filter(function (r) { return r.s === k; }).length); }; return { attrs: ' class="clickable" data-setfilter="f-business" data-value="' + esc(x.b) + '" tabindex="0"', cells: ["<b>" + esc(x.b) + "</b>", nf(x.m.offers.length), "<b>" + nf(x.m.joiners.length) + "</b>", js("MT"), js("Campus"), js("NATS"), nf(x.m.ytj.length), nf(x.m.declines.length), x.m.drate.den >= MIN_N ? pct(x.m.drate.num, x.m.drate.den) : "n<" + MIN_N, medTxt(x.m.a2j) + ' <span class="muted">(' + x.m.a2j.n + ")</span>"] }; }), { num: [1, 2, 3, 4, 5, 6, 7, 8, 9] }));
    var J = tot.joiners;
    h += '<div class="grid2">' + panel("Joiners by department", fv("f-business") ? "Within " + esc(fv("f-business")) : "All business areas · filter a business to focus", hbars(count(J, "d"), J.length, { limit: 12, drill: "f-dept" })) +
      panel("Approval to joining by business area", "Median and interquartile range, calendar days", dots(rows.map(function (x) { return { label: x.b, s: x.m.a2j }; }))) +
      panel("Joiners by hiring stream", "Share of " + nf(J.length), hbars(count(J, "st"), J.length, { drill: "f-stream" })) +
      panel("Joiners by job level", "Share of " + nf(J.length), hbars(count(J, "jl"), J.length, { drill: "f-level" })) +
      panel("Recruiter and hiring-manager view", "Volume and cycle time per recruiter", '<div class="nodata">' + pill("denied") + "<p>Recruiter and hiring-manager names are excluded from this restricted build. This view needs a separately approved capability.</p></div>", "denied") + "</div>";
    return h + T.notes(["Population: " + POP, "Candidate identity is not included in this build at any drill level."]);
  }
  function lifecycle() {
    var R = scoped(D.recs), m = M(R), h = head("Recruitment Lifecycle", "Recorded milestones, offer outcomes and decline reasons. Not a conversion funnel.") + T.renderFilters();
    var C = R.filter(function (r) { return inP(r.od); });
    var ms = [["Requisition approved", "rd"], ["Stack released", "sd"], ["Offer made", "od"], ["Joining date recorded", "dj"]];
    h += '<div class="kpis">' + card("offers", nf(m.offers.length), "offers", "By offer date") + card("declines", nf(m.declines.length), "offers", "By offer date") + card("declinerate", pct(m.drate.num, m.drate.den), "", nf(m.drate.num) + " of " + nf(m.drate.den) + " offers with an outcome; yet-to-join excluded") + card("yettojoin", nf(m.ytj.length), "people", "Status Offered at report date") + "</div>";
    var om = uniq(C.map(function (r) { return r.od.slice(0, 7); }));
    h += '<div class="grid2">' + panel("Recorded milestones", "Candidates with an offer in period (" + nf(C.length) + ") and which dates are recorded", table(["Milestone", "Recorded", "Missing", "Share recorded"], ms.map(function (x) { var n = C.filter(function (r) { return r[x[1]]; }).length; return { cells: [x[0], nf(n), nf(C.length - n), pct(n, C.length)] }; }), { num: [1, 2, 3] })) +
      panel("Offer outcomes by offer month", "Status at report date for each offer cohort", stack(om.map(function (k) { var X = C.filter(function (r) { return r.od.slice(0, 7) === k; }); return { label: mlabel(k), j: X.filter(function (r) { return r.o === "Joined"; }).length, y: X.filter(function (r) { return r.o === "Yet to join"; }).length, d: X.filter(function (r) { return r.o === "Declined"; }).length }; }), ["j", "y", "d"], ["Joined", "Yet to join", "Declined"])) +
      panel("Decline reasons", "All " + nf(m.declines.length) + " declines in period; Not recorded shown", hbars(count(m.declines, "dr"), m.declines.length)) +
      panel("Lifecycle exceptions", "From the source workbook", table(["Issue", "Rows"], D.dq.filter(function (d) { return /date|Stack|Offer|Declined|Joined/.test(d[0]); }).map(function (d) { return { cells: [esc(d[0]), nf(d[2])] }; }), { num: [1] }), "validation", '<a class="btn" href="#attention">See all exceptions</a>') + "</div>";
    return h + T.notes(["Open requisitions (" + D.notIncluded.mtOpenReq + " requisition-only rows) are not reported: requisition data is not yet validated.", "Stack and offer sequence conflicts are flagged, not corrected."]);
  }
  function efficiency() {
    var R = scoped(D.recs), m = M(R), h = head("Efficiency & Ageing", "Completed cycle times, recalculated from validated dates, kept apart from ongoing ageing.") + T.renderFilters();
    var sub = function (s) { return "Calendar days · n " + s.n + (s.n >= MIN_N ? " · IQR " + s.q1 + "–" + s.q3 : "") + (s.neg ? " · " + s.neg + " negative excluded" : ""); };
    var nn = m.joiners.filter(function (r) { return r.s !== "NATS"; }).length;
    var Y = m.ytj.filter(function (r) { return r.od; }).map(function (r) { return days(r.od, D.asof); });
    h += '<div class="kpis">' + card("a2o", medTxt(m.a2o), "days median", sub(m.a2o)) + card("o2j", medTxt(m.o2j), "days median", sub(m.o2j)) + card("a2j", medTxt(m.a2j), "days median", sub(m.a2j)) + card("ageing", medTxt(stats(Y)), "days median", "Yet-to-join candidates since offer, at report date · n " + Y.length) + "</div>";
    var bands = [[0, 15], [16, 30], [31, 45], [46, 60], [61, 90], [91, 120], [121, 180], [181, 99999]];
    var bl = function (b) { return b[1] > 9999 ? "181+" : b[0] + "–" + b[1]; };
    var by = function (key) { return uniq(m.joiners.map(function (r) { return r[key]; })).map(function (v) { return { label: v, s: stats(m.joiners.filter(function (r) { return r[key] === v; }).map(function (r) { return r.rd && r.dj ? days(r.rd, r.dj) : null; })) }; }); };
    var ab = [[0, 30], [31, 60], [61, 90], [91, 99999]];
    h += '<div class="grid2">' + panel("Approval to offer: distribution", "Offers in period by band, calendar days (n " + m.a2o.n + ")", cols(bands.map(function (b) { return { label: bl(b) }; }), [{ name: "Offers", values: bands.map(function (b) { return m.a2o.vals.filter(function (v) { return v >= b[0] && v <= b[1]; }).length; }) }], { label: "Approval to offer distribution" })) +
      panel("Offer to joining: distribution", "Joiners in period by band, calendar days (n " + m.o2j.n + ")", cols(bands.map(function (b) { return { label: bl(b) }; }), [{ name: "Joiners", values: bands.map(function (b) { return m.o2j.vals.filter(function (v) { return v >= b[0] && v <= b[1]; }).length; }) }], { label: "Offer to joining distribution" })) +
      panel("Approval to joining by job level", "Median and IQR, calendar days", dots(by("jl"))) +
      panel("Approval to joining by hiring stream", "Median and IQR, calendar days", dots(by("st"))) +
      panel("Yet-to-join ageing", "Days from offer to report date for " + Y.length + " candidates still to join", cols(ab.map(function (b) { return { label: b[1] > 9999 ? "91+ days" : b[0] + "–" + b[1] + " days" }; }), [{ name: "Candidates", values: ab.map(function (b) { return Y.filter(function (v) { return v >= b[0] && v <= b[1]; }).length; }) }], { label: "Yet to join ageing" }), PROV, "Ongoing ageing, not a completed cycle time.") +
      panel("Interval exceptions", "Records excluded from cycle times. NATS joiners have no offer or requisition dates and are not counted here.", table(["Interval", "Negative", "Missing a date"], [["Approval → offer", m.a2o.neg, m.offers.length - m.a2o.n - m.a2o.neg], ["Offer → joining", m.o2j.neg, nn - m.o2j.n - m.o2j.neg], ["Approval → joining", m.a2j.neg, nn - m.a2j.n - m.a2j.neg]].map(function (r) { return { cells: [r[0], nf(r[1]), nf(r[2])] }; }), { num: [1, 2] }), "validation") + "</div>";
    return h + T.notes(["Intervals use calendar days (approved). NATS joiners are excluded from cycle times: they have no offer or requisition dates.", "The workbook's ageing columns are not used: one has a wrong formula and one depends on TODAY().", "Medians below n=" + MIN_N + " are suppressed (approved)."]);
  }
  function diversity() {
    var R = scoped(D.recs), m = M(R), J = m.joiners, h = head("Diversity & Sourcing", "Every percentage names its population and denominator. Not recorded is always shown.") + T.renderFilters();
    var f = J.filter(function (r) { return r.g === "Female"; }).length;
    h += '<div class="kpis">' + card("gender", pct(f, J.length), "women", nf(f) + " of " + nf(J.length) + " joiners recorded as Female") + card("source", nf(uniq(J.map(function (r) { return r.src; })).length), "source labels", "Distinct source labels among joiners, as recorded") + "</div>";
    var qs = uniq(J.map(function (r) { return r.dj.slice(0, 4) + "-Q" + Math.ceil(+r.dj.slice(5, 7) / 3); }));
    h += '<div class="grid2">' + panel("Gender of joiners", "Population: " + nf(J.length) + " joiners in period", hbars(count(J, "g"), J.length)) +
      panel("Women's share of joiners by quarter", "Denominator: all joiners in each quarter, Not recorded included", table(["Quarter", "Women", "All joiners", "Share"], qs.map(function (q) { var X = J.filter(function (r) { return r.dj.slice(0, 4) + "-Q" + Math.ceil(+r.dj.slice(5, 7) / 3) === q; }), w = X.filter(function (r) { return r.g === "Female"; }).length; return { cells: [q, nf(w), nf(X.length), X.length >= MIN_N ? pct(w, X.length) : "n<" + MIN_N] }; }), { num: [1, 2, 3] })) +
      panel("Gender by business area", "Joiners recorded as Female in each business area", table(["Business area", "Women", "Joiners", "Share"], count(J, "b").map(function (b) { var X = J.filter(function (r) { return r.b === b.label; }), w = X.filter(function (r) { return r.g === "Female"; }).length; return { cells: [esc(b.label), nf(w), nf(X.length), X.length >= MIN_N ? pct(w, X.length) : "n<" + MIN_N] }; }), { num: [1, 2, 3] })) +
      panel("Hiring source of joiners", "Labels exactly as recorded (approved); share of " + nf(J.length) + " joiners", hbars(count(J, "src"), J.length)) +
      panel("Specific source", "Free-text source detail", '<div class="nodata">' + pill("denied") + "<p>Specific Source is free text and can name individuals, so it is excluded from this build.</p></div>", "denied") +
      panel("Employment type of joiners", "Share of " + nf(J.length) + " joiners", hbars(count(J, "et"), J.length)) + "</div>";
    return h + T.notes(["Gender is used only as recorded; nothing is inferred.", "Group shares below n=" + MIN_N + " are suppressed (approved). Joiner figures include NATS trainees."]);
  }
  var tabs = [["nats", "NATS Hiring"], ["natsstatus", "NATS Active / Inactive"], ["campus", "Campus Hiring"]];
  function programmes() {
    var t = T.getProgTab(), h = head("NATS & Campus", "Apprenticeship and early-career programmes, each read from its own sheet. Only the business and period filters apply here.") + T.renderFilters();
    if (otherFiltersSet()) h += '<div class="callout">Department, stream, employment type and job level filters do not apply to these sheets.</div>';
    h += '<div class="tabs" role="tablist">' + tabs.map(function (x) { return '<button role="tab" id="tab-' + x[0] + '" aria-selected="' + (t === x[0]) + '" data-tab="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>";
    if (t === "nats") {
      var N = bizOnly(D.nats), J = N.filter(function (r) { return r.o === "Joined" && inP(r.dj); }), Dd = N.filter(function (r) { return r.o === "Declined"; });
      var ms = uniq(J.map(function (r) { return r.dj.slice(0, 7); }));
      var progs = count(N.filter(function (r) { return r.prog; }), "prog");
      h += '<div class="kpis">' + card("nats", nf(J.length), "trainees", "Status Joined, by joining date in period") + '<article class="kpi"><div class="kpi-top"><span class="kpi-name">NATS declined</span></div><div class="kpi-value num live">' + nf(Dd.length) + '<span>candidates</span></div><div class="kpi-basis">Status Declined; no offer date recorded, so not included in executive declines</div><div>' + pill(PROV) + "</div></article></div>";
      h += '<div class="grid2">' + panel("NATS joining by month", "Trainees joined, by joining month", cols(ms.map(function (k) { return { label: mlabel(k) }; }), [{ name: "Joined", values: ms.map(function (k) { return J.filter(function (r) { return r.dj.slice(0, 7) === k; }).length; }) }], { label: "NATS joiners by month" })) +
        panel("NATS joiners by business area", "Share of " + nf(J.length) + " · programme rows show as Not recorded", hbars(count(J, "b"), J.length, { drill: "f-business" }), PROV, progs.length ? "Programmes without a business area: " + progs.map(function (p) { return esc(p.label) + " (" + p.value + ")"; }).join(", ") + ". Owning business awaits decision." : "") +
        panel("NATS joiners by batch", "Share of " + nf(J.length), hbars(count(J, "batch"), J.length)) +
        panel("Gender of NATS joiners", "Share of " + nf(J.length), hbars(count(J, "g"), J.length)) + "</div>";
      h += T.notes([D.notIncluded.natsOpen + " NATS rows are open positions with no candidate and are not counted.", "NATS joiners are included in the executive joiner total and also shown here separately."]);
    } else if (t === "natsstatus") {
      var A = bizOnly(D.ai), act = A.filter(function (r) { return r.st === "Active"; }).length;
      var bs = count(A, "b").map(function (b) { var X = A.filter(function (r) { return r.b === b.label; }); return { label: b.label, a: X.filter(function (r) { return r.st === "Active"; }).length, i: X.filter(function (r) { return r.st === "Inactive"; }).length }; });
      var ys = uniq(A.map(function (r) { return r.yj; }));
      h += '<div class="kpis">' + card("natsactive", nf(act), "trainees", "Status Active in the snapshot", { state: "validation" }) + '<article class="kpi"><div class="kpi-top"><span class="kpi-name">NATS inactive</span></div><div class="kpi-value num live">' + nf(A.length - act) + '<span>trainees</span></div><div class="kpi-basis">Status Inactive. Not attrition.</div><div>' + pill("validation") + "</div></article></div>";
      h += '<div class="grid2">' + panel("Status by business area", "Snapshot; date not recorded in the sheet", stack(bs, ["a", "i"], ["Active", "Inactive"]), "validation") +
        panel("Status by year joined", "Snapshot; no trend is drawn from it", table(["Year joined", "Active", "Inactive", "Total"], ys.map(function (y) { var X = A.filter(function (r) { return String(r.yj) === y; }); var a = X.filter(function (r) { return r.st === "Active"; }).length; return { cells: [y === "null" ? "Not recorded" : y, nf(a), nf(X.length - a), nf(X.length)] }; }), { num: [1, 2, 3] }), "validation") + "</div>";
      h += T.notes(["The snapshot has no as-of date; it needs one before these counts can be validated.", "The workbook was saved with a filter hiding Inactive rows; all rows are read here.", "Inactive status is not reported as attrition. Period filter does not apply."]);
    } else {
      var Cc = bizOnly(D.recs.filter(function (r) { return r.s === "Campus"; })), CJ = Cc.filter(function (r) { return r.o === "Joined" && inP(r.dj); }), CD = Cc.filter(function (r) { return r.o === "Declined" && inP(r.od); });
      h += '<div class="kpis">' + card("campus", nf(CJ.length), "graduates", "Status Joined, by joining date") + '<article class="kpi"><div class="kpi-top"><span class="kpi-name">Campus declined</span></div><div class="kpi-value num live">' + nf(CD.length) + '<span>offers</span></div><div class="kpi-basis">Status Declined, by offer date</div><div>' + pill(PROV) + "</div></article></div>";
      h += '<div class="grid2">' + panel("GET / PGET split", "Share of " + nf(CJ.length) + " campus joiners", hbars(count(CJ, "st"), CJ.length)) +
        panel("College-wise intake", "Campus joiners by college", hbars(count(CJ, "col"), CJ.length, { limit: 12 }), PROV, "College names are shown as recorded; a cleaned reference list is pending.") +
        panel("Campus joiners by business area", "Share of " + nf(CJ.length), hbars(count(CJ, "b"), CJ.length, { drill: "f-business" })) +
        panel("Gender of campus joiners", "Share of " + nf(CJ.length), hbars(count(CJ, "g"), CJ.length)) + "</div>";
      h += T.notes(["Approved: campus hires come from the Campus sheet; the matching MT rows are excluded from MT totals.", "No batch column exists; batches would need a new field."]);
    }
    return h;
  }
  function attention() {
    var h = head("Management Attention", "Data-quality exceptions from the source, kept separate from hiring-performance alerts.");
    h += T.panelRaw('<div class="panel-head"><div><h2>Hiring-performance alerts</h2><div class="sub">No alert rules or thresholds have been approved.</div></div>' + pill("pending") + "</div>" + table(["Issue", "Business", "Evidence", "Rule", "Priority", "Owner", "Due date", "Status"], []));
    h += T.panelRaw('<div class="panel-head"><div><h2>Data-quality exceptions</h2><div class="sub">' + D.dq.length + " exception types · row numbers refer to the source sheet</div></div>" + pill("validation", "Open") + "</div>" +
      table(["Issue", "Sheet", "Rows", "Evidence", "Rule", "Priority", "Owner", "Status"], D.dq.slice().sort(function (a, b) { return b[2] - a[2]; }).map(function (d) { return { cells: [esc(d[0]), esc(d[1]), nf(d[2]), '<span class="muted">' + esc(d[3]) + "</span>", "Validation rule", '<span class="muted">Not assigned</span>', '<span class="muted">Not assigned</span>', pill("validation", "Open")] }; }), { num: [2] }));
    return h;
  }
  return {
    filters: filters,
    pages: { executive: executive, business: business, lifecycle: lifecycle, efficiency: efficiency, diversity: diversity, programmes: programmes, attention: attention },
    meta: function () { return { period: period()[0], scope: "All India · restricted build, no sign-in", asof: "Not verified · file saved " + D.saved, pub: "Not published · local restricted build", dq: D.dq.length + " exception types open" }; }
  };
};
