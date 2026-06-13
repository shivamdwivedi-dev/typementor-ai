import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { getCoachInsights, getCustomLesson, getRecoveryLesson } from '../controllers/coach.controller';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Typed wrapper: adapts AuthRequest handlers to standard Express RequestHandler
function authHandler(
  handler: (req: AuthRequest, res: Response) => Promise<Response | void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as AuthRequest, res).catch(next);
  };
}

router.use('/insights', authenticateToken);
router.get('/insights', authHandler(getCoachInsights));

router.use('/lesson', authenticateToken);
router.get('/lesson', authHandler(getCustomLesson));

router.use('/recovery-lesson', authenticateToken);
router.get('/recovery-lesson', authHandler(getRecoveryLesson));

export default router;
