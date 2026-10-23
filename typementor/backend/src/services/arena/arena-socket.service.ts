import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from '../../config/env';
import {
  ARENA_CONFIG,
  ClientSocketMessage,
  ServerSocketMessage,
  ArenaClientEvent,
  ArenaServerEvent,
} from './arena.types';
import { ArenaPointsService } from './arena-points.service';
import { ArenaMatchService } from './arena-match.service';
import { ArenaScoringService } from './arena-scoring.service';
import { arenaTicketService } from './arena-ticket.service';

interface SocketSession {
  userId: string;
  email: string;
  matchId?: string;
  lastProgressTimestamp: number;
  lastSequenceNumber: number;
  messageWindowStart: number;
  messageCount: number;
  isAlive: boolean;
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // Non-browser clients or same-origin requests

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const DEFAULT_ALLOWED_ORIGINS = [
    'https://typementor-ai-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];

  if (
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes('*') ||
    DEFAULT_ALLOWED_ORIGINS.includes(origin)
  ) {
    return true;
  }

  try {
    const hostname = new URL(origin).hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isNgrok = hostname.endsWith('.ngrok-free.app') || hostname.endsWith('.ngrok.app');
    const isVercel = hostname.endsWith('.vercel.app');

    return isLocalhost || isNgrok || isVercel;
  } catch {
    return false;
  }
}

interface InFlightMatchState {
  matchId: string;
  status: string;
  passageText: string;
  startedAt: Date;
  maxDuration: number;
}

export class ArenaSocketService {
  private wss: WebSocketServer | null = null;
  private socketSessions = new Map<WebSocket, SocketSession>();
  private userSockets = new Map<string, Set<WebSocket>>();
  private matchRooms = new Map<string, Set<WebSocket>>();
  private matchTimers = new Map<string, NodeJS.Timeout>();
  private disconnectTimers = new Map<string, NodeJS.Timeout>(); // key: `${matchId}_${userId}`
  private inFlightMatches = new Map<string, InFlightMatchState>(); // In-memory hot state (0 DB queries during gameplay)
  private recoveryInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaClient,
    private pointsService: ArenaPointsService,
    private matchService: ArenaMatchService
  ) {}

  /**
   * Initializes the WebSocket server attached to the shared Express HTTP server.
   */
  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        if (url.pathname !== '/arena-ws') {
          return; // Let other handlers (or Vite HMR in dev) handle other paths
        }

