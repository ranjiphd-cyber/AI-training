/* Sample data and configuration for the prototype.
   Every person, number and comment here is FICTIONAL. Rule values marked
   status:'pending' are placeholders awaiting stakeholder decisions (see SYSTEM_DESIGN.md §8). */

const PERIOD = { label: '2026 (Jan–Dec)', start: '2026-01-01', end: '2026-12-31', cutoff: '2026-10-16', year: 2026 };

// Sample company holidays (D-09: one India calendar vs location calendars is undecided).
const HOLIDAYS = [
  ['2026-01-26', 'Republic Day'], ['2026-03-04', 'Holi'], ['2026-04-03', 'Good Friday'],
  ['2026-05-01', 'Labour Day'], ['2026-10-02', 'Gandhi Jayanti'], ['2026-11-09', 'Diwali (observed)'],
  ['2026-12-25', 'Christmas'],
];

// Default TA teams (who a person reports into) and the business areas each team serves.
// The business area drives the offer cadence target (SYSTEM_DESIGN.md D-14).
// Teams are editable per workspace (state.teams); these are only the starting set.
const DEFAULT_TEAMS = {
  TTI:   { name: 'TTI', areas: ['GTP', 'GTO', 'GTT'] },
  DTOP:  { name: 'DTO+', areas: ['DTO', 'FCA', 'Penta', 'VFS'] },
  URECH: { name: 'University Relations & Early Careers', short: 'UR & Early Careers', areas: ['Early Careers'] },
  VCELH: { name: 'VCE + Leadership Hiring', short: 'VCE + Leadership', areas: ['VCE', 'Leadership Hiring'] },
};
// Roles map a person to a scorecard template:
//   recruiter = hiring deliverables 70 + projects 15 + competency 15
//   lead      = team goal + own delivery at a share of the area target (TL model, D-21)
//   support   = no hiring deliverables; projects + competency only until a template is agreed (D-47)
// share = fraction of the business-area offer target that applies to the role (pending D-20 / D-48).
const DEFAULT_ROLES = {
  IC:  { name: 'Recruiter', template: 'recruiter', share: 1 },
  TL:  { name: 'Team Lead', template: 'lead', share: 0.5 },
  SRC: { name: 'Sourcer', template: 'recruiter', share: 1 },
  SUP: { name: 'Support / Operations', template: 'support', share: 0 },
};
const ROLE_TEMPLATES = { recruiter: 'Recruiter scorecard', lead: 'Team Lead scorecard', support: 'Support role (no hiring targets)' };

// Offers per 10 working days. status 'brd' = stated in BRD §5.1; 'placeholder' = not in BRD (D-15).
const AREAS = {
  'GTP': { target: 5, status: 'brd' }, 'GTO': { target: 4, status: 'brd' }, 'GTT': { target: 4, status: 'brd' },
  'DTO': { target: 5, status: 'brd' }, 'FCA': { target: 5, status: 'brd' }, 'VFS': { target: 4, status: 'brd' },
  'Penta': { target: 4, status: 'placeholder' }, 'VCE': { target: 4, status: 'brd' },
  'Early Careers': { target: 6, status: 'placeholder' }, 'Leadership Hiring': { target: 1, status: 'placeholder' },
};

const COMPETENCIES = [
  'Delivery Ownership', 'Stakeholder Management', 'Talent Advisory', 'Market Intelligence',
  'Data & Analytics', 'Assessment Capability', 'Digital & AI Capability', 'Collaboration & Leadership',
];
const COMP_SHORT = ['Delivery', 'Stakeholder', 'Advisory', 'Market Intel', 'Data', 'Assessment', 'Digital & AI', 'Collab & Lead'];

const LEVEL_ANCHORS = {
  1: 'Basic / Reactive', 2: 'Developing', 3: 'Effective', 4: 'Advanced / Talent Partner', 5: 'Strategic Advisor',
};

// D-28: corporate rating scale not specified. Placeholder labels.
const RATING_SCALE = ['Outstanding', 'Exceeds', 'Meets', 'Partially Meets', 'Below'];
const RATING_VALUE = { 'Outstanding': 5, 'Exceeds': 4, 'Meets': 3, 'Partially Meets': 2, 'Below': 1 };
// D-30: job-level framework not specified. Placeholder list.
const JOB_LEVELS = ['L1 - Recruiter', 'L2 - Senior Recruiter', 'L3 - Lead Recruiter', 'L4 - TA Lead', 'L5 - TA Manager'];

