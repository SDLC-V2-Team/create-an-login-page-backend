import { Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from './authMiddleware';
import { verifyAccessToken, TokenPayload } from '../services/tokenService';

jest.mock('../services/tokenService');

const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

function buildMockRequest(authorizationHeader?: string): AuthedRequest {
  return {
    headers: authorizationHeader ? { authorization: authorizationHeader } : {},
  } as AuthedRequest;
}

function buildMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('requireAuth middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next() and attach user to req when a valid Bearer token is provided', () => {
    const payload: TokenPayload = { sub: 'user-123', iat: 1000, exp: 9999 } as TokenPayload;
    mockVerifyAccessToken.mockReturnValue(payload);

    const req = buildMockRequest('Bearer valid.jwt.token');
    const res = buildMockResponse();

    requireAuth(req, res, next);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('valid.jwt.token');
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when the Authorization header is missing', () => {
    const req = buildMockRequest();
    const res = buildMockResponse();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or malformed Authorization header.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when the Authorization header does not start with "Bearer "', () => {
    const req = buildMockRequest('Basic dXNlcjpwYXNz');
    const res = buildMockResponse();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or malformed Authorization header.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when verifyAccessToken throws (invalid or expired token)', () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('Token expired');
    });

    const req = buildMockRequest('Bearer expired.jwt.token');
    const res = buildMockResponse();

    requireAuth(req, res, next);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('expired.jwt.token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired access token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when the Authorization header is exactly "Bearer " with no token', () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('Token is empty');
    });

    const req = buildMockRequest('Bearer ');
    const res = buildMockResponse();

    requireAuth(req, res, next);

    expect(mockVerifyAccessToken).toHaveBeenCalledWith('');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired access token.' });
    expect(next).not.toHaveBeenCalled();
  });
});