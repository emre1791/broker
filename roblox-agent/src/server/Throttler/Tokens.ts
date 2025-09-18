export interface TokensOptions {
  rpm?: number;
  burstWindowSec?: number;
  minIntervalSec?: number;
}

export class Tokens {
  private readonly tokensPerSec: number;
  private readonly capacity: number;
  private tokens: number;
  private lastRefill = os.clock();
  private lastSendAt = 0;

  public readonly minIntervalSec: number;

  constructor(opts?: TokensOptions) {
    const rpm = opts?.rpm ?? 240;
    const burstWindowSec = opts?.burstWindowSec ?? 1;
    this.minIntervalSec = opts?.minIntervalSec ?? 0.005;

    this.tokensPerSec = rpm / 60;
    this.capacity = math.max(1, math.floor(this.tokensPerSec * burstWindowSec));
    this.tokens = this.capacity;
  }

  runWhenReady(cb: () => void) {
    while (true) {
      const delay = this.nextReadyDelaySec();
      if (delay <= 0 && this.hasToken() && this.remainingInterval() <= 0) {
        this.takeToken();
        this.markSent();
        cb();
        break;
      } else {
        task.wait(delay);
      }
    }
  }

  private refill(now = os.clock()) {
    const delta = now - this.lastRefill;
    if (delta > 0) {
      this.tokens = math.min(this.capacity, this.tokens + delta * this.tokensPerSec);
      this.lastRefill = now;
    }
  }

  private hasToken(): boolean {
    this.refill();

    return this.tokens >= 1;
  }

  private takeToken() {
    this.tokens = math.max(0, this.tokens - 1);
  }

  private remainingInterval(now = os.clock()): number {
    const dueAt = this.lastSendAt + this.minIntervalSec;
    return math.max(0, dueAt - now);
  }

  private markSent() {
    this.lastSendAt = os.clock();
  }

  private nextTokenDelaySec(): number {
    this.refill();

    if (this.tokens >= 1) {
      return 0;
    }

    const deficit = 1 - this.tokens;
    return deficit / this.tokensPerSec;
  }

  private nextReadyDelaySec(): number {
    return math.max(this.nextTokenDelaySec(), this.remainingInterval());
  }
}