/* Hiring point rules. The BRD has two conflicting tables (D-01). */
const POINT_TABLES = {
  S53: { label: 'BRD §5.3 (detailed rules)', rows: {
    'GET / PGET': [1, true], 'NATS Hiring': [1, true], 'NATS Conversion': [1, false], 'Contract Conversion': [1, false],
    'FTC': [1, true], 'ExcelHER': [2, true], 'PMIS': [1, true], 'Lateral SG1-SG4': [1, true], 'Lateral SG5-SG8': [2, true],
    'SG9 and above': [3, true], 'PhD Internship': [2, false], 'AICTE Professor': [2, false] } },
  A3: { label: 'BRD Appendix A3', rows: {
    'GET / PGET': [1, true], 'NATS Hiring': [1, true], 'NATS Conversion': [1, true], 'Contract Conversion': [1, true],
    'FTC': [1, true], 'ExcelHER': [1, true], 'PMIS': [1, true], 'Lateral SG1-SG4': [1, true], 'Lateral SG5-SG8': [1.5, true],
    'SG9 and above': [3, true], 'PhD Internship': [2, true], 'AICTE Professor': [2, false] } },
};
const CATEGORIES = Object.keys(POINT_TABLES.S53.rows);
const SG_REQUIRED = ['Lateral SG1-SG4', 'Lateral SG5-SG8', 'SG9 and above'];

const DEFAULT_RULES = {
  version: 'R-2026.1-draft',
  pointsTable: 'S53',
  offerFormula: 'O1',
  gate: { g: 0.7, c: 0.6 },
  tlModel: 'TL-A',
  tlTargetShare: 0.5,
  jrBands: [[90, 15], [85, 13], [80, 11], [75, 8], [0, 5]],
  ctBands: { strong: 45, acceptable: 55 },
  vendorBands: { low: 10, high: 20 },
  vendorExcluded: ['NATS Conversion', 'Contract Conversion'],
  repeatMissN: 2, stalledDays: 45, belowTargetBy: 1, gapThreshold: 1, jrException: 85,
  // Decision status per rule (D-numbers from SYSTEM_DESIGN.md §8)
  status: {
    pointsTable: ['pending', 'D-01'], offerFormula: ['pending', 'D-02'], gate: ['pending', 'D-03'],
    tlModel: ['pending', 'D-21'], tlTargetShare: ['pending', 'D-20'], jrBands: ['pending', 'D-05'],
    ctBands: ['brd', 'BRD §5.6'], vendorBands: ['brd', 'BRD §5.7'], vendorExcluded: ['pending', 'D-11'],
    repeatMissN: ['pending', 'D-16'], stalledDays: ['pending', 'D-17'], belowTargetBy: ['pending', 'D-18'],
    gapThreshold: ['pending', 'D-19'], jrException: ['pending', 'D-05'], targets: ['pending', 'D-15'], tlTeamGoal: ['pending', 'D-23'],
  },
};

/* People. profile: vol = volume factor vs target, jr = joining probability, ct = mean cycle days,
   vend = vendor probability, cx = complexity bias. */
