declare module 'ws' {
  import { EventEmitter } from 'events';

  class WebSocket extends EventEmitter {
    constructor(address: string, protocols?: string | string[], options?: Record<string, unknown>);
    send(data: string | ArrayBuffer | Buffer | ArrayBufferView, cb?: (err?: Error) => void): void;
    close(code?: number, reason?: string): void;
  }

  export default WebSocket;
}
