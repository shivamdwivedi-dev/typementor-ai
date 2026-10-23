import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../app';
import { ArenaPointsService } from '../services/arena/arena-points.service';
import { ArenaMatchService } from '../services/arena/arena-match.service';
import { arenaTicketService } from '../services/arena/arena-ticket.service';

export const getPointsService = () => new ArenaPointsService(prisma);
export const getMatchService = () => new ArenaMatchService(prisma, getPointsService());

export const getWsTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const email = req.user?.email || '';
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { ticket, expiresIn } = arenaTicketService.issueTicket(userId, email);
    res.json({ ok: true, ticket, expiresIn });
  } catch (err: any) {
    console.error('[Arena Controller] getWsTicket error:', err);
    res.status(500).json({ error: 'Failed to generate WebSocket ticket' });
  }
};

export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const balance = await getPointsService().getOrCreateUserBalance(userId);
    res.json({ balance });
  } catch (err: any) {
    console.error('[Arena Controller] getBalance error:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve Arena Points balance' });
  }
};

export const getMatchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

    const result = await getMatchService().getUserMatchHistory(userId, limit, offset);
    res.json(result);
  } catch (err: any) {
    console.error('[Arena Controller] getMatchHistory error:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve match history' });
  }
};

export const getOpenMatches = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const matches = await getMatchService().getOpenWaitingMatches(userId, limit);
    res.json({ matches });
  } catch (err: any) {
    console.error('[Arena Controller] getOpenMatches error:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve open matches' });
  }
};

export const createMatch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { stakeAmount, passageCategory, passageId } = req.body;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

    const match = await getMatchService().createMatch(userId, {
      stakeAmount: typeof stakeAmount === 'number' ? stakeAmount : 0,
      passageCategory,
      passageId,
      idempotencyKey,
    });

    res.status(201).json({ match });
  } catch (err: any) {
    console.error('[Arena Controller] createMatch error:', err);
    res.status(400).json({ error: err.message || 'Failed to create Arena match' });
  }
};

export const joinMatch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { matchCode, matchId } = req.body;
    const query = (matchCode || matchId || req.params.id || '').trim();

    if (!query) {
      return res.status(400).json({ error: 'Match code or match ID required' });
    }

    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;
    const match = await getMatchService().joinMatch(userId, query, idempotencyKey);

    res.json({ match });
  } catch (err: any) {
    console.error('[Arena Controller] joinMatch error:', err);
    res.status(400).json({ error: err.message || 'Failed to join Arena match' });
  }
};

export const getMatch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const matchId = req.params.id;
    const match = await getMatchService().getMatchDetails(matchId, userId);
    res.json({ match });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Match not found' });
  }
};

export const getActiveMatch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const match = await getMatchService().getActiveMatch(userId);
    res.json({ match });
  } catch (err: any) {
    console.error('[Arena Controller] getActiveMatch error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch active match' });
  }
};

export const cancelMatch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const matchId = req.params.id;
    await getMatchService().cancelMatch(userId, matchId, req.body.reason);
    res.json({ success: true, message: 'Match successfully cancelled and stakes refunded' });
  } catch (err: any) {
    console.error('[Arena Controller] cancelMatch error:', err);
    res.status(400).json({ error: err.message || 'Failed to cancel match' });
  }
};
