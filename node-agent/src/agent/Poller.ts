import { AckStore } from './AckStore';
import { NodeAgent } from '.';
import { MessageProcessor } from './MessageProcessor';
import { Transport } from './Transport';

export class Poller {
  public readonly transport: Transport;
  public readonly ackStore: AckStore;
  public readonly messageProcessor: MessageProcessor;

  private interval: NodeJS.Timeout | null = null;

  constructor(public readonly agent: NodeAgent) {
    this.transport = agent.transport;
    this.ackStore = agent.ackStore;
    this.messageProcessor = agent.messageProcessor;
    this.start();
  }

  private async poll() {
    const ackMessageIds = this.ackStore.popToAck();

    this.transport
      .sessionRequest('/messages/poll', { ackMessageIds, longPolling: false })
      .then((response) => {
        this.messageProcessor.processMessages(response.messages);
      })
      .catch((err) => {
        this.agent.logger.error('Error while polling messages', err);
        this.ackStore.pushToAck(ackMessageIds);
        return undefined;
      });
  }

  start() {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => this.poll(), 5000);
    this.interval.unref();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
