import { io, Socket } from 'socket.io-client';
import type { NodeAgent } from '.';
import type { Transport } from './Transport';
import { Logger } from '../Logger';
import { Message, ProcedureInputs, ProcedureName, ProcedureOutputs } from '../../../daemon/src';

type Ack<T> = { ok: true; result: T } | { ok: false; message: string };

export class WebSocket {
  public readonly wsUrl: string;

  public readonly logger: Logger;
  public readonly transport: Transport;

  private socket: Socket | null = null;
  private stopped = false;

  constructor(public readonly agent: NodeAgent) {
    this.wsUrl = agent.transport.baseUrl.replace(/^http/, 'ws');
    this.logger = agent.logger;
    this.transport = agent.transport;
  }

  async connect() {
    if (this.socket && this.socket.connected) {
      return;
    }
    this.stopped = false;

    const transport = this.transport;
    const socket: Socket = io(this.wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 200,
      reconnectionDelayMax: 2000,
      autoConnect: false,
      auth(cb) {
        transport
          .fetchSessionId()
          .then((sessionId) => cb({ sessionId }))
          .catch(() => {
            cb({});
          });
      },
    });

    socket.on('NEW_MESSAGES', (messages: Message[]) => {
      for (const message of messages) {
        this.logger.verbose('WS new message', message);
      }
      this.agent.messageProcessor.processMessages(messages);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' && !this.stopped) {
        this.logger.verbose('WS disconnected by server, will not reconnect automatically');
        socket.connect();
      }
    });

    socket.connect();
    this.socket = socket;
  }

  stop() {
    this.stopped = true;
    if (this.socket) {
      this.socket.io.opts.reconnection = false;
      this.socket.disconnect();
      this.socket = null;
    }
  }

  fire<N extends ProcedureName>(path: N, payload: ProcedureInputs[N]) {
    this.socket?.emit(path, payload);
  }

  invoke<N extends ProcedureName>(
    path: N,
    payload?: ProcedureInputs[N],
    timeoutMs = 2000
  ): Promise<ProcedureOutputs[N]> {
    const socket = this.socket;
    if (!socket || !socket.connected) {
      return Promise.reject(new Error('WS_NOT_CONNECTED'));
    }

    return new Promise<ProcedureOutputs[N]>((resolve, reject) => {
      socket
        .timeout(timeoutMs)
        .emit(path, payload, (err: Error | null, res: Ack<ProcedureOutputs[N]>) => {
          if (err) {
            return reject(err);
          }
          if (!res.ok) {
            return reject(new Error(res.message));
          }
          resolve(res.result);
        });
    });
  }
}
