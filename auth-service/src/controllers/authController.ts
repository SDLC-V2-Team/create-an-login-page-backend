import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { findUserByEmail, createUser } from '../models/user';
import {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken
} from '../services/tokenService';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /auth/register - helper to seed accounts (bcrypt hashing per ADR-003).
export async function register(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body ?? {};
  if (!email || !password || !isValidEmail(email) || password.length < 8) {
    return res.status(400).json({ error: 'Valid email and password (min 8 chars) are required.' });
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const passwordHash = await bcrypt.hash(password, config.bcryptCost);
  const user = await createUser(email, passwordHash);
  return res.status(201).json({ id: user.id, email: user.email });
}

// POST /auth/login - credential verification and JWT issuance (ADR-004).
export async function login(req: Request, res: Response): Promise<Response> {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await findUserByEmail(email);
  // Always run a compare to mitigate user-enumeration timing attacks.
  const passwordHash = user?.password_hash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinv';
  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const payload = { sub: user.id, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return res.status(200).json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email }
  });
}

// POST /auth/logout - invalidate the supplied refresh token (ADR-004 optional endpoint).
export async function logout(req: Request, res: Response): Promise<Response> {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    revokeRefreshToken(refreshToken);
  }
  return res.status(200).json({ message: 'Logged out successfully.' });
}
