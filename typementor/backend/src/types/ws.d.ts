declare module 'ws' {
  import { EventEmitter } from 'events';
  import { IncomingMessage, Server as HttpServer } from 'http';
  import { Duplex } from 'stream';

  export class WebSocket extends EventEmitter {
    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;

    readonly readyState: number;
    send(data: any, cb?: (err?: Error) => void): void;
    close(code?: number, data?: string): void;
    terminate(): void;
    ping(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err?: Error) => void): void;
  }

  export interface ServerOptions {
    host?: string;
    port?: number;
    backlog?: number;
    server?: HttpServer;
    verifyClient?: boolean | ((info: { origin: string; secure: boolean; req: IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void) => void);
    handleProtocols?: any;
    path?: string;
    noServer?: boolean;
    clientTracking?: boolean;
    perMessageDeflate?: boolean | any;
    maxPayload?: number;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options?: ServerOptions, callback?: () => void);
    readonly clients: Set<WebSocket>;
    close(cb?: (err?: Error) => void): void;
    handleUpgrade(
      request: IncomingMessage,
      socket: Duplex,
      upgradeHead: Buffer,
      callback: (client: WebSocket, request: IncomingMessage) => void
    ): void;
    emit(event: string | symbol, ...args: any[]): boolean;
    on(event: 'connection', cb: (socket: WebSocket, request: IncomingMessage) => void): this;
    on(event: 'error', cb: (error: Error) => void): this;
    on(event: 'close', cb: () => void): this;
    on(event: 'headers', cb: (headers: string[], request: IncomingMessage) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export default WebSocket;
}
