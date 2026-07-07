import { Router, Request, Response, NextFunction } from 'express';
import { getAdminStats } from '../controllers/admin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Middleware to restrict route to designated admin email addresses.
 */
function requireAdmin(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const user = req.user;
  const adminEmailsStr = process.env.ADMIN_EMAILS || '';
  
  if (!user || !user.email) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  const adminEmails = adminEmailsStr
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Default fallback if no admin emails configured: allow development local access
  if (adminEmails.length === 0 && process.env.NODE_ENV !== 'production') {
    return next();
  }

  if (adminEmails.includes(user.email.toLowerCase())) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
}

router.get('/stats', authenticateToken as any, requireAdmin as any, getAdminStats as any);

export default router;
