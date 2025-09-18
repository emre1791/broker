import { DefaultLogger, Logger } from '../Logger';
import { Transport } from './Transport';
import { Poller } from './Poller';
import { AckStore } from './AckStore';
import { MessageProcessor } from './MessageProcessor';
import { INVOKE_TIMEOUT } from '../consts';
import { MessageSender } from './MessageSender';
import { WebSocket } from './WebSocket';
import { Platform } from '../../../daemon/src';

export interface NodeAgentOptions {
  url: string;
  token: string;
  room?: string | undefined;
  logger?: Logger;
}

export class NodeAgent {
  public readonly room: string | undefined;
  public readonly baseUrl: string;
  public readonly token: string;

  public readonly logger: Logger;
  public readonly transport: Transport;
  public readonly ackStore: AckStore;
  public readonly messageProcessor: MessageProcessor;
  public readonly messageSender: MessageSender;
  public readonly poller: Poller;
  public readonly webSocket: WebSocket;

  constructor(options: NodeAgentOptions) {
    this.room = options.room;
    this.baseUrl = options.url;
    this.token = options.token;
    this.logger = options.logger ?? DefaultLogger;

    this.transport = new Transport(this);
    this.ackStore = new AckStore();
    this.poller = new Poller(this);
    this.webSocket = new WebSocket(this);
    this.messageProcessor = new MessageProcessor(this);
    this.messageSender = new MessageSender(this);
  }

  fire(type: string, platforms: Platform[], content: string) {
    this.messageSender.fire(type, platforms, content);
  }

  invoke(type: string, platform: Platform, content: string): Promise<string> {
    const messageId = this.messageSender.fire(type, [platform], content);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unbind();
        reject(new Error('Timeout waiting for response'));
      }, INVOKE_TIMEOUT);
      timeout.unref();
      const unbind = this.messageProcessor.bindToReply(messageId, (message) => {
        clearTimeout(timeout);
        resolve(message.content);
      });
    });
  }

  bind(type: string, callback: (content: string, reply: (content: string) => void) => void) {
    return this.messageProcessor.bind(type, (message) => {
      callback(message.content, (content) => {
        this.messageSender.fireReply(message.id, content);
      });
    });
  }

  destroy() {
    this.ackStore.destroy();
    this.poller.stop();
  }
}
