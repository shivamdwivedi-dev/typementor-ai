import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { register, login, getProfile, googleLogin, updateLastActivity, updateAcademyProgress, spendXp } from '../controllers/auth.controller';
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

const applyAuthLimiter: RequestHandler = (req, res, next) => authLimiter(req, res, next);

// Apply strict rate limiter to login and register (brute-force protection)
router.post('/register', applyAuthLimiter, (req, res, next) => {
  Promise.resolve(register(req, res)).catch(next);
});
router.post('/login', applyAuthLimiter, (req, res, next) => {
  Promise.resolve(login(req, res)).catch(next);
});
router.post('/google', applyAuthLimiter, (req, res, next) => {
  Promise.resolve(googleLogin(req, res)).catch(next);
});

// Profile requires valid JWT
router.use('/profile', authenticateToken);
router.get('/profile', authHandler(getProfile));
router.post('/profile/activity', authHandler(updateLastActivity));
router.post('/profile/academy', authHandler(updateAcademyProgress));
router.post('/profile/spend-xp', authHandler(spendXp));

export default router;

