import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppData } from '../types';
import { periodsFor, Period } from '../engine/compute';
import { seal, writeVault } from './vault';

export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Session {
  email: string;
  key: CryptoKey;
  salt: Uint8Array;
}

interface Ctx {
  data: AppData;
  user: string;
  year: number;
  setYear: (y: number) => void;
  period: Period;
  periods: Period[];
  setPeriodKey: (k: string) => void;
  showNames: boolean;
  setShowNames: (v: boolean) => void;
  yearClosed: boolean;
  /** Apply a change, record it in the audit log, and save encrypted to this computer. */
  update: (action: string, detail: string, fn: (d: AppData) => void) => void;
  saving: boolean;
  lock: () => void;
  session: Session;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

export function AppProvider({ initial, session, onLock, children }: { initial: AppData; session: Session; onLock: () => void; children: ReactNode }) {
  const [data, setData] = useState<AppData>(initial);
  const years = data.years.map((y) => y.year).sort();
  const [year, setYear] = useState<number>(() => {
    const t = Number(todayISO().slice(0, 4));
    return years.includes(t) ? t : years[years.length - 1];
  });
  const periods = useMemo(() => periodsFor(year, todayISO()), [year]);
  const [periodKey, setPeriodKey] = useState('YTD');
  const period = periods.find((p) => p.key === periodKey) ?? periods[0];
  const [showNames, setShowNames] = useState(true);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    (d: AppData) => {
      window.clearTimeout(timer.current);
      setSaving(true);
      timer.current = window.setTimeout(async () => {
        await writeVault(await seal(d, session.email, session.key, session.salt));
        setSaving(false);
      }, 300);
    },
    [session],
  );

  const update = useCallback<Ctx['update']>(
    (action, detail, fn) => {
      setData((prev) => {
        const next: AppData = structuredClone(prev);
        fn(next);
        next.audit.unshift({ at: new Date().toISOString(), user: session.email, action, detail });
        persist(next);
        return next;
      });
    },
    [persist, session.email],
  );

  // Auto-lock after 15 minutes without interaction.
  useEffect(() => {
    let t = window.setTimeout(onLock, 15 * 60 * 1000);
    const reset = () => {
      window.clearTimeout(t);
      t = window.setTimeout(onLock, 15 * 60 * 1000);
    };
    const ev = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    ev.forEach((e) => window.addEventListener(e, reset));
    return () => {
      window.clearTimeout(t);
      ev.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [onLock]);

  const yearClosed = data.years.find((y) => y.year === year)?.status === 'closed';
  const value: Ctx = {
    data,
    user: session.email,
    year,
    setYear: (y) => {
      setYear(y);
      setPeriodKey('YTD');
    },
    period,
    periods,
    setPeriodKey,
    showNames,
    setShowNames,
    yearClosed,
    update,
    saving,
    lock: onLock,
    session,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
