/**
 * Abstract base class for all FogoScope background workers.
 *
 * Subclasses implement `name`, `intervalMs`, and `execute()`.
 * The base class handles scheduling, logging, and graceful shutdown.
 */
export abstract class BaseWorker {
  /** Human-readable worker name used in log lines. */
  abstract name: string;

  /** Target interval between the *start* of consecutive cycles (ms). */
  abstract intervalMs: number;

  private running = false;
  private timer: NodeJS.Timeout | null = null;

  /** The work performed each cycle. Implementations should throw on fatal errors. */
  abstract execute(): Promise<void>;

  /** Start the worker loop. */
  start(): void {
    console.log(`[${this.name}] Starting worker (interval ${this.intervalMs}ms)`);
    this.running = true;
    this.tick();
  }

  /** Internal scheduler — runs execute(), then re-schedules accounting for elapsed time. */
  private async tick(): Promise<void> {
    if (!this.running) return;

    const start = Date.now();
    try {
      await this.execute();
      console.log(`[${this.name}] cycle complete in ${Date.now() - start}ms`);
    } catch (error) {
      console.error(`[${this.name}] cycle failed:`, error);
    }

    const elapsed = Date.now() - start;
    const delay = Math.max(0, this.intervalMs - elapsed);
    this.timer = setTimeout(() => this.tick(), delay);
  }

  /** Gracefully stop the worker. */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log(`[${this.name}] Stopped`);
  }
}
