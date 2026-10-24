const pptxgen = require('pptxgenjs');
const { applyTheme } = require('/root/.claude/skills/synced/7ee1edca-3bd2-48ab-acc6-cb9cc2342f80_4e2a0d06-c023-48a3-b709-26ce7d8ba092/pptx/scripts/apply_theme.js');
const OUT = process.argv[2] || 'India_TA_Self_Review_2026_Template.pptx';

const THEME = { name: 'TA Self Review', headFontFace: 'Cambria', bodyFontFace: 'Calibri',
  colors: { dk1: '1B2333', lt1: 'FFFFFF', dk2: '1E2761', lt2: 'F3F1EA', accent1: '1E2761', accent2: '2A7F8F', accent3: 'C9A227', accent4: 'FFF6D6', accent5: '6B7280', accent6: 'B4483C', hlink: '2A7F8F', folHlink: '6B7280' } };
const HEX = { navy: '1E2761', teal: '2A7F8F', gold: 'C9A227', fill: 'FFF6D6', ink: '1B2333', grey: '6B7280', line: 'C9CED8', label: 'EEF0F5', white: 'FFFFFF' };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = 'India TA Self-Review 2026: submission template';
pres.author = 'India TA';
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: 'COVER', background: { color: HEX.navy },
  objects: [
    { rect: { x: 0.6, y: 2.2, w: 0.08, h: 2.4, fill: { color: HEX.gold } } },
    { placeholder: { options: { name: 'title', type: 'title', x: 0.9, y: 2.1, w: 11.5, h: 1.5, fontSize: 40, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.9, y: 3.7, w: 11.5, h: 1.2, fontSize: 18, color: C.background1, valign: 'top', margin: 0 }, text: '' } },
  ] });
pres.defineSlideMaster({ title: 'DIVIDER', background: { color: HEX.teal },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.9, y: 2.6, w: 11.5, h: 1.2, fontSize: 36, bold: true, color: C.background1, align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.9, y: 3.9, w: 11.5, h: 1.2, fontSize: 16, color: C.background1, valign: 'top', margin: 0 }, text: '' } },
  ] });
pres.defineSlideMaster({ title: 'FORM', background: { color: HEX.white }, margin: [0.5, 0.5, 0.6, 0.5],
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 10.6, h: 0.6, fontSize: 24, bold: true, color: C.text2, margin: 0, valign: 'middle', align: 'left' }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.5, y: 0.92, w: 12.3, h: 0.4, fontSize: 12, color: C.accent5, margin: 0, valign: 'top' }, text: '' } },
    { line: { x: 0.5, y: 6.95, w: 12.33, h: 0, line: { color: HEX.line, width: 0.75 } } },
    { text: { text: 'India TA Self-Review 2026  ·  Please keep slide titles, form codes and grey labels unchanged; type only in the yellow cells', options: { x: 0.5, y: 7.0, w: 10.5, h: 0.3, fontSize: 9, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.0, w: 0.5, h: 0.3, fontSize: 9, color: HEX.grey, align: 'right' } });

const hint = t => ({ text: t, options: { italic: true, color: HEX.grey } });
const H = t => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: HEX.navy } } });
const L = t => ({ text: t, options: { bold: true, color: HEX.ink, fill: { color: HEX.label } } });
const F = (t = '') => ({ text: t, options: { italic: true, color: HEX.grey, fill: { color: HEX.fill } } });

