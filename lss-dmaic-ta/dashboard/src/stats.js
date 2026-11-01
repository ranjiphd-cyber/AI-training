// Minimal statistics library for the TTF control room (no dependencies).
const ST = (() => {
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mean = a => a.length ? sum(a) / a.length : NaN;
  const sd = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / (a.length - 1)); };
  const sorted = a => a.slice().sort((x, y) => x - y);
  const q = (a, p) => { if (!a.length) return NaN; const s = sorted(a), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)]) - s[lo]); };
  const median = a => q(a, 0.5);
  function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
  const ncdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
  function ninv(p) { // Acklam
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], pl = 0.02425;
    let qq, r;
    if (p < pl) { qq = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * qq + c[1]) * qq + c[2]) * qq + c[3]) * qq + c[4]) * qq + c[5]) / ((((d[0] * qq + d[1]) * qq + d[2]) * qq + d[3]) * qq + 1); }
    if (p <= 1 - pl) { qq = p - 0.5; r = qq * qq; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * qq / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    qq = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * qq + c[1]) * qq + c[2]) * qq + c[3]) * qq + c[4]) * qq + c[5]) / ((((d[0] * qq + d[1]) * qq + d[2]) * qq + d[3]) * qq + 1);
  }
  function lgamma(x) { const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const c of g) s += c / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function gammaP(a, x) { // regularized lower incomplete gamma
    if (x <= 0) return 0;
    if (x < a + 1) { let ap = a, s = 1 / a, del = s; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-12) break; } return s * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  const chi2p = (x, k) => Math.max(0, 1 - gammaP(k / 2, x / 2));
  function betacf(a, b, x) { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break; }
    return h; }
  function ibeta(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tp2 = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5); // two-sided p
  const fp = (F, d1, d2) => F <= 0 ? 1 : ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2); // upper tail
  function ranks(a) { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); let ties = 0;
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rk; const t = j - i + 1; ties += t ** 3 - t; i = j + 1; }
    return { r, ties }; }
  function ad(x) { // Anderson-Darling normality, p per D'Agostino & Stephens
    const n = x.length; if (n < 8) return { A2: NaN, p: NaN }; const m = mean(x), s = sd(x), z = sorted(x).map(v => (v - m) / s);
    let S = 0; for (let i = 0; i < n; i++) { const F1 = Math.min(Math.max(ncdf(z[i]), 1e-15), 1 - 1e-15), F2 = Math.min(Math.max(ncdf(z[n - 1 - i]), 1e-15), 1 - 1e-15); S += (2 * i + 1) * (Math.log(F1) + Math.log(1 - F2)); }
    const A2 = -n - S / n, a = A2 * (1 + 0.75 / n + 2.25 / (n * n)); let p;
    if (a >= 0.6) p = Math.exp(1.2937 - 5.709 * a + 0.0186 * a * a); else if (a >= 0.34) p = Math.exp(0.9177 - 4.279 * a - 1.38 * a * a);
    else if (a >= 0.2) p = 1 - Math.exp(-8.318 + 42.796 * a - 59.938 * a * a); else p = 1 - Math.exp(-13.436 + 101.14 * a - 223.73 * a * a);
    return { A2, p: Math.min(1, Math.max(0, p)) }; }
  function capability(x, USL) {
    const n = x.length, m = mean(x), s = sd(x), med = median(x), pd = n ? x.filter(v => v > USL).length / n : NaN;
    const mr = x.slice(1).map((v, i) => Math.abs(v - x[i])), mrbar = mean(mr);
    return { n, mean: m, sd: s, median: med, q1: q(x, 0.25), q3: q(x, 0.75), min: Math.min(...x), max: Math.max(...x), pd, dpmo: pd * 1e6,
      zbench: pd > 0 && pd < 1 ? ninv(1 - pd) : (pd === 0 ? Infinity : -Infinity),
      ppkN: (USL - m) / (3 * s), ppkP: (USL - med) / (q(x, 0.99865) - med), ad: ad(x), adLog: x.every(v => v > 0) ? ad(x.map(Math.log)) : { p: NaN },
      imr: { cl: m, mrbar, ucl: m + 2.66 * mrbar, lcl: Math.max(0, m - 2.66 * mrbar), mrUcl: 3.267 * mrbar } };
  }
  function kruskal(groups) { // groups: {name: [values]}
    const names = Object.keys(groups).filter(k => groups[k].length > 0); if (names.length < 2) return null;
    const all = [], lab = []; names.forEach((k, gi) => groups[k].forEach(v => { all.push(v); lab.push(gi); }));
    const N = all.length, { r, ties } = ranks(all), Rs = names.map(() => 0), ns = names.map(k => groups[k].length);
    r.forEach((rk, i) => Rs[lab[i]] += rk);
    let H = 12 / (N * (N + 1)) * Rs.reduce((s, R, i) => s + R * R / ns[i], 0) - 3 * (N + 1); const corr = 1 - ties / (N ** 3 - N); if (corr > 0) H /= corr;
    return { H, df: names.length - 1, p: chi2p(H, names.length - 1), groups: names.map((k, i) => ({ name: k, n: ns[i], median: median(groups[k]) })) };
  }
  function mannWhitney(a, b) { // one-sided: a > b
    const all = a.concat(b), { r, ties } = ranks(all), n1 = a.length, n2 = b.length; if (!n1 || !n2) return null;
    const R1 = sum(r.slice(0, n1)), U = R1 - n1 * (n1 + 1) / 2, mu = n1 * n2 / 2, N = n1 + n2;
    const sig = Math.sqrt(n1 * n2 / 12 * ((N + 1) - ties / (N * (N - 1)))), z = (U - mu - 0.5) / sig;
    return { U, z, p: 1 - ncdf(z) }; }
  function moodMedian(groups) { const arrs = groups.filter(g => g.length); if (arrs.length < 2) return null; const gm = median([].concat(...arrs));
    const above = arrs.map(g => g.filter(v => v > gm).length), below = arrs.map((g, i) => g.length - above[i]); const N = sum(arrs.map(g => g.length)), A = sum(above), Bl = N - A;
    let chi = 0; arrs.forEach((g, i) => { const eA = g.length * A / N, eB = g.length * Bl / N; const y = arrs.length === 2 ? 0.5 : 0, dA = Math.max(0, Math.abs(above[i] - eA) - y), dB = Math.max(0, Math.abs(below[i] - eB) - y); chi += dA * dA / eA + dB * dB / eB; });
    return { chi2: chi, df: arrs.length - 1, p: chi2p(chi, arrs.length - 1), medians: arrs.map(median) }; }
  function levene(a, b) { // Brown-Forsythe (median-centred), = scipy default
    const za = a.map(v => Math.abs(v - median(a))), zb = b.map(v => Math.abs(v - median(b))), all = za.concat(zb), N = all.length, k = 2, gm = mean(all);
    const ssb = za.length * (mean(za) - gm) ** 2 + zb.length * (mean(zb) - gm) ** 2, ssw = sum(za.map(v => (v - mean(za)) ** 2)) + sum(zb.map(v => (v - mean(zb)) ** 2));
    const W = (N - k) / (k - 1) * ssb / ssw; return { W, p: fp(W, k - 1, N - k) }; }
  function pearson(x, y) { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); }
  function spearman(x, y) { const n = x.length; if (n < 4) return null; const rho = pearson(ranks(x).r, ranks(y).r), t = rho * Math.sqrt((n - 2) / (1 - rho * rho)); return { rho, p: tp2(t, n - 2) }; }
  function inv(M) { const n = M.length, A = M.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => i === j ? 1 : 0)));
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-12) return null; [A[c], A[p]] = [A[p], A[c]];
      const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } }
    return A.map(r => r.slice(n)); }
  function ols(X, y, names) { // X: rows of predictors (no intercept)
    const n = y.length, k = X[0].length + 1; if (n <= k + 1) return null; const Xd = X.map(r => [1, ...r]);
    const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => sum(Xd.map(r => r[i] * r[j])))), XtXi = inv(XtX); if (!XtXi) return null;
    const Xty = Array.from({ length: k }, (_, i) => sum(Xd.map((r, t) => r[i] * y[t]))), beta = XtXi.map(r => sum(r.map((v, j) => v * Xty[j])));
    const res = y.map((v, t) => v - sum(Xd[t].map((x, j) => x * beta[j]))), sse = sum(res.map(e => e * e)), my = mean(y), sst = sum(y.map(v => (v - my) ** 2));
    const r2 = 1 - sse / sst, r2a = 1 - (1 - r2) * (n - 1) / (n - k), s2 = sse / (n - k);
    const vif = j => { const xj = X.map(r => r[j]), oth = X.map(r => r.filter((_, i) => i !== j)); if (!oth[0].length) return 1; const m = ols1(oth, xj); return m ? 1 / (1 - m) : NaN; };
    return { r2, r2a, s: Math.sqrt(s2), n, residAD: ad(res).p, terms: beta.map((b, j) => { const se = Math.sqrt(s2 * XtXi[j][j]), t = b / se; return { term: j ? names[j - 1] : "Constant", coef: b, se, t, p: tp2(t, n - k), vif: j ? vif(j - 1) : null }; }) };
  }
  function ols1(X, y) { const n = y.length, k = X[0].length + 1, Xd = X.map(r => [1, ...r]);
    const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => sum(Xd.map(r => r[i] * r[j])))), Xi = inv(XtX); if (!Xi) return null;
    const Xty = Array.from({ length: k }, (_, i) => sum(Xd.map((r, t) => r[i] * y[t]))), b = Xi.map(r => sum(r.map((v, j) => v * Xty[j])));
    const res = y.map((v, t) => v - sum(Xd[t].map((x, j) => x * b[j]))), my = mean(y); return 1 - sum(res.map(e => e * e)) / sum(y.map(v => (v - my) ** 2)); }
  function chi2x2(t) { const [[a, b], [c, d]] = t, n = a + b + c + d; if ([a + b, c + d, a + c, b + d].some(v => v === 0)) return null;
    const chi = n * Math.max(0, Math.abs(a * d - b * c) - n / 2) ** 2 / ((a + b) * (c + d) * (a + c) * (b + d)); return { chi2: chi, p: chi2p(chi, 1) }; } // Yates, = scipy default
  return { mean, sd, median, q, ad, capability, kruskal, mannWhitney, moodMedian, levene, spearman, ols, chi2x2, ninv };
})();
if (typeof module !== "undefined") module.exports = ST;
