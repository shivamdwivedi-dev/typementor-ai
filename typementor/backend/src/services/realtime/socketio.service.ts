import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from '../../config/env';
import { arenaTicketService } from '../arena/arena-ticket.service';
import { isAllowedOrigin } from '../arena/arena-socket.service';
import { ArenaPointsService } from '../arena/arena-points.service';
import { ArenaMatchService } from '../arena/arena-match.service';
import { ConquestMatchService } from '../conquest/conquest-match.service';
import { ConquestCombatService } from '../conquest/conquest-combat.service';

let socketIOServiceInstance: SocketIOService | null = null;

export function getSocketIOService(): SocketIOService | null {
  return socketIOServiceInstance;
}

export class SocketIOService {
  private io: SocketIOServer | null = null;
  private arenaNamespace: Namespace | null = null;
  private conquestNamespace: Namespace | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  // Track match timers and in-flight state
  private arenaMatchTimers = new Map<string, NodeJS.Timeout>();
  private arenaDisconnectTimers = new Map<string, NodeJS.Timeout>();
  private conquestDisconnectTimers = new Map<string, NodeJS.Timeout>();
  private recoverySweepInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaClient,
    private arenaPointsService: ArenaPointsService,
    private arenaMatchService: ArenaMatchService,
    private conquestMatchService: ConquestMatchService
  ) {
    socketIOServiceInstance = this;
  }

  /**
   * Initializes Socket.io attached to the existing Express HTTP server.
   * Features:
   * 1. Connection State Recovery (buffers missed packets during Wi-Fi drops)
   * 2. HTTP Long-Polling Fallback (firewall & mobile friendly)
   * 3. Redis Adapter with automatic graceful in-memory fallback
   * 4. Enterprise Client Acknowledgements (ack callbacks)
   */
  public init(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // HTTP Long-polling fallback
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Unauthorized origin'));
          }
        },
        credentials: true,
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes packet buffer
        skipMiddlewares: true,
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      maxHttpBufferSize: 1e6, // 1MB payload limit
    });

    // ── Distributed Redis Adapter Support ──────────────────────────────────────
    if (process.env.REDIS_URL) {
      try {
        this.pubClient = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            return Math.min(times * 100, 3000);
          },
        });
        this.subClient = this.pubClient.duplicate();

        this.pubClient.on('error', (err) => console.warn('[Socket.io Redis Pub Error]:', err.message));
        this.subClient.on('error', (err) => console.warn('[Socket.io Redis Sub Error]:', err.message));

        this.io.adapter(createAdapter(this.pubClient, this.subClient));
        console.log('✅ Socket.io Redis Adapter enabled via REDIS_URL');
      } catch (err: any) {
        console.warn('⚠️  Could not attach Redis adapter, running in-memory fallback:', err?.message);
      }
    } else {
      console.log('ℹ️  Socket.io running with high-performance in-memory adapter (set REDIS_URL for multi-node clustering)');
    }

    // ── Setup Namespaces with Auth Middlewares ─────────────────────────────────
    this.arenaNamespace = this.io.of('/arena');
    this.conquestNamespace = this.io.of('/conquest');

    this.setupArenaNamespace(this.arenaNamespace);
    this.setupConquestNamespace(this.conquestNamespace);

    // Periodic sweep for abandoned / timed out matches
    this.recoverySweepInterval = setInterval(() => {
      this.arenaMatchService.reconcileStaleMatches().catch(() => {});
      this.conquestMatchService.reconcileStaleMatches().catch(() => {});
    }, 60 * 1000);
    if (this.recoverySweepInterval.unref) {
      this.recoverySweepInterval.unref();
    }

    console.log('✅ Socket.io real-time engine initialized with Connection State Recovery & HTTP Polling fallback');
    return this.io;
  }

  // ── Arena Duel (/arena) Namespace ──────────────────────────────────────────
  private setupArenaNamespace(ns: Namespace): void {
    ns.use((socket, next) => this.authenticateSocket(socket, next));

    ns.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const email = socket.data.email;

      // Handle Connection State Recovery
      if (socket.recovered) {
        console.log(`[Arena Socket.io] Socket ${socket.id} recovered session for user ${userId}`);
      }

      // ── Event: PING ──
      socket.on('PING', (payload, ack) => {
        const response = { time: Date.now() };
        if (typeof ack === 'function') ack(response);
        else socket.emit('PONG', response);
      });

      // ── Event: JOIN_MATCH ──
      socket.on('JOIN_MATCH', async (payload: { matchId: string }, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId;
          if (!matchId) {
            const errRes = { success: false, error: 'Match ID is required.' };
            if (typeof ack === 'function') ack(errRes);
            return socket.emit('ERROR', { message: errRes.error });
          }

          const match = await this.prisma.arenaMatch.findUnique({
            where: { id: matchId },
            include: { participants: { include: { user: true } } },
          });

          if (!match) {
            const errRes = { success: false, error: 'Match not found.' };
            if (typeof ack === 'function') ack(errRes);
            return socket.emit('ERROR', { message: errRes.error });
          }

          const isParticipant = match.participants.some((p) => p.userId === userId);
          if (!isParticipant) {
            const errRes = { success: false, error: 'Unauthorized: You are not a registered participant in this match.' };
            if (typeof ack === 'function') ack(errRes);
            return socket.emit('ERROR', { message: errRes.error });
          }

          // Join Socket.io room
          socket.join(matchId);
          socket.data.matchId = matchId;

          // Clear any active disconnect timer for this user in this match
          const disconnectKey = `${matchId}_${userId}`;
          const activeTimer = this.arenaDisconnectTimers.get(disconnectKey);
          if (activeTimer) {
            clearTimeout(activeTimer);
            this.arenaDisconnectTimers.delete(disconnectKey);
            await this.prisma.arenaParticipant.updateMany({
              where: { matchId, userId },
              data: { isConnected: true },
            });
            socket.to(matchId).emit('OPPONENT_RECONNECTED', { userId });
          }

          const fullMatch = await this.arenaMatchService.getMatchDetails(matchId, userId);

          // Guaranteed Acknowledgement callback
          if (typeof ack === 'function') {
            ack({ success: true, match: fullMatch });
          }

          // Emit state to joiner
          socket.emit('MATCH_STATE', fullMatch);

          // Broadcast to opponent in the room
          socket.to(matchId).emit('MATCH_STATE', fullMatch);
          socket.to(matchId).emit('OPPONENT_JOINED', { userId, match: fullMatch });
        } catch (err: any) {
          const errMsg = err?.message || 'Failed to join match room';
          if (typeof ack === 'function') ack({ success: false, error: errMsg });
          socket.emit('ERROR', { message: errMsg });
        }
      });

      // ── Event: READY_UP ──
      socket.on('READY_UP', async (payload: { matchId: string }, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;

          await this.prisma.arenaParticipant.updateMany({
            where: { matchId, userId },
            data: { isReady: true },
          });

          const match = await this.prisma.arenaMatch.findUnique({
            where: { id: matchId },
            include: { participants: true },
          });

          if (!match) return;

          if (typeof ack === 'function') ack({ success: true });

          socket.to(matchId).emit('OPPONENT_READY', { userId });

          const allReady = match.participants.length === 2 && match.participants.every((p) => p.isReady);
          if (allReady && (match.status === 'READY' || match.status === 'WAITING')) {
            await this.startArenaCountdown(matchId);
          }
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
        }
      });

      // ── Event: PROGRESS_UPDATE ──
      socket.on('PROGRESS_UPDATE', (payload: any, ack?: (res: any) => void) => {
        const matchId = payload?.matchId || socket.data.matchId;
        if (!matchId) return;

        // Volatile broadcast to opponent in the same room for 0 latency
        socket.volatile.to(matchId).emit('OPPONENT_PROGRESS', {
          userId,
          progressPercent: payload?.progressPercent ?? 0,
          charsTyped: payload?.charsTyped ?? 0,
          wpm: payload?.wpm ?? 0,
          accuracy: payload?.accuracy ?? 100,
          timestamp: Date.now(),
        });

        if (typeof ack === 'function') ack({ success: true });
      });

      // ── Event: SUBMIT_COMPLETION ──
      socket.on('SUBMIT_COMPLETION', async (payload: any, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;

          const match = await this.arenaMatchService.finishMatch(
            matchId,
            userId,
            payload.wpm,
            payload.accuracy,
            payload.completionTimeMs,
            payload.clientVerificationHash
          );

          if (typeof ack === 'function') ack({ success: true, match });

          ns.to(matchId).emit('MATCH_FINISHED', {
            matchId,
            winnerId: match.winnerId,
            isTie: match.isTie,
            match,
          });
          ns.to(matchId).emit('MATCH_STATE', match);
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
          socket.emit('ERROR', { message: err.message });
        }
      });

      // ── Event: RESYNC_MATCH ──
      socket.on('RESYNC_MATCH', async (payload: { matchId: string }, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;
          const fullMatch = await this.arenaMatchService.getMatchDetails(matchId, userId);
          if (typeof ack === 'function') ack({ success: true, match: fullMatch });
          socket.emit('MATCH_STATE', fullMatch);
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
        }
      });

      // ── Event: LEAVE_MATCH ──
      socket.on('LEAVE_MATCH', (payload: { matchId?: string }) => {
        const matchId = payload?.matchId || socket.data.matchId;
        if (matchId) {
          socket.leave(matchId);
          socket.data.matchId = null;
        }
      });

      // ── Disconnect Handling (30s Grace Period before Forfeit) ──
      socket.on('disconnect', (reason) => {
        const matchId = socket.data.matchId;
        if (!matchId) return;

        socket.to(matchId).emit('OPPONENT_DISCONNECTED', {
          userId,
          gracePeriodSeconds: 30,
          reason,
        });

        const disconnectKey = `${matchId}_${userId}`;
        if (this.arenaDisconnectTimers.has(disconnectKey)) {
          clearTimeout(this.arenaDisconnectTimers.get(disconnectKey)!);
        }

        const timer = setTimeout(async () => {
          this.arenaDisconnectTimers.delete(disconnectKey);
          try {
            const currentMatch = await this.prisma.arenaMatch.findUnique({
              where: { id: matchId },
              include: { participants: true },
            });

            if (currentMatch && (currentMatch.status === 'ACTIVE' || currentMatch.status === 'COUNTDOWN')) {
              const opponent = currentMatch.participants.find((p) => p.userId !== userId);
              if (opponent) {
                const finishedMatch = await this.arenaMatchService.finishMatch(
                  matchId,
                  opponent.userId,
                  opponent.wpm || 0,
                  opponent.accuracy || 100,
                  0
                );
                ns.to(matchId).emit('MATCH_FINISHED', {
                  matchId,
                  winnerId: opponent.userId,
                  isTie: false,
                  reason: 'FORFEIT_DISCONNECT',
                  match: finishedMatch,
                });
              }
            }
          } catch (err: any) {
            console.warn('[Arena Socket.io] Disconnect forfeit error:', err?.message);
          }
        }, 30 * 1000);

        this.arenaDisconnectTimers.set(disconnectKey, timer);
      });
    });
  }

  // ── Word Conquest (/conquest) Namespace ────────────────────────────────────
  private setupConquestNamespace(ns: Namespace): void {
    ns.use((socket, next) => this.authenticateSocket(socket, next));

    ns.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;

      if (socket.recovered) {
        console.log(`[Conquest Socket.io] Recovered session for user ${userId}`);
      }

      socket.on('CONQUEST_PING', (payload, ack) => {
        const res = { time: Date.now() };
        if (typeof ack === 'function') ack(res);
        else socket.emit('CONQUEST_PONG', res);
      });

      socket.on('CONQUEST_JOIN_ROOM', async (payload: { matchId: string }, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId;
          if (!matchId) {
            if (typeof ack === 'function') ack({ success: false, error: 'Match ID required' });
            return;
          }

          const match = await this.conquestMatchService.getMatchDetails(matchId);
          if (!match) {
            if (typeof ack === 'function') ack({ success: false, error: 'Match not found' });
            return;
          }

          socket.join(matchId);
          socket.data.matchId = matchId;

          // Clear any disconnect timer
          const disconnectKey = `conquest_${matchId}_${userId}`;
          const activeTimer = this.conquestDisconnectTimers.get(disconnectKey);
          if (activeTimer) {
            clearTimeout(activeTimer);
            this.conquestDisconnectTimers.delete(disconnectKey);
            socket.to(matchId).emit('CONQUEST_PLAYER_RECONNECTED', { userId });
          }

          if (typeof ack === 'function') ack({ success: true, match });

          socket.emit('CONQUEST_ROOM_JOINED', { match });
          socket.to(matchId).emit('CONQUEST_PLAYER_JOINED', { match, userId });
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
          socket.emit('CONQUEST_ERROR', { message: err.message });
        }
      });

      socket.on('CONQUEST_READY', async (payload: { matchId: string }, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;

          await this.prisma.conquestParticipant.updateMany({
            where: { matchId, userId },
            data: { isReady: true },
          });

          const match = await this.conquestMatchService.getMatchDetails(matchId);
          if (typeof ack === 'function') ack({ success: true });

          socket.to(matchId).emit('CONQUEST_PLAYER_READY', { userId });

          if (match.participants.length === 2 && match.participants.every((p) => p.isReady)) {
            await this.startConquestCountdown(matchId);
          }
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
        }
      });

      socket.on('CONQUEST_ATTACK_CELL', async (payload: any, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;

          const challenge = await ConquestCombatService.initiateAttack(
            this.prisma,
            matchId,
            userId,
            payload.targetCellKey
          );

          if (typeof ack === 'function') ack({ success: true, challenge });

          socket.emit('CONQUEST_CHALLENGE_ISSUED', { challenge });
          socket.to(matchId).emit('CONQUEST_OPPONENT_ATTACKING', {
            targetCellKey: payload.targetCellKey,
            attackerId: userId,
          });
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
          socket.emit('CONQUEST_ERROR', { message: err.message });
        }
      });

      socket.on('CONQUEST_SUBMIT_WORD', async (payload: any, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;

          const combatResult = await ConquestCombatService.submitCombatWord(
            this.prisma,
            matchId,
            userId,
            payload.targetCellKey,
            payload.typedWord,
            payload.completionTimeMs,
            payload.accuracy
          );

          if (typeof ack === 'function') ack({ success: true, combatResult });

          ns.to(matchId).emit('CONQUEST_CELL_CAPTURED', {
            matchId,
            targetCellKey: payload.targetCellKey,
            combatResult,
          });

          if (combatResult.isMatchDecided) {
            const finalMatch = await this.conquestMatchService.getMatchDetails(matchId);
            ns.to(matchId).emit('CONQUEST_MATCH_FINISHED', {
              match: finalMatch,
              reason: combatResult.victoryReason,
            });
          }
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
          socket.emit('CONQUEST_ERROR', { message: err.message });
        }
      });

      socket.on('CONQUEST_RESYNC', async (payload: { matchId: string }, ack?: (res: any) => void) => {
        try {
          const matchId = payload?.matchId || socket.data.matchId;
          if (!matchId) return;
          const match = await this.conquestMatchService.getMatchDetails(matchId);
          if (typeof ack === 'function') ack({ success: true, match });
          socket.emit('CONQUEST_ROOM_JOINED', { match });
        } catch (err: any) {
          if (typeof ack === 'function') ack({ success: false, error: err.message });
        }
      });

      socket.on('disconnect', (reason) => {
        const matchId = socket.data.matchId;
        if (!matchId) return;

        socket.to(matchId).emit('CONQUEST_PLAYER_DISCONNECTED', {
          userId,
          gracePeriodSeconds: 30,
          reason,
        });

        const disconnectKey = `conquest_${matchId}_${userId}`;
        const timer = setTimeout(async () => {
          this.conquestDisconnectTimers.delete(disconnectKey);
          try {
            const match = await this.conquestMatchService.getMatchDetails(matchId);
            if (match && match.status === 'ACTIVE') {
              const opponent = match.participants.find((p) => p.userId !== userId);
              if (opponent) {
                const finished = await this.conquestMatchService.finishMatch(
                  matchId,
                  opponent.userId,
                  'FORFEIT_DISCONNECT'
                );
                ns.to(matchId).emit('CONQUEST_MATCH_FINISHED', {
                  match: finished,
                  reason: 'FORFEIT_DISCONNECT',
                });
              }
            }
          } catch (err: any) {
            console.warn('[Conquest Socket.io] Disconnect forfeit error:', err?.message);
          }
        }, 30 * 1000);

        this.conquestDisconnectTimers.set(disconnectKey, timer);
      });
    });
  }

  // ── Synchronized Countdown Helpers ─────────────────────────────────────────
  private async startArenaCountdown(matchId: string): Promise<void> {
    await this.prisma.arenaMatch.update({
      where: { id: matchId },
      data: { status: 'COUNTDOWN' },
    });

    let count = 5;
    const interval = setInterval(async () => {
      this.arenaNamespace?.to(matchId).emit('COUNTDOWN_TICK', { secondsRemaining: count });
      count--;

      if (count < 0) {
        clearInterval(interval);
        this.arenaMatchTimers.delete(matchId);

        const updated = await this.prisma.arenaMatch.update({
          where: { id: matchId },
          data: { status: 'ACTIVE', startedAt: new Date() },
          include: { participants: { include: { user: true } } },
        });

        const fullMatch = await this.arenaMatchService.getMatchDetails(matchId, '');
        this.arenaNamespace?.to(matchId).emit('MATCH_STARTED', {
          matchId,
          startedAt: updated.startedAt,
          match: fullMatch,
        });
      }
    }, 1000);

    this.arenaMatchTimers.set(matchId, interval);
  }

  private async startConquestCountdown(matchId: string): Promise<void> {
    await this.prisma.conquestMatch.update({
      where: { id: matchId },
      data: { status: 'COUNTDOWN' },
    });

    let count = 5;
    const interval = setInterval(async () => {
      this.conquestNamespace?.to(matchId).emit('CONQUEST_COUNTDOWN_TICK', { secondsRemaining: count });
      count--;

      if (count < 0) {
        clearInterval(interval);
        const match = await this.prisma.conquestMatch.update({
          where: { id: matchId },
          data: { status: 'ACTIVE', startedAt: new Date() },
        });
        const fullMatch = await this.conquestMatchService.getMatchDetails(matchId);
        this.conquestNamespace?.to(matchId).emit('CONQUEST_MATCH_STARTED', { match: fullMatch });
      }
    }, 1000);
  }

  // ── Authentication Middleware ──────────────────────────────────────────────
  private authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
    try {
      const origin = socket.handshake.headers.origin;
      if (origin && !isAllowedOrigin(origin)) {
        return next(new Error('Unauthorized origin'));
      }

      const ticket = (socket.handshake.auth?.ticket || socket.handshake.query?.ticket) as string | undefined;
      if (ticket) {
        const ticketData = arenaTicketService.consumeTicket(ticket);
        if (!ticketData) {
          return next(new Error('Invalid or expired ticket'));
        }
        socket.data.userId = ticketData.userId;
        socket.data.email = ticketData.email;
        return next();
      }

      const token = (
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '')
      ) as string | undefined;

      if (!token) {
        return next(new Error('Authentication token or ticket required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      socket.data.userId = decoded.id;
      socket.data.email = decoded.email;
      next();
    } catch (err: any) {
      next(new Error(err.message || 'Authentication failed'));
    }
  }

  /**
   * Broadcasts proactive notifications from HTTP REST endpoints (e.g. participant joined via link).
   */
  public async notifyArenaMatchUpdated(matchId: string): Promise<void> {
    try {
      const fullMatch = await this.arenaMatchService.getMatchDetails(matchId, '');
      this.arenaNamespace?.to(matchId).emit('MATCH_STATE', fullMatch);
      this.arenaNamespace?.to(matchId).emit('OPPONENT_JOINED', { match: fullMatch });
    } catch (err: any) {
      console.warn(`[Socket.io] notifyArenaMatchUpdated error for ${matchId}:`, err?.message);
    }
  }

  public async notifyConquestMatchUpdated(matchId: string): Promise<void> {
    try {
      const fullMatch = await this.conquestMatchService.getMatchDetails(matchId);
      this.conquestNamespace?.to(matchId).emit('CONQUEST_ROOM_JOINED', { match: fullMatch });
      this.conquestNamespace?.to(matchId).emit('CONQUEST_PLAYER_JOINED', { match: fullMatch });
    } catch (err: any) {
      console.warn(`[Socket.io] notifyConquestMatchUpdated error for ${matchId}:`, err?.message);
    }
  }

  /**
   * Graceful shutdown of Socket.io connections & Redis clients.
   */
  public async shutdown(): Promise<void> {
    if (this.recoverySweepInterval) {
      clearInterval(this.recoverySweepInterval);
    }
    for (const timer of this.arenaMatchTimers.values()) clearTimeout(timer);
    for (const timer of this.arenaDisconnectTimers.values()) clearTimeout(timer);
    for (const timer of this.conquestDisconnectTimers.values()) clearTimeout(timer);

    try {
      if (this.pubClient) await this.pubClient.quit();
      if (this.subClient) await this.subClient.quit();
    } catch {}

    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => resolve());
      });
    }
  }
}