let section = null;
function sec(title) { section = title; pres.addSection({ title }); }
function form(code, title, sub, who) {
  const s = pres.addSlide({ masterName: 'FORM', sectionTitle: section });
  s.addText(title, { placeholder: 'title' });
  s.addText(sub, { placeholder: 'body' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.3, y: 0.38, w: 1.53, h: 0.44, rectRadius: 0.08, fill: { color: HEX.navy }, line: { color: HEX.navy }, objectName: 'form-code' });
  s.addText(code, { x: 11.3, y: 0.38, w: 1.53, h: 0.44, fontSize: 13, bold: true, color: HEX.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'form-code-text' });
  if (who) s.addText(who, { x: 9.0, y: 0.92, w: 3.83, h: 0.3, fontSize: 10, bold: true, color: HEX.teal, align: 'right', margin: 0, isTextBox: true, objectName: 'audience' });
  return s;
}
function table(s, rows, o) {
  s.addTable(rows, { x: o.x ?? 0.5, y: o.y ?? 1.45, w: o.w ?? 12.33, colW: o.colW, rowH: typeof o.rowH === 'number' ? [0.42, ...rows.slice(1).map(() => o.rowH)] : o.rowH, fontSize: o.fs ?? 11, valign: 'middle', border: { type: 'solid', pt: 0.75, color: HEX.line }, margin: 0.06, objectName: o.name });
}
function para(s, items, o) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: o.num ? { type: 'number' } : true, breakLine: i < items.length - 1 } })),
    { x: o.x, y: o.y, w: o.w, h: o.h, fontSize: o.fs ?? 13, color: HEX.ink, valign: 'top', paraSpaceAfter: 6, margin: 0.05, isTextBox: true, objectName: o.name });
}
const WHO_ALL = 'Everyone', WHO_HIRE = 'Recruiters, sourcers and team leads', WHO_LEAD = 'Team leads only', WHO_OPS = 'Support / operations only';

/* ---------- Cover ---------- */
sec('Start here');
let s = pres.addSlide({ masterName: 'COVER', sectionTitle: section });
s.addText('India TA Self-Review 2026', { placeholder: 'title' });
s.addText([{ text: 'Submission template for recruiters, sourcers, team leads and support roles', options: { breakLine: true } }, { text: 'Fill in, save as  Name_VCNID_SelfReview2026.pptx  and send to the TA Head', options: { color: HEX.gold } }], { placeholder: 'body' });
s.addText('Return by: ____________', { x: 0.9, y: 5.6, w: 6, h: 0.4, fontSize: 14, color: HEX.white, margin: 0, isTextBox: true, objectName: 'return-by' });

/* ---------- Instructions ---------- */
s = form('A1', 'How to complete this template', 'About 60–90 minutes. Be specific: numbers, names of programmes, dates and examples.', WHO_ALL);
para(s, [
  'Type only in the yellow cells. Replace the grey example text; delete it if a cell does not apply.',
  'Do not rename slides, change the form codes (top right) or edit the grey labels: your answers are read back by form code and label.',
  'Add rows only by copying an existing yellow row. If you need more space, duplicate the slide and keep its code.',
  'Ratings are whole numbers 1 to 5. Dates as DD-MM-YYYY. Percentages as numbers (for example 92).',
  'Skip the slides that are not for your role (see the table), but do not delete them.',
  'Hiring numbers you report are a cross-check: they are reconciled with SuccessFactors and the scorecard, not used in place of them.',
  'Save as Name_VCNID_SelfReview2026.pptx and send it to the TA Head by the return date.',
], { x: 0.5, y: 1.45, w: 6.6, h: 5.3, num: true, fs: 13, name: 'instructions' });
const Y = '✓', N_ = '—';
table(s, [
  [H('Form'), H('Slide'), H('Recruiter / sourcer'), H('Team lead'), H('Support')],
  ...[['S1', 'Profile', Y, Y, Y], ['S2', 'Hiring delivery', Y, Y, N_], ['S3', 'Hiring quality and notable hires', Y, Y, N_], ['S4', 'University relations and pipeline', Y, Y, 'if any'], ['S5', 'Projects', Y, Y, Y], ['S6', 'Learning', Y, Y, Y], ['S7', 'Behaviours (recruiter, sourcer)', Y, N_, N_], ['S7L', 'Behaviours (team lead)', N_, Y, N_], ['S7O', 'Behaviours (support)', N_, N_, Y], ['S8', 'Achievements and support', Y, Y, Y], ['S9', 'Development plan 2027', Y, Y, Y], ['S10', 'Career and promotion', Y, Y, Y], ['S11', 'Points system feedback', Y, Y, 'optional'], ['L1–L2', 'Team and leadership', N_, Y, N_], ['O1–O2', 'KPI and SLA', N_, N_, Y], ['Z1', 'Sign-off', Y, Y, Y]]
    .map(r => [L(r[0]), r[1], r[2], r[3], r[4]].map((c, i) => i ? { text: c, options: { align: i > 1 ? 'center' : 'left' } } : c)),
], { x: 7.4, y: 1.45, w: 5.43, colW: [0.75, 2.38, 0.9, 0.7, 0.7], fs: 10, name: 'role-map' });

