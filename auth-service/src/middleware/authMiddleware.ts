import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../services/tokenService';

export interface AuthedRequest extends Request {
  user?: TokenPayload;
}

// Guards routes that require a valid access token.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Response | void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }
}
