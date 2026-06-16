import request from 'supertest';
import { createApp } from './app';
import express, { Router } from 'express';

// Mock config to control corsOrigin
jest.mock('./config', () => ({
  config: {
    corsOrigin: 'http://localhost:3000',
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
  },
}));

// Mock authRoutes to avoid needing real DB / dependencies
jest.mock('./routes/authRoutes', () => {
  const router = require('express').Router();
  router.post('/login', (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;
    if (email === 'user@example.com' && password === 'correct') {
      return res.status(200).json({ token: 'fake-jwt-token' });
    }
    return res.status(401).json({ error: 'Invalid credentials.' });
  });
  router.get('/error-trigger', (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next(new Error('Simulated error'));
  });
  return router;
});

describe('createApp', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return status ok on the health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers for allowed origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('POST /auth/login', () => {
    it('should return a token for valid credentials (happy path)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'correct' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'fake-jwt-token');
    });

    it('should return 401 for invalid credentials (error path)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials.');
    });

    it('should parse JSON body correctly (edge case: JSON parsing middleware)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ email: 'user@example.com', password: 'correct' }));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('Centralised error handler', () => {
    it('should return 500 with error message when an error is passed to next()', async () => {
      const response = await request(app).get('/auth/error-trigger');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error.' });
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for an unregistered route (edge case)', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});