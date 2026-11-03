import { ReactNode, useState } from 'react';
import { useApp } from '../store/state';
import { Overview, Scorecard, GrowthScreen, MatrixScreen, MultiYear } from './screens/analytics';
import { Profiles } from './screens/profiles';
import { OfferLog, OpenReqs, ExtraPoints, Projects, TrainingScreen, FeedbackScreen } from './screens/records';
import { Reviews } from './screens/reviews';
import { Imports } from './screens/imports';
import { Reports } from './screens/reports';
import { Settings } from './screens/settings';
import { HowScoring } from './screens/how';

export type Nav = { go: (screen: string, recruiterId?: string) => void };

const NAV: [string, string][] = [
  ['overview', 'Executive Overview'],
  ['scorecard', 'Delivery Scorecard'],
  ['growth', 'Growth & Behaviours'],
  ['matrix', 'Performance Matrix'],
  ['profiles', 'Recruiter Profiles'],
  ['-', 'Evidence'],
  ['offers', 'Offer Log'],
  ['reqs', 'Open Requisitions'],
  ['extra', 'Extra Points'],
  ['projects', 'Projects & Improvements'],
  ['training', 'Training & Development'],
  ['feedback', 'Stakeholder Feedback'],
  ['-', 'Manage'],
  ['reviews', 'Reviews & Appraisals'],
  ['imports', 'Data Imports'],
  ['reports', 'Reports & Exports'],
  ['multiyear', 'Multi-Year Analysis'],
  ['settings', 'Settings & Audit Log'],
  ['how', 'How Scoring Works'],
];

export function Shell() {
  const app = useApp();
  const [screen, setScreen] = useState('overview');
  const [rid, setRid] = useState<string | undefined>();
  const go: Nav['go'] = (s, r) => {
    setScreen(s);
    setRid(r);
    window.scrollTo(0, 0);
  };
  const screens: Record<string, ReactNode> = {
    overview: <Overview go={go} />,
    scorecard: <Scorecard go={go} />,
    growth: <GrowthScreen go={go} />,
    matrix: <MatrixScreen go={go} />,
    profiles: <Profiles go={go} recruiterId={rid} />,
    offers: <OfferLog />,
    reqs: <OpenReqs />,
    extra: <ExtraPoints />,
    projects: <Projects />,
    training: <TrainingScreen />,
    feedback: <FeedbackScreen />,
    reviews: <Reviews go={go} />,
    imports: <Imports />,
    reports: <Reports />,
    multiyear: <MultiYear />,
    settings: <Settings />,
    how: <HowScoring />,
  };
  const years = app.data.years.map((y) => y.year).sort();
  return (
    <div className="layout">
      <nav className="side" aria-label="Main">
        <div className="brand">
          TA Performance Scorecard
          <small>{app.data.orgName}</small>
        </div>
        {NAV.map(([k, l], i) =>
          k === '-' ? (
            <div className="grp" key={i}>
              {l}
            </div>
          ) : (
            <button key={k} className={screen === k ? 'on' : ''} onClick={() => go(k)} aria-current={screen === k ? 'page' : undefined}>
              {l}
            </button>
          ),
        )}
      </nav>
      <main className="main">
        <div className="topbar">
          <label className="f">
            Year
            <select value={app.year} onChange={(e) => app.setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="f">
            Period
            <select value={app.period.key} onChange={(e) => app.setPeriodKey(e.target.value)}>
              {app.periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            <input type="checkbox" checked={app.showNames} onChange={(e) => app.setShowNames(e.target.checked)} /> Show names
          </label>
          {app.yearClosed && <span className="pill b">Year closed — read only</span>}
          <span className="sp" />
          <span className="muted small">{app.saving ? 'Saving…' : 'Saved locally (encrypted)'}</span>
          <span className="small">{app.user}</span>
          <button className="b ghost" onClick={app.lock}>
            Lock
          </button>
        </div>
        {screens[screen]}
      </main>
    </div>
  );
}
