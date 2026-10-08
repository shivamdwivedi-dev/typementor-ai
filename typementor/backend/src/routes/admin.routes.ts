import { Router, Request, Response, NextFunction } from 'express';
import { getAdminStats } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

import { ADMIN_EMAILS } from '../config/env';

/**
 * Middleware to restrict route to designated admin email addresses.
 */
function requireAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const user = req.user;
  
  if (!user || !user.email) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  // Default fallback if no admin emails configured: allow development local access
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

export default router;
