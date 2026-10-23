import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import * as arenaController from '../controllers/arena.controller';
import { resolveClientIp } from '../app';

const router = Router();

// Rate limiter for match creation / joining actions (30 actions/min)
const arenaActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientIp,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many match actions. Please wait a moment before trying again.' },
});

// Require authentication for all Arena operations
router.use((req: Request, res: Response, next: NextFunction) => {
  authenticateToken(req as AuthRequest, res, next);
});

// Ticket-granting endpoint for secure WebSocket authentication (Audit A)
router.post('/ws-ticket', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getWsTicket(req as AuthRequest, res).catch(next);
});
router.post('/ticket', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getWsTicket(req as AuthRequest, res).catch(next);
});

router.get('/balance', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getBalance(req as AuthRequest, res).catch(next);
});

router.get('/history', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getMatchHistory(req as AuthRequest, res).catch(next);
});

router.get('/open', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getOpenMatches(req as AuthRequest, res).catch(next);
});

router.get('/active', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getActiveMatch(req as AuthRequest, res).catch(next);
});

router.post('/matches', arenaActionLimiter, (req: Request, res: Response, next: NextFunction) => {
  arenaController.createMatch(req as AuthRequest, res).catch(next);
});

router.post('/matches/join', arenaActionLimiter, (req: Request, res: Response, next: NextFunction) => {
  arenaController.joinMatch(req as AuthRequest, res).catch(next);
});

router.get('/matches/:id', (req: Request, res: Response, next: NextFunction) => {
  arenaController.getMatch(req as AuthRequest, res).catch(next);
});

router.post('/matches/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
  arenaController.cancelMatch(req as AuthRequest, res).catch(next);
});

export default router;
