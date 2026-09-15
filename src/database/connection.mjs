import path from 'node:path';
import { postgresAdapter } from './adapter.mjs';

export async function connectDatabase(root) {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 20000,
      options: '-c timezone=America/Fortaleza',
    });
    pool.on('error', () => console.error('Conexão do banco encerrada. Será restabelecida na próxima consulta.'));
    return postgresAdapter(pool);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.DATA_DIR) {
    throw Error('Configure DATABASE_URL (banco externo) ou DATA_DIR em um volume persistente.');
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite(process.env.DATA_DIR || path.join(root, 'data'));
  await db.exec("SET TIME ZONE 'America/Fortaleza'");
  return db;
}
