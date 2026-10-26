import { getApiUrl, safeFetch } from './api';

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type SocketEventHandler = (payload: any) => void;

class ArenaSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private status: SocketStatus = 'disconnected';
  private listeners = new Map<string, Set<SocketEventHandler>>();
  private statusListeners = new Set<(status: SocketStatus) => void>();
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private intentionalClose = false;

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
        console.warn('[Arena Socket] Status listener error:', err);
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
      // 1. Fetch single-use connection ticket to avoid exposing long-lived JWT in query strings (Audit A)
      let ticket: string | null = null;
      try {
        const ticketRes = await safeFetch('/api/arena/ws-ticket', {
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
        console.warn('[Arena Socket] Could not obtain ticket, falling back to legacy connect:', ticketErr);
      }

      const httpUrl = getApiUrl('/arena-ws');
      let wsBaseUrl = httpUrl;
      if (httpUrl.startsWith('/')) {
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5000';
        wsBaseUrl = `${protocol}//${host}${httpUrl}`;
      } else {
        wsBaseUrl = httpUrl.replace(/^http/, 'ws');
      }

      const wsUrl = ticket
        ? `${wsBaseUrl}?ticket=${encodeURIComponent(ticket)}`
        : `${wsBaseUrl}?token=${encodeURIComponent(token)}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.event) {
            this.dispatch(data.event, data.payload);
          }
        } catch (err) {
          console.warn('[Arena Socket] Message parse error:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.ws = null;

        if (this.intentionalClose) {
          this.setStatus('disconnected');
          return;
        }

        // Ticket or token expired/invalid
        if (event.code === 4001 || event.code === 4003 || event.code === 1008) {
          this.setStatus('disconnected');
          return;
        }

        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[Arena Socket] Connection error:', err);
      };
    } catch (err) {
      console.error('[Arena Socket] Failed to initialize WebSocket:', err);
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
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || !this.token) return;
    this.setStatus('reconnecting');

    const maxWait = 10000;
    const baseWait = Math.min(maxWait, Math.pow(1.5, this.reconnectAttempts) * 1000);
    const jitter = Math.random() * 500;
    const delay = baseWait + jitter;

    this.reconnectAttempts++;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.token && !this.intentionalClose) {
        this.connect(this.token);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send('PING', { time: Date.now() });
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public send(event: string, payload?: any, reqId?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    const msg = JSON.stringify({ event, payload, reqId });
    this.ws.send(msg);
    return true;
  }

  public on(event: string, handler: SocketEventHandler): () => void {
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

  private dispatch(event: string, payload: any): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[Arena Socket] Handler error on ${event}:`, err);
      }
    }
  }
}

export const arenaSocket = new ArenaSocketClient();
