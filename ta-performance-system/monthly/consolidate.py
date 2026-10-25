"""Validate and consolidate the monthly TA review input workbook.

Usage: python consolidate.py TA_Monthly_Input_YYYY-MM.xlsx OUT_DIR

Reads the input sheets (never the formula columns), checks every row, and writes:
  validation.md      row-level problems: errors block the consolidation, warnings do not
  consolidated.json  every metric the monthly review and the decks use
  summary.md         readable month summary; missing data shows as [To fill]
  reqReview.json     dashboard document settings/reqReview
  feedback.json      dashboard `feedback` collection, keyed by Feedback ID
People, teams and dropdown values come from the workbook's Lists sheet.
"""
import sys, os, json, datetime, statistics, collections
import openpyxl

FIRST = 5  # first data row; row 4 is the example row
IN_SCOPE = {'Lateral': 'Lateral', 'Campus intern conversion': 'Lateral', 'FTC': 'FTC', 'Conversion to employment': 'Conversion'}
STREAMS = ['Lateral', 'FTC', 'Conversion']
BANDS = ['<45', '45-60', '61-90', '91-150', '>150']
TOFILL = '[To fill]'

COLS = {
    '1_Offers': ['req', 'cand', 'recruiter', 'stream', 'convType', 'empType', 'bu', 'dept', 'sg', 'gender', 'source', 'vendor', 'hm', 'reqDate', 'stackDate', 'offerDate', 'expDoj', 'doj', 'status', 'declReason', 'notice', 'reloc', 'remarks'],
    '2_Open_Reqs': ['req', 'bu', 'dept', 'posType', 'stream', 'recruiter', 'hm', 'reqDate', 'sfStatus', 'positions', 'reopened', 'blocker', 'nextStep', 'nextDue', 'remarks'],
    '3_Joining_Pipeline': ['req', 'cand', 'recruiter', 'offerDate', 'expDoj', 'dojMoved', 'lastContact', 'reconfirmed', 'risk', 'preboard', 'bgv', 'notes'],
    '4_Programmes': ['programme', 'owner', 'responsible', 'target', 'joined', 'pending', 'targetSource', 'remarks'],
    '5_Monthly_Review': ['month', 'person', 'date', 'highlights', 'concerns', 'lastStatus', 'commitments', 'due', 'support', 'career', 'behaviour', 'comment'],
    '6_Business_Feedback': ['date', 'person', 'fromRole', 'fromName', 'bu', 'req', 'area', 'type', 'channel', 'details', 'feedback', 'action', 'owner', 'due', 'status', 'progress', 'progressDate'],
    '7_Support_KPIs': ['month', 'person', 'activity', 'volume', 'sla', 'withinSla', 'errors', 'escalations', 'survey', 'responses', 'notes'],
    '8_Projects': ['id', 'title', 'owner', 'pillar', 'status', 'stage', 'pct', 'plannedEnd', 'update', 'blocker', 'month'],
    '9_Learning': ['person', 'programme', 'provider', 'type', 'status', 'start', 'completed', 'certificate', 'goal', 'month'],
}
REQUIRED = {
    '1_Offers': ['recruiter', 'stream', 'empType', 'bu', 'gender', 'source', 'offerDate', 'status'],  # req and reqDate: in-scope streams only
    '2_Open_Reqs': ['req', 'bu', 'posType', 'stream', 'recruiter', 'reqDate', 'sfStatus'],
    '3_Joining_Pipeline': ['req', 'cand', 'recruiter', 'expDoj'],
    '4_Programmes': ['programme', 'target', 'joined'],
    '5_Monthly_Review': ['month', 'person'],
    '6_Business_Feedback': ['date', 'person', 'fromRole', 'area', 'type', 'feedback'],
    '7_Support_KPIs': ['month', 'person', 'activity', 'volume'],
    '8_Projects': ['id', 'title', 'owner', 'status', 'month'],
    '9_Learning': ['person', 'programme', 'status'],
}
DATES = {'reqDate', 'stackDate', 'offerDate', 'expDoj', 'doj', 'nextDue', 'offerDate', 'lastContact', 'date', 'due', 'progressDate', 'plannedEnd', 'start', 'completed'}
NUMS = {'notice', 'positions', 'dojMoved', 'target', 'joined', 'pending', 'volume', 'withinSla', 'errors', 'escalations', 'survey', 'responses', 'pct'}


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def as_date(v):
    if isinstance(v, datetime.datetime): return v.date()
    if isinstance(v, datetime.date): return v
    return None


class Issues:
    def __init__(self): self.rows = []
    def add(self, level, sheet, row, msg): self.rows.append((level, sheet, row, msg))
    def count(self, level): return sum(1 for r in self.rows if r[0] == level)


def read(wb, issues, lists):
    data = {}
    for sh, cols in COLS.items():
        if sh not in wb.sheetnames:
            issues.add('ERROR', sh, '-', 'sheet missing (do not rename sheets)'); data[sh] = []; continue
        ws, out = wb[sh], []
        for r in range(FIRST, ws.max_row + 1):
            vals = [clean(ws.cell(row=r, column=j + 1).value) for j in range(len(cols))]
            if not any(v is not None for v in vals): continue
            rec = dict(zip(cols, vals)); rec['_row'] = r
            for k in cols:
                v = rec[k]
                if v is None: continue
                if k in DATES:
                    d = as_date(v)
                    if d is None and isinstance(v, str):
                        for fm in ('%d-%m-%Y', '%d/%m/%Y', '%d-%b-%Y', '%d %b %Y', '%Y-%m-%d'):
                            try: d = datetime.datetime.strptime(v, fm).date(); break
                            except ValueError: pass
                        if d: issues.add('WARN', sh, r, f'{k}: text "{v}" read as {d:%d %b %Y}; please enter it as a date')
                    if d is None: issues.add('ERROR', sh, r, f'{k}: "{v}" is not a date'); rec[k] = None
                    else: rec[k] = d
                elif k in NUMS:
                    if isinstance(v, (int, float)): continue
                    try: rec[k] = float(str(v).replace(',', ''))
                    except ValueError: issues.add('ERROR', sh, r, f'{k}: "{v}" is not a number'); rec[k] = None
                elif not isinstance(v, str):
                    rec[k] = str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)
            for k in REQUIRED[sh]:
                if rec.get(k) in (None, ''): issues.add('ERROR', sh, r, f'required field "{k}" is empty')
            for k in ('recruiter', 'person', 'owner'):
                if k in rec and rec[k] and k != 'owner' and rec[k] not in lists['people']:
                    issues.add('ERROR', sh, r, f'"{rec[k]}" is not on the Lists sheet')
            out.append(rec)
        data[sh] = out
    return data


