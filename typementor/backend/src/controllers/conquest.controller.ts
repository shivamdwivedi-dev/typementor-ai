import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../app';
import { ConquestMatchService } from '../services/conquest/conquest-match.service';
import { arenaTicketService } from '../services/arena/arena-ticket.service';
import { getConquestSocketService } from '../services/conquest/conquest-socket.service';

const conquestMatchService = new ConquestMatchService(prisma);

export async function getWsTicket(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const email = req.user?.email || 'user@typementor.in';

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: user session required' });
    return;
  }

  const { ticket, expiresIn } = arenaTicketService.issueTicket(userId, email);
  res.status(200).json({ ticket, expiresIn });
}

export async function createMatch(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const match = await conquestMatchService.createMatch(userId, {
      mapSeed: req.body?.mapSeed,
      idempotencyKey: req.body?.idempotencyKey,
    });
    res.status(201).json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create Word Conquest match' });
  }
}

export async function joinMatch(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const matchCode = req.body?.matchCode;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!matchCode || typeof matchCode !== 'string') {
    res.status(400).json({ error: 'Match code is required' });
    return;
  }

  try {
    const match = await conquestMatchService.joinMatch(userId, matchCode);
    const socketService = getConquestSocketService();
    if (socketService) {
      socketService.notifyMatchUpdated(match.id).catch(() => {});
    }
    res.status(200).json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to join Word Conquest match' });
  }
}

export async function getMatch(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const matchId = req.params?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const match = await conquestMatchService.getMatchDetails(matchId, userId);
    res.status(200).json(match);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Match not found' });
  }
}

export async function getActiveMatch(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const match = await conquestMatchService.getActiveMatchForUser(userId);
    res.status(200).json({ match });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve active match' });
  }
}

export async function cancelMatch(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const matchId = req.params?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const match = await conquestMatchService.cancelMatch(matchId, userId);
    res.status(200).json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to cancel match' });
  }
}
