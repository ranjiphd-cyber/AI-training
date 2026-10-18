/* Small SVG/HTML chart helpers. Series colours come from CSS tokens (--s1 navy, --s2 teal);
   series are also told apart by line style and marker shape so colour is never the only cue.
   Every mark carries data-tip for the shared hover tooltip. */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (x, d = 1) => x == null || isNaN(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('en-IN');

function niceMax(v) { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

/* Offers per 10-day cycle (bars) against the cycle target (dashed step line). */
function cadenceChart(cycles, { title = null, last = 14 } = {}) {
  const P = pointsBasis();
  title = title || (P ? 'Weighted points per 10-working-day cycle vs points target' : 'Offers per 10-working-day cycle vs target');
  if (P && title.includes('offers per')) title = title.replace(/offers per/i, 'Points per').replace('combined target', 'combined points target').replace('vs target', 'vs points target');
  if (!cycles.length) return emptyChart(title);
  // In points mode the bars show weighted points and the line the points target; offers stay in the tooltip.
  const cs = cycles.slice(-last).map(c => P ? Object.assign({}, c, { val: c.points, tgt: c.pointsTarget }) : Object.assign({}, c, { val: c.offers, tgt: c.target }));
  const W = 640, H = 220, L = 34, R = 10, T = 14, B = 34;
  const max = niceMax(Math.max(...cs.map(c => Math.max(c.val, c.tgt))) * 1.1);
  const bw = (W - L - R) / cs.length;
  const y = v => T + (H - T - B) * (1 - v / max);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`; }
  let bars = '', tline = '';
  cs.forEach((c, i) => {
    const x = L + i * bw + bw * .18, w = bw * .64, h = Math.max(0, y(0) - y(c.val));
    const miss = c.closed && c.val < c.tgt;
    const tip = `Cycle ${c.n} (${D.nice(c.from)} – ${D.nice(c.to)})${c.closed ? '' : ' · partial, not scored'}<br>Points ${fmt(c.points)} · points target ${fmt(c.pointsTarget)}<br>Offers ${c.offers} · offer target ${fmt(c.target)}<br>${c.closed ? (miss ? '✕ Below target' : '✓ Target met') : '○ Operational only'}`;
    bars += `<rect class="${c.closed ? 'bar' : 'bar partial'}" x="${x}" y="${y(c.val)}" width="${w}" height="${h}" rx="3" data-tip="${esc(tip)}"/>`;
    if (miss) bars += `<text class="ax miss" x="${x + w / 2}" y="${y(c.val) - 4}" text-anchor="middle">✕</text>`;
    bars += `<text class="ax" x="${x + w / 2}" y="${H - B + 14}" text-anchor="middle">${c.n}</text>`;
    tline += `${i ? 'L' : 'M'}${L + i * bw} ${y(c.tgt)} L${L + (i + 1) * bw} ${y(c.tgt)} `;
  });
  return chartWrap(title, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${g}<line class="axis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>${bars}<path class="target" d="${tline}"/><text class="ax" x="${(W + L) / 2}" y="${H - 4}" text-anchor="middle">Cycle number</text></svg>`,
    [['bar', P ? 'Weighted points (closed cycle)' : 'Offers (closed cycle)'], ['bar partial', 'Partial cycle (not scored)'], ['target', P ? 'Points target' : 'Target']]);
}

/* YTD cumulative actual vs expected. */
function cumulativeChart(cycles, title = null) {
  const P = pointsBasis();
  title = title ? title.replace(/offers vs expected/, P ? 'points vs points target' : 'offers vs expected') : (P ? 'Year to date: cumulative points vs points target' : 'Year to date: cumulative offers vs expected');
  if (!cycles.length) return emptyChart(title);
  let a = 0, t = 0;
  const pts = cycles.map(c => { a += P ? c.points : c.offers; t += P ? c.pointsTarget : c.target; return { n: c.n, a: r1(a), t, to: c.to }; });
  return lineChart([
    { name: P ? 'Weighted points' : 'Actual offers', cls: 's1', values: pts.map(p => p.a) },
    { name: P ? 'Points target' : 'Expected offers', cls: 's2 dashed', values: pts.map(p => r1(p.t)), marker: 'sq' },
  ], pts.map(p => p.n), { title, xLabel: 'Cycle number', tipLabel: i => `Cycle ${pts[i].n} (to ${D.nice(pts[i].to)})` });
}

function lineChart(series, labels, { title, yMin = 0, yMax = null, xLabel = '', tipLabel = i => labels[i], ref = null, refLabel = '' } = {}) {
  const W = 640, H = 230, L = 34, R = 14, T = 14, B = 36;
  const all = series.flatMap(s => s.values.filter(v => v != null));
  const max = yMax != null ? yMax : niceMax(Math.max(...all, ref || 0) * 1.08);
  const n = labels.length, x = i => L + (n === 1 ? (W - L - R) / 2 : (W - L - R) * i / (n - 1));
  const y = v => T + (H - T - B) * (1 - (v - yMin) / (max - yMin));
  let g = '';
  const steps = yMax === 5 ? 4 : 4;
  for (let i = 0; i <= steps; i++) { const v = yMin + (max - yMin) * i / steps; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`; }
  const every = Math.ceil(n / 12);
  labels.forEach((lb, i) => { if (i % every === 0 || i === n - 1) g += `<text class="ax" x="${x(i)}" y="${H - B + 15}" text-anchor="middle">${esc(lb)}</text>`; });
  if (ref != null) g += `<line class="target" x1="${L}" x2="${W - R}" y1="${y(ref)}" y2="${y(ref)}"/><text class="ax" x="${W - R}" y="${y(ref) - 5}" text-anchor="end">${esc(refLabel)}</text>`;
  let paths = '';
  series.forEach(s => {
    let d = '', started = false;
    s.values.forEach((v, i) => { if (v == null) { started = false; return; } d += `${started ? 'L' : 'M'}${x(i)} ${y(v)} `; started = true; });
    paths += `<path class="line ${s.cls}" d="${d}"/>`;
    s.values.forEach((v, i) => { if (v == null) return; paths += s.marker === 'sq' ? `<rect class="mk ${s.cls}" x="${x(i) - 4}" y="${y(v) - 4}" width="8" height="8"/>` : `<circle class="mk ${s.cls}" cx="${x(i)}" cy="${y(v)}" r="4.5"/>`; });
    const li = s.values.length - 1 - [...s.values].reverse().findIndex(v => v != null);
    if (s.values[li] != null && series.length <= 3) paths += `<text class="dl" x="${Math.min(x(li) + 7, W - 2)}" y="${y(s.values[li]) - 7}" text-anchor="${x(li) > W - 60 ? 'end' : 'start'}">${fmt(s.values[li])}</text>`;
  });
  // hover columns
  let hit = '';
  labels.forEach((lb, i) => {
    const tip = `<b>${esc(tipLabel(i))}</b><br>` + series.map(s => `${esc(s.name)}: ${fmt(s.values[i])}`).join('<br>');
    const w = (W - L - R) / Math.max(1, n - 1);
    hit += `<rect class="hit" x="${x(i) - w / 2}" y="${T}" width="${w}" height="${H - T - B}" data-tip="${esc(tip)}"/>`;
  });
  const legend = series.map(s => [`line ${s.cls}`, s.name]);
  if (ref != null && refLabel) legend.push(['target', refLabel]);
  return chartWrap(title, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${g}<line class="axis" x1="${L}" x2="${W - R}" y1="${y(yMin)}" y2="${y(yMin)}"/>${paths}${hit}${xLabel ? `<text class="ax" x="${(W + L) / 2}" y="${H - 4}" text-anchor="middle">${esc(xLabel)}</text>` : ''}</svg>`, legend);
}

/* Horizontal bars (HTML) with a reference marker; label and value always printed. */
function hbars(items, { title, max = null, ref = null, refLabel = '', unit = '', valueFmt = v => fmt(v) + unit } = {}) {
  if (!items.length) return emptyChart(title);
  const M = max || niceMax(Math.max(...items.map(i => i.value || 0), ref || 0));
  const rows = items.map(i => `<div class="hb-row" data-tip="${esc(i.tip || (i.label + ': ' + valueFmt(i.value)))}">
      <div class="hb-lab">${esc(i.label)}${i.sub ? `<span class="muted"> · ${esc(i.sub)}</span>` : ''}</div>
      <div class="hb-track">${ref != null ? `<span class="hb-ref" style="left:${ref / M * 100}%"></span>` : ''}<span class="hb-bar ${i.cls || ''}" style="width:${clamp((i.value || 0) / M * 100, 0, 100)}%"></span></div>
      <div class="hb-val">${i.value == null ? '—' : valueFmt(i.value)} ${i.status ? statusChip(i.status, true) : ''}</div></div>`).join('');
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption><div class="hb">${rows}</div>${ref != null ? `<div class="legend"><span class="lg"><i class="sw target"></i>${esc(refLabel)}</span></div>` : ''}</figure>`;
}

function histogram(values, { title, bins = [[0, 50], [50, 60], [60, 70], [70, 80], [80, 90], [90, 101]] } = {}) {
  const counts = bins.map(([a, b]) => values.filter(v => v >= a && v < b).length);
  const M = Math.max(1, ...counts);
  const cols = bins.map(([a, b], i) => `<div class="hg-col" data-tip="${a}–${b === 101 ? 100 : b}: ${counts[i]} member(s)"><div class="hg-n">${counts[i]}</div><div class="hg-bar" style="height:${counts[i] / M * 120}px"></div><div class="hg-lab">${a}–${b === 101 ? 100 : b}</div></div>`).join('');
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption><div class="hg">${cols}</div></figure>`;
}

function chartWrap(title, svg, legend) {
  const lg = legend && legend.length ? `<div class="legend">${legend.map(([c, n]) => `<span class="lg"><i class="sw ${c}"></i>${esc(n)}</span>`).join('')}</div>` : '';
  return `<figure class="chart"><figcaption>${esc(title)}</figcaption>${lg}${svg}</figure>`;
}
function emptyChart(title) { return `<figure class="chart"><figcaption>${esc(title)}</figcaption><p class="empty">No data yet for this period.</p></figure>`; }

function progressBar(value, max, label) {
  const pct = max ? clamp(value / max * 100, 0, 100) : 0;
  return `<div class="pbar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label || '')}"><span style="width:${pct}%"></span></div>`;
}

const STATUS = {
  good: ['✓', 'On track'], watch: ['▲', 'Watch'], below: ['✕', 'Below target'], none: ['○', 'Not yet scored'],
  prov: ['⧗', 'Provisional'], pending: ['⧗', 'Pending decision'], brd: ['✓', 'BRD confirmed'], approved: ['✓', 'Approved'],
};
function statusChip(k, compact = false, text = null) {
  const s = STATUS[k] || ['•', k];
  return `<span class="chip st-${k}"><span aria-hidden="true">${s[0]}</span> ${esc(text || s[1])}</span>`;
}
function dmaicTracker(p) {
  return `<ol class="dmaic" aria-label="DMAIC stages">${DMAIC.map((st, i) => {
    const k = i <= p.stage ? 'done' : i === p.inProgress ? 'prog' : 'todo';
    const lab = k === 'done' ? 'Validated' : k === 'prog' ? 'In progress' : 'Not started';
    return `<li class="dm ${k}" data-tip="${st}: ${lab}${k === 'done' && p.history[i] ? ' · ' + D.nice(p.history[i].validated) : ''} · plan ${D.nice((p.planStages || [])[i])}"><span class="dm-dot" aria-hidden="true">${k === 'done' ? '●' : k === 'prog' ? '◐' : '○'}</span><span class="dm-st">${st}</span><span class="dm-lab">${lab}</span></li>`;
  }).join('')}</ol>`;
}
