import { io, Socket } from 'socket.io-client';
import { getApiUrl, safeFetch } from './api';
import { ConquestClientEvent, ConquestServerEvent } from '../types/conquest';

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type SocketEventHandler = (payload: any) => void;

class ConquestSocketClient {
  private socket: Socket | null = null;
  private status: SocketStatus = 'disconnected';
  private listeners = new Map<string, Set<SocketEventHandler>>();
  private statusListeners = new Set<(status: SocketStatus) => void>();
  private intentionalClose = false;
  private sendQueue: Array<{ type: ConquestClientEvent; payload?: any; ack?: (res: any) => void }> = [];
  private currentMatchId: string | null = null;

  public getStatus(): SocketStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: SocketStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: SocketStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn('[Conquest Socket] Status listener error:', err);
      }
    }
  }

  public async connect(token: string): Promise<void> {
    if (!token) return;
    this.intentionalClose = false;

    if (this.socket && this.socket.connected) {
      return;
    }

    this.setStatus('connecting');

    try {
      // 1. Fetch single-use connection ticket to avoid exposing long-lived JWT in query strings
      let ticket: string | null = null;
      try {
        const ticketRes = await safeFetch('/api/conquest/ws-ticket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (ticketRes.ok) {
          const data = await ticketRes.json();
          if (data && data.ticket) {
            ticket = data.ticket;
          }
        }
      } catch (ticketErr) {
        console.warn('[Conquest Socket] Could not obtain ticket, falling back to legacy token:', ticketErr);
      }

      // Compute server base origin
      let hostUrl = getApiUrl('/');
      if (hostUrl.endsWith('/')) hostUrl = hostUrl.slice(0, -1);
      if (!hostUrl.startsWith('http')) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
        hostUrl = origin;
      }

      // Initialize Socket.io client with Connection State Recovery & HTTP Long-Polling fallback
      this.socket = io(`${hostUrl}/conquest`, {
        path: '/socket.io',
        transports: ['websocket', 'polling'], // Fallback for mobile networks & strict firewalls
        auth: {
          token,
          ticket: ticket || undefined,
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        this.setStatus('connected');

        // Automatically re-join current match on reconnect or Wi-Fi state recovery
        if (this.currentMatchId) {
          this.send('CONQUEST_JOIN_ROOM', { matchId: this.currentMatchId });
        }

        // Flush any buffered messages from offline period
        while (this.sendQueue.length > 0) {
          const item = this.sendQueue.shift();
          if (item) {
            this.send(item.type, item.payload, item.ack);
          }
        }
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[Conquest Socket] Connection error:', err.message);
        if (!this.intentionalClose) {
          this.setStatus('reconnecting');
        }
      });

      this.socket.on('disconnect', (reason) => {
        if (this.intentionalClose || reason === 'io client disconnect') {
          this.setStatus('disconnected');
        } else {
          this.setStatus('reconnecting');
        }
      });

      // Capture all incoming real-time server events via Socket.io onAny dispatcher
      this.socket.onAny((event: string, payload: any) => {
        this.dispatch(event as ConquestServerEvent, payload);
      });
    } catch (err) {
      console.error('[Conquest Socket] Failed to initialize Socket.io client:', err);
      this.setStatus('disconnected');
    }
  }

  public disconnect(): void {
    this.intentionalClose = true;
    this.currentMatchId = null;
    this.sendQueue = [];
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Sends an action to the server. If the socket is temporarily offline,
   * buffers the message and automatically flushes the moment the socket recovers.
   * Supports client acknowledgements: pass a callback function to verify server acceptance.
   */
  public send(type: ConquestClientEvent, payload?: any, reqIdOrAck?: any): boolean {
    if (type === 'CONQUEST_JOIN_ROOM' && payload?.matchId) {
      this.currentMatchId = payload.matchId;
    }

    const ackCallback = typeof reqIdOrAck === 'function' ? reqIdOrAck : undefined;

    if (!this.socket || !this.socket.connected) {
      this.sendQueue.push({ type, payload, ack: ackCallback });
      return true;
    }

    try {
      if (ackCallback) {
        this.socket.emit(type, payload, ackCallback);
      } else {
        this.socket.emit(type, payload);
      }
      return true;
    } catch (err) {
      console.warn(`[Conquest Socket] Error sending ${type}:`, err);
      this.sendQueue.push({ type, payload, ack: ackCallback });
      return false;
    }
  }

  /**
   * Promise-based acknowledgement emitter. Guarantees that the server verified
   * and processed the action before proceeding.
   */
  public emitWithAck<T = any>(type: ConquestClientEvent, payload?: any, timeoutMs = 8000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for server acknowledgement on ${type}`));
      }, timeoutMs);

      this.send(type, payload, (response: any) => {
        clearTimeout(timer);
        resolve(response as T);
      });
    });
  }

  public on(event: ConquestServerEvent, handler: SocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) this.listeners.delete(event);
      }
    };
  }

  private dispatch(event: ConquestServerEvent, payload: any): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[Conquest Socket] Handler error on ${event}:`, err);
      }
    }
  }
}

export const conquestSocket = new ConquestSocketClient();