const EMPLOYEES = [
  { id: 'E1001', name: 'Ananya Rao',       team: 'DTOP',  area: 'DTO',   type: 'TL', level: 'L4 - TA Lead',          since: '2023-04-01', ratings: ['Exceeds', 'Exceeds', 'Meets'],         p: { vol: 1.10, jr: .91, ct: 41, vend: .06, cx: .5 } },
  { id: 'E1002', name: 'Rohan Kulkarni',   team: 'DTOP',  area: 'DTO',   type: 'IC', level: 'L2 - Senior Recruiter', since: '2023-07-01', ratings: ['Outstanding', 'Exceeds', 'Exceeds'],   p: { vol: 1.08, jr: .92, ct: 39, vend: .05, cx: .45 } },
  { id: 'E1003', name: 'Meera Iyer',       team: 'DTOP',  area: 'FCA',   type: 'IC', level: 'L2 - Senior Recruiter', since: '2024-04-01', ratings: ['Meets', 'Meets', 'Exceeds'],          p: { vol: .93, jr: .86, ct: 47, vend: .12, cx: .3 }, leave: ['2026-06-01', '2026-06-19', 'Approved extended leave'] },
  { id: 'E1004', name: 'Karthik Menon',    team: 'DTOP',  area: 'VFS',   type: 'IC', level: 'L1 - Recruiter',        since: '2025-01-06', ratings: ['Meets', null, null],                    p: { vol: .74, jr: .78, ct: 58, vend: .24, cx: .15 } },
  { id: 'E1005', name: 'Neha Gupta',       team: 'DTOP',  area: 'Penta', type: 'IC', level: 'L2 - Senior Recruiter', since: '2024-01-01', ratings: ['Exceeds', 'Meets', 'Meets'],          p: { vol: .97, jr: .88, ct: 45, vend: .10, cx: .35 } },
  { id: 'E1020', name: 'Kavya Reddy',      team: 'TTI',   area: 'GTP',   type: 'TL', level: 'L4 - TA Lead',          since: '2024-04-01', ratings: ['Exceeds', 'Meets', 'Meets'],           p: { vol: 1.0, jr: .89, ct: 44, vend: .08, cx: .35 } },
  { id: 'E1021', name: 'Nikhil Joshi',     team: 'TTI',   area: 'GTT',   type: 'IC', level: 'L2 - Senior Recruiter', since: '2022-10-01', ratings: ['Exceeds', 'Exceeds', 'Meets'],         p: { vol: 1.0, jr: .90, ct: 43, vend: .07, cx: .4 } },
  { id: 'E1022', name: 'Farah Khan',       team: 'TTI',   area: 'GTO',   type: 'IC', level: 'L1 - Recruiter',        since: '2024-01-01', ratings: ['Meets', 'Meets', null],                 p: { vol: .88, jr: .84, ct: 50, vend: .14, cx: .25 } },
  { id: 'E1030', name: 'Deepa Krishnan',   team: 'URECH', area: 'Early Careers', type: 'TL', level: 'L4 - TA Lead',  since: '2021-04-01', ratings: ['Outstanding', 'Exceeds', 'Exceeds'],   p: { vol: 1.05, jr: .87, ct: 31, vend: .02, cx: .5 } },
  { id: 'E1031', name: 'Aditya Verma',     team: 'URECH', area: 'Early Careers', type: 'IC', level: 'L2 - Senior Recruiter', since: '2023-04-01', ratings: ['Exceeds', 'Meets', 'Meets'],   p: { vol: 1.02, jr: .85, ct: 29, vend: .03, cx: .4 } },
  { id: 'E1032', name: 'Ishita Banerjee',  team: 'URECH', area: 'Early Careers', type: 'IC', level: 'L1 - Recruiter', since: '2024-07-01', ratings: ['Meets', 'Meets', null],               p: { vol: .90, jr: .79, ct: 34, vend: .05, cx: .3 } },
  { id: 'E1033', name: 'Rahul Nair',       team: 'URECH', area: 'Early Careers', type: 'IC', level: 'L1 - Recruiter', since: '2026-04-01', ratings: [null, null, null],                     p: { vol: .85, jr: .83, ct: 33, vend: .04, cx: .3 }, start: '2026-04-01' },
  { id: 'E1010', name: 'Vikram Desai',     team: 'VCELH', area: 'VCE',   type: 'TL', level: 'L4 - TA Lead',          since: '2022-04-01', ratings: ['Meets', 'Exceeds', 'Exceeds'],         p: { vol: .95, jr: .88, ct: 46, vend: .09, cx: .4 } },
  { id: 'E1011', name: 'Sneha Pillai',     team: 'VCELH', area: 'VCE',   type: 'IC', level: 'L3 - Lead Recruiter',   since: '2023-10-01', ratings: ['Exceeds', 'Outstanding', 'Exceeds'],   p: { vol: 1.04, jr: .93, ct: 42, vend: .04, cx: .55 } },
  { id: 'E1012', name: 'Arjun Bhat',       team: 'VCELH', area: 'VCE',   type: 'IC', level: 'L1 - Recruiter',        since: '2024-07-01', ratings: ['Partially Meets', 'Meets', null],       p: { vol: .82, jr: .80, ct: 52, vend: .17, cx: .2 } },
  { id: 'E1040', name: 'Sanjay Mehta',     team: 'VCELH', area: 'Leadership Hiring', type: 'IC', level: 'L3 - Lead Recruiter', since: '2022-04-01', ratings: ['Exceeds', 'Meets', 'Exceeds'], p: { vol: 1.0, jr: .90, ct: 68, vend: .35, cx: .8 } },
  { id: 'E1041', name: 'Pooja Shah',       team: 'VCELH', area: 'Leadership Hiring', type: 'IC', level: 'L3 - Lead Recruiter', since: '2021-01-01', ratings: ['Exceeds', 'Exceeds', 'Outstanding'], p: { vol: 1.15, jr: .94, ct: 62, vend: .22, cx: .85 } },
];

