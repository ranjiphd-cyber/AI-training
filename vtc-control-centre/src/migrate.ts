import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

export async function migrate(databaseUrl: string, log = console.log) {
  // Wait for the database to accept connections (e.g. a container that is still starting).
  let client: pg.Client;
  for (let attempt = 1; ; attempt++) {
    client = new pg.Client({ connectionString: databaseUrl });
    try { await client.connect(); break; } catch (e) {
      await client.end().catch(() => {});
      if (attempt >= 30) throw e;
      log(`waiting for database (attempt ${attempt})…`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  try {
    await client.query('SELECT pg_advisory_lock(727001)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        log(`applied ${f}`);
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
  await migrate(process.env.DATABASE_URL);
}
