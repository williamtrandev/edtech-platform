import { describe, expect, it, vi } from "vitest";
import { Semaphore, isRateLimitError, RateLimitError, withRetry } from "./execution-limiter";

/** Resolves a promise from outside, so a test can hold a task open. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Semaphore", () => {
  it("runs tasks immediately while below the limit", async () => {
    const semaphore = new Semaphore(2);
    const a = deferred();
    const b = deferred();
    let started = 0;

    void semaphore.run(async () => {
      started += 1;
      await a.promise;
    });
    void semaphore.run(async () => {
      started += 1;
      await b.promise;
    });
    await Promise.resolve();

    expect(started).toBe(2);
    a.resolve();
    b.resolve();
  });

  it("holds a task back until a slot frees up", async () => {
    const semaphore = new Semaphore(1);
    const first = deferred();
    let secondStarted = false;

    const running = semaphore.run(() => first.promise);
    const queued = semaphore.run(async () => {
      secondStarted = true;
    });

    await Promise.resolve();
    expect(secondStarted).toBe(false);

    first.resolve();
    await running;
    await queued;
    expect(secondStarted).toBe(true);
  });

  it("frees the slot when a task throws, so the queue keeps moving", async () => {
    const semaphore = new Semaphore(1);

    await expect(semaphore.run(async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");

    await expect(semaphore.run(async () => "after")).resolves.toBe("after");
  });

  it("returns each task's own value", async () => {
    const semaphore = new Semaphore(1);
    await expect(semaphore.run(async () => 42)).resolves.toBe(42);
  });

  it("admits queued tasks in the order they arrived", async () => {
    const semaphore = new Semaphore(1);
    const gate = deferred();
    const order: number[] = [];

    const held = semaphore.run(() => gate.promise);
    const rest = [1, 2, 3].map((n) => semaphore.run(async () => void order.push(n)));

    gate.resolve();
    await held;
    await Promise.all(rest);

    expect(order).toEqual([1, 2, 3]);
  });

  it("reports how many tasks are waiting, for backpressure decisions", async () => {
    const semaphore = new Semaphore(1);
    const gate = deferred();

    const held = semaphore.run(() => gate.promise);
    const queued = semaphore.run(async () => undefined);
    await Promise.resolve();

    expect(semaphore.queued).toBe(1);
    gate.resolve();
    await held;
    await queued;
    expect(semaphore.queued).toBe(0);
  });

  it("rejects a limit below one rather than deadlocking", () => {
    expect(() => new Semaphore(0)).toThrow();
  });
});

describe("withRetry", () => {
  const noSleep = vi.fn(async () => undefined);

  it("does not retry a call that succeeds", async () => {
    const task = vi.fn(async () => "ok");

    await expect(withRetry(task, { attempts: 3, sleep: noSleep })).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("retries a rate limit error and returns the eventual success", async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError("busy"))
      .mockResolvedValueOnce("ok");

    await expect(withRetry(task, { attempts: 3, sleep: noSleep })).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("gives up after the configured number of attempts", async () => {
    const task = vi.fn().mockRejectedValue(new RateLimitError("busy"));

    await expect(withRetry(task, { attempts: 3, sleep: noSleep })).rejects.toBeInstanceOf(RateLimitError);
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("does not retry an error that is not a rate limit", async () => {
    const task = vi.fn().mockRejectedValue(new Error("syntax error in learner code"));

    await expect(withRetry(task, { attempts: 3, sleep: noSleep })).rejects.toThrow("syntax error");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("backs off for longer after each failure", async () => {
    const delays: number[] = [];
    const sleep = vi.fn(async (ms: number) => void delays.push(ms));
    const task = vi.fn().mockRejectedValue(new RateLimitError("busy"));

    await expect(withRetry(task, { attempts: 4, baseDelayMs: 100, sleep })).rejects.toBeInstanceOf(RateLimitError);

    // One sleep per retry, never after the final attempt.
    expect(delays).toHaveLength(3);
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });

  it("does not sleep after the last attempt", async () => {
    const sleep = vi.fn(async () => undefined);
    const task = vi.fn().mockRejectedValue(new RateLimitError("busy"));

    await expect(withRetry(task, { attempts: 1, sleep })).rejects.toBeInstanceOf(RateLimitError);
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("isRateLimitError", () => {
  it("recognises its own error type", () => {
    expect(isRateLimitError(new RateLimitError("busy"))).toBe(true);
  });

  it.each([new Error("nope"), "string", null, undefined])("rejects %p", (value) => {
    expect(isRateLimitError(value)).toBe(false);
  });
});