const PROJECT_TITLES = [
  ['Reduce interview scheduling time', 'Interview scheduling takes 9 days on average, delaying offers.', 'Days to schedule', 9, 5],
  ['Improve offer-to-join conversion', 'Joining ratio for lateral hires dropped below 85% in two quarters.', 'Joining ratio %', 82, 90],
  ['Vendor dependency reduction', 'Vendor share of hires above 18% raises cost per hire.', 'Vendor %', 18, 10],
  ['Candidate experience survey loop', 'No structured candidate feedback after interviews.', 'Survey response %', 12, 40],
  ['Requisition intake quality', 'Re-work on unclear job specifications adds 6 days.', 'Re-opened reqs %', 22, 8],
  ['Campus offer acceptance', 'Campus offer acceptance varies widely by institute.', 'Acceptance %', 71, 85],
  ['Talent-market dashboard', 'Hiring managers lack salary and supply data at intake.', 'Intakes with market data %', 10, 70],
];
const DMAIC = ['Define', 'Measure', 'Analyse', 'Improve', 'Control'];

const LEARNING_LIB = [
  ['Power BI for HR Analytics', 'Internal Academy', 'E-learning', 'Data & Analytics', 'Built a requisition-ageing view used in weekly reviews'],
  ['Advanced BEI Interviewing', 'External provider', 'Classroom', 'Assessment Capability', 'Redesigned interview guide for two critical roles'],
  ['Six Sigma Yellow Belt', 'Quality Council', 'Certification', 'Collaboration & Leadership', 'Applied DMAIC to scheduling delay project'],
  ['Influencing Senior Stakeholders', 'Internal Academy', 'Workshop', 'Stakeholder Management', 'Used data story to reset unrealistic hiring timelines'],
  ['GenAI for Recruiters', 'Enterprise AI CoE', 'E-learning', 'Digital & AI Capability', null],
  ['Talent Market Intelligence', 'External provider', 'Webinar series', 'Market Intelligence', 'Shared quarterly talent-supply note with business'],
];

const IDP_LIBRARY = {
  'Data & Analytics':          ['Power BI / HR Analytics', 'PL-300 or HR Analytics certificate', 'Own a live TA dashboard for one business area', 'Show two decisions influenced by the dashboard'],
  'Stakeholder Management':    ['Storytelling, influencing and negotiation', '—', 'Lead senior hiring reviews for one quarter', 'Run intake meetings with data-backed recommendations'],
  'Assessment Capability':     ['Advanced BEI / assessment methodology', 'Assessment practitioner certification', 'Sit on calibration panels', 'Design a structured selection process for a critical role'],
  'Collaboration & Leadership':['Six Sigma Yellow / Green Belt', 'Six Sigma Green Belt', 'Lead a DMAIC project', 'Coach a new recruiter through first quarter'],
  'Digital & AI Capability':   ['GenAI / Agentic AI, Power Automate, responsible AI', 'Microsoft Power Automate certificate', 'Join TA automation squad', 'Build one production TA automation'],
  'Talent Advisory':           ['Workforce planning fundamentals', '—', 'Workforce planning exposure with one business', 'Present a talent review to business leadership'],
  'Market Intelligence':       ['Labour-market intelligence methods', '—', 'Competitive intelligence assignment', 'Publish a recurring talent-market report'],
  'Delivery Ownership':        ['Prioritisation and pipeline management', '—', 'Own recovery plan for an at-risk hiring plan', 'Reduce ageing requisitions in own portfolio'],
};
