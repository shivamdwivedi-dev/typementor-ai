import { Router } from 'express';
import { submitSession, getUserSessions } from '../controllers/session.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken as any, submitSession as any);
router.get('/', authenticateToken as any, getUserSessions as any);

export default router;

