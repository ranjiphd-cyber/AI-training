// SYNTHETIC TEST FIXTURES — not operational data.
import { describe, expect, it } from 'vitest';
import { autoMap, parseDate, parseStatus, parseStream, validateRow } from './parse';
import { Recruiter } from '../types';

const recs: Recruiter[] = [{ id: 'R1', employeeId: 'E1', name: 'Alex Test', aliases: ['Alex T'], role: 'recruiter', team: '', jobLevel: '', cadence: 1, targetSG: 5, startDate: null, leaveDate: null }];

describe('import parsing', () => {
  it('parses common date formats (day first)', () => {
    expect(parseDate('19-01-2026')).toBe('2026-01-19');
    expect(parseDate('2026-02-09')).toBe('2026-02-09');
    expect(parseDate('09/02/2026')).toBe('2026-02-09');
    expect(parseDate(46041)).toBe('2026-01-19');
    expect(parseDate('31-02-2026')).toBe('invalid');
    expect(parseDate('')).toBeNull();
  });
  it('recognises streams and statuses', () => {
    expect(parseStream('Campus / Fresher (GET/PGET)')).toBe('GET / PGET');
    expect(parseStream('lateral')).toBe('Lateral');
    expect(parseStream('NATS conversion')).toBe('Conversion to employment');
    expect(parseStatus('Offer revoked')).toBe('Offer revoked');
    expect(parseStatus('joined')).toBe('Joined');
    expect(parseStatus('banana')).toBeNull();
  });
  it('maps headers automatically', () => {
    const m = autoMap('offers', ['Req ID', 'Recruiter', 'Offer Date', 'Salary Grade', 'Status', 'Gender', 'Source', 'Stream']);
    expect(m.reqId).toBe('Req ID');
    expect(m.sg).toBe('Salary Grade');
    expect(m.offerDate).toBe('Offer Date');
  });
  it('validates rows and never fills missing values', () => {
    const ok = validateRow('offers', { recruiter: 'alex t', reqId: '1', stream: 'Lateral', sg: 'JL7', offerDate: '2026-02-01', status: 'Offered', gender: 'Female', source: 'Vendor' }, 5, recs);
    expect(ok.errors).toEqual([]);
    expect(ok.record).toMatchObject({ recruiterId: 'R1', sg: 9, woman: true, viaVendor: true, reqDate: null });
    const bad = validateRow('offers', { recruiter: 'Nobody', reqId: '', stream: 'x', offerDate: 'soon', status: 'Offered' }, 6, recs);
    expect(bad.record).toBeNull();
    expect(bad.errors.length).toBeGreaterThanOrEqual(3);
  });
});