/* ---------- S1 Profile ---------- */
sec('Everyone');
s = form('S1', 'Profile', 'Who you are and what you cover. Used to match your submission to your dashboard record.', WHO_ALL);
const prof = [['Name', 'As in SuccessFactors'], ['VCNID', 'For example A123456'], ['Role', 'Recruiter / Sourcer / Team Lead / Support / Operations'], ['Team', 'DTO+ / TTI / VCE + Leadership / GTP / Operations'], ['Reporting lead', ''], ['Level (SG)', 'For example SG6'], ['In current role since', 'DD-MM-YYYY'], ['Business areas and hiring managers you serve', 'Main business areas, sites and key hiring managers'], ['P4P rating 2024', 'Exceptional / High / Good / Adequate / Low'], ['P4P rating 2025', 'Exceptional / High / Good / Adequate / Low']];
table(s, [[H('Field'), H('Your entry')], ...prof.map(([a, b]) => [L(a), F(b)])], { colW: [3.6, 8.73], rowH: 0.44, fs: 12, name: 'profile' });

/* ---------- S2 Delivery ---------- */
s = form('S2', 'Hiring delivery 2026', 'Offers and joiners by category, 1 Jan 2026 to the date below. Reconciled with SuccessFactors.', WHO_HIRE);
const cats = ['Lateral SG1-SG4', 'Lateral SG5-SG8', 'SG9 and above', 'FTC (new hire)', 'FTC Conversion', 'Contract Conversion', 'NATS Hiring', 'NATS Conversion', 'ExcelHER', 'ExcelHER Conversion', 'GET / PGET', 'AICTE Professor', 'PhD Internship', 'Internship', 'Other (name it)'];
table(s, [[H('Category'), H('Offers'), H('Joined'), H('Of which women (offers)'), H('Open positions now'), H('Comment')],
  ...cats.map(c => [L(c), F(), F(), F(), F(), F()])], { y: 1.45, colW: [2.6, 1.1, 1.1, 1.6, 1.5, 4.43], rowH: 0.3, fs: 10, name: 'delivery' });
s.addText([{ text: 'Data up to (date): ', options: { bold: true, color: HEX.ink } }, { text: 'DD-MM-YYYY', options: { italic: true, color: HEX.grey, highlight: 'FFF6D6' } }], { x: 0.5, y: 6.5, w: 6, h: 0.35, fontSize: 11, margin: 0, isTextBox: true, objectName: 'asof' });

/* ---------- S3 Quality ---------- */
s = form('S3', 'Hiring quality and notable hires', 'Your own figures for 2026, then up to four hires you are proudest of.', WHO_HIRE);
const q = [['Average days requisition to offer', ''], ['Average days offer to joining', ''], ['Offer-to-join ratio (%)', ''], ['Hires through vendors (count)', ''], ['Hires through employee referrals (count)', ''], ['Offers declined or reneged (count)', 'and the main reasons']];
table(s, [[H('Measure'), H('Your figure')], ...q.map(([a, b]) => [L(a), F(b)])], { x: 0.5, w: 5.2, colW: [3.3, 1.9], rowH: 0.42, fs: 11, name: 'quality' });
table(s, [[H('Role hired'), H('Business area'), H('Why it mattered')],
  [F('For example Principal Engineer, SG9'), F(''), F('Niche skill, time pressure, diversity, stakeholder impact')], [F(), F(), F()], [F(), F(), F()], [F(), F(), F()]],
  { x: 6.0, w: 6.83, colW: [1.9, 1.5, 3.43], rowH: 0.62, fs: 11, name: 'notable-hires' });