def load_lists(wb, issues):
    ws = wb['Lists']
    people = {}
    for r in range(3, ws.max_row + 1):
        name = clean(ws.cell(row=r, column=1).value)
        if not name: continue
        people[name] = dict(id=clean(ws.cell(row=r, column=2).value), role=clean(ws.cell(row=r, column=3).value), team=clean(ws.cell(row=r, column=4).value),
                            lead=clean(ws.cell(row=r, column=5).value) == 'Y', status=clean(ws.cell(row=r, column=6).value), inTeam=clean(ws.cell(row=r, column=7).value) == 'Y',
                            cadence=ws.cell(row=r, column=9).value, targetSG=sg_num(ws.cell(row=r, column=10).value))
    if not people: issues.add('ERROR', 'Lists', '-', 'no people listed')
    rules, settings = {}, {}
    if 'Points_Rules' in wb.sheetnames:
        pr = wb['Points_Rules']
        for r in range(4, pr.max_row + 1):
            k, v, b = clean(pr.cell(row=r, column=1).value), pr.cell(row=r, column=2).value, clean(pr.cell(row=r, column=3).value)
            if not k: continue
            if isinstance(v, (int, float)) and b in ('Y', 'N'): rules[k] = (float(v), b == 'Y')
            else: settings[k] = v
    else: issues.add('ERROR', 'Points_Rules', '-', 'sheet missing: points cannot be calculated')
    return {'people': people, 'rules': rules, 'women': float(settings.get('Women bonus (points)') or 0), 'decline': float(settings.get('Decline adjustment (points per declined offer)') or 0)}


def sg_num(v):
    v = clean(v)
    if v is None: return None
    if isinstance(v, (int, float)): return int(v)
    t = str(v).upper().replace(' ', '')
    for pre, add in (('SG', 0), ('JL', 2)):
        if t.startswith(pre):
            num = ''.join(ch for ch in t[2:] if ch.isdigit())
            if num: return int(num) + add
    return None


def category(x):
    st, sg = x['stream'], sg_num(x['sg'])
    band = lambda p: f'{p} SG1-SG3' if sg <= 3 else f'{p} SG4-SG7' if sg <= 7 else f'{p} SG8-SG9' if sg <= 9 else f'{p} SG10 and above'
    if st == 'Lateral': return band('Lateral') if sg else 'Lateral SG1-SG3', None if sg else 'grade missing: counted at the lowest lateral band'
    if st == 'FTC': return (band('FTC'), None) if sg else ('FTC (grade missing)', 'FTC grade missing: provisional points')
    if st == 'Internal (IJP)': return ('Internal (IJP) SG8 and above' if sg and sg >= 8 else 'Internal (IJP) up to SG7'), None
    return {'Conversion to employment': 'Conversion to employment', 'Campus intern conversion': 'Campus intern conversion', 'NATS': 'NATS', 'Campus / Fresher (GET/PGET)': 'GET / PGET',
            'ExcelHER': 'ExcelHER', 'AICTE / PhD': 'AICTE / PhD', 'Intern': 'Intern'}.get(st, st), None


# Attention thresholds (standing instruction): flags need at least MIN_N cases so one offer does not raise a flag.
TH = dict(declPct=10, ctMean=60, vendorPct=10, womenPct=25, slaPct=90, contactDays=7, minN=5)
RATING = [(130, 'Exceptional'), (110, 'High'), (95, 'Good'), (85, 'Adequate'), (0, 'Low')]
def rating(att): return None if att is None else next(l for t, l in RATING if att * 100 >= t)


def stats(rows):
    off = len(rows); j = [x for x in rows if x['status'] == 'Joined']; d = [x for x in rows if x['status'] == 'Declined']
    rv = [x for x in rows if x['status'] == 'Offer revoked']; pe = [x for x in rows if x['status'] == 'Offered']
    acc = [x for x in rows if x['status'] in ('Joined', 'Offered')]
    ct = [x['_ct'] for x in rows if x['status'] != 'Declined' and x['_ct'] is not None]
    pc = lambda a, b: round(100 * a / b, 1) if b else None
    return dict(offers=off, joined=len(j), declined=len(d), pending=len(pe), revoked=len(rv), declPct=pc(len(d), off),
                ctMean=round(statistics.mean(ct)) if ct else None, ctMedian=round(statistics.median(ct)) if ct else None, ctN=len(ct),
                vendorJoined=sum(x['source'] == 'Vendor' for x in j), vendorPctJoined=pc(sum(x['source'] == 'Vendor' for x in j), len(j)),
                referralJoined=sum(x['source'] == 'Employee referral' for x in j), referralPctJoined=pc(sum(x['source'] == 'Employee referral' for x in j), len(j)),
                womenAccepted=sum(x['gender'] == 'Female' for x in acc), accepted=len(acc), womenPctAccepted=pc(sum(x['gender'] == 'Female' for x in acc), len(acc)))


