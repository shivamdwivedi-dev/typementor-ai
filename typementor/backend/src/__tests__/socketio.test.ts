import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { SocketIOService } from '../services/realtime/socketio.service';
import { JWT_SECRET } from '../config/env';
import { prisma } from '../app';
import { ArenaPointsService } from '../services/arena/arena-points.service';
import { ArenaMatchService } from '../services/arena/arena-match.service';
import { ConquestMatchService } from '../services/conquest/conquest-match.service';

describe('Socket.io Real-time Engine & Reliability Suite', () => {
  let server: http.Server;
  let socketService: SocketIOService;
  let port: number;
  let validToken: string;
  const testUserId = 'socketio-test-user-1';
  const testEmail = 'socketio-tester@example.com';

  beforeAll(async () => {
    // Generate valid test JWT
    validToken = jwt.sign({ id: testUserId, email: testEmail }, JWT_SECRET, { expiresIn: '1h' });

    server = http.createServer();
    const arenaPoints = new ArenaPointsService(prisma);
    const arenaMatch = new ArenaMatchService(prisma, arenaPoints);
    const conquestMatch = new ConquestMatchService(prisma);

    socketService = new SocketIOService(prisma, arenaPoints, arenaMatch, conquestMatch);
    socketService.init(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 5001;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await socketService.shutdown();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects connection without token or ticket', async () => {
    const client = ClientSocket(`http://localhost:${port}/arena`, {
      path: '/socket.io',
      transports: ['polling'],
      autoConnect: false,
    });

    const connectErrorPromise = new Promise<string>((resolve) => {
      client.on('connect_error', (err) => resolve(err.message));
    });

    client.connect();
    const errorMsg = await connectErrorPromise;
    expect(errorMsg).toContain('Authentication');
    client.disconnect();
  });

  it('connects successfully via HTTP Long-Polling with valid JWT token', async () => {
    const client = ClientSocket(`http://localhost:${port}/arena`, {
      path: '/socket.io',
      transports: ['polling'], // Explicitly test HTTP long-polling transport
      auth: { token: validToken },
      autoConnect: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(err));
      client.connect();
    });

    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('connects successfully via WebSocket transport with valid JWT token', async () => {
    const client = ClientSocket(`http://localhost:${port}/arena`, {
      path: '/socket.io',
      transports: ['websocket'], // Explicitly test WebSocket transport
      auth: { token: validToken },
      autoConnect: false,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(err));
      client.connect();
    });

    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('executes client acknowledgements (ack callback) on PING', async () => {
    const client = ClientSocket(`http://localhost:${port}/arena`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: validToken },
    });

    await new Promise<void>((resolve) => {
      if (client.connected) resolve();
      else client.on('connect', () => resolve());
    });

    const ackResult = await new Promise<{ time: number }>((resolve) => {
      client.emit('PING', {}, (response: any) => resolve(response));
    });

    expect(ackResult).toBeDefined();
    expect(ackResult.time).toBeGreaterThan(0);
    client.disconnect();
  });

  it('handles JOIN_MATCH with client acknowledgement callback on invalid match', async () => {
    const client = ClientSocket(`http://localhost:${port}/arena`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: validToken },
    });

    await new Promise<void>((resolve) => {
      if (client.connected) resolve();
      else client.on('connect', () => resolve());
    });

    const ackResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      client.emit('JOIN_MATCH', { matchId: 'non-existent-match-id' }, (response: any) => resolve(response));
    });

    expect(ackResult.success).toBe(false);
    expect(ackResult.error).toContain('Match not found');
    client.disconnect();
  });

  it('connects to Word Conquest (/conquest) namespace and responds to CONQUEST_PING', async () => {
    const client = ClientSocket(`http://localhost:${port}/conquest`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      forceNew: true,
      auth: { token: validToken },
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(new Error('Conquest connect error: ' + err.message)));
    });

    const ackResult = await new Promise<{ time: number }>((resolve) => {
      client.emit('CONQUEST_PING', {}, (response: any) => resolve(response));
    });

    expect(ackResult).toBeDefined();
    expect(ackResult.time).toBeGreaterThan(0);
    client.disconnect();
  });
});