/* ---------- S4 Programmes ---------- */
s = form('S4', 'University relations and talent pipeline', 'Programmes you ran or supported: NATS, ExcelHER, campus GET / PGET, interns, AICTE, PhD, campus ambassador, faculty programmes.', WHO_HIRE + '; support if any');
table(s, [[H('Programme'), H('Your role'), H('What you did'), H('Outcome (numbers)'), H('Status')],
  [F('For example ExcelHER 2026'), F('Owner / support'), F('Campus drives, assessments, onboarding'), F('Offers, joiners, colleges covered'), F('Completed / in progress')],
  ...Array.from({ length: 5 }, () => [F(), F(), F(), F(), F()])], { colW: [2.4, 1.6, 4.0, 2.6, 1.73], rowH: 0.7, fs: 11, name: 'programmes' });

/* ---------- S5 Projects ---------- */
s = form('S5', 'Projects and process improvement', 'Projects you own or contribute to. Pillar: Unleash Human Potential / People Experience / Data-Driven Insights / Sustainable Operational Excellence.', WHO_ALL);
table(s, [[H('Project'), H('Your role'), H('Pillar'), H('Status'), H('Problem or aim'), H('Metric: baseline → target → actual'), H('Done so far and what remains')],
  [F('Title'), F('Owner / contributor'), F(''), F('Not started / In progress / On track / Completed / On hold'), F(''), F('For example offer days 60 → 50 → 54'), F('')],
  [F(), F(), F(), F(), F(), F(), F()], [F(), F(), F(), F(), F(), F(), F()], [F(), F(), F(), F(), F(), F(), F()]],
  { colW: [1.8, 1.2, 1.5, 1.4, 2.0, 1.9, 2.53], rowH: 1.15, fs: 10, name: 'projects' });

/* ---------- S6 Learning ---------- */
s = form('S6', 'Learning and certifications', 'Courses taken in 2026 and planned for 2027, and how you used what you learned.', WHO_ALL);
table(s, [[H('Course or programme'), H('Provider'), H('Status'), H('Completed on'), H('Certificate'), H('How you applied it at work')],
  [F('Exact course name'), F('For example LinkedIn Learning, Coursera, internal'), F('Planned / In progress / Completed'), F('DD-MM-YYYY'), F('Yes / No'), F('One concrete example')],
  ...Array.from({ length: 5 }, () => [F(), F(), F(), F(), F(), F()])], { colW: [2.6, 1.9, 1.4, 1.2, 1.0, 4.23], rowH: 0.66, fs: 10.5, name: 'learning' });