        // 1. Origin verification (Audit A)
        const origin = request.headers.origin;
        if (origin && !isAllowedOrigin(origin)) {
          console.warn(`[Arena WS] Rejected upgrade from unauthorized origin: ${origin}`);
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // 2. Authentication: Single-use ticket (preferred) or token fallback
        const ticket = url.searchParams.get('ticket');
        let decoded: { id: string; email: string };

        if (ticket) {
          const ticketData = arenaTicketService.consumeTicket(ticket);
          if (!ticketData) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }
          decoded = { id: ticketData.userId, email: ticketData.email };
        } else {
          // Token query fallback (deprecated) or header subprotocol
          const token = url.searchParams.get('token') || (request.headers['sec-websocket-protocol'] as string);
          if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          try {
            decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
          } catch (err) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
          }
        }

        // 3. Complete upgrade
        this.wss?.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          this.handleConnection(ws, decoded.id, decoded.email);
        });
      } catch (err: any) {
        console.error('[Arena WS] Upgrade error:', err);
        socket.destroy();
      }
    });

    // 4. Run startup reconciliation and schedule periodic recovery sweeps (Audit D)
    this.matchService.reconcileStaleMatches().catch((err) => {
      console.warn('[Arena WS] Startup match reconciliation warning:', err.message);
    });

    this.recoveryInterval = setInterval(() => {
      this.matchService.reconcileStaleMatches().catch(() => {});
    }, 60 * 1000);
    if (this.recoveryInterval.unref) {
      this.recoveryInterval.unref();
    }

    // 5. Heartbeat sweeper: terminate dead/unresponsive sockets every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      for (const [ws, session] of this.socketSessions.entries()) {
        if (!session.isAlive) {
          try {
            ws.terminate();
          } catch {}
          continue;
        }
        session.isAlive = false;
        try {
          ws.ping();
        } catch {}
      }
    }, 30 * 1000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }

    console.log('✅ Arena WebSocket server initialized on /arena-ws');
  }

  private handleConnection(ws: WebSocket, userId: string, email: string): void {
    // Enforce max 5 concurrent sockets per user to prevent connection exhaustion at 400K scale
    const existingSockets = this.userSockets.get(userId);
    if (existingSockets && existingSockets.size >= 5) {
      const oldest = existingSockets.values().next().value;
      if (oldest) {
        try {
          oldest.close(4000, 'Exceeded max concurrent connections per account');
        } catch {}
      }
    }

    const session: SocketSession = {
      userId,
      email,
      lastProgressTimestamp: 0,
      lastSequenceNumber: 0,
      messageWindowStart: Date.now(),
      messageCount: 0,
      isAlive: true,
    };

    this.socketSessions.set(ws, session);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);

    // Register pong handler to keep connection alive
    ws.on('pong', () => {
      session.isAlive = true;
    });

    // Send initial handshake confirmation
    this.send(ws, 'PONG', { message: 'Authenticated successfully', userId });

    ws.on('message', async (raw: any) => {
      try {
        // Enforce maximum payload size (16KB)
        if (raw.length > 16384) {
          this.send(ws, 'ERROR', { message: 'Message payload exceeds 16KB limit' });
          return;
        }

        // Socket-level rate limiter: max 25 messages per second
        const now = Date.now();
        if (now - session.messageWindowStart < 1000) {
          session.messageCount++;
          if (session.messageCount > 25) {
            this.send(ws, 'ERROR', { message: 'Rate limit exceeded: too many messages per second' });
            return;
          }
        } else {
          session.messageWindowStart = now;
          session.messageCount = 1;
        }

        const msg: ClientSocketMessage = JSON.parse(raw.toString());
        await this.handleClientMessage(ws, session, msg);
      } catch (err: any) {
        this.send(ws, 'ERROR', { message: err.message || 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws, session);
    });

    ws.on('error', (err: any) => {
      console.warn(`[Arena WS] Socket error for user ${userId}:`, err.message);
    });
  }

  private async handleClientMessage(
    ws: WebSocket,
    session: SocketSession,
    msg: ClientSocketMessage
  ): Promise<void> {
    const { event, payload, reqId } = msg;

    switch (event) {
      case 'PING':
        this.send(ws, 'PONG', { reqId, time: Date.now() });
        break;

      case 'JOIN_MATCH':
        await this.handleJoinRoom(ws, session, payload?.matchId, reqId);
        break;

      case 'READY_UP':
        await this.handleReadyUp(ws, session, payload?.matchId, reqId);
        break;

      case 'PROGRESS_UPDATE':
        await this.handleProgressUpdate(ws, session, payload);
        break;

      case 'SUBMIT_COMPLETION':
        await this.handleSubmitCompletion(ws, session, payload, reqId);
        break;

      case 'RESYNC_MATCH':
        await this.handleResync(ws, session, payload?.matchId);
        break;

      case 'LEAVE_MATCH':
        await this.handleLeaveMatch(ws, session, payload?.matchId);
        break;

      default:
        this.send(ws, 'ERROR', { message: `Unhandled event: ${event}`, resId: reqId });
    }
  }

  /**
   * Joins a WebSocket into a match broadcast room with authorization checks.
   */
  private async handleJoinRoom(
    ws: WebSocket,
    session: SocketSession,
    matchId: string,
    reqId?: string
  ): Promise<void> {
    if (!matchId) {
      this.send(ws, 'ERROR', { message: 'Match ID required', resId: reqId });
      return;
    }

    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: {
        participants: { include: { user: true } },
      },
    });

    if (!match) {
      this.send(ws, 'ERROR', { message: 'Match not found', resId: reqId });
      return;
    }

    // Verify user is a participant
    const isParticipant = match.participants.some((p) => p.userId === session.userId);
    if (!isParticipant) {
      this.send(ws, 'ERROR', { message: 'Unauthorized. You are not a participant in this match.', resId: reqId });
      return;
    }

    // Leave any previous room
    if (session.matchId && session.matchId !== matchId) {
      this.leaveMatchRoom(ws, session.matchId);
    }

    session.matchId = matchId;
    if (!this.matchRooms.has(matchId)) {
      this.matchRooms.set(matchId, new Set());
    }
    this.matchRooms.get(matchId)!.add(ws);

    // Cancel any active disconnect timer for this user in this match (reconnect recovery!)
    const disconnectKey = `${matchId}_${session.userId}`;
    const activeTimer = this.disconnectTimers.get(disconnectKey);
    if (activeTimer) {
      clearTimeout(activeTimer);
      this.disconnectTimers.delete(disconnectKey);
      await this.prisma.arenaParticipant.updateMany({
        where: { matchId, userId: session.userId },
        data: { isConnected: true },
      });
      this.broadcastToRoom(matchId, 'OPPONENT_RECONNECTED', { userId: session.userId }, ws);
    }

    const fullMatch = await this.matchService.getMatchDetails(matchId, session.userId);
    this.send(ws, 'MATCH_STATE', fullMatch, reqId, true);
  }

  /**
   * Marks a participant as ready. Starts synchronized countdown once both players are ready.
   */
  private async handleReadyUp(
    ws: WebSocket,
    session: SocketSession,
    matchId: string,
    reqId?: string
  ): Promise<void> {
    if (!matchId) return;

    await this.prisma.arenaParticipant.updateMany({
      where: { matchId, userId: session.userId },
      data: { isReady: true },
    });

    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match) return;

    this.broadcastToRoom(matchId, 'OPPONENT_READY', { userId: session.userId });

    // Check if both participants are now ready
    const allReady = match.participants.length === 2 && match.participants.every((p) => p.isReady);
    if (allReady && match.status === 'READY') {
      await this.startCountdown(matchId);
    }
  }

  /**
   * Starts a synchronized 5-second countdown on the server.
   */
  private async startCountdown(matchId: string): Promise<void> {
    await this.prisma.arenaMatch.update({
      where: { id: matchId },
      data: { status: 'COUNTDOWN' },
    });

    let seconds = ARENA_CONFIG.DEFAULT_COUNTDOWN_SECONDS;
    this.broadcastToRoom(matchId, 'COUNTDOWN_TICK', { secondsRemaining: seconds });

    const interval = setInterval(async () => {
      seconds -= 1;
      if (seconds > 0) {
        this.broadcastToRoom(matchId, 'COUNTDOWN_TICK', { secondsRemaining: seconds });
      } else {
        clearInterval(interval);
        this.matchTimers.delete(`countdown_${matchId}`);
        await this.startActiveMatch(matchId);
      }
    }, 1000);

    this.matchTimers.set(`countdown_${matchId}`, interval);
  }

  /**
   * Transitions match to ACTIVE, reveals passage, and sets authoritative deadline.
   */
  private async startActiveMatch(matchId: string): Promise<void> {
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + ARENA_CONFIG.DEFAULT_MAX_DURATION_SECONDS * 1000);

    const match = await this.prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        status: 'ACTIVE',
        startedAt,
      },
    });

    // Cache hot match state in memory for zero-database latency during real-time typing
    this.inFlightMatches.set(matchId, {
      matchId,
      status: 'ACTIVE',
      passageText: match.passageText,
      startedAt,
      maxDuration: match.maxDuration,
    });

    this.broadcastToRoom(matchId, 'MATCH_STARTED', {
      startedAt: startedAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      passageText: match.passageText,
      maxDuration: match.maxDuration,
    });

    // Schedule authoritative server-side deadline
    const deadlineTimeout = setTimeout(async () => {
      await this.handleDeadlineExpired(matchId);
    }, ARENA_CONFIG.DEFAULT_MAX_DURATION_SECONDS * 1000);

    this.matchTimers.set(`deadline_${matchId}`, deadlineTimeout);
  }

  /**
   * Validates and throttles in-flight progress updates and broadcasts to opponent.
   * Uses in-memory state for zero-database overhead in the critical typing loop.
   */
  private async handleProgressUpdate(
    ws: WebSocket,
    session: SocketSession,
    payload: { matchId: string; charsTyped: number; sequence?: number }
  ): Promise<void> {
    const now = Date.now();
    if (now - session.lastProgressTimestamp < ARENA_CONFIG.PROGRESS_THROTTLE_MS) {
      return; // Throttle excessive event flooding
    }
    session.lastProgressTimestamp = now;

    const { matchId, charsTyped } = payload;
    if (!matchId || typeof charsTyped !== 'number') return;

    let inFlight = this.inFlightMatches.get(matchId);
    if (!inFlight) {
      const match = await this.prisma.arenaMatch.findUnique({
        where: { id: matchId },
        select: { status: true, passageText: true, startedAt: true, maxDuration: true },
      });
      if (!match || match.status !== 'ACTIVE' || !match.startedAt) return;
      inFlight = {
        matchId,
        status: match.status,
        passageText: match.passageText,
        startedAt: match.startedAt,
        maxDuration: match.maxDuration,
      };
      this.inFlightMatches.set(matchId, inFlight);
    }

    if (inFlight.status !== 'ACTIVE') return;

    const evalResult = ArenaScoringService.evaluateProgress(
      inFlight.passageText,
      inFlight.startedAt,
      charsTyped,
      0,
      new Date(now)
    );

    if (!evalResult.isValid) return;

    // Broadcast snapshot to opponent instantly (0 DB queries in the hot path!)
    this.broadcastToRoom(
      matchId,
      'OPPONENT_PROGRESS',
      {
        userId: session.userId,
        progressPercent: evalResult.progressPercent,
        charsTyped: evalResult.correctChars,
        wpm: evalResult.wpm,
        accuracy: evalResult.accuracy,
      },
      ws
    );
  }

  /**
   * Authoritatively evaluates final completion submission.
   */
  private async handleSubmitCompletion(
    ws: WebSocket,
    session: SocketSession,
    payload: { matchId: string; submittedText: string },
    reqId?: string
  ): Promise<void> {
    const { matchId, submittedText } = payload;
    if (!matchId) return;

    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match || match.status !== 'ACTIVE' || !match.startedAt) {
      this.send(ws, 'ERROR', { message: 'Match is not actively running', resId: reqId });
      return;
    }

    const completedAt = new Date();
    const finalScore = ArenaScoringService.evaluateFinalSubmission(
      match.passageText,
      submittedText || '',
      match.startedAt,
      completedAt
    );

    // Save participant final score
    await this.prisma.arenaParticipant.updateMany({
      where: { matchId, userId: session.userId },
      data: {
        charsTyped: match.passageText.length,
        progressPercent: 100,
        wpm: finalScore.wpm,
        accuracy: finalScore.accuracy,
        completedAt,
        completionTimeMs: finalScore.completionTimeMs,
        outcome: 'WIN',
      },
    });

    // Check if match is already settled by opponent
    if (match.winnerId) {
      // Opponent already won; mark current player as LOSS
      await this.prisma.arenaParticipant.updateMany({
        where: { matchId, userId: session.userId },
        data: { outcome: 'LOSS' },
      });
      return;
    }

    // Current player is the first to finish! Declare winner
    const winnerId = session.userId;
    const opponent = match.participants.find((p) => p.userId !== winnerId);

    if (opponent) {
      await this.prisma.arenaParticipant.updateMany({
        where: { matchId, userId: opponent.userId },
        data: { outcome: 'LOSS' },
      });
    }

    // Clean up timers
    this.clearMatchTimers(matchId);

    // Concurrently update match and settle points
    await this.prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        status: 'FINISHED',
        winnerId,
        isTie: false,
        finishedAt: completedAt,
      },
    });

    await this.pointsService.settleWinner(matchId, winnerId, match.stakeAmount);

    const fullMatch = await this.matchService.getMatchDetails(matchId, session.userId);
    this.broadcastToRoom(matchId, 'MATCH_FINISHED', fullMatch);
  }

  /**
   * Handles timeout when 120s server deadline expires without full completion.
   */
  private async handleDeadlineExpired(matchId: string): Promise<void> {
    const match = await this.prisma.arenaMatch.findUnique({
      where: { id: matchId },
      include: { participants: true },
    });

    if (!match || match.status !== 'ACTIVE') return;

    this.clearMatchTimers(matchId);

    const [p1, p2] = match.participants;
    let winnerId: string | null = null;
    let isTie = false;

    if (p1 && p2) {
      if (p1.progressPercent > p2.progressPercent) {
        winnerId = p1.userId;
      } else if (p2.progressPercent > p1.progressPercent) {
        winnerId = p2.userId;
      } else {
        // Equal progress: tie-break by higher WPM
        if (p1.wpm > p2.wpm) {
          winnerId = p1.userId;
        } else if (p2.wpm > p1.wpm) {
          winnerId = p2.userId;
        } else {
          isTie = true;
        }
      }
    } else if (p1) {
      winnerId = p1.userId;
    }

    await this.prisma.arenaMatch.update({
      where: { id: matchId },
      data: {
        status: 'FINISHED',
        winnerId,
        isTie,
        finishedAt: new Date(),
      },
    });

    if (isTie) {
      await this.pointsService.refundMatchStakes(matchId, 'TIE');
    } else if (winnerId) {
      await this.pointsService.settleWinner(matchId, winnerId, match.stakeAmount);
    }

    const fullMatch = await this.matchService.getMatchDetails(matchId, winnerId || '');
    this.broadcastToRoom(matchId, 'MATCH_FINISHED', fullMatch);
  }

  /**
   * Handles graceful disconnect with a 15-second reconnect grace period.
   */
  private handleDisconnection(ws: WebSocket, session: SocketSession): void {
    this.socketSessions.delete(ws);
    const userSet = this.userSockets.get(session.userId);
    if (userSet) {
      userSet.delete(ws);
      if (userSet.size === 0) this.userSockets.delete(session.userId);
    }

    const matchId = session.matchId;
    if (!matchId) return;

    this.leaveMatchRoom(ws, matchId);

    // Audit F: Check if the user has any remaining active sockets in this match room (multi-socket/tab support)
    const matchRoom = this.matchRooms.get(matchId);
    const hasRemainingRoomSocket = matchRoom && Array.from(matchRoom).some(
      (socket) => this.socketSessions.get(socket)?.userId === session.userId
    );

    if (hasRemainingRoomSocket) {
      // User is still connected to the match room via another socket/tab; do not trigger disconnect grace
      return;
    }

    // Notify room of disconnection and begin grace period
    this.prisma.arenaMatch
      .findUnique({
        where: { id: matchId },
        select: { status: true, stakeAmount: true, participants: true },
      })
      .then((match) => {
        if (!match || !['ACTIVE', 'READY', 'COUNTDOWN'].includes(match.status)) return;

        // If disconnected during countdown, pause/cancel
        if (match.status === 'COUNTDOWN') {
          this.clearMatchTimers(matchId);
          this.prisma.arenaMatch
            .update({ where: { id: matchId }, data: { status: 'READY' } })
            .catch(() => {});
          this.broadcastToRoom(matchId, 'MATCH_CANCELLED', {
            reason: 'Countdown aborted: Player disconnected before start',
          });
          return;
        }

        if (match.status === 'ACTIVE') {
          this.broadcastToRoom(matchId, 'OPPONENT_DISCONNECTED', {
            userId: session.userId,
            reconnectGracePeriodMs: ARENA_CONFIG.RECONNECT_GRACE_PERIOD_MS,
          });

          const disconnectKey = `${matchId}_${session.userId}`;
          const timer = setTimeout(async () => {
            this.disconnectTimers.delete(disconnectKey);
            // Grace period expired! Award abandonment win to the remaining player
            const currentMatch = await this.prisma.arenaMatch.findUnique({
              where: { id: matchId },
              include: { participants: true },
            });

            if (!currentMatch || currentMatch.status !== 'ACTIVE') return;

            const remaining = currentMatch.participants.find((p) => p.userId !== session.userId);
            if (remaining) {
              await this.prisma.arenaParticipant.updateMany({
                where: { matchId, userId: session.userId },
                data: { outcome: 'ABANDONED' },
              });
              await this.prisma.arenaParticipant.updateMany({
                where: { matchId, userId: remaining.userId },
                data: { outcome: 'WIN' },
              });

              await this.prisma.arenaMatch.update({
                where: { id: matchId },
                data: {
                  status: 'FINISHED',
                  winnerId: remaining.userId,
                  finishedAt: new Date(),
                },
              });

              await this.pointsService.settleWinner(matchId, remaining.userId, currentMatch.stakeAmount);

              const full = await this.matchService.getMatchDetails(matchId, remaining.userId);
              this.broadcastToRoom(matchId, 'MATCH_FINISHED', full);
            }
          }, ARENA_CONFIG.RECONNECT_GRACE_PERIOD_MS);

          this.disconnectTimers.set(disconnectKey, timer);
        }
      })
      .catch((err) => console.warn('[Arena WS] Disconnect handler error:', err.message));
  }

  private async handleResync(ws: WebSocket, session: SocketSession, matchId: string): Promise<void> {
    if (!matchId) return;
    try {
      const match = await this.matchService.getMatchDetails(matchId, session.userId);
      this.send(ws, 'MATCH_STATE', match);
    } catch (err: any) {
      this.send(ws, 'ERROR', { message: err.message });
    }
  }

  private async handleLeaveMatch(ws: WebSocket, session: SocketSession, matchId: string): Promise<void> {
    if (matchId) {
      this.leaveMatchRoom(ws, matchId);
      session.matchId = undefined;
    }
  }

  private leaveMatchRoom(ws: WebSocket, matchId: string): void {
    const room = this.matchRooms.get(matchId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) this.matchRooms.delete(matchId);
    }
  }

  private clearMatchTimers(matchId: string): void {
    this.inFlightMatches.delete(matchId);
    const cd = this.matchTimers.get(`countdown_${matchId}`);
    if (cd) {
      clearInterval(cd);
      this.matchTimers.delete(`countdown_${matchId}`);
    }
    const dl = this.matchTimers.get(`deadline_${matchId}`);
    if (dl) {
      clearTimeout(dl);
      this.matchTimers.delete(`deadline_${matchId}`);
    }
  }

  private send(
    ws: WebSocket,
    event: ArenaServerEvent,
    payload?: any,
    resId?: string,
    ok = true
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      const msg: ServerSocketMessage = {
        event,
        payload,
        resId,
        ok,
        timestamp: new Date().toISOString(),
      };
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcastToRoom(
    matchId: string,
    event: ArenaServerEvent,
    payload?: any,
    excludeSocket?: WebSocket
  ): void {
    const room = this.matchRooms.get(matchId);
    if (!room) return;

    for (const client of room) {
      if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
        this.send(client, event, payload);
      }
    }
  }

  /**
   * Gracefully shuts down all active match timers, intervals, and sockets.
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }

    for (const timer of this.matchTimers.values()) {
      clearTimeout(timer);
    }
    this.matchTimers.clear();

    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();

    for (const ws of this.socketSessions.keys()) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch {}
    }
    this.socketSessions.clear();
    this.userSockets.clear();
    this.matchRooms.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}
