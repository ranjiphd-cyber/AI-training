import pg from 'pg';

export type Db = pg.Pool;
export type Tx = pg.PoolClient;

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}

type Isolation = 'READ COMMITTED' | 'SERIALIZABLE';

/**
 * Runs fn in a transaction. Business changes and their mandatory audit events are written with the same client,
 * so they commit or roll back together. SERIALIZABLE transactions are retried on serialization failures.
 */
export async function withTx<T>(pool: pg.Pool, fn: (tx: Tx) => Promise<T>,
                                opts: { isolation?: Isolation; retries?: number } = {}): Promise<T> {
  const isolation = opts.isolation ?? 'READ COMMITTED';
  const retries = opts.retries ?? (isolation === 'SERIALIZABLE' ? 5 : 0);
  for (let attempt = 0; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      const retryable = err?.code === '40001' || err?.code === '40P01';
      if (retryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, 10 * 2 ** attempt + Math.random() * 10));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
