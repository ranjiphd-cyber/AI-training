import { useState } from 'react';
import { useApp, uid, todayISO } from '../../store/state';
import { calendarDays, categorise, inRange } from '../../engine/scoring';
import { ExtraPoint, Feedback, Offer, OFFER_STATUSES, Project, Requisition, STREAMS, Training } from '../../types';
import { Page, RecordTable, useCollection, useName } from '../common';

function useRecruiterFilter() {
  const { data } = useApp();
  const name = useName();
  const [rid, setRid] = useState('');
  const el = (
    <select value={rid} onChange={(e) => setRid(e.target.value)} aria-label="Filter by recruiter">
      <option value="">All recruiters</option>
      {data.recruiters.map((r) => (
        <option key={r.id} value={r.id}>
          {name(r)}
        </option>
      ))}
    </select>
  );
  return { rid, el, match: (x: { recruiterId: string }) => !rid || x.recruiterId === rid };
}

export function OfferLog() {
  const { data, period } = useApp();
  const col = useCollection('offers', 'Offer');
  const f = useRecruiterFilter();
  const rows = data.offers.filter((o) => f.match(o) && inRange(o.offerDate, period.start, period.end)).sort((a, b) => (a.offerDate < b.offerDate ? 1 : -1));
  return (
    <Page title="Offer Log" sub={`Offers released in ${period.label}. Points category is derived from stream and grade (SG = JL + 2).`}>
      <RecordTable<Offer & { cat?: string }>
        title="Offers"
        filter={f.el}
        rows={rows.map((o) => ({ ...o, cat: categorise(o).code }))}
        readOnly={col.readOnly}
        cols={[
          { key: 'recruiterId', label: 'Recruiter', type: 'recruiter', required: true },
          { key: 'reqId', label: 'Req ID', type: 'text', required: true },
          { key: 'candidateRef', label: 'Candidate ref', type: 'text' },
          { key: 'stream', label: 'Stream', type: 'select', options: STREAMS },
          { key: 'sg', label: 'Grade (SG)', type: 'number', min: 1, max: 20 },
          { key: 'cat', label: 'Points category', type: 'text' },
          { key: 'reqDate', label: 'Req approved', type: 'date' },
          { key: 'offerDate', label: 'Offer date', type: 'date', required: true },
          { key: 'doj', label: 'Joined on', type: 'date' },
          { key: 'status', label: 'Status', type: 'select', options: OFFER_STATUSES },
          { key: 'woman', label: 'Woman', type: 'bool' },
          { key: 'viaVendor', label: 'Via vendor', type: 'bool' },
        ]}
        blank={() => ({ id: uid('O'), recruiterId: f.rid, reqId: '', candidateRef: '', stream: 'Lateral', sg: null, reqDate: null, offerDate: todayISO(), doj: null, woman: false, viaVendor: false, status: 'Offered', batchId: null })}
        onSave={(row, isNew) => {
          const { cat: _c, ...o } = row;
          void _c;
          col.onSave(o as Offer, isNew);
        }}
        onDelete={col.onDelete}
      />
    </Page>
  );
}

export function OpenReqs() {
  const { data, period } = useApp();
  const col = useCollection('requisitions', 'Requisition');
  const f = useRecruiterFilter();
  const rows = data.requisitions.filter(f.match).map((q) => ({ ...q, age: q.status === 'closed' ? null : calendarDays(q.openDate, period.end) }));
  rows.sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
  const bands: [string, (n: number) => boolean][] = [
    ['< 45', (n) => n < 45],
    ['45–60', (n) => n >= 45 && n <= 60],
    ['61–90', (n) => n > 60 && n <= 90],
    ['91–150', (n) => n > 90 && n <= 150],
    ['> 150', (n) => n > 150],
  ];
  const open = rows.filter((r) => r.age !== null);
  return (
    <Page title="Open Requisitions" sub={`Ageing measured to ${period.end} (calendar days since opening)`}>
      <div className="tiles">
        {bands.map(([l, t]) => (
          <div key={l} className={`tile ${l.includes('150') || l.includes('91') ? 'o' : ''}`}>
            <div className="k">{l} days</div>
            <div className="v">{open.filter((r) => t(r.age!)).length}</div>
          </div>
        ))}
      </div>
      <RecordTable<Requisition & { age: number | null }>
        title="Requisitions"
        filter={f.el}
        rows={rows}
        readOnly={col.readOnly}
        cols={[
          { key: 'recruiterId', label: 'Recruiter', type: 'recruiter', required: true },
          { key: 'reqId', label: 'Req ID', type: 'text', required: true },
          { key: 'title', label: 'Position', type: 'text' },
          { key: 'openDate', label: 'Opened', type: 'date', required: true },
          { key: 'status', label: 'Status', type: 'select', options: ['open', 'on-hold', 'closed'] },
          { key: 'closedDate', label: 'Closed', type: 'date' },
          { key: 'age', label: 'Age (days)', type: 'number' },
        ]}
        blank={() => ({ id: uid('Q'), recruiterId: f.rid, reqId: '', title: '', openDate: todayISO(), status: 'open', closedDate: null, batchId: null, age: null })}
        onSave={(row, isNew) => {
          const { age: _a, ...q } = row;
          void _a;
          col.onSave(q as Requisition, isNew);
        }}
        onDelete={col.onDelete}
      />
    </Page>
  );
}

