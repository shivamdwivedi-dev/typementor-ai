import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from '../../config/env';
import {
  ConquestClientMessage,
  ConquestServerEvent,
  ConquestServerMessage,
  PersistedGridState,
  PlayerSlot,
} from './conquest.types';
import { isAllowedOrigin } from '../arena/arena-socket.service';
import { arenaTicketService } from '../arena/arena-ticket.service';
import { ConquestMatchService } from './conquest-match.service';
import { ConquestCombatService } from './conquest-combat.service';

interface ConquestSocketSession {
  userId: string;
  email: string;
  matchId?: string;
  lastProgressTimestamp: number;
  messageWindowStart: number;
  messageCount: number;
  isAlive: boolean;
}

let conquestSocketInstance: ConquestSocketService | null = null;

export function getConquestSocketService(): ConquestSocketService | null {
  return conquestSocketInstance;
}

export class ConquestSocketService {
  private wss: WebSocketServer | null = null;
  private socketSessions = new Map<WebSocket, ConquestSocketSession>();
  private userSockets = new Map<string, Set<WebSocket>>();
  private matchRooms = new Map<string, Set<WebSocket>>();
  private matchTimers = new Map<string, NodeJS.Timeout>();
  private disconnectTimers = new Map<string, NodeJS.Timeout>(); // key: `${matchId}_${userId}`
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconcileInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaClient,
    private matchService: ConquestMatchService
  ) {
    conquestSocketInstance = this;
  }

  /**
   * Proactively broadcasts state updates when a participant joins via HTTP REST API.
   */
  async notifyMatchUpdated(matchId: string): Promise<void> {
    try {
      const room = this.matchRooms.get(matchId);
      if (!room || room.size === 0) return;

      const match = await this.matchService.getMatchDetails(matchId);
      this.broadcastToRoom(matchId, 'CONQUEST_ROOM_JOINED', { match });
      this.broadcastToRoom(matchId, 'CONQUEST_PLAYER_JOINED', { match });
    } catch (err: any) {
      console.warn(`[Conquest WS] notifyMatchUpdated error for ${matchId}:`, err?.message);
    }
  }

  /**
   * Attaches the Word Conquest WebSocket server to the shared Node HTTP server on /conquest-ws.
   */
  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        if (url.pathname !== '/conquest-ws') {
          return; // Allow /arena-ws and other endpoints to handle their own upgrades
        }

        // 1. Origin verification
        const origin = request.headers.origin;
        if (origin && !isAllowedOrigin(origin)) {
          console.warn(`[Conquest WS] Unauthorized origin rejected: ${origin}`);
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        // 2. Authentication: Single-use ticket (preferred) or JWT token fallback
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
          const token =
            url.searchParams.get('token') || (request.headers['sec-websocket-protocol'] as string);
          if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          try {
            decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
          } catch {
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
        console.error('[Conquest WS] Upgrade error:', err);
        socket.destroy();
      }
    });

    // 4. Heartbeat: probe dead sockets every 30s
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

    // 5. Reconcile stale matches on boot and periodically every 10 minutes
    this.matchService.reconcileStaleMatches().catch((err) => {
      console.warn('[Conquest WS] Initial reconciliation error:', err.message);
    });

    this.reconcileInterval = setInterval(() => {
      this.matchService.reconcileStaleMatches().catch((err) => {
        console.warn('[Conquest WS] Periodic reconciliation error:', err.message);
      });
    }, 10 * 60 * 1000);

    if (this.reconcileInterval.unref) {
      this.reconcileInterval.unref();
    }

    console.log('✅ Word Conquest WebSocket server initialized on /conquest-ws');
  }

  private handleConnection(ws: WebSocket, userId: string, email: string): void {
    const session: ConquestSocketSession = {
      userId,
      email,
      lastProgressTimestamp: 0,
      messageWindowStart: Date.now(),
      messageCount: 0,
      isAlive: true,
    };

    this.socketSessions.set(ws, session);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(ws);

    ws.on('pong', () => {
      session.isAlive = true;
    });

    this.send(ws, 'CONQUEST_PONG', { message: 'Authenticated successfully', userId });

    ws.on('message', async (raw: any) => {
      try {
        // Enforce maximum payload size (16KB)
        if (raw.length > 16384) {
          this.send(ws, 'CONQUEST_ERROR', { message: 'Payload exceeds 16KB limit' });
          return;
        }

        // Socket rate limiter: max 25 msg/sec
        const now = Date.now();
        if (now - session.messageWindowStart < 1000) {
          session.messageCount++;
          if (session.messageCount > 25) {
            this.send(ws, 'CONQUEST_ERROR', { message: 'Rate limit exceeded (25 msg/sec max)' });
            return;
          }
        } else {
          session.messageWindowStart = now;
          session.messageCount = 1;
        }

        const parsed: ConquestClientMessage = JSON.parse(raw.toString());
        await this.handleClientEvent(ws, session, parsed);
      } catch (err: any) {
        this.send(ws, 'CONQUEST_ERROR', { message: err.message || 'Invalid socket message' });
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws, session);
    });

    ws.on('error', (err) => {
      console.warn(`[Conquest WS] Socket error for user ${userId}:`, err.message);
    });
  }

  private async handleClientEvent(
    ws: WebSocket,
    session: ConquestSocketSession,
    msg: ConquestClientMessage
  ): Promise<void> {
    const { type, payload, reqId } = msg;

    switch (type) {
      case 'CONQUEST_PING': {
        this.send(ws, 'CONQUEST_PONG', { timestamp: Date.now() }, reqId);
        break;
      }

      case 'CONQUEST_JOIN_ROOM': {
        await this.handleJoinRoom(ws, session, payload?.matchId, reqId);
        break;
      }

      case 'CONQUEST_READY': {
        await this.handlePlayerReady(ws, session, payload?.matchId, reqId);
        break;
      }

      case 'CONQUEST_ATTACK_START': {
        await this.handleAttackStart(
          ws,
          session,
          payload?.matchId,
          payload?.targetRow,
          payload?.targetCol,
          reqId
        );
        break;
      }

      case 'CONQUEST_ATTACK_PROGRESS': {
        await this.handleAttackProgress(ws, session, payload?.matchId, payload?.charsTyped);
        break;
      }

      case 'CONQUEST_CHALLENGE_SUBMIT': {
        await this.handleChallengeSubmit(
          ws,
          session,
          payload?.matchId,
          payload?.challengeId,
          payload?.submittedText,
          reqId
        );
        break;
      }

      default: {
        this.send(ws, 'CONQUEST_ERROR', { message: `Unknown event: ${type}` }, reqId);
      }
    }
  }

  private async handleJoinRoom(
    ws: WebSocket,
    session: ConquestSocketSession,
    matchId: string,
    reqId?: string
  ): Promise<void> {
    if (!matchId) {
      this.send(ws, 'CONQUEST_ERROR', { message: 'matchId is required' }, reqId);
      return;
    }

    const match = await this.matchService.getMatchDetails(matchId, session.userId);
    const isParticipant = match.participants.some((p) => p.userId === session.userId);

    if (!isParticipant) {
      this.send(ws, 'CONQUEST_ERROR', { message: 'Unauthorized: not a participant in this match' }, reqId);
      return;
    }

    session.matchId = matchId;

    if (!this.matchRooms.has(matchId)) {
      this.matchRooms.set(matchId, new Set());
    }
    this.matchRooms.get(matchId)!.add(ws);

    // Cancel 30-second disconnect forfeit timer if reconnecting within grace period
    const disconnectTimerKey = `${matchId}_${session.userId}`;
    const timer = this.disconnectTimers.get(disconnectTimerKey);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(disconnectTimerKey);
      this.broadcastToRoom(
        matchId,
        'CONQUEST_PLAYER_RECONNECTED',
        { userId: session.userId, matchId },
        ws
      );
    }

    this.send(ws, 'CONQUEST_ROOM_JOINED', { match }, reqId);
    // Broadcast updated match state and player arrival to the rest of the room
    this.broadcastToRoom(matchId, 'CONQUEST_ROOM_JOINED', { match }, ws);
    this.broadcastToRoom(matchId, 'CONQUEST_PLAYER_JOINED', { userId: session.userId, match }, ws);
  }

  private async handlePlayerReady(
    ws: WebSocket,
    session: ConquestSocketSession,
    matchId: string,
    reqId?: string
  ): Promise<void> {
    if (!matchId) return;

    const { match, isAllReady } = await this.matchService.setPlayerReady(matchId, session.userId);

    this.broadcastToRoom(matchId, 'CONQUEST_PLAYER_READY', {
      userId: session.userId,
      matchId,
    });

    if (isAllReady) {
      await this.startCountdown(matchId, match);
    }
  }

  /**
   * Synchronized 3-second countdown before activating conquest battle mode.
   * Gives both players explicit sensory and tactical hints.
   */
  private async startCountdown(matchId: string, match: any): Promise<void> {
    const timerKey = `countdown_${matchId}`;
    const existingTimer = this.matchTimers.get(timerKey);
    if (existingTimer) {
      clearInterval(existingTimer);
      this.matchTimers.delete(timerKey);
    }

    let seconds = 3;
    this.broadcastToRoom(matchId, 'CONQUEST_COUNTDOWN_TICK', { secondsRemaining: seconds });

    const interval = setInterval(async () => {
      seconds -= 1;
      if (seconds > 0) {
        this.broadcastToRoom(matchId, 'CONQUEST_COUNTDOWN_TICK', { secondsRemaining: seconds });
      } else {
        clearInterval(interval);
        this.matchTimers.delete(timerKey);
        this.broadcastToRoom(matchId, 'CONQUEST_MATCH_STARTED', {
          matchId,
          startedAt: match.startedAt || new Date(),
          board: match.board,
        });
      }
    }, 1000);

    this.matchTimers.set(timerKey, interval);
  }

  private async handleAttackStart(
    ws: WebSocket,
    session: ConquestSocketSession,
    matchId: string,
    targetRow: number,
    targetCol: number,
    reqId?: string
  ): Promise<void> {
    if (!matchId || typeof targetRow !== 'number' || typeof targetCol !== 'number') {
      this.send(ws, 'CONQUEST_ERROR', { message: 'Invalid attack parameters' }, reqId);
      return;
    }

    try {
      const { challenge } = await this.matchService.startAttackAtomically(
        matchId,
        session.userId,
        targetRow,
        targetCol
      );

      // Send private authoritative challenge to acting player
      this.send(ws, 'CONQUEST_ATTACK_ASSIGNED', { challenge }, reqId);

      // Broadcast target notification to opponent
      this.broadcastToRoom(
        matchId,
        'CONQUEST_OPPONENT_ATTACK_STARTED',
        {
          userId: session.userId,
          targetCellKey: challenge.targetCellKey,
          defenseModifier: challenge.defenseModifier,
          challengeId: challenge.challengeId,
        },
        ws
      );
    } catch (err: any) {
      console.error('[Conquest WS] handleChallengeSubmit exception:', err.message);
      this.send(ws, 'CONQUEST_ERROR', { message: err.message }, reqId);
    }
  }

  private async handleAttackProgress(
    ws: WebSocket,
    session: ConquestSocketSession,
    matchId: string,
    charsTyped: number
  ): Promise<void> {
    const now = Date.now();
    if (now - session.lastProgressTimestamp < 100) return; // 100ms throttle
    session.lastProgressTimestamp = now;

    if (!matchId || typeof charsTyped !== 'number' || isNaN(charsTyped) || charsTyped < 0) return;

    // Sanitize and clamp telemetry (max 5,000 characters)
    const sanitizedCharsTyped = Math.min(5000, Math.floor(charsTyped));

    this.broadcastToRoom(
      matchId,
      'CONQUEST_OPPONENT_PROGRESS',
      {
        userId: session.userId,
        charsTyped: sanitizedCharsTyped,
      },
      ws
    );
  }

  private async handleChallengeSubmit(
    ws: WebSocket,
    session: ConquestSocketSession,
    matchId: string,
    challengeId: string,
    submittedText: string,
    reqId?: string
  ): Promise<void> {
    if (!matchId || !challengeId) {
      this.send(ws, 'CONQUEST_ERROR', { message: 'matchId and challengeId required' }, reqId);
      return;
    }

    try {
      const { result, updatedMatch } = await this.matchService.submitChallengeAtomically(
        matchId,
        session.userId,
        challengeId,
        submittedText
      );

      if (!result.success) {
        console.warn(`[Conquest WS] Challenge failed for user=${session.userId}: ${result.reason}`);
        this.send(
          ws,
          'CONQUEST_ATTACK_FAILED',
          {
            challengeId,
            reason: result.reason,
            accuracy: result.accuracy,
            minAccuracy: result.minAccuracyRequired,
          },
          reqId
        );
        return;
      }

      if (!updatedMatch) return;

      // Broadcast territory capture to both players
      this.broadcastToRoom(matchId, 'CONQUEST_TERRITORY_CAPTURED', {
        cellKey: result.targetCellKey,
        capturedBy: session.userId,
        wpm: result.wpm,
        accuracy: result.accuracy,
        board: updatedMatch.board,
      });

      // If Capital captured, broadcast match conclusion & clean up disconnect timers
      if (result.isCapitalCapture && result.winnerId) {
        this.clearMatchDisconnectTimers(matchId);
        this.broadcastToRoom(matchId, 'CONQUEST_MATCH_FINISHED', {
          matchId,
          winnerId: result.winnerId,
          reason: 'CAPITAL_CAPTURED',
          finishedAt: updatedMatch.finishedAt,
        });
      }
    } catch (err: any) {
      console.error('[Conquest WS] handleChallengeSubmit exception:', err.message);
      this.send(ws, 'CONQUEST_ERROR', { message: err.message }, reqId);
    }
  }

  /**
   * Clears any pending disconnect forfeit timers for the specified match.
   */
  clearMatchDisconnectTimers(matchId: string): void {
    for (const [key, timer] of this.disconnectTimers.entries()) {
      if (key.startsWith(`${matchId}_`)) {
        clearTimeout(timer);
        this.disconnectTimers.delete(key);
      }
    }
  }

  private handleDisconnection(ws: WebSocket, session: ConquestSocketSession): void {
    this.socketSessions.delete(ws);

    const userSet = this.userSockets.get(session.userId);
    if (userSet) {
      userSet.delete(ws);
      if (userSet.size === 0) {
        this.userSockets.delete(session.userId);
      }
    }

    const matchId = session.matchId;
    if (!matchId) return;

    const room = this.matchRooms.get(matchId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.matchRooms.delete(matchId);
      }
    }

    console.log(`[Conquest WS] Disconnect detected for user=${session.userId} in match=${matchId}. Remaining in room: ${room?.size ?? 0}`);

    // Guard against false forfeits on tab refresh or multi-tab in THIS match:
    // Only suppress disconnect if the user still has an active open socket IN THIS MATCH ROOM
    if (room && room.size > 0) {
      for (const clientWs of room) {
        const clientSession = this.socketSessions.get(clientWs);
        if (clientSession && clientSession.userId === session.userId && clientWs.readyState === WebSocket.OPEN) {
          console.log(`[Conquest WS] Suppressing disconnect: user=${session.userId} still has active socket in match room ${matchId}`);
          return;
        }
      }
    }

    // Guard against duplicate disconnect timers for the same match and user
    const timerKey = `${matchId}_${session.userId}`;
    if (this.disconnectTimers.has(timerKey)) {
      console.log(`[Conquest WS] Duplicate disconnect timer ignored for ${timerKey}`);
      return;
    }

    console.log(`[Conquest WS] Broadcasting CONQUEST_PLAYER_DISCONNECTED for user=${session.userId}`);
    this.broadcastToRoom(matchId, 'CONQUEST_PLAYER_DISCONNECTED', {
      userId: session.userId,
      matchId,
      gracePeriodSeconds: 30,
    });

    const forfeitTimer = setTimeout(async () => {
      this.disconnectTimers.delete(timerKey);
      try {
        const finishedMatch = await this.matchService.forfeitMatchOnDisconnect(
          matchId,
          session.userId
        );
        if (finishedMatch) {
          this.broadcastToRoom(matchId, 'CONQUEST_MATCH_FINISHED', {
            matchId,
            winnerId: finishedMatch.winnerId,
            reason: 'FORFEIT_DISCONNECT',
            finishedAt: finishedMatch.finishedAt,
          });
          this.clearMatchDisconnectTimers(matchId);
        }
      } catch (err: any) {
        console.warn('[Conquest WS] Disconnect forfeit error:', err.message);
      }
    }, 30 * 1000);

    if (forfeitTimer.unref) {
      forfeitTimer.unref();
    }

    this.disconnectTimers.set(timerKey, forfeitTimer);
  }

  private send(
    ws: WebSocket,
    type: ConquestServerEvent,
    payload?: any,
    resId?: string
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      const msg: ConquestServerMessage = { type, payload, resId };
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcastToRoom(
    matchId: string,
    type: ConquestServerEvent,
    payload?: any,
    excludeWs?: WebSocket
  ): void {
    const room = this.matchRooms.get(matchId);
    console.log(`[Conquest WS] broadcastToRoom ${type} to match ${matchId}: ${room?.size ?? 0} clients`);
    if (!room) return;

    const msg = JSON.stringify({ type, payload });
    for (const client of room) {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        try {
          client.send(msg);
        } catch {}
      }
    }
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconcileInterval) {
      clearInterval(this.reconcileInterval);
      this.reconcileInterval = null;
    }

    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();

    for (const timer of this.matchTimers.values()) {
      clearInterval(timer);
    }
    this.matchTimers.clear();

    for (const ws of this.socketSessions.keys()) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch {}
    }
    this.socketSessions.clear();
    this.matchRooms.clear();
  }
}