/* ---------- S7 Behaviours (one version per role) ---------- */
function s7(code, title, who, comps) {
  const s = form(code, title, 'Rate yourself 1 to 5 on each behaviour and give one specific 2026 example as evidence.', who);
  table(s, [[H('Behaviour'), H('Self-rating (1–5)'), H('Evidence: situation, what you did, result')], ...comps.map(c => [L(c), { text: '', options: { align: 'center', fill: { color: HEX.fill } } }, F()])],
    { w: 9.4, colW: [2.5, 1.2, 5.7], rowH: 0.58, fs: 11, name: 'behaviours' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 10.15, y: 1.45, w: 2.68, h: 5.2, rectRadius: 0.1, fill: { color: HEX.label }, line: { color: HEX.label }, objectName: 'scale-card' });
  s.addText([
    { text: 'Rating guide', options: { bold: true, fontSize: 13, color: HEX.navy, breakLine: true } },
    { text: ' ', options: { fontSize: 6, breakLine: true } },
    ...[['5', 'Role model: others learn from you'], ['4', 'Strong: consistently above the role'], ['3', 'Fully meets the role'], ['2', 'Developing: sometimes meets'], ['1', 'Not yet shown']].flatMap(([n, t], i, a) => [
      { text: n + '  ', options: { bold: true, fontSize: 16, color: HEX.teal } }, { text: t, options: { fontSize: 11, color: HEX.ink, breakLine: true } }, { text: ' ', options: { fontSize: 8, breakLine: i < a.length - 1 } }]),
  ], { x: 10.3, y: 1.6, w: 2.4, h: 4.9, valign: 'top', margin: 0, isTextBox: true, objectName: 'scale' });
}
s7('S7', 'Behaviours self-rating: recruiters and sourcers', 'Recruiters and sourcers', ['Delivery Ownership', 'Stakeholder Management', 'Talent Advisory', 'Market Intelligence', 'Data & Analytics', 'Assessment Capability', 'Digital & AI Capability', 'Collaboration & Leadership']);
s7('S7L', 'Behaviours self-rating: team leads', WHO_LEAD, ['Team Delivery Ownership', 'Coaching & Developing Others', 'Stakeholder Management', 'Talent Advisory', 'Planning & Prioritisation', 'Data-Driven Decisions', 'Process Improvement & Change', 'Collaboration & Leadership']);
s7('S7O', 'Behaviours self-rating: support and operations', WHO_OPS, ['Accuracy & Attention to Detail', 'Timeliness & Reliability', 'Process & Compliance Discipline', 'Systems Capability', 'Data & Reporting', 'Stakeholder Service', 'Process Improvement', 'Digital & AI Capability']);

/* ---------- S8 Achievements ---------- */
s = form('S8', 'Achievements, challenges and support needed', 'Three to five points in each column. Be concrete.', WHO_ALL);
[['Top achievements 2026', 'What you delivered and the impact'], ['Challenges faced', 'What got in the way and how you handled it'], ['Support I need', 'From the TA Head, my lead, the business or tools']].forEach(([h, t], i) => {
  table(s, [[H(h)], [F(t)], [F()], [F()], [F()], [F()]], { x: 0.5 + i * 4.18, w: 3.97, colW: [3.97], rowH: [0.4, 0.95, 0.95, 0.95, 0.95, 0.95], fs: 11, name: 'col-' + (i + 1) });
});

/* ---------- S9 Plan ---------- */
s = form('S9', 'Development plan 2027', 'Three to five actions. Each needs a measure of success and a target date.', WHO_ALL);
table(s, [[H('Action'), H('Type'), H('Competency'), H('Measure of success'), H('Target date'), H('Support needed')],
  [F('For example lead the 2027 GET campus drive end to end'), F('Development action / Area for improvement'), F('One of the behaviours in your S7 slide'), F('For example 40 offers, 85% join rate'), F('DD-MM-YYYY'), F('')],
  ...Array.from({ length: 4 }, () => [F(), F(), F(), F(), F(), F()])], { colW: [3.2, 1.9, 1.7, 2.4, 1.2, 1.93], rowH: 0.82, fs: 10.5, name: 'plan' });

/* ---------- S10 Career ---------- */
s = form('S10', 'Career and promotion', 'Your view. The TA Head decides against the promotion criteria on the right.', WHO_ALL);
table(s, [[H('Question'), H('Your answer')], ...[['Role you aspire to next, and when', ''], ['Why you are ready, or what you still need', ''], ['Leadership evidence in 2026', 'Mentoring, leading a drive or project, standing in for your lead'], ['Mobility (other teams, locations, roles)', ''], ['Anything else for the TA Head', '']].map(([a, b]) => [L(a), F(b)])],
  { w: 8.4, colW: [2.9, 5.5], rowH: 0.95, fs: 11, name: 'career' });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.15, y: 1.45, w: 3.68, h: 5.2, rectRadius: 0.1, fill: { color: HEX.label }, line: { color: HEX.label }, objectName: 'criteria-card' });