export function ExtraPoints() {
  const { data, update } = useApp();
  const col = useCollection('extraPoints', 'Extra points');
  const f = useRecruiterFilter();
  const rows = data.extraPoints.filter(f.match);
  return (
    <Page title="Extra Points" sub="Points for exceptional contributions. They count only after you approve them, and only if the rule version includes extra points.">
      <RecordTable<ExtraPoint>
        title="Extra points"
        filter={f.el}
        rows={rows}
        readOnly={col.readOnly}
        cols={[
          { key: 'recruiterId', label: 'Recruiter', type: 'recruiter', required: true },
          { key: 'date', label: 'Date', type: 'date', required: true },
          { key: 'points', label: 'Points', type: 'number', required: true },
          { key: 'reason', label: 'Reason', type: 'text', required: true },
          { key: 'evidence', label: 'Evidence', type: 'long' },
          { key: 'approved', label: 'Approved', type: 'bool' },
        ]}
        blank={() => ({ id: uid('X'), recruiterId: f.rid, date: todayISO(), points: 0, reason: '', evidence: '', approved: false })}
        onSave={(row, isNew) => {
          const prev = data.extraPoints.find((x) => x.id === row.id);
          if (row.approved && (!prev || !prev.approved)) update('Extra points approved', `${row.id}: ${row.points} pts`, () => {});
          col.onSave(row, isNew);
        }}
        onDelete={col.onDelete}
      />
    </Page>
  );
}

export function Projects() {
  const { data, year } = useApp();
  const col = useCollection('projects', 'Project');
  const f = useRecruiterFilter();
  return (
    <Page title="Projects & Improvements" sub={`${year} improvement projects; evidence feeds the Projects growth rating`}>
      <RecordTable<Project>
        title="Projects"
        filter={f.el}
        rows={data.projects.filter((p) => f.match(p) && p.year === year)}
        readOnly={col.readOnly}
        cols={[
          { key: 'recruiterId', label: 'Owner', type: 'recruiter', required: true },
          { key: 'title', label: 'Project', type: 'text', required: true },
          { key: 'status', label: 'Status', type: 'select', options: ['planned', 'in-progress', 'completed', 'dropped'] },
          { key: 'objective', label: 'Objective', type: 'long' },
          { key: 'outcome', label: 'Outcome / evidence', type: 'long' },
        ]}
        blank={() => ({ id: uid('P'), recruiterId: f.rid, year, title: '', objective: '', status: 'planned', outcome: '' })}
        onSave={col.onSave}
        onDelete={col.onDelete}
      />
    </Page>
  );
}

export function TrainingScreen() {
  const { data, year } = useApp();
  const col = useCollection('training', 'Training');
  const f = useRecruiterFilter();
  return (
    <Page title="Training & Development" sub="Attendance is not proof of improvement — record how the learning was applied.">
      <RecordTable<Training>
        title="Training records"
        filter={f.el}
        rows={data.training.filter((t) => f.match(t) && t.year === year)}
        readOnly={col.readOnly}
        cols={[
          { key: 'recruiterId', label: 'Recruiter', type: 'recruiter', required: true },
          { key: 'programme', label: 'Programme', type: 'text', required: true },
          { key: 'provider', label: 'Provider', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: ['planned', 'in-progress', 'completed'] },
          { key: 'startDate', label: 'Start', type: 'date' },
          { key: 'completionDate', label: 'Completed', type: 'date' },
          { key: 'applicationEvidence', label: 'Applied on the job (evidence)', type: 'long' },
        ]}
        blank={() => ({ id: uid('T'), recruiterId: f.rid, year, programme: '', provider: '', startDate: null, completionDate: null, status: 'planned', applicationEvidence: '' })}
        onSave={col.onSave}
        onDelete={col.onDelete}
      />
    </Page>
  );
}

export function FeedbackScreen() {
  const { data } = useApp();
  const col = useCollection('feedback', 'Feedback');
  const f = useRecruiterFilter();
  return (
    <Page title="Stakeholder Feedback" sub="Feedback from hiring managers, HRBPs and you. Stored only on this computer.">
      <RecordTable<Feedback>
        title="Feedback log"
        filter={f.el}
        rows={data.feedback.filter(f.match).sort((a, b) => (a.date < b.date ? 1 : -1))}
        readOnly={col.readOnly}
        cols={[
          { key: 'recruiterId', label: 'About', type: 'recruiter', required: true },
          { key: 'date', label: 'Date', type: 'date', required: true },
          { key: 'source', label: 'From (role)', type: 'text', required: true },
          { key: 'rating', label: 'Rating (1–10)', type: 'number', min: 1, max: 10 },
          { key: 'comment', label: 'Feedback', type: 'long' },
        ]}
        blank={() => ({ id: uid('F'), recruiterId: f.rid, date: todayISO(), source: '', rating: null, comment: '' })}
        onSave={col.onSave}
        onDelete={col.onDelete}
      />
    </Page>
  );
}
