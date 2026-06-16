import { query } from '../db';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

// Data-access functions for the users table (ADR-002).
export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await query<User>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1',
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, password_hash, created_at`,
    [email.toLowerCase(), passwordHash]
  );
  return rows[0];
}
