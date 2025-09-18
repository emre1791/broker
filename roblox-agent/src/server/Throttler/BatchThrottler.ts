import { Tokens } from './Tokens';

export class BatchThrottler<T extends defined> {
  private queue = new Array<T>();
  private coalesceScheduled = false;
  private inFlight = 0;

  constructor(
    private readonly tokens: Tokens,
    private readonly handler: (items: T[]) => Promise<void>,
    private readonly maxBatchSize = 100
  ) {}

  enqueue(item: T) {
    this.queue.push(item);

    if (!this.coalesceScheduled) {
      this.coalesceScheduled = true;
      task.delay(this.tokens.minIntervalSec, () => {
        this.coalesceScheduled = false;
        this.flushOnce();
      });
    }
  }

  private flushOnce() {
    if (this.queue.size() === 0) {
      return;
    }

    this.tokens.runWhenReady(() => {
      if (this.queue.size() === 0) {
        return;
      }

      const queueSize = this.queue.size();
      let batch: Array<T>;

      if (queueSize > this.maxBatchSize) {
        batch = table.create<T>(this.maxBatchSize);
        this.queue.move(0, this.maxBatchSize - 1, 0, batch);
        const newQueue: T[] = [];
        this.queue.move(this.maxBatchSize, queueSize - 1, 0, newQueue);
        this.queue = newQueue;
      } else {
        batch = this.queue;
        this.queue = [];
      }

      this.inFlight++;

      this.handler(batch)
        .catch(() => {
          for (let i = batch.size() - 1; i >= 0; i--) {
            this.queue.unshift(batch[i]);
          }
        })
        .finally(() => {
          this.inFlight = math.max(0, this.inFlight - 1);
          if (this.queue.size() > 0) {
            this.flushOnce();
          }
        });
    });
  }
}
