/**
 * Async Polling Utility with Exponential Backoff
 *
 * Provides a generic polling mechanism for async jobs (AI generation, render jobs, etc.)
 * with configurable exponential backoff and optional logger injection for decoupling.
 */

/**
 * Minimal logging interface compatible with Pino and other structured loggers.
 */
export interface PollerLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

const defaultLogger: PollerLogger = {
  info: (obj: Record<string, unknown>, msg?: string) => {
    console.log(JSON.stringify({ ...obj, msg: msg || obj.msg, level: 'info' }));
  },
  error: (obj: Record<string, unknown>, msg?: string) => {
    console.error(JSON.stringify({ ...obj, msg: msg || obj.msg, level: 'error' }));
  },
};

export interface PollOptions {
  initialInterval: number;
  maxInterval: number;
  backoffMultiplier: number;
  maxAttempts: number;
  jobId: string;
  jobType: string;
  logger?: PollerLogger;
}

const DEFAULT_OPTIONS: Omit<PollOptions, 'jobId' | 'jobType'> = {
  initialInterval: 10000,
  maxInterval: 60000,
  backoffMultiplier: 2,
  maxAttempts: 30,
};

export interface PollResult<T> {
  done: boolean;
  result?: T;
  error?: string;
}

export async function pollUntilDone<T>(
  checkFn: () => Promise<PollResult<T>>,
  options: Partial<PollOptions> & { jobId: string; jobType: string }
): Promise<T> {
  const config: PollOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    logger: options.logger || defaultLogger,
  };

  const { logger: pollerLogger, jobId, jobType, initialInterval, maxInterval, backoffMultiplier, maxAttempts } = config;

  const startTime = Date.now();
  let currentInterval = initialInterval;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    pollerLogger!.info({
      msg: 'Polling',
      jobId,
      jobType,
      attempt,
      nextInterval: currentInterval,
    });

    try {
      const result = await checkFn();

      if (result.done && result.result !== undefined) {
        const totalTime = Date.now() - startTime;
        pollerLogger!.info({
          msg: 'Poll complete',
          jobId,
          jobType,
          totalAttempts: attempt,
          totalTime,
        });
        return result.result;
      }

      if (result.error) {
        pollerLogger!.error({
          msg: 'Poll failed',
          jobId,
          jobType,
          attempt,
          error: result.error,
        });
        throw new Error(`Job ${jobId} (${jobType}) failed: ${result.error}`);
      }

      if (attempt < maxAttempts) {
        await sleep(currentInterval);
        currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('failed:')) {
        throw error;
      }

      pollerLogger!.error({
        msg: 'Polling error',
        jobId,
        jobType,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  const totalTime = Date.now() - startTime;
  pollerLogger!.error({
    msg: 'Poll timeout',
    jobId,
    jobType,
    totalAttempts: attempt,
    totalTime,
  });

  throw new Error(
    `Job ${jobId} (${jobType}) timed out after ${maxAttempts} attempts (${Math.round(totalTime / 1000)}s)`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
