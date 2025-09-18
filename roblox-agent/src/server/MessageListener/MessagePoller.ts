import { MessageListener } from '.';
import { Logger } from '../../shared/Logger';
import { MessageProcessor } from '../MessageProcessor';
import { Throttler } from '../Throttler/Throttler';
import { Transport } from '../Transport';

export class MessagePoller {
  public readonly transport: Transport;
  public readonly throttler: Throttler;
  public readonly processor: MessageProcessor;
  public readonly logger: Logger;

  private ackedMessageIds = new Array<string>();
  private polling = false;

  constructor(public readonly listener: MessageListener) {
    this.transport = listener.transport;
    this.processor = listener.processor;
    this.logger = listener.logger;
    this.throttler = new Throttler(listener.agent.throttlerTokens, () => this.poll());

    this.startPolling();
  }

  private async poll() {
    const toAckMessageIds = this.ackedMessageIds;
    this.ackedMessageIds = [];

    this.transport
      .sessionRequest('/messages/poll', {
        ackMessageIds: toAckMessageIds,
        longPolling: true,
      })
      .then((response) => {
        this.processor.processMessages(response.messages);
        for (const message of response.messages) {
          this.ackedMessageIds.push(message.id);
        }
      })
      .catch((err: unknown) => {
        for (const id of toAckMessageIds) {
          this.ackedMessageIds.push(id);
        }
        this.logger.error('Failed to poll messages:', err);
      });
  }

  private async startPolling() {
    if (this.polling) {
      return;
    }
    this.polling = true;

    while (this.polling) {
      this.throttler.trigger();
      this.throttler.processed.Wait();
    }
  }

  destroy() {
    this.polling = false;
    this.throttler.destroy();
  }
}
