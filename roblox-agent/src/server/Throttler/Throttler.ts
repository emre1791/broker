import Signal from '@rbxts/signal';
import { Tokens } from './Tokens';

export class Throttler {
  public readonly processed = new Signal<(status: Promise.Status) => void>();
  private scheduled = false;

  constructor(private readonly tokens: Tokens, private readonly fn: () => Promise<void>) {}

  trigger() {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;

    this.tokens.runWhenReady(() => {
      this.scheduled = false;

      const promise = this.fn();
      promise.finally(() => {
        this.processed.Fire(promise.getStatus());
      });
    });
  }

  destroy() {
    this.processed.Destroy();
  }
}
