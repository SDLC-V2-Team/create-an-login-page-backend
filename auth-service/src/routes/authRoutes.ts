import { Router } from 'express';
import { register, login, logout } from '../controllers/authController';
import { requireAuth, AuthedRequest } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Example protected route demonstrating token usage.
router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
