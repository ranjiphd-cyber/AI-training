import { useState } from 'react';
import { useApp } from '../../store/state';
import { displayName } from '../../engine/compute';
import { teamPack, individualPack } from '../../export/pptx';
import { scorecardWorkbook, growthWorkbook } from '../../export/xlsx';
import { Band, Empty, fmt, Page, pct, Trace } from '../common';
import { useRows } from './analytics';

export function Reports() {
  const { data, period, showNames, update } = useApp();
  const { rule, rows } = useRows();
  const [busy, setBusy] = useState('');
  const [print, setPrint] = useState(false);
  if (!rule) return <Page title="Reports & Exports"><div className="note block">No rule version for this year.</div></Page>;
  const nameOf = (r: (typeof rows)[number]) => displayName(r.recruiter, showNames, data.recruiters);
  const run = async (label: string, fn: () => Promise<void> | void) => {
    setBusy(label);
    try {
      await fn();
      update('Report generated', `${label} · ${period.label} · names ${showNames ? 'shown' : 'hidden'} · rule v${rule.version}`, () => {});
    } finally {
      setBusy('');
    }
  };
  if (print) return <PrintView onClose={() => setPrint(false)} />;
  return (
    <Page title="Reports & Exports" sub={`${period.label} · rule version v${rule.version} (${rule.status}) · names ${showNames ? 'shown' : 'hidden'} (use Show names in the top bar)`}>
      {rule.status === 'draft' && <div className="note">Reports will be labelled with the draft rule version.</div>}
      {rows.length === 0 ? (
        <Empty>No recruiters yet.</Empty>
      ) : (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Team</h2>
            <div className="row">
              <button className="b" disabled={!!busy} onClick={() => run('Team PowerPoint pack', () => teamPack(data, rows, rule, period, nameOf))}>
                Team review pack (.pptx)
              </button>
              <button className="b ghost" disabled={!!busy} onClick={() => run('Excel delivery scorecard', () => scorecardWorkbook(data, rows, rule, period, nameOf))}>
                Delivery scorecard (.xlsx)
              </button>
              <button className="b ghost" disabled={!!busy} onClick={() => run('Excel growth & development', () => growthWorkbook(data, rows, rule, period, nameOf))}>
                Growth & development (.xlsx)
              </button>
              <button className="b ghost" onClick={() => setPrint(true)}>
                Management report (PDF / print)
              </button>
            </div>
            {busy && <p className="small muted">Building {busy}…</p>}
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Individual packs — to send to each recruiter</h2>
            <p className="small muted">Recruiters do not use this app. Download their pack and send it yourself. Each pack contains only that person's results, calculation and your approved commentary.</p>
            <table>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.recruiter.id}>
                    <td>{nameOf(r)}</td>
                    <td>
                      <Band d={r.delivery} />
                    </td>
                    <td className="n">{pct(r.delivery.ratingBasis)}</td>
                    <td>
                      <button className="b ghost" disabled={!!busy} onClick={() => run(`Individual pack ${r.recruiter.id}`, () => individualPack(data, r, rule, period, nameOf(r)))}>
                        Download .pptx
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  );
}

function PrintView({ onClose }: { onClose: () => void }) {
  const { data, period, showNames } = useApp();
  const { rule, rows } = useRows();
  const nameOf = (r: (typeof rows)[number]) => displayName(r.recruiter, showNames, data.recruiters);
  return (
    <div>
      <div className="row noprint" style={{ marginBottom: 10 }}>
        <button className="b" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
        <button className="b ghost" onClick={onClose}>
          ← Back
        </button>
      </div>
      <h1>
        {data.orgName} — TA management review
      </h1>
      <p className="muted">
        {period.label} ({period.start} → {period.end}) · rule version v{rule!.version} ({rule!.status}) · generated {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th className="n">Points</th>
              <th className="n">Target</th>
              <th className="n">Basis</th>
              <th>Band</th>
              <th className="n">/100</th>
              <th className="n">Growth</th>
              <th className="n">Req→offer</th>
              <th className="n">Vendor %</th>
              <th className="n">Women %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.recruiter.id}>
                <td>
                  {nameOf(r)}
                  {r.leaver ? ' (leaver)' : ''}
                </td>
                <td className="n">{fmt(r.delivery.weightedPoints, 2)}</td>
                <td className="n">{fmt(r.delivery.target)}</td>
                <td className="n">{pct(r.delivery.ratingBasis)}</td>
                <td>{r.delivery.band ?? 'Blocked'}</td>
                <td className="n">{fmt(r.delivery.total)}</td>
                <td className="n">{fmt(r.growth.score, 2)}</td>
                <td className="n">{fmt(r.delivery.avgCycleDays, 0)}</td>
                <td className="n">{fmt(r.delivery.vendorPct)}</td>
                <td className="n">{fmt(r.delivery.womenPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.map((r) => (
        <div className="card" key={r.recruiter.id}>
          <h2 style={{ marginTop: 0 }}>{nameOf(r)}</h2>
          {r.delivery.missing.length > 0 && <p className="small">Missing: {r.delivery.missing.join('; ')}</p>}
          <Trace t={r.delivery.trace} />
        </div>
      ))}
    </div>
  );
}
