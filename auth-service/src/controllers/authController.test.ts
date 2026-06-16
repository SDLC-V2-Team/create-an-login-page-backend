import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { register, login, logout } from './authController';
import { findUserByEmail, createUser } from '../models/user';
import {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken
} from '../services/tokenService';

jest.mock('bcrypt');
jest.mock('../models/user');
jest.mock('../services/tokenService');
jest.mock('../config', () => ({
  config: { bcryptCost: 10 }
}));

const mockFindUserByEmail = findUserByEmail as jest.MockedFunction<typeof findUserByEmail>;
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;
const mockGenerateAccessToken = generateAccessToken as jest.MockedFunction<typeof generateAccessToken>;
const mockGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<typeof generateRefreshToken>;
const mockRevokeRefreshToken = revokeRefreshToken as jest.MockedFunction<typeof revokeRefreshToken>;

function buildMockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function buildMockRequest(body: Record<string, unknown> = {}): Request {
  return { body } as Request;
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('happy path: should create a new user and return 201 with user data', async () => {
      const req = buildMockRequest({ email: 'user@example.com', password: 'securePass1' });
      const res = buildMockResponse();

      mockFindUserByEmail.mockResolvedValue(null);
      (mockBcryptHash as jest.Mock).mockResolvedValue('hashedPassword');
      mockCreateUser.mockResolvedValue({ id: 'user-123', email: 'user@example.com', password_hash: 'hashedPassword' });

      await register(req, res);

      expect(mockFindUserByEmail).toHaveBeenCalledWith('user@example.com');
      expect(mockBcryptHash).toHaveBeenCalledWith('securePass1', 10);
      expect(mockCreateUser).toHaveBeenCalledWith('user@example.com', 'hashedPassword');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'user-123', email: 'user@example.com' });
    });

    it('error path: should return 409 when email already exists', async () => {
      const req = buildMockRequest({ email: 'existing@example.com', password: 'securePass1' });
      const res = buildMockResponse();

      mockFindUserByEmail.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
        password_hash: 'someHash'
      });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'An account with this email already exists.' });
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('edge case: should return 400 for invalid/missing inputs', async () => {
      const cases = [
        { email: '', password: 'securePass1' },
        { email: 'user@example.com', password: 'short' },
        { email: 'notanemail', password: 'securePass1' },
        { email: undefined, password: undefined }
      ];

      for (const body of cases) {
        const req = buildMockRequest(body as Record<string, unknown>);
        const res = buildMockResponse();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Valid email and password (min 8 chars) are required.'
        });
      }

      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('happy path: should return 200 with tokens and user info on valid credentials', async () => {
      const req = buildMockRequest({ email: 'user@example.com', password: 'correctPassword' });
      const res = buildMockResponse();

      const mockUser = { id: 'user-123', email: 'user@example.com', password_hash: 'hashedPassword' };
      mockFindUserByEmail.mockResolvedValue(mockUser);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true);
      mockGenerateAccessToken.mockReturnValue('access-token-xyz');
      mockGenerateRefreshToken.mockReturnValue('refresh-token-xyz');

      await login(req, res);

      expect(mockFindUserByEmail).toHaveBeenCalledWith('user@example.com');
      expect(mockBcryptCompare).toHaveBeenCalledWith('correctPassword', 'hashedPassword');
      expect(mockGenerateAccessToken).toHaveBeenCalledWith({ sub: 'user-123', email: 'user@example.com' });
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith({ sub: 'user-123', email: 'user@example.com' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-xyz',
        user: { id: 'user-123', email: 'user@example.com' }
      });
    });

    it('error path: should return 401 when credentials are invalid (wrong password or user not found)', async () => {
      const req = buildMockRequest({ email: 'user@example.com', password: 'wrongPassword' });
      const res = buildMockResponse();

      mockFindUserByEmail.mockResolvedValue(null);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password.' });
      expect(mockGenerateAccessToken).not.toHaveBeenCalled();
    });

    it('edge case: should return 400 when email or password is missing', async () => {
      const req = buildMockRequest({ email: 'user@example.com' });
      const res = buildMockResponse();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required.' });
      expect(mockFindUserByEmail).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('happy path: should revoke refresh token and return 200 with success message', async () => {
      const req = buildMockRequest({ refreshToken: 'some-refresh-token' });
      const res = buildMockResponse();

      await logout(req, res);

      expect(mockRevokeRefreshToken).toHaveBeenCalledWith('some-refresh-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully.' });
    });

    it('edge case: should return 200 even when no refresh token is provided', async () => {
      const req = buildMockRequest({});
      const res = buildMockResponse();

      await logout(req, res);

      expect(mockRevokeRefreshToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully.' });
    });
  });
});