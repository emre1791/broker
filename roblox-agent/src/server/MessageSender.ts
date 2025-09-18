import { HttpService } from '@rbxts/services';
import { ServerAgent } from '.';
import { Transport } from './Transport';
import { Platform, IncompleteMessage, MessageReply } from '../../../daemon/dist';
import { BatchThrottler } from './Throttler/BatchThrottler';

export type BatchedMessage =
  | { type: 'NEW_MESSAGE'; message: IncompleteMessage }
  | { type: 'REPLY'; reply: MessageReply };

export class MessageSender {
  public readonly transport: Transport;
  public readonly throttler: BatchThrottler<BatchedMessage>;

  constructor(public readonly agent: ServerAgent, maxBatchSize = 100) {
    this.transport = agent.transport;
    this.throttler = new BatchThrottler<BatchedMessage>(
      agent.throttlerTokens,
      (items) => this.sendBatch(items),
      maxBatchSize
    );
  }

  private async sendBatch(items: BatchedMessage[]): Promise<void> {
    const messages: IncompleteMessage[] = [];
    const replies: MessageReply[] = [];

    for (const item of items) {
      if (item.type === 'NEW_MESSAGE') {
        messages.push(item.message);
      } else if (item.type === 'REPLY') {
        replies.push(item.reply);
      }
    }

    return this.transport.sessionRequest('/messages/push', { messages, replies });
  }

  fire(messageType: string, platforms: Platform[], content: string): string {
    const id = HttpService.GenerateGUID(false);
    const message: IncompleteMessage = { id, type: messageType, content, platforms };
    this.throttler.enqueue({ type: 'NEW_MESSAGE', message });
    return id;
  }

  fireReply(replyingMessageId: string, content: string): void {
    const reply: MessageReply = { content, messageId: replyingMessageId };
    this.throttler.enqueue({ type: 'REPLY', reply });
  }
}