s.addText([{ text: 'Promotion criteria', options: { bold: true, fontSize: 13, color: HEX.navy, breakLine: true } },
  ...['Last two P4P ratings High or above', 'Total review score 80% or more', 'Three or more behaviours rated 4 or above', 'Two or more years in the current role', 'Clear leadership evidence'].map((t, i, a) => ({ text: t, options: { bullet: true, fontSize: 12, color: HEX.ink, breakLine: i < a.length - 1 } }))],
  { x: 9.3, y: 1.6, w: 3.4, h: 4.9, valign: 'top', margin: 0, paraSpaceAfter: 8, isTextBox: true, objectName: 'criteria' });

/* ---------- S11 Points ---------- */
s = form('S11', 'Feedback on the points system', 'Your suggestions shape the 2027 version. Honest answers are welcome.', WHO_HIRE + '; support optional');
table(s, [[H('Question'), H('Your answer')], ...[['What works well in the points system', ''], ['What feels unfair or unclear', 'Name the category or rule'], ['Points you would change, and to what', 'For example SG9+ from 3 to 4, because ...'], ['Anything the system does not credit today', 'For example sourcing support, drives, stakeholder work'], ['Is the revised cadence target realistic for your team?', 'Yes / No, and why'], ['Other suggestions', '']].map(([a, b]) => [L(a), F(b)])],
  { colW: [4.0, 8.33], rowH: 0.8, fs: 11, name: 'points-feedback' });

/* ---------- Leads ---------- */
sec('Team leads');
s = pres.addSlide({ masterName: 'DIVIDER', sectionTitle: section });
s.addText('Team leads only', { placeholder: 'title' });
s.addText('Forms L1 and L2: your team results, your view of each recruiter, and your own leadership. Recruiters and support roles skip to Z1.', { placeholder: 'body' });

s = form('L1', 'Team results and recruiter view', 'One row per team member. Your honest view helps plan coaching and support for 2027.', WHO_LEAD);
table(s, [[H('Team member'), H('Offers'), H('Joined'), H('Strengths'), H('Focus area for 2027'), H('What you will do to develop them'), H('Ready for more?')],
  [F('Name'), F(), F(), F(''), F(''), F('Coaching, stretch requisitions, training'), F('Yes / Not yet')],
  ...Array.from({ length: 5 }, () => [F(), F(), F(), F(), F(), F(), F()])], { colW: [1.7, 0.8, 0.8, 2.4, 2.3, 3.03, 1.3], rowH: 0.7, fs: 10.5, name: 'team' });

s = form('L2', 'Leadership, coaching and succession', 'Your own leadership in 2026 and your plan for 2027.', WHO_LEAD);
table(s, [[H('Question'), H('Your answer')], ...[['Team result vs target, and the main reasons', ''], ['Coaching done in 2026', 'Number of 1:1s, case reviews, joint calls; with whom'], ['Hiring-manager and business feedback', 'Forums, escalations, wins'], ['Risks in your team', 'Attrition, workload, skill gaps, single points of failure'], ['Succession and backup', 'Who can cover you, who covers whom'], ['Your own development as a lead in 2027', 'Two or three actions with dates (also add them to S9)']].map(([a, b]) => [L(a), F(b)])],
  { colW: [3.6, 8.73], rowH: 0.8, fs: 11, name: 'leadership' });

/* ---------- Support ---------- */
sec('Support roles');
s = pres.addSlide({ masterName: 'DIVIDER', sectionTitle: section });
s.addText('Support and operations only', { placeholder: 'title' });
s.addText('Forms O1 and O2: self-assessment against the four KPI and SLA pillars, and your monthly volumes. Others skip to Z1.', { placeholder: 'body' });

