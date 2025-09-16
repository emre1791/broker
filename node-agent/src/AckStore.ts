import { Message } from '../../daemon/src';

export class AckStore {
  private toAckQueue = new Array<string>();
  private processedMessages = new Map<string, number>();
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    this.interval = setInterval(() => this.drain(), 10_000);
    this.interval.unref();
  }

  private drain() {
    const now = Date.now();
    for (const [id, timeout] of this.processedMessages.entries()) {
      if (timeout < now) {
        this.processedMessages.delete(id);
      }
    }
  }

  addMessage(message: Message) {
    if (!this.isDuplicate(message)) {
      this.toAckQueue.push(message.id);
      this.processedMessages.set(message.id, message.timeout);
    }
  }

  isDuplicate(message: Message): boolean {
    const now = Date.now();
    const existing = this.processedMessages.get(message.id);
    return existing !== undefined && existing > now;
  }

  popToAck(): string[] {
    const ids = this.toAckQueue;
    this.toAckQueue = [];
    return ids;
  }

  pushToAck(ids: string[]) {
    this.toAckQueue.push(...ids);
  }

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.toAckQueue = [];
    this.processedMessages.clear();
  }
}
