import { Router, Request, Response, NextFunction } from 'express';
import { getAdminStats, pushDatabaseSchema } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { ADMIN_SECRET, ADMIN_EMAILS } from '../config/env';

const router = Router();

/**
 * Middleware to restrict route to designated admin email addresses or X-Admin-Secret header.
 */
function requireAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const secretHeader = req.headers['x-admin-secret'] || req.query.adminSecret;
  if (secretHeader && secretHeader === ADMIN_SECRET) {
    return next();
  }

  const user = req.user;
  if (!user || !user.email) {
    return res.status(401).json({ error: 'Authentication token or Admin Secret required.' });
  }

  if (ADMIN_EMAILS.length === 0 && process.env.NODE_ENV !== 'production') {
    return next();
  }

  if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
}

router.get('/stats', authenticateToken as any, requireAdmin as any, getAdminStats as any);
router.post('/db-push', requireAdmin as any, pushDatabaseSchema as any);

export default router;
