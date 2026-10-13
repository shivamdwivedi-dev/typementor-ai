import { Router } from 'express';
import { submitSession, getUserSessions } from '../controllers/session.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken as any, (req, res, next) => {
  Promise.resolve(submitSession(req as any, res)).catch(next);
});
router.get('/', authenticateToken as any, (req, res, next) => {
  Promise.resolve(getUserSessions(req as any, res)).catch(next);
});

export default router;

