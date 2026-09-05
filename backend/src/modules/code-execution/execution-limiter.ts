/**
 * Backpressure primitives for the code sandbox.
 *
 * The sandbox is a shared, finite resource: every learner "Run" and every
 * graded submission turns into one HTTP execution per test case. Without a
 * bound, a handful of concurrent learners is enough to exhaust it, and the
 * grader then falls back to manual marking without anyone noticing.
 */

/** The sandbox refused the work because it is saturated. Retrying may succeed. */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

type Waiter = () => void;

/**
 * Caps how many tasks run at once, queueing the rest in arrival order.
 *
 * Bounding concurrency at the source is what keeps the sandbox healthy: it is
 * better to make one learner wait a moment than to overload the sandbox and
 * fail everyone's submission at once.
 */
export class Semaphore {
  private active = 0;
  private readonly waiting: Waiter[] = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`Semaphore limit must be a positive integer, got ${limit}`);
    }
  }

  /** Tasks waiting for a slot. Used to shed load before the queue grows unbounded. */
  get queued(): number {
    return this.waiting.length;
  }

  /** Tasks currently holding a slot. */
  get running(): number {
    return this.active;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
    this.active += 1;
  }

  private release(): void {
    this.active -= 1;
    // FIFO: the learner who waited longest goes next.
    const next = this.waiting.shift();
    if (next) {
      next();
    }
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type RetryOptions = {
  /** Total tries, including the first. */
  attempts: number;
  /** Delay before the first retry; each further retry doubles it. */
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Retries a task while it fails with {@link RateLimitError}, backing off
 * exponentially with jitter.
 *
 * Only rate limits are retried. A compile error or a wrong answer is the
 * learner's result, not an outage, and repeating it wastes sandbox capacity
 * that other learners are queued for.
 */
export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { attempts, baseDelayMs = 250, sleep = defaultSleep } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw error;
      }
      lastError = error;

      if (attempt < attempts) {
        // Jitter spreads retries out so a burst of learners does not
        // synchronise and hit the sandbox again in lockstep.
        const backoff = baseDelayMs * 2 ** (attempt - 1);
        await sleep(backoff + Math.floor(Math.random() * baseDelayMs));
      }
    }
  }

  throw lastError;
}
