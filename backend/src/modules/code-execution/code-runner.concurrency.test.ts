import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The semaphore is sized from the environment when code-runner is first
// imported, so these must be set before that import is evaluated. vi.hoisted
// runs above the import statements; a plain assignment here would not.
vi.hoisted(() => {
  process.env.CODE_EXECUTION_MAX_CONCURRENCY = "2";
  process.env.CODE_EXECUTION_MAX_QUEUE = "3";
  process.env.CODE_EXECUTION_RETRY_ATTEMPTS = "2";
});

import { getExecutionLoad, runCode } from "./code-runner";
import { isRateLimitError } from "./execution-limiter";

const RUNTIMES = [{ language: "python", version: "3.12.0", aliases: ["python3"] }];

function executeBody() {
  return { run: { stdout: "ok", stderr: "", code: 0, signal: null, status: null, message: null } };
}

/** A fetch stand-in whose /execute calls stay open until the test releases them. */
function stubFetch() {
  const open: Array<() => void> = [];
  let peakConcurrent = 0;
  let concurrent = 0;
  let gatesOpen = false;

  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).endsWith("/runtimes")) {
      return { ok: true, status: 200, json: async () => RUNTIMES } as unknown as Response;
    }

    concurrent += 1;
    peakConcurrent = Math.max(peakConcurrent, concurrent);
    if (!gatesOpen) {
      await new Promise<void>((resolve) => open.push(resolve));
    }
    concurrent -= 1;

    return { ok: true, status: 200, json: async () => executeBody() } as unknown as Response;
  });

  return {
    fetchMock,
    /** Releases everything held and lets later calls through, so the queue drains. */
    openGates: () => {
      gatesOpen = true;
      open.splice(0).forEach((resolve) => resolve());
    },
    get peak() {
      return peakConcurrent;
    }
  };
}

const run = () => runCode({ language: "python", source: "print(1)", stdin: "" });

describe("runCode concurrency", () => {
  let stub: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    stub = stubFetch();
    vi.stubGlobal("fetch", stub.fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never has more executions in flight than the configured limit", async () => {
    const all = Promise.all([run(), run(), run(), run()]);

    // Let every call reach the semaphore before releasing anything.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(stub.peak).toBeLessThanOrEqual(2);
    expect(getExecutionLoad().queued).toBeGreaterThan(0);

    stub.openGates();
    await all;

    expect(stub.peak).toBeLessThanOrEqual(2);
    expect(getExecutionLoad()).toEqual({ running: 0, queued: 0 });
  });

  it("sheds load instead of queueing without bound", async () => {
    // 2 running + 3 queued fills the configured capacity; the next is refused.
    const inFlight = [run(), run(), run(), run(), run()];
    await new Promise((resolve) => setTimeout(resolve, 20));

    const refused = run().catch((error: unknown) => error);
    await expect(refused).resolves.toSatisfy(isRateLimitError);

    stub.openGates();
    await Promise.all(inFlight);
  });
});