def report_xlsx(path, month, cut, reviewed, perf, streams, bands, att, reqs, prog, P):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    VB, G3, RED, REDT = '003057', 'D9DADC', 'F8D7D5', '9B2C2C'
    side = Side(style='thin', color='BFC1C4'); box = Border(left=side, right=side, top=side, bottom=side)
    wb = Workbook(); first = True
    def table(title, sub, head, rows, widths, red=lambda r: False):
        nonlocal first
        ws = wb.active if first else wb.create_sheet(); first = False; ws.title = title
        ws['A1'] = f'{title} · {month or ""} · data to {cut:%d %b %Y}'; ws['A1'].font = Font(name='Arial', bold=True, size=12, color=VB)
        ws['A2'] = sub; ws['A2'].font = Font(name='Arial', size=9, color='4D4F53')
        for j, h in enumerate(head, 1):
            c = ws.cell(row=4, column=j, value=h); c.font = Font(name='Arial', bold=True, size=9, color='FFFFFF'); c.fill = PatternFill('solid', fgColor=VB); c.alignment = Alignment(wrap_text=True, vertical='center'); c.border = box
            ws.column_dimensions[chr(64 + j)].width = widths[j - 1]
        for i, r in enumerate(rows):
            hot = red(r)
            for j, v in enumerate(r, 1):
                c = ws.cell(row=5 + i, column=j, value=v); c.font = Font(name='Arial', size=9, color=REDT if hot else '2B2D30'); c.border = box; c.alignment = Alignment(wrap_text=True, vertical='top')
                if hot: c.fill = PatternFill('solid', fgColor=RED)
                if isinstance(v, (int, float)) and head[j - 1].endswith('%'): c.number_format = '0%'
        ws.page_setup.orientation = 'landscape'; ws.sheet_properties.pageSetUpPr.fitToPage = True; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
        ws.freeze_panes = 'A5'; ws.auto_filter.ref = f'A4:{chr(64 + len(head))}{4 + max(1, len(rows))}'
    table('Attention', 'Areas requiring action, most severe first. Light red = High.', ['Severity', 'Person', 'Area', 'Detail', 'Action agreed', 'Owner', 'Due'],
          [[x['severity'], x['person'], x['area'], x['detail'], None, None, None] for x in att], [10, 18, 20, 70, 30, 14, 12], red=lambda r: r[0] == 'High')
    pp = lambda v: v if v is not None else TOFILL
    fr = lambda v: v / 100 if v is not None else TOFILL  # percentages are stored as fractions in the report
    table('Recruiters', 'Points vs pro-rated target (dashboard points model) and in-scope hiring quality. Leads: rating basis = average of own and team.',
          ['Person', 'Team', 'Points', 'Target to date', 'Own %', 'Team %', 'Rating basis %', 'Rating', 'Offers in scope', 'Joined', 'Pending', 'Decline %', 'Req→offer mean (d)', 'Req→offer median (d)', 'Vendor % of joiners', 'Referral % of joiners', 'Women % of accepted', 'Open reqs', 'Open >90 d', 'Open >150 d'],
          [[n, P[n]['team'], pp(perf[n]['points']), pp(perf[n]['targetToDate']), pp(perf[n]['ownAtt']), pp(perf[n]['teamAtt']) if P[n]['lead'] else '—', pp(perf[n]['ratingBasis']), perf[n]['rating'],
            streams[n]['All']['offers'], streams[n]['All']['joined'], streams[n]['All']['pending'], fr(streams[n]['All']['declPct']), pp(streams[n]['All']['ctMean']), pp(streams[n]['All']['ctMedian']),
            fr(streams[n]['All']['vendorPctJoined']), fr(streams[n]['All']['referralPctJoined']), fr(streams[n]['All']['womenPctAccepted']), sum(bands[n]['open'].values()), bands[n]['open']['91-150'] + bands[n]['open']['>150'], bands[n]['open']['>150']] for n in reviewed],
          [18, 14, 9, 10, 8, 8, 10, 11, 9, 8, 8, 9, 10, 10, 10, 10, 10, 8, 8, 8], red=lambda r: isinstance(r[6], float) and r[6] < 0.95)
    table('Requirements', 'Every open requisition and every offer not yet joined, by owner. Attention = over 90 days, at offer stage, high joining risk or no contact in 7 days.',
          ['Owner', 'Type', 'Req ID', 'Business unit', 'Age (days)', 'Status', 'Blocker / risk', 'Next step / last contact', 'Due / DOJ', 'Attention'],
          [[x['owner'], x['type'], x['req'], x['bu'], x['age'], x['status'], x['blocker'], x['nextStep'], x['due'], x['attention']] for x in sorted(reqs, key=lambda z: (z['owner'], z['type'], -(z['age'] or 0)))],
          [18, 18, 10, 22, 9, 26, 26, 28, 12, 9], red=lambda r: r[9] == 'Yes')
    table('Time_bound', 'Requirements with a time-bound target. Closed = joined at or above target.', ['Requirement', 'Owner', 'Target', 'Joined', 'Yet to join', 'Closed %', 'Status'],
          [[x['programme'], x['owner'], x['target'], x['joined'], x['pending'], x['pctClosed'] / 100 if isinstance(x['pctClosed'], int) else x['pctClosed'], x['status']] for x in prog], [24, 18, 9, 9, 10, 9, 12], red=lambda r: r[6] == 'Not closed')
    wb.save(path)


def band(d): return '<45' if d < 45 else '45-60' if d <= 60 else '61-90' if d <= 90 else '91-150' if d <= 150 else '>150'


