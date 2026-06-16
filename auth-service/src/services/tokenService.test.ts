import jwt from 'jsonwebtoken';
import {
  TokenPayload,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from './tokenService';

// Mock config before importing the module
jest.mock('../config', () => ({
  config: {
    jwt: {
      accessSecret: 'test-access-secret',
      refreshSecret: 'test-refresh-secret',
      accessExpires: '15m',
      refreshExpires: '7d',
    },
  },
}));

const mockPayload: TokenPayload = {
  sub: 42,
  email: 'user@example.com',
};

describe('tokenService', () => {
  describe('generateAccessToken / verifyAccessToken', () => {
    it('should generate a valid access token and verify it correctly', () => {
      const token = generateAccessToken(mockPayload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT structure

      const decoded = verifyAccessToken(token);

      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw when verifying an access token with a wrong secret', () => {
      const forgeddToken = jwt.sign(mockPayload, 'wrong-secret', { expiresIn: '15m' });

      expect(() => verifyAccessToken(forgeddToken)).toThrow();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    it('should generate a valid refresh token and verify it correctly', () => {
      const token = generateRefreshToken(mockPayload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyRefreshToken(token);

      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw when verifying a refresh token with a wrong secret', () => {
      const forgedToken = jwt.sign(mockPayload, 'wrong-refresh-secret', { expiresIn: '7d' });

      expect(() => verifyRefreshToken(forgedToken)).toThrow();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should allow verification of a refresh token before revocation and reject it after', () => {
      const token = generateRefreshToken(mockPayload);

      // Before revocation: should succeed
      expect(() => verifyRefreshToken(token)).not.toThrow();

      revokeRefreshToken(token);

      // After revocation: should throw
      expect(() => verifyRefreshToken(token)).toThrow('Refresh token has been revoked');
    });

    it('should throw the correct error message when a revoked token is used', () => {
      const token = generateRefreshToken({ sub: 99, email: 'another@example.com' });

      revokeRefreshToken(token);

      try {
        verifyRefreshToken(token);
        fail('Expected verifyRefreshToken to throw');
      } catch (err) {
        expect((err as Error).message).toBe('Refresh token has been revoked');
      }
    });
  });
});