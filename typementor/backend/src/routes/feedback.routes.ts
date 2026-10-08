import { Router, Response } from 'express';
import { prisma } from '../app';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Sanitization function for safety
function sanitizeString(str: string, maxLength: number): string {
  if (typeof str !== 'string') return '';
  return str.substring(0, maxLength).trim();
}

// POST /api/feedback - Public submission (open to guests and users)
router.post('/', async (req, res) => {
  try {
    const { name, email, device, rating, whatWorked, whatConfused, bugFound, suggestion } = req.body;

    // 1. Strict Validation
    if (!name || rating === undefined || !device) {
      return res.status(400).json({ error: 'Name, rating, and device are required fields.' });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 10) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 10.' });
    }

    // 2. Sanitization & Length Limits (prevent DB bloat / DOS)
    const sanitizedName = sanitizeString(name, 100);
    const sanitizedEmail = sanitizeString(email || '', 100);
    const sanitizedDevice = sanitizeString(device, 100);
    const sanitizedWorked = sanitizeString(whatWorked || '', 1500);
    const sanitizedConfused = sanitizeString(whatConfused || '', 1500);
    const sanitizedBug = sanitizeString(bugFound || '', 1000);
    const sanitizedSuggestion = sanitizeString(suggestion || '', 1000);

    // 3. Database Insertion
    const feedback = await prisma.feedback.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail || null,
        device: sanitizedDevice,
        rating: Math.floor(numericRating),
        whatWorked: sanitizedWorked,
        whatConfused: sanitizedConfused,
        bugFound: sanitizedBug,
        suggestion: sanitizedSuggestion,
      },
    });

    res.status(201).json({ success: true, id: feedback.id });
  } catch (error: any) {
    console.error('[Feedback Submit Error]:', error.message || error);
    res.status(500).json({ error: 'Internal server error while saving feedback.' });
  }
});

import jwt from 'jsonwebtoken';
import { JWT_SECRET, ADMIN_SECRET, ADMIN_EMAILS } from '../config/env';

// GET /api/feedback - Restricted Developer/Admin Export Route
// Supports token auth + email matching, or fallback to X-Admin-Secret header
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    let isAuthorized = false;

    // Check 1: Fallback Secret Key Header (very useful for CLI scripts or owner override)
    const secretHeader = req.headers['x-admin-secret'] || req.query.adminSecret;
    if (secretHeader && secretHeader === ADMIN_SECRET) {
      isAuthorized = true;
    }

    // Check 2: Standard JWT Authentication + Email check
    if (!isAuthorized) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
          if (decoded && decoded.email && ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
            isAuthorized = true;
          }
        } catch (jwtErr) {
          // Token invalid/expired, continue to auth block below
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied. Administrator authorization required.' });
    }

    // Fetch and return feedback list ordered by date
    const feedbackList = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(feedbackList);
  } catch (error: any) {
    console.error('[Feedback Retrieve Error]:', error.message || error);
    res.status(500).json({ error: 'Internal server error while fetching feedback.' });
  }
});

export default router;