s = form('O1', 'KPI and SLA self-assessment', 'Rate each pillar 1 to 5 against the scorecard bands, with the numbers that support it.', WHO_OPS);
const pil = [['Timely completion', 'Share of activities within SLA; monthly deadlines and project milestones', 'For example 96% of reports by WD 3'], ['Error-free operations', 'Data and billing accuracy, report corrections, billing disputes, payroll errors, audit findings', 'For example 2 billing corrections in 10 months'], ['Activity volume and throughput', 'Monthly counts against expected volume; improvements completed; SOPs maintained', 'For example 120 BGV cases a month; 3 SOPs updated'], ['Stakeholder and candidate experience', 'Recruiter and hiring-manager feedback; vendor and finance feedback; joiner feedback', 'Feedback received, with names or survey scores']];
table(s, [[H('Pillar'), H('What is measured'), H('Self-rating (1–5)'), H('Evidence (numbers, examples)')], ...pil.map(([a, b, c]) => [L(a), { text: b, options: { fontSize: 10, color: HEX.grey } }, { text: '', options: { fill: { color: HEX.fill } } }, F(c)]),
  [L('Compliance breach in 2026?'), { text: 'Any data-privacy, BGV or payroll compliance breach', options: { fontSize: 10, color: HEX.grey } }, F('Yes / No'), F('If yes, what happened and what changed')]],
  { colW: [2.6, 4.0, 1.3, 4.43], rowH: 0.9, fs: 11, name: 'pillars' });

s = form('O2', 'Monthly volumes and improvements', 'Typical monthly volume for each activity you own, and what you improved in 2026.', WHO_OPS);
table(s, [[H('Activity'), H('Average per month'), H('Within SLA (%)'), H('Errors or corrections in 2026'), H('Improvement made in 2026')],
  [F('For example BGV initiation, offer letters, vendor billing, payroll inputs, TA report'), F(), F(), F(), F('')],
  ...Array.from({ length: 6 }, () => [F(), F(), F(), F(), F()])], { colW: [3.3, 1.5, 1.4, 2.0, 4.13], rowH: 0.62, fs: 10.5, name: 'volumes' });

/* ---------- Sign-off ---------- */
sec('Sign-off');
s = form('Z1', 'Sign-off', 'Confirm the submission is your own and accurate to the best of your knowledge.', WHO_ALL);
table(s, [[H('Field'), H('Entry')], ...[['Name', ''], ['VCNID', ''], ['Date submitted', 'DD-MM-YYYY'], ['Reviewed with my lead (recruiters)', 'Yes / No, and the date'], ['I confirm the information is accurate', 'Type your name']].map(([a, b]) => [L(a), F(b)])],
  { w: 8.0, colW: [3.4, 4.6], rowH: 0.55, fs: 12, name: 'signoff' });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.9, y: 1.45, w: 3.93, h: 3.3, rectRadius: 0.1, fill: { color: HEX.navy }, line: { color: HEX.navy }, objectName: 'send-card' });
s.addText([{ text: 'Before you send', options: { bold: true, fontSize: 14, color: HEX.gold, breakLine: true } },
  ...['File name: Name_VCNID_SelfReview2026.pptx', 'All yellow cells for your role filled or cleared', 'Ratings are whole numbers 1–5', 'Send to the TA Head by the return date'].map((t, i, a) => ({ text: t, options: { bullet: true, fontSize: 12, color: HEX.white, breakLine: i < a.length - 1 } }))],
  { x: 9.1, y: 1.6, w: 3.6, h: 3.0, valign: 'top', margin: 0, paraSpaceAfter: 8, isTextBox: true, objectName: 'send-list' });

(async () => { await pres.writeFile({ fileName: OUT }); await applyTheme(OUT, THEME); console.log('wrote', OUT); })();
