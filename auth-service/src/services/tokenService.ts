import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  sub: number;
  email: string;
}

// In-memory blacklist for refresh tokens (ADR-001 negative consequence mitigation).
// In production replace with Redis or a DB-backed store.
const refreshBlacklist = new Set<string>();

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: config.jwt.accessExpires as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwt.accessSecret, options);
}

export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: config.jwt.refreshExpires as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  if (refreshBlacklist.has(token)) {
    throw new Error('Refresh token has been revoked');
  }
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}

export function revokeRefreshToken(token: string): void {
  refreshBlacklist.add(token);
}
