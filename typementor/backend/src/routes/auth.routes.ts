import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { register, login, getProfile, googleLogin, updateLastActivity, updateAcademyProgress } from '../controllers/auth.controller';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { authLimiter } from '../app';

const router = Router();

// Typed wrapper: adapts an AuthRequest handler into a standard RequestHandler
function authHandler(
  handler: (req: AuthRequest, res: Response) => Promise<Response | void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as AuthRequest, res).catch(next);
  };
}

// Apply strict rate limiter to login and register (brute-force protection)
router.post('/register', authLimiter, register as RequestHandler);
router.post('/login', authLimiter, login as RequestHandler);
router.post('/google', authLimiter, googleLogin as RequestHandler);

// Profile requires valid JWT
router.use('/profile', authenticateToken);
router.get('/profile', authHandler(getProfile));
router.post('/profile/activity', authHandler(updateLastActivity));
router.post('/profile/academy', authHandler(updateAcademyProgress));

export default router;

