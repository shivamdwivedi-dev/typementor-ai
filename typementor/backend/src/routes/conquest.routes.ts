import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import * as conquestController from '../controllers/conquest.controller';
import { resolveClientIp } from '../app';

const router = Router();

// Rate limiter for match actions (30 actions/min)
const conquestActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many match actions. Please wait a moment before trying again.' },
});

// Require authentication for all Conquest operations
router.use((req: Request, res: Response, next: NextFunction) => {
  authenticateToken(req as AuthRequest, res, next);
});

// Ticket-granting endpoint for secure WebSocket authentication
router.post('/ws-ticket', (req: Request, res: Response, next: NextFunction) => {
  conquestController.getWsTicket(req as AuthRequest, res).catch(next);
});
router.post('/ticket', (req: Request, res: Response, next: NextFunction) => {
  conquestController.getWsTicket(req as AuthRequest, res).catch(next);
});

// Match lifecycle endpoints
router.get('/active', (req: Request, res: Response, next: NextFunction) => {
  conquestController.getActiveMatch(req as AuthRequest, res).catch(next);
});

router.post('/matches', conquestActionLimiter, (req: Request, res: Response, next: NextFunction) => {
  conquestController.createMatch(req as AuthRequest, res).catch(next);
});

router.post('/matches/join', conquestActionLimiter, (req: Request, res: Response, next: NextFunction) => {
  conquestController.joinMatch(req as AuthRequest, res).catch(next);
});

router.get('/matches/:id', (req: Request, res: Response, next: NextFunction) => {
  conquestController.getMatch(req as AuthRequest, res).catch(next);
});

router.post('/matches/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  conquestController.cancelMatch(req as AuthRequest, res).catch(next);
});

export default router;
