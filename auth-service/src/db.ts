import { Pool } from 'pg';
import { config } from './config';

// Single shared connection pool for the PostgreSQL database (ADR-002).
export const pool = new Pool({
  connectionString: config.databaseUrl
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PostgreSQL pool error', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