def consolidate(path, out):
    os.makedirs(out, exist_ok=True)
    issues = Issues()
    wb = openpyxl.load_workbook(path, data_only=True)
    lists = load_lists(wb, issues)
    P = lists['people']
    cut = as_date(wb['README']['C4'].value) if 'README' in wb.sheetnames else None
    month = clean(wb['README']['C5'].value) if 'README' in wb.sheetnames else None
    if not cut: issues.add('ERROR', 'README', 'C4', 'cut-off date missing'); cut = datetime.date.today()
    y0 = datetime.date(cut.year, 1, 1)
    D = read(wb, issues, lists)

    # ---- offers
    offers = D['1_Offers']; seen = collections.Counter()
    for x in offers:
        r = x['_row']
        if x['reqDate'] and x['offerDate']:
            x['_ct'] = (x['offerDate'] - x['reqDate']).days
            if x['_ct'] < 0: issues.add('ERROR', '1_Offers', r, 'offer released before the requisition was approved'); x['_ct'] = None
            elif x['_ct'] > 400: issues.add('WARN', '1_Offers', r, f'requisition-to-offer {x["_ct"]} days (over 400); excluded from cycle time'); x['_ct'] = None
        else: x['_ct'] = None
        if x['status'] == 'Joined' and not x['doj']: issues.add('ERROR', '1_Offers', r, 'Joined without an actual DOJ')
        if x['status'] == 'Declined' and not x['declReason']: issues.add('WARN', '1_Offers', r, 'Declined without a reason')
        if x['source'] == 'Vendor' and not x['vendor']: issues.add('WARN', '1_Offers', r, 'Vendor source without a vendor name')
        if x['stream'] in ('Conversion to employment', 'Campus intern conversion') and not x['convType']: issues.add('WARN', '1_Offers', r, 'conversion without a conversion type')
        if x['offerDate'] and x['offerDate'] > cut: issues.add('ERROR', '1_Offers', r, 'offer date after the cut-off date')
        if x['doj'] and x['doj'] > cut and x['status'] == 'Joined': issues.add('ERROR', '1_Offers', r, 'joined with a DOJ after the cut-off date')
        key = (x['req'], x['cand']) if x['cand'] else None
        if key: seen[key] += 1
        x['_scope'] = IN_SCOPE.get(x['stream'])
        if x['_scope'] and (not x['req'] or not x['reqDate']): issues.add('ERROR', '1_Offers', r, 'Req ID and requisition approved date are required for Lateral, FTC and conversions')
        cat, note = category(x)
        if note and x['offerDate'] and x['offerDate'] >= datetime.date(cut.year, 1, 1): issues.add('WARN', '1_Offers', r, note)
        if cat not in lists['rules']: issues.add('ERROR', '1_Offers', r, f'no points rule for "{cat}"'); x['_pts'] = 0
        else:
            pts, wb_ = lists['rules'][cat]; x['_pts'] = pts + (lists['women'] if wb_ and x['gender'] == 'Female' else 0)
            if x['status'] == 'Declined': x['_pts'] += lists['decline']
        x['_cat'] = cat
    for (rq, cd), n in seen.items():
        if n > 1: issues.add('WARN', '1_Offers', '-', f'Req {rq} / candidate {cd} appears {n} times')

    # ---- groups: individuals (active recruiters and leads), teams (inTeam = Y), overall
    reviewed = [n for n, p in P.items() if p['status'] == 'Active' and p['role'] in ('Recruiter', 'Team Lead')]
    teams = collections.OrderedDict()
    for n, p in P.items():
        if p['inTeam'] and p['team']: teams.setdefault(p['team'], []).append(n)
    groups = collections.OrderedDict((n, [n]) for n in reviewed)
    for t, m in teams.items(): groups['Team ' + t] = m
    groups['Overall'] = sorted({n for m in teams.values() for n in m})

    yr = [x for x in offers if x['offerDate'] and y0 <= x['offerDate'] <= cut]
    streams = {g: {s: stats([x for x in yr if x['recruiter'] in m and x['_scope'] == s]) for s in STREAMS} | {'All': stats([x for x in yr if x['recruiter'] in m and x['_scope']])} for g, m in groups.items()}
    programme_offers = collections.Counter(x['stream'] for x in yr if not x['_scope'])

    # ---- points vs pro-rated target (dashboard points model)
    rd = wb['README'] if 'README' in wb.sheetnames else None
    el = rd['C6'].value if rd else None; yd = rd['C7'].value if rd else None
    if not isinstance(el, (int, float)) or not isinstance(yd, (int, float)) or not yd:
        issues.add('ERROR', 'README', 'C6', 'working days elapsed / in year missing: attainment cannot be calculated'); prorate = None
    else: prorate = el / yd
    lat_pts = lambda sg: lists['rules'].get('Lateral SG1-SG3' if sg <= 3 else 'Lateral SG4-SG7' if sg <= 7 else 'Lateral SG8-SG9' if sg <= 9 else 'Lateral SG10 and above', (0, 0))[0]
    points = {}
    for n in P:
        own = [x for x in yr if x['recruiter'] == n]
        if not own and not P[n]['cadence']: continue
        pts = round(sum(x['_pts'] for x in own), 2)
        cad, sg = P[n]['cadence'], P[n]['targetSG']
        full = cad * lat_pts(sg) * yd / 10 if isinstance(cad, (int, float)) and sg and isinstance(yd, (int, float)) else None
        pro = full * prorate if full is not None and prorate is not None else None
        mix = collections.Counter(x['_cat'] for x in own)
        points[n] = dict(points=pts, targetFull=round(full, 1) if full else None, targetToDate=round(pro, 1) if pro else None, att=round(pts / pro, 4) if pro else None,
                         offersAllStreams=len(own), declinedAllStreams=sum(x['status'] == 'Declined' for x in own), mix=dict(mix))
        if P[n]['status'] == 'Active' and P[n]['role'] in ('Recruiter', 'Team Lead') and full is None: issues.add('WARN', 'Lists', '-', f'{n}: target cadence or grade missing, attainment shown as [To fill]')
    perf = {}
    for n in reviewed:
        pt = points.get(n, {}); own = pt.get('att'); team_att = None
        if P[n]['lead']:
            mem = [m for m in teams.get(P[n]['team'], []) if m != n and P[m]['status'] == 'Active' and m in points and points[m]['targetToDate']]
            if mem: team_att = round(sum(points[m]['points'] for m in mem) / sum(points[m]['targetToDate'] for m in mem), 4)
        basis = None if own is None else (own + team_att) / 2 if P[n]['lead'] and team_att is not None else own
        perf[n] = dict(points=pt.get('points'), targetToDate=pt.get('targetToDate'), ownAtt=own, teamAtt=team_att, ratingBasis=round(basis, 4) if basis is not None else None, rating=rating(basis) or TOFILL)

    # ---- standing-instruction tables: cycle bands, gender, vendor
    pend = [x for x in offers if x['_scope'] and x['status'] == 'Offered' and x['offerDate'] and x['offerDate'] >= y0]
    joined = [x for x in offers if x['_scope'] and x['status'] == 'Joined' and x['doj'] and y0 <= x['doj'] <= cut]
    opn = D['2_Open_Reqs']; ids = collections.Counter(x['req'] for x in opn)
    for rq, n in ids.items():
        if n > 1: issues.add('ERROR', '2_Open_Reqs', '-', f'Req ID {rq} appears {n} times')
    for x in opn:
        x['_age'] = (cut - x['reqDate']).days if x['reqDate'] else None
        if x['_age'] is not None and x['_age'] < 0: issues.add('ERROR', '2_Open_Reqs', x['_row'], 'requisition approved after the cut-off date')
        if x['sfStatus'] in ('Offer in progress', 'Select to offer') and not x['nextStep']: issues.add('WARN', '2_Open_Reqs', x['_row'], 'offer-stage role without a next step')
    bands, gv = {}, {}
    for g, m in groups.items():
        bands[g] = {'pending': {b: sum(1 for x in pend if x['recruiter'] in m and x['_ct'] is not None and band(x['_ct']) == b) for b in BANDS},
                    'joined': {b: sum(1 for x in joined if x['recruiter'] in m and x['_ct'] is not None and band(x['_ct']) == b) for b in BANDS},
                    'open': {b: sum(1 for x in opn if x['recruiter'] in m and x['_age'] is not None and band(x['_age']) == b) for b in BANDS}}
        gv[g] = {k: dict(n=len(s), women=sum(x['gender'] == 'Female' for x in s), vendor=sum(x['source'] == 'Vendor' for x in s))
                 for k, s in (('pending', [x for x in pend if x['recruiter'] in m]), ('joined', [x for x in joined if x['recruiter'] in m]))}

    # ---- open requisitions
    ages = [x['_age'] for x in opn if x['_age'] is not None]
    open_sum = dict(total=len(opn), uniqueIds=len(ids), over90=sum(a > 90 for a in ages), over150=sum(a > 150 for a in ages), avgAge=round(statistics.mean(ages)) if ages else None,
                    offerStage=[dict(req=x['req'], bu=x['bu'], owner=x['recruiter'], age=x['_age'], status=x['sfStatus'], nextStep=x['nextStep'] or TOFILL, due=str(x['nextDue']) if x['nextDue'] else TOFILL)
                                for x in sorted(opn, key=lambda z: -(z['_age'] or 0)) if x['sfStatus'] in ('Offer in progress', 'Select to offer')],
                    over150List=[dict(req=x['req'], bu=x['bu'], owner=x['recruiter'], age=x['_age'], status=x['sfStatus'], blocker=x['blocker'] or TOFILL) for x in sorted(opn, key=lambda z: -(z['_age'] or 0)) if (x['_age'] or 0) > 150],
                    byRecruiter={n: dict(n=len(v := [x for x in opn if x['recruiter'] == n]), avg=round(statistics.mean([x['_age'] for x in v if x['_age'] is not None])) if v else None,
                                         over90=sum((x['_age'] or 0) > 90 for x in v), over150=sum((x['_age'] or 0) > 150 for x in v), offerStage=sum(x['sfStatus'] in ('Offer in progress', 'Select to offer') for x in v)) for n in sorted({x['recruiter'] for x in opn if x['recruiter']})},
                    byBU={b: dict(n=len(v := [x for x in opn if x['bu'] == b]), over90=sum((x['_age'] or 0) > 90 for x in v)) for b in sorted({x['bu'] for x in opn if x['bu']})},
                    byBlocker=dict(collections.Counter(x['blocker'] or TOFILL for x in opn)))
    pending_ids = {x['req'] for x in pend}
    open_sum['pendingOnOpenReqs'] = len(pending_ids & set(ids))

    # ---- joining pipeline vs pending offers
    jp = D['3_Joining_Pipeline']; jp_keys = {(x['req'], x['cand']) for x in jp}
    missing_jp = [x for x in pend if x['cand'] and (x['req'], x['cand']) not in jp_keys]
    for x in missing_jp: issues.add('WARN', '3_Joining_Pipeline', '-', f'pending offer Req {x["req"]} / {x["cand"]} ({x["recruiter"]}) has no joining-pipeline row')
    joining = dict(rows=len(jp), pendingOffers=len(pend), notTracked=len(missing_jp),
                   highRisk=[dict(req=x['req'], cand=x['cand'], recruiter=x['recruiter'], expDoj=str(x['expDoj'])) for x in jp if x['risk'] == 'High'],
                   noContact7=[dict(req=x['req'], cand=x['cand'], recruiter=x['recruiter']) for x in jp if not x['lastContact'] or (cut - x['lastContact']).days > 7],
                   dojIn30=sum(1 for x in jp if x['expDoj'] and 0 <= (x['expDoj'] - cut).days <= 30))

    # ---- programmes / time-bound
    prog = [dict(programme=x['programme'], owner=x['owner'] or TOFILL, target=x['target'], joined=x['joined'], pending=x['pending'] or 0,
                 pctClosed=round(100 * x['joined'] / x['target']) if x['target'] and x['joined'] is not None else TOFILL,
                 status=(TOFILL if x['joined'] is None or not x['target'] else 'Closed' if x['joined'] >= x['target'] else 'Not closed')) for x in D['4_Programmes']]

    # ---- people: review notes, feedback, support KPIs, projects, learning
    rv = D['5_Monthly_Review']; months = sorted({x['month'] for x in rv if x['month']})
    latest = months[-1] if months else None
    review = {n: [dict((k, (str(v) if isinstance(v, datetime.date) else v)) for k, v in x.items() if not k.startswith('_')) for x in rv if x['person'] == n] for n in P}
    review_missing = [n for n in reviewed if latest and not any(x['person'] == n and x['month'] == latest for x in rv)]
    fb = D['6_Business_Feedback']; fbdocs = {}
    for x in fb:
        fid = 'FB-%04d' % (x['_row'] - 4)
        if x['action'] and not x['due']: issues.add('WARN', '6_Business_Feedback', x['_row'], 'agreed action without a due date')
        st = x['status'] or ('Not started' if x['action'] else None)
        fbdocs[fid] = dict(emp=P.get(x['person'], {}).get('id') or x['person'], date=str(x['date']) if x['date'] else None, fromRole=x['fromRole'], fromName=x['fromName'],
                           area=None if x['area'] == 'General' else x['area'], type=x['type'], details=x['details'], feedback=x['feedback'], action=x['action'], owner=x['owner'],
                           due=str(x['due']) if x['due'] else None, status=st, progress=x['progress'], progressDate=str(x['progressDate']) if x['progressDate'] else None, source='Monthly input workbook')
    fb_sum = {n: dict(total=sum(x['person'] == n for x in fb), byType=dict(collections.Counter(x['type'] for x in fb if x['person'] == n)),
                      openActions=sum(1 for x in fb if x['person'] == n and x['action'] and x['status'] not in ('Completed', 'Dropped', 'Withdrawn')),
                      overdue=sum(1 for x in fb if x['person'] == n and x['action'] and x['due'] and x['due'] < cut and x['status'] not in ('Completed', 'Dropped', 'Withdrawn'))) for n in P if any(x['person'] == n for x in fb)}
    kp = D['7_Support_KPIs']
    for x in kp:
        if x['withinSla'] is not None and x['volume'] is not None and x['withinSla'] > x['volume']: issues.add('ERROR', '7_Support_KPIs', x['_row'], 'within SLA is more than the volume')
    kpm = sorted({x['month'] for x in kp if x['month']}); kl = kpm[-1] if kpm else None
    support = {n: [dict(activity=x['activity'], volume=x['volume'], slaPct=round(100 * x['withinSla'] / x['volume'], 1) if x['volume'] and x['withinSla'] is not None else TOFILL,
                        errors=x['errors'] if x['errors'] is not None else TOFILL, escalations=x['escalations'] if x['escalations'] is not None else TOFILL, survey=x['survey'])
                   for x in kp if x['person'] == n and x['month'] == kl] for n, p in P.items() if p['role'] == 'Support' and p['status'] == 'Active'}
    projects = [dict((k, (str(v) if isinstance(v, datetime.date) else v)) for k, v in x.items() if not k.startswith('_')) for x in D['8_Projects']]
    learning = [dict((k, (str(v) if isinstance(v, datetime.date) else v)) for k, v in x.items() if not k.startswith('_')) for x in D['9_Learning']]

    # ---- attention list and requirement status
    att, reqs = [], []
    def flag(person, area, detail, sev='Medium'): att.append(dict(person=person, area=area, detail=detail, severity=sev))
    pct = lambda v: f'{v:.0f}%'
    pl = lambda k, one, many: f'{k} {one if k == 1 else many}'
    def uniq(xs):
        seen_ = set(); out_ = []
        for x in xs:
            if x['req'] not in seen_: seen_.add(x['req']); out_.append(x)
        return out_
    for n in reviewed:
        pf, a = perf[n], streams[n]['All']
        if pf['ratingBasis'] is not None and pf['ratingBasis'] < 0.95: flag(n, 'Delivery vs target', f'{pct(pf["ratingBasis"] * 100)} of pro-rated points target (below Good)', 'High' if pf['ratingBasis'] < 0.85 else 'Medium')
        if pf['teamAtt'] is not None and pf['teamAtt'] < 0.95: flag(n, 'Team delivery', f'team members at {pct(pf["teamAtt"] * 100)} of target')
        if a['offers'] >= 2 * TH['minN'] and a['declPct'] is not None and a['declPct'] > TH['declPct']: flag(n, 'Offer declines', f'{a["declined"]} of {a["offers"]} offers declined ({a["declPct"]}%)', 'High' if a['declPct'] > 15 else 'Medium')
        if a['ctN'] >= 2 * TH['minN'] and a['ctMean'] and a['ctMean'] > TH['ctMean']: flag(n, 'Cycle time', f'requisition → offer {a["ctMean"]} days mean (median {a["ctMedian"]})')
        if a['joined'] >= TH['minN'] and a['vendorPctJoined'] is not None and a['vendorPctJoined'] > TH['vendorPct']: flag(n, 'Vendor use', f'{a["vendorJoined"]} of {a["joined"]} joiners via vendors ({a["vendorPctJoined"]}%), above the proposed 10% guardrail')
        if a['accepted'] >= TH['minN'] and a['womenPctAccepted'] is not None and a['womenPctAccepted'] < TH['womenPct']: flag(n, 'Gender diversity', f'women {a["womenPctAccepted"]}% of {a["accepted"]} accepted offers')
        mine = sorted([x for x in opn if x['recruiter'] == n], key=lambda z: -(z['_age'] or 0))
        o90 = uniq([x for x in mine if (x['_age'] or 0) > 90]); o150 = uniq([x for x in mine if (x['_age'] or 0) > 150])
        if o150: flag(n, 'Aged requisitions', pl(len(o150), 'role', 'roles') + ' over 150 days: ' + ', '.join(f'{x["req"]} ({x["_age"]} d)' for x in o150), 'High')
        elif o90: flag(n, 'Aged requisitions', pl(len(o90), 'role', 'roles') + ' over 90 days')
        stg = uniq([x for x in mine if x['sfStatus'] in ('Offer in progress', 'Select to offer')])
        if stg: flag(n, 'Offer stage', pl(len(stg), 'selected candidate', 'selected candidates') + ' waiting for an offer: ' + ', '.join(f'{x["req"]} ({x["_age"]} d)' for x in stg), 'High' if any((x['_age'] or 0) > 90 for x in stg) else 'Medium')
        for x in mine:
            reqs.append(dict(owner=n, type='Open requisition', req=x['req'], bu=x['bu'], age=x['_age'], status=x['sfStatus'], blocker=x['blocker'] or TOFILL, nextStep=x['nextStep'] or TOFILL, due=x['nextDue'] or TOFILL,
                             attention='Yes' if (x['_age'] or 0) > 90 or x['sfStatus'] in ('Offer in progress', 'Select to offer') else ''))
        jpn = {(y['req'], y['cand']): y for y in jp}
        for x in [y for y in pend if y['recruiter'] == n]:
            j = jpn.get((x['req'], x['cand']), {})
            risk = j.get('risk'); last = j.get('lastContact'); stale = not last or (cut - last).days > TH['contactDays']
            reqs.append(dict(owner=n, type='Offer not yet joined', req=x['req'], bu=x['bu'], age=(cut - x['offerDate']).days if x['offerDate'] else None, status=f'Offered; expected DOJ {j.get("expDoj") or x["expDoj"] or TOFILL}',
                             blocker=f'Counter-offer risk {risk}' if risk else TOFILL, nextStep=f'Last contact {last}' if last else 'No contact logged', due=j.get('expDoj') or x['expDoj'] or TOFILL, attention='Yes' if risk == 'High' or stale else ''))
        hi = [y for y in jp if y['recruiter'] == n and y['risk'] == 'High']
        if hi: flag(n, 'Joining risk', pl(len(hi), 'pending joiner', 'pending joiners') + ' at high counter-offer risk', 'High')
        f_ = fb_sum.get(n, {})
        if f_.get('overdue'): flag(n, 'Feedback actions', pl(f_['overdue'], 'agreed action', 'agreed actions') + ' overdue', 'High')
        conc = [x for x in fb if x['person'] == n and x['type'] == 'Concern' and x['status'] not in ('Completed', 'Dropped', 'Withdrawn')]
        if conc: flag(n, 'Business feedback', pl(len(conc), 'open concern', 'open concerns') + ' from ' + ', '.join(sorted({x['fromRole'] for x in conc})))
        lastrev = [x for x in rv if x['person'] == n and x['month'] == latest]
        if any(x['lastStatus'] == 'Not done' for x in lastrev): flag(n, 'Review commitments', 'last month\'s commitments not done')
        if latest and not lastrev: flag(n, 'Monthly review', f'no review notes for {latest}', 'Low')
    for x in prog:
        if x['status'] == 'Not closed': flag('Portfolio', 'Time-bound requirement', f'{x["programme"]}: {x["joined"]} of {x["target"]} joined ({x["pctClosed"]}%), {x["pending"]} yet to join', 'High' if isinstance(x['pctClosed'], int) and x['pctClosed'] < 70 else 'Medium')
    for n, rows_ in support.items():
        for x in rows_:
            if isinstance(x['slaPct'], float) and x['slaPct'] < TH['slaPct']: flag(n, 'Support SLA', f'{x["activity"]}: {x["slaPct"]}% within SLA ({kl})')
        if not rows_: flag(n, 'Support KPIs', f'no KPI rows for {kl or "the month"}', 'Low')
    for x in D['8_Projects']:
        if x['status'] == 'At risk' or (x['plannedEnd'] and x['plannedEnd'] < cut and x['status'] != 'Completed'): flag(x['owner'], 'Project', f'{x["id"]} {x["title"]}: {x["status"]}' + (f', planned end {x["plannedEnd"]}' if x['plannedEnd'] else ''))
    if joining['notTracked']: flag('Portfolio', 'Joining pipeline', f'{joining["notTracked"]} pending offers are not tracked in 3_Joining_Pipeline', 'Medium')
    if issues.count('ERROR'): flag('Portfolio', 'Data quality', f'{issues.count("ERROR")} data errors in the upload (see validation.md)', 'High')
    order = {'High': 0, 'Medium': 1, 'Low': 2}; att.sort(key=lambda z: (order[z['severity']], z['person']))
    report_xlsx(os.path.join(out, f'TA_Monthly_Review_{month or cut}.xlsx'), month, cut, reviewed, perf, streams, bands, att, reqs, prog, P)

    res = dict(source=os.path.basename(path), attention=att, requirements=reqs, reportingMonth=month or TOFILL, cutOff=str(cut), groups={g: m for g, m in groups.items()}, performance=perf, points=points, streams=streams, programmeOffers=dict(programme_offers),
               bands=bands, genderVendor=gv, open=open_sum, joining=joining, programmes=prog, review=dict(latestMonth=latest, missingThisMonth=review_missing, notes=review),
               feedback=fb_sum, support=dict(month=kl, rows=support), projects=projects, learning=learning,
               declineReasons=dict(collections.Counter(x['declReason'] or 'Not recorded' for x in yr if x['_scope'] and x['status'] == 'Declined')),
               issues=dict(errors=issues.count('ERROR'), warnings=issues.count('WARN')))
    json.dump(res, open(os.path.join(out, 'consolidated.json'), 'w'), indent=1, default=str)

    # ---- dashboard documents
    rows = []
    for g, m in groups.items():
        kind = 'overall' if g == 'Overall' else 'team' if g.startswith('Team ') else 'person'
        b, v = bands[g], gv[g]
        rows.append(dict(label=g + (' (left)' if kind == 'person' and P[g]['status'] == 'Left' else ''), kind=kind, members=', '.join(m) if kind == 'team' else '',
                         pending=[b['pending'][k] for k in BANDS], joined=[b['joined'][k] for k in BANDS], open=[b['open'][k] for k in BANDS],
                         gp=[v['pending']['n'], v['pending']['women'], v['pending']['vendor']], gj=[v['joined']['n'], v['joined']['women'], v['joined']['vendor']]))
    req = dict(asOf=str(cut), bands=['<45 days', '45–60', '61–90', '91–150', '>150'], rows=rows,
               timeBound=[dict(req=x['programme'], owner=x['owner'], target=x['target'], joined=x['joined'], yet=x['pending']) for x in prog if x['target'] and x['joined'] is not None],
               scope='Lateral (incl. campus intern-to-employment conversions), FTC and all conversions to employment; programme hiring (NATS, ExcelHER, AICTE/PhD, interns) and other campus/fresher hires excluded. '
                     f'Offered = offers still to join, raise→offer. Joined = joined {cut.year} to {cut:%d %b}, raise→offer. Open = open requisitions at {cut:%d %b %Y}, raise→cut-off.',
               rules='Light red = needs attention: cycle time over 90 days; women below 25% or vendor above 15% (where at least 5 positions); time-bound requirement not closed.',
               tbSource='4_Programmes sheet of the monthly input workbook.')
    json.dump(req, open(os.path.join(out, 'reqReview.json'), 'w'), indent=1)
    json.dump(fbdocs, open(os.path.join(out, 'feedback.json'), 'w'), indent=1)

    # ---- validation report
    with open(os.path.join(out, 'validation.md'), 'w') as f:
        f.write(f'# Validation: {os.path.basename(path)}\n\nCut-off {cut} · {issues.count("ERROR")} errors (must be fixed) · {issues.count("WARN")} warnings\n\n')
        f.write('| Level | Sheet | Row | Problem |\n|---|---|---|---|\n')
        for lv, sh, r, m in sorted(issues.rows, key=lambda z: (z[0] != 'ERROR', z[1], str(z[2]))): f.write(f'| {lv} | {sh} | {r} | {m} |\n')

    # ---- summary
    O = streams['Overall']
    fmt = lambda v, s='': TOFILL if v is None else f'{v}{s}'
    with open(os.path.join(out, 'summary.md'), 'w') as f:
        f.write(f'# Monthly TA review: {month or TOFILL} (data to {cut})\n\n')
        f.write('## In-scope hiring (offers released this year)\n\n| Stream | Offers | Joined | Pending | Declined | Decline % | Req→offer mean / median | Vendor % joiners | Referral % joiners | Women % accepted |\n|---|---|---|---|---|---|---|---|---|---|\n')
        for s in STREAMS + ['All']:
            x = O[s]; f.write(f'| {s} | {x["offers"]} | {x["joined"]} | {x["pending"]} | {x["declined"]} | {fmt(x["declPct"], "%")} | {fmt(x["ctMean"])} / {fmt(x["ctMedian"])} | {fmt(x["vendorPctJoined"], "%")} | {fmt(x["referralPctJoined"], "%")} | {fmt(x["womenPctAccepted"], "%")} |\n')
        f.write('\n## By recruiter, team and overall (all in-scope streams)\n\n| Group | Offers | Decline % | Req→offer mean | Vendor % joiners | Women % accepted | Open | >90 d |\n|---|---|---|---|---|---|---|---|\n')
        for g, m in groups.items():
            x = streams[g]['All']; ob = bands[g]['open']
            f.write(f'| {g} | {x["offers"]} | {fmt(x["declPct"], "%")} | {fmt(x["ctMean"])} | {fmt(x["vendorPctJoined"], "%")} | {fmt(x["womenPctAccepted"], "%")} | {sum(ob.values())} | {ob["91-150"] + ob[">150"]} |\n')
        f.write('\n## Areas requiring attention\n\n| Severity | Person | Area | Detail |\n|---|---|---|---|\n')
        for x in att: f.write(f'| {x["severity"]} | {x["person"]} | {x["area"]} | {x["detail"]} |\n')
        f.write('\n## Recruiter and lead performance\n\n| Person | Points | Target to date | Own % | Team % | Rating basis | Rating | Offers in scope | Decline % | Req→offer mean | Vendor % joiners | Women % | Open | >90 d |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n')
        for n in reviewed:
            pf, a, ob = perf[n], streams[n]['All'], bands[n]['open']
            pp = lambda v: TOFILL if v is None else f'{v * 100:.0f}%'
            f.write(f'| {n} | {fmt(pf["points"])} | {fmt(pf["targetToDate"])} | {pp(pf["ownAtt"])} | {pp(pf["teamAtt"]) if P[n]["lead"] else "—"} | {pp(pf["ratingBasis"])} | {pf["rating"]} | {a["offers"]} | {fmt(a["declPct"], "%")} | {fmt(a["ctMean"])} | {fmt(a["vendorPctJoined"], "%")} | {fmt(a["womenPctAccepted"], "%")} | {sum(ob.values())} | {ob["91-150"] + ob[">150"]} |\n')
        f.write(f'\n## Open requisitions\n\n{open_sum["total"]} rows ({open_sum["uniqueIds"]} unique IDs) · {open_sum["over90"]} over 90 days · {open_sum["over150"]} over 150 days · {len(open_sum["offerStage"])} at offer stage · {open_sum["pendingOnOpenReqs"]} pending offers sit on requisitions still open\n\n')
        f.write(f'## Joining pipeline\n\n{len(pend)} offers not yet joined · {joining["notTracked"]} not tracked in the pipeline sheet · {len(joining["highRisk"])} high counter-offer risk · {len(joining["noContact7"])} without contact in 7 days · {joining["dojIn30"]} joining in the next 30 days\n\n')
        f.write('## Time-bound requirements\n\n| Requirement | Target | Joined | Yet to join | % closed | Status |\n|---|---|---|---|---|---|\n')
        for x in prog: f.write(f'| {x["programme"]} | {fmt(x["target"])} | {fmt(x["joined"])} | {x["pending"]} | {x["pctClosed"]}{"%" if isinstance(x["pctClosed"], int) else ""} | {x["status"]} |\n')
        f.write(f'\n## Monthly review notes\n\nLatest month: {latest or TOFILL}. No notes yet for: {", ".join(review_missing) if review_missing else "none"}.\n\n')
        f.write(f'## Feedback\n\n{len(fb)} entries · {sum(v["openActions"] for v in fb_sum.values())} open actions · {sum(v["overdue"] for v in fb_sum.values())} overdue\n\n')
        f.write(f'## Validation\n\n{issues.count("ERROR")} errors, {issues.count("WARN")} warnings (see validation.md).\n')
    return res, issues


if __name__ == '__main__':
    res, iss = consolidate(sys.argv[1], sys.argv[2])
    print(f'{iss.count("ERROR")} errors, {iss.count("WARN")} warnings; outputs in {sys.argv[2]}')
