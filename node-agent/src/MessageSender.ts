import { v4 } from 'uuid';
import { Client } from './Client';
import { WebSocket } from './WebSocket';
import { Platform } from '../../daemon/src';

export class MessageSender {
  public readonly webSocket: WebSocket;

  constructor(public readonly client: Client) {
    this.webSocket = client.webSocket;
  }

  fire(type: string, platforms: Platform[], content: string): string {
    const id = v4();
    this.webSocket.fire('/messages/push', {
      messages: [{ id, type, content, platforms }],
      replies: [],
    });
    return id;
  }

  fireReply(replyingMessageId: string, content: string): void {
    this.webSocket.fire('/messages/push', {
      messages: [],
      replies: [{ content, messageId: replyingMessageId }],
    });
  }
}
