import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Login, Unlocked } from './ui/Login';
import { AppProvider } from './store/state';
import { Shell } from './ui/Shell';

function Root() {
  const [u, setU] = useState<Unlocked | null>(null);
  const lock = useCallback(() => setU(null), []);
  if (!u) return <Login onUnlock={setU} />;
  return (
    <AppProvider initial={u.data} session={{ email: u.email, key: u.key, salt: u.salt }} onLock={lock}>
      <Shell />
    </AppProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
