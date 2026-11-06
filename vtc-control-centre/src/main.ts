import { loadConfig, StartupRefusedError } from './config.ts';
import { createPool } from './db.ts';
import { buildServer } from './server.ts';

try {
  const cfg = loadConfig();
  const db = createPool(cfg.databaseUrl);
  const app = await buildServer(cfg, db);
  await app.listen({ port: cfg.port, host: cfg.host });
} catch (err) {
  if (err instanceof StartupRefusedError) {
    console.error(`[startup refused] ${err.message}`);
    process.exit(78);
  }
  throw err;
}
