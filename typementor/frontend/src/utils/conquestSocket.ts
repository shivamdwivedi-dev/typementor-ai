import { getApiUrl, safeFetch } from './api';
import { ConquestClientEvent, ConquestServerEvent } from '../types/conquest';

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type SocketEventHandler = (payload: any) => void;

class ConquestSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: SocketStatus = 'disconnected';
  private listeners = new Map<string, Set<SocketEventHandler>>();
  private statusListeners = new Set<(status: SocketStatus) => void>();
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private intentionalClose = false;
  private sendQueue: Array<{ type: ConquestClientEvent; payload?: any; reqId?: string }> = [];

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
    this.token = token;
    this.intentionalClose = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

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

      const httpUrl = getApiUrl('/conquest-ws');
      let wsBaseUrl = httpUrl;
      if (httpUrl.startsWith('/')) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBaseUrl = `${protocol}//${window.location.host}${httpUrl}`;
      } else {
        wsBaseUrl = httpUrl.replace(/^http/, 'ws');
      }

      const wsUrl = ticket
        ? `${wsBaseUrl}?ticket=${encodeURIComponent(ticket)}`
        : `${wsBaseUrl}?token=${encodeURIComponent(token)}`;

      this.ws = new WebSocket(wsUrl);

      return new Promise<void>((resolve) => {
        this.ws!.onopen = () => {
          this.reconnectAttempts = 0;
          this.setStatus('connected');
          this.startHeartbeat();

          // Flush queued messages once connected
          while (this.sendQueue.length > 0) {
            const item = this.sendQueue.shift();
            if (item) {
              this.send(item.type, item.payload, item.reqId);
            }
          }
          resolve();
        };

        this.ws!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.type) {
              this.dispatch(data.type, data.payload);
            }
          } catch (err) {
            console.warn('[Conquest Socket] Message parse error:', err);
          }
        };

        this.ws!.onclose = (event) => {
          this.stopHeartbeat();
          this.ws = null;

          if (this.intentionalClose) {
            this.setStatus('disconnected');
            resolve();
            return;
          }

          // Invalid or expired credentials
          if (event.code === 4001 || event.code === 4003 || event.code === 1008) {
            this.setStatus('disconnected');
            resolve();
            return;
          }

          this.scheduleReconnect();
          resolve();
        };

        this.ws!.onerror = (err) => {
          console.warn('[Conquest Socket] Connection error:', err);
          resolve();
        };
      });
    } catch (err) {
      console.error('[Conquest Socket] Failed to initialize WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'User left match');
      } catch {}
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public send(type: ConquestClientEvent, payload?: any, reqId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        this.sendQueue.push({ type, payload, reqId });
        return;
      }
      console.warn(`[Conquest Socket] Cannot send ${type}: socket not connected`);
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type, payload, reqId }));
    } catch (err) {
      console.error(`[Conquest Socket] Error sending ${type}:`, err);
    }
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
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private dispatch(event: string, payload: any): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[Conquest Socket] Handler error for ${event}:`, err);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || this.reconnectTimer) return;
    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token && !this.intentionalClose) {
        this.connect(this.token);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('CONQUEST_PING', { timestamp: Date.now() });
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const conquestSocket = new ConquestSocketClient();
