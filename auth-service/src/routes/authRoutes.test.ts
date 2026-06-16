import express, { Application, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import router from './authRoutes';

// --- mock controllers ---
jest.mock('../controllers/authController', () => ({
  register: jest.fn((req: Request, res: Response) => res.status(201).json({ message: 'registered' })),
  login: jest.fn((req: Request, res: Response) => res.status(200).json({ token: 'fake-jwt' })),
  logout: jest.fn((req: Request, res: Response) => res.status(200).json({ message: 'logged out' })),
}));

// --- mock middleware ---
jest.mock('../middleware/authMiddleware', () => ({
  requireAuth: jest.fn((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === 'Bearer valid-token') {
      (req as any).user = { id: '123', email: 'test@example.com' };
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }),
}));

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use('/auth', router);
  return app;
}

describe('authRoutes', () => {
  let app: Application;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  // Happy path: POST /auth/register
  it('POST /auth/register – calls register controller and returns 201', async () => {
    const { register } = await import('../controllers/authController');

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'secret' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'registered' });
    expect(register).toHaveBeenCalledTimes(1);
  });

  // Happy path: POST /auth/login
  it('POST /auth/login – calls login controller and returns 200 with token', async () => {
    const { login } = await import('../controllers/authController');

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: 'fake-jwt' });
    expect(login).toHaveBeenCalledTimes(1);
  });

  // Happy path: POST /auth/logout
  it('POST /auth/logout – calls logout controller and returns 200', async () => {
    const { logout } = await import('../controllers/authController');

    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'logged out' });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  // Happy path: GET /auth/me with valid token
  it('GET /auth/me – returns user when valid token is provided', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: '123', email: 'test@example.com' } });
  });

  // Error path: GET /auth/me without token
  it('GET /auth/me – returns 401 when no/invalid token is provided', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  // Edge case: unknown route under /auth returns 404
  it('GET /auth/unknown – returns 404 for unregistered routes', async () => {
    const res = await request(app).get('/auth/unknown');

    expect(res.status).toBe(404);
  });
});